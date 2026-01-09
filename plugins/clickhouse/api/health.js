const common = require('../../../api/utils/common.js');
const log = require('../../../api/utils/log.js')('clickhouse:health');
const countlyConfig = require('../../../api/config');
const ClusterManager = require('./managers/ClusterManager');

/**
 * Get operational snapshot from ClickHouse
 * @param {*} options - Query options
 * @returns {Promise<Object>} - Operational snapshot
 */
async function getOperationalSnapshot(options = {}) {
    if (!common.clickhouseQueryService) {
        return {
            merges_in_progress: 0,
            active_merges: 0,
            max_parts_per_partition: 0,
            total_merge_tree_parts: 0
        };
    }

    const database = options.database;
    const table = options.table;
    if (!database || !table) {
        throw new Error('getOperationalSnapshot requires database and table');
    }

    // Check if we need cluster-wide metrics
    const cm = new ClusterManager(countlyConfig.clickhouse || {});
    const isCluster = cm.isClusterMode();
    const clusterName = isCluster ? cm.getClusterName() : null;

    // Build cluster-aware queries:
    // In cluster mode, use clusterAllReplicas() to aggregate metrics across all nodes.
    // This ensures we detect problems on ANY node, not just the connected one.
    let sql;
    if (isCluster && clusterName) {
        sql = `
            SELECT
                (SELECT count() FROM clusterAllReplicas('${clusterName}', system.merges) WHERE database = {db:String} AND table = {tbl:String}) AS merges_in_progress,
                (SELECT sum(value) FROM clusterAllReplicas('${clusterName}', system.metrics) WHERE metric = 'BackgroundMergesAndMutationsPoolTask') AS active_merges,
                parts.max_parts_per_partition,
                parts.total_merge_tree_parts
            FROM
            (
                SELECT
                    max(parts_per_partition) AS max_parts_per_partition,
                    sum(parts_per_partition) AS total_merge_tree_parts
                FROM
                (
                    SELECT partition_id, count() AS parts_per_partition
                    FROM clusterAllReplicas('${clusterName}', system.parts)
                    WHERE active = 1 AND database = {db:String} AND table = {tbl:String}
                    GROUP BY partition_id
                )
            ) AS parts
        `;
    }
    else {
        // Single-node mode: query local system tables
        sql = `
            SELECT
                (SELECT count() FROM system.merges WHERE database = {db:String} AND table = {tbl:String}) AS merges_in_progress,
                (SELECT value FROM system.metrics WHERE metric = 'BackgroundMergesAndMutationsPoolTask') AS active_merges,
                parts.max_parts_per_partition,
                parts.total_merge_tree_parts
            FROM
            (
                SELECT
                    max(parts_per_partition) AS max_parts_per_partition,
                    sum(parts_per_partition) AS total_merge_tree_parts
                FROM
                (
                    SELECT partition_id, count() AS parts_per_partition
                    FROM system.parts
                    WHERE active = 1 AND database = {db:String} AND table = {tbl:String}
                    GROUP BY partition_id
                )
            ) AS parts
        `;
    }

    const rows = await common.clickhouseQueryService.aggregate({ query: sql, params: { db: database, tbl: table } }, {});
    const r = Array.isArray(rows) && rows[0] ? rows[0] : {};

    return {
        merges_in_progress: Number(r.merges_in_progress || 0),
        active_merges: Number(r.active_merges || 0),
        max_parts_per_partition: Number(r.max_parts_per_partition || 0),
        total_merge_tree_parts: Number(r.total_merge_tree_parts || 0)
    };
}

/**
 * Get backpressure snapshot from ClickHouse
 * @param {*} op - Operational snapshot
 * @returns {Promise<Object>} - Backpressure snapshot
 */
async function getBackpressureSnapshot(op = {}) {
    const thresholds = await getMutationClickhousePressureLimits();
    const parts = Number(op.max_parts_per_partition || 0);
    const total = Number(op.total_merge_tree_parts || 0);
    const maxParts = Number(thresholds.CH_MAX_PARTS_PER_PARTITION || 0);
    const maxTotal = Number(thresholds.CH_MAX_TOTAL_MERGETREE_PARTS || 0);

    const partsUtil = maxParts > 0 ? parts / maxParts : 0;
    const totalUtil = maxTotal > 0 ? total / maxTotal : 0;
    const WARNING_RATIO = 0.8;
    const HIGH_RATIO = 0.9;

    const breachParts = parts >= maxParts && maxParts > 0;
    const breachTotal = total >= maxTotal && maxTotal > 0;
    const deferred = breachParts || breachTotal;

    const approaching = !deferred && (partsUtil >= WARNING_RATIO || totalUtil >= WARNING_RATIO);

    let riskLevel = 'low';
    if (deferred) {
        riskLevel = 'critical';
    }
    else if (partsUtil >= HIGH_RATIO || totalUtil >= HIGH_RATIO) {
        riskLevel = 'high';
    }
    else if (approaching) {
        riskLevel = 'moderate';
    }

    return {
        deferred_due_to_clickhouse: deferred,
        defer_reason: breachParts ? 'max_parts_per_partition' : (breachTotal ? 'total_merge_tree_parts' : null),
        thresholds,
        utilization: {
            max_parts_per_partition: partsUtil,
            total_merge_tree_parts: totalUtil
        },
        approaching_limits: approaching,
        risk_level: riskLevel
    };
}

/**
 * Get health summary from ClickHouse
 * @param {*} options - Query options
 * @returns {Promise<Object>} - Health summary
 */
async function getHealthSummary(options = {}) {
    if (!common.clickhouseQueryService) {
        return {
            provider: 'clickhouse',
            healthy: false,
            issues: ['service_unavailable'],
            metrics: {},
            date: new Date().toISOString()
        };
    }

    const snapshot = await getOperationalSnapshot(options);
    const bp = await getBackpressureSnapshot(snapshot);

    const issues = [];
    if (bp.deferred_due_to_clickhouse) {
        issues.push('backpressure');
    }
    else if (bp.approaching_limits) {
        issues.push('approaching_limits');
    }

    return {
        provider: 'clickhouse',
        healthy: !bp.deferred_due_to_clickhouse,
        issues,
        metrics: {
            clickhouse_snapshot: {
                active_merges: snapshot.active_merges,
                merges_in_progress: snapshot.merges_in_progress,
                max_parts_per_partition: snapshot.max_parts_per_partition,
                total_merge_tree_parts: snapshot.total_merge_tree_parts,
            },
            backpressure: {
                deferred_due_to_clickhouse: bp.deferred_due_to_clickhouse,
                defer_reason: bp.defer_reason,
                approaching_limits: bp.approaching_limits,
                risk_level: bp.risk_level,
                thresholds: bp.thresholds,
                utilization: bp.utilization
            }
        },
        date: new Date().toISOString()
    };
}

/**
 * Returns mutation status using system.mutations
 * @param {Object} params - Parameters object
 * @param {String} params.validation_command_id - Unique command marker embedded into WHERE
 * @param {String} [params.table] - Target table to query in system.mutations
 * @param {String} [params.database] - Target database to query in system.mutations
 * @returns {Promise<Object>} Object with mutation status: { is_done, is_killed, latest_fail_reason }
 */
async function getMutationStatus(params) {
    if (!common.clickhouseQueryService) {
        throw new Error('ClickHouse query service not available. Ensure ClickHouse plugin is active.');
    }
    const validationCommandId = params && params.validation_command_id;
    const table = params && params.table;
    const database = params && params.database;

    if (!validationCommandId) {
        throw new Error('getMutationStatus requires validation_command_id');
    }
    if (!database || !table) {
        throw new Error('getMutationStatus requires database and table');
    }

    const tag = '%' + validationCommandId + '%';

    // Check if we need cluster-wide mutation status
    const cm = new ClusterManager(countlyConfig.clickhouse || {});
    const isCluster = cm.isClusterMode();
    const clusterName = isCluster ? cm.getClusterName() : null;

    let sql;
    if (isCluster && clusterName) {
        // In cluster mode, check mutations across ALL replicas.
        // A mutation is only truly done when ALL replicas have completed it.
        // We use min(is_done) to ensure it's done everywhere, and max(is_killed) to detect kills.
        sql = `
            SELECT
                min(is_done) AS is_done,
                max(is_killed) AS is_killed,
                any(latest_fail_reason) AS latest_fail_reason
            FROM clusterAllReplicas('${clusterName}', system.mutations)
            WHERE database = {db:String}
              AND table = {tbl:String}
              AND command LIKE {tag:String}
        `;
    }
    else {
        // Single-node mode: query local system.mutations
        sql = `SELECT is_done, is_killed, latest_fail_reason FROM system.mutations WHERE database = {db:String} AND table = {tbl:String} AND command LIKE {tag:String} ORDER BY create_time DESC LIMIT 1`;
    }

    const rows = await common.clickhouseQueryService.aggregate({ query: sql, params: { db: database, tbl: table, tag } }, {});
    const row = Array.isArray(rows) && rows[0] ? rows[0] : {};
    return {
        is_done: row.is_done === 1 || row.is_done === '1',
        is_killed: row.is_killed === 1 || row.is_killed === '1',
        latest_fail_reason: row.latest_fail_reason || null
    };
}

/**
 * List pending mutations across all databases starting with 'countly'
 * @returns {Promise<{pending:number,details:Array}>} - List of pending mutations
 */
async function listPendingMutations() {
    if (!common.clickhouseQueryService) {
        throw new Error('ClickHouse query service not available. Ensure ClickHouse plugin is active.');
    }
    const sql = `
        SELECT database, table, command, is_killed, latest_fail_reason, create_time
        FROM system.mutations
        WHERE database LIKE {dbp:String} AND is_done = 0
        ORDER BY create_time DESC
    `;
    const rows = await common.clickhouseQueryService.aggregate({ query: sql, params: { dbp: 'countly%' } }, {});
    const list = Array.isArray(rows) ? rows : [];
    return {
        pending: list.length,
        details: list.map(r => ({
            database: r.database + '',
            table: r.table + '',
            command: r.command + '',
            is_killed: r.is_killed === 1 || r.is_killed === '1',
            latest_fail_reason: r.latest_fail_reason || null
        }))
    };
}

/**
 * Get deletion ClickHouse pressure limits from DB
 * @returns {Promise<Object>} - Deletion ClickHouse pressure limits
 */
async function getMutationClickhousePressureLimits() {
    try {
        const doc = await common.db.collection('plugins').findOne(
            { _id: 'plugins' },
            { projection: { 'mutation_manager.ch_max_parts_per_partition': 1, 'mutation_manager.ch_max_total_mergetree_parts': 1 } }
        );
        const dmCfg = (doc && doc.mutation_manager) ? doc.mutation_manager : {};
        return {
            CH_MAX_PARTS_PER_PARTITION: Number(dmCfg.ch_max_parts_per_partition) || 1000,
            CH_MAX_TOTAL_MERGETREE_PARTS: Number(dmCfg.ch_max_total_mergetree_parts) || 100000
        };
    }
    catch (e) {
        log.e('Failed to load mutation manager thresholds from DB, using defaults', e && e.message ? e.message : e);
        return {
            CH_MAX_PARTS_PER_PARTITION: 1000,
            CH_MAX_TOTAL_MERGETREE_PARTS: 100000
        };
    }
}

module.exports = {
    getHealthSummary,
    getBackpressureSnapshot,
    getOperationalSnapshot,
    getMutationStatus,
    listPendingMutations
};