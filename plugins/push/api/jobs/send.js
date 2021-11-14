const J = require('../../../../api/parts/jobs/job.js'),
    { State, Status, PushError, ERROR } = require('../send'),
    { Batcher } = require('./util/batcher'),
    { Resultor } = require('./util/resultor'),
    { Connector } = require('./util/connector');

/**
 * Main push job: load queue and forward it to corresponging pool
 * IMPORTANT: ONLY ONE JOB CAN BE RUNNING AT A TIME!
 **/
class Send extends J.Job {
    /**
     * Constructor
     * 
     * @param {string} name - job name
     * @param {object} data - job data
     */
    constructor(name, data) {
        super(name, data);

        this.log = require('../../../../api/utils/log.js')(`job:push:send:${this.id}`);
        this.log.d('initializing ProcessJob with %j & %j', name, data);
    }

    /**
     * Prepare the job by loading credentials & configuration
     * 
     * @param {object} manager - manager
     * @param {object} db - db connection
     * @returns {Promise} - resolved or rejected
     */
    async prepare(manager, db) {
        // this.creds = await Credentials.load(this._data.cid);
        // if (!this.creds) {
        //     throw new PushError('No such credentials', ERROR.DATA_COUNTLY);
        // }

        // this.app = await db.collection('apps').findOne({
        //     _id: typeof this.aid === 'string' ? db.ObjectID(this.aid) : this.aid,
        //     $or: [{'plugins.push.i._id': this.creds._id}, {'plugins.push.a._id': this.creds._id}, {'plugins.push.h._id': this.creds._id}]
        // });
        // if (!this.app) {
        //     throw new PushError('No such app', ERROR.DATA_COUNTLY);

        // last date this job sends notifications for
        this.last = Date.now() + this.cfg.sendAhead;

        // loaded configuration
        this.cfg = {
            connectionRetries: 3,
            connectionRetryFactor: 1000,
            sendAhead: 60000,
            pool: {
                bytes: 100000,
                concurrency: 5
            }
        };

        let plugins = await db.collection('plugins').findOne({});
        if (!plugins) {
            throw new PushError('No plugins configuration', ERROR.DATA_COUNTLY);
        }

        if (plugins.push) {
            if (plugins.push.sendahead) {
                try {
                    this.cfg.sendAhead = parseInt(plugins.push.sendahead);
                }
                catch (e) {
                    this.log.w('Invalid sendahead plugin configuration: %j', plugins.push.sendahead);
                }
            }
            if (plugins.push.proxyhost && plugins.push.proxyport) {
                this.cfg.proxy = {
                    host: plugins.push.proxyhost,
                    port: plugins.push.proxyport,
                    user: plugins.push.proxyuser,
                    pass: plugins.push.proxypass,
                };
            }
            if (plugins.push.bytes) {
                try {
                    this.cfg.pool.bytes = parseInt(plugins.push.bytes);
                }
                catch (e) {
                    this.log.w('Invalid bytes plugin configuration: %j', plugins.push.bytes);
                }
            }
            if (plugins.push.concurrency) {
                try {
                    this.cfg.pool.concurrency = parseInt(plugins.push.concurrency);
                }
                catch (e) {
                    this.log.w('Invalid concurrency plugin configuration: %j', plugins.push.concurrency);
                }
            }
        }

        // this.msgs = {}; // {mid: message}
        // this.msgsPerApp = {}; // {aid: [message, ...]}
        // await db.collection('messages').find({
        //     state: State.Queued,
        //     $or: [
        //         {triggers: {$elemMatch: {kind: TriggerKind.Plain, start: {$lte: this.last}}}},
        //         {triggers: {$elemMatch: {kind: TriggerKind.Cohort, start: {$lte: this.last}, end: {$gte: this.last}}}},
        //         {triggers: {$elemMatch: {kind: TriggerKind.Event, start: {$lte: this.last}, end: {$gte: this.last}}}},
        //         {triggers: {$elemMatch: {kind: TriggerKind.API, start: {$lte: this.last}, end: {$gte: this.last}}}},
        //     ]
        // }).forEach(m => {
        //     if (!this.msgsPerApp[m.app]) {
        //         this.msgsPerApp = [];
        //     }
        //     this.msgsPerApp.push(this.msgs[m._id] = new Message(m));
        // });
    }

    /**
     * Run the job:
     * - get a queue stream from db
     * - ensure we have a pool for each credentials
     * - encode and send pushes
     * - handle results
     * 
     * @param {MongoClient} db database connection
     */
    async run(db) {

        // data shared across multiple streams
        let state = new State(),
            connector = new Connector(this.log, db, state, 100000),
            batcher = new Batcher(this.log, 100000),
            resultor = new Resultor(this.log, db, state, 100000);

        try {
            // mark messages as being sent
            await db.collection('messages').updateMany({_id: {$in: Object.keys(this.msgs)}}, {$set: {state: State.Streaming, status: Status.Sending}});

            // stream the pushes
            db.collection('push').find({d: {$lte: this.last}}).sort({d: 1}).stream()
                .pipe(connector)
                .pipe(batcher)
                .pipe(resultor);

            // wait for last stream close
            await new Promise((resolve, reject) => {
                resultor.on('error', error => {
                    this.log.e('error', error);
                    reject(error);
                });
                resultor.on('close', () => {
                    this.log.i('close');
                    resolve();
                });
            });
        }
        catch (e) {
            this.log.e('Error during sending:', e);
            await db.collection('messages').updateMany({_id: {$in: Object.keys(this.msgs)}}, {$set: {state: State.Queued, status: Status.Scheduled}});
            throw e;
        }
    }

    /**
     * Record recoverable message error (token expired, invalid token, etc)
     * 
     * @param {MongoClient} db database connection
     * @param {object[]} pushes push objects
     * @param {string} code error code
     * @returns {Promise} resolves to number of pushes processed when done
     */
    recordRecoverableMessagesErrors(db, pushes, code) {
        return db.collection('push').deleteMany({_id: {$in: pushes.map(x => x._id)}}).then(() => {
            let bymid = {};
            pushes.forEach(p => {
                if (!bymid[p.m]) {
                    bymid[p.m] = 0;
                }
                bymid[p.m]++;
            });

            return Promise.all(Object.keys(bymid).map(mid => {
                return this.msgs[mid].update({
                    $inc: {
                        [`result.processed`]: bymid[mid],
                        [`result.errors.${code}`]: bymid[mid],
                    }
                }, () => {
                    this.msgs[mid].result.processed = (this.msgs[mid].result.processed || 0) + bymid[mid];
                    this.msgs[mid].result.errors[code] = (this.msgs[mid].result.errors[code] || 0) + bymid[mid];
                    return this.msgs[mid];
                }).then(m => {
                    // in case all pushes within a message are filtered out, record non-recoverable error
                    if (m.result.error[code] === m.result.processed && m.result.processed === m.result.total) {
                        return this.recordFatalMessageError(m, new PushError('No push credentials', ERROR.DATA_COUNTLY));
                    }
                });
            })).then(() => pushes.length);
        });
    }

    /**
     * Schedule next job based on first in queue
     */
    async requeue() {
        let next = await this.loader.next();

        if (next) {
            try {
                let n = await this.replaceAfter(next);
                this.log.d('requeue result %s %j: %j', this._id, this.data, n._id, new Date(n.next));
            }
            catch (e) {
                this.log.e('Error while running requeue:', e);
            }
        }
    }

    /**
     * Replace consequent jobs scheduled with new one
     * 
     * @param {number} next - timestamp
     * @returns {Promise} - resolved if updated
     */
    replaceAfter(next) {
        return super.replaceAfter(next, query => {
            if (query.data) {
                let q = {};
                Object.keys(query.data).forEach(k => {
                    if (('' + query.data[k]).length === 24) {
                        try {
                            q['data.' + k] = {
                                $in: [
                                    query.data[k],
                                    typeof query.data[k] === 'string' ? this.db().ObjectID(query.data[k]) : '' + query.data[k]
                                ]
                            };
                        }
                        catch (e) {
                            q['data.' + k] = query.data[k];
                            this.log.w('Cannot expand reschedule query', e);
                        }
                    }
                    else {
                        q['data.' + k] = query.data[k];
                    }
                });

                Object.keys(q).forEach(k => query[k] = q[k]);
                delete query.data;
            }
        });
    }

    /**
     * Finish the job, ensure next one is scheduled
     * 
     * @param {object} err - error message or object
     */
    async _finish(err) {
        if (err) {
            let counts = await this.loader.counts(Date.now() + this.cfg.sendAhead, this._id);
            if (counts.total) {
                this.log.w('Going to reload counts %j', counts);
                let notes = await this.loader.notes(Object.keys(counts).filter(k => k !== 'total'));
                await this.handleResults(err, Object.values(notes));
                await this.loader.reload(this._id);
            }
            else {
                counts = await this.loader.counts(Date.now() + this.cfg.sendAhead);
                if (counts.total) {
                    this.log.w('Going to reload counts without a job %j', counts);
                    let notes = await this.loader.notes(Object.keys(counts).filter(k => k !== 'total'));
                    await this.handleResults(err, Object.values(notes));
                }
            }
        }

        if (!this.isCompleted) {
            await this.requeue();
        }

        return await super._finish(err);
    }
}

module.exports = Send;