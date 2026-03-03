const http = require('http');
const https = require('https');
const fs = require('fs');
const countlyConfig = require('./config', 'dont-enclose');
const plugins = require('../plugins/pluginManager.ts');
const log = require('./utils/log.js')('core:api');
const common = require('./utils/common.js');
const {processRequest} = require('./utils/requestProcessor');
const {createApiApp} = require('./express/app');
const frontendConfig = require('../frontend/express/config.js');
const {WriteBatcher, ReadBatcher, InsertBatcher} = require('./parts/data/batcher.js');
const QueryRunner = require('./parts/data/QueryRunner.js');
const pack = require('../package.json');
const versionInfo = require('../frontend/express/version.info.js');
const moment = require("moment");
const tracker = require('./parts/mgmt/tracker.js');
require("./init_configs.js");

var granuralQueries = require('./parts/queries/coreAggregation.js');

//Add deletion manager endpoint
require('./utils/mutationManager.js');
const { RateLimiterMemory } = require("rate-limiter-flexible");

var t = ["countly:", "api"];
common.processRequest = processRequest;

log.i("Starting Countly", "version", versionInfo.version, "package", pack.version);
if (!common.checkDatabaseConfigMatch(countlyConfig.mongodb, frontendConfig.mongodb)) {
    log.w('API AND FRONTEND DATABASE CONFIGS ARE DIFFERENT');
}

// Finaly set the visible title
process.title = t.join(' ');

plugins.connectToAllDatabases().then(function() {
    log.d('Database connection successful');

    plugins.loadConfigs(common.db, function() {
        tracker.enable();
    });
    common.writeBatcher = new WriteBatcher(common.db);
    common.readBatcher = new ReadBatcher(common.db);
    common.insertBatcher = new InsertBatcher(common.db);
    common.queryRunner = new QueryRunner();

    common.drillQueryRunner = granuralQueries;
    if (common.drillDb) {
        common.drillReadBatcher = new ReadBatcher(common.drillDb, {configs_db: common.db});
    }

    /**
     * Set Max Sockets
     */
    http.globalAgent.maxSockets = countlyConfig.api.max_sockets || 1024;

    // mutation manager default settings
    [
        { key: 'max_retries', value: 3 },
        { key: 'retry_delay_ms', value: 30 * 60 * 1000 },
        { key: 'validation_interval_ms', value: 3 * 60 * 1000 },
        { key: 'stale_ms', value: 24 * 60 * 60 * 1000 },
        { key: 'batch_limit', value: 10 }
    ].forEach(item => {
        const path = `mutation_manager.${item.key}`;
        const update = {};
        update[path] = item.value;
        common.db.collection('plugins').updateOne(
            { _id: 'plugins', [path]: { $exists: false } },
            { $set: update }
        ).catch(e => {
            const message = `Failed to add mutation_manager default for ${item.key}: ${e}`;
            log && log.e ? log.e(message) : console.log(message);
        });
    });

    if (common.queryRunner && typeof common.queryRunner.isAdapterAvailable === 'function' && common.queryRunner.isAdapterAvailable('clickhouse')) {
        common.db.collection('plugins').updateOne(
            {
                _id: 'plugins',
                'mutation_manager.ch_max_parts_per_partition': { $exists: false },
                'mutation_manager.ch_max_total_mergetree_parts': { $exists: false }
            },
            {
                $set: {
                    'mutation_manager.ch_max_parts_per_partition': 1000,
                    'mutation_manager.ch_max_total_mergetree_parts': 100000
                }
            }).catch(e => {
            const message = `Failed to add mutation_manager defaults: ${e}`;
            log && log.e ? log.e(message) : console.log(message);
        });
    }

    /**
    * Initialize Plugins
    */
    plugins.init();

    /**
     *  Trying to gracefully handle the batch state
     *  @param {number} code - error code
     */
    async function storeBatchedData(code) {
        try {

            await new Promise((resolve) => {
                server.close((err) => {
                    if (err) {
                        console.log("Error closing server:", err);
                    }
                    else {
                        console.log("Server closed successfully");
                        resolve();
                    }
                });
            });

            await common.writeBatcher.flushAll();
            await common.insertBatcher.flushAll();
            console.log("Successfully stored batch state");
        }
        catch (ex) {
            console.log("Could not store batch state", ex);
        }
        process.exit(typeof code === "number" ? code : 1);
    }

    /**
     *  Handle before exit for gracefull close
     */
    process.on('beforeExit', (code) => {
        console.log('Received exit, trying to save batch state: ', code);
        storeBatchedData(code);
    });

    /**
     *  Handle exit events for gracefull close
     */
    ['SIGHUP', 'SIGINT', 'SIGQUIT', 'SIGILL', 'SIGTRAP', 'SIGABRT',
        'SIGBUS', 'SIGFPE', 'SIGSEGV', 'SIGTERM',
    ].forEach(function(sig) {
        process.on(sig, async function() {
            storeBatchedData(sig);
            console.log('Got signal: ' + sig);
        });
    });

    /**
     * Uncaught Exception Handler
     */
    process.on('uncaughtException', (err) => {
        console.log('Caught exception: %j', err, err.stack);
        if (log && log.e) {
            log.e('Logging caught exception');
        }
        console.trace();
        storeBatchedData(1);
    });

    /**
     * Unhandled Rejection Handler
     */
    process.on('unhandledRejection', (reason, p) => {
        console.log('Unhandled rejection for %j with reason %j stack ', p, reason, reason ? reason.stack : undefined);
        if (log && log.e) {
            log.e('Logging unhandled rejection');
        }
        console.trace();
    });

    var utcMoment = moment.utc();
    var incObj = {};
    incObj.r = 1;
    incObj[`d.${utcMoment.format("D")}.${utcMoment.format("H")}.r`] = 1;
    common.db.collection("diagnostic").updateOne({"_id": "no-segment_" + utcMoment.format("YYYY:M")}, {"$set": {"m": utcMoment.format("YYYY:M")}, "$inc": incObj}, {"upsert": true}, function(err) {
        if (err) {
            log.e(err);
        }
    });

    plugins.installMissingPlugins(common.db);
    /** @type {import('./utils/taskmanager').TaskManagerStatic} */
    const taskManager = require('./utils/taskmanager.js');
    //since process restarted mark running tasks as errored
    taskManager.errorResults({db: common.db});

    plugins.dispatch("/master", {}); // init hook

    // Rate limiting as Express middleware (same logic as before)
    const rateLimitWindow = parseInt(plugins.getConfig("security").api_rate_limit_window, 10) || 0;
    const rateLimitRequests = parseInt(plugins.getConfig("security").api_rate_limit_requests, 10) || 0;
    const rateLimiterInstance = new RateLimiterMemory({ points: rateLimitRequests, duration: rateLimitWindow });
    const requiresRateLimiting = rateLimitWindow > 0 && rateLimitRequests > 0;
    const omit = /^\/i(\/bulk)?(\?|$)/; // omit /i endpoint from rate limiting

    /**
     * Express rate limiting middleware
     * @param {object} req - Express request
     * @param {object} res - Express response
     * @param {Function} next - next middleware
     */
    const rateLimitMiddleware = (req, res, next) => {
        if (!requiresRateLimiting || omit.test(req.url)) {
            return next();
        }
        const ip = common.getIpAddress(req);
        rateLimiterInstance
            .consume(ip)
            .then(() => next())
            .catch(() => {
                log.w(`Rate limit exceeded for IP: ${ip}`);
                common.returnMessage({req, res, qstring: {}}, 429, "Too Many Requests");
            });
    };

    // Create the Express app with the full middleware stack
    const app = createApiApp({countlyConfig, processRequest, plugins, rateLimitMiddleware});

    const serverOptions = {
        port: common.config.api.port,
        host: common.config.api.host || ''
    };

    let server;
    if (common.config.api.ssl && common.config.api.ssl.enabled) {
        const sslOptions = {
            key: fs.readFileSync(common.config.api.ssl.key),
            cert: fs.readFileSync(common.config.api.ssl.cert)
        };
        if (common.config.api.ssl.ca) {
            sslOptions.ca = fs.readFileSync(common.config.api.ssl.ca);
        }
        server = https.createServer(sslOptions, app);
    }
    else {
        server = http.createServer(app);
    }

    server.listen(serverOptions.port, serverOptions.host, () => {
        log.i('Server listening on', serverOptions.host + ':' + serverOptions.port);
    });

    server.timeout = common.config.api.timeout || 120000;
    server.keepAliveTimeout = common.config.api.timeout || 120000;
    server.headersTimeout = (common.config.api.timeout || 120000) + 1000;

    plugins.loadConfigs(common.db);
}).catch(function(error) {
    log.e('Database connection failed:', error);
    process.exit(1);
});
