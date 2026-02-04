/**
 * Mutation Manager Job
 * Handles delete/update operations for MongoDB and ClickHouse
 * @module api/jobs/mutationManagerJob
 */
import { createRequire } from 'module';
// @ts-expect-error TS1470 - import.meta works at runtime with Node 22+ native TS
const require = createRequire(import.meta.url);

import type { Db, ObjectId, Document } from 'mongodb';

const common = require('../utils/common.js');
const log = require("../utils/log.js")("job:mutationManager");
const Job = require("../../jobServer/Job.js");
const mutationManager = require('../utils/mutationManager.js');
const tracker = require("../parts/mgmt/tracker.js");
const plugins = require('../../plugins/pluginManager.ts');

interface JobConfig {
    STALE_MS: number;
    RETRY_DELAY_MS: number;
    MAX_RETRIES: number;
    VALIDATION_INTERVAL_MS: number;
    BATCH_LIMIT: number;
}

interface MutationTask extends Document {
    _id: ObjectId | string;
    type: 'delete' | 'update';
    db: string;
    collection: string;
    query: Record<string, unknown>;
    update?: Record<string, unknown>;
    running: boolean;
    status: string;
    hb?: number;
    ts?: number;
    batch_id?: string;
    fail_count?: number;
    error?: string;
    retry_at?: number;
    validation_command_id?: string;
}

interface SummaryEntry {
    query?: Record<string, unknown>;
    task?: Record<string, unknown>;
    status: string;
    error?: string;
    reason?: string;
}

interface GetScheduleConfig {
    type: 'once' | 'schedule' | 'now' | 'manual';
    value?: string | Date;
}

interface ClickhouseLoadMetrics {
    max_parts_per_partition: number;
    total_merge_tree_parts: number;
}

interface BackpressureResult {
    defer: boolean;
    reason?: string;
    metrics?: ClickhouseLoadMetrics;
    utilization?: number;
    thresholds?: Record<string, unknown>;
    risk_level?: string;
}

interface MutationStatus {
    is_done?: boolean;
    is_killed?: boolean;
    latest_fail_reason?: string;
}

interface ClickhouseRunner {
    deleteGranularDataByQuery?: (...args: unknown[]) => Promise<unknown>;
    updateGranularDataByQuery?: (...args: unknown[]) => Promise<unknown>;
}

interface ClickhouseHealth {
    getOperationalSnapshot?: (target: { database?: string; table?: string }) => Promise<{ max_parts_per_partition: number; total_merge_tree_parts: number } | null>;
    getMutationStatus?: (params: { validation_command_id?: string; table: string; database?: string }) => Promise<MutationStatus | null>;
    getBackpressureSnapshot?: (metrics: ClickhouseLoadMetrics) => Promise<{
        deferred_due_to_clickhouse?: boolean;
        risk_level?: string;
        defer_reason?: string;
        utilization?: number;
        thresholds?: Record<string, unknown>;
    }>;
}

interface ClusterManagerClass {
    new(config: Record<string, unknown>): { isClusterMode(): boolean };
}

const DEFAULT_JOB_CONFIG: JobConfig = {
    STALE_MS: 24 * 60 * 60 * 1000, // 24h - consider tasks running longer than this as stale
    RETRY_DELAY_MS: 30 * 60 * 1000, // 30m - delay before retrying a failed task
    MAX_RETRIES: 3, // Max number of retries before marking a task as failed
    VALIDATION_INTERVAL_MS: 3 * 60 * 1000, // 3m - interval between mutation status checks
    BATCH_LIMIT: 10 // Number of tasks to process in one run
};
let jobConfigState: JobConfig = { ...DEFAULT_JOB_CONFIG };

const MONGO_DATABASES: Record<string, () => Db | undefined> = {
    countly: () => common.db,
    countly_drill: () => common.drillDb,
    countly_out: () => common.outDb
};

/**
 * Get MongoDB database instance by name
 * @param name - Database name
 * @returns MongoDB database instance
 */
function getMongoDbInstance(name: string): Db | null {
    return name && typeof MONGO_DATABASES[name] !== 'undefined' ? MONGO_DATABASES[name]() || null : null;
}

let clickHouseRunner: ClickhouseRunner | undefined;
try {
    clickHouseRunner = require('../../plugins/clickhouse/api/queries/clickhouseCoreQueries.js');
}
catch {
    //
}

let chHealth: ClickhouseHealth | null = null;
try {
    chHealth = require('../../plugins/clickhouse/api/health.js');
}
catch {
    //
}

let ClusterManager: ClusterManagerClass | null = null;
try {
    ClusterManager = require('../../plugins/clickhouse/api/managers/ClusterManager');
}
catch {
    // ClusterManager not available (clickhouse plugin not loaded)
}

const countlyConfig = require('../config');

/**
 * Normalize mutation manager job configuration values
 * @param cfg - Raw configuration object from the DB
 * @returns Normalized configuration
 */
function buildJobConfig(cfg: Record<string, unknown> = {}): JobConfig {
    return {
        STALE_MS: common.isNumber(cfg.stale_ms) ? Number(cfg.stale_ms) : DEFAULT_JOB_CONFIG.STALE_MS,
        RETRY_DELAY_MS: common.isNumber(cfg.retry_delay_ms) ? Number(cfg.retry_delay_ms) : DEFAULT_JOB_CONFIG.RETRY_DELAY_MS,
        MAX_RETRIES: common.isNumber(cfg.max_retries) ? Number(cfg.max_retries) : DEFAULT_JOB_CONFIG.MAX_RETRIES,
        VALIDATION_INTERVAL_MS: common.isNumber(cfg.validation_interval_ms) ? Number(cfg.validation_interval_ms) : DEFAULT_JOB_CONFIG.VALIDATION_INTERVAL_MS,
        BATCH_LIMIT: common.isNumber(cfg.batch_limit) ? Number(cfg.batch_limit) : DEFAULT_JOB_CONFIG.BATCH_LIMIT
    };
}

/**
 * Fetch mutation manager job configuration from the plugins collection
 * @returns Job configuration
 */
async function loadMutationManagerJobConfig(): Promise<JobConfig> {
    if (!common.db) {
        return { ...DEFAULT_JOB_CONFIG };
    }

    try {
        const doc = await common.db.collection('plugins').findOne(
            { _id: 'plugins' },
            { projection: { 'mutation_manager.max_retries': 1, 'mutation_manager.retry_delay_ms': 1, 'mutation_manager.validation_interval_ms': 1, 'mutation_manager.stale_ms': 1, 'mutation_manager.batch_limit': 1 } }
        );
        const cfg = (doc && (doc as { mutation_manager?: Record<string, unknown> }).mutation_manager) || {};
        return buildJobConfig(cfg);
    }
    catch (e) {
        log.e("Failed to load mutation manager job config; using defaults", (e as Error)?.message || e);
        return { ...DEFAULT_JOB_CONFIG };
    }
}

/** Class for the mutation manager job **/
class MutationManagerJob extends Job {
    /**
     * Get schedule for the job
     * @returns Schedule configuration object
     */
    getSchedule(): GetScheduleConfig {
        return {
            type: "schedule",
            value: "* * * * *" // Every minute
        };
    }

    /**
     * Get concurrency for the job - do not allow run in parallel
     * @returns Concurrency level
     */
    getConcurrency(): number {
        return 1;
    }

    /**
     * Run the job
     */
    async run(): Promise<SummaryEntry[]> {
        jobConfigState = await loadMutationManagerJobConfig();
        const jobConfig = jobConfigState || DEFAULT_JOB_CONFIG;
        const now = Date.now();
        const batchId = common.db.ObjectID() + '';
        const summary: SummaryEntry[] = [];

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
            { $limit: jobConfig.BATCH_LIMIT },
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
        const toProcess: MutationTask[] = await common.db.collection("mutation_manager")
            .find({ batch_id: batchId, running: true, status: mutationManager.MUTATION_STATUS.RUNNING })
            .sort({ ts: 1 })
            .toArray();

        for (const task of toProcess) {
            try {
                await this.processTask(task, summary);
            }
            catch (e) {
                await this.markFailedOrRetry(task, ((e as Error) && (e as Error).message) || String(e));
                summary.push({ task: task.query, status: "error", error: ((e as Error) && (e as Error).message) || String(e) });
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
     * @param task - Task document
     * @param summary - Summary array to push statuses
     * @param jobConfig - Job configuration
     */
    async processTask(task: MutationTask, summary: SummaryEntry[], jobConfig: JobConfig = jobConfigState || DEFAULT_JOB_CONFIG): Promise<void> {
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

        const mongoDb = getMongoDbInstance(task.db);
        const clickhouseEnabled = mutationManager.isClickhouseEnabled();
        const hasClickhouseDelete = clickhouseEnabled && !!(clickHouseRunner && clickHouseRunner.deleteGranularDataByQuery);
        const hasClickhouseUpdate = clickhouseEnabled && !!(clickHouseRunner && clickHouseRunner.updateGranularDataByQuery);
        const hasClickhouse = (type === 'update' ? hasClickhouseUpdate : hasClickhouseDelete);

        if (!mongoDb && !hasClickhouse) {
            const reason = `mongo_db_unavailable:${task.db || 'missing'}`;
            log.e("Mutation task failed; Mongo database unavailable and ClickHouse disabled", { taskId: task._id, db: task.db });
            await this.markFailedOrRetry(task, reason);
            summary.push({ query: task.query, status: "failed", error: reason });
            return;
        }

        if (hasClickhouse) {
            try {
                const pre = await this.shouldDeferDueToClickhousePressure({ database: task.db, table: task.collection });
                if (pre && pre.defer) {
                    const now = Date.now();
                    await common.db.collection('mutation_manager').updateOne(
                        { _id: task._id },
                        { $set: { running: false, status: mutationManager.MUTATION_STATUS.QUEUED, hb: now, error: pre.reason || 'deferred_due_to_ch_pressure', retry_at: now + jobConfig.RETRY_DELAY_MS }, $unset: { batch_id: '' } }
                    );
                    summary.push({ query: task.query, status: 'deferred_due_to_ch_pressure', reason: pre.reason });
                    return;
                }
            }
            catch (e) {
                log.e('Per-task CH precheck failed; proceeding', ((e as Error)?.message || e + ""));
            }
        }

        let mongoOk = true;
        if (mongoDb) {
            if (type === 'update') {
                mongoOk = await this.updateMongo(task, mongoDb);
            }
            else {
                mongoOk = await this.deleteMongo(task, mongoDb);
            }
        }
        else {
            log.i("Mongo mutation skipped (unavailable database); continuing with ClickHouse only", { taskId: task._id, db: task.db });
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
                        retry_at: Date.now() + jobConfig.VALIDATION_INTERVAL_MS
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
     * @param summary - Summary array to push status logs
     * @param jobConfig - Job configuration
     * @returns Resolves when awaiting validation batch is processed
     */
    async processAwaitingValidation(summary: SummaryEntry[], jobConfig: JobConfig = jobConfigState || DEFAULT_JOB_CONFIG): Promise<void> {
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
            { $limit: jobConfig.BATCH_LIMIT },
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

        const awaiting: MutationTask[] = await common.db.collection("mutation_manager")
            .find({ batch_id: validationBatchId, running: true, status: mutationManager.MUTATION_STATUS.AWAITING_CH_MUTATION_VALIDATION })
            .sort({ ts: 1 })
            .toArray();

        let isClusterMode = false;
        if (ClusterManager) {
            try {
                const cm = new ClusterManager(countlyConfig.clickhouse || {});
                isClusterMode = cm.isClusterMode();
            }
            catch (e) {
                log.w('Could not determine cluster mode for validation table', (e as Error)?.message);
            }
        }

        for (const task of awaiting) {
            try {
                if (chHealth && typeof chHealth.getMutationStatus === 'function') {
                    // In cluster mode, mutations target _local tables, so validation must check _local
                    const validationTable = isClusterMode ? task.collection + '_local' : task.collection;
                    const status = await chHealth.getMutationStatus({ validation_command_id: task.validation_command_id, table: validationTable, database: task.db });
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
                                $set: { running: false, status: mutationManager.MUTATION_STATUS.AWAITING_CH_MUTATION_VALIDATION, hb: Date.now(), retry_at: Date.now() + jobConfig.VALIDATION_INTERVAL_MS },
                                $unset: { batch_id: "" }
                            }
                        );
                        summary.push({ query: task.query, status: "mutation_pending_recheck_scheduled" });
                    }
                }
            }
            catch (e) {
                log.e("Validation step failed", task._id, (e as Error)?.message || e + "");
                await this.markFailedOrRetry(task, "ch_process_awating_validation: " + ((e as Error)?.message || e + ""));
            }
        }
    }

    /**
     * Reset stale mutation tasks that have been running longer than STALE_MS.
     * @param jobConfig - Job configuration
     */
    async resetStaleTasks(jobConfig: JobConfig = jobConfigState || DEFAULT_JOB_CONFIG): Promise<void> {
        try {
            const now = Date.now();
            await common.db.collection("mutation_manager").updateMany(
                {
                    running: true,
                    $expr: { $lt: [{ $ifNull: ["$hb", "$ts"] }, now - jobConfig.STALE_MS] }
                },
                {
                    $set: { running: false, status: mutationManager.MUTATION_STATUS.QUEUED, hb: now, error: "stale_reset" },
                    $unset: { batch_id: "" }
                }
            );
        }
        catch (e) {
            log.e("resetStaleTasks failed", (e as Error)?.message || String(e));
        }
    }

    /**
     * Delete documents from MongoDB
     * @param task - The deletion task
     * @param mongoDb - MongoDB database instance
     */
    async deleteMongo(task: MutationTask, mongoDb?: Db | null): Promise<boolean> {
        if (!task.query || !Object.keys(task.query).length) {
            await this.markFailedOrRetry(task, "empty_mongo_query");
            return false;
        }

        const targetDb = mongoDb || getMongoDbInstance(task.db);
        if (!targetDb) {
            const reason = `mongo_db_unavailable:${task.db || 'missing'}`;
            log.e("Mongo deletion skipped (database unavailable)", { taskId: task._id, db: task.db });
            await this.markFailedOrRetry(task, reason);
            return false;
        }

        let res: { deletedCount?: number };
        const start = Date.now();
        try {
            res = await targetDb.collection(task.collection).deleteMany(task.query || {});
        }
        catch (err) {
            const duration = Date.now() - start;
            log.e("Mongo deletion failed", { taskId: task._id, durationMs: duration, error: ((err as Error)?.message || err + "") });
            await this.markFailedOrRetry(task, "mongo_delete_error: " + ((err as Error)?.message || err + ""));
            return false;
        }

        const duration = Date.now() - start;
        log.d("Mongo deletion done", { taskId: task._id, deletedCount: res?.deletedCount || 0, durationMs: duration });
        return true;
    }

    /**
     * Update documents in MongoDB
     * @param task - The mutation task
     * @param mongoDb - MongoDB database instance
     */
    async updateMongo(task: MutationTask, mongoDb?: Db | null): Promise<boolean> {
        if (!task.query || !Object.keys(task.query).length) {
            await this.markFailedOrRetry(task, "empty_mongo_query");
            return false;
        }
        if (!task.update || !Object.keys(task.update).length) {
            await this.markFailedOrRetry(task, "empty_mongo_update");
            return false;
        }

        const targetDb = mongoDb || getMongoDbInstance(task.db);
        if (!targetDb) {
            const reason = `mongo_db_unavailable:${task.db || 'missing'}`;
            log.e("Mongo update skipped (database unavailable)", { taskId: task._id, db: task.db });
            await this.markFailedOrRetry(task, reason);
            return false;
        }

        let res: { modifiedCount?: number };
        const start = Date.now();
        try {
            res = await targetDb.collection(task.collection).updateMany(task.query, task.update || {});
        }
        catch (err) {
            const duration = Date.now() - start;
            log.e("Mongo update failed", { taskId: task._id, durationMs: duration, error: ((err as Error)?.message || err + "") });
            await this.markFailedOrRetry(task, "mongo_update_error: " + ((err as Error)?.message || err + ""));
            return false;
        }
        const duration = Date.now() - start;
        log.d("Mongo update done", { taskId: task._id, modifiedCount: res?.modifiedCount || 0, durationMs: duration });
        return true;
    }

    /**
     * Deletes data from Clickhouse based on provided parameters.
     * @param task - Task object containing deletion parameters.
     * @returns query runner result
     */
    async deleteClickhouse(task: MutationTask): Promise<boolean> {
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
                    handler: clickHouseRunner!.deleteGranularDataByQuery
                }
            }
        };

        try {
            const retryIndex = Number(task.fail_count || 0);
            const commandId = `dm_${String(task._id)}_${retryIndex}`; // delete mutation

            await common.queryRunner.executeQuery(
                queryDef,
                { queryObj: task.query, targetTable: task.collection, db: task.db, validation_command_id: commandId },
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
                error: (err as Error) && (err as Error).message ? (err as Error).message : String(err)
            });
            await this.markFailedOrRetry(task, "clickhouse_delete_error: " + ((err as Error)?.message || err + ""));
            return false;
        }
    }

    /**
     * Schedules an update mutation in ClickHouse if supported
     * @param task - The mutation task
     */
    async updateClickhouse(task: MutationTask): Promise<boolean> {
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
                { queryObj: task.query, updateObj: task.update, targetTable: task.collection, db: task.db, validation_command_id: commandId },
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
                error: (err as Error) && (err as Error).message ? (err as Error).message : String(err)
            });
            await this.markFailedOrRetry(task, "clickhouse_update_error: " + ((err as Error)?.message || err + ""));
            return false;
        }
    }

    /**
     * Marks a task as failed or schedules it for a retry based on the number of previous failures.
     * @param task - The task object to update.
     * @param message - The error message to log
     * @param jobConfig - Job configuration
     */
    async markFailedOrRetry(task: MutationTask, message: string, jobConfig: JobConfig = jobConfigState || DEFAULT_JOB_CONFIG): Promise<void> {
        try {
            const now = Date.now();
            const failCount = (task.fail_count || 0) + 1;
            if (failCount >= jobConfig.MAX_RETRIES) {
                await common.db.collection("mutation_manager").updateOne(
                    { _id: task._id },
                    {
                        $set: { running: false, status: mutationManager.MUTATION_STATUS.FAILED, fail_count: failCount, error: message, hb: now },
                        $unset: { batch_id: "" }
                    }
                );
                await this.reportFailureToStats(
                    task,
                    'Some records could not be deleted and the maximum retry limit has been reached. Please review these records, otherwise they will remain on the server. ' +
                    message +
                    (
                        task.error ? ` | Task error: ${String(task.error).slice(0, 900)}` : ''
                    )
                );
            }
            else {
                await common.db.collection("mutation_manager").updateOne(
                    { _id: task._id },
                    {
                        $set: { running: false, status: mutationManager.MUTATION_STATUS.QUEUED, fail_count: failCount, error: message, retry_at: now + jobConfig.RETRY_DELAY_MS, hb: now },
                        $unset: { batch_id: "" }
                    }
                );
            }
        }
        catch (e) {
            log.e("markFailedOrRetry fallback", { taskId: task._id, err: ((e as Error) && (e as Error).message) || e });
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
     * @param target - Target database/table for load metrics
     * @returns Object with metrics or null if fetch failed
     */
    async getClickhouseLoadMetrics(target: { database?: string; table?: string } = {}): Promise<ClickhouseLoadMetrics | null> {
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
            log.e('CH health metrics fetch failed', (e as Error)?.message || e + "");
            return null;
        }
    }

    /**
     * Fetches ClickHouse load metrics to determine if a task should be deferred.
     * @param target - Target database/table for load metrics
     * @returns Whether to defer due to ClickHouse pressure
     */
    async shouldDeferDueToClickhousePressure(target: { database?: string; table?: string } = {}): Promise<BackpressureResult> {
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
                    defer: !!defer,
                    reason: bp.defer_reason || (bp.risk_level && `risk_${bp.risk_level}`) || undefined,
                    metrics: m,
                    utilization: bp.utilization,
                    thresholds: bp.thresholds,
                    risk_level: bp.risk_level
                };
            }
            catch (e) {
                log.e('Backpressure snapshot failed.', (e as Error)?.message || e + "");
            }
        }
        return { defer: false };
    }

    /**
     * Ensure tracker is enabled
     * @returns if enabled
     */
    ensureTracker(): boolean {
        try {
            if (!tracker || typeof tracker.isEnabled === 'undefined') {
                return false;
            }

            const trackingCfg = plugins.getConfig && plugins.getConfig('tracking');
            if (trackingCfg && trackingCfg.server_crashes === false) {
                return false;
            }

            if (tracker.isEnabled()) {
                return true;
            }

            if (typeof tracker.enable !== 'undefined') {
                tracker.enable();
            }
            return tracker.isEnabled();
        }
        catch (e) {
            log.e('ensureTracker failed', (e as Error)?.message || e + "");
            return false;
        }
    }

    /**
     * Report failed mutations to stats (crashes/new hook)
     * @param task - The mutation task
     * @param message - Failure reason
     */
    async reportFailureToStats(task: MutationTask, message: string): Promise<void> {
        try {
            if (!this.ensureTracker()) {
                return;
            }

            const Countly = tracker.getSDK && tracker.getSDK();
            const payload: Record<string, string> = {
                message: (message || '').toString().slice(0, 900),
                db: task && task.db || '',
                collection: task && task.collection || '',
                type: task && task.type || '',
                task_id: task && task._id ? String(task._id) : '',
                error: task && task.error ? String(task.error).slice(0, 900) : '',
                fail_count: String(task && task.fail_count || 0)
            };

            if (task && task.query) {
                try {
                    payload.query = JSON.stringify(task.query).slice(0, 900);
                }
                catch {
                    payload.query = '[unserializable_query]';
                }
            }
            if (Countly && typeof Countly.log_error !== 'undefined') {
                Countly.log_error(new Error(`mutation_manager_job_failed: ${payload.message || 'unknown'}`), payload);
            }
        }
        catch (e) {
            log.e("reportFailureToStats failed", (e as Error)?.message || e + "");
        }
    }
}

export default MutationManagerJob;
