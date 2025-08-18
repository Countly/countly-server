/**
 * Base interface for event sources
 * Provides async iteration with automatic batch acknowledgment
 * 
 * This is an abstract base class that defines the template method pattern for event sources.
 * Subclasses must implement initialize(), getNext(), acknowledge(), and stop() methods.
 * 
 * The async iterator provides:
 * - Automatic resource initialization and cleanup
 * - At-least-once delivery semantics (events not acknowledged if consumer throws)
 * - Proper resource cleanup on early exits, breaks, and errors
 * - Single iteration restriction (prevents parallel processing on same instance)
 * 
 * Usage: for await (const {token, events} of eventSource) { ... }
 * 
 * Application Code:
 * Use UnifiedEventSource for a clean API: new UnifiedEventSource(name, sourceConf)
 * This abstract class is implemented by KafkaEventSource and ChangeStreamEventSource.
 * 
 * Constructor Parameters:
 * This is an abstract base class - it should not be instantiated directly.
 * Subclasses define their own constructor parameters based on their specific requirements.
 * 
 * @abstract
 */
class EventSourceInterface {
    #isIterating = false;

    /**
     * Initialize the event source
     * @returns {Promise<void>} resolves when the source is ready
     */
    async initialize() {
        throw new Error('initialize() must be implemented by subclass');
    }

    /**
     * Get the next batch of events
     * @returns {Promise<{token: Object, events: Array<Object>}|null>} Next batch with token, or null if no more events
     * @protected
     */
    async getNext() {
        throw new Error('getNext() must be implemented by subclass');
    }

    /**
     * Acknowledge successful processing of a batch
     * @param {Object} token - Token received from getNext()
     * @returns {Promise<void>} resolves when acknowledged
     * @protected
     */
    async acknowledge(token) { // eslint-disable-line no-unused-vars
        throw new Error('acknowledge() must be implemented by subclass');
    }

    /**
     * Stop the event source
     * @returns {Promise<void>} resolves when the source is stopped
     */
    async stop() {
        throw new Error('stop() must be implemented by subclass');
    }

    /**
     * Self-contained async iterator with automatic resource cleanup
     * Usage: for await (const {token, events} of eventSource) { ... }
     * 
     * Acknowledgment semantics:
     * - Previous batch is acknowledged before yielding the next batch
     * - Final batch is acknowledged on clean exit (break/return)
     * - Final batch is NOT acknowledged if consumer throws (at-least-once delivery)
     * 
     * Resource management:
     * - Automatically stops the event source when iteration completes
     * - Handles early breaks, errors, and normal completion
     * - Prevents resource leaks from unclosed sources
     * 
     * @yields {{token: Object, events: Array<Object>}} Event batches
     */
    async *[Symbol.asyncIterator]() {
        if (this.#isIterating) {
            throw new Error('EventSource is already being iterated - create a new instance for parallel processing');
        }

        this.#isIterating = true;
        let lastToken = null;
        let didThrow = false;

        try {
            await this.initialize();

            // Main loop: ack previous, then fetch next, then yield
            // (ack happens only when caller asks for the next batch)
            // ensures at-least-once if caller throws before requesting next
            while (true) {
                if (lastToken) {
                    await this.acknowledge(lastToken);
                    lastToken = null;
                }

                const data = await this.getNext();
                if (!data) {
                    break;
                }

                lastToken = data.token;
                yield data; // if consumer breaks/throws here, finally runs
            }
        }
        catch (e) {
            didThrow = true;
            throw e;
        }
        finally {
            try {
                if (!didThrow && lastToken) {
                    // Clean exit: ack the last yielded batch
                    await this.acknowledge(lastToken);
                }
            }
            finally {
                await this.stop().catch(() => {}); // Ensure cleanup, ignore stop errors
                this.#isIterating = false;
            }
        }
    }

    /**
     * Check if the event source is currently being iterated
     * @returns {boolean} True if iteration is in progress
     */
    isIterating() {
        return this.#isIterating;
    }
}

module.exports = EventSourceInterface;