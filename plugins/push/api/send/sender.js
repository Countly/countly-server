const { State } = require('../jobs/util/state'),
    { Batcher } = require('../jobs/util/batcher'),
    { Resultor } = require('../jobs//util/resultor'),
    { Connector } = require('../jobs//util/connector'),
    { PushError, ERROR, dbext, pools } = require('./index'),
    common = require('../../../../api/utils/common');

/**
 * Main queue processing class
 **/
class Sender {
    /**
     * Constructor
     */
    constructor() {
        this.log = common.log(`push:send`);
    }

    /**
     * Prepare the job by loading credentials & configuration
     * 
     * @returns {Promise} - resolved or rejected
     */
    async prepare() {
        // this.log.d('preparing sender');

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

        // last date this job sends notifications for
        this.last = Date.now() + this.cfg.sendAhead;

        let plugins = await common.db.collection('plugins').findOne({});
        if (!plugins) {
            throw new PushError('No plugins configuration', ERROR.DATA_COUNTLY);
        }

        if (plugins.push) {
            if (plugins.push.sendahead) {
                try {
                    this.cfg.sendAhead = parseInt(plugins.push.sendahead, 10);
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
                    this.cfg.pool.bytes = parseInt(plugins.push.bytes, 10);
                }
                catch (e) {
                    this.log.w('Invalid bytes plugin configuration: %j', plugins.push.bytes);
                }
            }
            if (plugins.push.concurrency) {
                try {
                    this.cfg.pool.concurrency = parseInt(plugins.push.concurrency, 10);
                }
                catch (e) {
                    this.log.w('Invalid concurrency plugin configuration: %j', plugins.push.concurrency);
                }
            }
        }

        // this.log.d('sender prepared');

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
     * Watch push collection for pushes to send, 
     */
    async watch() {
        let oid = dbext.oidBlankWithDate(new Date(Date.now()));
        try {
            await common.db.collection('push').watch([{$match: {_id: {$lte: oid}}}], {maxAwaitTimeMS: 60000}).next();
            return true;
        }
        catch (e) {
            if (e.code === 40573) { // not a replica set
                let count = await common.db.collection('push').count({_id: {$lte: oid}});
                return count > 0;
            }
            else {
                this.log('error in change stream', e);
                return false;
            }
        }
    }

    /**
     * Run the sender:
     * - get a queue stream from db
     * - ensure we have a pool for each credentials
     * - encode and send pushes
     * - handle results
     */
    async send() {
        this.log.d('sending');

        // data shared across multiple streams
        let state = new State(this.cfg),
            connector = new Connector(this.log, common.db, state, 100000),
            batcher = new Batcher(this.log, state, 100000),
            resultor = new Resultor(this.log, common.db, state, 100000);

        try {
            // await db.collection('messages').updateMany({_id: {$in: Object.keys(this.msgs)}}, {$set: {state: State.Streaming, status: Status.Sending}});

            // stream the pushes
            let pushes = common.db.collection('push').find({_id: {$lte: dbext.oidBlankWithDate(new Date(Date.now() + this.cfg.sendAhead))}}).stream(),
                flush,
                resolve, reject,
                promise = new Promise((res, rej) => {
                    resolve = res;
                    reject = rej;
                });

            pushes
                .pipe(connector, {end: false})
                .pipe(batcher, {end: false})
                .pipe(resultor, {end: false});

            pushes.once('close', () => {
                flush = connector.flushIt();
            });
            // connector.on('close', () => batcher.closeOnSyn());

            // wait for last stream close
            resultor.on('error', error => {
                this.log.e('error', error);
                reject(error);
            });
            resultor.on('close', () => {
                this.log.i('close');
                resolve();
            });
            resultor.on('data', dt => {
                this.log.i('data', dt);
                if (flush === dt.payload) {
                    resultor.destroy();
                    batcher.destroy();
                    connector.destroy();
                    pools.exit();
                }
            });

            await promise;

            this.log.d('done sending');
        }
        catch (e) {
            this.log.e('Error during sending:', e);
            // await common.db.collection('messages').updateMany({_id: {$in: Object.keys(this.msgs)}}, {$set: {state: State.Queued, status: Status.Scheduled}});
            throw e;
        }
    }
}

module.exports = Sender;