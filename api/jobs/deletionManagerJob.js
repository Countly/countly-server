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
const STALE_MS = 24 * 60 * 60 * 1000; // 24h - consider tasks running longer than this as stale
const RETRY_DELAY_MS = 30 * 60 * 1000; // 30m - delay before retrying a failed task
const MAX_RETRIES = 3; // Max number of retries before marking a task as failed
const VALIDATION_INTERVAL_MS = 3 * 60 * 1000; // 3m - interval between mutation status checks

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
            value: "* * * * *" // Every minute
        };
    }

    /**
     * Get concurrency for the job - do not allow run in parallel
     * @returns {number} Concurrency level
     */
    getConcurrency() {
        return 1;
    }

    /**
     * Check if ClickHouse is enabled
     * @returns {boolean} true if ClickHouse is enabled, false otherwise
     */
    isClickhouseEnabled() {
        const adapters = common.config && common.config.database && common.config.database.adapters;
        return !!(adapters && adapters.clickhouse && adapters.clickhouse.enabled === true);
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
                if (task.db === "countly_drill" && task.collection === "drill_events") {
                    const mongoOk = await this.deleteMongo(task);
                    let chScheduledOk = true;
                    const hasClickhouse = this.isClickhouseEnabled() && !!(clickHouseRunner && clickHouseRunner.deleteGranularDataByQuery);
                    if (hasClickhouse) {
                        chScheduledOk = await this.deleteClickhouse(task);
                    }
                    if (mongoOk && hasClickhouse && chScheduledOk) {
                        await common.db.collection("deletion_manager").updateOne(
                            { _id: task._id },
                            {
                                $set: {
                                    running: false,
                                    status: deletionManager.DELETION_STATUS.AWAITING_CH_MUTATION_VALIDATION,
                                    hb: Date.now(),
                                    retry_at: Date.now() + VALIDATION_INTERVAL_MS
                                },
                                $unset: { batch_id: "" }
                            }
                        );
                        summary.push({ query: task.query, status: "awaiting_validation" });
                    }
                    else if (mongoOk && !hasClickhouse) {
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

        if (this.isClickhouseEnabled()) {
            await this.processAwaitingValidation(summary);
        }

        return summary;
    }

    /**
     * Processes a batch of tasks awaiting ClickHouse mutation validation.
     * Reserves a batch, checks mutation status via system.mutations and updates/deletes tasks accordingly.
     * @param {Array} summary - Summary array to push status logs
     * @returns {Promise<void>} Resolves when awaiting validation batch is processed
     */
    async processAwaitingValidation(summary) {
        const validationBatchId = common.db.ObjectID() + '';
        const nowTs = Date.now();
        await common.db.collection("deletion_manager").aggregate([
            {
                $match: {
                    running: false,
                    status: deletionManager.DELETION_STATUS.AWAITING_CH_MUTATION_VALIDATION,
                    $or: [{ retry_at: { $exists: false } }, { retry_at: null }, { retry_at: { $lte: nowTs } }]
                }
            },
            { $sort: { ts: 1 } },
            { $limit: BATCH_LIMIT },
            { $set: { running: true, hb: nowTs, batch_id: validationBatchId } },
            {
                $merge: {
                    into: "deletion_manager",
                    on: "_id",
                    whenMatched: "merge",
                    whenNotMatched: "discard"
                }
            }
        ]).toArray();

        const awaiting = await common.db.collection("deletion_manager")
            .find({ batch_id: validationBatchId, running: true, status: deletionManager.DELETION_STATUS.AWAITING_CH_MUTATION_VALIDATION })
            .sort({ ts: 1 })
            .toArray();

        for (const task of awaiting) {
            try {
                if (task.db === "countly_drill" && task.collection === "drill_events" && clickHouseRunner && clickHouseRunner.getMutationStatus) {
                    const status = await this.getClickhouseMutationStatus(task);
                    if (status && status.is_done) {
                        await common.db.collection("deletion_manager").deleteOne({ _id: task._id });
                        summary.push({ query: task.query, status: "validated_deleted" });
                    }
                    else if (status && (status.is_killed || status.latest_fail_reason)) {
                        await common.db.collection("deletion_manager").updateOne(
                            { _id: task._id },
                            {
                                $set: { running: false, status: deletionManager.DELETION_STATUS.FAILED, hb: Date.now(), error: status.latest_fail_reason || "mutation_killed" },
                                $unset: { batch_id: "" }
                            }
                        );
                        summary.push({ query: task.query, status: "failed", error: status.latest_fail_reason || "mutation_killed" });
                    }
                    else {
                        await common.db.collection("deletion_manager").updateOne(
                            { _id: task._id },
                            {
                                $set: { running: false, status: deletionManager.DELETION_STATUS.AWAITING_CH_MUTATION_VALIDATION, hb: Date.now(), retry_at: Date.now() + VALIDATION_INTERVAL_MS },
                                $unset: { batch_id: "" }
                            }
                        );
                        summary.push({ query: task.query, status: "mutation_pending_recheck_scheduled" });
                    }
                }
            }
            catch (e) {
                log.e("Validation step failed", task._id, e?.message || e + "");
                await this.markFailedOrRetry(task, "ch_process_awating_validation: " + e?.message || e + "");
            }
        }
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
            const retryIndex = Number(task.fail_count || 0);
            const commandId = `dm_${String(task._id)}_${retryIndex}`;

            await common.queryRunner.executeQuery(
                queryDef,
                { queryObj: task.query, targetTable: task.collection, validation_command_id: commandId },
                {}
            );
            await common.db.collection("deletion_manager").updateOne(
                { _id: task._id },
                { $set: { validation_command_id: commandId } }
            );
            log.d("ClickHouse deletion scheduled (runner)", { taskId: task._id, commandId });
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
     * Retrieves ClickHouse mutation status for a task via system.mutations.
     * @param {object} task - Deletion task
     * @returns {Promise<object|null>} Object with keys: is_done:boolean, is_killed:boolean, latest_fail_reason:string|null
     */
    async getClickhouseMutationStatus(task) {
        if (!common.queryRunner) {
            return null;
        }
        const commandId = task.validation_command_id;
        const queryDef = {
            name: 'GET_MUTATION_STATUS',
            adapters: {
                clickhouse: {
                    handler: clickHouseRunner.getMutationStatus
                }
            }
        };
        try {
            const res = await common.queryRunner.executeQuery(queryDef, { validation_command_id: commandId, table: task.collection, database: task.db }, {});
            return res ? { is_done: !!res.is_done, is_killed: !!res.is_killed, latest_fail_reason: res.latest_fail_reason || null } : null;
        }
        catch (err) {
            log.e("getClickhouseMutationStatus failed", { taskId: task._id, error: err?.message || err + "" });
            return null;
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
            log.e("markFailedOrRetry fallback", { taskId: task._id, err: (e && e.message) || e });
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
