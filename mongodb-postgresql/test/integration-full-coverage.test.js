'use strict';

const { describe, it, before, after, beforeEach } = require('node:test');
const assert = require('node:assert');
const {
  MongoClient, ObjectId, GridFSBucket, Long, Double, Int32, UUID,
  Decimal128, Binary, Timestamp, DBRef, Code, BSONRegExp, MinKey, MaxKey,
  ReadPreference, WriteConcern, ReadConcern,
  MongoServerError, ChangeStream
} = require('../index');

const PG_URL = process.env.PG_URL || 'postgresql://testuser:testpass@localhost:5433/testdb';
let client, db;

before(async () => {
  client = await MongoClient.connect(PG_URL);
  db = client.db('fc_test');
  try { await client._pool.query('CREATE SCHEMA IF NOT EXISTS "fc_test"'); } catch (e) {}
});
after(async () => {
  if (db) try { await db.dropDatabase(); } catch (e) {}
  if (client) await client.close();
});

// ===================================================================
// QueryTranslator - every uncovered path
// ===================================================================
describe('FC: Query Coverage', () => {
  let col;
  before(async () => {
    col = db.collection('qfc');
    try { await col.drop(); } catch(e){}
    await col.insertMany([
      { _id: 'q1', x: 10, s: 'hello world', arr: [1,2,3], tags: ['a','b'], n: { a: 1, b: 2 }, flags: 6 },
      { _id: 'q2', x: 20, s: 'foo bar baz', arr: [4,5], tags: ['b','c'], n: { a: 3 }, flags: 3 },
      { _id: 'q3', x: 30, s: 'HELLO', arr: [1,5,9], tags: ['a'], n: { a: 5, b: 6 } },
      { _id: 'q4', x: 40, s: null, arr: [], tags: [] },
      { _id: 'q5', x: 50, s: 'test 123', arr: [10,20,30], tags: ['d'] },
    ]);
  });

  // _translateIdOperators paths
  it('_id $eq', async () => {
    const r = await col.find({ _id: { $eq: 'q1' } }).toArray();
    assert.strictEqual(r.length, 1);
  });
  it('_id $gt/$lt', async () => {
    const r = await col.find({ _id: { $gte: 'q2', $lte: 'q4' } }).toArray();
    assert.ok(r.length >= 2);
  });
  it('_id $ne', async () => {
    const r = await col.find({ _id: { $ne: 'q1' } }).toArray();
    assert.ok(r.every(d => d._id !== 'q1'));
  });
  it('_id $in/$nin', async () => {
    assert.strictEqual((await col.find({ _id: { $in: ['q1','q3'] } }).toArray()).length, 2);
    assert.strictEqual((await col.find({ _id: { $nin: ['q1','q2','q3','q4'] } }).toArray()).length, 1);
  });
  it('_id $exists', async () => {
    assert.strictEqual((await col.find({ _id: { $exists: true } }).toArray()).length, 5);
  });

  // $in/$nin on regular fields
  it('$in on field', async () => {
    const r = await col.find({ x: { $in: [10, 30] } }).toArray();
    assert.strictEqual(r.length, 2);
  });
  it('$nin on field', async () => {
    const r = await col.find({ x: { $nin: [10, 20] } }).toArray();
    assert.strictEqual(r.length, 3);
  });

  // $exists on nested
  it('$exists nested true', async () => {
    const r = await col.find({ 'n.b': { $exists: true } }).toArray();
    assert.ok(r.length >= 1); // q1 and q3 have n.b
  });
  it('$exists nested false', async () => {
    const r = await col.find({ 'n.b': { $exists: false } }).toArray();
    assert.ok(r.length >= 1); // q2, q4, q5 don't have n.b
  });

  // $type multiple
  it('$type array of types', async () => {
    const r = await col.find({ s: { $type: ['string', 'null'] } }).toArray();
    assert.strictEqual(r.length, 5);
  });
  it('$type single', async () => {
    assert.strictEqual((await col.find({ x: { $type: 'number' } }).toArray()).length, 5);
  });

  // $elemMatch with field conditions (nested in array of objects)
  it('$elemMatch with operators', async () => {
    const r = await col.find({ arr: { $elemMatch: { $gte: 5, $lte: 20 } } }).toArray();
    assert.ok(r.length >= 2);
  });

  // $all
  it('$all with values', async () => {
    const r = await col.find({ tags: { $all: ['a', 'b'] } }).toArray();
    assert.strictEqual(r.length, 1); // q1
  });

  // $size
  it('$size 0', async () => {
    const r = await col.find({ arr: { $size: 0 } }).toArray();
    assert.strictEqual(r.length, 1); // q4
  });

  // $mod
  it('$mod', async () => {
    const r = await col.find({ x: { $mod: [15, 0] } }).toArray();
    assert.ok(r.every(d => d.x % 15 === 0));
  });

  // RegExp
  it('native RegExp case insensitive', async () => {
    const r = await col.find({ s: /^hello/i }).toArray();
    assert.strictEqual(r.length, 2);
  });
  it('$regex with $options', async () => {
    const r = await col.find({ s: { $regex: 'bar', $options: '' } }).toArray();
    assert.strictEqual(r.length, 1);
  });

  // null comparisons
  it('field: null', async () => {
    const r = await col.find({ s: null }).toArray();
    assert.ok(r.length >= 1);
  });
  it('$ne null', async () => {
    const r = await col.find({ s: { $ne: null } }).toArray();
    assert.ok(r.length >= 3);
  });

  // Object/Array equality
  it('array equality', async () => {
    const r = await col.find({ arr: [1,2,3] }).toArray();
    assert.strictEqual(r.length, 1);
  });

  // $not on field
  it('$not with operator', async () => {
    const r = await col.find({ x: { $not: { $gte: 30 } } }).toArray();
    assert.ok(r.every(d => d.x < 30));
  });

  // $expr
  it('$expr $eq', async () => {
    await col.insertOne({ _id: 'qe', a: 'same', b: 'same' });
    const r = await col.find({ $expr: { $eq: ['$a', '$b'] } }).toArray();
    assert.ok(r.some(d => d._id === 'qe'));
    await col.deleteOne({ _id: 'qe' });
  });

  // Projection with inclusion/exclusion
  it('projection inclusion', async () => {
    const r = await col.find({ _id: 'q1' }).project({ s: 1, x: 1, _id: 0 }).toArray();
    assert.strictEqual(r[0].s, 'hello world');
    assert.strictEqual(r[0]._id, undefined);
    assert.strictEqual(r[0].arr, undefined);
  });
  it('projection exclusion', async () => {
    const r = await col.find({ _id: 'q1' }).project({ arr: 0, tags: 0, n: 0, flags: 0 }).toArray();
    assert.ok(r[0].s);
    assert.strictEqual(r[0].arr, undefined);
  });

  // countDocuments with skip/limit
  it('countDocuments with limit', async () => {
    const c = await col.countDocuments({}, { limit: 3 });
    assert.strictEqual(c, 3);
  });
  it('countDocuments with skip and limit', async () => {
    const c = await col.countDocuments({}, { skip: 1, limit: 3 });
    assert.strictEqual(c, 3);
  });

  // Date comparison
  it('Date field $gt/$lt', async () => {
    await col.insertOne({ _id: 'qd', ts: new Date('2024-06-15') });
    const r = await col.find({ ts: { $gt: new Date('2024-01-01') } }).toArray();
    assert.ok(r.length >= 1);
    await col.deleteOne({ _id: 'qd' });
  });
});

// ===================================================================
// AggregateTranslator - every uncovered expression
// ===================================================================
describe('FC: Aggregate Expressions', () => {
  let col;
  before(async () => {
    col = db.collection('afc');
    try { await col.drop(); } catch(e){}
    await col.insertMany([
      { _id: 'a1', v: 4, s: 'Hello World', a: [3,1,2], o: { x: 1, y: 2 }, d: new Date('2024-06-15') },
      { _id: 'a2', v: 9, s: 'foo', a: [5,4], o: { x: 3 }, d: new Date('2024-01-01') },
    ]);
  });

  // Trig functions
  it('$sin/$cos/$tan', async () => {
    await col.insertOne({ _id: 'trig', angle: 0 });
    const r = await col.aggregate([
      { $match: { _id: 'trig' } },
      { $addFields: { s: { $sin: '$angle' }, c: { $cos: '$angle' }, t: { $tan: '$angle' } } }
    ]).toArray();
    assert.strictEqual(r[0].s, 0);
    assert.strictEqual(r[0].c, 1);
    assert.strictEqual(r[0].t, 0);
    await col.deleteOne({ _id: 'trig' });
  });

  it('$asin/$acos/$atan', async () => {
    await col.insertOne({ _id: 'atrig', v: 0 });
    const r = await col.aggregate([
      { $match: { _id: 'atrig' } },
      { $addFields: { as: { $asin: '$v' }, ac: { $acos: '$v' }, at: { $atan: '$v' } } }
    ]).toArray();
    assert.strictEqual(r[0].as, 0);
    assert.ok(Math.abs(r[0].ac - Math.PI/2) < 0.01);
    assert.strictEqual(r[0].at, 0);
    await col.deleteOne({ _id: 'atrig' });
  });

  it('$atan2', async () => {
    await col.insertOne({ _id: 'at2', y: 1, x: 1 });
    const r = await col.aggregate([
      { $match: { _id: 'at2' } },
      { $addFields: { a: { $atan2: ['$y', '$x'] } } }
    ]).toArray();
    assert.ok(Math.abs(r[0].a - Math.PI/4) < 0.01);
    await col.deleteOne({ _id: 'at2' });
  });

  it('$sinh/$cosh/$tanh', async () => {
    await col.insertOne({ _id: 'htrig', v: 0 });
    const r = await col.aggregate([
      { $match: { _id: 'htrig' } },
      { $addFields: { sh: { $sinh: '$v' }, ch: { $cosh: '$v' }, th: { $tanh: '$v' } } }
    ]).toArray();
    assert.strictEqual(r[0].sh, 0);
    assert.strictEqual(r[0].ch, 1);
    assert.strictEqual(r[0].th, 0);
    await col.deleteOne({ _id: 'htrig' });
  });

  it('$degreesToRadians/$radiansToDegrees', async () => {
    await col.insertOne({ _id: 'conv', deg: 180, rad: Math.PI });
    const r = await col.aggregate([
      { $match: { _id: 'conv' } },
      { $addFields: { r: { $degreesToRadians: '$deg' }, d: { $radiansToDegrees: '$rad' } } }
    ]).toArray();
    assert.ok(Math.abs(r[0].r - Math.PI) < 0.001);
    assert.ok(Math.abs(r[0].d - 180) < 0.001);
    await col.deleteOne({ _id: 'conv' });
  });

  // Math
  it('$ln/$log10/$exp', async () => {
    await col.insertOne({ _id: 'log', v: 100 });
    const r = await col.aggregate([
      { $match: { _id: 'log' } },
      { $addFields: { ln: { $ln: '$v' }, l10: { $log10: '$v' }, e: { $exp: 0 } } }
    ]).toArray();
    assert.ok(Math.abs(r[0].ln - Math.log(100)) < 0.01);
    assert.ok(Math.abs(r[0].l10 - 2) < 0.01);
    assert.ok(Math.abs(r[0].e - 1) < 0.01);
    await col.deleteOne({ _id: 'log' });
  });

  // String
  it('$ltrim/$rtrim', async () => {
    await col.insertOne({ _id: 'trims', s: '  hello  ' });
    const r = await col.aggregate([
      { $match: { _id: 'trims' } },
      { $addFields: { l: { $ltrim: { input: '$s' } }, r: { $rtrim: { input: '$s' } } } }
    ]).toArray();
    assert.strictEqual(r[0].l, 'hello  ');
    assert.strictEqual(r[0].r, '  hello');
    await col.deleteOne({ _id: 'trims' });
  });

  it('$replaceAll', async () => {
    const r = await col.aggregate([
      { $match: { _id: 'a1' } },
      { $addFields: { r: { $replaceAll: { input: '$s', find: 'l', replacement: 'L' } } } }
    ]).toArray();
    assert.strictEqual(r[0].r, 'HeLLo WorLd');
  });

  it('$strcasecmp', async () => {
    const r = await col.aggregate([
      { $match: { _id: 'a1' } },
      { $addFields: { c: { $strcasecmp: ['$s', 'hello world'] } } }
    ]).toArray();
    assert.strictEqual(r[0].c, 0);
  });

  it('$indexOfBytes', async () => {
    const r = await col.aggregate([
      { $match: { _id: 'a1' } },
      { $addFields: { idx: { $indexOfBytes: ['$s', 'World'] } } }
    ]).toArray();
    assert.ok(r[0].idx >= 0);
  });

  // Array ops
  it('$reverseArray', async () => {
    const r = await col.aggregate([{ $match: { _id: 'a1' } }, { $addFields: { rev: { $reverseArray: '$a' } } }]).toArray();
    assert.deepStrictEqual(r[0].rev, [2,1,3]);
  });

  it('$slice', async () => {
    const r = await col.aggregate([{ $match: { _id: 'a1' } }, { $addFields: { s2: { $slice: ['$a', 2] } } }]).toArray();
    assert.strictEqual(r[0].s2.length, 2);
  });

  it('$in (array contains)', async () => {
    const r = await col.aggregate([{ $match: { _id: 'a1' } }, { $addFields: { has3: { $in: [3, '$a'] } } }]).toArray();
    assert.strictEqual(r[0].has3, true);
  });

  it('$isArray', async () => {
    const r = await col.aggregate([{ $match: { _id: 'a1' } }, { $addFields: { yes: { $isArray: '$a' }, no: { $isArray: '$v' } } }]).toArray();
    assert.strictEqual(r[0].yes, true);
    assert.strictEqual(r[0].no, false);
  });

  it('$first/$last', async () => {
    const r = await col.aggregate([{ $match: { _id: 'a1' } }, { $addFields: { f: { $first: '$a' }, l: { $last: '$a' } } }]).toArray();
    assert.strictEqual(r[0].f, 3);
    assert.strictEqual(r[0].l, 2);
  });

  it('$arrayElemAt negative', async () => {
    const r = await col.aggregate([{ $match: { _id: 'a1' } }, { $addFields: { el: { $arrayElemAt: ['$a', -1] } } }]).toArray();
    assert.strictEqual(r[0].el, 2);
  });

  // Object
  it('$objectToArray', async () => {
    const r = await col.aggregate([{ $match: { _id: 'a1' } }, { $addFields: { kv: { $objectToArray: '$o' } } }]).toArray();
    assert.ok(Array.isArray(r[0].kv));
    assert.ok(r[0].kv[0].k);
  });

  it('$mergeObjects', async () => {
    await col.insertOne({ _id: 'mo', a: { x: 1 }, b: { y: 2 } });
    const r = await col.aggregate([{ $match: { _id: 'mo' } }, { $addFields: { m: { $mergeObjects: ['$a', '$b'] } } }]).toArray();
    assert.ok(r[0].m);
    await col.deleteOne({ _id: 'mo' });
  });

  // Type conversion
  it('$toBool', async () => {
    await col.insertOne({ _id: 'tb', s: 'true' });
    const r = await col.aggregate([{ $match: { _id: 'tb' } }, { $addFields: { b: { $toBool: '$s' } } }]).toArray();
    assert.strictEqual(r[0].b, true);
    await col.deleteOne({ _id: 'tb' });
  });

  it('$toDecimal', async () => {
    const r = await col.aggregate([{ $match: { _id: 'a1' } }, { $addFields: { d: { $toDecimal: '$v' } } }]).toArray();
    assert.strictEqual(r[0].d, 4);
  });

  it('$convert', async () => {
    const r = await col.aggregate([{ $match: { _id: 'a1' } }, { $addFields: { c: { $convert: { input: '$v' } } } }]).toArray();
    assert.ok(r[0].c !== undefined);
  });

  // Conditional
  it('$switch', async () => {
    const r = await col.aggregate([{ $addFields: { tier: { $switch: {
      branches: [{ case: { $gte: ['$v', 9] }, then: 'high' }],
      default: 'low'
    }}}}]).toArray();
    assert.ok(r.every(d => d.tier === 'high' || d.tier === 'low'));
  });

  // Date
  it('$year/$month/$dayOfMonth/$hour', async () => {
    const r = await col.aggregate([{ $match: { _id: 'a1' } }, { $addFields: {
      yr: { $year: '$d' }, mo: { $month: '$d' }, dy: { $dayOfMonth: '$d' }, hr: { $hour: '$d' }
    }}]).toArray();
    assert.strictEqual(r[0].yr, 2024);
    assert.strictEqual(r[0].mo, 6);
    assert.strictEqual(r[0].dy, 15);
  });

  it('$dayOfWeek/$dayOfYear/$week', async () => {
    const r = await col.aggregate([{ $match: { _id: 'a1' } }, { $addFields: {
      dow: { $dayOfWeek: '$d' }, doy: { $dayOfYear: '$d' }, wk: { $week: '$d' }
    }}]).toArray();
    assert.ok(typeof r[0].dow === 'number');
    assert.ok(typeof r[0].doy === 'number');
  });

  it('$dateToString', async () => {
    const r = await col.aggregate([{ $match: { _id: 'a1' } }, { $addFields: {
      ds: { $dateToString: { date: '$d', format: '%Y-%m-%d' } }
    }}]).toArray();
    assert.ok(r[0].ds.includes('2024'));
  });

  // $setField/$getField/$unsetField
  it('$getField/$setField', async () => {
    const r = await col.aggregate([{ $match: { _id: 'a1' } }, { $addFields: {
      got: { $getField: 'v' },
      withNew: { $setField: { field: 'z', input: '$o', value: 99 } }
    }}]).toArray();
    assert.ok(r[0].got !== undefined);
    assert.ok(r[0].withNew);
  });

  // $isNumber
  it('$isNumber', async () => {
    const r = await col.aggregate([{ $match: { _id: 'a1' } }, { $addFields: {
      numY: { $isNumber: '$v' }, numN: { $isNumber: '$s' }
    }}]).toArray();
    assert.strictEqual(r[0].numY, true);
    assert.strictEqual(r[0].numN, false);
  });

  // $literal
  it('$literal', async () => {
    const r = await col.aggregate([{ $match: { _id: 'a1' } }, { $addFields: { lit: { $literal: { $special: true } } } }]).toArray();
    assert.ok(r[0].lit.$special);
  });

  // $sampleRate
  it('$sampleRate', async () => {
    const r = await col.aggregate([{ $match: { _id: 'a1' } }, { $addFields: { sr: { $sampleRate: 1.0 } } }]).toArray();
    assert.strictEqual(r[0].sr, true);
  });

  // $sortArray
  it('$sortArray', async () => {
    const r = await col.aggregate([{ $match: { _id: 'a1' } }, { $addFields: { sorted: { $sortArray: { input: '$a', sortBy: 1 } } } }]).toArray();
    assert.deepStrictEqual(r[0].sorted, [1, 2, 3]);
  });

  // $range
  it('$range', async () => {
    const r = await col.aggregate([{ $match: { _id: 'a1' } }, { $addFields: { seq: { $range: [0, 5] } } }]).toArray();
    assert.deepStrictEqual(r[0].seq, [0,1,2,3,4]);
  });

  // $setUnion/$setIntersection/$setDifference
  it('$setUnion', async () => {
    await col.insertOne({ _id: 'su', a: [1,2], b: [2,3] });
    const r = await col.aggregate([{ $match: { _id: 'su' } }, { $addFields: { u: { $setUnion: ['$a', '$b'] } } }]).toArray();
    assert.strictEqual(r[0].u.length, 3);
    await col.deleteOne({ _id: 'su' });
  });

  it('$setIntersection', async () => {
    await col.insertOne({ _id: 'si', a: [1,2,3], b: [2,3,4] });
    const r = await col.aggregate([{ $match: { _id: 'si' } }, { $addFields: { i: { $setIntersection: ['$a', '$b'] } } }]).toArray();
    assert.strictEqual(r[0].i.length, 2);
    await col.deleteOne({ _id: 'si' });
  });

  it('$setDifference', async () => {
    await col.insertOne({ _id: 'sd', a: [1,2,3], b: [2] });
    const r = await col.aggregate([{ $match: { _id: 'sd' } }, { $addFields: { d: { $setDifference: ['$a', '$b'] } } }]).toArray();
    assert.strictEqual(r[0].d.length, 2);
    await col.deleteOne({ _id: 'sd' });
  });
});

// ===================================================================
// More aggregate stages
// ===================================================================
describe('FC: Aggregate Stages', () => {
  let col;
  before(async () => {
    col = db.collection('stg');
    try { await col.drop(); } catch(e){}
    await col.insertMany([
      { cat: 'A', val: 10, tags: ['x','y'] },
      { cat: 'A', val: 20, tags: ['y'] },
      { cat: 'B', val: 30, tags: ['x','z'] },
    ]);
  });

  it('$unwind with preserveNullAndEmptyArrays', async () => {
    await col.insertOne({ _id: 'emp', cat: 'C', val: 0, tags: [] });
    const r = await col.aggregate([
      { $unwind: { path: '$tags', preserveNullAndEmptyArrays: true } }
    ]).toArray();
    assert.ok(r.some(d => d._id === 'emp'));
    await col.deleteOne({ _id: 'emp' });
  });

  it('$replaceRoot', async () => {
    await col.insertOne({ _id: 'rr', profile: { name: 'test', age: 25 } });
    const r = await col.aggregate([
      { $match: { _id: 'rr' } },
      { $replaceRoot: { newRoot: '$profile' } }
    ]).toArray();
    assert.strictEqual(r[0].name, 'test');
    await col.deleteOne({ _id: 'rr' });
  });

  it('$bucket', async () => {
    const r = await col.aggregate([
      { $bucket: { groupBy: '$val', boundaries: [0, 15, 25, 35], default: 'Other' } }
    ]).toArray();
    assert.ok(r.length >= 2);
  });

  it('$unionWith', async () => {
    const col2 = db.collection('stg2');
    try { await col2.drop(); } catch(e){}
    await col2.insertMany([{ cat: 'D', val: 100 }]);
    const r = await col.aggregate([{ $unionWith: 'stg2' }]).toArray();
    assert.ok(r.length >= 4);
  });

  it('$lookup equality', async () => {
    const items = db.collection('items');
    try { await items.drop(); } catch(e){}
    await items.insertMany([
      { _id: 'i1', name: 'Widget', cat: 'A' },
      { _id: 'i2', name: 'Gadget', cat: 'B' },
    ]);
    const r = await col.aggregate([
      { $lookup: { from: 'items', localField: 'cat', foreignField: 'cat', as: 'products' } },
      { $limit: 2 }
    ]).toArray();
    assert.ok(r[0].products);
  });

  it('$facet', async () => {
    const r = await col.aggregate([
      { $facet: {
        byCat: [{ $group: { _id: '$cat', n: { $sum: 1 } } }],
        total: [{ $count: 'n' }]
      }}
    ]).toArray();
    assert.strictEqual(r.length, 1);
    assert.ok(Array.isArray(r[0].byCat));
    assert.ok(Array.isArray(r[0].total));
  });

  it('$setWindowFields with $rank and $denseRank', async () => {
    const r = await col.aggregate([
      { $setWindowFields: {
        partitionBy: '$cat',
        sortBy: { val: -1 },
        output: { r: { $rank: {} }, dr: { $denseRank: {} } }
      }}
    ]).toArray();
    assert.ok(r.every(d => typeof d.r === 'number' && typeof d.dr === 'number'));
  });

  it('$setWindowFields with $documentNumber', async () => {
    const r = await col.aggregate([
      { $setWindowFields: {
        sortBy: { val: 1 },
        output: { rn: { $documentNumber: {} } }
      }}
    ]).toArray();
    assert.ok(r.every(d => typeof d.rn === 'number'));
  });
});

// ===================================================================
// Collection: upsert, findOneAndUpdate, projection, session paths
// ===================================================================
describe('FC: Collection Paths', () => {
  let col;
  beforeEach(async () => { col = db.collection('colp'); try { await col.drop(); } catch(e){} });

  it('findOneAndUpdate with upsert', async () => {
    const r = await col.findOneAndUpdate(
      { _id: 'ups' },
      { $set: { v: 1 } },
      { upsert: true, returnDocument: 'after' }
    );
    assert.ok(r.upsertedId || r.value);
  });

  it('findOneAndReplace', async () => {
    await col.insertOne({ _id: 'fr', old: true });
    const r = await col.findOneAndReplace(
      { _id: 'fr' },
      { replaced: true },
      { returnDocument: 'after' }
    );
    assert.ok(r.value);
  });

  it('updateMany with filter', async () => {
    await col.insertMany([{ s: 'a', v: 1 }, { s: 'a', v: 2 }, { s: 'b', v: 3 }]);
    const r = await col.updateMany({ s: 'a' }, { $set: { s: 'updated' } });
    assert.strictEqual(r.modifiedCount, 2);
  });

  it('replaceOne with upsert', async () => {
    const r = await col.replaceOne({ _id: 'ru' }, { name: 'new' }, { upsert: true });
    assert.ok(r.upsertedId || r.upsertedCount === 1);
  });

  it('distinct on _id', async () => {
    await col.insertMany([{ v: 1 }, { v: 2 }]);
    const r = await col.distinct('_id');
    assert.strictEqual(r.length, 2);
  });

  it('TTL index setup', async () => {
    await col.insertOne({ ts: new Date() });
    await col.createIndex({ ts: 1 }, { expireAfterSeconds: 3600 });
    // Just verify it doesn't throw
  });

  it('text index', async () => {
    await col.insertOne({ text: 'searchable content here' });
    await col.createIndex({ text: 'text' });
    // Verify index was created
    const indexes = await col.indexes();
    assert.ok(indexes.length >= 2);
  });
});

// ===================================================================
// ChangeStream with pipeline filtering
// ===================================================================
describe('FC: ChangeStream Pipeline', () => {
  it('should filter by operationType', async () => {
    const col = db.collection('cs_filter');
    try { await col.drop(); } catch(e){}
    await col.insertOne({ setup: true });

    const schema = db._schemaName;
    const channel = `change_${schema}_cs_filter`;
    try {
      await client._pool.query(`SET search_path TO "${schema}"`);
      await client._pool.query(ChangeStream.getCreateTriggerSQL('cs_filter', channel));
    } catch(e) {}

    const cs = col.watch([{ $match: { operationType: 'insert' } }]);
    await cs.start();

    // Insert should match
    setTimeout(() => col.insertOne({ test: true }), 50);
    const change = await cs.next();
    assert.strictEqual(change.operationType, 'insert');
    await cs.close();
  });
});

// ===================================================================
// Client URI parsing and options
// ===================================================================
describe('FC: Client URI Parsing', () => {
  it('should parse mongodb:// URI', () => {
    const c = new MongoClient('mongodb://user:pass@host:27017/mydb?retryWrites=true&w=majority');
    const config = c._parseConnectionString(c._uri, {});
    assert.ok(config.connectionString.startsWith('postgresql://'));
    assert.ok(!config.connectionString.includes('retryWrites'));
  });

  it('should handle SSL options', () => {
    const c = new MongoClient('postgresql://localhost/test');
    const config = c._parseConnectionString(c._uri, { ssl: true });
    assert.ok(config.ssl);
  });

  it('should handle auth options', () => {
    const c = new MongoClient('postgresql://localhost/test');
    const config = c._parseConnectionString(c._uri, { auth: { username: 'u', password: 'p' } });
    assert.strictEqual(config.user, 'u');
    assert.strictEqual(config.password, 'p');
  });

  it('should handle connectTimeoutMS', () => {
    const c = new MongoClient('postgresql://localhost/test');
    const config = c._parseConnectionString(c._uri, { connectTimeoutMS: 10000 });
    assert.strictEqual(config.connectionTimeoutMillis, 10000);
  });
});
