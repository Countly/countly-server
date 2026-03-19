// jobs/EventDeduplicationJob.js
//
// Nightly job that detects and removes duplicate events from the drill_events
// table based on the _id column. Scans a rolling 26-hour window on the cd
// (created/ingestion) timestamp, finds _id values with count > 1, and dispatches
// DELETE mutations through mutationManager for execution, tracking, and retry.
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

const BATCH_SIZE = 1000;
const MAX_BATCHES = 100;
const ANOMALY_THRESHOLD = 0.1;
const WINDOW_HOURS = 26;

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

            this.log.d("Config", {
                BATCH_SIZE,
                MAX_BATCHES,
                ANOMALY_THRESHOLD,
                WINDOW_HOURS,
                mutationTable: tableConfig.mutationFull,
                selectTable: tableConfig.selectFull
            });

            // ---- 1) Compute window bounds ----
            const { windowStart, windowEnd } = this.#getWindowBounds();
            this.log.d("Window", { windowStart, windowEnd });

            // ---- 2) Parallel: count total rows + discover first batch with excess count ----
            await progress(0, 0, "Scanning window for rows and duplicates...");
            const windowParams = { start: windowStart, end: windowEnd };
            const [totalRows, firstBatch] = await Promise.all([
                this.#getTotalRowsInWindow(queryService, tableConfig, windowParams),
                this.#discoverDuplicatesWithExcess(queryService, tableConfig, windowParams, [])
            ]);

            if (totalRows === 0) {
                const res = { status: 'no_data', message: 'No rows found in window', windowStart, windowEnd, durationMs: Date.now() - t0 };
                this.log.i(res.message, res);
                return done(null, res);
            }

            this.log.i(`Total rows in window: ${totalRows.toLocaleString()}`);

            // ---- 3) Anomaly check ----
            if (firstBatch.totalExcess > 0) {
                const dupRatio = firstBatch.totalExcess / totalRows;
                this.log.i(`Duplicate rows: ${firstBatch.totalExcess} / ${totalRows} (${(dupRatio * 100).toFixed(2)}%)`);
                if (dupRatio >= ANOMALY_THRESHOLD) {
                    const res = {
                        status: 'anomaly_abort',
                        message: `Duplicate ratio ${(dupRatio * 100).toFixed(2)}% exceeds threshold ${(ANOMALY_THRESHOLD * 100).toFixed(2)}%`,
                        totalRows,
                        totalDuplicateRows: firstBatch.totalExcess,
                        duplicateRatio: dupRatio,
                        windowStart,
                        windowEnd,
                        durationMs: Date.now() - t0
                    };
                    this.log.e("Anomaly detected - aborting", res);
                    return done({ error: res.message, ...res }, null);
                }
            }

            // ---- 4) Discovery + dispatch loop ----
            let batchNum = 0;
            let totalDuplicateIds = 0;
            let totalDuplicateRows = 0;
            let mutationsDispatched = 0;
            const processedIds = [];
            let duplicates = firstBatch.rows;

            while (batchNum < MAX_BATCHES) {
                await progress(MAX_BATCHES, batchNum, `Processing duplicates (batch ${batchNum + 1})...`);

                if (duplicates.length === 0) {
                    this.log.i(`No more duplicates found after batch ${batchNum}`);
                    break;
                }

                const batchDupRows = duplicates.reduce((sum, d) => sum + (Number(d.cnt) - 1), 0);
                totalDuplicateIds += duplicates.length;
                totalDuplicateRows += batchDupRows;

                this.log.i(`Batch ${batchNum + 1}: ${duplicates.length} duplicate _id groups (${batchDupRows} extra rows)`);

                // Build DELETE SQL and dispatch through mutationManager (awaited to catch MongoDB errors)
                const deleteSQL = this.#buildDeleteSQL(tableConfig, duplicates, windowStart, windowEnd);

                await plugins.dispatchAsPromise("/core/execute_native_ch_mutation", {
                    sql: deleteSQL,
                    db: tableConfig.dbName,
                    collection: tableConfig.baseTable,
                    metadata: { source: 'EventDeduplicationJob', batch: batchNum, idsCount: duplicates.length, rowsToDelete: batchDupRows }
                });
                mutationsDispatched++;

                this.log.i(`Batch ${batchNum + 1} dispatched to mutationManager`);

                // Track processed IDs to exclude from next discovery (passed as CH array param)
                for (const d of duplicates) {
                    processedIds.push(String(d._id));
                }
                batchNum++;

                // Stop if we've reached the batch limit
                if (batchNum >= MAX_BATCHES) {
                    this.log.w(`Stopping after MAX_BATCHES=${MAX_BATCHES} — remaining duplicates may exist`);
                    break;
                }

                // Discover next batch
                const nextBatch = await this.#discoverDuplicatesWithExcess(
                    queryService, tableConfig, windowParams, processedIds
                );
                duplicates = nextBatch.rows;
            }

            // ---- 5) Result ----
            const maxBatchesReached = batchNum >= MAX_BATCHES;
            const result = {
                status: maxBatchesReached ? 'max_batches_reached' : 'completed',
                maxBatchesReached,
                batchesProcessed: batchNum,
                mutationsDispatched,
                totalDuplicateIds,
                totalDuplicateRows,
                totalRowsInWindow: totalRows,
                windowStart,
                windowEnd,
                durationMs: Date.now() - t0,
                config: { BATCH_SIZE, MAX_BATCHES, ANOMALY_THRESHOLD, WINDOW_HOURS }
            };

            await progress(MAX_BATCHES, MAX_BATCHES, "Complete");
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
        const opts = { query, format: 'JSONEachRow' };
        if (queryParams) {
            opts.query_params = queryParams;
        }
        const res = await queryService.client.query(opts);
        return res.json();
    }

    /**
     * Compute the rolling deduplication window (now minus WINDOW_HOURS to now).
     * Returns epoch seconds (UTC) to avoid timezone-dependent string parsing in ClickHouse.
     * Queries use {start:Float64} and toDateTime64(start, 3, 'UTC') for explicit UTC.
     * @returns {{windowStart: number, windowEnd: number}} Start and end as epoch seconds (UTC)
     */
    #getWindowBounds() {
        const nowMs = Date.now();
        const startMs = nowMs - WINDOW_HOURS * 60 * 60 * 1000;
        return {
            windowStart: startMs / 1000,
            windowEnd: nowMs / 1000
        };
    }

    /**
     * Count total rows in the scan window. Used for anomaly-ratio calculation.
     * @param {object} queryService - ClickHouse query service instance
     * @param {object} tableConfig - Table configuration from {@link getTableConfig}
     * @param {{start: number, end: number}} windowParams - Window bounds as epoch seconds (UTC)
     * @returns {Promise<number>} Total row count in the cd window
     */
    async #getTotalRowsInWindow(queryService, tableConfig, windowParams) {
        const q = `
            SELECT count() AS total
            FROM ${tableConfig.selectFull}
            WHERE cd >= toDateTime64({start:Float64}, 3, 'UTC') AND cd < toDateTime64({end:Float64}, 3, 'UTC')
        `;
        const [row] = await this.#queryJSON(queryService, q, windowParams);
        return Number(row?.total || 0);
    }

    /**
     * Discover duplicate _id groups and compute total excess row count in a single fused query.
     * Uses a window function in the outer SELECT (where cnt is a materialized column) to compute
     * total_excess = sum(cnt) - count(*) across all duplicate groups.
     * Previously-processed _id values are excluded via a parameterized Array(String) to avoid
     * query size limits with large exclusion lists.
     * @param {object} queryService - ClickHouse query service instance
     * @param {object} tableConfig - Table configuration from {@link getTableConfig}
     * @param {{start: number, end: number}} windowParams - Window bounds as epoch seconds (UTC)
     * @param {string[]} excludeIds - _id values already processed in prior batches
     * @returns {Promise<{rows: object[], totalExcess: number}>} Duplicate groups (with _id, cnt, keep_ts, keep_cd) and total excess count
     */
    async #discoverDuplicatesWithExcess(queryService, tableConfig, windowParams, excludeIds) {
        const hasExclusions = excludeIds.length > 0;
        const excludeClause = hasExclusions ? 'AND _id NOT IN {exclude_ids:Array(String)}' : '';

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
                WHERE cd >= toDateTime64({start:Float64}, 3, 'UTC') AND cd < toDateTime64({end:Float64}, 3, 'UTC')
                  ${excludeClause}
                GROUP BY _id
                HAVING cnt > 1
            )
            ORDER BY cnt DESC
            LIMIT {batch_size:UInt32}
        `;
        const params = { ...windowParams, batch_size: BATCH_SIZE };
        if (hasExclusions) {
            params.exclude_ids = excludeIds;
        }
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
     * @param {number} windowStart - Window start as epoch seconds (UTC)
     * @param {number} windowEnd - Window end as epoch seconds (UTC)
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

        const keeperConditions = duplicates.map(d => {
            const keepTsMs = Number(d.keep_ts_ms);
            const keepCdMs = Number(d.keep_cd_ms);
            return `(_id = '${esc(d._id)}' AND ts = toDateTime64(${keepTsMs} / 1000, 3, 'UTC') AND cd = toDateTime64(${keepCdMs} / 1000, 3, 'UTC'))`;
        }).join('\n        OR ');

        return `ALTER TABLE ${tableConfig.mutationFull} ${tableConfig.onCluster}
            DELETE WHERE
                cd >= toDateTime64(${windowStart}, 3, 'UTC')
                AND cd < toDateTime64(${windowEnd}, 3, 'UTC')
                AND _id IN (${idList})
                AND NOT (
                    ${keeperConditions}
                )`;
    }
}

module.exports = EventDeduplicationJob;
