const job = require("../../jobServer");

/**
 * Example job implementation demonstrating all features of the job system.
 * This job processes user records in batches, demonstrating:
 * - Progress reporting
 * - Error handling
 * - Different schedule types
 * - Database operations
 * - Proper logging
 * 
 * @extends {job.Job}
 */
class ExampleJob extends job.Job {
    /**
     * Get the schedule configuration for the job.
     * Demonstrates all possible schedule types.
     * 
     * @returns {Object} Schedule configuration object
     */
    getSchedule() {
        // Example 1: Run every day at midnight
        return {
            type: 'schedule',
            value: '0 0 * * *'
        };

        // Example 2: Run once at a specific future date
        // return {
        //     type: 'once',
        //     value: new Date('2024-12-31T23:59:59Z')
        // };

        // Example 3: Run immediately
        // return {
        //     type: 'now'
        // };
    }

    /**
     * Simulates some processing work
     * @private
     * @param {number} ms Time to wait in milliseconds
     */
    async #simulateWork(ms) {
        await new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Main job execution method.
     * Demonstrates:
     * - Progress reporting
     * - Synthetic delays to simulate work
     * - Error handling
     * - Logging
     * 
     * @param {Object} db Database connection
     * @param {Function} done Callback to signal job completion
     * @param {Function} progress Progress reporting function
     */
    async run(db, done, progress) {
        try {
            this.logger.d("Starting example job execution");

            // Simulate total items to process
            const total = 100;
            let processed = 0;

            // Process in batches of 10
            for (let i = 0; i < total; i += 10) {
                // Simulate batch processing (2 second per batch)
                await this.#simulateWork(2000);
                processed += 10;

                // Report progress
                await progress(
                    total,
                    processed,
                    `Processing batch ${(i / 10) + 1}/10`
                );

                this.logger.d(`Completed batch ${(i / 10) + 1}/10`);

                // Simulate random error (10% chance)
                if (Math.random() < 0.1) {
                    throw new Error('Random batch processing error');
                }
            }

            // Simulate final processing
            await this.#simulateWork(1000);

            // Job completion
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