/**
 * UnifiedEventSink - High-level wrapper around EventSinkFactory
 *
 * This class provides a simplified interface for writing events to multiple sinks
 * with automatic configuration loading and sink management.
 *
 * @DI Supports dependency injection for testing and modularity
 * @module api/eventSink/UnifiedEventSink
 *
 * @example
 * const eventSink = new UnifiedEventSink();
 * await eventSink.write(bulkWriteOperations);
 * await eventSink.close();
 */

import type EventSinkInterface from './EventSinkInterface.js';
import type { BulkWriteOperation, EventSinkResult } from './EventSinkInterface.js';
import EventSinkFactory, { type EventSinkConfig } from './EventSinkFactory.js';
import countlyConfig from '../config.js';
import logModule from '../utils/log.js';

/** Logger interface */
interface Logger {
    d: (...args: unknown[]) => void;
    e: (...args: unknown[]) => void;
    i: (...args: unknown[]) => void;
    w: (...args: unknown[]) => void;
}

/** Per-sink result in unified response */
interface SinkResult extends EventSinkResult {
    error?: string;
}

/** Overall result summary */
interface OverallResult {
    success: boolean;
    written: number;
    message?: string;
    error?: string;
    duration?: number;
}

/** Unified write result */
export interface UnifiedWriteResult {
    overall: OverallResult;
    sinks: Record<string, SinkResult>;
}

/** Dependencies for UnifiedEventSink (for DI) */
export interface UnifiedEventSinkDependencies {
    /** Configuration override for testing */
    config?: EventSinkConfig;
    /** Logger instance */
    log?: Logger;
    /** Pre-initialized sinks array (for testing only) */
    sinks?: EventSinkInterface[];
}

/**
 * High-level wrapper around EventSinkFactory
 */
class UnifiedEventSink {
    #log: Logger;
    #config: EventSinkConfig;
    #sinks: EventSinkInterface[] = [];
    #initialized = false;
    #closed = false;

    /**
     * Create a UnifiedEventSink instance
     * Configuration is loaded automatically from the global config
     *
     * @param dependencies - Optional dependency injection for testing and modularity
     */
    constructor(dependencies: UnifiedEventSinkDependencies = {}) {
        this.#config = dependencies.config || countlyConfig;
        this.#log = dependencies.log || logModule('eventSink:unified') as Logger;

        // Allow injecting pre-initialized sinks for testing
        if (dependencies.sinks) {
            this.#sinks = dependencies.sinks;
            this.#initialized = true;
        }
        this.#log.d('UnifiedEventSink created');
    }

    /**
     * Initialize all configured sinks
     * This is called automatically on first write operation
     * @returns Promise that resolves when all sinks are initialized
     * @private
     */
    async #initialize(): Promise<void> {
        if (this.#initialized) {
            return;
        }
        if (this.#closed) {
            throw new Error('UnifiedEventSink has been closed and cannot be reused');
        }
        try {
            this.#sinks = EventSinkFactory.create(this.#config);
            // Initialize all sinks in parallel
            await Promise.all(this.#sinks.map(sink => sink.initialize()));
            this.#initialized = true;
            this.#log.i(`UnifiedEventSink initialized with ${this.#sinks.length} sink(s): ${
                this.#sinks.map(s => s.getType()).join(', ')
            }`);
        }
        catch (error) {
            this.#log.e('Failed to initialize UnifiedEventSink:', error);
            throw error;
        }
    }

    /**
     * Write events to all configured sinks in parallel
     *
     * @param events - Array of events (bulkWrite operations or event objects)
     * @returns Promise with result object containing per-sink status and overall summary
     *
     * @example
     * const result = await eventSink.write(events);
     * // result = {
     * //   overall: { success: true, written: 100 },
     * //   sinks: {
     * //     MongoEventSink: { success: true, written: 100 },
     * //     KafkaEventSink: { success: true, written: 100 }
     * //   }
     * // }
     */
    async write(events: BulkWriteOperation[]): Promise<UnifiedWriteResult> {
        if (this.#closed) {
            throw new Error('UnifiedEventSink has been closed');
        }

        // Lazy initialization on first write
        if (!this.#initialized) {
            await this.#initialize();
        }

        if (!events || !Array.isArray(events) || events.length === 0) {
            return {
                overall: { success: true, written: 0, message: 'No events to write' },
                sinks: {}
            };
        }

        const startTime = Date.now();
        try {
            this.#log.d(`Writing ${events.length} events to ${this.#sinks.length} sink(s)`);
            const results = await Promise.allSettled(
                this.#sinks.map(sink => sink.write(events))
            );
            const processedResults = this.#processResults(results);
            const duration = Date.now() - startTime;
            processedResults.overall.duration = duration;

            if (processedResults.overall.success) {
                this.#log.d(`Successfully wrote events in ${duration}ms - Total: ${processedResults.overall.written}`);
            }
            else {
                this.#log.e(`Failed to write events - ${processedResults.overall.error}`);
            }
            return processedResults;
        }
        catch (error) {
            const duration = Date.now() - startTime;
            this.#log.e('Unexpected error in UnifiedEventSink.write:', error);
            return {
                overall: {
                    success: false,
                    written: 0,
                    error: (error as Error).message,
                    duration
                },
                sinks: {}
            };
        }
    }

    /**
     * Close all sinks and clean up resources
     * @returns Promise that resolves when all sinks are closed
     */
    async close(): Promise<void> {
        if (this.#closed) {
            return;
        }
        this.#log.d('Closing UnifiedEventSink');
        try {
            // Close all sinks in parallel, ignoring individual failures
            await Promise.all(
                this.#sinks.map(sink =>
                    sink.close().catch(error => {
                        this.#log.w(`Error closing ${sink.getType()}:`, error);
                    })
                )
            );
        }
        catch (error) {
            this.#log.w('Error during UnifiedEventSink cleanup:', error);
        }
        finally {
            this.#closed = true;
            this.#initialized = false;
            this.#sinks = []; // clear references
            this.#log.d('UnifiedEventSink closed');
        }
    }

    /**
     * Get the configured sink types
     * @returns Array of sink type names
     */
    getSinkTypes(): string[] {
        if (!this.#initialized) {
            return this.#config.eventSink?.sinks || ['mongo'];
        }
        return this.#sinks.map(sink => sink.getType());
    }

    /**
     * Check if the sink is initialized and ready
     * @returns True if initialized
     */
    isInitialized(): boolean {
        return this.#initialized;
    }

    /**
     * Check if the sink is closed
     * @returns True if closed
     */
    isClosed(): boolean {
        return this.#closed;
    }

    /**
     * Process results from parallel sink writes
     * @param results - Results from Promise.allSettled
     * @returns Processed results with overall status and per-sink details
     * @private
     */
    #processResults(results: PromiseSettledResult<EventSinkResult>[]): UnifiedWriteResult {
        const processed: UnifiedWriteResult = {
            overall: { success: true, written: 0 },
            sinks: {}
        };

        let hasMongoSuccess = false;

        for (let i = 0; i < results.length; i++) {
            const sink = this.#sinks[i];
            const result = results[i];
            const sinkType = sink.getType();

            if (result.status === 'fulfilled') {
                // Success case
                processed.sinks[sinkType] = result.value;
                processed.overall.written += result.value.written || 0;

                if (sinkType === 'MongoEventSink') {
                    hasMongoSuccess = true;
                }
            }
            else {
                // Failure case
                processed.sinks[sinkType] = {
                    success: false,
                    written: 0,
                    error: result.reason?.message || 'Unknown error',
                    type: sinkType,
                    timestamp: new Date()
                };
                this.#log.w(`${sinkType} write failed:`, result.reason);
            }
        }

        // Overall success depends on MongoDB success (primary sink)
        // Kafka failures are treated as warnings, not overall failures
        if (!hasMongoSuccess && processed.sinks.MongoEventSink) {
            processed.overall.success = false;
            processed.overall.error = processed.sinks.MongoEventSink.error;
        }

        // If no MongoDB sink was configured or it succeeded, check if we have any success
        if (hasMongoSuccess || !processed.sinks.MongoEventSink) {
            const anySuccess = Object.values(processed.sinks).some(sink => sink.success);
            if (!anySuccess) {
                processed.overall.success = false;
                processed.overall.error = 'All sinks failed';
            }
        }

        return processed;
    }
}

export default UnifiedEventSink;
