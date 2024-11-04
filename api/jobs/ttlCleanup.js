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
            const ttl = plugins.ttlCollections[i];
            let {
                collection,
                db,
                property,
                expireAfterSeconds = 0,
                // private for internal usage:
                isRunning = false,
                lastRun = 0,
            } = ttl;

            if (!db) {
                db = common.db;
            }

            // Check if the previous job for this collection is still running
            if (isRunning) {
                continue;
            }

            // Check if time has passed enough to run again
            if (lastRun + expireAfterSeconds * 1000 > Date.now()) {
                continue;
            }

            log.d("Started cleaning up", collection);
            ttl.isRunning = true;
            db.collection(collection)
                .deleteMany({
                    [property]: {
                        $lte: new Date(Date.now() - expireAfterSeconds * 1000)
                    }
                })
                .then(result => {
                    log.d("Finished cleaning up", result.deletedCount, "records from", collection);
                })
                .catch(err => {
                    log.e("Error while cleaning up ttl collection", collection, err);
                })
                .finally(() => {
                    ttl.isRunning = false;
                    ttl.lastRun = Date.now();
                });

            // Sleep 1 second to prevent sending too many deleteMany queries
            await new Promise(res => setTimeout(res, 1000));
        }
        log.d("Finished running TTL clean up job");
    }
}

module.exports = TTLCleanup;