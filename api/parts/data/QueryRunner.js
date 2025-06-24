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
     * Write comparison results to JSON file
     * @param {string} queryName - Query name for file naming
     * @param {Object} comparisonData - Data to write
     * @private
     */
    writeComparisonLog(queryName, comparisonData) {
        try {
            const comparisonLogsDir = this.ensureComparisonLogsDir();
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const filename = `${queryName}_${timestamp}.json`;
            const filepath = path.join(comparisonLogsDir, filename);

            fs.writeFileSync(filepath, JSON.stringify(comparisonData, null, 2));
            log.d(`Comparison log written to: ${filepath}`);
        }
        catch (error) {
            log.e('Failed to write comparison log', error);
        }
    }

    /**
     * Execute a query definition directly without registration
     * @param {Object} queryDef - Query definition object
     * @param {string} queryDef.name - Query name for logging and debugging
     * @param {Object} queryDef.adapters - Adapter configurations keyed by adapter name
     * @param {Object} [queryDef.adapters.mongodb] - MongoDB adapter configuration
     * @param {Function} queryDef.adapters.mongodb.handler - Async function that executes MongoDB query
     * @param {boolean} [queryDef.adapters.mongodb.available] - Whether this adapter is available (defaults to true)
     * @param {Object} [queryDef.adapters.clickhouse] - ClickHouse adapter configuration
     * @param {Function} queryDef.adapters.clickhouse.handler - Async function that executes ClickHouse query
     * @param {boolean} [queryDef.adapters.clickhouse.available] - Whether this adapter is available (defaults to true)
     * @param {Object} params - Query parameters passed to the handler function
     * @param {Object} [options] - Execution options
     * @param {string} [options.adapter] - Force specific adapter ('mongodb' or 'clickhouse')
     * @param {boolean} [options.comparison] - Enable comparison mode (runs on all adapters)
     * @param {Function} [transform] - Optional transformation function applied to results
     * @param {Object} [transformOptions] - Options passed to the transform function
     * @returns {Promise<any>} Query result as returned by the handler (and transformed if transform is provided)
     * @throws {Error} If query definition is invalid or no suitable adapter found
     * @example
     * const queryDef = {
     *   name: 'FETCH_USER_EVENTS',
     *   adapters: {
     *     mongodb: {
     *       handler: async (params) => { 
     *         return await db.collection('events').find(params.filter).toArray();
     *       }
     *     },
     *     clickhouse: {
     *       handler: async (params) => {
     *         return await ch.query({ query: params.sql });
     *       }
     *     }
     *   }
     * };
     * 
     * const transform = async (result, adapter, transformOptions) => {
     *   // Transform result based on adapter type
     *   return transformedResult;
     * };
     * 
     * const result = await queryRunner.executeQuery(
     *   queryDef, 
     *   { filter: { app_id: '123' } }, 
     *   { adapter: 'clickhouse' },
     *   transform,
     *   { type: 'drill_format' }
     * );
     */
    async executeQuery(queryDef, params, options = {}, transform = null, transformOptions = {}) {
        const startTime = Date.now();
        try {
            if (!queryDef || !queryDef.adapters) {
                throw new Error('Invalid query definition: must have adapters');
            }

            const queryName = queryDef.name || 'unnamed_query';

            // Check if comparison mode is enabled
            if (options.comparison) {
                return await this.executeQueryWithComparison(queryDef, params, options, transform, transformOptions);
            }

            const selectedAdapter = this.selectAdapterForDef(queryDef, options.adapter);
            let result = await this.executeOnAdapter(queryDef, selectedAdapter, params, options);

            // Apply transformation if provided
            if (transform && typeof transform === 'function') {
                const transformStartTime = Date.now();
                try {
                    result = await transform(result, selectedAdapter, transformOptions);
                    const transformDuration = Date.now() - transformStartTime;
                    log.d(`Query transformation completed: ${queryName} in ${transformDuration}ms`);
                }
                catch (transformError) {
                    const transformDuration = Date.now() - transformStartTime;
                    log.e(`Query transformation failed: ${queryName} after ${transformDuration}ms`, transformError);
                    throw transformError;
                }
            }

            const duration = Date.now() - startTime;
            log.d(`Query completed: ${queryName} on ${selectedAdapter} in ${duration}ms`);

            return result;
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
     * @param {Function} transform - Transformation function
     * @param {Object} transformOptions - Transform options
     * @returns {Promise<any>} Result from the selected adapter (normal flow)
     * @private
     */
    async executeQueryWithComparison(queryDef, params, options, transform, transformOptions) {
        const queryName = queryDef.name || 'unnamed_query';
        const comparisonData = {
            queryName,
            timestamp: new Date().toISOString(),
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

                // Extract query metadata and actual data
                if (rawResult && rawResult._queryMeta) {
                    adapterData.query = rawResult._queryMeta.query;
                    adapterData.rawResult = rawResult.data;
                }
                else {
                    adapterData.rawResult = rawResult;
                }

                adapterData.success = true;

                // Apply transformation if provided
                let transformedResult = rawResult;
                if (transform && typeof transform === 'function') {
                    try {
                        transformedResult = await transform(rawResult, adapterName, transformOptions);
                        adapterData.transformedResult = JSON.parse(JSON.stringify(transformedResult));
                    }
                    catch (transformError) {
                        log.e(`Comparison mode: Transformation failed for ${adapterName}`, transformError);
                        adapterData.transformError = transformError.message;
                        adapterData.transformedResult = null;
                    }
                }
                else {
                    adapterData.transformedResult = adapterData.rawResult;
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
        return primaryResult;
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

            const result = await handler(params, options);
            return result;
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
        const adapterPreference = config.queryRunner?.adapterPreference || ['mongodb', 'clickhouse'];

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
        return config.queryRunner?.adapters?.[adapterName]?.enabled === true;
    }

}

module.exports = QueryRunner;