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

    // Memory safety constants
    static #MAX_QUEUE_SIZE = 10000; // Maximum events in queue before backpressure

    static #QUEUE_WARNING_SIZE = 5000; // Warn when queue grows large

    /**
     * @param {Object} db - MongoDB database connection
     * @param {Object} config - ChangeStream configuration
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
                // Check queue bounds for memory safety
                if (this.#eventQueue.length >= ChangeStreamEventSource.#MAX_QUEUE_SIZE) {
                    log.e(`[${this.#config.name}] Event queue full (${this.#eventQueue.length}), dropping events to prevent memory exhaustion`);
                    // Drop oldest events to make room (FIFO with overflow protection)
                    const dropCount = Math.floor(ChangeStreamEventSource.#MAX_QUEUE_SIZE * 0.1); // Drop 10%
                    this.#eventQueue.splice(0, dropCount);
                    log.w(`[${this.#config.name}] Dropped ${dropCount} oldest events due to queue overflow`);
                }
                else if (this.#eventQueue.length >= ChangeStreamEventSource.#QUEUE_WARNING_SIZE) {
                    log.w(`[${this.#config.name}] Event queue growing large: ${this.#eventQueue.length} events (warning threshold: ${ChangeStreamEventSource.#QUEUE_WARNING_SIZE})`);
                }

                // Extract the actual event data
                let event = data;
                if (data.fullDocument) {
                    event = data.fullDocument;
                }

                // Create a stable key for the token
                const tokenKey = token._id ?
                    `cs:${token._id}:${token.cd}` :
                    `cs:${Buffer.from(JSON.stringify(token)).toString('base64')}`;

                const eventData = {
                    token: {
                        ...token,
                        key: tokenKey,
                        originalToken: token
                    },
                    event
                };

                this.#eventQueue.push(eventData);

                // If someone is waiting for an event, resolve their promise
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

        // Try to collect available events into a batch
        let batch = this.#collectBatch();
        if (batch) {
            return batch;
        }

        // Wait for events to arrive
        await new Promise((resolve) => {
            // Check again in case events arrived while creating the promise
            if (this.#eventQueue.length > 0) {
                resolve();
            }
            else {
                this.#resolveNext = resolve;
            }
        });

        // Collect newly arrived events into a batch
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
            await this.#reader.acknowledgeToken(token.originalToken || token);
            log.d(`Acknowledged changestream batch ending at: ${token.key}`);
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
        this.#eventQueue = [];
        log.d('ChangeStream event source stopped');
    }

}

module.exports = ChangeStreamEventSource;