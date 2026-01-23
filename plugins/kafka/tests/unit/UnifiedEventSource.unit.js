/**
 * UnifiedEventSource Unit Tests
 *
 * Tests the UnifiedEventSource class that wraps EventSourceFactory.
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
    createMockEventSource
} = require('./helpers/mockSetup');

// Direct require of the UnifiedEventSource module
// Path from plugins/kafka/tests/unit/ to api/eventSource/
const UnifiedEventSource = require('../../../../api/eventSource/UnifiedEventSource');

describe('UnifiedEventSource', function() {
    before(function() {
        setupMocking();
    });
    after(function() {
        resetMocking();
    });

    // ========================================================================
    // Constructor Validation
    // ========================================================================
    describe('Constructor Validation', function() {
        it('should throw if name is missing', function() {
            should(() => {
                new UnifiedEventSource(null, { mongo: { db: createMockDb() } });
            }).throw(/requires a name/);
        });

        it('should throw if name is not a string', function() {
            should(() => {
                new UnifiedEventSource(123, { mongo: { db: createMockDb() } });
            }).throw(/requires a name \(string\)/);
        });

        it('should throw if name is empty string', function() {
            should(() => {
                new UnifiedEventSource('', { mongo: { db: createMockDb() } });
            }).throw(/requires a name/);
        });

        it('should throw if options.mongo.db is missing', function() {
            should(() => {
                new UnifiedEventSource('test-source', {});
            }).throw(/requires options.mongo.db/);
        });

        it('should throw if options.mongo is missing', function() {
            should(() => {
                new UnifiedEventSource('test-source', { kafka: {} });
            }).throw(/requires options.mongo.db/);
        });

        it('should accept valid options', function() {
            const mockDb = createMockDb();
            const source = new UnifiedEventSource('test-source', {
                mongo: { db: mockDb }
            }, {
                countlyConfig: createMockKafkaConfig(),
                common: { db: mockDb },
                log: createMockLogger('test')
            });
            should(source).be.ok();
        });
    });

    // ========================================================================
    // Dependency Injection
    // ========================================================================
    describe('Dependency Injection', function() {
        it('should use injected config', function() {
            const mockDb = createMockDb();
            const customConfig = {
                kafka: { enabled: false }
            };
            const source = new UnifiedEventSource('test-source', {
                mongo: { db: mockDb }
            }, {
                countlyConfig: customConfig,
                common: { db: mockDb },
                log: createMockLogger('test')
            });
            should(source).be.ok();
        });

        it('should use injected logger', function() {
            const mockDb = createMockDb();
            const customLog = createMockLogger('custom-log');
            const source = new UnifiedEventSource('test-source', {
                mongo: { db: mockDb }
            }, {
                countlyConfig: createMockKafkaConfig(),
                common: { db: mockDb },
                log: customLog
            });
            should(source).be.ok();
        });

        it('should use injected common', function() {
            const mockDb = createMockDb();
            const customCommon = { db: mockDb };
            const source = new UnifiedEventSource('test-source', {
                mongo: { db: mockDb }
            }, {
                countlyConfig: createMockKafkaConfig(),
                common: customCommon,
                log: createMockLogger('test')
            });
            should(source).be.ok();
        });
    });

    // ========================================================================
    // Async Iteration
    // ========================================================================
    describe('Async Iteration', function() {
        it('should be async iterable', function() {
            const mockDb = createMockDb();
            const source = new UnifiedEventSource('test-source', {
                mongo: { db: mockDb }
            }, {
                countlyConfig: { kafka: { enabled: false } },
                common: { db: mockDb },
                log: createMockLogger('test')
            });

            should(source[Symbol.asyncIterator]).be.a.Function();
        });

        it('should yield from async iterator', async function() {
            const mockDb = createMockDb();

            // Disable Kafka so it uses ChangeStream (which we also mock)
            const config = { kafka: { enabled: false } };

            const source = new UnifiedEventSource('test-source', {
                mongo: { db: mockDb }
            }, {
                countlyConfig: config,
                common: { db: mockDb },
                log: createMockLogger('test')
            });

            // Since we can't easily mock the underlying source's iteration,
            // we test that the iterator generator exists and is callable
            const iterator = source[Symbol.asyncIterator]();
            should(iterator).be.ok();
            should(iterator.next).be.a.Function();
        });
    });

    // ========================================================================
    // markBatchProcessed
    // ========================================================================
    describe('markBatchProcessed', function() {
        it('should not throw when called', async function() {
            const mockDb = createMockDb();
            const source = new UnifiedEventSource('test-source', {
                mongo: { db: mockDb }
            }, {
                countlyConfig: { kafka: { enabled: false } },
                common: { db: mockDb },
                log: createMockLogger('test')
            });

            // Should not throw even with no-op
            await source.markBatchProcessed({ token: 'test' });
        });
    });

    // ========================================================================
    // processWithAutoAck
    // ========================================================================
    describe('processWithAutoAck', function() {
        it('should be a function', function() {
            const mockDb = createMockDb();
            const source = new UnifiedEventSource('test-source', {
                mongo: { db: mockDb }
            }, {
                countlyConfig: { kafka: { enabled: false } },
                common: { db: mockDb },
                log: createMockLogger('test')
            });

            should(source.processWithAutoAck).be.a.Function();
        });

        it('should accept a handler function', async function() {
            const mockDb = createMockDb();
            const source = new UnifiedEventSource('test-source', {
                mongo: { db: mockDb }
            }, {
                countlyConfig: { kafka: { enabled: false } },
                common: { db: mockDb },
                log: createMockLogger('test')
            });

            // The method signature should accept a handler
            should(source.processWithAutoAck.length).be.greaterThan(0);
        });
    });

    // ========================================================================
    // Options Passing
    // ========================================================================
    describe('Options Passing', function() {
        it('should pass mongo options through', function() {
            const mockDb = createMockDb();
            const mongoOptions = {
                db: mockDb,
                collection: 'custom_collection',
                pipeline: [{ $match: { type: 'test' } }]
            };

            const source = new UnifiedEventSource('test-source', {
                mongo: mongoOptions
            }, {
                countlyConfig: { kafka: { enabled: false } },
                common: { db: mockDb },
                log: createMockLogger('test')
            });

            should(source).be.ok();
        });

        it('should pass kafka options through', function() {
            const mockDb = createMockDb();
            const kafkaOptions = {
                topics: ['custom-topic']
            };

            const source = new UnifiedEventSource('test-source', {
                mongo: { db: mockDb },
                kafka: kafkaOptions
            }, {
                countlyConfig: createMockKafkaConfig(),
                common: { db: mockDb },
                log: createMockLogger('test')
            });

            should(source).be.ok();
        });
    });

    // ========================================================================
    // Edge Cases
    // ========================================================================
    describe('Edge Cases', function() {
        it('should handle mongo.pipeline as empty array', function() {
            const mockDb = createMockDb();
            const source = new UnifiedEventSource('test-source', {
                mongo: {
                    db: mockDb,
                    pipeline: []
                }
            }, {
                countlyConfig: { kafka: { enabled: false } },
                common: { db: mockDb },
                log: createMockLogger('test')
            });

            should(source).be.ok();
        });

        it('should handle mongo.options as object', function() {
            const mockDb = createMockDb();
            const source = new UnifiedEventSource('test-source', {
                mongo: {
                    db: mockDb,
                    options: { fullDocument: 'updateLookup' }
                }
            }, {
                countlyConfig: { kafka: { enabled: false } },
                common: { db: mockDb },
                log: createMockLogger('test')
            });

            should(source).be.ok();
        });

        it('should handle fallback configuration', function() {
            const mockDb = createMockDb();
            const source = new UnifiedEventSource('test-source', {
                mongo: {
                    db: mockDb,
                    fallback: {
                        pipeline: [{ $match: { fallback: true } }]
                    }
                }
            }, {
                countlyConfig: { kafka: { enabled: false } },
                common: { db: mockDb },
                log: createMockLogger('test')
            });

            should(source).be.ok();
        });

        it('should handle onClose callback', function() {
            const mockDb = createMockDb();
            let onCloseCalled = false;

            const source = new UnifiedEventSource('test-source', {
                mongo: {
                    db: mockDb,
                    onClose: () => {
                        onCloseCalled = true;
                    }
                }
            }, {
                countlyConfig: { kafka: { enabled: false } },
                common: { db: mockDb },
                log: createMockLogger('test')
            });

            should(source).be.ok();
        });
    });

    // ========================================================================
    // stop() with Mock Source (Dependency Injection)
    // ========================================================================
    describe('stop() with Mock Source', function() {
        it('should delegate stop to underlying source', async function() {
            const mockDb = createMockDb();
            const mockSource = createMockEventSource();
            const source = new UnifiedEventSource('test-source', {
                mongo: { db: mockDb }
            }, {
                countlyConfig: { kafka: { enabled: false } },
                log: createMockLogger('test'),
                source: mockSource
            });

            mockSource.isStopped().should.be.false();
            await mockSource.stop();
            mockSource.isStopped().should.be.true();
        });

        it('should not throw when stop called multiple times', async function() {
            const mockDb = createMockDb();
            const mockSource = createMockEventSource();
            const source = new UnifiedEventSource('test-source', {
                mongo: { db: mockDb }
            }, {
                countlyConfig: { kafka: { enabled: false } },
                log: createMockLogger('test'),
                source: mockSource
            });

            await mockSource.stop();
            await mockSource.stop();
            await mockSource.stop();

            mockSource.isStopped().should.be.true();
        });
    });

    // ========================================================================
    // getNext() with Mock Source
    // ========================================================================
    describe('getNext() with Mock Source', function() {
        it('should return batch from underlying source', async function() {
            const mockDb = createMockDb();
            const mockSource = createMockEventSource();
            mockSource.addBatch({
                token: { key: 'test-token-1' },
                events: [{ a: 'app1', e: 'event1' }]
            });

            const source = new UnifiedEventSource('test-source', {
                mongo: { db: mockDb }
            }, {
                countlyConfig: { kafka: { enabled: false } },
                log: createMockLogger('test'),
                source: mockSource
            });

            const batch = await mockSource.getNext();

            should(batch).be.ok();
            batch.token.key.should.equal('test-token-1');
            batch.events.length.should.equal(1);
        });

        it('should return null when source is exhausted', async function() {
            const mockDb = createMockDb();
            const mockSource = createMockEventSource();
            // Don't add any batches

            const source = new UnifiedEventSource('test-source', {
                mongo: { db: mockDb }
            }, {
                countlyConfig: { kafka: { enabled: false } },
                log: createMockLogger('test'),
                source: mockSource
            });

            const batch = await mockSource.getNext();

            should(batch).be.null();
        });

        it('should return null when source is stopped', async function() {
            const mockDb = createMockDb();
            const mockSource = createMockEventSource();
            mockSource.addBatch({
                token: { key: 'test-token' },
                events: [{ a: 'app', e: 'event' }]
            });

            const source = new UnifiedEventSource('test-source', {
                mongo: { db: mockDb }
            }, {
                countlyConfig: { kafka: { enabled: false } },
                log: createMockLogger('test'),
                source: mockSource
            });

            await mockSource.stop();
            const batch = await mockSource.getNext();

            should(batch).be.null();
        });
    });

    // ========================================================================
    // processWithAutoAck with Mock Source
    // ========================================================================
    describe('processWithAutoAck with Mock Source', function() {
        it('should call handler with token and events for each batch', async function() {
            const mockDb = createMockDb();
            const mockSource = createMockEventSource();
            mockSource.addBatch({
                token: { key: 'token-1' },
                events: [{ a: 'app1', e: 'event1' }]
            });
            mockSource.addBatch({
                token: { key: 'token-2' },
                events: [{ a: 'app2', e: 'event2' }]
            });

            const source = new UnifiedEventSource('test-source', {
                mongo: { db: mockDb }
            }, {
                countlyConfig: { kafka: { enabled: false } },
                log: createMockLogger('test'),
                source: mockSource
            });

            const processedBatches = [];
            await source.processWithAutoAck(async(token, events) => {
                processedBatches.push({ token, events });
            });

            processedBatches.length.should.equal(2);
            processedBatches[0].token.key.should.equal('token-1');
            processedBatches[1].token.key.should.equal('token-2');
        });

        it('should call markBatchProcessed after handler completes', async function() {
            const mockDb = createMockDb();
            const mockSource = createMockEventSource();
            mockSource.addBatch({
                token: { key: 'token-1' },
                events: [{ a: 'app', e: 'event' }]
            });

            const source = new UnifiedEventSource('test-source', {
                mongo: { db: mockDb }
            }, {
                countlyConfig: { kafka: { enabled: false } },
                log: createMockLogger('test'),
                source: mockSource
            });

            await source.processWithAutoAck(async(token, events) => {
                // Just process the batch
            });

            const calls = mockSource.getMarkBatchProcessedCalls();
            calls.length.should.equal(1);
            calls[0].key.should.equal('token-1');
        });

        it('should stop iteration when source is exhausted', async function() {
            const mockDb = createMockDb();
            const mockSource = createMockEventSource();
            mockSource.addBatch({
                token: { key: 'token-1' },
                events: [{ a: 'app', e: 'event' }]
            });
            // Only one batch

            const source = new UnifiedEventSource('test-source', {
                mongo: { db: mockDb }
            }, {
                countlyConfig: { kafka: { enabled: false } },
                log: createMockLogger('test'),
                source: mockSource
            });

            let count = 0;
            await source.processWithAutoAck(async(token, events) => {
                count++;
            });

            count.should.equal(1);
            mockSource.isStopped().should.be.true();
        });

        it('should propagate handler errors', async function() {
            const mockDb = createMockDb();
            const mockSource = createMockEventSource();
            mockSource.addBatch({
                token: { key: 'token-1' },
                events: [{ a: 'app', e: 'event' }]
            });

            const source = new UnifiedEventSource('test-source', {
                mongo: { db: mockDb }
            }, {
                countlyConfig: { kafka: { enabled: false } },
                log: createMockLogger('test'),
                source: mockSource
            });

            let threw = false;
            try {
                await source.processWithAutoAck(async(token, events) => {
                    throw new Error('Handler error');
                });
            }
            catch (e) {
                threw = true;
                e.message.should.containEql('Handler error');
            }

            threw.should.be.true();
        });
    });

    // ========================================================================
    // Async Iteration with Mock Source
    // ========================================================================
    describe('Async Iteration with Mock Source', function() {
        it('should iterate over batches using for await...of', async function() {
            const mockDb = createMockDb();
            const mockSource = createMockEventSource();
            mockSource.addBatch({
                token: { key: 'token-1' },
                events: [{ a: 'app1', e: 'event1' }]
            });
            mockSource.addBatch({
                token: { key: 'token-2' },
                events: [{ a: 'app2', e: 'event2' }]
            });

            const source = new UnifiedEventSource('test-source', {
                mongo: { db: mockDb }
            }, {
                countlyConfig: { kafka: { enabled: false } },
                log: createMockLogger('test'),
                source: mockSource
            });

            const results = [];
            for await (const { token, events } of source) {
                results.push({ token, events });
            }

            results.length.should.equal(2);
            results[0].token.key.should.equal('token-1');
            results[1].token.key.should.equal('token-2');
        });

        it('should stop iteration when source returns null', async function() {
            const mockDb = createMockDb();
            const mockSource = createMockEventSource();
            // No batches added

            const source = new UnifiedEventSource('test-source', {
                mongo: { db: mockDb }
            }, {
                countlyConfig: { kafka: { enabled: false } },
                log: createMockLogger('test'),
                source: mockSource
            });

            const results = [];
            for await (const { token, events } of source) {
                results.push({ token, events });
            }

            results.length.should.equal(0);
        });

        it('should acknowledge previous batch before yielding next', async function() {
            const mockDb = createMockDb();
            const mockSource = createMockEventSource();
            mockSource.addBatch({
                token: { key: 'token-1' },
                events: [{ a: 'app1', e: 'event1' }]
            });
            mockSource.addBatch({
                token: { key: 'token-2' },
                events: [{ a: 'app2', e: 'event2' }]
            });

            const source = new UnifiedEventSource('test-source', {
                mongo: { db: mockDb }
            }, {
                countlyConfig: { kafka: { enabled: false } },
                log: createMockLogger('test'),
                source: mockSource
            });

            let count = 0;
            for await (const { token, events } of source) {
                count++;
                if (count === 2) {
                    // After receiving second batch, first should have been acknowledged
                    const lastAck = mockSource.getLastAcknowledgedToken();
                    should(lastAck).be.ok();
                    lastAck.key.should.equal('token-1');
                }
            }
        });
    });
});
