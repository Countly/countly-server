/**
 * ClusterManager - Manages ClickHouse cluster configuration and DDL generation
 *
 * Configuration uses boolean flags for clarity:
 * - shards: false, replicas: false → single mode (default)
 * - shards: false, replicas: true  → replicated mode (high availability, recommended)
 * - shards: true,  replicas: false → sharded mode (horizontal scaling, no HA)
 * - shards: true,  replicas: true  → ha mode (full HA with sharding)
 *
 * Also supports ClickHouse Cloud deployments where infrastructure is managed externally.
 *
 * BACKWARD COMPATIBILITY:
 * The old `mode` and `enabled` config options are still supported but deprecated.
 * If `mode` is set, it's converted to the new boolean format automatically.
 *
 * @module clickhouse/managers/ClusterManager
 */

const log = require('../../../../api/utils/log.js')('clickhouse:cluster-manager');

/**
 * Default configuration values
 *
 * NOTE: Configuration behavior:
 * - cluster.shards: Enable sharding (horizontal scaling across multiple shards)
 * - cluster.replicas: Enable replication (high availability with multiple replicas)
 * - distributed.writeThrough: Controls insert routing in cluster mode.
 *   true (default): Insert to distributed table (ClickHouse routes to shards)
 *   false: Insert directly to local table (for internal replication)
 *   Used by getInsertTable() method.
 * - replication.coordinatorType: Only used for validation/logging, not runtime behavior.
 *   ClickHouse determines coordinator based on cluster configuration.
 *
 * Sharding keys are defined in SQL files via @sharding metadata directive (SQL-metadata-driven).
 */
const DEFAULTS = {
    cluster: {
        name: 'countly_cluster',
        shards: false, // Enable sharding (multiple shards for horizontal scaling)
        replicas: false, // Enable replication (multiple replicas for high availability)
        isCloud: false // ClickHouse Cloud mode (skip DDL, validate schema exists)
        // DEPRECATED: 'enabled' and 'mode' are still supported for backward compatibility
    },
    replication: {
        // coordinatorType is only used for validation, actual coordination is managed by ClickHouse
        coordinatorType: 'keeper',
        zkPath: '/clickhouse/tables/{shard}/{database}/{table}',
        replicaName: '{replica}'
    },
    parallelReplicas: {
        enabled: false,
        maxParallelReplicas: 2,
        clusterForParallelReplicas: null
    },
    distributed: {
        // NOTE: writeThrough is reserved for future use (not yet implemented)
        writeThrough: true,
        insertDistributedSync: true
    }
};

/**
 * ClusterManager class for handling ClickHouse cluster configuration
 *
 * Uses transparent singleton pattern - calling `new ClusterManager(config)`
 * returns the cached instance if one exists.
 */
class ClusterManager {
    // Singleton instance storage
    static _instance = null;

    /**
     * Creates a new ClusterManager instance (or returns existing singleton)
     * @param {Object} config - ClickHouse configuration object (from countlyConfig.clickhouse)
     * @returns {ClusterManager} The singleton instance
     */
    constructor(config = {}) {
        // Transparent singleton: return existing instance if available
        if (ClusterManager._instance) {
            return ClusterManager._instance;
        }

        this.config = config;
        this.database = config.database || 'countly_drill';

        // Merge configuration with defaults
        this.cluster = { ...DEFAULTS.cluster, ...(config.cluster || {}) };
        this.replication = { ...DEFAULTS.replication, ...(config.replication || {}) };
        this.parallelReplicas = { ...DEFAULTS.parallelReplicas, ...(config.parallelReplicas || {}) };
        this.distributed = { ...DEFAULTS.distributed, ...(config.distributed || {}) };

        // BACKWARD COMPATIBILITY: Convert old 'mode' config to new booleans
        // Only apply if 'mode' is explicitly set and new booleans are NOT set
        if (this.cluster.mode && !Object.prototype.hasOwnProperty.call(config.cluster || {}, 'shards')) {
            const mode = this.cluster.mode;
            this.cluster.shards = ['sharded', 'ha'].includes(mode);
            this.cluster.replicas = ['replicated', 'ha'].includes(mode);
            log.d('Converted deprecated mode config to booleans', { mode, shards: this.cluster.shards, replicas: this.cluster.replicas });
        }

        // BACKWARD COMPATIBILITY: Convert old 'enabled' flag
        // If enabled=false is explicitly set, ensure both shards and replicas are false
        if (Object.prototype.hasOwnProperty.call(config.cluster || {}, 'enabled') && config.cluster.enabled === false) {
            this.cluster.shards = false;
            this.cluster.replicas = false;
        }

        log.d('ClusterManager initialized', {
            shards: this.cluster.shards,
            replicas: this.cluster.replicas,
            isCloud: this.cluster.isCloud,
            clusterName: this.cluster.name,
            derivedMode: this.getDeploymentMode()
        });

        // Validate configuration and handle fatal errors
        const validation = this.validateConfig();
        for (const warning of validation.warnings || []) {
            log.w('Cluster configuration warning:', warning);
        }
        if (!validation.valid) {
            for (const error of validation.errors) {
                log.e('Cluster configuration error:', error);
            }
            // Throw on fatal errors to prevent startup with dangerous config
            if (validation.fatal) {
                throw new Error(`ClickHouse cluster configuration error: ${validation.errors.join('; ')}`);
            }
        }

        // Cache this instance for singleton pattern
        ClusterManager._instance = this;
    }

    /**
     * Reset the singleton instance (for testing purposes only)
     * @static
     */
    static resetInstance() {
        ClusterManager._instance = null;
    }

    // ========================================
    // Detection Methods
    // ========================================

    /**
     * Checks if cluster mode is enabled (either shards or replicas are enabled)
     * @returns {boolean} True if cluster mode is enabled
     */
    isClusterMode() {
        // Cluster mode is active if shards OR replicas are enabled
        return !!(this.cluster.shards || this.cluster.replicas);
    }

    /**
     * Checks if ClickHouse Cloud mode is enabled
     * @returns {boolean} True if cloud mode is enabled
     */
    isCloudMode() {
        return !!this.cluster.isCloud;
    }

    /**
     * Gets the cluster name
     * @returns {string} Cluster name
     */
    getClusterName() {
        return this.cluster.name || DEFAULTS.cluster.name;
    }

    /**
     * Gets the deployment mode (derived from boolean flags)
     * @returns {string} Deployment mode: 'single', 'sharded', 'replicated', or 'ha'
     */
    getDeploymentMode() {
        if (this.cluster.isCloud) {
            return 'cloud';
        }
        if (this.cluster.shards && this.cluster.replicas) {
            return 'ha';
        }
        if (this.cluster.shards) {
            return 'sharded';
        }
        if (this.cluster.replicas) {
            return 'replicated';
        }
        return 'single';
    }

    /**
     * Checks if the deployment uses replication
     * @returns {boolean} True if replication is enabled (cluster.replicas=true)
     */
    isReplicated() {
        // Cloud mode handles replication internally, we don't manage it
        if (this.isCloudMode()) {
            return false;
        }
        return !!this.cluster.replicas;
    }

    /**
     * Checks if the deployment uses sharding
     * @returns {boolean} True if sharding is enabled (cluster.shards=true)
     */
    isSharded() {
        // Cloud mode handles sharding internally, we don't manage it
        if (this.isCloudMode()) {
            return false;
        }
        return !!this.cluster.shards;
    }

    /**
     * Gets the coordinator type (keeper or zookeeper)
     * @returns {string} Coordinator type
     */
    getCoordinatorType() {
        return this.replication.coordinatorType || DEFAULTS.replication.coordinatorType;
    }

    // ========================================
    // Table Naming
    // ========================================

    /**
     * Gets the local table name for a given table
     * In cluster mode, local tables have '_local' suffix
     * @param {string} table - Base table name
     * @returns {string} Local table name
     */
    getLocalTableName(table) {
        if (this.isClusterMode() && !this.isCloudMode()) {
            return `${table}_local`;
        }
        return table;
    }

    /**
     * Gets the distributed table name for a given table
     * Distributed tables use the base name for consistent API
     * @param {string} table - Base table name
     * @returns {string} Distributed table name
     */
    getDistributedTableName(table) {
        return table;
    }

    /**
     * Checks if distributed tables should be created
     * @returns {boolean} True if distributed tables should be created
     */
    shouldCreateDistributedTable() {
        return this.isClusterMode() && !this.isCloudMode();
    }

    /**
     * Checks if writeThrough mode is enabled for inserts.
     * When true, inserts go through the distributed table (ClickHouse routes to correct shard).
     * When false, inserts go directly to the local table on the connected node.
     * @returns {boolean} True if writeThrough is enabled
     */
    isWriteThroughEnabled() {
        return this.distributed.writeThrough !== false;
    }

    /**
     * Gets the appropriate table name for INSERT operations based on cluster mode and writeThrough setting.
     *
     * In single-node mode: Returns the base table name (e.g., 'drill_events')
     * In cluster mode with writeThrough=true: Returns base name (distributed table routes to correct shard)
     * In cluster mode with writeThrough=false: Returns local name (e.g., 'drill_events_local')
     * In cloud mode: Returns base table name (cloud handles distribution)
     *
     * @param {string} table - Base table name (e.g., 'drill_events', 'uid_map')
     * @param {string} [database] - Optional database name to prepend
     * @returns {string} Table name to use for INSERT operations
     */
    getInsertTable(table, database = null) {
        let targetTable = table;

        // Cloud mode - use base table (cloud handles distribution)
        if (this.isCloudMode()) {
            targetTable = table;
        }
        // Cluster mode - check writeThrough setting
        else if (this.isClusterMode()) {
            if (this.isWriteThroughEnabled()) {
                // writeThrough=true: Insert to distributed table, ClickHouse routes to correct shard
                targetTable = table;
            }
            else {
                // writeThrough=false: Insert directly to local table on this node
                targetTable = `${table}_local`;
            }
        }
        // Single-node mode - use base table
        else {
            targetTable = table;
        }

        // Prepend database if provided
        if (database) {
            return `${database}.${targetTable}`;
        }

        return targetTable;
    }

    /**
     * Gets insert table with full database.table format
     * Convenience method that always includes database prefix
     * @param {string} database - Database name
     * @param {string} table - Table name
     * @returns {string} Fully qualified table name for inserts
     */
    getFullInsertTable(database, table) {
        return this.getInsertTable(table, database);
    }

    // ========================================
    // DDL Helpers
    // ========================================

    /**
     * Gets the ON CLUSTER clause for DDL statements
     * @returns {string} ON CLUSTER clause or empty string
     */
    getOnClusterClause() {
        if (!this.isClusterMode() || this.isCloudMode()) {
            return '';
        }
        return `ON CLUSTER ${this.getClusterName()}`;
    }

    /**
     * Generates the ZooKeeper/Keeper path for a table
     * @param {string} database - Database name
     * @param {string} table - Table name
     * @returns {string} ZK path with macros
     */
    getZkPath(database, table) {
        const template = this.replication.zkPath || DEFAULTS.replication.zkPath;
        return template
            .replace('{database}', database)
            .replace('{table}', table);
    }

    /**
     * Gets the replica name macro
     * @returns {string} Replica name macro (e.g., '{replica}')
     */
    getReplicaName() {
        return this.replication.replicaName || DEFAULTS.replication.replicaName;
    }

    // ========================================
    // Engine Generation
    // ========================================

    /**
     * Generates MergeTree engine string
     * @param {Object} options - Engine options
     * @returns {string} MergeTree engine string
     */
    getMergeTreeEngine(options = {}) {
        log.d('Generating MergeTree engine', options);
        return 'MergeTree()';
    }

    /**
     * Generates ReplicatedMergeTree engine string
     * @param {string} zkPath - ZooKeeper/Keeper path
     * @param {Object} options - Engine options
     * @returns {string} ReplicatedMergeTree engine string
     */
    getReplicatedMergeTreeEngine(zkPath, options = {}) {
        log.d('Generating ReplicatedMergeTree engine', { zkPath, ...options });
        const replica = this.getReplicaName();
        return `ReplicatedMergeTree('${zkPath}', '${replica}')`;
    }

    /**
     * Generates ReplacingMergeTree engine string
     * @param {string} versionColumn - Version column for deduplication
     * @param {Object} options - Engine options
     * @returns {string} ReplacingMergeTree engine string
     */
    getReplacingMergeTreeEngine(versionColumn, options = {}) {
        log.d('Generating ReplacingMergeTree engine', { versionColumn, ...options });
        return `ReplacingMergeTree(${versionColumn})`;
    }

    /**
     * Generates ReplicatedReplacingMergeTree engine string
     * @param {string} zkPath - ZooKeeper/Keeper path
     * @param {string} versionColumn - Version column for deduplication
     * @param {Object} options - Engine options
     * @returns {string} ReplicatedReplacingMergeTree engine string
     */
    getReplicatedReplacingMergeTreeEngine(zkPath, versionColumn, options = {}) {
        log.d('Generating ReplicatedReplacingMergeTree engine', { zkPath, versionColumn, ...options });
        const replica = this.getReplicaName();
        return `ReplicatedReplacingMergeTree('${zkPath}', '${replica}', ${versionColumn})`;
    }

    /**
     * Gets the appropriate engine for a table based on cluster mode and engine type
     * @param {string} database - Database name
     * @param {string} tableName - Table name
     * @param {string} baseEngine - Base engine type ('MergeTree', 'ReplacingMergeTree', etc.)
     * @param {Object} options - Engine options
     * @param {string} options.versionColumn - Version column for ReplacingMergeTree
     * @returns {string} Appropriate engine string
     */
    getEngineForTable(database, tableName, baseEngine, options = {}) {
        // Cloud mode uses standard engines (ClickHouse Cloud handles replication)
        if (this.isCloudMode()) {
            if (baseEngine.includes('ReplacingMergeTree')) {
                return this.getReplacingMergeTreeEngine(options.versionColumn);
            }
            return this.getMergeTreeEngine();
        }

        // Replicated mode (replicated or ha)
        if (this.isReplicated()) {
            const zkPath = this.getZkPath(database, tableName);

            if (baseEngine.includes('ReplacingMergeTree')) {
                return this.getReplicatedReplacingMergeTreeEngine(zkPath, options.versionColumn);
            }
            return this.getReplicatedMergeTreeEngine(zkPath);
        }

        // Non-replicated modes (single or sharded)
        if (baseEngine.includes('ReplacingMergeTree')) {
            return this.getReplacingMergeTreeEngine(options.versionColumn);
        }
        return this.getMergeTreeEngine();
    }

    /**
     * Simple helper: converts engine name to replicated version.
     * Used by SQLExecutor for simple string-based transformations.
     *
     * @param {string} engineName - Base engine name (e.g., 'MergeTree', 'ReplacingMergeTree(ts)')
     * @param {string} zkPath - ZooKeeper path
     * @returns {string} Replicated engine string
     */
    getReplicatedEngine(engineName, zkPath) {
        const replica = this.getReplicaName();

        // Handle ReplacingMergeTree(column)
        const replacingMatch = engineName.match(/ReplacingMergeTree\((\w+)\)/i);
        if (replacingMatch) {
            return `ReplicatedReplacingMergeTree('${zkPath}', '${replica}', ${replacingMatch[1]})`;
        }

        // Handle plain engine names
        const engineMap = {
            'MergeTree': `ReplicatedMergeTree('${zkPath}', '${replica}')`,
            'ReplacingMergeTree': `ReplicatedReplacingMergeTree('${zkPath}', '${replica}')`,
            'SummingMergeTree': `ReplicatedSummingMergeTree('${zkPath}', '${replica}')`,
            'AggregatingMergeTree': `ReplicatedAggregatingMergeTree('${zkPath}', '${replica}')`
        };

        return engineMap[engineName] || `Replicated${engineName}('${zkPath}', '${replica}')`;
    }

    // ========================================
    // Query Settings
    // ========================================

    /**
     * Gets parallel replica settings for queries
     * @returns {Object} ClickHouse settings for parallel replicas
     */
    getParallelReplicaSettings() {
        if (!this.parallelReplicas.enabled) {
            return {};
        }

        const cluster = this.parallelReplicas.clusterForParallelReplicas
            || (this.isCloudMode() ? 'default' : this.getClusterName());

        return {
            // enable_parallel_replicas is the documented setting (values 0/1/2)
            // keep allow_experimental_parallel_reading_from_replicas for older CH versions
            enable_parallel_replicas: 1,
            allow_experimental_parallel_reading_from_replicas: 1,
            max_parallel_replicas: this.parallelReplicas.maxParallelReplicas || 2,
            cluster_for_parallel_replicas: cluster,
            parallel_replicas_for_non_replicated_merge_tree: 1
        };
    }

    /**
     * Gets distributed write settings
     * @returns {Object} ClickHouse settings for distributed writes
     */
    getDistributedWriteSettings() {
        if (!this.isClusterMode()) {
            return {};
        }

        return {
            insert_distributed_sync: this.distributed.insertDistributedSync ? 1 : 0
        };
    }

    /**
     * Gets cluster query optimization settings
     * @returns {Object} ClickHouse settings for cluster query optimization
     */
    getClusterQuerySettings() {
        if (!this.isClusterMode()) {
            return {};
        }

        return {
            optimize_skip_unused_shards: 1,
            optimize_distributed_group_by_sharding_key: 1
        };
    }

    /**
     * Gets all cluster-related ClickHouse settings
     * Combines parallel replica, distributed write, and query optimization settings
     * @returns {Object} Combined ClickHouse settings
     */
    getAllClusterSettings() {
        return {
            ...this.getParallelReplicaSettings(),
            ...this.getDistributedWriteSettings(),
            ...this.getClusterQuerySettings()
        };
    }

    // ========================================
    // Utility Methods
    // ========================================

    /**
     * Gets a summary of the cluster configuration for logging
     * @returns {Object} Configuration summary
     */
    getConfigSummary() {
        return {
            shards: this.cluster.shards,
            replicas: this.cluster.replicas,
            cloudMode: this.isCloudMode(),
            deploymentMode: this.getDeploymentMode(),
            clusterName: this.getClusterName(),
            isReplicated: this.isReplicated(),
            isSharded: this.isSharded(),
            coordinatorType: this.getCoordinatorType(),
            parallelReplicasEnabled: this.parallelReplicas.enabled,
            writeThrough: this.isWriteThroughEnabled(),
            distributedWriteSync: this.distributed.insertDistributedSync
        };
    }

    /**
     * Validates the cluster configuration
     * @returns {{valid: boolean, fatal: boolean, errors: string[], warnings: string[]}} Validation result
     *   - valid: true if no errors
     *   - fatal: true if errors should prevent startup
     *   - errors: list of error messages
     *   - warnings: list of warning messages
     */
    validateConfig() {
        const errors = [];
        const warnings = [];
        let fatal = false;

        // Validate coordinator type
        const validCoordinators = ['keeper', 'zookeeper'];
        if (!validCoordinators.includes(this.getCoordinatorType())) {
            errors.push(`Invalid coordinator type: ${this.getCoordinatorType()}. Valid types: ${validCoordinators.join(', ')}`);
        }

        // Validate database name matches SQL schema files
        // SQL files use hardcoded 'countly_drill' in @database directive
        if (this.database !== 'countly_drill') {
            errors.push(
                `Database configured as "${this.database}" but SQL schema files use "countly_drill". ` +
                `This mismatch may cause queries to fail. Either change config to use "countly_drill" or ` +
                `update SQL files to match your database name.`
            );
        }

        // Cloud mode info: shards/replicas booleans are ignored
        if (this.isCloudMode() && (this.cluster.shards || this.cluster.replicas)) {
            warnings.push(
                'Cloud mode is enabled. The shards/replicas settings are ignored in Cloud mode ' +
                'as ClickHouse Cloud handles distribution internally.'
            );
        }

        // Cluster mode requires cluster name
        if (this.isClusterMode() && !this.cluster.name) {
            errors.push('Cluster mode enabled but no cluster name specified. Set cluster.name.');
        }

        // Parallel replicas without cluster mode
        if (this.parallelReplicas.enabled && !this.isClusterMode() && !this.isCloudMode()) {
            warnings.push(
                'parallelReplicas.enabled=true has no effect in single-node mode. ' +
                'Enable cluster.replicas=true or cluster.isCloud=true for parallel replicas.'
            );
        }

        // Cloud cluster name info
        if (this.isCloudMode() && this.parallelReplicas.enabled && !this.parallelReplicas.clusterForParallelReplicas) {
            warnings.push(
                'Parallel replicas enabled in Cloud mode using default cluster name "default". ' +
                'This is typically correct for ClickHouse Cloud. If using a custom cluster, ' +
                'set parallelReplicas.clusterForParallelReplicas explicitly.'
            );
        }

        // FATAL: writeThrough=false with sharding causes data loss/imbalance
        if (this.isSharded() && !this.isWriteThroughEnabled()) {
            errors.push(
                'FATAL: distributed.writeThrough=false is not allowed with sharding (cluster.shards=true). ' +
                'Inserts would go to local node instead of being routed by sharding key, causing data imbalance. ' +
                'Set distributed.writeThrough=true for correct shard routing.'
            );
            fatal = true;
        }

        // Warning: parallel replicas without replication has no benefit
        if (this.parallelReplicas.enabled && this.isClusterMode() && !this.isReplicated()) {
            warnings.push(
                'parallelReplicas.enabled=true has no benefit without replication (cluster.replicas=true). ' +
                'Parallel replicas distribute reads across multiple replicas, but sharding-only mode has one replica per shard.'
            );
        }

        // Warning: sharding-only mode has no fault tolerance
        if (this.isSharded() && !this.isReplicated()) {
            warnings.push(
                'Sharding-only mode (cluster.shards=true, cluster.replicas=false) has no data redundancy. ' +
                'If a shard node fails, data on that shard is lost. Consider enabling cluster.replicas=true for HA.'
            );
        }

        // Deprecation warning for old config style
        if (this.cluster.mode || Object.prototype.hasOwnProperty.call(this.cluster, 'enabled')) {
            warnings.push(
                'Deprecated: cluster.mode and cluster.enabled are deprecated. ' +
                'Use cluster.shards and cluster.replicas boolean flags instead.'
            );
        }

        return {
            valid: errors.length === 0,
            fatal,
            errors,
            warnings
        };
    }
}

module.exports = ClusterManager;
