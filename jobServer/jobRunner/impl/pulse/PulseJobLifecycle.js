const IJobLifecycle = require('../../interfaces/IJobLifecycle');

/**
 * Pulse implementation of job lifecycle management
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
     * Starts the job runner and schedules pending jobs
     * @param {Object.<string, Function>} jobClasses Job classes to register
     * @returns {Promise<void>} A promise that resolves once the runner is started
     */
    async start(/* jobClasses */) {
        if (!this.pulseRunner) {
            throw new Error('Pulse runner not initialized');
        }

        await this.pulseRunner.start();
        this.log.i('Pulse runner started');

        // Schedule all pending jobs from the executor
        for (const [jobName, scheduleConfig] of this.executor.pendingSchedules) {
            try {
                await this.scheduler.schedule(jobName, scheduleConfig);
            }
            catch (error) {
                this.log.e(`Failed to schedule job ${jobName}:`, error);
            }
        }

        this.executor.pendingSchedules.clear();
    }

    /**
     * Closes the job runner and cleans up resources
     * @returns {Promise<void>} A promise that resolves once the runner is closed
     */
    async close() {
        try {
            await this.pulseRunner.close();
            this.log.i('Pulse runner closed');
        }
        catch (error) {
            this.log.e('Error closing Pulse runner:', error);
            throw error;
        }
    }
}

module.exports = PulseJobLifecycle;