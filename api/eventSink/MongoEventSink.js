const EventSinkInterface = require('./EventSinkInterface');
const common = require('../utils/common.js');
const Log = require('../utils/log.js');

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
 */
class MongoEventSink extends EventSinkInterface {
    #log; // logger instance

    #db; // MongoDB database connection

    #collection; // MongoDB collection instance

    /**
     * Create a MongoEventSink instance
     * 
     * @param {Object} [options={}] - Configuration options for the sink
     * @param {string} [options.collection='drill_events'] - Collection name for events
     * @param {Object} [dependencies={}] - Optional dependency injection for testing and modularity
     * @param {Object} [dependencies.db] - MongoDB database connection object (defaults to common.drillDb)
     * @param {Logger} [dependencies.log] - Logger instance (defaults to Log('eventSink:mongo'))
     */
    constructor(options = {}, dependencies = {}) {
        super();
        this.#db = dependencies.db || common.drillDb;
        this.#log = dependencies.log || Log('eventSink:mongo');
        const collectionName = options.collection || 'drill_events';
        this.#collection = this.#db.collection(collectionName);
    }

    /**
     * Initialize the MongoDB connection
     * @returns {Promise<void>} resolves when the sink is ready
     */
    async initialize() {
        if (this.isInitialized()) {
            return;
        }
        try {
            await this.#collection.findOne({}, { _id: 1 });
            this._setInitialized();
            this.#log.d(`MongoEventSink initialized for collection`);
        }
        catch (error) {
            this.#log.e('Failed to initialize MongoEventSink:', error);
            throw error;
        }
    }

    /**
     * Write events to MongoDB using bulkWrite
     * @param {Array<Object>} bulkOps - Array of bulkWrite operations
     * @returns {Promise<Object>} Result object with success status and metadata
     */
    async write(bulkOps) {
        if (!this.isInitialized()) {
            await this.initialize();
        }

        if (!this._validateEvents(bulkOps)) {
            return this._createResult(true, 0, 'No events to write');
        }

        const startTime = Date.now();
        let insertedCount = 0;

        try {
            const result = await this.#collection.bulkWrite(bulkOps, { ordered: false });
            insertedCount = result.insertedCount || 0;
            const duration = Date.now() - startTime;
            this.#log.d(`Successfully wrote ${insertedCount} events to MongoDB in ${duration}ms`);
            return this._createResult(true, insertedCount, 'Events written successfully', {
                duration
            });
        }
        catch (error) {
            const duration = Date.now() - startTime;
            if (error.writeErrors && Array.isArray(error.writeErrors)) {
                const duplicateErrors = error.writeErrors.filter(e => e.code === 11000);
                const realErrors = error.writeErrors.filter(e => e.code !== 11000);

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
            else if (error.code === 11000) {
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
     * @returns {Promise<void>} resolves when closed
     */
    async close() {
        if (this.isClosed()) {
            return;
        }
        this._setClosed();
        this.#log.d('MongoEventSink closed');
    }

}

module.exports = MongoEventSink;