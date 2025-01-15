const IJobRunner = require('./IJobRunner');
const { Pulse, JobPriority } = require('@pulsecron/pulse');
const {isValidCron} = require('cron-validator');
const { JOB_PRIORITIES } = require('../constants/JobPriorities');

/**
 * Pulse implementation of the job runner
 */
class JobRunnerPulseImpl extends IJobRunner {
    /**
     * The Pulse runner instance
     * @type {import('@pulsecron/pulse').Pulse}
     */
    #pulseRunner;

    /** @type {Map<string, Object>} Store job schedules until Pulse is started */
    #pendingSchedules = new Map();

    /**
     * Creates a new Pulse job runner
     * @param {Object} db Database connection
     * @param {Object} config Configuration object
     * @param {function} Logger - Logger constructor
     */
    constructor(db, config, Logger) {
        super(db, config, Logger);
        this.log = Logger('jobs:runner:pulse');
        this.#pulseRunner = new Pulse({
            ...config,
            mongo: this.db,
        });
    }

    /**
     * Starts the Pulse runner and schedules any pending jobs
     */
    async start() {
        if (!this.#pulseRunner) {
            throw new Error('Pulse runner not initialized');
        }

        await this.#pulseRunner.start();
        this.log.i('Pulse runner started');

        // Schedule all pending jobs
        for (const [jobName, scheduleConfig] of this.#pendingSchedules) {
            try {
                await this.#scheduleJob(jobName, scheduleConfig);
            }
            catch (error) {
                this.log.e(`Failed to schedule job ${jobName}:`, error);
            }
        }

        this.#pendingSchedules.clear();
    }

    /**
     * Updates job progress in Pulse
     * @param {Object} job Pulse job instance
     * @param {Object} progressData Progress data to store
     * @private
     */
    async #updateJobProgress(job, progressData) {
        job.data = progressData;
        await job.save();
    }

    /**
     * Creates and defines a new job
     * @param {string} jobName The name of the job
     * @param {Function} JobClass The job class to create
     * @returns {Promise<void>} A promise that resolves once the job is created
     */
    async createJob(jobName, JobClass) {
        try {
            const instance = new JobClass(jobName);
            // instance.setLogger(this.log);
            instance.setJobName(jobName);

            // Get job configurations
            const retryConfig = instance.getRetryConfig();
            const priority = this._mapPriority(instance.getPriority());
            const concurrency = instance.getConcurrency();
            const lockLifetime = instance.getLockLifetime();

            this.#pulseRunner.define(
                jobName,
                async(job, done) => {
                    instance._setTouchMethod(job.touch.bind(job));
                    instance._setProgressMethod(
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
            this.#pendingSchedules.set(jobName, scheduleConfig);
            this.log.d(`Job ${jobName} defined successfully`);
        }
        catch (error) {
            this.log.e(`Failed to create job ${jobName}:`, error);
            // Don't throw - allow other jobs to continue
        }
    }

    /**
     * Internal method to schedule a job
     * @param {string} name The name of the job to schedule
     * @param {Object} scheduleConfig Schedule configuration object
     * @param {('once'|'schedule'|'now')} scheduleConfig.type Type of schedule
     * @param {string|Date} [scheduleConfig.value] Cron string or Date object
     * @param {Object} [data] Data to pass to the job
     * @private
     */
    async #scheduleJob(name, scheduleConfig, data) {
        switch (scheduleConfig.type) {
        case 'schedule':
            if (!isValidCron(scheduleConfig.value)) {
                throw new Error('Invalid cron schedule');
            }
            await this.#pulseRunner.every(scheduleConfig.value, name, data);
            this.log.d(`Job ${name} scheduled with cron: ${scheduleConfig.value}`);
            break;

        case 'once':
            if (!(scheduleConfig.value instanceof Date)) {
                throw new Error('Invalid date for one-time schedule');
            }
            await this.#pulseRunner.schedule(scheduleConfig.value, name, data);
            this.log.d(`Job ${name} scheduled for: ${scheduleConfig.value}`);
            break;

        case 'now':
            await this.#pulseRunner.now(name, data);
            this.log.d(`Job ${name} scheduled to run immediately`);
            break;

        default:
            throw new Error(`Invalid schedule type: ${scheduleConfig.type}`);
        }
    }

    /**
     * Closes the Pulse runner
     * @returns {Promise<void>} A promise that resolves once the runner is closed
     */
    async close() {
        if (this.#pulseRunner) {
            await this.#pulseRunner.close();
            this.#pulseRunner = null;
        }
    }

    /**
     * Enable a job
     * @param {string} jobName Name of the job to enable
     * @returns {Promise<void>} A promise that resolves once the job is enabled
     */
    async enableJob(jobName) {
        try {
            await this.#pulseRunner.enable({ name: jobName });
            this.log.i(`Job ${jobName} enabled`);
        }
        catch (error) {
            this.log.e(`Failed to enable job ${jobName}:`, error);
            throw error;
        }
    }

    /**
     * Disable a job
     * @param {string} jobName Name of the job to disable
     * @returns {Promise<void>} A promise that resolves once the job is disabled
     */
    async disableJob(jobName) {
        try {
            await this.#pulseRunner.disable({ name: jobName });
            this.log.i(`Job ${jobName} disabled`);
        }
        catch (error) {
            this.log.e(`Failed to disable job ${jobName}:`, error);
            throw error;
        }
    }

    /**
     * Triggers immediate execution of a job
     * @param {string} jobName Name of the job to run
     * @returns {Promise<void>} A promise that resolves when the job is triggered
     */
    async runJobNow(jobName) {
        try {
            await this.#pulseRunner.now({ name: jobName });
            this.log.i(`Job ${jobName} triggered for immediate execution`);
        }
        catch (error) {
            this.log.e(`Failed to run job ${jobName} immediately:`, error);
            throw error;
        }
    }

    /**
     * Updates the schedule of an existing job
     * @param {string} jobName Name of the job to update
     * @param {Object} schedule New schedule configuration
     * @returns {Promise<void>} A promise that resolves when the schedule is updated
     */
    async updateSchedule(jobName, schedule) {
        try {
            await this.#pulseRunner.reschedule({ name: jobName }, schedule);
            this.log.i(`Schedule updated for job ${jobName}`);
        }
        catch (error) {
            this.log.e(`Failed to update schedule for job ${jobName}:`, error);
            throw error;
        }
    }

    /**
     * Configures retry settings for a job
     * @param {string} jobName Name of the job
     * @param {Object} retryConfig Retry configuration
     * @param {number} retryConfig.attempts Number of retry attempts
     * @param {number} retryConfig.delay Delay between retries in milliseconds
     * @returns {Promise<void>} A promise that resolves when retry config is updated
     */
    async configureRetry(jobName, retryConfig) {
        try {
            await this.#pulseRunner.updateOne(
                { name: jobName },
                {
                    $set: {
                        attempts: retryConfig.attempts,
                        backoff: {
                            delay: retryConfig.delay,
                            type: 'fixed'
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
     * Maps generic priority to runner-specific priority
     * @protected
     * @param {string} priority Generic priority from JOB_PRIORITIES
     * @returns {any} Runner-specific priority value
     */
    _mapPriority(priority) {
        const priorityMap = {
            [JOB_PRIORITIES.LOWEST]: JobPriority.lowest,
            [JOB_PRIORITIES.LOW]: JobPriority.low,
            [JOB_PRIORITIES.NORMAL]: JobPriority.normal,
            [JOB_PRIORITIES.HIGH]: JobPriority.high,
            [JOB_PRIORITIES.HIGHEST]: JobPriority.highest
        };
        return priorityMap[priority] || JobPriority.normal;
    }
}

module.exports = JobRunnerPulseImpl;