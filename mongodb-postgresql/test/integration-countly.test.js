'use strict';

/**
 * Integration tests simulating Countly's actual MongoDB usage patterns.
 *
 * Countly's pluginManager wraps the raw driver with:
 * - Legacy aliases (insert, remove, update, findAndModify, save, ensureIndex)
 * - Callback support via handlePromiseErrors
 * - ignore_errors option
 * - db.ObjectID() factory
 *
 * This test verifies that our driver provides the correct underlying API
 * that Countly's pluginManager expects.
 */

const { describe, it, before, after, beforeEach } = require('node:test');
const assert = require('node:assert');
const { MongoClient, ObjectId } = require('../index');

const PG_URL = process.env.PG_URL || 'postgresql://testuser:testpass@localhost:5433/testdb';
let client, db;

before(async () => {
  client = await MongoClient.connect(PG_URL);
  db = client.db('countly_test');
  try { await client._pool.query('CREATE SCHEMA IF NOT EXISTS "countly_test"'); } catch (e) {}
});

after(async () => {
  if (db) try { await db.dropDatabase(); } catch (e) {}
  if (client) await client.close();
});

// ============================================================
// Countly pattern: db.client.startSession()
// ============================================================
describe('Countly: db.client.startSession()', () => {
  it('db.client should return the MongoClient', () => {
    assert.ok(db.client);
    assert.strictEqual(db.client, client);
  });

  it('db.client.startSession() should work', async () => {
    const session = db.client.startSession();
    assert.ok(session);
    assert.ok(session.id);
    await session.endSession();
  });

  it('transaction via db.client.startSession()', async () => {
    const col = db.collection('tx_countly');
    try { await col.drop(); } catch(e) {}
    await col.insertOne({ setup: true });

    const session = db.client.startSession();
    await session.withTransaction(async (s) => {
      await col.insertOne({ _id: 'ctx1', val: 'committed' }, { session: s });
    });
    await session.endSession();

    const found = await col.findOne({ _id: 'ctx1' });
    assert.strictEqual(found.val, 'committed');
  });
});

// ============================================================
// Countly pattern: methods return Promises (pluginManager wraps with callbacks)
// ============================================================
describe('Countly: Promise-based API', () => {
  let col;
  beforeEach(async () => {
    col = db.collection('promise_test');
    try { await col.drop(); } catch(e) {}
  });

  it('insertOne returns promise with insertedId', async () => {
    const result = await col.insertOne({ name: 'test' });
    assert.ok(result.acknowledged);
    assert.ok(result.insertedId);
  });

  it('insertMany returns promise with insertedIds', async () => {
    const result = await col.insertMany([{ a: 1 }, { a: 2 }]);
    assert.strictEqual(result.insertedCount, 2);
    assert.ok(result.insertedIds[0]);
    assert.ok(result.insertedIds[1]);
  });

  it('updateOne returns promise with modifiedCount', async () => {
    await col.insertOne({ _id: 'u1', v: 1 });
    const result = await col.updateOne({ _id: 'u1' }, { $set: { v: 2 } });
    assert.strictEqual(result.matchedCount, 1);
    assert.strictEqual(result.modifiedCount, 1);
  });

  it('updateMany returns promise with modifiedCount', async () => {
    await col.insertMany([{ s: 'old' }, { s: 'old' }, { s: 'new' }]);
    const result = await col.updateMany({ s: 'old' }, { $set: { s: 'updated' } });
    assert.strictEqual(result.matchedCount, 2);
    assert.strictEqual(result.modifiedCount, 2);
  });

  it('deleteOne returns promise with deletedCount', async () => {
    await col.insertOne({ _id: 'd1' });
    const result = await col.deleteOne({ _id: 'd1' });
    assert.strictEqual(result.deletedCount, 1);
  });

  it('deleteMany returns promise with deletedCount', async () => {
    await col.insertMany([{ s: 'x' }, { s: 'x' }]);
    const result = await col.deleteMany({ s: 'x' });
    assert.strictEqual(result.deletedCount, 2);
  });

  it('findOne returns promise with document or null', async () => {
    await col.insertOne({ _id: 'f1', name: 'Alice' });
    const found = await col.findOne({ _id: 'f1' });
    assert.strictEqual(found.name, 'Alice');
    const notFound = await col.findOne({ _id: 'nonexistent' });
    assert.strictEqual(notFound, null);
  });

  it('find().toArray() returns promise with array', async () => {
    await col.insertMany([{ v: 1 }, { v: 2 }, { v: 3 }]);
    const results = await col.find({}).toArray();
    assert.strictEqual(results.length, 3);
  });

  it('countDocuments returns promise with number', async () => {
    await col.insertMany([{ v: 1 }, { v: 2 }]);
    const count = await col.countDocuments({});
    assert.strictEqual(count, 2);
  });

  it('estimatedDocumentCount returns promise', async () => {
    await col.insertOne({ v: 1 });
    const count = await col.estimatedDocumentCount();
    assert.ok(count >= 0);
  });
});

// ============================================================
// Countly pattern: findOneAndUpdate with {returnDocument: "after"}
// ============================================================
describe('Countly: findOneAndUpdate/Delete', () => {
  let col;
  beforeEach(async () => {
    col = db.collection('fam_test');
    try { await col.drop(); } catch(e) {}
  });

  it('findOneAndUpdate returns {value: doc}', async () => {
    await col.insertOne({ _id: 'fm1', v: 1 });
    const result = await col.findOneAndUpdate(
      { _id: 'fm1' },
      { $set: { v: 2 } },
      { returnDocument: 'after' }
    );
    assert.ok(result.value);
    assert.strictEqual(result.value.v, 2);
  });

  it('findOneAndUpdate with upsert', async () => {
    const result = await col.findOneAndUpdate(
      { _id: 'fm_upsert' },
      { $set: { v: 1 } },
      { upsert: true, returnDocument: 'after' }
    );
    assert.ok(result.value || result.upsertedId);
  });

  it('findOneAndDelete returns {value: doc}', async () => {
    await col.insertOne({ _id: 'fd1', v: 1 });
    const result = await col.findOneAndDelete({ _id: 'fd1' });
    assert.ok(result.value);
    assert.strictEqual(result.value.v, 1);
    assert.strictEqual(await col.findOne({ _id: 'fd1' }), null);
  });

  it('findOneAndUpdate returns null value when not found', async () => {
    const result = await col.findOneAndUpdate(
      { _id: 'nonexistent' },
      { $set: { v: 1 } }
    );
    assert.strictEqual(result.value, null);
  });
});

// ============================================================
// Countly pattern: upsert with $set, $inc, $push, $addToSet
// ============================================================
describe('Countly: Common Update Patterns', () => {
  let col;
  beforeEach(async () => {
    col = db.collection('update_patterns');
    try { await col.drop(); } catch(e) {}
  });

  it('upsert with $set creates new doc', async () => {
    const result = await col.updateOne(
      { _id: 'upsert1' },
      { $set: { name: 'created', count: 0 } },
      { upsert: true }
    );
    assert.ok(result.upsertedId);
    const doc = await col.findOne({ _id: 'upsert1' });
    assert.strictEqual(doc.name, 'created');
  });

  it('$set + $inc combined', async () => {
    await col.insertOne({ _id: 'si', name: 'test', count: 5 });
    await col.updateOne({ _id: 'si' }, { $set: { name: 'updated' }, $inc: { count: 3 } });
    const doc = await col.findOne({ _id: 'si' });
    assert.strictEqual(doc.name, 'updated');
    assert.strictEqual(doc.count, 8);
  });

  it('$push to array', async () => {
    await col.insertOne({ _id: 'p1', items: [] });
    await col.updateOne({ _id: 'p1' }, { $push: { items: 'new_item' } });
    const doc = await col.findOne({ _id: 'p1' });
    assert.deepStrictEqual(doc.items, ['new_item']);
  });

  it('$addToSet prevents duplicates', async () => {
    await col.insertOne({ _id: 'as1', tags: ['a'] });
    await col.updateOne({ _id: 'as1' }, { $addToSet: { tags: 'a' } });
    let doc = await col.findOne({ _id: 'as1' });
    assert.strictEqual(doc.tags.length, 1);

    await col.updateOne({ _id: 'as1' }, { $addToSet: { tags: 'b' } });
    doc = await col.findOne({ _id: 'as1' });
    assert.strictEqual(doc.tags.length, 2);
  });

  it('$pull from array', async () => {
    await col.insertOne({ _id: 'pl1', tags: ['a', 'b', 'c'] });
    await col.updateOne({ _id: 'pl1' }, { $pull: { tags: 'b' } });
    const doc = await col.findOne({ _id: 'pl1' });
    assert.deepStrictEqual(doc.tags, ['a', 'c']);
  });

  it('$unset removes field', async () => {
    await col.insertOne({ _id: 'us1', a: 1, b: 2 });
    await col.updateOne({ _id: 'us1' }, { $unset: { b: '' } });
    const doc = await col.findOne({ _id: 'us1' });
    assert.strictEqual(doc.a, 1);
    assert.strictEqual(doc.b, undefined);
  });
});

// ============================================================
// Countly pattern: aggregate with allowDiskUse
// ============================================================
describe('Countly: Aggregation Patterns', () => {
  let col;
  before(async () => {
    col = db.collection('agg_countly');
    try { await col.drop(); } catch(e) {}
    await col.insertMany([
      { app_id: 'a1', event: 'login', count: 10, ts: new Date('2024-01-01') },
      { app_id: 'a1', event: 'login', count: 20, ts: new Date('2024-01-02') },
      { app_id: 'a1', event: 'purchase', count: 5, ts: new Date('2024-01-01') },
      { app_id: 'a2', event: 'login', count: 15, ts: new Date('2024-01-01') },
    ]);
  });

  it('$match + $group + $sort', async () => {
    const result = await col.aggregate([
      { $match: { app_id: 'a1' } },
      { $group: { _id: '$event', total: { $sum: '$count' } } },
      { $sort: { total: -1 } }
    ]).toArray();
    assert.ok(result.length >= 2);
    // Both groups should have totals
    assert.ok(result.every(r => typeof r.total === 'number'));
  });

  it('$group with $sum: 1 for counting', async () => {
    const result = await col.aggregate([
      { $group: { _id: '$event', count: { $sum: 1 } } }
    ]).toArray();
    const login = result.find(r => r._id === 'login');
    assert.strictEqual(login.count, 3);
  });

  it('$project with computed fields', async () => {
    const result = await col.aggregate([
      { $project: { event: 1, doubled: { $multiply: ['$count', 2] } } },
      { $limit: 1 }
    ]).toArray();
    assert.ok(result[0].doubled);
  });

  it('$group with $avg, $min, $max', async () => {
    const result = await col.aggregate([
      { $match: { app_id: 'a1' } },
      { $group: {
        _id: null,
        avg: { $avg: '$count' },
        min: { $min: '$count' },
        max: { $max: '$count' }
      }}
    ]).toArray();
    assert.ok(result[0].avg);
    assert.ok(result[0].min <= result[0].avg);
    assert.ok(result[0].max >= result[0].avg);
  });

  it('$count stage', async () => {
    const result = await col.aggregate([
      { $match: { app_id: 'a1' } },
      { $count: 'total' }
    ]).toArray();
    assert.strictEqual(result[0].total, 3);
  });
});

// ============================================================
// Countly pattern: bulk write with initializeUnorderedBulkOp
// ============================================================
describe('Countly: Bulk Operations', () => {
  let col;
  beforeEach(async () => {
    col = db.collection('bulk_countly');
    try { await col.drop(); } catch(e) {}
  });

  it('initializeUnorderedBulkOp with upsert', async () => {
    const bulk = col.initializeUnorderedBulkOp();
    bulk.find({ _id: 'b1' }).upsert().updateOne({ $set: { v: 1 } });
    bulk.find({ _id: 'b2' }).upsert().updateOne({ $set: { v: 2 } });
    const result = await bulk.execute();
    assert.ok(result.upsertedCount >= 2);

    const d1 = await col.findOne({ _id: 'b1' });
    assert.strictEqual(d1.v, 1);
  });

  it('bulkWrite with insertOne and updateOne', async () => {
    await col.insertOne({ _id: 'bw1', v: 1 });
    const result = await col.bulkWrite([
      { insertOne: { document: { _id: 'bw2', v: 2 } } },
      { updateOne: { filter: { _id: 'bw1' }, update: { $set: { v: 10 } } } }
    ]);
    assert.strictEqual(result.insertedCount, 1);
    assert.strictEqual(result.modifiedCount, 1);
  });

  it('duplicate key in unordered bulk should not stop other ops', async () => {
    await col.insertOne({ _id: 'dup' });
    const bulk = col.initializeUnorderedBulkOp();
    bulk.insert({ _id: 'new1' });
    bulk.insert({ _id: 'dup' }); // will fail
    bulk.insert({ _id: 'new2' });

    try { await bulk.execute(); } catch(e) {
      // Expected
    }

    assert.ok(await col.findOne({ _id: 'new1' }));
    assert.ok(await col.findOne({ _id: 'new2' }));
  });
});

// ============================================================
// Countly pattern: find with sort, skip, limit, project
// ============================================================
describe('Countly: Query Patterns', () => {
  let col;
  before(async () => {
    col = db.collection('query_countly');
    try { await col.drop(); } catch(e) {}
    await col.insertMany([
      { _id: 'q1', name: 'Alice', age: 30, email: 'alice@test.com' },
      { _id: 'q2', name: 'Bob', age: 25, email: 'bob@test.com' },
      { _id: 'q3', name: 'Charlie', age: 35, email: 'charlie@test.com' },
      { _id: 'q4', name: 'Diana', age: 28, email: 'diana@test.com' },
    ]);
  });

  it('find with sort + limit + toArray', async () => {
    const results = await col.find({}).sort({ age: 1 }).limit(2).toArray();
    assert.strictEqual(results.length, 2);
    assert.strictEqual(results[0].name, 'Bob'); // youngest
  });

  it('find with skip + limit (pagination)', async () => {
    const page2 = await col.find({}).sort({ _id: 1 }).skip(2).limit(2).toArray();
    assert.strictEqual(page2.length, 2);
    assert.strictEqual(page2[0]._id, 'q3');
  });

  it('find with projection', async () => {
    const results = await col.find({}).project({ name: 1, _id: 0 }).toArray();
    assert.ok(results[0].name);
    assert.strictEqual(results[0]._id, undefined);
    assert.strictEqual(results[0].email, undefined);
  });

  it('cursor.next() iteration', async () => {
    const cursor = col.find({}).sort({ _id: 1 });
    const docs = [];
    let doc;
    while ((doc = await cursor.next()) !== null) {
      docs.push(doc);
    }
    assert.strictEqual(docs.length, 4);
  });

  it('ObjectId queries', async () => {
    const oid = new ObjectId();
    await col.insertOne({ _id: oid.toHexString(), type: 'oid_test' });
    const found = await col.findOne({ _id: oid.toHexString() });
    assert.strictEqual(found.type, 'oid_test');
    await col.deleteOne({ _id: oid.toHexString() });
  });

  it('$in query', async () => {
    const results = await col.find({ _id: { $in: ['q1', 'q3'] } }).toArray();
    assert.strictEqual(results.length, 2);
  });

  it('$regex query', async () => {
    const results = await col.find({ name: { $regex: '^[AB]' } }).toArray();
    assert.strictEqual(results.length, 2);
  });

  it('$exists query', async () => {
    const results = await col.find({ email: { $exists: true } }).toArray();
    assert.strictEqual(results.length, 4);
  });

  it('nested field query', async () => {
    await col.insertOne({ _id: 'nested', meta: { country: 'US' } });
    const found = await col.findOne({ 'meta.country': 'US' });
    assert.strictEqual(found._id, 'nested');
    await col.deleteOne({ _id: 'nested' });
  });
});

// ============================================================
// Countly pattern: index management
// ============================================================
describe('Countly: Index Management', () => {
  let col;
  beforeEach(async () => {
    col = db.collection('idx_countly');
    try { await col.drop(); } catch(e) {}
    await col.insertOne({ field1: 'x', field2: 'y', ts: new Date() });
  });

  it('createIndex with unique', async () => {
    await col.createIndex({ field1: 1 }, { unique: true });
    // Inserting duplicate should fail
    await col.insertOne({ field1: 'unique_val' });
    try {
      await col.insertOne({ field1: 'unique_val' });
      assert.fail('Should have thrown');
    } catch(e) {
      assert.strictEqual(e.code, 11000);
    }
  });

  it('createIndex with TTL (expireAfterSeconds)', async () => {
    const name = await col.createIndex({ ts: 1 }, { expireAfterSeconds: 3600 });
    assert.ok(name);
  });

  it('dropIndex', async () => {
    const name = await col.createIndex({ field2: 1 });
    await col.dropIndex(name);
    assert.ok(!(await col.indexExists(name)));
  });
});

// ============================================================
// Countly pattern: collection drop and rename
// ============================================================
describe('Countly: Collection Management', () => {
  it('drop collection', async () => {
    const col = db.collection('drop_countly');
    await col.insertOne({ x: 1 });
    await col.drop();
    // Collection should be gone
    const cursor = await db.listCollections({ name: 'drop_countly' });
    const list = await cursor.toArray();
    assert.strictEqual(list.length, 0);
  });

  it('rename collection', async () => {
    const col = db.collection('rename_from_countly');
    await col.insertOne({ x: 1 });
    await col.rename('rename_to_countly');

    const found = await db.collection('rename_to_countly').findOne({});
    assert.ok(found);
    await db.collection('rename_to_countly').drop();
  });
});

// ============================================================
// Countly pattern: replaceOne with upsert
// ============================================================
describe('Countly: replaceOne', () => {
  let col;
  beforeEach(async () => {
    col = db.collection('replace_countly');
    try { await col.drop(); } catch(e) {}
  });

  it('replaceOne with upsert creates doc', async () => {
    const result = await col.replaceOne(
      { _id: 'session_abc' },
      { _id: 'session_abc', data: 'session_data', ts: new Date() },
      { upsert: true }
    );
    assert.ok(result.upsertedCount === 1 || result.upsertedId);
    const doc = await col.findOne({ _id: 'session_abc' });
    assert.strictEqual(doc.data, 'session_data');
  });

  it('replaceOne replaces existing doc', async () => {
    await col.insertOne({ _id: 'r1', old: true, extra: 'field' });
    await col.replaceOne({ _id: 'r1' }, { _id: 'r1', new: true });
    const doc = await col.findOne({ _id: 'r1' });
    assert.strictEqual(doc.new, true);
    assert.strictEqual(doc.old, undefined);
    assert.strictEqual(doc.extra, undefined);
  });
});

// ============================================================
// Countly pattern: distinct
// ============================================================
describe('Countly: distinct', () => {
  it('should return unique values', async () => {
    const col = db.collection('distinct_countly');
    try { await col.drop(); } catch(e) {}
    await col.insertMany([
      { app: 'a1', event: 'login' },
      { app: 'a1', event: 'purchase' },
      { app: 'a2', event: 'login' },
    ]);
    const events = await col.distinct('event');
    assert.strictEqual(events.length, 2);
    assert.ok(events.includes('login'));
    assert.ok(events.includes('purchase'));
  });
});

// ============================================================
// Countly pattern: cursor.stream() for large data export
// ============================================================
describe('Countly: Cursor Stream', () => {
  it('stream should emit data events', async () => {
    const col = db.collection('stream_countly');
    try { await col.drop(); } catch(e) {}
    await col.insertMany([{ v: 1 }, { v: 2 }, { v: 3 }]);

    const cursor = col.find({});
    const stream = cursor.stream();
    const docs = [];
    await new Promise((resolve, reject) => {
      stream.on('data', doc => { if (doc) docs.push(doc); });
      stream.on('end', resolve);
      stream.on('error', reject);
    });
    assert.strictEqual(docs.length, 3);
  });
});

// ============================================================
// Countly pattern: batchSize on cursor
// ============================================================
describe('Countly: batchSize', () => {
  it('find().batchSize() should work', async () => {
    const col = db.collection('batch_countly');
    try { await col.drop(); } catch(e) {}
    await col.insertMany([{ v: 1 }, { v: 2 }, { v: 3 }]);

    const results = await col.find({}).batchSize(1000).toArray();
    assert.strictEqual(results.length, 3);
  });
});
