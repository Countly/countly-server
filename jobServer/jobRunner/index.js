const PulseJobRunner = require('./PulseJobRunner.js');

/**
 * JobRunner implementation types
 * @enum {string}
 */
const RUNNER_TYPES = {
    PULSE: 'pulse'
};

/**
 * Job Runner factory
 * 
 * @param {Object} db The database connection
 * @param {string} [type='pulse'] The type of runner to create
 * @param {Object} [config={}] Configuration specific to the runner implementation
 * @param {function} Logger - Logger constructor
 * @returns {BaseJobRunner} An instance of BaseJobRunner with specific implementation
 * @throws {Error} If an invalid runner type is specified
 */
function createJobRunner(db, type = RUNNER_TYPES.PULSE, config = {}, Logger) {
    switch (type.toLowerCase()) {
    case RUNNER_TYPES.PULSE:
        return new PulseJobRunner(db, config, Logger);
    default:
        throw new Error(`Invalid runner type: ${type}. Must be one of: ${Object.values(RUNNER_TYPES).join(', ')}`);
    }
}

module.exports = {
    createJobRunner,
    RUNNER_TYPES
};