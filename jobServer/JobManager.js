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
        await this.#scheduleJobs(jobClasses);
        this.#log.d('JobManager started successfully');
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
                    this.#jobRunner.createJob(name, JobClass);
                })
        );
    }

    /**
     * Schedules the jobs to run at their respective intervals
     * @param { Object.<string, Function> } jobClasses Object containing job classes keyed by job name
     * @returns {Promise<Awaited<void>[]>} A promise that resolves once the jobs are scheduled
     */
    #scheduleJobs(jobClasses) {
        return Promise.all(
            Object.entries(jobClasses)
                .map(([name, JobClass]) => {
                    let instance = new JobClass(name);
                    let schedule = instance.schedule();
                    if (schedule) {
                        this.#jobRunner.schedule(name, schedule);
                    }
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