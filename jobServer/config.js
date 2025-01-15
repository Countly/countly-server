/**
 * Default configuration for Pulse jobs
 * @typedef {Object} PulseConfig
 * @property {string} [name] - Name of the Pulse instance for identification
 * @property {string} processEvery - Frequency to check for new jobs (e.g., '3 seconds', '1 minute')
 * @property {number} maxConcurrency - Maximum number of jobs that can run concurrently across all job types
 * @property {number} defaultConcurrency - Default concurrent jobs limit for each job type
 * @property {number} lockLimit - Maximum number of jobs that can be locked globally
 * @property {number} defaultLockLimit - Default lock limit for each job type
 * @property {number} defaultLockLifetime - Time in milliseconds before a job's lock expires
 * @property {{nextRunAt: 1|-1, priority: 1|-1}} sort - Job execution sorting criteria
 * @property {boolean} disableAutoIndex - Whether to disable automatic MongoDB index creation
 * @property {boolean} resumeOnRestart - Whether to resume pending jobs on service restart
 * @property {Object} db - Database configuration options
 * @property {string} db.collection - MongoDB collection name for storing jobs
 */
const DEFAULT_PULSE_CONFIG = {
    processEvery: '3 seconds',
    maxConcurrency: 1,
    defaultConcurrency: 1,
    lockLimit: 1,
    defaultLockLimit: 1,
    defaultLockLifetime: 55 * 60 * 1000, // 55 minutes
    sort: { nextRunAt: 1, priority: -1 },
    disableAutoIndex: false,
    resumeOnRestart: true,
    db: {
        collection: 'pulseJobs',
    }
};

module.exports = {
    PULSE: DEFAULT_PULSE_CONFIG,
    BULL: {}
};