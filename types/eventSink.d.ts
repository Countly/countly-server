/**
 * TypeScript definitions for EventSink module
 * Provides type safety for event writing operations to multiple destinations
 * 
 * @DI All sink classes support dependency injection for testing and modularity
 */

// ==================== Base Types ====================

/**
 * MongoDB bulkWrite operation for insertOne
 */
export interface BulkWriteInsertOneOperation {
    insertOne: {
        document: EventDocument;
    };
}

/**
 * MongoDB bulkWrite operation for updateOne
 */
export interface BulkWriteUpdateOneOperation {
    updateOne: {
        filter: Record<string, any>;
        update: Record<string, any>;
        upsert?: boolean;
    };
}

/**
 * MongoDB bulkWrite operation for deleteOne
 */
export interface BulkWriteDeleteOneOperation {
    deleteOne: {
        filter: Record<string, any>;
    };
}

/**
 * Union type for all supported bulkWrite operations
 */
export type BulkWriteOperation = 
    | BulkWriteInsertOneOperation 
    | BulkWriteUpdateOneOperation 
    | BulkWriteDeleteOneOperation;

/**
 * Event document structure for drill_events collection
 */
export interface EventDocument {
    _id?: string;
    e: string;              // Event key
    ts: number;            // Timestamp
    app_id: string;        // Application ID
    uid?: string;          // User ID
    d?: Record<string, any>; // Event data
    s?: Record<string, any>; // Segmentation
    c?: number;            // Count
    [key: string]: any;    // Additional fields
}

/**
 * Kafka event format after transformation
 */
export interface KafkaEvent {
    key: string;
    value: string | Buffer | object;
    timestamp?: number;
    partition?: number;
    headers?: Record<string, string>;
}

// ==================== Result Types ====================

/**
 * Standardized result object returned by all event sinks
 */
export interface EventSinkResult {
    success: boolean;
    written: number;
    type: string;
    message?: string;
    timestamp: Date;
    duration?: number;
    [key: string]: any; // Additional metadata
}

/**
 * Result specific to MongoDB operations
 */
export interface MongoEventSinkResult extends EventSinkResult {
    type: 'MongoEventSink';
    duplicates?: number;
}

/**
 * Result specific to Kafka operations
 */
export interface KafkaEventSinkResult extends EventSinkResult {
    type: 'KafkaEventSink';
    originalCount?: number;
    transformedCount?: number;
}

/**
 * Aggregated result from UnifiedEventSink containing per-sink results
 */
export interface UnifiedEventSinkResult {
    overall: {
        success: boolean;
        written: number;
        error?: string;
        duration?: number;
        message?: string;
    };
    sinks: {
        [sinkType: string]: EventSinkResult;
    };
}

// ==================== Configuration Types ====================

/**
 * EventSink-specific configuration
 */
export interface EventSinkConfig {
    sinks: Array<'mongo' | 'kafka'>;
}

/**
 * Options for MongoEventSink constructor
 */
export interface MongoEventSinkOptions {
    collection?: string;    // Collection name (default: 'drill_events')
}

/**
 * Dependencies for MongoEventSink constructor
 */
export interface MongoEventSinkDependencies {
    db?: any;               // MongoDB database connection
    log?: any;              // Custom logger instance
}

/**
 * Options for KafkaEventSink constructor
 */
export interface KafkaEventSinkOptions {
    transformer?: EventTransformer; // Custom event transformer
    transactionalIdPrefix?: string; // Transactional ID prefix
}

/**
 * Dependencies for KafkaEventSink constructor
 */
export interface KafkaEventSinkDependencies {
    kafkaClient?: any;              // Pre-initialized Kafka client
    kafkaProducer?: any;            // Pre-initialized Kafka producer
    log?: any;                      // Custom logger instance
}

/**
 * Options for EventSinkFactory.create method
 */
export interface EventSinkFactoryOptions {
    mongo?: MongoEventSinkOptions;
    kafka?: KafkaEventSinkOptions;
}

/**
 * Dependencies for UnifiedEventSink constructor
 */
export interface UnifiedEventSinkDependencies {
    config?: any;           // Configuration override
    log?: any;              // Logger instance
}

/**
 * Event transformer function signature
 */
export type EventTransformer = (document: EventDocument) => KafkaEvent | null;

// ==================== Abstract Base Class ====================

/**
 * Abstract base class for all event sinks
 * Provides a consistent API for writing events to various destinations (MongoDB, Kafka, etc.)
 * 
 * This is an abstract base class that defines the template method pattern for event sinks.
 * Subclasses must implement initialize(), write(), and close() methods.
 * 
 * The interface provides:
 * - Standardized error handling and logging
 * - Common initialization and cleanup patterns  
 * - Consistent return value format
 * - Protected utility methods for validation and result creation
 *
 * Usage: Extend this class and implement the abstract methods
 *
 * Application Code:
 * Use UnifiedEventSink for a clean API: new UnifiedEventSink()
 * This abstract class is implemented by MongoEventSink and KafkaEventSink.
 * 
 * Constructor Parameters:
 * This is an abstract base class - it should not be instantiated directly.
 * Subclasses define their own constructor parameters based on their specific requirements.
 * 
 * @abstract
 */
export declare abstract class EventSinkInterface {
    /**
     * Initialize the event sink
     * @returns Promise that resolves when the sink is ready
     */
    abstract initialize(): Promise<void>;

    /**
     * Write events to the sink
     * @param events Array of events to write (bulkWrite format or event objects)
     * @returns Promise that resolves to a result object with success status and metadata
     */
    abstract write(events: BulkWriteOperation[]): Promise<EventSinkResult>;

    /**
     * Close the event sink and clean up resources
     * @returns Promise that resolves when the sink is closed
     */
    abstract close(): Promise<void>;

    /**
     * Get the name/type of this sink
     * @returns Sink type name
     */
    getType(): string;

    /**
     * Check if the sink is initialized
     * @returns True if initialized
     */
    isInitialized(): boolean;

    /**
     * Check if the sink is closed
     * @returns True if closed
     */
    isClosed(): boolean;

    /**
     * Protected method to mark sink as initialized
     * @protected
     */
    protected _setInitialized(): void;

    /**
     * Protected method to mark sink as closed
     * @protected
     */
    protected _setClosed(): void;

    /**
     * Protected helper to validate events array
     * @param events Events to validate
     * @returns True if valid
     * @protected
     */
    protected _validateEvents(events: any[]): boolean;

    /**
     * Protected helper to create standardized result object
     * @param success Whether the operation succeeded
     * @param written Number of events written
     * @param message Optional message
     * @param metadata Optional additional metadata
     * @returns Standardized result object
     * @protected
     */
    protected _createResult(
        success: boolean,
        written: number,
        message?: string,
        metadata?: Record<string, any>
    ): EventSinkResult;
}

// ==================== Concrete Implementations ====================

/**
 * MongoDB implementation of EventSinkInterface
 * Handles writing events to drill_events collection using bulkWrite operations
 * 
 * @DI Supports dependency injection for testing and modularity
 */
export declare class MongoEventSink extends EventSinkInterface {
    /**
     * Create a MongoEventSink instance
     * @param options Configuration options for the sink
     * @param dependencies Optional dependency injection for testing and modularity
     */
    constructor(options?: MongoEventSinkOptions, dependencies?: MongoEventSinkDependencies);

    /**
     * Initialize the MongoDB connection
     * @returns Promise that resolves when the sink is ready
     */
    initialize(): Promise<void>;

    /**
     * Write events to MongoDB using bulkWrite
     * @param bulkOps Array of bulkWrite operations
     * @returns Promise that resolves to a result object
     */
    write(bulkOps: BulkWriteOperation[]): Promise<MongoEventSinkResult>;

    /**
     * Close the MongoDB connection (no-op for shared connection)
     * @returns Promise that resolves when closed
     */
    close(): Promise<void>;
}

/**
 * Kafka implementation of EventSinkInterface
 * Transforms MongoDB bulkWrite operations to Kafka events and sends to Kafka
 * 
 * @DI Supports dependency injection for testing and modularity
 */
export declare class KafkaEventSink extends EventSinkInterface {
    /**
     * Create a KafkaEventSink instance
     * @param options Configuration options for the sink
     * @param dependencies Optional dependency injection for testing and modularity
     */
    constructor(options?: KafkaEventSinkOptions, dependencies?: KafkaEventSinkDependencies);

    /**
     * Initialize the Kafka producer
     * @returns Promise that resolves when the sink is ready
     */
    initialize(): Promise<void>;

    /**
     * Write events to Kafka by transforming bulkWrite operations to event format
     * @param bulkEvents Array of bulkWrite operations from MongoDB format
     * @returns Promise that resolves to a result object
     */
    write(bulkEvents: BulkWriteOperation[]): Promise<KafkaEventSinkResult>;

    /**
     * Close the Kafka producer and client connections
     * @returns Promise that resolves when closed
     */
    close(): Promise<void>;

    /**
     * Check if Kafka sink is available and connected
     * @returns True if connected and ready
     */
    isConnected(): boolean;
}

// ==================== Factory ====================

/**
 * Factory class for creating appropriate EventSink instances
 * Handles sink selection based on configuration and availability
 * 
 * @DI Supports dependency injection for testing and modularity
 */
export declare class EventSinkFactory {
    /**
     * Create appropriate event sink(s) based on configuration
     * @param config Configuration object (typically from countlyConfig)
     * @param options Additional options for sink creation
     * @returns Array of sink instances
     * @throws {Error} If configuration is invalid or sink creation fails
     */
    static create(
        config: any,
        options?: EventSinkFactoryOptions,
        dependencies?: { log?: any }
    ): EventSinkInterface[];
}

// ==================== Unified Wrapper ====================

/**
 * High-level wrapper around EventSinkFactory
 * Provides a simplified interface for writing events to multiple sinks
 * with automatic configuration loading and sink management
 * 
 * @DI Supports dependency injection for testing and modularity
 */
export declare class UnifiedEventSink {
    /**
     * Create a UnifiedEventSink instance
     * Configuration is loaded automatically from the global config
     * @param dependencies Optional dependency injection for testing and modularity
     */
    constructor(dependencies?: UnifiedEventSinkDependencies);

    /**
     * Write events to all configured sinks in parallel
     * @param events Array of events (bulkWrite operations or event objects)
     * @returns Promise that resolves to a result object with per-sink status and overall summary
     * @throws {Error} If the sink has been closed
     * 
     * @example
     * const result = await eventSink.write(events);
     * // result = {
     * //   overall: { success: true, written: 100 },
     * //   sinks: {
     * //     MongoEventSink: { success: true, written: 100 },
     * //     KafkaEventSink: { success: true, written: 100 }
     * //   }
     * // }
     */
    write(events: BulkWriteOperation[]): Promise<UnifiedEventSinkResult>;

    /**
     * Close all sinks and clean up resources
     * @returns Promise that resolves when all sinks are closed
     */
    close(): Promise<void>;

    /**
     * Get the configured sink types
     * @returns Array of sink type names
     */
    getSinkTypes(): string[];

    /**
     * Check if the sink is initialized and ready
     * @returns True if initialized
     */
    isInitialized(): boolean;

    /**
     * Check if the sink is closed
     * @returns True if closed
     */
    isClosed(): boolean;
}

// ==================== Module Exports ====================

/**
 * Default export for the main UnifiedEventSink class
 */
export default UnifiedEventSink;