/**
 * SQLExecutor - Executes SQL files with placeholder substitution for ClickHouse.
 *
 * SQL File Convention:
 * - Header with metadata: -- @database, @table, @engine, @sharding
 * - Placeholders: {{DATABASE}}, {{TABLE}}, {{ENGINE}}, {{ON_CLUSTER}}
 *
 * See sql/README.md for full documentation.
 */

const log = require('../../../../api/utils/log.js')('clickhouse:sql-executor');

/**
 * Parse metadata from SQL file header comments.
 * @param {string} sql - SQL content
 * @returns {Object} { database, table, engine, sharding }
 */
function parseMetadata(sql) {
    const meta = {};
    const lines = sql.split('\n');

    for (const line of lines) {
        if (!line.startsWith('--')) {
            break;
        }

        const match = line.match(/^--\s*@(\w+):\s*(.+)$/);
        if (match) {
            meta[match[1]] = match[2].trim();
        }
    }

    return meta;
}

/**
 * Execute SQL file with cluster-aware transformations.
 *
 * @param {Object} client - ClickHouse client
 * @param {Object} cm - ClusterManager instance
 * @param {string} sql - SQL file content
 * @returns {Promise<void>} resolves when execution is complete
 */
async function executeSQL(client, cm, sql) {
    if (cm.isCloudMode()) {
        log.i('Cloud mode - skipping DDL');
        return;
    }

    const meta = parseMetadata(sql);
    const isCreateTable = sql.includes('CREATE TABLE');
    const isCreateDb = sql.includes('CREATE DATABASE');
    const isAlter = sql.includes('ALTER TABLE');

    // Compute replacement values
    let tableName = meta.table;
    if (cm.isClusterMode() && isCreateTable) {
        tableName = `${meta.table}_local`;
    }
    if (cm.isClusterMode() && isAlter) {
        tableName = `${meta.table}_local`;
    }

    const engine = cm.isReplicated() && meta.engine
        ? cm.getReplicatedEngine(meta.engine, cm.getZkPath(meta.database, meta.table))
        : (meta.engine || 'MergeTree()');

    const replacements = {
        '{{DATABASE}}': meta.database,
        '{{TABLE}}': tableName,
        '{{ENGINE}}': engine,
        '{{ON_CLUSTER}}': cm.isClusterMode() ? cm.getOnClusterClause() : ''
    };

    // Apply replacements
    let transformed = sql;
    for (const [placeholder, value] of Object.entries(replacements)) {
        transformed = transformed.split(placeholder).join(value || '');
    }

    // Remove metadata comments for execution
    transformed = transformed.replace(/^--\s*@\w+:.*\n/gm, '').trim();

    // Execute the statement
    await exec(client, transformed);

    if (isCreateDb) {
        log.d(`Created database ${meta.database}`);
    }
    else if (isCreateTable) {
        log.d(`Created table ${meta.database}.${tableName}`);
        // Create distributed table if needed (skip if no sharding key defined)
        if (cm.shouldCreateDistributedTable() && meta.sharding && meta.sharding.trim()) {
            const distSQL = generateDistributed(meta, cm);
            await exec(client, distSQL);
            log.d(`Created distributed table ${meta.database}.${meta.table}`);
        }
        else if (cm.shouldCreateDistributedTable() && (!meta.sharding || !meta.sharding.trim())) {
            log.d(`Skipping distributed table for ${meta.database}.${meta.table} - no sharding key (table is replicated to all nodes)`);
        }
    }
    else if (isAlter) {
        log.d(`Altered table ${meta.database}.${tableName}`);
    }
}

/**
 * Generate distributed table DDL.
 * @param {Object} meta - Table metadata
 * @param {Object} cm - ClusterManager instance
 * @returns {string} Distributed table creation SQL
 */
function generateDistributed(meta, cm) {
    const onCluster = cm.getOnClusterClause();
    const sharding = meta.sharding || 'rand()';

    return `
CREATE TABLE IF NOT EXISTS ${meta.database}.${meta.table} ${onCluster}
AS ${meta.database}.${meta.table}_local
ENGINE = Distributed('${cm.getClusterName()}', '${meta.database}', '${meta.table}_local', ${sharding})
    `.trim();
}

/**
 * Execute SQL with error handling.
 * @param {Object} client - ClickHouse client
 * @param {string} sql - SQL statement
 * @returns {Promise<void>} resolves when execution is complete
 */
async function exec(client, sql) {
    try {
        await client.exec({
            query: sql,
            clickhouse_settings: { allow_experimental_object_type: 1 }
        });
    }
    catch (err) {
        if (err.message.includes('already exists') || err.message.includes('Cannot add index')) {
            log.d('Already exists, skipping');
            return;
        }
        throw err;
    }
}

module.exports = { executeSQL, parseMetadata };
