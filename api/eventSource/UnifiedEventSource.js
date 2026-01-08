const EventSourceFactory = require('./EventSourceFactory');
const Log = require('../utils/log.js');

/**
 * UnifiedEventSource - Async iterator wrapper around EventSourceFactory
 * 
 * This class provides a unified interface for consuming events from different sources
 * (Kafka or ChangeStream) using modern async iteration patterns.
 * 
 * Kafka configuration (topics, offsets, etc.) comes from global countlyConfig.
 * Only source-specific runtime parameters are passed during instantiation.
 *
 * @DI Supports dependency injection for testing and modularity
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
    #name; // unique name for this event source instance

    #log; // internal logger instance

    #source = null; // underlying event source instance (Kafka or ChangeStream)

    #countlyConfig; // reference to global countlyConfig

    #options; // local configuration (name, source type, etc.)

    /**
     * Create a UnifiedEventSource instance with consistent dependency injection
     * 
     * The UnifiedEventSource delegates to EventSourceFactory which auto-detects the source type:
     * - Uses Kafka if: countlyConfig.kafka.enabled=true AND Kafka modules are available
     * - Falls back to ChangeStream in all other cases
     * 
     * Kafka configuration (topics, autoOffsetReset, etc.) comes from global countlyConfig.
     * Only source-specific runtime parameters are provided during instantiation.
     * 
     * @param {string} name - Required. Unique identifier for this event source (used for consumer group naming and logging)
     * @param {Object} options - Source-specific configuration (only mongo and kafka keys)
     * @param {Object} options.mongo - MongoDB/ChangeStream configuration (required)
     * @param {Object} options.mongo.db - Required. MongoDB database connection
     * @param {Array} [options.mongo.pipeline=[]] - MongoDB aggregation pipeline for filtering change stream events
     * @param {string} [options.mongo.collection='drill_events'] - MongoDB collection to watch for changes
     * @param {Object} [options.mongo.options={}] - Additional MongoDB change stream options
     * @param {number} [options.mongo.interval=10000] - Health check interval for change stream (milliseconds)
     * @param {Function} [options.mongo.onClose] - Callback function executed when the change stream closes
     * @param {Object} [options.mongo.fallback] - Fallback configuration for when change streams fail
     * @param {Object} [options.kafka] - Kafka-specific overrides (rarely needed - config comes from countlyConfig)
     * @param {Object} [dependencies={}] - Optional dependency injection for testing and modularity
     * @param {Object} [dependencies.countlyConfig] - Countly configuration object (defaults to require('../config'))
     * @param {Logger} [dependencies.log] - Logger instance (defaults to Log('UnifiedEventSource'))
     * @param {Object} [dependencies.source] - Pre-initialized event source (for testing only)
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
     * @example
     * // With dependency injection - can pass any implementation
     * const eventSource = new UnifiedEventSource('custom-processor', {
     *   mongo: { db: customDb }
     * }, {
     *   countlyConfig: productionConfig,
     *   log: customLogger
     * });
     * 
     * @throws {Error} If name is missing
     * @throws {Error} If options.mongo.db is missing
     */
    constructor(name, options, dependencies = {}) {
        if (!name || typeof name !== 'string') {
            throw new Error('UnifiedEventSource requires a name (string) parameter');
        }
        if (!options?.mongo?.db) {
            throw new Error('UnifiedEventSource requires options.mongo.db (MongoDB database connection)');
        }
        this.#name = name;
        this.#log = dependencies.log || Log('UnifiedEventSource');
        this.#countlyConfig = dependencies.countlyConfig || require('../config');
        this.#options = options;

        // Allow injecting pre-initialized source for testing
        if (dependencies.source) {
            this.#source = dependencies.source;
            this.#log.d(`UnifiedEventSource created: ${name} (injected source)`);
        }
        else {
            // Get common for database access (used for batch deduplication state)
            const common = dependencies.common || require('../utils/common.js');

            this.#source = EventSourceFactory.create(name, options, {
                countlyConfig: this.#countlyConfig,
                db: common.db // Pass main database for batch deduplication state
            });

            this.#log.d(`UnifiedEventSource created: ${name} (${this.#source.constructor.name})`);
        }
    }

    /**
     * Self-contained async iterator with automatic resource cleanup
     * Usage: for await (const {token, events} of unifiedEventSource) { ... }
     * Delegates to the underlying event source's async iterator implementation
     * @yields {{token: Object, events: Array<Object>}} Event batches with auto-acknowledgment
     */
    async *[Symbol.asyncIterator]() {
        try {
            this.#log.d(`[${this.#name}] Starting unified event source iteration`);
            yield* this.#source[Symbol.asyncIterator]();
        }
        catch (error) {
            this.#log.e(`[${this.#name}] Error during unified iteration:`, error);
            throw error;
        }
        finally {
            this.#log.d(`[${this.#name}] Unified event source iteration completed`);
        }
    }

    /**
     * Mark a batch as processed for deduplication
     * @param {Object} token - Batch token from the iterator
     * @returns {Promise<void>} resolves when marked
     */
    async markBatchProcessed(token) {
        if (this.#source && typeof this.#source.markBatchProcessed === 'function') {
            await this.#source.markBatchProcessed(token);
        }
    }

    /**
     * Process events with automatic acknowledgment and deduplication
     * Eliminates race condition - dedup state written immediately after handler completes
     *
     * @param {Function} handler - Async function(token, events) that processes each batch
     * @returns {Promise<void>} resolves when all batches are processed
     *
     * @example
     * await eventSource.processWithAutoAck(async (token, events) => {
     *     for (const event of events) { await processEvent(event); }
     *     await writeBatcher.flush();
     * });
     */
    async processWithAutoAck(handler) {
        for await (const {token, events} of this) {
            await handler(token, events);
            await this.markBatchProcessed(token);
        }
    }

}

module.exports = UnifiedEventSource;