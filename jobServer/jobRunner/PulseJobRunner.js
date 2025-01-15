const { Pulse } = require('@pulsecron/pulse');
const BaseJobRunner = require('./BaseJobRunner');
const PulseJobScheduler = require('./impl/pulse/PulseJobScheduler');
const PulseJobExecutor = require('./impl/pulse/PulseJobExecutor');
const PulseJobLifecycle = require('./impl/pulse/PulseJobLifecycle');

/**
 * Pulse-specific implementation of the job runner using BaseJobRunner composition
 */
class PulseJobRunner extends BaseJobRunner {
    /**
     * Creates a new Pulse job runner with all required implementations
     * @param {Object} db Database connection
     * @param {Object} config Configuration object
     * @param {function} Logger - Logger constructor
     */
    constructor(db, config, Logger) {
        const log = Logger('jobs:runner:pulse');

        // Create the Pulse instance that will be shared across implementations
        const pulseRunner = new Pulse({
            ...config,
            mongo: db,
        });

        // Create implementations with shared pulseRunner instance
        const scheduler = new PulseJobScheduler(pulseRunner, log);
        const executor = new PulseJobExecutor(pulseRunner, db, log);
        const lifecycle = new PulseJobLifecycle(pulseRunner, executor, scheduler, log);

        // Initialize base class with implementations
        super(scheduler, executor, lifecycle);

        this.log = log;
        this.pulseRunner = pulseRunner;
    }
}

module.exports = PulseJobRunner;