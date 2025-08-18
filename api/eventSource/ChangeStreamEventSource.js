const EventSourceInterface = require('./EventSourceInterface');
const { changeStreamReader } = require('../parts/data/changeStreamReader');
const log = require('../utils/log.js')('changestream-event-source');

/**
 * ChangeStream implementation of EventSourceInterface
 * Supports async iteration with auto-acknowledgment of MongoDB changestream events
 */
class ChangeStreamEventSource extends EventSourceInterface {
    #reader;

    #config;

    #db;

    #eventQueue = [];

    #resolveNext = null;

    #isRunning = false;

    #isClosed = false;

    #isPaused = false;

    // Backpressure thresholds
    static #PAUSE_THRESHOLD = 1000; // Pause changestream when queue reaches this size

    static #RESUME_THRESHOLD = 100; // Resume changestream when queue drains to this size

    /**
     * Create a ChangeStreamEventSource instance
     * 
     * This class is typically created by EventSourceFactory, not directly by application code.
     * Use UnifiedEventSource for a cleaner API: new UnifiedEventSource(name, sourceConf)
     * 
     * Constructor Parameters:
     * @param {Object} db - Required. MongoDB database connection object
     *                      Should be a valid MongoDB database instance with access to the target collection
     * @param {Object} config - Required. ChangeStream configuration object
     * @param {string} config.name - Required. Unique name for this event source used for logging and identification
     *                               Should be descriptive (e.g., 'session-changestream', 'drill-events-watcher')
     * @param {Array} [config.pipeline=[]] - Optional. MongoDB aggregation pipeline for filtering change stream events
     *                                       Array of aggregation stages to filter/transform events before queuing
     *                                       Example: [{ $match: { 'fullDocument.e': '[CLY]_session' } }]
     * @param {string} [config.collection='drill_events'] - Optional. MongoDB collection name to watch for changes
     *                                                       Defaults to 'drill_events' if not specified
     * @param {Object} [config.options={}] - Optional. Additional MongoDB change stream options
     *                                       Passed directly to MongoDB changeStream() method
     *                                       Common options: { fullDocument: 'updateLookup', resumeAfter: token }
     * @param {number} [config.interval=10000] - Optional. Health check interval in milliseconds (default: 10 seconds)
     *                                           How often to check if the change stream is still healthy
     * @param {Function} [config.onClose] - Optional. Callback function executed when the change stream closes
     *                                      Receives error information if stream closes due to error
     * @param {Object} [config.fallback] - Optional. Fallback configuration for when change streams fail
     */
    constructor(db, config) {
        super();
        this.#db = db;
        this.#config = config;
    }

    /**
     * Initialize the changestream reader
     * @returns {Promise<void>} resolves when the reader is initialized
     */
    async initialize() {
        if (this.#isRunning) {
            return;
        }

        // Create the changestream reader with a callback that queues events
        this.#reader = new changeStreamReader(
            this.#db,
            {
                name: this.#config.name,
                pipeline: this.#config.pipeline || [],
                fallback: this.#config.fallback,
                collection: this.#config.collection || 'drill_events',
                options: this.#config.options || {},
                interval: this.#config.interval || 10000,
                onClose: this.#config.onClose
            },
            (token, data) => {
                // Simple backpressure: pause/resume changestream based on queue size
                // No data loss - leverages changeStreamReader's robust token management
                if (this.#eventQueue.length >= ChangeStreamEventSource.#PAUSE_THRESHOLD && !this.#isPaused) {
                    log.w(`[${this.#config.name}] Queue large (${this.#eventQueue.length}), pausing changestream to prevent memory issues`);
                    this.#pauseStream();
                }
                else if (this.#eventQueue.length <= ChangeStreamEventSource.#RESUME_THRESHOLD && this.#isPaused) {
                    log.i(`[${this.#config.name}] Queue drained (${this.#eventQueue.length}), resuming changestream`);
                    this.#resumeStream();
                }
                let event = data;
                if (data.fullDocument) {
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
        log.d('ChangeStream event source initialized');
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
        if (this.#reader && this.#reader.acknowledgeToken) {
            await this.#reader.acknowledgeToken(token);
            log.d(`Acknowledged changestream batch ending at token: ${token._id || 'resume-token'}`);
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
        if (this.#reader) {
            this.#reader.close();
        }
        this.#isRunning = false;
        this.#isPaused = false;
        this.#eventQueue = [];
        log.d('ChangeStream event source stopped');
    }

    /**
     * Pause the changestream to control backpressure
     * Uses changeStreamReader's built-in recovery mechanisms
     * @private
     */
    #pauseStream() {
        if (this.#isPaused || !this.#reader) {
            return;
        }
        this.#isPaused = true;
        this.#reader.keep_closed = true;
        if (this.#reader.stream && !this.#reader.stream.closed) {
            this.#reader.stream.close();
        }
        log.i(`[${this.#config.name}] Changestream paused due to backpressure (queue: ${this.#eventQueue.length})`);
    }

    /**
     * Resume the changestream after backpressure relief
     * Leverages changeStreamReader's token management and fallback mechanisms
     * @private
     */
    async #resumeStream() {
        if (!this.#isPaused || !this.#reader) {
            return;
        }
        this.#isPaused = false;
        this.#reader.keep_closed = false; // Allow changeStreamReader to restart
        try {
            await this.#reader.setUp(this.#reader.onData);
            log.i(`[${this.#config.name}] Changestream resumed after backpressure relief (queue: ${this.#eventQueue.length})`);
        }
        catch (err) {
            log.e(`[${this.#config.name}] Error resuming changestream after backpressure:`, err);
            // changeStreamReader will handle this in its error handlers
        }
    }

}

module.exports = ChangeStreamEventSource;