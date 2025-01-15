/**
 * Interface for job scheduling operations
 */
class IJobScheduler {
    /**
     * Schedules a job based on its configuration
     * @param {String} name The name of the job
     * @param {Object} scheduleConfig Schedule configuration object
     * @param {('once'|'schedule'|'now')} scheduleConfig.type Type of schedule
     * @param {string|Date} [scheduleConfig.value] Cron string or Date object
     * @param {Object} [data] Data to pass to the job
     */
    async schedule(/* name, scheduleConfig, data */) {
        throw new Error('Method not implemented');
    }

    /**
     * Update job schedule
     * @param {string} jobName Name of the job
     * @param {string|Date} schedule New schedule (cron string or date)
     */
    async updateSchedule(/* jobName, schedule */) {
        throw new Error('Method not implemented');
    }

    /**
     * Runs a job now
     * @param {string} jobName Name of the job to run
     */
    async runJobNow(/* jobName */) {
        throw new Error('Method not implemented');
    }
}

module.exports = IJobScheduler;