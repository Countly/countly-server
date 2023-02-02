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
                pushes: 500,
                bytes: 10000,
                concurrency: 5,
                pools: 10
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
                if (typeof plugins.push.sendahead === 'number') {
                    cfg.sendAhead = plugins.push.sendahead;
                }
                else {
                    common.log(`push:send`).w('Invalid sendahead plugin configuration: %j', plugins.push.sendahead);
                }
            }
            if (plugins.push.connection_retries) {
                if (typeof plugins.push.connection_retries === 'number') {
                    cfg.connection.retries = plugins.push.connection_retries;
                }
                else {
                    common.log(`push:send`).w('Invalid connection_retries plugin configuration: %j', plugins.push.connection_retries);
                }
            }
            if (plugins.push.connection_factor) {
                if (typeof plugins.push.connection_factor === 'number') {
                    cfg.connection.retryFactor = plugins.push.connection_factor;
                }
                else {
                    common.log(`push:send`).w('Invalid connection_factor plugin configuration: %j', plugins.push.connection_factor);
                }
            }
            if (plugins.push.pool_pushes) {
                if (typeof plugins.push.pool_pushes === 'number') {
                    cfg.pool.pushes = plugins.push.pool_pushes;
                }
                else {
                    common.log(`push:send`).w('Invalid pool_pushes plugin configuration: %j', plugins.push.pool_pushes);
                }
            }
            if (plugins.push.pool_bytes) {
                if (typeof plugins.push.pool_bytes === 'number') {
                    cfg.pool.bytes = plugins.push.pool_bytes;
                }
                else {
                    common.log(`push:send`).w('Invalid pool_bytes plugin configuration: %j', plugins.push.pool_bytes);
                }
            }
            if (plugins.push.pool_concurrency) {
                if (typeof plugins.push.pool_concurrency === 'number') {
                    cfg.pool.concurrency = plugins.push.pool_concurrency;
                }
                else {
                    common.log(`push:send`).w('Invalid pool_concurrency plugin configuration: %j', plugins.push.pool_concurrency);
                }
            }
            if (plugins.push.pool_pools) {
                if (typeof plugins.push.pool_pools === 'number') {
                    cfg.pool.pools = plugins.push.pool_pools;
                }
                else {
                    common.log(`push:send`).w('Invalid pool_pools plugin configuration: %j', plugins.push.pool_pools);
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
        this.log.i('>>>>>>>>>> sending, current configuration is %j', this.cfg);

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
                }),
                last = Date.now(),
                /**
                 * Periodic check to ensure mongo stream is closed once no more data is sent
                 */
                check = () => {
                    if (last === null) {
                        // do nothing, already unpiped
                    }
                    else if (last + 120000 < Date.now()) {
                        this.log.w('Streaming timeout, ignoring the rest');
                        last = null;
                        pushes.unpipe(connector);
                        connector.end();
                        // connector.destroy(new PushError('Streaming timeout'));
                    }
                    else {
                        setTimeout(check, 10000);
                    }
                };

            pushes.on('close', () => {
                last = null;
                this.log.w('pushes close');
            });
            pushes.on('unpipe', () => {
                last = null;
                this.log.w('pushes unpipe');
            });
            pushes.on('data', () => last = Date.now());
            setTimeout(check, 10000);

            connector.on('close', () => this.log.w('connector close'));
            connector.on('unpipe', () => this.log.w('connector unpipe'));

            pushes
                .pipe(connector)
                .pipe(batcher)
                .pipe(resultor, {end: false});

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