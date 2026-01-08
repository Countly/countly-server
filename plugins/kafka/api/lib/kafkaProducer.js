const crypto = require('crypto');
const os = require('os');
const { CompressionTypes, CompressionCodecs } = require('kafkajs');
const lz4 = require('lz4-napi');
const log = require('../../../../api/utils/log.js')('kafka:producer');
const countlyConfig = require('../../../../api/config');

// Register LZ4 compression codec using lz4-napi
// lz4-napi uses native NAPI bindings with libuv threadpool for async operations,
// providing better performance and multi-threaded compression/decompression
CompressionCodecs[CompressionTypes.LZ4] = () => ({
    // Async compress using libuv threadpool for parallelism
    async compress(encoder) {
        return lz4.compressFrame(encoder.buffer);
    },
    // Async decompress using libuv threadpool for parallelism
    async decompress(buffer) {
        return lz4.decompressFrame(buffer);
    }
});
log.i('LZ4 codec registered with lz4-napi: native NAPI bindings with libuv threadpool for async operations');

/**
 * @typedef {Object} KafkaProducerOptions
 * @property {string} [transactionalIdPrefix] - Prefix for transactional ID generation
 * @property {string} [topicName] - Default topic name for event publishing
 */

/**
 * @typedef {Object} KafkaProducerConfig
 * @property {string} topicName - Target topic for events
 * @property {boolean} enableTransactions - Whether to use Kafka transactions
 * @property {number} transactionTimeout - Transaction timeout in milliseconds
 * @property {number} acks - Acknowledgment level (-1=all, 0=none, 1=leader)
 * @property {number} retries - Maximum retry attempts
 * @property {number} initialRetryTime - Initial retry delay in milliseconds
 * @property {number} maxRetryTime - Maximum retry delay in milliseconds
 */

/**
 * @typedef {Object} SendResult
 * @property {boolean} success - Whether the send operation succeeded
 * @property {number} sent - Number of messages sent successfully
 */

/**
 * KafkaProducer - High-performance event producer with transaction support
 * 
 * Features:
 * - Transactional producers for exactly-once semantics
 * - Automatic partition key generation for even distribution
 * - Configurable retry behavior with exponential backoff
 * - Event metadata headers for observability
 * - Idempotent producers to prevent duplicates
 * 
 * @example
 * const producer = new KafkaProducer(kafkaClient, { 
 *   topicName: 'user-events',
 *   transactionalIdPrefix: 'my-app'
 * });
 * 
 * const events = [
 *   { a: 'app1', uid: 'user123', e: 'button_click', data: {...} },
 *   { a: 'app1', uid: 'user456', e: 'page_view', data: {...} }
 * ];
 * 
 * const result = await producer.sendEvents(events);
 * console.log(`Sent ${result.sent} events`);
 */
class KafkaProducer {
    /** @type {import('./kafkaClient')} */
    #kafkaClient;

    /** @type {import('kafkajs').Producer|null} */
    #producer = null;

    /** @type {Promise|null} */
    #initializationPromise = null;

    /** @type {KafkaProducerConfig} */
    #config;

    /** @type {string} */
    #transactionalId;

    /** @type {string} Producer instance identifier for logging */
    #producerId = null;

    /**
     * Create a new KafkaProducer instance
     *
     * Generates a unique transactional ID based on environment, hostname, PID,
     * and container information to ensure uniqueness across deployments.
     *
     * @param {kafkaClient} kafkaClient - KafkaClient instance for connection management
     * @param {KafkaProducerOptions} [options={}] - Producer configuration options
     *
     * @throws {Error} If kafkaClient is not provided
     *
     * @example
     * const producer = new KafkaProducer(kafkaClient, {
     *   topicName: 'analytics-events',
     *   transactionalIdPrefix: 'countly-ingestor'
     * });
     */
    constructor(kafkaClient, options = {}) {
        if (!kafkaClient) {
            throw new Error('KafkaClient is required for KafkaProducer');
        }
        this.#kafkaClient = kafkaClient;

        const kafkaCfg = countlyConfig.kafka || {};
        this.#config = this.#loadConfiguration(kafkaCfg, options);

        const prefix = kafkaCfg.transactionalId || options.transactionalIdPrefix || 'countly-producer';
        this.#transactionalId = this.#generateTransactionalId(prefix);
        this.#producerId = this.#generateProducerId();

        log.i(`KafkaProducer created with transactional ID: ${this.#transactionalId}, producerId: ${this.#producerId}`);
    }

    /**
     * Load and validate producer configuration from Kafka config and options
     * 
     * Applies bounds to timeout and retry values to prevent KafkaJS warnings
     * and ensure reasonable operational limits.
     * 
     * @private
     * @param {Object} kafkaConfig - Kafka configuration from countlyConfig
     * @param {KafkaProducerOptions} options - Producer-specific options
     * @returns {KafkaProducerConfig} Validated configuration object
     */
    #loadConfiguration(kafkaConfig, options) {
        const rdkafkaConfig = kafkaConfig.rdkafka || {};

        return {
            topicName: options.topicName || kafkaConfig.drillEventsTopic || 'countly-drill-events',

            // Transactions - ensure timeout is reasonable
            enableTransactions: kafkaConfig.enableTransactions ?? false,
            transactionTimeout: Math.max(5000, Math.min(300000, kafkaConfig.transactionTimeout ?? 60000)),

            // KafkaJS producer-level knobs - ensure values are bounded
            acks: rdkafkaConfig.acks ?? -1,
            retries: Math.max(0, Math.min(50, rdkafkaConfig.retries ?? 8)),
            initialRetryTime: Math.max(100, Math.min(10000, rdkafkaConfig.initialRetryTime ?? 100)),
            maxRetryTime: Math.max(1000, Math.min(300000, rdkafkaConfig.maxRetryTime ?? 30000)),
        };
    }

    /**
     * Generate a unique transactional ID for this producer instance
     * 
     * Creates a globally unique ID incorporating:
     * - Environment (dev/prod/test)
     * - Hostname and PID for process uniqueness
     * - Container ID for Kubernetes/Docker environments
     * - Timestamp and random bytes for uniqueness
     * 
     * @private
     * @param {string} prefix - Prefix to identify the service/application
     * @returns {string} Unique transactional ID
     * 
     * @example
     * // Returns: "countly-producer-prod-hostname-1234-container-abc123-1nk2m3-a1b2c3d4e5f6..."
     */
    #generateTransactionalId(prefix) {
        const randomString = crypto.randomBytes(16).toString('hex');
        const env = process.env.NODE_ENV || 'dev';
        const hostname = os.hostname();
        const pid = process.pid;
        const timestamp = Date.now().toString(36);

        const containerId = process.env.HOSTNAME || process.env.POD_NAME || process.env.CONTAINER_ID || '';
        const containerSuffix = containerId ? `-${containerId.slice(-8)}` : '';

        return `${prefix}-${env}-${hostname}-${pid}${containerSuffix}-${timestamp}-${randomString}`;
    }

    /**
     * Generate a producer ID for health tracking
     *
     * Uses hostname as the stable identifier so that restarts and autoscaling
     * update the same document rather than creating duplicates.
     * In K8s, each pod has a unique hostname (pod name), so this naturally
     * handles autoscaling - one document per pod.
     *
     * @private
     * @returns {string} Producer ID (hostname)
     */
    #generateProducerId() {
        return os.hostname();
    }

    /**
     * Ensure the producer is connected, initializing if necessary
     * 
     * Uses a promise to ensure only one initialization happens even with
     * concurrent calls. Subsequent calls return the same promise.
     * 
     * @private
     * @returns {Promise<void>} Promise that resolves when producer is connected
     */
    async #ensureConnected() {
        if (this.#initializationPromise) {
            return this.#initializationPromise;
        }
        this.#initializationPromise = this.#doInitialization();
        return this.#initializationPromise;
    }

    /**
     * Initialize the KafkaJS producer with transactional support
     * 
     * Configures the producer based on enableTransactions setting:
     * - Transactional: idempotent=true, transactionalId set, maxInFlightRequests=1
     * - Non-transactional: standard producer configuration
     * 
     * @private
     * @returns {Promise<void>} Promise that resolves when producer is connected
     */
    async #doInitialization() {
        const kafka = this.#kafkaClient.createKafkaInstance();

        // For transactional producer, KafkaJS requires idempotent + transactionalId (+ maxInFlightRequests=1)
        const producerOpts = {
            allowAutoTopicCreation: false,
            idempotent: true,
            retry: {
                retries: this.#config.retries,
                initialRetryTime: this.#config.initialRetryTime,
                maxRetryTime: this.#config.maxRetryTime,
            },
            ...(this.#config.enableTransactions
                ? {
                    transactionalId: this.#transactionalId,
                    maxInFlightRequests: 1,
                    transactionTimeout: this.#config.transactionTimeout
                }
                : {})
        };

        this.#producer = kafka.producer(producerOpts);
        await this.#producer.connect();

        // Attach health monitoring event listeners
        this.#attachHealthListeners();

        log.i(`Kafka producer connected (transactional: ${this.#config.enableTransactions})`);
    }

    /**
     * Send events to the configured Kafka topic with optional transactional semantics
     * 
     * Features:
     * - Automatic partition key generation based on app ID and user ID
     * - Metadata headers for observability (app-id, event-type, user-id, etc.)
     * - Transactional support for exactly-once delivery guarantees
     * - LZ4 compression for efficient network usage
     * - Automatic retry with exponential backoff
     * 
     * @param {Object[]} events - Array of events to send
     * @param {string} events[].a - App ID for partitioning
     * @param {string} events[].uid - User ID for partitioning  
     * @param {string} events[].e - Event name
     * @param {Object} [events[].data] - Event payload data
     * @param {string} [topicName] - Override default topic name
     * 
     * @returns {Promise<SendResult>} Result indicating success and count of sent events
     * 
     * @throws {Error} If producer fails to send events or transaction fails
     * 
     * @example
     * const events = [
     *   { a: 'mobile-app', uid: 'user123', e: 'screen_view', data: { screen: 'home' }},
     *   { a: 'mobile-app', uid: 'user456', e: 'button_click', data: { button: 'submit' }}
     * ];
     * 
     * const result = await producer.sendEvents(events, 'user-analytics');
     * if (result.success) {
     *   console.log(`Successfully sent ${result.sent} events`);
     * }
     */
    async sendEvents(events, topicName) {
        if (!events || events.length === 0) {
            return { success: true, sent: 0 };
        }

        await this.#ensureConnected();

        const topic = topicName || this.#config.topicName;
        const messages = events.map((e) => this.#eventToMessage(e));
        const startTime = Date.now();

        try {
            if (this.#config.enableTransactions) {
                const tx = await this.#producer.transaction();
                try {
                    await tx.send({ topic, messages, acks: this.#config.acks, compression: CompressionTypes.LZ4 });
                    await tx.commit();
                }
                catch (transactionErr) {
                    let abortErr = null;
                    try {
                        await tx.abort();
                    }
                    catch (err) {
                        abortErr = err;
                        log.e('Transaction abort failed:', err);
                    }
                    if (abortErr) {
                        const compoundError = new Error(`Transaction failed: ${transactionErr.message}. Abort also failed: ${abortErr.message}`);
                        compoundError.originalError = transactionErr;
                        compoundError.abortError = abortErr;
                        throw compoundError;
                    }
                    throw transactionErr;
                }
            }
            else {
                await this.#producer.send({ topic, messages, acks: this.#config.acks, compression: CompressionTypes.LZ4 });
            }

            const duration = Date.now() - startTime;
            log.d(`Sent ${messages.length} events to topic: ${topic} in ${duration}ms`);
            return { success: true, sent: messages.length };
        }
        catch (err) {
            log.e(`Failed to send events to topic ${topic}:`, err);
            throw err;
        }
    }

    /**
     * Convert a Countly event to a Kafka message with headers and partition key
     * 
     * Generates:
     * - Partition key: `${appId}-${userId}:${eventType}` for even distribution
     * - Message headers: content-type, app-id, event-type, user-id, event-id, ingestion-time
     * - JSON serialized message body
     * 
     * @private
     * @param {Object} event - Countly event object
     * @param {string} event.a - App ID
     * @param {string} event.uid - User ID  
     * @param {string} event.e - Event type
     * @param {string} [event._id] - Event ID
     * @returns {Object} KafkaJS message object with key, value, and headers
     */
    #eventToMessage(event) {
        return {
            key: this.#generatePartitionKey(event),
            value: JSON.stringify(event),
            headers: {
                'content-type': 'application/json',
                'app-id': String(event.a || 'unknown'),
                'event-type': String(event.e || 'unknown'),
                'user-id': String(event.uid || 'unknown'),
                'event-id': String(event._id || 'unknown'),
                'ingestion-time': new Date().toISOString(),
            },
        };
    }

    /**
     * Generate a partition key for even distribution across Kafka partitions
     * 
     * Uses app ID and user ID as primary factors to ensure:
     * - Events from the same user go to the same partition (ordering)
     * - Events are distributed across partitions for parallelism
     * - Event type provides additional entropy
     * 
     * @private
     * @param {Object} event - Event object
     * @param {string} event.a - App ID
     * @param {string} event.uid - User ID
     * @param {string} event.e - Event type
     * @returns {string} Partition key in format: `${appId}-${userId}:${eventType}`
     */
    #generatePartitionKey(event) {
        const a = event.a || 'unknown';
        const uid = event.uid || 'unknown';
        const e = event.e || 'unknown';
        return `${a}-${uid}:${e}`;
    }

    /**
     * Disconnect the producer and clean up resources
     * 
     * Safely disconnects the KafkaJS producer and resets internal state.
     * Can be called multiple times without error.
     * 
     * @returns {Promise<void>} Promise that resolves when disconnected
     * 
     * @example
     * await producer.disconnect();
     * console.log('Producer disconnected');
     */
    async disconnect() {
        try {
            if (this.#producer) {
                await this.#producer.disconnect();
                this.#producer = null;
            }
            this.#initializationPromise = null;
            log.i('Kafka producer disconnected');
        }
        catch (e) {
            log.e('Error on producer disconnect:', e);
        }
    }

    /**
     * Attach health monitoring event listeners to the producer
     *
     * Listens for: DISCONNECT, REQUEST_TIMEOUT, REQUEST_QUEUE_SIZE
     *
     * @private
     */
    #attachHealthListeners() {
        if (!this.#producer || !this.#producer.events) {
            log.w('Producer events not available, skipping health listeners');
            return;
        }

        const pe = this.#producer.events;

        this.#producer.on(pe.DISCONNECT, () => {
            log.w(`[producer=${this.#producerId}] DISCONNECT`);
        });

        this.#producer.on(pe.REQUEST_TIMEOUT, (e) => {
            const payload = e.payload || {};
            log.w(`[producer=${this.#producerId}] REQUEST_TIMEOUT broker=${payload.broker} clientId=${payload.clientId}`);
        });

        this.#producer.on(pe.REQUEST_QUEUE_SIZE, (e) => {
            const payload = e.payload || {};
            if (payload.queueSize > 100) { // Only log when queue is getting large
                log.d(`[producer=${this.#producerId}] REQUEST_QUEUE_SIZE queueSize=${payload.queueSize}`);
            }
        });
    }
}

module.exports = KafkaProducer;