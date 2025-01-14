const IJobRunner = require('./IJobRunner');
// const JobRunnerBullImpl = require('./JobRunnerBullImpl');
const JobRunnerPulseImpl = require('./JobRunnerPulseImpl');

/**
 * JobRunner implementation types
 * @enum {string}
 */
const RUNNER_TYPES = {
    // BULL: 'bull',
    PULSE: 'pulse'
};

/**
 * Job Runner factory
 * 
 * @param {Object} db The database connection
 * @param {string} [type='pulse'] The type of runner to create ('bull' or 'pulse')
 * @param {Object} [config={}] Configuration specific to the runner implementation
 * @param {function} Logger - Logger constructor
 * @returns {IJobRunner} An instance of the specified JobRunner implementation
 * @throws {Error} If an invalid runner type is specified
 */
function createJobRunner(db, type = RUNNER_TYPES.PULSE, config = {}, Logger) {

    switch (type.toLowerCase()) {
    // case RUNNER_TYPES.BULL:
    //     return new JobRunnerBullImpl(db, config, Logger);
    case RUNNER_TYPES.PULSE:
        return new JobRunnerPulseImpl(db, config, Logger);
    default:
        throw new Error(`Invalid runner type: ${type}. Must be one of: ${Object.values(RUNNER_TYPES).join(', ')} and implementation of ` + IJobRunner.name);
    }
}

module.exports = {
    createJobRunner,
    RUNNER_TYPES
};