/**
 * Kafka implementation of EventSinkInterface
 * Lightweight wrapper around existing KafkaProducer for writing events to Kafka
 * @module api/eventSink/KafkaEventSink
 */

import type { BulkWriteOperation, EventSinkResult } from './EventSinkInterface.js';

import { createRequire } from 'module';
// @ts-expect-error - import.meta is available at runtime with Node's native TypeScript support
const require = createRequire(import.meta.url);

const EventSinkInterface = require('./EventSinkInterface').default;
const { transformToKafkaEventFormat } = require('../utils/eventTransformer');
const Log = require('../utils/log.js');

/**
 * Logger interface for type safety
 */
interface Logger {
    d(...args: unknown[]): void;
    e(...args: unknown[]): void;
    i(...args: unknown[]): void;
    w(...args: unknown[]): void;
}

/**
 * Kafka client interface
 */
interface KafkaClient {
    connect(): Promise<void>;
    disconnect(): Promise<void>;
}

/**
 * Kafka producer send result
 */
interface KafkaProducerResult {
    success: boolean;
    sent?: number;
    message?: string;
}

/**
 * Kafka producer interface
 */
interface KafkaProducer {
    sendEvents(events: unknown[]): Promise<KafkaProducerResult>;
    disconnect(): Promise<void>;
}

/**
 * Transformed event format for Kafka
 */
type TransformedEvent = Record<string, unknown>;

/**
 * Event transformer function type
 */
type EventTransformer = (document: Record<string, unknown>) => TransformedEvent | null;

/**
 * Options for KafkaEventSink constructor
 */
export interface KafkaEventSinkOptions {
    /** Event transformer function (defaults to transformToKafkaEventFormat) */
    transformer?: EventTransformer;
    /** Prefix for transactional ID */
    transactionalIdPrefix?: string;
}

/**
 * Dependencies for KafkaEventSink (for testing and modularity)
 */
export interface KafkaEventSinkDependencies {
    /** Pre-initialized Kafka client */
    kafkaClient?: KafkaClient;
    /** Pre-initialized Kafka producer */
    kafkaProducer?: KafkaProducer;
    /** Logger instance */
    log?: Logger;
}

/**
 * Kafka implementation of EventSinkInterface
 * Lightweight wrapper around existing KafkaProducer for writing events to Kafka to conform to EventSinkInterface
 *
 * @DI Supports dependency injection for testing and modularity
 */
class KafkaEventSink extends EventSinkInterface {
    #log: Logger;
    #kafkaClient: KafkaClient | undefined;
    #kafkaProducer: KafkaProducer | undefined;
    #transformer: EventTransformer;
    #isConnected = false;

    /** Prefix for transactional ID */
    transactionalIdPrefix: string;

    /**
     * Create a KafkaEventSink instance
     * Uses existing Kafka infrastructure with minimal overhead
     *
     * @param options - Configuration options for the sink
     * @param dependencies - Optional dependency injection for testing and modularity
     */
    constructor(options: KafkaEventSinkOptions = {}, dependencies: KafkaEventSinkDependencies = {}) {
        super();
        this.#log = dependencies.log || Log('eventSink:kafka');
        this.#kafkaClient = dependencies.kafkaClient;
        this.#kafkaProducer = dependencies.kafkaProducer;
        this.#transformer = options.transformer || transformToKafkaEventFormat;
        this.transactionalIdPrefix = options.transactionalIdPrefix || 'countly-event-sink';
    }

    /**
     * Initialize the Kafka producer using existing infrastructure
     * @returns Promise that resolves when the sink is ready
     */
    async initialize(): Promise<void> {
        if (this.isInitialized()) {
            return;
        }

        try {
            if (!this.#kafkaClient) {
                const KafkaClient = require('../../plugins/kafka/api/lib/kafkaClient');
                this.#kafkaClient = new KafkaClient() as KafkaClient;
            }

            if (!this.#kafkaProducer) {
                const KafkaProducer = require('../../plugins/kafka/api/lib/kafkaProducer');
                const common = require('../utils/common.js');
                this.#kafkaProducer = new KafkaProducer(this.#kafkaClient, {
                    db: common.db
                }) as KafkaProducer;
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
     * @param bulkEvents - Array of bulkWrite operations from MongoDB format
     * @returns Promise with result object containing success status and metadata
     */
    async write(bulkEvents: BulkWriteOperation[]): Promise<EventSinkResult> {
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
            const events: TransformedEvent[] = [];

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
            const result = await this.#kafkaProducer!.sendEvents(events);

            const duration = Date.now() - startTime;

            if (result.success) {
                this.#log.d(`Successfully sent ${result.sent} events to Kafka in ${duration}ms`);

                return this._createResult(true, result.sent ?? 0, 'Events sent to Kafka successfully', {
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
     * @returns Promise that resolves when closed
     */
    async close(): Promise<void> {
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
     * @returns True if connected and ready
     */
    isConnected(): boolean {
        return this.#isConnected;
    }
}

export default KafkaEventSink;
export { KafkaEventSink };
