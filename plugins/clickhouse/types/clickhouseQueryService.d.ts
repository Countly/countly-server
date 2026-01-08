/**
 * ClickHouse Query Service types
 * @module plugins/clickhouse/clickhouseQueryService
 */

/** ClickHouse filter criteria (similar to MongoDB filter) */
export interface ClickHouseFilter {
    [key: string]: any;
}

/** Find options for ClickHouse queries */
export interface ClickHouseFindOptions {
    /** Limit number of results */
    limit?: number;
    /** Skip number of results */
    skip?: number;
    /** Sort criteria */
    sort?: Record<string, 1 | -1>;
    /** Field projection */
    projection?: Record<string, 0 | 1>;
    [key: string]: any;
}

/** Aggregation options for ClickHouse queries */
export interface ClickHouseAggregateOptions {
    /** Allow disk usage for large operations */
    allowDiskUse?: boolean;
    /** Batch size for operations */
    batchSize?: number;
    /** Maximum time in milliseconds */
    maxTimeMS?: number;
    [key: string]: any;
}

/** Insert options for ClickHouse operations */
export interface ClickHouseInsertOptions {
    /** Whether to validate documents before inserting */
    validate?: boolean;
    /** Whether to bypass document validation */
    bypassDocumentValidation?: boolean;
    [key: string]: any;
}

/** Update options for ClickHouse operations */
export interface ClickHouseUpdateOptions {
    /** Create document if it doesn't exist */
    upsert?: boolean;
    /** Update multiple documents */
    multi?: boolean;
    [key: string]: any;
}

/** Index keys definition */
export interface ClickHouseIndexKeys {
    [field: string]: 1 | -1 | 'text' | 'hashed';
}

/** Index creation options */
export interface ClickHouseIndexOptions {
    /** Index name */
    name?: string;
    /** Whether index is unique */
    unique?: boolean;
    /** Whether to build index in background */
    background?: boolean;
    /** Whether index is sparse */
    sparse?: boolean;
    /** TTL for index in seconds */
    expireAfterSeconds?: number;
    [key: string]: any;
}

/** ClickHouse query object */
export interface ClickHouseQuery {
    /** SQL query string */
    query: string;
    /** Query parameters for parameterized queries */
    params?: Record<string, any>;
    /** Response format (defaults to JSONEachRow) */
    format?: string;
    /** Application ID for data masking. Required for privacy-compliant data redaction. */
    appID?: string;
}

/** ClickHouse client interface (from @clickhouse/client) */
export interface ClickHouseClient {
    /** Execute a query */
    query(options: {
        query: string;
        format?: string;
        query_params?: Record<string, any>;
    }): Promise<{
        json(): Promise<any[]>;
        text(): Promise<string>;
        raw(): Promise<any>;
    }>;
    
    /** Insert data */
    insert(options: {
        table: string;
        values: any[];
        format?: string;
    }): Promise<void>;
    
    /** Close connection */
    close(): Promise<void>;
    
    /** Check if client is connected */
    ping(): Promise<void>;
}

/**
 * ClickHouse Query Service
 * Provides a MongoDB-like interface for ClickHouse operations
 */
export interface ClickHouseQueryService {
    /** ClickHouse client instance */
    readonly client: ClickHouseClient;

    /**
     * Find documents matching a filter
     * @param filter - Filter criteria
     * @param options - Optional find options
     * @returns Promise resolving to array of matching documents
     */
    find(filter?: ClickHouseFilter, options?: ClickHouseFindOptions): Promise<any[]>;

    /**
     * Find a single document matching a filter
     * @param filter - Filter criteria
     * @param options - Optional find options
     * @returns Promise resolving to found document or null
     */
    findOne(filter: ClickHouseFilter, options?: ClickHouseFindOptions): Promise<any | null>;

    /**
     * Count documents matching a filter
     * @param filter - Filter criteria
     * @returns Promise resolving to count of matching documents
     */
    count(filter?: ClickHouseFilter): Promise<number>;

    /**
     * Execute aggregation pipeline
     * @param pipeline - Aggregation pipeline or query object
     * @param options - Optional aggregation options
     * @returns Promise resolving to aggregation results
     */
    aggregate(pipeline: any, options?: ClickHouseAggregateOptions): Promise<any[]>;

    /**
     * Execute raw ClickHouse query
     * @param queryObj - Query object with query string and parameters
     * @returns Promise resolving to query results
     */
    query(queryObj: ClickHouseQuery): Promise<any[]>;

    /**
     * Insert one or multiple documents
     * @param docs - Document or array of documents
     * @param options - Optional insert options
     * @returns Promise resolving when insert completes
     */
    insert(docs: any | any[], options?: ClickHouseInsertOptions): Promise<void>;

    /**
     * Update documents matching a filter
     * @param filter - Filter criteria
     * @param update - Update operations
     * @param options - Optional update options
     * @returns Promise resolving when update completes
     */
    update(filter: ClickHouseFilter, update: Record<string, any>, options?: ClickHouseUpdateOptions): Promise<void>;

    /**
     * Remove documents matching a filter
     * @param filter - Filter criteria
     * @param options - Optional remove options
     * @returns Promise resolving when remove completes
     */
    remove(filter: ClickHouseFilter, options?: ClickHouseUpdateOptions): Promise<void>;

    /**
     * Create an index for query performance
     * @param keys - Fields to index
     * @param options - Optional index options
     * @returns Promise resolving to created index name
     */
    createIndex(keys: ClickHouseIndexKeys, options?: ClickHouseIndexOptions): Promise<string>;

    /**
     * Drop the underlying table or view
     * @returns Promise resolving when drop completes
     */
    dropCollection(): Promise<void>;
}

/**
 * ClickHouse Query Service constructor
 */
export interface ClickHouseQueryServiceConstructor {
    new (client: ClickHouseClient): ClickHouseQueryService;
}

/** ClickHouse configuration */
export interface ClickHouseConfig {
    /** ClickHouse server URL */
    url?: string;
    /** Database name */
    database?: string;
    /** Username for authentication */
    username?: string;
    /** Password for authentication */
    password?: string;
    /** Connection timeout in milliseconds */
    connectTimeout?: number;
    /** Request timeout in milliseconds */
    requestTimeout?: number;
    /** Additional connection options */
    [key: string]: any;
}