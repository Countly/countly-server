/**
 * Interface for job runner implementations
 */
class IJobRunner {

    db;

    config;

    log;

    /**
     *@param {Object} db Database connection
     * @param {Object} config Configuration
     * @param {function} Logger - Logger constructor
     */
    constructor(db, config, Logger) {
        this.log = Logger('jobs:runner');
        this.db = db;
        this.config = config;
    }

    /**
     * Defines a new job
     * @param {String} jobName The name of the job
     * @param {function} jobRunner The job runner function
     * @param {Object} [jobOptions=null] The job options
     * @returns {Promise<void>} A promise that resolves once the job is defined
     */
    async createJob(/*jobName, jobRunner, jobOptions=null*/) {
        throw new Error('Method not implemented');
    }

    /**
     * Schedules a job based on its configuration
     * @param {String} name The name of the job
     * @param {Object} scheduleConfig Schedule configuration object
     * @param {('once'|'schedule'|'now')} scheduleConfig.type Type of schedule
     * @param {string|Date} [scheduleConfig.value] Cron string or Date object
     * @param {Object} [data] Data to pass to the job
     * @returns {Promise<void>} A promise that resolves once the job is scheduled
     */
    async schedule(/*name, scheduleConfig, data*/) {
        throw new Error('Method not implemented');
    }

    /**
     * Runs a job once
     * @param {String} name The name of the job
     * @param {Date} date The schedule
     * @param {Object} data Data to pass to the job
     * @returns {Promise<void>} A promise that resolves once the job is scheduled
     */
    async once(/*name, date, data*/) {
        throw new Error('Method not implemented');
    }

    /**
     * Runs a job now
     * @param {String} name The name of the job
     * @param {Object} data Data to pass to the job
     * @returns {Promise<void>} A promise that resolves once the job is run
     */
    async now(/*name, data*/) {
        throw new Error('Method not implemented');
    }

    /**
     * Starts the job runner
     * @param {Object.<string, Function>} jobClasses Object containing job classes keyed by job name
     * @returns {Promise<void>} A promise that resolves once the runner is started
     */
    async start(/*jobClasses*/) {
        throw new Error('Method not implemented');
    }

    /**
     * Closes the job runner and cleans up resources
     * @returns {Promise<void>} A promise that resolves once the runner is closed
     */
    async close() {
        throw new Error('Method not implemented');
    }

    /**
     * Enable a job
     * @param {string} jobName Name of the job to enable
     * @returns {Promise<void>} A promise that resolves once the job is enabled
     */
    async enableJob(/*jobName*/) {
        throw new Error('Method not implemented');
    }

    /**
     * Disable a job
     * @param {string} jobName Name of the job to disable
     * @returns {Promise<void>} A promise that resolves once the job is disabled
     */
    async disableJob(/*jobName*/) {
        throw new Error('Method not implemented');
    }

    /**
     * Run a job immediately
     * @param {string} jobName Name of the job to run
     * @returns {Promise<void>} A promise that resolves once the job is triggered
     */
    async runJobNow(/* jobName */) {
        throw new Error('runJobNow must be implemented');
    }

    /**
     * Update job schedule
     * @param {string} jobName Name of the job
     * @param {string|Date} schedule New schedule (cron string or date)
     * @returns {Promise<void>} A promise that resolves once schedule is updated
     */
    async updateSchedule(/* jobName, schedule */) {
        throw new Error('updateSchedule must be implemented');
    }

    /**
     * Configure job retry settings
     * @param {string} jobName Name of the job
     * @param {Object} retryConfig Retry configuration
     * @param {number} retryConfig.attempts Number of retry attempts
     * @param {number} retryConfig.delay Delay between retries in ms
     * @returns {Promise<void>} A promise that resolves once retry is configured
     */
    async configureRetry(/* jobName, retryConfig */) {
        throw new Error('configureRetry must be implemented');
    }

    /**
     * Maps generic priority to runner-specific priority
     * @protected
     * @param {string} priority Generic priority from JOB_PRIORITIES
     * returns {any} Runner-specific priority value
     */
    _mapPriority(/* priority */) {
        throw new Error('_mapPriority must be implemented');
    }
}

module.exports = IJobRunner;