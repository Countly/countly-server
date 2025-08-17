const KafkaEventSource = require('./KafkaEventSource');
const ChangeStreamEventSource = require('./ChangeStreamEventSource');
const log = require('../utils/log.js')('event-source-factory');

/**
 * Factory for creating event sources based on configuration
 * Determines whether to use Kafka or ChangeStream based on availability and configuration
 */
class EventSourceFactory {
    /**
     * Create an event source based on the provided configuration
     * @param {Object} config - Configuration object
     * @param {string} config.name - Unique name for this event source
     * @param {string} [config.eventFilter] - Event type to filter (required for Kafka)
     * @param {Object} config.db - MongoDB database connection
     * @param {Object} [config.countlyConfig] - Countly configuration
     * @param {Object} [config.kafkaConfig] - Kafka-specific configuration
     * @param {Array} [config.pipeline] - MongoDB changestream pipeline
     * @param {Object} [config.fallback] - Fallback configuration for changestream
     * @param {string} [config.collection='drill_events'] - MongoDB collection to watch
     * @param {Object} [config.options] - Additional changestream options
     * @param {Function} [config.onClose] - Callback for when source closes
     * @param {number} [config.interval=10000] - Check interval for changestream health
     * @returns {EventSourceInterface} The appropriate event source implementation
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
     * @throws {Error} If Kafka is enabled but no eventFilter is provided
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

        // Check if required event filter is provided
        if (!config.eventFilter) {
            throw new Error(`[${config.name}] Kafka is enabled but no eventFilter provided. EventFilter is required for Kafka consumers.`);
        }

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
            eventFilter: config.eventFilter,
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