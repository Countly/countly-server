const IJobScheduler = require('./interfaces/IJobScheduler');
const IJobExecutor = require('./interfaces/IJobExecutor');
const IJobLifecycle = require('./interfaces/IJobLifecycle');

/**
 * Base class for job runners that implements all interfaces through composition
 */
class BaseJobRunner {
    /**
     * @param {IJobScheduler} scheduler - Scheduler implementation
     * @param {IJobExecutor} executor - Executor implementation
     * @param {IJobLifecycle} lifecycle - Lifecycle implementation
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
     * Schedules a job to run
     * @param {string} name Job name
     * @param {Object} scheduleConfig Schedule configuration
     * @param {Object} [data] Optional data to pass to the job
     * @returns {Promise<void>} A promise that resolves once the job is scheduled
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
     * Starts the job runner
     * @param {Object.<string, Function>} jobClasses Job classes to register
     * @returns {Promise<void>} A promise that resolves once the job runner is started
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