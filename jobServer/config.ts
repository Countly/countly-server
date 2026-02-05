/**
 * Configuration for job runners
 * @module jobServer/config
 */

/**
 * Database configuration options
 */
interface PulseDbConfig {
    /** MongoDB collection name for storing jobs */
    collection: string;
}

/**
 * Sort configuration for job execution
 */
interface PulseSortConfig {
    /** Sort by next run time (1 = ascending, -1 = descending) */
    nextRunAt?: 1 | -1;
    /** Sort by priority (1 = ascending, -1 = descending) */
    priority?: 1 | -1;
}

/**
 * Pulse job runner configuration
 */
interface PulseConfig {
    /** Name of the Pulse instance for identification */
    name?: string;
    /** Frequency to check for new jobs (e.g., '3 seconds', '1 minute') */
    processEvery: string;
    /** Maximum number of jobs that can run concurrently across all job types */
    maxConcurrency: number;
    /** Default concurrent jobs limit for each job type */
    defaultConcurrency: number;
    /** Maximum number of jobs that can be locked globally */
    lockLimit: number;
    /** Default lock limit for each job type */
    defaultLockLimit: number;
    /** Time in milliseconds before a job's lock expires */
    defaultLockLifetime: number;
    /** Job execution sorting criteria */
    sort?: PulseSortConfig;
    /** Whether to disable automatic MongoDB index creation */
    disableAutoIndex: boolean;
    /** Whether to resume pending jobs on service restart */
    resumeOnRestart: boolean;
    /** Database configuration options */
    db: PulseDbConfig;
}

/**
 * Bull job runner configuration (placeholder for future implementation)
 */
interface BullConfig {
    [key: string]: unknown;
}

/**
 * Complete job server configuration
 */
interface JobServerConfig {
    /** Pulse job runner configuration */
    PULSE: PulseConfig;
    /** Bull job runner configuration */
    BULL: BullConfig;
}

/**
 * Default configuration for Pulse jobs
 */
const DEFAULT_PULSE_CONFIG: PulseConfig = {
    processEvery: '5 seconds',
    maxConcurrency: 1,
    defaultConcurrency: 1,
    lockLimit: 3,
    defaultLockLimit: 3,
    defaultLockLifetime: 55 * 60 * 1000, // 55 minutes
    // sort: { nextRunAt: 1, priority: -1 },
    disableAutoIndex: false,
    resumeOnRestart: true,
    db: {
        collection: 'pulseJobs',
    }
};

/**
 * Job server configuration object
 */
const config: JobServerConfig = {
    PULSE: DEFAULT_PULSE_CONFIG,
    BULL: {}
};

export { config, DEFAULT_PULSE_CONFIG };
export type { PulseConfig, PulseDbConfig, PulseSortConfig, BullConfig, JobServerConfig };
export default config;
