const http = require('http');
const cluster = require('cluster');
const formidable = require('formidable');
const os = require('os');
const countlyConfig = require('./config', 'dont-enclose');
const plugins = require('../plugins/pluginManager.js');
const jobs = require('./parts/jobs');
const log = require('./utils/log.js')('core:api');
const common = require('./utils/common.js');
const {processRequest} = require('./utils/requestProcessor');
const frontendConfig = require('../frontend/express/config.js');
const {CacheMaster, CacheWorker} = require('./parts/data/cache.js');
const {WriteBatcher, ReadBatcher, InsertBatcher} = require('./parts/data/batcher.js');
const pack = require('../package.json');
const versionInfo = require('../frontend/express/version.info.js');

var t = ["countly:", "api"];
common.processRequest = processRequest;

if (cluster.isMaster) {
    console.log("Starting Countly", "version", versionInfo.version, "package", pack.version);
    if (!common.checkDatabaseConfigMatch(countlyConfig.mongodb, frontendConfig.mongodb)) {
        log.w('API AND FRONTEND DATABASE CONFIGS ARE DIFFERENT');
    }
    t.push("master");
    t.push("node");
    t.push(process.argv[1]);
}
else {
    t.push("worker");
    t.push("node");
}

// Finaly set the visible title
process.title = t.join(' ');

plugins.connectToAllDatabases().then(function() {
    common.writeBatcher = new WriteBatcher(common.db);
    common.readBatcher = new ReadBatcher(common.db);
    common.insertBatcher = new InsertBatcher(common.db);
    if (common.drillDb) {
        common.drillReadBatcher = new ReadBatcher(common.drillDb);
    }

    let workers = [];

    /**
    * Set Max Sockets
    */
    http.globalAgent.maxSockets = countlyConfig.api.max_sockets || 1024;

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
        batch_read_period: 60
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
        proxy_password: ""
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
    plugins.init();

    /**
    *  Trying to gracefully handle the batch state
    *  @param {number} code - error code
    */
    async function storeBatchedData(code) {
        try {
            await common.writeBatcher.flushAll();
            await common.insertBatcher.flushAll();
            console.log("Successfully stored batch state");
        }
        catch (ex) {
            console.log("Could not store batch state");
        }
        process.exit(code);
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
        'SIGBUS', 'SIGFPE', 'SIGUSR1', 'SIGSEGV', 'SIGUSR2', 'SIGTERM'
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

    /**
    * Pass To Master
    * @param {cluster.Worker} worker - worker thatw as spawned by master
    */
    const passToMaster = (worker) => {
        worker.on('message', (msg) => {
            if (msg.cmd === 'log') {
                workers.forEach((w) => {
                    if (w !== worker) {
                        w.send({
                            cmd: 'log',
                            config: msg.config
                        });
                    }
                });
                require('./utils/log.js').ipcHandler(msg);
            }
            else if (msg.cmd === "checkPlugins") {
                plugins.checkPluginsMaster();
            }
            else if (msg.cmd === "startPlugins") {
                plugins.startSyncing();
            }
            else if (msg.cmd === "endPlugins") {
                plugins.stopSyncing();
            }
            else if (msg.cmd === "batch_insert") {
                const {collection, doc, db} = msg.data;
                common.insertBatcher.insert(collection, doc, db);
            }
            else if (msg.cmd === "batch_write") {
                const {collection, id, operation, db} = msg.data;
                common.writeBatcher.add(collection, id, operation, db);
            }
            else if (msg.cmd === "batch_read") {
                const {collection, query, projection, multi, msgId} = msg.data;
                common.readBatcher.get(collection, query, projection, multi).then((data) => {
                    worker.send({ cmd: "batch_read", data: {msgId, data} });
                })
                    .catch((err) => {
                        worker.send({ cmd: "batch_read", data: {msgId, err} });
                    });
            }
            else if (msg.cmd === "batch_invalidate") {
                const {collection, query, projection, multi} = msg.data;
                common.readBatcher.invalidate(collection, query, projection, multi);
            }
            else if (msg.cmd === "dispatchMaster" && msg.event) {
                plugins.dispatch(msg.event, msg.data);
            }
            else if (msg.cmd === "dispatch" && msg.event) {
                workers.forEach((w) => {
                    w.send(msg);
                });
            }
        });
    };

    if (cluster.isMaster) {
        common.runners = require('./parts/jobs/runner');
        common.cache = new CacheMaster(common.db);
        common.cache.start().then(() => {
            setImmediate(() => {
                plugins.dispatch('/cache/init', {});
            });
        }, e => {
            console.log(e);
            process.exit(1);
        });

        const workerCount = (countlyConfig.api.workers)
            ? countlyConfig.api.workers
            : os.cpus().length;

        for (let i = 0; i < workerCount; i++) {
            const worker = cluster.fork();
            workers.push(worker);
        }

        workers.forEach(passToMaster);

        cluster.on('exit', (worker) => {
            workers = workers.filter((w) => {
                return w !== worker;
            });
            const newWorker = cluster.fork();
            workers.push(newWorker);
            passToMaster(newWorker);
        });

        plugins.dispatch("/master", {});

        // Allow configs to load & scanner to find all jobs classes
        setTimeout(() => {
            jobs.job('api:topEvents').replace().schedule('at 00:01 am ' + 'every 1 day');
            jobs.job('api:ping').replace().schedule('every 1 day');
            jobs.job('api:clear').replace().schedule('every 1 day');
            jobs.job('api:clearTokens').replace().schedule('every 1 day');
            jobs.job('api:clearAutoTasks').replace().schedule('every 1 day');
            jobs.job('api:task').replace().schedule('every 5 minutes');
            jobs.job('api:userMerge').replace().schedule('every 10 minutes');
            //jobs.job('api:appExpire').replace().schedule('every 1 day');
        }, 10000);
    }
    else {
        console.log("Starting worker", process.pid, "parent:", process.ppid);
        const taskManager = require('./utils/taskmanager.js');

        common.cache = new CacheWorker(common.db);
        common.cache.start();

        //since process restarted mark running tasks as errored
        taskManager.errorResults({db: common.db});

        process.on('message', common.log.ipcHandler);

        process.on('message', (msg) => {
            if (msg.cmd === 'log') {
                common.log.ipcHandler(msg);
            }
            else if (msg.cmd === "dispatch" && msg.event) {
                plugins.dispatch(msg.event, msg.data || {});
            }
        });

        process.on('exit', () => {
            console.log('Exiting due to master exited');
        });

        plugins.dispatch("/worker", {common: common});

        http.Server((req, res) => {
            const params = {
                qstring: {},
                res: res,
                req: req
            };

            if (req.method.toLowerCase() === 'post') {
                const formidableOptions = {};
                if (countlyConfig.api.maxUploadFileSize) {
                    formidableOptions.maxFileSize = countlyConfig.api.maxUploadFileSize;
                }

                const form = new formidable.IncomingForm(formidableOptions);
                req.body = '';
                req.on('data', (data) => {
                    req.body += data;
                });

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
        }).listen(common.config.api.port, common.config.api.host || '').timeout = common.config.api.timeout || 120000;

        plugins.loadConfigs(common.db);
    }
});