const {RUNNER_TYPES, createJobRunner} = require('./JobRunner/index');
const config = require("./config");
const JobUtils = require('./JobUtils');

/**
 * Manages job configurations and initialization.
 */
class JobManager {

    /**
     * The logger instance
     * @private
     * @type {import('../api/utils/log.js').Logger}
     * */
    #log;

    /**
     * The database connection
     * @type {import('mongodb').Db | null}
     */
    #db = null;

    /**
     * The job runner instance
     * @type {IJobRunner | JobRunnerPulseImpl |null}
     */
    #jobRunner = null;


    #jobConfigsCollection;

    /**
     * Creates a new JobManager instance
     * @param {Object} db Database connection
     * @param {function} Logger - Logger constructor
     */
    constructor(db, Logger) {
        this.Logger = Logger;
        this.#db = db;
        this.#log = Logger('jobs:manager');
        this.#log.d('Creating JobManager');

        const runnerType = RUNNER_TYPES.PULSE;
        const pulseConfig = config.PULSE;

        this.#jobRunner = createJobRunner(this.#db, runnerType, pulseConfig, Logger);
        this.#jobConfigsCollection = db.collection('jobConfigs');
        this.#watchConfigs();
    }

    /**
     * Watches for changes in job configurations
     * @private
     * @returns {Promise<void>} A promise that resolves once the watcher is started
     */
    async #watchConfigs() {
        const changeStream = this.#jobConfigsCollection.watch();

        changeStream.on('change', async(change) => {
            if (change.operationType === 'update' || change.operationType === 'insert') {
                const jobConfig = change.fullDocument;
                await this.#applyConfig(jobConfig);
            }
        });
    }

    /**
     * Applies job configuration changes
     * @private
     * @param {Object} jobConfig The job configuration to apply
     * @param {string} jobConfig.jobName The name of the job
     * @param {boolean} [jobConfig.runNow] Whether to run the job immediately
     * @param {Object} [jobConfig.schedule] Schedule configuration
     * @param {Object} [jobConfig.retry] Retry configuration
     * @param {boolean} [jobConfig.enabled] Whether the job is enabled
     * @returns {Promise<void>} A promise that resolves once the configuration is applied
     */
    async #applyConfig(jobConfig) {
        try {
            if (!this.#jobRunner) {
                throw new Error('Job runner not initialized');
            }

            const { jobName } = jobConfig;

            if (jobConfig.runNow === true) {
                await this.#jobRunner.runJobNow(jobName);
                await this.#jobConfigsCollection.updateOne(
                    { jobName },
                    { $unset: { runNow: "" } }
                );
            }

            if (jobConfig.schedule) {
                await this.#jobRunner.updateSchedule(jobName, jobConfig.schedule);
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
            this.#log.e('Error applying job configuration:', error);
        }
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
            Object.entries(jobClasses).map(async([jobName, JobClass ]) => {
                this.#log.d(`Initializing job config for ${jobName}`);
                const currentChecksum = jobDefinitionChecksums[jobName];
                const existingConfigOverride = await this.#jobConfigsCollection.findOne({ jobName });

                if (!existingConfigOverride) {
                    // Create new configuration for new job
                    await this.#createDefaultJobConfig(jobName, currentChecksum, JobClass);
                }
                else if (existingConfigOverride.checksum !== currentChecksum) {
                    // Reset configuration if job implementation has changed
                    await this.#resetJobConfig(jobName, currentChecksum);
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
            enabled: true,
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
     */
    async #resetJobConfig(jobName, newChecksum) {
        this.#log.w(`Job ${jobName} implementation changed, resetting configuration`);
        await this.#jobConfigsCollection.updateOne(
            { jobName },
            {
                $set: {
                    enabled: true,
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
                    await this.#applyConfig(configOverride);
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