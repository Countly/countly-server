/**
 * Query Runner
 * Unified query execution with automatic adapter selection
 * Supports multiple database adapters with configuration-based selection
 * @module api/parts/data/QueryRunner
 */

import { createRequire } from 'module';
import fs from 'fs';
import path from 'path';

// createRequire needed for CJS modules without ES exports
// @ts-expect-error TS1470 - import.meta is valid at runtime (Node 22 treats .ts with imports as ESM)
const require = createRequire(import.meta.url);
const config = require('../../config.js');
const logModule = require('../../utils/log.js');

const log = logModule('query-runner') as {
    d: (...args: unknown[]) => void;
    e: (...args: unknown[]) => void;
    i: (...args: unknown[]) => void;
    w: (...args: unknown[]) => void;
};

config.database = config.database || {};
if (!config.database.adapters || Object.keys(config.database.adapters).length === 0) {
    config.database.adapters = {
        mongodb: {
            enabled: true
        }
    };
}

/**
 * Query meta interface
 */
interface QueryMeta {
    query?: unknown;
    [key: string]: unknown;
}

/**
 * Handler result interface
 */
interface HandlerResult {
    _queryMeta: QueryMeta;
    data: unknown;
}

/**
 * Adapter configuration interface
 */
interface AdapterConfig {
    handler: (params: unknown, options?: unknown) => Promise<HandlerResult>;
    transform?: (data: unknown, transformOptions?: unknown) => Promise<unknown>;
    available?: boolean;
}

/**
 * Query definition interface
 */
interface QueryDef {
    name: string;
    adapters: Record<string, AdapterConfig>;
}

/**
 * Execution options interface
 */
interface ExecutionOptions {
    adapter?: string;
    comparison?: boolean;
    [key: string]: unknown;
}

/**
 * Transform options interface
 */
interface TransformOptions {
    [key: string]: unknown;
}

/**
 * Adapter data interface for comparison
 */
interface AdapterData {
    adapter: string;
    startTime: string;
    success: boolean;
    duration: number;
    query: unknown;
    rawResult: unknown;
    transformedResult: unknown;
    error: string | null;
    transformError?: string;
}

/**
 * Comparison data interface
 */
interface ComparisonData {
    queryName: string;
    timestamp: string;
    notes: { dataConsistency: string };
    adapters: Record<string, AdapterData>;
    warning?: string;
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
 */
class QueryRunner {

    /**
     * Get the current comparison mode from config
     * @returns The comparison mode ('disabled', 'files', 'logs', 'both')
     */
    private _getComparisonMode(): string {
        return config.database?.comparisonLogs?.mode || 'disabled';
    }

    /**
     * Ensure comparison logs directory exists
     * @returns Path to the comparison logs directory
     */
    ensureComparisonLogsDir(): string {
        const comparisonLogsDir = path.join(process.cwd(), 'comparison_logs');
        if (!fs.existsSync(comparisonLogsDir)) {
            fs.mkdirSync(comparisonLogsDir, { recursive: true });
        }
        return comparisonLogsDir;
    }

    /**
     * Write comparison results to JSON file and/or application logs
     * @param queryName - Query name for file naming
     * @param comparisonData - Data to write
     */
    writeComparisonLog(queryName: string, comparisonData: ComparisonData): void {
        const comparisonMode = this._getComparisonMode();

        // Skip logging if disabled
        if (comparisonMode === 'disabled') {
            return;
        }

        // Add development warning to comparison data
        const dataWithWarning: ComparisonData = {
            ...comparisonData,
            warning: 'DEVELOPMENT FEATURE: Query comparison logging should be disabled in production environments for performance reasons'
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
     * @param queryDef - Query definition object
     * @param params - Query parameters passed to the handler function
     * @param options - Execution options
     * @param transformOptions - Options passed to adapter-specific transform functions
     * @returns Query result as returned by the handler (and transformed if transform is provided)
     * @throws If query definition is invalid or no suitable adapter found
     */
    async executeQuery(
        queryDef: QueryDef | null | undefined,
        params: unknown,
        options: ExecutionOptions = {},
        transformOptions: TransformOptions = {}
    ): Promise<unknown> {
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
     * @param queryDef - Query definition object
     * @param params - Query parameters
     * @param options - Execution options
     * @param transformOptions - Transform options
     * @returns Result from the selected adapter (normal flow)
     */
    private async executeQueryWithComparison(
        queryDef: QueryDef,
        params: unknown,
        options: ExecutionOptions,
        transformOptions: TransformOptions
    ): Promise<unknown> {
        const queryName = queryDef.name || 'unnamed_query';
        const comparisonData: ComparisonData = {
            queryName,
            timestamp: new Date().toISOString(),
            notes: {
                dataConsistency: 'Ensure both adapters are querying equivalent data. MongoDB and ClickHouse may have different field schemas.'
            },
            adapters: {}
        };

        // Determine the primary adapter for return value
        const primaryAdapter = this.selectAdapterForDef(queryDef, options.adapter);
        let primaryResult: HandlerResult | null = null;

        // Get all available adapters for this query
        const availableAdapters = Object.keys(queryDef.adapters).filter(
            name => queryDef.adapters[name].available !== false && this.isAdapterAvailable(name)
        );

        log.d(`Comparison mode: Running query '${queryName}' on all adapters: ${availableAdapters.join(', ')}`);

        // Execute on all available adapters
        for (const adapterName of availableAdapters) {
            const adapterStartTime = Date.now();
            const adapterData: AdapterData = {
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
                let transformedResult: HandlerResult = rawResult;
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
                        adapterData.transformError = (transformError as Error).message;
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
                adapterData.error = (error as Error).message;
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
     * @param query - Query definition object
     * @param adapterName - Adapter name to execute ('mongodb' or 'clickhouse')
     * @param params - Query parameters passed to the handler
     * @param options - Additional execution options passed to handler
     * @returns Query result as returned by the handler
     * @throws If handler not found or execution fails
     */
    private async executeOnAdapter(
        query: QueryDef,
        adapterName: string,
        params: unknown,
        options: ExecutionOptions = {}
    ): Promise<HandlerResult> {
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
     * @param queryDef - Query definition object
     * @param forceAdapter - Force specific adapter ('mongodb' or 'clickhouse')
     * @returns Selected adapter name
     * @throws If forced adapter unavailable or no suitable adapter found
     */
    private selectAdapterForDef(queryDef: QueryDef, forceAdapter?: string): string {
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
        const adapterPreference: string[] = config.database?.adapterPreference || ['mongodb', 'clickhouse'];

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
     * @param adapterName - Adapter name to check ('mongodb' or 'clickhouse')
     * @returns True if adapter is enabled in config
     */
    isAdapterAvailable(adapterName: string): boolean {
        return config.database?.adapters?.[adapterName]?.enabled === true;
    }

}

export default QueryRunner;
export { QueryRunner };
export type { QueryDef, AdapterConfig, ExecutionOptions, TransformOptions, HandlerResult, QueryMeta };
