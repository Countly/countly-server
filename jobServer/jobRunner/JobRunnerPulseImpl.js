const IJobRunner = require('./IJobRunner');
const { Pulse, JobPriority } = require('@pulsecron/pulse');
const {isValidCron} = require('cron-validator');

/**
 * Pulse implementation of the job runner
 */
class JobRunnerPulseImpl extends IJobRunner {
    /**
     * The Pulse runner instance
     * @type {import('@pulsecron/pulse').Pulse}
     */
    #pulseRunner;

    /**
     * Creates a new Pulse job runner
     * @param {Object} db Database connection
     * @param {Object} config Configuration object
     * @param {function} Logger - Logger constructor
     */
    constructor(db, config, Logger) {
        super(db, config, Logger);
        this.log = Logger('jobs:runner:pulse');
        this.#pulseRunner = new Pulse({
            ...config,
            mongo: this.db,
        });

        // Monitor for progress
        this.#pulseRunner.on('touch', (job) => {
            console.debug(`PULSE_EVENT_LISTENER: Lock extended for job ${job?.attrs?.name}`);
        });

        // Monitor for failures
        // this.#pulseRunner.on('fail', (err, job) => {
        //     console.error(`PULSE_EVENT_LISTENER: Job ${job?.attrs?.name} failed:`, err);
        // });

        // Monitor for stalled jobs
        this.#pulseRunner.on('stalled', (job) => {
            console.warn(`PULSE_EVENT_LISTENER: Job ${job?.attrs?.name} has stalled`);
        });
    }

    /**
     * Starts the Pulse runner
     */
    async start() {
        if (!this.#pulseRunner) {
            throw new Error('Pulse runner not initialized');
        }
        await this.#pulseRunner.start();
    }

    /**
     * Creates a new job with the given class
     * @param {string} jobName The name of the job
     * @param {Function} JobClass The job class to create
     * @returns {Promise<void>} A promise that resolves once the job is created
     */
    async createJob(jobName, JobClass) {
        const instance = new JobClass(jobName);
        // instance.setLogger(this.log);
        instance.setJobName(jobName);
        // const schedule = instance.schedule();

        this.#pulseRunner.define(
            jobName,
            instance._run.bind(instance, this.db),
            {
                priority: JobPriority.normal,
                concurrency: 1,
                lockLifetime: 10000,
                shouldSaveResult: true,
                attempts: 3,
                backoff: {
                    type: 'exponential',
                    delay: 2000
                }
            }
        );
        //
        // const job = new PulseJob(
        //     {
        //         name: jobName,
        //         pulse: this.#pulseRunner,
        //     }
        // );
        //
        // job.unique({'name': jobName});
        //
        // job.repeatEvery(
        //     schedule,
        //     {
        //         timezone: 'Asia/Kolkata',
        //     }
        // );
        //
        // job.setShouldSaveResult(true);
        // await job.save();
    }


    /**
     * Schedules jobs
     * @param {String} name The name of the job
     * @param {String} schedule Cron string for the job schedule
     * @param {Object} data Data to pass to the job
     * @returns {Promise<void>} A promise that resolves once the job is scheduled
     */
    async schedule(name, schedule, data) {
        if (!isValidCron(schedule)) {
            throw new Error('Invalid cron schedule');
        }
        await this.#pulseRunner.every(schedule, name, data);
    }

    /**
     * Closes the Pulse runner
     * @returns {Promise<void>} A promise that resolves once the runner is closed
     */
    async close() {
        if (this.#pulseRunner) {
            await this.#pulseRunner.close();
            this.#pulseRunner = null;
        }
    }
}

module.exports = JobRunnerPulseImpl;