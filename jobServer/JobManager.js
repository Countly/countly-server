const {RUNNER_TYPES, createJobRunner} = require('./JobRunner');
const config = require("./config");

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
     * Loads the job classes into the job runner
     * @param {Object.<string, Function>} jobClasses Object containing job classes keyed by job name
     * @returns {Promise<void>} A promise that resolves once the jobs are loaded
     */
    #loadJobs(jobClasses) {
        return Promise.all(
            Object.entries(jobClasses)
                .map(([name, JobClass]) => {
                    return this.#jobRunner.createJob(name, JobClass);
                })
        );
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