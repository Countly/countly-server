/**
 * PulseJobRunner - Consolidated Pulse job runner
 * @module jobServer/PulseJobRunner
 */

import type { Db, Collection } from 'mongodb';
import type { PriorityLevel } from './constants/JobPriorities.js';
import type { GetScheduleConfig, ProgressData, DoneCallback } from './Job.js';

import { createRequire } from 'module';
// @ts-expect-error - import.meta is available at runtime with Node's native TypeScript support
const require = createRequire(import.meta.url);

const { Pulse, JobPriority } = require('@pulsecron/pulse');
const { JOB_PRIORITIES } = require('./constants/JobPriorities');
const { isValidCron } = require('cron-validator');

/**
 * Logger interface for type safety
 */
interface Logger {
    d(...args: unknown[]): void;
    w(...args: unknown[]): void;
    e(...args: unknown[]): void;
    i(...args: unknown[]): void;
}

/**
 * Logger constructor function type
 */
type LoggerConstructor = (name: string) => Logger;

/**
 * Pulse instance type from @pulsecron/pulse
 */
interface PulseInstance {
    define(
        name: string,
        handler: (job: PulseJob, done: DoneCallback) => Promise<void>,
        options?: PulseDefineOptions
    ): void;
    every(interval: string, name: string, data?: JobData): Promise<void>;
    schedule(when: Date | string, name: string, data?: JobData): Promise<void>;
    now(name: string, data?: JobData): Promise<void>;
    cancel(query: Record<string, unknown>): Promise<void>;
    enable(query: { name: string }): Promise<void>;
    disable(query: { name: string }): Promise<void>;
    start(): Promise<void>;
    close(): Promise<void>;
    _definitions: Record<string, PulseJobDefinition>;
    _collection: Collection;
}

/**
 * Pulse job definition
 */
interface PulseJobDefinition {
    attempts?: number;
    backoff?: {
        delay: number;
        type: string;
    };
}

/**
 * Pulse define options
 */
interface PulseDefineOptions {
    priority?: number;
    concurrency?: number;
    lockLifetime?: number;
    shouldSaveResult?: boolean;
    attempts?: number;
    backoff?: {
        type: string;
        delay: number;
    };
}

/**
 * Pulse job instance
 */
interface PulseJob {
    attrs: {
        _id?: unknown;
        name: string;
        data?: JobData;
    };
    touch: () => Promise<void>;
    save: () => Promise<void>;
}

/**
 * Retry configuration for jobs
 */
interface RetryConfig {
    /** Whether retries are enabled */
    enabled: boolean;
    /** Maximum number of retry attempts */
    attempts: number;
    /** Delay between retries in milliseconds */
    delay: number;
}

/**
 * Schedule configuration for jobs
 */
interface ScheduleConfig {
    /** Type of schedule execution */
    type: 'once' | 'schedule' | 'now' | 'manual';
    /** Cron expression (for 'schedule') or Date object (for 'once') */
    value?: string | Date;
}

/**
 * Job data payload
 */
interface JobData {
    /** Custom data payload for the job */
    payload?: unknown;
    /** Additional metadata for job execution */
    metadata?: Record<string, unknown>;
    /** Progress data */
    progressData?: ProgressData;
    [key: string]: unknown;
}

/**
 * Pulse configuration options
 */
interface PulseConfig {
    /** Name of the Pulse instance */
    name?: string;
    /** Additional Pulse configuration options */
    options?: Record<string, unknown>;
    [key: string]: unknown;
}

/**
 * Job class interface for type checking
 */
interface JobClassInstance {
    getRetryConfig(): RetryConfig;
    getPriority(): PriorityLevel;
    getConcurrency(): number;
    getLockLifetime(): number;
    getEnabled(): boolean;
    getSchedule(): GetScheduleConfig;
    setTouchMethod(method: (progress?: number) => Promise<void>): void;
    setProgressMethod(method: (progressData: ProgressData) => Promise<void>): void;
    _run(db: Db, job: PulseJob, done: DoneCallback): Promise<void>;
}

/**
 * Job class constructor type
 */
type JobClassConstructor = new (jobName: string) => JobClassInstance;

/**
 * Consolidated Pulse job runner that handles all job operations.
 * Combines scheduling, execution, and lifecycle management in a single class.
 * This replaces the previous interface-based architecture for better maintainability.
 */
class PulseJobRunner {
    /** Pulse runner instance */
    #pulseRunner: PulseInstance;

    /** MongoDB database connection */
    #db: Db;

    /** Logger instance */
    #log: Logger;

    /** Map of pending job schedules */
    #pendingSchedules: Map<string, ScheduleConfig> = new Map();

    /**
     * Creates a new PulseJobRunner instance
     *
     * @param db - MongoDB database connection
     * @param config - Configuration object for Pulse
     * @param LoggerFn - Logger constructor function
     * @throws Error if required dependencies are not provided
     */
    constructor(db: Db, config: PulseConfig, LoggerFn: LoggerConstructor) {
        this.#log = LoggerFn('jobs:runner:pulse');
        this.#log.d('Initializing PulseJobRunner');

        if (!db || !config) {
            this.#log.e('Missing required dependencies');
            throw new Error('Missing required dependencies for PulseJobRunner');
        }

        this.#db = db;

        // Create the Pulse instance
        this.#pulseRunner = new Pulse({
            ...config,
            mongo: db,
        });
        this.#log.i('Created Pulse instance', { config: { ...config, mongo: '[Connection]' } });

        this.#log.i('PulseJobRunner initialized successfully');
    }

    // ========================================
    // Job Execution Methods
    // ========================================

    /**
     * Creates and registers a new job with the Pulse runner
     * @param jobName - Unique identifier for the job
     * @param JobClass - Job class constructor
     * @throws Error when job creation or registration fails
     * @returns A promise that resolves once the job is created
     */
    async createJob(jobName: string, JobClass: JobClassConstructor): Promise<void> {
        this.#log.d(`Attempting to create job: ${jobName}`);
        try {
            const instance = new JobClass(jobName);

            const retryConfig = instance.getRetryConfig();
            const priority = this.#mapPriority(instance.getPriority());
            const concurrency = instance.getConcurrency();
            const lockLifetime = instance.getLockLifetime();
            const isEnabled = instance.getEnabled();

            this.#pulseRunner.define(
                jobName,
                async(job: PulseJob, done: DoneCallback) => {
                    instance.setTouchMethod(job.touch.bind(job));
                    instance.setProgressMethod(
                        async(progressData: ProgressData) => this.#updateJobProgress(job, progressData)
                    );
                    return instance._run(this.#db, job, done);
                },
                {
                    priority,
                    concurrency,
                    lockLifetime,
                    shouldSaveResult: true,
                    attempts: retryConfig?.enabled ? retryConfig.attempts : 0,
                    backoff: retryConfig?.enabled ? {
                        type: 'exponential',
                        delay: retryConfig.delay
                    } : undefined
                }
            );

            // If job should be disabled by default, use disableJob method
            if (!isEnabled) {
                await this.disableJob(jobName);
                this.#log.d(`Job ${jobName} disabled after creation`);
            }

            const scheduleConfig: ScheduleConfig = { ...instance.getSchedule() };
            const overrideSchedule = await this.#db.collection('jobConfigs').findOne(
                { jobName, schedule: { $exists: true } },
                { projection: { jobName: 1, schedule: 1 } },
            );

            if (overrideSchedule && 'schedule' in overrideSchedule) {
                scheduleConfig.value = overrideSchedule.schedule as string | Date;
            }

            this.#pendingSchedules.set(jobName, scheduleConfig);
            this.#log.d(`Job ${jobName} defined successfully with enabled state: ${isEnabled}`);

            this.#log.d(`Configuring job ${jobName} with priority: ${priority}, concurrency: ${concurrency}, lockLifetime: ${lockLifetime}`);

            this.#log.i(`Job ${jobName} created and configured successfully with retry attempts: ${retryConfig?.attempts || 1}`);
        }
        catch (error) {
            const err = error as Error;
            this.#log.e(`Failed to create job ${jobName}`, { error: err, stack: err.stack });
            throw error; // Propagate error for proper handling
        }
    }

    /**
     * Enables a job
     * @param jobName - Name of the job
     * @returns A promise that resolves once the job is enabled
     */
    async enableJob(jobName: string): Promise<void> {
        try {
            await this.#pulseRunner.enable({ name: jobName });
            this.#log.i(`Job ${jobName} enabled`);
        }
        catch (error) {
            this.#log.e(`Failed to enable job ${jobName}:`, error);
            throw error;
        }
    }

    /**
     * Disables a job
     * @param jobName - Name of the job
     * @returns A promise that resolves once the job is disabled
     */
    async disableJob(jobName: string): Promise<void> {
        try {
            await this.#pulseRunner.disable({ name: jobName });
            this.#log.i(`Job ${jobName} disabled`);
        }
        catch (error) {
            this.#log.e(`Failed to disable job ${jobName}:`, error);
            throw error;
        }
    }

    /**
     * Configures retry settings for a job
     * @param jobName - Name of the job
     * @param retryConfig - Retry configuration
     * @returns A promise that resolves once retry settings are updated
     */
    async configureRetry(jobName: string, retryConfig: RetryConfig): Promise<void> {
        try {
            // First get the job definition
            const definition = this.#pulseRunner._definitions[jobName];
            if (!definition) {
                throw new Error(`Job ${jobName} not found`);
            }

            // Update the definition for future job instances
            definition.attempts = retryConfig.attempts;
            definition.backoff = {
                delay: retryConfig.delay,
                type: 'exponential'
            };

            // Update existing jobs in the queue using the MongoDB collection directly
            await this.#pulseRunner._collection.updateMany(
                { name: jobName },
                {
                    $set: {
                        attempts: retryConfig.attempts,
                        backoff: {
                            delay: retryConfig.delay,
                            type: 'exponential'
                        }
                    }
                }
            );

            this.#log.i(`Retry configuration updated for job ${jobName}`);
        }
        catch (error) {
            this.#log.e(`Failed to configure retry for job ${jobName}:`, error);
            throw error;
        }
    }

    // ========================================
    // Job Scheduling Methods
    // ========================================

    /**
     * Schedules a job to run based on provided configuration
     * @param name - Unique identifier for the job
     * @param scheduleConfig - Configuration defining when the job should run
     * @param data - Optional payload to pass to the job during execution
     * @returns Resolves when job is successfully scheduled
     * @throws Error if scheduling fails or configuration is invalid
     */
    async schedule(name: string, scheduleConfig: ScheduleConfig, data: JobData = {}): Promise<void> {
        try {
            this.#validateScheduleConfig(scheduleConfig);
            this.#log.d(`Attempting to schedule job '${name}' with type: ${scheduleConfig.type}`, {
                scheduleConfig,
                data
            });

            switch (scheduleConfig.type) {
            case 'schedule':
                if (!isValidCron(scheduleConfig.value)) {
                    throw new Error('Invalid cron schedule');
                }
                await this.#pulseRunner.every(scheduleConfig.value as string, name, data);
                break;

            case 'once':
                if (!(scheduleConfig.value instanceof Date)) {
                    throw new TypeError('Invalid date for one-time schedule');
                }
                await this.#pulseRunner.schedule(scheduleConfig.value, name, data);
                break;

            case 'now': {
                const now = new Date();
                await this.#pulseRunner.schedule(now, name, data);
                break;
            }
            case 'manual':
                // For manual jobs, do not automatically schedule them.
                // They should only run when explicitly triggered.
                this.#log.d(`Job '${name}' is set to manual; not scheduling automatically.`);
                break;
            }

            this.#log.i(`Successfully scheduled job '${name}'`, {
                type: scheduleConfig.type,
                value: scheduleConfig.value,
                hasData: Object.keys(data).length > 0
            });
        }
        catch (error) {
            const err = error as Error;
            this.#log.e(`Failed to schedule job '${name}'`, {
                error: err.message,
                scheduleConfig,
                stack: err.stack
            });
            throw error;
        }
    }

    /**
     * Updates an existing job's schedule with new configuration
     * @param jobName - Name of the job to update
     * @param schedule - New schedule configuration
     * @param data - Optional payload to pass to the job during execution
     * @returns Resolves when schedule is successfully updated
     * @throws Error if update fails or new configuration is invalid
     */
    async updateSchedule(jobName: string, schedule: ScheduleConfig, data: JobData = {}): Promise<void> {
        try {
            this.#log.d(`Attempting to update schedule for job '${jobName}'`, { schedule, data });

            this.#validateScheduleConfig(schedule);

            // First remove all existing scheduled jobs with this name that are still pending future execution.
            // Jobs with nextRunAt: null or type: 'single' (e.g. completed one-time jobs or repeating jobs) will be preserved.
            await this.#pulseRunner.cancel({ name: jobName, nextRunAt: { $ne: null }, type: { $ne: 'single' } });
            this.#log.d(`Removed pending future schedules for job '${jobName}'`);

            switch (schedule.type) {
            case 'schedule': {
                if (!isValidCron(schedule.value)) {
                    throw new Error('Invalid cron schedule');
                }
                // For repeating job, update the schedule
                await this.#pulseRunner.every(schedule.value as string, jobName, data);
                break;
            }

            case 'once': {
                if (!(schedule.value instanceof Date)) {
                    throw new TypeError('Invalid date for one-time schedule');
                }
                // For one time job, schedule a new one
                await this.#pulseRunner.schedule(schedule.value, jobName, data);
                break;
            }

            case 'now': {
                const now = new Date();
                // For one time immediate job, schedule a new one immediately
                await this.#pulseRunner.schedule(now, jobName, data);
                break;
            }

            case 'manual': {
                // For manual jobs, existing pending schedules were removed above.
                // No new schedule is created for 'manual' type, it requires explicit runJobNow.
                this.#log.d(`Job '${jobName}' updated to manual schedule; not rescheduling automatically.`);
                break;
            }

            }

            this.#log.i(`Successfully updated schedule for job '${jobName}'`, {
                type: schedule.type,
                value: schedule.value
            });
        }
        catch (error) {
            const err = error as Error;
            this.#log.e(`Failed to update schedule for job '${jobName}'`, {
                error: err.message,
                schedule,
                stack: err.stack
            });
            // Do not throw error to prevent process termination
            // The error has been logged for debugging purposes
        }
    }

    /**
     * Triggers immediate execution of a job
     * @param jobName - Name of the job to execute
     * @returns Resolves when job is successfully triggered
     * @throws Error if immediate execution fails
     */
    async runJobNow(jobName: string): Promise<void> {
        try {
            this.#log.d(`Attempting to trigger immediate execution of job '${jobName}'`);
            await this.#pulseRunner.now(jobName, {});
            this.#log.i(`Successfully triggered immediate execution of job '${jobName}'`);
        }
        catch (error) {
            const err = error as Error;
            this.#log.e(`Failed to trigger immediate execution of job '${jobName}'`, {
                error: err.message,
                stack: err.stack
            });
            throw error;
        }
    }

    // ========================================
    // Job Lifecycle Methods
    // ========================================

    /**
     * Initializes and starts the job runner, then schedules all pending jobs.
     * @returns Resolves when the runner is started and all jobs are scheduled
     * @throws Error if pulse runner is not initialized or scheduling fails
     */
    async start(): Promise<void> {
        if (!this.#pulseRunner) {
            this.#log.e('Lifecycle start failed: Pulse runner not initialized', {
                component: 'PulseJobRunner',
                method: 'start'
            });
            throw new Error('Pulse runner not initialized');
        }

        try {
            await this.#pulseRunner.start();
            this.#log.i('Pulse runner initialization complete', {
                component: 'PulseJobRunner',
                status: 'started'
            });

            const pendingJobCount = this.#pendingSchedules.size;
            this.#log.i('Beginning job schedule processing', {
                component: 'PulseJobRunner',
                pendingJobs: pendingJobCount
            });

            // Schedule all pending jobs
            for (const [jobName, scheduleConfig] of this.#pendingSchedules) {
                try {
                    await this.schedule(jobName, scheduleConfig);
                    this.#log.d('Job scheduled successfully', {
                        component: 'PulseJobRunner',
                        job: jobName,
                        config: scheduleConfig
                    });
                }
                catch (error) {
                    const err = error as Error;
                    this.#log.e('Job scheduling failed', {
                        component: 'PulseJobRunner',
                        job: jobName,
                        error: err.message,
                        stack: err.stack
                    });
                }
            }

            this.#pendingSchedules.clear();
            this.#log.i('Job scheduling process complete', {
                component: 'PulseJobRunner',
                totalProcessed: pendingJobCount
            });
        }
        catch (error) {
            const err = error as Error;
            this.#log.e('Pulse runner start failed', {
                component: 'PulseJobRunner',
                error: err.message,
                stack: err.stack
            });
            throw error;
        }
    }

    /**
     * Gracefully shuts down the job runner and cleans up resources.
     * @returns Resolves when the runner is successfully closed
     * @throws Error if the shutdown process fails
     */
    async close(): Promise<void> {
        try {
            await this.#pulseRunner.close();
            this.#log.i('Pulse runner shutdown complete', {
                component: 'PulseJobRunner',
                status: 'closed'
            });
        }
        catch (error) {
            const err = error as Error;
            this.#log.e('Pulse runner shutdown failed', {
                component: 'PulseJobRunner',
                error: err.message,
                stack: err.stack
            });
            throw error;
        }
    }

    // ========================================
    // Private Helper Methods
    // ========================================

    /**
     * Validates schedule configuration structure and values
     * @param config - Schedule configuration to validate
     * @throws Error if configuration is invalid or missing required fields
     */
    #validateScheduleConfig(config: ScheduleConfig): void {
        if (!config || typeof config !== 'object') {
            throw new Error('Schedule configuration must be an object');
        }

        if (!config.type) {
            throw new Error('Schedule type is required');
        }

        const validTypes = ['schedule', 'once', 'now', 'manual'];
        if (!validTypes.includes(config.type)) {
            throw new Error(`Invalid schedule type: ${config.type}`);
        }

        if (config.type !== 'now' && config.type !== 'manual' && !config.value) {
            throw new Error('Schedule value is required');
        }
    }

    /**
     * Updates progress information for a running job
     * @param job - Pulse job instance
     * @param progressData - Progress information to store
     * @throws Error when progress update fails
     * @returns A promise that resolves once progress is updated
     */
    async #updateJobProgress(job: PulseJob, progressData: ProgressData): Promise<void> {
        this.#log.d(`Updating progress for job ${job.attrs.name}`, { progressData });
        try {
            job.attrs.data = {
                ...job.attrs.data,
                progressData
            };
            await job.save();
            this.#log.d(`Progress updated successfully for job ${job.attrs.name}`);
        }
        catch (error) {
            const err = error as Error;
            this.#log.e(`Failed to update job progress for ${job.attrs.name}`, {
                error: err,
                stack: err.stack,
                jobId: job.attrs._id
            });
            throw error; // Propagate error for proper handling
        }
    }

    /**
     * Maps generic priority levels to Pulse-specific priority values
     * @param priority - Generic priority from JOB_PRIORITIES
     * @returns Mapped Pulse priority
     */
    #mapPriority(priority: PriorityLevel): number {
        const priorityMap: Record<PriorityLevel, number> = {
            [JOB_PRIORITIES.LOWEST as PriorityLevel]: JobPriority.lowest,
            [JOB_PRIORITIES.LOW as PriorityLevel]: JobPriority.low,
            [JOB_PRIORITIES.NORMAL as PriorityLevel]: JobPriority.normal,
            [JOB_PRIORITIES.HIGH as PriorityLevel]: JobPriority.high,
            [JOB_PRIORITIES.HIGHEST as PriorityLevel]: JobPriority.highest
        };

        if (!priority || priorityMap[priority] === undefined) {
            this.#log.w(`Invalid priority "${priority}", defaulting to normal`);
            return JobPriority.normal;
        }

        return priorityMap[priority];
    }
}

export default PulseJobRunner;
export { PulseJobRunner };
export type {
    Logger,
    LoggerConstructor,
    PulseInstance,
    PulseJob,
    PulseJobDefinition,
    PulseDefineOptions,
    RetryConfig,
    ScheduleConfig,
    JobData,
    PulseConfig,
    JobClassInstance,
    JobClassConstructor,
};
