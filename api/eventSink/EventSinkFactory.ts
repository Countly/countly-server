/**
 * Factory class for creating appropriate EventSink instances
 * @DI Supports dependency injection for testing and modularity
 * @module api/eventSink/EventSinkFactory
 */

import { createRequire } from 'module';
import type EventSinkInterface from './EventSinkInterface.js';
import MongoEventSink, { type MongoEventSinkOptions } from './MongoEventSink.js';
import logModule from '../utils/log.js';

// createRequire needed for CJS modules without ES exports
// @ts-expect-error TS1470 - import.meta is valid at runtime (Node 22 treats .ts with imports as ESM)
const require = createRequire(import.meta.url);

/** Logger interface */
interface Logger {
    d: (...args: unknown[]) => void;
    e: (...args: unknown[]) => void;
    i: (...args: unknown[]) => void;
    w: (...args: unknown[]) => void;
}

/** Event sink configuration */
export interface EventSinkConfig {
    eventSink?: {
        sinks?: string[];
    };
    kafka?: {
        enabled?: boolean;
    };
}

/** Options for sink creation */
export interface EventSinkFactoryOptions {
    mongo?: MongoEventSinkOptions;
    kafka?: Record<string, unknown>;
}

/** Dependencies for EventSinkFactory (for DI) */
export interface EventSinkFactoryDependencies {
    /** Logger instance */
    log?: Logger;
}

/**
 * Factory class for creating appropriate EventSink instances
 */
class EventSinkFactory {
    /**
     * Create appropriate event sink(s) based on configuration
     *
     * @param config - Configuration object (typically from countlyConfig)
     * @param options - Additional options for sink creation
     * @param dependencies - Optional dependency injection for testing and modularity
     * @returns Array of sink instances
     */
    static create(
        config: EventSinkConfig,
        options: EventSinkFactoryOptions = {},
        dependencies: EventSinkFactoryDependencies = {}
    ): EventSinkInterface[] {
        const log: Logger = dependencies.log || logModule('eventSink:factory') as Logger;

        if (!config) {
            throw new Error('Configuration is required for EventSinkFactory');
        }

        const sinks: EventSinkInterface[] = [];
        const configuredSinks = config.eventSink?.sinks || ['mongo'];

        if (!Array.isArray(configuredSinks) || configuredSinks.length === 0) {
            EventSinkFactory.#fatalSinkCreation('Invalid or empty eventSink.sinks configuration');
        }

        if (configuredSinks.includes('mongo')) {
            try {
                const mongoSink = new MongoEventSink(options.mongo || {}, {});
                sinks.push(mongoSink);
                log.d('Created MongoEventSink');
            }
            catch (error) {
                EventSinkFactory.#fatalSinkCreation('Failed to create MongoEventSink', error as Error);
            }
        }

        if (configuredSinks.includes('kafka')) {
            if (!config.kafka?.enabled) {
                EventSinkFactory.#fatalSinkCreation('Kafka sink configured but kafka.enabled is false');
            }
            try {
                EventSinkFactory.#validateKafkaAvailability();
                const KafkaEventSink = require('./KafkaEventSink.js');
                const kafkaSink = new KafkaEventSink(options.kafka || {}, {});
                sinks.push(kafkaSink);
                log.d('Created KafkaEventSink');
            }
            catch (error) {
                log.e('Kafka sink creation failed:', error);
                EventSinkFactory.#fatalSinkCreation('Failed to create KafkaEventSink', error as Error);
            }
        }

        if (sinks.length === 0) {
            log.e('No valid sinks were created from configuration:', configuredSinks);
            EventSinkFactory.#fatalSinkCreation('No sinks were created from configuration');
        }

        log.i(`EventSinkFactory created ${sinks.length} sink(s): ${sinks.map(s => s.getType()).join(', ')}`);
        return sinks;
    }

    /**
     * Validate that Kafka modules are available
     * @throws Error if Kafka modules cannot be loaded
     * @private
     */
    static #validateKafkaAvailability(): void {
        try {
            // Try to require Kafka modules to ensure they're available
            require('../../plugins/kafka/api/lib/kafkaClient');
            require('../../plugins/kafka/api/lib/kafkaProducer');
        }
        catch (error) {
            throw new Error(`Kafka modules not available: ${(error as Error).message}`);
        }
    }

    /**
     * Handle fatal errors during sink creation.
     * Logs the error, terminates the process, and throws to satisfy control flow.
     * @param msg - Error message to log
     * @param error - Optional underlying error
     * @private
     */
    static #fatalSinkCreation(msg: string, error?: Error): never {
        // Keep throw for testability and static analysis; not reached at runtime after exit()
        throw new Error(error?.message ? `${msg}: ${error.message}` : msg);
    }
}

export default EventSinkFactory;
