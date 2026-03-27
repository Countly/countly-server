'use strict';

const { describe, it, before, after, beforeEach } = require('node:test');
const assert = require('node:assert');
const { MongoClient, ObjectId, Long, Double, Int32, UUID, DBRef, Binary, ReturnDocument } = require('../index');

const PG_URL = process.env.PG_URL || 'postgresql://testuser:testpass@localhost:5433/testdb';

let client;
let db;

before(async () => {
  client = await MongoClient.connect(PG_URL);
  db = client.db('integration_test');

  // Ensure schema exists
  try {
    await client._pool.query('CREATE SCHEMA IF NOT EXISTS "integration_test"');
  } catch (e) { /* ignore */ }
});

after(async () => {
  if (db) {
    try { await db.dropDatabase(); } catch (e) { /* ignore */ }
  }
  if (client) {
    await client.close();
  }
});

// ============================================================
// CRUD Operations
// ============================================================
describe('Integration: CRUD', () => {
  let col;

  beforeEach(async () => {
    col = db.collection('crud_test');
    try { await col.drop(); } catch (e) { /* ignore if not exists */ }
  });

  describe('insertOne / findOne', () => {
    it('should insert and retrieve a document', async () => {
      const doc = { name: 'Alice', age: 30, active: true };
      const result = await col.insertOne(doc);
      assert.ok(result.acknowledged);
      assert.ok(result.insertedId);

      const found = await col.findOne({ _id: result.insertedId });
      assert.strictEqual(found.name, 'Alice');
      assert.strictEqual(found.age, 30);
      assert.strictEqual(found.active, true);
    });

    it('should auto-generate ObjectId', async () => {
      const result = await col.insertOne({ x: 1 });
      assert.ok(result.insertedId instanceof ObjectId);

      const found = await col.findOne({ _id: result.insertedId });
      assert.strictEqual(found.x, 1);
    });

    it('should use custom string _id', async () => {
      await col.insertOne({ _id: 'custom-123', value: 'test' });
      const found = await col.findOne({ _id: 'custom-123' });
      assert.strictEqual(found.value, 'test');
    });

    it('should throw on duplicate _id', async () => {
      await col.insertOne({ _id: 'dup', x: 1 });
      await assert.rejects(
        () => col.insertOne({ _id: 'dup', x: 2 }),
        (err) => err.code === 11000
      );
    });

    it('should handle null values', async () => {
      const { insertedId } = await col.insertOne({ a: null, b: 'ok' });
      const found = await col.findOne({ _id: insertedId });
      assert.strictEqual(found.a, null);
      assert.strictEqual(found.b, 'ok');
    });

    it('should handle nested objects', async () => {
      const { insertedId } = await col.insertOne({
        address: { city: 'NYC', state: 'NY', zip: '10001' }
      });
      const found = await col.findOne({ _id: insertedId });
      assert.strictEqual(found.address.city, 'NYC');
      assert.strictEqual(found.address.zip, '10001');
    });

    it('should handle arrays', async () => {
      const { insertedId } = await col.insertOne({ tags: ['a', 'b', 'c'] });
      const found = await col.findOne({ _id: insertedId });
      assert.deepStrictEqual(found.tags, ['a', 'b', 'c']);
    });
  });

  describe('insertMany', () => {
    it('should insert multiple documents', async () => {
      const result = await col.insertMany([
        { name: 'Alice' },
        { name: 'Bob' },
        { name: 'Charlie' }
      ]);
      assert.strictEqual(result.insertedCount, 3);
      const count = await col.countDocuments();
      assert.strictEqual(count, 3);
    });
  });

  describe('BSON type roundtrip', () => {
    it('should preserve Date objects', async () => {
      const date = new Date('2024-06-15T12:30:00.000Z');
      const { insertedId } = await col.insertOne({ createdAt: date });
      const found = await col.findOne({ _id: insertedId });
      assert.ok(found.createdAt instanceof Date);
      assert.strictEqual(found.createdAt.toISOString(), date.toISOString());
    });

    it('should preserve RegExp objects', async () => {
      const { insertedId } = await col.insertOne({ pattern: /^test/i });
      const found = await col.findOne({ _id: insertedId });
      assert.ok(found.pattern instanceof RegExp);
      assert.strictEqual(found.pattern.source, '^test');
      assert.ok(found.pattern.ignoreCase);
    });

    it('should preserve Buffer objects', async () => {
      const buf = Buffer.from('binary data');
      const { insertedId } = await col.insertOne({ data: buf });
      const found = await col.findOne({ _id: insertedId });
      assert.ok(Buffer.isBuffer(found.data));
      assert.strictEqual(found.data.toString(), 'binary data');
    });

    it('should preserve nested complex types', async () => {
      const doc = {
        items: [
          { name: 'a', date: new Date('2024-01-01') },
          { name: 'b', data: Buffer.from('x') }
        ]
      };
      const { insertedId } = await col.insertOne(doc);
      const found = await col.findOne({ _id: insertedId });
      assert.ok(found.items[0].date instanceof Date);
      assert.ok(Buffer.isBuffer(found.items[1].data));
    });
  });

  describe('updateOne / updateMany', () => {
    it('$set should update fields', async () => {
      const { insertedId } = await col.insertOne({ name: 'Alice', age: 25 });
      await col.updateOne({ _id: insertedId }, { $set: { age: 26, email: 'alice@test.com' } });
      const found = await col.findOne({ _id: insertedId });
      assert.strictEqual(found.age, 26);
      assert.strictEqual(found.email, 'alice@test.com');
    });

    it('$inc should increment', async () => {
      const { insertedId } = await col.insertOne({ count: 10 });
      await col.updateOne({ _id: insertedId }, { $inc: { count: 5 } });
      const found = await col.findOne({ _id: insertedId });
      assert.strictEqual(found.count, 15);
    });

    it('$unset should remove fields', async () => {
      const { insertedId } = await col.insertOne({ a: 1, b: 2, c: 3 });
      await col.updateOne({ _id: insertedId }, { $unset: { b: '' } });
      const found = await col.findOne({ _id: insertedId });
      assert.strictEqual(found.a, 1);
      assert.strictEqual(found.b, undefined);
      assert.strictEqual(found.c, 3);
    });

    it('$push should append to array', async () => {
      const { insertedId } = await col.insertOne({ tags: ['a'] });
      await col.updateOne({ _id: insertedId }, { $push: { tags: 'b' } });
      const found = await col.findOne({ _id: insertedId });
      assert.deepStrictEqual(found.tags, ['a', 'b']);
    });

    it('$pull should remove from array', async () => {
      const { insertedId } = await col.insertOne({ tags: ['a', 'b', 'c'] });
      await col.updateOne({ _id: insertedId }, { $pull: { tags: 'b' } });
      const found = await col.findOne({ _id: insertedId });
      assert.deepStrictEqual(found.tags, ['a', 'c']);
    });

    it('$addToSet should add only unique values', async () => {
      const { insertedId } = await col.insertOne({ tags: ['a', 'b'] });
      await col.updateOne({ _id: insertedId }, { $addToSet: { tags: 'b' } });
      let found = await col.findOne({ _id: insertedId });
      assert.deepStrictEqual(found.tags, ['a', 'b']);

      await col.updateOne({ _id: insertedId }, { $addToSet: { tags: 'c' } });
      found = await col.findOne({ _id: insertedId });
      assert.deepStrictEqual(found.tags, ['a', 'b', 'c']);
    });

    it('updateMany should update all matching', async () => {
      await col.insertMany([
        { status: 'old', val: 1 },
        { status: 'old', val: 2 },
        { status: 'new', val: 3 }
      ]);
      const result = await col.updateMany({ status: 'old' }, { $set: { status: 'archived' } });
      assert.strictEqual(result.modifiedCount, 2);

      const remaining = await col.countDocuments({ status: 'old' });
      assert.strictEqual(remaining, 0);
    });

    it('upsert should create doc when not found', async () => {
      const result = await col.updateOne(
        { name: 'NewUser' },
        { $set: { age: 20 } },
        { upsert: true }
      );
      assert.ok(result.upsertedId);
      const found = await col.findOne({ name: 'NewUser' });
      assert.strictEqual(found.age, 20);
    });
  });

  describe('replaceOne', () => {
    it('should replace entire document', async () => {
      const { insertedId } = await col.insertOne({ a: 1, b: 2, c: 3 });
      await col.replaceOne({ _id: insertedId }, { x: 99 });
      const found = await col.findOne({ _id: insertedId });
      assert.strictEqual(found.x, 99);
      assert.strictEqual(found.a, undefined);
    });
  });

  describe('deleteOne / deleteMany', () => {
    it('deleteOne should remove one document', async () => {
      await col.insertMany([{ x: 1 }, { x: 2 }, { x: 3 }]);
      const result = await col.deleteOne({ x: 2 });
      assert.strictEqual(result.deletedCount, 1);
      assert.strictEqual(await col.countDocuments(), 2);
    });

    it('deleteMany should remove all matching', async () => {
      await col.insertMany([{ s: 'a' }, { s: 'a' }, { s: 'b' }]);
      const result = await col.deleteMany({ s: 'a' });
      assert.strictEqual(result.deletedCount, 2);
      assert.strictEqual(await col.countDocuments(), 1);
    });

    it('deleteMany with empty filter should remove all', async () => {
      await col.insertMany([{ x: 1 }, { x: 2 }]);
      await col.deleteMany({});
      assert.strictEqual(await col.countDocuments(), 0);
    });
  });

  describe('findOneAndUpdate', () => {
    it('should return original by default', async () => {
      const { insertedId } = await col.insertOne({ name: 'Alice', v: 1 });
      const result = await col.findOneAndUpdate(
        { _id: insertedId },
        { $set: { v: 2 } }
      );
      assert.strictEqual(result.value.v, 1);
    });

    it('should return new doc with returnDocument: after', async () => {
      const { insertedId } = await col.insertOne({ name: 'Bob', v: 1 });
      const result = await col.findOneAndUpdate(
        { _id: insertedId },
        { $set: { v: 2 } },
        { returnDocument: 'after' }
      );
      assert.strictEqual(result.value.v, 2);
    });
  });

  describe('findOneAndDelete', () => {
    it('should delete and return the document', async () => {
      await col.insertOne({ _id: 'del1', name: 'ToDelete' });
      const result = await col.findOneAndDelete({ _id: 'del1' });
      assert.strictEqual(result.value.name, 'ToDelete');
      assert.strictEqual(await col.findOne({ _id: 'del1' }), null);
    });
  });
});

// ============================================================
// Query Operators
// ============================================================
describe('Integration: Query Operators', () => {
  let col;

  before(async () => {
    col = db.collection('query_test');
    try { await col.drop(); } catch (e) { /* */ }
    await col.insertMany([
      { name: 'Alice', age: 30, status: 'active', tags: ['admin', 'user'] },
      { name: 'Bob', age: 25, status: 'active', tags: ['user'] },
      { name: 'Charlie', age: 35, status: 'inactive', tags: ['user', 'editor'] },
      { name: 'Diana', age: 28, status: 'active', tags: ['admin'] },
      { name: 'Eve', age: 22, status: 'inactive', tags: [] }
    ]);
  });

  it('$gt should filter by greater than', async () => {
    const results = await col.find({ age: { $gt: 28 } }).toArray();
    assert.ok(results.every(r => r.age > 28));
    assert.strictEqual(results.length, 2);
  });

  it('$gte / $lte range', async () => {
    const results = await col.find({ age: { $gte: 25, $lte: 30 } }).toArray();
    assert.ok(results.every(r => r.age >= 25 && r.age <= 30));
    assert.strictEqual(results.length, 3);
  });

  it('$ne should exclude', async () => {
    const results = await col.find({ status: { $ne: 'inactive' } }).toArray();
    assert.ok(results.every(r => r.status !== 'inactive'));
  });

  it('$in should match any of values', async () => {
    const results = await col.find({ name: { $in: ['Alice', 'Bob'] } }).toArray();
    assert.strictEqual(results.length, 2);
  });

  it('$and should combine conditions', async () => {
    const results = await col.find({
      $and: [{ status: 'active' }, { age: { $gte: 28 } }]
    }).toArray();
    assert.ok(results.length >= 1);
    assert.ok(results.every(r => r.status === 'active' && r.age >= 28));
  });

  it('$or should match either condition', async () => {
    const results = await col.find({
      $or: [{ age: { $lt: 23 } }, { age: { $gt: 34 } }]
    }).toArray();
    assert.strictEqual(results.length, 2); // Eve (22) and Charlie (35)
  });

  it('$exists should check field presence', async () => {
    await col.insertOne({ _id: 'sparse', name: 'Sparse' });
    const withAge = await col.find({ age: { $exists: true } }).toArray();
    const withoutAge = await col.find({ age: { $exists: false } }).toArray();
    assert.ok(withAge.length >= 5);
    assert.ok(withoutAge.length >= 1);
    await col.deleteOne({ _id: 'sparse' });
  });

  it('$regex should pattern match', async () => {
    const results = await col.find({ name: { $regex: '^[AB]' } }).toArray();
    assert.strictEqual(results.length, 2); // Alice and Bob
  });

  it('$regex case-insensitive', async () => {
    const results = await col.find({ name: { $regex: 'alice', $options: 'i' } }).toArray();
    assert.strictEqual(results.length, 1);
    assert.strictEqual(results[0].name, 'Alice');
  });

  it('$size should match array length', async () => {
    const results = await col.find({ tags: { $size: 2 } }).toArray();
    assert.ok(results.every(r => r.tags.length === 2));
  });

  it('nested field dot notation', async () => {
    await col.insertOne({ _id: 'nested', address: { city: 'NYC' } });
    const found = await col.findOne({ 'address.city': 'NYC' });
    assert.strictEqual(found._id, 'nested');
    await col.deleteOne({ _id: 'nested' });
  });
});

// ============================================================
// Cursor Operations
// ============================================================
describe('Integration: Cursors', () => {
  let col;

  before(async () => {
    col = db.collection('cursor_test');
    try { await col.drop(); } catch (e) { /* */ }
    const docs = [];
    for (let i = 0; i < 20; i++) {
      docs.push({ index: i, name: `item_${i}`, value: Math.random() * 100 });
    }
    await col.insertMany(docs);
  });

  it('sort should order results', async () => {
    const results = await col.find({}).sort({ index: 1 }).toArray();
    for (let i = 1; i < results.length; i++) {
      assert.ok(results[i].index >= results[i - 1].index);
    }
  });

  it('sort descending', async () => {
    const results = await col.find({}).sort({ index: -1 }).limit(5).toArray();
    assert.strictEqual(results[0].index, 19);
  });

  it('skip and limit', async () => {
    const results = await col.find({}).sort({ index: 1 }).skip(5).limit(3).toArray();
    assert.strictEqual(results.length, 3);
    assert.strictEqual(results[0].index, 5);
  });

  it('projection should limit fields', async () => {
    const results = await col.find({}).project({ name: 1, _id: 0 }).limit(1).toArray();
    assert.ok(results[0].name);
    assert.strictEqual(results[0]._id, undefined);
    assert.strictEqual(results[0].index, undefined);
  });

  it('next() iteration', async () => {
    const cursor = col.find({}).sort({ index: 1 }).limit(3);
    const docs = [];
    let doc;
    while ((doc = await cursor.next()) !== null) {
      docs.push(doc);
    }
    assert.strictEqual(docs.length, 3);
  });

  it('async iteration', async () => {
    const cursor = col.find({}).sort({ index: 1 }).limit(3);
    const docs = [];
    for await (const doc of cursor) {
      docs.push(doc);
    }
    assert.strictEqual(docs.length, 3);
  });

  it('count', async () => {
    const count = await col.find({ index: { $lt: 10 } }).count();
    assert.strictEqual(count, 10);
  });

  it('map transform', async () => {
    const names = await col.find({}).sort({ index: 1 }).limit(3).map(d => d.name).toArray();
    assert.deepStrictEqual(names, ['item_0', 'item_1', 'item_2']);
  });
});

// ============================================================
// Aggregation Pipeline
// ============================================================
describe('Integration: Aggregation', () => {
  let col;

  before(async () => {
    col = db.collection('agg_test');
    try { await col.drop(); } catch (e) { /* */ }
    await col.insertMany([
      { category: 'A', amount: 100, status: 'complete' },
      { category: 'A', amount: 200, status: 'complete' },
      { category: 'B', amount: 150, status: 'complete' },
      { category: 'B', amount: 50, status: 'pending' },
      { category: 'C', amount: 300, status: 'complete' }
    ]);
  });

  it('$match + $group should aggregate', async () => {
    const results = await col.aggregate([
      { $match: { status: 'complete' } },
      { $group: { _id: '$category', total: { $sum: '$amount' } } },
      { $sort: { total: -1 } }
    ]).toArray();

    assert.ok(results.length >= 2);
    // Category A should have 300, C should have 300, B should have 150
  });

  it('$count should return count', async () => {
    const results = await col.aggregate([
      { $match: { status: 'complete' } },
      { $count: 'total' }
    ]).toArray();
    assert.strictEqual(results[0].total, 4);
  });

  it('$limit and $skip', async () => {
    const results = await col.aggregate([
      { $sort: { amount: -1 } },
      { $skip: 1 },
      { $limit: 2 }
    ]).toArray();
    assert.strictEqual(results.length, 2);
  });

  it('$addFields should add computed field', async () => {
    const results = await col.aggregate([
      { $addFields: { doubled: { $multiply: ['$amount', 2] } } },
      { $limit: 1 }
    ]).toArray();
    assert.ok(results[0].doubled);
  });

  it('$unset should remove field', async () => {
    const results = await col.aggregate([
      { $unset: 'status' },
      { $limit: 1 }
    ]).toArray();
    assert.strictEqual(results[0].status, undefined);
    assert.ok(results[0].category);
  });

  it('fluent pipeline builders', async () => {
    const results = await col.aggregate([])
      .match({ status: 'complete' })
      .group({ _id: '$category', n: { $sum: 1 } })
      .sort({ n: -1 })
      .toArray();
    assert.ok(results.length >= 1);
  });
});

// ============================================================
// Indexes
// ============================================================
describe('Integration: Indexes', () => {
  let col;

  beforeEach(async () => {
    col = db.collection('index_test');
    try { await col.drop(); } catch (e) { /* */ }
    await col.insertOne({ name: 'test', email: 'test@test.com' });
  });

  it('should create and list indexes', async () => {
    await col.createIndex({ email: 1 }, { unique: true });
    const indexes = await col.indexes();
    assert.ok(indexes.length >= 2); // _id + email
  });

  it('should create compound index', async () => {
    const name = await col.createIndex({ name: 1, email: 1 });
    assert.ok(name);
    const exists = await col.indexExists(name);
    assert.ok(exists);
  });

  it('should drop index', async () => {
    const name = await col.createIndex({ name: 1 });
    await col.dropIndex(name);
    const exists = await col.indexExists(name);
    assert.ok(!exists);
  });
});

// ============================================================
// Distinct and Count
// ============================================================
describe('Integration: Distinct and Count', () => {
  let col;

  before(async () => {
    col = db.collection('distinct_test');
    try { await col.drop(); } catch (e) { /* */ }
    await col.insertMany([
      { color: 'red', size: 1 },
      { color: 'blue', size: 2 },
      { color: 'red', size: 3 },
      { color: 'green', size: 1 }
    ]);
  });

  it('distinct should return unique values', async () => {
    const colors = await col.distinct('color');
    assert.strictEqual(colors.length, 3);
    assert.ok(colors.includes('red'));
    assert.ok(colors.includes('blue'));
    assert.ok(colors.includes('green'));
  });

  it('distinct with filter', async () => {
    const colors = await col.distinct('color', { size: 1 });
    assert.strictEqual(colors.length, 2);
  });

  it('countDocuments with filter', async () => {
    assert.strictEqual(await col.countDocuments({ color: 'red' }), 2);
    assert.strictEqual(await col.countDocuments({}), 4);
  });

  it('estimatedDocumentCount', async () => {
    const count = await col.estimatedDocumentCount();
    assert.ok(count >= 0); // May use pg_class estimate
  });
});

// ============================================================
// Transactions / Sessions
// ============================================================
describe('Integration: Sessions and Transactions', () => {
  it('withTransaction should commit on success', async () => {
    const col = db.collection('tx_test');
    try { await col.drop(); } catch (e) { /* */ }

    const session = client.startSession();
    await session.withTransaction(async (s) => {
      await col.insertOne({ _id: 'tx1', val: 'committed' }, { session: s });
    });
    await session.endSession();

    const found = await col.findOne({ _id: 'tx1' });
    assert.strictEqual(found.val, 'committed');
  });

  it('withTransaction should rollback on error', async () => {
    const col = db.collection('tx_test2');
    try { await col.drop(); } catch (e) { /* */ }

    const session = client.startSession();
    try {
      await session.withTransaction(async (s) => {
        await col.insertOne({ _id: 'tx2', val: 'should_not_exist' }, { session: s });
        throw new Error('rollback');
      });
    } catch (e) {
      // expected
    }
    await session.endSession();

    const found = await col.findOne({ _id: 'tx2' });
    assert.strictEqual(found, null);
  });
});

// ============================================================
// Bulk Operations
// ============================================================
describe('Integration: Bulk Operations', () => {
  let col;

  beforeEach(async () => {
    col = db.collection('bulk_test');
    try { await col.drop(); } catch (e) { /* */ }
  });

  it('bulkWrite should process mixed operations', async () => {
    await col.insertOne({ _id: 'b1', val: 1 });

    const result = await col.bulkWrite([
      { insertOne: { document: { _id: 'b2', val: 2 } } },
      { updateOne: { filter: { _id: 'b1' }, update: { $set: { val: 10 } } } },
      { deleteOne: { filter: { _id: 'b2' } } }
    ]);

    assert.strictEqual(result.insertedCount, 1);
    assert.strictEqual(result.modifiedCount, 1);
    assert.strictEqual(result.deletedCount, 1);
  });

  it('ordered bulk op should work', async () => {
    const bulk = col.initializeOrderedBulkOp();
    bulk.insert({ _id: 'o1', v: 1 });
    bulk.insert({ _id: 'o2', v: 2 });
    bulk.find({ _id: 'o1' }).updateOne({ $set: { v: 10 } });
    const result = await bulk.execute();
    assert.strictEqual(result.insertedCount, 2);
    assert.strictEqual(result.modifiedCount, 1);
  });
});

// ============================================================
// Collection Management
// ============================================================
describe('Integration: Collection Management', () => {
  it('listCollections should list tables', async () => {
    const col = db.collection('list_test');
    await col.insertOne({ x: 1 });

    const cursor = await db.listCollections();
    const collections = await cursor.toArray();
    assert.ok(collections.some(c => c.name === 'list_test'));

    await col.drop();
  });

  it('rename should rename collection', async () => {
    const col = db.collection('rename_from');
    await col.insertOne({ x: 1 });

    await col.rename('rename_to');
    const found = await db.collection('rename_to').findOne({ x: 1 });
    assert.ok(found);

    await db.collection('rename_to').drop();
  });

  it('drop should remove collection', async () => {
    const col = db.collection('drop_test');
    await col.insertOne({ x: 1 });
    await col.drop();

    const cursor = await db.listCollections({ name: 'drop_test' });
    const list = await cursor.toArray();
    assert.strictEqual(list.length, 0);
  });

  it('stats should return size info', async () => {
    const col = db.collection('stats_test');
    await col.insertOne({ x: 1 });
    const stats = await col.stats();
    assert.strictEqual(stats.ok, 1);
    assert.ok(stats.count >= 1);
    await col.drop();
  });
});

// ============================================================
// Db commands
// ============================================================
describe('Integration: Db commands', () => {
  it('ping should return ok', async () => {
    const result = await db.command({ ping: 1 });
    assert.strictEqual(result.ok, 1);
  });

  it('buildInfo should return version', async () => {
    const result = await db.command({ buildInfo: 1 });
    assert.ok(result.version);
  });

  it('dbStats should return stats', async () => {
    const result = await db.command({ dbStats: 1 });
    assert.strictEqual(result.ok, 1);
  });
});
