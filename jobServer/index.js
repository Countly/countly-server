/**
 * @module jobServer
 * @version 2.0
 * @author Countly
 *
 * @note
 *  Dependencies like common utilities and plugin manager should only be imported in this entry file
 *  and injected into the respective modules via their constructors or create methods.
 *
 * @description
 * This module provides the job management system for countly.
 * It handles job scheduling, execution, and management through a flexible API.
 *
 *
 * @property {typeof import('./Job')} Job - Class for creating and managing individual jobs
 * @property {typeof import('./JobServer')} JobServer - Class for running jobs in a separate process
 *
 * @throws {Error} When database connection fails during initialization
 * @throws {Error} When job definition is invalid
 *
 * @requires './Job'
 * @requires './JobServer'
 *
 * @external Common
 * @see {@import ../api/utils/common.js|common}
 *
 * @external PluginManager
 * @see {@import ../plugins/pluginManager.js|PluginManager}
 *
 * @execution
 * This module can be run directly as a standalone process:
 *
 * ```bash
 * node index.js
 * ```
 * When run directly, it will:
 * 1. Create a new JobServer instance
 * 2. Initialize it with the common utilities and plugin manager
 * 3. Start the job processing
 * 4. Handle process signals (SIGTERM, SIGINT) for graceful shutdown
 *
 */

const JobServer = require('./JobServer');
const Job = require('./Job');

// Start the process if this file is run directly
if (require.main === module) {

    const common = require('../api/utils/common.js');
    const pluginManager = require('../plugins/pluginManager.js');
    const Logger = common.log;

    JobServer.create(common, Logger, pluginManager)
        .then(process => process.start())
        .catch(error => {
            console.error('Failed to start job process:', error);
            process.exit(1);
        });
}

module.exports = {
    Job: Job
};