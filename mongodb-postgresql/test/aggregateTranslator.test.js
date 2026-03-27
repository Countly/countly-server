'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert');
const { AggregateTranslator } = require('../lib/aggregateTranslator');

describe('AggregateTranslator', () => {
  describe('constructor', () => {
    it('should store collection and schema name', () => {
      const at = new AggregateTranslator('users', 'mydb');
      assert.strictEqual(at.collectionName, 'users');
      assert.strictEqual(at.schemaName, 'mydb');
    });

    it('tableName should return quoted schema.collection', () => {
      const at = new AggregateTranslator('users', 'mydb');
      assert.strictEqual(at.tableName(), '"mydb"."users"');
    });

    it('tableName should return just quoted collection when no schema', () => {
      const at = new AggregateTranslator('users', null);
      assert.strictEqual(at.tableName(), '"users"');
    });
  });

  describe('empty pipeline', () => {
    it('should return simple SELECT', () => {
      const at = new AggregateTranslator('users', 'mydb');
      const result = at.translate([]);
      assert.ok(result.sql.includes('SELECT _id, data'));
      assert.ok(result.sql.includes('"mydb"."users"'));
      assert.deepStrictEqual(result.params, []);
    });

    it('should handle null pipeline', () => {
      const at = new AggregateTranslator('users', null);
      const result = at.translate(null);
      assert.ok(result.sql.includes('SELECT _id, data'));
    });
  });

  describe('$match', () => {
    it('should generate WHERE clause in CTE', () => {
      const at = new AggregateTranslator('users', null);
      const result = at.translate([
        { $match: { status: 'active' } }
      ]);
      assert.ok(result.sql.includes('WITH'));
      assert.ok(result.sql.includes('WHERE'));
    });

    it('should handle multiple $match stages', () => {
      const at = new AggregateTranslator('users', null);
      const result = at.translate([
        { $match: { status: 'active' } },
        { $match: { age: { $gt: 18 } } }
      ]);
      assert.ok(result.sql.includes('stage_1'));
      assert.ok(result.sql.includes('stage_2'));
    });
  });

  describe('$sort', () => {
    it('should generate ORDER BY', () => {
      const at = new AggregateTranslator('users', null);
      const result = at.translate([
        { $sort: { name: 1 } }
      ]);
      assert.ok(result.sql.includes('ORDER BY'));
      assert.ok(result.sql.includes('ASC'));
    });

    it('should handle descending sort', () => {
      const at = new AggregateTranslator('users', null);
      const result = at.translate([
        { $sort: { createdAt: -1 } }
      ]);
      assert.ok(result.sql.includes('DESC'));
    });

    it('should handle _id sort', () => {
      const at = new AggregateTranslator('users', null);
      const result = at.translate([
        { $sort: { _id: 1 } }
      ]);
      assert.ok(result.sql.includes('_id'));
      assert.ok(result.sql.includes('ASC'));
    });
  });

  describe('$limit', () => {
    it('should generate LIMIT clause', () => {
      const at = new AggregateTranslator('users', null);
      const result = at.translate([
        { $limit: 10 }
      ]);
      assert.ok(result.sql.includes('LIMIT'));
      assert.ok(result.params.includes(10));
    });
  });

  describe('$skip', () => {
    it('should generate OFFSET clause', () => {
      const at = new AggregateTranslator('users', null);
      const result = at.translate([
        { $skip: 20 }
      ]);
      assert.ok(result.sql.includes('OFFSET'));
      assert.ok(result.params.includes(20));
    });
  });

  describe('$count', () => {
    it('should generate COUNT(*) with field name', () => {
      const at = new AggregateTranslator('users', null);
      const result = at.translate([
        { $count: 'totalUsers' }
      ]);
      assert.ok(result.sql.includes('COUNT(*)'));
      assert.ok(result.params.includes('totalUsers'));
    });
  });

  describe('$sample', () => {
    it('should generate ORDER BY RANDOM() LIMIT', () => {
      const at = new AggregateTranslator('users', null);
      const result = at.translate([
        { $sample: { size: 5 } }
      ]);
      assert.ok(result.sql.includes('RANDOM()'));
      assert.ok(result.sql.includes('LIMIT'));
      assert.ok(result.params.includes(5));
    });
  });

  describe('$group', () => {
    it('should handle null _id (aggregate all)', () => {
      const at = new AggregateTranslator('orders', null);
      const result = at.translate([
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ]);
      assert.ok(result.sql.includes('SUM'));
      assert.ok(!result.sql.includes('GROUP BY'));
    });

    it('should group by field reference', () => {
      const at = new AggregateTranslator('orders', null);
      const result = at.translate([
        { $group: { _id: '$status', count: { $sum: 1 } } }
      ]);
      assert.ok(result.sql.includes('GROUP BY'));
      assert.ok(result.sql.includes('COUNT(*)'));
    });

    it('should handle compound group key', () => {
      const at = new AggregateTranslator('orders', null);
      const result = at.translate([
        { $group: { _id: { status: '$status', city: '$city' }, count: { $sum: 1 } } }
      ]);
      assert.ok(result.sql.includes('GROUP BY'));
      assert.ok(result.sql.includes('jsonb_build_object'));
    });

    it('should handle $avg accumulator', () => {
      const at = new AggregateTranslator('orders', null);
      const result = at.translate([
        { $group: { _id: '$category', avgPrice: { $avg: '$price' } } }
      ]);
      assert.ok(result.sql.includes('AVG'));
    });

    it('should handle $min and $max accumulators', () => {
      const at = new AggregateTranslator('orders', null);
      const result = at.translate([
        { $group: { _id: null, minPrice: { $min: '$price' }, maxPrice: { $max: '$price' } } }
      ]);
      assert.ok(result.sql.includes('MIN'));
      assert.ok(result.sql.includes('MAX'));
    });

    it('should handle $first and $last accumulators', () => {
      const at = new AggregateTranslator('orders', null);
      const result = at.translate([
        { $group: { _id: '$status', firstDoc: { $first: '$name' }, lastDoc: { $last: '$name' } } }
      ]);
      assert.ok(result.sql.includes('array_agg'));
    });

    it('should handle $push accumulator', () => {
      const at = new AggregateTranslator('orders', null);
      const result = at.translate([
        { $group: { _id: '$status', names: { $push: '$name' } } }
      ]);
      assert.ok(result.sql.includes('jsonb_agg'));
    });

    it('should handle $addToSet accumulator', () => {
      const at = new AggregateTranslator('orders', null);
      const result = at.translate([
        { $group: { _id: '$category', tags: { $addToSet: '$tag' } } }
      ]);
      assert.ok(result.sql.includes('DISTINCT'));
    });

    it('should handle $count accumulator', () => {
      const at = new AggregateTranslator('orders', null);
      const result = at.translate([
        { $group: { _id: '$status', n: { $count: {} } } }
      ]);
      assert.ok(result.sql.includes('COUNT(*)'));
    });

    it('should handle $stdDevPop accumulator', () => {
      const at = new AggregateTranslator('data', null);
      const result = at.translate([
        { $group: { _id: null, sd: { $stdDevPop: '$value' } } }
      ]);
      assert.ok(result.sql.includes('stddev_pop'));
    });

    it('should handle $stdDevSamp accumulator', () => {
      const at = new AggregateTranslator('data', null);
      const result = at.translate([
        { $group: { _id: null, sd: { $stdDevSamp: '$value' } } }
      ]);
      assert.ok(result.sql.includes('stddev_samp'));
    });
  });

  describe('$unwind', () => {
    it('should generate CROSS JOIN LATERAL with jsonb_array_elements', () => {
      const at = new AggregateTranslator('orders', null);
      const result = at.translate([
        { $unwind: '$items' }
      ]);
      assert.ok(result.sql.includes('jsonb_array_elements'));
      assert.ok(result.sql.includes('CROSS JOIN LATERAL'));
    });

    it('should handle preserveNullAndEmptyArrays with LEFT JOIN', () => {
      const at = new AggregateTranslator('orders', null);
      const result = at.translate([
        { $unwind: { path: '$items', preserveNullAndEmptyArrays: true } }
      ]);
      assert.ok(result.sql.includes('LEFT JOIN LATERAL'));
    });

    it('should handle includeArrayIndex', () => {
      const at = new AggregateTranslator('orders', null);
      const result = at.translate([
        { $unwind: { path: '$tags', includeArrayIndex: 'tagIndex' } }
      ]);
      assert.ok(result.params.includes('tagIndex'));
    });
  });

  describe('$lookup', () => {
    it('should generate correlated subquery for equality lookup', () => {
      const at = new AggregateTranslator('orders', 'mydb');
      const result = at.translate([
        { $lookup: { from: 'products', localField: 'productId', foreignField: '_id', as: 'product' } }
      ]);
      assert.ok(result.sql.includes('"mydb"."products"'));
      assert.ok(result.sql.includes('jsonb_agg'));
    });

    it('should throw for pipeline lookup', () => {
      const at = new AggregateTranslator('orders', null);
      // Pipeline lookup should fall to postProcessStages
      const result = at.translate([
        { $lookup: { from: 'products', let: { pid: '$productId' }, pipeline: [], as: 'product' } }
      ]);
      assert.ok(result.postProcessStages && result.postProcessStages.length > 0);
    });
  });

  describe('$addFields / $set', () => {
    it('should add field from reference', () => {
      const at = new AggregateTranslator('users', null);
      const result = at.translate([
        { $addFields: { fullName: '$name' } }
      ]);
      assert.ok(result.sql.includes('jsonb_set'));
    });

    it('should add field with literal value', () => {
      const at = new AggregateTranslator('users', null);
      const result = at.translate([
        { $addFields: { version: 2 } }
      ]);
      assert.ok(result.sql.includes('jsonb_set'));
    });

    it('$set should work the same as $addFields', () => {
      const at = new AggregateTranslator('users', null);
      const result = at.translate([
        { $set: { status: 'active' } }
      ]);
      assert.ok(result.sql.includes('jsonb_set'));
    });
  });

  describe('$unset', () => {
    it('should remove a field', () => {
      const at = new AggregateTranslator('users', null);
      const result = at.translate([
        { $unset: 'password' }
      ]);
      assert.ok(result.sql.includes('-'));
    });

    it('should remove multiple fields', () => {
      const at = new AggregateTranslator('users', null);
      const result = at.translate([
        { $unset: ['password', 'secret'] }
      ]);
      assert.ok(result.params.includes('password'));
      assert.ok(result.params.includes('secret'));
    });

    it('should remove nested field', () => {
      const at = new AggregateTranslator('users', null);
      const result = at.translate([
        { $unset: 'address.zip' }
      ]);
      assert.ok(result.sql.includes('#-'));
    });
  });

  describe('$replaceRoot', () => {
    it('should replace root with field reference', () => {
      const at = new AggregateTranslator('users', null);
      const result = at.translate([
        { $replaceRoot: { newRoot: '$profile' } }
      ]);
      assert.ok(result.sql.includes("data->'profile'"));
    });
  });

  describe('$sortByCount', () => {
    it('should group and count by field, sorted DESC', () => {
      const at = new AggregateTranslator('events', null);
      const result = at.translate([
        { $sortByCount: '$type' }
      ]);
      assert.ok(result.sql.includes('GROUP BY'));
      assert.ok(result.sql.includes('COUNT(*)'));
      assert.ok(result.sql.includes('DESC'));
    });
  });

  describe('$bucket', () => {
    it('should generate CASE expression for bucket assignment', () => {
      const at = new AggregateTranslator('products', null);
      const result = at.translate([
        { $bucket: { groupBy: '$price', boundaries: [0, 50, 100, 200], default: 'Other' } }
      ]);
      assert.ok(result.sql.includes('CASE'));
      assert.ok(result.sql.includes('GROUP BY'));
    });
  });

  describe('$unionWith', () => {
    it('should generate UNION ALL', () => {
      const at = new AggregateTranslator('orders2023', null);
      const result = at.translate([
        { $unionWith: 'orders2022' }
      ]);
      assert.ok(result.sql.includes('UNION ALL'));
      assert.ok(result.sql.includes('"orders2022"'));
    });
  });

  describe('$graphLookup', () => {
    it('should generate recursive CTE', () => {
      const at = new AggregateTranslator('employees', 'mydb');
      const result = at.translate([
        {
          $graphLookup: {
            from: 'employees',
            startWith: '$managerId',
            connectFromField: 'managerId',
            connectToField: '_id',
            as: 'chain',
            maxDepth: 5
          }
        }
      ]);
      assert.ok(result.sql.includes('RECURSIVE'));
      assert.ok(result.sql.includes('UNION ALL'));
    });
  });

  describe('$project', () => {
    it('should handle simple inclusion (pass-through for post-processing)', () => {
      const at = new AggregateTranslator('users', null);
      const result = at.translate([
        { $project: { name: 1, age: 1 } }
      ]);
      // Simple inclusion/exclusion without expressions is passed through
      assert.ok(result.sql.includes('SELECT _id, data'));
    });

    it('should handle _id exclusion with expression', () => {
      const at = new AggregateTranslator('users', null);
      const result = at.translate([
        { $project: { _id: 0, displayName: '$name' } }
      ]);
      assert.ok(result.sql.includes('NULL AS _id'));
    });

    it('should handle field references', () => {
      const at = new AggregateTranslator('users', null);
      const result = at.translate([
        { $project: { displayName: '$name' } }
      ]);
      assert.ok(result.sql.includes("data->'name'"));
    });

    it('should handle expression operators', () => {
      const at = new AggregateTranslator('users', null);
      const result = at.translate([
        { $project: { upperName: { $toUpper: '$name' } } }
      ]);
      assert.ok(result.sql.includes('UPPER'));
    });
  });

  describe('aggregation expression operators', () => {
    // Test via $project or $addFields stages

    it('$add should generate +', () => {
      const at = new AggregateTranslator('t', null);
      const result = at.translate([
        { $addFields: { total: { $add: ['$a', '$b'] } } }
      ]);
      assert.ok(result.sql.includes('+'));
    });

    it('$subtract should generate -', () => {
      const at = new AggregateTranslator('t', null);
      const result = at.translate([
        { $addFields: { diff: { $subtract: ['$a', '$b'] } } }
      ]);
      assert.ok(result.sql.includes('-'));
    });

    it('$multiply should generate *', () => {
      const at = new AggregateTranslator('t', null);
      const result = at.translate([
        { $addFields: { product: { $multiply: ['$price', '$qty'] } } }
      ]);
      assert.ok(result.sql.includes('*'));
    });

    it('$divide should generate /', () => {
      const at = new AggregateTranslator('t', null);
      const result = at.translate([
        { $addFields: { ratio: { $divide: ['$a', '$b'] } } }
      ]);
      assert.ok(result.sql.includes('/'));
    });

    it('$mod should generate %', () => {
      const at = new AggregateTranslator('t', null);
      const result = at.translate([
        { $addFields: { rem: { $mod: ['$a', '$b'] } } }
      ]);
      assert.ok(result.sql.includes('%'));
    });

    it('$abs should generate ABS()', () => {
      const at = new AggregateTranslator('t', null);
      const result = at.translate([
        { $addFields: { absVal: { $abs: '$value' } } }
      ]);
      assert.ok(result.sql.includes('ABS'));
    });

    it('$ceil should generate CEIL()', () => {
      const at = new AggregateTranslator('t', null);
      const result = at.translate([
        { $addFields: { c: { $ceil: '$value' } } }
      ]);
      assert.ok(result.sql.includes('CEIL'));
    });

    it('$floor should generate FLOOR()', () => {
      const at = new AggregateTranslator('t', null);
      const result = at.translate([
        { $addFields: { f: { $floor: '$value' } } }
      ]);
      assert.ok(result.sql.includes('FLOOR'));
    });

    it('$sqrt should generate SQRT()', () => {
      const at = new AggregateTranslator('t', null);
      const result = at.translate([
        { $addFields: { s: { $sqrt: '$value' } } }
      ]);
      assert.ok(result.sql.includes('SQRT'));
    });

    it('$pow should generate POWER()', () => {
      const at = new AggregateTranslator('t', null);
      const result = at.translate([
        { $addFields: { p: { $pow: ['$base', '$exp'] } } }
      ]);
      assert.ok(result.sql.includes('POWER'));
    });

    it('$concat should generate string concatenation', () => {
      const at = new AggregateTranslator('t', null);
      const result = at.translate([
        { $addFields: { full: { $concat: ['$first', ' ', '$last'] } } }
      ]);
      assert.ok(result.sql.includes('||'));
    });

    it('$toLower should generate LOWER()', () => {
      const at = new AggregateTranslator('t', null);
      const result = at.translate([
        { $addFields: { low: { $toLower: '$name' } } }
      ]);
      assert.ok(result.sql.includes('LOWER'));
    });

    it('$toUpper should generate UPPER()', () => {
      const at = new AggregateTranslator('t', null);
      const result = at.translate([
        { $addFields: { up: { $toUpper: '$name' } } }
      ]);
      assert.ok(result.sql.includes('UPPER'));
    });

    it('$cond should generate CASE WHEN', () => {
      const at = new AggregateTranslator('t', null);
      const result = at.translate([
        { $addFields: { label: { $cond: { if: '$active', then: 'yes', else: 'no' } } } }
      ]);
      assert.ok(result.sql.includes('CASE WHEN'));
    });

    it('$cond array form should work', () => {
      const at = new AggregateTranslator('t', null);
      const result = at.translate([
        { $addFields: { label: { $cond: ['$active', 'yes', 'no'] } } }
      ]);
      assert.ok(result.sql.includes('CASE WHEN'));
    });

    it('$ifNull should generate COALESCE', () => {
      const at = new AggregateTranslator('t', null);
      const result = at.translate([
        { $addFields: { val: { $ifNull: ['$name', 'Unknown'] } } }
      ]);
      assert.ok(result.sql.includes('COALESCE'));
    });

    it('$switch should generate CASE with multiple WHENs', () => {
      const at = new AggregateTranslator('t', null);
      const result = at.translate([
        { $addFields: { tier: { $switch: {
          branches: [
            { case: { $gte: ['$score', 90] }, then: 'A' },
            { case: { $gte: ['$score', 80] }, then: 'B' }
          ],
          default: 'C'
        } } } }
      ]);
      assert.ok(result.sql.includes('CASE'));
      assert.ok((result.sql.match(/WHEN/g) || []).length >= 2);
    });

    it('$size should generate jsonb_array_length', () => {
      const at = new AggregateTranslator('t', null);
      const result = at.translate([
        { $addFields: { n: { $size: '$tags' } } }
      ]);
      assert.ok(result.sql.includes('jsonb_array_length'));
    });

    it('$arrayElemAt should generate ->', () => {
      const at = new AggregateTranslator('t', null);
      const result = at.translate([
        { $addFields: { first: { $arrayElemAt: ['$items', 0] } } }
      ]);
      assert.ok(result.sql.includes('->'));
    });

    it('$concatArrays should generate ||', () => {
      const at = new AggregateTranslator('t', null);
      const result = at.translate([
        { $addFields: { all: { $concatArrays: ['$a', '$b'] } } }
      ]);
      assert.ok(result.sql.includes('||'));
    });

    it('$isArray should check jsonb_typeof', () => {
      const at = new AggregateTranslator('t', null);
      const result = at.translate([
        { $addFields: { isArr: { $isArray: '$tags' } } }
      ]);
      assert.ok(result.sql.includes('jsonb_typeof'));
    });

    it('$reverseArray should ORDER BY idx DESC', () => {
      const at = new AggregateTranslator('t', null);
      const result = at.translate([
        { $addFields: { rev: { $reverseArray: '$items' } } }
      ]);
      assert.ok(result.sql.includes('DESC'));
    });

    it('$mergeObjects should generate ||', () => {
      const at = new AggregateTranslator('t', null);
      const result = at.translate([
        { $addFields: { merged: { $mergeObjects: ['$a', '$b'] } } }
      ]);
      assert.ok(result.sql.includes('||'));
    });

    it('$objectToArray should generate jsonb_each', () => {
      const at = new AggregateTranslator('t', null);
      const result = at.translate([
        { $addFields: { arr: { $objectToArray: '$obj' } } }
      ]);
      assert.ok(result.sql.includes('jsonb_each'));
    });

    it('$literal should produce literal JSONB', () => {
      const at = new AggregateTranslator('t', null);
      const result = at.translate([
        { $addFields: { fixed: { $literal: { x: 1 } } } }
      ]);
      assert.ok(result.sql.includes('::jsonb'));
    });

    it('$toString should produce text output', () => {
      const at = new AggregateTranslator('t', null);
      const result = at.translate([
        { $addFields: { s: { $toString: '$num' } } }
      ]);
      assert.ok(result.sql.includes("to_jsonb") || result.sql.includes("#>>"));
    });

    it('$toInt should cast to bigint', () => {
      const at = new AggregateTranslator('t', null);
      const result = at.translate([
        { $addFields: { n: { $toInt: '$str' } } }
      ]);
      assert.ok(result.sql.includes('bigint'));
    });

    it('$toDouble should cast to double precision', () => {
      const at = new AggregateTranslator('t', null);
      const result = at.translate([
        { $addFields: { n: { $toDouble: '$str' } } }
      ]);
      assert.ok(result.sql.includes('double precision'));
    });

    it('$type should check jsonb_typeof', () => {
      const at = new AggregateTranslator('t', null);
      const result = at.translate([
        { $addFields: { t: { $type: '$val' } } }
      ]);
      assert.ok(result.sql.includes('jsonb_typeof'));
    });

    it('$replaceOne should generate REPLACE', () => {
      const at = new AggregateTranslator('t', null);
      const result = at.translate([
        { $addFields: { r: { $replaceOne: { input: '$s', find: 'foo', replacement: 'bar' } } } }
      ]);
      assert.ok(result.sql.includes('REPLACE'));
    });

    it('$split should generate string_to_array', () => {
      const at = new AggregateTranslator('t', null);
      const result = at.translate([
        { $addFields: { parts: { $split: ['$path', '/'] } } }
      ]);
      assert.ok(result.sql.includes('string_to_array'));
    });

    it('$year should extract year from date', () => {
      const at = new AggregateTranslator('t', null);
      const result = at.translate([
        { $addFields: { y: { $year: '$createdAt' } } }
      ]);
      assert.ok(result.sql.includes('EXTRACT(YEAR'));
    });

    it('$month should extract month', () => {
      const at = new AggregateTranslator('t', null);
      const result = at.translate([
        { $addFields: { m: { $month: '$createdAt' } } }
      ]);
      assert.ok(result.sql.includes('EXTRACT(MONTH'));
    });

    it('$dayOfMonth should extract day', () => {
      const at = new AggregateTranslator('t', null);
      const result = at.translate([
        { $addFields: { d: { $dayOfMonth: '$createdAt' } } }
      ]);
      assert.ok(result.sql.includes('EXTRACT(DAY'));
    });

    it('$hour should extract hour', () => {
      const at = new AggregateTranslator('t', null);
      const result = at.translate([
        { $addFields: { h: { $hour: '$createdAt' } } }
      ]);
      assert.ok(result.sql.includes('EXTRACT(HOUR'));
    });

    it('$dateToString should use to_char', () => {
      const at = new AggregateTranslator('t', null);
      const result = at.translate([
        { $addFields: { ds: { $dateToString: { date: '$d', format: '%Y-%m-%d' } } } }
      ]);
      assert.ok(result.sql.includes('to_char'));
    });
  });

  describe('multi-stage pipelines', () => {
    it('should chain match, group, sort, limit', () => {
      const at = new AggregateTranslator('orders', 'shop');
      const result = at.translate([
        { $match: { status: 'complete' } },
        { $group: { _id: '$category', total: { $sum: '$amount' } } },
        { $sort: { total: -1 } },
        { $limit: 10 }
      ]);
      assert.ok(result.sql.includes('WITH'));
      assert.ok(result.sql.includes('WHERE'));
      assert.ok(result.sql.includes('GROUP BY'));
      assert.ok(result.sql.includes('ORDER BY'));
      assert.ok(result.sql.includes('LIMIT'));
      assert.ok(result.sql.includes('stage_1'));
      assert.ok(result.sql.includes('stage_4'));
    });
  });

  describe('unsupported stages', () => {
    it('$facet should be translated to SQL with jsonb_build_object', () => {
      const at = new AggregateTranslator('t', null);
      const result = at.translate([
        { $facet: { a: [{ $match: { x: 1 } }], b: [{ $count: 'n' }] } }
      ]);
      assert.ok(result.sql.includes('jsonb_build_object'));
      assert.ok(result.sql.includes('jsonb_agg'));
    });

    it('$bucketAuto should fall to postProcessStages', () => {
      const at = new AggregateTranslator('t', null);
      const result = at.translate([
        { $bucketAuto: { groupBy: '$price', buckets: 5 } }
      ]);
      assert.ok(result.postProcessStages.length > 0);
    });

    it('$redact should fall to postProcessStages', () => {
      const at = new AggregateTranslator('t', null);
      const result = at.translate([
        { $redact: '$$DESCEND' }
      ]);
      assert.ok(result.postProcessStages.length > 0);
    });
  });
});
