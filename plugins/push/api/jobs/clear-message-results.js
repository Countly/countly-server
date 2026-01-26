/**
 * @typedef {import("../../../../types/pluginManager").Database} Database
 * @typedef {() => void} DoneCallback
 * @typedef {(i: number, j: number, message: string) => void} ProgressCallback
 * @typedef {{ type: string; value: string; }} ScheduleConfig
 */

const { Job } = require('../../../../jobServer/index.js');
const { loadPluginConfiguration } = require("../new/lib/utils.js");

/**
 * Job to clear old message results based on TTL configuration.
 */
class ClearMessageResultsJob extends Job {
    /**
     * Get the schedule configuration for the job.
     * @returns {ScheduleConfig} Schedule configuration object
     */
    getSchedule() {
        return {
            type: 'schedule',
            value: '0 0 * * *'
        };
    }

    /**
     * Clears old message results based on TTL configuration.
     *
     * @param {Database} db - Database connection
     * @param {DoneCallback} done - Callback to signal job completion
     * @param {ProgressCallback} progress - Progress reporting function
     */
    async run(db, done, progress) {
        try {
            this.log.i("Starting to clear old message results");
            const pluginConfig = await loadPluginConfiguration();
            if (pluginConfig?.messageResultsTTL) {
                const result = await db.collection("message_results").deleteMany({
                    sentAt: {
                        $lt: new Date(Date.now() - pluginConfig.messageResultsTTL * 24 * 60 * 60 * 1000)
                    }
                });
                this.log.i(`Deleted ${result.deletedCount} old message results`);
                progress(1, 1, "Task completed");
                done();
            }
        }
        catch (error) {
            this.log.e("Error while deleting old message results", error);
        }
    }
}

module.exports = ClearMessageResultsJob;
