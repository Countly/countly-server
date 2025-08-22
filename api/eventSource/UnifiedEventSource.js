const EventSourceFactory = require('./EventSourceFactory');
const countlyConfig = require('../config');
const log = require('../utils/log.js')('eventSource:unified');

/**
 * UnifiedEventSource - Async iterator wrapper around EventSourceFactory
 * 
 * This class provides a unified interface for consuming events from different sources
 * (Kafka or ChangeStream) using modern async iteration patterns.
 * 
 * Kafka configuration (topics, offsets, etc.) comes from global countlyConfig.
 * Only source-specific runtime parameters are passed during instantiation.
 *
 * @example
 * const eventSource = new UnifiedEventSource('session-processor', {
 *   mongo: {
 *     db: common.drillDb,
 *     pipeline: [{ $match: { 'fullDocument.e': '[CLY]_session' } }],
 *     collection: 'drill_events'
 *   }
 * });
 *
 * // Async iterator with auto-acknowledgment
 * for await (const { token, events } of eventSource) {
 *   for (const event of events) {
 *     await processEvent(event);
 *   }
 *   // Batch is automatically acknowledged when iterator moves to next batch
 * }
 */
class UnifiedEventSource {
    #source = null;

    #config;

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
     * @param {string} name - Required. Unique identifier for this event source (used for consumer group naming and logging)
     * @param {Object} sourceConf - Source-specific configuration
     * @param {Object} sourceConf.mongo - MongoDB/ChangeStream configuration (required)
     * @param {Object} sourceConf.mongo.db - Required. MongoDB database connection
     * @param {Array} [sourceConf.mongo.pipeline=[]] - MongoDB aggregation pipeline for filtering change stream events
     * @param {string} [sourceConf.mongo.collection='drill_events'] - MongoDB collection to watch for changes
     * @param {Object} [sourceConf.mongo.options={}] - Additional MongoDB change stream options
     * @param {number} [sourceConf.mongo.interval=10000] - Health check interval for change stream (milliseconds)
     * @param {Function} [sourceConf.mongo.onClose] - Callback function executed when the change stream closes
     * @param {Object} [sourceConf.mongo.fallback] - Fallback configuration for when change streams fail
     * @param {Object} [sourceConf.kafka] - Kafka-specific overrides (rarely needed - config comes from countlyConfig)
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
     * 
     * @throws {Error} If name is missing
     * @throws {Error} If sourceConf.mongo.db is missing
     */
    constructor(name, sourceConf) {
        if (!name || typeof name !== 'string') {
            throw new Error('UnifiedEventSource requires a name (string) parameter');
        }

        if (!sourceConf?.mongo?.db) {
            throw new Error('UnifiedEventSource requires sourceConf.mongo.db (MongoDB database connection)');
        }

        // Build config for EventSourceFactory in the expected format
        this.#config = {
            name,
            countlyConfig, // Use global config automatically
            db: sourceConf.mongo.db,

            // ChangeStream configuration
            collection: sourceConf.mongo.collection,
            pipeline: sourceConf.mongo.pipeline,
            options: sourceConf.mongo.options,
            interval: sourceConf.mongo.interval,
            onClose: sourceConf.mongo.onClose,
            fallback: sourceConf.mongo.fallback,

            // Kafka configuration (rarely used - comes from countlyConfig)
            kafkaConfig: sourceConf.kafka || {}
        };

        // Create the appropriate source using the factory
        this.#source = EventSourceFactory.create(this.#config);

        log.d(`UnifiedEventSource created: ${name} (${this.#source.constructor.name})`);
    }

    /**
     * Self-contained async iterator with automatic resource cleanup
     * Usage: for await (const {token, events} of unifiedEventSource) { ... }
     * 
     * Delegates to the underlying event source's async iterator implementation
     * 
     * @yields {{token: Object, events: Array<Object>}} Event batches with auto-acknowledgment
     */
    async *[Symbol.asyncIterator]() {
        try {
            log.d(`[${this.#config.name}] Starting unified event source iteration`);
            yield* this.#source[Symbol.asyncIterator]();
        }
        catch (error) {
            log.e(`[${this.#config.name}] Error during unified iteration:`, error);
            throw error;
        }
        finally {
            log.d(`[${this.#config.name}] Unified event source iteration completed`);
        }
    }

    /**
     * Check if the event source is currently being iterated
     * @returns {boolean} True if iteration is in progress
     */
    isIterating() {
        return this.#source?.isIterating() || false;
    }

    /**
     * Get statistics about the event source
     * @returns {Object} Statistics object
     */
    getStats() {
        return {
            name: this.#config.name,
            type: this.#source.constructor.name,
            isIterating: this.isIterating()
        };
    }
}

module.exports = UnifiedEventSource;