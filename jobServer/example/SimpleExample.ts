import { createRequire } from 'module';

// @ts-expect-error - import.meta is available at runtime with Node's native TypeScript support
const require = createRequire(import.meta.url);

const job = require('../../jobServer');

interface Database {
    collection(name: string): unknown;
}

interface ScheduleConfig {
    type: 'once' | 'schedule' | 'now' | 'manual';
    value?: string | Date;
}

interface JobResult {
    success: boolean;
}

interface Logger {
    d: (message: string, ...args: unknown[]) => void;
    i: (message: string, ...args: unknown[]) => void;
    w: (message: string, ...args: unknown[]) => void;
    e: (message: string, ...args: unknown[]) => void;
}

/**
 * Simple example job with only required methods.
 */
class SimpleExample extends job.Job {
    declare logger: Logger;

    /**
     * Get the schedule configuration for the job.
     * @returns Schedule configuration object
     */
    getSchedule(): ScheduleConfig {
        return {
            type: 'schedule',
            value: '0 0 * * *' // Runs daily at midnight
        };
    }

    /**
     * Main job execution method.
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
            this.logger.i('Starting simple job');

            // Your job logic here
            await progress(1, 1, 'Task completed');

            done(null, { success: true });
        }
        catch (error) {
            this.logger.e('Job failed:', error);
            done(error as Error);
        }
    }
}

export default SimpleExample;
export { SimpleExample };
