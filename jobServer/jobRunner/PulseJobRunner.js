const { Pulse } = require('@pulsecron/pulse');
const BaseJobRunner = require('./BaseJobRunner');
const PulseJobScheduler = require('./impl/pulse/PulseJobScheduler');
const PulseJobExecutor = require('./impl/pulse/PulseJobExecutor');
const PulseJobLifecycle = require('./impl/pulse/PulseJobLifecycle');

/**
 * @typedef {import('@pulsecron/pulse').Pulse} PulseInstance
 * @typedef {import('./BaseJobRunner')} BaseJobRunner
 * @typedef {import('./impl/pulse/PulseJobScheduler')} PulseJobScheduler
 * @typedef {import('./impl/pulse/PulseJobExecutor')} PulseJobExecutor
 * @typedef {import('./impl/pulse/PulseJobLifecycle')} PulseJobLifecycle
 * @typedef {import('mongodb').Db} Mongodb
 */

/**
 * Pulse-specific implementation of the job runner using BaseJobRunner composition.
 * This class provides a concrete implementation of job running capabilities using
 * the Pulse framework for scheduling and executing jobs.
 * 
 * @extends {BaseJobRunner}
 */
class PulseJobRunner extends BaseJobRunner {
    /**
     * @type {PulseInstance}
     * @private
     */
    #pulseRunner;

    /**
     * @type {Logger}
     * @private
     */
    log;

    /**
     * Creates a new Pulse job runner with all required implementations
     * 
     * @param {Mongodb} db - MongoDB database connection
     * @param {Object} config - Configuration object for Pulse
     * @param {string} [config.name] - Name of the Pulse instance
     * @param {Object} [config.options] - Additional Pulse configuration options
     * @param {function} Logger - Logger constructor function
     * @throws {Error} If required dependencies are not provided
     */
    constructor(db, config, Logger) {
        const log = Logger('jobs:runner:pulse');
        log.d('Initializing PulseJobRunner');

        if (!db || !config) {
            log.e('Missing required dependencies');
            throw new Error('Missing required dependencies for PulseJobRunner');
        }

        // Create the Pulse instance that will be shared across implementations
        const pulseRunner = new Pulse({
            ...config,
            mongo: db,
        });
        log.i('Created Pulse instance', { config: { ...config, mongo: '[Connection]' } });

        // Create implementations with shared pulseRunner instance
        const scheduler = new PulseJobScheduler(pulseRunner, log);
        const executor = new PulseJobExecutor(pulseRunner, db, log);
        const lifecycle = new PulseJobLifecycle(pulseRunner, executor, scheduler, log);

        // Initialize base class with implementations
        super(scheduler, executor, lifecycle);

        this.log = log;
        this.#pulseRunner = pulseRunner;

        log.i('PulseJobRunner initialized successfully');
    }
}

module.exports = PulseJobRunner;