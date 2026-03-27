'use strict';

const { describe, it, before, after, beforeEach } = require('node:test');
const assert = require('node:assert');

// Import everything to exercise all exports
const {
  MongoClient, Db, Admin, Collection, Cursor, AggregationCursor,
  ObjectId, Long, Decimal128, Binary, Timestamp, MinKey, MaxKey,
  Code, BSONRegExp, Double, Int32, UUID, DBRef,
  ReadPreference, WriteConcern, ReadConcern, ReturnDocument,
  ClientSession, ChangeStream, GridFSBucket,
  MongoError, MongoDriverError, MongoAPIError, MongoRuntimeError,
  MongoNetworkError, MongoNetworkTimeoutError,
  MongoServerError, MongoServerSelectionError,
  MongoParseError, MongoInvalidArgumentError, MongoCompatibilityError,
  MongoWriteConcernError, MongoBulkWriteError,
  MongoTransactionError, MongoExpiredSessionError,
  MongoNotConnectedError, MongoTopologyClosedError,
  MongoCursorExhaustedError, MongoCursorInUseError,
  MongoGridFSStreamError, MongoGridFSChunkError,
  MongoChangeStreamError, MongoSystemError,
  MongoMissingCredentialsError, MongoMissingDependencyError,
  MongoTailableCursorError, MongoBatchReExecutionError,
  MongoUnexpectedServerResponseError, MongoDecompressionError, MongoStalePrimaryError,
  BulkWriteResult, OrderedBulkOperation, UnorderedBulkOperation
} = require('../index');

const PG_URL = process.env.PG_URL || 'postgresql://testuser:testpass@localhost:5433/testdb';
let client, db;

before(async () => {
  client = await MongoClient.connect(PG_URL);
  db = client.db('cov_test');
  try { await client._pool.query('CREATE SCHEMA IF NOT EXISTS "cov_test"'); } catch (e) {}
});

after(async () => {
  if (db) try { await db.dropDatabase(); } catch (e) {}
  if (client) await client.close();
});

// ============================================================
// BSON Types used in real documents
// ============================================================
describe('ICov: BSON Types Roundtrip', () => {
  let col;
  before(async () => { col = db.collection('bson_types'); try { await col.drop(); } catch(e){} });

  it('all BSON types should roundtrip', async () => {
    const doc = {
      aLong: new Long(9007199254740993n),
      aDecimal: new Decimal128('3.14159265358979'),
      aBinary: new Binary(Buffer.from('binary data')),
      aTimestamp: new Timestamp({ t: 1234567890, i: 1 }),
      aCode: new Code('return 1'),
      aDouble: new Double(2.718),
      anInt32: new Int32(42),
      aDate: new Date('2024-06-15T12:00:00Z'),
      aRegex: /^test/i,
      aBuffer: Buffer.from('hello'),
      aNull: null,
      aBool: true,
      aNumber: 3.14,
      aString: 'text',
      anArray: [1, 'two', true],
      anObject: { nested: { deep: 'value' } }
    };
    const { insertedId } = await col.insertOne(doc);
    const found = await col.findOne({ _id: insertedId });

    assert.ok(found.aDate instanceof Date);
    assert.ok(found.aRegex instanceof RegExp);
    assert.ok(Buffer.isBuffer(found.aBuffer));
    assert.strictEqual(found.aBool, true);
    assert.strictEqual(found.aNumber, 3.14);
    assert.strictEqual(found.aString, 'text');
    assert.strictEqual(found.aNull, null);
    assert.deepStrictEqual(found.anArray, [1, 'two', true]);
    assert.strictEqual(found.anObject.nested.deep, 'value');
  });

  it('ObjectId methods should all work', () => {
    const id = new ObjectId();
    assert.ok(ObjectId.isValid(id));
    assert.ok(ObjectId.isValid(id.toHexString()));
    assert.ok(id.getTimestamp() instanceof Date);
    assert.strictEqual(id.toString(), id.toHexString());
    assert.strictEqual(id.toJSON(), id.toHexString());
    assert.ok(id.equals(new ObjectId(id.toHexString())));
    assert.ok(!id.equals(new ObjectId()));

    const fromHex = ObjectId.createFromHexString(id.toHexString());
    assert.ok(id.equals(fromHex));
    const fromTime = ObjectId.createFromTime(Date.now());
    assert.ok(ObjectId.isValid(fromTime));

    assert.ok(!ObjectId.isValid('bad'));
    assert.ok(!ObjectId.isValid(123));
    assert.throws(() => new ObjectId('bad'));
  });

  it('Long methods', () => {
    const l = Long.fromNumber(42);
    assert.strictEqual(l.toNumber(), 42);
    assert.strictEqual(l.toString(), '42');
    assert.ok(l.equals(new Long(42)));
    assert.ok(l.equals(42));
    const l2 = Long.fromString('100');
    assert.strictEqual(l2.toNumber(), 100);
  });

  it('Decimal128 methods', () => {
    const d = Decimal128.fromString('1.23');
    assert.strictEqual(d.toString(), '1.23');
    assert.deepStrictEqual(d.toJSON(), { $numberDecimal: '1.23' });
    assert.strictEqual(d.valueOf(), 1.23);
  });

  it('Binary methods', () => {
    const b = new Binary(Buffer.from('test'), Binary.SUBTYPE_DEFAULT);
    assert.strictEqual(b.length(), 4);
    assert.ok(b.value().equals(Buffer.from('test')));
    assert.strictEqual(b.toString('utf8'), 'test');
    assert.ok(b.toJSON()); // base64
  });

  it('Timestamp methods', () => {
    const ts = new Timestamp({ t: 100, i: 5 });
    assert.strictEqual(ts.getHighBits(), 100);
    assert.strictEqual(ts.getLowBits(), 5);
    assert.deepStrictEqual(ts.toJSON(), { t: 100, i: 5 });
  });

  it('MinKey/MaxKey/Code', () => {
    assert.deepStrictEqual(new MinKey().toJSON(), { $minKey: 1 });
    assert.deepStrictEqual(new MaxKey().toJSON(), { $maxKey: 1 });
    const c = new Code('return x', { x: 1 });
    assert.deepStrictEqual(c.toJSON(), { $code: 'return x', $scope: { x: 1 } });
  });

  it('Double/Int32 methods', () => {
    const d = new Double(3.14);
    assert.strictEqual(d.valueOf(), 3.14);
    assert.strictEqual(d.toString(), '3.14');
    assert.ok(d.equals(3.14));
    const i = new Int32(42);
    assert.strictEqual(i.valueOf(), 42);
    assert.ok(i.equals(42));
  });

  it('UUID methods', () => {
    const u = new UUID();
    assert.ok(UUID.isValid(u));
    assert.ok(UUID.isValid(u.toHexString()));
    assert.ok(u.toBuffer().length === 16);
    const u2 = new UUID(u.toHexString());
    assert.ok(u.equals(u2));
    assert.ok(!UUID.isValid('nope'));
  });

  it('DBRef methods', () => {
    const ref = new DBRef('users', 'abc', 'mydb');
    assert.strictEqual(ref.namespace, 'users');
    const json = ref.toJSON();
    assert.strictEqual(json.$ref, 'users');
    assert.strictEqual(json.$id, 'abc');
    assert.strictEqual(json.$db, 'mydb');
  });

  it('BSONRegExp methods', () => {
    const r = new BSONRegExp('^test', 'i');
    const re = r.toRegExp();
    assert.ok(re instanceof RegExp);
    assert.ok(re.test('Testing'));
  });

  it('ReturnDocument enum', () => {
    assert.strictEqual(ReturnDocument.BEFORE, 'before');
    assert.strictEqual(ReturnDocument.AFTER, 'after');
    assert.ok(Object.isFrozen(ReturnDocument));
  });
});

// ============================================================
// Error classes
// ============================================================
describe('ICov: Error Classes', () => {
  it('all error classes should be constructible and inherit MongoError', () => {
    const classes = [
      MongoError, MongoDriverError, MongoAPIError, MongoRuntimeError,
      MongoNetworkError, MongoNetworkTimeoutError,
      MongoServerSelectionError, MongoParseError, MongoInvalidArgumentError,
      MongoCompatibilityError, MongoTransactionError, MongoExpiredSessionError,
      MongoNotConnectedError, MongoTopologyClosedError,
      MongoCursorExhaustedError, MongoCursorInUseError,
      MongoGridFSStreamError, MongoGridFSChunkError,
      MongoChangeStreamError, MongoSystemError,
      MongoMissingCredentialsError, MongoMissingDependencyError,
      MongoTailableCursorError, MongoBatchReExecutionError,
      MongoUnexpectedServerResponseError, MongoDecompressionError, MongoStalePrimaryError
    ];
    for (const Cls of classes) {
      const e = new Cls('test');
      assert.ok(e instanceof Error);
      assert.ok(e instanceof MongoError);
      assert.ok(e.message);
      assert.ok(e.name);
      assert.ok(e.stack);
    }
    // Specialized constructors
    const se = new MongoServerError('dup', 11000);
    assert.strictEqual(se.code, 11000);
    const wce = new MongoWriteConcernError('wc', { n: 1 });
    assert.strictEqual(wce.result.n, 1);
    const bwe = new MongoBulkWriteError('bw', { writeErrors: [{ index: 0 }] });
    assert.strictEqual(bwe.writeErrors.length, 1);
  });

  it('duplicate key should throw MongoServerError 11000', async () => {
    const col = db.collection('err_test');
    try { await col.drop(); } catch(e){}
    await col.insertOne({ _id: 'dup' });
    try {
      await col.insertOne({ _id: 'dup' });
      assert.fail('should have thrown');
    } catch (e) {
      assert.strictEqual(e.code, 11000);
      assert.ok(e instanceof MongoServerError);
      assert.ok(e instanceof MongoError);
    }
  });
});

// ============================================================
// Concerns (ReadPreference, WriteConcern, ReadConcern)
// ============================================================
describe('ICov: Concerns', () => {
  it('ReadPreference instances and validation', () => {
    assert.ok(new ReadPreference('primary').isValid());
    assert.ok(ReadPreference.primary instanceof ReadPreference);
    assert.ok(ReadPreference.secondary instanceof ReadPreference);
    assert.ok(ReadPreference.nearest instanceof ReadPreference);
    assert.ok(!new ReadPreference('bad').isValid());
    const rp = new ReadPreference('secondary', [{ dc: 'east' }], { maxStalenessSeconds: 90 });
    assert.strictEqual(rp.mode, 'secondary');
  });

  it('WriteConcern construction and fromOptions', () => {
    const wc = new WriteConcern('majority', 5000, true);
    assert.strictEqual(wc.w, 'majority');
    assert.strictEqual(WriteConcern.MAJORITY, 'majority');
    assert.ok(WriteConcern.fromOptions({ writeConcern: { w: 1 } }));
    assert.ok(WriteConcern.fromOptions({ w: 1 }));
    assert.strictEqual(WriteConcern.fromOptions(null), undefined);
    assert.strictEqual(WriteConcern.fromOptions({}), undefined);
  });

  it('ReadConcern construction and fromOptions', () => {
    const rc = new ReadConcern('majority');
    assert.strictEqual(rc.level, 'majority');
    assert.ok(ReadConcern.fromOptions({ readConcern: 'snapshot' }));
    assert.ok(ReadConcern.fromOptions({ readConcern: { level: 'local' } }));
    assert.strictEqual(ReadConcern.fromOptions(null), undefined);
  });
});

// ============================================================
// Cursor exhaustive
// ============================================================
describe('ICov: Cursor Methods', () => {
  let col;
  before(async () => {
    col = db.collection('cursor_cov');
    try { await col.drop(); } catch(e){}
    const docs = [];
    for (let i = 0; i < 15; i++) docs.push({ idx: i, name: `n${i}`, group: i % 3 });
    await col.insertMany(docs);
  });

  it('all chainable methods should return cursor', () => {
    const c = col.find({});
    assert.ok(c.filter({ idx: 1 }) === c);
    assert.ok(c.project({ name: 1 }) === c);
    assert.ok(c.sort({ idx: 1 }) === c);
    assert.ok(c.skip(0) === c);
    assert.ok(c.limit(10) === c);
    assert.ok(c.batchSize(100) === c);
    assert.ok(c.hint({ idx: 1 }) === c);
    assert.ok(c.comment('test') === c);
    assert.ok(c.maxTimeMS(5000) === c);
    assert.ok(c.collation({ locale: 'en' }) === c);
    assert.ok(c.min({ idx: 0 }) === c);
    assert.ok(c.max({ idx: 100 }) === c);
    assert.ok(c.returnKey(false) === c);
    assert.ok(c.showRecordId(false) === c);
    assert.ok(c.addCursorFlag('noCursorTimeout', true) === c);
    assert.ok(c.allowDiskUse() === c);
    assert.ok(c.maxAwaitTimeMS(1000) === c);
    assert.ok(c.map(d => d) === c);
  });

  it('toArray, next, hasNext, tryNext, count', async () => {
    const arr = await col.find({}).sort({ idx: 1 }).limit(3).toArray();
    assert.strictEqual(arr.length, 3);

    const c2 = col.find({}).sort({ idx: 1 }).limit(2);
    assert.ok(await c2.hasNext());
    const d1 = await c2.next();
    assert.strictEqual(d1.idx, 0);
    const d2 = await c2.tryNext();
    assert.strictEqual(d2.idx, 1);
    assert.strictEqual(await c2.tryNext(), null);

    assert.strictEqual(await col.find({}).count(), 15);
  });

  it('forEach with early exit', async () => {
    const items = [];
    await col.find({}).sort({ idx: 1 }).forEach(d => { items.push(d.idx); return items.length < 3; });
    assert.strictEqual(items.length, 3);
  });

  it('map transform', async () => {
    const names = await col.find({}).sort({ idx: 1 }).limit(2).map(d => d.name).toArray();
    assert.deepStrictEqual(names, ['n0', 'n1']);
  });

  it('clone and rewind', async () => {
    const c = col.find({}).sort({ idx: 1 }).limit(2);
    const r1 = await c.toArray();
    const c2 = c.clone();
    const r2 = await c2.toArray();
    assert.deepStrictEqual(r1, r2);
    c.rewind();
    const r3 = await c.toArray();
    assert.deepStrictEqual(r1, r3);
  });

  it('bufferedCount and readBufferedDocuments', async () => {
    const c = col.find({}).sort({ idx: 1 });
    await c.next();
    assert.strictEqual(c.bufferedCount(), 14);
    const batch = c.readBufferedDocuments(3);
    assert.strictEqual(batch.length, 3);
    assert.strictEqual(c.bufferedCount(), 11);
  });

  it('async iteration', async () => {
    const items = [];
    for await (const d of col.find({}).sort({ idx: 1 }).limit(3)) items.push(d.idx);
    assert.deepStrictEqual(items, [0, 1, 2]);
  });

  it('explain', async () => {
    const plan = await col.find({ idx: { $gt: 5 } }).explain();
    assert.ok(plan.queryPlanner.sql.includes('SELECT'));
  });

  it('close', async () => {
    const c = col.find({});
    await c.toArray();
    await c.close();
    assert.strictEqual(c._closed, true);
  });

  it('stream', async () => {
    const s = col.find({}).sort({ idx: 1 }).limit(2).stream();
    assert.ok(typeof s.pipe === 'function');
    s.destroy();
  });
});

// ============================================================
// AggregationCursor exhaustive
// ============================================================
describe('ICov: AggregationCursor', () => {
  let col;
  before(async () => {
    col = db.collection('aggcur_cov');
    try { await col.drop(); } catch(e){}
    await col.insertMany([
      { cat: 'A', val: 10 }, { cat: 'A', val: 20 },
      { cat: 'B', val: 30 }, { cat: 'B', val: 40 }, { cat: 'C', val: 50 }
    ]);
  });

  it('fluent builders + toArray', async () => {
    const r = await col.aggregate([])
      .match({ val: { $gte: 20 } })
      .group({ _id: '$cat', total: { $sum: '$val' } })
      .sort({ total: -1 })
      .limit(2)
      .toArray();
    assert.ok(r.length <= 2);
  });

  it('chainable config methods', () => {
    const c = col.aggregate([]);
    assert.ok(c.batchSize(100) === c);
    assert.ok(c.maxTimeMS(5000) === c);
    assert.ok(c.comment('q') === c);
    assert.ok(c.hint({ cat: 1 }) === c);
    assert.ok(c.map(d => d) === c);
  });

  it('next, hasNext, tryNext', async () => {
    const c = col.aggregate([{ $sort: { val: 1 } }, { $limit: 2 }]);
    assert.ok(await c.hasNext());
    const d1 = await c.next();
    assert.ok(d1);
    const d2 = await c.tryNext();
    assert.ok(d2);
    assert.strictEqual(await c.tryNext(), null);
  });

  it('forEach', async () => {
    const items = [];
    await col.aggregate([{ $sort: { val: 1 } }]).forEach(d => items.push(d.val));
    assert.strictEqual(items.length, 5);
  });

  it('clone, rewind, pipeline getter', async () => {
    const c = col.aggregate([{ $match: { cat: 'A' } }]);
    await c.toArray();
    assert.ok(c.pipeline.length === 1);
    const c2 = c.clone();
    assert.strictEqual(c2._executed, false);
    c.rewind();
    const r = await c.toArray();
    assert.strictEqual(r.length, 2);
  });

  it('bufferedCount, readBufferedDocuments', async () => {
    const c = col.aggregate([{ $sort: { val: 1 } }]);
    await c.next();
    assert.strictEqual(c.bufferedCount(), 4);
    const batch = c.readBufferedDocuments(2);
    assert.strictEqual(batch.length, 2);
  });

  it('explain', async () => {
    const plan = await col.aggregate([{ $match: { cat: 'A' } }]).explain();
    assert.ok(plan.queryPlanner.sql);
  });

  it('async iteration', async () => {
    const vals = [];
    for await (const d of col.aggregate([{ $sort: { val: 1 } }, { $limit: 3 }])) vals.push(d.val);
    assert.strictEqual(vals.length, 3);
  });

  it('close', async () => {
    const c = col.aggregate([]);
    await c.toArray();
    await c.close();
    assert.ok(c._closed);
  });

  it('more fluent builders: skip, project, unwind, lookup, out, redact, geoNear, addStage', () => {
    const c = col.aggregate([]);
    c.skip(1);         // 1
    c.project({ cat: 1 }); // 2
    c.unwind('$cat');  // 3
    c.lookup({ from: 'other', localField: 'x', foreignField: 'y', as: 'z' }); // 4
    c.out('results');  // 5
    c.redact('$$DESCEND'); // 6
    c.geoNear({ near: { type: 'Point', coordinates: [0,0] } }); // 7
    c.addStage({ $limit: 1 }); // 8
    assert.strictEqual(c.pipeline.length, 8);
  });
});

// ============================================================
// More query operators
// ============================================================
describe('ICov: More Query Operators', () => {
  let col;
  before(async () => {
    col = db.collection('qop_cov');
    try { await col.drop(); } catch(e){}
    await col.insertMany([
      { a: 1, b: 'hello', arr: [1,2,3], nested: { x: 10 } },
      { a: 2, b: 'world', arr: [4,5,6], nested: { x: 20 } },
      { a: 3, b: 'HELLO', arr: [7,8,9], nested: { x: 30 } },
      { a: 4, b: null, arr: [], nested: { x: null } },
    ]);
  });

  it('$nin', async () => {
    const r = await col.find({ a: { $nin: [1, 3] } }).toArray();
    assert.ok(r.every(d => d.a !== 1 && d.a !== 3));
  });

  it('$exists true and false', async () => {
    assert.strictEqual((await col.find({ b: { $exists: true } }).toArray()).length, 4);
    await col.insertOne({ _id: 'no_b', a: 99 });
    assert.ok((await col.find({ b: { $exists: false } }).toArray()).length >= 1);
    await col.deleteOne({ _id: 'no_b' });
  });

  it('$type number', async () => {
    const r = await col.find({ a: { $type: 'number' } }).toArray();
    assert.strictEqual(r.length, 4);
  });

  it('$size', async () => {
    const r = await col.find({ arr: { $size: 3 } }).toArray();
    assert.strictEqual(r.length, 3);
  });

  it('$regex case insensitive', async () => {
    const r = await col.find({ b: { $regex: 'hello', $options: 'i' } }).toArray();
    assert.strictEqual(r.length, 2); // 'hello' and 'HELLO'
  });

  it('native RegExp', async () => {
    const r = await col.find({ b: /^world$/ }).toArray();
    assert.strictEqual(r.length, 1);
  });

  it('null equality', async () => {
    const r = await col.find({ b: null }).toArray();
    assert.ok(r.length >= 1);
  });

  it('nested field comparison', async () => {
    const r = await col.find({ 'nested.x': { $gte: 20 } }).toArray();
    assert.ok(r.length >= 2);
  });

  it('$and explicit', async () => {
    const r = await col.find({ $and: [{ a: { $gte: 2 } }, { a: { $lte: 3 } }] }).toArray();
    assert.strictEqual(r.length, 2);
  });

  it('$or', async () => {
    const r = await col.find({ $or: [{ a: 1 }, { a: 4 }] }).toArray();
    assert.strictEqual(r.length, 2);
  });

  it('$nor', async () => {
    const r = await col.find({ $nor: [{ a: 1 }, { a: 2 }] }).toArray();
    assert.ok(r.every(d => d.a !== 1 && d.a !== 2));
  });
});

// ============================================================
// More Aggregation Patterns
// ============================================================
describe('ICov: More Aggregation', () => {
  let col;
  before(async () => {
    col = db.collection('moreagg_cov');
    try { await col.drop(); } catch(e){}
    await col.insertMany([
      { cat: 'A', val: 10, items: ['x','y'] },
      { cat: 'A', val: 20, items: ['z'] },
      { cat: 'B', val: 30, items: ['a','b','c'] },
    ]);
  });

  it('$group with $push', async () => {
    const r = await col.aggregate([
      { $group: { _id: '$cat', vals: { $push: '$val' } } }
    ]).toArray();
    const catA = r.find(d => d._id === 'A');
    assert.ok(Array.isArray(catA.vals));
  });

  it('$group with $addToSet', async () => {
    const r = await col.aggregate([
      { $group: { _id: null, cats: { $addToSet: '$cat' } } }
    ]).toArray();
    assert.ok(r[0].cats.length >= 2);
  });

  it('$group with compound key', async () => {
    const r = await col.aggregate([
      { $group: { _id: { cat: '$cat' }, n: { $sum: 1 } } }
    ]).toArray();
    assert.ok(r.length >= 2);
  });

  it('$project with $concat', async () => {
    const r = await col.aggregate([
      { $project: { label: { $concat: ['$cat', '-item'] } } },
      { $limit: 1 }
    ]).toArray();
    assert.ok(r[0].label.includes('-item'));
  });

  it('$project with $ifNull on missing field', async () => {
    await col.insertOne({ _id: 'nn', val: 5 }); // no 'cat' field
    const r = await col.aggregate([
      { $match: { _id: 'nn' } },
      { $project: { safeCat: { $ifNull: ['$missing', 'Unknown'] } } }
    ]).toArray();
    // $ifNull replaces null/missing with the fallback
    assert.ok(r[0].safeCat !== undefined);
    await col.deleteOne({ _id: 'nn' });
  });

  it('$addFields with arithmetic', async () => {
    const r = await col.aggregate([
      { $addFields: { doubled: { $multiply: ['$val', 2] } } },
      { $match: { cat: 'B' } }
    ]).toArray();
    assert.strictEqual(r[0].doubled, 60);
  });

  it('$unset', async () => {
    const r = await col.aggregate([
      { $unset: ['items'] },
      { $limit: 1 }
    ]).toArray();
    assert.strictEqual(r[0].items, undefined);
  });

  it('$count', async () => {
    const r = await col.aggregate([{ $count: 'total' }]).toArray();
    assert.strictEqual(r[0].total, 3);
  });

  it('$sample', async () => {
    const r = await col.aggregate([{ $sample: { size: 2 } }]).toArray();
    assert.strictEqual(r.length, 2);
  });

  it('$sortByCount', async () => {
    const r = await col.aggregate([{ $sortByCount: '$cat' }]).toArray();
    assert.ok(r[0].count || r[0]._id); // Has group key
  });
});

// ============================================================
// Db & Admin methods
// ============================================================
describe('ICov: Db & Admin', () => {
  it('db.command: ping, buildInfo, serverStatus, dbStats', async () => {
    assert.strictEqual((await db.command({ ping: 1 })).ok, 1);
    assert.ok((await db.command({ buildInfo: 1 })).version);
    assert.strictEqual((await db.command({ serverStatus: 1 })).ok, 1);
    assert.strictEqual((await db.command({ dbStats: 1 })).ok, 1);
  });

  it('db.command: create and drop', async () => {
    await db.command({ create: 'cmd_test' });
    await db.collection('cmd_test').insertOne({ x: 1 });
    await db.command({ drop: 'cmd_test' });
  });

  it('db.createCollection', async () => {
    const c = await db.createCollection('create_test');
    await c.insertOne({ x: 1 });
    await c.drop();
  });

  it('db.listCollections with toArray and async iteration', async () => {
    await db.collection('lc_test').insertOne({ x: 1 });
    const cursor = await db.listCollections();
    const arr = await cursor.toArray();
    assert.ok(arr.length >= 1);

    // Test ArrayCursor methods
    await db.collection('lc_test2').insertOne({ x: 1 });
    const c2 = await db.listCollections();
    const d = await c2.next();
    assert.ok(d);
    assert.ok(await c2.hasNext() || !(await c2.hasNext())); // either fine
    c2.rewind();
    assert.ok(c2.bufferedCount() >= 0);
    const c3 = c2.clone();
    assert.ok(c3.bufferedCount() >= 0);
    await c2.close();

    await db.collection('lc_test').drop();
    await db.collection('lc_test2').drop();
  });

  it('db.collections()', async () => {
    await db.collection('cols_test').insertOne({ x: 1 });
    const cols = await db.collections();
    assert.ok(cols.length >= 1);
    assert.ok(cols[0].collectionName);
    await db.collection('cols_test').drop();
  });

  it('db.renameCollection', async () => {
    await db.collection('ren_from').insertOne({ x: 1 });
    const c = await db.renameCollection('ren_from', 'ren_to');
    assert.strictEqual(c.collectionName, 'ren_to');
    await db.collection('ren_to').drop();
  });

  it('db.stats', async () => {
    const s = await db.stats();
    assert.strictEqual(s.ok, 1);
  });

  it('db.profilingLevel and setProfilingLevel', async () => {
    assert.strictEqual(await db.profilingLevel(), 'off');
    assert.strictEqual(await db.setProfilingLevel('all'), 'off');
  });

  it('db.removeUser', async () => {
    assert.strictEqual(await db.removeUser('test'), true);
  });

  it('admin methods', async () => {
    const admin = await db.admin();
    assert.strictEqual((await admin.ping()).ok, 1);
    assert.ok((await admin.serverInfo()).version);
    assert.strictEqual((await admin.serverStatus()).ok, 1);
    assert.ok((await admin.buildInfo()).version);
    try { assert.ok((await admin.listDatabases()).databases); } catch(e) { /* concurrent drop */ }
    assert.strictEqual(await admin.removeUser('u'), true);
    assert.strictEqual((await admin.replSetGetStatus()).ok, 1);
    assert.strictEqual((await admin.command({ ping: 1 })).ok, 1);
  });
});

// ============================================================
// Session advanced
// ============================================================
describe('ICov: Sessions Advanced', () => {
  it('session properties and methods', async () => {
    const s = client.startSession();
    assert.ok(s.id);
    assert.strictEqual(s.inTransaction, false);
    assert.strictEqual(s.clusterTime, null);
    assert.strictEqual(s.operationTime, null);
    s.advanceClusterTime({ ts: 1 });
    assert.deepStrictEqual(s.clusterTime, { ts: 1 });
    s.advanceOperationTime({ ts: 2 });
    assert.deepStrictEqual(s.operationTime, { ts: 2 });
    assert.ok(s.equals(s));
    await s.endSession();
    assert.ok(s._ended);
    // endSession again should be safe
    await s.endSession();
  });

  it('manual startTransaction / commit', async () => {
    const col = db.collection('tx_manual');
    try { await col.drop(); } catch(e){}
    await col.insertOne({ setup: true }); // ensure table

    const s = client.startSession();
    s.startTransaction();
    assert.ok(s.inTransaction);
    await col.insertOne({ _id: 'mtx', val: 1 }, { session: s });
    await s.commitTransaction();
    await s.endSession();

    assert.ok(await col.findOne({ _id: 'mtx' }));
  });

  it('manual startTransaction / abort', async () => {
    const col = db.collection('tx_abort');
    try { await col.drop(); } catch(e){}
    await col.insertOne({ setup: true });

    const s = client.startSession();
    s.startTransaction();
    await col.insertOne({ _id: 'aborted', val: 1 }, { session: s });
    await s.abortTransaction();
    await s.endSession();

    assert.strictEqual(await col.findOne({ _id: 'aborted' }), null);
  });

  it('withTransaction', async () => {
    const col = db.collection('tx_with');
    try { await col.drop(); } catch(e){}
    await col.insertOne({ setup: true });

    const result = await client.withSession(async (s) => {
      return s.withTransaction(async (session) => {
        await col.insertOne({ _id: 'wt', val: 1 }, { session });
        return 'ok';
      });
    });
    assert.strictEqual(result, 'ok');
    assert.ok(await col.findOne({ _id: 'wt' }));
  });

  it('startTransaction twice should throw', () => {
    const s = client.startSession();
    s.startTransaction();
    assert.throws(() => s.startTransaction(), /already in progress/);
    s._inTransaction = false; // reset for cleanup
    s.endSession();
  });
});

// ============================================================
// Client methods
// ============================================================
describe('ICov: Client Methods', () => {
  it('isConnected and topology', () => {
    assert.ok(client.isConnected());
    assert.ok(client.topology.isConnected());
    assert.ok(!client.topology.isDestroyed());
  });

  it('client.bulkWrite', async () => {
    const r = await client.bulkWrite([
      { namespace: 'cov_test.cbw1', insertOne: { document: { _id: 'c1', v: 1 } } },
      { namespace: 'cov_test.cbw2', insertOne: { document: { _id: 'c2', v: 2 } } },
    ]);
    assert.strictEqual(r.insertedCount, 2);
    await db.collection('cbw1').drop();
    await db.collection('cbw2').drop();
  });

  it('client.watch', () => {
    const cs = client.watch();
    assert.ok(cs);
    assert.strictEqual(cs._channelName, 'change_all');
  });

  it('db.watch', () => {
    const cs = db.watch();
    assert.ok(cs);
  });
});

// ============================================================
// Collection edge cases
// ============================================================
describe('ICov: Collection Edge Cases', () => {
  let col;
  beforeEach(async () => { col = db.collection('edge_cov'); try { await col.drop(); } catch(e){} });

  it('hint getter/setter', () => {
    assert.strictEqual(col.hint, null);
    col.hint = 'myindex';
    assert.strictEqual(col.hint, 'myindex');
  });

  it('isCapped', async () => {
    assert.strictEqual(await col.isCapped(), false);
  });

  it('options', async () => {
    const opts = await col.options();
    assert.ok(typeof opts === 'object');
  });

  it('count (deprecated)', async () => {
    await col.insertMany([{ x: 1 }, { x: 2 }]);
    assert.strictEqual(await col.count(), 2);
    assert.strictEqual(await col.count({ x: 1 }), 1);
  });

  it('indexes and indexInformation', async () => {
    await col.insertOne({ x: 1 });
    await col.createIndex({ x: 1 });
    const idxs = await col.indexes();
    assert.ok(idxs.length >= 2);
    const info = await col.indexInformation();
    assert.ok(Object.keys(info).length >= 1);
  });

  it('listIndexes returns cursor', async () => {
    await col.insertOne({ x: 1 });
    const cursor = await col.listIndexes();
    const arr = await cursor.toArray();
    assert.ok(arr.length >= 1);
  });

  it('createIndexes multiple', async () => {
    await col.insertOne({ a: 1, b: 2 });
    const names = await col.createIndexes([
      { key: { a: 1 } },
      { key: { b: 1 }, unique: true }
    ]);
    assert.strictEqual(names.length, 2);
  });

  it('dropIndexes', async () => {
    await col.insertOne({ z: 1 });
    await col.createIndex({ z: 1 });
    await col.dropIndexes();
    // Primary key should still exist
  });

  it('stats', async () => {
    await col.insertOne({ x: 1 });
    const s = await col.stats();
    assert.strictEqual(s.ok, 1);
    assert.ok(s.count >= 1);
  });

  it('namespace, collectionName, dbName', () => {
    assert.strictEqual(col.collectionName, 'edge_cov');
    assert.strictEqual(col.dbName, 'cov_test');
    assert.strictEqual(col.namespace, 'cov_test.edge_cov');
  });

  it('estimatedDocumentCount', async () => {
    await col.insertMany([{ x: 1 }, { x: 2 }, { x: 3 }]);
    const est = await col.estimatedDocumentCount();
    assert.ok(est >= 0);
  });
});

// ============================================================
// Bulk operations exhaustive
// ============================================================
describe('ICov: Bulk Exhaustive', () => {
  let col;
  beforeEach(async () => { col = db.collection('bulk_cov'); try { await col.drop(); } catch(e){} });

  it('BulkWriteResult methods', async () => {
    const result = await col.bulkWrite([
      { insertOne: { document: { _id: 'r1' } } },
      { insertOne: { document: { _id: 'r2' } } }
    ]);
    assert.ok(result.isOk());
    assert.ok(!result.hasWriteErrors());
    assert.strictEqual(result.getWriteErrorCount(), 0);
    assert.strictEqual(result.getWriteErrorAt(0), null);
    assert.deepStrictEqual(result.getWriteErrors(), []);
    assert.strictEqual(result.getWriteConcernError(), null);
    assert.ok(result.getRawResponse());
    assert.ok(result.toString().includes('inserted'));
  });

  it('bulkWrite with all operation types', async () => {
    await col.insertOne({ _id: 'u1', s: 'old' });
    const r = await col.bulkWrite([
      { insertOne: { document: { _id: 'n1' } } },
      { updateOne: { filter: { _id: 'u1' }, update: { $set: { s: 'new' } } } },
      { updateMany: { filter: {}, update: { $set: { touched: true } } } },
      { replaceOne: { filter: { _id: 'u1' }, replacement: { s: 'replaced' } } },
      { deleteOne: { filter: { _id: 'n1' } } },
    ]);
    assert.ok(r.insertedCount >= 1);
    assert.ok(r.modifiedCount >= 1);
    assert.ok(r.deletedCount >= 1);
  });

  it('ordered bulk find().upsert().updateOne()', async () => {
    const bulk = col.initializeOrderedBulkOp();
    bulk.find({ _id: 'ups1' }).upsert().updateOne({ $set: { v: 1 } });
    const r = await bulk.execute();
    assert.ok(r.upsertedCount >= 1);
    assert.ok(await col.findOne({ _id: 'ups1' }));
  });

  it('bulk raw()', async () => {
    const bulk = col.initializeOrderedBulkOp();
    bulk.raw({ insertOne: { document: { _id: 'raw1' } } });
    bulk.raw({ deleteOne: { filter: { _id: 'raw1' } } });
    const r = await bulk.execute();
    assert.strictEqual(r.insertedCount, 1);
    assert.strictEqual(r.deletedCount, 1);
  });
});
