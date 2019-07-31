const http = require('http');
const cluster = require('cluster');
const formidable = require('formidable');
const os = require('os');
const fs = require('fs');
const countlyConfig = require('./config', 'dont-enclose');
const plugins = require('../plugins/pluginManager.js');
const jobs = require('./parts/jobs');
const log = require('./utils/log.js')('core:api');
const common = require('./utils/common.js');
const {processRequest} = require('./utils/requestProcessor');
const versionInfo = require('../frontend/express/version.info');
const frontendConfig = require('../frontend/express/config.js');
const {CacheMaster, CacheWorker} = require('./parts/data/cache.js');

var t = ["countly:", "api"];

if (cluster.isMaster) {
    console.log("Starting master");
    if (!common.checkDatabaseConfigMatch(countlyConfig.mongodb, frontendConfig.mongodb)) {
        log.w('API AND FRONTEND DATABASE CONFIGS ARE DIFFERENT');
    }
    common.db = plugins.dbConnection();
    t.push("master");
    t.push("node");
    t.push(process.argv[1]);
    //save current version in file
    if (versionInfo && versionInfo.version) {
        var olderVersions = [];
        var currentVersion = versionInfo.version;
        var lastVersion = "";
        //read form file(if exist);
        if (fs.existsSync(__dirname + "/../countly_marked_version.json")) {
            try {
                let data = fs.readFileSync(__dirname + "/../countly_marked_version.json");
                try {
                    olderVersions = JSON.parse(data);
                }
                catch (SyntaxError) { //unable to parse file
                    log.e(SyntaxError);
                }
                if (Array.isArray(olderVersions)) {
                    lastVersion = olderVersions[olderVersions.length - 1].version;
                }
                else {
                    olderVersions = [];
                }

            }
            catch (error) {
                log.e(error);
            }
        }
        if (lastVersion === "" || lastVersion !== currentVersion) {
            olderVersions.push({
                version: currentVersion,
                updated: Date.now()
            });
            try {
                fs.writeFileSync(__dirname + "/../countly_marked_version.json", JSON.stringify(olderVersions));
            }
            catch (error) {
                log.e(error);
            }
        }
    }
}
else {
    t.push("worker");
    t.push("node");
}

// Finaly set the visible title
process.title = t.join(' ');

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
    session_duration_limit: 120,
    city_data: true,
    event_limit: 500,
    event_segmentation_limit: 100,
    event_segmentation_value_limit: 1000,
    metric_limit: 1000,
    sync_plugins: false,
    session_cooldown: 15,
    request_threshold: 30,
    total_users: true,
    export_limit: 10000,
    prevent_duplicate_requests: true,
    metric_changes: true
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
    dashboard_additional_headers: "X-Frame-Options:deny\nX-XSS-Protection:1; mode=block\nStrict-Transport-Security:max-age=31536000 ; includeSubDomains",
    api_additional_headers: "X-Frame-Options:deny\nX-XSS-Protection:1; mode=block"
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
 * Uncaught Exception Handler
 */
process.on('uncaughtException', (err) => {
    console.log('Caught exception: %j', err, err.stack);
    if (log && log.e) {
        log.e('Logging caught exception');
    }
    console.trace();
    process.exit(1);
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
        else if (msg.cmd === "dispatch" && msg.event) {
            workers.forEach((w) => {
                w.send(msg);
            });
        }
    });
};

if (cluster.isMaster) {
    common.cache = new CacheMaster(common.db);
    common.cache.start().then(plugins.dispatch.bind(plugins, '/cache/init', {}), e => {
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
        jobs.job('api:topEvents').replace().schedule('every 1 day');
        jobs.job('api:ping').replace().schedule('every 1 day');
        jobs.job('api:clear').replace().schedule('every 1 day');
        jobs.job('api:clearTokens').replace().schedule('every 1 day');
        jobs.job('api:task').replace().schedule('every 1 hour on the first min');
        jobs.job('api:userMerge').replace().schedule('every 1 hour on the 10th min');
    }, 10000);
}
else {
    console.log("Starting worker", process.pid, "parent:", process.ppid);
    const taskManager = require('./utils/taskmanager.js');
    common.db = plugins.dbConnection(countlyConfig);

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
        process.exit(1);
    });

    plugins.dispatch("/worker", {common: common});

    http.Server((req, res) => {
        const params = {
            qstring: {},
            res: res,
            req: req
        };

        if (req.method.toLowerCase() === 'post') {
            const form = new formidable.IncomingForm();
            req.body = '';
            req.on('data', (data) => {
                req.body += data;
            });

            form.parse(req, (err, fields, files) => {
                params.files = files;
                for (const i in fields) {
                    params.qstring[i] = fields[i];
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