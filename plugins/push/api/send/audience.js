const common = require('../../../../api/utils/common'),
    { PushError, ERROR } = require('./data/error'),
    { State } = require('./data/const'),
    { fields } = require('./platforms'),

    /**
     * Get Drill plugin api
     */
    drill = () => {
        require('../../../pluginManager').getPluginsApis().drill;
    },
    /**
     * Get Geolocations plugin api
     */
    geo = () => {
        require('../../../pluginManager').getPluginsApis().geo;
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
     * @param {Object} app app object
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

    /**
     * Find users defined by message filter and put corresponding records into queue
     * 
     * @param {Message} message message to schedule
     */
    static schedule(message) {
        for (let pi = 0; pi < message.platforms.length; pi++) {
            let p = message.platforms[pi];
        }
    }

    /**
     * Find users defined by message filter and return total number by platform and locale distribution
     * 
     * @param {Message} message message object
     */
    static audience(message) {

    }

    /**
     * Construct a query for app_users collection from message Filter
     * 
     * @param {Message} message message object
     * @param {array} uids - array of user ids
     * @param {Boolean} remove - whether build a query for "pop" case
     * @returns {Object} query for app_users
     */
    static async query(message, uids, remove) {
        let flds = fields(message.platforms, true).map(f => ({[f]: true})),
            query;

        if (message.filter.user) {
            query = message.filter.user;

            if (query.message) {
                let filtered = await Audience.filterMessage(query.message);
                delete query.message;

                if (uids) {
                    uids = uids.filter(uid => filtered.indexOf(uid) !== -1);
                }
                else {
                    uids = filtered;
                }
            }

            if (query.push) {
                delete query.push;
            }

            if (query.$and) {
                if (uids) {
                    query.$and.push({uid: {$in: uids}});
                }
                if (!remove) {
                    query.$and.push({$or: flds});
                }
            }
            else {
                if (uids) {
                    query.uid = {$in: uids};
                }
                if (!remove) {
                    query.$or = flds;
                    // query[field(p, f, true)] = true;
                }
            }

            if (query.geo) {
                if (drill() && geo()) {
                    drill().preprocessQuery(query);
                    let geos = await geo().query(this.app._id, query.geo);
                    if (geos && geos.length) {
                        if (query.$and) {
                            query.$and.push({$or: geos.map(g => geo().conds(g))});
                        }
                        else if (query.$or) {
                            query.$and = [{$or: query.$or}, geo().conds(geos[0])];
                        }
                        else {
                            query.$or = [geo().conds(geos[0])];
                        }

                        query.$or = geos.map(g => geo().conds(g));
                    }
                    else {
                        query.invalidgeo = true;
                    }
                }
                delete query.geo;
            }
        }
        else {
            if (remove) {
                query = {};
            }
            else {
                query = {$or: flds};
            }
            if (uids) {
                query.uid = {$in: uids};
            }
        }

        if (message.filter.geos && message.filter.geos.length) {
            await new Promise((res, rej) => {
                this.db.collection('geos').find({_id: {$in: message.filter.geos}}).toArray((err, geos) => {
                    if (err) {
                        return rej(err);
                    }

                    if (geos.length) {
                        let or = geos.map(g => {
                            return {'loc.geo': {$geoWithin: {$centerSphere: [g.geo.coordinates, g.radius / 6371]}}};
                        });

                        if (query.$and) {
                            query.$and.push({$or: or});
                        }
                        else {
                            query.$or = or;
                        }
                    }
                    else {
                        query.invalidgeo = true;
                    }

                    res();
                });
            });
        }

        if (message.filter.cohorts.length) {
            let chr = {};
            message.filter.cohorts.forEach(id => {
                chr[`chr.${id}.in`] = 'true';
            });

            if (query.$and) {
                query.$and.push(chr);
            }
            else {
                for (let k in chr) {
                    query[k] = chr[k];
                }
            }
        }

        if (message.filter.drill && message.filter.drill.queryObject && message.filter.drill.queryObject.chr) {
            let cohorts = {}, chr = message.filter.drill.queryObject.chr, i;

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

            if (query.$and) {
                query.$and.push(cohorts);
            }
            else {
                for (let k in cohorts) {
                    query[k] = cohorts[k];
                }
            }
        }

        return query;
    }

    /**
     * Get uids by message $in
     * 
     * @param  {Object} min filter condition: [oid], {$in: [oid]}, {$nin: [oid]}
     * @return {Promise}    resoves to array of uids
     */
    static async filterMessage(min) {
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
            let res = await common.db.collection('push').deleteMany({m: this.message._id});
            return res.deletedCount;
        }));
        let update;
        for (let p in deleted) {
            if (!update) {
                update = {$inc: {}};
            }
            update.$inc['results.processed'] = (update.$inc['results.processed'] || 0) + deleted[p];
            update.$inc[`results.errors.${p}.cancelled`] = (update.$inc[`results.errors.${p}.cancelled`] || 0) + deleted[p];
        }
        if (update) {
            await this.message.update(update, () => {
                for (let p in deleted) {
                    this.message.results.processed += deleted[p];
                    this.message.results.response(p, 'cancelled', deleted[p]);
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
                'results.state': State.Done | State.Error,
                'results.error': new PushError(msg).serialize()
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