const IJobExecutor = require('../../interfaces/IJobExecutor');
const { JobPriority } = require('@pulsecron/pulse');
const { JOB_PRIORITIES } = require('../../../constants/JobPriorities');

/**
 * Pulse implementation of job executor
 */
class PulseJobExecutor extends IJobExecutor {
    /**
     * Creates a new PulseJobExecutor instance
     * @param {Object} pulseRunner The Pulse runner instance
     * @param {Object} db Database connection
     * @param {Object} logger Logger instance
     */
    constructor(pulseRunner, db, logger) {
        super();
        this.pulseRunner = pulseRunner;
        this.db = db;
        this.log = logger;
        this.pendingSchedules = new Map();
    }

    /**
     * Creates and registers a new job
     * @param {string} jobName Name of the job
     * @param {Function} JobClass Job class implementation
     * @returns {Promise<void>} A promise that resolves once the job is created
     */
    async createJob(jobName, JobClass) {
        try {
            const instance = new JobClass(jobName);
            instance.setJobName(jobName);

            const retryConfig = instance.getRetryConfig();
            const priority = this.#mapPriority(instance.getPriority());
            const concurrency = instance.getConcurrency();
            const lockLifetime = instance.getLockLifetime();

            this.pulseRunner.define(
                jobName,
                async(job, done) => {
                    instance.setTouchMethod(job.touch.bind(job));
                    instance.setProgressMethod(
                        async(progressData) => this.#updateJobProgress(job, progressData)
                    );
                    return instance._run(this.db, job, done);
                },
                {
                    priority,
                    concurrency,
                    lockLifetime,
                    shouldSaveResult: true,
                    attempts: retryConfig?.enabled ? retryConfig.attempts : 1,
                    backoff: retryConfig?.enabled ? {
                        type: 'exponential',
                        delay: retryConfig.delay
                    } : undefined
                }
            );

            const scheduleConfig = instance.getSchedule();
            this.pendingSchedules.set(jobName, scheduleConfig);
            this.log.d(`Job ${jobName} defined successfully`);
        }
        catch (error) {
            this.log.e(`Failed to create job ${jobName}:`, error);
        }
    }

    /**
     * Enables a job
     * @param {string} jobName Name of the job
     * @returns {Promise<void>} A promise that resolves once the job is enabled
     */
    async enableJob(jobName) {
        try {
            await this.pulseRunner.enable({ name: jobName });
            this.log.i(`Job ${jobName} enabled`);
        }
        catch (error) {
            this.log.e(`Failed to enable job ${jobName}:`, error);
            throw error;
        }
    }

    /**
     * Disables a job
     * @param {string} jobName Name of the job
     * @returns {Promise<void>} A promise that resolves once the job is disabled
     */
    async disableJob(jobName) {
        try {
            await this.pulseRunner.disable({ name: jobName });
            this.log.i(`Job ${jobName} disabled`);
        }
        catch (error) {
            this.log.e(`Failed to disable job ${jobName}:`, error);
            throw error;
        }
    }

    /**
     * Configures retry settings for a job
     * @param {string} jobName Name of the job
     * @param {Object} retryConfig Retry configuration
     * @returns {Promise<void>} A promise that resolves once retry settings are updated
     */
    async configureRetry(jobName, retryConfig) {
        try {
            // First get the job definition
            const definition = this.pulseRunner._definitions[jobName];
            if (!definition) {
                throw new Error(`Job ${jobName} not found`);
            }

            // Update the definition for future job instances
            definition.attempts = retryConfig.attempts;
            definition.backoff = {
                delay: retryConfig.delay,
                type: 'exponential'
            };

            // Update existing jobs in the queue using the MongoDB collection directly
            await this.pulseRunner._collection.updateMany(
                { name: jobName },
                {
                    $set: {
                        attempts: retryConfig.attempts,
                        backoff: {
                            delay: retryConfig.delay,
                            type: 'exponential'
                        }
                    }
                }
            );

            this.log.i(`Retry configuration updated for job ${jobName}`);
        }
        catch (error) {
            this.log.e(`Failed to configure retry for job ${jobName}:`, error);
            throw error;
        }
    }

    /**
     * Updates job progress data
     * @private
     * @param {Object} job Job instance
     * @param {Object} progressData Progress data to store
     * @returns {Promise<void>} A promise that resolves once progress is updated
     */
    async #updateJobProgress(job, progressData) {
        try {
            job.data = progressData;
            await job.save();
        }
        catch (error) {
            this.log.e(`Failed to update job progress: ${error.message}`);
            // Consider whether to throw
        }
    }

    /**
     * Maps generic priority to Pulse-specific priority with validation
     * @private
     * @param {string} priority Generic priority from JOB_PRIORITIES
     * @returns {JobPriority} Pulse-specific priority value
     */
    #mapPriority(priority) {
        const priorityMap = {
            [JOB_PRIORITIES.LOWEST]: JobPriority.lowest,
            [JOB_PRIORITIES.LOW]: JobPriority.low,
            [JOB_PRIORITIES.NORMAL]: JobPriority.normal,
            [JOB_PRIORITIES.HIGH]: JobPriority.high,
            [JOB_PRIORITIES.HIGHEST]: JobPriority.highest
        };

        if (!priority || !priorityMap[priority]) {
            this.log.w(`Invalid priority "${priority}", defaulting to normal`);
            return JobPriority.normal;
        }

        return priorityMap[priority];
    }
}

module.exports = PulseJobExecutor;