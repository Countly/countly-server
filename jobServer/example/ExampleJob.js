const job = require("../../jobServer");

/**
 * Example job implementation demonstrating all features of the job system.
 * 
 * Required methods:
 * - getSchedule()
 * - run()
 * 
 * Optional methods with defaults:
 * - getRetryConfig() - Default: { enabled: true, attempts: 3, delay: 2000 }
 * - getPriority() - Default: NORMAL
 * - getConcurrency() - Default: 1
 * - getLockLifetime() - Default: 55 minutes
 * 
 * @extends {job.Job}
 */
class ExampleJob extends job.Job {

    /**
     * Get the schedule configuration for the job.
     * @required
     * 
     * @returns {Object} Schedule configuration object
     * @property {('once'|'schedule'|'now')} type - Type of schedule
     * @property {string|Date} [value] - Schedule value (cron expression or Date)
     * 
     * @example
     * // Run every day at midnight
     * return {
     *     type: 'schedule',
     *     value: '0 0 * * *'
     * }
     * 
     * @example
     * // Run once at a specific future date
     * return {
     *     type: 'once',
     *     value: new Date('2024-12-31T23:59:59Z')
     * }
     * 
     * @example
     * // Run immediately
     * return {
     *     type: 'now'
     * }
     * 
     * @example
     * // Run every 5 minutes
     * return {
     *     type: 'schedule',
     *     value: '* /5 * * * *'
     * }
     * 
     * @example
     * // Run at specific times using cron
     * return {
     *     type: 'schedule',
     *     value: '0 9,15,21 * * *'  // Runs at 9am, 3pm, and 9pm
     * }
     */
    getSchedule() {
        // Example: Run every day at midnight
        return {
            type: 'schedule',
            value: '0 0 * * *'
        };
    }

    /**
     * Configure retry behavior for failed jobs.
     * @optional
     * @default { enabled: false, attempts: 3, delay: 2000 }
     * 
     * @returns {Object} Retry configuration
     * @property {boolean} enabled - Whether retries are enabled
     * @property {number} attempts - Number of retry attempts
     * @property {number} delay - Initial delay between retries in milliseconds
     *                           (increases exponentially with each retry)
     */
    getRetryConfig() {
        return {
            enabled: true,
            attempts: 3, // Will try up to 5 times
            delay: 1000 * 60 // Start with 1-minute delay, then exponential backoff
        };
    }

    /**
     * Set job priority level.
     * Higher priority jobs are processed first.
     * @optional
     * @default "NORMAL"
     * 
     * @returns {string} Priority level (HIGH, NORMAL, LOW)
     */
    getPriority() {
        return this.priorities.HIGH;
    }

    /**
     * Set maximum concurrent instances of this job.
     * Limits how many copies of this job can run simultaneously.
     * @optional
     * @default 1
     * 
     * @returns {number} Maximum number of concurrent instances
     */
    getConcurrency() {
        return 2; // Allow 2 instances to run simultaneously
    }

    /**
     * Set job lock lifetime.
     * Determines how long a job can run before its lock expires.
     * @optional
     * @default 55 * 60 * 1000 (55 minutes)
     * 
     * @returns {number} Lock lifetime in milliseconds
     */
    getLockLifetime() {
        return 30 * 60 * 1000; // 30 minutes
    }

    /**
     * Simulates processing work with a delay
     * @private
     * @param {number} ms Time to wait in milliseconds
     * @returns {Promise<void>} Returns a promise that resolves when the delay is complete
     */
    async #simulateWork(ms) {
        await new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Main job execution method.
     * @required
     * 
     * Demonstrates:
     * - Progress reporting
     * - Synthetic delays to simulate work
     * - Error handling
     * - Logging at different levels
     * - Database operations (commented examples)
     * 
     * @param {Db} db Database connection
     * @param {Function} done Callback to signal job completion
     * @param {Function} progress Progress reporting function
     */
    async run(db, done, progress) {
        try {
            this.logger.d("Starting example job execution");

            // Example: Query total items to process
            // const total = await db.collection('users').countDocuments({ active: false });
            const total = 100; // Simulated total
            let processed = 0;

            // Process in batches of 10
            for (let i = 0; i < total; i += 10) {
                // Example: Process a batch of records
                // const batch = await db.collection('users')
                //     .find({ active: false })
                //     .skip(i)
                //     .limit(10)
                //     .toArray();

                // Simulate batch processing (2 second per batch)
                await this.#simulateWork(2000);
                processed += 10;

                // Report progress with detailed bookmark
                await progress(
                    total,
                    processed,
                    `Processing batch ${(i / 10) + 1}/10`
                );

                this.logger.d(`Completed batch ${(i / 10) + 1}/10`);

                // Example: Update processed records
                // await db.collection('users').updateMany(
                //     { _id: { $in: batch.map(doc => doc._id) } },
                //     { 
                //         $set: { 
                //             processed: true, 
                //             updatedAt: new Date() 
                //         } 
                //     }
                // );

                // Simulate random error (10% chance)
                if (Math.random() < 0.1) {
                    throw new Error('Random batch processing error');
                }
            }

            // Simulate final processing
            await this.#simulateWork(1000);

            // Job completion with result data
            const result = {
                processedCount: processed,
                totalItems: total,
                completedAt: new Date()
            };

            this.logger.i("Job completed successfully", result);
            done(null, result);
        }
        catch (error) {
            this.logger.e("Job failed:", error);
            done(error);
        }
    }
}

module.exports = ExampleJob;