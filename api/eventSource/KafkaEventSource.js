const EventSourceInterface = require('./EventSourceInterface');
const Log = require('../utils/log.js');

/**
 * Kafka implementation of EventSourceInterface
 * Supports async iteration with auto-acknowledgment and proper at-least-once delivery
 * 
 * This implementation uses a simpler blocking approach without internal queuing:
 * - KafkaConsumer handler blocks until the batch is acknowledged
 * - Natural backpressure via KafkaConsumer's built-in flow control
 * - Ensures offsets are only committed after successful processing
 * 
 * @note  This class returns ALL events from Kafka without filtering.
 * Event filtering is the responsibility of the consumer of this class (aggregator).
 * 
 * @DI Supports dependency injection for testing and modularity
 */
class KafkaEventSource extends EventSourceInterface {
    #log; // Logger instance

    #KafkaConsumer; // Class reference for dependency injection

    #kafkaConsumer; // Instance of KafkaConsumer

    #KafkaClient; // Class reference for dependency injection

    #kafkaClient; // Instance of KafkaClient

    #kafkaOptions; // Kafka-specific configuration

    #countlyConfig; // Countly configuration for Kafka settings

    #name; // Unique name which will also be groupId in Consumer

    #effectiveGroupId = null; // Actual Kafka consumer group ID (with prefix)

    #currentBatch = null; // Batch pointer

    #batchAvailable = null; // Promise resolver for when a new batch arrives

    #batchProcessed = null; // Promise resolver for when batch is acknowledged

    #pendingCommitOffset = null; // Override commit offset for dedup recovery

    #isRunning = false; // True if consumer is started

    #isClosed = false; // True if closed

    #batchDedupEnabled = false; // Whether batch deduplication is enabled

    #batchDedupDb = null; // Database reference for batch dedup state

    /**
     * Create a KafkaEventSource instance with consistent dependency injection
     * 
     * This class is typically created by EventSourceFactory, not directly by application code.
     * Use UnifiedEventSource for a cleaner API: new UnifiedEventSource(name, sourceConf)
     * 
     * Now follows consistent dependency injection pattern - receives config and classes,
     * creates its own consumer instance in initialize() method.
     * 
     * Constructor Parameters:
     * @param {string} name - Required. Unique consumer name used for logging and identification
     *                        Should be descriptive (e.g., 'session-aggregator', 'view-processor')
     *                        Used as Kafka consumer group ID (with prefix from countlyConfig)
     * @param {Object} kafkaOptions - Required. Kafka-specific configuration object
     * @param {Array} [kafkaOptions.topics] - Kafka topics to subscribe to (defaults from countlyConfig if not provided)
     * @param {Object} dependencies - Required. Dependency injection for configuration and testing
     * @param {Object} dependencies.countlyConfig - Required. Global Countly configuration for Kafka settings
     * @param {Function} [dependencies.KafkaClient] - KafkaClient class for creating client instances
     * @param {Function} [dependencies.KafkaConsumer] - KafkaConsumer class for creating consumer instances
     * @param {Logger} [dependencies.log] - Logger instance (defaults to internal logger if not provided)
     */
    constructor(name, kafkaOptions, dependencies) {
        super();
        if (!name || typeof name !== 'string') {
            throw new Error('KafkaEventSource requires a name (string) parameter');
        }
        if (!kafkaOptions || typeof kafkaOptions !== 'object') {
            throw new Error('KafkaEventSource requires kafkaOptions (object) parameter');
        }
        if (!dependencies || typeof dependencies !== 'object') {
            throw new Error('KafkaEventSource requires dependencies (object) parameter');
        }
        if (!dependencies.countlyConfig || typeof dependencies.countlyConfig !== 'object') {
            throw new Error('KafkaEventSource requires dependencies.countlyConfig (object) parameter');
        }

        this.#log = dependencies.log || Log('eventSource:kafka');
        this.#name = name;
        this.#kafkaOptions = kafkaOptions;
        this.#countlyConfig = dependencies.countlyConfig;

        this.#KafkaClient = dependencies.KafkaClient || require('../../plugins/kafka/api/lib/kafkaClient');
        this.#KafkaConsumer = dependencies.KafkaConsumer || require('../../plugins/kafka/api/lib/KafkaConsumer');

        // Batch deduplication configuration - enabled by default for Kafka consumers
        this.#batchDedupEnabled = dependencies.countlyConfig?.kafka?.batchDeduplication ?? true;
        this.#batchDedupDb = dependencies.db || null;

        this.#log.d(`KafkaEventSource created: ${name} (will create consumer on initialize, batchDedup=${this.#batchDedupEnabled})`);
    }

    /**
     * Check for overlap with already-processed offsets
     * @param {Object} token - Batch token with topic, partition, and offset info
     * @returns {Promise<string|null>} commitOffset to recover Kafka cursor, or null if no overlap
     * @private
     */
    async #checkOverlap(token) {
        if (!this.#batchDedupEnabled || !this.#batchDedupDb || !token?.firstOffset) {
            return null;
        }
        const stateKey = `${this.#effectiveGroupId}:${token.topic}`;
        try {
            const state = await this.#batchDedupDb.collection('kafka_consumer_state').findOne(
                { _id: stateKey },
                { projection: { [`partitions.${token.partition}.offset`]: 1 } }
            );
            const savedOffset = state?.partitions?.[token.partition]?.offset;
            if (savedOffset && BigInt(savedOffset) >= BigInt(token.firstOffset)) {
                const commitOffset = (BigInt(savedOffset) + 1n).toString();
                this.#log.w(`[${this.#name}] Overlap detected: saved=${savedOffset} >= first=${token.firstOffset}, recovering to ${commitOffset}`);
                this.#recordDuplicateSkipped(stateKey, token);
                return commitOffset;
            }
        }
        catch (e) {
            this.#log.e(`[${this.#name}] Error checking dedup state: ${e.message}`);
        }
        return null;
    }

    /**
     * Mark a batch as processed after successful acknowledgment
     * Stores one document per consumer group with nested partition offsets
     * @param {Object} token - Batch token with topic, partition, and offset info
     * @returns {Promise<void>} resolves when marked
     * @private
     */
    async #markAsProcessed(token) {
        if (!this.#batchDedupEnabled || !this.#batchDedupDb || !token?.lastOffset) {
            return;
        }
        // Single document per consumer group (not per partition)
        const stateKey = `${this.#effectiveGroupId}:${token.topic}`;
        const hasBatchData = token.batchSize && token.batchSize > 0;
        const now = new Date();
        try {
            // Build update - partition offset in nested object, aggregated stats at top level
            const update = {
                $set: {
                    [`partitions.${token.partition}.offset`]: token.lastOffset,
                    [`partitions.${token.partition}.lastProcessedAt`]: now,
                    lastProcessedAt: now,
                    topic: token.topic,
                    consumerGroup: this.#effectiveGroupId,
                    updatedAt: now
                }
            };

            // Only track batch stats if batch actually had data
            if (hasBatchData) {
                update.$set.lastBatchSize = token.batchSize;
                update.$inc = { batchCount: 1 };
                update.$push = {
                    recentBatchSizes: {
                        $each: [token.batchSize],
                        $slice: -10 // Keep last 10 batch sizes
                    }
                };
            }

            await this.#batchDedupDb.collection('kafka_consumer_state').updateOne(
                { _id: stateKey },
                update,
                { upsert: true }
            );

            // Update avgBatchSize only if we pushed new batch sizes
            if (hasBatchData) {
                await this.#batchDedupDb.collection('kafka_consumer_state').updateOne(
                    { _id: stateKey },
                    [{ $set: { avgBatchSize: { $avg: "$recentBatchSizes" } } }]
                );
            }
            this.#log.d(`[${this.#name}] Marked batch as processed: ${token.key} (batchSize=${token.batchSize})`);
        }
        catch (e) {
            this.#log.e(`[${this.#name}] Error updating batch dedup state: ${e.message}`);
            // Non-fatal - batch will be reprocessed on restart (at-least-once semantics preserved)
        }
    }

    /**
     * Record duplicate skip statistics for monitoring
     * @param {string} stateKey - Document key (consumerGroup:topic)
     * @param {Object} token - Batch token with offset info
     * @returns {Promise<void>} resolves when recorded
     * @private
     */
    async #recordDuplicateSkipped(stateKey, token) {
        if (!this.#batchDedupDb) {
            return;
        }
        try {
            await this.#batchDedupDb.collection('kafka_consumer_state').updateOne(
                { _id: stateKey },
                {
                    $inc: { duplicatesSkipped: 1 },
                    $set: {
                        lastDuplicateAt: new Date(),
                        [`partitions.${token.partition}.lastDuplicateOffset`]: token.lastOffset
                    }
                }
            );
        }
        catch (e) {
            this.#log.e(`[${this.#name}] Error recording duplicate skip: ${e.message}`);
            // Non-fatal - stats are optional
        }
    }

    /**
     * Initialize the Kafka consumer with blocking handler for proper acknowledgment flow
     * Creates its own KafkaClient and KafkaConsumer instances for consistent dependency injection
     * @returns {Promise<void>} resolves when consumer is started
     */
    async initialize() {
        if (this.#isRunning) {
            return;
        }

        // Create Kafka dependencies - consistent with ChangeStreamEventSource pattern
        this.#log.d(`[${this.#name}] Creating Kafka client and consumer`);
        this.#kafkaClient = new this.#KafkaClient();
        if (this.#kafkaOptions?.partitionsConsumedConcurrently && this.#kafkaOptions.partitionsConsumedConcurrently > 1) {
            this.#log.w(`[${this.#name}] Forcing partitionsConsumedConcurrently=1 to match blocking ack model`);
        }
        // Important: enforce single-partition processing to match the blocking
        // acknowledge() flow of this wrapper. With >1 concurrent partitions,
        // multiple Kafka handlers would race on shared state (#currentBatch/#batchProcessed)
        // and could deadlock. If higher concurrency is desired, this class must
        // be refactored to maintain an internal queue + per-batch resolvers.
        this.#kafkaConsumer = new this.#KafkaConsumer(this.#kafkaClient, this.#name, {
            topics: this.#kafkaOptions.topics || [this.#countlyConfig.kafka?.drillEventsTopic || 'countly-drill-events'],
            ...this.#kafkaOptions,
            partitionsConsumedConcurrently: 1,
            db: this.#batchDedupDb // Pass db for health stats tracking
        });

        // Capture the actual groupId for dedup state key (includes prefix from config)
        this.#effectiveGroupId = this.#kafkaConsumer.groupId;

        // Start the consumer with blocking handler
        await this.#kafkaConsumer.start(async({ topic, partition, records }) => {
            if (this.#isClosed) {
                return;
            }
            this.#log.d(`[${this.#name}] Received batch: ${records.length} records from ${topic}[${partition}]`);
            if (records.length === 0) {
                // No events in this batch (shouldn't happen with normal Kafka operation), hence warning log
                this.#log.w(`[${this.#name}] No events in batch, skipping, Please investigate.`);
                return;
            }
            // Create meaningful batch token with Kafka metadata
            const firstOffset = records[0]?.message?.offset;
            const lastOffset = records[records.length - 1]?.message?.offset;
            // Transform records in-place for memory efficiency
            for (let i = 0; i < records.length; i++) {
                records[i] = records[i].event;
            }
            const events = records;
            const batchToken = {
                topic,
                partition,
                firstOffset,
                lastOffset,
                batchSize: records.length,
                key: `kafka:${topic}:${partition}:${firstOffset}-${lastOffset}`
            };
            this.#log.d(`[${this.#name}] Processing batch: ${batchToken.key} (${events.length} events)`);
            this.#currentBatch = {
                source: 'KAFKA',
                token: batchToken,
                events: events
            };
            this.#pendingCommitOffset = null;

            const processed = new Promise((resolve) => {
                this.#batchProcessed = resolve;
            });

            if (this.#batchAvailable) {
                const resolver = this.#batchAvailable;
                this.#batchAvailable = null;
                resolver();
            }

            await processed;

            // Return override offset for dedup recovery if set
            if (this.#pendingCommitOffset) {
                const commitOffset = this.#pendingCommitOffset;
                this.#pendingCommitOffset = null;
                return { commitOffset };
            }
        });

        this.#isRunning = true;
        this.#log.d(`[${this.#name}] Kafka event source initialized with self-created consumer (consistent dependency injection)`);
    }

    /**
     * Get the next batch of events
     * Includes batch deduplication check - skips already-processed batches automatically
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

        /**
         * Helper to check if batch was already processed and return it or skip
         * @param {Object|null} batch - Batch object from Kafka handler
         * @returns {Promise<Object|null>} Batch if not processed, null if skipped
         */
        const checkAndReturnBatch = async(batch) => {
            if (!batch) {
                return null;
            }
            const commitOffset = await this.#checkOverlap(batch.token);
            if (commitOffset) {
                // Overlap detected - set commit offset and release handler
                this.#pendingCommitOffset = commitOffset;
                if (this.#batchProcessed) {
                    this.#batchProcessed();
                    this.#batchProcessed = null;
                }
                return this.getNext();
            }
            return batch;
        };

        // If batch already available from a previous Kafka callback, return it immediately
        if (this.#currentBatch) {
            const batch = this.#currentBatch;
            this.#currentBatch = null;
            this.#log.d(`[${this.#name}] Returning available batch: ${batch.token.key}`);
            return checkAndReturnBatch(batch);
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
            this.#log.d(`[${this.#name}] Returning newly arrived batch: ${batch.token.key}`);
            return checkAndReturnBatch(batch);
        }
        // Closed while waiting
        return null;
    }

    /**
     * Acknowledge successful processing of a batch
     * This unblocks the Kafka handler, allowing offset commit
     *
     * Note: Dedup state is NOT written here - use markBatchProcessed() or processWithAutoAck()
     * for deduplication protection. This separation avoids duplicate writes when using
     * processWithAutoAck() which calls markBatchProcessed() immediately after handler completes.
     *
     * @param {Object} token - Token from getNext()
     * @returns {Promise<void>} resolves when acknowledged
     * @protected
     */
    async acknowledge(token) {
        if (!token) {
            this.#log.w(`[${this.#name}] acknowledge() called with null/undefined token`);
            return;
        }
        this.#log.d(`[${this.#name}] Acknowledging batch: ${token.key} (${token.batchSize} events)`);

        // Unblock the Kafka handler so it can return and allow offset commit
        if (this.#batchProcessed) {
            const resolver = this.#batchProcessed;
            this.#batchProcessed = null;
            resolver();
            this.#log.d(`[${this.#name}] Batch acknowledged, unblocking Kafka handler for ${token.key}`);
        }
        else {
            this.#log.w(`[${this.#name}] No pending batch to acknowledge for token ${token.key}`);
        }
    }

    /**
     * Mark a batch as processed (for deduplication)
     * Writes dedup state to MongoDB immediately (does NOT unblock Kafka handler)
     * Should be called by consumer AFTER data flush, BEFORE requesting next batch
     * @param {Object} token - Batch token from getNext()
     * @returns {Promise<void>} resolves when state is written
     */
    async markBatchProcessed(token) {
        await this.#markAsProcessed(token);
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
        this.#log.d(`[${this.#name}] Kafka event source stopped`);
    }

}

module.exports = KafkaEventSource;
