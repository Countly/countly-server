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
const Job = require('./Job');

// Start the process if this file is run directly
if (require.main === module) {
    const common = require('../api/utils/common.js');
    const pluginManager = require('../plugins/pluginManager.js');
    const Logger = common.log;
    const log = Logger('jobs:server');

    log.i('Initializing job server process...');

    JobServer.create(common, Logger, pluginManager)
        .then(process => {
            log.i('Job server successfully created, starting process...');
            return process.start();
        })
        .catch(error => {
            log.e('Critical error during job server initialization:', {
                error: error.message,
                stack: error.stack
            });
            process.exit(1);
        });

    // Handle process signals for graceful shutdown
    ['SIGTERM', 'SIGINT'].forEach(signal => {
        process.on(signal, () => {
            log.i(`Received ${signal}, initiating graceful shutdown...`);
            // Allow time for cleanup before force exit
            setTimeout(() => {
                log.e('Forced shutdown after timeout');
                process.exit(1);
            }, 10000);
        });
    });
}

module.exports = {
    Job: Job
};