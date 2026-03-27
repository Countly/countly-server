'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert');
const { AggregationCursor } = require('../lib/aggregationCursor');

function createMockCollection(docs = []) {
  return {
    _name: 'test',
    _db: { _schemaName: null },
    _executeAggregate: async (pipeline) => [...docs]
  };
}

describe('AggregationCursor detailed coverage', () => {
  describe('batchSize', () => {
    it('should store value and return this', () => {
      const c = new AggregationCursor(createMockCollection(), []);
      assert.strictEqual(c.batchSize(500), c);
      assert.strictEqual(c._batchSize, 500);
    });
  });

  describe('maxTimeMS', () => {
    it('should store value and return this', () => {
      const c = new AggregationCursor(createMockCollection(), []);
      assert.strictEqual(c.maxTimeMS(3000), c);
      assert.strictEqual(c._maxTimeMS, 3000);
    });
  });

  describe('comment', () => {
    it('should store value and return this', () => {
      const c = new AggregationCursor(createMockCollection(), []);
      assert.strictEqual(c.comment('test query'), c);
      assert.strictEqual(c._comment, 'test query');
    });
  });

  describe('hint', () => {
    it('should store value and return this', () => {
      const c = new AggregationCursor(createMockCollection(), []);
      assert.strictEqual(c.hint({ name: 1 }), c);
      assert.strictEqual(c._hint.name, 1);
    });
  });

  describe('toArray', () => {
    it('should execute and return all results', async () => {
      const docs = [{ a: 1 }, { b: 2 }];
      const c = new AggregationCursor(createMockCollection(docs), []);
      const result = await c.toArray();
      assert.deepStrictEqual(result, docs);
    });

    it('should apply transform', async () => {
      const c = new AggregationCursor(createMockCollection([{ n: 'A' }, { n: 'B' }]), []);
      c.map(d => d.n);
      assert.deepStrictEqual(await c.toArray(), ['A', 'B']);
    });

    it('should only execute once', async () => {
      let count = 0;
      const col = {
        _name: 'test',
        _db: { _schemaName: null },
        _executeAggregate: async () => { count++; return [{ x: 1 }]; }
      };
      const c = new AggregationCursor(col, []);
      await c.toArray();
      await c.toArray();
      assert.strictEqual(count, 1);
    });
  });

  describe('next', () => {
    it('should return docs one by one', async () => {
      const c = new AggregationCursor(createMockCollection([{ a: 1 }, { b: 2 }]), []);
      assert.deepStrictEqual(await c.next(), { a: 1 });
      assert.deepStrictEqual(await c.next(), { b: 2 });
      assert.strictEqual(await c.next(), null);
    });

    it('should apply transform', async () => {
      const c = new AggregationCursor(createMockCollection([{ n: 'X' }]), []);
      c.map(d => d.n);
      assert.strictEqual(await c.next(), 'X');
    });
  });

  describe('hasNext', () => {
    it('should return true then false', async () => {
      const c = new AggregationCursor(createMockCollection([{ a: 1 }]), []);
      assert.ok(await c.hasNext());
      await c.next();
      assert.ok(!(await c.hasNext()));
    });
  });

  describe('forEach', () => {
    it('should iterate all docs', async () => {
      const items = [];
      const c = new AggregationCursor(createMockCollection([{ a: 1 }, { b: 2 }]), []);
      await c.forEach(d => items.push(d));
      assert.strictEqual(items.length, 2);
    });

    it('should stop when callback returns false', async () => {
      const items = [];
      const c = new AggregationCursor(createMockCollection([{ a: 1 }, { b: 2 }, { c: 3 }]), []);
      await c.forEach(d => { items.push(d); return items.length < 2; });
      assert.strictEqual(items.length, 2);
    });

    it('should apply transform', async () => {
      const items = [];
      const c = new AggregationCursor(createMockCollection([{ n: 'A' }]), []);
      c.map(d => d.n);
      await c.forEach(n => items.push(n));
      assert.deepStrictEqual(items, ['A']);
    });
  });

  describe('close', () => {
    it('should mark as closed and clear results', async () => {
      const c = new AggregationCursor(createMockCollection([{ a: 1 }]), []);
      await c.toArray();
      await c.close();
      assert.ok(c._closed);
      assert.strictEqual(c._results, null);
    });
  });

  describe('explain', () => {
    it('should return SQL plan', async () => {
      const c = new AggregationCursor(createMockCollection(), [{ $match: { x: 1 } }]);
      const plan = await c.explain();
      assert.ok(plan.queryPlanner);
      assert.ok(plan.queryPlanner.sql);
    });
  });

  describe('async iterator', () => {
    it('should support for-await-of', async () => {
      const c = new AggregationCursor(createMockCollection([{ a: 1 }, { b: 2 }]), []);
      const items = [];
      for await (const doc of c) {
        items.push(doc);
      }
      assert.strictEqual(items.length, 2);
    });

    it('should stop when closed', async () => {
      const c = new AggregationCursor(createMockCollection([{ a: 1 }, { b: 2 }, { c: 3 }]), []);
      const items = [];
      for await (const doc of c) {
        items.push(doc);
        if (items.length === 2) await c.close();
      }
      assert.strictEqual(items.length, 2);
    });

    it('should apply transform', async () => {
      const c = new AggregationCursor(createMockCollection([{ n: 'X' }, { n: 'Y' }]), []);
      c.map(d => d.n);
      const items = [];
      for await (const n of c) items.push(n);
      assert.deepStrictEqual(items, ['X', 'Y']);
    });
  });

  describe('stream', () => {
    it('should return a readable stream', () => {
      const c = new AggregationCursor(createMockCollection(), []);
      const s = c.stream();
      assert.ok(typeof s.pipe === 'function');
    });
  });

  describe('pipeline getter', () => {
    it('should reflect mutations from fluent builders', () => {
      const c = new AggregationCursor(createMockCollection(), []);
      c.match({ x: 1 }).sort({ y: -1 });
      assert.strictEqual(c.pipeline.length, 2);
    });
  });

  describe('clone and rewind', () => {
    it('clone should create independent cursor', async () => {
      const c = new AggregationCursor(createMockCollection([{ a: 1 }]), [{ $match: {} }]);
      await c.toArray();
      const c2 = c.clone();
      assert.strictEqual(c2._executed, false);
      assert.notStrictEqual(c, c2);
      assert.deepStrictEqual(c2._pipeline, c._pipeline);
    });

    it('rewind should allow re-execution', async () => {
      let count = 0;
      const col = {
        _name: 'test', _db: { _schemaName: null },
        _executeAggregate: async () => { count++; return [{ x: count }]; }
      };
      const c = new AggregationCursor(col, []);
      const r1 = await c.toArray();
      c.rewind();
      const r2 = await c.toArray();
      assert.strictEqual(count, 2);
    });
  });
});
