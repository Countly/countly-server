const http = require('http');
const os = require('os');
const formidable = require('formidable');
const {processRequest} = require('./utils/requestProcessor');
const countlyConfig = require('./config', 'dont-enclose');
const plugins = require('../plugins/pluginManager.js');
const log = require('./utils/log.js')('core:api');
const common = require('./utils/common.js');
const {CacheMaster} = require('./parts/data/cache.js');

var t = ["countly:", "api"];
common.db = plugins.dbConnection(countlyConfig);
if (!process.env.worker) {
    t.push("master");
}
else {
    t.push("worker");
}
t.push("node");
t.push(process.argv[1]);

// Finaly set the visible title
process.title = t.join(' ');

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
    metric_changes: true,
    offline_mode: false,
    reports_regenerate_interval: 3600,
    send_test_email: ""
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
    api_additional_headers: "X-Frame-Options:deny\nX-XSS-Protection:1; mode=block\nAccess-Control-Allow-Origin:*"
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

if (!process.env.worker) {
    console.log("Starting master", process.pid);
}
else {
    console.log("Starting worker", process.pid);
}
const taskManager = require('./utils/taskmanager.js');

common.cache = new CacheMaster(common.db);
common.cache.start().then(plugins.dispatch.bind(plugins, '/cache/init', {}), e => {
    console.log(e);
    process.exit(1);
});

//since process restarted mark running tasks as errored
taskManager.errorResults({db: common.db});

if (!process.env.worker) {
    //process not passed in env, so must be the first process to be spawned
    plugins.dispatch("/master", {});
}

plugins.dispatch("/worker", {common: common});

/**
* Set Max Sockets
*/
http.globalAgent.maxSockets = countlyConfig.api.max_sockets || 1024;

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
}).listen(process.env.port || common.config.api.port, common.config.api.host || '').timeout = common.config.api.timeout || 120000;

//spawn more clones if there need to be
const workerCount = (countlyConfig.api.workers)
    ? countlyConfig.api.workers
    : os.cpus().length;
if (!process.env.worker && workerCount > 1) {
    let cp = require('child_process');
    for (let i = 1; i < workerCount; i++) {
        cp.fork('../../api/api.js', {env: {port: common.config.api.port + i, worker: true}});
        //we would also need to modify nginx config here too
    }
}

plugins.loadConfigs(common.db);