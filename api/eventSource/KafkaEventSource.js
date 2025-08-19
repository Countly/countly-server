const EventSourceInterface = require('./EventSourceInterface');
const log = require('../utils/log.js')('kafka-event-source');

/**
 * Kafka implementation of EventSourceInterface
 * Supports async iteration with auto-acknowledgment and proper at-least-once delivery
 * 
 * This implementation uses a simpler blocking approach without internal queuing:
 * - KafkaConsumer handler blocks until the batch is acknowledged
 * - Natural backpressure via KafkaConsumer's built-in flow control
 * - Ensures offsets are only committed after successful processing
 * 
 * Note: This class returns ALL events from Kafka without filtering.
 * Event filtering is the responsibility of the consumer of this class (aggregator).
 */
class KafkaEventSource extends EventSourceInterface {
    #kafkaConsumer;

    #config;

    #currentBatch = null;

    #batchAvailable = null; // Promise resolver for when a new batch arrives

    #batchProcessed = null; // Promise resolver for when batch is acknowledged

    #isRunning = false;

    #isClosed = false;

    /**
     * Create a KafkaEventSource instance
     * 
     * This class is typically created by EventSourceFactory, not directly by application code.
     * Use UnifiedEventSource for a cleaner API: new UnifiedEventSource(name, sourceConf)
     * 
     * Constructor Parameters:
     * @param {KafkaConsumer} kafkaConsumer - Required. KafkaConsumer instance from plugins/kafka/api/lib/KafkaConsumer.js
     *                                        Must be properly initialized with KafkaClient connection and consumer group configuration
     *                                        Kafka topics and settings come from global countlyConfig
     * @param {Object} config - Required. Configuration object for this event source
     * @param {string} config.name - Required. Unique consumer name used for logging and identification
     *                               Should be descriptive (e.g., 'session-aggregator', 'view-processor')
     *                               Used as Kafka consumer group ID (with prefix from countlyConfig)
     */
    constructor(kafkaConsumer, config) {
        super();
        if (!kafkaConsumer) {
            throw new Error('KafkaConsumer instance is required for KafkaEventSource');
        }
        if (!config || !config.name) {
            throw new Error('Configuration with name property is required for KafkaEventSource');
        }
        this.#kafkaConsumer = kafkaConsumer;
        this.#config = config;
        log.d(`KafkaEventSource created: ${this.#config.name}`);
    }

    /**
     * Initialize the Kafka consumer with blocking handler for proper acknowledgment flow
     * @returns {Promise<void>} resolves when consumer is started
     */
    async initialize() {
        if (this.#isRunning) {
            return;
        }

        await this.#kafkaConsumer.start(async({ topic, partition, records }) => {
            // Early exit if shutting down
            if (this.#isClosed) {
                return;
            }

            log.d(`[${this.#config.name}] Received batch: ${records.length} records from ${topic}[${partition}]`);

            // Transform records into our format
            const events = [];
            let lastOffset = null;
            let firstOffset = null;

            for (const { event, message, headers } of records) {
                // Include all events - filtering is responsibility of the consumer
                events.push({
                    ...event,
                    // Include Kafka metadata in the event for traceability
                    _kafka: {
                        topic,
                        partition,
                        offset: message.offset,
                        key: message.key,
                        headers
                    }
                });
                lastOffset = message.offset;
                if (firstOffset === null) {
                    firstOffset = message.offset;
                }
            }

            if (events.length === 0) {
                // No events in this batch (shouldn't happen with normal Kafka operation)
                log.d(`[${this.#config.name}] No events in batch, skipping`);
                return;
            }

            // Create batch token for acknowledgment
            const batchToken = {
                key: `kafka:${topic}:${partition}:${firstOffset}-${lastOffset}`,
                batchSize: records.length
            };

            log.d(`[${this.#config.name}] Processing batch: ${batchToken.key} (${events.length} events)`);

            // Store the batch for getNext() to retrieve
            this.#currentBatch = {
                source: 'KAFKA',
                token: batchToken,
                events: events
            };

            // Create promise for acknowledgment
            const processed = new Promise((resolve) => {
                this.#batchProcessed = resolve;
            });

            // Notify getNext() that a batch is available
            if (this.#batchAvailable) {
                const resolver = this.#batchAvailable;
                this.#batchAvailable = null;
                resolver();
            }

            // CRITICAL: Block here until acknowledge() is called
            // This ensures KafkaConsumer only commits offsets after processing
            await processed;

            log.d(`[${this.#config.name}] Batch processing acknowledged, allowing offset commit for ${batchToken.key}`);
        });

        this.#isRunning = true;
        log.d(`[${this.#config.name}] Kafka event source initialized with blocking acknowledgment flow`);
    }

    /**
     * Get the next batch of events
     * @returns {Promise<{token: Object, events: Array<Object>}|null>} Next batch with token, or null if no more events
     * @protected
     */
    async getNext() {
        if (this.#isClosed) {
            return null;
        }

        if (!this.#isRunning) {
            await this.initialize();
        }

        // If batch already available from a previous Kafka callback, return it immediately
        if (this.#currentBatch) {
            const batch = this.#currentBatch;
            this.#currentBatch = null;
            log.d(`[${this.#config.name}] Returning available batch: ${batch.token.key}`);
            return batch;
        }

        // Wait for next batch from Kafka
        await new Promise((resolve) => {
            // Race condition check: batch might have arrived while creating promise
            if (this.#currentBatch) {
                resolve();
                return;
            }
            this.#batchAvailable = resolve;
        });

        // Return the batch that arrived
        if (this.#currentBatch) {
            const batch = this.#currentBatch;
            this.#currentBatch = null;
            log.d(`[${this.#config.name}] Returning newly arrived batch: ${batch.token.key}`);
            return batch;
        }

        // Closed while waiting
        return null;
    }

    /**
     * Acknowledge successful processing of a batch
     * This unblocks the Kafka handler, allowing offset commit
     * @param {Object} token - Token from getNext()
     * @returns {Promise<void>} resolves when acknowledged
     * @protected
     */
    async acknowledge(token) {
        if (!token) {
            log.w(`[${this.#config.name}] acknowledge() called with null/undefined token`);
            return;
        }

        log.d(`[${this.#config.name}] Acknowledging batch: ${token.key} (${token.batchSize} events)`);

        // Unblock the Kafka handler so it can return and allow offset commit
        if (this.#batchProcessed) {
            const resolver = this.#batchProcessed;
            this.#batchProcessed = null;
            resolver();
            log.d(`[${this.#config.name}] Batch acknowledged, unblocking Kafka handler for ${token.key}`);
        }
        else {
            log.w(`[${this.#config.name}] No pending batch to acknowledge for token ${token.key}`);
        }
    }

    /**
     * Stop the Kafka consumer
     * @returns {Promise<void>} resolves when stopped
     */
    async stop() {
        if (this.#isClosed) {
            return;
        }

        this.#isClosed = true;

        if (!this.#isRunning) {
            return;
        }

        // Clean up any waiting promises to prevent hangs
        if (this.#batchAvailable) {
            const resolver = this.#batchAvailable;
            this.#batchAvailable = null;
            resolver();
        }

        if (this.#batchProcessed) {
            const resolver = this.#batchProcessed;
            this.#batchProcessed = null;
            resolver();
        }

        // Stop the Kafka consumer
        await this.#kafkaConsumer.stop();

        // Clean up state
        this.#isRunning = false;
        this.#currentBatch = null;

        log.d(`[${this.#config.name}] Kafka event source stopped`);
    }

}

module.exports = KafkaEventSource;