const common = require('../utils/common.js');
const log = require("../utils/log.js")("job:deletionManager");
const Job = require("../../jobServer/Job.js");
const deletionManager = require('../utils/deletionManager.js');

let clickHouseRunner;
try {
    clickHouseRunner = require('../../plugins/clickhouse/api/queries/clickhouseCoreQueries.js');
}
catch {
    //
}

// Constants for managing stale tasks and retries
const STALE_MS = 24 * 60 * 60 * 1000; // 24h
const RETRY_DELAY_MS = 30 * 60 * 1000; // 30m
const MAX_RETRIES = 3;

const BATCH_LIMIT = 10; // Number of tasks to process in one run

/** Class for the deletion manager job **/
class DeletionManagerJob extends Job {
    /**
     * Get schedule for the job
     * @returns {GetScheduleConfig} Schedule configuration objectd
     */
    getSchedule() {
        return {
            type: "schedule",
            // value: "* * * * *" // Every minute
            value: "*/5 * * * *" // todo: Every 5 minutes for now to testing purposes.
        };
    }

    /**
     * Run the job
     * @param {done} done callback
    */
    async run() {
        const now = Date.now();
        const batchId = common.db.ObjectID() + '';
        const summary = [];

        // Reset stale tasks (running > 24h)
        await this.resetStaleTasks();

        // Reserve a batch of records to process
        await common.db.collection("deletion_manager").aggregate([
            {
                $match: {
                    running: false,
                    status: deletionManager.DELETION_STATUS.QUEUED,
                    $or: [{ retry_at: { $exists: false } }, { retry_at: null }, { retry_at: { $lte: now } }]
                }
            },
            { $sort: { ts: 1 } },
            { $limit: BATCH_LIMIT },
            { $set: { running: true, status: deletionManager.DELETION_STATUS.RUNNING, hb: now, error: null, batch_id: batchId } },
            {
                $merge: {
                    into: "deletion_manager",
                    on: "_id",
                    whenMatched: "merge",
                    whenNotMatched: "discard"
                }
            }
        ]).toArray();

        // Fetch and process the reserved batch
        const toProcess = await common.db.collection("deletion_manager")
            .find({ batch_id: batchId, running: true, status: deletionManager.DELETION_STATUS.RUNNING })
            .sort({ ts: 1 })
            .toArray();

        for (const task of toProcess) {
            try {
                if (task.db === "drill" && task.collection === "drill_events") {
                    const mongoOk = await this.deleteMongo(task);
                    let chOk = true;
                    if (clickHouseRunner && clickHouseRunner.deleteGranularDataByQuery) {
                        console.time("deletionManagerJob_4");
                        chOk = await this.deleteClickhouse(task);
                        console.timeEnd("deletionManagerJob_4");
                    }
                    if (mongoOk && chOk) {
                        await common.db.collection("deletion_manager").deleteOne({ _id: task._id });
                        summary.push({ query: task.query, status: "deleted" });
                    }
                    else {
                        summary.push({ query: task.query, status: "error" });
                    }
                }
            }
            catch (e) {
                await this.markFailedOrRetry(task, (e && e.message) || e);
                summary.push({ task: task.query, status: "error", error: (e && e.message) || e });
                log.e("Deletion task failed", task._id, e);
            }
        }
        return summary;
    }

    /**
     * Reset stale deletion tasks that have been running longer than STALE_MS.
     */
    async resetStaleTasks() {
        try {
            const now = Date.now();
            await common.db.collection("deletion_manager").updateMany(
                {
                    running: true,
                    $expr: { $lt: [{ $ifNull: ["$hb", "$ts"] }, now - STALE_MS] }
                },
                {
                    $set: { running: false, status: deletionManager.DELETION_STATUS.QUEUED, hb: now, error: "stale_reset" },
                    $unset: { batch_id: "" }
                }
            );
        }
        catch (e) {
            log.e("resetStaleTasks failed", e?.message || String(e));
        }
    }

    /**
     * Delete documents from MongoDB
     * @param {Object} task - The deletion task
     */
    async deleteMongo(task) {
        if (!task.query || !Object.keys(task.query).length) {
            await this.markFailedOrRetry(task, "empty_mongo_query");
            return false;
        }

        let res;
        try {
            res = await common.drillDb.collection(task.collection).deleteMany(task.query || {});
        }
        catch (err) {
            await this.markFailedOrRetry(task, "mongo_delete_error: " + err?.message || err + "");
            return false;
        }

        log.d("Mongo deletion done", { taskId: task._id, deletedCount: res?.deletedCount || 0 });
        return true;
    }

    /**
 * Deletes data from Clickhouse based on provided parameters.
 * @param {object} task - Task object containing deletion parameters.
 * @returns {Object} query runner result
 */
    async deleteClickhouse(task) {
        if (!common.queryRunner) {
            log.e("queryRunner not available, skipping ClickHouse delete", { taskId: task._id });
            await this.markFailedOrRetry(task, "queryRunner_unavailable");
            return false;
        }

        if (!task.query || !Object.keys(task.query).length) {
            log.e("Skipping ClickHouse delete (empty query)", { taskId: task._id });
            await this.markFailedOrRetry(task, "empty_ch_query");
            return false;
        }

        const queryDef = {
            name: 'DELETE_GRANULAR_DATA',
            adapters: {
                clickhouse: {
                    handler: clickHouseRunner.deleteGranularDataByQuery
                }
            }
        };

        try {
            await common.queryRunner.executeQuery(queryDef, { queryObj: task.query, targetTable: task.collection }, {});
            log.d("ClickHouse deletion scheduled (runner)", { taskId: task._id });
            return true;
        }
        catch (err) {
            log.e("ClickHouse deletion failed (runner)", {
                taskId: task._id,
                error: err && err.message ? err.message : String(err)
            });
            await this.markFailedOrRetry(task, "clickhouse_delete_error: " + (err?.message || err + ""));
            return false;
        }
    }

    /**
     * Marks a task as failed or schedules it for a retry based on the number of previous failures.
     * @param {Object} task - The task object to update.
     * @param {string} message - The error message to log
     */
    async markFailedOrRetry(task, message) {
        try {
            const now = Date.now();
            const failCount = (task.fail_count || 0) + 1;
            if (failCount >= MAX_RETRIES) {
                await common.db.collection("deletion_manager").updateOne(
                    { _id: task._id },
                    {
                        $set: { running: false, status: deletionManager.DELETION_STATUS.FAILED, fail_count: failCount, error: message, hb: now },
                        $unset: { batch_id: "" }
                    }
                );
            }
            else {
                await common.db.collection("deletion_manager").updateOne(
                    { _id: task._id },
                    {
                        $set: { running: false, status: deletionManager.DELETION_STATUS.QUEUED, fail_count: failCount, error: message, retry_at: now + RETRY_DELAY_MS, hb: now },
                        $unset: { batch_id: "" }
                    }
                );
            }
        }
        catch (e) {
            log.e("markFailedOrRetry fallback", { taskId: task && task._id, err: (e && e.message) || e });
            await common.db.collection("deletion_manager").updateOne(
                { _id: task._id },
                {
                    $set: { running: false, status: deletionManager.DELETION_STATUS.FAILED, error: message, hb: Date.now() },
                    $unset: { batch_id: "" }
                }
            );
        }
    }
}

module.exports = DeletionManagerJob;
