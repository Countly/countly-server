const JobManager = require('./JobManager');
const JobScanner = require('./JobScanner');

/**
 * Class representing a job process.
 */
class JobServer {

    /**
     * The logger instance
     * @private
     * @type {import('../api/utils/log.js').Logger}
     * */
    #log;

    /**
     * The plugin manager instance
     * @private
     * @type {import('../plugins/pluginManager.js')}
     */
    #pluginManager;

    /**
     * The Countly common object
     * @private
     * @type {import('../api/utils/common.js')}
     */
    #common;

    /**
     * The job manager instance
     * @private
     * @type {JobManager}
     */
    #jobManager;

    /**
     * The job scanner instance
     * @private
     * @type {JobScanner}
     */
    #jobScanner;

    /**
     * Flag indicating whether the job process is running
     * @private
     */
    #isRunning = false;

    /**
     * The database connection
     * @type {import('mongodb').Db | null}
     */
    #db = null;

    /**
     * Creates a new JobProcess instance.
     * @param {Object} common Countly common
     * @param {function} Logger - Logger constructor
     * @param {pluginManager} pluginManager - Plugin manager instance
     * @returns {Promise<JobServer>} A promise that resolves to a new JobProcess instance.
     */
    static async create(common, Logger, pluginManager) {
        const process = new JobServer(common, Logger, pluginManager);
        await process.init();
        return process;
    }

    /**
     * Creates a new JobServer instance
     * @param {Object} common Countly common
     * @param {function} Logger - Logger constructor
     * @param {pluginManager} pluginManager - Plugin manager instance
     */
    constructor(common, Logger, pluginManager) {
        this.#common = common;
        this.Logger = Logger;
        this.#log = Logger('jobs:server');
        this.#pluginManager = pluginManager;
    }

    /**
     * init the job process.
     * @returns {Promise<void>} A promise that resolves once the job process is initialized.
     */
    async init() {
        try {
            await this.#connectToDb();

            this.#jobManager = new JobManager(this.#db, this.Logger);
            this.#jobScanner = new JobScanner(this.#db, this.Logger, this.#pluginManager);

            this.#setupSignalHandlers();
            this.#log.i('Job process init successfully');
        }
        catch (error) {
            this.#log.e('Failed to initialize job process:', error);
            throw error;
        }
    }

    /**
     * Starts the job process.
     * @returns {Promise<void>} A promise that resolves once the job process is started.
     */
    async start() {
        if (this.#isRunning) {
            this.#log.w('Process is already running');
            return;
        }

        try {
            this.#isRunning = true;
            this.#log.i('Starting job process');

            // Load job classes
            const { classes } = await this.#jobScanner.scan();
            // Start job manager

            await this.#jobManager.start(classes);
            this.#log.i('Job process is running');
        }
        catch (error) {
            this.#log.e('Error starting job process:', error);
            await this.#shutdown(1);
        }
    }

    /**
     * Connects to the mongo database.
     * @returns {Promise<void>} A promise that resolves once the connection is established.
     */
    async #connectToDb() {
        try {
            this.#db = await this.#pluginManager.dbConnection('countly');
        }
        catch (e) {
            this.#log.e('Failed to connect to database:', e);
            throw e;
        }
    }

    /**
     * Sets up signal handlers for graceful shutdown and uncaught exceptions.
     */
    #setupSignalHandlers() {
        // Handle graceful shutdown
        process.on('SIGTERM', () => this.#shutdown());
        process.on('SIGINT', () => this.#shutdown());

        // Handle uncaught errors
        process.on('uncaughtException', (error) => {
            this.#log.e('Uncaught exception:', error);
            this.#shutdown(1);
        });
    }

    /**
     * Shuts down the job process.
     * @param {number} [exitCode=0] - The exit code to use when shutting down the process.
     * @returns {Promise<void>} A promise that resolves once the job process is shut down.
     */
    async #shutdown(exitCode = 0) {
        if (!this.#isRunning) {
            this.#log.w('Shutdown called but process is not running');
            process.exit(exitCode);
            return;
        }

        this.#log.i('Shutting down job process...');
        this.#isRunning = false;

        try {
            if (this.#jobManager) {
                await this.#jobManager.close();
            }
            this.#log.i('Job process shutdown complete');
        }
        catch (error) {
            this.#log.e('Error during shutdown:', error);
            exitCode = 1;
        }
        finally {
            process.exit(exitCode);
        }
    }
}

module.exports = JobServer;