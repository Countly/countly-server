const IJobRunner = require('./IJobRunner');
const { Pulse, JobPriority } = require('@pulsecron/pulse');
const {isValidCron} = require('cron-validator');

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

            this.#pulseRunner.define(
                jobName,
                async(job, done) => {
                    instance._setTouchMethod(job.touch.bind(job));
                    instance._setProgressMethod(
                        async(progressData) => this.#updateJobProgress(job, progressData)
                    );

                    return instance._run(
                        this.db,
                        job,
                        done
                    );
                },
                {
                    priority: JobPriority.normal,
                    concurrency: 1,
                    lockLifetime: 10000,
                    shouldSaveResult: true,
                    attempts: 3,
                    backoff: {
                        type: 'exponential',
                        delay: 2000
                    }
                }
            );

            // Store schedule configuration for later
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
}

module.exports = JobRunnerPulseImpl;