/**
 * Base interface for event sinks
 * Provides a consistent API for writing events to various destinations (MongoDB, Kafka, etc.)
 *
 * This is an abstract base class that defines the template method pattern for event sinks.
 * Subclasses must implement initialize(), write(), and close() methods.
 *
 * The interface provides:
 * - Standardized error handling and logging
 * - Common initialization and cleanup patterns
 * - Consistent return value format
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
 * @module api/eventSink/EventSinkInterface
 */

/**
 * Result object returned from write operations
 */
export interface EventSinkResult {
    /** Whether the operation succeeded */
    success: boolean;
    /** Number of events written */
    written: number;
    /** Type/name of the sink */
    type: string;
    /** Optional message */
    message?: string | null;
    /** Timestamp of the result */
    timestamp: Date;
    /** Duration in milliseconds */
    duration?: number;
    /** Number of duplicate events */
    duplicates?: number;
    /** Error message if failed */
    error?: string;
    /** Additional metadata */
    [key: string]: unknown;
}

/**
 * Bulk write operation for events
 */
export interface BulkWriteOperation {
    insertOne?: {
        document: Record<string, unknown>;
    };
    updateOne?: {
        filter: Record<string, unknown>;
        update: Record<string, unknown>;
        upsert?: boolean;
    };
    updateMany?: {
        filter: Record<string, unknown>;
        update: Record<string, unknown>;
        upsert?: boolean;
    };
    deleteOne?: {
        filter: Record<string, unknown>;
    };
    deleteMany?: {
        filter: Record<string, unknown>;
    };
}

/**
 * Abstract base class for event sinks
 */
abstract class EventSinkInterface {
    #isInitialized = false;
    #isClosed = false;

    /**
     * Initialize the event sink
     * @returns Promise that resolves when the sink is ready
     */
    abstract initialize(): Promise<void>;

    /**
     * Write events to the sink
     * @param events - Array of events to write (bulkWrite format or event objects)
     * @returns Promise with result object containing success status and metadata
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
    getType(): string {
        return this.constructor.name;
    }

    /**
     * Check if the sink is initialized
     * @returns True if initialized
     */
    isInitialized(): boolean {
        return this.#isInitialized;
    }

    /**
     * Check if the sink is closed
     * @returns True if closed
     */
    isClosed(): boolean {
        return this.#isClosed;
    }

    /**
     * Protected method to mark sink as initialized
     * @protected
     */
    protected _setInitialized(): void {
        this.#isInitialized = true;
    }

    /**
     * Protected method to mark sink as closed
     * @protected
     */
    protected _setClosed(): void {
        this.#isClosed = true;
        this.#isInitialized = false;
    }

    /**
     * Protected helper to validate events array
     * @param events - Events to validate
     * @returns True if valid and has events to process
     * @protected
     */
    protected _validateEvents(events: unknown[]): boolean {
        if (!Array.isArray(events)) {
            throw new TypeError('Events must be an array');
        }
        if (events.length === 0) {
            return false; // Empty array is valid but no work to do
        }
        return true;
    }

    /**
     * Protected helper to create standardized result object
     * @param success - Whether the operation succeeded
     * @param written - Number of events written
     * @param message - Optional message
     * @param metadata - Optional additional metadata
     * @returns Standardized result object
     * @protected
     */
    protected _createResult(
        success: boolean,
        written: number,
        message: string | null = null,
        metadata: Record<string, unknown> = {}
    ): EventSinkResult {
        return {
            success,
            written,
            type: this.getType(),
            message,
            timestamp: new Date(),
            ...metadata
        };
    }
}

export default EventSinkInterface;
