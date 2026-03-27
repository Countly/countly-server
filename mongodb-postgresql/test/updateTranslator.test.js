'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert');
const { UpdateTranslator } = require('../lib/updateTranslator');

describe('UpdateTranslator', () => {
  describe('full document replacement', () => {
    it('should replace entire document when no $ operators', () => {
      const ut = new UpdateTranslator();
      const result = ut.translateUpdate({ name: 'John', age: 30 });
      assert.ok(result.setClause.includes('::jsonb'));
      assert.ok(result.params.length > 0);
    });

    it('should strip _id from replacement', () => {
      const ut = new UpdateTranslator();
      const result = ut.translateUpdate({ _id: '123', name: 'John' });
      const jsonParam = result.params[0];
      const parsed = JSON.parse(jsonParam);
      assert.strictEqual(parsed._id, undefined);
      assert.strictEqual(parsed.name, 'John');
    });
  });

  describe('$set', () => {
    it('should generate jsonb_set for simple field', () => {
      const ut = new UpdateTranslator();
      const result = ut.translateUpdate({ $set: { name: 'Alice' } });
      assert.ok(result.setClause.includes('jsonb_set'));
      assert.ok(result.params.some(p => p === '"Alice"' || p === '{name}'));
    });

    it('should handle nested field with dot notation', () => {
      const ut = new UpdateTranslator();
      const result = ut.translateUpdate({ $set: { 'address.city': 'NYC' } });
      assert.ok(result.setClause.includes('jsonb_set'));
      assert.ok(result.params.some(p => p && p.includes('address')));
    });

    it('should handle setting to null', () => {
      const ut = new UpdateTranslator();
      const result = ut.translateUpdate({ $set: { deletedAt: null } });
      assert.ok(result.setClause.includes('jsonb_set'));
    });

    it('should handle setting to array', () => {
      const ut = new UpdateTranslator();
      const result = ut.translateUpdate({ $set: { tags: ['a', 'b'] } });
      assert.ok(result.params.some(p => typeof p === 'string' && p.includes('a')));
    });

    it('should handle setting to nested object', () => {
      const ut = new UpdateTranslator();
      const result = ut.translateUpdate({ $set: { address: { city: 'NYC', state: 'NY' } } });
      assert.ok(result.params.some(p => typeof p === 'string' && p.includes('NYC')));
    });

    it('should handle multiple fields', () => {
      const ut = new UpdateTranslator();
      const result = ut.translateUpdate({ $set: { name: 'Alice', age: 25 } });
      // Should have two jsonb_set calls nested
      const count = (result.setClause.match(/jsonb_set/g) || []).length;
      assert.ok(count >= 2);
    });
  });

  describe('$unset', () => {
    it('should remove a top-level field', () => {
      const ut = new UpdateTranslator();
      const result = ut.translateUpdate({ $unset: { password: '' } });
      assert.ok(result.setClause.includes('-'));
      assert.ok(result.params.includes('password'));
    });

    it('should remove a nested field', () => {
      const ut = new UpdateTranslator();
      const result = ut.translateUpdate({ $unset: { 'address.zip': '' } });
      assert.ok(result.setClause.includes('#-'));
    });

    it('should handle multiple fields', () => {
      const ut = new UpdateTranslator();
      const result = ut.translateUpdate({ $unset: { a: '', b: '' } });
      assert.ok(result.params.includes('a'));
      assert.ok(result.params.includes('b'));
    });
  });

  describe('$inc', () => {
    it('should increment a field', () => {
      const ut = new UpdateTranslator();
      const result = ut.translateUpdate({ $inc: { count: 1 } });
      assert.ok(result.setClause.includes('jsonb_set'));
      assert.ok(result.setClause.includes('COALESCE'));
      assert.ok(result.setClause.includes('numeric'));
      assert.ok(result.params.includes(1));
    });

    it('should handle negative increment (decrement)', () => {
      const ut = new UpdateTranslator();
      const result = ut.translateUpdate({ $inc: { stock: -5 } });
      assert.ok(result.params.includes(-5));
    });

    it('should handle nested field increment', () => {
      const ut = new UpdateTranslator();
      const result = ut.translateUpdate({ $inc: { 'stats.views': 1 } });
      assert.ok(result.params.some(p => typeof p === 'string' && p.includes('stats')));
    });
  });

  describe('$mul', () => {
    it('should multiply a field', () => {
      const ut = new UpdateTranslator();
      const result = ut.translateUpdate({ $mul: { price: 1.1 } });
      assert.ok(result.setClause.includes('*'));
      assert.ok(result.params.includes(1.1));
    });
  });

  describe('$min / $max', () => {
    it('$min should set to minimum of current and given value', () => {
      const ut = new UpdateTranslator();
      const result = ut.translateUpdate({ $min: { lowScore: 50 } });
      assert.ok(result.setClause.includes('LEAST'));
      assert.ok(result.params.includes(50));
    });

    it('$max should set to maximum of current and given value', () => {
      const ut = new UpdateTranslator();
      const result = ut.translateUpdate({ $max: { highScore: 100 } });
      assert.ok(result.setClause.includes('GREATEST'));
      assert.ok(result.params.includes(100));
    });
  });

  describe('$rename', () => {
    it('should rename a field', () => {
      const ut = new UpdateTranslator();
      const result = ut.translateUpdate({ $rename: { oldName: 'newName' } });
      assert.ok(result.setClause.includes('#-'));
      assert.ok(result.setClause.includes('jsonb_set'));
    });
  });

  describe('$push', () => {
    it('should append a simple value to an array', () => {
      const ut = new UpdateTranslator();
      const result = ut.translateUpdate({ $push: { tags: 'new' } });
      assert.ok(result.setClause.includes('||'));
      assert.ok(result.setClause.includes('COALESCE'));
    });

    it('should handle $each modifier', () => {
      const ut = new UpdateTranslator();
      const result = ut.translateUpdate({ $push: { tags: { $each: ['a', 'b'] } } });
      assert.ok(result.setClause.includes('||'));
    });

    it('should handle $each with $sort', () => {
      const ut = new UpdateTranslator();
      const result = ut.translateUpdate({
        $push: { scores: { $each: [80, 90], $sort: 1 } }
      });
      assert.ok(result.setClause.includes('ORDER BY'));
    });

    it('should handle $each with $slice (positive)', () => {
      const ut = new UpdateTranslator();
      const result = ut.translateUpdate({
        $push: { items: { $each: [], $slice: 5 } }
      });
      assert.ok(result.setClause.includes('LIMIT'));
    });

    it('should handle $each with $slice (negative)', () => {
      const ut = new UpdateTranslator();
      const result = ut.translateUpdate({
        $push: { items: { $each: [], $slice: -3 } }
      });
      assert.ok(result.setClause.includes('jsonb_array_length'));
    });

    it('should handle $each with $position', () => {
      const ut = new UpdateTranslator();
      const result = ut.translateUpdate({
        $push: { items: { $each: ['x'], $position: 0 } }
      });
      assert.ok(result.params.includes(0));
    });

    it('should handle $each with $sort by nested field', () => {
      const ut = new UpdateTranslator();
      const result = ut.translateUpdate({
        $push: { results: { $each: [], $sort: { score: -1 } } }
      });
      assert.ok(result.setClause.includes('ORDER BY'));
      assert.ok(result.setClause.includes('DESC'));
    });
  });

  describe('$pull', () => {
    it('should remove matching simple values', () => {
      const ut = new UpdateTranslator();
      const result = ut.translateUpdate({ $pull: { tags: 'old' } });
      assert.ok(result.setClause.includes('jsonb_array_elements'));
      assert.ok(result.setClause.includes('!='));
    });

    it('should remove matching subdocuments', () => {
      const ut = new UpdateTranslator();
      const result = ut.translateUpdate({ $pull: { items: { status: 'removed' } } });
      assert.ok(result.setClause.includes('@>'));
    });

    it('should handle operator conditions like $gt', () => {
      const ut = new UpdateTranslator();
      const result = ut.translateUpdate({ $pull: { scores: { $lt: 50 } } });
      assert.ok(result.setClause.includes('numeric'));
      assert.ok(result.setClause.includes('<'));
    });

    it('should handle $in condition', () => {
      const ut = new UpdateTranslator();
      const result = ut.translateUpdate({ $pull: { tags: { $in: ['a', 'b'] } } });
      assert.ok(result.setClause.includes('IN'));
    });
  });

  describe('$pop', () => {
    it('should remove last element with value 1', () => {
      const ut = new UpdateTranslator();
      const result = ut.translateUpdate({ $pop: { items: 1 } });
      assert.ok(result.setClause.includes('jsonb_array_length'));
    });

    it('should remove first element with value -1', () => {
      const ut = new UpdateTranslator();
      const result = ut.translateUpdate({ $pop: { items: -1 } });
      assert.ok(result.setClause.includes('idx > 1'));
    });
  });

  describe('$addToSet', () => {
    it('should add value only if not present', () => {
      const ut = new UpdateTranslator();
      const result = ut.translateUpdate({ $addToSet: { tags: 'unique' } });
      assert.ok(result.setClause.includes('CASE WHEN'));
      assert.ok(result.setClause.includes('@>'));
    });

    it('should handle $each', () => {
      const ut = new UpdateTranslator();
      const result = ut.translateUpdate({ $addToSet: { tags: { $each: ['a', 'b'] } } });
      assert.ok(result.setClause.includes('CASE WHEN'));
    });
  });

  describe('$currentDate', () => {
    it('should set field to current date (boolean true)', () => {
      const ut = new UpdateTranslator();
      const result = ut.translateUpdate({ $currentDate: { lastModified: true } });
      assert.ok(result.setClause.includes('jsonb_set'));
      assert.ok(result.params.some(p => typeof p === 'string' && p.includes('$date')));
    });

    it('should set field to current date with type date', () => {
      const ut = new UpdateTranslator();
      const result = ut.translateUpdate({ $currentDate: { lastModified: { $type: 'date' } } });
      assert.ok(result.params.some(p => typeof p === 'string' && p.includes('$date')));
    });

    it('should set field to timestamp with type timestamp', () => {
      const ut = new UpdateTranslator();
      const result = ut.translateUpdate({ $currentDate: { ts: { $type: 'timestamp' } } });
      assert.ok(result.setClause.includes('to_jsonb'));
    });
  });

  describe('$bit', () => {
    it('should handle bitwise AND', () => {
      const ut = new UpdateTranslator();
      const result = ut.translateUpdate({ $bit: { flags: { and: 0b1010 } } });
      assert.ok(result.setClause.includes('&'));
    });

    it('should handle bitwise OR', () => {
      const ut = new UpdateTranslator();
      const result = ut.translateUpdate({ $bit: { flags: { or: 0b0101 } } });
      assert.ok(result.setClause.includes('|'));
    });

    it('should handle bitwise XOR', () => {
      const ut = new UpdateTranslator();
      const result = ut.translateUpdate({ $bit: { flags: { xor: 0b1111 } } });
      assert.ok(result.setClause.includes('#'));
    });
  });

  describe('combined operators', () => {
    it('should handle $set and $inc together', () => {
      const ut = new UpdateTranslator();
      const result = ut.translateUpdate({
        $set: { name: 'Alice' },
        $inc: { visits: 1 }
      });
      assert.ok(result.setClause.includes('jsonb_set'));
      assert.ok(result.setClause.includes('COALESCE'));
    });

    it('should handle $set, $unset, and $push together', () => {
      const ut = new UpdateTranslator();
      const result = ut.translateUpdate({
        $set: { status: 'active' },
        $unset: { temp: '' },
        $push: { log: 'entry' }
      });
      assert.ok(result.params.length >= 3);
    });
  });

  describe('parameter indexing', () => {
    it('should start from custom param index', () => {
      const ut = new UpdateTranslator();
      const result = ut.translateUpdate({ $set: { name: 'Alice' } }, 3, ['a', 'b', 'c']);
      // First new param should be $4
      assert.ok(result.setClause.includes('$4') || result.setClause.includes('$5'));
      assert.ok(result.params.length > 3);
    });
  });

  describe('translateSetOnInsert', () => {
    it('should return null when no $setOnInsert', () => {
      const ut = new UpdateTranslator();
      const result = ut.translateSetOnInsert({ $set: { name: 'Alice' } });
      assert.strictEqual(result, null);
    });

    it('should translate $setOnInsert fields', () => {
      const ut = new UpdateTranslator();
      const result = ut.translateSetOnInsert({ $setOnInsert: { createdAt: '2024-01-01' } });
      assert.ok(result);
      assert.ok(result.setClause.includes('jsonb_set'));
    });
  });

  describe('unsupported operators', () => {
    it('should throw for unknown operator', () => {
      const ut = new UpdateTranslator();
      assert.throws(
        () => ut.translateUpdate({ $unknown: { a: 1 } }),
        /Unsupported update operator/
      );
    });
  });
});
