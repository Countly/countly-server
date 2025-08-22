const KafkaEventSource = require('./KafkaEventSource');
const ChangeStreamEventSource = require('./ChangeStreamEventSource');
const log = require('../utils/log.js')('eventSource:factory');

/**
 * Factory for creating event sources based on configuration
 * Determines whether to use Kafka or ChangeStream based on availability and configuration
 */
class EventSourceFactory {
    /**
     * Create an event source based on the provided configuration
     * 
     * This factory is typically called by UnifiedEventSource, not directly by application code.
     * The UnifiedEventSource provides a cleaner API: new UnifiedEventSource(name, sourceConf)
     * 
     * EventSourceFactory.create() Constructor-like Method Parameters:
     * @param {Object} config - Required. Configuration object that determines which event source to create
     * @param {string} config.name - Required. Unique name for this event source used across all implementations
     *                               Used for consumer group naming (Kafka), logging, and identification
     * @param {Object} config.db - Required. MongoDB database connection object
     *                             Required for both Kafka (fallback scenarios) and ChangeStream implementations
     * 
     * // Global Configuration
     * @param {Object} [config.countlyConfig] - Optional. Countly configuration override
     *                                          Defaults to require('../config') if not provided
     *                                          Used to determine Kafka availability via kafka.enabled property
     *                                          Kafka topics and settings come from countlyConfig.kafka
     * 
     * // Kafka-Specific Parameters (only used if Kafka is enabled and available)
     * @param {Object} [config.kafkaConfig] - Optional. Kafka-specific configuration overrides (rarely used)
     *                                        Most Kafka config comes from global countlyConfig.kafka
     * 
     * // ChangeStream-Specific Parameters (used when Kafka is disabled or unavailable)
     * @param {string} [config.collection='drill_events'] - Optional. MongoDB collection name to watch for changes
     * @param {Array} [config.pipeline=[]] - Optional. MongoDB aggregation pipeline for filtering change stream events
     *                                       Example: [{ $match: { 'fullDocument.e': '[CLY]_session' } }]
     * @param {Object} [config.options={}] - Optional. Additional MongoDB change stream options
     *                                       Passed to MongoDB changeStream() method
     * @param {number} [config.interval=10000] - Optional. Health check interval for change stream (milliseconds)
     * @param {Function} [config.onClose] - Optional. Callback executed when change stream closes
     * @param {Object} [config.fallback] - Optional. Fallback configuration for change stream recovery
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
     * // Direct factory usage (not recommended for application code):
     * const eventSource = EventSourceFactory.create({
     *   name: 'session-processor',
     *   countlyConfig,
     *   db: mongoDatabase,
     *   pipeline: [{ $match: { 'fullDocument.e': '[CLY]_session' } }]
     * });
     * 
     * @throws {Error} If config.name is missing
     * @throws {Error} If config.db is missing
     */
    static create(config) {
        if (!config.name) {
            throw new Error('EventSourceFactory requires a name in config');
        }

        if (!config.db) {
            throw new Error('EventSourceFactory requires a database connection');
        }

        const countlyConfig = config.countlyConfig || require('../config');

        // Check if Kafka should be used
        if (this.#shouldUseKafka(countlyConfig, config)) {
            return this.#createKafkaSource(config, countlyConfig);
        }
        else {
            return this.#createChangeStreamSource(config);
        }
    }

    /**
     * Determine if Kafka should be used
     * @param {Object} countlyConfig - Countly configuration
     * @param {Object} config - Event source configuration
     * @returns {boolean} True if Kafka should be used, false otherwise
     * @private
     */
    static #shouldUseKafka(countlyConfig, config) {
        // Check if Kafka is enabled in configuration
        if (!countlyConfig.kafka?.enabled) {
            log.d(`[${config.name}] Kafka disabled in configuration`);
            return false;
        }

        // Check if Kafka modules are available
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
     * Create a Kafka event source
     * @param {Object} config - Configuration object
     * @param {Object} countlyConfig - Countly configuration
     * @returns {KafkaEventSource} The Kafka event source instance
     * @throws {Error} If Kafka modules are not available or eventFilter is missing
     * @throws {Error} If Kafka configuration is invalid
     * @private
     */
    static #createKafkaSource(config, countlyConfig) {
        log.i(`[${config.name}] Creating Kafka event source`);

        const KafkaConsumer = require('../../plugins/kafka/api/lib/KafkaConsumer');
        const kafkaClient = require('../../plugins/kafka/api/lib/kafkaClient');

        const client = new kafkaClient();
        const kafkaConfig = config.kafkaConfig || {};

        const consumer = new KafkaConsumer(client, config.name, {
            topics: kafkaConfig.topics || [countlyConfig.kafka?.drillEventsTopic || 'countly-drill-events'],
            ...kafkaConfig
        });

        return new KafkaEventSource(consumer, {
            name: config.name
        });
    }

    /**
     * Create a ChangeStream event source
     * @param {Object} config - Configuration object
     * @returns {ChangeStreamEventSource} The ChangeStream event source instance
     * @private
     */
    static #createChangeStreamSource(config) {
        log.i(`[${config.name}] Creating ChangeStream event source`);

        return new ChangeStreamEventSource(config.db, {
            name: config.name,
            pipeline: config.pipeline || [],
            fallback: config.fallback,
            collection: config.collection || 'drill_events',
            options: config.options || {},
            interval: config.interval || 10000,
            onClose: config.onClose
        });
    }
}

module.exports = EventSourceFactory;