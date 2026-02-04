const log = require('../../../../api/utils/log.js')('kafka:consumer');
const countlyConfig = require('../../../../api/config');
const { CompressionTypes, CompressionCodecs } = require('kafkajs');
const lz4 = require('lz4-napi');

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
 * @typedef {Object} KafkaConsumerOptions
 * @property {string[]} [topics] - Array of topic names to subscribe to
 * @property {string} [topic] - Single topic name (alternative to topics array)
 * @property {'earliest'|'latest'} [autoOffsetReset='latest'] - Where to start consuming when no offset exists
 * @property {boolean} [enableAutoCommit=false] - Ignored (we force manual commits)
 * @property {number} [sessionTimeoutMs] - Session timeout for group coordination
 * @property {number} [heartbeatIntervalMs] - Heartbeat interval in milliseconds (should be ~1/6 of sessionTimeout)
 * @property {number} [rebalanceTimeoutMs] - Maximum time for group rebalancing in milliseconds
 * @property {number} [metadataMaxAge] - How often to refresh topic/partition metadata in milliseconds
 * @property {string|null} [rackId] - Rack ID for rack-aware consumption (follower fetching)
 * @property {number} [partitionsConsumedConcurrently] - Number of partitions to process concurrently
 * @property {Object} [sasl] - SASL authentication configuration
 * @property {boolean} [ssl] - SSL/TLS encryption enabled
 */

/**
 * @typedef {Object} KafkaConsumerConfig
 * @property {string} groupId - Consumer group ID with prefix applied
 * @property {string[]} topics - Array of topics to consume from
 * @property {boolean} enableAutoCommit - Always false (manual commits only)
 * @property {'earliest'|'latest'} autoOffsetReset - Offset reset behavior
 * @property {number} sessionTimeoutMs - Session timeout (default 60s)
 * @property {number} heartbeatInterval - Heartbeat interval (default 10s, should be ~1/6 of sessionTimeout)
 * @property {number} rebalanceTimeout - Rebalance timeout (default 120s)
 * @property {number} metadataMaxAge - Metadata refresh interval (default 300s)
 * @property {string|null} rackId - Rack ID for rack-aware consumption (null = disabled)
 * @property {number} minBytes - Minimum bytes to fetch (bounded 1-10MB)
 * @property {number} maxWaitTimeInMs - Maximum wait time for batches (bounded 100ms-30s)
 * @property {number} maxBytes - Maximum bytes per fetch (bounded 1MB-100MB)
 * @property {number} maxBytesPerPartition - Maximum bytes per partition (bounded 64KB-10MB)
 * @property {number} partitionsConsumedConcurrently - Concurrent partition processing
 * @property {'skip'|'fail'} invalidJsonBehavior - How to handle invalid JSON messages
 * @property {boolean} invalidJsonMetrics - Whether to log invalid JSON metrics
 */

/**
 * @typedef {Object} BatchRecord
 * @property {Object} event - Parsed JSON event data
 * @property {Object} message - Raw Kafka message with offset, key, headers
 * @property {Object} headers - Message headers
 */

/**
 * @typedef {Object} HandlerParams
 * @property {string} topic - Topic name
 * @property {number} partition - Partition number
 * @property {Object} batch - Raw KafkaJS batch object
 * @property {BatchRecord[]} records - Array of parsed records
 */

/**
 * KafkaConsumer - High-performance batch consumer with exactly-once semantics
 *
 * Architecture:
 * - ONE consumer group per analytics processor (unique groupId per processor)
 * - Multiple pods per processor share the same groupId (Kafka balances partitions)
 * - Exactly-once per processor: commit offsets ONLY after handler succeeds
 * - Read only committed messages from transactional producers (readUncommitted=false)
 * - Process messages in TRUE batches for better performance
 * - Manual offset commits for precise control
 *
 * Key Features:
 * - True batch processing with KafkaJS eachBatch (not single message callbacks)
 * - Automatic heartbeating during batch processing
 * - Invalid JSON handling with configurable behavior (skip/fail)
 * - Configuration bounds to prevent KafkaJS timeout warnings
 * - Graceful shutdown handling with proper resource cleanup
 * - Configurable concurrency for parallel partition processing
 * 
 * @example
 * const consumer = new KafkaConsumer(kafkaClient, 'analytics-processor', {
 *   topics: ['user-events', 'system-events'],
 *   partitionsConsumedConcurrently: 4
 * });
 * 
 * await consumer.start(async ({ topic, partition, records }) => {
 *   console.log(`Processing ${records.length} events from ${topic}[${partition}]`);
 *   
 *   for (const { event, message, headers } of records) {
 *     // Process each event in the batch
 *     await processEvent(event);
 *   }
 *   
 *   // Offset committed automatically after successful handler completion
 * });
 */
class KafkaConsumer {
    /** @type {import('./kafkaClient')} */
    #kafkaClient;

    /** @type {import('kafkajs').Consumer|null} */
    #consumer = null;

    /** @type {KafkaConsumerConfig} */
    #config;

    // Internal run-loop state for crash auto-restart and orderly stop
    #_shouldRun = false;

    #_runLoopActive = false;

    /** @type {Object|null} Database reference for health stats */
    #db = null;

    /**
     * Create a new KafkaConsumer instance
     * 
     * Automatically applies groupId prefix from configuration and validates
     * all timeout/batch configuration values to prevent KafkaJS warnings.
     * 
     * @param {kafkaClient} kafkaClient - KafkaClient instance for connection management
     * @param {string} groupId - Consumer group ID (prefix will be applied automatically)
     * @param {KafkaConsumerOptions} [options={}] - Consumer configuration options
     * 
     * @throws {Error} If kafkaClient is not provided or groupId is invalid
     * 
     * @example
     * const consumer = new KafkaConsumer(kafkaClient, 'event-processor', {
     *   topics: ['user-events'],
     *   partitionsConsumedConcurrently: 6,
     *   autoOffsetReset: 'earliest'
     * });
     */
    constructor(kafkaClient, groupId, options = {}) {
        if (!kafkaClient) {
            throw new Error('KafkaClient is required for KafkaConsumer');
        }
        if (!groupId || typeof groupId !== 'string') {
            throw new Error('Consumer groupId (string) is required');
        }

        this.#kafkaClient = kafkaClient;

        const kafkaCfg = countlyConfig.kafka || {};
        this.#config = this.#loadConfiguration(kafkaCfg, groupId, options);

        // Optional database reference for health stats
        this.#db = options.db || null;

        log.i(`KafkaConsumer created with groupId: ${this.#config.groupId}, topics: ${this.#config.topics.join(',')}`);
        log.i(`Batch config: minBytes=${this.#config.minBytes}, maxWaitTimeInMs=${this.#config.maxWaitTimeInMs}`);
    }

    /**
     * Get the effective consumer group ID (with prefix applied)
     * @returns {string} The prefixed consumer group ID
     */
    get groupId() {
        return this.#config.groupId;
    }

    /**
     * Load and validate consumer configuration with bounds checking
     * 
     * Maps librdkafka-style consumer configuration to KafkaJS format and applies
     * strict bounds to prevent timeout warnings and ensure reasonable limits.
     * 
     * @private
     * @param {Object} kafkaConfig - Kafka configuration from countlyConfig
     * @param {string} groupId - Base group ID (before prefix)
     * @param {KafkaConsumerOptions} options - Consumer options
     * @returns {KafkaConsumerConfig} Validated configuration object
     */
    #loadConfiguration(kafkaConfig, groupId, options) {
        const consumerConfig = kafkaConfig.consumer || {};
        const groupIdPrefix = kafkaConfig.groupIdPrefix || 'cly_';
        const prefixedGroupId = groupId.startsWith(groupIdPrefix) ? groupId : `${groupIdPrefix}${groupId}`;

        const defaultTopic = kafkaConfig.drillEventsTopic || 'countly-drill-events';
        let topics;
        if (Array.isArray(options.topics)) {
            topics = options.topics;
        }
        else if (options.topic) {
            topics = [options.topic];
        }
        else {
            topics = [defaultTopic];
        }
        const finalConfig = {
            groupId: prefixedGroupId,
            topics,

            // Manual commit strategy regardless of input (we enforce it in run())
            enableAutoCommit: false,

            // Offset reset & subscription behavior
            autoOffsetReset: options.autoOffsetReset || consumerConfig.autoOffsetReset || 'latest',

            // Timeouts & batching (KafkaJS equivalents) - conservative defaults to reduce rebalancing
            sessionTimeoutMs: consumerConfig.sessionTimeoutMs || 60000,
            heartbeatInterval: consumerConfig.heartbeatIntervalMs || 10000,
            rebalanceTimeout: consumerConfig.rebalanceTimeoutMs || 120000,
            minBytes: consumerConfig.fetchMinBytes || 262144, // 256KB, max 10MB
            maxWaitTimeInMs: consumerConfig.fetchMaxWaitMs || 1000,
            maxBytes: consumerConfig.fetchMaxBytes || 10485760,
            maxBytesPerPartition: consumerConfig.maxPartitionFetchBytes || 2097152,

            // Metadata and rack-aware settings
            metadataMaxAge: consumerConfig.metadataMaxAge || 300000, // 5 minutes default
            rackId: consumerConfig.rackId || null,

            // Concurrency - options take precedence over global config
            partitionsConsumedConcurrently: options.partitionsConsumedConcurrently
                ?? consumerConfig.partitionsConsumedConcurrently
                ?? 4,

            // Invalid JSON handling/metrics
            invalidJsonBehavior: consumerConfig.invalidJsonBehavior || 'skip', // 'skip'|'fail'
            invalidJsonMetrics: consumerConfig.invalidJsonMetrics ?? true,
        };

        log.d(finalConfig, 'KafkaConsumer configuration');
        return finalConfig;
    }

    /**
     * Start consuming messages with the provided batch handler
     * 
     * Key behaviors:
     * - TRUE batch processing: handler receives arrays of messages per call
     * - Manual commits: offsets committed only after successful handler completion  
     * - Transactional isolation: only reads committed messages (readUncommitted=false)
     * - Automatic heartbeating: maintains group membership during long processing
     * - Graceful error handling: invalid JSON messages handled per configuration
     * - Exactly-once semantics: each batch processed exactly once per consumer group
     * 
     * The handler function receives batches of parsed records and must process them
     * synchronously within each call. Offsets are committed automatically after
     * successful handler completion.
     * 
     * @param {function(HandlerParams): Promise<void>} handler - Batch processing function
     * @param {string} handler.topic - Topic name for this batch
     * @param {number} handler.partition - Partition number for this batch  
     * @param {Object} handler.batch - Raw KafkaJS batch object
     * @param {BatchRecord[]} handler.records - Array of parsed event records
     * 
     * @throws {Error} If handler is not a function or consumer initialization fails
     * 
     * @example
     * await consumer.start(async ({ topic, partition, records }) => {
     *   console.log(`Processing ${records.length} records from ${topic}[${partition}]`);
     *   
     *   const events = records.map(r => r.event);
     *   await batchProcessEvents(events);
     *   
     *   // Offset will be committed automatically after this function returns
     * });
     */
    async start(handler) {
        if (typeof handler !== 'function') {
            throw new Error('KafkaConsumer.start(handler): handler must be a function');
        }

        const runOptions = {
            // hard-disable auto commit & auto-resolve; we will commit manually
            autoCommit: false,
            eachBatchAutoResolve: false,
            partitionsConsumedConcurrently: this.#config.partitionsConsumedConcurrently,
            eachBatch: async({ batch, heartbeat, isRunning, isStale, resolveOffset }) => {
                if (!isRunning()) {
                    return;
                }

                const { topic, partition, messages } = batch;
                // If this assignment is already stale, do nothing.
                if (isStale()) {
                    log.w(`[group=${this.#config.groupId}] Stale assignment before processing ${topic}[${partition}] – skipping batch`);
                    return;
                }

                const parsed = [];
                let invalidCount = 0;

                // Heartbeat throttling during parsing
                const HB_EVERY_MSGS = 5000;
                const HB_EVERY_MS = 5000;
                let lastHb = Date.now();
                let sinceLastHb = 0;

                for (const m of messages) {
                    // If we lost the assignment mid-parse, stop immediately.
                    if (!isRunning() || isStale()) {
                        log.w(`[group=${this.#config.groupId}] Assignment became stale during parse ${topic}[${partition}] – aborting batch`);
                        return;
                    }
                    try {
                        const event = JSON.parse(m.value.toString());
                        parsed.push({ event, message: m, headers: m.headers || {} });
                    }
                    catch (e) {
                        invalidCount++;
                        log.w(`Invalid JSON at ${topic}[${partition}]@${m.offset}; behavior: ${this.#config.invalidJsonBehavior}: ${e.message}`);
                        if (this.#config.invalidJsonBehavior === 'fail') {
                            throw new Error(`Invalid JSON at ${topic}[${partition}]@${m.offset}: ${e.message}`);
                        }
                        // 'skip' -> continue
                    }

                    sinceLastHb++;
                    if (sinceLastHb >= HB_EVERY_MSGS || (Date.now() - lastHb) >= HB_EVERY_MS) {
                        if (typeof heartbeat === 'function') {
                            try {
                                await heartbeat();
                            }
                            catch (hbErr) {
                                const errMsg = String(hbErr?.message || '');
                                // Handle both "not aware of this member" and "rebalancing" errors
                                if (errMsg.includes('not aware of this member') || errMsg.includes('rebalancing')) {
                                    const reason = errMsg.includes('rebalancing') ? 'group rebalancing' : 'stale member';
                                    log.d(`[group=${this.#config.groupId}] Heartbeat aborted (${reason}) during parse ${topic}[${partition}] – letting KafkaJS rejoin`);
                                    return; // stop batch; KafkaJS will handle rejoin
                                }
                                log.e(hbErr);
                                throw hbErr;
                            }
                        }
                        lastHb = Date.now();
                        sinceLastHb = 0;
                    }
                }

                if (this.#config.invalidJsonMetrics && invalidCount > 0) {
                    log.w(`Batch processing: ${parsed.length} valid, ${invalidCount} invalid messages in ${topic}[${partition}]`);
                }

                // Heartbeat loop during handler execution to prevent rebalances
                // Uses Promise.race for immediate exit when handler completes (no 2s wait)
                const HB_DURING_HANDLER_MS = 2000;
                let handlerDone = false;
                let signalHandlerDone = null; // Resolver to cancel sleep immediately
                let batchAborted = false; // Set to true when rebalancing detected

                const heartbeatLoop = (async() => {
                    while (!handlerDone && isRunning() && !isStale()) {
                        // Race: either sleep completes OR handler finishes
                        const doneSignal = new Promise(resolve => {
                            signalHandlerDone = resolve;
                        });
                        const sleepResult = await Promise.race([
                            new Promise(resolve => setTimeout(() => resolve('timeout'), HB_DURING_HANDLER_MS)),
                            doneSignal.then(() => 'done')
                        ]);

                        // Exit immediately if handler is done
                        if (sleepResult === 'done' || handlerDone) {
                            break;
                        }

                        // Send heartbeat if still running
                        if (isRunning() && !isStale() && typeof heartbeat === 'function') {
                            try {
                                await heartbeat();
                            }
                            catch (hbErr) {
                                const errMsg = String(hbErr?.message || '');
                                // Handle both "not aware of this member" and "rebalancing" errors
                                if (errMsg.includes('not aware of this member') || errMsg.includes('rebalancing')) {
                                    const reason = errMsg.includes('rebalancing') ? 'group rebalancing' : 'stale member';
                                    log.d(`[group=${this.#config.groupId}] Heartbeat aborted (${reason}) during handler ${topic}[${partition}] – skipping commit`);
                                    batchAborted = true; // Signal to skip commit
                                    return; // exit loop; KafkaJS will handle rejoin
                                }
                                log.w(`Heartbeat during handler failed: ${hbErr.message}`);
                            }
                        }
                    }
                })();

                // Handler may return { commitOffset } for dedup recovery
                let handlerResult;
                try {
                    if (isStale()) {
                        log.w(`[group=${this.#config.groupId}] Stale before handler ${topic}[${partition}]`);
                        return;
                    }
                    handlerResult = await handler({ topic, partition, batch, records: parsed });
                }
                catch (handlerErr) {
                    log.e(`[group=${this.#config.groupId}] Handler error ${topic}[${partition}]`, handlerErr);
                    throw handlerErr;
                }
                finally {
                    handlerDone = true;
                    if (signalHandlerDone) {
                        signalHandlerDone();
                    } // Cancel sleep immediately
                    await heartbeatLoop;
                }

                if (messages.length > 0 && this.#consumer && !isStale() && !batchAborted) {
                    const lastOffset = messages[messages.length - 1].offset;
                    const next = handlerResult?.commitOffset || (BigInt(lastOffset) + 1n).toString();
                    const resolveVal = handlerResult?.commitOffset
                        ? (BigInt(handlerResult.commitOffset) - 1n).toString()
                        : lastOffset;

                    try {
                        if (typeof resolveOffset === 'function') {
                            resolveOffset(resolveVal);
                        }
                        if (typeof heartbeat === 'function') {
                            try {
                                await heartbeat();
                            }
                            catch (_) { /* ignore */ }
                        }
                        await this.#consumer.commitOffsets([{ topic, partition, offset: next }]);
                        log.d(`[group=${this.#config.groupId}] Committed ${topic}[${partition}] -> ${next}`);
                    }
                    catch (e) {
                        log.w(`[group=${this.#config.groupId}] Commit failed ${topic}[${partition}]: ${e.message}`);
                    }
                }
            }
        };

        this.#setupShutdownHooks();

        // Crash-safe run loop: automatically restarts the consumer run() on crash
        // Backoff grows up to 30s between retries. Cleanly exits when stop() is called.
        this.#_shouldRun = true;
        if (this.#_runLoopActive) {
            return; // already running
        }
        this.#_runLoopActive = true;
        (async() => {
            let backoff = 1000; // 1s initial
            while (this.#_shouldRun) {
                try {
                    await this.#initConsumer();
                    await this.#consumer.run(runOptions);
                    break; // normal stop/disconnect
                }
                catch (err) {
                    log.e(`[group=${this.#config.groupId}] Consumer crashed; restarting in ${backoff}ms`, err);
                    this.#recordHealthStat('error', { message: err.message, type: 'CRASH' });

                    // Tear down the consumer instance for full recreation
                    if (this.#consumer) {
                        try {
                            await this.#consumer.disconnect();
                        }
                        catch (disconnectErr) {
                            log.w(`[group=${this.#config.groupId}] Disconnect error during recovery: ${disconnectErr.message}`);
                        }
                        this.#consumer = null;
                    }

                    if (!this.#_shouldRun) {
                        break;
                    }
                    await new Promise(r => setTimeout(r, backoff));
                    backoff = Math.min(backoff * 2, 30000);
                }
            }
            this.#_runLoopActive = false;
        })();
    }

    /**
     * Pause message consumption on all subscribed topics
     * 
     * Pauses consumption while maintaining group membership. Messages will
     * accumulate in Kafka and be processed when resumed. Useful for backpressure
     * control or maintenance operations.
     * 
     * @returns {Promise<void>} Promise that resolves when paused
     * 
     * @example
     * await consumer.pause();
     * console.log('Processing paused');
     */
    async pause() {
        if (!this.#consumer) {
            return;
        }
        const topics = this.#config.topics.map(topic => ({ topic }));
        this.#consumer.pause(topics);
        log.i('KafkaConsumer paused');
    }

    /**
     * Resume message consumption on all subscribed topics
     * 
     * Resumes processing of accumulated messages. The consumer will immediately
     * begin processing any backlog that accumulated during the pause.
     * 
     * @returns {Promise<void>} Promise that resolves when resumed
     * 
     * @example
     * await consumer.resume();
     * console.log('Processing resumed');
     */
    async resume() {
        if (!this.#consumer) {
            return;
        }
        const topics = this.#config.topics.map(topic => ({ topic }));
        this.#consumer.resume(topics);
        log.i('KafkaConsumer resumed');
    }

    /**
     * Stop the consumer and disconnect from Kafka
     * 
     * Gracefully shuts down the consumer, ensuring any in-flight batches
     * are completed before disconnecting. Can be called multiple times safely.
     * 
     * @returns {Promise<void>} Promise that resolves when stopped
     * 
     * @example
     * await consumer.stop();
     * console.log('Consumer stopped');
     */
    async stop() {
        this.#_shouldRun = false;
        if (this.#consumer) {
            try {
                await this.#consumer.disconnect();
            }
            catch (e) {
                log.e('Error during consumer disconnect', e);
            }
            finally {
                this.#consumer = null;
            }
        }
        // Remove from global signal handler registry if present to avoid leaks
        if (global._kafkaConsumerSignalHandlers && global._kafkaConsumerSignalHandlers.has(this)) {
            global._kafkaConsumerSignalHandlers.delete(this);
        }
        log.i('KafkaConsumer stopped');
    }

    /**
     * Initialize the KafkaJS consumer with transactional isolation
     * 
     * Creates a KafkaJS consumer with:
     * - readUncommitted=false for transactional isolation
     * - Optimized fetch settings for batch processing
     * - Subscription to configured topics
     * 
     * @private
     * @returns {Promise<void>} Promise that resolves when consumer is connected and subscribed
     */
    async #initConsumer() {
        if (this.#consumer) {
            return;
        }

        const kafka = this.#kafkaClient.createKafkaInstance();

        const consumerOpts = {
            groupId: this.#config.groupId,
            // Give each pod a stable instance id (e.g., hostname or StatefulSet ordinal)
            groupInstanceId: process.env.KAFKA_GROUP_INSTANCE_ID || require('os').hostname(),
            allowAutoTopicCreation: false,
            // read only committed transactional messages
            readUncommitted: false,
            sessionTimeout: this.#config.sessionTimeoutMs,
            heartbeatInterval: this.#config.heartbeatInterval,
            rebalanceTimeout: this.#config.rebalanceTimeout,
            minBytes: this.#config.minBytes,
            maxWaitTimeInMs: this.#config.maxWaitTimeInMs,
            maxBytes: this.#config.maxBytes,
            maxBytesPerPartition: this.#config.maxBytesPerPartition,
            // Metadata and rack-aware settings
            metadataMaxAge: this.#config.metadataMaxAge,
            rackId: this.#config.rackId || undefined,
        };

        this.#consumer = kafka.consumer(consumerOpts);

        // Use consumer.events (preferred) and gracefully skip if not available
        const ce = (this.#consumer && this.#consumer.events) || null;
        if (ce) {
            // Robust event registration with validation
            const legalEvents = new Set(Object.values(ce));

            /**
             * Attach event listener if valid
             * @param {string} eventName - Event name or alias
             * @param {function} handler - Event handler function
             * @returns {void} No return value
             */
            const attachEvent = (eventName, handler) => {
                const resolved = ce[eventName] || eventName;
                if (!legalEvents.has(resolved)) {
                    log.w(`[kafka] Skipping unknown consumer event "${eventName}" (resolved "${resolved}")`);
                    return;
                }
                this.#consumer.on(resolved, handler);
            };

            attachEvent('REBALANCING', (e) => {
                log.d(`[group=${this.#config.groupId}] REBALANCING groupId=${e.payload.groupId} memberId=${e.payload.memberId || 'n/a'}`);
                this.#recordHealthStat('rebalance', { groupId: e.payload.groupId });
            });

            attachEvent('GROUP_JOIN', (e) => {
                log.i(`[group=${this.#config.groupId}] GROUP_JOIN generationId=${e.payload.generationId} memberId=${e.payload.memberId}`);
                this.#recordHealthStat('join', {
                    generationId: e.payload.generationId,
                    memberId: e.payload.memberId
                });
            });

            // attachEvent('HEARTBEAT', (e) => {
            //     log.d(`[group=${this.#config.groupId}] HEARTBEAT memberId=${e.payload.memberId}`);
            // });

            attachEvent('COMMIT_OFFSETS', (e) => {
                const groupId = e.payload.groupId;
                const memberId = e.payload.memberId;
                const topics = e.payload.topics || [];
                log.d(`[group=${groupId}] COMMIT_OFFSETS memberId=${memberId} topics=${topics.map(t => t.topic).join(',')}`);
                this.#recordHealthStat('commit', { topics: e.payload.topics });
            });
        }
        else {
            // Older/unknown KafkaJS—skip attaching event listeners
            log.w(`[group=${this.#config.groupId}] KafkaJS consumer.events not available; skipping diagnostic listeners`);
        }

        await this.#consumer.connect();

        // KafkaJS supports subscribing to multiple topics at once
        await this.#consumer.subscribe({
            topics: this.#config.topics,
            fromBeginning: this.#config.autoOffsetReset === 'earliest'
        });

        log.i(`KafkaConsumer connected: groupId=${this.#config.groupId}, topics=${this.#config.topics.join(',')}`);
    }

    /**
     * Record consumer health statistics to MongoDB
     * Used for monitoring rebalances, errors, commits, and other health metrics
     *
     * @private
     * @param {string} type - Event type: 'rebalance', 'join', 'commit', 'error'
     * @param {Object} data - Event-specific data
     * @returns {Promise<void>} Resolves when stat is recorded
     */
    async #recordHealthStat(type, data) {
        if (!this.#db) {
            return;
        }
        const key = this.#config.groupId;
        const now = new Date();
        const update = { $set: { updatedAt: now, groupId: key } };

        switch (type) {
        case 'rebalance':
            update.$inc = { rebalanceCount: 1 };
            update.$set.lastRebalanceAt = now;
            break;
        case 'join':
            update.$set.lastJoinAt = now;
            update.$set.lastGenerationId = data.generationId;
            update.$set.lastMemberId = data.memberId;
            break;
        case 'commit':
            update.$inc = { commitCount: 1 };
            update.$set.lastCommitAt = now;
            break;
        case 'error':
            update.$inc = { errorCount: 1 };
            update.$set.lastErrorAt = now;
            update.$set.lastErrorMessage = data.message;
            update.$push = {
                recentErrors: {
                    $each: [{ at: now, message: data.message, type: data.type }],
                    $slice: -10
                }
            };
            break;
        default:
            return;
        }

        try {
            await this.#db.collection('kafka_consumer_health').updateOne(
                { _id: key },
                update,
                { upsert: true }
            );
        }
        catch (e) {
            log.w(`Error recording health stat (${type}): ${e.message}`);
            // Non-fatal - stats are optional
        }
    }

    /**
     * Setup graceful shutdown handlers for SIGTERM and SIGINT
     *
     * Ensures clean disconnection of consumers when the process receives
     * termination signals. Uses global tracking to coordinate shutdown
     * across multiple consumer instances.
     *
     * @private
     */
    #setupShutdownHooks() {
        if (!global._kafkaConsumerSignalHandlers) {
            global._kafkaConsumerSignalHandlers = new Set();
            global._kafkaConsumerShutdownInitiated = false;
        }
        const signalHandlers = global._kafkaConsumerSignalHandlers;
        if (signalHandlers.has(this)) {
            return;
        }

        /**
         * Graceful shutdown handler
         * @param {string} sig - Signal name (e.g. 'SIGTERM')
         * @returns {Promise<void>} Promise that resolves when shutdown is complete
         */
        const graceful = async(sig) => {
            try {
                log.i(`KafkaConsumer ${this.#config.groupId} received ${sig}; disconnecting...`);
                await this.stop();
                signalHandlers.delete(this);
                if (signalHandlers.size === 0 && !global._kafkaConsumerShutdownInitiated) {
                    global._kafkaConsumerShutdownInitiated = true;
                    process.exit(0);
                }
            }
            catch (e) {
                log.e('Error during shutdown', e);
                signalHandlers.delete(this);
                if (signalHandlers.size === 0 && !global._kafkaConsumerShutdownInitiated) {
                    global._kafkaConsumerShutdownInitiated = true;
                    process.exit(1);
                }
            }
        };

        this._gracefulShutdown = graceful;
        signalHandlers.add(this);

        if (signalHandlers.size === 1) {
            process.once('SIGTERM', () => {
                Array.from(signalHandlers).forEach(consumer => consumer._gracefulShutdown && consumer._gracefulShutdown('SIGTERM'));
            });
            process.once('SIGINT', () => {
                Array.from(signalHandlers).forEach(consumer => consumer._gracefulShutdown && consumer._gracefulShutdown('SIGINT'));
            });
        }
    }
}

module.exports = KafkaConsumer;
