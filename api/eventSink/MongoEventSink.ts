/**
 * MongoDB implementation of EventSinkInterface
 * Handles writing events to drill_events collection and related operations
 *
 * This implementation:
 * - Uses existing bulkWrite operations with ordered:false
 * - Handles duplicate key errors (11000) gracefully
 * - Maintains compatibility with existing requestProcessor logic
 *
 * Note: This class passes through to MongoDB's native bulkWrite without additional batching
 *
 * @DI Supports dependency injection for testing and modularity
 * @module api/eventSink/MongoEventSink
 */

import type { Collection, Db, BulkWriteResult } from 'mongodb';
import EventSinkInterface, { type BulkWriteOperation, type EventSinkResult } from './EventSinkInterface.js';
import common from '../utils/common.js';
import logModule from '../utils/log.js';

/** Logger interface */
interface Logger {
    d: (...args: unknown[]) => void;
    e: (...args: unknown[]) => void;
    i: (...args: unknown[]) => void;
    w: (...args: unknown[]) => void;
}

/** MongoDB write error */
interface WriteError {
    code: number;
    errmsg?: string;
    index: number;
}

/** MongoDB bulk write error */
interface BulkWriteError extends Error {
    writeErrors?: WriteError[];
    code?: number;
}

/** Options for MongoEventSink constructor */
export interface MongoEventSinkOptions {
    /** Collection name for events */
    collection?: string;
}

/** Dependencies for MongoEventSink (for DI) */
export interface MongoEventSinkDependencies {
    /** MongoDB database connection object */
    db?: Db;
    /** Logger instance */
    log?: Logger;
}

/**
 * MongoDB implementation of EventSinkInterface
 */
class MongoEventSink extends EventSinkInterface {
    #log: Logger;
    #db: Db;
    #collection: Collection;

    /**
     * Create a MongoEventSink instance
     *
     * @param options - Configuration options for the sink
     * @param dependencies - Optional dependency injection for testing and modularity
     */
    constructor(options: MongoEventSinkOptions = {}, dependencies: MongoEventSinkDependencies = {}) {
        super();
        this.#db = dependencies.db || common.drillDb;
        this.#log = dependencies.log || logModule('eventSink:mongo') as Logger;
        const collectionName = options.collection || 'drill_events';
        this.#collection = this.#db.collection(collectionName);
    }

    /**
     * Initialize the MongoDB connection
     * @returns Promise that resolves when the sink is ready
     */
    async initialize(): Promise<void> {
        if (this.isInitialized()) {
            return;
        }
        try {
            await this.#collection.findOne({}, { projection: { _id: 1 } });
            this._setInitialized();
            this.#log.d('MongoEventSink initialized for collection');
        }
        catch (error) {
            this.#log.e('Failed to initialize MongoEventSink:', error);
            throw error;
        }
    }

    /**
     * Write events to MongoDB using bulkWrite
     * @param bulkOps - Array of bulkWrite operations
     * @returns Promise with result object containing success status and metadata
     */
    async write(bulkOps: BulkWriteOperation[]): Promise<EventSinkResult> {
        if (!this.isInitialized()) {
            await this.initialize();
        }

        if (!this._validateEvents(bulkOps)) {
            return this._createResult(true, 0, 'No events to write');
        }

        const startTime = Date.now();
        let insertedCount = 0;

        try {
            const result: BulkWriteResult = await this.#collection.bulkWrite(bulkOps as any, { ordered: false });
            insertedCount = result.insertedCount || 0;
            const duration = Date.now() - startTime;
            this.#log.d(`Successfully wrote ${insertedCount} events to MongoDB in ${duration}ms`);
            return this._createResult(true, insertedCount, 'Events written successfully', {
                duration
            });
        }
        catch (error) {
            const duration = Date.now() - startTime;
            const bulkError = error as BulkWriteError;

            if (bulkError.writeErrors && Array.isArray(bulkError.writeErrors)) {
                const duplicateErrors = bulkError.writeErrors.filter((e: WriteError) => e.code === 11000);
                const realErrors = bulkError.writeErrors.filter((e: WriteError) => e.code !== 11000);

                // If only duplicate key errors, consider it successful
                if (realErrors.length === 0) {
                    // Calculate successful inserts (total - duplicates)
                    const successfulInserts = bulkOps.length - duplicateErrors.length;

                    this.#log.d(`Wrote ${successfulInserts} events with ${duplicateErrors.length} duplicates ignored`);
                    return this._createResult(true, successfulInserts, 'Events written (duplicates ignored)', {
                        duration,
                        duplicates: duplicateErrors.length
                    });
                }
                else {
                    this.#log.e(`MongoDB write errors: ${realErrors.length} real errors, ${duplicateErrors.length} duplicates`, realErrors);
                }
            }
            else if (bulkError.code === 11000) {
                // Single duplicate key error
                this.#log.d('Event already exists (duplicate key), ignoring');
                return this._createResult(true, 0, 'Event already exists (duplicate)', {
                    duration
                });
            }
            this.#log.e('Error writing events to MongoDB:', error);
            throw error;
        }
    }

    /**
     * Close the MongoDB connection (no-op for shared connection)
     * @returns Promise that resolves when closed
     */
    async close(): Promise<void> {
        if (this.isClosed()) {
            return;
        }
        this._setClosed();
        this.#log.d('MongoEventSink closed');
    }
}

export default MongoEventSink;
