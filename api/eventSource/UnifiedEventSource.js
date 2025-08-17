const EventSourceFactory = require('./EventSourceFactory');
const log = require('../utils/log.js')('unified-event-source');

/**
 * UnifiedEventSource - Async iterator wrapper around EventSourceFactory
 * 
 * This class provides a unified interface for consuming events from different sources
 * (Kafka or ChangeStream) using modern async iteration patterns.
 *
 * @example
 * const eventSource = new UnifiedEventSource({
 *   name: 'event-aggregator',
 *   eventFilter: '[CLY]_custom',
 *   pipeline: [...],
 *   db: common.drillDb
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
     * Create a UnifiedEventSource instance
     * @param {Object} config - Configuration object (see EventSourceFactory.create for details)
     */
    constructor(config) {
        if (!config || !config.name) {
            throw new Error('Configuration with name property is required for UnifiedEventSource');
        }

        this.#config = config;
        // Create the appropriate source using the factory
        this.#source = EventSourceFactory.create(config);

        log.d(`UnifiedEventSource created: ${this.#config.name} (${this.#source.constructor.name})`);
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
        if (!this.#source) {
            throw new Error('Event source not initialized');
        }

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