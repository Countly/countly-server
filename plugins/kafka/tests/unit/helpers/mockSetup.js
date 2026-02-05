/**
 * Mock setup for Kafka plugin unit tests.
 * Provides isolated mocking for core dependencies without real connections.
 */
const Module = require('module');

// Store original Module._load
const originalLoad = Module._load;
let mockingEnabled = false;

/**
 * Mock logger that mimics countly log interface
 * @param {string} prefix - Logger prefix
 * @returns {Object} Mock logger with all standard methods
 */
function createMockLogger(prefix) {
    const noop = () => {};
    const logger = {
        d: noop,
        i: noop,
        w: noop,
        e: noop, // Suppress error logging in tests
        debug: noop,
        info: noop,
        warn: noop,
        error: noop // Suppress error logging in tests
    };
    return logger;
}

/**
 * Create a mock Kafka config for testing
 * @returns {Object} Mock Kafka configuration
 */
function createMockKafkaConfig() {
    return {
        kafka: {
            enabled: true,
            drillEventsTopic: 'test-drill-events',
            groupIdPrefix: 'test_',
            partitions: 1,
            replicationFactor: 1,
            batchDeduplication: true,
            rdkafka: {
                brokers: ['localhost:9092'],
                clientId: 'test-client',
                requestTimeoutMs: 5000,
                connectionTimeoutMs: 3000
            },
            consumer: {
                sessionTimeoutMs: 10000,
                heartbeatIntervalMs: 3000,
                autoOffsetReset: 'earliest',
                enableAutoCommit: false
            }
        },
        eventSink: {
            sinks: ['mongo', 'kafka']
        }
    };
}

/**
 * Create a mock MongoDB database for testing
 * @returns {Object} Mock database object
 */
function createMockDb() {
    const collections = {};

    return {
        collection: (name) => {
            if (!collections[name]) {
                collections[name] = createMockCollection(name);
            }
            return collections[name];
        },
        _collections: collections
    };
}

/**
 * Create a mock MongoDB collection
 * @param {string} name - Collection name
 * @returns {Object} Mock collection object
 */
function createMockCollection(name) {
    const documents = [];

    return {
        name,
        documents,
        findOne: async(query) => {
            return documents.find(doc => {
                if (query._id) {
                    return doc._id === query._id;
                }
                return true;
            }) || null;
        },
        find: (query) => ({
            toArray: async() => documents.filter(doc => {
                if (!query) {
                    return true;
                }
                return true;
            })
        }),
        insertOne: async(doc) => {
            documents.push(doc);
            return { insertedId: doc._id || 'mock-id' };
        },
        updateOne: async(filter, update, options = {}) => {
            const existing = documents.find(d => d._id === filter._id);
            if (existing) {
                if (update.$set) {
                    // Handle nested paths like 'partitions.0.offset'
                    for (const [key, val] of Object.entries(update.$set)) {
                        if (key.includes('.')) {
                            const parts = key.split('.');
                            let obj = existing;
                            for (let i = 0; i < parts.length - 1; i++) {
                                if (!obj[parts[i]]) {
                                    obj[parts[i]] = {};
                                }
                                obj = obj[parts[i]];
                            }
                            obj[parts[parts.length - 1]] = val;
                        }
                        else {
                            existing[key] = val;
                        }
                    }
                }
                if (update.$inc) {
                    for (const [key, val] of Object.entries(update.$inc)) {
                        existing[key] = (existing[key] || 0) + val;
                    }
                }
                if (update.$unset) {
                    for (const key of Object.keys(update.$unset)) {
                        if (key.includes('.')) {
                            const parts = key.split('.');
                            let obj = existing;
                            for (let i = 0; i < parts.length - 1; i++) {
                                if (!obj[parts[i]]) {
                                    break;
                                }
                                obj = obj[parts[i]];
                            }
                            if (obj) {
                                delete obj[parts[parts.length - 1]];
                            }
                        }
                        else {
                            delete existing[key];
                        }
                    }
                }
                return { modifiedCount: 1, matchedCount: 1 };
            }
            else if (options.upsert) {
                const newDoc = { _id: filter._id };
                if (update.$set) {
                    Object.assign(newDoc, update.$set);
                }
                if (update.$setOnInsert) {
                    Object.assign(newDoc, update.$setOnInsert);
                }
                documents.push(newDoc);
                return { upsertedCount: 1, upsertedId: filter._id };
            }
            return { modifiedCount: 0, matchedCount: 0 };
        },
        deleteOne: async(filter) => {
            const idx = documents.findIndex(d => d._id === filter._id);
            if (idx >= 0) {
                documents.splice(idx, 1);
                return { deletedCount: 1 };
            }
            return { deletedCount: 0 };
        },
        createIndex: async() => ({ ok: 1 }),
        bulkWrite: async(ops) => {
            let insertedCount = 0;
            for (const op of ops) {
                if (op.insertOne) {
                    documents.push(op.insertOne.document);
                    insertedCount++;
                }
            }
            return { insertedCount };
        },
        distinct: async(field) => {
            const values = new Set();
            for (const doc of documents) {
                if (doc[field] !== undefined && doc[field] !== null) {
                    values.add(doc[field]);
                }
            }
            return Array.from(values);
        },
        countDocuments: async(query = {}) => {
            if (Object.keys(query).length === 0) {
                return documents.length;
            }
            return documents.filter(doc => {
                for (const [key, value] of Object.entries(query)) {
                    if (doc[key] !== value) {
                        return false;
                    }
                }
                return true;
            }).length;
        },
        estimatedDocumentCount: async() => documents.length,
        _reset: () => {
            documents.length = 0;
        }
    };
}

/**
 * Create a mock KafkaConsumer class for testing
 * @returns {Function} Mock KafkaConsumer constructor
 */
function createMockKafkaConsumer() {
    return class MockKafkaConsumer {
        constructor(client, name, options = {}) {
            this.client = client;
            this.name = name;
            this.options = options;
            this.groupId = `${options.groupIdPrefix || 'test_'}${name}`;
            this.isRunning = false;
            this._handler = null;
        }

        async start(handler) {
            this._handler = handler;
            this.isRunning = true;
        }

        async stop() {
            this.isRunning = false;
        }

        // Helper for tests to simulate receiving a batch
        async _simulateBatch(topic, partition, records) {
            if (this._handler) {
                return this._handler({ topic, partition, records });
            }
        }
    };
}

/**
 * Create a mock KafkaProducer class for testing
 * @returns {Function} Mock KafkaProducer constructor
 */
function createMockKafkaProducer() {
    return class MockKafkaProducer {
        constructor(client, options = {}) {
            this.client = client;
            this.options = options;
            this.isConnected = false;
            this.sentEvents = [];
        }

        async sendEvents(events) {
            this.sentEvents.push(...events);
            return { success: true, sent: events.length };
        }

        async disconnect() {
            this.isConnected = false;
        }
    };
}

/**
 * Create a mock KafkaClient class for testing
 * @param {Object} options - Options for the mock
 * @param {string} options.clusterId - Mock cluster ID to return
 * @param {boolean} options.clusterMetadataError - If true, getClusterMetadata will throw
 * @returns {Function} Mock KafkaClient constructor
 */
function createMockKafkaClient(options = {}) {
    const { clusterId = 'mock-cluster-id-12345', clusterMetadataError = false } = options;

    return class MockKafkaClient {
        constructor() {
            this.isConnected = false;
        }

        getKafka() {
            return {
                admin: () => ({
                    connect: async() => {},
                    disconnect: async() => {},
                    listTopics: async() => []
                })
            };
        }

        async getClusterMetadata() {
            if (clusterMetadataError) {
                throw new Error('Failed to fetch cluster metadata');
            }
            return {
                clusterId: clusterId,
                brokers: [{ nodeId: 1, host: 'localhost', port: 9092 }]
            };
        }
    };
}

/**
 * Setup module mocking for core dependencies.
 * Must be called before requiring any plugin modules that depend on core.
 */
function setupMocking() {
    if (mockingEnabled) {
        return;
    }

    Module._load = function(request, parent) {
        // Mock the log.js module from core
        if (request.includes('api/utils/log.js') || request.includes('api/utils/log')) {
            return function(prefix) {
                return createMockLogger(prefix);
            };
        }

        // Mock common.js if needed
        if (request.includes('api/utils/common.js') || request.includes('api/utils/common')) {
            return {
                log: createMockLogger('common'),
                db: createMockDb(),
                drillDb: createMockDb()
            };
        }

        // Mock the config module
        if (request.includes('api/config') && !request.includes('config.sample') && !request.includes('configextender')) {
            return createMockKafkaConfig();
        }

        return originalLoad.apply(this, arguments);
    };

    mockingEnabled = true;
}

/**
 * Reset module mocking
 */
function resetMocking() {
    Module._load = originalLoad;
    mockingEnabled = false;
}

// Setup mocking immediately when this module is loaded
//setupMocking();

/**
 * Create a mock EventSink for testing
 * @param {string} name - Sink type name
 * @param {Object} options - Options for the mock
 * @returns {Object} Mock event sink
 */
function createMockEventSink(name, options = {}) {
    let initialized = false;
    let closed = false;
    const writtenEvents = [];

    return {
        getType: () => name,
        isInitialized: () => initialized,
        isClosed: () => closed,
        initialize: async() => {
            if (options.initError) {
                throw new Error(options.initError);
            }
            initialized = true;
        },
        write: async(events) => {
            if (options.writeError) {
                throw new Error(options.writeError);
            }
            writtenEvents.push(...events);
            return {
                success: true,
                written: events.length,
                type: name
            };
        },
        close: async() => {
            if (options.closeError) {
                throw new Error(options.closeError);
            }
            closed = true;
        },
        writtenEvents,
        _reset: () => {
            initialized = false;
            closed = false;
            writtenEvents.length = 0;
        }
    };
}

/**
 * Create a mock EventSource for testing processWithAutoAck
 * @returns {Object} Mock event source with controllable batches
 */
function createMockEventSource() {
    let initialized = false;
    let stopped = false;
    const batches = [];
    let currentBatchIndex = 0;
    let lastAcknowledgedToken = null;
    let markBatchProcessedCalls = [];

    const source = {
        async initialize() {
            initialized = true;
        },
        async getNext() {
            if (stopped || currentBatchIndex >= batches.length) {
                return null;
            }
            return batches[currentBatchIndex++];
        },
        async acknowledge(token) {
            lastAcknowledgedToken = token;
        },
        async markBatchProcessed(token) {
            markBatchProcessedCalls.push(token);
        },
        async stop() {
            stopped = true;
        },
        async *[Symbol.asyncIterator]() {
            await this.initialize();
            let lastToken = null;
            while (true) {
                if (lastToken) {
                    await this.acknowledge(lastToken);
                }
                const data = await this.getNext();
                if (!data) {
                    break;
                }
                lastToken = data.token;
                yield data;
            }
            await this.stop();
        },
        // Test helpers
        isInitialized: () => initialized,
        isStopped: () => stopped,
        addBatch: (batch) => batches.push(batch),
        getLastAcknowledgedToken: () => lastAcknowledgedToken,
        getMarkBatchProcessedCalls: () => markBatchProcessedCalls,
        _reset: () => {
            initialized = false;
            stopped = false;
            batches.length = 0;
            currentBatchIndex = 0;
            lastAcknowledgedToken = null;
            markBatchProcessedCalls = [];
        }
    };

    return source;
}

module.exports = {
    setupMocking,
    resetMocking,
    createMockLogger,
    createMockKafkaConfig,
    createMockDb,
    createMockCollection,
    createMockKafkaConsumer,
    createMockKafkaProducer,
    createMockKafkaClient,
    createMockEventSink,
    createMockEventSource
};
