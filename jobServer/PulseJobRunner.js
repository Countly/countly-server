const { Pulse } = require('@pulsecron/pulse');
const { JobPriority } = require('@pulsecron/pulse');
const { JOB_PRIORITIES } = require('./constants/JobPriorities');
const {isValidCron} = require('cron-validator');

/**
 * @typedef {import('@pulsecron/pulse').Pulse} PulseInstance
 * @typedef {import('@pulsecron/pulse').JobPriority} JobPriority
 * @typedef {import('@pulsecron/pulse').Job} PulseJob
 * @typedef {import('mongodb').Db} MongoDB
 * @typedef {import('../api/utils/log.js').Logger} Logger
 * 
 * @typedef {Object} RetryConfig
 * @property {number} attempts - Maximum number of retry attempts
 * @property {number} delay - Delay between retries in milliseconds
 * 
 * @typedef {Object} ScheduleConfig
 * @property {'once'|'schedule'|'now'|'manual'} type - Type of schedule execution
 * @property {string|Date} [value] - Cron expression (for 'schedule') or Date object (for 'once')
 * 
 * @typedef {Object} JobData
 * @property {*} [payload] - Custom data payload for the job
 * @property {Object} [metadata] - Additional metadata for job execution
 */

/**
 * Consolidated Pulse job runner that handles all job operations.
 * Combines scheduling, execution, and lifecycle management in a single class.
 * This replaces the previous interface-based architecture for better maintainability.
 */
class PulseJobRunner {
    /**
     * @type {PulseInstance}
     * @private
     */
    #pulseRunner;

    /**
     * @type {MongoDB}
     * @private
     */
    #db;

    /**
     * @type {Logger}
     * @private
     */
    #log;

    /**
     * @type {Map<string, ScheduleConfig>}
     * @private
     */
    #pendingSchedules = new Map();

    /**
     * Creates a new PulseJobRunner instance
     * 
     * @param {MongoDB} db - MongoDB database connection
     * @param {Object} config - Configuration object for Pulse
     * @param {string} [config.name] - Name of the Pulse instance
     * @param {Object} [config.options] - Additional Pulse configuration options
     * @param {function} Logger - Logger constructor function
     * @throws {Error} If required dependencies are not provided
     */
    constructor(db, config, Logger) {
        this.#log = Logger('jobs:runner:pulse');
        this.#log.d('Initializing PulseJobRunner');

        if (!db || !config) {
            this.#log.e('Missing required dependencies');
            throw new Error('Missing required dependencies for PulseJobRunner');
        }

        this.#db = db;

        // Create the Pulse instance
        this.#pulseRunner = new Pulse({
            ...config,
            mongo: db,
        });
        this.#log.i('Created Pulse instance', { config: { ...config, mongo: '[Connection]' } });

        this.#log.i('PulseJobRunner initialized successfully');
    }

    // ========================================
    // Job Execution Methods
    // ========================================

    /**
     * Creates and registers a new job with the Pulse runner
     * @param {string} jobName - Unique identifier for the job
     * @param {Constructor} JobClass - Job class constructor
     * @throws {Error} When job creation or registration fails
     * @returns {Promise<void>} A promise that resolves once the job is created
     */
    async createJob(jobName, JobClass) {
        this.#log.d(`Attempting to create job: ${jobName}`);
        try {
            const instance = new JobClass(jobName);

            const retryConfig = instance.getRetryConfig();
            const priority = this.#mapPriority(instance.getPriority());
            const concurrency = instance.getConcurrency();
            const lockLifetime = instance.getLockLifetime();
            const isEnabled = instance.getEnabled();

            this.#pulseRunner.define(
                jobName,
                async(job, done) => {
                    instance.setTouchMethod(job.touch.bind(job));
                    instance.setProgressMethod(
                        async(progressData) => this.#updateJobProgress(job, progressData)
                    );
                    return instance._run(this.#db, job, done);
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
                this.#log.d(`Job ${jobName} disabled after creation`);
            }

            const scheduleConfig = instance.getSchedule();
            this.#pendingSchedules.set(jobName, scheduleConfig);
            this.#log.d(`Job ${jobName} defined successfully with enabled state: ${isEnabled}`);

            this.#log.d(`Configuring job ${jobName} with priority: ${priority}, concurrency: ${concurrency}, lockLifetime: ${lockLifetime}`);

            this.#log.i(`Job ${jobName} created and configured successfully with retry attempts: ${retryConfig?.attempts || 1}`);
        }
        catch (error) {
            this.#log.e(`Failed to create job ${jobName}`, { error, stack: error.stack });
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
            await this.#pulseRunner.enable({ name: jobName });
            this.#log.i(`Job ${jobName} enabled`);
        }
        catch (error) {
            this.#log.e(`Failed to enable job ${jobName}:`, error);
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
            await this.#pulseRunner.disable({ name: jobName });
            this.#log.i(`Job ${jobName} disabled`);
        }
        catch (error) {
            this.#log.e(`Failed to disable job ${jobName}:`, error);
            throw error;
        }
    }

    /**
     * Configures retry settings for a job
     * @param {string} jobName Name of the job
     * @param {RetryConfig} retryConfig Retry configuration
     * @returns {Promise<void>} A promise that resolves once retry settings are updated
     */
    async configureRetry(jobName, retryConfig) {
        try {
            // First get the job definition
            const definition = this.#pulseRunner._definitions[jobName];
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
            await this.#pulseRunner._collection.updateMany(
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

            this.#log.i(`Retry configuration updated for job ${jobName}`);
        }
        catch (error) {
            this.#log.e(`Failed to configure retry for job ${jobName}:`, error);
            throw error;
        }
    }

    // ========================================
    // Job Scheduling Methods
    // ========================================

    /**
     * Schedules a job to run based on provided configuration
     * @param {string} name - Unique identifier for the job
     * @param {ScheduleConfig} scheduleConfig - Configuration defining when the job should run
     * @param {JobData} [data={}] - Optional payload to pass to the job during execution
     * @returns {Promise<void>} Resolves when job is successfully scheduled
     * @throws {Error} If scheduling fails or configuration is invalid
     */
    async schedule(name, scheduleConfig, data = {}) {
        try {
            this.#validateScheduleConfig(scheduleConfig);
            this.#log.d(`Attempting to schedule job '${name}' with type: ${scheduleConfig.type}`, {
                scheduleConfig,
                data
            });

            switch (scheduleConfig.type) {
            case 'schedule':
                if (!isValidCron(scheduleConfig.value)) {
                    throw new Error('Invalid cron schedule');
                }
                await this.#pulseRunner.every(scheduleConfig.value, name, data);
                break;

            case 'once':
                if (!(scheduleConfig.value instanceof Date)) {
                    throw new Error('Invalid date for one-time schedule');
                }
                await this.#pulseRunner.schedule(scheduleConfig.value, name, data);
                break;

            case 'now': {
                const now = new Date();
                await this.#pulseRunner.schedule(now, name, data);
                break;
            }
            case 'manual':
                // For manual jobs, do not automatically schedule them.
                // They should only run when explicitly triggered.
                this.#log.d(`Job '${name}' is set to manual; not scheduling automatically.`);
                break;
            }

            this.#log.i(`Successfully scheduled job '${name}'`, {
                type: scheduleConfig.type,
                value: scheduleConfig.value,
                hasData: Object.keys(data).length > 0
            });
        }
        catch (error) {
            this.#log.e(`Failed to schedule job '${name}'`, {
                error: error.message,
                scheduleConfig,
                stack: error.stack
            });
            throw error;
        }
    }

    /**
     * Updates an existing job's schedule with new configuration
     * @param {string} jobName - Name of the job to update
     * @param {ScheduleConfig} schedule - New schedule configuration
     * @param {JobData} [data={}] - Optional payload to pass to the job during execution
     * @returns {Promise<void>} Resolves when schedule is successfully updated
     * @throws {Error} If update fails or new configuration is invalid
     */
    async updateSchedule(jobName, schedule, data = {}) {
        try {
            this.#log.d(`Attempting to update schedule for job '${jobName}'`, { schedule, data });

            this.#validateScheduleConfig(schedule);

            // First cancel/remove all existing scheduled jobs with this name that are still pending future execution.
            // Jobs with nextRunAt: null (e.g. completed one-time jobs or fully completed repeating jobs) will be preserved.
            await this.#pulseRunner.cancel({ name: jobName, nextRunAt: { $ne: null } });
            this.#log.d(`Cancelled pending future schedules for job '${jobName}'`);

            // Then create a new schedule based on the type
            switch (schedule.type) {
            case 'schedule':
                if (!isValidCron(schedule.value)) {
                    throw new Error('Invalid cron schedule');
                }
                await this.#pulseRunner.every(schedule.value, jobName, data);
                break;

            case 'once':
                if (!(schedule.value instanceof Date)) {
                    throw new Error('Invalid date for one-time schedule');
                }
                await this.#pulseRunner.schedule(schedule.value, jobName, data);
                break;

            case 'now': {
                const now = new Date();
                await this.#pulseRunner.schedule(now, jobName, data);
                break;
            }
            case 'manual':
                // For manual jobs, existing pending schedules were removed above.
                // No new schedule is created for 'manual' type, it requires explicit runJobNow.
                this.#log.d(`Job '${jobName}' updated to manual schedule; not rescheduling automatically.`);
                break;
            }

            this.#log.i(`Successfully updated schedule for job '${jobName}'`, {
                type: schedule.type,
                value: schedule.value
            });
        }
        catch (error) {
            this.#log.e(`Failed to update schedule for job '${jobName}'`, {
                error: error.message,
                schedule,
                stack: error.stack
            });
            // Do not throw error to prevent process termination
            // The error has been logged for debugging purposes
        }
    }

    /**
     * Triggers immediate execution of a job
     * @param {string} jobName - Name of the job to execute
     * @returns {Promise<void>} Resolves when job is successfully triggered
     * @throws {Error} If immediate execution fails
     */
    async runJobNow(jobName) {
        try {
            this.#log.d(`Attempting to trigger immediate execution of job '${jobName}'`);
            await this.#pulseRunner.now(jobName, {});
            this.#log.i(`Successfully triggered immediate execution of job '${jobName}'`);
        }
        catch (error) {
            this.#log.e(`Failed to trigger immediate execution of job '${jobName}'`, {
                error: error.message,
                stack: error.stack
            });
            throw error;
        }
    }

    // ========================================
    // Job Lifecycle Methods
    // ========================================

    /**
     * Initializes and starts the job runner, then schedules all pending jobs.
     * @returns {Promise<void>} Resolves when the runner is started and all jobs are scheduled
     * @throws {Error} If pulse runner is not initialized or scheduling fails
     */
    async start() {
        if (!this.#pulseRunner) {
            this.#log.e('Lifecycle start failed: Pulse runner not initialized', {
                component: 'PulseJobRunner',
                method: 'start'
            });
            throw new Error('Pulse runner not initialized');
        }

        try {
            await this.#pulseRunner.start();
            this.#log.i('Pulse runner initialization complete', {
                component: 'PulseJobRunner',
                status: 'started'
            });

            const pendingJobCount = this.#pendingSchedules.size;
            this.#log.i('Beginning job schedule processing', {
                component: 'PulseJobRunner',
                pendingJobs: pendingJobCount
            });

            // Schedule all pending jobs
            for (const [jobName, scheduleConfig] of this.#pendingSchedules) {
                try {
                    await this.schedule(jobName, scheduleConfig);
                    this.#log.d('Job scheduled successfully', {
                        component: 'PulseJobRunner',
                        job: jobName,
                        config: scheduleConfig
                    });
                }
                catch (error) {
                    this.#log.e('Job scheduling failed', {
                        component: 'PulseJobRunner',
                        job: jobName,
                        error: error.message,
                        stack: error.stack
                    });
                }
            }

            this.#pendingSchedules.clear();
            this.#log.i('Job scheduling process complete', {
                component: 'PulseJobRunner',
                totalProcessed: pendingJobCount
            });
        }
        catch (error) {
            this.#log.e('Pulse runner start failed', {
                component: 'PulseJobRunner',
                error: error.message,
                stack: error.stack
            });
            throw error;
        }
    }

    /**
     * Gracefully shuts down the job runner and cleans up resources.
     * @returns {Promise<void>} Resolves when the runner is successfully closed
     * @throws {Error} If the shutdown process fails
     */
    async close() {
        try {
            await this.#pulseRunner.close();
            this.#log.i('Pulse runner shutdown complete', {
                component: 'PulseJobRunner',
                status: 'closed'
            });
        }
        catch (error) {
            this.#log.e('Pulse runner shutdown failed', {
                component: 'PulseJobRunner',
                error: error.message,
                stack: error.stack
            });
            throw error;
        }
    }

    // ========================================
    // Private Helper Methods
    // ========================================

    /**
     * Validates schedule configuration structure and values
     * @private
     * @param {ScheduleConfig} config - Schedule configuration to validate
     * @throws {Error} If configuration is invalid or missing required fields
     */
    #validateScheduleConfig(config) {
        if (!config || typeof config !== 'object') {
            throw new Error('Schedule configuration must be an object');
        }

        if (!config.type) {
            throw new Error('Schedule type is required');
        }

        const validTypes = ['schedule', 'once', 'now', 'manual'];
        if (!validTypes.includes(config.type)) {
            throw new Error(`Invalid schedule type: ${config.type}`);
        }

        if (config.type !== 'now' && config.type !== 'manual' && !config.value) {
            throw new Error('Schedule value is required');
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
        this.#log.d(`Updating progress for job ${job.attrs.name}`, { progressData });
        try {
            job.attrs.data = {
                ...job.attrs.data,
                progressData
            };
            await job.save();
            this.#log.d(`Progress updated successfully for job ${job.attrs.name}`);
        }
        catch (error) {
            this.#log.e(`Failed to update job progress for ${job.attrs.name}`, {
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
            this.#log.w(`Invalid priority "${priority}", defaulting to normal`);
            return JobPriority.normal;
        }

        return priorityMap[priority];
    }
}

module.exports = PulseJobRunner;