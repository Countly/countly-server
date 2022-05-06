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
        this.cfg = await Sender.loadConfig();
    }

    /**
     * Load plgin configuration from db
     * 
     * @returns {object} config object
     */
    static async loadConfig() {
        let cfg = {
            sendAhead: 60000,
            connection: {
                retries: 3,
                retryFactor: 1000,
            },
            pool: {
                pushes: 100000,
                bytes: 100000,
                concurrency: 5
            }
        };

        // last date this job sends notifications for
        this.last = Date.now() + cfg.sendAhead;

        let plugins = await common.db.collection('plugins').findOne({});
        if (!plugins) {
            throw new PushError('No plugins configuration', ERROR.DATA_COUNTLY);
        }

        if (plugins.push) {
            if (plugins.push.sendahead) {
                try {
                    cfg.sendAhead = parseInt(plugins.push.sendahead, 10);
                }
                catch (e) {
                    this.log.w('Invalid sendahead plugin configuration: %j', plugins.push.sendahead);
                }
            }
            if (plugins.push.proxyhost && plugins.push.proxyport) {
                cfg.proxy = {
                    host: plugins.push.proxyhost,
                    port: plugins.push.proxyport,
                    user: plugins.push.proxyuser || undefined,
                    pass: plugins.push.proxypass || undefined,
                    auth: !(plugins.push.proxyunauthorized || false),
                };
            }
            if (plugins.push.bytes) {
                try {
                    cfg.pool.bytes = parseInt(plugins.push.bytes, 10);
                }
                catch (e) {
                    this.log.w('Invalid bytes plugin configuration: %j', plugins.push.bytes);
                }
            }
            if (plugins.push.concurrency) {
                try {
                    cfg.pool.concurrency = parseInt(plugins.push.concurrency, 10);
                }
                catch (e) {
                    this.log.w('Invalid concurrency plugin configuration: %j', plugins.push.concurrency);
                }
            }
        }

        return cfg;
    }

    /**
     * Watch push collection for pushes to send, 
     */
    async watch() {
        let oid = dbext.oidBlankWithDate(new Date()),
            count = await common.db.collection('push').count({_id: {$lte: oid}});
        return count > 0;
    }
    // /**
    //  * Watch push collection for pushes to send, 
    //  */
    //  async watch() {
    //     let oid = dbext.oidBlankWithDate(new Date());
    //     try {
    //         await common.db.collection('push').watch([{$match: {'fullDocument._id': {$lte: oid}}}], {maxAwaitTimeMS: 10000}).tryNext();
    //         return true;
    //     }
    //     catch (e) {
    //         if (e.code === 40573) { // not a replica set
    //             let count = await common.db.collection('push').count({_id: {$lte: oid}});
    //             return count > 0;
    //         }
    //         else {
    //             this.log('error in change stream', e);
    //             return false;
    //         }
    //     }
    // }

    /**
     * Run the sender:
     * - get a queue stream from db
     * - ensure we have a pool for each credentials
     * - encode and send pushes
     * - handle results
     */
    async send() {
        this.log.i('>>>>>>>>>> sending');

        // data shared across multiple streams
        let state = new State(this.cfg),
            connector = new Connector(this.log, common.db, state),
            batcher = new Batcher(this.log, state),
            resultor = new Resultor(this.log, common.db, state);

        try {
            // await db.collection('messages').updateMany({_id: {$in: Object.keys(this.msgs)}}, {$set: {state: State.Streaming, status: Status.Sending}});

            // stream the pushes
            let pushes = common.db.collection('push').find({_id: {$lte: dbext.oidBlankWithDate(new Date(Date.now() + state.cfg.sendAhead))}}).stream(),
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
                connector.end();
            });
            connector.once('close', () => {
                batcher.end();
            });
            // batcher.once('close', () => {
            //     resultor.end(function() {
            //         resultor.destroy();
            //     });
            // });
            // connector.on('close', () => batcher.closeOnSyn());

            // wait for last stream close
            resultor.once('close', () => {
                this.log.i('close');
                pools.exit();
                resolve();
            });
            pushes.on('error', err => {
                this.log.e('Streaming error', err);
                reject(err);
            });
            resultor.on('error', error => {
                this.log.e('Resultor error', error);
                reject(error);
            });
            batcher.on('error', err => {
                this.log.e('Batching error', err);
                reject(err);
            });
            connector.on('error', err => {
                this.log.e('Connector error', err);
                reject(err);
            });

            await promise;

            this.log.i('<<<<<<<<<< done sending');
        }
        catch (e) {
            this.log.e('Error during sending:', e);
            resultor.destroy();
            batcher.destroy();
            connector.destroy();
            pools.exit();

            // await common.db.collection('messages').updateMany({_id: {$in: Object.keys(this.msgs)}}, {$set: {state: State.Queued, status: Status.Scheduled}});
            throw e;
        }
    }
}

module.exports = Sender;