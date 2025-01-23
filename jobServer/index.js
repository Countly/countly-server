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

const JobServer = require('./JobServer');
const Logger = require('../api/utils/log.js');
const log = new Logger('jobServer:index');
const CountlyRequest = require("countly-request");
const {ReadBatcher, WriteBatcher} = require('../api/parts/data/batcher');

// Start the process if this file is run directly
if (require.main === module) {
    const common = require('../api/utils/common.js');
    const pluginManager = require('../plugins/pluginManager.js');

    /**
     * @type {JobServer|null}
     */
    let jobServer = null;

    log.i('Initializing job server process...');


    /**
     * Initialize configuration
     * @returns {Promise<Object>} A promise that resolves to an object containing configuration
     */
    const initializeConfig = async() => {
        try {
            const config = await pluginManager.getConfig();
            log.d('Configuration initialized successfully');
            return config;
        }
        catch (error) {
            log.e('Failed to initialize configuration:', {
                error: error.message,
                stack: error.stack
            });
            throw new Error('Configuration initialization failed: ' + error.message);
        }
    };

    /**
     * Initialize countly request
     * @param {Object} config - Configuration object
     * @returns {Promise<Object>} A promise that resolves to an object containing countly request
     */
    const initializeCountlyRequest = async(config) => {
        try {
            const countlyRequest = CountlyRequest(config.security);
            log.d('Countly request initialized successfully');
            return countlyRequest;
        }
        catch (error) {
            log.e('Failed to initialize countly request:', {
                error: error.message,
                stack: error.stack,
                config: config ? 'present' : 'missing'
            });
            throw new Error('Countly request initialization failed: ' + error.message);
        }
    };

    /**
     * Override common db objects with the provided connections
     * @param {Object} dbConnections - Object containing database connections
     */
    const overrideCommonDb = async(dbConnections) => {
        try {
            if (!dbConnections || !dbConnections.countlyDb || !dbConnections.drillDb || !dbConnections.outDb) {
                throw new Error('Invalid database connections provided');
            }
            const { countlyDb, drillDb, outDb } = dbConnections;
            common.db = countlyDb;
            common.drillDb = drillDb;
            common.outDb = outDb;
            log.d('Common db objects overridden successfully');
        }
        catch (error) {
            log.e('Failed to override common db objects:', {
                error: error.message,
                stack: error.stack,
                connections: Object.keys(dbConnections || {})
            });
            throw new Error('Common db override failed: ' + error.message);
        }
    };

    /**
     * Override common batcher with the provided connections
     * @param {Db} commonDb - Object containing database connections
     */
    const overrideCommonBatcher = async(commonDb) => {
        try {
            common.writeBatcher = new WriteBatcher(commonDb);
            common.readBatcher = new ReadBatcher(commonDb);
        }
        catch (error) {
            log.e('Failed to override common batcher:', {
                error: error.message,
                stack: error.stack
            });
        }
    };

    /**
     * Initialize database connections
     * @returns {Promise<DbConnections>} A promise that resolves to an object containing database connections
     */
    const initializeDbConnections = async() => {
        try {
            log.d('Initializing database connections...');
            const countlyDb = await pluginManager.dbConnection('countly');
            log.d('Countly DB connection established');

            const drillDb = await pluginManager.dbConnection('countly_drill');
            log.d('Drill DB connection established');

            const outDb = await pluginManager.dbConnection('countly_out');
            log.d('Out DB connection established');

            return {
                countlyDb,
                drillDb,
                outDb,
            };
        }
        catch (error) {
            log.e('Failed to initialize database connections:', {
                error: error.message,
                stack: error.stack
            });
            throw new Error('Database connections initialization failed: ' + error.message);
        }
    };

    /**
     * Override common dispatch with a Countly server request
     * @param {Function} countlyRequest - Countly request function
     * @param {Object} countlyConfig - Countly config object
     */
    const overrideCommonDispatch = async(countlyRequest, countlyConfig) => {
        try {
            if (!countlyRequest || !countlyConfig) {
                throw new Error('Invalid parameters for dispatch override');
            }

            const protocol = process.env.COUNTLY_CONFIG_PROTOCOL || "http";
            const hostname = process.env.COUNTLY_CONFIG_HOSTNAME || "localhost";
            const pathPrefix = countlyConfig.path || "";

            // The base URL of the running Countly server
            const baseUrl = protocol + "://" + hostname + pathPrefix;
            log.d('Configuring dispatch override with base URL:', baseUrl);

            /**
             * Keep the same signature, but perform a request to the running Countly server
             * @param {string} event - The event name
             * @param {Object} params - The event parameters
             * @param {Function} callback - Callback function
             */
            common.dispatch = function(event, params, callback) {
                // Construct the request to your Countly server
                countlyRequest.post({
                    url: baseUrl + "/i/plugins/dispatch",
                    json: { event: event, params: params }
                }, function(err, res, body) {
                    if (err) {
                        log.e("Error dispatching event to Countly server:", {
                            error: err,
                            event: event,
                            params: params,
                            baseUrl: baseUrl,
                        });
                    }
                    if (typeof callback === 'function') {
                        return callback(err, res, body);
                    }
                    else {
                        log.e("Callback is not a function");
                    }
                });
            };
            log.d('Common dispatch successfully overridden');
        }
        catch (error) {
            log.e('Failed to override common dispatch:', {
                error: error.message,
                stack: error.stack,
                config: countlyConfig ? 'present' : 'missing',
                request: countlyRequest ? 'present' : 'missing'
            });
            throw new Error('Dispatch override failed: ' + error.message);
        }
    };


    initializeConfig()
        .then(async config => {
            log.i('Starting job server initialization sequence...');

            const countlyRequest = await initializeCountlyRequest(config);
            await overrideCommonDispatch(countlyRequest, config);

            const dbConnections = await initializeDbConnections();
            await overrideCommonDb(dbConnections);
            await overrideCommonBatcher(dbConnections.countlyDb);

            jobServer = await JobServer.create(Logger, pluginManager, dbConnections);

            log.i('Job server successfully created, starting process...');
            return jobServer.start();
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
        ['SIGTERM', 'SIGINT'].forEach(signal => {
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