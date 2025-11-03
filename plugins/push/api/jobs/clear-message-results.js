/**
 * @typedef {import("mongodb").Db} Db
 */
const { Job } = require('../../../../api/parts/jobs/job.js');
const log = require('../../../../api/utils/log.js')('push:clear-message-results');
const { loadPluginConfiguration } = require("../new/lib/utils.js");

/**
 * Job to clear old message results based on TTL configuration.
 */
class ClearMessageResultsJob extends Job {
    /**
     * Clears old message results based on TTL configuration.
     *
     * @param {Db} db - db object
     * @returns {Promise<void>} Promise that resolves when the job is complete
     */
    async run(db) {
        try {
            const pluginConfig = await loadPluginConfiguration(db);
            if (pluginConfig?.messageResultsTTL) {
                const result = await db.collection("message_results").deleteMany({
                    sentAt: {
                        $lt: new Date(Date.now() - pluginConfig.messageResultsTTL * 24 * 60 * 60 * 1000)
                    }
                });
                log.i(`Deleted ${result.deletedCount} old message results`);
            }
        }
        catch (error) {
            log.e("Error while deleting old message results", error);
        }
    }
}

module.exports = ClearMessageResultsJob;
