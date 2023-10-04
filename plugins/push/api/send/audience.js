const common = require('../../../../api/utils/common'),
    { PushError, ERROR } = require('./data/error'),
    { util } = require('./std'),
    { Message, State, TriggerKind, Result, dbext } = require('./data'),
    { DEFAULTS, Time } = require('./data/const'),
    { PLATFORM } = require('./platforms'),
    { Push } = require('./data/message'),
    { fields, TK } = require('./platforms'),
    momenttz = require('moment-timezone'),

    /**
     * Get Drill plugin api
     * 
     * @returns {object} drill api 
     */
    drill = () => {
        if (typeof global.it === 'function') {
            try {
                return require('../../../drill/api');
            }
            catch (e) {
                return undefined;
            }
        }
        else {
            return require('../../../pluginManager').getPluginsApis().drill;
        }
    },
    /**
     * Get Geolocations plugin api
     * 
     * @returns {object} geo api 
     */
    geo = () => {
        if (typeof global.it === 'function') {
            try {
                return require('../../../geo/api');
            }
            catch (e) {
                return undefined;
            }
        }
        else {
            return require('../../../pluginManager').getPluginsApis().geo;
        }
    };

/**
 * Get current time, to be able to override it in tests
 * 
 * @returns {Number} current date in ms
 */
let now = () => Date.now();

/**
 * Set now function, for tests
 * 
 * @param {function} f now function
 */
function setNow(f) {
    now = f;
}

/**
 * Class encapsulating user selection / queue / message scheduling logic
 */
class Audience {
    /**
     * Constructor
     * 
     * @param {logger} log parent logger
     * @param {Message} message message instance
     * @param {Object|undefined} app app object
     */
    constructor(log, message, app = undefined) {
        this.log = log.sub('audience');
        this.message = message;
        this.app = app;
    }

    /**
     * Lazy load app from db
     * 
     * @returns {object} app object
     */
    async getApp() {
        if (!this.app) {
            this.app = await common.db.collection('apps').findOne({_id: this.message.app});
            if (!this.app) {
                throw new PushError(`App ${this.message.app} not found`, ERROR.EXCEPTION);
            }
            this.plugins = await common.db.collection('plugins').findOne({_id: 'plugins'});
        }
        return this.app;
    }

    /**
     * Create new Pusher
     * 
     * @param {Trigger} trigger effective trigger
     * @returns {Pusher} pusher instance bound to this audience
     */
    push(trigger) {
        return new Pusher(this, trigger);
    }

    /**
     * Create new Popper
     * 
     * @param {Trigger} trigger effective trigger
     * @returns {Popper} popper instance bound to this audience
     */
    pop(trigger) {
        return new Popper(this, trigger);
    }

    /**
     * Add any virtual platforms to the message platforms array
     * 
     * @returns {string[]} new array containing all message platforms and their virtual platforms
     */
    platformsWithVirtuals() {
        return this.message.platforms.concat(this.message.platforms.map(p => PLATFORM[p].virtuals || []).flat());
    }

    // /**
    //  * Find users defined by message filter and put corresponding records into queue
    //  * 
    //  * @param {Message} message message to schedule
    //  */
    // static schedule(message) {
    //     for (let pi = 0; pi < message.platforms.length; pi++) {
    //         let p = message.platforms[pi];
    //     }
    // }

    /**
     * Construct an aggregation query for app_users collection from message Filter
     * 
     * @param {object} project app_users projection
     * @returns {object[]} array of aggregation pipeline steps
     */
    async steps(project = {uid: 1}) {
        let steps = [];

        // We have a token
        await this.addFields(steps);

        // Add message filter steps
        if (this.message.filter) {
            await this.addFilter(steps, this.message.filter);
        }

        // Decrease amount of data we process here
        await this.addProjection(steps, project);

        this.log.d('steps: %j', steps);

        // TODO: add steps optimisation (i.e. merge uid: $in)

        return steps;
    }

    /**
     * Add token existence filter to `steps` array
     * 
     * @param {Object[]} steps aggregation steps array to add steps to
     */
    async addFields(steps) {
        let flds = fields(this.platformsWithVirtuals(), true).map(f => ({[f]: {$exists: true}}));
        steps.push({$match: {$or: flds}});
    }


    /**
     * Add projection to `steps` array
     * 
     * @param {Object[]} steps aggregation steps array to add steps to
     * @param {string[]|Object} project app_users projection (array of field names or object of {field: 1} form)
     */
    async addProjection(steps, project) {
        if (Array.isArray(project)) {
            if (project.length) {
                let tmp = {};
                project.forEach(x => tmp[x] = 1);
                project = tmp;
            }
            else {
                project = {uid: 1};
            }
        }
        if (!project.uid) {
            project.uid = 1;
        }
        if (!project.tk) {
            project.tk = 1;
        }
        if (!project.tz) {
            project.tz = 1;
        }
        steps.push({$project: project});
    }

    /**
     * Add aggregation steps to `steps` array from filter
     * 
     * @param {Object[]} steps aggregation steps array to add steps to
     * @param {Filter} filter filter instance
     */
    async addFilter(steps, filter) {
        // Geos
        if (filter.geos.length && geo()) {
            let geos = await common.db.collection('geos').find({_id: {$in: filter.geos.map(common.db.ObjectID)}}).toArray();
            if (geos.length) {
                steps.push({$match: {$or: geos.map(g => geo().conds(g))}});
            }
            else {
                steps.push({$match: {geo: 'no such geo'}});
            }
        }

        // Cohorts
        if (filter.cohorts.length) {
            let chr = {};
            filter.cohorts.forEach(id => {
                chr[`chr.${id}.in`] = 'true';
            });
            steps.push({$match: chr});
        }

        // User query
        let query = filter.user;
        if (query) {
            let params = {
                time: common.initTimeObj(this.app.timezone, now()),
                qstring: Object.assign({app_id: this.app._id.toString()}, query),
                app_id: this.app._id.toString()
            };
            await common.plugins.dispatchAsPromise("/drill/preprocess_query", {
                query,
                params
            });

            // if (query.message) {
            //     let filtered = await this.filterMessage(query.message);
            //     delete query.message;

            //     steps.push({$match: {uid: {$in: filtered}}});
            // }

            // if (query.geo) {
            //     if (drill() && geo()) {
            //         drill().preprocessQuery(query);
            //         let geos = await geo().query(this.app._id, query.geo);
            //         if (geos && geos.length) {
            //             steps.push({$match: {$or: geos.map(g => geo().conds(g))}});
            //         }
            //         else {
            //             query.invalidgeo = true;
            //         }
            //     }
            //     delete query.geo;
            // }

            if (Object.keys(query).length) {
                steps.push({$match: query});
            }
        }

        // Drill query
        query = filter.drill;
        if (query && drill()) {
            // await common.plugins.dispatchAsPromise("/drill/preprocess_query", {
            //     query,
            //     params
            // });
            if (query.queryObject && query.queryObject.chr && Object.keys(query.queryObject).length === 1) {
                let cohorts = {}, chr = query.queryObject.chr, i;

                if (chr.$in && chr.$in.length) {
                    for (i = 0; i < chr.$in.length; i++) {
                        cohorts['chr.' + chr.$in[i] + '.in'] = 'true';
                    }
                }
                if (chr.$nin && chr.$nin.length) {
                    for (i = 0; i < chr.$nin.length; i++) {
                        cohorts['chr.' + chr.$nin[i] + '.in'] = {$exists: false};
                    }
                }

                steps.push({$match: cohorts});
            }
            else {
                // drill().drill.openDrillDb();

                let params = {
                    time: common.initTimeObj(this.app.timezone, now()),
                    qstring: Object.assign({app_id: this.app._id.toString()}, query),
                    app_id: this.app._id.toString()
                };
                delete params.qstring.queryObject.chr;

                this.log.d('Drilling: %j', params);
                let arr = await new Promise((resolve, reject) => drill().drill.fetchUsers(params, (err, uids) => {
                    this.log.i('Done drilling: ' + (err ? 'error %j' : '%d uids'), err || (uids && uids.length) || 0);
                    if (err) {
                        reject(err);
                    }
                    else {
                        resolve(uids || []);
                    }
                }, common.db));

                steps.push({$match: {uid: {$in: arr}}});
            }
        }
    }

    /**
     * Construct an aggregation query for app_users collection from message Filter
     * 
     * @param {object} project app_users projection
     * @returns {object[]} array of app_users documents
     */
    async aggregate(project = {uid: 1}) {
        let steps = await this.query(project);
        return await common.db.collection(`app_users${this.app._id}`).aggregate(steps).toArray();
    }


    /**
     * Get uids by message $in
     * 
     * @param  {Object} min filter condition: [oid], {$in: [oid]}, {$nin: [oid]}
     * @return {Promise}    resoves to array of uids
     */
    async filterMessage(min) {
        let query = (min.$in || min.$nin) ? min : {$in: min};
        if (min.$in) {
            min.$in = min.$in.map(this.db.ObjectID);
        }
        if (min.$nin) {
            min.$nin = min.$nin.map(this.db.ObjectID);
        }
        if (min.$nin) {
            query = {
                $or: [
                    {msgs: {$elemMatch: {'0': query}}},
                    {msgs: {$exists: false}},
                ]
            };
        }
        else {
            query = {msgs: {$elemMatch: {'0': query}}};
        }
        let arr = await common.db.collection(`push_${this.app._id}`).find(query, {projection: {_id: 1}}).toArray();
        return arr.map(x => x._id);
    }
}

/**
 * Base Mapper
 * 
 * ... using classes here to quit from lots and lots of conditionals in favor of quite simple hierarchical logic
 */
class Mapper {
    /**
     * Constructor
     * 
     * @param {object} app app
     * @param {Message} message message
     * @param {Trigger} trigger trigger
     * @param {string} p platform key
     * @param {string} f field key
     */
    constructor(app, message, trigger, p, f) {
        this.offset = momenttz.tz(app.timezone).utcOffset();
        this.message = message;
        this.trigger = trigger;
        this.p = p;
        this.f = f;
        this.pf = p + f;
        this.topUserFields = [];
        Message.userFieldsFor(message.contents, true).forEach(k => this.topUserFields.push(k.indexOf('.') === -1 ? k : k.substr(0, k.indexOf('.')))); // make sure we have 'custom', not 'custom.x'
    }

    /**
     * Set sending date addition in ms for rate limiting
     * 
     * @param {number} addition sending date addition in ms
     * @returns {Mapper} this instance for method chaining
     */
    setAddition(addition) {
        this.addition = addition;
        return this;
    }

    /**
     * Map app_user object to message
     * 
     * @param {object} user app_user object
     * @param {number} date notification date as ms timestamp
     * @param {object[]} c [Content.json] overrides
     * @param {int} offset rate limit offset
     * @returns {object} push object ready to be inserted
     */
    map(user, date, c, offset = 0) {
        let ret = {
            _id: dbext.oidWithDate(date + offset),
            a: this.message.app,
            m: this.message._id,
            p: this.p,
            f: this.f,
            u: user.uid,
            t: user[TK][0][TK][this.pf],
            pr: {}
        };
        if (c) {
            ret.c = c;
        }
        this.topUserFields.forEach(k => {
            if (user[k] !== undefined) {
                ret.pr[k] = user[k];
            }
        });
        // common.log('push').d('mapped push', ret);
        return ret;
    }
}

/**
 * Plain or API triggers mapper - uses date calculation logic for those cases
 */
class PlainApiMapper extends Mapper {
    /**
     * Map app_user object to message
     * 
     * @param {object} user app_user object
     * @param {Date} date notification date
     * @param {object[]} c [Content.json] overrides
     * @param {int} offset rate limit offset
     * @returns {object} push object ready to be inserted
     */
    map(user, date, c, offset = 0) {
        let d = date.getTime();
        if (this.trigger.tz) {
            let utz = (user.tz === undefined || user.tz === null ? this.offset || 0 : parseFloat(user.tz) || 0) * 60000;
            d = date.getTime() - this.trigger.sctz * 60000 - utz;

            if (d < (now() - (Time.TOO_LATE_TO_SEND - Time.TIME_TO_SEND))) {
                if (this.trigger.reschedule) {
                    d = d + Time.DAY;
                }
                else {
                    return null;
                }
            }
        }
        return super.map(user, d, c, offset);
    }
}

/**
 * Plain or API triggers mapper - uses date calculation logic for those cases
 */
class CohortsEventsMapper extends Mapper {
    /**
     * Map app_user object to message
     * 
     * @param {object} user app_user object
     * @param {Date} date reference date (cohort entry date, event date)
     * @param {object[]} c [Content.json] overrides
     * @param {int} offset rate limit offset
     * @returns {object} push object ready to be inserted
     */
    map(user, date, c, offset) {
        let d = date.getTime();

        // send in user's timezone
        if (this.trigger.time !== null && this.trigger.time !== undefined) {
            let utz = (user.tz === undefined || user.tz === null ? this.offset || 0 : user.tz || 0) * 60000,
                auto = new Date(d),
                inTz;

            auto.setHours(0);
            auto.setMinutes(0);
            auto.setSeconds(0);
            auto.setMilliseconds(0);

            inTz = auto.getTime() + this.trigger.time + (new Date().getTimezoneOffset() || 0) * 60000 - utz;
            if (inTz < (now() - (Time.TOO_LATE_TO_SEND - Time.TIME_TO_SEND))) {
                if (this.trigger.reschedule) {
                    d = inTz + Time.DAY;
                }
                else {
                    return null;
                }
            }
            else {
                d = inTz;
            }
        }

        if (this.trigger.cap || this.trigger.sleep) {
            let arr = (user[TK][0].msgs || {})[this.message.id];
            if (arr && this.trigger.cap && arr.length >= this.trigger.cap) {
                return null;
            }

            if (arr && this.trigger.sleep && (d - Math.max(...arr)) < this.trigger.sleep) {
                return null;
            }
        }

        // delayed message to spread the load across time
        if (this.trigger.delay) {
            d += this.trigger.delay;
        }

        // trigger end date is before the date we have, we can't send this
        if (this.trigger.end && this.trigger.end.getTime() < d) {
            return null;
        }

        return super.map(user, d, c, offset);
    }
}

/**
 * Plain or API triggers mapper - uses date calculation logic for those cases
 */
class MultiRecurringMapper extends Mapper {
    /**
     * Map app_user object to message
     * 
     * @param {object} user app_user object
     * @param {Date} date reference date (time of delivery in UTC, only user tz is what's left to add here for tz messages)
     * @param {object[]} c [Content.json] overrides
     * @param {int} offset rate limit offset
     * @returns {object} push object ready to be inserted
     */
    map(user, date, c, offset) {
        let d = date.getTime();

        // send in user's timezone
        if (this.trigger.tz) {
            let utz = (user.tz === undefined || user.tz === null ? this.offset || 0 : user.tz || 0) * 60000;
            d -= utz;
        }

        if (d < (now() - (Time.TOO_LATE_TO_SEND - Time.TIME_TO_SEND))) {
            if (this.trigger.reschedule) {
                d += Time.DAY;
            }
            else {
                return null;
            }
        }

        return super.map(user, d, c, offset);
    }
}
/**
 * Pushing / popping notes to queue logic
 */
class PusherPopper {
    /**
     * Constructor
     * @param {Audience} audience audience object
     * @param {Trigger} trigger trigger object
     */
    constructor(audience, trigger) {
        this.audience = audience;
        this.trigger = trigger;
        this.mappers = {};
        this.audience.platformsWithVirtuals().forEach(p => Object.values(PLATFORM[p].FIELDS).forEach(f => {
            if (trigger.kind === TriggerKind.API || trigger.kind === TriggerKind.Plain) {
                this.mappers[p + f] = new PlainApiMapper(audience.app, audience.message, trigger, p, f);
            }
            else if (trigger.kind === TriggerKind.Recurring || trigger.kind === TriggerKind.Multi) {
                this.mappers[p + f] = new MultiRecurringMapper(audience.app, audience.message, trigger, p, f);
            }
            else if (trigger.kind === TriggerKind.Event || trigger.kind === TriggerKind.Cohort) {
                this.mappers[p + f] = new CohortsEventsMapper(audience.app, audience.message, trigger, p, f);
            }
            else {
                throw new PushError('Invalid trigger kind ' + trigger.kind);
            }
        }));
    }

    /**
     * Get steps from audience and add local filter/uids
     * 
     * @returns {object[]} array of aggregation steps
     */
    async steps() {
        let steps = [];

        // We have a token
        await this.audience.addFields(steps);

        // Add filter steps
        if (this.uids) {
            steps.push({$match: {uid: {$in: this.uids}}});
        }
        else if (this.filter) {
            await this.audience.addFilter(steps, this.filter);
        }
        else if (this.audience.message.filter) {
            await this.audience.addFilter(steps, this.audience.message.filter);
        }

        let userFields = Message.userFieldsFor(this.audience.message.contents.concat(this.contents || []), true);

        // Decrease amount of data we process here
        await this.audience.addProjection(steps, userFields);

        // Increase parallelism by ensuring similar messages go next to each other
        steps.push({
            $sort: {la: 1}
        });

        // Lookup for tokens & msgs
        steps.push({
            $lookup: {
                from: `push_${this.audience.app._id}`,
                localField: 'uid',
                foreignField: '_id',
                as: TK
            }
        });

        this.audience.log.d('steps: %j', steps);

        return steps;
    }

    /**
     * Set contents overrides
     * 
     * @param {Content[]} contents notification data
     * @returns {Pusher} this instance for easy method chaining
     */
    setContents(contents) {
        this.contents = contents;
        return this;
    }

    /**
     * Set Filter which would override message filter
     * 
     * @param {Filter} filter message filter
     * @returns {Pusher} this instance for easy method chaining
     */
    setFilter(filter) {
        this.filter = filter;
        return this;
    }

    /**
     * Set custom variables
     * 
     * @param {Object} variables notification variables
     * @returns {Pusher} this instance for easy method chaining
     */
    setVariables(variables) {
        this.variables = variables;
        return this;
    }

    /**
     * Set start
     * 
     * @param {Date} start start of the notification
     * @returns {Pusher} this instance for easy method chaining
     */
    setStart(start) {
        this.start = start;
        return this;
    }

    /**
     * Set user uids
     * 
     * @param {string[]} uids array of uids
     * @returns {Pusher} this instance for easy method chaining
     */
    setUIDs(uids) {
        this.uids = uids;
        return this;
    }

    /**
     * Do the thing
     */
    async run() {
        throw new Error('Must be overridden');
    }
}

/**
 * Pushing notes into queue logic
 */
class Pusher extends PusherPopper {
    /**
     * Insert records into db
     * 
     * @returns {Result} result instance with total & next set (along with platform & locale specific result subs)
     */
    async run() {
        this.audience.log.f('d', log => log('pushing ' + (this.uids ? '%d uids' : 'filter %j') + ' into %s date %s variables %j', this.uids ? this.uids.length : this.filter, this.audience.message._id, this.date ? this.date : '', this.variables ? this.variables : '-')) ||
            this.audience.log.i('pushing ' + (this.uids ? '%d uids' : 'filter %j') + ' into %s', this.uids ? this.uids.length : this.filter, this.audience.message._id);

        let batchSize = DEFAULTS.queue_insert_batch,
            steps = await this.steps(),
            stream = common.db.collection(`app_users${this.audience.app._id}`).aggregate(steps, {allowDiskUse: true}).stream(),
            batch = Push.batchInsert(batchSize),
            start = this.start || this.trigger.start,
            result = new Result(),
            updates = {},
            virtuals = {},
            offset = 0,
            curPeriod = 0,
            ratePeriod = (this.audience.app.plugins.push.rate || {}).period || 0,
            rateNumber = (this.audience.app.plugins.push.rate || {}).rate || 0,
            deduplicate = this.audience.plugins && this.audience.plugins.push && this.audience.plugins.push.deduplicate || false;

        for await (let user of stream) {
            let push = user[TK][0],
                la = user.la || 'default';
            if (!push) {
                continue;
            }
            for (let pf in push[TK]) {
                if (!(pf in this.mappers)) {
                    continue;
                }

                if (ratePeriod && rateNumber) {
                    if ((curPeriod + 1) % rateNumber === 0) {
                        offset += ratePeriod * 1000;
                    }
                    curPeriod++;
                }

                let note = this.mappers[pf].map(user, start, this.contents, offset);
                if (!note) {
                    continue;
                }
                for (let k in (this.variables || {})) {
                    note.pr[k] = this.variables[k];
                }

                let p = pf[0],
                    d = note._id.getTimestamp().getTime(),
                    rp = result.sub(p, undefined, PLATFORM[p].parent);

                result.total++;
                updates['result.total'] = result.total;
                if (!result.next || d < result.next.getTime()) {
                    result.next = d;
                }

                rp.total++;
                updates[`result.subs.${p}.total`] = rp.total;
                if (!rp.next || d < rp.next.getTime()) {
                    rp.next = d;
                }

                let rpl = rp.sub(la);
                rpl.total++;
                updates[`result.subs.${p}.subs.${la}.total`] = rpl.total;

                if (PLATFORM[p].parent) {
                    rp = result.sub(PLATFORM[p].parent);
                    rpl = rp.sub(la);
                    rp.total++;
                    rpl.total++;
                    virtuals[`result.subs.${p}.virtual`] = PLATFORM[p].parent;
                    updates[`result.subs.${PLATFORM[p].parent}.total`] = rp.total;
                    updates[`result.subs.${PLATFORM[p].parent}.subs.${la}.total`] = rpl.total;
                }

                note.h = util.hash(note.pr, note.c ? util.hash(note.c) : undefined);

                if (batch.pushSync(note)) {
                    this.audience.log.d('inserting batch of %d, %d records total', batch.length, batch.total);
                    await batch.flush([11000]);
                }
            }
        }

        if (result.total) {
            this.audience.log.d('inserting final batch of %d, %d records total', batch.length, batch.total);
            await batch.flush([11000]);
        }


        if (result.total > 1 && deduplicate) {
            this.audience.log.d('Checking for duplicates');

            // group notifications just scheduled by token, message id and date up to a minute precision (won't work with heavy rate limiting)
            // [
            //     {$match: {m: this.audience.message._id}},
            //     {$addFields: {d: {$dateToString: {date: '$_id', format: '%Y-%m-%dT%H:%M'}}}},
            //     {$project: {_id: 1, t: 1, m: 1, d: 1}},
            //     {$group: {_id: {t: '$t', m: '$m', d: '$d'}, dups: {$push: '$_id'}, count: {$sum: 1}}},
            //     {$match: {count: {$gt: 1}}},
            //     {$project: {_id: '$dups'}}
            // ]
            let dups = await common.db.collection(Push.collection).aggregate([
                {$match: {m: this.audience.message._id}},
                {$addFields: {d: {$dateToString: {date: '$_id', format: '%Y-%m-%dT%H:%M'}}}},
                {$project: {_id: 1, t: 1, m: 1, d: 1, u: 1, p: 1, f: 1, 'la': '$pr.la'}},
                {$group: {_id: {t: '$t', m: '$m', d: '$d'}, dups: {$push: {_id: '$_id', u: '$u', la: '$la', p: '$p', f: '$f'}}, count: {$sum: 1}}},
                {$match: {count: {$gt: 1}}},
                {$project: {_id: '$dups'}}
            ]).toArray();

            let left = dups.length,
                notifications_to_remove = [],
                push_users_to_remove = [],
                app_users_to_unset = {},
                push_tokens_to_unset = {};

            if (left) {
                this.audience.log.i('Going to check %d duplicate with same token', left);

                let uids = new Set();
                for (const doc of dups) {
                    for (const dup of doc._id) {
                        uids.add(dup.u);
                    }
                }
                uids = Array.from(uids);
                let [all_app_users, all_push_users] = await Promise.all([
                    common.db.collection(`app_users${this.audience.app._id}`).find({uid: {$in: uids}}, {_id: 1, uid: 1, ls: 1}).toArray(),
                    common.db.collection(`push_${this.audience.app._id}`).find({_id: {$in: uids}}, {_id: 1}).toArray()
                ]);

                all_app_users = arrayToKeyObject(all_app_users, 'uid');
                all_push_users = arrayToKeyObject(all_push_users, '_id');

                // iterating one by one is slow enough to have a switch in settings
                for (const doc of dups) {
                    let pushes = doc._id,
                        dup_uids = pushes.map(d => d.u),
                        app_users = dup_uids.map(uid => all_app_users[uid]).filter(x => !!x),
                        push_users = dup_uids.map(uid => all_push_users[uid]).filter(x => !!x).map(u => u._id);

                    let ghost_push_users = push_users.filter(u => app_users.filter(au => au.uid === u).length === 0);
                    if (ghost_push_users.length) {
                        this.audience.log.d('Found %d stale push user record(s), removing', ghost_push_users.length);
                        for (let u of ghost_push_users) {
                            push_users_to_remove.push(u);
                            for (let push of pushes.filter(p => p.u === u)) {
                                notifications_to_remove.push(push._id);
                                if (updates['result.total']) {
                                    updates['result.total'] -= 1;
                                }
                                if (updates[`result.subs.${push.p}.total`]) {
                                    updates[`result.subs.${push.p}.total`] -= 1;
                                }
                                let la = push.la || 'default';
                                if (updates[`result.subs.${push.p}.subs.${la}.total`]) {
                                    updates[`result.subs.${push.p}.subs.${la}.total`] -= 1;
                                }
                            }
                            pushes = pushes.filter(p => p.u !== u);
                        }
                    }

                    app_users = app_users.filter(u => pushes.filter(p => p.u === u.uid).length !== 0);

                    if (pushes.length && app_users.length > 1) {
                        this.audience.log.d('Users %j have same token, their ls are %j, leaving only the recent one\'s token ', app_users.map(u => u._id), app_users.map(u => u.ls));
                        app_users.sort((a, b) => b.ls - a.ls);
                        while (app_users.length > 1) {
                            let au = app_users.pop();
                            for (let push of pushes.filter(p => p.u === au.uid)) {
                                notifications_to_remove.push(push._id);
                                if (updates['result.total']) {
                                    updates['result.total'] -= 1;
                                }
                                if (updates[`result.subs.${push.p}.total`]) {
                                    updates[`result.subs.${push.p}.total`] -= 1;
                                }
                                let la = push.la || 'default';
                                if (updates[`result.subs.${push.p}.subs.${la}.total`]) {
                                    updates[`result.subs.${push.p}.subs.${la}.total`] -= 1;
                                }

                                if (!app_users_to_unset[push.p + push.f]) {
                                    app_users_to_unset[push.p + push.f] = [];
                                }
                                if (!push_tokens_to_unset[push.p + push.f]) {
                                    push_tokens_to_unset[push.p + push.f] = [];
                                }
                                app_users_to_unset[push.p + push.f].push(au._id);
                                push_tokens_to_unset[push.p + push.f].push(au.uid);
                            }
                        }
                    }

                    left--;

                    if (left > 0 && left % 1000 === 0) {
                        this.audience.log.i('... still checking duplicates, %d left', left);
                    }
                }

                this.audience.log.d('Removing %d pushes with duplicate tokens', notifications_to_remove.length);
                if (notifications_to_remove.length) {
                    await common.db.collection(Push.collection).deleteMany({_id: {$in: notifications_to_remove}});
                }

                this.audience.log.d('Removing %d ghost push users', push_users_to_remove.length);
                if (push_users_to_remove.length) {
                    await common.db.collection(`push_${this.audience.app._id}`).deleteMany({_id: {$in: push_users_to_remove}});
                }

                let unsets = Object.values(app_users_to_unset).map(arr => arr.length).reduce((a, b) => a + b, 0);
                this.audience.log.d('Unsetting %d duplicate user tokens in app_users', unsets);
                if (unsets) {
                    for (let pf in app_users_to_unset) {
                        await common.db.collection(`app_users${this.audience.app._id}`).updateMany({_id: {$in: app_users_to_unset[pf]}}, {$unset: {['tk' + pf]: 1}});
                    }
                }

                unsets = Object.values(push_tokens_to_unset).map(arr => arr.length).reduce((a, b) => a + b, 0);
                this.audience.log.d('Unsetting %d duplicate user tokens in push_ collection', unsets);
                if (unsets) {
                    for (let pf in push_tokens_to_unset) {
                        await common.db.collection(`push_${this.audience.app._id}`).updateMany({_id: {$in: push_tokens_to_unset[pf]}}, {$unset: {['tk.' + pf]: 1}});
                    }
                }
            }
        }
        else {
            this.audience.log.d('No duplicates found');
        }

        if (result.total) {
            let update = {$inc: updates};
            if (Object.keys(virtuals).length) {
                update.$set = virtuals;
            }
            await this.audience.message.update(update, () => {});
        }

        return result;
    }
}

/**
 * Popping notes from queue logic
 */
class Popper extends PusherPopper {
    /**
     * Remove records from db
     */
    async run() {
        this.audience.log.i('popping %d uids from %s', this.uids.length, this.audience.message._id);
    }

    /**
     * Remove all message pushes
     * 
     * @returns {number} number of records removed
     */
    async clear() {
        let deleted = await Promise.all(this.audience.platformsWithVirtuals().map(async p => {
            let res = await common.db.collection('push').deleteMany({m: this.audience.message._id, p});
            return {p, deleted: res.deletedCount};
        }));
        let update;
        for (let obj of deleted) {
            if (!update) {
                update = {$inc: {}};
            }
            update.$inc['result.processed'] = (update.$inc['result.processed'] || 0) + obj.deleted;
            update.$inc['result.errored'] = (update.$inc['result.errored'] || 0) + obj.deleted;
            update.$inc[`result.errors.${obj.p}.cancelled`] = (update.$inc[`result.errors.${obj.p}.cancelled`] || 0) + obj.deleted;
        }
        if (update) {
            await this.audience.message.update(update, () => {
                for (let obj of deleted) {
                    this.audience.message.result.processed += obj.deleted;
                    this.audience.message.result.errored += obj.deleted;
                    this.audience.message.result.recordError('cancelled', obj.deleted);
                    this.audience.message.result.sub(obj.p).recordError('cancelled', obj.deleted);
                }
            });
        }
        return Object.values(deleted).reduce((a, b) => a.deleted + b.deleted, 0);
    }

    /**
     * Remove all message pushes and terminate any processing
     * 
     * @param {string} msg optional error message
     * @returns {number} number of records removed
     */
    async terminate(msg = 'Terminated') {
        let deleted = await this.clear();
        await this.audience.message.update({
            $set: {
                state: State.Done | State.Error,
                'result.error': new PushError(msg).serialize()
            }
        }, () => {});
        return deleted;
    }

    /**
     * Stop message by moving message pushes to separate collection (so the leftover could be resent)
     */
    async stop() {

    }

    /**
     * Requeue messages in temporary collection to main queue (after stop() call)
     */
    async resend() {

    }
}

/**
 * Convert array of objects into a map indexed by given key, they key must be present in all objects
 * 
 * @param {Object[]} arr array of objects
 * @param {String} key key
 * @returns {Object} resulting object
 */
function arrayToKeyObject(arr, key) {
    let obj = {};
    for (const e of arr) {
        obj[e[key]] = e;
    }
    return obj;
}

module.exports = { Audience, MultiRecurringMapper, setNow };