import { createRequire } from 'module';

// @ts-expect-error - import.meta is available at runtime with Node's native TypeScript support
const require = createRequire(import.meta.url);

const job = require('../../jobServer');

interface Database {
    collection(name: string): {
        countDocuments(query: Record<string, unknown>): Promise<number>;
        find(query: Record<string, unknown>): {
            skip(n: number): {
                limit(n: number): {
                    toArray(): Promise<Record<string, unknown>[]>;
                };
            };
        };
        updateMany(filter: Record<string, unknown>, update: Record<string, unknown>): Promise<unknown>;
    };
}

interface ScheduleConfig {
    type: 'once' | 'schedule' | 'now' | 'manual';
    value?: string | Date;
}

interface RetryConfig {
    enabled: boolean;
    attempts: number;
    delay: number;
}

interface JobResult {
    processedCount: number;
    totalItems: number;
    completedAt: Date;
}

interface Logger {
    d: (message: string, ...args: unknown[]) => void;
    i: (message: string, ...args: unknown[]) => void;
    w: (message: string, ...args: unknown[]) => void;
    e: (message: string, ...args: unknown[]) => void;
}

interface Priorities {
    LOWEST: string;
    LOW: string;
    NORMAL: string;
    HIGH: string;
    HIGHEST: string;
}

/**
 * Example job implementation demonstrating all features of the job system.
 *
 * Required methods:
 * - getSchedule()
 * - run()
 *
 * Optional methods with defaults:
 * - getRetryConfig() - Default: { enabled: true, attempts: 3, delay: 2000 }
 * - getPriority() - Default: NORMAL
 * - getConcurrency() - Default: 1
 * - getLockLifetime() - Default: 55 minutes
 */
class ExampleJob extends job.Job {
    declare logger: Logger;
    declare priorities: Priorities;

    /**
     * Get the schedule configuration for the job.
     * @returns Schedule configuration object
     */
    getSchedule(): ScheduleConfig {
        // Example: Run every day at midnight
        return {
            type: 'schedule',
            value: '0 0 * * *'
        };
    }

    /**
     * Configure retry behavior for failed jobs.
     * @returns Retry configuration
     */
    getRetryConfig(): RetryConfig {
        return {
            enabled: true,
            attempts: 3,
            delay: 1000 * 60
        };
    }

    /**
     * Set job priority level.
     * Higher priority jobs are processed first.
     * @returns Priority level (HIGH, NORMAL, LOW)
     */
    getPriority(): string {
        return this.priorities.HIGH;
    }

    /**
     * Set maximum concurrent instances of this job.
     * Limits how many copies of this job can run simultaneously.
     * @returns Maximum number of concurrent instances
     */
    getConcurrency(): number {
        return 2;
    }

    /**
     * Set job lock lifetime.
     * Determines how long a job can run before its lock expires.
     * @returns Lock lifetime in milliseconds
     */
    getLockLifetime(): number {
        return 30 * 60 * 1000; // 30 minutes
    }

    /**
     * Simulates processing work with a delay
     * @param ms - Time to wait in milliseconds
     * @returns Returns a promise that resolves when the delay is complete
     */
    async #simulateWork(ms: number): Promise<void> {
        await new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Main job execution method.
     *
     * Demonstrates:
     * - Progress reporting
     * - Synthetic delays to simulate work
     * - Error handling
     * - Logging at different levels
     * - Database operations (commented examples)
     *
     * @param db - Database connection
     * @param done - Callback to signal job completion
     * @param progress - Progress reporting function
     */
    async run(
        db: Database,
        done: (error: Error | null, result?: JobResult) => void,
        progress: (total: number, current: number, bookmark: string) => Promise<void>
    ): Promise<void> {
        try {
            this.logger.d('Starting example job execution');

            // Example: Query total items to process
            // const total = await db.collection('users').countDocuments({ active: false });
            const total = 100; // Simulated total
            let processed = 0;

            // Process in batches of 10
            for (let i = 0; i < total; i += 10) {
                // Example: Process a batch of records
                // const batch = await db.collection('users')
                //     .find({ active: false })
                //     .skip(i)
                //     .limit(10)
                //     .toArray();

                // Simulate batch processing (2 second per batch)
                await this.#simulateWork(2000);
                processed += 10;

                // Report progress with detailed bookmark
                await progress(
                    total,
                    processed,
                    `Processing batch ${(i / 10) + 1}/10`
                );

                this.logger.d(`Completed batch ${(i / 10) + 1}/10`);

                // Simulate random error (10% chance)
                if (Math.random() < 0.1) {
                    throw new Error('Random batch processing error');
                }
            }

            // Simulate final processing
            await this.#simulateWork(1000);

            // Job completion with result data
            const result: JobResult = {
                processedCount: processed,
                totalItems: total,
                completedAt: new Date()
            };

            this.logger.i('Job completed successfully', result);
            done(null, result);
        }
        catch (error) {
            this.logger.e('Job failed:', error);
            done(error as Error);
        }
    }
}

export default ExampleJob;
export { ExampleJob };
