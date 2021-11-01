const common = require('../../../../api/utils/common'),
    { PushError, ERROR } = require('./data/error'),
    { State } = require('./data/const'),
    { fields } = require('./platforms'),

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
            this.app = await common.db.collection('apps').findOne(this.message.app);
            if (!this.app) {
                throw new PushError(`App ${this.message.app} not found`, ERROR.EXCEPTION);
            }
        }
        return this.app;
    }

    /**
     * Create new Pusher
     * 
     * @returns {Pusher} pusher instance bound to this audience
     */
    push() {
        return new Pusher(this);
    }

    /**
     * Create new Popper
     * 
     * @returns {Popper} popper instance bound to this audience
     */
    pop() {
        return new Popper(this);
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
        let flds = fields(this.message.platforms, true).map(f => ({[f]: true})),
            steps = [];

        // We have a token
        steps.push({$match: {$or: flds}});

        // Geos
        if (this.message.filter.geos.length && geo()) {
            let geos = await common.db.collection('geos').find({_id: {$in: this.message.filter.geos}}).toArray();
            steps.push({$match: {$or: geos.map(g => geo().conds(g))}});
        }

        // Cohorts
        if (this.message.filter.cohorts.length) {
            let chr = {};
            this.message.filter.cohorts.forEach(id => {
                chr[`chr.${id}.in`] = 'true';
            });
            steps.push({$match: chr});
        }

        // User query
        if (this.message.filter.user) {
            let query = this.message.filter.user;

            if (query.message) {
                let filtered = await this.filterMessage(query.message);
                delete query.message;

                steps.push({$match: {uid: {$in: filtered}}});
            }

            if (query.geo) {
                if (drill() && geo()) {
                    drill().preprocessQuery(query);
                    let geos = await geo().query(this.app._id, query.geo);
                    if (geos && geos.length) {
                        steps.push({$match: {$or: geos.map(g => geo().conds(g))}});
                    }
                    else {
                        query.invalidgeo = true;
                    }
                }
                delete query.geo;
            }

            if (Object.keys(query).length) {
                steps.push({$match: query});
            }
        }

        // Drill query
        if (this.message.filter.drill && drill()) {
            let query = this.message.filter.drill;

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

                var params = {
                    time: common.initTimeObj(this.app.timezone, Date.now()),
                    qstring: Object.assign({app_id: this.app._id.toString()}, query)
                };
                delete params.qstring.queryObject.chr;

                this.log.d('Drilling: %j', params);
                let arr = await new Promise((resolve, reject) => drill().drill.fetchUsers(params, (err, uids) => {
                    this.log.i('Done drilling: %j ' + (err ? 'error %j' : '%d uids'), err || (uids && uids.length) || 0);
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

        steps.push({$project: project});

        this.log.d('steps: %j', steps);
        // TODO: add steps optimisation (i.e. merge uid: $in)

        return steps;
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
        return await common.db.collection(`push_${this.app._id}`).find(query, {projection: {_id: 1}}).toArray();
    }
}

/**
 * Pushing / popping notes to queue logic
 */
class PusherPopper {
    /**
     * Constructor
     * @param {Audience} audience audience object
     */
    constructor(audience) {
        this.audience = audience;
    }

    /**
     * Set custom data
     * @param {Object} data notification data
     * @returns {Pusher} this instance for easy method chaining
     */
    setData(data) {
        this.data = data;
        return this;
    }

    /**
     * Set date
     * @param {Date} date date of the notification
     * @returns {Pusher} this instance for easy method chaining
     */
    setDate(date) {
        this.date = date;
        return this;
    }

    /**
     * Set user uids
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
     */
    async run() {
        this.audience.log.f('d', log => log('pushing %d uids into %s date %s data %j', this.uids.length, this.audience.message._id, this.date ? this.date : '', this.data ? this.data : '')) ||
            this.audience.log.i('pushing %d uids into %s %s %j', this.uids.length, this.audience.message._id);
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
        let deleted = await Promise.all(this.message.platforms.map(async p => {
            let res = await common.db.collection('push').deleteMany({m: this.message._id, p});
            return res.deletedCount;
        }));
        let update;
        for (let p in deleted) {
            if (!update) {
                update = {$inc: {}};
            }
            update.$inc['result.processed'] = (update.$inc['result.processed'] || 0) + deleted[p];
            update.$inc[`result.errors.${p}.cancelled`] = (update.$inc[`result.errors.${p}.cancelled`] || 0) + deleted[p];
        }
        if (update) {
            await this.message.update(update, () => {
                for (let p in deleted) {
                    this.message.result.processed += deleted[p];
                    this.message.result.response(p, 'cancelled', deleted[p]);
                }
            });
        }
        return Object.values(deleted).reduce((a, b) => a + b, 0);
    }

    /**
     * Remove all message pushes and terminate any processing
     * 
     * @param {string} msg optional error message
     * @returns {number} number of records removed
     */
    async terminate(msg = 'Terminated') {
        let deleted = await this.clear();
        await this.message.update({
            $set: {
                state: State.Done | State.Error,
                'result.error': new PushError(msg).serialize()
            }
        });
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

module.exports = { Audience };