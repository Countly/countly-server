const { Message, Result, Creds, State, Status, platforms, Audience, ValidationError, TriggerKind, PlainTrigger, MEDIA_MIME_ALL, Filter, Trigger, Content, Info, PLATFORMS_TITLES, Template, PLATFORM } = require('./send'),
    { DEFAULTS, RecurringType } = require('./send/data/const'),
    common = require('../../../api/utils/common'),
    log = common.log('push:api:message'),
    moment = require('moment-timezone'),
    { request } = require('./proxy');


/**
 * Validate data & construct message out of it, throw in case of error
 * 
 * @param {object} args plain object to construct Message from
 * @param {boolean} draft true if we need to skip checking data for validity
 * @returns {PostMessageOptions} Message instance in case validation passed, array of error messages otherwise
 * @throws {ValidationError} in case of error
 * @apiUse PushMessageBody
 */
async function validate(args, draft = false) {
    let msg;
    if (draft) {
        let data = common.validateArgs(args, {
            _id: { required: false, type: 'ObjectID' },
            app: { required: true, type: 'ObjectID' },
            platforms: { required: true, type: 'String[]', in: () => require('./send/platforms').platforms },
            state: { type: 'Number' },
            status: { type: 'String', in: Object.values(Status) },
            filter: {
                type: Filter.scheme,
            },
            triggers: {
                type: Trigger.scheme,
                discriminator: Trigger.discriminator.bind(Trigger),
                array: true,
                'min-length': 1
            },
            contents: {
                type: Content.scheme,
                array: true,
                nonempty: true,
                'min-length': 1,
            },
            info: {
                type: Info.scheme,
            }
        }, true);
        if (data.result) {
            msg = new Message(data.obj);
        }
        else {
            throw new ValidationError(data.errors);
        }
        msg.state = State.Inactive;
        msg.status = Status.Draft;
    }
    else {
        msg = Message.validate(args);
        if (msg.result) {
            msg = new Message(msg.obj);
        }
        else {
            throw new ValidationError(msg.errors);
        }
    }

    for (let trigger of msg.triggers) {
        if (trigger.kind === TriggerKind.Plain && trigger._data.tz === false && typeof trigger._data.sctz === 'number') {
            throw new ValidationError('Please remove tz parameter from trigger definition');
        }
        if (trigger.kind === TriggerKind.Recurring && (trigger.bucket === RecurringType.Monthly || trigger.bucket === RecurringType.Weekly) && !trigger.on) {
            throw new ValidationError('"on" is required for monthly and weekly recurring triggers');
        }
    }

    let app = await common.db.collection('apps').findOne(msg.app);
    if (app) {
        msg.info.appName = app.name;

        if (!args.demo && !(args.args && args.args.demo)) {
            for (let p of msg.platforms) {
                let id = common.dot(app, `plugins.push.${p}._id`);
                if (!id || id === 'demo') {
                    throw new ValidationError(`No push credentials for ${PLATFORMS_TITLES[p]} platform`);
                }
            }

            let creds = await common.db.collection(Creds.collection).find({_id: {$in: msg.platforms.map(p => common.dot(app, `plugins.push.${p}._id`))}}).toArray();
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
        let cohorts = await common.db.collection('cohorts').find({_id: {$in: msg.filter.cohorts}}).toArray();
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

        // only 4 props of info can updated
        msg.info = new Info(Object.assign(existing.info.json, {
            title: msg.info.title,
            silent: msg.info.silent,
            scheduled: msg.info.scheduled,
            locales: msg.info.locales,
        }));

        // state & status cannot be changed by api
        msg.status = existing.status;
        msg.state = existing.state;
    }

    return msg;
}

/**
 * Send push notification to test users specified in application plugin configuration
 * 
 * @param {object} params params object
 * 
 * @api {POST} i/push/message/test Message / test
 * @apiName message/test
 * @apiDescription Send push notification to test users specified in application plugin configuration
 * @apiGroup Push Notifications
 *
 * @apiQuery {ObjectID} app_id application id
 * @apiUse PushMessageBody
 * @apiSuccess {Object} result Result of test run
 * @apiSuccess {Number} result.total Total number of notifications scheduled
 * @apiSuccess {Number} result.sent Total number of notifications sent
 * @apiSuccess {Number} result.errored Total number of notification sending errors
 * @apiSuccess {Object} result.errors Map of error code to number of notifications with a particular error
 * @apiUse PushValidationError
 * @apiUse PushError
 */
module.exports.test = async params => {
    let msg = await validate(params.qstring),
        cfg = params.app.plugins && params.app.plugins.push || {},
        test_uids = cfg && cfg.test && cfg.test.uids ? cfg.test.uids.split(',') : undefined,
        test_cohorts = cfg && cfg.test && cfg.test.cohorts ? cfg.test.cohorts.split(',') : undefined,
        error;

    if (test_uids) {
        msg.filter = new Filter({user: JSON.stringify({uid: {$in: test_uids}})});
    }
    else if (test_cohorts) {
        msg.filter = new Filter({cohorts: test_cohorts});
    }
    else {
        throw new ValidationError('Please define test users in Push plugin configuration');
    }

    msg._id = common.db.ObjectID();
    msg.triggers = [new PlainTrigger({start: new Date()})];
    msg.state = State.Streamable;
    msg.status = Status.Scheduled;
    await msg.save();

    try {
        let audience = new Audience(log.sub('test-audience'), msg);
        await audience.getApp();

        let result = await audience.push(msg.triggerPlain()).setStart().run();
        if (result.total === 0) {
            throw new ValidationError('No users with push tokens found in test users');
        }
        else {
            await msg.update({$set: {result: result.json, test: true}}, () => msg.result = result);
        }

        let start = Date.now();
        while (start > 0) {
            // if ((Date.now() - start) > 5000) { // 5 seconds
            //     msg.result.processed = msg.result.total; // TODO: remove
            //     await msg.save();
            //     break;
            // }
            if ((Date.now() - start) > 90000) { // 1.5 minutes
                break;
            }
            msg = await Message.findOne(msg._id);
            if (!msg) {
                break;
            }
            if (msg.result.total === msg.result.processed) {
                break;
            }
            if (msg.is(State.Error)) {
                break;
            }

            await new Promise(res => setTimeout(res, 1000));
        }
    }
    catch (e) {
        error = e;
    }

    if (msg) {
        common.plugins.dispatch('/systemlogs', {params: params, action: 'push_message_test', data: {test_uids, test_cohorts}});
        let ok = await msg.updateAtomically(
            {_id: msg._id, state: msg.state},
            {
                $bit: {state: {or: State.Deleted}},
                $set: {'result.removed': new Date(), 'result.removedBy': params.member._id, 'result.removedByName': params.member.full_name}
            });
        if (error) {
            log.e('Error while sending test message', error);
            common.returnMessage(params, 400, {errors: error.errors || [error.message || 'Unknown error']}, null, true);
        }
        else if (ok) {
            common.returnOutput(params, {result: msg.result.json});
        }
        else {
            common.returnMessage(params, 400, {errors: ['Message couldn\'t be deleted']}, null, true);
        }
    }
    else {
        common.returnMessage(params, 400, {errors: ['Failed to send test message']}, null, true);
    }
};

/**
 * Create push notification
 * 
 * @param {object} params params object
 * 
 * @api {POST} i/push/message/create Message / create
 * @apiName message/create
 * @apiDescription Create push notification.
 * Set status to "draft" to create a draft, leave it unspecified otherwise.
 * @apiGroup Push Notifications
 *
 * @apiQuery {ObjectID} app_id application id
 * @apiUse PushMessageBody
 * @apiUse PushMessage
 * @apiUse PushValidationError
 * @apiUse PushError
 */
module.exports.create = async params => {
    let msg = await validate(params.qstring, params.qstring.status === Status.Draft),
        demo = params.qstring.demo === undefined ? params.qstring.args ? params.qstring.args.demo : false : params.qstring.demo;
    msg._id = common.db.ObjectID();
    msg.info.created = msg.info.updated = new Date();
    msg.info.createdBy = msg.info.updatedBy = params.member._id;
    msg.info.createdByName = msg.info.updatedByName = params.member.full_name;
    if (demo) {
        msg.info.demo = true;
    }

    if (params.qstring.status === Status.Draft) {
        msg.status = Status.Draft;
        msg.state = State.Inactive;
        await msg.save();
        common.plugins.dispatch('/systemlogs', {params: params, action: 'push_message_draft', data: msg.json});
    }
    else {
        msg.state = State.Created;
        msg.status = Status.Created;
        await msg.save();
        if (!demo) {
            await msg.schedule(log, params);
        }
        log.i('Created message %s: %j / %j / %j', msg.id, msg.state, msg.status, msg.result.json);
        common.plugins.dispatch('/systemlogs', {params: params, action: 'push_message_created', data: msg.json});
    }
    if (demo && demo !== 'no-data') {
        await generateDemoData(msg, demo);
    }

    common.returnOutput(params, msg.json);
};

/**
 * Update push notification
 * 
 * @param {object} params params object
 * 
 * @api {POST} i/push/message/update Message / update
 * @apiName message/update
 * @apiDescription Update push notification
 * @apiGroup Push Notifications
 *
 * @apiQuery {ObjectID} app_id application id
 * @apiUse PushMessageBody
 * @apiUse PushMessage
 * @apiUse PushValidationError
 * @apiUse PushError
 */
module.exports.update = async params => {
    let msg = await validate(params.qstring, params.qstring.status === Status.Draft);
    msg.info.updated = new Date();
    msg.info.updatedBy = params.member._id;
    msg.info.updatedByName = params.member.full_name;

    if (msg.is(State.Done)) {
        if (msg.triggerAutoOrApi()) {
            msg.state = State.Created;
            msg.status = Status.Created;
            await msg.save();
            await msg.schedule(log, params);
            common.plugins.dispatch('/systemlogs', {params: params, action: 'push_message_updated', data: msg.json});
        }
        else if (msg.triggerPlain()) {
            throw new ValidationError('Finished plain messages cannot be changed');
        }
        else {
            throw new ValidationError('Wrong trigger kind');
        }
    }
    else {
        msg.info.rejected = null;
        msg.info.rejectedAt = null;
        msg.info.rejectedBy = null;
        msg.info.rejectedByName = null;

        if (msg.status === Status.Draft) {
            if (params.qstring.status === Status.Created) {
                msg.status = Status.Created;
                msg.state = State.Created;
                await msg.save();
                await msg.schedule(log, params);
                common.plugins.dispatch('/systemlogs', {params: params, action: 'push_message_updated_draft', data: msg.json});
            }
            else {
                await msg.save();
                common.plugins.dispatch('/systemlogs', {params: params, action: 'push_message_updated', data: msg.json});
            }
        }
        else if (msg.status === Status.Inactive) { // reschedule (email again) when editing unapproved message
            await msg.save();
            await msg.schedule(log, params);
            common.plugins.dispatch('/systemlogs', {params: params, action: 'push_message_updated', data: msg.json});
        }
        else {
            await msg.save();
            if (!params.qstring.demo && msg.triggerPlain() && (msg.is(State.Paused) || msg.is(State.Streaming) || msg.is(State.Streamable))) {
                await msg.schedule(log, params);
            }
            common.plugins.dispatch('/systemlogs', {params: params, action: 'push_message_updated', data: msg.json});
        }
    }

    log.i('Updated message %s: %j / %j / %j', msg.id, msg.state, msg.status, msg.result.json);

    common.returnOutput(params, msg.json);
};

/**
 * Remove push notification
 * 
 * @param {object} params params object
 * 
 * @api {POST} i/push/message/remove Message / remove
 * @apiName message/remove
 * @apiDescription Remove message by marking it as deleted (it stays in the database for consistency)
 * @apiGroup Push Notifications
 *
 * @apiQuery {ObjectID} _id message id
 * @apiSuccessExample {json} Success
 *  {}
 * @apiUse PushValidationError
 * @apiError NotFound Message Not Found
 *
 * @apiErrorExample {json} NotFound
 *      HTTP/1.1 404 Not Found
 *      {
 *          "errors": ["Message not found"]
 *      }
 * @apiUse PushError
 */
module.exports.remove = async params => {
    let data = common.validateArgs(params.qstring, {
        _id: {type: 'ObjectID', required: true},
    }, true);

    if (!data.result) {
        common.returnMessage(params, 400, {errors: data.errors}, null, true);
        return true;
    }

    let msg = await Message.findOne({_id: data.obj._id, state: {$bitsAllClear: State.Deleted}});
    if (!msg) {
        common.returnMessage(params, 404, {errors: ['Message not found']}, null, true);
        return true;
    }

    // TODO: stop the sending via cache
    await msg.stop(log);

    let ok = await msg.updateAtomically(
        {_id: msg._id, state: msg.state},
        {
            $bit: {state: {or: State.Deleted}},
            $set: {'result.removed': new Date(), 'result.removedBy': params.member._id, 'result.removedByName': params.member.full_name}
        });
    if (ok) {
        common.plugins.dispatch('/systemlogs', {params: params, action: 'push_message_deleted', data: msg.json});
        common.returnOutput(params, {});
    }
    else {
        throw new ValidationError('Failed to delete the message, please try again');
    }
};


/**
 * Toggle automated message
 * 
 * @param {object} params params object
 * 
 * @api {POST} i/push/message/toggle Message / API or Automated / toggle
 * @apiName message/toggle
 * @apiDescription Stop active or start inactive API or automated message
 * @apiGroup Push Notifications
 *
 * @apiQuery {ObjectID} _id message ID
 * @apiQuery {Boolean} active true to start the message, false to stop it
 * @apiUse PushMessage
 * @apiUse PushValidationError
 * @apiError NotFound Message Not Found
 * @apiErrorExample {json} NotFound
 *      HTTP/1.1 404 Not Found
 *      {
 *          "errors": ["Message not found"]
 *      }
 * @apiError AlreadyActive The message is already active
 * @apiErrorExample {json} AlreadyActive
 *      HTTP/1.1 400 Bad Request
 *      {
 *          "errors": ["The The message is already active"]
 *      }
 * @apiError AlreadyInactive The message is already inactive
 * @apiErrorExample {json} AlreadyInactive
 *      HTTP/1.1 400 Bad Request
 *      {
 *          "errors": ["The message is already stopped"]
 *      }
 * @apiError NotAutomated The message is not automated
 * @apiErrorExample {json} NotAutomated
 *      HTTP/1.1 400 Bad Request
 *      {
 *          "errors": ["The message doesn't have Cohort or Event trigger"]
 *      }
 * @apiUse PushError
 */
module.exports.toggle = async params => {
    let data = common.validateArgs(params.qstring, {
        _id: {type: 'ObjectID', required: true},
        active: {type: 'BooleanString', required: true}
    }, true);
    if (data.result) {
        data = data.obj;
    }
    else {
        common.returnMessage(params, 400, {errors: data.errors}, null, true);
        return true;
    }

    let msg = await Message.findOne(data._id);
    if (!msg) {
        common.returnMessage(params, 404, {errors: ['Message not found']}, null, true);
        return true;
    }

    if (!msg.triggerAutoOrApi() && !msg.triggerRescheduleable()) {
        throw new ValidationError(`The message doesn't have Cohort, Event, Multi or Recurring trigger`);
    }

    if (data.active && msg.is(State.Streamable)) {
        throw new ValidationError(`The message is already active`);
    }
    else if (!data.active && !msg.is(State.Streamable)) {
        throw new ValidationError(`The message is already stopped`);
    }

    if (msg.is(State.Streamable)) {
        await msg.stop(log);
        common.plugins.dispatch('/systemlogs', {params: params, action: 'push_message_deactivated', data: msg.json});
    }
    else {
        await msg.schedule(log, params);
        common.plugins.dispatch('/systemlogs', {params: params, action: 'push_message_activated', data: msg.json});
    }

    log.i('Toggled message %s: %j / %j / %j', msg.id, msg.state, msg.status, msg.result.json);

    common.returnOutput(params, msg.json);
};

/**
 * Estimate message audience
 * 
 * @param {object} params params object
 * 
 * @api {POST} o/push/message/estimate Message / estimate audience
 * @apiName message/estimate
 * @apiDescription Estimate message audience
 * @apiGroup Push Notifications
 *
 * @apiBody {ObjectID} app Application ID
 * @apiBody {String[]} platforms Array of platforms to send to
 * @apiBody {Object} [filter] User profile filter to limit recipients of this message
 * @apiBody {String} [filter.user] JSON with app_usersAPPID collection filter
 * @apiBody {String} [filter.drill] Drill plugin filter in JSON format
 * @apiBody {ObjectID[]} [filter.geos] Array of geo IDs
 * @apiBody {String[]} [filter.cohorts] Array of cohort IDs
 * 
 * @apiSuccess {Number} count Estimated number of push notifications sent with the app / platform / filter specified
 * @apiSuccess {Object} locales Locale distribution of push notifications, a map of ISO language code to number of recipients
 * 
 * @apiUse PushValidationError
 * @apiError NoApp The app is not found
 * @apiErrorExample {json} NoApp
 *      HTTP/1.1 400 Bad Request
 *      {
 *          "errors": ["No such app"]
 *      }
 * @apiError NoCredentials No credentials for selected platform
 * @apiErrorExample {json} NoCredentials
 *      HTTP/1.1 400 Bad Request
 *      {
 *          "errors": ["No push credentials for Android platform"]
 *      }
 */
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
        common.returnMessage(params, 400, {errors: data.errors}, null, true);
        return true;
    }

    let app = await common.db.collection('apps').findOne({_id: data.app});
    if (!app) {
        common.returnMessage(params, 400, {errors: ['No such app']}, null, true);
        return true;
    }

    for (let p of data.platforms) {
        let id = common.dot(app, `plugins.push.${p}._id`);
        if (!id || id === 'demo') {
            throw new ValidationError(`No push credentials for ${PLATFORMS_TITLES[p]} platform `);
        }
    }

    let steps = await new Audience(log, new Message(data), app).steps({la: 1}),
        cnt = await common.db.collection(`app_users${data.app}`).aggregate(steps.concat([{$count: 'count'}])).toArray(),
        count = cnt[0] && cnt[0].count || 0,
        las = await common.db.collection(`app_users${data.app}`).aggregate(steps.concat([
            {$project: {_id: '$la'}},
            {$group: {_id: '$_id', count: {$sum: 1}}}
        ])).toArray(),
        locales = las.reduce((a, b) => {
            a[b._id || 'default'] = b.count;
            return a;
        }, {default: 0});

    common.returnOutput(params, {count, locales});
};

/**
 * Get mime information of media URL
 * 
 * @param {object} params params object
 * 
 * @api {GET} o/push/message/mime Message / attachment MIME
 * @apiName message/mime
 * @apiDescription Get MIME information of the URL specified by sending HEAD request and then GET if HEAD doesn't work. Respects proxy setting, follows redirects and returns end URL along with content type & length.
 * @apiGroup Push Notifications
 *
 * @apiQuery {String} url URL to check
 * 
 * @apiSuccess {String} media End URL of the resource
 * @apiSuccess {String} mediaMime MIME type of the resource
 * @apiSuccess {Number} mediaSize Size of the resource in bytes
 * 
 * @apiUse PushValidationError
 */
module.exports.mime = async params => {
    try {
        let info = await mimeInfo(params.qstring.url);
        if ((info.status === 301 || info.status === 302) && info.headers.location) {
            log.d('Following redirect to', info.headers.location);
            info = await mimeInfo(info.headers.location);

            if (info.status !== 200) {
                return common.returnMessage(params, 400, {errors: [`Invalid status ${info.status} after a redirect`]}, null, true);
            }
        }
        if (info.status !== 200) {
            return common.returnMessage(params, 400, {errors: [`Invalid status ${info.status}`]}, null, true);
        }
        else if (info.headers['content-type'] === undefined) {
            return common.returnMessage(params, 400, {errors: ['No content-type while HEADing the url']}, null, true);
        }
        else if (info.headers['content-length'] === undefined) {
            info = await mimeInfo(params.qstring.url, 'GET');
            if (info.headers['content-length'] === undefined) {
                return common.returnMessage(params, 400, {errors: ['No content-length while HEADing the url']}, null, true);
            }
        }
        if (MEDIA_MIME_ALL.indexOf(info.headers['content-type']) === -1) {
            common.returnMessage(params, 400, {errors: [`Media mime type "${info.headers['content-type']}" is not supported`]}, null, true);
        }
        else if (parseInt(info.headers['content-length'], 10) > DEFAULTS.max_media_size) {
            common.returnMessage(params, 400, {errors: [`Media size (${info.headers['content-length']}) is too large`]}, null, true);
        }
        else {
            let media = info.url,
                mediaMime = info.headers['content-type'],
                mediaSize = parseInt(info.headers['content-length'], 10);

            common.returnOutput(params, {
                media,
                mediaMime,
                mediaSize
            });
        }
    }
    catch (err) {
        if (!err.errors) {
            log.e('Mime request error', err);
        }
        common.returnMessage(params, 400, {errors: err.errors || ['Server error']}, null, true);
    }
};

/**
 * Get one message
 * 
 * @param {object} params params object
 * 
 * @api {GET} o/push/message/GET Message / GET
 * @apiName message/GET
 * @apiDescription Get message by ID
 * @apiGroup Push Notifications
 *
 * @apiQuery {ObjectID} _id Message ID
 * 
 * @apiUse PushMessage
 * 
 * @apiUse PushValidationError
 * @apiError NotFound Message Not Found
 * @apiErrorExample {json} NotFound
 *      HTTP/1.1 404 Not Found
 *      {
 *          "errors": ["Message not found"]
 *      }
 */
module.exports.one = async params => {
    let data = common.validateArgs(params.qstring, {
        _id: {type: 'ObjectID', required: true},
    }, true);
    if (data.result) {
        data = data.obj;
    }
    else {
        common.returnMessage(params, 400, {errors: data.errors}, null, true);
        return true;
    }

    let msg = await Message.findOne(data._id);
    if (!msg) {
        common.returnMessage(params, 404, {errors: ['Message not found']}, null, true);
        return true;
    }

    common.returnOutput(params, msg.json);
    return true;
};

/**
 * Get notifications sent to a particular user
 * 
 * @param {object} params params
 * @returns {Promise} resolves to true
 * 
 * @api {GET} o/push/user User notifications
 * @apiName user
 * @apiDescription Get notifications sent to a particular user.
 * Makes a look up either by user id (uid) or did (device id). Returns ids of messages & dates, optionally returns corresponding message objects.
 * @apiGroup Push Notifications
 *
 * @apiQuery {String} app_id Application ID
 * @apiQuery {Boolean} messages Whether to return Message objects as well
 * @apiQuery {String} [id] User ID (uid)
 * @apiQuery {String} [did] User device ID (did)
 * 
 * @apiSuccess {Object} [notifications] Map of notification ID to array of epochs this message was sent to the user
 * @apiSuccess {Object[]} [messages] Array of messages, returned if "messages" param is set to "true"
 * 
 * @apiDeprecated use now (#Push_Notifications:notifications)
 * @apiUse PushValidationError
 * @apiError NotFound Message Not Found
 * @apiErrorExample {json} NotFound
 *      HTTP/1.1 404 Not Found
 *      {
 *          "errors": ["User with the did specified is not found"]
 *      }
 */
module.exports.user = async params => {
    let data = common.validateArgs(params.qstring, {
        id: {type: 'String', required: false},
        did: {type: 'String', required: false},
        app_id: {type: 'String', required: true},
        messages: {type: 'BooleanString', required: true},
    }, true);
    if (data.result) {
        data = data.obj;
    }
    else {
        common.returnMessage(params, 400, {errors: data.errors}, null, true);
        return true;
    }

    if (!data.did && !data.id) {
        common.returnMessage(params, 400, {errors: ['One of id & did parameters is required']}, null, true);
        return true;
    }

    let uid = data.id;
    if (!uid && data.did) {
        let user = await common.db.collection(`app_users${data.app_id}`).findOne({did: data.did});
        if (!user) {
            common.returnMessage(params, 404, {errors: ['User with the did specified is not found']}, null, true);
            return true;
        }
        uid = user.uid;
    }

    let push = await common.db.collection(`push_${data.app_id}`).findOne({_id: uid});
    if (!push) {
        common.returnOutput(params, {});
        return true;
    }

    let ids = Object.keys(push.msgs || {});
    if (!ids.length) {
        common.returnOutput(params, {});
        return true;
    }

    if (data.messages) {
        let messages = await common.db.collection('messages').find({_id: {$in: ids.map(common.dbext.oid)}}).toArray();
        common.returnOutput(params, {
            notifications: push.msgs,
            messages
        });
    }
    else {
        common.returnOutput(params, {notifications: push.msgs});
    }

    return true;
};

/**
 * Get notifications sent to a particular user
 * 
 * @param {object} params params
 * @returns {Promise} resolves to true
 * 
 * @api {GET} o/push/notifications Sent notifications
 * @apiName notifications
 * @apiDescription Get notifications sent to a particular user.
 * Makes a look up either by user id (uid) or did (device id). Returns notifications sent to a user if any.
 * @apiGroup Push Notifications
 *
 * @apiQuery {String} app_id, Application ID
 * @apiQuery {String} [id] User ID (uid). Either id or did must be specified.
 * @apiQuery {String} [did] User device ID (did). Either id or did must be specified.
 * @apiQuery {Boolean} full Return full messages along with simplified notifications. Note that true here will limit number of returned notifications to 10.
 * @apiQuery {String} platform Platform for notifications to return
 * @apiQuery {Integer} skip Pagination skip
 * @apiQuery {Integer} limit Pagination limit, must be in 1..50 range
 * 
 * @apiSuccess {Object[]} notifications Array of simplified notifications objects with _id, title, message and date properties representing a notification sent to a user at a particular date. 
 * Please note that returned title & message might not be accurate for cases when notification content was overridden in a message/push call as Countly doesn't keep this data after sending notifications. Default title & message will be returned in such cases.
 * Also note that current user profile properties are used for message content personalization when it's set.
 * @apiSuccess {String} notifications._id Noficiation message id
 * @apiSuccess {String} notifications.date ISO date when notification was sent to this user, +- few seconds
 * @apiSuccess {String} [notifications.title] Noficiation title string, if any
 * @apiSuccess {String} [notifications.message] Noficiation message string, if any
 * 
 * @apiUse PushValidationError
 * @apiError NotFound Message Not Found
 * @apiErrorExample {json} NotFound
 *      HTTP/1.1 404 Not Found
 *      {
 *          "errors": ["User with the did specified is not found"]
 *      }
 * @apiSuccessExample {json} Success-Response
 *      HTTP/1.1 200 Success
 *      {
 *          "notifications": [
 *		        {
 *			        "_id": "6480d8a03f9ea25502c816ce",
 *			        "title": "Offers!",
 *			        "message": "Hi James, check out your personal limited offer",
 *			        "date": "2023-06-07T19:26:08.683Z"
 *		        },
 *		        {
 *			        "_id": "6465fede1276bf50b2662765",
 *			        "title": "Balance",
 *			        "message": "James, your balance is reaching 0",
 *			        "date": "2023-06-08T19:00:08.683Z"
 *		        }
 *          ]
 *      }
 * 
 * @apiSuccessExample {json} Success-Response-full=true
 *      HTTP/1.1 200 Success
 *      {
 *          "notifications": [
 *		        {
 *			        "_id": "6480d8a03f9ea25502c816ce",
 *			        "title": "Offers!",
 *			        "message": "Hi James, check out your personal limited offer",
 *			        "date": "2023-06-07T19:26:08.683Z"
 *		        },
 *		        {
 *			        "_id": "6465fede1276bf50b2662765",
 *			        "title": "Balance",
 *			        "message": "James, your balance is reaching 0",
 *			        "date": "2023-06-08T19:00:08.683Z"
 *		        }
 *          ],
 *          "messages": [
 *              {
 *       			"_id": "6480d8a03f9ea25502c816ce",
 *                  "app": "5fbb72974e19c6614411d95f",
 *                  "contents": [
 *                      {
 *                          "title": "Offers!",
 *                          "message": "Hi James, check out your personal limited offer",
 *                          "expiration": 604800000
 *                      },
 *                      {
 *                          "p": "a",
 *                          "sound": "default"
 *                      },
 *                      {
 *                          "p": "i",
 *                          "sound": "default"
 *                      }
 *                  ],
 *                  "filter": {},
 *                  "other message fields": "..."
 *              },
 *              {
 *       			"_id": "6465fede1276bf50b2662765",
 *                  "app": "5fbb72974e19c6614411d95f",
 *                  "contents": [
 *                      {
 *      			        "title": "Balance",
 *		        	        "message": "James, your balance is reaching 0",
 *                          "expiration": 604800000
 *                      },
 *                      {
 *                          "p": "a",
 *                          "sound": "default"
 *                      },
 *                      {
 *                          "p": "i",
 *                          "sound": "default"
 *                      }
 *                  ],
 *                  "filter": {},
 *                  "other message fields": "..."
 *              }
 *          ]
 *      }
 */
module.exports.notificationsForUser = async params => {
    let data = common.validateArgs(params.qstring, {
        id: {type: 'String', required: false},
        did: {type: 'String', required: false},
        app_id: {type: 'String', required: true},
        platform: {type: 'String', in: platforms, required: true},
        full: {type: 'BooleanString', required: true},
        limit: {type: 'IntegerString', required: true, min: 1, max: 50},
        skip: {type: 'IntegerString', required: true, min: 0},
    }, true);
    if (data.result) {
        data = data.obj;
    }
    else {
        common.returnMessage(params, 400, {errors: data.errors}, null, true);
        return true;
    }

    if (!data.did && !data.id) {
        common.returnMessage(params, 400, {errors: ['One of id & did parameters is required']}, null, true);
        return true;
    }

    if (data.full) {
        data.limit = Math.min(data.limit, 10);
    }

    let uid = data.id,
        app_user;
    if (!uid && data.did) {
        app_user = await common.db.collection(`app_users${data.app_id}`).findOne({did: data.did});
        if (!app_user) {
            common.returnMessage(params, 404, {errors: ['User with the did specified is not found']}, null, true);
            return true;
        }
        uid = app_user.uid;
    }
    else {
        app_user = await common.db.collection(`app_users${data.app_id}`).findOne({uid: uid});
        if (!app_user) {
            common.returnMessage(params, 404, {errors: ['User with the uid specified is not found']}, null, true);
            return true;
        }
    }

    let push = await common.db.collection(`push_${data.app_id}`).findOne({_id: uid});
    if (!push) {
        common.returnOutput(params, {notifications: []});
        return true;
    }

    let id_dates = Object.keys(push.msgs || {}).map(id => push.msgs[id].map(date => [id, date])).flat();
    if (!id_dates.length) {
        common.returnOutput(params, {notifications: []});
        return true;
    }

    id_dates.sort(([, date1], [, date2]) => date1 > date2 ? -1 : 1);
    id_dates = id_dates.slice(data.skip, data.skip + data.limit);

    let ids = Array.from(new Set(id_dates.map(idd => idd[0]))).map(common.dbext.oid),
        messages = await common.db.collection('messages').find({_id: {$in: ids}}).toArray();

    let notifications = id_dates.map(([id, date]) => {
        let m = messages.find(msg => msg._id.toString() === id.toString());
        if (m) {
            m = new Message(m);
        }
        else {
            return [];
        }
        if (!m.platforms.includes(data.platform)) {
            return [];
        }

        let o = new Template(m, PLATFORM[data.platform]).guess_compile({m: m._id, h: 0, pr: app_user});
        o.date = new Date(date);
        return o;
    }).flat();

    let ret = {notifications};

    if (data.full) {
        ret.messages = messages;
    }

    common.returnOutput(params, ret, true);

    return true;
};
/**
 * Get messages
 * 
 * @param {object} params params
 * @returns {Promise} resolves to true
 * 
 * @api {GET} o/push/message/all Message / find
 * @apiName message/all
 * @apiDescription Get messages
 * Returns one of three groups: one time messages (neither auto, nor api params set or set to false), automated messages (auto = "true"), API messages (api = "true")
 * @apiGroup Push Notifications
 *
 * @apiQuery {String} app_id Application ID
 * @apiQuery {Boolean} auto *Deprecated.* Whether to return only automated messages
 * @apiQuery {Boolean} api *Deprecated.* Whether to return only API messages
 * @apiQuery {String[]} kind Required. Array of message kinds (Trigger kinds) to return, overrides *auto* & *api* if set.
 * @apiQuery {Boolean} removed Whether to return removed messages (set it to true to return removed messages)
 * @apiQuery {String} [sSearch] A search term to look for in title or message of content objects
 * @apiQuery {Number} [iDisplayStart] Skip this much messages
 * @apiQuery {Number} [iDisplayLength] Return this much messages at most
 * @apiQuery {String} [iSortCol_0] Sort by this column
 * @apiQuery {String} [sSortDir_0] Direction of sorting
 * @apiQuery {String} [sEcho] Echo paramater - value supplied is returned 
 * 
 * @apiSuccess {String} sEcho Echo value
 * @apiSuccess {Number} iTotalRecords Total number of messages
 * @apiSuccess {Number} iTotalDisplayRecords Number of messages returned
 * @apiSuccess {Object[]} aaData Array of message objects
 * 
 * @apiUse PushValidationError
 */
module.exports.all = async params => {
    const platformTypes = require('./send/platforms').platforms;
    let data = common.validateArgs(params.qstring, {
        app_id: {type: 'ObjectID', required: true},
        platform: {type: 'String', required: false, in: () => platformTypes},
        auto: {type: 'BooleanString', required: false},
        api: {type: 'BooleanString', required: false},
        multi: {type: 'BooleanString', required: false},
        rec: {type: 'BooleanString', required: false},
        kind: {type: 'String[]', required: false, in: Object.values(TriggerKind)}, // not required for backwards compatibility only
        removed: {type: 'BooleanString', required: false},
        sSearch: {type: 'RegExp', required: false, mods: 'gi'},
        iDisplayStart: {type: 'IntegerString', required: false},
        iDisplayLength: {type: 'IntegerString', required: false},
        iSortCol_0: {type: 'String', required: false},
        sSortDir_0: {type: 'String', required: false, in: ['asc', 'desc']},
        sEcho: {type: 'String', required: false},
        status: {type: 'String', required: false}
    }, true);
    // backwards compatibility
    if (!data.kind) {
        data.kind = [];
        if (data.api) {
            data.kind.push(TriggerKind.API);
        }
        else if (data.auto) {
            data.kind.push(TriggerKind.Event);
            data.kind.push(TriggerKind.Cohort);
        }
        else if (data.multi) {
            data.kind.push(TriggerKind.Multi);
        }
        else if (data.rec) {
            data.kind.push(TriggerKind.Recurring);
        }
        else {
            data.kind = Object.values(TriggerKind);
        }
    }

    if (data.result) {
        data = data.obj;

        let query = {
            app: data.app_id,
            state: {$bitsAllClear: State.Deleted},
            'triggers.kind': {$in: data.kind}
        };

        if (data.platform && data.platform.length) {
            query.platforms = data.platform; //{$in: [data.platforms]};
        }

        if (data.removed) {
            delete query.state;
        }

        if (data.sSearch) {
            query.$or = [
                {'contents.message': data.sSearch},
                {'contents.title': data.sSearch},
            ];
        }
        if (data.status) {
            query.status = data.status;
        }


        var pipeline = [];
        pipeline.push({"$match": query});

        var totalPipeline = [{"$group": {"_id": null, "cn": {"$sum": 1}}}];
        var dataPipeline = [];

        var columns = ['info.title', 'status', 'result.sent', 'result.actioned', 'info.created', 'triggers.start'];
        var sortcol = 'triggers.start';
        if (data.iSortCol_0 && data.sSortDir_0) {
            sortcol = columns[parseInt(data.iSortCol_0, 10)];
        }

        if (sortcol === 'info.title') { //sorting by title, so get right names now.
            dataPipeline.push({"$addFields": {"info.title": {"$ifNull": ["$info.title", {"$first": "$contents"}]}}});
            dataPipeline.push({"$addFields": {"info.title": {"$ifNull": ["$info.title.message", "$info.title"]}}});
            dataPipeline.push({"$sort": {[sortcol]: data.sSortDir_0 === 'asc' ? -1 : 1}});
        }
        else {
            if (sortcol === 'triggers.start') {
                //gets right trigger object
                if (data.auto) {
                    dataPipeline.push({"$addFields": {"triggerObject": {"$first": {"$filter": {"input": "$triggers", "cond": {"$in": ["$$item.kind", [TriggerKind.Event, TriggerKind.Cohort]]}, "as": "item"}}}}});
                }
                else if (data.api) {
                    dataPipeline.push({"$addFields": {"triggerObject": {"$first": {"$filter": {"input": "$triggers", "cond": {"$eq": ["$$item.kind", TriggerKind.API]}, as: "item"}}}}});
                }
                else if (data.multi) {
                    dataPipeline.push({"$addFields": {"triggerObject": {"$first": {"$filter": {"input": "$triggers", "cond": {"$eq": ["$$item.kind", TriggerKind.Multi]}, as: "item"}}}}});
                }
                else if (data.rec) {
                    dataPipeline.push({"$addFields": {"triggerObject": {"$first": {"$filter": {"input": "$triggers", "cond": {"$eq": ["$$item.kind", TriggerKind.Recurring]}, as: "item"}}}}});
                }
                else {
                    dataPipeline.push({"$addFields": {"triggerObject": {"$first": {"$filter": {"input": "$triggers", "cond": {"$in": ["$$item.kind", Object.values(TriggerKind)]}, as: "item"}}}}});
                }

                dataPipeline.push({"$addFields": {"info.lastDate": {"$ifNull": ["$info.finished", "$triggerObject.start"]}, "info.isDraft": {"$cond": [{"$eq": ["$status", "draft"]}, 1, 0]}}});

                dataPipeline.push({"$sort": {"info.isDraft": -1, "info.lastDate": data.sSortDir_0 === 'desc' ? 1 : -1}});//if not defined sort by -1;
            }
            else {
                dataPipeline.push({"$sort": {[sortcol]: data.sSortDir_0 === 'asc' ? -1 : 1}});
            }
        }

        if (data.iDisplayStart && parseInt(data.iDisplayStart, 10) !== 0) {
            dataPipeline.push({"$skip": parseInt(data.iDisplayStart, 10)});
        }
        if (data.iDisplayLength && parseInt(data.iDisplayLength, 10) !== -1) {
            dataPipeline.push({"$limit": parseInt(data.iDisplayLength, 10)});
        }

        if (sortcol !== 'info.title') { //adding correct titles now after narrowing down data
            dataPipeline.push({"$addFields": {"info.title": {"$ifNull": ["$info.title", {"$first": "$contents"}]}}});
            dataPipeline.push({"$addFields": {"info.title": {"$ifNull": ["$info.title.message", "$info.title"]}}});
        }
        if (sortcol !== 'triggers.start') { //add triggers start fields
            if (data.auto) {
                dataPipeline.push({"$addFields": {"triggerObject": {"$first": {"$filter": {"input": "$triggers", "cond": {"$in": ["$$item.kind", [TriggerKind.Event, TriggerKind.Cohort]]}, "as": "item"}}}}});
            }
            else if (data.api) {
                dataPipeline.push({"$addFields": {"triggerObject": {"$first": {"$filter": {"input": "$triggers", "cond": {"$eq": ["$$item.kind", TriggerKind.API]}, as: "item"}}}}});
            }
            else if (data.multi) {
                dataPipeline.push({"$addFields": {"triggerObject": {"$first": {"$filter": {"input": "$triggers", "cond": {"$eq": ["$$item.kind", TriggerKind.Multi]}, as: "item"}}}}});
            }
            else if (data.rec) {
                dataPipeline.push({"$addFields": {"triggerObject": {"$first": {"$filter": {"input": "$triggers", "cond": {"$eq": ["$$item.kind", TriggerKind.Recurring]}, as: "item"}}}}});
            }
            else {
                dataPipeline.push({"$addFields": {"triggerObject": {"$first": {"$filter": {"input": "$triggers", "cond": {"$in": ["$$item.kind", Object.values(TriggerKind)]}, as: "item"}}}}});
            }
            dataPipeline.push({"$addFields": {"info.lastDate": {"$ifNull": ["$info.finished", "$triggerObject.start"]}}});
        }

        pipeline.push({"$facet": {"total": totalPipeline, "data": dataPipeline}});


        let res = (await common.db.collection(Message.collection).aggregate(pipeline).toArray() || [])[0] || {},
            items = res.data || [],
            total = res.total && res.total[0] && res.total[0].cn || 0;
        common.returnOutput(params, {
            sEcho: data.sEcho,
            iTotalRecords: total || items.length,
            iTotalDisplayRecords: total || items.length,
            aaData: items
        }, true);
    }
    else {
        common.returnMessage(params, 400, {errors: data.errors}, null, true);
    }

    return true;
};

/**
 * Generate demo data for populator
 * 
 * @param {Message} msg message instance
 * @param {int} demo demo type
 */
async function generateDemoData(msg, demo) {
    await common.db.collection('apps').updateOne({_id: msg.app, 'plugins.push.i._id': {$exists: false}}, {$set: {'plugins.push.i._id': 'demo'}});
    await common.db.collection('apps').updateOne({_id: msg.app, 'plugins.push.a._id': {$exists: false}}, {$set: {'plugins.push.a._id': 'demo'}});
    await common.db.collection('apps').updateOne({_id: msg.app, 'plugins.push.h._id': {$exists: false}}, {$set: {'plugins.push.h._id': 'demo'}});

    let app = await common.db.collection('apps').findOne({_id: msg.app}),
        count = await common.db.collection('app_users' + msg.app).count(),
        events = [],
        result = msg.result || new Result();

    if (msg.triggerAutoOrApi()) {
        msg.state = State.Created | State.Streamable;
        msg.status = Status.Scheduled;

        let total = Math.floor(count * 0.72),
            sent = Math.floor(total * 0.92),
            actioned = Math.floor(sent * 0.17),
            offset = moment.tz(app.timezone).utcOffset(),
            now = Date.now() - 3600000,
            a = !!msg.triggerAuto(),
            t = !a,
            p = msg.platforms[0],
            p1 = msg.platforms[1];

        for (let i = 0; i < 19; i++) {
            let date = now - (i + 1) * (24 * 3600000) - offset,
                es = Math.floor((Math.random() + 0.5) / (19 - i) * sent),
                ea = Math.floor((Math.random() + 0.5) / (19 - i) * actioned);

            ea = Math.min(ea, Math.floor(es * 0.5));

            sent -= es;
            actioned -= ea;

            if (es) {
                result.processed += es;
                result.total += es;
                result.sent += es;

                let es_p0 = Math.floor(es * 2 / 3),
                    es_p1 = es - es_p0;
                if (es_p0 && es_p1 && p1) {
                    result.sub(p).processed += es_p0;
                    result.sub(p).total += es_p0;
                    result.sub(p).sent += es_p0;
                    result.sub(p1).processed += es_p1;
                    result.sub(p1).total += es_p1;
                    result.sub(p1).sent += es_p1;
                    events.push({timestamp: date, key: '[CLY]_push_sent', count: es_p0, segmentation: {i: msg.id, a, t, p, ap: a + p, tp: t + p}});
                    events.push({timestamp: date, key: '[CLY]_push_sent', count: es_p1, segmentation: {i: msg.id, a, t, p: p1, ap: a + p1, tp: t + p1}});
                }
                else {
                    result.sub(p).processed += es;
                    result.sub(p).total += es;
                    result.sub(p).sent += es;
                    events.push({timestamp: date, key: '[CLY]_push_sent', count: es, segmentation: {i: msg.id, a, t, p, ap: a + p, tp: t + p}});
                }
            }
            if (ea) {
                let ea_p0 = Math.floor(ea * 2 / 3),
                    ea_p1 = ea - ea_p0;
                if (ea_p0 && ea_p1 && p1) {
                    result.sub(p).actioned += ea_p0;
                    result.sub(p1).actioned += ea_p1;
                    events.push({timestamp: date, key: '[CLY]_push_action', count: ea_p0, segmentation: {i: msg.id, b: 1, a, t, p, ap: a + p, tp: t + p}});
                    events.push({timestamp: date, key: '[CLY]_push_action', count: ea_p1, segmentation: {i: msg.id, b: 1, a, t, p: p1, ap: a + p1, tp: t + p1}});
                }
                else {
                    result.sub(p).actioned += ea;
                    events.push({timestamp: date, key: '[CLY]_push_action', count: ea, segmentation: {i: msg.id, b: 1, a, t, p, ap: a + p, tp: t + p}});
                }
            }
        }

        let st = Math.floor(sent / 3),
            at = Math.floor(actioned / 3);

        if (st) {
            result.processed += st;
            result.total += st;
            result.sent += st;
            result.sub(p).processed += st;
            result.sub(p).total += st;
            events.push({timestamp: now - 24 * 3600000 - offset, key: '[CLY]_push_sent', count: st, segmentation: {i: msg.id, a, t, p, ap: a + p, tp: t + p}});
        }
        if (at) {
            result.actioned += at;
            result.sub(p).actioned += at;
            events.push({timestamp: now - 24 * 3600000 - offset, key: '[CLY]_push_action', count: at, segmentation: {i: msg.id, a, t, p, ap: a + p, tp: t + p}});
        }

        sent = sent - st;
        actioned = actioned - at;

        result.processed += sent;
        result.total += sent;
        result.sent += sent;
        result.actioned += actioned;
        result.sub(p).processed += sent;
        result.sub(p).total += sent;
        result.sub(p).sent += sent;
        result.sub(p).actioned += actioned;
        events.push({timestamp: now - offset, key: '[CLY]_push_sent', count: sent, segmentation: {i: msg.id, a, t, p, ap: a + p, tp: t + p}});
        events.push({timestamp: now - offset, key: '[CLY]_push_action', count: actioned, segmentation: {i: msg.id, a, t, p, ap: a + p, tp: t + p}});
    }
    else {
        msg.state = State.Created | State.Done;
        msg.status = Status.Sent;

        let total = demo === 1 ? Math.floor(count * 0.92) : Math.floor(Math.floor(count * 0.92) * 0.87),
            sent = demo === 1 ? Math.floor(total * 0.87) : total,
            actioned = Math.floor(sent * (demo === 1 ? 0.38 : 0.21)),
            // actioned1 = Math.floor(actioned * (demo === 1 ? 0.76 : 0.64)),
            // actioned2 = Math.floor(actioned * (demo === 1 ? 0.21 : 0.37)),
            // actioned0 = actioned - actioned1 - actioned2,
            a = false,
            t = false,
            p = msg.platforms[0],
            p1 = msg.platforms[1];


        let s_p0 = Math.floor(sent / 3),
            a_p0 = Math.floor(actioned / 3),
            a0_p0 = Math.floor(a_p0 * 2 / 3),
            a1_p0 = Math.floor((a_p0 - a0_p0) * 2 / 3),
            a2_p0 = a_p0 - a0_p0 - a1_p0,
            s_p1 = sent - s_p0,
            a_p1 = actioned - a_p0,
            a0_p1 = Math.floor(a_p1 * 2 / 3),
            a1_p1 = Math.floor((a_p1 - a0_p1) * 2 / 3),
            a2_p1 = a_p1 - a0_p1 - a1_p1;

        log.d('msggggggg %s: sent %d, actioned %d (%d %d-%d-%d / %d %d-%d-%d)', msg.id, sent, actioned, a_p0, a0_p0, a1_p0, a2_p0, a_p1, a0_p1, a1_p1, a2_p1);

        result.processed += sent;
        result.total += sent;
        result.sent += sent;
        result.actioned += a0_p0 + a1_p0 + a2_p0 + a0_p1 + a1_p1 + a2_p1;
        result.sub(p).processed += s_p0;
        result.sub(p).total += s_p0;
        result.sub(p).sent += s_p0;
        result.sub(p).actioned += a0_p0 + a1_p0 + a2_p0;
        result.sub(msg.platforms[1]).processed += s_p1;
        result.sub(msg.platforms[1]).total += s_p1;
        result.sub(msg.platforms[1]).sent += s_p1;
        result.sub(msg.platforms[1]).actioned += a0_p1 + a1_p1 + a2_p1;

        if (s_p0) {
            events.push({key: '[CLY]_push_sent', count: s_p0, segmentation: {i: msg.id, a, t, p, ap: a + p, tp: t + p}});
        }
        if (a0_p0) {
            events.push({key: '[CLY]_push_action', count: a0_p0, segmentation: {i: msg.id, b: 0, a, t, p, ap: a + p, tp: t + p}});
        }
        if (a1_p0) {
            events.push({key: '[CLY]_push_action', count: a1_p0, segmentation: {i: msg.id, b: 1, a, t, p, ap: a + p, tp: t + p}});
        }
        if (a2_p0) {
            events.push({key: '[CLY]_push_action', count: a2_p0, segmentation: {i: msg.id, b: 2, a, t, p, ap: a + p, tp: t + p}});
        }
        if (s_p1) {
            events.push({key: '[CLY]_push_sent', count: s_p1, segmentation: {i: msg.id, a, t, p: p1, ap: a + p1, tp: t + p1}});
        }
        if (a0_p1) {
            events.push({key: '[CLY]_push_action', count: a0_p1, segmentation: {i: msg.id, b: 0, a, t, p: p1, ap: a + p1, tp: t + p1}});
        }
        if (a1_p1) {
            events.push({key: '[CLY]_push_action', count: a1_p1, segmentation: {i: msg.id, b: 1, a, t, p: p1, ap: a + p1, tp: t + p1}});
        }
        if (a2_p1) {
            events.push({key: '[CLY]_push_action', count: a2_p1, segmentation: {i: msg.id, b: 2, a, t, p: p1, ap: a + p1, tp: t + p1}});
        }
    }

    require('../../../api/parts/data/events').processEvents({
        qstring: {events},
        app_id: app._id.toString(),
        appTimezone: app.timezone,
        time: common.initTimeObj(app.timezone)
    });

    await msg.update({$set: {result: result.json, state: msg.state, status: msg.status}}, () => {
        msg.result = result;
    });
}

/** 
 * Get MIME of the file behind url by sending a HEAD request
 * 
 * @param {string} url - url to get info from
 * @param {string} method - http method to use
 * @returns {Promise} - {status, headers} in case of success, PushError otherwise
 */
function mimeInfo(url, method = 'HEAD') {
    let conf = common.plugins.getConfig('push'),
        ok = common.validateArgs({url}, {
            url: {type: 'URLString', required: true},
        }, true);

    if (ok.result) {
        url = ok.obj.url.toString();
    }
    else {
        throw new ValidationError(ok.errors);
    }

    return new Promise((resolve, reject) => {
        let req = request(url.toString(), method, conf);

        req.once('response', res => {
            let status = res.statusCode,
                headers = res.headers,
                data = 0;
            if (method === 'HEAD') {
                resolve({url: url.toString(), status, headers});
            }
            else {
                res.on('data', dt => {
                    if (typeof dt === 'string') {
                        data += dt.length;
                    }
                    else if (Buffer.isBuffer(dt)) {
                        data += dt.byteLength;
                    }
                });
                res.on('end', () => {
                    if (!headers['content-length']) {
                        headers['content-length'] = data || 0;
                    }
                    resolve({url: url.toString(), status, headers});
                });
            }
        });

        req.on('error', err => {
            log.e('error when HEADing ' + url, err);
            reject(new ValidationError('Cannot access proxied URL'));
        });

        req.end();

    });
}

module.exports.mimeInfo = mimeInfo;