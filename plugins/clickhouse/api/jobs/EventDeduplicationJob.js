// jobs/EventDeduplicationJob.js
//
// Nightly job that detects and removes duplicate events from the drill_events
// table based on the _id column. Scans from the last successful checkpoint to now
// (falling back to a 26-hour window on first run or checkpoint failure), finds
// _id values with count > 1, and dispatches DELETE mutations through
// mutationManager for execution, tracking, and retry.
//
// Key guarantees:
// - Idempotent: re-running on already-deduped data is a no-op.
// - Time-window scoped: mutations are bounded to the cd window only.
// - Anomaly detection: aborts if duplicate ratio exceeds threshold.
// - Cluster-safe: uses _local tables + ON CLUSTER for mutations.
// - Observable: all mutations visible in the mutation-status dashboard.
// - Backpressure/retry: handled by mutationManager automatically.

const job = require("../../../../jobServer");
const common = require('../../../../api/utils/common.js');
const plugins = require('../../../pluginManager.ts');
const QueryHelpers = require('../QueryHelpers');
const ClusterManager = require('../managers/ClusterManager');
const countlyConfig = require('../../../../api/config');

const DISCOVERY_LIMIT = 100000; // Max duplicate groups to discover per run
const MUTATION_BATCH_SIZE = 200; // IDs per DELETE statement (~40KB SQL)
const ANOMALY_THRESHOLD = 0.1;
const WINDOW_HOURS = 26;
const MAX_WINDOW_HOURS = 7 * 24; // 168 hours max lookback cap
const CHECKPOINT_ID = '_eventDeduplicationCheckpoint';

// Safety-net ClickHouse setting to prevent query size errors.
// http_max_field_value_size is a server-level setting (not query-overridable),
// but the single-pass design keeps query params small enough to not need it.
const CH_SETTINGS = {
    max_query_size: 10 * 1024 * 1024
};

/**
 * Get cluster-aware table configuration.
 * Returns both the fully-resolved mutation table (with _local suffix) for SQL building,
 * and the base table name for mutationManager's validation flow (which appends _local itself).
 * @returns {{dbName: string, mutationFull: string, baseTable: string, selectFull: string, onCluster: string}} Table configuration
 */
function getTableConfig() {
    const cm = new ClusterManager(countlyConfig.clickhouse || {});
    const mutationFull = QueryHelpers.resolveTable('drill_events', { forMutation: true });
    const selectFull = QueryHelpers.resolveTable('drill_events');
    const [dbName] = mutationFull.split('.');
    const isClusterMode = cm.isClusterMode();
    const onCluster = isClusterMode ? cm.getOnClusterClause() : '';
    return {
        dbName,
        mutationFull, // e.g. countly_drill.drill_events_local (for SQL)
        baseTable: 'drill_events', // base name (for mutationManager collection field)
        selectFull,
        onCluster
    };
}

/**
 * Represents a job responsible for deduplicating event data in a database.
 * This class extends the base Job class and implements specific configurations
 * and logic required to detect and remove duplicate entries from a database table.
 */
class EventDeduplicationJob extends job.Job {

    /**
     * Get the schedule configuration for this job.
     * @returns {GetScheduleConfig} The schedule configuration object.
     * @property {string} type - The type of schedule. In this case, it's 'schedule'.
     * @property {string} value - The cron expression defining the job's schedule.
     * The expression specifies when the job should run: once per day at 03:30.
     */
    getSchedule() {
        return { type: 'schedule', value: '30 3 * * *' };
    }

    /**
     * This method is called by the job server when the job is scheduled to run.
     * It performs the following steps:
     * 1. Computes the window bounds (start and end times) based on the current time.
     * 2. Discovers the total number of rows in the window and the first batch of duplicates.
     * 3. Performs anomaly detection based on the duplicate ratio.
     * 4. Dispatches DELETE mutations for each batch of duplicates.
     * 5. Returns a result object indicating the job's status, number of batches processed,
     *    total number of mutations dispatched, and other relevant information.
     * @param {Database} db - The database connection object.
     * @param {function} done - The callback function to be called when the job is complete.
     * @param {function} progress - The callback function to be called to report progress.
     * @returns {Promise<void>} A promise that resolves when the job completes.
     */
    async run(db, done, progress) {
        const t0 = Date.now();

        try {
            this.log.i("Event deduplication job: start");

            const queryService = common.clickhouseQueryService;
            if (!queryService) {
                return done({ error: 'ClickHouse query service not available' }, null);
            }
            const tableConfig = getTableConfig();

            // ---- 0) Load checkpoint from last completed run ----
            const checkpoint = await this.#loadCheckpoint(db);
            if (checkpoint) {
                this.log.i(`Loaded checkpoint: windowEnd=${checkpoint} (${new Date(checkpoint).toISOString()})`);
            }
            else {
                this.log.d('No checkpoint found, using WINDOW_HOURS fallback');
            }

            this.log.d("Config", {
                DISCOVERY_LIMIT,
                MUTATION_BATCH_SIZE,
                ANOMALY_THRESHOLD,
                WINDOW_HOURS,
                MAX_WINDOW_HOURS,
                mutationTable: tableConfig.mutationFull,
                selectTable: tableConfig.selectFull
            });

            // ---- 1) Compute window bounds ----
            const { windowStart, windowEnd } = this.#getWindowBounds(checkpoint);
            this.log.d("Window", { windowStart, windowEnd });

            // ---- 2) Single-pass: count total rows + discover ALL duplicates in parallel ----
            await progress(0, 0, "Scanning window for rows and duplicates...");
            const windowParams = { start: windowStart, end: windowEnd };
            const [totalRows, discovery] = await Promise.all([
                this.#getTotalRowsInWindow(queryService, tableConfig, windowParams),
                this.#discoverDuplicates(queryService, tableConfig, windowParams)
            ]);

            if (totalRows === 0) {
                const res = { status: 'no_data', message: 'No rows found in window', windowStart, windowEnd, durationMs: Date.now() - t0 };
                this.log.i(res.message, res);
                return done(null, res);
            }

            this.log.i(`Total rows in window: ${totalRows.toLocaleString()}`);

            const hitDiscoveryLimit = discovery.rows.length > DISCOVERY_LIMIT;
            const allDuplicates = hitDiscoveryLimit ? discovery.rows.slice(0, DISCOVERY_LIMIT) : discovery.rows;
            if (hitDiscoveryLimit) {
                this.log.w(`Discovery limit reached (${DISCOVERY_LIMIT}), anomaly ratio may be approximate`);
            }

            // ---- 3) Anomaly check ----
            if (discovery.totalExcess > 0) {
                const dupRatio = discovery.totalExcess / totalRows;
                this.log.i(`Duplicate rows: ${discovery.totalExcess} / ${totalRows} (${(dupRatio * 100).toFixed(2)}%)`);
                if (dupRatio >= ANOMALY_THRESHOLD) {
                    const res = {
                        status: 'anomaly_abort',
                        message: `Duplicate ratio ${(dupRatio * 100).toFixed(2)}% exceeds threshold ${(ANOMALY_THRESHOLD * 100).toFixed(2)}%`,
                        totalRows,
                        totalDuplicateRows: discovery.totalExcess,
                        duplicateRatio: dupRatio,
                        windowStart,
                        windowEnd,
                        durationMs: Date.now() - t0
                    };
                    this.log.e("Anomaly detected - aborting", res);
                    return done({ error: res.message, ...res }, null);
                }
            }

            if (allDuplicates.length === 0) {
                const res = { status: 'completed', message: 'No duplicates found', totalRowsInWindow: totalRows, windowStart, windowEnd, durationMs: Date.now() - t0 };
                this.log.i(res.message, res);
                await this.#saveCheckpoint(db, windowEnd, res);
                await progress(1, 1, "Complete");
                return done(null, res);
            }

            // ---- 4) Chunk duplicates into small mutation batches and dispatch ----
            const totalDuplicateIds = allDuplicates.length;
            const totalDuplicateRows = allDuplicates.reduce((sum, d) => sum + (Number(d.cnt) - 1), 0);
            const totalChunks = Math.ceil(totalDuplicateIds / MUTATION_BATCH_SIZE);
            let mutationsDispatched = 0;

            this.log.i(`Discovered ${totalDuplicateIds} duplicate _id groups (${totalDuplicateRows} extra rows), dispatching ${totalChunks} mutations`);

            for (let i = 0; i < totalDuplicateIds; i += MUTATION_BATCH_SIZE) {
                const chunkIndex = Math.floor(i / MUTATION_BATCH_SIZE);
                await progress(totalChunks, chunkIndex, `Dispatching mutation ${chunkIndex + 1}/${totalChunks}...`);

                const chunk = allDuplicates.slice(i, i + MUTATION_BATCH_SIZE);
                const chunkDupRows = chunk.reduce((sum, d) => sum + (Number(d.cnt) - 1), 0);
                const deleteSQL = this.#buildDeleteSQL(tableConfig, chunk, windowStart, windowEnd);

                await plugins.dispatchAsPromise("/core/execute_native_ch_mutation", {
                    sql: deleteSQL,
                    db: tableConfig.dbName,
                    collection: tableConfig.baseTable,
                    metadata: { source: 'EventDeduplicationJob', batch: chunkIndex, idsCount: chunk.length, rowsToDelete: chunkDupRows }
                });
                mutationsDispatched++;
            }

            // ---- 5) Result ----
            const status = hitDiscoveryLimit ? 'discovery_limit_reached' : 'completed';
            const result = {
                status,
                hitDiscoveryLimit,
                mutationsDispatched,
                totalDuplicateIds,
                totalDuplicateRows,
                totalRowsInWindow: totalRows,
                checkpointUsed: checkpoint !== null,
                windowStart,
                windowEnd,
                durationMs: Date.now() - t0,
                config: { DISCOVERY_LIMIT, MUTATION_BATCH_SIZE, ANOMALY_THRESHOLD, WINDOW_HOURS, MAX_WINDOW_HOURS }
            };

            // Persist checkpoint only on fully completed runs — if the discovery limit
            // was reached there may be remaining duplicates, so the next run must
            // re-scan from the same starting point.
            if (status === 'completed') {
                await this.#saveCheckpoint(db, windowEnd, result);
            }
            else {
                this.log.w(`Discovery limit reached (${DISCOVERY_LIMIT}) — checkpoint NOT advanced, next run will re-scan`);
            }

            await progress(totalChunks, totalChunks, "Complete");
            this.log.i("Event deduplication job: complete", result);
            return done(null, result);
        }
        catch (error) {
            const durationMs = Date.now() - t0;
            this.log.e("Event deduplication job: failed", { error: error.message, stack: error.stack, durationMs });
            return done({ error: error.message, stack: error.stack, durationMs }, null);
        }
    }

    // ─── Private helpers ───────────────────────────────────────────────

    /**
     * Execute a ClickHouse query and return parsed JSON rows.
     * @param {object} queryService - ClickHouse query service instance (common.clickhouseQueryService)
     * @param {string} query - SQL query string (may contain parameterized placeholders)
     * @param {object} [queryParams] - Parameter values for parameterized query placeholders
     * @returns {Promise<object[]>} Parsed rows from JSONEachRow format
     */
    async #queryJSON(queryService, query, queryParams) {
        const opts = { query, format: 'JSONEachRow', clickhouse_settings: CH_SETTINGS };
        if (queryParams) {
            opts.query_params = queryParams;
        }
        const res = await queryService.client.query(opts);
        return res.json();
    }

    /**
     * Load the last successful run's checkpoint from MongoDB.
     * @param {Database} db - MongoDB connection
     * @returns {Promise<number|null>} Last windowEnd in epoch milliseconds, or null
     */
    async #loadCheckpoint(db) {
        try {
            const doc = await db.collection('plugins').findOne(
                { _id: CHECKPOINT_ID },
                { projection: { windowEnd: 1 } }
            );
            if (doc && typeof doc.windowEnd === 'number' && doc.windowEnd > 0) {
                return doc.windowEnd;
            }
            return null;
        }
        catch (err) {
            this.log.w('Failed to load deduplication checkpoint, falling back to WINDOW_HOURS', err?.message || err);
            return null;
        }
    }

    /**
     * Persist the checkpoint after a fully completed run.
     * Non-fatal on failure — next run will use WINDOW_HOURS fallback.
     * @param {Database} db - MongoDB connection
     * @param {number} windowEnd - The windowEnd timestamp (epoch ms) to persist
     * @param {object} result - The job result object (for diagnostic fields)
     * @returns {Promise<void>} resolves when the checkpoint is saved
     */
    async #saveCheckpoint(db, windowEnd, result) {
        try {
            await db.collection('plugins').updateOne(
                { _id: CHECKPOINT_ID },
                {
                    $set: {
                        windowEnd,
                        completedAt: Date.now(),
                        batchesProcessed: result.mutationsDispatched || 0,
                        mutationsDispatched: result.mutationsDispatched || 0,
                        totalDuplicateRows: result.totalDuplicateRows || 0
                    }
                },
                { upsert: true }
            );
            this.log.i(`Checkpoint saved: windowEnd=${windowEnd}`);
        }
        catch (err) {
            this.log.w('Failed to save deduplication checkpoint (non-fatal)', err?.message || err);
        }
    }

    /**
     * Compute the deduplication window bounds.
     * If a checkpoint exists (from a prior completed run), windowStart = checkpoint.
     * Otherwise, falls back to now - WINDOW_HOURS.
     * In both cases, windowStart is clamped to at most MAX_WINDOW_HOURS ago.
     * @param {number|null} checkpoint - Last completed windowEnd (epoch ms), or null
     * @returns {{windowStart: number, windowEnd: number}} Start and end as epoch milliseconds (UTC)
     */
    #getWindowBounds(checkpoint) {
        const nowMs = Date.now();
        const maxLookbackMs = nowMs - MAX_WINDOW_HOURS * 60 * 60 * 1000;
        const defaultStartMs = nowMs - WINDOW_HOURS * 60 * 60 * 1000;

        let startMs;
        if (checkpoint !== null && checkpoint !== undefined) {
            startMs = Math.max(checkpoint, maxLookbackMs);
        }
        else {
            startMs = defaultStartMs;
        }

        return {
            windowStart: startMs,
            windowEnd: nowMs
        };
    }

    /**
     * Count total rows in the scan window. Used for anomaly-ratio calculation.
     * @param {object} queryService - ClickHouse query service instance
     * @param {object} tableConfig - Table configuration from {@link getTableConfig}
     * @param {{start: number, end: number}} windowParams - Window bounds as epoch milliseconds (UTC)
     * @returns {Promise<number>} Total row count in the cd window
     */
    async #getTotalRowsInWindow(queryService, tableConfig, windowParams) {
        const q = `
            SELECT count() AS total
            FROM ${tableConfig.selectFull}
            WHERE cd >= fromUnixTimestamp64Milli({start:Int64}, 'UTC') AND cd < fromUnixTimestamp64Milli({end:Int64}, 'UTC')
        `;
        const [row] = await this.#queryJSON(queryService, q, windowParams);
        return Number(row?.total || 0);
    }

    /**
     * Discover all duplicate _id groups in a single pass and compute total excess row count.
     * Uses a window function in the outer SELECT to compute
     * total_excess = sum(cnt) - count(*) across all duplicate groups.
     * Results are capped at DISCOVERY_LIMIT; if that limit is reached, the caller
     * should NOT advance the checkpoint so the next run re-scans the same window.
     * @param {object} queryService - ClickHouse query service instance
     * @param {object} tableConfig - Table configuration from {@link getTableConfig}
     * @param {{start: number, end: number}} windowParams - Window bounds as epoch milliseconds (UTC)
     * @returns {Promise<{rows: object[], totalExcess: number}>} Duplicate groups (with _id, cnt, keep_ts_ms, keep_cd_ms) and total excess count
     */
    async #discoverDuplicates(queryService, tableConfig, windowParams) {
        const q = `
            SELECT
                _id, cnt, keep_ts_ms, keep_cd_ms,
                sum(cnt) OVER () - count(*) OVER () AS total_excess
            FROM (
                SELECT
                    _id,
                    count() AS cnt,
                    toUnixTimestamp64Milli(argMin(ts, (ts, cd))) AS keep_ts_ms,
                    toUnixTimestamp64Milli(argMin(cd, (ts, cd))) AS keep_cd_ms
                FROM ${tableConfig.selectFull}
                WHERE cd >= fromUnixTimestamp64Milli({start:Int64}, 'UTC') AND cd < fromUnixTimestamp64Milli({end:Int64}, 'UTC')
                GROUP BY _id
                HAVING cnt > 1
            )
            ORDER BY cnt DESC
            LIMIT {discovery_limit:UInt32}
        `;
        // Fetch one extra row to distinguish "exactly at limit" from "more exist"
        const params = { ...windowParams, discovery_limit: DISCOVERY_LIMIT + 1 };
        const rows = await this.#queryJSON(queryService, q, params);
        const totalExcess = rows.length > 0 ? Number(rows[0].total_excess || 0) : 0;
        return { rows, totalExcess };
    }

    /**
     * Build an ALTER TABLE DELETE statement for a batch of duplicate _id groups.
     * Deletes all rows matching the duplicate _id values within the cd window, EXCEPT the
     * single keeper row per _id (identified by its exact ts + cd pair via argMin).
     * Does NOT include command_id or SETTINGS — those are appended by mutationManager.
     * @param {object} tableConfig - Table configuration from {@link getTableConfig}
     * @param {object[]} duplicates - Duplicate group rows, each with _id, keep_ts_ms, keep_cd_ms (epoch millis)
     * @param {number} windowStart - Window start as epoch milliseconds (UTC)
     * @param {number} windowEnd - Window end as epoch milliseconds (UTC)
     * @returns {string} ALTER TABLE DELETE SQL statement
     */
    #buildDeleteSQL(tableConfig, duplicates, windowStart, windowEnd) {
        /**
         * Escape single quotes for ClickHouse string literals.
         * @param {string} s - Input string
         * @returns {string} Escaped string with single quotes doubled
         */
        const esc = (s) => String(s).replace(/'/g, "''");
        const idList = duplicates.map(d => `'${esc(d._id)}'`).join(', ');

        // For truly identical rows (same _id, ts, cd), the NOT(keeper) condition matches
        // zero rows, so those duplicates survive. This is intentionally safe: we never
        // delete data we can't distinguish. Use OPTIMIZE TABLE DEDUPLICATE for those cases.
        //
        // fromUnixTimestamp64Milli accepts millis directly → DateTime64(3), explicit UTC.
        // No division or decimal semantics needed.
        const keeperConditions = duplicates.map(d => {
            const keepTsMs = Number(d.keep_ts_ms);
            const keepCdMs = Number(d.keep_cd_ms);
            return `(_id = '${esc(d._id)}' AND ts = fromUnixTimestamp64Milli(${keepTsMs}, 'UTC') AND cd = fromUnixTimestamp64Milli(${keepCdMs}, 'UTC'))`;
        }).join('\n        OR ');

        return `ALTER TABLE ${tableConfig.mutationFull} ${tableConfig.onCluster}
            DELETE WHERE
                cd >= fromUnixTimestamp64Milli(${windowStart}, 'UTC')
                AND cd < fromUnixTimestamp64Milli(${windowEnd}, 'UTC')
                AND _id IN (${idList})
                AND NOT (
                    ${keeperConditions}
                )`;
    }
}

module.exports = EventDeduplicationJob;
