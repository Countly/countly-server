const PulseJobRunner = require('./PulseJobRunner');
const config = require("./config");
const JobUtils = require('./JobUtils');

/**
 * @typedef {import('../api/utils/log.js').Logger} Logger
 * @typedef {import('mongodb').Db} MongoDb
 * 
 * @typedef {Object} JobConfig
 * @property {string} jobName - The unique identifier for the job
 * @property {boolean} [enabled] - Whether the job is enabled
 * @property {boolean} [runNow] - Whether to run the job immediately
 * @property {Object} [schedule] - Cron or interval-based schedule configuration
 * @property {Object} [retry] - Retry strategy configuration
 * @property {Date} createdAt - When the config was first created
 * @property {Date} [updatedAt] - When the config was last updated
 * @property {string} checksum - Hash of the job implementation
 * @property {Object} defaultConfig - Original job configuration
 * @property {Object} defaultConfig.schedule - Default schedule configuration
 * @property {Object} defaultConfig.retry - Default retry configuration
 * @property {number} defaultConfig.priority - Default job priority
 * @property {number} defaultConfig.concurrency - Default concurrency limit
 * @property {number} defaultConfig.lockLifetime - Default lock lifetime in milliseconds
 */

/**
 * Manages job configurations, scheduling, and lifecycle.
 * Provides functionality to:
 * - Load and initialize jobs from class definitions
 * - Track and apply configuration changes
 * - Enable/disable jobs
 * - Handle job implementation updates
 */
class JobManager {

    /** @type {Logger} */
    #log;

    /** @type {MongoDb} */
    #db = null;

    /** @type {PulseJobRunner | null} */
    #jobRunner = null;

    /** @type {import('mongodb').Collection<JobConfig>} */
    #jobConfigsCollection;

    /**
     * Creates a new JobManager instance
     * @param {MongoDb} db - MongoDB database connection
     * @param {function(string): Logger} Logger - Logger factory function
     * @throws {Error} If database connection is invalid
     */
    constructor(db, Logger) {
        this.Logger = Logger;
        this.#db = db;
        this.#log = Logger('jobs:manager');
        this.#log.d('Creating JobManager');

        const pulseConfig = config.PULSE;
        this.#jobRunner = new PulseJobRunner(this.#db, pulseConfig, Logger);
        this.#jobConfigsCollection = db.collection('jobConfigs');
        this.#watchConfigs();
    }

    /**
     * Watches for changes in job configurations and applies them in real-time
     * @private
     * @returns {Promise<void>} A promise that resolves once the watcher is started
     * @throws {Error} If watch stream cannot be established
     */
    async #watchConfigs() {
        this.#log.d('Initializing config change stream watcher');
        const changeStream = this.#jobConfigsCollection.watch();

        changeStream.on('change', async(change) => {
            this.#log.d('Detected config change:', {
                operationType: change.operationType,
                documentId: change.documentKey?._id,
                updatedFields: change.updateDescription?.updatedFields
            });

            // Dont really need this, as we are only updating the config
            // if (change.operationType === 'insert') {
            //     const jobConfig = change.fullDocument;
            //     await this.#applyConfig(jobConfig);
            // }
            // else 
            if (change.operationType === 'update') {
                // Fetch the complete document after update
                const jobConfig = await this.#jobConfigsCollection.findOne({
                    _id: change.documentKey._id
                });
                if (jobConfig) {
                    await this.applyConfig({...change.updateDescription?.updatedFields, jobName: jobConfig.jobName});
                }
            }
        });
    }

    /**
     * Loads job classes and manages their configurations
     * @private
     * @param {Object.<string, Function>} jobClasses - Object containing job class implementations keyed by job name
     * @returns {Promise<void>} A promise that resolves once all jobs are loaded and configured
     * @throws {Error} If job loading or configuration fails
     */
    async #loadJobs(jobClasses) {
        // Calculate checksums for all job definitions
        const jobDefinitionChecksums = Object.entries(jobClasses).reduce((acc, [name, JobClass]) => {
            acc[name] = JobUtils.calculateJobChecksum(JobClass);
            return acc;
        }, {});

        // Initialize or update job configurations
        await this.#initializeJobConfigs(jobClasses, jobDefinitionChecksums);

        // Load and apply configurations
        await this.#applyJobConfigurations(jobClasses, jobDefinitionChecksums);
    }

    /**
     * Initializes or updates job configurations in the database
     * @private
     * @param {Object.<string, Function>} jobClasses - Job class implementations
     * @param {Object.<string, string>} jobDefinitionChecksums - Checksums of job definitions
     */
    async #initializeJobConfigs(jobClasses, jobDefinitionChecksums) {
        await Promise.all(
            Object.entries(jobClasses).map(async([jobName, JobClass]) => {
                this.#log.d(`Initializing job config for ${jobName}`);
                const currentChecksum = jobDefinitionChecksums[jobName];
                const existingConfigOverride = await this.#jobConfigsCollection.findOne({ jobName });

                if (!existingConfigOverride) {
                    // Create new configuration for new job
                    await this.#createDefaultJobConfig(jobName, currentChecksum, JobClass);
                }
                else if (existingConfigOverride.checksum !== currentChecksum) {
                    const instance = new JobClass(jobName);
                    await this.#resetJobConfig(jobName, currentChecksum, instance.getEnabled());
                }
            })
        );
    }

    /**
     * Creates a default configuration for a new job
     * @private
     * @param {string} jobName - Name of the job
     * @param {string} checksum - Checksum of the job definition
     * @param {Function} JobClass - Job class implementation
     */
    async #createDefaultJobConfig(jobName, checksum, JobClass) {
        const instance = new JobClass(jobName);

        await this.#jobConfigsCollection.insertOne({
            jobName,
            enabled: instance.getEnabled(),
            checksum,
            createdAt: new Date(),
            defaultConfig: {
                schedule: instance.getSchedule(),
                retry: instance.getRetryConfig(),
                priority: instance.getPriority(),
                concurrency: instance.getConcurrency(),
                lockLifetime: instance.getLockLifetime()
            }
        });
        this.#log.d(`Created default configuration for new job: ${jobName}`);
    }

    /**
     * Resets job configuration when implementation changes
     * @private
     * @param {string} jobName - Name of the job
     * @param {string} newChecksum - New checksum of the job definition
     * @param {boolean} defaultEnabled - Default enabled state of the job
     */
    async #resetJobConfig(jobName, newChecksum, defaultEnabled) {
        this.#log.w(`Job ${jobName} implementation changed, resetting configuration`);
        await this.#jobConfigsCollection.updateOne(
            { jobName },
            {
                $set: {
                    enabled: defaultEnabled,
                    checksum: newChecksum,
                    updatedAt: new Date()
                },
                $unset: {
                    schedule: "",
                    retry: "",
                    runNow: ""
                }
            }
        );
    }

    /**
     * Applies configurations to jobs
     * @private
     * @param {Object.<string, Function>} jobClasses - Job class implementations
     * @param {Object.<string, string>} jobDefinitionChecksums - Checksums of job definitions
     */
    async #applyJobConfigurations(jobClasses, jobDefinitionChecksums) {
        // Load all existing configuration overrides
        const configOverrides = await this.#jobConfigsCollection.find({}).toArray();
        const configOverridesMap = new Map(configOverrides.map(conf => [conf.jobName, conf]));

        // Create and configure jobs
        await Promise.all(
            Object.entries(jobClasses).map(async([jobName, JobClass]) => {
                // Create the job with default settings
                await this.#jobRunner.createJob(jobName, JobClass);

                // Apply configuration override if valid
                const configOverride = configOverridesMap.get(jobName);
                if (configOverride && configOverride.checksum === jobDefinitionChecksums[jobName]) {
                    await this.applyConfig(configOverride);
                    this.#log.d(`Applied configuration override for job: ${jobName}`);
                }
            })
        );
    }

    /**
     * Starts the job manager by loading and running jobs.
     * @param {Object.<string, Function>} jobClasses Object containing job classes keyed by job name
     * @returns {Promise<void>} A promise that resolves once the jobs are started.
     */
    async start(jobClasses) {
        if (!jobClasses || Object.keys(jobClasses).length === 0) {
            throw new Error('No job classes provided');
        }
        if (!this.#jobRunner) {
            throw new Error('Job runner not initialized');
        }

        await this.#loadJobs(jobClasses);
        await this.#jobRunner.start();
        this.#log.d('JobManager started successfully');
    }

    /**
     * Applies job configuration changes
     * @param {JobConfig} jobConfig The job configuration to apply
     * @throws {Error} If job runner is not initialized or configuration is invalid
     */
    async applyConfig(jobConfig) {
        try {
            if (!this.#jobRunner) {
                throw new Error('Job runner not initialized');
            }

            const { jobName } = jobConfig;
            this.#log.d('Applying config changes for job:', {
                jobName,
                changes: {
                    runNow: jobConfig.runNow,
                    scheduleUpdated: !!jobConfig.schedule,
                    retryUpdated: !!jobConfig.retry,
                    enabledStateChanged: typeof jobConfig.enabled === 'boolean'
                }
            });

            if (jobConfig.runNow === true) {
                await this.#jobRunner.runJobNow(jobName);
                await this.#jobConfigsCollection.updateOne(
                    { jobName },
                    { $unset: { runNow: "" } }
                );
            }

            if (jobConfig.schedule) {
                await this.#jobRunner.updateSchedule(jobName, {type: "schedule", value: jobConfig.schedule});
            }

            if (jobConfig.retry) {
                await this.#jobRunner.configureRetry(jobName, jobConfig.retry);
            }

            if (typeof jobConfig.enabled === 'boolean') {
                if (jobConfig.enabled) {
                    await this.#jobRunner.enableJob(jobName);
                    this.#log.i(`Job ${jobName} enabled via config`);
                }
                else {
                    await this.#jobRunner.disableJob(jobName);
                    this.#log.i(`Job ${jobName} disabled via config`);
                }
            }
        }
        catch (error) {
            this.#log.e('Failed to apply job configuration:', {
                jobName: jobConfig.jobName || "unknown",
                error: error.message,
                stack: error.stack
            });
            throw error; // Re-throw to allow caller to handle
        }
    }

    /**
     * Enable a job
     * @param {string} jobName Name of the job to enable
     */
    async enableJob(jobName) {
        if (!this.#jobRunner) {
            throw new Error('Job runner not initialized');
        }
        await this.#jobRunner.enableJob(jobName);
    }

    /**
     * Disable a job
     * @param {string} jobName Name of the job to disable
     */
    async disableJob(jobName) {
        if (!this.#jobRunner) {
            throw new Error('Job runner not initialized');
        }
        await this.#jobRunner.disableJob(jobName);
    }

    /**
     * Closes the JobManager and cleans up resources
     * @returns {Promise<void>} A promise that resolves once cleanup is complete
     */
    async close() {
        this.#log.d('JobManager closed successfully');
        await this.#jobRunner.close();
    }
}

module.exports = JobManager;
