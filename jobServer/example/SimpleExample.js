const job = require("../../jobServer");

/**
 * Simple example job with only required methods.
 * @extends {job.Job}
 */
class SimpleExample extends job.Job {
    /**
     * Get the schedule configuration for the job.
     * @required
     * @returns {Object} Schedule configuration object
     */
    getSchedule() {
        return {
            type: 'schedule',
            value: '0 0 * * *' // Runs daily at midnight
        };
    }

    /**
     * Main job execution method.
     * @required
     * @param {Db} db Database connection
     * @param {Function} done Callback to signal job completion
     * @param {Function} progress Progress reporting function
     */
    async run(db, done, progress) {
        try {
            this.logger.i("Starting simple job");

            // Your job logic here
            await progress(1, 1, "Task completed");

            done(null, { success: true });
        }
        catch (error) {
            this.logger.e("Job failed:", error);
            done(error);
        }
    }
}

module.exports = SimpleExample;