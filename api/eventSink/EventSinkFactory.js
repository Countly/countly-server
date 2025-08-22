const MongoEventSink = require('./MongoEventSink');
const KafkaEventSink = require('./KafkaEventSink');
const log = require('../utils/log.js')('eventSink:factory');

/**
 * Factory class for creating appropriate EventSink instances
 * Handles sink selection based on configuration and availability
 * 
 * This factory:
 * - Always ensures MongoDB sink is available as fallback
 * - Adds Kafka sink if enabled and available
 * - Validates configuration at creation time
 * - Provides singleton pattern for sink reuse
 */
class EventSinkFactory {
    static #instances = new Map();

    /**
     * Create appropriate event sink(s) based on configuration
     * 
     * @param {Object} config - Configuration object (typically from countlyConfig)
     * @param {Array<string>} [config.eventSink.sinks] - Array of sink types to enable
     * @param {boolean} [config.kafka.enabled] - Whether Kafka is enabled
     * @param {Object} [options={}] - Additional options for sink creation
     * @returns {Array<EventSinkInterface>} Array of initialized sink instances
     */
    static create(config, options = {}) {
        if (!config) {
            throw new Error('Configuration is required for EventSinkFactory');
        }
        const cacheKey = EventSinkFactory._generateCacheKey(config, options);
        if (EventSinkFactory.#instances.has(cacheKey)) {
            return EventSinkFactory.#instances.get(cacheKey);
        }
        const sinks = [];
        let configuredSinks = config.eventSink?.sinks || ['mongo'];

        if (!Array.isArray(configuredSinks) || configuredSinks.length === 0) {
            log.w('Invalid or empty eventSink.sinks configuration, using default [mongo]');
            configuredSinks = ['mongo'];
        }
        if (configuredSinks.includes('mongo')) {
            try {
                const mongoSink = new MongoEventSink(options.mongo || {});
                sinks.push(mongoSink);
                log.d('Created MongoEventSink');
            }
            catch (error) {
                log.e('Failed to create MongoEventSink:', error);
                throw new Error(`Failed to create MongoDB event sink: ${error.message}`);
            }
        }
        if (configuredSinks.includes('kafka')) {
            if (config.kafka?.enabled) {
                try {
                    EventSinkFactory._validateKafkaAvailability();
                    const kafkaSink = new KafkaEventSink(options.kafka || {});
                    sinks.push(kafkaSink);
                    log.d('Created KafkaEventSink');
                }
                catch (error) {
                    log.e('Failed to create KafkaEventSink:', error);
                    log.w('Kafka sink requested but not available, continuing with MongoDB only');
                }
            }
            else {
                log.i('Kafka sink requested but kafka.enabled is false, skipping');
            }
        }
        if (sinks.length === 0) {
            log.w('No sinks were created, falling back to MongoDB');
            const fallbackSink = new MongoEventSink(options.mongo || {});
            sinks.push(fallbackSink);
        }
        EventSinkFactory.#instances.set(cacheKey, sinks);
        log.i(`EventSinkFactory created ${sinks.length} sink(s): ${sinks.map(s => s.getType()).join(', ')}`);
        return sinks;
    }


    /**
     * Clear cached sink instances (useful for testing or config changes)
     */
    static clearCache() {
        EventSinkFactory.#instances.clear();
        log.d('EventSinkFactory cache cleared');
    }

    /**
     * Get statistics for all cached sink instances
     * @returns {Array<Object>} Array of sink statistics
     */
    static getAllStats() {
        const stats = [];
        for (const [cacheKey, sinks] of EventSinkFactory.#instances) {
            stats.push({
                cacheKey,
                sinks: sinks.map(sink => sink.getStats())
            });
        }
        return stats;
    }

    /**
     * Generate a cache key for sink instances
     * @param {Object} config - Configuration object
     * @param {Object} options - Options object
     * @returns {string} Cache key
     * @private
     */
    static _generateCacheKey(config, options) {
        const key = {
            sinks: config.eventSink?.sinks || ['mongo'],
            kafkaEnabled: config.kafka?.enabled || false,
            options: JSON.stringify(options)
        };
        return JSON.stringify(key);
    }

    /**
     * Validate that Kafka modules are available
     * @throws {Error} If Kafka modules cannot be loaded
     * @private
     */
    static _validateKafkaAvailability() {
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
     * Process results from parallel sink writes
     * @param {Array<EventSinkInterface>} sinks - Array of sinks
     * @param {Array<Object>} results - Results from Promise.allSettled
     * @returns {Object} Processed results
     * @private
     */
    static _processResults(sinks, results) {
        const processed = {
            overall: { success: true, written: 0 },
            sinks: {}
        };

        for (let i = 0; i < results.length; i++) {
            const sink = sinks[i];
            const result = results[i];
            const sinkType = sink.getType();

            if (result.status === 'fulfilled') {
                processed.sinks[sinkType] = result.value;
                processed.overall.written += result.value.written || 0;
            }
            else {
                processed.sinks[sinkType] = {
                    success: false,
                    written: 0,
                    error: result.reason?.message || 'Unknown error',
                    type: sinkType
                };

                // If MongoDB fails, overall operation fails
                // If only Kafka fails, we can continue (graceful degradation)
                if (sinkType === 'MongoEventSink') {
                    processed.overall.success = false;
                    processed.overall.error = result.reason?.message;
                }
            }
        }

        return processed;
    }
}

module.exports = EventSinkFactory;