const log = require('../../../../api/utils/log.js')('clickhouse:dictionary-manager');
const countlyConfig = require('../../../../api/config');
const { URL } = require('url');
const ClusterManager = require('./ClusterManager');

/**
 * Generic manager for ClickHouse dictionaries.
 * Supports all dictionary types and layouts (HASHED, FLAT, CACHE, COMPLEX_KEY, RANGE, etc.).
 *
 * This is a low-level utility for creating, managing, and monitoring ClickHouse dictionaries.
 * Can be used directly or wrapped by domain-specific classes.
 *
 * Supported layouts:
 * - FLAT, HASHED, SPARSE_HASHED, CACHE, DIRECT
 * - COMPLEX_KEY_HASHED, COMPLEX_KEY_CACHE, COMPLEX_KEY_DIRECT
 * - RANGE_HASHED, COMPLEX_KEY_RANGE_HASHED
 * - IP_TRIE, POLYGON
 *
 * Sources supported:
 * - ClickHouse (local or remote)
 * - File (CSV, TSV)
 * - HTTP/HTTPS
 * - MongoDB, MySQL, PostgreSQL, etc. (via ODBC)
 */
class DictionaryManager {
    /**
     * Creates a new DictionaryManager instance.
     * @param {ClickHouseClient} client - ClickHouse client instance
     * @param {string} database - Database containing the dictionary
     * @param {string} name - Dictionary name
     */
    constructor(client, database, name) {
        this.client = client;
        this.database = database;
        this.name = name;
        this.fullName = `${database}.${name}`;
        log.d(`DictionaryManager initialized for ${this.fullName}`);
    }

    /**
     * Creates a dictionary with the specified configuration.
     * @param {Object} config - Dictionary configuration
     * @param {Array<{name: string, type: string}>} config.structure - Column definitions
     * @param {string|Array<string>} config.primaryKey - Primary key column(s)
     * @param {Object} config.source - Source configuration
     * @param {string} config.source.type - Source type (e.g., 'CLICKHOUSE', 'FILE', 'HTTP')
     * @param {Object} config.source.params - Source-specific parameters
     * @param {Object} config.layout - Layout configuration
     * @param {string} config.layout.type - Layout type (e.g., 'HASHED', 'COMPLEX_KEY_RANGE_HASHED')
     * @param {Object} [config.layout.params] - Layout-specific parameters
     * @param {Object} [config.lifetime] - Lifetime configuration
     * @param {number} [config.lifetime.min=0] - Minimum lifetime in seconds
     * @param {number} [config.lifetime.max=0] - Maximum lifetime in seconds
     * @param {Object} [config.range] - Range configuration (for RANGE layouts)
     * @param {string} [config.range.min] - Minimum range column
     * @param {string} [config.range.max] - Maximum range column
     * @param {string} [config.invalidateQuery] - Query to determine when to invalidate
     * @returns {Promise<void>} returns Promise<void>
     */
    async create(config) {
        log.d(`Creating dictionary ${this.fullName}`, config);

        try {
            // Build CREATE DICTIONARY statement
            const createQuery = this._buildCreateQuery(config);

            await this.client.exec({
                query: createQuery
            });

            log.d(`Dictionary ${this.fullName} created successfully`);
        }
        catch (error) {
            if (error.message && error.message.includes('already exists')) {
                log.w(`Dictionary ${this.fullName} already exists (concurrent creation)`);
                return; // Don't throw - this is acceptable
            }
            log.e(`Failed to create dictionary ${this.fullName}:`, error);
            throw error;
        }
    }

    /**
     * Builds the CREATE DICTIONARY SQL statement from configuration.
     * @private
     * @param {Object} config - Dictionary configuration
     * @param {Object} [options={}] - Build options
     * @param {boolean} [options.onCluster=false] - Add ON CLUSTER clause
     * @param {Object} [options.clusterManager] - ClusterManager instance for getting cluster name
     * @returns {string} CREATE DICTIONARY SQL statement
     */
    _buildCreateQuery(config, options = {}) {
        const parts = [];

        // CREATE DICTIONARY header with optional ON CLUSTER clause
        let onClusterClause = '';
        if (options.onCluster && options.clusterManager) {
            onClusterClause = options.clusterManager.getOnClusterClause();
        }

        parts.push(`CREATE DICTIONARY ${this.fullName} ${onClusterClause}`.trim());
        parts.push('(');

        // Structure (columns)
        const columns = config.structure.map(col => `  ${col.name} ${col.type}`).join(',\n');
        parts.push(columns);

        parts.push(')');

        // PRIMARY KEY
        const primaryKey = Array.isArray(config.primaryKey)
            ? config.primaryKey.join(', ')
            : config.primaryKey;
        parts.push(`PRIMARY KEY ${primaryKey}`);

        // SOURCE
        parts.push(this._buildSourceClause(config.source));

        // LAYOUT
        parts.push(this._buildLayoutClause(config.layout));

        // RANGE (if applicable)
        if (config.range) {
            parts.push(`RANGE(MIN ${config.range.min} MAX ${config.range.max})`);
        }

        // LIFETIME
        const lifetime = config.lifetime || { min: 0, max: 0 };
        parts.push(`LIFETIME(MIN ${lifetime.min} MAX ${lifetime.max})`);

        // Note: INVALIDATE_QUERY is supported in CLICKHOUSE source type dictionaries.
        // It runs periodically (based on LIFETIME) to check if source data changed.
        // See _buildClickHouseSource() for INVALIDATE_QUERY parameter support.

        return parts.join('\n');
    }

    /**
     * Builds the SOURCE clause for CREATE DICTIONARY.
     * Delegates to specific source type methods.
     * @private
     * @param {Object} source - Source configuration
     * @returns {string} SOURCE clause
     */
    _buildSourceClause(source) {
        const type = source.type.toUpperCase();
        const params = source.params || {};

        const sourceMethod = this._getSourceBuilderMethod(type);
        if (!sourceMethod) {
            throw new Error(`Unsupported source type: ${type}`);
        }

        return sourceMethod.call(this, params);
    }

    /**
     * Gets the appropriate source builder method for the given type.
     * @private
     * @param {string} type - Source type (uppercase)
     * @returns {Function|null} Source builder method or null if not supported
     */
    _getSourceBuilderMethod(type) {
        const sourceBuilders = {
            'CLICKHOUSE': this._buildClickHouseSource,
            'FILE': this._buildFileSource,
            'HTTP': this._buildHttpSource,
        };

        // Optional MongoDB support - only include if explicitly enabled
        if (this._isMongoDBSourceEnabled()) {
            sourceBuilders.MONGODB = this._buildMongoDBSource;
        }

        return sourceBuilders[type] || null;
    }

    /**
     * Checks if MongoDB source support is enabled.
     * MongoDB sources are optional and can be disabled via configuration.
     * @private
     * @returns {boolean} True if MongoDB sources are supported
     */
    _isMongoDBSourceEnabled() {
        // Check if MongoDB source support is explicitly disabled in config
        const clickhouseConfig = countlyConfig.clickhouse || {};
        const dictionaryConfig = clickhouseConfig.dictionary || {};

        // Default to true for backward compatibility, but can be disabled via config
        if (dictionaryConfig.enableMongoDBSource === false) {
            return false;
        }

        // Optionally check if MongoDB connection is available
        // This prevents errors when MongoDB is not configured
        try {
            // Check if mongodb driver is available
            require.resolve('mongodb');
            return true;
        }
        catch (e) {
            log.d('MongoDB driver not available, MongoDB dictionary sources disabled');
            return false;
        }
    }

    /**
     * Builds CLICKHOUSE source clause.
     * @private
     * @param {Object} params - Source parameters
     * @returns {string} CLICKHOUSE SOURCE clause
     */
    _buildClickHouseSource(params) {
        // If useLocalTable is true, use local TABLE form (no network, most efficient)
        // This avoids the native-protocol-on-HTTP-port issue entirely
        if (params.useLocalTable && params.table) {
            log.d('Building local CLICKHOUSE source (no network):', { table: params.table });
            return `SOURCE(CLICKHOUSE(TABLE '${params.table}'))`;
        }

        // Get ClickHouse configuration from config.js (similar to ClickhouseClient.js)
        const clickhouseConfig = countlyConfig.clickhouse || {};

        // Parse URL to extract host
        let configHost = 'localhost';
        // let configHttpPort = 8123;
        try {
            const baseUrl = clickhouseConfig.url || 'http://localhost:8123';
            const parsed = new URL(baseUrl);
            configHost = parsed.hostname;
            // configHttpPort = Number(parsed.port || (parsed.protocol === 'https:' ? 443 : 8123));
        }
        catch (error) {
            log.w('Failed to parse ClickHouse URL from config, using defaults:', error.message);
        }

        // For dictionary sources, use native TCP port (9000) instead of HTTP port (8123)
        // Dictionary SOURCE(CLICKHOUSE) speaks native protocol, not HTTP
        // Port and host can be overridden via clickhouse.dictionary config
        const dictionaryConfig = clickhouseConfig.dictionary || {};
        const configNativePort = dictionaryConfig.nativePort || 9000;

        // In cluster mode, default to localhost to ensure each node reads its own local shard
        // This avoids load balancer routing issues where dictionary might query wrong shard
        // Can be overridden via clickhouse.dictionary.host config
        const cm = new ClusterManager(clickhouseConfig);
        const clusterDefaultHost = cm.isClusterMode() && !cm.isCloudMode() ? 'localhost' : configHost;
        const configDictHost = dictionaryConfig.host || clusterDefaultHost;

        // Merge config with params, params take precedence
        const host = params.host || configDictHost;
        const port = params.port !== undefined ? params.port : configNativePort;
        const user = params.user || clickhouseConfig.username || 'default';
        const password = params.password || clickhouseConfig.password || '';
        const db = params.db || clickhouseConfig.database || 'countly_drill';

        // Check if secure connection is needed (for ClickHouse Cloud)
        // Can be set via params.secure or dictionary.secure config
        const secure = params.secure !== undefined ? params.secure : dictionaryConfig.secure;

        const parts = [];

        // ClickHouse Cloud: skip HOST, PORT, DB - they're implicit
        if (!cm.isCloudMode()) {
            parts.push(`HOST '${host}'`);
            parts.push(`PORT ${port}`);
        }

        parts.push(`USER '${user}'`);
        if (password) {
            parts.push(`PASSWORD '${password}'`);
        }

        // ClickHouse Cloud: skip DB parameter
        if (!cm.isCloudMode()) {
            parts.push(`DB '${db}'`);
        }

        // Add SECURE flag for TLS connections (required for ClickHouse Cloud)
        if (secure) {
            parts.push(`SECURE 1`);
        }

        if (params.table) {
            parts.push(`TABLE '${params.table}'`);
        }
        if (params.query) {
            parts.push(`QUERY '${params.query.replace(/'/g, "''")}'`);
        }
        if (params.where) {
            parts.push(`WHERE '${params.where}'`);
        }
        if (params.invalidate_query) {
            parts.push(`INVALIDATE_QUERY '${params.invalidate_query}'`);
        }

        log.d('Building CLICKHOUSE source:', {
            host: cm.isCloudMode() ? '(cloud)' : host,
            port: cm.isCloudMode() ? '(cloud)' : port,
            user,
            db: cm.isCloudMode() ? '(cloud)' : db,
            secure: !!secure,
            cloudMode: cm.isCloudMode()
        });
        return `SOURCE(CLICKHOUSE(\n  ${parts.join('\n  ')}\n))`;
    }

    /**
     * Builds FILE source clause.
     * @private
     * @param {Object} params - Source parameters
     * @returns {string} FILE SOURCE clause
     */
    _buildFileSource(params) {
        if (!params.path || !params.format) {
            throw new Error('FILE source requires path and format parameters');
        }
        return `SOURCE(FILE(PATH '${params.path}' FORMAT ${params.format}))`;
    }

    /**
     * Builds HTTP source clause.
     * @private
     * @param {Object} params - Source parameters
     * @returns {string} HTTP SOURCE clause
     */
    _buildHttpSource(params) {
        if (!params.url || !params.format) {
            throw new Error('HTTP source requires url and format parameters');
        }

        const parts = [`URL '${params.url}'`, `FORMAT ${params.format}`];
        if (params.headers) {
            parts.push(`HEADERS(${params.headers})`);
        }
        return `SOURCE(HTTP(\n  ${parts.join('\n  ')}\n))`;
    }

    /**
     * Builds MONGODB source clause.
     * This is an optional source type that can be disabled via configuration.
     * @private
     * @param {Object} params - Source parameters
     * @returns {string} MONGODB SOURCE clause
     */
    _buildMongoDBSource(params) {
        const parts = [];

        if (params.host) {
            parts.push(`HOST '${params.host}'`);
        }
        if (params.port) {
            parts.push(`PORT ${params.port}`);
        }
        if (params.user) {
            parts.push(`USER '${params.user}'`);
        }
        if (params.password) {
            parts.push(`PASSWORD '${params.password}'`);
        }
        if (params.db) {
            parts.push(`DB '${params.db}'`);
        }
        if (params.collection) {
            parts.push(`COLLECTION '${params.collection}'`);
        }

        if (parts.length === 0) {
            throw new Error('MONGODB source requires at least one connection parameter');
        }

        log.d('Building MONGODB source');
        return `SOURCE(MONGODB(\n  ${parts.join('\n  ')}\n))`;
    }

    /**
     * Builds the LAYOUT clause for CREATE DICTIONARY.
     * @private
     * @param {Object} layout - Layout configuration
     * @returns {string} LAYOUT clause
     */
    _buildLayoutClause(layout) {
        const type = layout.type.toUpperCase();
        const params = layout.params || {};

        // Layouts without parameters
        const simpleLayouts = [
            'FLAT', 'HASHED', 'SPARSE_HASHED', 'DIRECT',
            'COMPLEX_KEY_HASHED', 'COMPLEX_KEY_DIRECT',
            'RANGE_HASHED', 'COMPLEX_KEY_RANGE_HASHED',
            'IP_TRIE', 'POLYGON'
        ];

        if (simpleLayouts.includes(type)) {
            return `LAYOUT(${type}())`;
        }

        // Layouts with parameters (e.g., CACHE, COMPLEX_KEY_CACHE, SSD_CACHE)
        if (type.includes('CACHE')) {
            const paramParts = [];
            if (params.size_in_cells) {
                paramParts.push(`SIZE_IN_CELLS ${params.size_in_cells}`);
            }
            if (params.path) {
                paramParts.push(`PATH '${params.path}'`);
            }
            if (params.max_stored_keys) {
                paramParts.push(`MAX_STORED_KEYS ${params.max_stored_keys}`);
            }
            const paramStr = paramParts.length > 0 ? paramParts.join(' ') : '';
            return `LAYOUT(${type}(${paramStr}))`;
        }

        return `LAYOUT(${type}())`;
    }

    /**
     * Drops the dictionary if it exists.
     * @param {boolean} [ifExists=true] - Add IF EXISTS clause
     * @returns {Promise<void>} returns Promise<void>
     */
    async drop(ifExists = true) {
        log.d(`Dropping dictionary ${this.fullName}`);

        try {
            const query = ifExists
                ? `DROP DICTIONARY IF EXISTS ${this.fullName}`
                : `DROP DICTIONARY ${this.fullName}`;

            await this.client.exec({
                query: query
            });

            log.d(`Dictionary ${this.fullName} dropped successfully`);
        }
        catch (error) {
            log.e(`Failed to drop dictionary ${this.fullName}:`, error);
            throw error;
        }
    }

    /**
     * Reloads the dictionary from its source.
     * @returns {Promise<void>} returns Promise<void>
     */
    async reload() {
        log.d(`Reloading dictionary ${this.fullName}`);

        try {
            await this.client.exec({
                query: `SYSTEM RELOAD DICTIONARY ${this.fullName}`
            });

            log.d(`Dictionary ${this.fullName} reloaded successfully`);
        }
        catch (error) {
            log.e(`Failed to reload dictionary ${this.fullName}:`, error);
            throw error;
        }
    }

    /**
     * Checks if the dictionary exists.
     * @returns {Promise<boolean>} True if dictionary exists
     */
    async exists() {
        log.d(`Checking if dictionary ${this.fullName} exists`);

        try {
            const query = `
                SELECT count() as count
                FROM system.dictionaries
                WHERE database = {database:String}
                  AND name = {name:String}
            `;

            const result = await this.client.query({
                query: query,
                query_params: {
                    database: this.database,
                    name: this.name
                },
                format: 'JSONEachRow'
            });

            const rows = await result.json();
            const exists = rows[0]?.count > 0;
            log.d(`Dictionary ${this.fullName} exists:`, exists);
            return exists;
        }
        catch (error) {
            log.e(`Failed to check dictionary existence:`, error);
            throw error;
        }
    }

    /**
     * Gets comprehensive statistics about the dictionary.
     * @returns {Promise<Object|null>} Dictionary statistics or null if not found
     */
    async getStats() {
        log.d(`Getting statistics for dictionary ${this.fullName}`);

        try {
            const query = `
                SELECT
                    database,
                    name,
                    status,
                    origin,
                    type,
                    key,
                    attribute.names AS attribute_names,
                    attribute.types AS attribute_types,
                    element_count,
                    load_factor,
                    bytes_allocated,
                    query_count,
                    hit_rate,
                    found_rate,
                    loading_start_time,
                    last_successful_update_time,
                    loading_duration,
                    last_exception
                FROM system.dictionaries
                WHERE database = {database:String}
                  AND name = {name:String}
            `;

            const result = await this.client.query({
                query: query,
                query_params: {
                    database: this.database,
                    name: this.name
                },
                format: 'JSONEachRow'
            });

            const stats = await result.json();
            if (stats.length > 0) {
                log.d(`Dictionary ${this.fullName} statistics:`, stats[0]);
                return stats[0];
            }
            else {
                log.d(`Dictionary ${this.fullName} not found`);
                return null;
            }
        }
        catch (error) {
            log.e(`Failed to get dictionary statistics:`, error);
            throw error;
        }
    }

    /**
     * Gets the last exception that occurred during dictionary loading.
     * @returns {Promise<string|null>} Exception message or null
     */
    async getLastException() {
        log.d(`Getting last exception for dictionary ${this.fullName}`);

        try {
            const query = `
                SELECT last_exception
                FROM system.dictionaries
                WHERE database = {database:String}
                  AND name = {name:String}
            `;

            const result = await this.client.query({
                query: query,
                query_params: {
                    database: this.database,
                    name: this.name
                },
                format: 'JSONEachRow'
            });

            const rows = await result.json();
            const exception = rows[0]?.last_exception || null;
            if (exception) {
                log.w(`Dictionary ${this.fullName} has exception:`, exception);
            }
            return exception;
        }
        catch (error) {
            log.e(`Failed to get dictionary exception:`, error);
            throw error;
        }
    }

    /**
     * Gets a value from the dictionary using dictGet.
     * @param {string} attribute - Attribute name to retrieve
     * @param {string|Array} key - Key value(s)
     * @param {any} [defaultValue] - Default value if key not found
     * @returns {Promise<any>} Retrieved value
     */
    async getValue(attribute, key, defaultValue = null) {
        log.d(`Getting value from dictionary ${this.fullName}`, { attribute, key });

        try {
            const hasDefault = defaultValue !== null;
            const func = hasDefault ? 'dictGetOrDefault' : 'dictGet';

            // Format key for query
            const keyStr = Array.isArray(key)
                ? `(${key.map(k => typeof k === 'string' ? `'${k}'` : k).join(', ')})`
                : typeof key === 'string' ? `'${key}'` : key;

            // Build query
            const queryParts = [
                `SELECT ${func}('${this.fullName}', '${attribute}', ${keyStr}`
            ];

            if (hasDefault) {
                const defaultStr = typeof defaultValue === 'string'
                    ? `'${defaultValue}'`
                    : defaultValue;
                queryParts.push(`, ${defaultStr}`);
            }

            queryParts.push(') AS value');

            const query = queryParts.join('');

            const result = await this.client.query({
                query: query,
                format: 'JSONEachRow'
            });

            const rows = await result.json();
            const value = rows[0]?.value;
            log.d(`Retrieved value:`, value);
            return value;
        }
        catch (error) {
            log.e(`Failed to get value from dictionary:`, error);
            throw error;
        }
    }

    /**
     * Gets the SQL expression for retrieving a value from the dictionary.
     * Useful for embedding in larger queries.
     * @param {string} attribute - Attribute name to retrieve
     * @param {string} keyExpression - SQL expression for the key
     * @param {string} [defaultExpression] - SQL expression for default value
     * @returns {string} SQL expression
     */
    getDictGetExpression(attribute, keyExpression, defaultExpression = null) {
        if (defaultExpression) {
            return `dictGetOrDefault('${this.fullName}', '${attribute}', ${keyExpression}, ${defaultExpression})`;
        }
        else {
            return `dictGet('${this.fullName}', '${attribute}', ${keyExpression})`;
        }
    }

    /**
     * Creates or replaces the dictionary.
     * @param {Object} config - Dictionary configuration
     * @returns {Promise<void>} returns Promise<void>
     */
    async createOrReplace(config) {
        log.d(`Creating or replacing dictionary ${this.fullName}`);
        await this.drop(true);
        await this.create(config);
    }

    /**
     * Creates dictionary if it doesn't exist, validates existence after.
     * Works for both cloud and non-cloud modes.
     * @param {Object} config - Dictionary configuration
     * @param {Object} [options={}] - Options (onCluster, clusterManager)
     * @returns {Promise<void>} returns Promise<void>
     */
    async createIfNotExists(config, options = {}) {
        log.d(`Creating dictionary ${this.fullName} if not exists`);

        // Check if already exists
        const alreadyExists = await this.exists();
        if (alreadyExists) {
            log.d(`Dictionary ${this.fullName} already exists, skipping creation`);
            return;
        }

        // Attempt creation
        try {
            const isCloud = options.clusterManager && options.clusterManager.isCloudMode();

            if (isCloud) {
                // Cloud: simple create (no ON CLUSTER)
                const createQuery = this._buildCreateQuery(config);
                await this.client.exec({ query: createQuery });
            }
            else {
                // Non-cloud: create with cluster support
                await this.createWithCluster(config, options);
            }
            log.d(`Dictionary ${this.fullName} created successfully`);
        }
        catch (error) {
            // Ignore "already exists" errors (race condition from concurrent pods)
            if (error.message && error.message.includes('already exists')) {
                log.d(`Dictionary ${this.fullName} already exists (concurrent creation)`);
            }
            else {
                log.e(`Failed to create dictionary ${this.fullName}:`, error);
                throw error;
            }
        }

        // Validate dictionary exists after attempt
        const existsNow = await this.exists();
        if (!existsNow) {
            throw new Error(`Dictionary ${this.fullName} does not exist after creation attempt`);
        }
    }

    // ========================================
    // Cluster-Aware Operations
    // ========================================

    /**
     * Creates a dictionary with cluster awareness.
     * Uses ON CLUSTER clause to create dictionary on all cluster nodes.
     * @param {Object} config - Dictionary configuration
     * @param {Object} [options={}] - Creation options
     * @param {boolean} [options.onCluster=false] - Use ON CLUSTER clause
     * @param {Object} [options.clusterManager] - ClusterManager instance
     * @returns {Promise<void>} returns Promise<void>
     */
    async createWithCluster(config, options = {}) {
        const { onCluster = false, clusterManager } = options;

        // Skip DDL for Cloud mode
        if (clusterManager && clusterManager.isCloudMode()) {
            log.i(`ClickHouse Cloud mode - skipping dictionary DDL for ${this.fullName}`);
            return;
        }

        log.d(`Creating dictionary ${this.fullName} with cluster support`, {
            onCluster,
            hasClusterManager: !!clusterManager
        });

        try {
            const createQuery = this._buildCreateQuery(config, {
                onCluster,
                clusterManager
            });

            await this.client.exec({
                query: createQuery
            });

            log.d(`Dictionary ${this.fullName} created successfully with cluster support`);
        }
        catch (error) {
            if (error.message && error.message.includes('already exists')) {
                log.w(`Dictionary ${this.fullName} already exists (concurrent creation)`);
                return; // Don't throw - this is acceptable
            }
            log.e(`Failed to create dictionary ${this.fullName} with cluster:`, error);
            throw error;
        }
    }

    /**
     * Drops the dictionary with cluster awareness.
     * Uses ON CLUSTER clause to drop dictionary on all cluster nodes.
     * @param {boolean} [ifExists=true] - Add IF EXISTS clause
     * @param {Object} [options={}] - Drop options
     * @param {boolean} [options.onCluster=false] - Use ON CLUSTER clause
     * @param {Object} [options.clusterManager] - ClusterManager instance
     * @returns {Promise<void>} returns Promise<void>
     */
    async dropWithCluster(ifExists = true, options = {}) {
        const { onCluster = false, clusterManager } = options;

        // Skip DDL for Cloud mode
        if (clusterManager && clusterManager.isCloudMode()) {
            log.i(`ClickHouse Cloud mode - skipping dictionary drop DDL for ${this.fullName}`);
            return;
        }

        log.d(`Dropping dictionary ${this.fullName} with cluster support`, { onCluster });

        try {
            let onClusterClause = '';
            if (onCluster && clusterManager) {
                onClusterClause = clusterManager.getOnClusterClause();
            }

            const query = ifExists
                ? `DROP DICTIONARY IF EXISTS ${this.fullName} ${onClusterClause}`.trim()
                : `DROP DICTIONARY ${this.fullName} ${onClusterClause}`.trim();

            await this.client.exec({
                query: query
            });

            log.d(`Dictionary ${this.fullName} dropped successfully with cluster support`);
        }
        catch (error) {
            log.e(`Failed to drop dictionary ${this.fullName} with cluster:`, error);
            throw error;
        }
    }

    /**
     * Creates or replaces the dictionary with cluster awareness.
     * @param {Object} config - Dictionary configuration
     * @param {Object} [options={}] - Options
     * @param {boolean} [options.onCluster=false] - Use ON CLUSTER clause
     * @param {Object} [options.clusterManager] - ClusterManager instance
     * @returns {Promise<void>} returns Promise<void>
     */
    async createOrReplaceWithCluster(config, options = {}) {
        log.d(`Creating dictionary ${this.fullName} if not exists (cluster-aware)`);
        await this.createIfNotExists(config, options);
    }

    /**
     * Reloads the dictionary on all cluster nodes.
     * @param {Object} [clusterManager] - ClusterManager instance for getting cluster name
     * @returns {Promise<void>} returns Promise<void>
     */
    async reloadOnCluster(clusterManager) {
        log.d(`Reloading dictionary ${this.fullName} on cluster`);

        try {
            if (clusterManager && clusterManager.isClusterMode() && !clusterManager.isCloudMode()) {
                // Reload on all cluster nodes
                const clusterName = clusterManager.getClusterName();
                await this.client.exec({
                    query: `SYSTEM RELOAD DICTIONARY ${this.fullName} ON CLUSTER ${clusterName}`
                });
                log.d(`Dictionary ${this.fullName} reloaded on cluster ${clusterName}`);
            }
            else {
                // Single node reload
                await this.reload();
            }
        }
        catch (error) {
            log.e(`Failed to reload dictionary ${this.fullName} on cluster:`, error);
            throw error;
        }
    }

    /**
     * Gets the dictionary's configuration from system tables.
     * @returns {Promise<Object|null>} Dictionary configuration or null
     */
    async getConfig() {
        log.d(`Getting configuration for dictionary ${this.fullName}`);

        try {
            const query = `
                SELECT
                    create_query,
                    engine,
                    source,
                    lifetime_min,
                    lifetime_max
                FROM system.dictionaries
                WHERE database = {database:String}
                  AND name = {name:String}
            `;

            const result = await this.client.query({
                query: query,
                query_params: {
                    database: this.database,
                    name: this.name
                },
                format: 'JSONEachRow'
            });

            const rows = await result.json();
            if (rows.length > 0) {
                return rows[0];
            }
            return null;
        }
        catch (error) {
            log.e(`Failed to get dictionary configuration:`, error);
            throw error;
        }
    }
}

module.exports = DictionaryManager;
