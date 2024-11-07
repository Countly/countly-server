const plugins = require("../../plugins/pluginManager.js");
const common = require('../utils/common');
const job = require("../parts/jobs/job.js");
const log = require("../utils/log.js")("job:ttlCleanup");

/**
 * Class for job of cleaning expired records inside ttl collections
 */
class TTLCleanup extends job.Job {
    /**
     * Run the job
     */
    async run() {
        log.d("Started running TTL clean up job");
        for (let i = 0; i < plugins.ttlCollections.length; i++) {
            const {
                db = "countly",
                collection,
                property,
                expireAfterSeconds = 0
            } = plugins.ttlCollections[i];
            let dbInstance;
            switch (db) {
            case "countly": dbInstance = common.db; break;
            case "countly_drill": dbInstance = common.drillDb; break;
            case "countly_out": dbInstance = common.outDb; break;
            }
            if (!dbInstance) {
                log.e("Invalid db selection:", db);
                continue;
            }

            log.d("Started cleaning up", collection);
            const result = await dbInstance.collection(collection).deleteMany({
                [property]: {
                    $lte: new Date(Date.now() - expireAfterSeconds * 1000)
                }
            });
            log.d("Finished cleaning up", result.deletedCount, "records from", collection);

            // Sleep 1 second to prevent sending too many deleteMany queries
            await new Promise(res => setTimeout(res, 1000));
        }
        log.d("Finished running TTL clean up job");
    }
}

module.exports = TTLCleanup;