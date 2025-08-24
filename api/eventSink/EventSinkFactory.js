const MongoEventSink = require('./MongoEventSink');
const KafkaEventSink = require('./KafkaEventSink');
const log = require('../utils/log.js')('eventSink:factory');

/**
 * Factory class for creating appropriate EventSink instances
 * Handles sink selection based on configuration and availability
 * 
 */
class EventSinkFactory {

    /**
     * Create appropriate event sink(s) based on configuration
     * 
     * @param {Object} config - Configuration object (typically from countlyConfig)
     * @param {Array<string>} [config.eventSink.sinks] - Array of sink types to enable
     * @param {boolean} [config.kafka.enabled] - Whether Kafka is enabled
     * @param {Object} [options={}] - Additional options for sink creation
     * @returns {Array<EventSinkInterface>} Array of sink instances
     */
    static create(config, options = {}) {
        if (!config) {
            throw new Error('Configuration is required for EventSinkFactory');
        }
        const sinks = [];
        let configuredSinks = config.eventSink?.sinks;

        if (!Array.isArray(configuredSinks) || configuredSinks.length === 0) {
            EventSinkFactory.#fatalSinkCreation('Invalid or empty eventSink.sinks configuration');
        }
        if (configuredSinks.includes('mongo')) {
            try {
                const mongoSink = new MongoEventSink(options.mongo || {});
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
                const kafkaSink = new KafkaEventSink(options.kafka || {});
                sinks.push(kafkaSink);
                log.d('Created KafkaEventSink');
            }
            catch (error) {
                EventSinkFactory.#fatalSinkCreation('Failed to create KafkaEventSink', error);
            }
        }
        if (sinks.length === 0) {
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
        if (error) {
            log.e(msg, error);
        }
        else {
            log.e(msg);
        }
        // Keep throw for testability and static analysis; not reached at runtime after exit()
        throw new Error(error?.message ? `${msg}: ${error.message}` : msg);
    }

}

module.exports = EventSinkFactory;