const EventSourceInterface = require('./EventSourceInterface');
const log = require('../utils/log.js')('kafka-event-source');

/**
 * Kafka implementation of EventSourceInterface
 * Supports async iteration with auto-acknowledgment
 * Compatible with updated KafkaConsumer that uses KafkaClient for connection management
 */
class KafkaEventSource extends EventSourceInterface {
    #kafkaConsumer;

    #config;

    #currentBatch = null;

    #waitingForBatch = null;

    #batchReady = false;

    #isRunning = false;

    #eventFilter;

    #awaitingAckResolve = null;

    #awaitingAck = null; // Promise

    #isClosed = false;

    /**
     * @param {KafkaConsumer} kafkaConsumer - KafkaConsumer instance (from updated plugin)
     * @param {Object} config - Configuration
     * @param {string} [config.eventFilter] - Optional event type filter
     * @param {string} config.name - Consumer name for logging
     * @param {string[]} [config.topics] - Topics to consume from (overrides consumer default)
     * @param {string} [config.topic] - Single topic to consume from
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
        this.#eventFilter = config.eventFilter;

        log.d(`KafkaEventSource created: ${this.#config.name}${this.#eventFilter ? ` (filter: ${this.#eventFilter})` : ''}`);
    }

    /**
     * Wait for acknowledgment promise
     * @returns {Promise<void>} resolves when batch is acknowledged
     * @private
     */
    #waitForAck() {
        if (!this.#awaitingAck) {
            this.#awaitingAck = new Promise((resolve) => {
                this.#awaitingAckResolve = () => {
                    this.#awaitingAck = null;
                    this.#awaitingAckResolve = null;
                    resolve();
                };
            });
        }
        return this.#awaitingAck;
    }

    /**
     * Initialize the Kafka consumer using its existing start() method
     * @returns {Promise<void>} resolves when consumer is started
     */
    async initialize() {
        if (this.#isRunning) {
            return;
        }

        // Start the consumer - the handler will be called with native Kafka batches
        await this.#kafkaConsumer.start(async({ topic, partition, records }) => {
            log.d(`[${this.#config.name}] Received batch: ${records.length} records from ${topic}[${partition}]`);

            // Filter and transform records into our format
            const events = [];
            let lastOffset = null;
            let firstOffset = null;

            for (const { event, message, headers } of records) {
                // Apply event filter if specified
                if (!this.#eventFilter || event?.e === this.#eventFilter) {
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
            }

            log.d(`[${this.#config.name}] Filtered to ${events.length} events (from ${records.length} total)`);

            if (events.length === 0) {
                // No matching events in this batch, continue
                log.d(`[${this.#config.name}] No events matched filter, skipping batch`);
                return;
            }

            // Create batch token with metadata for acknowledgment
            const batchToken = {
                topic,
                partition,
                firstOffset,
                lastOffset,
                originalBatchSize: records.length,
                filteredBatchSize: events.length,
                timestamp: Date.now(),
                key: `kafka:${topic}:${partition}:${firstOffset}-${lastOffset}`,
            };

            // Store the new batch
            this.#currentBatch = {
                token: batchToken,
                events: events
            };
            this.#batchReady = true;

            log.d(`[${this.#config.name}] Batch ready: ${batchToken.key} (${events.length} events)`);

            // If someone is waiting for a batch, notify them
            if (this.#waitingForBatch) {
                const resolver = this.#waitingForBatch;
                this.#waitingForBatch = null;
                resolver();
            }

            // Wait for this batch to be acknowledged before returning
            // This ensures KafkaConsumer only commits after we've processed everything
            await this.#waitForAck();
        });

        this.#isRunning = true;
        log.d(`[${this.#config.name}] Kafka event source initialized for batch processing`);
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

        // Return current batch if available
        if (this.#batchReady && this.#currentBatch) {
            const batch = this.#currentBatch;
            this.#currentBatch = null;
            return batch;
        }

        // Wait for the next batch to arrive
        await new Promise((resolve) => {
            // Race condition protection: check one more time
            if (this.#batchReady && this.#currentBatch) {
                resolve();
                return;
            }
            this.#waitingForBatch = resolve;
        });

        // Return batch if it arrived while we were waiting
        if (this.#batchReady && this.#currentBatch) {
            const batch = this.#currentBatch;
            this.#currentBatch = null;
            return batch;
        }

        return null;
    }

    /**
     * Acknowledge successful processing of a batch
     * @param {Object} token - Token from getNext()
     * @returns {Promise<void>} resolves when acknowledged
     * @protected
     */
    async acknowledge(token) {
        if (!token) {
            log.w(`[${this.#config.name}] acknowledge() called with null/undefined token`);
            return;
        }

        log.d(`[${this.#config.name}] Batch acknowledged: ${token.key} (${token.filteredBatchSize} events filtered from ${token.originalBatchSize})`);

        // Mark batch as processed so Kafka can commit
        this.#batchReady = false;

        // Resolve the acknowledgment waiter to allow Kafka consumer to proceed
        if (this.#awaitingAckResolve) {
            this.#awaitingAckResolve();
        }

        log.d(`[${this.#config.name}] Batch complete, allowing KafkaConsumer to commit offsets for ${token.topic}[${token.partition}]`);
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

        // Clean up any waiting promises
        if (this.#waitingForBatch) {
            const resolver = this.#waitingForBatch;
            this.#waitingForBatch = null;
            resolver();
        }

        // Clean up acknowledgment waiter
        if (this.#awaitingAckResolve) {
            this.#awaitingAckResolve();
        }

        await this.#kafkaConsumer.stop();
        this.#isRunning = false;
        this.#currentBatch = null;
        this.#batchReady = false;
        log.d(`[${this.#config.name}] Kafka event source stopped`);
    }

}

module.exports = KafkaEventSource;