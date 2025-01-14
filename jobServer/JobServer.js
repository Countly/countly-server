const JobManager = require('./JobManager');
const JobScanner = require('./JobScanner');

const JOBS_CONFIG_COLLECTION = 'jobConfigs';
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
     * Collection for job configurations
     * @private
     * @type {import('mongodb').Collection}
     */
    #jobConfigsCollection;

    /**
     * Flag indicating whether the job process is shutting down
     * avoids multiple shutdown race conditions
     * @private
     */
    #isShuttingDown = false;

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

            this.#jobConfigsCollection = this.#db.collection(JOBS_CONFIG_COLLECTION);
            // await this.#jobConfigsCollection.createIndex({ jobName: 1 }, /*{ unique: true }*/);

            this.#setupSignalHandlers();
            // Watch for changes in job configurations
            this.#watchJobConfigs();

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
     * Watch for changes in job configurations
     * @private
     */
    async #watchJobConfigs() {
        const changeStream = this.#jobConfigsCollection.watch();

        changeStream.on('change', async(change) => {
            try {
                if (change.operationType === 'update' || change.operationType === 'insert') {
                    const jobName = change.fullDocument.jobName;
                    const enabled = change.fullDocument.enabled;

                    if (enabled) {
                        await this.#jobManager.enableJob(jobName);
                    }
                    else {
                        await this.#jobManager.disableJob(jobName);
                    }

                    this.#log.i(`Job ${jobName} ${enabled ? 'enabled' : 'disabled'}`);
                }
            }
            catch (error) {
                this.#log.e('Error processing job config change:', error);
            }
        });

        changeStream.on('error', (error) => {
            this.#log.e('Error in job configs change stream:', error);
            // Implement reconnection logic here
        });
    }

    /**
     * Shuts down the job process.
     * @param {number} [exitCode=0] - The exit code to use when shutting down the process.
     * @returns {Promise<void>} A promise that resolves once the job process is shut down.
     */
    async #shutdown(exitCode = 0) {
        if (this.#isShuttingDown) {
            return;
        }
        this.#isShuttingDown = true;

        if (this.#db && typeof this.#db.close === 'function') {
            await this.#db.close();
        }

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