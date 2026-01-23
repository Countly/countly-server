/**
 * Event Transformer Unit Tests
 *
 * Tests the transformToKafkaEventFormat function that converts MongoDB documents
 * to Kafka event format.
 *
 * Usage:
 *   npm run test:unit
 */
const should = require('should');

// Setup mocking before requiring the module
const {
    setupMocking,
    resetMocking
} = require('./helpers/mockSetup');

// Direct require of the eventTransformer module
// Path from plugins/kafka/tests/unit/ to api/utils/
const { transformToKafkaEventFormat } = require('../../../../api/utils/eventTransformer');

describe('transformToKafkaEventFormat', function() {
    before(function() {
        setupMocking();
    });
    after(function() {
        resetMocking();
    });

    // ========================================================================
    // Required Fields
    // ========================================================================
    describe('Required Fields', function() {
        it('should return null if doc is null', function() {
            const result = transformToKafkaEventFormat(null);
            should(result).be.null();
        });

        it('should return null if doc is undefined', function() {
            const result = transformToKafkaEventFormat(undefined);
            should(result).be.null();
        });

        it('should return null if missing "a" field', function() {
            const doc = {
                e: 'test-event',
                ts: Date.now(),
                _id: 'doc-id'
            };
            const result = transformToKafkaEventFormat(doc);
            should(result).be.null();
        });

        it('should return null if missing "e" field', function() {
            const doc = {
                a: 'app-id',
                ts: Date.now(),
                _id: 'doc-id'
            };
            const result = transformToKafkaEventFormat(doc);
            should(result).be.null();
        });

        it('should return null if missing "ts" field', function() {
            const doc = {
                a: 'app-id',
                e: 'test-event',
                _id: 'doc-id'
            };
            const result = transformToKafkaEventFormat(doc);
            should(result).be.null();
        });

        it('should return null if missing "_id" field', function() {
            const doc = {
                a: 'app-id',
                e: 'test-event',
                ts: Date.now()
            };
            const result = transformToKafkaEventFormat(doc);
            should(result).be.null();
        });

        it('should transform valid document with all required fields', function() {
            const doc = {
                a: 'app-id',
                e: 'test-event',
                ts: 1704067200000, // 2024-01-01 00:00:00
                _id: 'doc-id'
            };
            const result = transformToKafkaEventFormat(doc);
            should(result).not.be.null();
            result.should.have.property('a', 'app-id');
            result.should.have.property('e', 'test-event');
            result.should.have.property('ts', 1704067200000);
            result.should.have.property('_id', 'doc-id');
        });
    });

    // ========================================================================
    // Timestamp Handling
    // ========================================================================
    describe('Timestamp Handling', function() {
        it('should keep numeric timestamp as-is', function() {
            const doc = {
                a: 'app-id',
                e: 'test-event',
                ts: 1704067200000,
                _id: 'doc-id'
            };
            const result = transformToKafkaEventFormat(doc);
            result.ts.should.equal(1704067200000);
        });

        it('should convert Date object to timestamp', function() {
            const date = new Date('2024-01-01T00:00:00.000Z');
            const doc = {
                a: 'app-id',
                e: 'test-event',
                ts: date,
                _id: 'doc-id'
            };
            const result = transformToKafkaEventFormat(doc);
            result.ts.should.equal(date.getTime());
        });

        it('should parse ISO string timestamp', function() {
            const doc = {
                a: 'app-id',
                e: 'test-event',
                ts: '2024-01-01T00:00:00.000Z',
                _id: 'doc-id'
            };
            const result = transformToKafkaEventFormat(doc);
            result.ts.should.equal(new Date('2024-01-01T00:00:00.000Z').getTime());
        });

        it('should handle lu field with Date object', function() {
            const date = new Date('2024-01-15T12:00:00.000Z');
            const doc = {
                a: 'app-id',
                e: 'test-event',
                ts: Date.now(),
                _id: 'doc-id',
                lu: date
            };
            const result = transformToKafkaEventFormat(doc);
            result.lu.should.equal(date.getTime());
        });

        it('should handle lu field with numeric timestamp', function() {
            const doc = {
                a: 'app-id',
                e: 'test-event',
                ts: Date.now(),
                _id: 'doc-id',
                lu: 1704067200000
            };
            const result = transformToKafkaEventFormat(doc);
            result.lu.should.equal(1704067200000);
        });
    });

    // ========================================================================
    // Optional Fields
    // ========================================================================
    describe('Optional Fields', function() {
        const baseDoc = {
            a: 'app-id',
            e: 'test-event',
            ts: Date.now(),
            _id: 'doc-id'
        };

        it('should include "n" field with default empty string', function() {
            const result = transformToKafkaEventFormat({ ...baseDoc });
            result.should.have.property('n', '');
        });

        it('should include "n" field when provided', function() {
            const doc = { ...baseDoc, n: 'event-name' };
            const result = transformToKafkaEventFormat(doc);
            result.n.should.equal('event-name');
        });

        it('should include "uid" field when provided', function() {
            const doc = { ...baseDoc, uid: 'user-123' };
            const result = transformToKafkaEventFormat(doc);
            result.uid.should.equal('user-123');
        });

        it('should include "did" field when provided', function() {
            const doc = { ...baseDoc, did: 'device-456' };
            const result = transformToKafkaEventFormat(doc);
            result.did.should.equal('device-456');
        });

        it('should include "_uid" field when provided', function() {
            const doc = { ...baseDoc, _uid: 'internal-user-789' };
            const result = transformToKafkaEventFormat(doc);
            result._uid.should.equal('internal-user-789');
        });

        it('should include "lsid" field when provided', function() {
            const doc = { ...baseDoc, lsid: 'session-abc' };
            const result = transformToKafkaEventFormat(doc);
            result.lsid.should.equal('session-abc');
        });

        it('should not include "lsid" field when not provided', function() {
            const result = transformToKafkaEventFormat({ ...baseDoc });
            result.should.not.have.property('lsid');
        });

        it('should include "c" (count) field when provided', function() {
            const doc = { ...baseDoc, c: 5 };
            const result = transformToKafkaEventFormat(doc);
            result.c.should.equal(5);
        });

        it('should include "s" (sum) field when provided', function() {
            const doc = { ...baseDoc, s: 100.5 };
            const result = transformToKafkaEventFormat(doc);
            result.s.should.equal(100.5);
        });

        it('should include "dur" (duration) field when provided', function() {
            const doc = { ...baseDoc, dur: 30000 };
            const result = transformToKafkaEventFormat(doc);
            result.dur.should.equal(30000);
        });

        it('should include "up" (user properties) object when provided', function() {
            const doc = { ...baseDoc, up: { name: 'John', age: 30 } };
            const result = transformToKafkaEventFormat(doc);
            result.up.should.deepEqual({ name: 'John', age: 30 });
        });

        it('should not include "up" if not an object', function() {
            const doc = { ...baseDoc, up: 'not-an-object' };
            const result = transformToKafkaEventFormat(doc);
            result.should.not.have.property('up');
        });

        it('should include "custom" object when provided', function() {
            const doc = { ...baseDoc, custom: { key1: 'value1', key2: 123 } };
            const result = transformToKafkaEventFormat(doc);
            result.custom.should.deepEqual({ key1: 'value1', key2: 123 });
        });

        it('should include "cmp" (campaign) object when provided', function() {
            const doc = { ...baseDoc, cmp: { source: 'google', medium: 'cpc' } };
            const result = transformToKafkaEventFormat(doc);
            result.cmp.should.deepEqual({ source: 'google', medium: 'cpc' });
        });

        it('should include "sg" (segmentation) object when provided', function() {
            const doc = { ...baseDoc, sg: { platform: 'ios', version: '1.0' } };
            const result = transformToKafkaEventFormat(doc);
            result.sg.should.deepEqual({ platform: 'ios', version: '1.0' });
        });

        it('should include "up_extra" object when provided', function() {
            const doc = { ...baseDoc, up_extra: { extra: 'data' } };
            const result = transformToKafkaEventFormat(doc);
            result.up_extra.should.deepEqual({ extra: 'data' });
        });
    });

    // ========================================================================
    // Type Coercion
    // ========================================================================
    describe('Type Coercion', function() {
        const baseDoc = {
            a: 'app-id',
            e: 'test-event',
            ts: Date.now(),
            _id: 'doc-id'
        };

        it('should coerce string "c" to number', function() {
            const doc = { ...baseDoc, c: '10' };
            const result = transformToKafkaEventFormat(doc);
            result.c.should.equal(10);
            (typeof result.c).should.equal('number');
        });

        it('should coerce string "s" to number', function() {
            const doc = { ...baseDoc, s: '99.99' };
            const result = transformToKafkaEventFormat(doc);
            result.s.should.equal(99.99);
            (typeof result.s).should.equal('number');
        });

        it('should coerce string "dur" to number', function() {
            const doc = { ...baseDoc, dur: '5000' };
            const result = transformToKafkaEventFormat(doc);
            result.dur.should.equal(5000);
            (typeof result.dur).should.equal('number');
        });

        it('should handle zero values for numeric fields', function() {
            const doc = { ...baseDoc, c: 0, s: 0, dur: 0 };
            const result = transformToKafkaEventFormat(doc);
            result.c.should.equal(0);
            result.s.should.equal(0);
            result.dur.should.equal(0);
        });

        it('should not include numeric fields with null values', function() {
            const doc = { ...baseDoc, c: null, s: null, dur: null };
            const result = transformToKafkaEventFormat(doc);
            result.should.not.have.property('c');
            result.should.not.have.property('s');
            result.should.not.have.property('dur');
        });

        it('should not include numeric fields with undefined values', function() {
            const doc = { ...baseDoc, c: undefined, s: undefined };
            const result = transformToKafkaEventFormat(doc);
            result.should.not.have.property('c');
            result.should.not.have.property('s');
        });
    });

    // ========================================================================
    // Complete Document Transformation
    // ========================================================================
    describe('Complete Document', function() {
        it('should transform a complete document with all fields', function() {
            const now = Date.now();
            const doc = {
                a: 'app-123',
                e: '[CLY]_session',
                n: 'session-event',
                ts: now,
                _id: 'event-xyz',
                uid: 'user-001',
                did: 'device-002',
                _uid: 'internal-003',
                lsid: 'session-004',
                c: 1,
                s: 50.5,
                dur: 15000,
                up: { country: 'US' },
                custom: { tier: 'premium' },
                cmp: { campaign: 'winter-sale' },
                sg: { os: 'Android' },
                up_extra: { prefs: { notify: true } },
                lu: now - 86400000
            };

            const result = transformToKafkaEventFormat(doc);

            result.should.have.property('a', 'app-123');
            result.should.have.property('e', '[CLY]_session');
            result.should.have.property('n', 'session-event');
            result.should.have.property('ts', now);
            result.should.have.property('_id', 'event-xyz');
            result.should.have.property('uid', 'user-001');
            result.should.have.property('did', 'device-002');
            result.should.have.property('_uid', 'internal-003');
            result.should.have.property('lsid', 'session-004');
            result.should.have.property('c', 1);
            result.should.have.property('s', 50.5);
            result.should.have.property('dur', 15000);
            result.up.should.deepEqual({ country: 'US' });
            result.custom.should.deepEqual({ tier: 'premium' });
            result.cmp.should.deepEqual({ campaign: 'winter-sale' });
            result.sg.should.deepEqual({ os: 'Android' });
            result.up_extra.should.deepEqual({ prefs: { notify: true } });
            result.should.have.property('lu', now - 86400000);
        });
    });
});
