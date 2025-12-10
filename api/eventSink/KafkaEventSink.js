const EventSinkInterface = require('./EventSinkInterface');
const { transformToKafkaEventFormat } = require('../utils/eventTransformer');
const Log = require('../utils/log.js');

/**
 * Kafka implementation of EventSinkInterface
 * Lightweight wrapper around existing KafkaProducer for writing events to Kafka to conform to EventSinkInterface
 * 
 * @DI Supports dependency injection for testing and modularity
 */
class KafkaEventSink extends EventSinkInterface {
    #log; // logger instance

    #kafkaClient; // Kafka client instance

    #kafkaProducer; // Kafka producer instance

    #transformer; // event transformer function

    #isConnected = false; // true if producer is connected

    /**
     * Create a KafkaEventSink instance
     * Uses existing Kafka infrastructure with minimal overhead
     * 
     * @param {Object} [options={}] - Configuration options for the sink
     * @param {Function} [options.transformer] - Event transformer function (defaults to transformToKafkaEventFormat)
     * @param {string} [options.transactionalIdPrefix='countly-event-sink'] - Prefix for transactional ID
     * @param {Object} [dependencies={}] - Optional dependency injection for testing and modularity
     * @param {Object} [dependencies.kafkaClient] - Pre-initialized Kafka client
     * @param {Object} [dependencies.kafkaProducer] - Pre-initialized Kafka producer
     * @param {Logger} [dependencies.log] - Logger instance (defaults to Log('eventSink:kafka'))
     */
    constructor(options = {}, dependencies = {}) {
        super();
        this.#log = dependencies.log || Log('eventSink:kafka');
        this.#kafkaClient = dependencies.kafkaClient; // Created lazily in initialize() if not supplied
        this.#kafkaProducer = dependencies.kafkaProducer; // Created lazily in initialize() if not supplied
        this.#transformer = options.transformer || transformToKafkaEventFormat;
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

            if (!this.#kafkaClient) {
                const KafkaClient = require('../../plugins/kafka/api/lib/kafkaClient');
                this.#kafkaClient = this.#kafkaClient || new KafkaClient();
            }

            if (!this.#kafkaProducer) {
                const KafkaProducer = require('../../plugins/kafka/api/lib/kafkaProducer');
                const common = require('../utils/common.js');
                this.#kafkaProducer = this.#kafkaProducer || new KafkaProducer(this.#kafkaClient, {
                    db: common.db // Pass database reference for health stats recording
                });
            }

            this.#isConnected = true;
            this._setInitialized();
            this.#log.d('KafkaEventSink initialized with transactional producer');
        }
        catch (error) {
            this.#log.e('Failed to initialize KafkaEventSink:', error);
            throw error;
        }
    }

    /**
     * Write events to Kafka by transforming bulkWrite operations to event format
     * @param {Array<Object>} bulkEvents - Array of bulkWrite operations from MongoDB format
     * @returns {Promise<Object>} Result object with success status and metadata
     */
    async write(bulkEvents) {
        if (!this.isInitialized()) {
            await this.initialize();
        }

        if (!this._validateEvents(bulkEvents)) {
            return this._createResult(true, 0, 'No events to write');
        }

        const startTime = Date.now();
        let transformedEvents = 0;

        try {
            // Transform bulkWrite operations to Kafka event format
            const events = [];

            for (const op of bulkEvents) {
                if (op.insertOne && op.insertOne.document) {
                    const transformed = this.#transformer(op.insertOne.document);
                    if (transformed) {
                        events.push(transformed);
                        transformedEvents++;
                    }
                }
            }

            if (events.length === 0) {
                return this._createResult(true, 0, 'No valid events to transform', {
                    duration: Date.now() - startTime,
                    originalCount: bulkEvents.length
                });
            }

            // Send events using existing KafkaProducer.sendEvents method
            // This handles all batching, compression, transactions, and retries internally
            const result = await this.#kafkaProducer.sendEvents(events);

            const duration = Date.now() - startTime;

            if (result.success) {
                this.#log.d(`Successfully sent ${result.sent} events to Kafka in ${duration}ms`);

                return this._createResult(true, result.sent, 'Events sent to Kafka successfully', {
                    duration,
                    originalCount: bulkEvents.length,
                    transformedCount: transformedEvents
                });
            }
            else {
                throw new Error(`Kafka send failed: ${result.message || 'Unknown error'}`);
            }
        }
        catch (error) {
            const duration = Date.now() - startTime;
            this.#log.e(`Failed to write ${transformedEvents} events to Kafka in ${duration}ms:`);
            this.#log.e('Error writing events to Kafka:', error);
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
            this.#log.d('KafkaEventSink closed');
        }
        catch (error) {
            this.#log.e('Error closing KafkaEventSink:', error);
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