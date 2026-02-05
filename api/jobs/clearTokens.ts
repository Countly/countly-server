/**
 * Clear Tokens Job
 * Cleans expired tokens
 * @module api/jobs/clearTokens
 */
import { createRequire } from 'module';
// @ts-expect-error TS1470 - import.meta works at runtime with Node 22+ native TS
const require = createRequire(import.meta.url);

import type { Db } from 'mongodb';

const authorize = require('../utils/authorizer.js');
const Job = require('../../jobServer/Job');

interface GetScheduleConfig {
    type: 'once' | 'schedule' | 'now' | 'manual';
    value?: string | Date;
}

type DoneCallback = (error?: Error | null) => void;

/** Class for job of clearing tokens **/
class CleanTokensJob extends Job {

    /**
     * Get the schedule configuration for this job
     * @returns schedule configuration
     */
    getSchedule(): GetScheduleConfig {
        return {
            type: 'schedule',
            value: '30 2 * * *' // Every day at 2:30 AM
        };
    }

    /**
     * Run the job
     * @param db - connection
     * @param done - callback
     */
    run(db: Db, done: DoneCallback): void {
        authorize.clean({
            db: db,
            callback: function() {
                done();
            }
        });
    }
}

export default CleanTokensJob;
