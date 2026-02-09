/**
 * Base Job class for creating scheduled jobs
 * @module jobServer/Job
 */

import type { PriorityLevel, JobPrioritiesType } from './constants/JobPriorities.js';
import type { Collection, Db } from 'mongodb';

import { createRequire } from 'module';
// @ts-expect-error - import.meta is available at runtime with Node's native TypeScript support
const require = createRequire(import.meta.url);

const Logger = require('../api/utils/log.js');
const { JOB_PRIORITIES } = require('./constants/JobPriorities');

/**
 * Logger interface
 */
export interface JobLogger {
    d(...args: unknown[]): void;
    w(...args: unknown[]): void;
    e(...args: unknown[]): void;
    i(...args: unknown[]): void;
}

/**
 * Progress data for job execution
 */
export interface ProgressData {
    /** Total number of items to process */
    total?: number;
    /** Current number of items processed */
    current?: number;
    /** Current processing stage description */
    bookmark?: string;
    /** Progress percentage (0-100) */
    percent?: number;
    /** When the progress was reported */
    timestamp: Date;
}

/**
 * Schedule configuration for jobs
 */
export interface GetScheduleConfig {
    /** Type of schedule */
    type: 'once' | 'schedule' | 'now' | 'manual';
    /** Schedule value (cron expression or Date) */
    value?: string | Date;
}

/**
 * Retry configuration for jobs
 */
export interface RetryConfig {
    /** Whether retries are enabled */
    enabled: boolean;
    /** Number of retry attempts */
    attempts: number;
    /** Delay between retry attempts in milliseconds */
    delay: number;
}

/**
 * Job history document
 */
export interface JobHistoryDocument {
    job_id?: unknown;
    duration?: string;
    status?: string;
    failedAt?: Date;
    failReason?: string;
    [key: string]: unknown;
}

/**
 * Job attributes from Pulse/Agenda
 */
export interface JobAttributes {
    _id?: unknown;
    lastRunAt?: Date;
    [key: string]: unknown;
}

/**
 * Job instance from Pulse/Agenda
 */
export interface JobInstance {
    attrs?: JobAttributes;
}

/**
 * Done callback function type
 */
export type DoneCallback = (error: Error | null, result?: unknown) => void;

/**
 * Progress callback function type
 */
export type ProgressCallback = (total?: number, current?: number, bookmark?: string) => Promise<void>;

/**
 * Touch method function type
 */
type TouchMethod = (progress?: number) => Promise<void>;

/**
 * Progress method function type
 */
type ProgressMethod = (progressData: ProgressData) => Promise<void>;

/**
 * Base class for creating jobs.
 *
 * @example
 * // Example of a simple job that runs every minute
 * class SimpleJob extends Job {
 *     getSchedule() {
 *         return {
 *             type: 'schedule',
 *             value: '* * * * *' // Runs every minute
 *         };
 *     }
 *
 *     async run(db, done) {
 *         try {
 *             await db.collection('mycollection').updateMany({}, { $set: { updated: new Date() } });
 *             done(null, 'Successfully updated records');
 *         } catch (error) {
 *             done(error);
 *         }
 *     }
 * }
 */
class Job {
    /** Name of the job */
    jobName: string = Job.name;

    /** Logger instance */
    log: JobLogger;

    /** Available job priorities */
    priorities: JobPrioritiesType = JOB_PRIORITIES;

    /** Touch method from job runner */
    #touchMethod: TouchMethod | null = null;

    /** Progress method from job runner */
    #progressMethod: ProgressMethod | null = null;

    /** Job history mongodb collection name */
    #jobHistoryCollectionName = 'jobHistories';

    /** Job history collection */
    #jobHistoryCollection: Collection<JobHistoryDocument> | undefined;

    /**
     * Creates an instance of Job.
     * @param jobName - The name of the job
     */
    constructor(jobName?: string) {
        if (jobName) {
            this.jobName = jobName;
        }
        this.log = Logger('jobs:' + this.jobName);
        this.log.d(`Job instance "${this.jobName}" created`);
    }

    /**
     * Sets the name of the job.
     * @param name - The name of the job
     */
    setJobName(name: string): void {
        this.jobName = name;
    }

    /**
     * Sets the logger
     * @param logger - The logger instance
     */
    setLogger(logger: JobLogger = this.log): void {
        this.log = logger;
    }

    /**
     * Runs the job. This method must be implemented by the child class.
     *
     * @param db - The database connection
     * @param done - Callback function to be called when the job is complete
     * @param progress - Progress reporting function for long-running jobs
     *
     * @abstract
     * @throws Error if the method is not overridden
     */
    async run(db: Db, done: DoneCallback, progress: ProgressCallback): Promise<void> {
        // Suppress unused variable warnings - these are documented for subclasses
        void db;
        void done;
        void progress;
        throw new Error('Job must be overridden');
    }

    /**
     * Get the schedule type and timing for the job.
     * This method must be implemented by the child class.
     *
     * @returns Schedule configuration object
     *
     * @abstract
     * @throws Error if the method is not overridden
     */
    getSchedule(): GetScheduleConfig {
        throw new Error('getSchedule must be overridden');
    }

    /**
     * Get job retry configuration
     * @returns Retry configuration
     */
    getRetryConfig(): RetryConfig {
        return {
            enabled: false,
            attempts: 0,
            delay: 5 * 60 * 1000 // 5 minutes
        };
    }

    /**
     * Get job priority
     * @returns Priority level from JOB_PRIORITIES
     */
    getPriority(): PriorityLevel {
        return this.priorities.NORMAL;
    }

    /**
     * Get job concurrency
     * @returns Maximum concurrent instances
     */
    getConcurrency(): number {
        return 1;
    }

    /**
     * Get job lock lifetime in milliseconds
     * @returns Lock lifetime
     */
    getLockLifetime(): number {
        return 55 * 60 * 1000; // 55 minutes
    }

    /**
     * Determines if the job should be enabled when created
     * @returns True if job should be enabled by default
     */
    getEnabled(): boolean {
        return true;
    }

    /**
     * Internal method to run the job and handle both Promise and callback patterns.
     * @param db - The MongoDB database connection
     * @param job - The job instance
     * @param done - Callback to be called when job completes
     */
    async _run(db: Db, job: JobInstance, done: DoneCallback): Promise<void> {
        this.log.d(`[Job:${this.jobName}] Starting execution`, {
            database: (db as unknown as { _cly_debug?: { db?: string } })?._cly_debug?.db,
            jobId: job?.attrs?._id,
            jobName: this.jobName
        });

        this.#jobHistoryCollection = db?.collection<JobHistoryDocument>(this.#jobHistoryCollectionName);

        try {
            const result = await new Promise((resolve, reject) => {
                try {
                    const runResult = this.run(
                        db,
                        (error, callbackResult) => {
                            if (error) {
                                reject(error);
                            }
                            else {
                                resolve(callbackResult);
                            }
                        },
                        this.reportProgress.bind(this)
                    );

                    if (runResult instanceof Promise) {
                        runResult.then(resolve).catch(reject);
                    }
                    else if (runResult !== undefined) {
                        resolve(runResult);
                    }
                }
                catch (error) {
                    reject(error);
                }
            });

            this.log.i(`[Job:${this.jobName}] Completed successfully`, {
                result: result || null,
                duration: `${Date.now() - (job?.attrs?.lastRunAt?.getTime() ?? Date.now())}ms`,
            });
            done(null, result);
        }
        catch (error) {
            const err = error as Error;
            const duration = `${Date.now() - (job?.attrs?.lastRunAt?.getTime() ?? Date.now())}ms`;

            this.log.e(`[Job:${this.jobName}] Execution failed`, {
                error: err.message,
                stack: err.stack,
                duration,
            });

            const historyDoc: JobHistoryDocument = { ...(job.attrs as JobHistoryDocument) };
            historyDoc.job_id = historyDoc?._id;
            delete historyDoc._id;
            historyDoc.duration = duration;
            historyDoc.status = 'FAILED';
            if (!('failedAt' in historyDoc)) {
                historyDoc.failedAt = new Date();
            }
            if (!('failReason' in historyDoc)) {
                historyDoc.failReason = err.message;
            }
            this.#jobHistoryCollection?.insertOne(historyDoc);

            done(err);
        }
    }

    /**
     * Sets the touch method (called internally by job runner)
     * @param touchMethod - The touch method from Pulse
     */
    setTouchMethod(touchMethod: TouchMethod): void {
        this.#touchMethod = touchMethod;
    }

    /**
     * Sets the progress method from the runner
     * @param progressMethod - Method to update progress
     */
    setProgressMethod(progressMethod: ProgressMethod): void {
        this.#progressMethod = progressMethod;
    }

    /**
     * Reports progress for long-running jobs
     * @param total - Total number of stages
     * @param current - Current stage number
     * @param bookmark - Bookmark string for current stage
     */
    async reportProgress(total?: number, current?: number, bookmark?: string): Promise<void> {
        const progress = total && current ? Math.min(100, Math.floor((current / total) * 100)) : undefined;

        const progressData: ProgressData = {
            total,
            current,
            bookmark,
            percent: progress,
            timestamp: new Date()
        };

        if (this.#progressMethod) {
            await this.#progressMethod(progressData);
        }

        if (this.#touchMethod) {
            await this.#touchMethod(progress);
        }

        this.log?.d(`[Job:${this.jobName}] Progress update`, progressData);
    }
}

export default Job;
export { Job };
