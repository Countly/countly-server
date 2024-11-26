/**
 * @typedef {import("mongodb").Db} Database
 * @typedef {import("mongodb").ObjectId} ObjectId
 */
const JOB = require("../../../../api/parts/jobs/job.js");
const log = require("../../../../api/utils/log.js")("job:logger:clear");

const DEFAULT_MAX_ENTRIES = 1000;

/**
 * clears logs
 */
class ClearJob extends JOB.Job {
    /**
     * Cleans up the logs{APPID} collection
     * @param {Database} db mongodb database instance
     */
    async run(db) {
        let max = this.data.max;
        if (typeof max !== "number") {
            log.e(
                "Maximum number of log entries required. Falling back to default value:",
                DEFAULT_MAX_ENTRIES
            );
            max = DEFAULT_MAX_ENTRIES;
        }

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