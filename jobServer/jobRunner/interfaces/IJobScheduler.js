/**
 * @typedef {Object} ScheduleConfig
 * @property {'once'|'schedule'|'now'} type - Type of schedule execution
 * @property {string|Date} [value] - Cron expression (for 'schedule') or Date object (for 'once')
 */

/**
 * @typedef {Object} JobData
 * @property {*} [payload] - Custom data payload for the job
 * @property {Object} [metadata] - Additional metadata for job execution
 */

/**
 * Interface for job scheduling operations
 * Handles scheduling, updating, and immediate execution of jobs
 * @interface
 */
class IJobScheduler {
    /**
     * Schedules a job based on its configuration
     * @param {string} name - Unique identifier for the job
     * @param {ScheduleConfig} scheduleConfig - Schedule configuration
     * @param {JobData} [data] - Optional data to pass to the job
     * @throws {Error} If scheduling fails
     * @returns {Promise<void>} Resolves when scheduling is complete`
     */
    async schedule(/* name, scheduleConfig, data */) {
        throw new Error('Method not implemented');
    }

    /**
     * Update existing job schedule
     * @param {string} jobName - Name of the job to update
     * @param {string|Date} schedule - New schedule (cron expression or date)
     * @throws {Error} If job not found or update fails
     * @returns {Promise<void>} Resolves when scheduling is complete
     */
    async updateSchedule(/* jobName, schedule */) {
        throw new Error('Method not implemented');
    }

    /**
     * Executes a job immediately, bypassing its schedule
     * @param {string} jobName - Name of the job to run
     * @throws {Error} If job not found or execution fails
     * @returns {Promise<void>} Resolves when job is executed
     */
    async runJobNow(/* jobName */) {
        throw new Error('Method not implemented');
    }
}

module.exports = IJobScheduler;