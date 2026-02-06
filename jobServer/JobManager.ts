/**
 * Manages job configurations, scheduling, and lifecycle
 * @module jobServer/JobManager
 */

import type { Db, Collection } from 'mongodb';
import type { RetryConfig, ScheduleConfig, JobClassConstructor, LoggerConstructor, Logger } from './PulseJobRunner.js';
import type { PulseConfig } from './config.js';
import type { GetScheduleConfig } from './Job.js';
import type { PriorityLevel } from './constants/JobPriorities.js';

import { createRequire } from 'module';
// @ts-expect-error - import.meta is available at runtime with Node's native TypeScript support
const require = createRequire(import.meta.url);

const PulseJobRunner = require('./PulseJobRunner');
const config = require('./config');
const JobUtils = require('./JobUtils');

// ----------------------------------
// Type Definitions
// ----------------------------------

/**
 * Job configuration document stored in MongoDB
 */
interface JobConfigDocument {
    jobName: string;
    enabled?: boolean;
    runNow?: boolean;
    schedule?: string;
    retry?: RetryConfig;
    createdAt?: Date;
    updatedAt?: Date;
    checksum?: string;
    defaultConfig?: {
        schedule: GetScheduleConfig;
        retry: RetryConfig;
        priority: PriorityLevel;
        concurrency: number;
        lockLifetime: number;
    };
}

/**
 * Map of job class names to their constructors
 */
type JobClassMap = Record<string, JobClassConstructor>;

/**
 * Map of job names to their definition checksums
 */
type ChecksumMap = Record<string, string>;

/**
 * PulseJobRunner instance interface (subset used by JobManager)
 */
interface JobRunner {
    createJob(jobName: string, JobClass: JobClassConstructor): Promise<void>;
    start(): Promise<void>;
    close(): Promise<void>;
    enableJob(jobName: string): Promise<void>;
    disableJob(jobName: string): Promise<void>;
    runJobNow(jobName: string): Promise<void>;
    updateSchedule(jobName: string, schedule: ScheduleConfig): Promise<void>;
    configureRetry(jobName: string, retryConfig: RetryConfig): Promise<void>;
}

/**
 * Manages job configurations, scheduling, and lifecycle.
 * Provides functionality to:
 * - Load and initialize jobs from class definitions
 * - Track and apply configuration changes
 * - Enable/disable jobs
 * - Handle job implementation updates
 */
class JobManager {
    /** Logger factory */
    Logger: LoggerConstructor;

    #log: Logger;
    #db: Db;
    #jobRunner: JobRunner;
    #jobConfigsCollection: Collection<JobConfigDocument>;

    /**
     * Creates a new JobManager instance
     * @param db - MongoDB database connection
     * @param LoggerFn - Logger factory function
     */
    constructor(db: Db, LoggerFn: LoggerConstructor) {
        this.Logger = LoggerFn;
        this.#db = db;
        this.#log = LoggerFn('jobs:manager');
        this.#log.d('Creating JobManager');

        const pulseConfig: PulseConfig = config.PULSE;
        this.#jobRunner = new PulseJobRunner(this.#db, pulseConfig, LoggerFn) as JobRunner;
        this.#jobConfigsCollection = db.collection<JobConfigDocument>('jobConfigs');
    }

    /**
     * Loads job classes and manages their configurations
     */
    async #loadJobs(jobClasses: JobClassMap): Promise<void> {
        // Calculate checksums for all job definitions
        const jobDefinitionChecksums: ChecksumMap = Object.entries(jobClasses).reduce<ChecksumMap>((acc, [name, JobClass]) => {
            acc[name] = JobUtils.calculateJobChecksum(JobClass);
            return acc;
        }, {});

        // Initialize or update job configurations
        await this.#initializeJobConfigs(jobClasses, jobDefinitionChecksums);

        // Load and apply configurations
        await this.#applyJobConfigurations(jobClasses, jobDefinitionChecksums);
    }

    /**
     * Initializes or updates job configurations in the database
     */
    async #initializeJobConfigs(jobClasses: JobClassMap, jobDefinitionChecksums: ChecksumMap): Promise<void> {
        await Promise.all(
            Object.entries(jobClasses).map(async([jobName, JobClass]) => {
                this.#log.d(`Initializing job config for ${jobName}`);
                const currentChecksum = jobDefinitionChecksums[jobName];
                const existingConfigOverride = await this.#jobConfigsCollection.findOne({ jobName });

                if (!existingConfigOverride) {
                    // Create new configuration for new job
                    await this.#createDefaultJobConfig(jobName, currentChecksum, JobClass);
                }
                else if (existingConfigOverride.checksum !== currentChecksum) {
                    const instance = new JobClass(jobName);
                    await this.#resetJobConfig(jobName, currentChecksum, instance.getEnabled());
                }
            })
        );
    }

    /**
     * Creates a default configuration for a new job
     */
    async #createDefaultJobConfig(jobName: string, checksum: string, JobClass: JobClassConstructor): Promise<void> {
        const instance = new JobClass(jobName);

        await this.#jobConfigsCollection.insertOne({
            jobName,
            enabled: instance.getEnabled(),
            checksum,
            createdAt: new Date(),
            defaultConfig: {
                schedule: instance.getSchedule(),
                retry: instance.getRetryConfig(),
                priority: instance.getPriority(),
                concurrency: instance.getConcurrency(),
                lockLifetime: instance.getLockLifetime()
            }
        });
        this.#log.d(`Created default configuration for new job: ${jobName}`);
    }

    /**
     * Resets job configuration when implementation changes
     */
    async #resetJobConfig(jobName: string, newChecksum: string, defaultEnabled: boolean): Promise<void> {
        this.#log.w(`Job ${jobName} implementation changed, resetting configuration`);
        await this.#jobConfigsCollection.updateOne(
            { jobName },
            {
                $set: {
                    enabled: defaultEnabled,
                    checksum: newChecksum,
                    updatedAt: new Date()
                },
                $unset: {
                    schedule: '',
                    retry: '',
                    runNow: ''
                }
            }
        );
    }

    /**
     * Applies configurations to jobs
     */
    async #applyJobConfigurations(jobClasses: JobClassMap, jobDefinitionChecksums: ChecksumMap): Promise<void> {
        // Load all existing configuration overrides
        const configOverrides = await this.#jobConfigsCollection.find({}).toArray();
        const configOverridesMap = new Map(configOverrides.map(conf => [conf.jobName, conf]));

        // Create and configure jobs
        await Promise.all(
            Object.entries(jobClasses).map(async([jobName, JobClass]) => {
                // Create the job with default settings
                await this.#jobRunner.createJob(jobName, JobClass);

                // Apply configuration override if valid
                const configOverride = configOverridesMap.get(jobName);
                if (configOverride && configOverride.checksum === jobDefinitionChecksums[jobName]) {
                    await this.applyConfig(configOverride);
                    this.#log.d(`Applied configuration override for job: ${jobName}`);
                }
            })
        );
    }

    /**
     * Starts the job manager by loading and running jobs.
     * @param jobClasses - Object containing job classes keyed by job name
     */
    async start(jobClasses: JobClassMap): Promise<void> {
        if (!jobClasses || Object.keys(jobClasses).length === 0) {
            throw new Error('No job classes provided');
        }
        if (!this.#jobRunner) {
            throw new Error('Job runner not initialized');
        }

        await this.#loadJobs(jobClasses);
        await this.#jobRunner.start();
        this.#log.d('JobManager started successfully');
    }

    /**
     * Applies job configuration changes
     * @param jobConfig - The job configuration to apply
     */
    async applyConfig(jobConfig: JobConfigDocument): Promise<void> {
        try {
            if (!this.#jobRunner) {
                throw new Error('Job runner not initialized');
            }

            const { jobName } = jobConfig;
            this.#log.d('Applying config changes for job:', {
                jobName,
                changes: {
                    runNow: jobConfig.runNow,
                    scheduleUpdated: !!jobConfig.schedule,
                    retryUpdated: !!jobConfig.retry,
                    enabledStateChanged: typeof jobConfig.enabled === 'boolean'
                }
            });

            if (jobConfig.runNow === true) {
                await this.#jobRunner.runJobNow(jobName);
                await this.#jobConfigsCollection.updateOne(
                    { jobName },
                    { $unset: { runNow: '' } }
                );
            }

            if (jobConfig.schedule) {
                await this.#jobRunner.updateSchedule(jobName, { type: 'schedule', value: jobConfig.schedule });
            }

            if (jobConfig.retry) {
                await this.#jobRunner.configureRetry(jobName, jobConfig.retry);
            }

            if (typeof jobConfig.enabled === 'boolean') {
                if (jobConfig.enabled) {
                    await this.#jobRunner.enableJob(jobName);
                    this.#log.i(`Job ${jobName} enabled via config`);
                }
                else {
                    await this.#jobRunner.disableJob(jobName);
                    this.#log.i(`Job ${jobName} disabled via config`);
                }
            }
        }
        catch (error) {
            const err = error as Error;
            this.#log.e('Failed to apply job configuration:', {
                jobName: jobConfig.jobName || 'unknown',
                error: err.message,
                stack: err.stack
            });
            throw error; // Re-throw to allow caller to handle
        }
    }

    /**
     * Enable a job
     * @param jobName - Name of the job to enable
     */
    async enableJob(jobName: string): Promise<void> {
        if (!this.#jobRunner) {
            throw new Error('Job runner not initialized');
        }
        await this.#jobRunner.enableJob(jobName);
    }

    /**
     * Disable a job
     * @param jobName - Name of the job to disable
     */
    async disableJob(jobName: string): Promise<void> {
        if (!this.#jobRunner) {
            throw new Error('Job runner not initialized');
        }
        await this.#jobRunner.disableJob(jobName);
    }

    /**
     * Closes the JobManager and cleans up resources
     */
    async close(): Promise<void> {
        this.#log.d('JobManager closed successfully');
        await this.#jobRunner.close();
    }
}

export default JobManager;
export { JobManager };
export type { JobConfigDocument, JobClassMap, ChecksumMap, JobRunner };
