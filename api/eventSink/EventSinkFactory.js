const MongoEventSink = require('./MongoEventSink');
const KafkaEventSink = require('./KafkaEventSink');
const Log = require('../utils/log.js');

/**
 * Factory class for creating appropriate EventSink instances
 * @DI Supports dependency injection for testing and modularity
 */
class EventSinkFactory {

    /**
     * Create appropriate event sink(s) based on configuration
     * 
     * @param {Object} config - Configuration object (typically from countlyConfig)
     * @param {Array<string>} [config.eventSink.sinks] - Array of sink types to enable
     * @param {boolean} [config.kafka.enabled] - Whether Kafka is enabled
     * @param {Object} [options={}] - Additional options for sink creation
     * @param {Object} [dependencies={}] - Optional dependency injection for testing and modularity
     * @param {Logger} [dependencies.log] - Logger instance (defaults to Log('eventSink:factory'))
     * @returns {Array<EventSinkInterface>} Array of sink instances
     */
    static create(config, options = {}, dependencies = {}) {
        const log = dependencies.log || Log('eventSink:factory');
        if (!config) {
            throw new Error('Configuration is required for EventSinkFactory');
        }
        const sinks = [];
        let configuredSinks = config.eventSink?.sinks || ['mongo'];

        if (!Array.isArray(configuredSinks) || configuredSinks.length === 0) {
            EventSinkFactory.#fatalSinkCreation('Invalid or empty eventSink.sinks configuration');
        }
        if (configuredSinks.includes('mongo')) {
            try {
                const mongoSink = new MongoEventSink(options.mongo || {}, {});
                sinks.push(mongoSink);
                log.d('Created MongoEventSink');
            }
            catch (error) {
                EventSinkFactory.#fatalSinkCreation('Failed to create MongoEventSink', error);
            }
        }
        if (configuredSinks.includes('kafka')) {
            if (!config.kafka?.enabled) {
                EventSinkFactory.#fatalSinkCreation('Kafka sink configured but kafka.enabled is false');
            }
            try {
                EventSinkFactory.#validateKafkaAvailability();
                const kafkaSink = new KafkaEventSink(options.kafka || {}, {});
                sinks.push(kafkaSink);
                log.d('Created KafkaEventSink');
            }
            catch (error) {
                log.e('Kafka sink creation failed:', error);
                EventSinkFactory.#fatalSinkCreation('Failed to create KafkaEventSink', error);
            }
        }
        if (sinks.length === 0) {
            log.e('No valid sinks were created from configuration:', configuredSinks);
            EventSinkFactory.#fatalSinkCreation('No sinks were created from configuration');
        }
        log.i(`EventSinkFactory created ${sinks.length} sink(s): ${sinks.map(s => s.getType()).join(', ')}`);
        return sinks;
    }

    /**
     * Validate that Kafka modules are available
     * @throws {Error} If Kafka modules cannot be loaded
     * @private
     */
    static #validateKafkaAvailability() {
        try {
            // Try to require Kafka modules to ensure they're available
            require('../../plugins/kafka/api/lib/kafkaClient');
            require('../../plugins/kafka/api/lib/kafkaProducer');
        }
        catch (error) {
            throw new Error(`Kafka modules not available: ${error.message}`);
        }
    }

    /**
     * Handle fatal errors during sink creation.
     * Logs the error, terminates the process, and throws to satisfy control flow.
     * @param {string} msg - Error message to log
     * @param {Error} [error] - Optional underlying error
     * @private
     */
    static #fatalSinkCreation(msg, error) {
        // Keep throw for testability and static analysis; not reached at runtime after exit()
        throw new Error(error?.message ? `${msg}: ${error.message}` : msg);
    }

}

module.exports = EventSinkFactory;