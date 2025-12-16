/**
 * @module jobServer
 * @version 2.0
 * @author Countly
 *
 * @typedef {import('../api/utils/common.js')} Common
 * @typedef {import('../plugins/pluginManager.js')} PluginManager
 * @typedef {import('./Job')} JobType
 * @typedef {import('./JobServer')} JobServerType
 *
 * @note
 * Dependencies like common utilities and plugin manager should only be imported in this entry file
 * and injected into the respective modules via their constructors or create methods.
 *
 * @description
 * This module serves as the entry point for Countly's job management system.
 * It provides a robust infrastructure for:
 * - Scheduling and executing background tasks
 * - Managing job lifecycles and states
 * - Handling job dependencies and priorities
 * - Providing process isolation for job execution
 *
 * @exports {Object} module.exports
 * @property {JobType} Job - Class for creating and managing individual jobs
 * @property {JobServerType} JobServer - Class for running jobs in a separate process
 *
 * @throws {Error} DatabaseConnectionError When database connection fails during initialization
 * @throws {Error} InvalidJobError When job definition is invalid
 *
 * @example
 * // Import and create a new job
 * const { Job } = require('./jobs');
 * const job = new Job({
 *   name: 'example',
 *   type: 'report',
 *   schedule: '0 0 * * *'
 * });
 */

const http = require('http');

const formidable = require('formidable');

const countlyConfig = require('../api/config', 'dont-enclose');
const jobServerConfig = require("./config");
const JobServer = require('./JobServer');
const Logger = require('../api/utils/log.js');
const log = new Logger('jobServer:index');
const {ReadBatcher, WriteBatcher, InsertBatcher} = require('../api/parts/data/batcher');
const common = require('../api/utils/common.js');
const QueryRunner = require('../api/parts/data/QueryRunner.js');
var { MongoDbQueryRunner } = require('../api/utils/mongoDbQueryRunner.js');
const pluginManager = require('../plugins/pluginManager.js');
require("../api/init_configs.js");

const {processRequest} = require('./requestProcessor');

// Start the process if this file is run directly
if (require.main === module) {
    /**
     * Handle incoming HTTP/HTTPS requests
     * @param {http.IncomingMessage} req - The request object
     * @param {http.ServerResponse} res - The response object
     */
    const handleRequest = function(req, res) {
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
                formidableOptions.maxFileSize = countlyConfig.jobServer.maxUploadFileSize;
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

            form.parse(req, (_, fields, files) => {
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
    };

    /**
     * @type {JobServer|null}
     */
    let jobServer = null;

    log.i('Initializing job server process...');

    // TEMPORARY DEBUG LOGGING - JOB SERVER
    console.log('=== JOB SERVER CONFIG DEBUG ===');
    console.log('Process ENV:', {
        NODE_ENV: process.env.NODE_ENV,
        SERVICE_TYPE: process.env.SERVICE_TYPE,
        COUNTLY_CONFIG_PATH: process.env.COUNTLY_CONFIG_PATH
    });
    console.log('pluginManager available:', !!pluginManager);
    console.log('common available:', !!common);
    console.log('=== END JOB SERVER CONFIG DEBUG ===');

    /**
     * Initialize configuration and database connections
     * @returns {Promise<{config: Object, dbConnections: Array}>} e.g. { config: {...}, dbConnections: { countlyDb, outDb, fsDb, drillDb } }
     */
    const initializeSystem = async() => {
        try {
            // Use connectToAllDatabases which handles config loading and db connections
            const [countlyDb, outDb, fsDb, drillDb] = await pluginManager.connectToAllDatabases();

            log.d('Initializing batchers for job server...');
            try {
                common.writeBatcher = new WriteBatcher(countlyDb);
                common.readBatcher = new ReadBatcher(countlyDb);
                common.insertBatcher = new InsertBatcher(countlyDb);
                common.queryRunner = new QueryRunner();
                console.log('✓ Batchers and QueryRunner initialized');

                // Initialize drill-specific batchers if drillDb is available
                if (drillDb) {
                    common.drillReadBatcher = new ReadBatcher(drillDb, {configs_db: countlyDb});
                    common.drillQueryRunner = new MongoDbQueryRunner(common.drillDb);
                    console.log('✓ Drill database components initialized');
                }
            }
            catch (batcherError) {
                log.e('Failed to initialize batchers:', {
                    error: batcherError.message,
                    stack: batcherError.stack
                });
                throw new Error('Batcher initialization failed: ' + batcherError.message);
            }

            const config = await new Promise((resolve, reject) => {
                pluginManager.loadConfigs(countlyDb, (err) => {
                    if (err) {
                        reject(err);
                    }
                    else {
                        resolve();
                    }
                });
            });
            log.d('Configuration initialized successfully');

            console.log('=== INITIALIZING PLUGINS ===');
            pluginManager.init();
            console.log('✓ Plugins initialized');

            // TEMPORARY DEBUG - JOB SERVER CONFIG
            console.log('=== JOB SERVER LOADED CONFIG ===');
            console.log('Config loaded:', JSON.stringify(config, null, 2));
            console.log('=== END JOB SERVER LOADED CONFIG ===');

            return {
                config,
                dbConnections: {
                    countlyDb,
                    drillDb,
                    outDb,
                    fsDb
                }
            };
        }
        catch (error) {
            log.e('Failed to initialize system:', {
                error: error.message,
                stack: error.stack
            });
            throw new Error('System initialization failed: ' + error.message);
        }
    };

    initializeSystem()
        .then(async({dbConnections}) => {
            log.i('Starting job server initialization sequence...');

            // if resumeOnRestart is true, all scheduled jobs lastRunAt will be deleted when starting the job server
            // lastRunAt for all scheduled jobs have to be preserved in order to calculate lastRunDuration
            if (jobServerConfig.PULSE.resumeOnRestart === true) {
                await dbConnections.countlyDb.collection(jobServerConfig.PULSE.db.collection).updateMany(
                    { type: 'single', lastRunAt: { $exists: true } },
                    [
                        { $set: { lastRunAtCpy: '$lastRunAt' } },
                    ],
                );
            }

            jobServer = await JobServer.create(Logger, pluginManager, dbConnections);

            log.i('Job server successfully created, starting process...');
            await jobServer.start();
            log.i('Job server successfully started');

            common.jobServer = jobServer;

            /**
            * Set Max Sockets
            */
            http.globalAgent.maxSockets = countlyConfig.api.max_sockets || 1024;
            console.log('=== CREATING SERVER ===');
            console.log('common.config.jobServer:', JSON.stringify(common.config.jobServer, null, 2));
            const serverOptions = {
                port: common.config?.jobServer?.port || 3020,
                host: common.config?.jobServer?.host || '',
            };
            console.log('Server options:', serverOptions);
            const server = http.createServer(handleRequest);
            console.log('Starting server on', serverOptions.host + ':' + serverOptions.port);
            server.listen(serverOptions.port, serverOptions.host, () => {
                console.log('✓ Server listening on', serverOptions.host + ':' + serverOptions.port);
            });

            server.timeout = common.config?.jobServer?.timeout || 120000;
            server.keepAliveTimeout = common.config?.jobServer?.timeout || 120000;
            server.headersTimeout = (common.config?.jobServer?.timeout || 120000) + 1000; // Slightly higher
            console.log('✓ Server timeouts configured:', {
                timeout: server.timeout,
                keepAliveTimeout: server.keepAliveTimeout,
                headersTimeout: server.headersTimeout
            });
        })
        .catch(error => {
            log.e('Critical error during job server initialization:', {
                error: error.message,
                stack: error.stack,
                type: error.constructor.name,
                time: new Date().toISOString()
            });
            if (require.main === module) {
                log.e('Exiting process due to critical initialization error');
                process.exit(1);
            }
        });

    if (require.main === module) {
        /**
        *  Handle exit events for gracefull close
        */
        ['SIGHUP', 'SIGINT', 'SIGQUIT', 'SIGILL', 'SIGTRAP', 'SIGABRT', 'SIGBUS', 'SIGFPE', 'SIGSEGV', 'SIGTERM',].forEach(signal => {
            process.on(signal, () => {
                log.i(`Received ${signal}, initiating graceful shutdown...`);
                if (jobServer && typeof jobServer.shutdown === 'function') {
                    jobServer.shutdown();
                }
                else {
                    setTimeout(() => {
                        log.e('Forced shutdown after timeout');
                        process.exit(1);
                    }, 3000);
                }
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
    }
}

/**
 * Keeping old interface for backward compatibility
 * @type {Job|{}}
 */
const Job = require('./Job');
module.exports = {
    Job: Job
};
