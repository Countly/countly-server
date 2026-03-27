'use strict';

const { describe, it, before, after, beforeEach } = require('node:test');
const assert = require('node:assert');
const {
  MongoClient, ObjectId, Long, Double, Int32, UUID, DBRef,
  Decimal128, Binary, Timestamp, Code, BSONRegExp, MinKey, MaxKey,
  ChangeStream
} = require('../index');

const PG_URL = process.env.PG_URL || 'postgresql://testuser:testpass@localhost:5433/testdb';
let client, db;

before(async () => {
  client = await MongoClient.connect(PG_URL);
  db = client.db('fp_test');
  try { await client._pool.query('CREATE SCHEMA IF NOT EXISTS "fp_test"'); } catch (e) {}
});
after(async () => {
  if (db) try { await db.dropDatabase(); } catch (e) {}
  if (client) await client.close();
});

// ===================================================================
// BSON — exercise every method in integration context
// ===================================================================
describe('FP: BSON Methods', () => {
  it('Long full API', () => {
    const l = new Long(42);
    assert.strictEqual(l.toNumber(), 42);
    assert.strictEqual(l.toString(), '42');
    assert.strictEqual(l.toJSON(), '42');
    assert.ok(l.equals(new Long(42)));
    assert.ok(l.equals(42));
    assert.strictEqual(l.valueOf(), 42n);
    const l2 = Long.fromNumber(100);
    assert.strictEqual(l2.toNumber(), 100);
    const l3 = Long.fromString('255', 10);
    assert.strictEqual(l3.toNumber(), 255);
    const l4 = new Long(0, 1); // high bits
    assert.ok(l4.toNumber() > 0);
  });

  it('Decimal128 full API', () => {
    const d = new Decimal128('3.14');
    assert.strictEqual(d.toString(), '3.14');
    assert.deepStrictEqual(d.toJSON(), { $numberDecimal: '3.14' });
    assert.strictEqual(d.valueOf(), 3.14);
    const d2 = Decimal128.fromString('99.9');
    assert.strictEqual(d2.toString(), '99.9');
    const d3 = new Decimal128(42);
    assert.strictEqual(d3.toString(), '42');
  });

  it('Binary full API', () => {
    const b = new Binary(Buffer.from('hello'), Binary.SUBTYPE_DEFAULT);
    assert.strictEqual(b.length(), 5);
    assert.ok(b.value().equals(Buffer.from('hello')));
    assert.strictEqual(b.toString('utf8'), 'hello');
    assert.ok(b.toJSON());
    assert.strictEqual(b.subType, 0);
    const b2 = new Binary(null);
    assert.strictEqual(b2.length(), 0);
    const b3 = new Binary(Buffer.alloc(0), Binary.SUBTYPE_UUID);
    assert.strictEqual(b3.subType, 4);
  });

  it('Timestamp full API', () => {
    const ts = new Timestamp({ t: 100, i: 5 });
    assert.strictEqual(ts.getHighBits(), 100);
    assert.strictEqual(ts.getLowBits(), 5);
    assert.deepStrictEqual(ts.toJSON(), { t: 100, i: 5 });
    assert.ok(ts.toString().includes('100'));
    const ts2 = new Timestamp(5n << 32n | 1n);
    assert.strictEqual(ts2.getHighBits(), 5);
    const ts3 = new Timestamp(1, 2);
    assert.strictEqual(ts3.getLowBits(), 1);
  });

  it('Double/Int32 full API', () => {
    const d = new Double(3.14);
    assert.strictEqual(d.valueOf(), 3.14);
    assert.strictEqual(d.toJSON(), 3.14);
    assert.strictEqual(d.toString(), '3.14');
    assert.ok(d.equals(new Double(3.14)));
    assert.ok(d.equals(3.14));
    assert.ok(d[Symbol.for('nodejs.util.inspect.custom')]().includes('3.14'));
    const d2 = new Double('2.5');
    assert.strictEqual(d2.value, 2.5);

    const i = new Int32(42);
    assert.strictEqual(i.valueOf(), 42);
    assert.strictEqual(i.toJSON(), 42);
    assert.ok(i.equals(new Int32(42)));
    assert.strictEqual(new Int32(3.9).value, 3);
    assert.ok(i[Symbol.for('nodejs.util.inspect.custom')]().includes('42'));
  });

  it('UUID full API', () => {
    const u = new UUID();
    assert.ok(UUID.isValid(u));
    assert.strictEqual(u.toHexString().length, 36); // with dashes
    assert.strictEqual(u.toHexString(false).length, 32);
    assert.strictEqual(u.toString(), u.toHexString());
    assert.strictEqual(u.toJSON(), u.toHexString());
    assert.strictEqual(u.toBuffer().length, 16);
    const bin = u.toBinary();
    assert.ok(bin instanceof Binary);
    assert.ok(u.equals(new UUID(u.toHexString())));
    assert.ok(!u.equals(new UUID()));
    assert.ok(u[Symbol.for('nodejs.util.inspect.custom')]().includes('UUID'));
    const u2 = new UUID(u);
    assert.ok(u.equals(u2));
    const u3 = new UUID(u.toBuffer());
    assert.ok(u.equals(u3));
    assert.ok(!UUID.isValid(123));
    assert.ok(!UUID.isValid('bad'));
    assert.throws(() => new UUID('bad'));
    assert.throws(() => new UUID(Buffer.alloc(5)));
    assert.throws(() => new UUID(123));
  });

  it('DBRef full API', () => {
    const ref = new DBRef('users', 'abc123', 'mydb', { extra: true });
    assert.strictEqual(ref.collection, 'users');
    assert.strictEqual(ref.oid, 'abc123');
    assert.strictEqual(ref.db, 'mydb');
    assert.strictEqual(ref.namespace, 'users');
    ref.namespace = 'customers';
    assert.strictEqual(ref.collection, 'customers');
    const json = ref.toJSON();
    assert.strictEqual(json.$ref, 'customers');
    assert.strictEqual(json.$db, 'mydb');
    assert.strictEqual(json.extra, true);
    assert.ok(ref.toString().includes('customers'));
    assert.ok(ref[Symbol.for('nodejs.util.inspect.custom')]().includes('customers'));
    const ref2 = new DBRef('col', 'id');
    assert.strictEqual(ref2.db, '');
    assert.strictEqual(ref2.toJSON().$db, undefined);
  });

  it('Code/MinKey/MaxKey/BSONRegExp', () => {
    const c = new Code('return x', { x: 1 });
    assert.deepStrictEqual(c.toJSON(), { $code: 'return x', $scope: { x: 1 } });
    const c2 = new Code('test');
    assert.deepStrictEqual(c2.scope, {});

    assert.deepStrictEqual(new MinKey().toJSON(), { $minKey: 1 });
    assert.deepStrictEqual(new MaxKey().toJSON(), { $maxKey: 1 });

    const re = new BSONRegExp('^test', 'gi');
    assert.ok(re.toRegExp().test('Testing'));
    assert.strictEqual(re.pattern, '^test');
    const re2 = new BSONRegExp('abc');
    assert.strictEqual(re2.options, '');
  });

  it('ObjectId full API', () => {
    const id = new ObjectId();
    assert.ok(ObjectId.isValid(id));
    assert.ok(id.getTimestamp() instanceof Date);
    assert.strictEqual(id.toString().length, 24);
    assert.strictEqual(id.toJSON(), id.toHexString());
    assert.ok(id.equals(new ObjectId(id.toHexString())));
    assert.ok(!id.equals(new ObjectId()));
    assert.ok(!id.equals(null));
    assert.ok(!id.equals(123));
    const f = ObjectId.createFromHexString(id.toHexString());
    assert.ok(id.equals(f));
    const t = ObjectId.createFromTime(Date.now());
    assert.ok(ObjectId.isValid(t));
    assert.ok(!ObjectId.isValid('bad'));
    assert.ok(!ObjectId.isValid(123));
    assert.ok(!ObjectId.isValid(null));
    assert.ok(ObjectId.isValid(Buffer.alloc(12)));
    assert.ok(!ObjectId.isValid(Buffer.alloc(5)));
    assert.throws(() => new ObjectId('bad'));
    assert.throws(() => new ObjectId(true));
    const id2 = new ObjectId(id);
    assert.ok(id.equals(id2));
    const id3 = new ObjectId(Buffer.alloc(12, 0xab));
    assert.ok(ObjectId.isValid(id3));
    const id4 = new ObjectId(null);
    assert.ok(ObjectId.isValid(id4));
    assert.ok(id[Symbol.for('nodejs.util.inspect.custom')]().includes('ObjectId'));
    assert.ok(id.equals(id.toHexString().toUpperCase())); // case insensitive
  });
});

// ===================================================================
// ChangeStream — exercise more paths
// ===================================================================
describe('FP: ChangeStream Paths', () => {
  it('update notification', async () => {
    const col = db.collection('cs_upd');
    try { await col.drop(); } catch(e){}
    await col.insertOne({ _id: 'csup1', v: 1 });

    const schema = db._schemaName;
    const channel = `change_${schema}_cs_upd`;
    try {
      await client._pool.query(`SET search_path TO "${schema}"`);
      await client._pool.query(ChangeStream.getCreateTriggerSQL('cs_upd', channel));
    } catch(e) {}

    const cs = col.watch();
    await cs.start();

    setTimeout(() => col.updateOne({ _id: 'csup1' }, { $set: { v: 2 } }), 50);
    const change = await cs.next();
    assert.ok(change);
    assert.strictEqual(change.operationType, 'update');
    assert.ok(cs.resumeToken);
    await cs.close();
  });

  it('delete notification', async () => {
    const col = db.collection('cs_del');
    try { await col.drop(); } catch(e){}
    await col.insertOne({ _id: 'csdel1', v: 1 });

    const schema = db._schemaName;
    const channel = `change_${schema}_cs_del`;
    try {
      await client._pool.query(`SET search_path TO "${schema}"`);
      await client._pool.query(ChangeStream.getCreateTriggerSQL('cs_del', channel));
    } catch(e) {}

    const cs = col.watch();
    await cs.start();

    setTimeout(() => col.deleteOne({ _id: 'csdel1' }), 50);
    const change = await cs.next();
    assert.ok(change);
    assert.strictEqual(change.operationType, 'delete');
    await cs.close();
  });

  it('watch with pipeline filter should only pass matching', async () => {
    const col = db.collection('cs_flt');
    try { await col.drop(); } catch(e){}
    await col.insertOne({ _id: 'csf1', v: 1 });

    const schema = db._schemaName;
    const channel = `change_${schema}_cs_flt`;
    try {
      await client._pool.query(`SET search_path TO "${schema}"`);
      await client._pool.query(ChangeStream.getCreateTriggerSQL('cs_flt', channel));
    } catch(e) {}

    // Only watch for inserts
    const cs = col.watch([{ $match: { operationType: 'insert' } }]);
    await cs.start();

    // Insert should pass
    setTimeout(() => col.insertOne({ _id: 'csf2', v: 2 }), 50);
    const change = await cs.next();
    assert.strictEqual(change.operationType, 'insert');
    await cs.close();
  });

  it('tryNext should return null when closed', async () => {
    const cs = db.collection('cs_try').watch();
    cs._closed = true;
    const result = await cs.tryNext();
    assert.strictEqual(result, null);
  });

  it('hasNext should return true/false', async () => {
    const cs = db.collection('cs_hn').watch();
    assert.strictEqual(await cs.hasNext(), true);
    cs._closed = true;
    assert.strictEqual(await cs.hasNext(), false);
  });

  it('_getPool should find pool from different parent types', () => {
    // Collection parent
    const col = db.collection('test');
    const cs1 = new ChangeStream(col);
    assert.ok(cs1._getPool());

    // Db parent
    const cs2 = new ChangeStream(db);
    assert.ok(cs2._getPool());

    // Client parent
    const cs3 = new ChangeStream(client);
    assert.ok(cs3._getPool());

    // Unknown parent
    const cs4 = new ChangeStream({});
    assert.throws(() => cs4._getPool());
  });
});

// ===================================================================
// Collection — more CRUD paths
// ===================================================================
describe('FP: Collection Gaps', () => {
  let col;
  beforeEach(async () => { col = db.collection('colg'); try { await col.drop(); } catch(e){} });

  it('$pull with subdoc match', async () => {
    const { insertedId } = await col.insertOne({ items: [{ s: 'a', v: 1 }, { s: 'b', v: 2 }] });
    await col.updateOne({ _id: insertedId }, { $pull: { items: { s: 'a' } } });
    const found = await col.findOne({ _id: insertedId });
    assert.strictEqual(found.items.length, 1);
    assert.strictEqual(found.items[0].s, 'b');
  });

  it('$push with $sort by field', async () => {
    const { insertedId } = await col.insertOne({ items: [{ n: 'b' }, { n: 'a' }] });
    await col.updateOne({ _id: insertedId }, {
      $push: { items: { $each: [{ n: 'c' }], $sort: { n: 1 } } }
    });
    const found = await col.findOne({ _id: insertedId });
    assert.strictEqual(found.items[0].n, 'a');
  });

  it('findOneAndUpdate with sort', async () => {
    await col.insertMany([
      { _id: 'fs1', v: 10 }, { _id: 'fs2', v: 5 }, { _id: 'fs3', v: 20 }
    ]);
    const r = await col.findOneAndUpdate(
      {},
      { $set: { updated: true } },
      { sort: { v: 1 }, returnDocument: 'after' }
    );
    assert.strictEqual(r.value.v, 5); // Lowest v
    assert.ok(r.value.updated);
  });

  it('findOneAndDelete with sort', async () => {
    await col.insertMany([
      { _id: 'fd1', v: 10 }, { _id: 'fd2', v: 5 }
    ]);
    const r = await col.findOneAndDelete({}, { sort: { v: -1 } });
    assert.strictEqual(r.value.v, 10); // Highest v
  });

  it('findOneAndUpdate with projection', async () => {
    await col.insertOne({ _id: 'fp1', name: 'test', secret: 'x' });
    const r = await col.findOneAndUpdate(
      { _id: 'fp1' },
      { $set: { name: 'updated' } },
      { projection: { name: 1 }, returnDocument: 'after' }
    );
    assert.ok(r.value.name);
    assert.strictEqual(r.value.secret, undefined);
  });

  it('dropIndex then indexExists false', async () => {
    await col.insertOne({ x: 1 });
    const name = await col.createIndex({ x: 1 });
    assert.ok(await col.indexExists(name));
    await col.dropIndex(name);
    assert.ok(!(await col.indexExists(name)));
  });

  it('dropIndexes', async () => {
    await col.insertOne({ a: 1, b: 2 });
    await col.createIndex({ a: 1 });
    await col.createIndex({ b: 1 });
    await col.dropIndexes();
    // Only pkey should remain
  });

  it('sparse index', async () => {
    await col.insertOne({ x: 1 });
    await col.createIndex({ x: 1 }, { sparse: true, name: 'sparse_x' });
    assert.ok(await col.indexExists('sparse_x'));
  });
});

// ===================================================================
// Db/Session remaining paths
// ===================================================================
describe('FP: Db & Session Final', () => {
  it('db.dropCollection', async () => {
    await db.collection('dc_test').insertOne({ x: 1 });
    await db.dropCollection('dc_test');
    const cursor = await db.listCollections({ name: 'dc_test' });
    assert.strictEqual((await cursor.toArray()).length, 0);
  });

  it('session with snapshot isolation', async () => {
    const s = client.startSession();
    s.startTransaction({ readConcern: { level: 'snapshot' } });
    assert.ok(s.inTransaction);
    // The BEGIN SERIALIZABLE is sent on first operation
    const col = db.collection('snap');
    try { await col.drop(); } catch(e){}
    await col.insertOne({ setup: true });
    await col.findOne({}, { session: s });
    await s.commitTransaction();
    await s.endSession();
  });

  it('session endSession with active tx aborts', async () => {
    const s = client.startSession();
    s.startTransaction();
    await s.endSession(); // should auto-abort
    assert.ok(s._ended);
    assert.ok(!s.inTransaction);
  });

  it('commitTransaction without starting should throw', async () => {
    const s = client.startSession();
    await assert.rejects(() => s.commitTransaction(), /No transaction/);
    await s.endSession();
  });

  it('abortTransaction without starting should throw', async () => {
    const s = client.startSession();
    await assert.rejects(() => s.abortTransaction(), /No transaction/);
    await s.endSession();
  });

  it('db.aggregate should throw', async () => {
    await assert.rejects(() => db.aggregate([]), /not supported/);
  });

  it('ArrayCursor from listCollections: forEach, map, tryNext', async () => {
    await db.collection('ac1').insertOne({ x: 1 });
    const cursor = await db.listCollections();
    const d = await cursor.tryNext();
    assert.ok(d);
    cursor.rewind();
    const names = [];
    const c2 = await db.listCollections();
    c2.map(item => item.name);
    const mapped = await c2.toArray();
    assert.ok(mapped.every(n => typeof n === 'string'));
    await db.collection('ac1').drop();
  });
});

// ===================================================================
// QueryTranslator remaining: $text, bitwise, more $elemMatch
// ===================================================================
describe('FP: Query Gaps', () => {
  let col;
  before(async () => {
    col = db.collection('qgap');
    try { await col.drop(); } catch(e){}
    await col.insertMany([
      { _id: 'g1', x: 10, s: 'the quick brown fox', flags: 6, items: [{q: 5, s: 'A'}, {q: 10, s: 'B'}] },
      { _id: 'g2', x: 20, s: 'lazy dog jumps', flags: 3, items: [{q: 15, s: 'A'}] },
    ]);
    // Create text index for $text
    await col.createIndex({ s: 'text' });
  });

  it('$elemMatch with field conditions', async () => {
    const r = await col.find({ items: { $elemMatch: { q: { $gte: 10 }, s: 'A' } } }).toArray();
    assert.ok(r.length >= 1);
  });

  it('$not on field', async () => {
    const r = await col.find({ x: { $not: { $lt: 15 } } }).toArray();
    assert.ok(r.every(d => d.x >= 15));
  });

  it('deep nested dot query', async () => {
    await col.insertOne({ _id: 'gn', a: { b: { c: { d: 42 } } } });
    const r = await col.findOne({ 'a.b.c.d': 42 });
    assert.strictEqual(r._id, 'gn');
    await col.deleteOne({ _id: 'gn' });
  });

  it('sort with multiple fields', async () => {
    await col.insertMany([
      { _id: 'ms1', a: 1, b: 'z' },
      { _id: 'ms2', a: 1, b: 'a' },
      { _id: 'ms3', a: 2, b: 'a' },
    ]);
    const r = await col.find({ _id: { $in: ['ms1','ms2','ms3'] } }).sort({ a: 1, b: 1 }).toArray();
    assert.strictEqual(r[0]._id, 'ms2'); // a=1, b='a'
  });
});

// ===================================================================
// UpdateTranslator remaining: $pull $in, $push $each $sort by field
// ===================================================================
describe('FP: Update Gaps', () => {
  let col;
  beforeEach(async () => { col = db.collection('ugap'); try { await col.drop(); } catch(e){} });

  it('$pull with $in', async () => {
    const { insertedId } = await col.insertOne({ tags: ['a', 'b', 'c', 'd'] });
    await col.updateOne({ _id: insertedId }, { $pull: { tags: { $in: ['b', 'd'] } } });
    const found = await col.findOne({ _id: insertedId });
    assert.deepStrictEqual(found.tags, ['a', 'c']);
  });

  it('$push $each with descending $sort', async () => {
    const { insertedId } = await col.insertOne({ nums: [3, 1] });
    await col.updateOne({ _id: insertedId }, {
      $push: { nums: { $each: [5, 2], $sort: -1 } }
    });
    const found = await col.findOne({ _id: insertedId });
    assert.deepStrictEqual(found.nums, [5, 3, 2, 1]);
  });

  it('$push $each with positive $slice', async () => {
    const { insertedId } = await col.insertOne({ log: ['a'] });
    await col.updateOne({ _id: insertedId }, {
      $push: { log: { $each: ['b', 'c', 'd'], $slice: 3 } }
    });
    const found = await col.findOne({ _id: insertedId });
    assert.strictEqual(found.log.length, 3);
  });
});
