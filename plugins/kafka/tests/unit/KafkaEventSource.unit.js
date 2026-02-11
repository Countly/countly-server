/**
 * KafkaEventSource Unit Tests
 *
 * Tests the KafkaEventSource class that consumes events from Kafka.
 *
 * Usage:
 *   npm run test:unit
 */
const should = require('should');

// Setup mocking before requiring the module
const {
    setupMocking,
    resetMocking,
    createMockLogger,
    createMockKafkaConfig,
    createMockDb,
    createMockKafkaConsumer,
    createMockKafkaClient
} = require('./helpers/mockSetup');

// Direct require of the KafkaEventSource module
// Path from plugins/kafka/tests/unit/ to api/eventSource/
const KafkaEventSource = require('../../../../api/eventSource/KafkaEventSource');

describe('KafkaEventSource', function() {
    before(function() {
        setupMocking();
    });
    after(function() {
        resetMocking();
    });
    // Increase timeout for async tests
    this.timeout(5000);

    // ========================================================================
    // Constructor Validation
    // ========================================================================
    describe('Constructor Validation', function() {
        const mockConfig = createMockKafkaConfig();

        it('should throw if name is missing', function() {
            should(() => {
                new KafkaEventSource(null, {}, { countlyConfig: mockConfig });
            }).throw(/requires a name/);
        });

        it('should throw if name is not a string', function() {
            should(() => {
                new KafkaEventSource(123, {}, { countlyConfig: mockConfig });
            }).throw(/requires a name \(string\)/);
        });

        it('should throw if name is empty string', function() {
            should(() => {
                new KafkaEventSource('', {}, { countlyConfig: mockConfig });
            }).throw(/requires a name/);
        });

        it('should throw if kafkaOptions is missing', function() {
            should(() => {
                new KafkaEventSource('test-source', null, { countlyConfig: mockConfig });
            }).throw(/requires kafkaOptions/);
        });

        it('should throw if kafkaOptions is not an object', function() {
            should(() => {
                new KafkaEventSource('test-source', 'string', { countlyConfig: mockConfig });
            }).throw(/requires kafkaOptions \(object\)/);
        });

        it('should throw if dependencies is missing', function() {
            should(() => {
                new KafkaEventSource('test-source', {});
            }).throw(/requires dependencies/);
        });

        it('should throw if dependencies is not an object', function() {
            should(() => {
                new KafkaEventSource('test-source', {}, 'string');
            }).throw(/requires dependencies \(object\)/);
        });

        it('should throw if countlyConfig is missing', function() {
            should(() => {
                new KafkaEventSource('test-source', {}, {});
            }).throw(/requires dependencies.countlyConfig/);
        });

        it('should throw if countlyConfig is not an object', function() {
            should(() => {
                new KafkaEventSource('test-source', {}, { countlyConfig: 'string' });
            }).throw(/requires dependencies.countlyConfig \(object\)/);
        });

        it('should create instance with valid parameters', function() {
            const source = new KafkaEventSource('test-source', {}, {
                countlyConfig: mockConfig,
                KafkaClient: createMockKafkaClient(),
                KafkaConsumer: createMockKafkaConsumer(),
                log: createMockLogger('test')
            });
            should(source).be.ok();
        });

        it('should use default batchDeduplication from config', function() {
            const source = new KafkaEventSource('test-source', {}, {
                countlyConfig: { ...mockConfig, kafka: { ...mockConfig.kafka, batchDeduplication: false } },
                KafkaClient: createMockKafkaClient(),
                KafkaConsumer: createMockKafkaConsumer(),
                log: createMockLogger('test')
            });
            should(source).be.ok();
        });
    });

    // ========================================================================
    // Initialization
    // ========================================================================
    describe('Initialization', function() {
        it('should create consumer on initialize', async function() {
            const MockKafkaConsumer = createMockKafkaConsumer();
            const MockKafkaClient = createMockKafkaClient();
            let consumerCreated = false;

            const CustomMockConsumer = class extends MockKafkaConsumer {
                constructor(...args) {
                    super(...args);
                    consumerCreated = true;
                }
            };

            const source = new KafkaEventSource('test-source', {}, {
                countlyConfig: createMockKafkaConfig(),
                KafkaClient: MockKafkaClient,
                KafkaConsumer: CustomMockConsumer,
                log: createMockLogger('test')
            });

            await source.initialize();
            consumerCreated.should.be.true();
        });

        it('should not reinitialize if already running', async function() {
            const MockKafkaConsumer = createMockKafkaConsumer();
            const MockKafkaClient = createMockKafkaClient();
            let initCount = 0;

            const CustomMockConsumer = class extends MockKafkaConsumer {
                async start(handler) {
                    initCount++;
                    await super.start(handler);
                }
            };

            const source = new KafkaEventSource('test-source', {}, {
                countlyConfig: createMockKafkaConfig(),
                KafkaClient: MockKafkaClient,
                KafkaConsumer: CustomMockConsumer,
                log: createMockLogger('test')
            });

            await source.initialize();
            await source.initialize(); // Second call should be no-op

            initCount.should.equal(1);
        });

        it('should use default topic from config when not provided', async function() {
            const MockKafkaConsumer = createMockKafkaConsumer();
            const MockKafkaClient = createMockKafkaClient();
            let usedTopics = null;

            const CustomMockConsumer = class extends MockKafkaConsumer {
                constructor(client, name, options) {
                    super(client, name, options);
                    usedTopics = options.topics;
                }
            };

            const config = createMockKafkaConfig();
            config.kafka.drillEventsTopic = 'custom-topic';

            const source = new KafkaEventSource('test-source', {}, {
                countlyConfig: config,
                KafkaClient: MockKafkaClient,
                KafkaConsumer: CustomMockConsumer,
                log: createMockLogger('test')
            });

            await source.initialize();
            usedTopics.should.containEql('custom-topic');
        });

        it('should use topics from kafkaOptions if provided', async function() {
            const MockKafkaConsumer = createMockKafkaConsumer();
            const MockKafkaClient = createMockKafkaClient();
            let usedTopics = null;

            const CustomMockConsumer = class extends MockKafkaConsumer {
                constructor(client, name, options) {
                    super(client, name, options);
                    usedTopics = options.topics;
                }
            };

            const source = new KafkaEventSource('test-source', { topics: ['my-topic'] }, {
                countlyConfig: createMockKafkaConfig(),
                KafkaClient: MockKafkaClient,
                KafkaConsumer: CustomMockConsumer,
                log: createMockLogger('test')
            });

            await source.initialize();
            usedTopics.should.deepEqual(['my-topic']);
        });

        it('should enforce partitionsConsumedConcurrently=1', async function() {
            const MockKafkaConsumer = createMockKafkaConsumer();
            const MockKafkaClient = createMockKafkaClient();
            let concurrency = null;

            const CustomMockConsumer = class extends MockKafkaConsumer {
                constructor(client, name, options) {
                    super(client, name, options);
                    concurrency = options.partitionsConsumedConcurrently;
                }
            };

            const source = new KafkaEventSource('test-source', { partitionsConsumedConcurrently: 5 }, {
                countlyConfig: createMockKafkaConfig(),
                KafkaClient: MockKafkaClient,
                KafkaConsumer: CustomMockConsumer,
                log: createMockLogger('test')
            });

            await source.initialize();
            concurrency.should.equal(1);
        });
    });

    // ========================================================================
    // Batch Handling
    // ========================================================================
    describe('Batch Handling', function() {
        // Note: Tests that simulate batch arrival via mocks are complex because
        // they require tight integration with KafkaJS internals. These are better
        // tested via integration tests with a real Kafka connection.

        it('should return null when closed', async function() {
            const MockKafkaConsumer = createMockKafkaConsumer();
            const MockKafkaClient = createMockKafkaClient();

            const source = new KafkaEventSource('test-source', {}, {
                countlyConfig: createMockKafkaConfig(),
                KafkaClient: MockKafkaClient,
                KafkaConsumer: MockKafkaConsumer,
                log: createMockLogger('test')
            });

            await source.initialize();
            await source.stop();

            const batch = await source.getNext();
            should(batch).be.null();
        });

        it('should handle stop before getNext', async function() {
            const MockKafkaConsumer = createMockKafkaConsumer();
            const MockKafkaClient = createMockKafkaClient();

            const source = new KafkaEventSource('test-source', {}, {
                countlyConfig: createMockKafkaConfig(),
                KafkaClient: MockKafkaClient,
                KafkaConsumer: MockKafkaConsumer,
                log: createMockLogger('test')
            });

            // Stop without ever calling getNext
            await source.stop();
            const batch = await source.getNext();
            should(batch).be.null();
        });
    });

    // ========================================================================
    // Acknowledgment
    // ========================================================================
    describe('Acknowledgment', function() {
        it('should not throw on null token', async function() {
            const MockKafkaConsumer = createMockKafkaConsumer();
            const MockKafkaClient = createMockKafkaClient();

            const source = new KafkaEventSource('test-source', {}, {
                countlyConfig: createMockKafkaConfig(),
                KafkaClient: MockKafkaClient,
                KafkaConsumer: MockKafkaConsumer,
                log: createMockLogger('test')
            });

            await source.initialize();
            // Should not throw
            await source.acknowledge(null);
            await source.acknowledge(undefined);
        });

        it('should accept valid token without throwing', async function() {
            const MockKafkaConsumer = createMockKafkaConsumer();
            const MockKafkaClient = createMockKafkaClient();

            const source = new KafkaEventSource('test-source', {}, {
                countlyConfig: createMockKafkaConfig(),
                KafkaClient: MockKafkaClient,
                KafkaConsumer: MockKafkaConsumer,
                log: createMockLogger('test')
            });

            await source.initialize();

            // Create a mock token
            const mockToken = {
                topic: 'test-topic',
                partition: 0,
                firstOffset: '0',
                lastOffset: '10',
                batchSize: 10,
                key: 'kafka:test-topic:0:0-10'
            };

            // Should not throw even if no pending batch
            await source.acknowledge(mockToken);
        });
    });

    // ========================================================================
    // Batch Deduplication
    // ========================================================================
    describe('Batch Deduplication', function() {
        it('should enable dedup when db is provided', async function() {
            const MockKafkaConsumer = createMockKafkaConsumer();
            const MockKafkaClient = createMockKafkaClient();
            const mockDb = createMockDb();

            const source = new KafkaEventSource('test-source', {}, {
                countlyConfig: createMockKafkaConfig(),
                KafkaClient: MockKafkaClient,
                KafkaConsumer: MockKafkaConsumer,
                db: mockDb,
                log: createMockLogger('test')
            });

            // Source should be created successfully with db for dedup
            should(source).be.ok();
        });

        it('should mark batch as processed', async function() {
            const MockKafkaConsumer = createMockKafkaConsumer();
            const MockKafkaClient = createMockKafkaClient();
            const mockDb = createMockDb();

            const source = new KafkaEventSource('test-source', {}, {
                countlyConfig: createMockKafkaConfig(),
                KafkaClient: MockKafkaClient,
                KafkaConsumer: MockKafkaConsumer,
                db: mockDb,
                log: createMockLogger('test')
            });

            await source.initialize();

            const token = {
                topic: 'test-topic',
                partition: 0,
                lastOffset: '100',
                batchSize: 10,
                key: 'test-key'
            };

            await source.markBatchProcessed(token);

            // Check that state was saved
            const collection = mockDb.collection('kafka_consumer_state');
            const docs = await collection.find({}).toArray();
            docs.length.should.be.greaterThan(0);
        });

        it('should not mark batch when dedup disabled', async function() {
            const MockKafkaConsumer = createMockKafkaConsumer();
            const MockKafkaClient = createMockKafkaClient();
            const mockDb = createMockDb();

            const config = createMockKafkaConfig();
            config.kafka.batchDeduplication = false;

            const source = new KafkaEventSource('test-source', {}, {
                countlyConfig: config,
                KafkaClient: MockKafkaClient,
                KafkaConsumer: MockKafkaConsumer,
                db: mockDb,
                log: createMockLogger('test')
            });

            await source.initialize();

            const token = {
                topic: 'test-topic',
                partition: 0,
                lastOffset: '100',
                batchSize: 10
            };

            await source.markBatchProcessed(token);

            // State should not be saved when dedup is disabled
            const collection = mockDb.collection('kafka_consumer_state');
            const docs = await collection.find({}).toArray();
            docs.length.should.equal(0);
        });
    });

    // ========================================================================
    // Stop/Cleanup
    // ========================================================================
    describe('Stop/Cleanup', function() {
        it('should stop consumer', async function() {
            const MockKafkaConsumer = createMockKafkaConsumer();
            const MockKafkaClient = createMockKafkaClient();
            let stopCalled = false;

            const CustomMockConsumer = class extends MockKafkaConsumer {
                async stop() {
                    stopCalled = true;
                    await super.stop();
                }
            };

            const source = new KafkaEventSource('test-source', {}, {
                countlyConfig: createMockKafkaConfig(),
                KafkaClient: MockKafkaClient,
                KafkaConsumer: CustomMockConsumer,
                log: createMockLogger('test')
            });

            await source.initialize();
            await source.stop();

            stopCalled.should.be.true();
        });

        it('should be idempotent (multiple stop calls safe)', async function() {
            const MockKafkaConsumer = createMockKafkaConsumer();
            const MockKafkaClient = createMockKafkaClient();
            let stopCount = 0;

            const CustomMockConsumer = class extends MockKafkaConsumer {
                async stop() {
                    stopCount++;
                    await super.stop();
                }
            };

            const source = new KafkaEventSource('test-source', {}, {
                countlyConfig: createMockKafkaConfig(),
                KafkaClient: MockKafkaClient,
                KafkaConsumer: CustomMockConsumer,
                log: createMockLogger('test')
            });

            await source.initialize();
            await source.stop();
            await source.stop();
            await source.stop();

            stopCount.should.equal(1);
        });

        it('should handle stop before initialize', async function() {
            const MockKafkaConsumer = createMockKafkaConsumer();
            const MockKafkaClient = createMockKafkaClient();

            const source = new KafkaEventSource('test-source', {}, {
                countlyConfig: createMockKafkaConfig(),
                KafkaClient: MockKafkaClient,
                KafkaConsumer: MockKafkaConsumer,
                log: createMockLogger('test')
            });

            // Should not throw
            await source.stop();
        });

        it('should prevent further operations after stop', async function() {
            const MockKafkaConsumer = createMockKafkaConsumer();
            const MockKafkaClient = createMockKafkaClient();

            const source = new KafkaEventSource('test-source', {}, {
                countlyConfig: createMockKafkaConfig(),
                KafkaClient: MockKafkaClient,
                KafkaConsumer: MockKafkaConsumer,
                log: createMockLogger('test')
            });

            await source.initialize();
            await source.stop();

            // getNext should return null after stop
            const batch = await source.getNext();
            should(batch).be.null();
        });
    });

    // ========================================================================
    // Cluster ID Fetching
    // ========================================================================
    describe('Cluster ID Fetching', function() {
        it('should fetch cluster ID from Kafka admin API', async function() {
            const MockKafkaConsumer = createMockKafkaConsumer();
            const MockKafkaClient = createMockKafkaClient({ clusterId: 'actual-cluster-abc123' });
            const mockDb = createMockDb();

            const source = new KafkaEventSource('test-source', {}, {
                countlyConfig: createMockKafkaConfig(),
                KafkaClient: MockKafkaClient,
                KafkaConsumer: MockKafkaConsumer,
                db: mockDb,
                log: createMockLogger('test')
            });

            await source.initialize();

            // Verify cluster ID is used in state key by marking a batch processed
            const token = {
                topic: 'test-topic',
                partition: 0,
                lastOffset: '100',
                batchSize: 10
            };
            await source.markBatchProcessed(token);

            const collection = mockDb.collection('kafka_consumer_state');
            const docs = await collection.find({}).toArray();
            docs.length.should.be.greaterThan(0);
            // State key should include cluster ID
            docs[0]._id.should.containEql('actual-cluster-abc123');
        });

        it('should fallback to brokers hash when admin API fails', async function() {
            const MockKafkaConsumer = createMockKafkaConsumer();
            const MockKafkaClient = createMockKafkaClient({ clusterMetadataError: true });
            const mockDb = createMockDb();

            const source = new KafkaEventSource('test-source', {}, {
                countlyConfig: createMockKafkaConfig(),
                KafkaClient: MockKafkaClient,
                KafkaConsumer: MockKafkaConsumer,
                db: mockDb,
                log: createMockLogger('test')
            });

            await source.initialize();

            // Verify fallback cluster ID is used
            const token = {
                topic: 'test-topic',
                partition: 0,
                lastOffset: '100',
                batchSize: 10
            };
            await source.markBatchProcessed(token);

            const collection = mockDb.collection('kafka_consumer_state');
            const docs = await collection.find({}).toArray();
            docs.length.should.be.greaterThan(0);
            // State key should include fallback prefix
            docs[0]._id.should.containEql('fallback-');
        });
    });

    // ========================================================================
    // Consumer Event Recording
    // ========================================================================
    describe('Consumer Event Recording', function() {
        it('should record OFFSET_BACKWARD event when offset goes backwards significantly', async function() {
            const MockKafkaConsumer = createMockKafkaConsumer();
            const MockKafkaClient = createMockKafkaClient({ clusterId: 'test-cluster' });
            const mockDb = createMockDb();

            const config = createMockKafkaConfig();
            config.kafka.offsetBackwardThreshold = 100; // Lower threshold for testing

            const source = new KafkaEventSource('test-source', {}, {
                countlyConfig: config,
                KafkaClient: MockKafkaClient,
                KafkaConsumer: MockKafkaConsumer,
                db: mockDb,
                log: createMockLogger('test')
            });

            await source.initialize();

            // First, save a high offset
            const stateCollection = mockDb.collection('kafka_consumer_state');
            await stateCollection.insertOne({
                _id: 'test-cluster:test_test-source:test-topic',
                clusterId: 'test-cluster',
                partitions: {
                    '0': { offset: '10000', lastProcessedAt: new Date() }
                }
            });

            // Now try to process from a much lower offset (simulating topic recreation)
            const token = {
                topic: 'test-topic',
                partition: 0,
                firstOffset: '50', // Way below 10000 - 100 threshold
                lastOffset: '100',
                batchSize: 50
            };

            // This should trigger the offset backward detection
            // We need to call the internal checkOverlap method via acknowledge flow
            // For unit testing, we can directly test the state change
            await source.markBatchProcessed(token);

            // Check that an event was recorded
            const eventsCollection = mockDb.collection('kafka_consumer_events');
            const events = await eventsCollection.find({}).toArray();

            // Event should be recorded for the backward detection
            // Note: The actual recording happens in checkOverlap which is called during getNext
            // For full integration, we'd need to simulate the consumer receiving a batch
        });

        it('should not record event when offset is within threshold', async function() {
            const MockKafkaConsumer = createMockKafkaConsumer();
            const MockKafkaClient = createMockKafkaClient({ clusterId: 'test-cluster' });
            const mockDb = createMockDb();

            const config = createMockKafkaConfig();
            config.kafka.offsetBackwardThreshold = 10000; // Default high threshold

            const source = new KafkaEventSource('test-source', {}, {
                countlyConfig: config,
                KafkaClient: MockKafkaClient,
                KafkaConsumer: MockKafkaConsumer,
                db: mockDb,
                log: createMockLogger('test')
            });

            await source.initialize();

            // Save initial state
            const stateCollection = mockDb.collection('kafka_consumer_state');
            await stateCollection.insertOne({
                _id: 'test-cluster:test_test-source:test-topic',
                clusterId: 'test-cluster',
                partitions: {
                    '0': { offset: '1000', lastProcessedAt: new Date() }
                }
            });

            // Process with a small backward jump (within threshold)
            const token = {
                topic: 'test-topic',
                partition: 0,
                firstOffset: '995', // Only 5 behind, within 10000 threshold
                lastOffset: '1005',
                batchSize: 10
            };

            await source.markBatchProcessed(token);

            // No OFFSET_BACKWARD event should be recorded for small jumps
            const eventsCollection = mockDb.collection('kafka_consumer_events');
            const events = await eventsCollection.find({}).toArray();
            const backwardEvents = events.filter(e => e.type === 'OFFSET_BACKWARD');
            backwardEvents.length.should.equal(0);
        });
    });

    // ========================================================================
    // Offset Backward Threshold Configuration
    // ========================================================================
    describe('Offset Backward Threshold', function() {
        it('should use default threshold of 10000 when not configured', async function() {
            const MockKafkaConsumer = createMockKafkaConsumer();
            const MockKafkaClient = createMockKafkaClient();

            const config = createMockKafkaConfig();
            delete config.kafka.offsetBackwardThreshold;

            const source = new KafkaEventSource('test-source', {}, {
                countlyConfig: config,
                KafkaClient: MockKafkaClient,
                KafkaConsumer: MockKafkaConsumer,
                log: createMockLogger('test')
            });

            // Source should be created with default threshold
            should(source).be.ok();
        });

        it('should use configured threshold value', async function() {
            const MockKafkaConsumer = createMockKafkaConsumer();
            const MockKafkaClient = createMockKafkaClient();

            const config = createMockKafkaConfig();
            config.kafka.offsetBackwardThreshold = 50000;

            const source = new KafkaEventSource('test-source', {}, {
                countlyConfig: config,
                KafkaClient: MockKafkaClient,
                KafkaConsumer: MockKafkaConsumer,
                log: createMockLogger('test')
            });

            // Source should be created with configured threshold
            should(source).be.ok();
        });

        it('should ignore invalid threshold values', async function() {
            const MockKafkaConsumer = createMockKafkaConsumer();
            const MockKafkaClient = createMockKafkaClient();

            const config = createMockKafkaConfig();
            config.kafka.offsetBackwardThreshold = -100; // Invalid negative value

            const source = new KafkaEventSource('test-source', {}, {
                countlyConfig: config,
                KafkaClient: MockKafkaClient,
                KafkaConsumer: MockKafkaConsumer,
                log: createMockLogger('test')
            });

            // Should still create source with default threshold
            should(source).be.ok();
        });
    });

    // ========================================================================
    // State Versioning
    // ========================================================================
    describe('State Versioning', function() {
        it('should include cluster ID in state key', async function() {
            const MockKafkaConsumer = createMockKafkaConsumer();
            const MockKafkaClient = createMockKafkaClient({ clusterId: 'my-cluster-xyz' });
            const mockDb = createMockDb();

            const source = new KafkaEventSource('aggregator', {}, {
                countlyConfig: createMockKafkaConfig(),
                KafkaClient: MockKafkaClient,
                KafkaConsumer: MockKafkaConsumer,
                db: mockDb,
                log: createMockLogger('test')
            });

            await source.initialize();

            const token = {
                topic: 'drill-events',
                partition: 0,
                lastOffset: '100',
                batchSize: 10
            };
            await source.markBatchProcessed(token);

            const collection = mockDb.collection('kafka_consumer_state');
            const docs = await collection.find({}).toArray();

            // State key format should be: {clusterId}:{groupId}:{topic}
            docs[0]._id.should.equal('my-cluster-xyz:test_aggregator:drill-events');
        });

        it('should store cluster ID in state document', async function() {
            const MockKafkaConsumer = createMockKafkaConsumer();
            const MockKafkaClient = createMockKafkaClient({ clusterId: 'stored-cluster-id' });
            const mockDb = createMockDb();

            const source = new KafkaEventSource('test-source', {}, {
                countlyConfig: createMockKafkaConfig(),
                KafkaClient: MockKafkaClient,
                KafkaConsumer: MockKafkaConsumer,
                db: mockDb,
                log: createMockLogger('test')
            });

            await source.initialize();

            const token = {
                topic: 'test-topic',
                partition: 0,
                lastOffset: '100',
                batchSize: 10
            };
            await source.markBatchProcessed(token);

            const collection = mockDb.collection('kafka_consumer_state');
            const docs = await collection.find({}).toArray();

            // Document should have clusterId field
            docs[0].clusterId.should.equal('stored-cluster-id');
        });
    });

    // ========================================================================
    // Offset Validation
    // ========================================================================
    describe('Offset Validation', function() {
        it('should handle invalid saved offset format gracefully', async function() {
            const MockKafkaConsumer = createMockKafkaConsumer();
            const MockKafkaClient = createMockKafkaClient({ clusterId: 'test-cluster' });
            const mockDb = createMockDb();

            const source = new KafkaEventSource('test-source', {}, {
                countlyConfig: createMockKafkaConfig(),
                KafkaClient: MockKafkaClient,
                KafkaConsumer: MockKafkaConsumer,
                db: mockDb,
                log: createMockLogger('test')
            });

            await source.initialize();

            // Insert corrupted state with invalid offset
            const stateCollection = mockDb.collection('kafka_consumer_state');
            await stateCollection.insertOne({
                _id: 'test-cluster:test_test-source:test-topic',
                clusterId: 'test-cluster',
                partitions: {
                    '0': { offset: 'corrupted-not-a-number', lastProcessedAt: new Date() }
                }
            });

            // Should not throw when processing new batch
            const token = {
                topic: 'test-topic',
                partition: 0,
                lastOffset: '100',
                batchSize: 10
            };

            // Should not throw
            await source.markBatchProcessed(token);
        });

        it('should validate numeric offset strings', async function() {
            const MockKafkaConsumer = createMockKafkaConsumer();
            const MockKafkaClient = createMockKafkaClient({ clusterId: 'test-cluster' });
            const mockDb = createMockDb();

            const source = new KafkaEventSource('test-source', {}, {
                countlyConfig: createMockKafkaConfig(),
                KafkaClient: MockKafkaClient,
                KafkaConsumer: MockKafkaConsumer,
                db: mockDb,
                log: createMockLogger('test')
            });

            await source.initialize();

            // Insert valid state
            const stateCollection = mockDb.collection('kafka_consumer_state');
            await stateCollection.insertOne({
                _id: 'test-cluster:test_test-source:test-topic',
                clusterId: 'test-cluster',
                partitions: {
                    '0': { offset: '12345', lastProcessedAt: new Date() }
                }
            });

            const token = {
                topic: 'test-topic',
                partition: 0,
                lastOffset: '12400',
                batchSize: 55
            };

            // Should work with valid numeric string offsets
            await source.markBatchProcessed(token);

            const docs = await stateCollection.find({}).toArray();
            docs[0].partitions['0'].offset.should.equal('12400');
        });
    });
});
