const IJobScheduler = require('../../interfaces/IJobScheduler');
const {isValidCron} = require('cron-validator');

/**
 * @typedef {import('../../interfaces/IJobScheduler')} IJobScheduler
 * @typedef {import('@pulse/runner')} PulseRunner
 * @typedef {import('@logger/interface')} Logger
 * 
 * @typedef {Object} ScheduleConfig
 * @property {'schedule'|'once'|'now'|'manual'} type - Type of schedule
 * @property {string|Date} [value] - Cron expression for 'schedule' type or Date for 'once' type
 */

/**
 * Pulse implementation of job scheduler
 * Handles scheduling, updating, and immediate execution of jobs using Pulse runner
 * @implements {IJobScheduler}
 */
class PulseJobScheduler extends IJobScheduler {
    /**
     * Creates a new PulseJobScheduler instance
     * @param {PulseRunner} pulseRunner - The Pulse runner instance for job scheduling
     * @param {Logger} logger - Logger instance for operational logging
     */
    constructor(pulseRunner, logger) {
        super();
        this.pulseRunner = pulseRunner;
        this.log = logger;
    }

    /**
     * Validates schedule configuration structure and values
     * @private
     * @param {ScheduleConfig} config - Schedule configuration to validate
     * @throws {Error} If configuration is invalid or missing required fields
     */
    #validateScheduleConfig(config) {
        if (!config || typeof config !== 'object') {
            throw new Error('Schedule configuration must be an object');
        }

        if (!config.type) {
            throw new Error('Schedule type is required');
        }

        const validTypes = ['schedule', 'once', 'now', 'manual'];
        if (!validTypes.includes(config.type)) {
            throw new Error(`Invalid schedule type: ${config.type}`);
        }

        if (config.type !== 'now' && config.type !== 'manual' && !config.value) {
            throw new Error('Schedule value is required');
        }
    }

    /**
     * Schedules a job to run based on provided configuration
     * @param {string} name - Unique identifier for the job
     * @param {ScheduleConfig} scheduleConfig - Configuration defining when the job should run
     * @param {Object} [data={}] - Optional payload to pass to the job during execution
     * @returns {Promise<void>} Resolves when job is successfully scheduled
     * @throws {Error} If scheduling fails or configuration is invalid
     */
    async schedule(name, scheduleConfig, data = {}) {
        try {
            this.#validateScheduleConfig(scheduleConfig);
            this.log.d(`Attempting to schedule job '${name}' with type: ${scheduleConfig.type}`, {
                scheduleConfig,
                data
            });

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

            case 'now': {
                const now = new Date();
                await this.pulseRunner.schedule(now, name, data);
                break;
            }
            case 'manual':
                // For manual jobs, do not automatically schedule them.
                // They should only run when explicitly triggered.
                this.log.d(`Job '${name}' is set to manual; not scheduling automatically.`);
                break;
            }

            this.log.i(`Successfully scheduled job '${name}'`, {
                type: scheduleConfig.type,
                value: scheduleConfig.value,
                hasData: Object.keys(data).length > 0
            });
        }
        catch (error) {
            this.log.e(`Failed to schedule job '${name}'`, {
                error: error.message,
                scheduleConfig,
                stack: error.stack
            });
            throw error;
        }
    }

    /**
     * Updates an existing job's schedule with new configuration
     * @param {string} jobName - Name of the job to update
     * @param {ScheduleConfig} schedule - New schedule configuration
     * @returns {Promise<void>} Resolves when schedule is successfully updated
     * @throws {Error} If update fails or new configuration is invalid
     */
    async updateSchedule(jobName, schedule) {
        try {
            this.log.d(`Attempting to update schedule for job '${jobName}'`, { schedule });

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

            case 'now': {
                const now = new Date();
                await this.pulseRunner.schedule(now, jobName);
                break;
            }
            case 'manual':
                // For manual jobs, we remove any existing schedule. They should be triggered manually.
                this.log.d(`Job '${jobName}' updated to manual schedule; not rescheduling automatically.`);
                break;
            }

            this.log.i(`Successfully updated schedule for job '${jobName}'`, {
                type: schedule.type,
                value: schedule.value
            });
        }
        catch (error) {
            this.log.e(`Failed to update schedule for job '${jobName}'`, {
                error: error.message,
                schedule,
                stack: error.stack
            });
            throw error;
        }
    }

    /**
     * Triggers immediate execution of a job
     * @param {string} jobName - Name of the job to execute
     * @returns {Promise<void>} Resolves when job is successfully triggered
     * @throws {Error} If immediate execution fails
     * @note Implement data passing if needed
     */
    async runJobNow(jobName) {
        try {
            this.log.d(`Attempting to trigger immediate execution of job '${jobName}'`);
            await this.pulseRunner.now(jobName, {});
            this.log.i(`Successfully triggered immediate execution of job '${jobName}'`);
        }
        catch (error) {
            this.log.e(`Failed to trigger immediate execution of job '${jobName}'`, {
                error: error.message,
                stack: error.stack
            });
            throw error;
        }
    }
}

module.exports = PulseJobScheduler;