const http = require('http');
const https = require('https');
const fs = require('fs');
const formidable = require('formidable');
const countlyConfig = require('./config', 'dont-enclose');
const plugins = require('../plugins/pluginManager.js');
const log = require('./utils/log.js')('core:api');
const common = require('./utils/common.js');
const {processRequest} = require('./utils/requestProcessor');
const frontendConfig = require('../frontend/express/config.js');
const {WriteBatcher, ReadBatcher, InsertBatcher} = require('./parts/data/batcher.js');
const QueryRunner = require('./parts/data/QueryRunner.js');
const pack = require('../package.json');
const versionInfo = require('../frontend/express/version.info.js');
const moment = require("moment");

// EXTENSIVE DEBUGGING - Print configuration
console.log('=== COUNTLY API STARTUP DEBUG ===');
console.log('Process ENV SERVICE_TYPE:', process.env.SERVICE_TYPE);
console.log('Config loaded:', !!countlyConfig);
console.log('Config keys:', Object.keys(countlyConfig));
console.log('Full config:', JSON.stringify(countlyConfig, null, 2));
console.log('API config:', JSON.stringify(countlyConfig.api, null, 2));
console.log('MongoDB config:', JSON.stringify(countlyConfig.mongodb, null, 2));
console.log('ClickHouse config:', JSON.stringify(countlyConfig.clickhouse, null, 2));
console.log('Logging config:', JSON.stringify(countlyConfig.logging, null, 2));
console.log('=== END CONFIG DEBUG ===');

var granuralQueries = require('./parts/queries/coreAggregation.js');

//Add deletion manager endpoint
require('./utils/deletionManager.js');

var t = ["countly:", "api"];
common.processRequest = processRequest;

console.log("Starting Countly", "version", versionInfo.version, "package", pack.version);
console.log('=== DATABASE CONFIG CHECK ===');
console.log('countlyConfig.mongodb:', JSON.stringify(countlyConfig.mongodb, null, 2));
console.log('frontendConfig.mongodb:', JSON.stringify(frontendConfig.mongodb, null, 2));
if (!common.checkDatabaseConfigMatch(countlyConfig.mongodb, frontendConfig.mongodb)) {
    log.w('API AND FRONTEND DATABASE CONFIGS ARE DIFFERENT');
    console.log('WARNING: Database configs do not match!');
}
console.log('=== END DATABASE CONFIG CHECK ===');

// Finaly set the visible title
process.title = t.join(' ');

console.log('=== CONNECTING TO DATABASES ===');
plugins.connectToAllDatabases().then(function() {
    console.log('✓ Database connection successful');
    console.log('common.db available:', !!common.db);
    console.log('common.drillDb available:', !!common.drillDb);

    common.writeBatcher = new WriteBatcher(common.db);
    common.readBatcher = new ReadBatcher(common.db);
    common.insertBatcher = new InsertBatcher(common.db);
    common.queryRunner = new QueryRunner();
    console.log('✓ Batchers and QueryRunner initialized');

    common.drillQueryRunner = granuralQueries;
    if (common.drillDb) {
        common.drillReadBatcher = new ReadBatcher(common.drillDb);
        console.log('✓ Drill database components initialized');
    }

    /**
     * Set Max Sockets
     */
    console.log('=== SETTING MAX SOCKETS ===');
    console.log('countlyConfig.api.max_sockets:', countlyConfig.api.max_sockets);
    http.globalAgent.maxSockets = countlyConfig.api.max_sockets || 1024;
    console.log('✓ Max sockets set to:', http.globalAgent.maxSockets);

    /**
     * Set Plugins APIs Config
     */
    plugins.setConfigs("api", {
        domain: "",
        safe: false,
        session_duration_limit: 86400,
        country_data: true,
        city_data: true,
        event_limit: 500,
        event_segmentation_limit: 100,
        event_segmentation_value_limit: 1000,
        array_list_limit: 10,
        metric_limit: 1000,
        sync_plugins: false,
        session_cooldown: 15,
        request_threshold: 30,
        total_users: true,
        export_limit: 10000,
        prevent_duplicate_requests: true,
        metric_changes: true,
        offline_mode: false,
        reports_regenerate_interval: 3600,
        send_test_email: "",
        //data_retention_period: 0,
        batch_processing: true,
        //batch_on_master: false,
        batch_period: 10,
        batch_read_processing: true,
        //batch_read_on_master: false,
        batch_read_ttl: 600,
        batch_read_period: 60,
        user_merge_paralel: 1,
        trim_trailing_ending_spaces: false,
        calculate_aggregated_from_granular: false
    });

    /**
     * Set Plugins APPs Config
     */
    plugins.setConfigs("apps", {
        country: "TR",
        timezone: "Europe/Istanbul",
        category: "6"
    });

    /**
     * Set Plugins Security Config
     */
    plugins.setConfigs("security", {
        login_tries: 3,
        login_wait: 5 * 60,
        password_min: 8,
        password_char: true,
        password_number: true,
        password_symbol: true,
        password_expiration: 0,
        password_rotation: 3,
        password_autocomplete: true,
        robotstxt: "User-agent: *\nDisallow: /",
        dashboard_additional_headers: "X-Frame-Options:deny\nX-XSS-Protection:1; mode=block\nStrict-Transport-Security:max-age=31536000; includeSubDomains; preload\nX-Content-Type-Options: nosniff",
        api_additional_headers: "X-Frame-Options:deny\nX-XSS-Protection:1; mode=block\nStrict-Transport-Security:max-age=31536000; includeSubDomains; preload\nAccess-Control-Allow-Origin:*",
        dashboard_rate_limit_window: 60,
        dashboard_rate_limit_requests: 500,
        proxy_hostname: "",
        proxy_port: "",
        proxy_username: "",
        proxy_password: "",
        proxy_type: "https"
    });

    /**
     * Set Plugins Logs Config
     */
    plugins.setConfigs('logs',
        {
            debug: (countlyConfig.logging && countlyConfig.logging.debug) ? countlyConfig.logging.debug.join(', ') : '',
            info: (countlyConfig.logging && countlyConfig.logging.info) ? countlyConfig.logging.info.join(', ') : '',
            warn: (countlyConfig.logging && countlyConfig.logging.warn) ? countlyConfig.logging.warn.join(', ') : '',
            error: (countlyConfig.logging && countlyConfig.logging.error) ? countlyConfig.logging.error.join(', ') : '',
            default: (countlyConfig.logging && countlyConfig.logging.default) ? countlyConfig.logging.default : 'warn',
        }
    );

    /**
     * Initialize Plugins
     */
    console.log('=== INITIALIZING PLUGINS ===');
    plugins.init();
    console.log('✓ Plugins initialized');

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
    const taskManager = require('./utils/taskmanager.js');
    //since process restarted mark running tasks as errored
    taskManager.errorResults({db: common.db});

    plugins.dispatch("/master", {}); // init hook

    console.log('=== CREATING SERVER ===');
    console.log('common.config.api:', JSON.stringify(common.config.api, null, 2));
    const serverOptions = {
        port: common.config.api.port,
        host: common.config.api.host || ''
    };
    console.log('Server options:', serverOptions);

    let server;
    if (common.config.api.ssl && common.config.api.ssl.enabled) {
        console.log('Creating HTTPS server with SSL');
        const sslOptions = {
            key: fs.readFileSync(common.config.api.ssl.key),
            cert: fs.readFileSync(common.config.api.ssl.cert)
        };
        if (common.config.api.ssl.ca) {
            sslOptions.ca = fs.readFileSync(common.config.api.ssl.ca);
        }
        server = https.createServer(sslOptions, handleRequest);
    }
    else {
        console.log('Creating HTTP server');
        server = http.createServer(handleRequest);
    }

    console.log('Starting server on', serverOptions.host + ':' + serverOptions.port);
    server.listen(serverOptions.port, serverOptions.host, () => {
        console.log('✓ Server listening on', serverOptions.host + ':' + serverOptions.port);
    });

    server.timeout = common.config.api.timeout || 120000;
    server.keepAliveTimeout = common.config.api.timeout || 120000;
    server.headersTimeout = (common.config.api.timeout || 120000) + 1000; // Slightly higher
    console.log('✓ Server timeouts configured:', {
        timeout: server.timeout,
        keepAliveTimeout: server.keepAliveTimeout,
        headersTimeout: server.headersTimeout
    });


    console.log('=== LOADING PLUGIN CONFIGS ===');
    plugins.loadConfigs(common.db);
    console.log('✓ Plugin configs loaded');
    console.log('=== API STARTUP COMPLETE ===');
}).catch(function(error) {
    console.error('❌ DATABASE CONNECTION FAILED:', error);
    console.error('Error details:', error.stack);
    process.exit(1);
});

/**
 * Handle incoming HTTP/HTTPS requests
 * @param {http.IncomingMessage} req - The request object
 * @param {http.ServerResponse} res - The response object
 */
function handleRequest(req, res) {
    const params = {
        qstring: {},
        res: res,
        req: req
    };

    res.setHeader('Connection', 'keep-alive');
    res.setHeader('Keep-Alive', 'timeout=5, max=1000');

    if (req.method.toLowerCase() === 'post') {
        const formidableOptions = {};
        if (countlyConfig.api.maxUploadFileSize) {
            formidableOptions.maxFileSize = countlyConfig.api.maxUploadFileSize;
        }

        const form = new formidable.IncomingForm(formidableOptions);
        if (/crash_symbols\/(add_symbol|upload_symbol)/.test(req.url)) {
            req.body = [];
            req.on('data', (data) => {
                req.body.push(data);
            });
        }
        else {
            req.body = '';
            req.on('data', (data) => {
                req.body += data;
            });
        }

        let multiFormData = false;
        // Check if we have 'multipart/form-data'
        if (req.headers['content-type']?.startsWith('multipart/form-data')) {
            multiFormData = true;
        }

        form.parse(req, (err, fields, files) => {
            //handle bakcwards compatability with formiddble v1
            for (let i in files) {
                if (files[i].filepath) {
                    files[i].path = files[i].filepath;
                }
                if (files[i].mimetype) {
                    files[i].type = files[i].mimetype;
                }
                if (files[i].originalFilename) {
                    files[i].name = files[i].originalFilename;
                }
            }
            params.files = files;
            if (multiFormData) {
                let formDataUrl = [];
                for (const i in fields) {
                    params.qstring[i] = fields[i];
                    formDataUrl.push(`${i}=${fields[i]}`);
                }
                params.formDataUrl = formDataUrl.join('&');
            }
            else {
                for (const i in fields) {
                    params.qstring[i] = fields[i];
                }
            }
            if (!params.apiPath) {
                processRequest(params);
            }
        });
    }
    else if (req.method.toLowerCase() === 'options') {
        const headers = {};
        headers["Access-Control-Allow-Origin"] = "*";
        headers["Access-Control-Allow-Methods"] = "POST, GET, OPTIONS";
        headers["Access-Control-Allow-Headers"] = "countly-token, Content-Type";
        res.writeHead(200, headers);
        res.end();
    }
    //attempt process GET request
    else if (req.method.toLowerCase() === 'get') {
        processRequest(params);
    }
    else {
        common.returnMessage(params, 405, "Method not allowed");
    }
}