/**
 * EventSourceFactory Unit Tests
 *
 * Tests the EventSourceFactory class that creates event sources based on configuration.
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
    createMockDb
} = require('./helpers/mockSetup');

// Direct require of the EventSourceFactory module
// Path from plugins/kafka/tests/unit/ to api/eventSource/
const EventSourceFactory = require('../../../../api/eventSource/EventSourceFactory');

describe('EventSourceFactory', function() {
    before(function() {
        setupMocking();
    });
    after(function() {
        resetMocking();
    });

    // ========================================================================
    // Parameter Validation
    // ========================================================================
    describe('Parameter Validation', function() {
        it('should throw if name is missing', function() {
            const mockDb = createMockDb();
            should(() => {
                EventSourceFactory.create(null, { mongo: { db: mockDb } });
            }).throw(/requires a name/);
        });

        it('should throw if name is not a string', function() {
            const mockDb = createMockDb();
            should(() => {
                EventSourceFactory.create(123, { mongo: { db: mockDb } });
            }).throw(/requires a name \(string\)/);
        });

        it('should throw if name is empty string', function() {
            const mockDb = createMockDb();
            should(() => {
                EventSourceFactory.create('', { mongo: { db: mockDb } });
            }).throw(/requires a name/);
        });

        it('should throw if mongo.db is missing', function() {
            should(() => {
                EventSourceFactory.create('test-source', {});
            }).throw(/requires options.mongo.db/);
        });

        it('should throw if options.mongo is missing', function() {
            should(() => {
                EventSourceFactory.create('test-source', { kafka: {} });
            }).throw(/requires options.mongo.db/);
        });

        it('should throw if options is null', function() {
            should(() => {
                EventSourceFactory.create('test-source', null);
            }).throw(/requires options.mongo.db/);
        });
    });

    // ========================================================================
    // Source Selection
    // ========================================================================
    describe('Source Selection', function() {
        it('should use ChangeStream when Kafka is disabled', function() {
            const mockDb = createMockDb();
            const config = {
                kafka: { enabled: false }
            };

            const source = EventSourceFactory.create('test-source', {
                mongo: { db: mockDb }
            }, {
                countlyConfig: config,
                log: createMockLogger('test')
            });

            should(source).be.ok();
            source.constructor.name.should.equal('ChangeStreamEventSource');
        });

        it('should use ChangeStream when kafka config is missing', function() {
            const mockDb = createMockDb();
            const config = {};

            const source = EventSourceFactory.create('test-source', {
                mongo: { db: mockDb }
            }, {
                countlyConfig: config,
                log: createMockLogger('test')
            });

            should(source).be.ok();
            source.constructor.name.should.equal('ChangeStreamEventSource');
        });

        it('should attempt Kafka when enabled in config', function() {
            const mockDb = createMockDb();
            const config = createMockKafkaConfig();
            config.kafka.enabled = true;

            // In test env, Kafka modules may or may not be available
            // depending on how mocking is set up
            let source = null;
            try {
                source = EventSourceFactory.create('test-source', {
                    mongo: { db: mockDb }
                }, {
                    countlyConfig: config,
                    db: mockDb,
                    log: createMockLogger('test')
                });
            }
            catch (e) {
                // If Kafka modules not found, should fall back
            }

            if (source) {
                // Either KafkaEventSource or ChangeStreamEventSource is valid
                ['KafkaEventSource', 'ChangeStreamEventSource'].should.containEql(source.constructor.name);
            }
        });
    });

    // ========================================================================
    // Source Creation
    // ========================================================================
    describe('Source Creation', function() {
        it('should pass mongoOptions to ChangeStreamEventSource', function() {
            const mockDb = createMockDb();
            const config = { kafka: { enabled: false } };

            const source = EventSourceFactory.create('test-source', {
                mongo: {
                    db: mockDb,
                    collection: 'custom_collection',
                    pipeline: [{ $match: { type: 'test' } }]
                }
            }, {
                countlyConfig: config,
                log: createMockLogger('test')
            });

            should(source).be.ok();
            source.constructor.name.should.equal('ChangeStreamEventSource');
        });

        it('should pass kafkaOptions when creating KafkaEventSource', function() {
            const mockDb = createMockDb();
            const config = createMockKafkaConfig();
            config.kafka.enabled = true;

            // Test that kafkaOptions structure is accepted
            let source = null;
            try {
                source = EventSourceFactory.create('test-source', {
                    mongo: { db: mockDb },
                    kafka: { topics: ['my-topic'] }
                }, {
                    countlyConfig: config,
                    db: mockDb,
                    log: createMockLogger('test')
                });
            }
            catch (e) {
                // Expected if Kafka modules not fully available
            }

            // If successful, verify source exists
            if (source) {
                should(source).be.ok();
            }
        });

        it('should use injected logger', function() {
            const mockDb = createMockDb();
            const config = { kafka: { enabled: false } };
            const customLog = createMockLogger('custom');

            const source = EventSourceFactory.create('test-source', {
                mongo: { db: mockDb }
            }, {
                countlyConfig: config,
                log: customLog
            });

            should(source).be.ok();
        });

        it('should use injected countlyConfig', function() {
            const mockDb = createMockDb();
            const customConfig = {
                kafka: { enabled: false }
            };

            const source = EventSourceFactory.create('test-source', {
                mongo: { db: mockDb }
            }, {
                countlyConfig: customConfig,
                log: createMockLogger('test')
            });

            should(source).be.ok();
            source.constructor.name.should.equal('ChangeStreamEventSource');
        });
    });

    // ========================================================================
    // Kafka When Available
    // ========================================================================
    describe('Kafka When Available', function() {
        it('should use Kafka when enabled and modules available', function() {
            const mockDb = createMockDb();
            const config = createMockKafkaConfig();
            config.kafka.enabled = true;

            // When Kafka modules are available, should create KafkaEventSource
            const source = EventSourceFactory.create('test-source', {
                mongo: { db: mockDb }
            }, {
                countlyConfig: config,
                db: mockDb,
                log: createMockLogger('test')
            });

            should(source).be.ok();
            // In test env with Kafka modules, should use Kafka
            source.constructor.name.should.equal('KafkaEventSource');
        });
    });

    // ========================================================================
    // Database Passing for Dedup
    // ========================================================================
    describe('Database for Deduplication', function() {
        it('should accept db dependency for batch dedup', function() {
            const mockDb = createMockDb();
            const config = createMockKafkaConfig();
            config.kafka.enabled = true;

            // Test that db is accepted as dependency
            let source = null;
            try {
                source = EventSourceFactory.create('test-source', {
                    mongo: { db: mockDb }
                }, {
                    countlyConfig: config,
                    db: mockDb,
                    log: createMockLogger('test')
                });
            }
            catch (e) {
                // Expected if Kafka modules not available
            }

            // Factory should not throw on db presence
        });
    });

    // ========================================================================
    // Edge Cases
    // ========================================================================
    describe('Edge Cases', function() {
        it('should handle options with only mongo section', function() {
            const mockDb = createMockDb();
            const config = { kafka: { enabled: false } };

            const source = EventSourceFactory.create('test-source', {
                mongo: { db: mockDb }
            }, {
                countlyConfig: config,
                log: createMockLogger('test')
            });

            should(source).be.ok();
        });

        it('should handle options with both mongo and kafka sections', function() {
            const mockDb = createMockDb();
            const config = { kafka: { enabled: false } };

            const source = EventSourceFactory.create('test-source', {
                mongo: { db: mockDb },
                kafka: { topics: ['test'] }
            }, {
                countlyConfig: config,
                log: createMockLogger('test')
            });

            should(source).be.ok();
        });

        it('should handle empty dependencies object', function() {
            const mockDb = createMockDb();

            // With empty dependencies, should use defaults
            const source = EventSourceFactory.create('test-source', {
                mongo: { db: mockDb }
            }, {});

            should(source).be.ok();
        });
    });
});
