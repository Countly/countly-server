/**
 * @typedef {import('../api/utils/log.js').Logger} Logger
 * @typedef {import('../plugins/pluginManager.js')} PluginManager
 * @typedef {import('mongodb').Db} MongoDb
 * @typedef {import('mongodb').Collection} MongoCollection
 * @typedef {import('./JobManager')} JobManager
 * @typedef {import('./JobScanner')} JobScanner
 */

const JobManager = require('./JobManager');
const JobScanner = require('./JobScanner');

const JOBS_CONFIG_COLLECTION = 'jobConfigs';
/**
 * Class representing a job server that manages background job processing.
 * Handles job scheduling, execution, and lifecycle management.
 */
class JobServer {

    /**
     * The logger instance
     * @private
     * @type {Logger}
     * */
    #log;

    /**
     * The plugin manager instance
     * @private
     * @type {PluginManager}
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
     * @type {MongoDb | null}
     */
    #db = null;

    /**
     * Collection for job configurations
     * @private
     * @type {MongoCollection}
     */
    #jobConfigsCollection;

    /**
     * Flag indicating whether the job process is shutting down
     * avoids multiple shutdown race conditions
     * @private
     */
    #isShuttingDown = false;

    /**
     * Factory method to create and initialize a new JobServer instance.
     * @param {Object} common - Countly common utilities
     * @param {Logger} Logger - Logger constructor
     * @param {PluginManager} pluginManager - Plugin manager instance
     * @returns {Promise<JobServer>} A fully initialized JobServer instance
     * @throws {Error} If initialization fails
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
     * Initializes the job server by establishing database connections,
     * setting up components, and configuring signal handlers.
     * @returns {Promise<void>} A promise that resolves once the job server is initialized
     * @throws {Error} If initialization fails
     */
    async init() {
        try {
            this.#log.d('Initializing job server...');
            await this.#connectToDb();

            this.#jobManager = new JobManager(this.#db, this.Logger);
            this.#jobScanner = new JobScanner(this.#db, this.Logger, this.#pluginManager);

            this.#jobConfigsCollection = this.#db.collection(JOBS_CONFIG_COLLECTION);
            // await this.#jobConfigsCollection.createIndex({ jobName: 1 }, /*{ unique: true }*/);

            this.#setupSignalHandlers();

            this.#log.i('Job server initialized successfully');
        }
        catch (error) {
            this.#log.e('Failed to initialize job server: %j', error);
            throw error;
        }
    }

    /**
     * Starts the job processing server.
     * @returns {Promise<void>} A promise that resolves once the job server is started
     * @throws {Error} If startup fails
     */
    async start() {
        if (this.#isRunning) {
            this.#log.w('Start requested but server is already running');
            return;
        }

        try {
            this.#isRunning = true;
            this.#log.i('Starting job server...');

            const { classes } = await this.#jobScanner.scan();
            this.#log.d('Discovered %d job classes', Object.keys(classes).length);

            await this.#jobManager.start(classes);
            this.#log.i('Job server is now running and processing jobs');
        }
        catch (error) {
            this.#log.e('Critical error during server startup: %j', error);
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
     * Sets up process signal handlers for graceful shutdown and error handling.
     * @private
     */
    #setupSignalHandlers() {
        process.on('SIGTERM', () => {
            this.#log.i('Received SIGTERM signal');
            this.#shutdown();
        });

        process.on('SIGINT', () => {
            this.#log.i('Received SIGINT signal');
            this.#shutdown();
        });

        process.on('uncaughtException', (error) => {
            this.#log.e('Uncaught exception in job server: %j', error);
            this.#shutdown(1);
        });
    }

    /**
     * Gracefully shuts down the job server, closing connections and stopping jobs.
     * @private
     * @param {number} [exitCode=0] - Process exit code
     * @returns {Promise<void>} A promise that resolves once the job server is shut down
     */
    async #shutdown(exitCode = 0) {
        if (this.#isShuttingDown) {
            this.#log.d('Shutdown already in progress, skipping duplicate request');
            return;
        }
        this.#isShuttingDown = true;

        this.#log.i('Initiating job server shutdown...');

        if (this.#db && typeof this.#db.close === 'function') {
            this.#log.d('Closing database connection');
            await this.#db.close();
        }

        if (!this.#isRunning) {
            this.#log.w('Shutdown called but server was not running');
            process.exit(exitCode);
            return;
        }

        this.#isRunning = false;

        try {
            if (this.#jobManager) {
                this.#log.d('Stopping job manager');
                await this.#jobManager.close();
            }
            this.#log.i('Job server shutdown completed successfully');
        }
        catch (error) {
            this.#log.e('Error during shutdown: %j', error);
            exitCode = 1;
        }
        finally {
            process.exit(exitCode);
        }
    }
}

module.exports = JobServer;