const EventSinkFactory = require('./EventSinkFactory');
const log = require('../utils/log.js')('eventSink:unified');

/**
 * UnifiedEventSink - High-level wrapper around EventSinkFactory
 * 
 * This class provides a simplified interface for writing events to multiple sinks
 * with automatic configuration loading and sink management.
 * 
 * Key features:
 * - Self-contained configuration (imports config directly)
 * - Automatic sink selection based on configuration
 * - Parallel writes to all configured sinks
 * - Graceful error handling and degradation
 * - Resource cleanup on shutdown
 * - Lazy initialization for performance
 *
 * @example
 * const eventSink = new UnifiedEventSink();
 * await eventSink.write(bulkWriteOperations);
 * await eventSink.close();
 */
class UnifiedEventSink {
    #config = null;

    #sinks = [];

    #initialized = false;

    #closed = false;

    /**
     * Create a UnifiedEventSink instance
     * Configuration is loaded automatically from the global config
     * 
     * @param {Object} [overrideConfig] - Optional configuration override for testing
     */
    constructor(overrideConfig = null) {
        // Import config directly to make this module independent
        this.#config = overrideConfig || require('../config');
        log.d('UnifiedEventSink created');
    }

    /**
     * Initialize all configured sinks
     * This is called automatically on first write operation
     * 
     * @returns {Promise<void>} resolves when all sinks are initialized
     * @private
     */
    async #initialize() {
        if (this.#initialized) {
            return;
        }
        if (this.#closed) {
            throw new Error('UnifiedEventSink has been closed and cannot be reused');
        }
        try {
            // Create sinks using factory
            this.#sinks = EventSinkFactory.create(this.#config);
            // Initialize all sinks in parallel
            await Promise.all(this.#sinks.map(sink => sink.initialize()));
            this.#initialized = true;
            log.i(`UnifiedEventSink initialized with ${this.#sinks.length} sink(s): ${
                this.#sinks.map(s => s.getType()).join(', ')
            }`);
        }
        catch (error) {
            log.e('Failed to initialize UnifiedEventSink:', error);
            throw error;
        }
    }

    /**
     * Write events to all configured sinks in parallel
     * 
     * @param {Array<Object>} events - Array of events (bulkWrite operations or event objects)
     * @returns {Promise<Object>} Result object with per-sink status and overall summary
     * 
     * @example
     * const result = await eventSink.write(events);
     * // result = {
     * //   overall: { success: true, written: 100 },
     * //   sinks: {
     * //     MongoEventSink: { success: true, written: 100 },
     * //     KafkaEventSink: { success: true, written: 100 }
     * //   }
     * // }
     */
    async write(events) {
        if (this.#closed) {
            throw new Error('UnifiedEventSink has been closed');
        }
        // Lazy initialization on first write
        if (!this.#initialized) {
            await this.#initialize();
        }
        if (!events || !Array.isArray(events) || events.length === 0) {
            return {
                overall: { success: true, written: 0, message: 'No events to write' },
                sinks: {}
            };
        }
        const startTime = Date.now();
        try {
            log.d(`Writing ${events.length} events to ${this.#sinks.length} sink(s)`);
            const results = await Promise.allSettled(
                this.#sinks.map(sink => sink.write(events))
            );
            const processedResults = this.#processResults(results);
            const duration = Date.now() - startTime;
            processedResults.overall.duration = duration;
            if (processedResults.overall.success) {
                log.d(`Successfully wrote events in ${duration}ms - Total: ${processedResults.overall.written}`);
            }
            else {
                log.e(`Failed to write events - ${processedResults.overall.error}`);
            }
            return processedResults;
        }
        catch (error) {
            const duration = Date.now() - startTime;
            log.e('Unexpected error in UnifiedEventSink.write:', error);
            return {
                overall: {
                    success: false,
                    written: 0,
                    error: error.message,
                    duration
                },
                sinks: {}
            };
        }
    }

    /**
     * Close all sinks and clean up resources
     * @returns {Promise<void>} resolves when all sinks are closed
     */
    async close() {
        if (this.#closed) {
            return;
        }
        log.d('Closing UnifiedEventSink');
        try {
            // Close all sinks in parallel, ignoring individual failures
            await Promise.all(
                this.#sinks.map(sink =>
                    sink.close().catch(error => {
                        log.w(`Error closing ${sink.getType()}:`, error);
                    })
                )
            );
        }
        catch (error) {
            log.w('Error during UnifiedEventSink cleanup:', error);
        }
        finally {
            this.#closed = true;
            this.#initialized = false;
            this.#sinks = [];
            log.d('UnifiedEventSink closed');
        }
    }

    /**
     * Get statistics from all sinks
     * @returns {Array<Object>} Array of sink statistics
     */
    getStats() {
        if (!this.#initialized) {
            return [];
        }
        return this.#sinks.map(sink => sink.getStats());
    }

    /**
     * Get the configured sink types
     * @returns {Array<string>} Array of sink type names
     */
    getSinkTypes() {
        if (!this.#initialized) {
            return this.#config.eventSink?.sinks || ['mongo'];
        }
        return this.#sinks.map(sink => sink.getType());
    }

    /**
     * Check if the sink is initialized and ready
     * @returns {boolean} True if initialized
     */
    isInitialized() {
        return this.#initialized;
    }

    /**
     * Check if the sink is closed
     * @returns {boolean} True if closed
     */
    isClosed() {
        return this.#closed;
    }

    /**
     * Process results from parallel sink writes
     * @param {Array<Object>} results - Results from Promise.allSettled
     * @returns {Object} Processed results with overall status and per-sink details
     * @private
     */
    #processResults(results) {
        const processed = {
            overall: { success: true, written: 0 },
            sinks: {}
        };
        let hasMongoSuccess = false;
        for (let i = 0; i < results.length; i++) {
            const sink = this.#sinks[i];
            const result = results[i];
            const sinkType = sink.getType();
            if (result.status === 'fulfilled') {
                // Success case
                processed.sinks[sinkType] = result.value;
                processed.overall.written += result.value.written || 0;

                if (sinkType === 'MongoEventSink') {
                    hasMongoSuccess = true;
                }
            }
            else {
                // Failure case
                processed.sinks[sinkType] = {
                    success: false,
                    written: 0,
                    error: result.reason?.message || 'Unknown error',
                    type: sinkType,
                    timestamp: new Date()
                };
                log.w(`${sinkType} write failed:`, result.reason);
            }
        }
        // Overall success depends on MongoDB success (primary sink)
        // Kafka failures are treated as warnings, not overall failures
        if (!hasMongoSuccess && processed.sinks.MongoEventSink) {
            processed.overall.success = false;
            processed.overall.error = processed.sinks.MongoEventSink.error;
        }
        // If no MongoDB sink was configured or it succeeded, check if we have any success
        if (hasMongoSuccess || !processed.sinks.MongoEventSink) {
            const anySuccess = Object.values(processed.sinks).some(sink => sink.success);
            if (!anySuccess) {
                processed.overall.success = false;
                processed.overall.error = 'All sinks failed';
            }
        }
        return processed;
    }
}

module.exports = UnifiedEventSink;