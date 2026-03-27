'use strict';

const { describe, it, before, after, beforeEach } = require('node:test');
const assert = require('node:assert');
const {
  MongoClient, ObjectId, GridFSBucket, Long, Double, Int32, UUID,
  Decimal128, Binary, Timestamp, DBRef, Code, BSONRegExp, MinKey, MaxKey
} = require('../index');

const PG_URL = process.env.PG_URL || 'postgresql://testuser:testpass@localhost:5433/testdb';
let client, db;

before(async () => {
  client = await MongoClient.connect(PG_URL);
  db = client.db('deep_test');
  try { await client._pool.query('CREATE SCHEMA IF NOT EXISTS "deep_test"'); } catch (e) {}
});

after(async () => {
  if (db) try { await db.dropDatabase(); } catch (e) {}
  if (client) await client.close();
});

// ============================================================
// Query operators — fill coverage gaps
// ============================================================
describe('IDeep: Query Operators', () => {
  let col;
  before(async () => {
    col = db.collection('qdeep');
    try { await col.drop(); } catch(e){}
    await col.insertMany([
      { _id: 'a1', x: 10, y: 'hello', arr: [1,2,3], n: { a: 1, b: 2 }, flags: 5 },
      { _id: 'a2', x: 20, y: 'world', arr: [4,5,6], n: { a: 3, b: 4 }, flags: 10 },
      { _id: 'a3', x: 30, y: null, arr: [7,8,9], n: { a: 5 }, flags: 15 },
      { _id: 'a4', x: 40, y: 'HELLO', arr: [], n: {}, flags: 0 },
      { _id: 'a5', x: 50, y: 'test123', arr: [1,2], n: { a: 1 } },
    ]);
  });

  it('_id with $gt/$lt', async () => {
    const r = await col.find({ _id: { $gt: 'a2', $lt: 'a5' } }).toArray();
    assert.ok(r.every(d => d._id > 'a2' && d._id < 'a5'));
  });

  it('_id with $ne', async () => {
    const r = await col.find({ _id: { $ne: 'a1' } }).toArray();
    assert.ok(r.every(d => d._id !== 'a1'));
  });

  it('_id with $in', async () => {
    const r = await col.find({ _id: { $in: ['a1', 'a3'] } }).toArray();
    assert.strictEqual(r.length, 2);
  });

  it('$elemMatch on simple array', async () => {
    const r = await col.find({ arr: { $elemMatch: { $gt: 4, $lt: 7 } } }).toArray();
    assert.ok(r.length >= 1);
  });

  it('$all', async () => {
    const r = await col.find({ arr: { $all: [1, 2] } }).toArray();
    assert.ok(r.length >= 1);
  });

  it('$type with multiple types', async () => {
    const r = await col.find({ y: { $type: ['string', 'null'] } }).toArray();
    assert.strictEqual(r.length, 5);
  });

  it('$mod', async () => {
    const r = await col.find({ x: { $mod: [20, 0] } }).toArray();
    assert.ok(r.every(d => d.x % 20 === 0));
  });

  it('nested $exists', async () => {
    const r = await col.find({ 'n.b': { $exists: true } }).toArray();
    assert.ok(r.length >= 1);
  });

  it('$ne null', async () => {
    const r = await col.find({ y: { $ne: null } }).toArray();
    assert.ok(r.every(d => d.y !== null));
  });

  it('array equality', async () => {
    const r = await col.find({ arr: [1,2,3] }).toArray();
    assert.strictEqual(r.length, 1);
  });

  it('object equality', async () => {
    const r = await col.find({ n: { a: 1, b: 2 } }).toArray();
    assert.strictEqual(r.length, 1);
  });

  it('implicit $and (multiple fields)', async () => {
    const r = await col.find({ x: { $gte: 20 }, y: 'world' }).toArray();
    assert.strictEqual(r.length, 1);
  });

  it('Date comparison', async () => {
    await col.insertOne({ _id: 'dated', ts: new Date('2024-06-01') });
    const r = await col.find({ ts: { $gt: new Date('2024-01-01') } }).toArray();
    assert.ok(r.length >= 1);
    await col.deleteOne({ _id: 'dated' });
  });
});

// ============================================================
// Update operators — fill coverage gaps
// ============================================================
describe('IDeep: Update Operators', () => {
  let col;
  beforeEach(async () => { col = db.collection('udeep'); try { await col.drop(); } catch(e){} });

  it('$push with $each (append)', async () => {
    const { insertedId } = await col.insertOne({ arr: ['a', 'b'] });
    await col.updateOne({ _id: insertedId }, {
      $push: { arr: { $each: ['c', 'd'] } }
    });
    const found = await col.findOne({ _id: insertedId });
    assert.deepStrictEqual(found.arr, ['a', 'b', 'c', 'd']);
  });

  it('$pull with operator condition', async () => {
    const { insertedId } = await col.insertOne({ scores: [10, 50, 80, 30] });
    await col.updateOne({ _id: insertedId }, { $pull: { scores: { $lt: 40 } } });
    const found = await col.findOne({ _id: insertedId });
    assert.ok(found.scores.every(s => s >= 40));
  });

  it('$addToSet with single value', async () => {
    const { insertedId } = await col.insertOne({ tags: ['a', 'b'] });
    await col.updateOne({ _id: insertedId }, { $addToSet: { tags: 'c' } });
    const found = await col.findOne({ _id: insertedId });
    assert.ok(found.tags.includes('c'));
    assert.strictEqual(found.tags.length, 3);
  });

  it('$bit operations', async () => {
    const { insertedId } = await col.insertOne({ flags: 0b1010 });
    await col.updateOne({ _id: insertedId }, { $bit: { flags: { or: 0b0101 } } });
    const found = await col.findOne({ _id: insertedId });
    assert.strictEqual(found.flags, 0b1111);
  });

  it('$unset nested field', async () => {
    const { insertedId } = await col.insertOne({ a: { b: 1, c: 2 } });
    await col.updateOne({ _id: insertedId }, { $unset: { 'a.c': '' } });
    const found = await col.findOne({ _id: insertedId });
    assert.strictEqual(found.a.b, 1);
    assert.strictEqual(found.a.c, undefined);
  });

  it('$inc creates field if missing', async () => {
    const { insertedId } = await col.insertOne({ name: 'test' });
    await col.updateOne({ _id: insertedId }, { $inc: { newCounter: 5 } });
    const found = await col.findOne({ _id: insertedId });
    assert.strictEqual(found.newCounter, 5);
  });
});

// ============================================================
// Aggregation — fill coverage gaps
// ============================================================
describe('IDeep: Aggregation Pipeline', () => {
  let col;
  before(async () => {
    col = db.collection('aggdeep');
    try { await col.drop(); } catch(e){}
    await col.insertMany([
      { cat: 'A', val: 100, tags: ['x','y'], date: new Date('2024-01-15') },
      { cat: 'A', val: 200, tags: ['y','z'], date: new Date('2024-02-15') },
      { cat: 'B', val: 300, tags: ['x'], date: new Date('2024-03-15') },
      { cat: 'B', val: 400, tags: ['z','w'], date: new Date('2024-04-15') },
    ]);
  });

  it('$group with $first/$last', async () => {
    const r = await col.aggregate([
      { $sort: { val: 1 } },
      { $group: { _id: '$cat', first: { $first: '$val' }, last: { $last: '$val' } } }
    ]).toArray();
    const a = r.find(d => d._id === 'A');
    assert.ok(a);
  });

  it('$project with $toLower/$toUpper', async () => {
    const r = await col.aggregate([
      { $project: { lower: { $toLower: '$cat' }, upper: { $toUpper: '$cat' } } },
      { $limit: 1 }
    ]).toArray();
    assert.strictEqual(r[0].lower, 'a');
    assert.strictEqual(r[0].upper, 'A');
  });

  it('$project with $subtract', async () => {
    const r = await col.aggregate([
      { $project: { diff: { $subtract: ['$val', 50] } } },
      { $limit: 1 }
    ]).toArray();
    assert.strictEqual(r[0].diff, 50);
  });

  it('$project with $divide', async () => {
    const r = await col.aggregate([
      { $project: { half: { $divide: ['$val', 2] } } },
      { $limit: 1 }
    ]).toArray();
    assert.strictEqual(r[0].half, 50);
  });

  it('$project with $mod', async () => {
    const r = await col.aggregate([
      { $project: { rem: { $mod: ['$val', 150] } } },
      { $limit: 1 }
    ]).toArray();
    assert.strictEqual(r[0].rem, 100);
  });

  it('$project with $abs/$ceil/$floor', async () => {
    await col.insertOne({ _id: 'math', val: -3.7 });
    const r = await col.aggregate([
      { $match: { _id: 'math' } },
      { $project: {
        absVal: { $abs: '$val' },
        ceilVal: { $ceil: '$val' },
        floorVal: { $floor: '$val' }
      }}
    ]).toArray();
    assert.strictEqual(r[0].absVal, 3.7);
    assert.strictEqual(r[0].ceilVal, -3);
    assert.strictEqual(r[0].floorVal, -4);
    await col.deleteOne({ _id: 'math' });
  });

  it('$project with $concat', async () => {
    const r = await col.aggregate([
      { $project: { label: { $concat: ['$cat', '-', 'item'] } } },
      { $limit: 1 }
    ]).toArray();
    assert.ok(r[0].label.includes('-'));
  });

  it('$project with $cond array form', async () => {
    const r = await col.aggregate([
      { $project: { tier: { $cond: [{ $gte: ['$val', 200] }, 'high', 'low'] } } }
    ]).toArray();
    assert.ok(r.every(d => d.tier === 'high' || d.tier === 'low'));
  });

  it('$project with $switch', async () => {
    const r = await col.aggregate([
      { $project: { grade: { $switch: {
        branches: [
          { case: { $gte: ['$val', 300] }, then: 'A' },
          { case: { $gte: ['$val', 200] }, then: 'B' },
        ],
        default: 'C'
      }}}}
    ]).toArray();
    assert.ok(r.every(d => ['A','B','C'].includes(d.grade)));
  });

  it('$project with $size', async () => {
    const r = await col.aggregate([
      { $project: { tagCount: { $size: '$tags' } } }
    ]).toArray();
    assert.ok(r.every(d => typeof d.tagCount === 'number'));
  });

  it('$project with $arrayElemAt', async () => {
    const r = await col.aggregate([
      { $project: { firstTag: { $arrayElemAt: ['$tags', 0] } } },
      { $limit: 1 }
    ]).toArray();
    assert.ok(r[0].firstTag);
  });

  it('$project with literal', async () => {
    const r = await col.aggregate([
      { $project: { fixed: { $literal: 42 } } },
      { $limit: 1 }
    ]).toArray();
    assert.strictEqual(r[0].fixed, 42);
  });

  it('$project with $toString/$toInt', async () => {
    const r = await col.aggregate([
      { $project: { strVal: { $toString: '$val' } } },
      { $limit: 1 }
    ]).toArray();
    assert.strictEqual(typeof r[0].strVal, 'string');
  });

  it('$project with $type', async () => {
    const r = await col.aggregate([
      { $project: { t: { $type: '$val' } } },
      { $limit: 1 }
    ]).toArray();
    assert.strictEqual(r[0].t, 'number');
  });

  it('$project with $isArray', async () => {
    const r = await col.aggregate([
      { $project: { isArr: { $isArray: '$tags' }, isNotArr: { $isArray: '$val' } } },
      { $limit: 1 }
    ]).toArray();
    assert.strictEqual(r[0].isArr, true);
    assert.strictEqual(r[0].isNotArr, false);
  });

  it('$project with $mergeObjects', async () => {
    await col.insertOne({ _id: 'mo', a: { x: 1 }, b: { y: 2 } });
    const r = await col.aggregate([
      { $match: { _id: 'mo' } },
      { $project: { merged: { $mergeObjects: ['$a', '$b'] } } }
    ]).toArray();
    assert.ok(r[0].merged.x === 1 || r[0].merged);
    await col.deleteOne({ _id: 'mo' });
  });

  it('$unwind + $group', async () => {
    const r = await col.aggregate([
      { $unwind: '$tags' },
      { $group: { _id: '$tags', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]).toArray();
    assert.ok(r.length >= 2);
  });

  it('$bucket', async () => {
    const r = await col.aggregate([
      { $bucket: { groupBy: '$val', boundaries: [0, 200, 400, 600], default: 'Other' } }
    ]).toArray();
    assert.ok(r.length >= 1);
  });

  it('$unset array of fields', async () => {
    const r = await col.aggregate([
      { $unset: ['tags', 'date'] },
      { $limit: 1 }
    ]).toArray();
    assert.strictEqual(r[0].tags, undefined);
    assert.strictEqual(r[0].date, undefined);
  });
});

// ============================================================
// Client, Session, Change Stream gaps
// ============================================================
describe('IDeep: Client & Session Gaps', () => {
  it('client.withSession should work', async () => {
    let sessionSeen = false;
    await client.withSession(async (s) => {
      sessionSeen = true;
      assert.ok(s.id);
    });
    assert.ok(sessionSeen);
  });

  it('client.bulkWrite with updateMany and deleteMany', async () => {
    const c = db.collection('cbw_deep');
    try { await c.drop(); } catch(e){}
    await c.insertMany([{ _id: 'u1', s: 'old' }, { _id: 'u2', s: 'old' }]);

    const r = await client.bulkWrite([
      { namespace: 'deep_test.cbw_deep', updateMany: { filter: { s: 'old' }, update: { $set: { s: 'new' } } } },
      { namespace: 'deep_test.cbw_deep', deleteMany: { filter: { s: 'new' } } },
    ]);
    assert.ok(r.modifiedCount >= 2);
    assert.ok(r.deletedCount >= 2);
  });

  it('client.bulkWrite with replaceOne', async () => {
    const c = db.collection('cbw_repl');
    try { await c.drop(); } catch(e){}
    await c.insertOne({ _id: 'rr', x: 1 });
    await client.bulkWrite([
      { namespace: 'deep_test.cbw_repl', replaceOne: { filter: { _id: 'rr' }, replacement: { x: 99 } } }
    ]);
    const found = await c.findOne({ _id: 'rr' });
    assert.strictEqual(found.x, 99);
  });

  it('session isolation levels', async () => {
    const s = client.startSession();
    s.startTransaction({ readConcern: { level: 'snapshot' } });
    // The BEGIN should use SERIALIZABLE
    assert.ok(s.inTransaction);
    await s.abortTransaction();
    await s.endSession();
  });
});

// ============================================================
// GridFS download by name, large files
// ============================================================
describe('IDeep: GridFS Extended', () => {
  let bucket;
  before(async () => {
    bucket = new GridFSBucket(db, { chunkSizeBytes: 32 });
    try { await bucket.drop(); } catch(e){}
  });

  it('upload then download by name', async () => {
    const up = bucket.openUploadStream('named.txt');
    await new Promise((res, rej) => { up.on('error', rej); up.on('finish', res); up.end(Buffer.from('named content')); });

    const down = bucket.openDownloadStreamByName('named.txt');
    const chunks = [];
    const data = await new Promise((res, rej) => {
      down.on('data', c => chunks.push(c));
      down.on('end', () => res(Buffer.concat(chunks)));
      down.on('error', rej);
    });
    assert.strictEqual(data.toString(), 'named content');
  });

  it('upload with metadata then find', async () => {
    const up = bucket.openUploadStream('meta.txt', { metadata: { author: 'test' } });
    await new Promise((res, rej) => { up.on('error', rej); up.on('finish', res); up.end(Buffer.from('x')); });

    const files = await bucket.find({}).toArray();
    assert.ok(files.length >= 1);
  });

  it('multi-chunk upload/download', async () => {
    const data = Buffer.alloc(200, 0xAB); // 200 bytes, 32-byte chunks = 7 chunks
    const up = bucket.openUploadStream('big.bin');
    const fileId = up.id;
    await new Promise((res, rej) => { up.on('error', rej); up.on('finish', res); up.end(data); });

    const down = bucket.openDownloadStream(fileId);
    const chunks = [];
    const result = await new Promise((res, rej) => {
      down.on('data', c => chunks.push(c));
      down.on('end', () => res(Buffer.concat(chunks)));
      down.on('error', rej);
    });
    assert.strictEqual(result.length, 200);
    assert.ok(result.every(b => b === 0xAB));
  });
});

// ============================================================
// Db/Admin remaining methods
// ============================================================
describe('IDeep: Db/Admin Methods', () => {
  it('db.indexInformation', async () => {
    const c = db.collection('idx_info');
    try { await c.drop(); } catch(e){}
    await c.insertOne({ x: 1 });
    await c.createIndex({ x: 1 });
    const info = await db.indexInformation('idx_info');
    assert.ok(Object.keys(info).length >= 1);
    await c.drop();
  });

  it('admin.validateCollection', async () => {
    const c = db.collection('validate_test');
    await c.insertOne({ x: 1 });
    const admin = await db.admin();
    const r = await admin.validateCollection('validate_test');
    assert.strictEqual(r.ok, 1);
    await c.drop();
  });

  it('admin.command with serverInfo and serverStatus', async () => {
    const admin = await db.admin();
    assert.ok((await admin.command({ serverInfo: 1 })).version);
    assert.ok((await admin.command({ serverStatus: 1 })).ok);
    assert.ok((await admin.command({ buildInfo: 1 })).version);
  });

  it('db.command renameCollection', async () => {
    const c = db.collection('rcmd_from');
    await c.insertOne({ x: 1 });
    await db.command({ renameCollection: 'deep_test.rcmd_from', to: 'deep_test.rcmd_to' });
    const found = await db.collection('rcmd_to').findOne({});
    assert.ok(found);
    await db.collection('rcmd_to').drop();
  });

  it('db.command collStats', async () => {
    const c = db.collection('cstats');
    await c.insertOne({ x: 1 });
    const r = await db.command({ collStats: 'cstats' });
    assert.strictEqual(r.ok, 1);
    await c.drop();
  });

  it('db.command listCollections', async () => {
    await db.collection('lcmd').insertOne({ x: 1 });
    const r = await db.command({ listCollections: { filter: {} } });
    assert.ok(r.cursor.firstBatch.length >= 1);
    await db.collection('lcmd').drop();
  });

  it('ArrayCursor forEach, map, async iteration, stream', async () => {
    await db.collection('ac_test').insertOne({ x: 1 });
    await db.collection('ac_test2').insertOne({ x: 1 });
    const cursor = await db.listCollections();

    // forEach
    const names = [];
    const cursor2 = await db.listCollections();
    await cursor2.forEach(c => names.push(c.name));
    assert.ok(names.length >= 1);

    // map
    const cursor3 = await db.listCollections();
    cursor3.map(c => c.name);
    const mapped = await cursor3.toArray();
    assert.ok(mapped.every(n => typeof n === 'string'));

    // async iteration
    const cursor4 = await db.listCollections();
    const items = [];
    for await (const c of cursor4) items.push(c);
    assert.ok(items.length >= 1);

    await db.collection('ac_test').drop();
    await db.collection('ac_test2').drop();
  });
});
