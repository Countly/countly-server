/**
 * @fileoverview Job Scanner module - Scans for and loads job files from both core API and plugins
 * @module jobs/scanner
 */

const path = require('path');
const fs = require('fs').promises;
const JobUtils = require('./JobUtils');

/**
 * @typedef {Object} JobConfig
 * @property {string} category - Category of the job (e.g., 'api' or plugin name)
 * @property {string} dir - Directory path containing job files
 */

/**
 * @typedef {Object} JobDescriptor
 * @property {string} category - Category of the job
 * @property {string} name - Name of the job file (without extension)
 * @property {string} file - Full path to the job file
 */

/**
 * @typedef {Object} ScanResult
 * @property {Object.<string, string>} files - Object storing job file paths, keyed by job name
 * @property {Object.<string, Function>} classes - Object storing job class implementations, keyed by job name
 */

/**
 * Class responsible for scanning and loading job files from both core API and plugins
 */
class JobScanner {
    /**
     * @private
     * @type {import('mongodb').Db}
     * */
    #db;

    /**
     * @private
     * @type {import('../api/utils/log.js').Logger}
     * */
    #log;

    /**
     * @private
     * @type {import('../plugins/pluginManager.js')}
     */
    #pluginManager;

    /**
     * @private
     * @type {string}
     */
    #baseJobsPath;

    /**
     * @private
     * @type {string}
     */
    #pluginsPath;

    /**
     * @private
     * @type {Object.<string, string>}
     */
    #currentFiles = {};

    /**
     * @private
     * @type {Object.<string, Function>}
     */
    #currentClasses = {};

    /**
     * Creates a new JobScanner instance
     * @param {Object} db - Database connection object
     * @param {function} Logger - Logging function
     * @param {pluginManager} pluginManager - Plugin manager instance
     */
    constructor(db, Logger, pluginManager) {
        this.#pluginManager = pluginManager;
        this.#db = db;
        this.#log = Logger('jobs:scanner');
        this.#baseJobsPath = path.join(__dirname, '../api/jobs');
        this.#pluginsPath = path.join(__dirname, '../plugins');
    }

    /**
     * Safely reads a directory and filters for job files
     * @private
     * @param {JobConfig} jobConfig - Configuration for the job directory to scan
     * @returns {Promise<JobDescriptor[]>} Array of job descriptors found in directory
     */
    async #scanJobDirectory(jobConfig) {
        try {
            const files = await fs.readdir(jobConfig.dir);
            const jobFiles = [];

            for (const file of files) {
                const fullPath = path.join(jobConfig.dir, file);
                try {
                    const stats = await fs.stat(fullPath);
                    if (stats.isFile()) {
                        jobFiles.push({
                            category: jobConfig.category,
                            name: path.basename(file, '.js'),
                            file: fullPath
                        });
                    }
                }
                catch (err) {
                    this.#log.w(`Failed to stat file ${fullPath}: ${err.message}`);
                }
            }

            return jobFiles;
        }
        catch (err) {
            this.#log.w(`Failed to read directory ${jobConfig.dir}: ${err.message}`);
            return [];
        }
    }

    /**
     * Loads a single job file and returns its information
     * @private
     * @param {JobDescriptor} job - Descriptor for the job to load
     * @returns {{name: string, file: string, implementation: Function}} Job information
     */
    #loadJobFile(job) {
        const jobName = `${job.category}:${job.name}`;
        try {
            // Clear require cache to ensure fresh load
            // delete require.cache[require.resolve(job.file)];
            const implementation = require(job.file);
            this.#log.d(`Loaded job ${jobName} from ${job.file}`);
            JobUtils.validateJobClass(implementation);

            return {
                name: jobName,
                file: job.file,
                implementation
            };
        }
        catch (err) {
            this.#log.e(`Failed to load job ${job.file}: ${err.message}`, err);
            return null;
        }
    }

    /**
     * Initializes plugin configurations
     * @private
     * @returns {Promise<void>} A promise that resolves once the plugin configurations are loaded
     */
    async #initializeConfig() {
        return new Promise((resolve) => {
            this.#pluginManager.loadConfigs(this.#db, () => resolve());
        });
    }

    /**
     * Gets the list of directories to scan for jobs
     * @private
     * @param {string[]} plugins - List of plugin names
     * @returns {JobConfig[]} Array of job directory configurations
     */
    #getJobDirectories(plugins) {
        return [
            {
                category: 'api',
                dir: this.#baseJobsPath
            },
            ...plugins.map(plugin => ({
                category: plugin,
                dir: path.join(this.#pluginsPath, plugin, 'api/jobs')
            }))
        ];
    }

    /**
     * @private
     * Stores a loaded job in the internal collections
     * @param {{name: string, file: string, implementation: Function}} loaded - Loaded job information
     */
    #storeLoadedJob(loaded) {
        if (loaded) {
            this.#currentFiles[loaded.name] = loaded.file;
            this.#currentClasses[loaded.name] = loaded.implementation;
        }
    }

    /**
     * Scans for job files and returns the loaded jobs
     * @returns {Promise<ScanResult>} Object containing job files and implementations
     * @throws {Error} If plugin configuration is invalid or missing
     */
    async scan() {
        // Initialize plugin manager
        await this.#initializeConfig();

        const plugins = this.#pluginManager.getPlugins(true);
        if (!plugins?.length) {
            throw new Error('No valid plugins.json configuration found');
        }

        this.#log.i('Scanning plugins:', plugins);

        // Reset current collections
        this.#currentFiles = {};
        this.#currentClasses = {};

        // Build list of directories to scan
        const jobDirs = this.#getJobDirectories(plugins);

        // Scan all directories concurrently
        const jobFiles = await Promise.all(
            jobDirs.map(dir => this.#scanJobDirectory(dir))
        );

        // Load all discovered jobs and collect results
        jobFiles.flat()
            .filter(Boolean)
            .forEach(job => {
                const loaded = this.#loadJobFile(job);
                this.#storeLoadedJob(loaded);
            });

        return {
            files: this.#currentFiles,
            classes: this.#currentClasses
        };
    }

    /**
     * Gets the current number of loaded jobs
     * @public
     * @returns {number} Number of loaded jobs
     */
    get loadedJobCount() {
        return Object.keys(this.#currentFiles).length;
    }
}

module.exports = JobScanner;