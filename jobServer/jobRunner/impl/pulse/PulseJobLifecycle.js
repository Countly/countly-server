const IJobLifecycle = require('../../interfaces/IJobLifecycle');

/**
 * @typedef {import('../../interfaces/IJobLifecycle')} IJobLifecycle
 * @typedef {import('../PulseRunner')} PulseRunner
 * @typedef {import('../JobExecutor')} JobExecutor
 * @typedef {import('../JobScheduler')} JobScheduler
 */

/**
 * @typedef {Object} ScheduleConfig
 * @property {string} cron - The cron expression for job scheduling
 * @property {Object} [options] - Additional scheduling options
 * @property {boolean} [options.immediate] - Whether to run the job immediately
 * @property {string} [options.timezone] - Timezone for the cron schedule
 * @property {number} [options.retryAttempts] - Number of retry attempts on failure
 */

/**
 * @typedef {Object} JobClass
 * @property {string} name - The name of the job class
 * @property {Function} execute - The main execution method
 * @property {Object} [config] - Optional job configuration
 */

/**
 * Pulse implementation of job lifecycle management.
 * Handles the initialization, scheduling, and cleanup of jobs in the Pulse system.
 * 
 * @implements {IJobLifecycle}
 */
class PulseJobLifecycle extends IJobLifecycle {
    /**
     * Creates a new PulseJobLifecycle instance
     * @param {Object} pulseRunner The Pulse runner instance
     * @param {Object} executor Job executor instance
     * @param {Object} scheduler Job scheduler instance
     * @param {Object} logger Logger instance
     */
    constructor(pulseRunner, executor, scheduler, logger) {
        super();
        this.pulseRunner = pulseRunner;
        this.executor = executor;
        this.scheduler = scheduler;
        this.log = logger;
    }

    /**
     * Initializes and starts the job runner, then schedules all pending jobs.
     * This method performs the following steps:
     * 1. Validates the pulse runner initialization
     * 2. Starts the pulse runner instance
     * 3. Schedules all pending jobs from the executor
     * 
     * @param {Object.<string, JobClass>} jobClasses - Map of job names to their implementing classes
     * @returns {Promise<void>} Resolves when the runner is started and all jobs are scheduled
     * @throws {Error} If pulse runner is not initialized or scheduling fails
     */
    async start(/* jobClasses */) {
        if (!this.pulseRunner) {
            this.log.e('Lifecycle start failed: Pulse runner not initialized', {
                component: 'PulseJobLifecycle',
                method: 'start'
            });
            throw new Error('Pulse runner not initialized');
        }

        try {
            await this.pulseRunner.start();
            this.log.i('Pulse runner initialization complete', {
                component: 'PulseJobLifecycle',
                status: 'started'
            });

            const pendingJobCount = this.executor.pendingSchedules.size;
            this.log.i('Beginning job schedule processing', {
                component: 'PulseJobLifecycle',
                pendingJobs: pendingJobCount
            });

            // Schedule all pending jobs from the executor
            for (const [jobName, scheduleConfig] of this.executor.pendingSchedules) {
                try {
                    await this.scheduler.schedule(jobName, scheduleConfig);
                    this.log.d('Job scheduled successfully', {
                        component: 'PulseJobLifecycle',
                        job: jobName,
                        config: scheduleConfig
                    });
                }
                catch (error) {
                    this.log.e('Job scheduling failed', {
                        component: 'PulseJobLifecycle',
                        job: jobName,
                        error: error.message,
                        stack: error.stack
                    });
                }
            }

            this.executor.pendingSchedules.clear();
            this.log.i('Job scheduling process complete', {
                component: 'PulseJobLifecycle',
                totalProcessed: pendingJobCount
            });
        }
        catch (error) {
            this.log.e('Pulse runner start failed', {
                component: 'PulseJobLifecycle',
                error: error.message,
                stack: error.stack
            });
            throw error;
        }
    }

    /**
     * Gracefully shuts down the job runner and cleans up resources.
     * Ensures all running jobs are properly terminated and resources are released.
     * 
     * @returns {Promise<void>} Resolves when the runner is successfully closed
     * @throws {Error} If the shutdown process fails
     */
    async close() {
        try {
            await this.pulseRunner.close();
            this.log.i('Pulse runner shutdown complete', {
                component: 'PulseJobLifecycle',
                status: 'closed'
            });
        }
        catch (error) {
            this.log.e('Pulse runner shutdown failed', {
                component: 'PulseJobLifecycle',
                error: error.message,
                stack: error.stack
            });
            throw error;
        }
    }
}

module.exports = PulseJobLifecycle;