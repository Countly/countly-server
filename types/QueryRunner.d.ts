/**
 * TypeScript type definitions for QueryRunner
 * Unified query execution with automatic adapter selection
 * Supports multiple database adapters with configuration-based selection
 */

/**
 * Supported adapter types
 */
export type AdapterName = 'mongodb' | 'clickhouse';

/**
 * Query metadata returned by handlers (enforced by QueryRunner)
 */
export interface QueryMeta {
    /** The adapter that executed the query */
    adapter: AdapterName;
    /** The actual query/pipeline executed */
    query: unknown;
}

/**
 * Standardized result format that all handlers must return (enforced by QueryRunner)
 */
export interface QueryResult<TData = unknown> {
    /** Query execution metadata */
    _queryMeta: QueryMeta;
    /** The actual query result data */
    data: TData;
}

/**
 * Handler function signature for query execution
 * Must return QueryResult with _queryMeta and data properties
 */
export type QueryHandler<TParams = unknown, TResult = unknown> = (
    params: TParams,
    options?: ExecutionOptions
) => Promise<QueryResult<TResult>>;

/**
 * Transform function signature for result transformation
 * Receives only the data portion, returns transformed data
 */
export type TransformFunction<TInput = unknown, TOutput = unknown> = (
    data: TInput,
    transformOptions?: Record<string, unknown>
) => Promise<TOutput>;

/**
 * Adapter configuration for a specific database adapter
 */
export interface AdapterConfig<TParams = unknown, TResult = unknown> {
    /** Handler function that executes the query */
    handler: QueryHandler<TParams, TResult>;
    /** Optional transformation function for results */
    transform?: TransformFunction<TResult>;
    /** Whether this adapter is available (defaults to true) */
    available?: boolean;
}

/**
 * Query definition object containing all adapter implementations
 */
export interface QueryDefinition<TParams = unknown, TResult = unknown> {
    /** Query name for logging and debugging */
    name: string;
    /** Adapter configurations keyed by adapter name */
    adapters: {
        /** MongoDB adapter configuration */
        mongodb?: AdapterConfig<TParams, TResult>;
        /** ClickHouse adapter configuration */
        clickhouse?: AdapterConfig<TParams, TResult>;
    };
}

/**
 * Execution options for query execution
 */
export interface ExecutionOptions {
    /** Force specific adapter execution */
    adapter?: AdapterName;
    /** Enable comparison mode (runs on all adapters) */
    comparison?: boolean;
}

/**
 * Comparison log data structure for a single adapter execution
 */
export interface ComparisonAdapterData {
    /** Adapter name */
    adapter: AdapterName;
    /** Execution start time */
    startTime: string;
    /** Whether execution succeeded */
    success: boolean;
    /** Execution duration in milliseconds */
    duration: number;
    /** The query/pipeline executed */
    query: unknown;
    /** Raw result data from handler */
    rawResult: unknown;
    /** Transformed result data (if transform applied) */
    transformedResult: unknown;
    /** Error message if execution failed */
    error: string | null;
    /** Transform error message if transformation failed */
    transformError?: string;
}

/**
 * Complete comparison log data structure
 */
export interface ComparisonData {
    /** Query name */
    queryName: string;
    /** Comparison execution timestamp */
    timestamp: string;
    /** Adapter execution results keyed by adapter name */
    adapters: Record<string, ComparisonAdapterData>;
}

/**
 * QueryRunner class for unified query execution
 */
export declare class QueryRunner {
    /**
     * Execute a query definition with automatic adapter selection
     * @param queryDef Query definition object
     * @param params Query parameters passed to the handler function
     * @param options Execution options
     * @param transformOptions Options passed to adapter-specific transform functions
     * @returns Query result data (only the data portion, not the full QueryResult)
     * @throws Error if query definition is invalid or no suitable adapter found
     */
    executeQuery<TParams = unknown, TResult = unknown>(
        queryDef: QueryDefinition<TParams, TResult>,
        params: TParams,
        options?: ExecutionOptions,
        transformOptions?: Record<string, unknown>
    ): Promise<TResult>;

    /**
     * Execute query with comparison mode - runs on all available adapters
     * @param queryDef Query definition object
     * @param params Query parameters
     * @param options Execution options
     * @param transformOptions Transform options
     * @returns Result from the selected adapter (normal flow)
     * @private
     */
    private executeQueryWithComparison<TParams = unknown, TResult = unknown>(
        queryDef: QueryDefinition<TParams, TResult>,
        params: TParams,
        options: ExecutionOptions,
        transformOptions: Record<string, unknown>
    ): Promise<TResult>;

    /**
     * Execute query on specific adapter
     * @param query Query definition object
     * @param adapterName Adapter name to execute
     * @param params Query parameters passed to the handler
     * @param options Additional execution options passed to handler
     * @returns Query result as returned by the handler
     * @throws Error if handler not found or execution fails
     * @private
     */
    private executeOnAdapter<TParams = unknown, TResult = unknown>(
        query: QueryDefinition<TParams, TResult>,
        adapterName: AdapterName,
        params: TParams,
        options?: ExecutionOptions
    ): Promise<QueryResult<TResult>>;

    /**
     * Select best adapter for a query definition based on availability and configuration
     * @param queryDef Query definition object
     * @param forceAdapter Force specific adapter
     * @returns Selected adapter name
     * @throws Error if forced adapter unavailable or no suitable adapter found
     * @private
     */
    private selectAdapterForDef(
        queryDef: QueryDefinition,
        forceAdapter?: AdapterName
    ): AdapterName;

    /**
     * Check if adapter is available based on configuration
     * @param adapterName Adapter name to check
     * @returns True if adapter is enabled in config
     * @private
     */
    private isAdapterAvailable(adapterName: AdapterName): boolean;

    /**
     * Ensure comparison logs directory exists
     * @returns Path to the comparison logs directory
     * @private
     */
    private ensureComparisonLogsDir(): string;

    /**
     * Write comparison results to JSON file
     * @param queryName Query name for file naming
     * @param comparisonData Data to write
     * @private
     */
    private writeComparisonLog(queryName: string, comparisonData: ComparisonData): void;
}

export default QueryRunner;