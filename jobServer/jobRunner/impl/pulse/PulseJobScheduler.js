const IJobScheduler = require('../../interfaces/IJobScheduler');
const {isValidCron} = require('cron-validator');

/**
 * Pulse implementation of job scheduler
 */
class PulseJobScheduler extends IJobScheduler {
    /**
     * Creates a new PulseJobScheduler instance
     * @param {Object} pulseRunner The Pulse runner instance
     * @param {Object} logger Logger instance
     */
    constructor(pulseRunner, logger) {
        super();
        this.pulseRunner = pulseRunner;
        this.log = logger;
    }

    /**
     * Validates schedule configuration
     * @private
     * @param {Object} config Schedule configuration
     * @throws {Error} If configuration is invalid
     */
    #validateScheduleConfig(config) {
        if (!config || typeof config !== 'object') {
            throw new Error('Schedule configuration must be an object');
        }

        if (!config.type) {
            throw new Error('Schedule type is required');
        }

        const validTypes = ['schedule', 'once', 'now'];
        if (!validTypes.includes(config.type)) {
            throw new Error(`Invalid schedule type: ${config.type}`);
        }

        if (config.type !== 'now' && !config.value) {
            throw new Error('Schedule value is required');
        }
    }

    /**
     * Schedules a job to run
     * @param {string} name Job name
     * @param {Object} scheduleConfig Schedule configuration
     * @param {Object} [data] Optional data to pass to the job
     * @returns {Promise<void>} A promise that resolves once the job is scheduled
     */
    async schedule(name, scheduleConfig, data = {}) {
        try {
            this.#validateScheduleConfig(scheduleConfig);

            switch (scheduleConfig.type) {
            case 'schedule':
                if (!isValidCron(scheduleConfig.value)) {
                    throw new Error('Invalid cron schedule');
                }
                await this.pulseRunner.every(scheduleConfig.value, name, data);
                break;

            case 'once':
                if (!(scheduleConfig.value instanceof Date)) {
                    throw new Error('Invalid date for one-time schedule');
                }
                await this.pulseRunner.schedule(scheduleConfig.value, name, data);
                break;

            case 'now':
                await this.pulseRunner.now(name, data);
                break;
            }

            this.log.d(`Job ${name} scheduled successfully with type: ${scheduleConfig.type}`);
        }
        catch (error) {
            this.log.e(`Failed to schedule job ${name}:`, error);
            throw error;
        }
    }

    /**
     * Updates a job's schedule
     * @param {string} jobName Name of the job
     * @param {Object} schedule New schedule configuration
     * @returns {Promise<void>} A promise that resolves once the schedule is updated
     */
    async updateSchedule(jobName, schedule) {
        try {
            this.#validateScheduleConfig(schedule);

            // First remove the existing job
            await this.pulseRunner.remove({ name: jobName });

            // Then create a new schedule based on the type
            switch (schedule.type) {
            case 'schedule':
                if (!isValidCron(schedule.value)) {
                    throw new Error('Invalid cron schedule');
                }
                await this.pulseRunner.every(schedule.value, jobName);
                break;

            case 'once':
                if (!(schedule.value instanceof Date)) {
                    throw new Error('Invalid date for one-time schedule');
                }
                await this.pulseRunner.schedule(schedule.value, jobName);
                break;

            case 'now':
                await this.pulseRunner.now(jobName);
                break;
            }

            this.log.i(`Schedule updated for job ${jobName}`);
        }
        catch (error) {
            this.log.e(`Failed to update schedule for job ${jobName}:`, error);
            throw error;
        }
    }

    /**
     * Runs a job immediately
     * @param {string} jobName Name of the job
     * @returns {Promise<void>} A promise that resolves when the job is triggered
     */
    async runJobNow(jobName) {
        try {
            await this.pulseRunner.now({ name: jobName });
            this.log.i(`Job ${jobName} triggered for immediate execution`);
        }
        catch (error) {
            this.log.e(`Failed to run job ${jobName} immediately:`, error);
            throw error;
        }
    }
}

module.exports = PulseJobScheduler;