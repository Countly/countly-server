const common = require('../utils/common.js');
const log = require("../utils/log.js")("job:mutationManager");
const Job = require("../../jobServer/Job.js");
const mutationManager = require('../utils/mutationManager.js');

let clickHouseRunner;
try {
    clickHouseRunner = require('../../plugins/clickhouse/api/queries/clickhouseCoreQueries.js');
}
catch {
    //
}

let chHealth = null;
try {
    chHealth = require('../../plugins/clickhouse/api/health.js');
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

/** Class for the mutation manager job **/
class MutationManagerJob extends Job {
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
        await common.db.collection("mutation_manager").aggregate([
            {
                $match: {
                    running: false,
                    status: mutationManager.MUTATION_STATUS.QUEUED,
                    $or: [{ retry_at: { $exists: false } }, { retry_at: null }, { retry_at: { $lte: now } }]
                }
            },
            { $sort: { ts: 1 } },
            { $limit: BATCH_LIMIT },
            { $set: { running: true, status: mutationManager.MUTATION_STATUS.RUNNING, hb: now, error: null, batch_id: batchId } },
            {
                $merge: {
                    into: "mutation_manager",
                    on: "_id",
                    whenMatched: "merge",
                    whenNotMatched: "discard"
                }
            }
        ]).toArray();

        // Fetch and process the reserved batch
        const toProcess = await common.db.collection("mutation_manager")
            .find({ batch_id: batchId, running: true, status: mutationManager.MUTATION_STATUS.RUNNING })
            .sort({ ts: 1 })
            .toArray();

        for (const task of toProcess) {
            try {
                await this.processTask(task, summary);
            }
            catch (e) {
                await this.markFailedOrRetry(task, (e && e.message) || e);
                summary.push({ task: task.query, status: "error", error: (e && e.message) || e });
                log.e("Mutation task failed", task._id, e);
            }
        }

        if (mutationManager.isClickhouseEnabled()) {
            await this.processAwaitingValidation(summary);
        }

        return summary;
    }

    /**
     * Process a single mutation task (delete/update)
     * @param {Object} task - Task document
     * @param {Array} summary - Summary array to push statuses
     */
    async processTask(task, summary) {
        const type = task.type;
        if (type !== 'delete' && type !== 'update') {
            await common.db.collection("mutation_manager").updateOne(
                { _id: task._id },
                {
                    $set: { running: false, status: mutationManager.MUTATION_STATUS.FAILED, hb: Date.now(), error: "invalid_type" },
                    $unset: { batch_id: "" }
                }
            );
            summary.push({ query: task.query, status: "failed", error: "invalid_type" });
            return;
        }

        const clickhouseEnabled = mutationManager.isClickhouseEnabled();
        const hasClickhouseDelete = clickhouseEnabled && !!(clickHouseRunner && clickHouseRunner.deleteGranularDataByQuery);
        const hasClickhouseUpdate = clickhouseEnabled && !!(clickHouseRunner && clickHouseRunner.updateGranularDataByQuery);
        const hasClickhouse = (type === 'update' ? hasClickhouseUpdate : hasClickhouseDelete);

        if (hasClickhouse) {
            try {
                const pre = await this.shouldDeferDueToClickhousePressure({ database: task.db, table: task.collection });
                if (pre && pre.defer) {
                    const now = Date.now();
                    await common.db.collection('mutation_manager').updateOne(
                        { _id: task._id },
                        { $set: { running: false, status: mutationManager.MUTATION_STATUS.QUEUED, hb: now, error: pre.reason || 'deferred_due_to_ch_pressure', retry_at: now + RETRY_DELAY_MS }, $unset: { batch_id: '' } }
                    );
                    summary.push({ query: task.query, status: 'deferred_due_to_ch_pressure', reason: pre.reason });
                    return;
                }
            }
            catch (e) {
                log.e('Per-task CH precheck failed; proceeding', (e?.message || e + ""));
            }
        }

        let mongoOk = false;
        if (type === 'update') {
            mongoOk = await this.updateMongo(task);
        }
        else {
            mongoOk = await this.deleteMongo(task);
        }

        let chScheduledOk = true;
        if (type === 'update' && hasClickhouseUpdate) {
            chScheduledOk = await this.updateClickhouse(task);
        }
        else if (type === 'delete' && hasClickhouseDelete) {
            chScheduledOk = await this.deleteClickhouse(task);
        }

        if (mongoOk && hasClickhouse && chScheduledOk) {
            await common.db.collection("mutation_manager").updateOne(
                { _id: task._id },
                {
                    $set: {
                        running: false,
                        status: mutationManager.MUTATION_STATUS.AWAITING_CH_MUTATION_VALIDATION,
                        hb: Date.now(),
                        retry_at: Date.now() + VALIDATION_INTERVAL_MS
                    },
                    $unset: { batch_id: "" }
                }
            );
            summary.push({ query: task.query, status: "awaiting_validation" });
        }
        else if (mongoOk && !hasClickhouse) {
            await common.db.collection("mutation_manager").updateOne(
                { _id: task._id },
                {
                    $set: {
                        running: false,
                        status: mutationManager.MUTATION_STATUS.COMPLETED,
                        hb: Date.now(),
                        mutation_completion_ts: new Date()
                    },
                    $unset: { batch_id: "" }
                }
            );
            summary.push({ query: task.query, status: type === 'update' ? "updated" : "deleted" });
        }
        else {
            summary.push({ query: task.query, status: "error" });
        }
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
        await common.db.collection("mutation_manager").aggregate([
            {
                $match: {
                    running: false,
                    status: mutationManager.MUTATION_STATUS.AWAITING_CH_MUTATION_VALIDATION,
                    $or: [{ retry_at: { $exists: false } }, { retry_at: null }, { retry_at: { $lte: nowTs } }]
                }
            },
            { $sort: { ts: 1 } },
            { $limit: BATCH_LIMIT },
            { $set: { running: true, hb: nowTs, batch_id: validationBatchId } },
            {
                $merge: {
                    into: "mutation_manager",
                    on: "_id",
                    whenMatched: "merge",
                    whenNotMatched: "discard"
                }
            }
        ]).toArray();

        const awaiting = await common.db.collection("mutation_manager")
            .find({ batch_id: validationBatchId, running: true, status: mutationManager.MUTATION_STATUS.AWAITING_CH_MUTATION_VALIDATION })
            .sort({ ts: 1 })
            .toArray();

        for (const task of awaiting) {
            try {
                if (chHealth && typeof chHealth.getMutationStatus === 'function') {
                    const status = await chHealth.getMutationStatus({ validation_command_id: task.validation_command_id, table: task.collection, database: task.db });
                    if (status && status.is_done) {
                        await common.db.collection("mutation_manager").updateOne(
                            { _id: task._id },
                            {
                                $set: {
                                    running: false,
                                    status: mutationManager.MUTATION_STATUS.COMPLETED,
                                    hb: Date.now(),
                                    mutation_completion_ts: new Date()
                                },
                                $unset: { batch_id: "" }
                            }
                        );
                        summary.push({ query: task.query, status: "validated_completed_marked" });
                    }
                    else if (status && (status.is_killed || status.latest_fail_reason)) {
                        await common.db.collection("mutation_manager").updateOne(
                            { _id: task._id },
                            {
                                $set: { running: false, status: mutationManager.MUTATION_STATUS.FAILED, hb: Date.now(), error: status.latest_fail_reason || "mutation_killed" },
                                $unset: { batch_id: "" }
                            }
                        );
                        summary.push({ query: task.query, status: "failed", error: status.latest_fail_reason || "mutation_killed" });
                    }
                    else {
                        await common.db.collection("mutation_manager").updateOne(
                            { _id: task._id },
                            {
                                $set: { running: false, status: mutationManager.MUTATION_STATUS.AWAITING_CH_MUTATION_VALIDATION, hb: Date.now(), retry_at: Date.now() + VALIDATION_INTERVAL_MS },
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
     * Reset stale mutation tasks that have been running longer than STALE_MS.
     */
    async resetStaleTasks() {
        try {
            const now = Date.now();
            await common.db.collection("mutation_manager").updateMany(
                {
                    running: true,
                    $expr: { $lt: [{ $ifNull: ["$hb", "$ts"] }, now - STALE_MS] }
                },
                {
                    $set: { running: false, status: mutationManager.MUTATION_STATUS.QUEUED, hb: now, error: "stale_reset" },
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
        const start = Date.now();
        try {
            res = await common.drillDb.collection(task.collection).deleteMany(task.query || {});
        }
        catch (err) {
            const duration = Date.now() - start;
            log.e("Mongo deletion failed", { taskId: task._id, durationMs: duration, error: (err?.message || err + "") });
            await this.markFailedOrRetry(task, "mongo_delete_error: " + (err?.message || err + ""));
            return false;
        }

        const duration = Date.now() - start;
        log.d("Mongo deletion done", { taskId: task._id, deletedCount: res?.deletedCount || 0, durationMs: duration });
        return true;
    }

    /**
     * Update documents in MongoDB
     * @param {Object} task - The mutation task
     */
    async updateMongo(task) {
        if (!task.query || !Object.keys(task.query).length) {
            await this.markFailedOrRetry(task, "empty_mongo_query");
            return false;
        }
        if (!task.update || !Object.keys(task.update).length) {
            await this.markFailedOrRetry(task, "empty_mongo_update");
            return false;
        }
        let res;
        const start = Date.now();
        try {
            res = await common.drillDb.collection(task.collection).updateMany(task.query, task.update || {});
        }
        catch (err) {
            const duration = Date.now() - start;
            log.e("Mongo update failed", { taskId: task._id, durationMs: duration, error: (err?.message || err + "") });
            await this.markFailedOrRetry(task, "mongo_update_error: " + (err?.message || err + ""));
            return false;
        }
        const duration = Date.now() - start;
        log.d("Mongo update done", { taskId: task._id, modifiedCount: res?.modifiedCount || 0, durationMs: duration });
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
            const commandId = `dm_${String(task._id)}_${retryIndex}`; // delete mutation

            await common.queryRunner.executeQuery(
                queryDef,
                { queryObj: task.query, targetTable: task.collection, validation_command_id: commandId },
                {}
            );
            await common.db.collection("mutation_manager").updateOne(
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
     * Schedules an update mutation in ClickHouse if supported
     * @param {Object} task - The mutation task
     */
    async updateClickhouse(task) {
        if (!common.queryRunner) {
            log.e("queryRunner not available, skipping ClickHouse update", { taskId: task._id });
            await this.markFailedOrRetry(task, "queryRunner_unavailable");
            return false;
        }
        if (!task.query || !Object.keys(task.query).length) {
            log.e("Skipping ClickHouse update (empty query)", { taskId: task._id });
            await this.markFailedOrRetry(task, "empty_ch_query");
            return false;
        }
        if (!task.update || !Object.keys(task.update).length) {
            log.e("Skipping ClickHouse update (empty update)", { taskId: task._id });
            await this.markFailedOrRetry(task, "empty_ch_update");
            return false;
        }
        if (!clickHouseRunner || typeof clickHouseRunner.updateGranularDataByQuery !== 'function') {
            log.e("ClickHouse update handler not available; skipping CH update", { taskId: task._id });
            return false;
        }
        const queryDef = {
            name: 'UPDATE_GRANULAR_DATA',
            adapters: {
                clickhouse: {
                    handler: clickHouseRunner.updateGranularDataByQuery
                }
            }
        };
        try {
            const retryIndex = Number(task.fail_count || 0);
            const commandId = `um_${String(task._id)}_${retryIndex}`; // update mutation
            await common.queryRunner.executeQuery(
                queryDef,
                { queryObj: task.query, updateObj: task.update, targetTable: task.collection, validation_command_id: commandId },
                {}
            );
            await common.db.collection("mutation_manager").updateOne(
                { _id: task._id },
                { $set: { validation_command_id: commandId } }
            );
            log.d("ClickHouse update scheduled (runner)", { taskId: task._id, commandId });
            return true;
        }
        catch (err) {
            log.e("ClickHouse update failed (runner)", {
                taskId: task._id,
                error: err && err.message ? err.message : String(err)
            });
            await this.markFailedOrRetry(task, "clickhouse_update_error: " + (err?.message || err + ""));
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
                await common.db.collection("mutation_manager").updateOne(
                    { _id: task._id },
                    {
                        $set: { running: false, status: mutationManager.MUTATION_STATUS.FAILED, fail_count: failCount, error: message, hb: now },
                        $unset: { batch_id: "" }
                    }
                );
            }
            else {
                await common.db.collection("mutation_manager").updateOne(
                    { _id: task._id },
                    {
                        $set: { running: false, status: mutationManager.MUTATION_STATUS.QUEUED, fail_count: failCount, error: message, retry_at: now + RETRY_DELAY_MS, hb: now },
                        $unset: { batch_id: "" }
                    }
                );
            }
        }
        catch (e) {
            log.e("markFailedOrRetry fallback", { taskId: task._id, err: (e && e.message) || e });
            await common.db.collection("mutation_manager").updateOne(
                { _id: task._id },
                {
                    $set: { running: false, status: mutationManager.MUTATION_STATUS.FAILED, error: message, hb: Date.now() },
                    $unset: { batch_id: "" }
                }
            );
        }
    }

    /**
     * Fetches ClickHouse load metrics to determine if mutation should be deferred.
     * @param {Object} [target] - Target database/table for load metrics
     * @returns {Promise<Object|null>} Object with metrics or null if fetch failed
     */
    async getClickhouseLoadMetrics(target = {}) {
        if (!chHealth || typeof chHealth.getOperationalSnapshot !== 'function') {
            return null;
        }
        try {
            const snapshot = await chHealth.getOperationalSnapshot({ database: target.database, table: target.table });
            return snapshot ? {
                max_parts_per_partition: snapshot.max_parts_per_partition,
                total_merge_tree_parts: snapshot.total_merge_tree_parts
            } : null;
        }
        catch (e) {
            log.e('CH health metrics fetch failed', e?.message || e + "");
            return null;
        }
    }

    /**
     * Fetches ClickHouse load metrics to determine if a task should be deferred.
     * @param {Object} [target] - Target database/table for load metrics
     * @returns {object} Whether to defer due to ClickHouse pressure
     */
    async shouldDeferDueToClickhousePressure(target = {}) {
        const m = await this.getClickhouseLoadMetrics(target);
        if (!m) {
            return { defer: false };
        }
        if (chHealth && typeof chHealth.getBackpressureSnapshot === 'function') {
            try {
                const bp = await chHealth.getBackpressureSnapshot({
                    max_parts_per_partition: m.max_parts_per_partition,
                    total_merge_tree_parts: m.total_merge_tree_parts
                });
                const defer = bp.deferred_due_to_clickhouse || bp.risk_level === 'high';
                return {
                    defer,
                    reason: bp.defer_reason || (bp.risk_level && `risk_${bp.risk_level}`) || undefined,
                    metrics: m,
                    utilization: bp.utilization,
                    thresholds: bp.thresholds,
                    risk_level: bp.risk_level
                };
            }
            catch (e) {
                log.e('Backpressure snapshot failed.', e?.message || e + "");
            }
        }
    }
}

module.exports = MutationManagerJob;