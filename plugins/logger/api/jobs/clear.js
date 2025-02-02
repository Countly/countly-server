/**
 * @typedef {import("mongodb").Db} Database
 * @typedef {import("mongodb").ObjectId} ObjectId
 */
// const JOB = require("../../../../api/parts/jobs/job.js");
const Job = require("../../../../jobServer/Job");
const log = require("../../../../api/utils/log.js")("job:logger:clear");

const {MAX_NUMBER_OF_LOG_ENTRIES} = require('../constants');

/**
 * clears logs
 */
class ClearJob extends Job {

    /**
     * Get the schedule configuration for this job
     * @returns {GetScheduleConfig} schedule configuration
     */
    getSchedule() {
        return {
            type: "schedule",
            value: "*/5 * * * *" // every 5 minutes
        };
    }

    /**
     * Cleans up the logs{APPID} collection
     * @param {Database} db mongodb database instance
     */
    async run(db) {
        let max = MAX_NUMBER_OF_LOG_ENTRIES;

        log.d("Started: cleaning logs before the last", max);
        const appIds = await db.collection("apps").find().project({ _id: 1 }).toArray();
        const loggerCollections = appIds.map(({_id}) => "logs" + _id.toString());

        for (const colName of loggerCollections) {
            const col = db.collection(colName);
            // find the first entry we want to keep
            const firstEntry = await col.find({}).project({ _id: 1 }).sort({ _id: -1 })
                .skip(max - 1).limit(1).toArray();
            if (!firstEntry[0]) {
                continue;
            }
            // delete all previous entries
            const result = await col.deleteMany({ _id: { $lt: firstEntry[0]._id } });
            log.d("Cleaned up", result.deletedCount, "entries from", colName);
        }
        log.d("Finished cleaning logs");
    }
}

module.exports = ClearJob;