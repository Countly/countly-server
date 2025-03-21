/**
 * @typedef {import('./interfaces/IJobScheduler')} IJobScheduler
 * @typedef {import('./interfaces/IJobExecutor')} IJobExecutor
 * @typedef {import('./interfaces/IJobLifecycle')} IJobLifecycle
 * 
 * @typedef {Object} ScheduleConfig
 * @property {string} [cron] - Cron expression for scheduled execution
 * @property {number} [interval] - Interval in milliseconds between executions
 * @property {Date} [startDate] - Date when the job should start
 * @property {Date} [endDate] - Date when the job should end
 * 
 * @typedef {Object} RetryConfig
 * @property {number} attempts - Maximum number of retry attempts
 * @property {number} backoff - Delay between retries in milliseconds
 * @property {('exponential'|'linear'|'fixed')} strategy - Retry backoff strategy
 */

const IJobScheduler = require('./interfaces/IJobScheduler');
const IJobExecutor = require('./interfaces/IJobExecutor');
const IJobLifecycle = require('./interfaces/IJobLifecycle');

/**
 * Base class for job runners that implements scheduling, execution, and lifecycle management
 * through composition. Provides a unified interface for job management operations.
 */
class BaseJobRunner {
    /**
     * Creates a new BaseJobRunner instance
     * @param {IJobScheduler} scheduler - Handles job scheduling and timing
     * @param {IJobExecutor} executor - Manages job execution and retry logic
     * @param {IJobLifecycle} lifecycle - Controls runner lifecycle and resource management
     * @throws {Error} If any of the implementations are invalid
     */
    constructor(scheduler, executor, lifecycle) {
        if (!(scheduler instanceof IJobScheduler)) {
            throw new Error('Invalid scheduler implementation');
        }
        if (!(executor instanceof IJobExecutor)) {
            throw new Error('Invalid executor implementation');
        }
        if (!(lifecycle instanceof IJobLifecycle)) {
            throw new Error('Invalid lifecycle implementation');
        }

        this.scheduler = scheduler;
        this.executor = executor;
        this.lifecycle = lifecycle;
    }

    /**
     * Schedules a job for execution based on the provided configuration
     * @param {string} name - Unique identifier for the job
     * @param {ScheduleConfig} scheduleConfig - Configuration for when the job should run
     * @param {Object} [data] - Optional data passed to the job during execution
     * @returns {Promise<void>} Resolves when scheduling is complete
     * @throws {Error} If scheduling fails or job doesn't exist
     */
    async schedule(name, scheduleConfig, data) {
        return this.scheduler.schedule(name, scheduleConfig, data);
    }

    /**
     * Updates a job's schedule
     * @param {string} jobName Name of the job
     * @param {Object} schedule New schedule configuration
     * @returns {Promise<void>} A promise that resolves once the schedule is updated
     */
    async updateSchedule(jobName, schedule) {
        return this.scheduler.updateSchedule(jobName, schedule);
    }

    /**
     * Runs a job immediately
     * @param {string} jobName Name of the job
     * @returns {Promise<void>} A promise that resolves when the job is triggered
     */
    async runJobNow(jobName) {
        return this.scheduler.runJobNow(jobName);
    }

    /**
     * Creates and registers a new job
     * @param {string} jobName Name of the job
     * @param {Function} JobClass Job class implementation
     * @returns {Promise<void>} A promise that resolves once the job is created and registered
     */
    async createJob(jobName, JobClass) {
        return this.executor.createJob(jobName, JobClass);
    }

    /**
     * Enables a job
     * @param {string} jobName Name of the job
     * @returns {Promise<void>} A promise that resolves once the job is enabled
     */
    async enableJob(jobName) {
        return this.executor.enableJob(jobName);
    }

    /**
     * Disables a job
     * @param {string} jobName Name of the job
     * @returns {Promise<void>} A promise that resolves once the job is disabled
     */
    async disableJob(jobName) {
        return this.executor.disableJob(jobName);
    }

    /**
     * Configures retry settings for a job
     * @param {string} jobName Name of the job
     * @param {Object} retryConfig Retry configuration
     * @returns {Promise<void>} A promise that resolves once the retry settings are configured
     */
    async configureRetry(jobName, retryConfig) {
        return this.executor.configureRetry(jobName, retryConfig);
    }

    /**
     * Initializes and starts the job runner with the provided job implementations
     * @param {Object.<string, Function>} jobClasses - Map of job names to their implementing classes
     * @returns {Promise<void>} Resolves when all jobs are registered and the runner is ready
     * @throws {Error} If initialization fails or invalid job classes are provided
     */
    async start(jobClasses) {
        return this.lifecycle.start(jobClasses);
    }

    /**
     * Closes the job runner and cleans up resources
     * @returns {Promise<void>} A promise that resolves once the job runner is closed
     */
    async close() {
        return this.lifecycle.close();
    }
}

module.exports = BaseJobRunner;