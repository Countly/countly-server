/**
 * KafkaEventSink Unit Tests
 *
 * Tests the KafkaEventSink class that writes events to Kafka.
 *
 * Usage:
 *   npm run test:unit
 */
const should = require('should');

// Setup mocking before requiring the module
const {
    createMockLogger,
    createMockKafkaClient,
    createMockKafkaProducer
} = require('./helpers/mockSetup');

// Direct require of the KafkaEventSink module
// Path from plugins/kafka/tests/unit/ to api/eventSink/
const KafkaEventSink = require('../../../../api/eventSink/KafkaEventSink');

describe('KafkaEventSink', function() {

    // ========================================================================
    // Constructor
    // ========================================================================
    describe('Constructor', function() {
        it('should accept empty options', function() {
            const MockProducer = createMockKafkaProducer();
            const mockProducer = new MockProducer();
            const sink = new KafkaEventSink({}, {
                kafkaProducer: mockProducer,
                log: createMockLogger('test')
            });
            should(sink).be.ok();
        });

        it('should use injected kafkaProducer', function() {
            const MockProducer = createMockKafkaProducer();
            const mockProducer = new MockProducer();
            const sink = new KafkaEventSink({}, {
                kafkaProducer: mockProducer,
                log: createMockLogger('test')
            });
            should(sink).be.ok();
        });

        it('should use injected kafkaClient', function() {
            const MockClient = createMockKafkaClient();
            const mockClient = new MockClient();
            const MockProducer = createMockKafkaProducer();
            const mockProducer = new MockProducer();
            const sink = new KafkaEventSink({}, {
                kafkaClient: mockClient,
                kafkaProducer: mockProducer,
                log: createMockLogger('test')
            });
            should(sink).be.ok();
        });

        it('should use custom transformer if provided', async function() {
            const MockProducer = createMockKafkaProducer();
            const mockProducer = new MockProducer();
            let transformerCalled = false;

            const customTransformer = (doc) => {
                transformerCalled = true;
                return { custom: true, ...doc };
            };

            const sink = new KafkaEventSink(
                { transformer: customTransformer },
                { kafkaProducer: mockProducer, log: createMockLogger('test') }
            );

            await sink.initialize();
            await sink.write([{
                insertOne: {
                    document: { a: 'app', e: 'event', ts: Date.now(), _id: 'id' }
                }
            }]);

            transformerCalled.should.be.true();
        });

        it('should use default transactionalIdPrefix', function() {
            const MockProducer = createMockKafkaProducer();
            const mockProducer = new MockProducer();
            const sink = new KafkaEventSink({}, {
                kafkaProducer: mockProducer,
                log: createMockLogger('test')
            });
            sink.transactionalIdPrefix.should.equal('countly-event-sink');
        });

        it('should use custom transactionalIdPrefix if provided', function() {
            const MockProducer = createMockKafkaProducer();
            const mockProducer = new MockProducer();
            const sink = new KafkaEventSink(
                { transactionalIdPrefix: 'custom-prefix' },
                { kafkaProducer: mockProducer, log: createMockLogger('test') }
            );
            sink.transactionalIdPrefix.should.equal('custom-prefix');
        });
    });

    // ========================================================================
    // Initialize
    // ========================================================================
    describe('Initialize', function() {
        it('should mark as initialized after initialize()', async function() {
            const MockProducer = createMockKafkaProducer();
            const mockProducer = new MockProducer();
            const sink = new KafkaEventSink({}, {
                kafkaProducer: mockProducer,
                log: createMockLogger('test')
            });

            sink.isInitialized().should.be.false();
            await sink.initialize();
            sink.isInitialized().should.be.true();
        });

        it('should skip if already initialized', async function() {
            const MockProducer = createMockKafkaProducer();
            const mockProducer = new MockProducer();
            const sink = new KafkaEventSink({}, {
                kafkaProducer: mockProducer,
                log: createMockLogger('test')
            });

            await sink.initialize();
            const initializedBefore = sink.isInitialized();
            await sink.initialize(); // Second call should be no-op
            const initializedAfter = sink.isInitialized();

            initializedBefore.should.be.true();
            initializedAfter.should.be.true();
        });

        it('should set isConnected to true after initialize', async function() {
            const MockProducer = createMockKafkaProducer();
            const mockProducer = new MockProducer();
            const sink = new KafkaEventSink({}, {
                kafkaProducer: mockProducer,
                log: createMockLogger('test')
            });

            sink.isConnected().should.be.false();
            await sink.initialize();
            sink.isConnected().should.be.true();
        });
    });

    // ========================================================================
    // Write
    // ========================================================================
    describe('Write', function() {
        it('should auto-initialize on first write', async function() {
            const MockProducer = createMockKafkaProducer();
            const mockProducer = new MockProducer();
            const sink = new KafkaEventSink({}, {
                kafkaProducer: mockProducer,
                log: createMockLogger('test')
            });

            sink.isInitialized().should.be.false();

            await sink.write([{
                insertOne: {
                    document: { a: 'app', e: 'event', ts: Date.now(), _id: 'id' }
                }
            }]);

            sink.isInitialized().should.be.true();
        });

        it('should return success with 0 written for empty array', async function() {
            const MockProducer = createMockKafkaProducer();
            const mockProducer = new MockProducer();
            const sink = new KafkaEventSink({}, {
                kafkaProducer: mockProducer,
                log: createMockLogger('test')
            });

            await sink.initialize();
            const result = await sink.write([]);

            result.success.should.be.true();
            result.written.should.equal(0);
        });

        it('should transform bulkWrite insertOne operations to events', async function() {
            const MockProducer = createMockKafkaProducer();
            const mockProducer = new MockProducer();
            const sink = new KafkaEventSink({}, {
                kafkaProducer: mockProducer,
                log: createMockLogger('test')
            });

            await sink.initialize();
            await sink.write([
                { insertOne: { document: { a: 'app1', e: 'event1', ts: Date.now(), _id: 'id1' } } },
                { insertOne: { document: { a: 'app2', e: 'event2', ts: Date.now(), _id: 'id2' } } }
            ]);

            mockProducer.sentEvents.length.should.equal(2);
        });

        it('should skip non-insertOne operations', async function() {
            const MockProducer = createMockKafkaProducer();
            const mockProducer = new MockProducer();
            const sink = new KafkaEventSink({}, {
                kafkaProducer: mockProducer,
                log: createMockLogger('test')
            });

            await sink.initialize();
            await sink.write([
                { insertOne: { document: { a: 'app', e: 'event', ts: Date.now(), _id: 'id' } } },
                { updateOne: { filter: { _id: 'id' }, update: { $set: { x: 1 } } } },
                { deleteOne: { filter: { _id: 'id' } } }
            ]);

            // Only the insertOne should have been processed
            mockProducer.sentEvents.length.should.equal(1);
        });

        it('should skip insertOne with invalid document', async function() {
            const MockProducer = createMockKafkaProducer();
            const mockProducer = new MockProducer();
            const sink = new KafkaEventSink({}, {
                kafkaProducer: mockProducer,
                log: createMockLogger('test')
            });

            await sink.initialize();
            const result = await sink.write([
                { insertOne: { document: { a: 'app', e: 'event', ts: Date.now(), _id: 'id' } } },
                { insertOne: { document: { x: 'missing-required-fields' } } } // Invalid - will be null
            ]);

            mockProducer.sentEvents.length.should.equal(1);
            result.success.should.be.true();
        });

        it('should return result with written count on success', async function() {
            const MockProducer = createMockKafkaProducer();
            const mockProducer = new MockProducer();
            const sink = new KafkaEventSink({}, {
                kafkaProducer: mockProducer,
                log: createMockLogger('test')
            });

            await sink.initialize();
            const result = await sink.write([
                { insertOne: { document: { a: 'app1', e: 'e1', ts: Date.now(), _id: 'id1' } } },
                { insertOne: { document: { a: 'app2', e: 'e2', ts: Date.now(), _id: 'id2' } } },
                { insertOne: { document: { a: 'app3', e: 'e3', ts: Date.now(), _id: 'id3' } } }
            ]);

            result.success.should.be.true();
            result.written.should.equal(3);
            result.should.have.property('duration');
            result.should.have.property('originalCount', 3);
            result.should.have.property('transformedCount', 3);
        });

        it('should return result with 0 written when all transforms fail', async function() {
            const MockProducer = createMockKafkaProducer();
            const mockProducer = new MockProducer();
            const sink = new KafkaEventSink({}, {
                kafkaProducer: mockProducer,
                log: createMockLogger('test')
            });

            await sink.initialize();
            const result = await sink.write([
                { insertOne: { document: { invalid: 'doc1' } } },
                { insertOne: { document: { also: 'invalid' } } }
            ]);

            result.success.should.be.true();
            result.written.should.equal(0);
            result.originalCount.should.equal(2);
        });

        it('should throw on producer failure', async function() {
            const MockProducer = createMockKafkaProducer();
            const mockProducer = new MockProducer();
            mockProducer.sendEvents = async() => {
                return { success: false, message: 'Producer error' };
            };

            const sink = new KafkaEventSink({}, {
                kafkaProducer: mockProducer,
                log: createMockLogger('test')
            });

            await sink.initialize();

            let threw = false;
            try {
                await sink.write([
                    { insertOne: { document: { a: 'app', e: 'event', ts: Date.now(), _id: 'id' } } }
                ]);
            }
            catch (e) {
                threw = true;
                e.message.should.containEql('Kafka send failed');
            }

            threw.should.be.true();
        });

        it('should throw when events is not an array', async function() {
            const MockProducer = createMockKafkaProducer();
            const mockProducer = new MockProducer();
            const sink = new KafkaEventSink({}, {
                kafkaProducer: mockProducer,
                log: createMockLogger('test')
            });

            await sink.initialize();

            let threw = false;
            try {
                await sink.write('not-an-array');
            }
            catch (e) {
                threw = true;
                e.message.should.containEql('must be an array');
            }

            threw.should.be.true();
        });
    });

    // ========================================================================
    // Close
    // ========================================================================
    describe('Close', function() {
        it('should disconnect producer on close', async function() {
            const MockProducer = createMockKafkaProducer();
            const mockProducer = new MockProducer();
            mockProducer.isConnected = true;
            let disconnectCalled = false;
            mockProducer.disconnect = async() => {
                disconnectCalled = true;
                mockProducer.isConnected = false;
            };

            const sink = new KafkaEventSink({}, {
                kafkaProducer: mockProducer,
                log: createMockLogger('test')
            });

            await sink.initialize();
            await sink.close();

            disconnectCalled.should.be.true();
        });

        it('should mark as closed after close()', async function() {
            const MockProducer = createMockKafkaProducer();
            const mockProducer = new MockProducer();
            const sink = new KafkaEventSink({}, {
                kafkaProducer: mockProducer,
                log: createMockLogger('test')
            });

            await sink.initialize();
            sink.isClosed().should.be.false();
            await sink.close();
            sink.isClosed().should.be.true();
        });

        it('should skip if already closed', async function() {
            const MockProducer = createMockKafkaProducer();
            const mockProducer = new MockProducer();
            let disconnectCount = 0;
            mockProducer.disconnect = async() => {
                disconnectCount++;
            };

            const sink = new KafkaEventSink({}, {
                kafkaProducer: mockProducer,
                log: createMockLogger('test')
            });

            await sink.initialize();
            await sink.close();
            await sink.close(); // Second call should be no-op

            disconnectCount.should.equal(1);
        });

        it('should mark as closed even if disconnect fails', async function() {
            const MockProducer = createMockKafkaProducer();
            const mockProducer = new MockProducer();
            mockProducer.disconnect = async() => {
                throw new Error('Disconnect failed');
            };

            const sink = new KafkaEventSink({}, {
                kafkaProducer: mockProducer,
                log: createMockLogger('test')
            });

            await sink.initialize();
            await sink.close();

            sink.isClosed().should.be.true();
        });
    });

    // ========================================================================
    // State Methods
    // ========================================================================
    describe('State Methods', function() {
        it('getType should return class name', function() {
            const MockProducer = createMockKafkaProducer();
            const mockProducer = new MockProducer();
            const sink = new KafkaEventSink({}, {
                kafkaProducer: mockProducer,
                log: createMockLogger('test')
            });

            sink.getType().should.equal('KafkaEventSink');
        });

        it('isConnected should return false initially', function() {
            const MockProducer = createMockKafkaProducer();
            const mockProducer = new MockProducer();
            const sink = new KafkaEventSink({}, {
                kafkaProducer: mockProducer,
                log: createMockLogger('test')
            });

            sink.isConnected().should.be.false();
        });

        it('isConnected should return true after initialize', async function() {
            const MockProducer = createMockKafkaProducer();
            const mockProducer = new MockProducer();
            const sink = new KafkaEventSink({}, {
                kafkaProducer: mockProducer,
                log: createMockLogger('test')
            });

            await sink.initialize();
            sink.isConnected().should.be.true();
        });

        it('isConnected should return false after close', async function() {
            const MockProducer = createMockKafkaProducer();
            const mockProducer = new MockProducer();
            const sink = new KafkaEventSink({}, {
                kafkaProducer: mockProducer,
                log: createMockLogger('test')
            });

            await sink.initialize();
            await sink.close();
            sink.isConnected().should.be.false();
        });
    });
});
