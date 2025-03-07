/**
 * @typedef {import('./PulseJobRunner.js').PulseJobRunner} PulseJobRunner
 * @typedef {import('./BaseJobRunner.js').BaseJobRunner} BaseJobRunner
 * @typedef {import('mongodb').Db} Mongodb
 * @typedef {import('./types/Logger').Logger} Logger
 */

/**
 * @typedef {Object} JobRunnerConfig
 * @property {number} [pollInterval=1000] - Interval between job checks in milliseconds
 * @property {number} [maxConcurrent=5] - Maximum number of concurrent jobs
 * @property {string} [queueName='default'] - Name of the job queue to process
 */

const PulseJobRunner = require('./PulseJobRunner.js');

/**
 * Available JobRunner implementation types
 * @readonly
 * @enum {string}
 */
const RUNNER_TYPES = {
    /** Pulse-based job runner implementation */
    PULSE: 'pulse'
};

/**
 * Creates a new job runner instance based on the specified type
 * 
 * @param {Mongodb} db - Mongoose database connection
 * @param {RUNNER_TYPES} [type=RUNNER_TYPES.PULSE] - The type of runner to create
 * @param {JobRunnerConfig} [config={}] - Configuration specific to the runner implementation
 * @param {Logger} Logger - Logger Constructor
 * @returns {BaseJobRunner} An instance of BaseJobRunner with specific implementation
 * @throws {Error} If an invalid runner type is specified
 * @throws {Error} If required dependencies are missing
 * 
 * @example
 * const runner = createJobRunner(db, RUNNER_TYPES.PULSE, {
 *   pollInterval: 5000,
 *   maxConcurrent: 10,
 *   queueName: 'high-priority'
 * }, logger);
 * await runner.start();
 */
function createJobRunner(db, type = RUNNER_TYPES.PULSE, config = {}, Logger) {
    if (!db) {
        throw new Error('Database connection is required');
    }

    const log = Logger('jobs:runner:factory');

    log.i('Creating job runner', { type, config });

    try {
        switch (type.toLowerCase()) {
        case RUNNER_TYPES.PULSE:
            return new PulseJobRunner(db, config, Logger);
        default:
            throw new Error(`Invalid runner type: ${type}. Must be one of: ${Object.values(RUNNER_TYPES).join(', ')}`);
        }
    }
    catch (error) {
        log.e('Failed to create job runner', { type, config, error });
        throw error;
    }
}

module.exports = {
    createJobRunner,
    RUNNER_TYPES
};