/**
 * Represents a job.
 */
class Job {

    jobName = Job.name;

    logger = {
        d: console.debug,
        w: console.warn,
        e: console.error,
        i: console.info
    };

    /**
     * Creates an instance of Job.
     */
    constructor() {
        this.doneCallback = this.doneCallback.bind(this);
    }

    /**
     * Sets the name of the job.
     * @param {String} name The name of the job
     * @returns {void} The name of the job
     */
    setJobName(name) {
        this.jobName = name;
    }

    /**
     * Sets the logger
     * @param {Logger} logger The logger
     */
    setLogger(logger) {
        this.logger = logger;
    }

    /**
     * Runs the job.
     * @param {Object} db The database connection
     * @param {Function} done The callback function to be called when the job is done
     * @throws {Error} If the method is not overridden
     * @abstract
     */
    async run(/*db, done*/) {
        throw new Error('Job must be overridden');
    }

    /**
     * Get the schedule for the job in cron format.
     * @returns {string} The cron schedule
     * @throws {Error} If the method is not overridden
     * @abstract
     */
    schedule() {
        throw new Error('schedule must be overridden');
    }

    /**
     * Callback function to be called when the job is done.
     * @param {Error} error The error that occurred
     * @param {Object} result The job that was run
     * @returns {Error} The error to be returned to the job run by pulseScheduler
     */
    doneCallback(error, result) {
        if (error) {
            this.logger.e('Job failed with error:', error);
            throw error;
        }
        else {
            this.logger.i('Job completed successfully:', result ? result : '');
            return result ? result : null;
        }
    }

    /**
     * Runs the job.
     * @param { Object } db The database
     * @private
     */
    _run(db) {
        this.logger.d(`Job "${this.jobName}" is starting with database:`, db?._cly_debug?.db);
        try {
            this.run(db, this.doneCallback);
        }
        catch (error) {
            this.logger.e(`Job "${this.jobName}" encountered an error during execution:`, error);
            this.doneCallback(error, this);
        }
    }
}

module.exports = Job;