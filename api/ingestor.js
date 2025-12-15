const http = require('http');
const formidable = require('formidable');
const countlyConfig = require('./config', 'dont-enclose');
const plugins = require('../plugins/pluginManager.js');
const log = require('./utils/log.js')('ingestor-core:api');
const {processRequest} = require('./ingestor/requestProcessor');
const common = require('./utils/common.js');
const {Cacher} = require('./parts/data/cacher.js');
const {WriteBatcher} = require('./parts/data/batcher.js');
require("./init_configs.js");

var t = ["countly:", "ingestor"];
t.push("node");

// Finaly set the visible title
process.title = t.join(' ');

console.log("Connecting to databases");

// TEMPORARY DEBUG LOGGING - INGESTOR
console.log('=== INGESTOR CONFIG DEBUG ===');
console.log('countlyConfig:', JSON.stringify(countlyConfig, null, 2));
console.log('Process ENV:', {
    NODE_ENV: process.env.NODE_ENV,
    SERVICE_TYPE: process.env.SERVICE_TYPE,
    COUNTLY_CONFIG_PATH: process.env.COUNTLY_CONFIG_PATH
});
console.log('=== END INGESTOR CONFIG DEBUG ===');

//Overriding function
plugins.loadConfigs = plugins.loadConfigsIngestor;

plugins.connectToAllDatabases(true).then(function() {
    log.i("Db connections done");
    //Write Batcher is used by sdk metrics
    common.writeBatcher = new WriteBatcher(common.db);
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