/**
 * Aggregator entry point - processes events and sessions from streams
 * @module api/aggregator
 */

import type { Db } from 'mongodb';
import { createRequire } from 'module';

import countlyConfig from './config.js';
import logModule from './utils/log.js';

// createRequire needed for CJS modules without ES exports
// @ts-expect-error TS1470 - import.meta is valid at runtime (Node 22 treats .ts with imports as ESM)
const require = createRequire(import.meta.url);
const plugins = require('../plugins/pluginManager.js');
import common from './utils/common.js';
import { WriteBatcher } from './parts/data/batcher.js';
import { Cacher } from './parts/data/cacher.js';
import QueryRunner from './parts/data/QueryRunner.js';

// Core aggregators
import './init_configs.js';
import './aggregator/processing.js';

const log = logModule('aggregator-core:api');

/**
 * Event data structure from database
 */
interface EventData {
    /** Event list array */
    list?: string[];
    /** Transformed event list object */
    _list?: Record<string, boolean>;
    /** Transformed event list length */
    _list_length?: number;
    /** Segments by event name */
    segments?: Record<string, string[]>;
    /** Transformed segments object */
    _segments?: Record<string, {
        _list: Record<string, boolean>;
        _list_length: number;
    }>;
    /** Omitted segments by event name */
    omitted_segments?: Record<string, string[]>;
    /** Transformed omitted segments */
    _omitted_segments?: Record<string, Record<string, boolean>>;
    /** Whitelisted segments by event name */
    whitelisted_segments?: Record<string, string[]>;
    /** Transformed whitelisted segments */
    _whitelisted_segments?: Record<string, Record<string, boolean>>;
}

/**
 * Transformation functions interface for ReadBatcher
 */
interface TransformationFunctions {
    [key: string]: (data: any) => any;
}

/**
 * Extended common module with aggregator batchers
 */
interface AggregatorCommon {
    db: Db;
    drillDb: Db;
    writeBatcher: InstanceType<typeof WriteBatcher>;
    secondaryWriteBatcher: InstanceType<typeof WriteBatcher>;
    manualWriteBatcher: InstanceType<typeof WriteBatcher>;
    readBatcher: InstanceType<typeof Cacher> & {
        transformationFunctions: TransformationFunctions;
    };
    queryRunner: InstanceType<typeof QueryRunner>;
}

const t = ['countly:', 'aggregator'];
t.push('node');

// Finally set the visible title
process.title = t.join(' ');

console.log('Connecting to databases');

// Overriding function
plugins.loadConfigs = plugins.loadConfigsIngestor;

plugins.connectToAllDatabases(true).then(function() {
    log.i('Db connections done');

    common.writeBatcher = new WriteBatcher(common.db);
    common.secondaryWriteBatcher = new WriteBatcher(common.db); // Remove once all plugins are updated
    common.manualWriteBatcher = new WriteBatcher(common.db, true); // Manually triggerable batcher
    common.readBatcher = new Cacher(common.db); // Used for Apps info
    common.queryRunner = new QueryRunner();

    // Ensure TTL indexes for Kafka consumer state and health (if Kafka enabled)
    if (countlyConfig.kafka?.enabled && countlyConfig.kafka?.batchDeduplication !== false) {
        common.db.collection('kafka_consumer_state').createIndex(
            { lastProcessedAt: 1 },
            { expireAfterSeconds: 604800, background: true } // 7 days TTL
        ).then(() => {
            log.i('Kafka batch deduplication TTL index ensured on kafka_consumer_state');
        }).catch((e: Error) => {
            // Index may already exist or other non-fatal error
            log.d('Kafka consumer state index creation:', e.message);
        });

        // TTL index for consumer health stats (rebalances, errors, lag)
        common.db.collection('kafka_consumer_health').createIndex(
            { updatedAt: 1 },
            { expireAfterSeconds: 604800, background: true } // 7 days TTL
        ).then(() => {
            log.i('Kafka consumer health TTL index ensured on kafka_consumer_health');
        }).catch((e: Error) => {
            // Index may already exist or other non-fatal error
            log.d('Kafka consumer health index creation:', e.message);
        });

        // Create capped collection for lag history (1000 snapshots, ~5MB)
        // Capped collections automatically delete oldest documents when full (FIFO)
        common.db.listCollections({ name: 'kafka_lag_history' }).toArray().then((collections: any[]) => {
            if (collections.length === 0) {
                common.db.createCollection('kafka_lag_history', {
                    capped: true,
                    size: 5 * 1024 * 1024, // 5MB max size
                    max: 1000 // 1000 documents max
                }).then(() => {
                    log.i('Kafka lag history capped collection created (max 1000 docs)');
                }).catch((e: Error) => {
                    log.d('Kafka lag history collection creation:', e.message);
                });
            }
            else {
                log.d('Kafka lag history collection already exists');
            }
        }).catch((e: Error) => {
            log.d('Kafka lag history collection check:', e.message);
        });
    }

    common.readBatcher.transformationFunctions = {
        /**
         * Transform event data from array format to object format for faster lookups
         * @param data - Event data from database
         * @returns Transformed event data
         */
        'event_object': function(data: EventData): EventData {
            if (data && data.list) {
                data._list = {};
                data._list_length = 0;
                for (let i = 0; i < data.list.length; i++) {
                    data._list[data.list[i]] = true;
                    data._list_length++;
                }
            }
            if (data && data.segments) {
                data._segments = {};
                for (const key in data.segments) {
                    data._segments[key] = {
                        _list: {},
                        _list_length: 0
                    };
                    for (let i = 0; i < data.segments[key].length; i++) {
                        data._segments[key]._list[data.segments[key][i]] = true;
                        data._segments[key]._list_length++;
                    }
                }
            }
            if (data && data.omitted_segments) {
                data._omitted_segments = {};
                for (const key3 in data.omitted_segments) {
                    for (let i = 0; i < data.omitted_segments[key3].length; i++) {
                        data._omitted_segments[key3] = data._omitted_segments[key3] || {};
                        data._omitted_segments[key3][data.omitted_segments[key3][i]] = true;
                    }
                }
            }

            if (data && data.whitelisted_segments) {
                data._whitelisted_segments = {};
                for (const key4 in data.whitelisted_segments) {
                    for (let i = 0; i < data.whitelisted_segments[key4].length; i++) {
                        data._whitelisted_segments[key4] = data._whitelisted_segments[key4] || {};
                        data._whitelisted_segments[key4][data.whitelisted_segments[key4][i]] = true;
                    }
                }
            }
            return data;
        }
    };

    /**
     * Trying to gracefully handle the batch state
     * @param code - Exit code or signal
     */
    async function storeBatchedData(code: number | string): Promise<void> {
        try {
            await common.writeBatcher.flushAll();
            console.log('Successfully stored batch state');
        }
        catch (ex) {
            console.log('Could not store batch state', ex);
        }
        process.exit(typeof code === 'number' ? code : 1);
    }

    /**
     * Handle before exit for graceful close
     */
    process.on('beforeExit', (code: number) => {
        console.log('Received exit, trying to save batch state:', code);
        storeBatchedData(code);
    });

    /**
     * Handle exit events for graceful close
     */
    const signals: NodeJS.Signals[] = [
        'SIGHUP', 'SIGINT', 'SIGQUIT', 'SIGILL', 'SIGTRAP', 'SIGABRT',
        'SIGBUS', 'SIGFPE', 'SIGSEGV', 'SIGTERM'
    ];

    for (const sig of signals) {
        process.on(sig, async function() {
            storeBatchedData(sig);
            plugins.dispatch('/aggregator/exit');
            console.log('Got signal: ' + sig);
        });
    }

    /**
     * Uncaught Exception Handler
     */
    process.on('uncaughtException', (err: Error) => {
        console.log('Caught exception: %j', err, err.stack);
        if (log && log.e) {
            log.e('Logging caught exception');
        }
        console.trace();
        plugins.dispatch('/aggregator/exit');
        storeBatchedData(1);
    });

    /**
     * Unhandled Rejection Handler
     */
    process.on('unhandledRejection', (reason: any, p: Promise<any>) => {
        console.log('Unhandled rejection for %j with reason %j stack', p, reason, reason ? reason.stack : undefined);
        if (log && log.e) {
            log.e('Logging unhandled rejection');
        }
        console.trace();
    });

    console.log('Starting aggregator', process.pid);

    plugins.init({ 'skipDependencies': true, 'filename': 'aggregator' });
    plugins.loadConfigs(common.db, async function() {
        plugins.dispatch('/aggregator', { common: common });
    });
});

// Export types for use by other modules
export type { EventData, TransformationFunctions, AggregatorCommon };
