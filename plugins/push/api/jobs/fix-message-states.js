/**
 * @typedef {import('mongodb').Db} Database
 * @typedef {import('mongodb').ObjectId} ObjectId
 * @typedef {{ type: string; value: string; }} ScheduleConfig
 * @typedef {() => void} DoneCallback
 * @typedef {(i: number, j: number, message: string) => void} ProgressCallback
 */

import { createRequire } from 'module';
import { fixMessageStates } from './fix-message-states-core.ts';

// createRequire needed for CJS modules without ES exports
const require = createRequire(import.meta.url);
const { Job } = require('../../../../jobServer/index.js');

/**
 * Daily job that detects and fixes stale schedule / message states caused by
 * lost Kafka events, process restarts, or partial failures in the push
 * notification pipeline.
 */
class FixMessageStatesJob extends Job {
    /**
     * Returns the cron schedule for this job.
     * @returns {ScheduleConfig} schedule configuration
     */
    getSchedule() {
        return {
            type: 'schedule',
            value: '0 0 * * *'
        };
    }

    /**
     * Fixes stale message and schedule states.
     * @param {Database} db - database connection
     * @param {DoneCallback} done - callback to signal job completion
     * @param {ProgressCallback} progress - progress reporting function
     */
    async run(db, done, progress) {
        try {
            await fixMessageStates({ db, log: this.log, progress });
            done();
        }
        catch (error) {
            this.log.e("Error while running fix-message-states job", error);
        }
    }
}

export default FixMessageStatesJob;
