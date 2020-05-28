const DB = require('./mongo'),
    LOG = require('../api/utils/log.js'),
    http = require('http'),
    configextender = require('../api/configextender');

let log;

/**
 * Create plain HTTP server
 * @param  {String} host    hostname to listen on
 * @param  {Number} port    port number
 * @param  {Function} handler standard http.Server handler function
 * @return {Promise}        resolves with a server instance
 */
function createServer(host, port, handler) {
    return new Promise((res, rej) => {
        let server = http.Server(handler),
            checks = 0,
            timeout;

        server.listen(port, host, err => {
            if (err) {
                rej(err);
            }
            else {
                res(server);
            }
        });
        server.on('error', rej);

        // /**
        //  * Check the server is bound to the port, try again later otherwise
        //  */
        // function check() {
        //     if (server.isListening) {
        //         clearTimeout(timeout);
        //         res(server);
        //     }
        //     else if (checks > 100) { // 5s
        //         clearTimeout(timeout);
        //         server.close(true);
        //         rej('timeout');
        //     }
        //     else {
        //         checks++;
        //         timeout = setTimeout(check, 50);
        //     }
        // }

        // check();
    });
}

module.exports = {
    db: undefined,
    drillDb: undefined,
    mongo: undefined,
    config: undefined,
    log: LOG,


    init: function(config, app, pluginType) {
        // TODO: log needs config
        this.config = configextender(config);
        this.app = app;

        log = LOG('core');

        log.i(`Starting ${config.title}`);

        this.mongo = new DB(this.config.mongodb);

        return this.mongo.connect().then(function(client) {
            this.db = client.db('countly');

            // api or frontend or jobs or whatever
            // passing to limit number of plugins loaded
            if (pluginType) {
                this.plugins = require('./plugins', pluginType);
            }

            // this.drillDb = client.db('countly_drill');
            // TODO: other dbs depending on config
        }.bind(this));
    },

    nginx: require('./nginx'),

    http: async function(app, handler) {
        let cfg = this.config[app],
            port = cfg.port,
            server;

        while (port < cfg.port + 998) {

            try {
                server = await createServer(cfg.host, port, handler);
                break;
            }
            catch (e) {
                if (e.code === 'EADDRINUSE') {
                    port++;
                }
                else {
                    throw e;
                }
            }

        }

        server.timeout = cfg.timeout;

        this.port = port;
        await this.nginx.write(log, this.config, this.app, this.nginx.read(log, this.config, this.app).concat([this.port]));

        return server;
    },

    listenForErrors: function(logger) {
        process.on('uncaughtException', (err) => {
            logger.e('Caught exception: %j', err, err.stack);
            logger.trace();
            process.exit(1);
        });

        /**
         * Unhandled Rejection Handler
         */
        process.on('unhandledRejection', (reason, p) => {
            logger.e('Unhandled rejection for %j with reason %j stack ', p, reason, reason ? reason.stack : undefined);
            logger.trace();
        });

    },

    gracefulShutdown: function(preDb, postDb) {
        process.on('SIGINT', () => {
            log.i(`Stopping ${this.app}`);
            let err = false;
            (preDb ? preDb() : Promise.resolve()).catch(e => {
                log.e('Error during preDb callback', e);
                err = true;
            })
                .then(this.shutdown.bind(this)).catch(e => {
                    log.e('Error during db disconnect', e);
                    err = true;
                })
                .then(postDb ? postDb() : Promise.resolve()).catch(e => {
                    log.e('Error during postDb callback', e);
                    err = true;
                })
                .then(() => {
                    process.exit(err ? 1 : 0);
                });
        });
    },

    shutdown: async function() {
        if (this.port) {
            await this.nginx.write(log, this.config, this.app, this.nginx.read(log, this.config, this.app).filter(p => p !== this.port));
            this.port = undefined;
        }

        if (this.mongo) {
            log.i(`Disconnecting from MongoDB`);
            await this.mongo.disconnect();
        }
        return Promise.resolve();
    }
};