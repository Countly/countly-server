/**
 * Default configuration for Pulse jobs
 * @type {import('@pulsecron/pulse').PulseConfig}
 */
const DEFAULT_PULSE_CONFIG = {
    // name: 'core', // Name of the Pulse instance
    processEvery: '3 seconds', // Frequency to check for new jobs
    maxConcurrency: 1, // Maximum number of jobs that can run concurrently
    defaultConcurrency: 1, // Default number of jobs that can run concurrently
    lockLimit: 1, // Maximum number of jobs that can be locked at the same time
    defaultLockLimit: 1, // Default number of jobs that can be locked at the same time
    defaultLockLifetime: 55 * 60 * 1000, // 55 minutes, time in milliseconds for how long a job should be locked
    sort: { nextRunAt: 1, priority: -1 }, // Sorting order for job execution
    disableAutoIndex: false, // Whether to disable automatic index creation
    resumeOnRestart: true, // Whether to resume jobs on restart
    db: {
        collection: 'pulseJobs', // MongoDB collection to store jobs
    }
};

module.exports = {
    PULSE: DEFAULT_PULSE_CONFIG,
    BULL: {}
};