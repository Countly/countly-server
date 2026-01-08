const { DictionaryManager } = require("../managers");
const ClusterManager = require('../managers/ClusterManager');
const log = require('../../../../api/utils/log.js')('identity');
const countlyConfig = require('../../../../api/config');

// Database and dictionary names - kept for dictionary references
const DATABASE = "identity";
const DICTIONARY_NAME = "uid_map_dict";

/**
 * Identity helper for ClickHouse.
 *
 * Provides SQL expressions for person ID resolution and dictionary management.
 * Schema bootstrapping is handled by api.js using SQL files in sql/ directory.
 */
class Identity {

    /**
     * @param {Object} client - ClickHouse client instance
     */
    constructor(client) {
        this.client = client;
        this.cm = new ClusterManager(countlyConfig.clickhouse || {});
        this.dictManager = new DictionaryManager(client, DATABASE, DICTIONARY_NAME);
    }

    // ========================================
    // Static SQL Expression Helpers
    // ========================================

    /**
     * SQL expression to resolve uid to canonical person ID via dictionary.
     * @param {string} uidColumn - Column name containing uid
     * @returns {string} SQL expression
     */
    static getCanonicalExpression(uidColumn = 'uid') {
        return `coalesce(
            nullIf(dictGetOrDefault('${DATABASE}.${DICTIONARY_NAME}', 'canon', (a, ${uidColumn}), ''), ''),
            ${uidColumn}
        )`;
    }

    /**
     * SQL expression for final person ID resolution.
     * Checks: baked value → dictionary → fallback to uid.
     *
     * @param {string} uidColumn - Column name containing uid
     * @param {boolean} forGroupBy - If true, omits any() wrapper for GROUP BY compatibility
     * @returns {string} SQL expression
     */
    static getFinalExpression(uidColumn = 'uid', forGroupBy = false) {
        const uidCanonRef = forGroupBy ? 'uid_canon' : 'any(uid_canon)';

        return `coalesce(
            nullIf(${uidCanonRef}, ''),
            nullIf(dictGetOrDefault('${DATABASE}.${DICTIONARY_NAME}', 'canon', (a, ${uidColumn}), ''), ''),
            ${uidColumn}
        )`;
    }

    /**
     * SQL SELECT clause for final person ID with alias.
     * @param {string} uidColumn - Column name containing uid
     * @param {string} alias - Result column alias
     * @param {boolean} forGroupBy - If true, omits any() wrapper
     * @returns {string} SQL expression with AS alias
     */
    static getFinalSelect(uidColumn = 'uid', alias = 'pid_final', forGroupBy = false) {
        return `${this.getFinalExpression(uidColumn, forGroupBy)} AS ${alias}`;
    }

    // ========================================
    // Instance Methods
    // ========================================

    /**
     * Bootstrap identity system - ensure dictionary is ready.
     * Called by ingestor process on startup.
     * @returns {Promise<void>} resolves when bootstrapping is complete
     */
    async bootstrap() {
        log.d('Bootstrapping identity system');
        try {
            // Ensure dictionary is loaded and current
            await this.reloadDictionary();
            log.d('Identity system bootstrapped successfully');
        }
        catch (err) {
            log.w('Identity bootstrap warning (dictionary may not exist yet):', err.message);
            // Don't throw - dictionary might not exist yet if tables haven't been created
        }
    }

    /**
     * Reload dictionary from source.
     * In cluster mode, reloads on all nodes.
     */
    async reloadDictionary() {
        log.d('Reloading uid_map dictionary');

        if (this.cm.isClusterMode() && !this.cm.isCloudMode()) {
            await this.dictManager.reloadOnCluster(this.cm);
        }
        else {
            await this.dictManager.reload();
        }
    }

    /**
     * Get table name for SELECT queries (distributed table in cluster mode).
     * Uses same logic as QueryHelpers.resolveTable('uid_map').
     * @returns {string} Fully qualified table name (e.g., 'identity.uid_map')
     */
    getTableName() {
        // Use base table name - distributed table handles routing in cluster mode
        return `${DATABASE}.uid_map`;
    }

    /**
     * Get local table name for mutations (ALTER/DELETE).
     * Uses same logic as QueryHelpers.resolveTable('uid_map', { forMutation: true }).
     * In cluster mode, mutations must target _local tables directly.
     * @returns {string} Fully qualified table name (e.g., 'identity.uid_map_local' in cluster)
     */
    getLocalTableName() {
        const tableName = this.cm.isClusterMode() && !this.cm.isCloudMode()
            ? 'uid_map_local'
            : 'uid_map';
        return `${DATABASE}.${tableName}`;
    }

    /** @returns {boolean} Whether cluster mode is enabled */
    isClusterMode() {
        return this.cm.isClusterMode();
    }

    /** @returns {boolean} Whether cloud mode is enabled */
    isCloudMode() {
        return this.cm.isCloudMode();
    }
}

module.exports = Identity;
