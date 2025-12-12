const KafkaEventSource = require('./KafkaEventSource');
const ChangeStreamEventSource = require('./ChangeStreamEventSource');
const Log = require('../utils/log.js');

/**
 * Factory for creating event sources based on configuration
 * Determines whether to use Kafka or ChangeStream based on availability and configuration
 * 
 * @DI Supports dependency injection for testing and modularity
 */
class EventSourceFactory {

    /**
     * Create an event source based on the provided configuration
     *
     * This factory is typically called by UnifiedEventSource, not directly by application code.
     * The UnifiedEventSource provides a cleaner API: new UnifiedEventSource(name, sourceConf)
     *
     * EventSourceFactory.create() Method Parameters:
     * @param {string} name - Required. Unique name for this event source used across all implementations
     *                        Used for consumer group name
     * @param {Object} options - Required. Configuration object that determines which event source to create
     * @param {Object} options.mongo - Required. MongoDB/ChangeStream configuration
     * @param {Object} options.mongo.db - Required. MongoDB database connection object
     *                                   Required for both Kafka (fallback scenarios) and ChangeStream implementations
     * @param {string} [options.mongo.collection='drill_events'] - Optional. MongoDB collection name to watch for changes
     * @param {Array} [options.mongo.pipeline=[]] - Optional. MongoDB aggregation pipeline for filtering change stream events
     *                                             Example: [{ $match: { 'fullDocument.e': '[CLY]_session' } }]
     * @param {Object} [options.mongo.options={}] - Optional. Additional MongoDB change stream options
     *                                             Passed to MongoDB changeStream() method
     * @param {number} [options.mongo.interval=10000] - Optional. Health check interval for change stream (milliseconds)
     * @param {Function} [options.mongo.onClose] - Optional. Callback executed when change stream closes
     * @param {Object} [options.mongo.fallback] - Optional. Fallback configuration for change stream recovery
     * @param {Object} [options.kafka] - Optional. Kafka-specific configuration overrides (rarely used)
     *                                  Most Kafka options come from global countlyConfig.kafka
     * @param {Object} [dependencies={}] - Optional dependency injection for testing and modularity
     * @param {Object} [dependencies.countlyConfig] - Countly configuration object (defaults to require('../config'))
     *                                                Used to determine Kafka availability via kafka.enabled property
     *                                                Kafka topics and settings come from countlyConfig.kafka
     * @param {Function} [dependencies.log] - Logger instance (defaults to Log('eventSource:factory'))
     *
     * @returns {EventSourceInterface} KafkaEventSource or ChangeStreamEventSource based on configuration and availability
     *
     * @example
     * // Typically called via UnifiedEventSource (recommended):
     * const eventSource = new UnifiedEventSource('session-processor', {
     *   mongo: {
     *     db: mongoDatabase,
     *     pipeline: [{ $match: { 'fullDocument.e': '[CLY]_session' } }]
     *   }
     * });
     *
     * @example
     * // Direct factory usage with dependency injection:
     * const eventSource = EventSourceFactory.create('session-processor', {
     *   mongo: {
     *     db: mongoDatabase,
     *     pipeline: [{ $match: { 'fullDocument.e': '[CLY]_session' } }]
     *   }
     * }, {
     *   countlyConfig: customConfig,
     *   log: customLogger
     * });
     *
     * @throws {Error} If name is missing
     * @throws {Error} If options.mongo.db is missing
     */
    static create(name, options, dependencies = {}) {
        if (!name || typeof name !== 'string') {
            throw new Error('EventSourceFactory requires a name (string) parameter');
        }
        if (!options?.mongo?.db) {
            throw new Error('EventSourceFactory requires options.mongo.db (MongoDB database connection)');
        }

        const log = dependencies.log || Log('eventSource:factory');
        const config = dependencies.countlyConfig || require('../config');
        const db = dependencies.db || null; // Database reference for batch deduplication

        if (this.#shouldUseKafka(config, { name }, log)) {
            return this.#createKafkaSource(name, options, config, db, log);
        }
        else {
            return this.#createChangeStreamSource(name, options, config, log);
        }
    }

    /**
     * Determine if Kafka should be used
     * @param {Object} countlyConfig - Countly configuration
     * @param {Object} config - Event source configuration
     * @param {Logger} log - Logger instance
     * @returns {boolean} True if Kafka should be used, false otherwise
     * @private
     */
    static #shouldUseKafka(countlyConfig, config, log) {
        if (!countlyConfig.kafka?.enabled) {
            log.d(`[${config.name}] Kafka disabled in configuration`);
            return false;
        }
        try {
            require.resolve('../../plugins/kafka/api/lib/KafkaConsumer');
            require.resolve('../../plugins/kafka/api/lib/kafkaClient');
            log.d(`[${config.name}] Kafka modules available`);
        }
        catch (e) {
            log.d(`[${config.name}] Kafka modules not available: ${e.message}`);
            return false;
        }

        log.d(`[${config.name}] Kafka will be used (enabled and available)`);
        return true;
    }

    /**
     * Create a Kafka event source with consistent dependency injection
     * Now follows the same pattern as ChangeStream - passes config, lets source create its own dependencies
     * @param {string} name - Event source name for logging/identification
     * @param {Object} options - Configuration object with kafka section
     * @param {Object} countlyConfig - Countly configuration
     * @param {Object} db - Database reference for batch deduplication state
     * @param {Logger} log - Logger instance
     * @returns {KafkaEventSource} The Kafka event source instance
     * @throws {Error} If Kafka modules are not available
     * @throws {Error} If Kafka configuration is invalid
     * @private
     */
    static #createKafkaSource(name, options, countlyConfig, db, log) {
        log.i(`[${name}] Creating Kafka event source with consistent dependency injection`);
        const kafkaOptions = options.kafka || {};
        return new KafkaEventSource(name, kafkaOptions, {
            countlyConfig: countlyConfig,
            db: db // Pass database for batch deduplication state
        });
    }

    /**
     * Create a ChangeStream event source with consistent dependency injection
     * Now follows the same pattern as Kafka - passes config and lets source create its own dependencies
     * @param {string} name - Event source name for logging/identification
     * @param {Object} options - Configuration object with mongo section
     * @param {Object} countlyConfig - Countly configuration
     * @param {Logger} log - Logger instance
     * @returns {ChangeStreamEventSource} The ChangeStream event source instance
     * @private
     */
    static #createChangeStreamSource(name, options, countlyConfig, log) {
        log.i(`[${name}] Creating ChangeStream event source with consistent dependency injection`);
        const mongoOptions = options.mongo || {};
        return new ChangeStreamEventSource(name, mongoOptions, {
            countlyConfig: countlyConfig
        });
    }
}

module.exports = EventSourceFactory;