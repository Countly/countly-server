'use strict';
/**
 * @typedef {import("mongodb").Db} MongoDb
 */

const { Job } = require('../../../../api/parts/jobs/job.js');
const log = require('../../../../api/utils/log.js')('job:push:clear-stats');

const EXPIRY = 30 * 24 * 60 * 60 * 1000; // 30 days

/**
 * Clears push_stats collection
 */
class ClearStatsJob extends Job {
    /**
     * Clears push_stats based on EXPIRY and MAX_RECORDS
     * @param {MongoDb} db - db connection
     */
    async run(db) {
        log.d('Clearing push_stats');
        await db.collection("push_stats").deleteMany({
            d: { $lte: new Date(Date.now() - EXPIRY) }
        });
    }
}

module.exports = ClearStatsJob;