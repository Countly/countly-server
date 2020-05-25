const http = require('http');
const formidable = require('formidable');
const plugins = require('../plugins/pluginManager.js');
const log = require('../api/utils/log.js')('core:external');
const common = require('../api/utils/common.js');
const {processRequest} = require('../api/utils/requestProcessor');
let countlyConfig = {};

try {
    countlyConfig = require('../api/configs/config.db_out.js', 'dont-enclose');
}
catch (ex) {
    //using default config
    countlyConfig = {api: {}};
}

var t = ["countly:", "external"];

console.log("Starting external.js");
common.db = plugins.dbConnection();
t.push("node");
t.push(process.argv[1]);

// Finaly set the visible title
process.title = t.join(' ');

/**
 * Set Max Sockets
 */
http.globalAgent.maxSockets = countlyConfig.api.max_sockets || common.config.api.max_sockets || 1024;

/**
 * Initialize Plugins
 */
plugins.init();

/**
 * Uncaught Exception Handler
 */
process.on('uncaughtException', (err) => {
    console.log('Caught exception on external.js: %j', err, err.stack);
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
    console.log('Unhandled rejection on external.js for %j with reason %j stack ', p, reason, reason ? reason.stack : undefined);
    if (log && log.e) {
        log.e('Logging unhandled rejection');
    }
    console.trace();
});

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
}).listen(countlyConfig.api.port || 4001, countlyConfig.api.host || common.config.api.host || '').timeout = countlyConfig.api.timeout || common.config.api.timeout || 120000;

plugins.loadConfigs(common.db);