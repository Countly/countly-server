const EventSinkInterface = require('./EventSinkInterface');
const common = require('../utils/common.js');
const log = require('../utils/log.js')('eventSink:mongo');

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
 */
class MongoEventSink extends EventSinkInterface {
    #db;

    #collectionName;

    /**
     * Create a MongoEventSink instance
     * 
     * @param {Object} [options={}] - Configuration options
     * @param {Object} [options.db] - MongoDB database connection (defaults to common.drillDb)
     * @param {string} [options.collection='drill_events'] - Collection name for events
     */
    constructor(options = {}) {
        super();
        this.#db = options.db || common.drillDb;
        this.#collectionName = options.collection || 'drill_events';
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
            // Test the database connection
            if (!this.#db) {
                throw new Error('MongoDB database connection is not available');
            }
            await this.#db.collection(this.#collectionName).findOne({}, { _id: 1 });

            this._setInitialized();
            log.d(`MongoEventSink initialized for collection: ${this.#collectionName}`);
        }
        catch (error) {
            log.e('Failed to initialize MongoEventSink:', error);
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
            const result = await this.#db.collection(this.#collectionName)
                .bulkWrite(bulkOps, { ordered: false });

            insertedCount = result.insertedCount || 0;

            const duration = Date.now() - startTime;
            this._updateStats(insertedCount, true);

            log.d(`Successfully wrote ${insertedCount} events to MongoDB in ${duration}ms`);

            return this._createResult(true, insertedCount, 'Events written successfully', {
                duration
            });
        }
        catch (error) {
            const duration = Date.now() - startTime;

            // Handle MongoDB duplicate key errors and other write errors
            if (error.writeErrors && Array.isArray(error.writeErrors)) {
                const duplicateErrors = error.writeErrors.filter(e => e.code === 11000);
                const realErrors = error.writeErrors.filter(e => e.code !== 11000);

                // If only duplicate key errors, consider it successful
                if (realErrors.length === 0) {
                    // Calculate successful inserts (total - duplicates)
                    const successfulInserts = bulkOps.length - duplicateErrors.length;

                    this._updateStats(successfulInserts, true);
                    log.d(`Wrote ${successfulInserts} events with ${duplicateErrors.length} duplicates ignored`);

                    return this._createResult(true, successfulInserts, 'Events written (duplicates ignored)', {
                        duration,
                        duplicates: duplicateErrors.length
                    });
                }
                else {
                    // Real errors occurred
                    log.e(`MongoDB write errors: ${realErrors.length} real errors, ${duplicateErrors.length} duplicates`, realErrors);
                }
            }
            else if (error.code === 11000) {
                // Single duplicate key error
                this._updateStats(0, true);
                log.d('Event already exists (duplicate key), ignoring');

                return this._createResult(true, 0, 'Event already exists (duplicate)', {
                    duration
                });
            }

            // Real error occurred
            this._updateStats(0, false, error);
            log.e('Error writing events to MongoDB:', error);
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
        log.d('MongoEventSink closed');
    }

}

module.exports = MongoEventSink;