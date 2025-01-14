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
        this.logger.d(`Job instance"${this.jobName}" created`);
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
     * Runs the job and handles both Promise and callback patterns.
     * @param {Object} db The database
     * @param {Object} job The job instance
     * @param {Function} done Callback to be called when job completes
     * @private
     */
    async _run(db, job, done) {
        this.logger.d(`Job "${this.jobName}" is starting with database:`, db?._cly_debug?.db);

        try {
            // Call run() and handle both Promise and callback patterns
            const result = await new Promise((resolve, reject) => {
                try {
                    // Call the run method and capture its return value
                    // If run() uses callback pattern, resolve/reject the promise when the callback is called
                    const runResult = this.run(db, (error, callbackResult) => {
                        if (error) {
                            reject(error);
                        }
                        else {
                            resolve(callbackResult);
                        }
                    });

                    // If run() returns a Promise, handle it
                    if (runResult instanceof Promise) {
                        runResult.then(resolve).catch(reject);
                    }
                    // If run() returns a value directly
                    else if (runResult !== undefined) {
                        resolve(runResult);
                    }
                }
                catch (error) {
                    reject(error);
                }
            });

            // Log success and call the job runner's callback
            this.logger.i(`Job "${this.jobName}" completed successfully:`, result || '');
            done(null, result);
        }
        catch (error) {
            // Log error and call the job runner's callback with the error
            this.logger.e(`Job "${this.jobName}" encountered an error during execution:`, error);
            done(error);
        }
    }
}

module.exports = Job;