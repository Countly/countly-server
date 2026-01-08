/**
 * ClickHouse Management Utilities
 *
 * Generic managers for ClickHouse database objects:
 * - DictionaryManager: Manage dictionaries (all types and layouts)
 * - MaterializedViewManager: Manage materialized views (traditional and refreshable)
 * - ClusterManager: Manage cluster configuration and engine generation
 * - SQLExecutor: Execute SQL files with placeholder substitution for all deployment modes
 *
 * Usage:
 *   const { executeSQL, ClusterManager } = require('./managers');
 *
 *   const cm = new ClusterManager(config.clickhouse);
 *   await executeSQL(client, cm, sqlContent);
 */

const DictionaryManager = require('./DictionaryManager');
const MaterializedViewManager = require('./MaterializedViewManager');
const ClusterManager = require('./ClusterManager');
const { executeSQL, parseMetadata } = require('./SQLExecutor');

module.exports = {
    DictionaryManager,
    MaterializedViewManager,
    ClusterManager,
    executeSQL,
    parseMetadata
};
