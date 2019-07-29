/* jshint ignore:start */

const momenttz = require('moment-timezone'),
    C = require('./credentials.js'),
    N = require('./note.js'),
    plugins = require('../../../pluginManager.js'),
    common = require('../../../../api/utils/common.js'),
    mail = require('../../../../api/parts/mgmt/mail.js'),
    log = common.log('push:store'),
    BATCH = 50000;

/**
 * Sequential promise-after-promise runner which also reduces results.
 * 
 * @param  {Array} arr      array of data to pass to f
 * @param  {Function} f     promise genrator (function which takes object from arr as argument and returns a Promise)
 * @param  {Number|Object}  def default number/object - a starting point for reduce
 * @return {Number|Object}  reduced result or promises executed one-by-one
 */
async function sequence(arr, f, def = 0) {
    return await arr.reduce(async(promise, item) => {
        let total = await promise,
            next = await f(item);
        if (typeof next === 'object') {
            Object.keys(next).forEach(k => {
                total[k] = (total[k] || 0) + next[k];
            });
            return total;
        }
        else {
            return total + next;
        }
    }, Promise.resolve(def));
}

/** Aggregate array of objects like {_id: 'xxx', count: 1} to single object like {xxx: 1, yyy: 222}, sums all props of objects.
 * @param {object} arr - object
 * @returns {object} - object
 */
function aggregate(arr) {
    let obj = {};
    arr.forEach(o => {
        for (let k in o) {
            if (k !== '_id') {
                obj[o._id] = (obj[o._id] || 0) + o[k];
            }
        }
    });
    return obj;
}

/** split 
 * @param {array} data - data
 * @param {number} batch  - batch size
 * @returns {array} - array with batch sized arrays
 */
function split(data, batch) {
    let chunks = [];
    while (data.length > 0) {
        chunks.push(data.splice(0, batch));
    }
    return chunks;
}

/**
 * Base class for storing / loading / unloading users from push collections. Collection structure: 
 *
 * {
 *      _id: Long,
 *      d: Long('ms timestamp to send at'),
 *      n: ObjectId('of message'),
 *      t: 'token string',
 *      u: 'uid string for app_users',
 *      d: {
 *          ... data attrs if message is customized or localized ...
 *      },
 *      j: ObjectId('job which processes message')
 * }
 * 
 */
class Base {
    /** constructor
     * @param {object} credentials - credentials
     * @param {string} field  - field
     * @param {object} db - db connection
     * @param {string} app - app id
     */
    constructor(credentials, field, db, app) {
        this.credentials = credentials;
        this.field = field;
        this.db = db;
        this.app = app;
    }

    /**
     * Mongo collection object
     * @returns {object} collection object
     */
    get collection() {
        return this.db.collection(this.collectionName);
    }

    /**
     * Mongo collection name
     * @returns {string} Mongo collection name
     */
    get collectionName() {
        return `push_${this.app._id}_${this.field}`;
    }

    /**
     * Create indexes required
     * @returns {Promise} promise
     */
    ensureIndexes() {
        return new Promise((resolve, reject) => {
            let specs = [
                    {d: 1},
                    {j: 1},
                    {d: 1, n: 1, t: 1}
                ],
                options = [
                    {name: 'idx_d'},
                    {name: 'idx_j'},
                    {name: 'idx_dnt', unique: true}
                ];

            this.collection.indexExists(options.map(o => o.name), (err, result) => {
                if (err) {
                    if (err.code === 26) {
                        result = [false, false, false];
                    }
                    else {
                        log.e('Error while checking for indexes existence %j', err);
                        return reject(err);
                    }
                }
                log.d('%s index check result: %j', this.collectionName, result);
                if (result === true) {
                    return resolve();
                }

                Promise.all(specs.map((spec, i) => new Promise((res, rej) => {
                    this.collection.createIndex(specs[i], options[i], err1 => {
                        if (err1) {
                            rej(err1);
                        }
                        else {
                            log.i('Created index %s for %s', options[i].name, this.collectionName);
                            res();
                        }
                    });
                }))).then(resolve, reject);
            });
        });
    }

    /**
     * Drop mongo collection
     * @returns {Promise} promise
     */
    clear() {
        return new Promise((resolve, reject) => {
            // console.log(this.collectionName)
            // resolve();
            this.collection.drop(err => {
                if (!err || (err && err.code === 26)) {
                    log.d('Cleared collection %s', this.collectionName);
                    resolve();
                }
                else {
                    log.e('Error when dropping collection %s: %j', this.collectionName, err);
                    reject(err);
                }
            });
        });
    }

    /**
     * Drop mongo collection
     * @param {object} note object
     * @returns {Promise} promise, resolves to deleted count
     */
    clearNote(note) {
        return new Promise((resolve, reject) => {
            this.collection.deleteMany({n: note._id}, (err, res) => {
                if (err) {
                    log.e('Error while clearing push from note: %j', err.stack || err);
                    reject(err);
                }
                else {
                    log.i('Cleared %d from %s', res && res.deletedCount, this.collectionName);
                    resolve(res && res.deletedCount || 0);
                }
            });
        });
    }

    /**
     * Remove messages from collection - they're sent.
     * 
     * @param  {ObjectId} mid note id
     * @param  {Array} uids array of uids
     * @return {Promise} resolves to number of deleted messages
     */
    ackUids(mid, uids) {
        log.i('Acking %s for %d uids in %s', mid, uids && uids.length || 0, this.collectionName);
        return new Promise((resolve, reject) => {
            this.collection.deleteMany({n: mid, u: {$in: uids}}, (err, res) => {
                log.i('Acked %j in %s', res && res.deletedCount || err, this.collectionName);
                if (err) {
                    reject(err);
                }
                else {
                    resolve(res && res.deletedCount || 0);
                }
            });
        });
    }

    /** schedule
     * @param {object} next - date object
     * @return {object} object
     */
    schedule(next) {
        return require('../../../../api/parts/jobs/index.js').job('push:process', {cid: this.credentials._id, aid: this.app._id, field: this.field}).replaceAfter(next);
    }
}

/**
 * Storage abstractions for a single push notification collection
 */
class Store extends Base {
    /**
     * Map app_users object to push collection message format
     * 
     * @param {Number} _id          _id of message
     * @param {Note} note           notification
     * @param {Number} appTzOffset  default tz offset
     * @param {Number} date         optional date to override
     * @param {Object} over         optional object with properties to override note's ones
     * @param {Object} user         app_users document
     * @return {Object} mapped message object
     */
    mapUser(_id, note, appTzOffset, date, over, user) {
        // console.log(arguments);
        let utz = (user.tz === undefined || user.tz === null ? appTzOffset || 0 : user.tz || 0) * 60000,
            d;
        if (note.auto) {
            if (date) {
                d = date;
            }
            else {
                if (note.autoTime !== null && note.autoTime !== undefined) {
                    let auto = new Date();
                    auto.setHours(0);
                    auto.setMinutes(0);
                    auto.setSeconds(0);
                    auto.setMilliseconds(0);

                    let inTz = auto.getTime() + note.autoTime + (new Date().getTimezoneOffset() || 0) * 60000 - utz;
                    // console.log(1, note.autoTime, auto, inTz);
                    if (inTz < Date.now()) {
                        d = inTz + 24 * 60 * 60000;
                    }
                    else {
                        d = inTz;
                    }
                    // console.log(11, d);
                }
                else {
                    d = Date.now();

                    // console.log(2, note.autoDelay);
                    if (note.autoDelay) {
                        d += note.autoDelay;
                    }
                    // console.log(22, d);
                }
                if (note.autoEnd && note.autoEnd < d) {
                    log.d('User %s hit end date of campaign', user.uid);
                    return null;
                }
            }

            let msgs;
            if (!user.msgs) {
                msgs = [];
            }
            else if (Array.isArray(user.msgs)) {
                msgs = user.msgs;
            }
            else {
                msgs = [];
                Object.keys(user.msgs).forEach(k => {
                    msgs.push(user.msgs[k]);
                });
            }

            if (note.autoCapMessages) {
                let same = msgs.filter(msg => msg.length === 2 && msg[0] + '' === note._id + '');
                if (same.length >= note.autoCapMessages) {
                    log.d('User %s hit messages cap', user.uid);
                    return null;
                }
            }

            if (note.autoCapSleep) {
                let same = msgs.filter(msg => msg.length === 2 && msg[0] + '' === note._id + '').map(msg => msg[1]);
                if (same.length && Math.max(...same) + note.autoCapSleep > Date.now()) {
                    log.d('User %s hit sleep cap', user.uid);
                    return null;
                }
            }

        // console.log(3, d);
        }
        else if (note.tz !== false && note.tz !== null && note.tz !== undefined) {
            d = date || (note.date || new Date()).getTime() - (note.tz || 0) * 60000 - utz;
            log.d(user.uid, date || note.date || new Date(), '-', note.tz || 0, '-', utz / 60000, new Date(d));
        }
        else {
            d = date || (note.date && note.date.getTime()) || Date.now();
        }
        let ret = {
            _id: _id,
            d: d,
            n: note._id,
            t: user[C.DB_USER_MAP.tokens][this.field],
            u: user.uid,
            p: note.compilationData(user)
        };
        if (over) {
            ret.o = over;
        }
        return ret;
    }

    /** Store array of mapped message objects in push collection
     * @param {Array} data      array of message objects
     * @return {Promise} promise
     */
    _push(data) {
        data = data.filter(x => !!x);
        if (!data.length) {
            return Promise.resolve({inserted: 0, next: null});
        }

        return new Promise((resolve, reject) => {
            var next = new Date('2118-01-01').getTime();

            log.d('Inserting %d records into %s', data.length, this.collectionName);
            sequence(split(data, BATCH), chunk => new Promise((res, rej) => {
                next = Math.min(next, ...chunk.map(u => u.d));
                if (this.tmp) {
                    chunk.forEach(u => u.x = this.tmp);
                }
                log.d('Inserting %d chunk into %s', chunk.length, this.collectionName);
                this.collection.insertMany(chunk, {ordered: false}, (err, result) => {
                    if (err) {
                        if (err.code === 11000) {
                            if (err.name === 'BulkWriteError') {
                                log.d('Many duplicates: %j / %j / %j / %j', err.result && err.result.nInserted, chunk.length, result, err);
                                res(err.result.nInserted);
                            }
                            else {
                                log.d('One duplicate: %j / %j / %j', chunk.length, result, err);
                                res(chunk.length - 1);
                            }
                        }
                        else {
                            log.e('Error while inserting into %s: %j', this.collectionName, err);
                            rej(err);
                        }
                    }
                    else {
                        res(result.insertedCount);
                    }
                });
            })).then(async inserted => {
                await this.schedule(next);
                // log.i('Inserted %d records (data length %d records) into %s, incrementing %s', inserted, data.length, this.collectionName, mid, typeof mid);
                // this.db.collection('messages').findAndModify({_id: mid}, {}, {$inc: {'result.total': inserted}}, {new: true}, (err, result) => {
                //  if (err) {
                //      log.e('Couldn\'t inc message totals (%j / %j): %j', {_id: mid}, {$inc: {'result.total': inserted}}, err);
                //  } else if (!result || !result.ok || !result.value) {
                //      log.e('Couldn\'t find message to inc totals (%j / %j): %j', {_id: mid}, {$inc: {'result.total': inserted}}, err);
                //  } else if (result.value.result.status === N.Status.Done) {
                //      log.i('Bringing back message %s', mid);
                //      this.db.collection('messages').updateOne({_id: mid}, {$set: {'result.status': N.Status.InProcessing}}, err => {
                //          if (err) {
                //              log.e('Couldn\'t bring message back to InProcessing (%j / %j): %j', {_id: mid}, {$set: {'result.status': N.Status.InProcessing}}, err);
                //          }
                //          resolve({inserted: inserted, next: next});
                //      });
                //  } else {
                resolve({inserted: inserted, next: next});
                //  }
                // });
            }, reject);
        });
    }

    /**
     * Atomically increment sequence number for this store credentials
     * 
     * @param  {Number} num how much to increment with
     * @return {Promise}    resolves to incremented value
     */
    incSequence(num) {
        return new Promise((res, rej) => {
            this.db.collection('credentials').findAndModify({_id: this.credentials._id}, {}, {$inc: {seq: num}}, {new: true}, (err, result) => {
                if (err) {
                    rej(err);
                }
                else {
                    if (result && result.ok && result.value && result.value.seq) {
                        res(result.value.seq);
                    }
                    else {
                        rej('Couldn\'t find credentials');
                    }
                }
            });
        });
    }

    /**
     * Store array of app_user objects to push collection
     * 
     * @param {Note} note           notification
     * @param {Number} date         optional date to override
     * @param {Object} over         object with properties to override note's ones
     * @param {Array} users         app_users documents
     * @return {Promise} promise
     */
    async pushUsers(note, date, over, users) {
        if (!users.length) {
            return {inserted: 0, next: null};
        }

        let offset = momenttz.tz(this.app.timezone).utcOffset(),
            id = await this.incSequence(users.length) - users.length;

        return await this._push(users.map(usr => this.mapUser(id++, note, offset, date, over, usr)), note._id);
    }

    /** fetchedQuery
     * @param {object} note - note object
     * @param {array} uids - array of user ids
     * @param {Boolean} toRemove - whether build a query for "pop" case
     * @returns {object} query - query object
     */
    async _fetchedQuery(note, uids, toRemove = false) {
        let query;

        if (note.queryUser) {
            query = note.queryUser;
            if (query.$and) {
                if (uids) {
                    query.$and.push({uid: {$in: uids}});
                }
                if (!toRemove) {
                    query.$and.push({[C.DB_USER_MAP.tokens + this.field]: true});
                }
            }
            else {
                if (uids) {
                    query.uid = {$in: uids};
                }
                if (!toRemove) {
                    query[C.DB_USER_MAP.tokens + this.field] = true;
                }
            }
        }
        else {
            if (toRemove) {
                query = {};
            }
            else {
                query = {[C.DB_USER_MAP.tokens + this.field]: true};
            }
            if (uids) {
                query.uid = {$in: uids};
            }
        }

        if (note.geos && note.geos.length) {
            await new Promise((res, rej) => {
                this.db.collection('geos').find({_id: {$in: note.geos.map(id => typeof id === 'string' ? this.db.ObjectID(id) : id)}}).toArray((err, geos) => {
                    if (err) {
                        return rej(err);
                    }

                    if (geos.length) {
                        let or = geos.map(geo => {
                            return {'loc.geo': {$geoWithin: {$centerSphere: [geo.geo.coordinates, geo.radius / 6371]}}};
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

        if (note.cohorts && note.cohorts.length) {
            let chr = {};
            note.cohorts.forEach(id => {
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

        if (note.queryDrill && note.queryDrill.queryObject && note.queryDrill.queryObject.chr) {
            let cohorts = {}, chr = note.queryDrill.queryObject.chr, i;

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
     * Retrieve users by array of uids applying any userConditions along the way & store messages to push collection
     * 
     * @param {Note} note           notification
     * @param {Array} uids          app_users.uid strings
     * @param {Number} date         date to override sending time
     * @param {Object} over         message properties to override in note
     * @param {Boolean} clear       whether to ensure only one message per note can be in collection at a time for a particular user
     * @return {Promise} promise
     */
    async pushFetched(note, uids, date, over, clear) {
        let offset = momenttz.tz(this.app.timezone).utcOffset(),
            fields = note.compilationDataFields(),
            query = await this._fetchedQuery(note, uids);

        fields.uid = 1;
        fields.tz = 1;
        fields.la = 1;

        if (note.auto) {
            if (note.autoCapMessages || note.autoCapSleep) {
                fields.msgs = 1;
            }
        }

        let users = await this.users(query, fields),
            ret = {inserted: 0, next: null};

        if (!users.length) {
            return ret;
        }
        if (clear) {
            let deleted = await this.ackUids(note._id, users.map(u => u.uid));
            ret.inserted -= deleted;
        }
        let id = await this.incSequence(users.length) - users.length,
            pushed = await this._push(users.map(usr => this.mapUser(id++, note, offset, date, over, usr)), note._id);
        ret.inserted += pushed.inserted;
        ret.next = pushed.next;

        return ret;

        // return new Promise((resolve, reject) => {
        //  this.db.collection(`app_users${app._id}`).find(query, fields).toArray((err, users) => {
        //      if (err) {
        //          reject(err);
        //      } else if (!users || users.length === 0) {
        //          resolve(0);
        //      } else {
        //          this._push(users.map(this.mapUser.bind(this, note, field, offset, date))).then(resolve, reject);
        //      }
        //  });
        // });
    }

    /**
     * Remove uids applying any userConditions along the way
     * 
     * @param {Note} note           notification
     * @param {Array} uids          app_users.uid strings
     * @return {Promise} promise
     */
    async popFetched(note, uids) {
        let query = await this._fetchedQuery(note, uids, true);

        let users = await this.users(query, {uid: 1}),
            ret = {deleted: 0};

        if (!users.length) {
            return ret;
        }
        ret.deleted = await this.ackUids(note._id, users.map(u => u.uid));

        return ret;
    }

    /**
     * Retrieve number of users matching note conditions groped by language
     * 
     * @param {Note} note           notification
     * @param {Array} uids          app_users.uid strings
     * @return {Promise} promise
     */
    countFetched(note, uids) {
        return new Promise((resolve, reject) => {
            this._fetchedQuery(note, uids).then(query => {
                this.db.collection(`app_users${this.app._id}`).aggregate([
                    {$match: query},
                    {$project: {_id: '$la'}},
                    {$group: {_id: '$_id', count: {$sum: 1}}}
                ], (err, results) => {
                    if (err) {
                        reject(err);
                    }
                    else {
                        (results || []).forEach(r => r._id = r._id === null ? 'unknown' : r._id);
                        resolve(results || []);
                    }
                });
            }, reject);
        });
    }


    /** Fetch records from app_users
     * @param {object} query - query
     * @param {object} fields - fields
     * @returns {Promise} -resolves to user array
     */
    users(query, fields) {
        let prj = fields.la ? {tk: '$tks.tk'} : {};
        Object.keys(fields).forEach(k => {
            prj[k] = '$' + k;
        });

        if (fields.msgs) {
            prj.msgs = '$tks.msgs';
        }

        return new Promise((resolve, reject) => {
            /**
             * inline function
             * @param  {object} err   smth
             * @param  {object} users smth
             */
            let res = (err, users) => {
                if (err) {
                    reject(err);
                }
                else if (!users || users.length === 0) {
                    resolve([]);
                }
                else {
                    resolve(users);
                }
            };

            if (prj.tk || prj.msgs) {
                this.db.collection(`app_users${this.app._id}`).aggregate([
                    {$match: query},
                    {$project: fields},
                    {
                        $lookup: {
                            from: `push_${this.app._id}`,
                            localField: 'uid',
                            foreignField: '_id',
                            as: 'tks'
                        }
                    },
                    {$unwind: '$tks'},
                    {$project: prj}
                ], res);
            }
            else {
                this.db.collection(`app_users${this.app._id}`).find(query).project(fields || {}).toArray(res);
            }
        });
    }

    /** drill
     * @returns {object} plugin drill functions 
     */
    drill() {
        return plugins.getPluginsApis().drill || null;
    }

    /**
     * Store messages to push collection for all users within a specific app, applying userConditions & drillConditions from note.
     * 
     * @param {Note} note           notification
     * @param {object} date - date
     * @param {Object} over          app document
     * @return {Promise} - promise
     */
    pushApp(note, date, over) {
        return new Promise((resolve, reject) => {

            if (note.queryDrill && !(note.queryDrill.queryObject && Object.keys(note.queryDrill.queryObject).length === 1 && note.queryDrill.queryObject.chr)) {
                if (!this.drill()) {
                    return reject('[%s]: Drill is not enabled while message has drill conditions', this.anote.id);
                }

                this.drill().openDrillDb();

                var params = {
                    time: common.initTimeObj(this.app.timezone, Date.now()),
                    qstring: Object.assign({app_id: this.app._id.toString()}, note.queryDrill)
                };
                delete params.qstring.queryObject.chr;

                log.i('[%s]: Drilling: %j', note._id, params);

                this.drill().drill.fetchUsers(params, (err, uids) => {
                    log.i('[%s]: Done drilling: %j ' + (err ? 'error %j' : '%d uids'), note._id, err || (uids && uids.length) || 0);
                    if (err) {
                        reject(err);
                    }
                    else if (!uids || !uids.length) {
                        resolve({inserted: 0, next: null});
                    }
                    else {
                        sequence(split(uids, BATCH), batch => this.pushFetched(note, batch, date, over), {}).then(resolve, reject);
                    }
                }, this.db);
            }
            else {
                this.pushFetched(note, null, date, over).then(resolve, reject);
            }
        });
    }

    /**
     * Remove messages from push collection for all users within a specific app, applying userConditions & drillConditions from note.
     * 
     * @param {Note} note           notification
     * @return {Promise} - promise
     */
    popApp(note) {
        return new Promise((resolve, reject) => {

            if (note.queryDrill && !(note.queryDrill.queryObject && Object.keys(note.queryDrill.queryObject).length === 1 && note.queryDrill.queryObject.chr)) {
                if (!this.drill()) {
                    return reject('[%s]: Drill is not enabled while message has drill conditions', this.anote.id);
                }

                this.drill().openDrillDb();

                var params = {
                    time: common.initTimeObj(this.app.timezone, Date.now()),
                    qstring: Object.assign({app_id: this.app._id.toString()}, note.queryDrill)
                };
                delete params.qstring.queryObject.chr;

                log.i('[%s]: Drilling: %j', note._id, params);

                this.drill().drill.fetchUsers(params, (err, uids) => {
                    log.i('[%s]: Done drilling: %j ' + (err ? 'error %j' : '%d uids'), note._id, err || (uids && uids.length) || 0);
                    if (err) {
                        reject(err);
                    }
                    else if (!uids || !uids.length) {
                        resolve({inserted: 0, next: null});
                    }
                    else {
                        sequence(split(uids, BATCH), batch => this.popFetched(note, batch), {}).then(resolve, reject);
                    }
                }, this.db);
            }
            else {
                this.popFetched(note, null).then(resolve, reject);
            }

        });
    }

    /** countApp
     * @param {object} note - note
     * @param {boolean} fast - fast
     * @returns {Promise} - promise
     */
    countApp(note, fast) {
        return new Promise((resolve, reject) => {

            if (!fast && note.queryDrill && !(note.queryDrill.queryObject && Object.keys(note.queryDrill.queryObject).length === 1 && note.queryDrill.queryObject.chr)) {
                if (!this.drill()) {
                    return reject('[%s]: Drill is not enabled while message has drill conditions', this.anote.id);
                }

                this.drill().openDrillDb();

                var params = {
                    time: common.initTimeObj(this.app.timezone, Date.now()),
                    qstring: Object.assign({app_id: this.app._id.toString()}, note.queryDrill)
                };
                delete params.qstring.queryObject.chr;

                log.i('[%s]: Drilling: %j', note._id, params);

                this.drill().drill.fetchUsers(params, (err, uids) => {
                    log.i('[%s]: Done drilling: %j ' + (err ? 'error %j' : '%d uids'), note._id, err || (uids && uids.length) || 0);
                    if (err) {
                        reject(err);
                    }
                    else if (!uids || !uids.length) {
                        resolve([]);
                    }
                    else {
                        sequence(split(uids, BATCH), batch => this.countFetched(note, batch).then(aggregate), {}).then(resolve, reject);
                    }
                }, this.db);
            }
            else {
                this.countFetched(note).then(aggregate).then(resolve, reject);
            }
        });
    }
}


/**
 * Loading data abstractions for a single push notification collection
 */
class Loader extends Store {

    /**
     * Count records in the collection, optionally limiting by maxDate
     * @param  {Number} maxDate date timestamp
     * @return {Promise}        resolves to {Number}
     */
    count(maxDate) {
        return new Promise((resolve, reject) => {
            this.collection.find(maxDate ? {d: {$lte: maxDate}, j: {$exists: false}} : {j: {$exists: false}}).count((err, count) => {
                log.i('Count of %s for maxDate %j is %j', this.collectionName, maxDate ? new Date(maxDate) : null, count || err);
                err ? reject(err) : resolve(count);
            });
        });
    }

    /**
     * Find next date to schedule a job on
     * @return {Promise}        resolves to {Number} for timestamp
     */
    next() {
        return new Promise((resolve, reject) => {
            this.collection.find().sort({d: 1}).limit(1).toArray((err, next) => {
                err ? reject(err) : resolve(next && next.length && next[0].d);
            });
        });
    }

    /**
     * Load next batch of message objects marking them with _id of job and limiting by maxDate. Returns maximum maxCount records
     * @param  {ObjectID} _id       _id of the job requesting
     * @param  {Number} maxDate     maximum date timestamp to returm messages with
     * @param  {Number} maxCount    maximum number of records to return
     * @return {Promise}            resolves to {Array[Object]} with array of message objects to send
     */
    load(_id, maxDate, maxCount = BATCH) {
        return new Promise((resolve, reject) => {
            let q = {
                d: {$lte: maxDate},
                $or: [{j: {$exists: false}}, {j: _id}]
            };

            log.d('Loading %j from %s', q, this.collectionName);
            this.collection.find(q).project({_id: 1}).limit(maxCount).toArray((err, data) => {

                if (err) {
                    return reject(err);
                }
                else if (!data || !data.length) {
                    return resolve([]);
                }

                data = data.map(d => d._id);
                q = {
                    _id: {$in: data},
                    $or: [{j: {$exists: false}}, {j: _id}]
                };
                log.d('Loading %d from %s', data.length, this.collectionName);
                this.collection.updateMany(q, {$set: {j: _id}}, (err2, res) => {

                    if (err2) {
                        return reject(err2);
                    }
                    else if (!res || !res.matchedCount) {
                        return resolve([]);
                    }

                    q = {d: {$lte: maxDate}, j: _id};
                    log.i('Loading %j from %s: updated %d records, matched %d', q, this.collectionName, res.modifiedCount, res.matchedCount);
                    this.collection.find(q).limit(maxCount).toArray((err1, data1) => {

                        log.i('Loaded %j from %s', data1 && data1.length || err1, this.collectionName);
                        if (err1) {
                            return reject(err1);
                        }
                        else if (!data1 || !data1.length) {
                            return resolve([]);
                        }
                        resolve(data1);
                    });
                });
            });
        });
    }

    /**
     * Put back messages by removing job id from records. Usually means error.
     * 
     * @param  {ObjectID} _id job id
     * @return {Promise} resolves to number of reloaded messages
     */
    reload(_id) {
        return new Promise((resolve, reject) => {
            log.d('Reloading %s from %s', _id, this.collectionName);
            this.collection.updateMany({j: _id}, {$unset: {j: 1}}, (err, res) => {
                if (err) {
                    reject(err);
                }
                else if (res && res.modifiedCount) {
                    log.i('Reloaded %d records for %s from %s', res.modifiedCount, _id, this.collectionName);
                    resolve(res.modifiedCount);
                }
                else {
                    resolve(0);
                }
            });
        });
    }

    /**
     * Remove messages from collection - they're sent.
     * 
     * @param  {Array} ids array of message ids
     * @return {Promise} resolves to number of deleted messages
     */
    ack(ids) {
        log.i('Acking %d in %s', ids && ids.length || 0, this.collectionName);
        return new Promise((resolve, reject) => {
            this.collection.deleteMany({_id: {$in: ids}}, (err, res) => {
                log.i('Acked %j in %s', res && res.deletedCount || err, this.collectionName);
                if (err) {
                    reject(err);
                }
                else {
                    resolve(res && res.deletedCount || 0);
                }
            });
        });
    }

    /**
     * Remove messages from collection which are too late to be sent.
     * 
     * @param  {Number} maxDate max timestamp to discard standard messages
     * @param  {Number} maxDateEvents max timestamp to discard on-event messages
     * @return {Promise} resolves to an object of kind {'note1 _id string': 10, 'note2 _id string': 834, total: 844} with counts of discarded messages per note id.
     */
    discard(maxDate, maxDateEvents) {
        log.i('Discarding %d / %d from %s', maxDate, maxDateEvents, this.collectionName);
        return new Promise((resolve, reject) => {
            this.load(null, Math.max(maxDate, maxDateEvents)).then(msgs => {
                log.i('Discarding %d msgs from %s', msgs.length, this.collectionName);
                if (msgs.length) {
                    msgs.forEach(m => m.n = m.n.toString());

                    let ids = msgs.map(m => m.n);
                    ids = ids.filter((id, i) => ids.indexOf(id) === i);

                    this.notes(ids).then(notes => {
                        let ret = {total: 0};

                        ids = [];

                        Object.keys(notes).forEach(id => {
                            log.d('Counting note %s in messages %j', id, msgs);
                            let rem = [], note = notes[id];
                            if (note.autoEvents && note.autoEvents.length) {
                                log.d('Counting note %s events case: %j', id, note.autoEvents);
                                rem = msgs.filter(m => m.n === id && m.d < maxDateEvents).map(m => m._id);
                            }
                            else {
                                log.d('Counting note %s standard case: %j', id, note);
                                rem = msgs.filter(m => m.n === id && m.d < maxDate).map(m => m._id);
                            }

                            log.d('Counting note %s: discarding %j', id, rem);
                            if (rem.length) {
                                ids = ids.concat(rem);
                                ret[id] = (ret[id] || 0) + rem.length;
                                ret.total += rem.length;
                            }
                        });

                        this.ack(ids).then(() => {
                            resolve(ret);
                        }, reject);
                    }, reject);
                }
                else {
                    resolve({});
                }
            }, reject);
        });
    }

    /**
     * Get a map of number of messages per note to be sent until maxDate.
     *
     * @param  {Number} maxDate max timestamp to look for
     * @param  {object} job - job
     * @return {Promise} resolves to an object of kind {'note1 _id string': 10, 'note2 _id string': 834, total: 844} with counts of messages to send per note id.
     */
    counts(maxDate, job) {
        log.i('Loading counts by %d from %s', maxDate, this.collectionName);
        return new Promise((resolve, reject) => {
            let q;
            if (maxDate) {
                q = {d: {$lte: maxDate}};
            }
            else {
                q = {_id: {$exists: true}};
            }

            if (job) {
                q.j = job;
            }

            this.collection.aggregate([
                {$match: q},
                {$project: {_id: '$n'}},
                {$group: {_id: '$_id', count: {$sum: 1}}}
            ], (err, counts) => {
                log.i('Loaded %d counts for %d from %s', counts && counts.length || 0, maxDate, this.collectionName);
                if (err) {
                    reject(err);
                }
                else {
                    let obj = {total: 0};
                    counts.forEach(n => {
                        obj[n._id.toString()] = n.count;
                        obj.total++;
                    });
                    resolve(obj);
                }
            });
        });
    }

    /** notes
     * @param {array} ids - array of meddage id
     * @returns {Promise} - resolves to notes array
     */
    notes(ids) {
        log.d('Loading notes %j', ids);
        return new Promise((resolve, reject) => {
            this.db.collection('messages').find({_id: {$in: ids.map(id => typeof id === 'string' ? this.db.ObjectID(id) : id)}}).toArray((err, notes) => {
                if (err) {
                    reject(err);
                }
                else if (!notes || !notes.length) {
                    resolve({});
                }
                else {
                    let o = {};
                    notes.forEach(n => {
                        o[n._id.toString()] = new N.Note(n);
                    });
                    resolve(o);
                }
            });
        });
    }

    /** allNotes
     * @param {number} maxDate - timestamp
     * @returns {Promise} - resolves to notes array
     */
    allNotes(maxDate) {
        return new Promise((resolve, reject) => {
            this.collection.distinct('n', maxDate ? {d: {$lte: maxDate}} : {}, (err, ids) => {
                if (err) {
                    return reject(err);
                }
                else if (!ids || !ids.length) {
                    return resolve([]);
                }

                this.db.collection('messages').find({_id: {$in: ids}}).toArray((err1, notes) => {
                    log.d('Loaded notes from %s: %j', this.collectionName, notes && notes.length || err1);
                    if (err1) {
                        reject(err1);
                    }
                    else {
                        resolve(notes || []);
                    }
                });
            });
        });
    }

    /** updateNote
     * @param {string/ObjectID} mid - note id
     * @param {object} updates  - updates
     * @returns {Promise} resolves to true if anything modified
     */
    updateNote(mid, updates) {
        log.d('Updating message %s with %j', mid, updates);
        return new Promise((resolve, reject) => {
            this.db.collection('messages').updateOne({_id: typeof mid === 'string' ? this.db.ObjectID(mid) : mid}, updates, (err, res) => {
                if (err) {
                    log.e('Error while updating note: %j', err);
                    reject(err);
                }
                else {
                    resolve(res.modifiedCount ? true : false);
                }
            });
        });
    }

    /** unpdate Notes
     * @param {object} query - query(what to update)
     * @param {object} updates - data to update
     * @returns {Promise} resolves to matched  Count
     */
    updateNotes(query, updates) {
        log.d('Updating messages %j with %j', query, updates);
        return new Promise((resolve, reject) => {
            this.db.collection('messages').updateMany(query, updates, (err, res) => {
                if (err) {
                    log.e('Error while updating notes: %j', err);
                    reject(err);
                }
                else {
                    resolve(res.matchedCount);
                }
            });
        });
    }

    /** unsetTokens
     * @param {array} uids - list of user ids
     * @returns {Promise} resolves to true if anything updated
     */
    unsetTokens(uids) {
        return new Promise((resolve, reject) => {
            this.db.collection(`app_users${this.app._id}`).updateMany({uid: {$in: uids}}, {$unset: {['tk' + this.field]: 1}}, (err) => {
                if (err) {
                    log.e('Error while unsetting token bools: %j', err);
                    reject(err);
                }
                else {
                    this.db.collection(`push_${this.app._id}`).updateMany({_id: {$in: uids}}, {$unset: {['tk.' + this.field]: 1}}, (err2, res) => {
                        if (err2) {
                            log.e('Error while unsetting tokens: %j', err2);
                            reject(err2);
                        }
                        else {
                            resolve(res.modifiedCount ? true : false);
                        }
                    });
                }
            });
        });
    }

    /** reset Token
     * @param {string} uid - user id
     * @param {string} token - token
     * @returns {Promise} promise, resolves true if there are any rows updated(else false)
     */
    resetToken(uid, token) {
        return new Promise((resolve, reject) => {
            this.db.collection(`app_users${this.app._id}`).updateOne({uid: uid}, {$set: {['tk' + this.field]: true}}, (err) => {
                if (err) {
                    log.e('Error while updating token bool: %j', err);
                    reject(err);
                }
                else {
                    this.db.collection(`push_${this.app._id}`).updateOne({_id: uid}, {$set: {['tk.' + this.field]: token}}, (err2, res) => {
                        if (err2) {
                            log.e('Error while updating note: %j', err2);
                            reject(err2);
                        }
                        else {
                            resolve(res.modifiedCount ? true : false);
                        }
                    });
                }
            });
        });
    }

    /** pushNote
     * @param {string/ObjectId} mid - object id
     * @param {array} uids - user ids
     * @param {object} date - date
     * @param {boolean} recur - recur
     * @returns {Promise} promise
     */
    pushNote(mid, uids, date, recur) {
        mid = typeof mid === 'string' ? this.db.ObjectID(mid) : mid;
        log.i('Recording message %s for uids %j', mid, uids);
        return new Promise((resolve, reject) => {
            this.db.collection(`push_${this.app._id}`).updateMany({_id: {$in: uids}}, {$push: {msgs: [mid, date]}}, (err, res) => {
                if (err) {
                    log.e('Error while updating users with msgs: %j', err);
                    if (recur === true) {
                        return reject(err);
                    }
                    this.db.collection(`push_${this.app._id}`).find({_id: {$in: uids}}).toArray((error, users) => {
                        if (error) {
                            log.e('Error while loading users with msgs: %j', error);
                            return reject(err);
                        }

                        users = (users || []).filter(u => u.msgs && !Array.isArray(u.msgs));
                        if (!users.length) {
                            return reject(err);
                        }

                        log.w('Transforming %d users msgs from object back to array', users.length);
                        Promise.all(users.map(u => {
                            let arr = [];
                            Object.keys(u.msgs).forEach(k => {
                                arr.push(u.msgs[k]);
                            });
                            return new Promise((res2, rej) => {
                                this.db.collection(`push_${this.app._id}`).updateOne({_id: u.uid}, {$set: {msgs: arr}}, error2 => {
                                    if (error2) {
                                        log.e('Error while transforming user %j: %j', u.uid, error2);
                                        rej(error2);
                                    }
                                    else {
                                        res2();
                                    }
                                });
                            });
                        })).then(() => {
                            this.pushNote(mid, uids, date, true).then(resolve, reject);
                        }, () => {
                            reject(err);
                        });
                    });
                }
                else {
                    resolve(res.modifiedCount || 0);
                }
            });
        });
    }

    /** abortNote
     * @param {string/ObjectId} mid - object id
     * @param {number} count - error count
     * @param {object} date - date
     * @param {object} field - field
     * @param {string} error  error message
     */
    async abortNote(mid, count, date, field, error = 'Aborted') {
        await new Promise((resolve, reject) => this.collection.deleteMany({n: typeof mid === 'string' ? this.db.ObjectID(mid) : mid}, err => err ? reject(err) : resolve()));

        await this.updateNote(mid, {
            $inc: {'result.errorCodes.aborted': count, 'result.errors': count},
            $set: {'result.error': error},
            $bit: {'result.status': {and: ~(N.Status.Scheduled | N.Status.Sending), or: N.Status.Aborted | N.Status.Done}},
            $addToSet: {'result.aborts': {date: date, field: field, error: error}}
        });

        let note = await new Promise((resolve, reject) => this.db.collection('messages').findOne({_id: typeof mid === 'string' ? this.db.ObjectID(mid) : mid}, (err, o) => err ? reject(err) : resolve(o)));

        if (note.auto) {
            log.i('Notifying about message abortion: apps %j, creator %j, approver %j', note.apps, note.creator, note.approver);

            let ids = [], users ;
            if (note.creator) {
                ids.push(note.creator);
            }
            if (note.approver) {
                if (('' + note.approver).indexOf('bypassed ') === 0) {
                    ids.push(('' + note.approver).substr('bypassed '.length));
                }
                else {
                    ids.push(note.approver);
                }
            }

            if (ids.length) {
                ids = ids.map(i => {
                    try {
                        return this.db.ObjectID(i);
                    }
                    catch (e) {
                        log.w('Not an ObjectID: %s', i);
                    }
                }).filter(i => !!i);
            }

            if (ids.length) {
                users = await new Promise((resolve, reject) => this.db.collection('members').find({_id: {$in: ids}}).toArray((err, u) => err ? reject(err) : resolve(u)));
                log.i('Creator / approver lookup returned %j', (users || []).map(u => u._id));
            }

            if (!users || !users.length) {
                users = await new Promise((resolve, reject) => this.db.collection('members').find({$or: [{global_admin: true}, {admin_of: {$in: note.apps}}]}).toArray((err, u) => err ? reject(err) : resolve(u)));
                log.i('No creator / approver, notifying admins %j', (users || []).map(u => u._id));
            }

            if (users && users.length) {
                users.forEach(member => {
                    let link = `dashboard#/${note.apps[0]}/messaging`;
                    log.d('Sending auto message error email to %s with link %s', member.email, link);
                    mail.sendAutomatedMessageError(member, link);
                });
            }
        }
    }

    /** recordSentEvent
     * @param {object} note - note object
     * @param {object} sent - sent
     */
    recordSentEvent(note, sent) {
        let common1 = require('../../../../api/utils/common.js');
        if (!common1.db) {
            common1.db = this.db;
        }

        plugins.internalEvents.push('[CLY]_push_sent');
        plugins.internalEvents.push('[CLY]_push_action');
        plugins.internalDrillEvents.push('[CLY]_push_action');

        var params = {
            qstring: {
                events: [
                    { key: '[CLY]_push_sent', count: sent, segmentation: {i: note._id.toString(), a: note.auto || false} }
                ]
            },
            app_id: this.app._id,
            appTimezone: this.app.timezone,
            time: common1.initTimeObj(this.app.timezone)
        };

        log.d('Recording %d [CLY]_push_sent\'s: %j', sent, params);
        require('../../../../api/parts/data/events.js').processEvents(params);
    }
}

/**
 * Class for counting users with the only task of summing counts of multiple Stores
 */
class StoreGroup {
    /** constructor
     * @param {object} db - db connection
     */
    constructor(db) {
        this.db = db;
    }

    /** count
     * @param {object} note - note object
     * @param {array} apps - array of app objects
     * @returns {object} object
     */
    async stores(note, apps) {
        apps = apps || (await this.apps(note));

        let creds = [].concat.apply([], [].concat.apply([], note.platforms.map(platform => {
            return apps.map(app => {
                if (!app.plugins || !app.plugins.push || !app.plugins.push[platform]) {
                    return [];
                }

                let CT = C.CRED_TYPE[platform],
                    creds1 = app.plugins.push[platform];

                if (!creds1 || !creds1._id) {
                    return [];
                }
                else if (platform === N.Platform.IOS) {
                    if (note.test === true) {
                        if ([CT.UNIVERSAL, CT.TOKEN].indexOf(creds1.type) !== -1) {
                            return [
                                [app, C.DB_USER_MAP.apn_dev, new C.Credentials(this.db.ObjectID(creds1._id))],
                                [app, C.DB_USER_MAP.apn_adhoc, new C.Credentials(this.db.ObjectID(creds1._id))],
                            ];
                        }
                        else {
                            return [];
                        }
                    }
                    else if (note.test === false) {
                        if ([CT.UNIVERSAL, CT.TOKEN].indexOf(creds1.type) !== -1) {
                            return [
                                [app, C.DB_USER_MAP.apn_prod, new C.Credentials(this.db.ObjectID(creds1._id))],
                            ];
                        }
                        else {
                            return [];
                        }
                    }
                    else {
                        return [];
                    }
                }
                else if (platform === N.Platform.ANDROID) {
                    if (note.test === true) {
                        return [
                            [app, C.DB_USER_MAP.gcm_test, new C.Credentials(this.db.ObjectID(creds1._id))],
                        ];
                    }
                    else if (note.test === false) {
                        return [
                            [app, C.DB_USER_MAP.gcm_prod, new C.Credentials(this.db.ObjectID(creds1._id))],
                        ];
                    }
                    else {
                        return [];
                    }
                }
                else {
                    return [];
                }
            });
        })));

        return creds.map(([app, field, creds1]) => new Store(creds1, field, this.db, app));
    }

    /** count
     * @param {object} note - note object
     * @param {array} apps - array of app objects
     * @param {boolean} fast - if not set - false
     * @returns {array} - [fields, locales]
     */
    async count(note, apps, fast = false) {
        let stores = await this.stores(note, apps),
            locales = {},
            fields = {};

        log.i('SG counting %s %d stores X %d apps', fast ? 'fast' : 'common', stores.length, apps.length);

        await Promise.all(stores.map(store => store.countApp(note, fast).then(data => {
            log.i('SG counting %d stores X %d apps: got results for %s / %s', stores.length, apps.length, store.app._id, store.field);
            log.d('%s / %s: %j', store.app._id, store.field, data);
            let total = 0;
            for (let k in data) {
                locales[k] = (locales[k] || 0) + data[k];
                total += data[k];
            }
            fields[store.field] = (fields[store.field] || 0) + total;
        })));

        log.i('SG counting %s %d stores X %d apps: done', fast ? 'fast' : 'common', stores.length, apps.length);
        log.d('%s: %j / %j', note._id, fields, locales);

        return [fields, locales];
    }

    /** pushApps
     * @param {object} note - note object
     * @param {array} apps - array of app objects
     * @param {object} date - date
     * @param {object} over - over
     * @returns {object} - {total: total, next: next}
     */
    async pushApps(note, apps, date, over) {
        apps = apps || await this.apps(note);
        log.i('Note %s pushing users for %d apps with date %j over %j', note.id, apps.length, date, over);
        let stores = await this.stores(note, apps),
            results = await Promise.all(stores.map(async store => {
                let result = await store.pushApp(note, date, over);
                log.d('result %j', result);
                // result = {inserted: result};
                result.collection = store.collectionName;
                result.field = store.field;
                result.cid = store.credentials._id;
                return result;
            }));
        log.i('Note %s pushFetched results: %j', note.id, results);

        let total = results.map(r => r.inserted).reduce((a, b) => a + b, 0),
            next = total ? Math.min(...results.filter(r => !!r.next).map(r => r.next)) : null;

        return {total: total, next: next};
    }

    /** popApps
     * @param {object} note - note object
     * @param {array} apps - array of app objects
     * @returns {object} - {total: total, next: next}
     */
    async popApps(note, apps) {
        apps = apps || await this.apps(note);
        log.i('Note %s popping users for %d apps', note.id, apps.length);
        let stores = await this.stores(note, apps),
            results = await Promise.all(stores.map(async store => {
                let result = await store.popApp(note);
                log.d('result %j', result);
                // result = {deleted: result};
                result.collection = store.collectionName;
                result.field = store.field;
                result.cid = store.credentials._id;
                return result;
            }));
        log.i('Note %s pushFetched results: %j', note.id, results);

        return {total: results.map(r => r.deleted).reduce((a, b) => a + b, 0)};
    }

    /** pushUids
     * @param {object} note - note object
     * @param {object} app - app object
     * @param {array} uids - user id's
     * @param {object} date - date
     * @param {object} over - over
     * @returns {object} - {total: total, next: next}
     */
    async pushUids(note, app, uids, date, over) {
        log.i('Note %s pushing %d users for app %s date %j over %j', note.id, uids.length, app._id, date, over);
        let stores = (await this.stores(note)).filter(store => store.app._id.equals(app._id));

        if (!stores.length) {
            log.e('Wrong app %j', app);
            throw new Error('Wrong app ' + app._id);
        }

        let results = await Promise.all(stores.map(async store => {
            let result = await store.pushFetched(note, uids, date, over, true);
            result.collection = store.collectionName;
            result.field = store.field;
            result.cid = store.credentials._id;
            return result;
        }));
        log.i('Note %s pushFetched results: %j', note.id, results);

        let total = results.map(r => r.inserted).reduce((a, b) => a + b, 0),
            next = total ? Math.min(...results.filter(r => !!r.next).map(r => r.next)) : null;

        return {total: total, next: next};
    }

    /** getter for app objects
     * @param {object} note - note object
     * @returns {array} - list of app objects
     */
    apps(note) {
        return new Promise((resolve, reject) => {
            if (this._apps) {
                return resolve(this._apps);
            }
            this.db.collection('apps').find({_id: {$in: note.apps}}).toArray((err, apps) => {
                this._apps = apps;
                err ? reject(err) : resolve(apps || []);
            });
        });
    }

    /** clear
     * @param {object} note  - note object
     * @param {array} apps - list of app objects
     * @returns {Promise} - promise
     */
    async clear(note, apps) {
        let stores = await this.stores(note, apps);
        return Promise.all(stores.map(store => store.clear()));
    }

    /** clearNote
     * @param {object} note  - note object
     * @param {array} apps - list of app objects
     * @returns {Promise} - promise
     */
    async clearNote(note, apps) {
        let stores = await this.stores(note, apps);
        return Promise.all(stores.map(store => store.clearNote(note))).then(results => (results || []).map(r => r || 0).reduce((a, b) => a + b, 0));
    }

    /** ensureIndexes 
     * @param {object} note  - note object
     * @param {array} apps - list of app objects
     * @returns {Promise} - promise
     */
    async ensureIndexes(note, apps) {
        let stores = await this.stores(note, apps);
        return await Promise.all(stores.map(store => store.ensureIndexes()));
    }
}

module.exports = {
    Loader: Loader,
    Store: Store,
    StoreGroup: StoreGroup
};