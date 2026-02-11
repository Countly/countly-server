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

    #clusterId = null; // Kafka cluster ID from admin API for state versioning

    #offsetBackwardThreshold = 10000n; // Default threshold for detecting topic recreation (configurable)

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

        // Offset backward threshold for detecting topic recreation (default 10000)
        // A backward jump larger than this threshold suggests the topic was recreated
        const configuredThreshold = dependencies.countlyConfig?.kafka?.offsetBackwardThreshold;
        if (configuredThreshold && configuredThreshold > 0) {
            this.#offsetBackwardThreshold = BigInt(configuredThreshold);
        }

        this.#log.d(`KafkaEventSource created: ${name} (will create consumer on initialize, batchDedup=${this.#batchDedupEnabled}, offsetBackwardThreshold=${this.#offsetBackwardThreshold})`);
    }

    /**
     * Check for overlap with already-processed offsets
     * Also detects cluster mismatch and offset backward scenarios
     * @param {Object} token - Batch token with topic, partition, and offset info
     * @returns {Promise<string|null>} commitOffset to recover Kafka cursor, or null if no overlap
     * @private
     */
    async #checkOverlap(token) {
        if (!this.#batchDedupEnabled || !this.#batchDedupDb || !token?.firstOffset) {
            return null;
        }
        const stateKey = this.#buildStateKey(token.topic);
        // Also check for legacy state key (without cluster ID) for migration
        const legacyStateKey = `${this.#effectiveGroupId}:${token.topic}`;

        try {
            // First check if there's a legacy state document that needs migration
            const legacyState = await this.#batchDedupDb.collection('kafka_consumer_state').findOne(
                { _id: legacyStateKey, clusterId: { $exists: false } },
                { projection: { partitions: 1 } }
            );

            if (legacyState) {
                this.#log.i(`[${this.#name}] Found legacy state document, migrating to cluster-versioned key`);
                await this.#recordConsumerEvent('STATE_MIGRATED', token, {
                    message: 'Migrated legacy state to cluster-versioned format',
                    oldStateKey: legacyStateKey,
                    newStateKey: stateKey,
                    partitionCount: Object.keys(legacyState.partitions || {}).length
                });
                // Mark legacy document as migrated (don't delete yet for safety)
                await this.#batchDedupDb.collection('kafka_consumer_state').updateOne(
                    { _id: legacyStateKey },
                    { $set: { _migrated: true, _migratedTo: stateKey, _migratedAt: new Date() } }
                );
            }

            // Check current cluster-versioned state
            const state = await this.#batchDedupDb.collection('kafka_consumer_state').findOne(
                { _id: stateKey },
                { projection: { [`partitions.${token.partition}.offset`]: 1, clusterId: 1 } }
            );

            // Check for cluster mismatch (shouldn't happen with new key format, but check stored clusterId)
            if (state && state.clusterId && state.clusterId !== this.#clusterId) {
                this.#log.w(`[${this.#name}] Cluster mismatch detected: stored=${state.clusterId}, current=${this.#clusterId}`);
                await this.#recordConsumerEvent('CLUSTER_MISMATCH', token, {
                    message: 'Cluster ID mismatch detected - resetting state',
                    expectedClusterId: state.clusterId,
                    actualClusterId: this.#clusterId,
                    actionTaken: 'RESET_STATE'
                });
                await this.#resetState(stateKey);
                return null; // No overlap after reset
            }

            let savedOffset = state?.partitions?.[token.partition]?.offset;

            // Validate offsets are numeric before BigInt conversion
            // If invalid, use default values instead of skipping dedup check
            // eslint-disable-next-line require-jsdoc
            const isValidOffset = (val) => val !== null && val !== undefined && /^\d+$/.test(String(val));
            if (savedOffset && !isValidOffset(savedOffset)) {
                this.#log.w(`[${this.#name}] Invalid saved offset format: ${savedOffset}, using 0 as fallback`);
                savedOffset = '0';
            }
            let incomingOffset = token.firstOffset;
            if (incomingOffset && !isValidOffset(incomingOffset)) {
                this.#log.w(`[${this.#name}] Invalid incoming offset format: ${incomingOffset}, using 0 as fallback`);
                incomingOffset = '0';
            }

            // Check for offset going backwards (topic recreation scenario)
            // A significant backward jump suggests topic was recreated (threshold is configurable)
            if (savedOffset && BigInt(incomingOffset) < BigInt(savedOffset) - this.#offsetBackwardThreshold) {
                this.#log.w(`[${this.#name}] Offset backward detected: saved=${savedOffset}, incoming=${incomingOffset}`);
                await this.#recordConsumerEvent('OFFSET_BACKWARD', token, {
                    message: 'Offset went backwards significantly - possible topic recreation',
                    expectedOffset: savedOffset,
                    actualOffset: incomingOffset,
                    gap: (BigInt(savedOffset) - BigInt(incomingOffset)).toString(),
                    actionTaken: 'RESET_PARTITION'
                });
                await this.#resetPartitionState(stateKey, token.partition);
                return null; // No overlap after reset
            }

            // Normal overlap detection
            if (savedOffset && BigInt(savedOffset) >= BigInt(incomingOffset)) {
                const commitOffset = (BigInt(savedOffset) + 1n).toString();
                this.#log.w(`[${this.#name}] Overlap detected: saved=${savedOffset} >= first=${incomingOffset}, recovering to ${commitOffset}`);
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
     * Now includes cluster ID for state versioning
     * @param {Object} token - Batch token with topic, partition, and offset info
     * @returns {Promise<void>} resolves when marked
     * @private
     */
    async #markAsProcessed(token) {
        if (!this.#batchDedupEnabled || !this.#batchDedupDb || !token?.lastOffset) {
            return;
        }
        // State key now includes cluster ID: {clusterId}:{groupId}:{topic}
        const stateKey = this.#buildStateKey(token.topic);
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
                    clusterId: this.#clusterId, // Store cluster ID for verification
                    consumerGroup: this.#effectiveGroupId,
                    updatedAt: now
                },
                $setOnInsert: {
                    createdAt: now // Track when state was first created
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
     * Fetch Kafka cluster ID from the cluster using admin API
     * Falls back to brokers hash if admin API fails
     * @returns {Promise<string>} Cluster ID
     * @private
     */
    async #fetchClusterId() {
        try {
            const metadata = await this.#kafkaClient.getClusterMetadata();
            this.#clusterId = metadata.clusterId;
            this.#log.i(`[${this.#name}] Fetched Kafka cluster ID: ${this.#clusterId}`);
            return this.#clusterId;
        }
        catch (e) {
            this.#log.e(`[${this.#name}] Error fetching cluster ID: ${e.message}`);
            // Fallback to brokers hash if admin API fails
            const brokers = this.#countlyConfig.kafka?.rdkafka?.brokers || ['localhost:9092'];
            const brokersStr = Array.isArray(brokers) ? brokers.sort().join(',') : brokers;
            let hash = 0;
            for (let i = 0; i < brokersStr.length; i++) {
                hash = ((hash << 5) - hash) + brokersStr.charCodeAt(i);
                hash = hash & hash;
            }
            this.#clusterId = `fallback-${Math.abs(hash).toString(16).substring(0, 8)}`;
            this.#log.w(`[${this.#name}] Using fallback cluster ID: ${this.#clusterId}`);
            return this.#clusterId;
        }
    }

    /**
     * Build versioned state key for deduplication
     * Format: {clusterId}:{groupId}:{topic}
     * @param {string} topic - Topic name
     * @returns {string} State key with cluster versioning
     * @private
     */
    #buildStateKey(topic) {
        return `${this.#clusterId}:${this.#effectiveGroupId}:${topic}`;
    }

    /**
     * Record consumer event to MongoDB for monitoring/debugging
     * @param {string} type - Event type: CLUSTER_MISMATCH, OFFSET_BACKWARD, STATE_RESET, STATE_MIGRATED
     * @param {Object} token - Batch token with topic, partition info
     * @param {Object} details - Event-specific details
     * @returns {Promise<void>} resolves when recorded
     * @private
     */
    async #recordConsumerEvent(type, token, details) {
        if (!this.#batchDedupDb) {
            return;
        }
        try {
            await this.#batchDedupDb.collection('kafka_consumer_events').insertOne({
                ts: new Date(),
                type,
                groupId: this.#effectiveGroupId,
                topic: token?.topic || null,
                partition: token?.partition !== undefined ? token.partition : null,
                clusterId: this.#clusterId,
                stateKey: token?.topic ? this.#buildStateKey(token.topic) : null,
                details,
                metadata: {
                    hostname: process.env.HOSTNAME || require('os').hostname(),
                    processId: process.pid
                }
            });
            this.#log.d(`[${this.#name}] Recorded consumer event: ${type}`);
        }
        catch (e) {
            this.#log.e(`[${this.#name}] Error recording consumer event: ${e.message}`);
            // Non-fatal - events are for monitoring
        }
    }

    /**
     * Reset all state for a consumer group (cluster migration scenario)
     * @param {string} stateKey - State document key
     * @returns {Promise<void>} resolves when reset
     * @private
     */
    async #resetState(stateKey) {
        if (!this.#batchDedupDb) {
            return;
        }
        try {
            await this.#batchDedupDb.collection('kafka_consumer_state').deleteOne({ _id: stateKey });
            this.#log.i(`[${this.#name}] Reset state for key: ${stateKey}`);
        }
        catch (e) {
            this.#log.e(`[${this.#name}] Error resetting state: ${e.message}`);
        }
    }

    /**
     * Reset state for a specific partition (offset backward scenario)
     * @param {string} stateKey - State document key
     * @param {number} partition - Partition number
     * @returns {Promise<void>} resolves when reset
     * @private
     */
    async #resetPartitionState(stateKey, partition) {
        if (!this.#batchDedupDb) {
            return;
        }
        try {
            await this.#batchDedupDb.collection('kafka_consumer_state').updateOne(
                { _id: stateKey },
                { $unset: { [`partitions.${partition}`]: "" } }
            );
            this.#log.i(`[${this.#name}] Reset partition ${partition} state for key: ${stateKey}`);
        }
        catch (e) {
            this.#log.e(`[${this.#name}] Error resetting partition state: ${e.message}`);
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

        // Fetch cluster ID for state versioning before starting consumer
        await this.#fetchClusterId();

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
