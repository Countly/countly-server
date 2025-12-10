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
 */
class EventSinkInterface {
    #isInitialized = false;

    #isClosed = false;

    /**
     * Initialize the event sink
     * @returns {Promise<void>} resolves when the sink is ready
     */
    async initialize() {
        throw new Error('initialize() must be implemented by subclass');
    }

    /**
     * Write events to the sink
     * @param {Array<Object>} events - Array of events to write (bulkWrite format or event objects)
     * @returns {Promise<Object>} Result object with success status and metadata
     */
    async write(events) { // eslint-disable-line no-unused-vars
        throw new Error('write() must be implemented by subclass');
    }

    /**
     * Close the event sink and clean up resources
     * @returns {Promise<void>} resolves when the sink is closed
     */
    async close() {
        throw new Error('close() must be implemented by subclass');
    }

    /**
     * Get the name/type of this sink
     * @returns {string} Sink type name
     */
    getType() {
        return this.constructor.name;
    }

    /**
     * Check if the sink is initialized
     * @returns {boolean} True if initialized
     */
    isInitialized() {
        return this.#isInitialized;
    }

    /**
     * Check if the sink is closed
     * @returns {boolean} True if closed
     */
    isClosed() {
        return this.#isClosed;
    }

    /**
     * Protected method to mark sink as initialized
     * @protected
     */
    _setInitialized() {
        this.#isInitialized = true;
    }

    /**
     * Protected method to mark sink as closed
     * @protected
     */
    _setClosed() {
        this.#isClosed = true;
        this.#isInitialized = false;
    }


    /**
     * Protected helper to validate events array
     * @param {Array} events - Events to validate
     * @returns {boolean} True if valid
     * @protected
     */
    _validateEvents(events) {
        if (!Array.isArray(events)) {
            throw new Error('Events must be an array');
        }
        if (events.length === 0) {
            return false; // Empty array is valid but no work to do
        }

        return true;
    }

    /**
     * Protected helper to create standardized result object
     * @param {boolean} success - Whether the operation succeeded
     * @param {number} written - Number of events written
     * @param {string} [message] - Optional message
     * @param {Object} [metadata] - Optional additional metadata
     * @returns {Object} Standardized result object
     * @protected
     */
    _createResult(success, written, message = null, metadata = {}) {
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

module.exports = EventSinkInterface;