const IJobExecutor = require('../../interfaces/IJobExecutor');
const { JobPriority } = require('@pulsecron/pulse');
const { JOB_PRIORITIES } = require('../../../constants/JobPriorities');

/**
 * @typedef {import('@pulsecron/pulse').JobPriority} JobPriority
 * @typedef {import('@pulsecron/pulse').PulseRunner} PulseRunner
 * @typedef {import('@pulsecron/pulse').Job} PulseJob
 * @typedef {import('mongodb').Db} MongoDB
 */

/**
 * Pulse implementation of job executor that handles job lifecycle management
 * @implements {IJobExecutor}
 */
class PulseJobExecutor extends IJobExecutor {
    /**
     * Creates a new PulseJobExecutor instance
     * @param {PulseRunner} pulseRunner - The Pulse runner instance for job management
     * @param {MongoDB} db - MongoDB database connection
     * @param {Logger} logger - Logger instance for operational logging
     */
    constructor(pulseRunner, db, logger) {
        super();
        this.pulseRunner = pulseRunner;
        this.db = db;
        this.log = logger;
        this.pendingSchedules = new Map();
    }

    /**
     * Creates and registers a new job with the Pulse runner
     * @param {string} jobName - Unique identifier for the job
     * @param {Constructor} JobClass - Job class constructor
     * @throws {Error} When job creation or registration fails
     * @returns {Promise<void>} A promise that resolves once the job is created
     */
    async createJob(jobName, JobClass) {
        this.log.d(`Attempting to create job: ${jobName}`);
        try {
            const instance = new JobClass(jobName);

            const retryConfig = instance.getRetryConfig();
            const priority = this.#mapPriority(instance.getPriority());
            const concurrency = instance.getConcurrency();
            const lockLifetime = instance.getLockLifetime();
            const isEnabled = instance.getEnabled();

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
                    attempts: retryConfig?.enabled ? retryConfig.attempts : 0,
                    backoff: retryConfig?.enabled ? {
                        type: 'exponential',
                        delay: retryConfig.delay
                    } : undefined
                }
            );

            // If job should be disabled by default, use disableJob method
            if (!isEnabled) {
                await this.disableJob(jobName);
                this.log.d(`Job ${jobName} disabled after creation`);
            }

            const scheduleConfig = instance.getSchedule();
            this.pendingSchedules.set(jobName, scheduleConfig);
            this.log.d(`Job ${jobName} defined successfully with enabled state: ${isEnabled}`);

            this.log.d(`Configuring job ${jobName} with priority: ${priority}, concurrency: ${concurrency}, lockLifetime: ${lockLifetime}`);

            this.log.i(`Job ${jobName} created and configured successfully with retry attempts: ${retryConfig?.attempts || 1}`);
        }
        catch (error) {
            this.log.e(`Failed to create job ${jobName}`, { error, stack: error.stack });
            throw error; // Propagate error for proper handling
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
     * Updates progress information for a running job
     * @private
     * @param {PulseJob} job - Pulse job instance
     * @param {Object} progressData - Progress information to store
     * @throws {Error} When progress update fails
     * @returns {Promise<void>} A promise that resolves once progress is updated
     */
    async #updateJobProgress(job, progressData) {
        this.log.d(`Updating progress for job ${job.attrs.name}`, { progressData });
        try {
            job.attrs.data = {
                ...job.attrs.data,
                progressData
            };
            await job.save();
            this.log.d(`Progress updated successfully for job ${job.attrs.name}`);
        }
        catch (error) {
            this.log.e(`Failed to update job progress for ${job.attrs.name}`, {
                error,
                stack: error.stack,
                jobId: job.attrs._id
            });
            throw error; // Propagate error for proper handling
        }
    }

    /**
     * Maps generic priority levels to Pulse-specific priority values
     * @private
     * @param {string} priority - Generic priority from JOB_PRIORITIES
     * @returns {JobPriority} Mapped Pulse priority
     */
    #mapPriority(priority) {
        const priorityMap = {
            [JOB_PRIORITIES.LOWEST]: JobPriority.lowest,
            [JOB_PRIORITIES.LOW]: JobPriority.low,
            [JOB_PRIORITIES.NORMAL]: JobPriority.normal,
            [JOB_PRIORITIES.HIGH]: JobPriority.high,
            [JOB_PRIORITIES.HIGHEST]: JobPriority.highest
        };

        if (!priority || priorityMap[priority] === undefined) {
            this.log.w(`Invalid priority "${priority}", defaulting to normal`);
            return JobPriority.normal;
        }

        return priorityMap[priority];
    }
}

module.exports = PulseJobExecutor;