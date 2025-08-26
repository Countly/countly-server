/**
 * TypeScript definitions for EventSource module
 * Provides type safety for event consumption from multiple sources with async iteration
 * 
 * @DI All source classes support dependency injection for testing and modularity
 */

// ==================== Base Event Types ====================

/**
 * Generic event document structure consumed from event sources
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
 * Event batch structure yielded by async iterator
 * Contains events and a token for acknowledgment
 */
export interface EventBatch {
    source: 'KAFKA' | 'MONGODB_CHANGESTREAM';
    token: BatchToken;
    events: EventDocument[];
}

/**
 * Base interface for batch acknowledgment tokens
 */
export interface BatchToken {
    [key: string]: any;
}

/**
 * Kafka-specific batch token with metadata
 */
export interface KafkaBatchToken extends BatchToken {
    topic: string;
    partition: number;
    firstOffset: number;
    lastOffset: number;
    batchSize: number;
    key: string; // Format: kafka:topic:partition:firstOffset-lastOffset
}

/**
 * MongoDB ChangeStream batch token for resumption
 */
export interface ChangeStreamBatchToken extends BatchToken {
    _id?: string;           // Resume token ID
    [key: string]: any;     // Additional MongoDB change stream token fields
}

// ==================== Configuration Types ====================

/**
 * Dependencies for EventSourceFactory.create method
 */
export interface EventSourceFactoryDependencies {
    countlyConfig?: any;    // Countly configuration object
    log?: any;              // Logger instance
}

/**
 * Dependencies for UnifiedEventSource constructor
 */
export interface UnifiedEventSourceDependencies {
    countlyConfig?: any;    // Countly configuration object
    log?: any;              // Logger instance
}

/**
 * MongoDB/ChangeStream configuration options
 */
export interface MongoEventSourceOptions {
    db: any;                         // MongoDB database connection
    pipeline?: any[];               // MongoDB aggregation pipeline for filtering
    collection?: string;            // Collection name (default: 'drill_events')
    options?: Record<string, any>;  // Additional MongoDB change stream options
    interval?: number;              // Health check interval in milliseconds (default: 10000)
    onClose?: (error?: Error) => void; // Callback when change stream closes
    fallback?: Record<string, any>; // Fallback configuration for change stream recovery
}

/**
 * Kafka configuration options
 */
export interface KafkaEventSourceOptions {
    topics?: string[];              // Kafka topics to subscribe to
    [key: string]: any;            // Additional Kafka consumer options
}

/**
 * Options passed to UnifiedEventSource and EventSourceFactory
 */
export interface EventSourceOptions {
    mongo: MongoEventSourceOptions; // Required MongoDB configuration
    kafka?: KafkaEventSourceOptions; // Optional Kafka overrides
}

// ==================== Dependency Injection Types ====================

/**
 * Dependencies for KafkaEventSource (for testing and modularity)
 */
export interface KafkaEventSourceDependencies {
    countlyConfig: any;             // Required. Global Countly configuration
    KafkaClient?: new () => any;    // KafkaClient class constructor
    KafkaConsumer?: new (client: any, name: string, options: any) => any; // KafkaConsumer class constructor
    log?: any;                      // Logger instance
}

/**
 * Dependencies for ChangeStreamEventSource (for testing and modularity)
 */
export interface ChangeStreamEventSourceDependencies {
    countlyConfig: any;             // Required. Global Countly configuration
    ChangeStreamReader?: new (db: any, config: any, callback: (token: any, data: any) => void) => any; // ChangeStreamReader class constructor
    log?: any;                      // Logger instance
}

// ==================== Abstract Base Class ====================

/**
 * Abstract base class for all event sources
 * Provides async iteration with automatic batch acknowledgment and resource cleanup
 * 
 * This is an abstract base class that defines the template method pattern for event sources.
 * Subclasses must implement initialize(), getNext(), acknowledge(), and stop() methods.
 * 
 * The async iterator provides:
 * - Automatic resource initialization and cleanup
 * - At-least-once delivery semantics (events not acknowledged if consumer throws)
 * - Proper resource cleanup on early exits, breaks, and errors
 * - Single iteration restriction (prevents parallel processing on same instance)
 * 
 * Usage: for await (const {token, events} of eventSource) { ... }
 * 
 * Application Code:
 * Use UnifiedEventSource for a clean API: new UnifiedEventSource(name, sourceConf)
 * This abstract class is implemented by KafkaEventSource and ChangeStreamEventSource.
 * 
 * Constructor Parameters:
 * This is an abstract base class - it should not be instantiated directly.
 * Subclasses define their own constructor parameters based on their specific requirements.
 * 
 * @abstract
 */
export declare abstract class EventSourceInterface {
    /**
     * Initialize the event source
     * @returns Promise that resolves when the source is ready
     */
    abstract initialize(): Promise<void>;

    /**
     * Get the next batch of events
     * @returns Promise that resolves to next batch with token, or null if no more events
     * @protected
     */
    protected abstract getNext(): Promise<EventBatch | null>;

    /**
     * Acknowledge successful processing of a batch
     * @param token Token received from getNext()
     * @returns Promise that resolves when acknowledged
     * @protected
     */
    protected abstract acknowledge(token: BatchToken): Promise<void>;

    /**
     * Stop the event source
     * @returns Promise that resolves when the source is stopped
     */
    abstract stop(): Promise<void>;

    /**
     * Self-contained async iterator with automatic resource cleanup
     * Usage: for await (const {token, events} of eventSource) { ... }
     * 
     * Acknowledgment semantics:
     * - Previous batch is acknowledged before yielding the next batch
     * - Final batch is acknowledged on clean exit (break/return)
     * - Final batch is NOT acknowledged if consumer throws (at-least-once delivery)
     * 
     * Resource management:
     * - Automatically stops the event source when iteration completes
     * - Handles early breaks, errors, and normal completion
     * - Prevents resource leaks from unclosed sources
     * 
     * @yields Event batches with automatic acknowledgment
     * @throws {Error} If event source is already being iterated
     */
    [Symbol.asyncIterator](): AsyncGenerator<EventBatch, void, unknown>;
}

// ==================== Concrete Implementations ====================

/**
 * Kafka implementation of EventSourceInterface
 * Supports async iteration with auto-acknowledgment and proper at-least-once delivery
 * 
 * Uses dependency injection pattern - creates own KafkaClient and KafkaConsumer instances
 * in initialize() method for consistent resource management.
 * 
 * @DI Supports dependency injection for testing and modularity
 */
export declare class KafkaEventSource extends EventSourceInterface {
    /**
     * Create a KafkaEventSource instance with dependency injection
     * 
     * This class is typically created by EventSourceFactory, not directly by application code.
     * Use UnifiedEventSource for a cleaner API: new UnifiedEventSource(name, sourceConf)
     * 
     * @param name Required. Unique consumer name used for logging and identification
     *             Used as Kafka consumer group ID (with prefix from countlyConfig)
     * @param kafkaOptions Required. Kafka-specific configuration object
     * @param dependencies Required. Dependency injection for testing and configuration
     * @throws {Error} If required parameters are missing
     */
    constructor(
        name: string,
        kafkaOptions: KafkaEventSourceOptions,
        dependencies: KafkaEventSourceDependencies
    );

    /**
     * Initialize the Kafka consumer with blocking handler for proper acknowledgment flow
     * Creates its own KafkaClient and KafkaConsumer instances for consistent dependency injection
     * @returns Promise that resolves when consumer is started
     */
    initialize(): Promise<void>;

    /**
     * Get the next batch of events from Kafka
     * @returns Promise that resolves to next batch with Kafka metadata token, or null if closed
     * @protected
     */
    protected getNext(): Promise<EventBatch | null>;

    /**
     * Acknowledge successful processing of a batch
     * This unblocks the Kafka handler, allowing offset commit
     * @param token Token from getNext()
     * @returns Promise that resolves when acknowledged
     * @protected
     */
    protected acknowledge(token: KafkaBatchToken): Promise<void>;

    /**
     * Stop the Kafka consumer
     * @returns Promise that resolves when stopped
     */
    stop(): Promise<void>;
}

/**
 * ChangeStream implementation of EventSourceInterface
 * Supports async iteration with auto-acknowledgment of MongoDB changestream events
 * 
 * Uses dependency injection pattern - creates own ChangeStreamReader instance
 * in initialize() method with backpressure management.
 * 
 * @DI Supports dependency injection for testing and modularity
 */
export declare class ChangeStreamEventSource extends EventSourceInterface {
    /**
     * Create a ChangeStreamEventSource instance with consistent dependency injection
     * 
     * This class is typically created by EventSourceFactory, not directly by application code.
     * Use UnifiedEventSource for a cleaner API: new UnifiedEventSource(name, sourceConf)
     * 
     * @param name Required. Unique name for this event source used for logging and identification
     * @param mongoOptions Required. MongoDB/ChangeStream configuration object
     * @param dependencies Required. Dependency injection for testing and configuration
     * @throws {Error} If required parameters are missing
     */
    constructor(
        name: string,
        mongoOptions: MongoEventSourceOptions,
        dependencies: ChangeStreamEventSourceDependencies
    );

    /**
     * Initialize the changestream reader with consistent dependency injection
     * Creates its own changeStreamReader instance, matching KafkaEventSource pattern
     * @returns Promise that resolves when the reader is initialized
     */
    initialize(): Promise<void>;

    /**
     * Get the next batch of events from the changestream
     * Collects events from internal queue into batches
     * @returns Promise that resolves to next batch with ChangeStream token, or null if closed
     * @protected
     */
    protected getNext(): Promise<EventBatch | null>;

    /**
     * Acknowledge successful processing of a batch
     * @param token Token from getNext() (last token in the batch)
     * @returns Promise that resolves when acknowledged
     * @protected
     */
    protected acknowledge(token: ChangeStreamBatchToken): Promise<void>;

    /**
     * Stop the changestream reader
     * @returns Promise that resolves when the reader is stopped
     */
    stop(): Promise<void>;
}

// ==================== Factory ====================

/**
 * Factory class for creating appropriate EventSource instances
 * Handles source selection based on configuration and availability
 * 
 * @DI Supports dependency injection for testing and modularity
 */
export declare class EventSourceFactory {
    /**
     * Create an event source based on the provided configuration
     * 
     * This factory is typically called by UnifiedEventSource, not directly by application code.
     * The UnifiedEventSource provides a cleaner API: new UnifiedEventSource(name, sourceConf)
     * 
     * Auto-detects source type:
     * - Uses Kafka if: countlyConfig.kafka.enabled=true AND Kafka modules are available
     * - Falls back to ChangeStream in all other cases
     * 
     * @param name Required. Unique name for this event source used across all implementations
     * @param options Required. Configuration object that determines which event source to create
     * @param dependencies Optional. Dependency injection for testing and configuration
     * @returns EventSourceInterface implementation (KafkaEventSource or ChangeStreamEventSource)
     * @throws {Error} If required parameters are missing
     * @throws {Error} If Kafka is configured but not available
     * 
     * @example
     * // Typically called via UnifiedEventSource (recommended):
     * const eventSource = new UnifiedEventSource('session-processor', {
     *   mongo: {
     *     db: mongoDatabase,
     *     pipeline: [{ $match: { 'fullDocument.e': '[CLY]_session' } }]
     *   }
     * });
     */
    static create(
        name: string,
        options: EventSourceOptions,
        dependencies?: EventSourceFactoryDependencies
    ): EventSourceInterface;
}

// ==================== Unified Wrapper ====================

/**
 * High-level async iterator wrapper around EventSourceFactory
 * 
 * This class provides a unified interface for consuming events from different sources
 * (Kafka or ChangeStream) using modern async iteration patterns.
 * 
 * Kafka configuration (topics, offsets, etc.) comes from global countlyConfig.
 * Only source-specific runtime parameters are passed during instantiation.
 * 
 * @DI Supports dependency injection for testing and modularity
 */
export declare class UnifiedEventSource {
    /**
     * Create a UnifiedEventSource instance with simplified configuration
     * 
     * The UnifiedEventSource delegates to EventSourceFactory which auto-detects the source type:
     * - Uses Kafka if: countlyConfig.kafka.enabled=true AND Kafka modules are available
     * - Falls back to ChangeStream in all other cases
     * 
     * Kafka configuration (topics, autoOffsetReset, etc.) comes from global countlyConfig.
     * Only source-specific runtime parameters are provided during instantiation.
     * 
     * @param name Required. Unique identifier for this event source (used for consumer group naming and logging)
     * @param options Source-specific configuration
     * @param dependencies Optional. Dependency injection for testing and configuration
     * @throws {Error} If name is missing
     * @throws {Error} If options.mongo.db is missing
     * 
     * @example
     * // Basic usage - will use Kafka if enabled, ChangeStream otherwise
     * const eventSource = new UnifiedEventSource('session-processor', {
     *   mongo: {
     *     db: common.drillDb,
     *     pipeline: [{ $match: { 'fullDocument.e': '[CLY]_session' } }],
     *     collection: 'drill_events'
     *   }
     * });
     * 
     * @example
     * // Minimal usage - just provide database connection
     * const eventSource = new UnifiedEventSource('event-processor', {
     *   mongo: { db: common.drillDb }
     * });
     */
    constructor(name: string, options: EventSourceOptions, dependencies?: UnifiedEventSourceDependencies);

    /**
     * Self-contained async iterator with automatic resource cleanup
     * Usage: for await (const {token, events} of unifiedEventSource) { ... }
     * Delegates to the underlying event source's async iterator implementation
     * 
     * @yields Event batches with auto-acknowledgment
     * @throws {Error} If underlying event source fails
     * 
     * @example
     * // Async iterator with auto-acknowledgment
     * for await (const { token, events } of eventSource) {
     *   for (const event of events) {
     *     await processEvent(event);
     *   }
     *   // Batch is automatically acknowledged when iterator moves to next batch
     * }
     */
    [Symbol.asyncIterator](): AsyncGenerator<EventBatch, void, unknown>;
}

// ==================== Module Exports ====================

/**
 * Default export for the main UnifiedEventSource class
 */
export default UnifiedEventSource;