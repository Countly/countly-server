const { Message, State, Status, platforms, Audience, ValidationError, TriggerKind } = require('./send'),
    common = require('../../../api/utils/common'),
    log = common.log('push:api:message');

/**
 * Validate data & construct message out of it, throw in case of error
 * 
 * @param {object} args plain object to construct Message from
 * @param {boolean} preparing true if we need to skip checking triggers/contents presense
 * @returns {PostMessageOptions} Message instance in case validation passed, array of error messages otherwise
 * @throws {ValidationError} in case of error
 */
async function validate(args, preparing = false) {
    let msg = Message.validate(args);
    if (msg.result) {
        msg = new Message(msg.obj);
    }
    else {
        throw new ValidationError(msg.errors);
    }

    let app = await common.db.collection('apps').findOne(msg.app);
    if (app) {
        msg.info.appName = app.name;

        if (!args.demo) {
            msg.platforms = msg.platforms.filter(p => {
                let id = common.dot(app, `plugins.push.${p}._id`);
                return id && id !== 'demo';
            });

            if (!msg.platforms.length) {
                throw new ValidationError('No push credentials for specified platforms');
            }

            let creds = await common.db.collection('credentials').find({_id: {$in: msg.platforms.map(p => common.dot(app, `plugins.push.${p}._id`))}}).toArray();
            if (creds.length !== msg.platforms.length) {
                throw new ValidationError('No push credentials in db');
            }
        }
    }
    else {
        throw new ValidationError('No such app');
    }

    if (msg.filter.geos.length) {
        let geos = await common.db.collection('geos').find({_id: {$in: msg.filter.geos.map(common.db.ObjectID)}}).toArray();
        if (geos.length !== msg.filter.geos.length) {
            throw new ValidationError('No such geo');
        }
    }

    if (msg.filter.cohorts.length) {
        let cohorts = await common.db.collection('cohorts').find({_id: msg.filter.cohorts}).toArray();
        if (cohorts.length !== msg.filter.cohorts.length) {
            throw new ValidationError('No such cohort');
        }
    }

    if (msg._id) {
        let existing = await Message.findOne({_id: msg._id, state: {$bitsAllClear: State.Deleted}});
        if (!existing) {
            throw new ValidationError('No message with such _id');
        }

        if (existing.app.toString() !== msg.app.toString()) {
            throw new ValidationError('Message app cannot be changed');
        }

        if (existing.platforms.length !== msg.platforms.length || existing.platforms.filter(p => msg.platforms.indexOf(p) === -1).length) {
            throw new ValidationError('Message platforms cannot be changed');
        }

        // info, state, status & result cannot be updated by API
        msg.info = existing.info;
        msg.state = existing.state;
        msg.status = existing.status;
        msg.result = existing.result;
    }

    if (!preparing) {
        if (!msg.triggers.length) {
            throw new ValidationError('Message must have at least one Trigger');
        }
        if (!msg.contents.length) {
            throw new ValidationError('Message must have at least one Content');
        }
    }

    return msg;
}

module.exports.create = async params => {
    let msg = await validate(params.qstring);
    msg._id = common.db.ObjectID();

    if (msg.triggerAutoOrApi()) {
        msg.state = State.Streamable;
        msg.status = Status.Scheduled;
        await msg.save();
    }
    else if (msg.triggerPlain()) {
        msg.state = State.Created;
        msg.status = Status.Scheduled;
        await msg.save();
        await msg.schedule();
    }
    else {
        throw new ValidationError('Wrong trigger kind');
    }

    common.returnOutput(params, msg.json);
};

module.exports.update = async params => {
    let msg = await validate(params.qstring);

    if (msg.is(State.Done)) {
        if (msg.triggerAutoOrApi()) {
            msg.state = State.Streamable;
            msg.status = Status.Scheduled;
        }
        else if (msg.triggerPlain()) {
            throw new ValidationError('Sent plain messages cannot be changed');
        }
        else {
            throw new ValidationError('Wrong trigger kind');
        }
    }

    await msg.save();

    if (msg.triggerPlain()) {
        await msg.schedule();
    }

    common.returnOutput(params, msg.json);
};

module.exports.remove = async params => {
    let data = common.validateArgs(params.qstring, {
        _id: {type: 'ObjectID', required: true},
    }, true);

    let msg = Message.findOne({_id: data._id, state: {$bitsAllClear: State.Deleted}});

    if (msg.is(State.Streaming)) {
        // TODO: stop the sending via cache, clear the queue
    }
    else if (msg.is(State.Streamable)) {
        // TODO: clear the queue
    }

    let ok = await msg.updateAtomically({_id: msg._id, state: msg.state}, {$bit: {state: {or: State.Deleted}}});
    if (ok) {
        common.returnOutput(params, {});
    }
    else {
        throw new ValidationError('Failed to delete the message, please try again');
    }
};


module.exports.toggle = async params => {
    let data = common.validateArgs(params.qstring, {
        _id: {type: 'ObjectID', required: true},
        active: {type: 'Boolean', required: true}
    }, true);
    if (data.result) {
        data = data.obj;
    }
    else {
        return common.returnOutput(params, {errors: data.errors});
    }

    let msg = await Message.findOne(data._id);
    if (msg) {
        let update;

        if (msg.is(State.Created) || msg.is(State.Done)) {
            update = {
                $set: {
                    state: State.Streamable,
                    status: Status.Scheduled,
                }
            };
            if (msg.is(State.Error)) {
                update.$unset = {'result.error': 1};
            }
        }
        else if (msg.is(State.Streamable)) {
            update = {
                $set: {
                    state: State.Created,
                    status: Status.Created,
                }
            };
        }
        else if (msg.is(State.Streaming)) {
            // TODO: cache-based abortion of message being sent
        }
        else {
            throw new ValidationError(`The message is in wrong state ${msg.state}`);
        }

        msg = await msg.updateAtomically({_id: msg._id, state: msg.state}, update);
        if (msg) {
            common.returnOutput(params, msg.json);
        }
        else {
            throw new ValidationError('Failed to toggle the message, please try again');
        }
    }
    else {
        throw new ValidationError('Message not found');
    }
};


module.exports.estimate = async params => {
    let data = common.validateArgs(params.qstring, {
        app: {type: 'ObjectID', required: true},
        platforms: {type: 'String[]', required: true, in: () => platforms, 'min-length': 1},
        filter: {
            type: {
                user: {type: 'JSON'},
                drill: {type: 'JSON'},
                geos: {type: 'ObjectID[]'},
                cohorts: {type: 'String[]'},
            },
            required: false
        }
    }, true);

    if (data.result) {
        data = data.obj;
        if (!data.filter) {
            data.filter = {};
        }
        if (!data.filter.geos) {
            data.filter.geos = [];
        }
        if (!data.filter.cohorts) {
            data.filter.cohorts = [];
        }
    }
    else {
        return common.returnOutput(params, {errors: data.errors});
    }

    let app = await common.db.collection('apps').findOne({_id: data.app});
    if (!app) {
        return common.returnOutput(params, {errors: ['No such app']});
    }

    let steps = await new Audience(log, new Message(data), app).steps({la: 1}),
        cnt = await common.db.collection(`app_users${data.app}`).aggregate(steps.concat([{$count: 'count'}])).toArray(),
        count = cnt[0] && cnt[0].count || 0,
        las = await common.db.collection(`app_users${data.app}`).aggregate(steps.concat([
            {$project: {_id: '$la'}},
            {$group: {_id: '$_id', count: {$sum: 1}}}
        ])).toArray(),
        locales = las.reduce((a, b) => {
            a[b._id || 'default'] = b.count; return a;
        }, {default: 0});

    common.returnOutput(params, {count, locales});
};


module.exports.all = async params => {
    let data = common.validateArgs(params.qstring, {
        app_id: {type: 'ObjectID', required: true},
        auto: {type: 'BooleanString', required: false},
        api: {type: 'BooleanString', required: false},
        sSearch: {type: 'RegExp', required: false, mods: 'gi'},
        iDisplayStart: {type: 'IntegerString', required: false},
        iDisplayLength: {type: 'IntegerString', required: false},
        iSortCol_0: {type: 'String', required: false},
        sSortDir_0: {type: 'String', required: false, in: ['asc', 'desc']},
        sEcho: {type: 'String', required: false},
    }, true);

    if (data.result) {
        data = data.obj;

        let query = {
            app: data.app_id,
        };

        if (data.auto) {
            query['triggers.kind'] = {$in: [TriggerKind.Event, TriggerKind.Cohort]};
        }
        else if (data.api) {
            query['triggers.kind'] = TriggerKind.API;
        }
        else {
            query['triggers.kind'] = TriggerKind.Plain;
        }

        let total = await Message.count(query);

        if (data.sSearch) {
            query.$or = [
                {'contents.message': data.sSearch},
                {'contents.title': data.sSearch},
            ];
        }
        let cursor = common.db.collection(Message.collection).find(query),
            count = await cursor.count();

        if (data.iDisplayStart) {
            cursor.skip(data.iDisplayStart);
        }
        if (data.iDisplayLength) {
            cursor.limit(data.iDisplayLength);
        }
        if (data.iSortCol_0 && data.sSortDir_0) {
            cursor.sort({[data.iSortCol_0]: data.sSortDir_0 === 'asc' ? -1 : 1});
        }
        else {
            cursor.sort({'info.created': -1});
        }

        let items = await cursor.toArray();

        common.returnOutput(params, {
            sEcho: data.sEcho,
            iTotalRecords: total,
            iTotalDisplayRecords: count,
            aaData: items || []
        }, true);

    }
    else {
        return common.returnOutput(params, {errors: data.errors});
    }
};
