const EventSinkInterface = require('./EventSinkInterface');
const { transformToKafkaEventFormat } = require('../utils/eventTransformer');
const log = require('../utils/log.js')('kafka-event-sink');

/**
 * Kafka implementation of EventSinkInterface
 * Lightweight wrapper around existing KafkaProducer for writing events to Kafka
 * 
 * This implementation:
 * - Reuses all KafkaProducer features (batching, compression, transactions)
 * - Transforms MongoDB bulkWrite operations to Kafka events
 * - Uses existing transformToClickhouseFormat function
 * - Leverages producer's built-in retry logic and error handling
 * - Transactions are enabled by default for exactly-once semantics
 */
class KafkaEventSink extends EventSinkInterface {
    #kafkaClient;

    #kafkaProducer;

    #isConnected = false;

    /**
     * Create a KafkaEventSink instance
     * Uses existing Kafka infrastructure with minimal overhead
     * 
     * @param {Object} [options={}] - Configuration options
     * @param {string} [options.transactionalIdPrefix='countly-event-sink'] - Prefix for transactional ID
     */
    constructor(options = {}) {
        super();
        this.transactionalIdPrefix = options.transactionalIdPrefix || 'countly-event-sink';
    }

    /**
     * Initialize the Kafka producer using existing infrastructure
     * @returns {Promise<void>} resolves when the sink is ready
     */
    async initialize() {
        if (this.isInitialized()) {
            return;
        }

        try {
            const KafkaClient = require('../../plugins/kafka/api/lib/kafkaClient');
            const KafkaProducer = require('../../plugins/kafka/api/lib/kafkaProducer');

            this.#kafkaClient = new KafkaClient();
            this.#kafkaProducer = new KafkaProducer(this.#kafkaClient, {
                transactionalIdPrefix: this.transactionalIdPrefix
            });

            // KafkaProducer initializes connection internally when first used
            this.#isConnected = true;

            this._setInitialized();
            log.d('KafkaEventSink initialized with transactional producer');
        }
        catch (error) {
            log.e('Failed to initialize KafkaEventSink:', error);
            throw error;
        }
    }

    /**
     * Write events to Kafka by transforming bulkWrite operations to event format
     * @param {Array<Object>} bulkOps - Array of bulkWrite operations from MongoDB format
     * @returns {Promise<Object>} Result object with success status and metadata
     */
    async write(bulkOps) {
        if (!this.isInitialized()) {
            await this.initialize();
        }

        if (!this._validateEvents(bulkOps)) {
            return this._createResult(true, 0, 'No events to write');
        }

        const startTime = Date.now();
        let transformedEvents = 0;

        try {
            // Transform bulkWrite operations to Kafka event format
            const events = [];

            for (const op of bulkOps) {
                if (op.insertOne && op.insertOne.document) {
                    const transformed = transformToKafkaEventFormat(op.insertOne.document);
                    if (transformed) {
                        events.push(transformed);
                        transformedEvents++;
                    }
                }
            }

            if (events.length === 0) {
                this._updateStats(0, true);
                return this._createResult(true, 0, 'No valid events to transform', {
                    duration: Date.now() - startTime,
                    originalCount: bulkOps.length
                });
            }

            // Send events using existing KafkaProducer.sendEvents method
            // This handles all batching, compression, transactions, and retries internally
            const result = await this.#kafkaProducer.sendEvents(events);

            const duration = Date.now() - startTime;

            if (result.success) {
                this._updateStats(result.sent, true);
                log.d(`Successfully sent ${result.sent} events to Kafka in ${duration}ms`);

                return this._createResult(true, result.sent, 'Events sent to Kafka successfully', {
                    duration,
                    originalCount: bulkOps.length,
                    transformedCount: transformedEvents
                });
            }
            else {
                // KafkaProducer returned failure
                this._updateStats(0, false, new Error('Kafka producer returned failure'));
                throw new Error(`Kafka send failed: ${result.message || 'Unknown error'}`);
            }
        }
        catch (error) {
            const duration = Date.now() - startTime;
            this._updateStats(0, false, error);
            log.e(`Failed to write ${transformedEvents} events to Kafka in ${duration}ms:`);
            log.e('Error writing events to Kafka:', error);
            throw error;
        }
    }

    /**
     * Close the Kafka producer and client connections
     * @returns {Promise<void>} resolves when closed
     */
    async close() {
        if (this.isClosed()) {
            return;
        }

        try {
            if (this.#kafkaProducer && this.#isConnected) {
                await this.#kafkaProducer.disconnect();
                this.#isConnected = false;
            }
            this._setClosed();
            log.d('KafkaEventSink closed');
        }
        catch (error) {
            log.e('Error closing KafkaEventSink:', error);
            this._setClosed(); // Mark as closed even if disconnect failed
        }
    }


    /**
     * Check if Kafka sink is available and connected
     * @returns {boolean} True if connected and ready
     */
    isConnected() {
        return this.#isConnected;
    }
}

module.exports = KafkaEventSink;