'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert');
const { Cursor } = require('../lib/cursor');

function createMockCollection(docs = []) {
  return {
    _name: 'test',
    _tableName: () => '"test"',
    _db: { _schemaName: null },
    countDocuments: async () => docs.length,
    _executeFind: async (filter, projection, sort, skip, limit) => {
      let result = [...docs];
      if (limit > 0) result = result.slice(0, limit);
      if (skip > 0) result = result.slice(skip);
      return result;
    }
  };
}

describe('Cursor', () => {
  describe('constructor', () => {
    it('should create a lazy cursor', () => {
      const cursor = new Cursor(createMockCollection(), {});
      assert.strictEqual(cursor._executed, false);
      assert.strictEqual(cursor._closed, false);
    });
  });

  describe('chainable methods', () => {
    it('filter() should return this', () => {
      const cursor = new Cursor(createMockCollection(), {});
      assert.strictEqual(cursor.filter({ a: 1 }), cursor);
      assert.deepStrictEqual(cursor._filter, { a: 1 });
    });

    it('project() should return this', () => {
      const cursor = new Cursor(createMockCollection(), {});
      assert.strictEqual(cursor.project({ name: 1 }), cursor);
      assert.deepStrictEqual(cursor._projection, { name: 1 });
    });

    it('sort() should return this', () => {
      const cursor = new Cursor(createMockCollection(), {});
      assert.strictEqual(cursor.sort({ name: 1 }), cursor);
      assert.deepStrictEqual(cursor._sortSpec, { name: 1 });
    });

    it('skip() should return this', () => {
      const cursor = new Cursor(createMockCollection(), {});
      assert.strictEqual(cursor.skip(10), cursor);
      assert.strictEqual(cursor._skipVal, 10);
    });

    it('limit() should return this', () => {
      const cursor = new Cursor(createMockCollection(), {});
      assert.strictEqual(cursor.limit(5), cursor);
      assert.strictEqual(cursor._limitVal, 5);
    });

    it('batchSize() should return this', () => {
      const cursor = new Cursor(createMockCollection(), {});
      assert.strictEqual(cursor.batchSize(100), cursor);
      assert.strictEqual(cursor._batchSize, 100);
    });

    it('hint() should return this', () => {
      const cursor = new Cursor(createMockCollection(), {});
      assert.strictEqual(cursor.hint({ name: 1 }), cursor);
    });

    it('comment() should return this', () => {
      const cursor = new Cursor(createMockCollection(), {});
      assert.strictEqual(cursor.comment('test'), cursor);
    });

    it('maxTimeMS() should return this', () => {
      const cursor = new Cursor(createMockCollection(), {});
      assert.strictEqual(cursor.maxTimeMS(5000), cursor);
    });

    it('collation() should return this', () => {
      const cursor = new Cursor(createMockCollection(), {});
      assert.strictEqual(cursor.collation({ locale: 'en' }), cursor);
    });

    it('min() should return this', () => {
      const cursor = new Cursor(createMockCollection(), {});
      assert.strictEqual(cursor.min({ age: 18 }), cursor);
    });

    it('max() should return this', () => {
      const cursor = new Cursor(createMockCollection(), {});
      assert.strictEqual(cursor.max({ age: 65 }), cursor);
    });

    it('returnKey() should return this', () => {
      const cursor = new Cursor(createMockCollection(), {});
      assert.strictEqual(cursor.returnKey(true), cursor);
    });

    it('showRecordId() should return this', () => {
      const cursor = new Cursor(createMockCollection(), {});
      assert.strictEqual(cursor.showRecordId(true), cursor);
    });

    it('addCursorFlag() should return this', () => {
      const cursor = new Cursor(createMockCollection(), {});
      assert.strictEqual(cursor.addCursorFlag('tailable', true), cursor);
      assert.strictEqual(cursor._tailable, true);
    });

    it('map() should return this', () => {
      const cursor = new Cursor(createMockCollection(), {});
      const fn = (doc) => doc.name;
      assert.strictEqual(cursor.map(fn), cursor);
      assert.strictEqual(cursor._transform, fn);
    });
  });

  describe('toArray', () => {
    it('should return all documents', async () => {
      const docs = [{ name: 'A' }, { name: 'B' }, { name: 'C' }];
      const cursor = new Cursor(createMockCollection(docs), {});
      const result = await cursor.toArray();
      assert.strictEqual(result.length, 3);
      assert.deepStrictEqual(result, docs);
    });

    it('should return empty array when no results', async () => {
      const cursor = new Cursor(createMockCollection([]), {});
      const result = await cursor.toArray();
      assert.deepStrictEqual(result, []);
    });

    it('should apply transform function', async () => {
      const docs = [{ name: 'Alice' }, { name: 'Bob' }];
      const cursor = new Cursor(createMockCollection(docs), {});
      cursor.map(doc => doc.name);
      const result = await cursor.toArray();
      assert.deepStrictEqual(result, ['Alice', 'Bob']);
    });

    it('should only execute once', async () => {
      let executeCount = 0;
      const col = {
        ...createMockCollection([{ a: 1 }]),
        _executeFind: async () => { executeCount++; return [{ a: 1 }]; }
      };
      const cursor = new Cursor(col, {});
      await cursor.toArray();
      await cursor.toArray();
      assert.strictEqual(executeCount, 1);
    });
  });

  describe('next', () => {
    it('should return documents one by one', async () => {
      const docs = [{ a: 1 }, { b: 2 }];
      const cursor = new Cursor(createMockCollection(docs), {});
      assert.deepStrictEqual(await cursor.next(), { a: 1 });
      assert.deepStrictEqual(await cursor.next(), { b: 2 });
      assert.strictEqual(await cursor.next(), null);
    });

    it('should apply transform', async () => {
      const docs = [{ name: 'Alice' }];
      const cursor = new Cursor(createMockCollection(docs), {});
      cursor.map(d => d.name);
      assert.strictEqual(await cursor.next(), 'Alice');
    });
  });

  describe('hasNext', () => {
    it('should return true when documents remain', async () => {
      const cursor = new Cursor(createMockCollection([{ a: 1 }]), {});
      assert.ok(await cursor.hasNext());
    });

    it('should return false when exhausted', async () => {
      const cursor = new Cursor(createMockCollection([{ a: 1 }]), {});
      await cursor.next();
      assert.ok(!(await cursor.hasNext()));
    });

    it('should return false for empty results', async () => {
      const cursor = new Cursor(createMockCollection([]), {});
      assert.ok(!(await cursor.hasNext()));
    });
  });

  describe('count', () => {
    it('should delegate to collection countDocuments', async () => {
      const docs = [{ a: 1 }, { b: 2 }, { c: 3 }];
      const cursor = new Cursor(createMockCollection(docs), {});
      assert.strictEqual(await cursor.count(), 3);
    });
  });

  describe('forEach', () => {
    it('should iterate all documents', async () => {
      const docs = [{ a: 1 }, { b: 2 }];
      const cursor = new Cursor(createMockCollection(docs), {});
      const collected = [];
      await cursor.forEach(doc => collected.push(doc));
      assert.deepStrictEqual(collected, docs);
    });

    it('should stop when callback returns false', async () => {
      const docs = [{ a: 1 }, { b: 2 }, { c: 3 }];
      const cursor = new Cursor(createMockCollection(docs), {});
      const collected = [];
      await cursor.forEach(doc => {
        collected.push(doc);
        if (doc.b === 2) return false;
      });
      assert.strictEqual(collected.length, 2);
    });

    it('should apply transform', async () => {
      const docs = [{ name: 'A' }, { name: 'B' }];
      const cursor = new Cursor(createMockCollection(docs), {});
      cursor.map(d => d.name);
      const collected = [];
      await cursor.forEach(name => collected.push(name));
      assert.deepStrictEqual(collected, ['A', 'B']);
    });
  });

  describe('close', () => {
    it('should mark cursor as closed', async () => {
      const cursor = new Cursor(createMockCollection([]), {});
      await cursor.close();
      assert.strictEqual(cursor._closed, true);
    });

    it('should clear results', async () => {
      const cursor = new Cursor(createMockCollection([{ a: 1 }]), {});
      await cursor.toArray();
      await cursor.close();
      assert.strictEqual(cursor._results, null);
    });
  });

  describe('clone', () => {
    it('should create new cursor with same config', () => {
      const cursor = new Cursor(createMockCollection([]), {});
      cursor.sort({ a: 1 }).skip(5).limit(10).project({ name: 1 });
      cursor.map(d => d.name);

      const cloned = cursor.clone();
      assert.notStrictEqual(cursor, cloned);
      assert.deepStrictEqual(cloned._sortSpec, { a: 1 });
      assert.strictEqual(cloned._skipVal, 5);
      assert.strictEqual(cloned._limitVal, 10);
      assert.deepStrictEqual(cloned._projection, { name: 1 });
      assert.strictEqual(cloned._transform, cursor._transform);
    });

    it('cloned cursor should not be executed', () => {
      const cursor = new Cursor(createMockCollection([]), {});
      cursor._executed = true;
      const cloned = cursor.clone();
      assert.strictEqual(cloned._executed, false);
    });
  });

  describe('rewind', () => {
    it('should reset cursor state', async () => {
      const docs = [{ a: 1 }, { b: 2 }];
      const cursor = new Cursor(createMockCollection(docs), {});
      await cursor.toArray();
      assert.strictEqual(cursor._executed, true);

      cursor.rewind();
      assert.strictEqual(cursor._executed, false);
      assert.strictEqual(cursor._index, 0);
      assert.strictEqual(cursor._results, null);
    });

    it('should return this', () => {
      const cursor = new Cursor(createMockCollection([]), {});
      assert.strictEqual(cursor.rewind(), cursor);
    });

    it('should allow re-execution after rewind', async () => {
      const docs = [{ a: 1 }];
      const cursor = new Cursor(createMockCollection(docs), {});
      const r1 = await cursor.toArray();
      cursor.rewind();
      const r2 = await cursor.toArray();
      assert.deepStrictEqual(r1, r2);
    });
  });

  describe('async iterator', () => {
    it('should support for-await-of', async () => {
      const docs = [{ a: 1 }, { b: 2 }, { c: 3 }];
      const cursor = new Cursor(createMockCollection(docs), {});
      const collected = [];
      for await (const doc of cursor) {
        collected.push(doc);
      }
      assert.deepStrictEqual(collected, docs);
    });

    it('should apply transform in async iterator', async () => {
      const docs = [{ name: 'A' }, { name: 'B' }];
      const cursor = new Cursor(createMockCollection(docs), {});
      cursor.map(d => d.name);
      const collected = [];
      for await (const name of cursor) {
        collected.push(name);
      }
      assert.deepStrictEqual(collected, ['A', 'B']);
    });

    it('should stop when cursor is closed', async () => {
      const docs = [{ a: 1 }, { b: 2 }, { c: 3 }];
      const cursor = new Cursor(createMockCollection(docs), {});
      const collected = [];
      for await (const doc of cursor) {
        collected.push(doc);
        if (collected.length === 2) await cursor.close();
      }
      assert.strictEqual(collected.length, 2);
    });
  });

  describe('stream', () => {
    it('should return a readable stream', () => {
      const cursor = new Cursor(createMockCollection([]), {});
      const stream = cursor.stream();
      assert.ok(stream);
      assert.ok(typeof stream.pipe === 'function');
      assert.ok(typeof stream.read === 'function');
    });
  });

  describe('explain', () => {
    it('should return SQL query plan', async () => {
      const cursor = new Cursor(createMockCollection([]), { name: 'test' });
      const plan = await cursor.explain();
      assert.ok(plan.queryPlanner);
      assert.ok(plan.queryPlanner.sql);
      assert.ok(plan.queryPlanner.sql.includes('SELECT'));
    });
  });
});
