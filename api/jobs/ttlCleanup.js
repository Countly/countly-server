/**
 * @typedef {import("mongodb").Db} Db
 */
const plugins = require("../../plugins/pluginManager.js");
const job = require("../parts/jobs/job.js");
const log = require("../utils/log.js")("job:ttlCleanup");

/**
 * Class for job of cleaning expired records inside ttl collections
 */
class TTLCleanup extends job.Job {
    /**
     * Run the job
     * @param {Db} db connection
     */
    async run(db) {
        log.d("Cleaning TTL collections");
        for (let i = 0; i < plugins.ttlCollections.length; i++) {
            const { collection, property, expireAfterSeconds = 0 } = plugins.ttlCollections[i];
            const col = db.collection(collection);
            const result = await col.deleteMany({
                [property]: {
                    $lte: new Date(Date.now() - expireAfterSeconds * 1000)
                }
            });
            log.d("Cleaned up", result.deletedCount, "records from", collection);
        }
        log.d("Finished cleaning up TTL collections");
    }
}

module.exports = TTLCleanup;