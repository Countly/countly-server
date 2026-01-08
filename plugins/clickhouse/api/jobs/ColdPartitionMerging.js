// jobs/ColdPartitionMergingJob.js
//
// Nightly job that merges canonical person ids into *cold* partitions
// by writing `uid_canon` (or, if configured, rewriting `uid`) so
// historical queries avoid dictionary lookups.
//
// Key guarantees:
// - Idempotent: only rows where stored value ≠ current winner are updated.
// - Partition-scoped: updates are bounded with IN PARTITION ID 'YYYYMM'.
// - Preflight guard: refuses to run if dictionary returns non-anchors
//   (i.e., dict(winner) != winner) or empty winners for present keys.
// - Safe handling of empty strings from dict: nullIf(...,'') fallback to uid.
//
// Usage: exported as a job compatible with your jobServer framework.

const job = require("../../../../jobServer");
const ClickHouseClientSingleton = require('../ClickhouseClient');
const Identity = require('../users/Identity');
const QueryHelpers = require('../QueryHelpers');
const ClusterManager = require('../managers/ClusterManager');
const countlyConfig = require('../../../../api/config');
const { getIdentityDaysOld } = require('../api');

const MAX_PARTS = 10;
const DICT_FQN = 'identity.uid_map_dict';
const MUT_SYNC = 0; // 0=async, 1=wait table, 2=wait all
const SAFE_MODE = true;

/**
 * Get the correct table name for mutations.
 * In cluster mode, mutations must target local tables directly.
 * @returns {{dbName: string, tableName: string, fullTableName: string, isClusterMode: boolean}} Table configuration
 */
function getTableConfig() {
    const cm = new ClusterManager(countlyConfig.clickhouse || {});
    // Use resolveTable with forMutation to get correct table name (includes _local suffix in cluster mode)
    const fullTableName = QueryHelpers.resolveTable('drill_events', { forMutation: true });
    // Parse database and table from fully qualified name
    const [dbName, tableName] = fullTableName.split('.');
    return { dbName, tableName, fullTableName, isClusterMode: cm.isClusterMode() };
}

/**
 * Class ColdPartitionMergingJob
 * @extends job.Job
 * @description Job that merges canonical person ids into cold ClickHouse partitions
 * by updating uid_canon (or uid) based on the current dictionary state.
 * This improves query performance for historical data by avoiding dictionary lookups.
 * Key features:
 * - Idempotent
 * - Partition-scoped updates
 * - Preflight verification of dictionary contracts
 * - Safe handling of empty-string winners
 */
class ColdPartitionMergingJob extends job.Job {

    /**
     * Get the schedule configuration for this job
     * @returns {GetScheduleConfig} schedule configuration
     */
    getSchedule() {
        // Run at 2 AM daily
        return {
            type: 'schedule',
            value: '0 2 * * *'
        };
    }

    /**
     * This job will be disabled when created
     * @param {object} db - database connection object
     * @param {function} done - function to call when finishing Job
     * @param {function} progress - function to call while running job
     * @returns {boolean} True if job should be enabled by default, false otherwise
     *
     */
    async run(db, done, progress) {
        const t0 = Date.now();
        // Get actual ClickHouse client instance
        const client = await ClickHouseClientSingleton.getInstance();

        // Get cluster-aware table configuration
        const { dbName: DB_NAME, tableName: TABLE_NAME } = getTableConfig();

        // Get days old threshold from centralized config (shared with dictionary)
        const DAYS_OLD = getIdentityDaysOld();

        try {
            this.log.i("Cold partition merging job: start");
            this.log.d("Config", { DAYS_OLD, MAX_PARTS, DB_NAME, TABLE_NAME, DICT_FQN, MUT_SYNC, SAFE_MODE});

            const canonExpr = Identity.getCanonicalExpression('uid');

            this.#warnIfDictMismatch(canonExpr, DICT_FQN);

            // ---- 1) Find cold partitions ----
            await progress(0, 0, "Identifying cold partitions…");
            const cold = await this.#getColdPartitions(client, DB_NAME, TABLE_NAME, DAYS_OLD);

            if (!cold.length) {
                const res = {
                    message: "No cold partitions to merge",
                    daysOld: DAYS_OLD,
                    completedAt: new Date(),
                    durationMs: Date.now() - t0
                };
                this.log.i(res.message, res);
                return done(null, res);
            }

            const partsToProcess = cold.slice(0, MAX_PARTS);
            this.log.i(`Cold partitions: ${cold.length}. Processing: ${partsToProcess.length}.`,
                { partition_ids: partsToProcess.map(p => p.partition_id) });

            // ---- 2) Preflight: verify dictionary contracts on the exact set of partitions ----
            await progress(partsToProcess.length, 0, "Preflight: verifying dictionary contracts…");
            const guard = await this.#verifyDictionaryContracts(client, DB_NAME, TABLE_NAME, DICT_FQN, partsToProcess.map(p => p.partition_id));

            if (guard.nonAnchorWinners > 0 || guard.emptyWinnersOnPresentKeys > 0) {
                const err = new Error(
                    `Dictionary preflight failed: nonAnchorWinners=${guard.nonAnchorWinners}, ` +
                    `emptyWinnersOnPresentKeys=${guard.emptyWinnersOnPresentKeys}`
                );
                this.log.e(err.message, guard);
                return done({ error: err.message, guard }, null);
            }

            // ---- 3) For each partition, count mismatches and merge (idempotent) ----
            const total = partsToProcess.length;
            let processed = 0;
            const mergedPartitionIds = [];

            for (const p of partsToProcess) {
                const partId = p.partition_id;

                await progress(total, processed, `Analyzing partition ${partId}…`);
                const counts = await this.#getPartitionMismatchCounts(client, DB_NAME, TABLE_NAME, partId, canonExpr);
                this.log.d(`Partition ${partId}:`, counts);

                if (counts.rows_to_fix === 0) {
                    this.log.i(`Partition ${partId}: up-to-date (no changes).`);
                    processed++;
                    continue;
                }

                await progress(total, processed, `Merging partition ${partId} (${p.rows.toLocaleString()} rows)…`);
                await this.#mergePartition(client, DB_NAME, TABLE_NAME, partId, canonExpr, MUT_SYNC, SAFE_MODE);
                mergedPartitionIds.push(partId);
                processed++;
                this.log.i(`Merged partition ${partId} (${processed}/${total}).`);
            }

            // ---- 4) Rollup stats for cold data ----
            const stats = await this.#getColdRollupStats(client, DB_NAME, TABLE_NAME, DAYS_OLD, canonExpr);
            const result = {
                processedPartitions: processed,
                totalColdPartitions: cold.length,
                remainingColdPartitions: Math.max(0, cold.length - processed),
                mergedPartitionIds,
                mergeStats: stats,
                configuration: {
                    daysOld: DAYS_OLD,
                    maxPartitions: MAX_PARTS,
                    dictFqn: DICT_FQN,
                    mutationsSync: MUT_SYNC,
                    safeMode: SAFE_MODE
                },
                completedAt: new Date(),
                durationMs: Date.now() - t0
            };

            this.log.i("Cold partition merging job: complete", result);
            return done(null, result);

        }
        catch (error) {
            const durationMs = Date.now() - t0;
            this.log.e("Cold partition merging job: failed", { error: error.message, stack: error.stack, durationMs });
            return done({ error: error.message, stack: error.stack, durationMs }, null);
        }
    }

    /**
     * Warns if the dictionary FQN used in the canonical expression
     * does not match the expected FQN from configuration.
     * @param {string} canonExpr - Canonical expression from Identity
     * @param {string} expectedFqn - Expected dictionary FQN from configuration
     */
    #warnIfDictMismatch(canonExpr, expectedFqn) {
        const m = canonExpr.match(/dictGetOrDefault\('([^']+)'/);
        const embedded = m ? m[1] : null;
        if (embedded && embedded !== expectedFqn) {
            this.log.w(`Dictionary FQN mismatch: Identity.getCanonicalExpression uses "${embedded}", job configured as "${expectedFqn}". Ensure they match.`);
        }
    }

    /**
     * Executes a ClickHouse query and returns the result as JSON.
     * @param {object} client - ClickHouse client instance
     * @param {string} query - SQL query string
     * @returns {Promise<Array>} - Resulting rows as an array of objects
     */
    async #queryJSON(client, query) {
        const res = await client.query({ query, format: 'JSONEachRow' });
        return res.json();
    }

    /**
     * Executes a ClickHouse query without returning results.
     * @param {object} client - ClickHouse client instance
     * @param {string} query - SQL query string
     * @returns {Promise<void>} - Resolves when the query execution is complete
     */
    async #exec(client, query) {
        return client.exec({ query });
    }

    /**
     * Retrieves cold partitions from the specified database and table
     * that are older than the specified number of days.
     * @param {object} client - ClickHouse client instance
     * @param {string} db - Database name
     * @param {string} table - Table name
     * @param {number} daysOld - Number of days to consider a partition cold
     * @returns {Promise<Array>} - Array of cold partitions with their details
     */
    async #getColdPartitions(client, db, table, daysOld) {
        const q = `
            SELECT p.partition_id, sum(p.rows) AS rows, min(p.min_time) AS part_min_time, max(p.max_time) AS part_max_time
            FROM system.parts AS p
            WHERE p.active = 1 AND database = '${db}' AND table = '${table}'
            GROUP BY p.partition_id
            HAVING part_max_time < now() - INTERVAL ${Number(daysOld)} DAY
            ORDER BY part_min_time ASC;
        `;
        return this.#queryJSON(client, q);
    }

    /**
     * Verify that the (app_id,UID)→canon dictionary is safe to use for cold-partition updates.
     *
     * What it checks (over just the partitions we're about to mutate):
     *  1) No present keys return an empty winner (""): a (app_id, uid) for which dictHas=1 must not map to ''.
     *  2) Every winner is an anchor: if w = dictGet(canon, (app_id, uid)), then dictGet(canon, (app_id, w)) must equal w.
     *
     * Rationale:
     *  - Prevents writing blanks to uid_canon (data corruption).
     *  - Prevents writing non-final winners that would later rewrite again as chains collapse.
     *  - Catches cycles (a↔b) and unflattened chains (a→b→c).
     *  - Ensures app_id scoping is working correctly.
     *
     * @private
     * @param {object}  client        ClickHouse client
     * @param {string}  db            Database name of the fact table (e.g., "countly_drill")
     * @param {string}  table         Fact table name (e.g., "drill_events")
     * @param {string}  dictFqn       Fully-qualified dictionary name (e.g., "identity.uid_map_dict")
     * @param {string[]} partitionIds List of partition ids to check (e.g., ["202509","202510"])
     * @returns {Promise<{emptyWinnersOnPresentKeys:number, nonAnchorWinners:number}>}
     *          Counts of violations. Both must be 0 to proceed.
     */
    async #verifyDictionaryContracts(client, db, table, dictFqn, partitionIds) {
        const q = `
            WITH U AS (
              SELECT DISTINCT a, uid
              FROM ${db}.${table}
              WHERE toYYYYMM(ts,'UTC') IN (${partitionIds.map(Number).join(',')})
            ),
            M AS (
              SELECT
                a,
                uid,
                dictHas('${dictFqn}', (a, uid)) AS has_key,
                dictGetOrDefault('${dictFqn}', 'canon', (a, uid), '') AS w
              FROM U
            )
            SELECT
              countIf(has_key = 1 AND w = '') AS emptyWinnersOnPresentKeys,
              countIf(
                has_key = 1
                AND w != ''
                AND dictGetOrDefault('${dictFqn}', 'canon', (a, w), '') != w
              ) AS nonAnchorWinners
            FROM M
        `;
        const [row] = await this.#queryJSON(client, q);
        return {
            emptyWinnersOnPresentKeys: Number(row?.emptyWinnersOnPresentKeys || 0),
            nonAnchorWinners: Number(row?.nonAnchorWinners || 0)
        };
    }

    /**
     * Counts the total rows and rows needing updates in a specific partition.
     * @param {object} client - ClickHouse client instance
     * @param {string} db - Database name
     * @param {string} table - Table name
     * @param {string} partitionId - Partition ID in 'YYYYMM' format
     * @param {string} canonExpr - Canonical expression for comparison
     * @returns {Promise<object>} - Object containing total rows and rows to fix
     */
    async #getPartitionMismatchCounts(client, db, table, partitionId, canonExpr) {
        const q = `
            SELECT
              count() AS total,
              countIf(uid_canon IS NULL OR uid_canon != ${canonExpr}) AS rows_to_fix
            FROM ${db}.${table}
            WHERE toYYYYMM(ts,'UTC') = ${Number(partitionId)}
        `;
        const [row] = await this.#queryJSON(client, q);
        return {
            total: Number(row?.total || 0),
            rows_to_fix: Number(row?.rows_to_fix || 0)
        };
    }

    /**
     * Merges the canonical IDs into the specified partition by updating
     * either the uid_canon or uid column based on the safeMode flag.
     * @param {object} client - ClickHouse client instance
     * @param {string} db - Database name
     * @param {string} table - Table name
     * @param {string} partitionId - Partition ID in 'YYYYMM' format
     * @param {string} canonExpr - Canonical expression for updating
     * @param {number} mutationsSync - Mutations sync setting (0=async, 1=wait table, 2=wait all)
     * @param {boolean} safeMode - If true, update uid_canon; if false, rewrite uid
     * @returns {Promise<void>} - Resolves when the merge operation is complete
     */
    async #mergePartition(client, db, table, partitionId, canonExpr, mutationsSync, safeMode) {
        const targetCol = safeMode ? 'uid_canon' : 'uid';
        const mismatchPredicate = safeMode
            ? `(${targetCol} IS NULL OR ${targetCol} != ${canonExpr})`
            : `(${targetCol} != ${canonExpr})`;

        // In cluster mode, mutations must fan out across all shards
        const cm = new ClusterManager(countlyConfig.clickhouse || {});
        const onCluster = cm.isClusterMode() ? cm.getOnClusterClause() : '';

        const q = `
            ALTER TABLE ${db}.${table} ${onCluster}
            UPDATE ${targetCol} = ${canonExpr}
            WHERE toYYYYMM(ts,'UTC') = ${Number(partitionId)} AND ${mismatchPredicate}
            SETTINGS mutations_sync = ${mutationsSync}
        `;
        await this.#exec(client, q);
    }

    /**
     * Retrieves rollup statistics for cold data in the specified database and table.
     * @param {object} client - ClickHouse client instance
     * @param {string} db - Database name
     * @param {string} table - Table name
     * @param {number} daysOld - Number of days to consider data cold
     * @param {string} canonExpr - Canonical expression for comparison
     * @returns {Promise<object>} - Rollup statistics including total rows, merged rows, and merged percentage
     */
    async #getColdRollupStats(client, db, table, daysOld, canonExpr) {
        const q = `
            WITH COLD AS (
              SELECT *
              FROM ${db}.${table}
              WHERE ts < now() - INTERVAL ${Number(daysOld)} DAY
            )
            SELECT
              count() AS total_rows,
              countIf(coalesce(uid_canon,'') = ${canonExpr}) AS merged_rows,
              if(total_rows = 0, 0, round(merged_rows * 100.0 / total_rows, 2)) AS merged_percentage
            FROM COLD
        `;

        const [row] = await this.#queryJSON(client, q);

        return {
            total_rows: Number(row?.total_rows || 0),
            merged_rows: Number(row?.merged_rows || 0),
            merged_percentage: Number(row?.merged_percentage || 0)
        };
    }
}

module.exports = ColdPartitionMergingJob;
