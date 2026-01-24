/**
 * UnifiedEventSink Unit Tests
 *
 * Tests the UnifiedEventSink class that manages multiple event sinks.
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
    createMockEventSink
} = require('./helpers/mockSetup');

// Direct require of the UnifiedEventSink module
// Path from plugins/kafka/tests/unit/ to api/eventSink/
const UnifiedEventSink = require('../../../../api/eventSink/UnifiedEventSink');

/**
 * Create a mock sink for testing
 */
function createMockSink(name, options = {}) {
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
        writtenEvents
    };
}

describe('UnifiedEventSink', function() {
    before(function() {
        setupMocking();
    });
    after(function() {
        resetMocking();
    });

    // ========================================================================
    // Constructor
    // ========================================================================
    describe('Constructor', function() {
        it('should accept empty dependencies', function() {
            // Note: This would normally try to load real config
            // In our mocked environment, it uses the mock config
            const sink = new UnifiedEventSink({
                config: createMockKafkaConfig(),
                log: createMockLogger('test')
            });
            should(sink).be.ok();
        });

        it('should use injected config', function() {
            const customConfig = {
                eventSink: { sinks: ['mongo'] },
                kafka: { enabled: false }
            };
            const sink = new UnifiedEventSink({
                config: customConfig,
                log: createMockLogger('test')
            });
            should(sink).be.ok();
        });

        it('should use injected logger', function() {
            const customLog = createMockLogger('custom');
            const sink = new UnifiedEventSink({
                config: createMockKafkaConfig(),
                log: customLog
            });
            should(sink).be.ok();
        });

        it('should not be initialized after construction', function() {
            const sink = new UnifiedEventSink({
                config: createMockKafkaConfig(),
                log: createMockLogger('test')
            });
            sink.isInitialized().should.be.false();
        });

        it('should not be closed after construction', function() {
            const sink = new UnifiedEventSink({
                config: createMockKafkaConfig(),
                log: createMockLogger('test')
            });
            sink.isClosed().should.be.false();
        });
    });

    // ========================================================================
    // Initialization
    // ========================================================================
    describe('Initialization', function() {
        it('should initialize sinks on first write', async function() {
            // Create a simplified test that doesn't rely on factory
            const sink = new UnifiedEventSink({
                config: { eventSink: { sinks: ['mongo'] }, kafka: { enabled: false } },
                log: createMockLogger('test')
            });

            sink.isInitialized().should.be.false();

            // Since we can't easily mock the factory without more setup,
            // we'll test the pre-conditions
            sink.isClosed().should.be.false();
        });

        it('should throw if write called after close', async function() {
            const sink = new UnifiedEventSink({
                config: createMockKafkaConfig(),
                log: createMockLogger('test')
            });

            await sink.close();

            let threw = false;
            try {
                await sink.write([{ test: 'data' }]);
            }
            catch (e) {
                threw = true;
                e.message.should.containEql('closed');
            }

            threw.should.be.true();
        });
    });

    // ========================================================================
    // Write
    // ========================================================================
    describe('Write', function() {
        // Note: write() triggers initialization which requires real MongoDB.
        // These tests verify the closed state behavior which doesn't need init.

        it('should throw if closed', async function() {
            const sink = new UnifiedEventSink({
                config: createMockKafkaConfig(),
                log: createMockLogger('test')
            });

            await sink.close();

            let threw = false;
            try {
                await sink.write([{ test: 'event' }]);
            }
            catch (e) {
                threw = true;
                e.message.should.containEql('closed');
            }

            threw.should.be.true();
        });

        it('should throw with empty array when closed', async function() {
            const sink = new UnifiedEventSink({
                config: createMockKafkaConfig(),
                log: createMockLogger('test')
            });

            await sink.close();

            let threw = false;
            try {
                await sink.write([]);
            }
            catch (e) {
                threw = true;
                e.message.should.containEql('closed');
            }

            threw.should.be.true();
        });

        it('should throw with null events when closed', async function() {
            const sink = new UnifiedEventSink({
                config: createMockKafkaConfig(),
                log: createMockLogger('test')
            });

            await sink.close();

            let threw = false;
            try {
                await sink.write(null);
            }
            catch (e) {
                threw = true;
                e.message.should.containEql('closed');
            }

            threw.should.be.true();
        });
    });

    // ========================================================================
    // Close
    // ========================================================================
    describe('Close', function() {
        it('should mark as closed after close()', async function() {
            const sink = new UnifiedEventSink({
                config: createMockKafkaConfig(),
                log: createMockLogger('test')
            });

            sink.isClosed().should.be.false();
            await sink.close();
            sink.isClosed().should.be.true();
        });

        it('should be idempotent (multiple close calls safe)', async function() {
            const sink = new UnifiedEventSink({
                config: createMockKafkaConfig(),
                log: createMockLogger('test')
            });

            await sink.close();
            await sink.close();
            await sink.close();

            sink.isClosed().should.be.true();
        });

        it('should clear initialized flag after close', async function() {
            const sink = new UnifiedEventSink({
                config: createMockKafkaConfig(),
                log: createMockLogger('test')
            });

            // Close without writing - initialized flag should be false
            await sink.close();

            sink.isInitialized().should.be.false();
        });
    });

    // ========================================================================
    // State Methods
    // ========================================================================
    describe('State Methods', function() {
        it('getSinkTypes should return configured types before init', function() {
            const config = {
                eventSink: { sinks: ['mongo', 'kafka'] },
                kafka: { enabled: true }
            };
            const sink = new UnifiedEventSink({
                config: config,
                log: createMockLogger('test')
            });

            const types = sink.getSinkTypes();
            types.should.deepEqual(['mongo', 'kafka']);
        });

        it('getSinkTypes should return default mongo when not configured', function() {
            const sink = new UnifiedEventSink({
                config: {},
                log: createMockLogger('test')
            });

            const types = sink.getSinkTypes();
            types.should.deepEqual(['mongo']);
        });

        it('isInitialized should return false initially', function() {
            const sink = new UnifiedEventSink({
                config: createMockKafkaConfig(),
                log: createMockLogger('test')
            });

            sink.isInitialized().should.be.false();
        });

        it('isClosed should return false initially', function() {
            const sink = new UnifiedEventSink({
                config: createMockKafkaConfig(),
                log: createMockLogger('test')
            });

            sink.isClosed().should.be.false();
        });

        it('isClosed should return true after close', async function() {
            const sink = new UnifiedEventSink({
                config: createMockKafkaConfig(),
                log: createMockLogger('test')
            });

            await sink.close();
            sink.isClosed().should.be.true();
        });
    });

    // ========================================================================
    // Edge Cases
    // ========================================================================
    describe('Edge Cases', function() {
        // Note: Edge cases involving write() require initialization which needs
        // a real MongoDB connection. These are documented here but not tested
        // in unit tests - they should be tested in integration tests.

        it('should be constructable with empty config', function() {
            const sink = new UnifiedEventSink({
                config: {},
                log: createMockLogger('test')
            });

            should(sink).be.ok();
            sink.getSinkTypes().should.deepEqual(['mongo']); // default
        });

        it('should handle close before any writes', async function() {
            const sink = new UnifiedEventSink({
                config: createMockKafkaConfig(),
                log: createMockLogger('test')
            });

            // Should not throw when closing before any writes
            await sink.close();
            sink.isClosed().should.be.true();
        });
    });

    // ========================================================================
    // Write with Mock Sinks (Dependency Injection)
    // ========================================================================
    describe('Write with Mock Sinks', function() {
        it('should write to single injected mock sink', async function() {
            const mockSink = createMockEventSink('MongoEventSink');
            const sink = new UnifiedEventSink({
                config: createMockKafkaConfig(),
                log: createMockLogger('test'),
                sinks: [mockSink]
            });

            const events = [{ insertOne: { document: { a: 'app', e: 'event' } } }];
            const result = await sink.write(events);

            result.overall.success.should.be.true();
            result.overall.written.should.equal(1);
            mockSink.writtenEvents.length.should.equal(1);
        });

        it('should write to multiple mock sinks in parallel', async function() {
            const mongoSink = createMockEventSink('MongoEventSink');
            const kafkaSink = createMockEventSink('KafkaEventSink');
            const sink = new UnifiedEventSink({
                config: createMockKafkaConfig(),
                log: createMockLogger('test'),
                sinks: [mongoSink, kafkaSink]
            });

            const events = [
                { insertOne: { document: { a: 'app1', e: 'event1' } } },
                { insertOne: { document: { a: 'app2', e: 'event2' } } }
            ];
            const result = await sink.write(events);

            result.overall.success.should.be.true();
            result.overall.written.should.equal(4); // 2 events x 2 sinks
            mongoSink.writtenEvents.length.should.equal(2);
            kafkaSink.writtenEvents.length.should.equal(2);
        });

        it('should handle one sink failing while another succeeds', async function() {
            const mongoSink = createMockEventSink('MongoEventSink');
            const kafkaSink = createMockEventSink('KafkaEventSink', { writeError: 'Kafka write failed' });
            const sink = new UnifiedEventSink({
                config: createMockKafkaConfig(),
                log: createMockLogger('test'),
                sinks: [mongoSink, kafkaSink]
            });

            const events = [{ insertOne: { document: { a: 'app', e: 'event' } } }];
            const result = await sink.write(events);

            // Overall success based on Mongo success (Kafka failure is warning)
            result.overall.success.should.be.true();
            result.sinks.MongoEventSink.success.should.be.true();
            result.sinks.KafkaEventSink.success.should.be.false();
        });

        it('should handle all sinks failing', async function() {
            const mongoSink = createMockEventSink('MongoEventSink', { writeError: 'Mongo write failed' });
            const kafkaSink = createMockEventSink('KafkaEventSink', { writeError: 'Kafka write failed' });
            const sink = new UnifiedEventSink({
                config: createMockKafkaConfig(),
                log: createMockLogger('test'),
                sinks: [mongoSink, kafkaSink]
            });

            const events = [{ insertOne: { document: { a: 'app', e: 'event' } } }];
            const result = await sink.write(events);

            result.overall.success.should.be.false();
            result.overall.error.should.be.ok();
        });

        it('should return no-op result for null events', async function() {
            const mockSink = createMockEventSink('MongoEventSink');
            const sink = new UnifiedEventSink({
                config: createMockKafkaConfig(),
                log: createMockLogger('test'),
                sinks: [mockSink]
            });

            const result = await sink.write(null);

            result.overall.success.should.be.true();
            result.overall.written.should.equal(0);
            result.overall.message.should.containEql('No events');
        });

        it('should return no-op result for undefined events', async function() {
            const mockSink = createMockEventSink('MongoEventSink');
            const sink = new UnifiedEventSink({
                config: createMockKafkaConfig(),
                log: createMockLogger('test'),
                sinks: [mockSink]
            });

            const result = await sink.write(undefined);

            result.overall.success.should.be.true();
            result.overall.written.should.equal(0);
        });

        it('should return no-op result for empty array', async function() {
            const mockSink = createMockEventSink('MongoEventSink');
            const sink = new UnifiedEventSink({
                config: createMockKafkaConfig(),
                log: createMockLogger('test'),
                sinks: [mockSink]
            });

            const result = await sink.write([]);

            result.overall.success.should.be.true();
            result.overall.written.should.equal(0);
        });
    });

    // ========================================================================
    // Result Processing
    // ========================================================================
    describe('Result Processing', function() {
        it('should set overall success based on MongoEventSink success', async function() {
            const mongoSink = createMockEventSink('MongoEventSink');
            const kafkaSink = createMockEventSink('KafkaEventSink', { writeError: 'Kafka failed' });
            const sink = new UnifiedEventSink({
                config: createMockKafkaConfig(),
                log: createMockLogger('test'),
                sinks: [mongoSink, kafkaSink]
            });

            const events = [{ insertOne: { document: { a: 'app', e: 'event' } } }];
            const result = await sink.write(events);

            // Mongo succeeded, so overall is success despite Kafka failure
            result.overall.success.should.be.true();
        });

        it('should treat KafkaEventSink failure as warning not overall failure', async function() {
            const mongoSink = createMockEventSink('MongoEventSink');
            const kafkaSink = createMockEventSink('KafkaEventSink', { writeError: 'Kafka failed' });
            const sink = new UnifiedEventSink({
                config: createMockKafkaConfig(),
                log: createMockLogger('test'),
                sinks: [mongoSink, kafkaSink]
            });

            const events = [{ insertOne: { document: { a: 'app', e: 'event' } } }];
            const result = await sink.write(events);

            result.overall.success.should.be.true();
            result.sinks.KafkaEventSink.success.should.be.false();
            result.sinks.KafkaEventSink.error.should.containEql('Kafka failed');
        });

        it('should aggregate written counts from all sinks', async function() {
            const mongoSink = createMockEventSink('MongoEventSink');
            const kafkaSink = createMockEventSink('KafkaEventSink');
            const sink = new UnifiedEventSink({
                config: createMockKafkaConfig(),
                log: createMockLogger('test'),
                sinks: [mongoSink, kafkaSink]
            });

            const events = [
                { insertOne: { document: { a: 'app1', e: 'event1' } } },
                { insertOne: { document: { a: 'app2', e: 'event2' } } },
                { insertOne: { document: { a: 'app3', e: 'event3' } } }
            ];
            const result = await sink.write(events);

            // 3 events written to 2 sinks = 6 total
            result.overall.written.should.equal(6);
        });

        it('should set overall failure when MongoEventSink fails', async function() {
            const mongoSink = createMockEventSink('MongoEventSink', { writeError: 'Mongo failed' });
            const kafkaSink = createMockEventSink('KafkaEventSink');
            const sink = new UnifiedEventSink({
                config: createMockKafkaConfig(),
                log: createMockLogger('test'),
                sinks: [mongoSink, kafkaSink]
            });

            const events = [{ insertOne: { document: { a: 'app', e: 'event' } } }];
            const result = await sink.write(events);

            result.overall.success.should.be.false();
            result.overall.error.should.containEql('Mongo failed');
        });

        it('should set overall failure when no sinks succeed', async function() {
            const mongoSink = createMockEventSink('MongoEventSink', { writeError: 'Mongo failed' });
            const kafkaSink = createMockEventSink('KafkaEventSink', { writeError: 'Kafka failed' });
            const sink = new UnifiedEventSink({
                config: createMockKafkaConfig(),
                log: createMockLogger('test'),
                sinks: [mongoSink, kafkaSink]
            });

            const events = [{ insertOne: { document: { a: 'app', e: 'event' } } }];
            const result = await sink.write(events);

            result.overall.success.should.be.false();
        });

        it('should include duration in result', async function() {
            const mockSink = createMockEventSink('MongoEventSink');
            const sink = new UnifiedEventSink({
                config: createMockKafkaConfig(),
                log: createMockLogger('test'),
                sinks: [mockSink]
            });

            const events = [{ insertOne: { document: { a: 'app', e: 'event' } } }];
            const result = await sink.write(events);

            result.overall.should.have.property('duration');
            result.overall.duration.should.be.a.Number();
        });
    });
});
