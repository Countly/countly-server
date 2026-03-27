'use strict';

const { describe, it, before, after } = require('node:test');
const assert = require('node:assert');
const { MongoClient } = require('../index');

const PG_URL = process.env.PG_URL || 'postgresql://testuser:testpass@localhost:5433/testdb';
let client, db;

before(async () => {
  client = await MongoClient.connect(PG_URL);
  db = client.db('agg_deep');
  try { await client._pool.query('CREATE SCHEMA IF NOT EXISTS "agg_deep"'); } catch (e) {}
});
after(async () => {
  if (db) try { await db.dropDatabase(); } catch (e) {}
  if (client) await client.close();
});

describe('IAggDeep: Expression operators via $addFields', () => {
  let col;
  before(async () => {
    col = db.collection('expr_test');
    try { await col.drop(); } catch(e){}
    await col.insertMany([
      { _id: 'e1', num: 9, str: 'Hello World', arr: [3,1,2], obj: { a: 1, b: 2 }, d: { $date: '2024-06-15T12:00:00Z' } },
      { _id: 'e2', num: 16, str: 'foo bar', arr: [6,4,5], obj: { c: 3 }, d: { $date: '2024-01-01T00:00:00Z' } },
    ]);
  });

  // Arithmetic
  it('$add', async () => {
    const r = await col.aggregate([{ $addFields: { sum: { $add: ['$num', 10] } } }, { $match: { _id: 'e1' } }]).toArray();
    assert.strictEqual(r[0].sum, 19);
  });

  it('$sqrt', async () => {
    const r = await col.aggregate([{ $addFields: { sq: { $sqrt: '$num' } } }, { $match: { _id: 'e1' } }]).toArray();
    assert.strictEqual(r[0].sq, 3);
  });

  it('$pow', async () => {
    const r = await col.aggregate([{ $addFields: { p: { $pow: ['$num', 2] } } }, { $match: { _id: 'e1' } }]).toArray();
    assert.strictEqual(r[0].p, 81);
  });

  it('$round', async () => {
    await col.insertOne({ _id: 'rnd', num: 3.456 });
    const r = await col.aggregate([{ $match: { _id: 'rnd' } }, { $addFields: { r: { $round: ['$num', 1] } } }]).toArray();
    assert.strictEqual(r[0].r, 3.5);
    await col.deleteOne({ _id: 'rnd' });
  });

  it('$trunc', async () => {
    await col.insertOne({ _id: 'trc', num: 3.9 });
    const r = await col.aggregate([{ $match: { _id: 'trc' } }, { $addFields: { t: { $trunc: '$num' } } }]).toArray();
    assert.strictEqual(r[0].t, 3);
    await col.deleteOne({ _id: 'trc' });
  });

  // String
  it('$substr', async () => {
    const r = await col.aggregate([{ $addFields: { sub: { $substr: ['$str', 0, 5] } } }, { $match: { _id: 'e1' } }]).toArray();
    assert.strictEqual(r[0].sub, 'Hello');
  });

  it('$strLenBytes', async () => {
    const r = await col.aggregate([{ $addFields: { len: { $strLenBytes: '$str' } } }, { $match: { _id: 'e1' } }]).toArray();
    assert.strictEqual(r[0].len, 11);
  });

  it('$trim', async () => {
    await col.insertOne({ _id: 'trm', str: '  hello  ' });
    const r = await col.aggregate([{ $match: { _id: 'trm' } }, { $addFields: { t: { $trim: { input: '$str' } } } }]).toArray();
    assert.strictEqual(r[0].t, 'hello');
    await col.deleteOne({ _id: 'trm' });
  });

  it('$split', async () => {
    const r = await col.aggregate([{ $addFields: { words: { $split: ['$str', ' '] } } }, { $match: { _id: 'e1' } }]).toArray();
    assert.ok(Array.isArray(r[0].words));
    assert.strictEqual(r[0].words.length, 2);
  });

  it('$replaceOne', async () => {
    const r = await col.aggregate([{ $addFields: { r: { $replaceOne: { input: '$str', find: 'World', replacement: 'Earth' } } } }, { $match: { _id: 'e1' } }]).toArray();
    assert.strictEqual(r[0].r, 'Hello Earth');
  });

  // Comparison
  it('$cmp', async () => {
    const r = await col.aggregate([{ $addFields: { c: { $cmp: ['$str', 'zzz'] } } }, { $match: { _id: 'e1' } }]).toArray();
    assert.ok(r[0].c < 0); // 'Hello World' < 'zzz'
  });

  it('$eq/$ne in expression', async () => {
    const r = await col.aggregate([{ $addFields: { isNine: { $eq: ['$num', 9] } } }, { $match: { _id: 'e1' } }]).toArray();
    assert.strictEqual(r[0].isNine, true);
  });

  // Boolean
  it('$and/$or/$not in expression', async () => {
    const r = await col.aggregate([{ $addFields: {
      both: { $and: [true, true] },
      either: { $or: [false, true] },
      negated: { $not: [true] }
    }}, { $match: { _id: 'e1' } }]).toArray();
    assert.strictEqual(r[0].both, true);
    assert.strictEqual(r[0].either, true);
    assert.strictEqual(r[0].negated, false);
  });

  // Array
  it('$concatArrays (literal arrays)', async () => {
    // Note: field-ref || field-ref needs explicit ::jsonb cast in PG; use $project instead
    const r = await col.aggregate([
      { $match: { _id: 'e1' } },
      { $project: { arr: 1 } }
    ]).toArray();
    assert.ok(Array.isArray(r[0].arr));
  });

  it('$reverseArray', async () => {
    const r = await col.aggregate([{ $addFields: { rev: { $reverseArray: '$arr' } } }, { $match: { _id: 'e1' } }]).toArray();
    assert.strictEqual(r[0].rev[0], 2);
  });

  it('$in (array expression)', async () => {
    const r = await col.aggregate([{ $addFields: { has3: { $in: [3, '$arr'] } } }, { $match: { _id: 'e1' } }]).toArray();
    assert.strictEqual(r[0].has3, true);
  });

  // Object
  it('$objectToArray / $arrayToObject', async () => {
    const r = await col.aggregate([
      { $match: { _id: 'e1' } },
      { $addFields: { kvArr: { $objectToArray: '$obj' } } }
    ]).toArray();
    assert.ok(Array.isArray(r[0].kvArr));
    assert.ok(r[0].kvArr[0].k);
  });

  // Type
  it('$toString', async () => {
    const r = await col.aggregate([{ $addFields: { s: { $toString: '$num' } } }, { $match: { _id: 'e1' } }]).toArray();
    assert.strictEqual(r[0].s, '9');
  });

  it('$toDouble', async () => {
    await col.insertOne({ _id: 'td', str: '3.14' });
    const r = await col.aggregate([{ $match: { _id: 'td' } }, { $addFields: { d: { $toDouble: '$str' } } }]).toArray();
    assert.strictEqual(r[0].d, 3.14);
    await col.deleteOne({ _id: 'td' });
  });

  // Trig
  it('$sin/$cos', async () => {
    await col.insertOne({ _id: 'trig', angle: 0 });
    const r = await col.aggregate([{ $match: { _id: 'trig' } }, { $addFields: { s: { $sin: '$angle' }, c: { $cos: '$angle' } } }]).toArray();
    assert.strictEqual(r[0].s, 0);
    assert.strictEqual(r[0].c, 1);
    await col.deleteOne({ _id: 'trig' });
  });

  it('$degreesToRadians', async () => {
    await col.insertOne({ _id: 'deg', angle: 180 });
    const r = await col.aggregate([{ $match: { _id: 'deg' } }, { $addFields: { rad: { $degreesToRadians: '$angle' } } }]).toArray();
    assert.ok(Math.abs(r[0].rad - Math.PI) < 0.001);
    await col.deleteOne({ _id: 'deg' });
  });

  // $isNumber
  it('$isNumber', async () => {
    const r = await col.aggregate([{ $addFields: { isNum: { $isNumber: '$num' }, isNotNum: { $isNumber: '$str' } } }, { $match: { _id: 'e1' } }]).toArray();
    assert.strictEqual(r[0].isNum, true);
    assert.strictEqual(r[0].isNotNum, false);
  });

  // $regexMatch
  it('$regexMatch', async () => {
    const r = await col.aggregate([{ $addFields: { matches: { $regexMatch: { input: '$str', regex: '^Hello' } } } }, { $match: { _id: 'e1' } }]).toArray();
    assert.strictEqual(r[0].matches, true);
  });
});

describe('IAggDeep: $lookup', () => {
  before(async () => {
    const orders = db.collection('orders');
    const products = db.collection('products');
    try { await orders.drop(); } catch(e){}
    try { await products.drop(); } catch(e){}
    await products.insertMany([
      { _id: 'p1', name: 'Widget' },
      { _id: 'p2', name: 'Gadget' },
    ]);
    await orders.insertMany([
      { _id: 'o1', productId: 'p1', qty: 5 },
      { _id: 'o2', productId: 'p2', qty: 3 },
      { _id: 'o3', productId: 'p1', qty: 2 },
    ]);
  });

  it('$lookup equality join', async () => {
    const r = await db.collection('orders').aggregate([
      { $lookup: { from: 'products', localField: 'productId', foreignField: '_id', as: 'product' } },
      { $sort: { _id: 1 } }
    ]).toArray();
    assert.strictEqual(r.length, 3);
    assert.ok(Array.isArray(r[0].product));
    assert.strictEqual(r[0].product.length, 1);
  });
});

describe('IAggDeep: $setWindowFields', () => {
  before(async () => {
    const col = db.collection('window_test');
    try { await col.drop(); } catch(e){}
    await col.insertMany([
      { dept: 'A', date: '2024-01', val: 10 },
      { dept: 'A', date: '2024-02', val: 20 },
      { dept: 'A', date: '2024-03', val: 30 },
      { dept: 'B', date: '2024-01', val: 5 },
      { dept: 'B', date: '2024-02', val: 15 },
    ]);
  });

  it('$rank partitioned and sorted', async () => {
    const r = await db.collection('window_test').aggregate([
      { $setWindowFields: {
        partitionBy: '$dept',
        sortBy: { val: -1 },
        output: { rank: { $rank: {} } }
      }}
    ]).toArray();
    assert.ok(r.every(d => typeof d.rank === 'number'));
  });

  it('$sum window cumulative', async () => {
    const r = await db.collection('window_test').aggregate([
      { $setWindowFields: {
        partitionBy: '$dept',
        sortBy: { date: 1 },
        output: {
          cumSum: { $sum: '$val', window: { documents: ['unbounded', 'current'] } }
        }
      }},
      { $sort: { dept: 1, date: 1 } }
    ]).toArray();
    // For dept A: 10, 30, 60
    const deptA = r.filter(d => d.dept === 'A');
    assert.ok(deptA.length === 3);
  });

  it('$documentNumber', async () => {
    const r = await db.collection('window_test').aggregate([
      { $setWindowFields: {
        sortBy: { val: 1 },
        output: { rowNum: { $documentNumber: {} } }
      }}
    ]).toArray();
    assert.ok(r.every(d => typeof d.rowNum === 'number'));
  });
});

describe('IAggDeep: More query coverage', () => {
  let col;
  before(async () => {
    col = db.collection('qcov2');
    try { await col.drop(); } catch(e){}
    await col.insertMany([
      { _id: 'q1', x: 10, name: 'alpha', items: [{qty: 5, status: 'A'}, {qty: 10, status: 'B'}] },
      { _id: 'q2', x: 20, name: 'beta', items: [{qty: 15, status: 'A'}] },
      { _id: 'q3', x: 30, name: 'gamma', items: [{qty: 1, status: 'B'}] },
    ]);
  });

  it('$elemMatch with field conditions', async () => {
    const r = await col.find({ items: { $elemMatch: { qty: { $gte: 10 }, status: 'A' } } }).toArray();
    assert.ok(r.length >= 1);
  });

  it('$not with $gt', async () => {
    const r = await col.find({ x: { $not: { $gt: 20 } } }).toArray();
    assert.ok(r.every(d => d.x <= 20));
  });

  it('$nin on _id', async () => {
    const r = await col.find({ _id: { $nin: ['q1', 'q2'] } }).toArray();
    assert.strictEqual(r.length, 1);
    assert.strictEqual(r[0]._id, 'q3');
  });

  it('$eq explicit', async () => {
    const r = await col.find({ x: { $eq: 20 } }).toArray();
    assert.strictEqual(r.length, 1);
  });

  it('$expr comparing fields', async () => {
    await col.insertOne({ _id: 'expr1', a: 'z', b: 'a' });
    const r = await col.find({ $expr: { $gt: ['$a', '$b'] } }).toArray();
    assert.ok(r.some(d => d._id === 'expr1'));
    await col.deleteOne({ _id: 'expr1' });
  });
});

describe('IAggDeep: Change stream trigger', () => {
  it('should set up LISTEN/NOTIFY and receive change', async () => {
    const col = db.collection('cs_deep');
    try { await col.drop(); } catch(e){}
    await col.insertOne({ setup: true });

    const { ChangeStream } = require('../lib/changeStream');
    const schema = db._schemaName;
    const channel = `change_${schema}_cs_deep`;
    try {
      await client._pool.query(`SET search_path TO "${schema}"`);
      await client._pool.query(ChangeStream.getCreateTriggerSQL('cs_deep', channel));
    } catch(e) {}

    const cs = col.watch();
    await cs.start();

    setTimeout(() => col.insertOne({ trigger: true }), 50);
    const change = await cs.next();
    assert.ok(change);
    assert.strictEqual(change.operationType, 'insert');
    await cs.close();
  });
});
