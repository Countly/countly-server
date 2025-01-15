const defaultLogger = { d: console.debug, w: console.warn, e: console.error, i: console.info };
const { JOB_PRIORITIES } = require('./constants/JobPriorities');

/**
 * Base class for creating jobs.
 * 
 * @example
 * // Example of a simple job that runs every minute
 * class SimpleJob extends Job {
 *     getSchedule() {
 *         return {
 *             type: 'schedule',
 *             value: '* * * * *' // Runs every minute
 *         };
 *     }
 * 
 *     async run(db, done) {
 *         try {
 *             await db.collection('mycollection').updateMany({}, { $set: { updated: new Date() } });
 *             done(null, 'Successfully updated records');
 *         } catch (error) {
 *             done(error);
 *         }
 *     }
 * }
 * 
 * @example
 * // Example of a one-time job scheduled for a specific date
 * class OneTimeJob extends Job {
 *     getSchedule() {
 *         return {
 *             type: 'once',
 *             value: new Date('2024-12-31T23:59:59Z')
 *         };
 *     }
 * 
 *     async run(db, done) {
 *         // Your job logic here
 *         done();
 *     }
 * }
 * 
 * @example
 * // Example of a job that runs immediately
 * class ImmediateJob extends Job {
 *     getSchedule() {
 *         return {
 *             type: 'now'
 *         };
 *     }
 * 
 *     async run(db, done) {
 *         // Your job logic here
 *         done();
 *     }
 * }
 */
class Job {
    /** @type {string} Name of the job */
    jobName = Job.name;

    /** @type {Object} Logger instance */
    logger;

    /** @type {Function|null} Touch method from job runner */
    #touchMethod = null;

    /** @type {Function|null} Progress method from job runner */
    #progressMethod;

    priorities = JOB_PRIORITIES;

    /**
     * Creates an instance of Job.
     */
    constructor() {
        this.logger = defaultLogger;
        this.logger.d(`Job instance "${this.jobName}" created`);
    }

    /**
     * Sets the name of the job.
     * @param {String} name The name of the job
     */
    setJobName(name) {
        this.jobName = name;
    }

    /**
     * Sets the logger
     * @param {Object} [logger=defaultLogger] The logger instance
     */
    setLogger(logger = defaultLogger) {
        this.logger = logger;
    }

    /**
     * Runs the job. This method must be implemented by the child class.
     * 
     * @param {Db} db The database connection
     * @param {Function} done Callback function to be called when the job is complete
     *                       Call with error as first parameter if job fails
     *                       Call with null and optional result as second parameter if job succeeds
     * @param {Function} progress Progress reporting function for long-running jobs
     *                           Call with (total, current, bookmark) to report progress
     * 
     * @example
     * // Example implementation with progress reporting
     * async run(db, done, progress) {
     *     try {
     *         const total = await db.collection('users').countDocuments({ active: false });
     *         let processed = 0;
     *         
     *         const cursor = db.collection('users').find({ active: false });
     *         while (await cursor.hasNext()) {
     *             await cursor.next();
     *             processed++;
     *             if (processed % 100 === 0) {
     *                 await progress(total, processed, `Processing inactive users`);
     *             }
     *         }
     *         done(null, { processedCount: processed });
     *     } catch (error) {
     *         done(error);
     *     }
     * }
     * 
     * @abstract
     * @throws {Error} If the method is not overridden
     */
    async run(/*db, done, progress*/) {
        throw new Error('Job must be overridden');
    }

    /**
     * Get the schedule type and timing for the job.
     * This method must be implemented by the child class.
     * 
     * @returns {Object} Schedule configuration object
     * @property {('once'|'schedule'|'now')} type - Type of schedule
     * @property {string|Date} [value] - Schedule value:
     *   - For type='schedule': Cron expression (e.g., '0 * * * *' for hourly)
     *   - For type='once': Date object for when to run
     *   - For type='now': Not needed
     * 
     * @example
     * // Run every day at midnight
     * getSchedule() {
     *     return {
     *         type: 'schedule',
     *         value: '0 0 * * *'
     *     };
     * }
     * 
     * @example
     * // Run once at a specific time
     * getSchedule() {
     *     return {
     *         type: 'once',
     *         value: new Date('2024-01-01T00:00:00Z')
     *     };
     * }
     * 
     * @example
     * // Run immediately
     * getSchedule() {
     *     return {
     *         type: 'now'
     *     };
     * }
     * 
     * @abstract
     * @throws {Error} If the method is not overridden
     */
    getSchedule() {
        throw new Error('getSchedule must be overridden');
    }

    /**
     * Internal method to run the job and handle both Promise and callback patterns.
     * @param {Db} db The database connection
     * @param {Object} job The job instance
     * @param {Function} done Callback to be called when job completes
     * @returns {Promise<void>} A promise that resolves once the job is completed
     * @private
     */
    async _run(db, job, done) {
        this.logger.d(`Job "${this.jobName}" is starting with database:`, db?._cly_debug?.db);

        try {
            const result = await new Promise((resolve, reject) => {
                try {
                    const runResult = this.run(
                        db,
                        (error, callbackResult) => {
                            if (error) {
                                reject(error);
                            }
                            else {
                                resolve(callbackResult);
                            }
                        },
                        this.reportProgress.bind(this)
                    );

                    if (runResult instanceof Promise) {
                        runResult.then(resolve).catch(reject);
                    }
                    else if (runResult !== undefined) {
                        resolve(runResult);
                    }
                }
                catch (error) {
                    reject(error);
                }
            });

            this.logger.i(`Job "${this.jobName}" completed successfully:`, result || '');
            done(null, result);
        }
        catch (error) {
            this.logger.e(`Job "${this.jobName}" encountered an error during execution:`, error);
            done(error);
        }
    }

    /**
     * Sets the touch method (called internally by job runner)
     * @param {Function} touchMethod The touch method from Pulse
     * @public
     */
    setTouchMethod(touchMethod) {
        this.#touchMethod = touchMethod;
    }

    /**
     * Sets the progress method from the runner
     * @param {Function} progressMethod Method to update progress
     * @public
     */
    setProgressMethod(progressMethod) {
        this.#progressMethod = progressMethod;
    }

    /**
     * Reports progress for long-running jobs
     * @param {number} [total] Total number of stages
     * @param {number} [current] Current stage number
     * @param {string} [bookmark] Bookmark string for current stage
     */
    async reportProgress(total, current, bookmark) {
        // Calculate progress percentage
        const progress = total && current ? Math.min(100, Math.floor((current / total) * 100)) : undefined;

        // Build progress data
        const progressData = {
            total,
            current,
            bookmark,
            percent: progress,
            timestamp: new Date()
        };

        // Update progress using runner's method if available
        if (this.#progressMethod) {
            await this.#progressMethod(progressData);
        }

        // Touch to prevent lock expiration
        if (this.#touchMethod) {
            await this.#touchMethod();
        }

        this.logger?.d(`Progress reported for job "${this.jobName}":`, progressData);
    }

    /**
     * Get job retry configuration
     * @typedef {Object} RetryConfig
     * @property {boolean} enabled - Whether retries are enabled
     * @property {number} attempts - Number of retry attempts
     * @property {number} delay - Delay between retry attempts in milliseconds, delay is by default exponentially increasing after each attempt
     * @returns {RetryConfig|null} Retry configuration or null for default
     */
    getRetryConfig() {
        return {
            enabled: true,
            attempts: 3,
            delay: 2000 // 2 seconds
        };
    }

    /**
     * Get job priority
     * @returns {string} Priority level from JOB_PRIORITIES
     */
    getPriority() {
        return this.priorities.NORMAL;
    }

    /**
     * Get job concurrency
     * @returns {number|null} Maximum concurrent instances or null for default
     */
    getConcurrency() {
        return 1;
    }

    /**
     * Get job lock lifetime in milliseconds
     * @returns {number|null} Lock lifetime or null for default
     */
    getLockLifetime() {
        return 55 * 60 * 1000; // 55 minutes
    }
}

module.exports = Job;