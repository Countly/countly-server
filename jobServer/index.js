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
const {ReadBatcher, WriteBatcher, InsertBatcher} = require('../api/parts/data/batcher');
const common = require('../api/utils/common.js');
const pluginManager = require('../plugins/pluginManager.js');

// Start the process if this file is run directly
if (require.main === module) {
    /**
     * @type {JobServer|null}
     */
    let jobServer = null;

    log.i('Initializing job server process...');

    /**
     * Initialize configuration and database connections
     * @returns {Promise<{config: Object, dbConnections: Array}>} e.g. { config: {...}, dbConnections: { countlyDb, outDb, fsDb, drillDb } }
     */
    const initializeSystem = async() => {
        try {
            const config = await pluginManager.getConfig();
            log.d('Configuration initialized successfully');

            // Use connectToAllDatabases which handles config loading and db connections
            const [countlyDb, outDb, fsDb, drillDb] = await pluginManager.connectToAllDatabases();

            log.d('Initializing batchers for job server...');
            try {
                common.writeBatcher = new WriteBatcher(countlyDb);
                common.readBatcher = new ReadBatcher(countlyDb);
                common.insertBatcher = new InsertBatcher(countlyDb);

                // Initialize drill-specific batchers if drillDb is available
                if (drillDb) {
                    common.drillReadBatcher = new ReadBatcher(drillDb);
                }
                log.d('Batchers initialized successfully');
            }
            catch (batcherError) {
                log.e('Failed to initialize batchers:', {
                    error: batcherError.message,
                    stack: batcherError.stack
                });
                throw new Error('Batcher initialization failed: ' + batcherError.message);
            }

            // Initialize plugins after batchers are ready
            log.d('Initializing plugin manager for job server...');
            pluginManager.init({skipDependencies: true});
            log.d('Plugin manager initialized successfully');

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