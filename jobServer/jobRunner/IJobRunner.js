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
     * Schedules jobs
     * @param {String} name The name of the job
     * @param {String} schedule Cron string for the job schedule
     * @param {Object} data Data to pass to the job
     * @returns {Promise<void>} A promise that resolves once the job is scheduled
     */
    async schedule(/*name, schedule, data*/) {
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
}

module.exports = IJobRunner;