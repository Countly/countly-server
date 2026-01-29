// Type definitions for Countly Database Batcher
// Generated from /api/parts/data/batcher.js
import { Database } from "../plugins/pluginManager";

/** Global batcher statistics object */
export interface BatcherStats {
  key: string;
  pid: number;
  insert_queued: number;
  insert_processing: number;
  insert_errored_fallback: number;
  insert_errored_no_fallback: number;
  insert_errored_no_fallback_last_error: string;
  update_queued: number;
  update_processing: number;
  update_errored_fallback: number;
  update_errored_no_fallback: number;
  update_errored_no_fallback_last_error: string;
}

/** Options for add operations in WriteBatcher */
export interface AddOptions {
  /** Whether to upsert the document if it doesnt exist (default: true) */
  upsert?: boolean;
  /** Stream token for tracking processing state */
  token?: {
    cd?: Date;
    resumeToken?: unknown;
  };
}

/** Configuration for batch processing */
export interface BatchConfig {
  /** Batch period in seconds */
  batch_period: number;
  /** Whether batch processing is enabled */
  batch_processing: boolean;
  /** Read batch period in seconds */
  batch_read_period: number;
  /** Read batch TTL in seconds */
  batch_read_ttl: number;
  /** Whether read batch processing is enabled */
  batch_read_processing: boolean;
}

/** Projection object for database queries */
export interface ProjectionObject {
  projection?: Record<string, 0 | 1>;
  fields?: Record<string, 0 | 1>;
  [key: string]: any;
}

/** Keys extracted from projection */
export interface ProjectionKeys {
  keys: string[];
  have_projection: boolean;
}

/** Cached data structure for ReadBatcher */
export interface CachedData {
  query: Record<string, any>;
  data?: any;
  promise?: Promise<any> | null;
  projection: ProjectionObject;
  last_used: number;
  last_updated: number;
  multi: boolean;
}

/** Batch operation for WriteBatcher */
export interface BatchOperation {
  id: string;
  value: Record<string, any>;
  upsert?: boolean;
}

/** Promise resolver for ReadBatcher */
export interface PromiseResolver {
  resolve: (value: any) => void;
  reject: (error: any) => void;
}

/**
 * Class for batching database insert operations
 * Collects documents and performs bulk inserts periodically
 */
declare class InsertBatcher {
  /** Database connections indexed by name */
  private dbs: Record<string, Database>;
  /** Queued documents indexed by database and collection */
  private data: Record<string, Record<string, any[]>>;
  /** Batch period in milliseconds */
  private period: number;
  /** Whether batch processing is enabled */
  private process: boolean;
  /** Whether running in shared mode */
  private shared: boolean;

  /**
   * Create batcher instance
   * @param db - Primary database object
   */
  constructor(db: Database);

  /**
   * Add another database to batch
   * @param name - Name of the database
   * @param connection - MongoDB connection to that database
   */
  addDb(name: string, connection: Database): void;

  /**
   * Reloads server configs from plugin manager
   */
  private loadConfig(): void;

  /**
   * Writes data to database for specific collection
   * @param db - Name of the database for which to write data
   * @param collection - Name of the collection for which to write data
   */
  private flush(db: string, collection: string): Promise<void>;

  /**
   * Run all pending database queries
   * @returns Promise that resolves when all flushes complete
   */
  flushAll(): Promise<void>;

  /**
   * Schedule next flush cycle
   */
  private schedule(): void;

  /**
   * Provide a document to insert into collection
   * @param collection - Name of the collection where to insert data
   * @param doc - One document or array of documents to insert
   * @param db - Name of the database for which to write data (default: "countly")
   */
  insert(collection: string, doc: Record<string, any> | Record<string, any>[], db?: string): void;
}

/**
 * Class for batching database update operations for aggregated data
 * Merges multiple operations for the same document
 */
declare class WriteBatcher {
  /** Database connections indexed by name */
  private dbs: Record<string, Database>;
  /** Queued operations indexed by database, collection, and document ID */
  private data: Record<string, Record<string, Record<string, BatchOperation>>>;
  /** Batch period in milliseconds */
  private period: number;
  /** Whether batch processing is enabled */
  private process: boolean;
  /** Whether running in shared mode */
  private shared: boolean;

  /**
   * Create batcher instance
   * @param db - Primary database object
   */
  constructor(db: Database);

  /**
   * Add another database to batch
   * @param name - Name of the database
   * @param connection - MongoDatabase connection to that database
   */
  addDb(name: string, connection: Database): void;

  /**
   * Reloads server configs from plugin manager
   */
  private loadConfig(): void;

  /**
   * Writes data to database for specific collection
   * @param db - Name of the database for which to write data
   * @param collection - Name of the collection for which to write data
   */
  private flush(db: string, collection: string): Promise<void>;

  /**
   * Run all pending database queries
   * @returns Promise that resolves when all flushes complete
   */
  flushAll(): Promise<void>;

  /**
   * Schedule next flush cycle
   */
  private schedule(): void;

  /**
   * Get operation on document by id (returns reference for modification)
   * @param collection - Name of the collection where to update data
   * @param id - ID of the document
   * @param db - Name of the database for which to write data (default: "countly")
   * @returns BulkWrite query for document by reference
   */
  get(collection: string, id: string, db?: string): Record<string, any>;

  /**
   * Provide operation for document id and batcher will merge multiple operations
   * @param collection - Name of the collection where to update data
   * @param id - ID of the document
   * @param operation - MongoDB update operation
   * @param db - Name of the database for which to write data (default: "countly")
   * @param options - Options for operation (upsert control)
   */
  add(collection: string, id: string, operation: Record<string, any>, db?: string, options?: AddOptions): void;
}

/**
 * Class for caching database read operations
 * Caches results for a configurable TTL period
 */
declare class ReadBatcher {
  /** Database connection */
  private db: Database;
  /** Cached data indexed by collection and cache ID */
  private data: Record<string, Record<string, CachedData>>;
  /** Promise resolvers for worker processes */
  private promises: Record<string, PromiseResolver>;
  /** Cache period in milliseconds */
  private period: number;
  /** Cache TTL in milliseconds */
  private ttl: number;
  /** Whether read processing is enabled */
  private process: boolean;
  /** Whether running on master process */
  private onMaster: boolean;

  /**
   * Create batcher instance
   * @param db - Database object
   */
  constructor(db: Database);

  /**
   * Reloads server configs from plugin manager
   */
  private loadConfig(): void;

  /**
   * Get data from database
   * @param collection - Name of the collection for which to read data
   * @param id - ID of cache entry
   * @param query - MongoDB query for the document
   * @param projection - Which fields to return
   * @param multi - True if expecting multiple documents
   * @returns Promise resolving to query result
   */
  private getData(collection: string, id: string, query: Record<string, any>, projection: ProjectionObject, multi: boolean): Promise<any>;

  /**
   * Check all cached entries and remove expired ones
   */
  private checkAll(): void;

  /**
   * Schedule next cache cleanup cycle
   */
  private schedule(): void;

  /**
   * Gets list of keys from projection object which are included
   * @param projection - Projection object to analyze
   * @returns Object with keys list and projection status
   */
  private keysFromProjectionObject(projection: ProjectionObject): ProjectionKeys;

  /**
   * Invalidate specific cache entry
   * @param collection - Name of the collection
   * @param query - Query for the document
   * @param projection - Which fields to return
   * @param multi - True if multiple documents
   */
  invalidate(collection: string, query: Record<string, any>, projection: ProjectionObject, multi: boolean): void;

  /**
   * Get data from cache or from database and cache it
   * @param collection - Name of the collection
   * @param query - Query for the document
   * @param projection - Which fields to return
   * @param multi - True if multiple documents
   * @returns Promise resolving to query result
   */
  private get(collection: string, query: Record<string, any>, projection: ProjectionObject, multi: boolean): Promise<any>;

  /**
   * Get single document from cache or from database and cache it
   * @param collection - Name of the collection
   * @param query - Query for the document
   * @param projection - Which fields to return
   * @param callback - Optional callback to get result
   * @returns Promise if callback not passed
   */
  getOne(collection: string, query: Record<string, any>, projection?: ProjectionObject, callback?: (err: Error | null, result: any) => void): Promise<any>;
  getOne(collection: string, query: Record<string, any>, callback: (err: Error | null, result: any) => void): void;

  /**
   * Get multiple documents from cache or from database and cache it
   * @param collection - Name of the collection
   * @param query - Query for the documents
   * @param projection - Which fields to return
   * @param callback - Optional callback to get result
   * @returns Promise if callback not passed
   */
  getMany(collection: string, query: Record<string, any>, projection?: ProjectionObject, callback?: (err: Error | null, result: any[]) => void): Promise<any[]>;
  getMany(collection: string, query: Record<string, any>, callback: (err: Error | null, result: any[]) => void): void;

  /**
   * Cache data read from database
   * @param collection - Name of the collection
   * @param id - ID of the cache entry
   * @param query - Query for the document
   * @param projection - Which fields to return
   * @param data - Data from database to cache
   * @param multi - True if multiple documents
   */
  private cache(collection: string, id: string, query: Record<string, any>, projection: ProjectionObject, data: any, multi: boolean): void;
}

export { WriteBatcher, ReadBatcher, InsertBatcher };
