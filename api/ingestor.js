const http = require('http');
const formidable = require('formidable');
const countlyConfig = require('./config');
const plugins = require('../plugins/pluginManager.js');
const log = require('./utils/log.js')('ingestor-core:api');
const {processRequest} = require('./ingestor/requestProcessor');
const common = require('./utils/common.js');
const {Cacher} = require('./parts/data/cacher.js');

var t = ["countly:", "ingestor"];
t.push("node");

// Finaly set the visible title
process.title = t.join(' ');

console.log("Connecting to databases");

//Overriding function
plugins.loadConfigs = plugins.loadConfigsIngestor;

/**
 * TODO
 * temporarily change this false since it fails at
 * Cannot create uid TypeError: common.db.ObjectID is not a function
 * at usersApi.getUid (api/parts/mgmt/app_users.js:434:90)
 */
plugins.connectToAllDatabases(false).then(function() {
    log.i("Db connections done");
    // common.writeBatcher = new WriteBatcher(common.db);
    common.readBatcher = new Cacher(common.db);
    //common.insertBatcher = new InsertBatcher(common.db);
    if (common.drillDb) {
        common.drillReadBatcher = new Cacher(common.drillDb);
    }
    /**
    * Set Max Sockets
    */
    http.globalAgent.maxSockets = countlyConfig.api.max_sockets || 1024;
    /**
    * Set Plugins APIs Config
    */
    //Put in single file outside(all set configs)
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
        trim_trailing_ending_spaces: false
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
        dashboard_additional_headers: "X-Frame-Options:deny\nX-XSS-Protection:1; mode=block\nStrict-Transport-Security:max-age=31536000 ; includeSubDomains\nX-Content-Type-Options: nosniff",
        api_additional_headers: "X-Frame-Options:deny\nX-XSS-Protection:1; mode=block\nAccess-Control-Allow-Origin:*",
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
    plugins.setConfigs('logs', {
        debug: (countlyConfig.logging && countlyConfig.logging.debug) ? countlyConfig.logging.debug.join(', ') : '',
        info: (countlyConfig.logging && countlyConfig.logging.info) ? countlyConfig.logging.info.join(', ') : '',
        warn: (countlyConfig.logging && countlyConfig.logging.warn) ? countlyConfig.logging.warn.join(', ') : '',
        error: (countlyConfig.logging && countlyConfig.logging.error) ? countlyConfig.logging.error.join(', ') : '',
        default: (countlyConfig.logging && countlyConfig.logging.default) ? countlyConfig.logging.default : 'warn',
    }, undefined, () => {
        const cfg = plugins.getConfig('logs'), msg = {
            cmd: 'log',
            config: cfg
        };
        if (process.send) {
            process.send(msg);
        }
        require('./utils/log.js').ipcHandler(msg);
    });

    /**
    * Initialize Plugins
    */

    // plugins.init(); - should run new init ingestor

    /**
    *  Trying to gracefully handle the batch state
    *  @param {number} code - error code
    */
    async function storeBatchedData(code) {
        try {
            //await common.writeBatcher.flushAll();
            //await common.insertBatcher.flushAll();
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
    console.log("Starting ingestor", process.pid);
    //since process restarted mark running tasks as errored
    plugins.dispatch("/ingestor", {common: common});
    plugins.init({"skipDependencies": true, "filename": "ingestor"});
    console.log("Loading configs");
    plugins.loadConfigs(common.db, function() {
        console.log("Configs loaded. Opening server connection");
        console.log(JSON.stringify(common.config.ingestor || {}));
        http.Server((req, res) => {
            const params = {
                qstring: {},
                res: res,
                req: req
            };
            params.tt = Date.now().valueOf();
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
        }).listen(common.config?.ingestor?.port || 3010, common.config?.ingestor?.host || '').timeout = common.config?.ingestor?.timeout || 120000;
    });
});


/**
 * On incoming request
 * 1)Get App data (Batcher)
 * 2)Get overall configs
 * 
 */