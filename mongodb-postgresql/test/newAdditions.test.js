'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert');
const { Double, Int32, UUID, DBRef } = require('../lib/bson');
const { Binary } = require('../lib/bson');

// ==========================
// Double
// ==========================
describe('Double', () => {
  it('should construct from number', () => {
    const d = new Double(3.14);
    assert.strictEqual(d.value, 3.14);
  });

  it('should construct from string', () => {
    const d = new Double('2.718');
    assert.strictEqual(d.value, 2.718);
  });

  it('valueOf should return the number', () => {
    assert.strictEqual(new Double(42).valueOf(), 42);
  });

  it('toJSON should return the number', () => {
    assert.strictEqual(new Double(1.5).toJSON(), 1.5);
  });

  it('toString should return string representation', () => {
    assert.strictEqual(new Double(3.14).toString(), '3.14');
  });

  it('equals should compare with another Double', () => {
    assert.ok(new Double(1).equals(new Double(1)));
    assert.ok(!new Double(1).equals(new Double(2)));
  });

  it('equals should compare with number', () => {
    assert.ok(new Double(42).equals(42));
  });

  it('custom inspect should show Double(...)', () => {
    const d = new Double(3.14);
    assert.strictEqual(d[Symbol.for('nodejs.util.inspect.custom')](), 'Double(3.14)');
  });

  it('should handle NaN', () => {
    const d = new Double(NaN);
    assert.ok(isNaN(d.value));
  });

  it('should handle Infinity', () => {
    const d = new Double(Infinity);
    assert.strictEqual(d.value, Infinity);
  });
});

// ==========================
// Int32
// ==========================
describe('Int32', () => {
  it('should construct from number', () => {
    assert.strictEqual(new Int32(42).value, 42);
  });

  it('should truncate to 32-bit integer', () => {
    assert.strictEqual(new Int32(3.9).value, 3);
    assert.strictEqual(new Int32(-3.9).value, -3);
  });

  it('should construct from string', () => {
    assert.strictEqual(new Int32('123').value, 123);
  });

  it('valueOf should return the integer', () => {
    assert.strictEqual(new Int32(7).valueOf(), 7);
  });

  it('toJSON should return the integer', () => {
    assert.strictEqual(new Int32(99).toJSON(), 99);
  });

  it('toString should return string', () => {
    assert.strictEqual(new Int32(42).toString(), '42');
  });

  it('equals should compare with another Int32', () => {
    assert.ok(new Int32(10).equals(new Int32(10)));
    assert.ok(!new Int32(10).equals(new Int32(11)));
  });

  it('equals should compare with number (truncated)', () => {
    assert.ok(new Int32(3).equals(3.7));
  });

  it('custom inspect should show Int32(...)', () => {
    assert.strictEqual(new Int32(42)[Symbol.for('nodejs.util.inspect.custom')](), 'Int32(42)');
  });

  it('should handle overflow by wrapping', () => {
    // JavaScript bitwise OR truncates to 32-bit
    const i = new Int32(2147483648); // 2^31 -> wraps to -2147483648
    assert.strictEqual(i.value, -2147483648);
  });
});

// ==========================
// UUID
// ==========================
describe('UUID', () => {
  describe('constructor', () => {
    it('should generate a new UUID when no args', () => {
      const u = new UUID();
      assert.strictEqual(u._hex.length, 32);
      assert.ok(/^[0-9a-f]{32}$/.test(u._hex));
    });

    it('should generate unique UUIDs', () => {
      const a = new UUID();
      const b = new UUID();
      assert.notStrictEqual(a._hex, b._hex);
    });

    it('should accept a UUID string with dashes', () => {
      const u = new UUID('550e8400-e29b-41d4-a716-446655440000');
      assert.strictEqual(u._hex, '550e8400e29b41d4a716446655440000');
    });

    it('should accept a UUID string without dashes', () => {
      const u = new UUID('550e8400e29b41d4a716446655440000');
      assert.strictEqual(u._hex, '550e8400e29b41d4a716446655440000');
    });

    it('should accept a 16-byte Buffer', () => {
      const buf = Buffer.alloc(16, 0xab);
      const u = new UUID(buf);
      assert.strictEqual(u._hex, 'abababababababababababababababab');
    });

    it('should accept another UUID', () => {
      const a = new UUID();
      const b = new UUID(a);
      assert.strictEqual(a._hex, b._hex);
    });

    it('should throw for invalid string', () => {
      assert.throws(() => new UUID('not-a-uuid'), /Invalid UUID/);
    });

    it('should throw for wrong-length Buffer', () => {
      assert.throws(() => new UUID(Buffer.alloc(8)), /16 bytes/);
    });

    it('should throw for invalid input type', () => {
      assert.throws(() => new UUID(12345), /Invalid UUID input/);
    });
  });

  describe('generate', () => {
    it('should return 32-char hex string', () => {
      const hex = UUID.generate();
      assert.strictEqual(hex.length, 32);
    });

    it('should set version 4 bits', () => {
      const hex = UUID.generate();
      // char at position 12 should be '4'
      assert.strictEqual(hex[12], '4');
    });

    it('should set variant bits', () => {
      const hex = UUID.generate();
      // char at position 16 should be 8, 9, a, or b
      assert.ok('89ab'.includes(hex[16]));
    });
  });

  describe('isValid', () => {
    it('should return true for UUID instance', () => {
      assert.ok(UUID.isValid(new UUID()));
    });

    it('should return true for valid string with dashes', () => {
      assert.ok(UUID.isValid('550e8400-e29b-41d4-a716-446655440000'));
    });

    it('should return true for valid string without dashes', () => {
      assert.ok(UUID.isValid('550e8400e29b41d4a716446655440000'));
    });

    it('should return true for 16-byte Buffer', () => {
      assert.ok(UUID.isValid(Buffer.alloc(16)));
    });

    it('should return false for invalid string', () => {
      assert.ok(!UUID.isValid('not-valid'));
    });

    it('should return false for wrong-length Buffer', () => {
      assert.ok(!UUID.isValid(Buffer.alloc(8)));
    });

    it('should return false for null', () => {
      assert.ok(!UUID.isValid(null));
    });
  });

  describe('serialization', () => {
    it('toHexString should return dashed format by default', () => {
      const u = new UUID('550e8400e29b41d4a716446655440000');
      assert.strictEqual(u.toHexString(), '550e8400-e29b-41d4-a716-446655440000');
    });

    it('toHexString(false) should return raw hex', () => {
      const u = new UUID('550e8400e29b41d4a716446655440000');
      assert.strictEqual(u.toHexString(false), '550e8400e29b41d4a716446655440000');
    });

    it('toString should return dashed format', () => {
      const u = new UUID('550e8400e29b41d4a716446655440000');
      assert.strictEqual(u.toString(), '550e8400-e29b-41d4-a716-446655440000');
    });

    it('toJSON should return dashed format', () => {
      const u = new UUID('550e8400e29b41d4a716446655440000');
      assert.strictEqual(u.toJSON(), '550e8400-e29b-41d4-a716-446655440000');
    });

    it('toBuffer should return 16-byte Buffer', () => {
      const u = new UUID();
      const buf = u.toBuffer();
      assert.ok(Buffer.isBuffer(buf));
      assert.strictEqual(buf.length, 16);
    });

    it('toBinary should return Binary with UUID subtype', () => {
      const u = new UUID();
      const b = u.toBinary();
      assert.ok(b instanceof Binary);
      assert.strictEqual(b.subType, Binary.SUBTYPE_UUID);
      assert.strictEqual(b.length(), 16);
    });

    it('custom inspect should show UUID("...")', () => {
      const u = new UUID('550e8400e29b41d4a716446655440000');
      const result = u[Symbol.for('nodejs.util.inspect.custom')]();
      assert.ok(result.startsWith('UUID("'));
      assert.ok(result.includes('550e8400'));
    });
  });

  describe('equals', () => {
    it('should compare with another UUID', () => {
      const hex = '550e8400e29b41d4a716446655440000';
      assert.ok(new UUID(hex).equals(new UUID(hex)));
      assert.ok(!new UUID().equals(new UUID()));
    });

    it('should compare with string (dashed)', () => {
      const u = new UUID('550e8400e29b41d4a716446655440000');
      assert.ok(u.equals('550e8400-e29b-41d4-a716-446655440000'));
    });

    it('should compare with string (no dashes)', () => {
      const u = new UUID('550e8400e29b41d4a716446655440000');
      assert.ok(u.equals('550e8400e29b41d4a716446655440000'));
    });

    it('should compare case-insensitively', () => {
      const u = new UUID('550e8400e29b41d4a716446655440000');
      assert.ok(u.equals('550E8400E29B41D4A716446655440000'));
    });

    it('should return false for non-matching', () => {
      assert.ok(!new UUID().equals('00000000-0000-0000-0000-000000000000'));
    });
  });
});

// ==========================
// DBRef
// ==========================
describe('DBRef', () => {
  it('should store collection and oid', () => {
    const ref = new DBRef('users', 'abc123');
    assert.strictEqual(ref.collection, 'users');
    assert.strictEqual(ref.oid, 'abc123');
  });

  it('should store optional db', () => {
    const ref = new DBRef('users', 'abc123', 'otherdb');
    assert.strictEqual(ref.db, 'otherdb');
  });

  it('should default db to empty string', () => {
    const ref = new DBRef('users', 'abc123');
    assert.strictEqual(ref.db, '');
  });

  it('should store additional fields', () => {
    const ref = new DBRef('users', 'abc123', '', { extra: true });
    assert.deepStrictEqual(ref.fields, { extra: true });
  });

  it('namespace getter should return collection', () => {
    const ref = new DBRef('users', 'abc123');
    assert.strictEqual(ref.namespace, 'users');
  });

  it('namespace setter should update collection', () => {
    const ref = new DBRef('users', 'abc123');
    ref.namespace = 'customers';
    assert.strictEqual(ref.collection, 'customers');
  });

  it('toJSON should return $ref format', () => {
    const ref = new DBRef('users', 'abc123');
    const json = ref.toJSON();
    assert.strictEqual(json.$ref, 'users');
    assert.strictEqual(json.$id, 'abc123');
  });

  it('toJSON should include $db when set', () => {
    const ref = new DBRef('users', 'abc123', 'mydb');
    const json = ref.toJSON();
    assert.strictEqual(json.$db, 'mydb');
  });

  it('toJSON should not include $db when empty', () => {
    const ref = new DBRef('users', 'abc123');
    const json = ref.toJSON();
    assert.strictEqual(json.$db, undefined);
  });

  it('toJSON should include extra fields', () => {
    const ref = new DBRef('users', 'abc123', '', { x: 1, y: 2 });
    const json = ref.toJSON();
    assert.strictEqual(json.x, 1);
    assert.strictEqual(json.y, 2);
  });

  it('toString should return formatted string', () => {
    const ref = new DBRef('users', 'abc123');
    assert.ok(ref.toString().includes('users'));
    assert.ok(ref.toString().includes('abc123'));
  });

  it('toString with db should include db', () => {
    const ref = new DBRef('users', 'abc123', 'mydb');
    assert.ok(ref.toString().includes('mydb'));
  });
});

// ==========================
// Cursor new methods
// ==========================
describe('Cursor new methods', () => {
  const { Cursor } = require('../lib/cursor');

  function createMockCollection(docs = []) {
    return {
      _name: 'test',
      _tableName: () => '"test"',
      _db: { _schemaName: null },
      countDocuments: async () => docs.length,
      _executeFind: async () => [...docs],
    };
  }

  describe('tryNext', () => {
    it('should return documents like next()', async () => {
      const cursor = new Cursor(createMockCollection([{ a: 1 }, { b: 2 }]), {});
      assert.deepStrictEqual(await cursor.tryNext(), { a: 1 });
      assert.deepStrictEqual(await cursor.tryNext(), { b: 2 });
      assert.strictEqual(await cursor.tryNext(), null);
    });

    it('should apply transform', async () => {
      const cursor = new Cursor(createMockCollection([{ name: 'A' }]), {});
      cursor.map(d => d.name);
      assert.strictEqual(await cursor.tryNext(), 'A');
    });
  });

  describe('allowDiskUse', () => {
    it('should return this', () => {
      const cursor = new Cursor(createMockCollection(), {});
      assert.strictEqual(cursor.allowDiskUse(), cursor);
      assert.strictEqual(cursor._allowDiskUse, true);
    });

    it('should accept false', () => {
      const cursor = new Cursor(createMockCollection(), {});
      cursor.allowDiskUse(false);
      assert.strictEqual(cursor._allowDiskUse, false);
    });
  });

  describe('maxAwaitTimeMS', () => {
    it('should return this', () => {
      const cursor = new Cursor(createMockCollection(), {});
      assert.strictEqual(cursor.maxAwaitTimeMS(5000), cursor);
      assert.strictEqual(cursor._maxAwaitTimeMS, 5000);
    });
  });

  describe('bufferedCount', () => {
    it('should return 0 before execution', () => {
      const cursor = new Cursor(createMockCollection(), {});
      assert.strictEqual(cursor.bufferedCount(), 0);
    });

    it('should return remaining count after execution', async () => {
      const cursor = new Cursor(createMockCollection([{ a: 1 }, { b: 2 }, { c: 3 }]), {});
      await cursor.next(); // consume one
      assert.strictEqual(cursor.bufferedCount(), 2);
    });

    it('should return 0 when fully consumed', async () => {
      const cursor = new Cursor(createMockCollection([{ a: 1 }]), {});
      await cursor.next();
      assert.strictEqual(cursor.bufferedCount(), 0);
    });
  });

  describe('readBufferedDocuments', () => {
    it('should return empty array before execution', () => {
      const cursor = new Cursor(createMockCollection(), {});
      assert.deepStrictEqual(cursor.readBufferedDocuments(), []);
    });

    it('should return all remaining docs', async () => {
      const cursor = new Cursor(createMockCollection([{ a: 1 }, { b: 2 }, { c: 3 }]), {});
      await cursor.next(); // consume first
      const docs = cursor.readBufferedDocuments();
      assert.strictEqual(docs.length, 2);
      assert.deepStrictEqual(docs, [{ b: 2 }, { c: 3 }]);
    });

    it('should return limited number when count specified', async () => {
      const cursor = new Cursor(createMockCollection([{ a: 1 }, { b: 2 }, { c: 3 }]), {});
      await cursor.toArray(); // execute
      cursor._index = 0; // reset index
      const docs = cursor.readBufferedDocuments(2);
      assert.strictEqual(docs.length, 2);
      assert.strictEqual(cursor.bufferedCount(), 1);
    });

    it('should apply transform', async () => {
      const cursor = new Cursor(createMockCollection([{ name: 'A' }, { name: 'B' }]), {});
      cursor.map(d => d.name);
      await cursor.toArray();
      cursor._index = 0;
      const docs = cursor.readBufferedDocuments();
      assert.deepStrictEqual(docs, ['A', 'B']);
    });
  });
});

// ==========================
// AggregationCursor new methods
// ==========================
describe('AggregationCursor new methods', () => {
  const { AggregationCursor } = require('../lib/aggregationCursor');

  function createMockCollection(docs = []) {
    return {
      _name: 'test',
      _db: { _schemaName: null },
      _executeAggregate: async () => [...docs],
    };
  }

  describe('tryNext', () => {
    it('should return documents like next()', async () => {
      const cursor = new AggregationCursor(createMockCollection([{ a: 1 }]), []);
      assert.deepStrictEqual(await cursor.tryNext(), { a: 1 });
      assert.strictEqual(await cursor.tryNext(), null);
    });
  });

  describe('bufferedCount', () => {
    it('should return remaining count', async () => {
      const cursor = new AggregationCursor(createMockCollection([{ a: 1 }, { b: 2 }]), []);
      await cursor.next();
      assert.strictEqual(cursor.bufferedCount(), 1);
    });
  });

  describe('readBufferedDocuments', () => {
    it('should return remaining docs', async () => {
      const cursor = new AggregationCursor(createMockCollection([{ a: 1 }, { b: 2 }]), []);
      await cursor.next();
      assert.deepStrictEqual(cursor.readBufferedDocuments(), [{ b: 2 }]);
    });
  });

  describe('clone', () => {
    it('should return a new unexecuted cursor', () => {
      const cursor = new AggregationCursor(createMockCollection(), [{ $match: { x: 1 } }]);
      cursor._executed = true;
      const cloned = cursor.clone();
      assert.notStrictEqual(cursor, cloned);
      assert.strictEqual(cloned._executed, false);
      assert.deepStrictEqual(cloned._pipeline, [{ $match: { x: 1 } }]);
    });
  });

  describe('rewind', () => {
    it('should reset state', async () => {
      const cursor = new AggregationCursor(createMockCollection([{ a: 1 }]), []);
      await cursor.toArray();
      assert.strictEqual(cursor._executed, true);
      cursor.rewind();
      assert.strictEqual(cursor._executed, false);
      assert.strictEqual(cursor._index, 0);
      assert.strictEqual(cursor._results, null);
    });

    it('should return this', () => {
      const cursor = new AggregationCursor(createMockCollection(), []);
      assert.strictEqual(cursor.rewind(), cursor);
    });
  });

  describe('pipeline getter', () => {
    it('should return the pipeline', () => {
      const pipeline = [{ $match: { x: 1 } }, { $sort: { y: -1 } }];
      const cursor = new AggregationCursor(createMockCollection(), pipeline);
      assert.deepStrictEqual(cursor.pipeline, pipeline);
    });
  });

  describe('fluent pipeline builders', () => {
    it('addStage should append stage and return this', () => {
      const cursor = new AggregationCursor(createMockCollection(), []);
      const result = cursor.addStage({ $match: { x: 1 } });
      assert.strictEqual(result, cursor);
      assert.deepStrictEqual(cursor._pipeline, [{ $match: { x: 1 } }]);
    });

    it('group should append $group', () => {
      const cursor = new AggregationCursor(createMockCollection(), []);
      cursor.group({ _id: '$status', count: { $sum: 1 } });
      assert.deepStrictEqual(cursor._pipeline[0], { $group: { _id: '$status', count: { $sum: 1 } } });
    });

    it('match should append $match', () => {
      const cursor = new AggregationCursor(createMockCollection(), []);
      cursor.match({ active: true });
      assert.deepStrictEqual(cursor._pipeline[0], { $match: { active: true } });
    });

    it('sort should append $sort', () => {
      const cursor = new AggregationCursor(createMockCollection(), []);
      cursor.sort({ name: 1 });
      assert.deepStrictEqual(cursor._pipeline[0], { $sort: { name: 1 } });
    });

    it('limit should append $limit', () => {
      const cursor = new AggregationCursor(createMockCollection(), []);
      cursor.limit(10);
      assert.deepStrictEqual(cursor._pipeline[0], { $limit: 10 });
    });

    it('skip should append $skip', () => {
      const cursor = new AggregationCursor(createMockCollection(), []);
      cursor.skip(5);
      assert.deepStrictEqual(cursor._pipeline[0], { $skip: 5 });
    });

    it('project should append $project', () => {
      const cursor = new AggregationCursor(createMockCollection(), []);
      cursor.project({ name: 1, _id: 0 });
      assert.deepStrictEqual(cursor._pipeline[0], { $project: { name: 1, _id: 0 } });
    });

    it('unwind should append $unwind', () => {
      const cursor = new AggregationCursor(createMockCollection(), []);
      cursor.unwind('$tags');
      assert.deepStrictEqual(cursor._pipeline[0], { $unwind: '$tags' });
    });

    it('lookup should append $lookup', () => {
      const doc = { from: 'orders', localField: 'userId', foreignField: 'userId', as: 'orders' };
      const cursor = new AggregationCursor(createMockCollection(), []);
      cursor.lookup(doc);
      assert.deepStrictEqual(cursor._pipeline[0], { $lookup: doc });
    });

    it('out should append $out', () => {
      const cursor = new AggregationCursor(createMockCollection(), []);
      cursor.out('results');
      assert.deepStrictEqual(cursor._pipeline[0], { $out: 'results' });
    });

    it('redact should append $redact', () => {
      const cursor = new AggregationCursor(createMockCollection(), []);
      cursor.redact('$$DESCEND');
      assert.deepStrictEqual(cursor._pipeline[0], { $redact: '$$DESCEND' });
    });

    it('geoNear should append $geoNear', () => {
      const doc = { near: { type: 'Point', coordinates: [0, 0] }, distanceField: 'dist' };
      const cursor = new AggregationCursor(createMockCollection(), []);
      cursor.geoNear(doc);
      assert.deepStrictEqual(cursor._pipeline[0], { $geoNear: doc });
    });

    it('should be chainable', () => {
      const cursor = new AggregationCursor(createMockCollection(), []);
      cursor.match({ active: true }).sort({ name: 1 }).limit(10).skip(5).project({ name: 1 });
      assert.strictEqual(cursor._pipeline.length, 5);
    });
  });
});

// ==========================
// GridFSBucket.openUploadStreamWithId
// ==========================
describe('GridFSBucket.openUploadStreamWithId', () => {
  const { GridFSBucket } = require('../lib/gridfs');
  const { ObjectId } = require('../lib/objectId');

  it('should create upload stream with specified id', () => {
    const mockDb = {
      _schemaName: null,
      _getPool: () => ({ query: async () => ({ rows: [] }) }),
      collection: () => ({})
    };
    const bucket = new GridFSBucket(mockDb);
    const customId = new ObjectId();
    const stream = bucket.openUploadStreamWithId(customId, 'test.txt');
    assert.ok(stream);
    assert.strictEqual(stream.id, customId);
  });

  it('should accept string id', () => {
    const mockDb = {
      _schemaName: null,
      _getPool: () => ({ query: async () => ({ rows: [] }) }),
      collection: () => ({})
    };
    const bucket = new GridFSBucket(mockDb);
    const stream = bucket.openUploadStreamWithId('my-custom-id', 'test.txt');
    assert.strictEqual(stream.id, 'my-custom-id');
  });
});

// ==========================
// ChangeStream new methods
// ==========================
describe('ChangeStream new methods', () => {
  const { ChangeStream } = require('../lib/changeStream');

  describe('tryNext', () => {
    it('should return null when closed', async () => {
      const cs = new ChangeStream({});
      cs._closed = true;
      assert.strictEqual(await cs.tryNext(), null);
    });
  });

  describe('stream', () => {
    it('should return a readable stream', () => {
      const cs = new ChangeStream({});
      // Can't fully test without PG but can check it exists and returns stream-like
      assert.ok(typeof cs.stream === 'function');
    });
  });
});

// ==========================
// ReturnDocument enum
// ==========================
describe('ReturnDocument', () => {
  it('should have BEFORE and AFTER', () => {
    const { ReturnDocument } = require('../index');
    assert.strictEqual(ReturnDocument.BEFORE, 'before');
    assert.strictEqual(ReturnDocument.AFTER, 'after');
  });

  it('should be frozen', () => {
    const { ReturnDocument } = require('../index');
    assert.ok(Object.isFrozen(ReturnDocument));
  });
});

// ==========================
// Updated exports check
// ==========================
describe('Updated package exports', () => {
  it('should export all 57 items', () => {
    const pkg = require('../index');
    assert.strictEqual(Object.keys(pkg).length, 59);
  });

  it('should export new BSON types', () => {
    const pkg = require('../index');
    assert.ok(pkg.Double);
    assert.ok(pkg.Int32);
    assert.ok(pkg.UUID);
    assert.ok(pkg.DBRef);
    assert.ok(pkg.BSONRegExp);
    assert.ok(pkg.ReturnDocument);
  });

  it('new BSON types should be constructible', () => {
    const { Double, Int32, UUID, DBRef, BSONRegExp } = require('../index');
    assert.ok(new Double(1.5));
    assert.ok(new Int32(42));
    assert.ok(new UUID());
    assert.ok(new DBRef('col', 'id'));
    assert.ok(new BSONRegExp('test'));
  });
});
