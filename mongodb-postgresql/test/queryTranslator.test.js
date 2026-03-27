'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert');
const { QueryTranslator } = require('../lib/queryTranslator');
const { ObjectId } = require('../lib/objectId');

describe('QueryTranslator', () => {
  describe('basic filters', () => {
    it('should handle empty filter', () => {
      const t = new QueryTranslator();
      const { where, params } = t.translateFilter({});
      assert.strictEqual(where, 'TRUE');
      assert.deepStrictEqual(params, []);
    });

    it('should handle null filter', () => {
      const t = new QueryTranslator();
      const { where } = t.translateFilter(null);
      assert.strictEqual(where, 'TRUE');
    });

    it('should handle undefined filter', () => {
      const t = new QueryTranslator();
      const { where } = t.translateFilter(undefined);
      assert.strictEqual(where, 'TRUE');
    });

    it('should handle equality', () => {
      const t = new QueryTranslator();
      const { where, params } = t.translateFilter({ name: 'John' });
      assert.ok(where.includes('data'));
      assert.ok(params.includes('"John"'));
    });

    it('should handle _id equality', () => {
      const t = new QueryTranslator();
      const { where, params } = t.translateFilter({ _id: 'abc123' });
      assert.ok(where.includes('_id'));
      assert.ok(params.includes('abc123'));
    });

    it('should handle _id with ObjectId', () => {
      const t = new QueryTranslator();
      const oid = new ObjectId('507f1f77bcf86cd799439011');
      const { where, params } = t.translateFilter({ _id: oid });
      assert.ok(where.includes('_id'));
      assert.ok(params.includes('507f1f77bcf86cd799439011'));
    });

    it('should handle null equality', () => {
      const t = new QueryTranslator();
      const { where } = t.translateFilter({ name: null });
      assert.ok(where.includes('NULL') || where.includes('null'));
    });

    it('should handle boolean equality', () => {
      const t = new QueryTranslator();
      const { where, params } = t.translateFilter({ active: true });
      assert.ok(params.includes('true'));
    });

    it('should handle number equality', () => {
      const t = new QueryTranslator();
      const { where, params } = t.translateFilter({ age: 25 });
      assert.ok(params.includes('25'));
    });

    it('should handle array equality', () => {
      const t = new QueryTranslator();
      const { where, params } = t.translateFilter({ tags: ['a', 'b'] });
      assert.ok(where.includes('::jsonb'));
    });

    it('should handle object equality', () => {
      const t = new QueryTranslator();
      const { where } = t.translateFilter({ address: { city: 'NYC' } });
      assert.ok(where.includes('::jsonb'));
    });

    it('should handle multiple fields with AND', () => {
      const t = new QueryTranslator();
      const { where } = t.translateFilter({ name: 'John', age: 30 });
      assert.ok(where.includes('AND'));
    });
  });

  describe('comparison operators', () => {
    it('should handle $gt with number', () => {
      const t = new QueryTranslator();
      const { where, params } = t.translateFilter({ age: { $gt: 25 } });
      assert.ok(where.includes('>'));
      assert.ok(where.includes('numeric'));
      assert.ok(params.includes(25));
    });

    it('should handle $gte', () => {
      const t = new QueryTranslator();
      const { where } = t.translateFilter({ age: { $gte: 25 } });
      assert.ok(where.includes('>='));
    });

    it('should handle $lt', () => {
      const t = new QueryTranslator();
      const { where } = t.translateFilter({ age: { $lt: 25 } });
      assert.ok(where.includes('<'));
    });

    it('should handle $lte', () => {
      const t = new QueryTranslator();
      const { where } = t.translateFilter({ age: { $lte: 25 } });
      assert.ok(where.includes('<='));
    });

    it('should handle $ne with value', () => {
      const t = new QueryTranslator();
      const { where } = t.translateFilter({ status: { $ne: 'inactive' } });
      assert.ok(where.includes('!='));
    });

    it('should handle $ne with null', () => {
      const t = new QueryTranslator();
      const { where } = t.translateFilter({ name: { $ne: null } });
      assert.ok(where.includes('NOT NULL') || where.includes('!= \'null\''));
    });

    it('should handle $eq explicitly', () => {
      const t = new QueryTranslator();
      const { where } = t.translateFilter({ name: { $eq: 'test' } });
      assert.ok(where.includes('data'));
    });

    it('should handle $gt with string', () => {
      const t = new QueryTranslator();
      const { where } = t.translateFilter({ name: { $gt: 'M' } });
      assert.ok(where.includes('>'));
    });

    it('should handle $gt with Date', () => {
      const t = new QueryTranslator();
      const date = new Date('2024-01-01');
      const { where, params } = t.translateFilter({ createdAt: { $gt: date } });
      assert.ok(where.includes('>'));
      assert.ok(params.some(p => typeof p === 'string' && p.includes('2024')));
    });

    it('should handle $in', () => {
      const t = new QueryTranslator();
      const { where } = t.translateFilter({ status: { $in: ['active', 'pending'] } });
      assert.ok(where.includes('@>') || where.includes('='));
    });

    it('should handle $nin', () => {
      const t = new QueryTranslator();
      const { where } = t.translateFilter({ status: { $nin: ['deleted'] } });
      assert.ok(where.includes('NOT'));
    });

    it('should handle $in on _id', () => {
      const t = new QueryTranslator();
      const { where } = t.translateFilter({ _id: { $in: ['a', 'b', 'c'] } });
      assert.ok(where.includes('ANY'));
    });

    it('should handle $nin on _id', () => {
      const t = new QueryTranslator();
      const { where } = t.translateFilter({ _id: { $nin: ['x'] } });
      assert.ok(where.includes('ALL'));
    });

    it('should handle multiple operators on one field', () => {
      const t = new QueryTranslator();
      const { where } = t.translateFilter({ age: { $gte: 18, $lte: 65 } });
      assert.ok(where.includes('>='));
      assert.ok(where.includes('<='));
      assert.ok(where.includes('AND'));
    });
  });

  describe('_id operators', () => {
    it('should handle $gt on _id', () => {
      const t = new QueryTranslator();
      const { where } = t.translateFilter({ _id: { $gt: 'abc' } });
      assert.ok(where.includes('_id >'));
    });

    it('should handle $gte on _id', () => {
      const t = new QueryTranslator();
      const { where } = t.translateFilter({ _id: { $gte: 'abc' } });
      assert.ok(where.includes('_id >='));
    });

    it('should handle $lt on _id', () => {
      const t = new QueryTranslator();
      const { where } = t.translateFilter({ _id: { $lt: 'abc' } });
      assert.ok(where.includes('_id <'));
    });

    it('should handle $lte on _id', () => {
      const t = new QueryTranslator();
      const { where } = t.translateFilter({ _id: { $lte: 'abc' } });
      assert.ok(where.includes('_id <='));
    });

    it('should handle $eq on _id', () => {
      const t = new QueryTranslator();
      const { where } = t.translateFilter({ _id: { $eq: 'abc' } });
      assert.ok(where.includes('_id ='));
    });

    it('should handle $ne on _id', () => {
      const t = new QueryTranslator();
      const { where } = t.translateFilter({ _id: { $ne: 'abc' } });
      assert.ok(where.includes('_id !='));
    });

    it('should handle $exists on _id', () => {
      const t = new QueryTranslator();
      const { where } = t.translateFilter({ _id: { $exists: true } });
      assert.ok(where.includes('_id IS NOT NULL'));
    });

    it('should handle $regex on _id', () => {
      const t = new QueryTranslator();
      const { where } = t.translateFilter({ _id: { $regex: '^abc' } });
      assert.ok(where.includes('~'));
    });

    it('should handle null _id', () => {
      const t = new QueryTranslator();
      const { where } = t.translateFilter({ _id: null });
      assert.ok(where.includes('_id IS NULL'));
    });

    it('should handle RegExp on _id', () => {
      const t = new QueryTranslator();
      const { where } = t.translateFilter({ _id: /^test/i });
      assert.ok(where.includes('~*'));
    });
  });

  describe('logical operators', () => {
    it('should handle $and', () => {
      const t = new QueryTranslator();
      const { where } = t.translateFilter({
        $and: [{ age: { $gt: 20 } }, { age: { $lt: 30 } }]
      });
      assert.ok(where.includes('AND'));
    });

    it('should handle $or', () => {
      const t = new QueryTranslator();
      const { where } = t.translateFilter({
        $or: [{ status: 'active' }, { status: 'pending' }]
      });
      assert.ok(where.includes('OR'));
    });

    it('should handle $nor', () => {
      const t = new QueryTranslator();
      const { where } = t.translateFilter({
        $nor: [{ status: 'deleted' }]
      });
      assert.ok(where.includes('NOT'));
    });

    it('should handle $nor with multiple conditions', () => {
      const t = new QueryTranslator();
      const { where } = t.translateFilter({
        $nor: [{ status: 'deleted' }, { status: 'archived' }]
      });
      assert.ok(where.includes('NOT'));
      assert.ok(where.includes('OR'));
    });

    it('should handle nested $and inside $or', () => {
      const t = new QueryTranslator();
      const { where } = t.translateFilter({
        $or: [
          { $and: [{ age: { $gt: 20 } }, { status: 'active' }] },
          { role: 'admin' }
        ]
      });
      assert.ok(where.includes('OR'));
      assert.ok(where.includes('AND'));
    });

    it('should handle $not on field operators', () => {
      const t = new QueryTranslator();
      const { where } = t.translateFilter({
        age: { $not: { $gt: 50 } }
      });
      assert.ok(where.includes('NOT'));
    });

    it('should handle $comment (ignored)', () => {
      const t = new QueryTranslator();
      const { where } = t.translateFilter({ $comment: 'test query' });
      assert.strictEqual(where, 'TRUE');
    });
  });

  describe('element operators', () => {
    it('should handle $exists: true', () => {
      const t = new QueryTranslator();
      const { where } = t.translateFilter({ email: { $exists: true } });
      assert.ok(where.includes('?'));
    });

    it('should handle $exists: false', () => {
      const t = new QueryTranslator();
      const { where } = t.translateFilter({ email: { $exists: false } });
      assert.ok(where.includes('NOT'));
    });

    it('should handle $exists on nested field', () => {
      const t = new QueryTranslator();
      const { where } = t.translateFilter({ 'address.zip': { $exists: true } });
      assert.ok(where.includes('?'));
    });

    it('should handle $type with string type', () => {
      const t = new QueryTranslator();
      const { where } = t.translateFilter({ age: { $type: 'number' } });
      assert.ok(where.includes('jsonb_typeof'));
    });

    it('should handle $type with numeric type code', () => {
      const t = new QueryTranslator();
      const { where, params } = t.translateFilter({ name: { $type: 2 } });
      assert.ok(where.includes('jsonb_typeof'));
      // Numeric type 2 maps to 'string' in the params
      assert.ok(params.includes('string'));
    });

    it('should handle $type with array of types', () => {
      const t = new QueryTranslator();
      const { where } = t.translateFilter({ value: { $type: ['string', 'number'] } });
      assert.ok(where.includes('OR'));
      assert.ok(where.includes('jsonb_typeof'));
    });
  });

  describe('nested fields', () => {
    it('should handle dot notation', () => {
      const t = new QueryTranslator();
      const { where } = t.translateFilter({ 'address.city': 'NYC' });
      assert.ok(where.includes('address') && where.includes('city'));
    });

    it('should handle deep nesting', () => {
      const t = new QueryTranslator();
      const { where } = t.translateFilter({ 'a.b.c': 'value' });
      assert.ok(where.includes('a') && where.includes('b') && where.includes('c'));
    });

    it('should handle deep nested comparison', () => {
      const t = new QueryTranslator();
      const { where } = t.translateFilter({ 'user.profile.age': { $gt: 25 } });
      assert.ok(where.includes('#>>'));
      assert.ok(where.includes('>'));
    });
  });

  describe('array operators', () => {
    it('should handle $size', () => {
      const t = new QueryTranslator();
      const { where } = t.translateFilter({ tags: { $size: 3 } });
      assert.ok(where.includes('jsonb_array_length'));
    });

    it('should handle $all', () => {
      const t = new QueryTranslator();
      const { where } = t.translateFilter({ tags: { $all: ['red', 'blue'] } });
      assert.ok(where.includes('@>'));
    });

    it('should handle $all with $elemMatch', () => {
      const t = new QueryTranslator();
      const { where } = t.translateFilter({
        results: { $all: [{ $elemMatch: { score: { $gt: 80 } } }] }
      });
      assert.ok(where.includes('jsonb_array_elements'));
    });

    it('should handle $elemMatch', () => {
      const t = new QueryTranslator();
      const { where } = t.translateFilter({
        scores: { $elemMatch: { $gt: 80, $lt: 90 } }
      });
      assert.ok(where.includes('jsonb_array_elements'));
      assert.ok(where.includes('EXISTS'));
    });

    it('should handle $elemMatch with field conditions', () => {
      const t = new QueryTranslator();
      const { where } = t.translateFilter({
        items: { $elemMatch: { qty: { $gt: 5 }, status: 'A' } }
      });
      assert.ok(where.includes('jsonb_array_elements'));
    });
  });

  describe('regex', () => {
    it('should handle $regex string', () => {
      const t = new QueryTranslator();
      const { where } = t.translateFilter({ name: { $regex: '^John' } });
      assert.ok(where.includes('~'));
    });

    it('should handle $regex with $options case-insensitive', () => {
      const t = new QueryTranslator();
      const { where } = t.translateFilter({ name: { $regex: 'john', $options: 'i' } });
      assert.ok(where.includes('~*'));
    });

    it('should handle native RegExp', () => {
      const t = new QueryTranslator();
      const { where } = t.translateFilter({ name: /^John/i });
      assert.ok(where.includes('~*'));
    });

    it('should handle RegExp without flags', () => {
      const t = new QueryTranslator();
      const { where } = t.translateFilter({ name: /test/ });
      assert.ok(where.includes('~'));
      assert.ok(!where.includes('~*'));
    });
  });

  describe('$mod operator', () => {
    it('should generate modulo expression', () => {
      const t = new QueryTranslator();
      const { where, params } = t.translateFilter({ age: { $mod: [10, 0] } });
      assert.ok(where.includes('%'));
      assert.ok(params.includes(10));
      assert.ok(params.includes(0));
    });
  });

  describe('$text operator', () => {
    it('should generate full-text search', () => {
      const t = new QueryTranslator();
      const { where } = t.translateFilter({ $text: { $search: 'hello world' } });
      assert.ok(where.includes('to_tsvector'));
      assert.ok(where.includes('plainto_tsquery'));
    });

    it('should support $language', () => {
      const t = new QueryTranslator();
      const { where, params } = t.translateFilter({
        $text: { $search: 'bonjour', $language: 'french' }
      });
      assert.ok(params.includes('french'));
    });
  });

  describe('$expr operator', () => {
    it('should handle $eq comparison', () => {
      const t = new QueryTranslator();
      const { where } = t.translateFilter({
        $expr: { $eq: ['$field1', '$field2'] }
      });
      assert.ok(where.includes('='));
    });

    it('should handle $gt comparison', () => {
      const t = new QueryTranslator();
      const { where } = t.translateFilter({
        $expr: { $gt: ['$spent', '$budget'] }
      });
      assert.ok(where.includes('>'));
    });

    it('should handle nested $and in $expr', () => {
      const t = new QueryTranslator();
      const { where } = t.translateFilter({
        $expr: { $and: [{ $gt: ['$a', 0] }, { $lt: ['$b', 100] }] }
      });
      assert.ok(where.includes('AND'));
    });
  });

  describe('bitwise operators', () => {
    it('should handle $bitsAllSet', () => {
      const t = new QueryTranslator();
      const { where } = t.translateFilter({ flags: { $bitsAllSet: 0b1010 } });
      assert.ok(where.includes('&'));
      assert.ok(where.includes('='));
    });

    it('should handle $bitsAllClear', () => {
      const t = new QueryTranslator();
      const { where } = t.translateFilter({ flags: { $bitsAllClear: 0b0101 } });
      assert.ok(where.includes('&'));
      assert.ok(where.includes('= 0'));
    });

    it('should handle $bitsAnySet', () => {
      const t = new QueryTranslator();
      const { where } = t.translateFilter({ flags: { $bitsAnySet: 0b1100 } });
      assert.ok(where.includes('&'));
      assert.ok(where.includes('!= 0'));
    });

    it('should handle $bitsAnyClear', () => {
      const t = new QueryTranslator();
      const { where } = t.translateFilter({ flags: { $bitsAnyClear: 0b1111 } });
      assert.ok(where.includes('&'));
      assert.ok(where.includes('!='));
    });

    it('should handle array of bit positions', () => {
      const t = new QueryTranslator();
      const { where } = t.translateFilter({ flags: { $bitsAllSet: [1, 3] } });
      assert.ok(where.includes('&'));
    });
  });

  describe('unsupported operators', () => {
    it('should throw for $where', () => {
      const t = new QueryTranslator();
      assert.throws(
        () => t.translateFilter({ $where: 'this.a > 10' }),
        /\$where.*not supported/
      );
    });

    it('should generate PostGIS SQL for geospatial operators', () => {
      const t = new QueryTranslator();
      const { where } = t.translateFilter({
        location: { $near: { $geometry: { type: 'Point', coordinates: [0, 0] }, $maxDistance: 100 } }
      });
      assert.ok(where.includes('ST_DWithin'));
    });

    it('should throw for unknown top-level operator', () => {
      const t = new QueryTranslator();
      assert.throws(
        () => t.translateFilter({ $unknown: 'test' }),
        /Unsupported top-level operator/
      );
    });

    it('should throw for unknown field operator', () => {
      const t = new QueryTranslator();
      assert.throws(
        () => t.translateFilter({ field: { $unknownOp: 5 } }),
        /Unsupported field operator/
      );
    });
  });

  describe('sort translation', () => {
    it('should handle ascending sort', () => {
      const t = new QueryTranslator();
      const orderBy = t.translateSort({ name: 1 });
      assert.ok(orderBy.includes('ASC'));
    });

    it('should handle descending sort', () => {
      const t = new QueryTranslator();
      const orderBy = t.translateSort({ createdAt: -1 });
      assert.ok(orderBy.includes('DESC'));
    });

    it('should handle multi-field sort', () => {
      const t = new QueryTranslator();
      const orderBy = t.translateSort({ status: 1, createdAt: -1 });
      assert.ok(orderBy.includes('ASC'));
      assert.ok(orderBy.includes('DESC'));
    });

    it('should handle _id sort', () => {
      const t = new QueryTranslator();
      const orderBy = t.translateSort({ _id: 1 });
      assert.ok(orderBy.includes('_id'));
    });

    it('should return empty string for null sort', () => {
      const t = new QueryTranslator();
      assert.strictEqual(t.translateSort(null), '');
    });

    it('should return empty string for undefined sort', () => {
      const t = new QueryTranslator();
      assert.strictEqual(t.translateSort(undefined), '');
    });

    it('should handle Map input', () => {
      const t = new QueryTranslator();
      const sort = new Map([['name', 1], ['age', -1]]);
      const orderBy = t.translateSort(sort);
      assert.ok(orderBy.includes('ASC'));
      assert.ok(orderBy.includes('DESC'));
    });

    it('should handle array of pairs', () => {
      const t = new QueryTranslator();
      const orderBy = t.translateSort([['name', 1], ['age', -1]]);
      assert.ok(orderBy.includes('ASC'));
      assert.ok(orderBy.includes('DESC'));
    });

    it('should handle desc string direction', () => {
      const t = new QueryTranslator();
      const orderBy = t.translateSort({ name: 'desc' });
      assert.ok(orderBy.includes('DESC'));
    });
  });

  describe('projection', () => {
    it('should return null postProcess for empty projection', () => {
      const t = new QueryTranslator();
      const { postProcess } = t.translateProjection({});
      assert.strictEqual(postProcess, null);
    });

    it('should return null postProcess for null projection', () => {
      const t = new QueryTranslator();
      const { postProcess } = t.translateProjection(null);
      assert.strictEqual(postProcess, null);
    });

    it('should handle inclusion projection', () => {
      const t = new QueryTranslator();
      const { postProcess } = t.translateProjection({ name: 1, age: 1 });
      assert.ok(postProcess);

      const result = postProcess({ _id: '1', name: 'John', age: 30, email: 'j@j.com' });
      assert.strictEqual(result.name, 'John');
      assert.strictEqual(result.age, 30);
      assert.strictEqual(result._id, '1');
      assert.strictEqual(result.email, undefined);
    });

    it('should handle exclusion projection', () => {
      const t = new QueryTranslator();
      const { postProcess } = t.translateProjection({ password: 0 });
      assert.ok(postProcess);

      const result = postProcess({ _id: '1', name: 'John', password: 'secret' });
      assert.strictEqual(result.name, 'John');
      assert.strictEqual(result.password, undefined);
    });

    it('should handle _id exclusion with inclusion', () => {
      const t = new QueryTranslator();
      const { postProcess } = t.translateProjection({ name: 1, _id: 0 });
      assert.ok(postProcess);

      const result = postProcess({ _id: '1', name: 'John', age: 30 });
      assert.strictEqual(result.name, 'John');
      assert.strictEqual(result._id, undefined);
    });

    it('should handle nested field inclusion', () => {
      const t = new QueryTranslator();
      const { postProcess } = t.translateProjection({ 'address.city': 1 });
      assert.ok(postProcess);

      const result = postProcess({ _id: '1', address: { city: 'NYC', zip: '10001' } });
      assert.strictEqual(result.address.city, 'NYC');
      assert.strictEqual(result.address.zip, undefined);
    });

    it('should handle nested field exclusion', () => {
      const t = new QueryTranslator();
      const { postProcess } = t.translateProjection({ 'address.zip': 0 });
      assert.ok(postProcess);

      const result = postProcess({ _id: '1', address: { city: 'NYC', zip: '10001' }, name: 'J' });
      assert.strictEqual(result.address.city, 'NYC');
      assert.strictEqual(result.address.zip, undefined);
      assert.strictEqual(result.name, 'J');
    });

    it('should handle $slice projection operator with inclusion', () => {
      const t = new QueryTranslator();
      const { postProcess } = t.translateProjection({ name: 1, tags: { $slice: 2 } });
      assert.ok(postProcess);

      const result = postProcess({ _id: '1', name: 'Alice', tags: ['a', 'b', 'c', 'd'] });
      assert.strictEqual(result.name, 'Alice');
      assert.deepStrictEqual(result.tags, ['a', 'b']);
    });

    it('should handle $slice with negative value', () => {
      const t = new QueryTranslator();
      const { postProcess } = t.translateProjection({ name: 1, tags: { $slice: -2 } });
      assert.ok(postProcess);

      const result = postProcess({ _id: '1', name: 'Alice', tags: ['a', 'b', 'c', 'd'] });
      assert.deepStrictEqual(result.tags, ['c', 'd']);
    });

    it('should handle $slice with [skip, limit]', () => {
      const t = new QueryTranslator();
      const { postProcess } = t.translateProjection({ name: 1, tags: { $slice: [1, 2] } });
      assert.ok(postProcess);

      const result = postProcess({ _id: '1', name: 'Alice', tags: ['a', 'b', 'c', 'd'] });
      assert.deepStrictEqual(result.tags, ['b', 'c']);
    });

    it('should always return select as _id, data', () => {
      const t = new QueryTranslator();
      const { select } = t.translateProjection({ name: 1 });
      assert.strictEqual(select, '_id, data');
    });
  });

  describe('reset and parameter management', () => {
    it('should reset param state between calls', () => {
      const t = new QueryTranslator();
      const r1 = t.translateFilter({ a: 1 });
      const r2 = t.translateFilter({ b: 2 });
      // Both should start from $1
      assert.ok(r1.params.length > 0);
      assert.ok(r2.params.length > 0);
    });
  });
});
