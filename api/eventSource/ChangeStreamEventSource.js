const EventSourceInterface = require('./EventSourceInterface');
const Log = require('../utils/log.js');

/**
 * ChangeStream implementation of EventSourceInterface
 * Supports async iteration with auto-acknowledgment of MongoDB changestream events
 */
class ChangeStreamEventSource extends EventSourceInterface {
    #log; // Logging function

    #name; // Unique name for this event source instance

    #ChangeStreamReader; // ChangeStreamReader class for creating reader instances

    #changeStreamReader; // Instance of ChangeStreamReader

    #mongoOptions; // MongoDB/ChangeStream configuration options

    #db; // MongoDB database connection

    #countlyConfig; // Global Countly configuration

    #eventQueue = []; // Internal queue of events

    #resolveNext = null; // Resolver for next event promise

    #isRunning = false; // True if the reader is initialized and running

    #isClosed = false; // True if the source has been stopped

    #isPaused = false; // True if the changestream is paused due to backpressure

    // Backpressure thresholds
    static #PAUSE_THRESHOLD = 1000; // Pause changestream when queue reaches this size

    static #RESUME_THRESHOLD = 100; // Resume changestream when queue drains to this size

    /**
     * Create a ChangeStreamEventSource instance with consistent dependency injection
     * 
     * This class is typically created by EventSourceFactory, not directly by application code.
     * Use UnifiedEventSource for a cleaner API: new UnifiedEventSource(name, sourceConf)
     * 
     * Now follows consistent dependency injection pattern - receives config and classes,
     * creates its own changeStreamReader instance in initialize() method.
     * 
     * Constructor Parameters:
     * @param {string} name - Required. Unique name for this event source used for logging and identification
     *                        Should be descriptive (e.g., 'session-changestream', 'drill-events-watcher')
     * @param {Object} mongoOptions - Required. MongoDB/ChangeStream configuration object
     * @param {Object} mongoOptions.db - Required. MongoDB database connection object
     *                                   Should be a valid MongoDB database instance with access to the target collection
     * @param {Array} [mongoOptions.pipeline=[]] - Optional. MongoDB aggregation pipeline for filtering change stream events
     *                                       Array of aggregation stages to filter/transform events before queuing
     *                                       Example: [{ $match: { 'fullDocument.e': '[CLY]_session' } }]
     * @param {string} [mongoOptions.collection='drill_events'] - Optional. MongoDB collection name to watch for changes
     *                                                         Defaults to 'drill_events' if not specified
     * @param {Object} [mongoOptions.options={}] - Optional. Additional MongoDB change stream options
     *                                             Passed directly to MongoDB changeStream() method
     *                                             Common options: { fullDocument: 'updateLookup', resumeAfter: token }
     * @param {number} [mongoOptions.interval=10000] - Optional. Health check interval in milliseconds (default: 10 seconds)
     *                                                 How often to check if the change stream is still healthy
     * @param {Function} [mongoOptions.onClose] - Optional. Callback function executed when the change stream closes
     *                                            Receives error information if stream closes due to error
     * @param {Object} [mongoOptions.fallback] - Optional. Fallback configuration for when change streams fail
     * @param {Object} dependencies - Required. Dependency injection for configuration and testing
     * @param {Object} dependencies.countlyConfig - Required. Global Countly configuration
     * @param {Function} [dependencies.ChangeStreamReader] - ChangeStreamReader class for creating reader instances
     * @param {Logger} [dependencies.log] - Logging function, defaults to internal Log utility
     */
    constructor(name, mongoOptions, dependencies) {
        super();
        if (!name || typeof name !== 'string') {
            throw new Error('ChangeStreamEventSource requires a name (string) parameter');
        }
        if (!mongoOptions?.db) {
            throw new Error('ChangeStreamEventSource requires mongoOptions.db (MongoDB database connection)');
        }
        if (!dependencies || typeof dependencies !== 'object') {
            throw new Error('ChangeStreamEventSource requires dependencies (object) parameter');
        }
        if (!dependencies.countlyConfig || typeof dependencies.countlyConfig !== 'object') {
            throw new Error('ChangeStreamEventSource requires dependencies.countlyConfig (object) parameter');
        }

        this.#log = dependencies.log || Log('eventSource:changestream');
        this.#name = name;
        this.#db = mongoOptions.db;
        this.#countlyConfig = dependencies.countlyConfig;
        this.#mongoOptions = mongoOptions;

        this.#ChangeStreamReader = dependencies.ChangeStreamReader || require('../parts/data/changeStreamReader').changeStreamReader;

        this.#log.d(`ChangeStreamEventSource created: ${name} (will create reader on initialize)`);
    }

    /**
     * Initialize the changestream reader with consistent dependency injection
     * Creates its own changeStreamReader instance, matching KafkaEventSource pattern
     * @returns {Promise<void>} resolves when the reader is initialized
     */
    async initialize() {
        if (this.#isRunning) {
            return;
        }

        // Create the changestream reader with injected dependency - consistent pattern
        this.#log.d(`[${this.#name}] Creating changestream reader with dependency injection`);
        this.#changeStreamReader = new this.#ChangeStreamReader(
            this.#db,
            {
                name: this.#name,
                pipeline: this.#mongoOptions.pipeline || [],
                fallback: this.#mongoOptions.fallback,
                collection: this.#mongoOptions.collection || 'drill_events',
                options: this.#mongoOptions.options || {},
                interval: this.#mongoOptions.interval || 10000,
                onClose: this.#mongoOptions.onClose
            },
            (token, data) => {
                // Simple backpressure: pause/resume changestream based on queue size
                // No data loss - leverages ChangeStreamReader's robust token management
                if (this.#eventQueue.length >= ChangeStreamEventSource.#PAUSE_THRESHOLD && !this.#isPaused) {
                    this.#log.w(`[${this.#name}] Queue large (${this.#eventQueue.length}), pausing changestream to prevent memory issues`);
                    this.#pauseStream();
                }
                else if (this.#eventQueue.length <= ChangeStreamEventSource.#RESUME_THRESHOLD && this.#isPaused) {
                    this.#log.i(`[${this.#name}] Queue drained (${this.#eventQueue.length}), resuming changestream`);
                    this.#resumeStream();
                }
                let event = data;
                if (data && data.fullDocument) {
                    event = data.fullDocument;
                }
                const eventData = {
                    token: token,
                    event
                };
                this.#eventQueue.push(eventData);
                if (this.#resolveNext) {
                    const resolver = this.#resolveNext;
                    this.#resolveNext = null;
                    resolver();
                }
            }
        );
        this.#isRunning = true;
        this.#log.d(`[${this.#name}] ChangeStream event source initialized with self-created reader (consistent dependency injection)`);
    }

    /**
     * Collect events from the queue into a batch
     * @param {number} maxBatchSize - Maximum number of events to collect
     * @returns {{token: Object, events: Array<Object>}|null} Batch or null if no events
     * @private
     */
    #collectBatch(maxBatchSize = 100) {
        if (this.#eventQueue.length === 0) {
            return null;
        }
        const batch = [];
        let batchToken = null;
        const batchSize = Math.min(this.#eventQueue.length, maxBatchSize);
        for (let i = 0; i < batchSize; i++) {
            const eventData = this.#eventQueue.shift();
            batch.push(eventData.event);
            // Use the last token as the batch token for acknowledgment
            batchToken = eventData.token;
        }
        return {
            source: 'MONGODB_CHANGESTREAM',
            token: batchToken,
            events: batch
        };
    }

    /**
     * Get the next batch of events from the changestream
     * For changestreams, we return events as they arrive (typically one at a time,
     * but multiple for bulk inserts)
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
        let batch = this.#collectBatch();
        if (batch) {
            return batch;
        }
        await new Promise((resolve) => {
            // Check again in case events arrived while creating the promise
            if (this.#eventQueue.length > 0) {
                resolve();
            }
            else {
                this.#resolveNext = resolve;
            }
        });
        return this.#collectBatch();
    }

    /**
     * Acknowledge successful processing of a batch
     * @param {Object} token - Token from getNext() (last token in the batch)
     * @returns {Promise<void>} resolves when acknowledged
     * @protected
     */
    async acknowledge(token) {
        if (this.#changeStreamReader && this.#changeStreamReader.acknowledgeToken) {
            await this.#changeStreamReader.acknowledgeToken(token);
            this.#log.d(`Acknowledged changestream batch ending at token: ${token._id || 'resume-token'}`);
        }
    }

    /**
     * Stop the changestream reader
     * @returns {Promise<void>} resolves when the reader is stopped
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
        if (this.#resolveNext) {
            const resolver = this.#resolveNext;
            this.#resolveNext = null;
            resolver();
        }
        if (this.#changeStreamReader) {
            this.#changeStreamReader.close();
        }
        this.#isRunning = false;
        this.#isPaused = false;
        this.#eventQueue = [];
        this.#log.d('ChangeStream event source stopped');
    }

    /**
     * Pause the changestream to control backpressure
     * Uses changeStreamReader's built-in recovery mechanisms
     * @private
     */
    #pauseStream() {
        if (this.#isPaused || !this.#changeStreamReader) {
            return;
        }
        this.#isPaused = true;
        this.#changeStreamReader.keep_closed = true;
        if (this.#changeStreamReader.stream && !this.#changeStreamReader.stream.closed) {
            this.#changeStreamReader.stream.close();
        }
        this.#log.i(`[${this.#name}] Changestream paused due to backpressure (queue: ${this.#eventQueue.length})`);
    }

    /**
     * Resume the changestream after backpressure relief
     * Leverages changeStreamReader's token management and fallback mechanisms
     * @private
     */
    async #resumeStream() {
        if (!this.#isPaused || !this.#changeStreamReader) {
            return;
        }
        this.#isPaused = false;
        this.#changeStreamReader.keep_closed = false; // Allow changeStreamReader to restart
        try {
            await this.#changeStreamReader.setUp(this.#changeStreamReader.onData);
            this.#log.i(`[${this.#name}] Changestream resumed after backpressure relief (queue: ${this.#eventQueue.length})`);
        }
        catch (err) {
            this.#log.e(`[${this.#name}] Error resuming changestream after backpressure:`, err);
            // changeStreamReader will handle this in its error handlers
        }
    }

}

module.exports = ChangeStreamEventSource;