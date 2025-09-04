/**
 * Query Runner
 * Unified query execution with automatic adapter selection
 * Supports multiple database adapters with configuration-based selection
 * @module api/parts/data/QueryRunner
 */
const config = require('../../config');
const log = require('../../utils/log.js')('query-runner');
const fs = require('fs');
const path = require('path');

config.database = config.database || {};
if (!config.database.adapters || Object.keys(config.database.adapters).length === 0) {
    config.database.adapters = {
        mongodb: {
            enabled: true
        }
    };
}
/**
 * QueryRunner Class
 * 
 * Provides unified query execution across multiple database adapters.
 * Automatically selects the best available adapter based on configuration preferences.
 * 
 * Features:
 * - Multi-adapter support (MongoDB, ClickHouse)
 * - Configuration-based adapter selection
 * - Forced adapter execution
 * - Automatic fallback to available adapters
 * 
 * @class QueryRunner
 * @example
 * // Create instance (usually done in api.js)
 * const queryRunner = new QueryRunner();
 * 
 * // Define a query with multiple adapters
 * const queryDef = {
 *   name: 'FETCH_ANALYTICS_DATA',
 *   adapters: {
 *     mongodb: {
 *       handler: mongoHandler
 *     },
 *     clickhouse: {
 *       handler: clickhouseHandler
 *     }
 *   }
 * };
 * 
 * // Execute with automatic adapter selection
 * const data = await queryRunner.executeQuery(queryDef, params);
 */
class QueryRunner {

    /**
     * Get the current comparison mode from config
     * @returns {string} The comparison mode ('disabled', 'files', 'logs', 'both')
     * @private
     */
    _getComparisonMode() {
        return config.database?.comparisonLogs?.mode || 'files';
    }

    /**
     * Ensure comparison logs directory exists
     * @returns {string} Path to the comparison logs directory
     * @private
     */
    ensureComparisonLogsDir() {
        const comparisonLogsDir = path.join(process.cwd(), 'comparison_logs');
        if (!fs.existsSync(comparisonLogsDir)) {
            fs.mkdirSync(comparisonLogsDir, { recursive: true });
        }
        return comparisonLogsDir;
    }

    /**
     * Write comparison results to JSON file and/or application logs
     * @param {string} queryName - Query name for file naming
     * @param {Object} comparisonData - Data to write
     * @private
     */
    writeComparisonLog(queryName, comparisonData) {
        const comparisonMode = this._getComparisonMode();

        // Skip logging if disabled
        if (comparisonMode === 'disabled') {
            return;
        }

        // Add development warning to comparison data
        const dataWithWarning = {
            ...comparisonData,
            warning: "DEVELOPMENT FEATURE: Query comparison logging should be disabled in production environments for performance reasons"
        };

        try {
            // Write to files if mode is 'files' or 'both'
            if (comparisonMode === 'files' || comparisonMode === 'both') {
                const comparisonLogsDir = this.ensureComparisonLogsDir();
                const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
                const filename = `${queryName}_${timestamp}.json`;
                const filepath = path.join(comparisonLogsDir, filename);

                // Use async file write to avoid blocking
                fs.writeFile(filepath, JSON.stringify(dataWithWarning, null, 2), (err) => {
                    if (err) {
                        log.e('Failed to write comparison log file', err);
                    }
                    else {
                        log.d(`Comparison log written to file: ${filepath}`);
                    }
                });
            }

            // Write to application logs if mode is 'logs' or 'both'
            if (comparisonMode === 'logs' || comparisonMode === 'both') {
                log.w('DEVELOPMENT FEATURE: Query comparison logging to application logs should be disabled in production');
                // Log summary instead of full data to prevent log flooding
                const logSummary = {
                    queryName: dataWithWarning.queryName,
                    timestamp: dataWithWarning.timestamp,
                    warning: dataWithWarning.warning,
                    adaptersExecuted: Object.keys(dataWithWarning.adapters || {}),
                    results: Object.entries(dataWithWarning.adapters || {}).map(([adapter, data]) => ({
                        adapter,
                        success: data.success,
                        duration: data.duration,
                        resultCount: Array.isArray(data.transformedResult) ? data.transformedResult.length : 'N/A'
                    }))
                };
                log.i(`Query comparison summary for '${queryName}':`, JSON.stringify(logSummary, null, 2));
            }
        }
        catch (error) {
            log.w('Failed to write comparison log - this development feature should be disabled in production', error);
        }
    }

    /**
     * Execute a query definition directly without registration
     * @param {Object} queryDef - Query definition object
     * @param {string} queryDef.name - Query name for logging and debugging
     * @param {Object} queryDef.adapters - Adapter configurations keyed by adapter name
     * @param {Object} [queryDef.adapters.mongodb] - MongoDB adapter configuration
     * @param {Function} queryDef.adapters.mongodb.handler - Async function that executes MongoDB query
     * @param {Function} [queryDef.adapters.mongodb.transform] - Optional transformation function for MongoDB results
     * @param {boolean} [queryDef.adapters.mongodb.available] - Whether this adapter is available (defaults to true)
     * @param {Object} [queryDef.adapters.clickhouse] - ClickHouse adapter configuration
     * @param {Function} queryDef.adapters.clickhouse.handler - Async function that executes ClickHouse query
     * @param {Function} [queryDef.adapters.clickhouse.transform] - Optional transformation function for ClickHouse results
     * @param {boolean} [queryDef.adapters.clickhouse.available] - Whether this adapter is available (defaults to true)
     * @param {Object} params - Query parameters passed to the handler function
     * @param {Object} [options] - Execution options
     * @param {string} [options.adapter] - Force specific adapter ('mongodb' or 'clickhouse')
     * @param {boolean} [options.comparison] - Enable comparison mode (runs on all adapters)
     * @param {Object} [transformOptions] - Options passed to adapter-specific transform functions
     * @returns {Promise<any>} Query result as returned by the handler (and transformed if transform is provided)
     * @throws {Error} If query definition is invalid or no suitable adapter found
     * @example
     * const queryDef = {
     *   name: 'FETCH_USER_EVENTS',
     *   adapters: {
     *     mongodb: {
     *       handler: async (params) => { 
     *         return await db.collection('events').find(params.filter).toArray();
     *       },
     *       transform: async (result, transformOptions) => {
     *         return result.data.map(doc => ({ id: doc._id, count: doc.count }));
     *       }
     *     },
     *     clickhouse: {
     *       handler: async (params) => {
     *         return await ch.query({ query: params.sql });
     *       },
     *       transform: async (result, transformOptions) => {
     *         return result.data.map(row => ({ id: row.id, count: parseInt(row.count) }));
     *       }
     *     }
     *   }
     * };
     * 
     * const result = await queryRunner.executeQuery(
     *   queryDef, 
     *   { filter: { app_id: '123' } }, 
     *   { adapter: 'clickhouse' },
     *   { type: 'drill_format' }
     * );
     */
    async executeQuery(queryDef, params, options = {}, transformOptions = {}) {
        const startTime = Date.now();
        try {
            if (!queryDef || !queryDef.adapters) {
                throw new Error('Invalid query definition: must have adapters');
            }

            if (!queryDef.name) {
                throw new Error('Query definition must have a name');
            }

            const queryName = queryDef.name;

            // Check if comparison mode is enabled (either explicitly or via config)
            const comparisonMode = this._getComparisonMode();
            const shouldRunComparison = options.comparison || (comparisonMode !== 'disabled');

            if (shouldRunComparison) {
                return await this.executeQueryWithComparison(queryDef, params, options, transformOptions);
            }

            const selectedAdapter = this.selectAdapterForDef(queryDef, options.adapter);
            let result = await this.executeOnAdapter(queryDef, selectedAdapter, params, options);

            // Apply adapter-specific transformation if provided
            const adapterTransform = queryDef.adapters[selectedAdapter]?.transform;
            if (adapterTransform && typeof adapterTransform === 'function') {
                const transformStartTime = Date.now();
                try {
                    // Pass only the data to transform, then reconstruct the result
                    const transformedData = await adapterTransform(result.data, transformOptions);
                    result = {
                        _queryMeta: result._queryMeta,
                        data: transformedData
                    };
                    const transformDuration = Date.now() - transformStartTime;
                    log.d(`Query transformation completed: ${queryName} on ${selectedAdapter} in ${transformDuration}ms`);
                }
                catch (transformError) {
                    const transformDuration = Date.now() - transformStartTime;
                    log.e(`Query transformation failed: ${queryName} on ${selectedAdapter} after ${transformDuration}ms`, transformError);
                    throw transformError;
                }
            }

            const duration = Date.now() - startTime;
            log.d(`Query completed: ${queryName} on ${selectedAdapter} in ${duration}ms`);

            // Enforce QueryRunner convention: handlers must return { _queryMeta, data }
            if (!result || typeof result !== 'object' || !Object.prototype.hasOwnProperty.call(result, '_queryMeta') || !Object.prototype.hasOwnProperty.call(result, 'data')) {
                throw new Error(`Handler for query '${queryName}' on adapter '${selectedAdapter}' must return object with '_queryMeta' and 'data' properties`);
            }

            return result.data;
        }
        catch (error) {
            const duration = Date.now() - startTime;
            const queryName = queryDef?.name || 'unnamed_query';
            log.e(`Query execution failed: ${queryName} after ${duration}ms`, error);
            throw error;
        }
    }

    /**
     * Execute query with comparison mode - runs on all available adapters
     * @param {Object} queryDef - Query definition object
     * @param {Object} params - Query parameters
     * @param {Object} options - Execution options
     * @param {Object} transformOptions - Transform options
     * @returns {Promise<any>} Result from the selected adapter (normal flow)
     * @private
     */
    async executeQueryWithComparison(queryDef, params, options, transformOptions) {
        const queryName = queryDef.name || 'unnamed_query';
        const comparisonData = {
            queryName,
            timestamp: new Date().toISOString(),
            notes: {
                dataConsistency: "Ensure both adapters are querying equivalent data. MongoDB and ClickHouse may have different field schemas."
            },
            adapters: {}
        };

        // Determine the primary adapter for return value
        const primaryAdapter = this.selectAdapterForDef(queryDef, options.adapter);
        let primaryResult = null;

        // Get all available adapters for this query
        const availableAdapters = Object.keys(queryDef.adapters).filter(
            name => queryDef.adapters[name].available !== false && this.isAdapterAvailable(name)
        );

        log.d(`Comparison mode: Running query '${queryName}' on all adapters: ${availableAdapters.join(', ')}`);

        // Execute on all available adapters
        for (const adapterName of availableAdapters) {
            const adapterStartTime = Date.now();
            const adapterData = {
                adapter: adapterName,
                startTime: new Date().toISOString(),
                success: false,
                duration: 0,
                query: null,
                rawResult: null,
                transformedResult: null,
                error: null
            };

            try {
                // Execute query on adapter
                log.d(`Comparison mode: Executing on ${adapterName}`);
                const rawResult = await this.executeOnAdapter(queryDef, adapterName, params, options);

                // Extract query metadata and actual data from standardized format
                if (!rawResult._queryMeta?.query) {
                    log.d(`Query '${queryName}' on adapter '${adapterName}' returned no query metadata`);
                }
                adapterData.query = rawResult._queryMeta?.query || null;
                adapterData.rawResult = rawResult.data;

                adapterData.success = true;

                // Apply adapter-specific transformation if provided
                let transformedResult = rawResult;
                const adapterTransform = queryDef.adapters[adapterName]?.transform;
                if (adapterTransform && typeof adapterTransform === 'function') {
                    try {
                        // Pass only the data to transform, consistent with normal mode
                        const transformedData = await adapterTransform(rawResult.data, transformOptions);
                        transformedResult = {
                            _queryMeta: rawResult._queryMeta,
                            data: transformedData
                        };
                        adapterData.transformedResult = transformedData;
                    }
                    catch (transformError) {
                        log.e(`Comparison mode: Transformation failed for ${adapterName}`, transformError);
                        adapterData.transformError = transformError.message;
                        adapterData.transformedResult = null;
                    }
                }
                else {
                    // No transform, return the raw data (not the full result with _queryMeta)
                    adapterData.transformedResult = rawResult.data;
                }

                // Store primary result for return
                if (adapterName === primaryAdapter) {
                    primaryResult = transformedResult;
                }

                adapterData.duration = Date.now() - adapterStartTime;
                log.d(`Comparison mode: ${adapterName} completed in ${adapterData.duration}ms`);
            }
            catch (error) {
                adapterData.success = false;
                adapterData.error = error.message;
                adapterData.duration = Date.now() - adapterStartTime;
                log.e(`Comparison mode: ${adapterName} failed after ${adapterData.duration}ms`, error);

                // If primary adapter failed, throw error to maintain normal flow
                if (adapterName === primaryAdapter) {
                    throw error;
                }
            }

            comparisonData.adapters[adapterName] = adapterData;
        }

        // Write comparison log
        this.writeComparisonLog(queryName, comparisonData);

        log.d(`Comparison mode: Query '${queryName}' completed on all adapters, returning result from ${primaryAdapter}`);
        return primaryResult ? primaryResult.data : primaryResult;
    }

    /**
     * Execute query on specific adapter
     * @param {Object} query - Query definition object
     * @param {string} query.name - Query name for logging
     * @param {Object} query.adapters - Adapter configurations
     * @param {string} adapterName - Adapter name to execute ('mongodb' or 'clickhouse')
     * @param {Object} params - Query parameters passed to the handler
     * @param {Object} [options] - Additional execution options passed to handler
     * @returns {Promise<any>} Query result as returned by the handler
     * @throws {Error} If handler not found or execution fails
     * @private
     */
    async executeOnAdapter(query, adapterName, params, options = {}) {
        try {

            const handler = query.adapters[adapterName]?.handler;
            if (!handler) {
                log.e(`No handler found for query '${query.name}' on adapter '${adapterName}'`);
                throw new Error(`No handler found for query '${query.name}' on adapter '${adapterName}'`);
            }

            log.d(`Executing query '${query.name}' on adapter '${adapterName}'`);

            return await handler(params, options);
        }
        catch (error) {
            log.e(`Query execution failed: ${query.name} on ${adapterName}`, error);
            throw error;
        }
    }

    /**
     * Select best adapter for a query definition based on availability and configuration
     * @param {Object} queryDef - Query definition object
     * @param {string} queryDef.name - Query name for logging
     * @param {Object} queryDef.adapters - Adapter configurations
     * @param {string} [forceAdapter] - Force specific adapter ('mongodb' or 'clickhouse')
     * @returns {string} Selected adapter name
     * @throws {Error} If forced adapter unavailable or no suitable adapter found
     * @private
     */
    selectAdapterForDef(queryDef, forceAdapter) {
        const queryName = queryDef.name || 'unnamed_query';

        // Use forced adapter if specified
        if (forceAdapter) {
            if (!this.isAdapterAvailable(forceAdapter)) {
                log.e(`Forced adapter '${forceAdapter}' is not available`);
                throw new Error(`Adapter '${forceAdapter}' is not available`);
            }
            if (!queryDef.adapters[forceAdapter] || queryDef.adapters[forceAdapter].available === false) {
                log.e(`Forced adapter '${forceAdapter}' is not supported by query '${queryName}'`);
                throw new Error(`Adapter '${forceAdapter}' not supported by query '${queryName}'`);
            }
            return forceAdapter;
        }

        // Get available adapters
        const availableAdapters = Object.keys(queryDef.adapters).filter(
            name => queryDef.adapters[name].available !== false && this.isAdapterAvailable(name)
        );

        if (availableAdapters.length === 0) {
            log.e(`No suitable adapter found for query '${queryName}'`);
            throw new Error(`No suitable adapter found for query '${queryName}'`);
        }

        // Use adapter preference from config
        const adapterPreference = config.database?.adapterPreference || ['mongodb', 'clickhouse'];

        // Find first available adapter in preference order
        for (const preferred of adapterPreference) {
            if (availableAdapters.includes(preferred)) {
                return preferred;
            }
        }

        // If no preferred adapter is available, use first available
        return availableAdapters[0];
    }

    /**
     * Check if adapter is available based on configuration
     * @param {string} adapterName - Adapter name to check ('mongodb' or 'clickhouse')
     * @returns {boolean} True if adapter is enabled in config
     * @private
     */
    isAdapterAvailable(adapterName) {
        return config.database?.adapters?.[adapterName]?.enabled === true;
    }

}

module.exports = QueryRunner;