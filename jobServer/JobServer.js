/**
 * @typedef {import('../api/utils/log.js').Logger} Logger
 * @typedef {import('../plugins/pluginManager.js')} PluginManager
 * @typedef {import('mongodb').Db} MongoDb
 * @typedef {import('mongodb').Collection} MongoCollection
 * @typedef {import('./JobManager')} JobManager
 * @typedef {import('./JobScanner')} JobScanner
 */
console.log("JobServer API loaded")
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
     * @typedef {Object} DbConnections
     * @property {MongoDb} countlyDb - Main Countly database connection
     * @property {MongoDb} drillDb - Drill database connection
     * @property {MongoDb} outDb - Output database connection
     */
    /**
     * The database connections object
     * @private
     * @type {DbConnections}
     */
    #dbConnections;

    /**
     * Factory method to create and initialize a new JobServer instance.
     * @param {Logger} Logger - Logger constructor
     * @param {PluginManager} pluginManager - Plugin manager instance
     * @param {DbConnections} dbConnections - Database connections object
     * @returns {Promise<JobServer>} A fully initialized JobServer instance
     * @throws {Error} If initialization fails
     */
    static async create(Logger, pluginManager, dbConnections) {
        const process = new JobServer(Logger, pluginManager, dbConnections);
        await process.init();
        return process;
    }

    /**
     * Creates a new JobServer instance
     * @param {Logger} Logger - Logger constructor
     * @param {PluginManager} pluginManager - Plugin manager instance
     * @param {Object} dbConnections - Database connections object
     */
    constructor(Logger, pluginManager, dbConnections) {
        this.Logger = Logger;
        this.#pluginManager = pluginManager;
        this.#dbConnections = dbConnections;
        this.#log = Logger('jobs:server');
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

            this.#jobManager = new JobManager(this.#dbConnections.countlyDb, this.Logger);
            this.#jobScanner = new JobScanner(this.#dbConnections.countlyDb, this.Logger, this.#pluginManager);

            this.#jobConfigsCollection = this.#dbConnections.countlyDb.collection(JOBS_CONFIG_COLLECTION);
            // await this.#jobConfigsCollection.createIndex({ jobName: 1 }, /*{ unique: true }*/);

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
            await this.shutdown(1);
        }
    }

    /**
     * Gracefully shuts down the job server, closing connections and stopping jobs.
     * @param {number} [exitCode=0] - Process exit code
     * @returns {Promise<void>} A promise that resolves once the job server is shut down
     */
    async shutdown(exitCode = 0) {
        if (this.#isShuttingDown) {
            this.#log.d('Shutdown already in progress, skipping duplicate request');
            return;
        }
        this.#isShuttingDown = true;

        this.#log.i('Initiating job server shutdown...');

        for (const [key, db] of Object.entries(this.#dbConnections)) {
            if (db && typeof db.close === 'function') {
                this.#log.d(`Closing ${key} database connection`);
                await db.close();
            }
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

    /**
     * Applies job configuration changes
     * @param {JobConfig} jobConfig The job configuration to apply
     */
    async applyConfig(jobConfig) {
        this.#jobManager.applyConfig(jobConfig);
    }
}

module.exports = JobServer;
