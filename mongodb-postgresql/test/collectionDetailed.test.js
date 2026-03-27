'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert');
const { Collection } = require('../lib/collection');
const { ObjectId } = require('../lib/objectId');

/**
 * Create a mock db with configurable query responses.
 * responder(sql, params) should return { rows, rowCount }.
 */
function createMockDb(responder) {
  const queries = [];
  const pool = {
    query: async (sql, params) => {
      queries.push({ sql, params });
      if (responder) return responder(sql, params);
      if (sql.includes('CREATE')) return { rows: [], rowCount: 0 };
      return { rows: [], rowCount: 0 };
    }
  };
  return {
    _client: { _pool: pool },
    _dbName: 'test',
    _schemaName: 'test',
    _getPool: () => pool,
    _queries: queries
  };
}

describe('Collection detailed coverage', () => {
  describe('hint getter/setter', () => {
    it('should get and set hint', () => {
      const db = createMockDb();
      const col = new Collection(db, 'users');
      assert.strictEqual(col.hint, null);
      col.hint = { name: 1 };
      assert.deepStrictEqual(col.hint, { name: 1 });
    });
  });

  describe('insertOne with various _id types', () => {
    it('should handle string _id', async () => {
      const db = createMockDb();
      const col = new Collection(db, 'users');
      const result = await col.insertOne({ _id: 'custom-string', name: 'Test' });
      assert.strictEqual(result.insertedId, 'custom-string');
    });

    it('should handle numeric _id', async () => {
      const db = createMockDb();
      const col = new Collection(db, 'users');
      const result = await col.insertOne({ _id: 42, name: 'Test' });
      assert.strictEqual(result.insertedId, 42);
    });
  });

  describe('insertMany ordered vs unordered', () => {
    it('ordered should generate single multi-row INSERT', async () => {
      const db = createMockDb();
      const col = new Collection(db, 'users');
      await col.insertMany([{ name: 'A' }, { name: 'B' }, { name: 'C' }]);
      const inserts = db._queries.filter(q => q.sql.includes('INSERT INTO') && q.sql.includes('VALUES'));
      // Single insert with multiple value tuples
      assert.strictEqual(inserts.length, 1);
    });

    it('unordered should silently skip errors', async () => {
      let callCount = 0;
      const db = createMockDb((sql) => {
        if (sql.includes('CREATE') || sql.includes('INDEX')) return { rows: [], rowCount: 0 };
        if (sql.includes('INSERT')) {
          callCount++;
          if (callCount === 2) {
            const err = new Error('dup'); err.code = '23505'; throw err;
          }
          return { rows: [], rowCount: 1 };
        }
        return { rows: [], rowCount: 0 };
      });
      const col = new Collection(db, 'users');
      const result = await col.insertMany(
        [{ name: 'A' }, { name: 'B' }, { name: 'C' }],
        { ordered: false }
      );
      // Should have tried all 3 even though one failed
      assert.strictEqual(result.insertedCount, 3);
    });
  });

  describe('findOneAndUpdate', () => {
    it('should return original doc by default', async () => {
      let callIdx = 0;
      const db = createMockDb((sql) => {
        if (sql.includes('CREATE') || sql.includes('INDEX')) return { rows: [], rowCount: 0 };
        callIdx++;
        // First SELECT finds the doc
        if (sql.includes('SELECT _id, data') && sql.includes('LIMIT 1') && callIdx <= 4) {
          return { rows: [{ _id: 'abc', data: { name: 'Original', age: 25 } }], rowCount: 1 };
        }
        // UPDATE RETURNING
        if (sql.includes('UPDATE') && sql.includes('RETURNING')) {
          return { rows: [{ _id: 'abc', data: { name: 'Original', age: 26 } }], rowCount: 1 };
        }
        return { rows: [], rowCount: 0 };
      });
      const col = new Collection(db, 'users');
      const result = await col.findOneAndUpdate(
        { _id: 'abc' },
        { $inc: { age: 1 } }
      );
      assert.strictEqual(result.value._id, 'abc');
      assert.strictEqual(result.ok, 1);
    });

    it('should return new doc with returnDocument: after', async () => {
      let callIdx = 0;
      const db = createMockDb((sql) => {
        if (sql.includes('CREATE') || sql.includes('INDEX')) return { rows: [], rowCount: 0 };
        callIdx++;
        if (sql.includes('SELECT _id, data') && sql.includes('LIMIT 1') && callIdx <= 4) {
          return { rows: [{ _id: 'abc', data: { name: 'Old' } }], rowCount: 1 };
        }
        if (sql.includes('UPDATE') && sql.includes('RETURNING')) {
          return { rows: [{ _id: 'abc', data: { name: 'New' } }], rowCount: 1 };
        }
        return { rows: [], rowCount: 0 };
      });
      const col = new Collection(db, 'users');
      const result = await col.findOneAndUpdate(
        { _id: 'abc' },
        { $set: { name: 'New' } },
        { returnDocument: 'after' }
      );
      assert.strictEqual(result.value.name, 'New');
    });

    it('should return null when not found and no upsert', async () => {
      const db = createMockDb();
      const col = new Collection(db, 'users');
      const result = await col.findOneAndUpdate(
        { _id: 'nonexistent' },
        { $set: { name: 'test' } }
      );
      assert.strictEqual(result.value, null);
    });
  });

  describe('findOneAndDelete with sort', () => {
    it('should delete and return the document', async () => {
      const db = createMockDb((sql) => {
        if (sql.includes('CREATE') || sql.includes('INDEX')) return { rows: [], rowCount: 0 };
        if (sql.includes('DELETE') && sql.includes('RETURNING')) {
          return { rows: [{ _id: 'del1', data: { name: 'Deleted' } }], rowCount: 1 };
        }
        return { rows: [], rowCount: 0 };
      });
      const col = new Collection(db, 'users');
      const result = await col.findOneAndDelete({ status: 'old' });
      assert.strictEqual(result.value.name, 'Deleted');
      assert.strictEqual(result.ok, 1);
    });
  });

  describe('updateOne with upsert', () => {
    it('should create document when not found and upsert is true', async () => {
      const db = createMockDb((sql, params) => {
        if (sql.includes('CREATE') || sql.includes('INDEX')) return { rows: [], rowCount: 0 };
        if (sql.includes('SELECT _id FROM')) return { rows: [], rowCount: 0 };
        if (sql.includes('INSERT')) return { rows: [], rowCount: 1 };
        if (sql.includes('pg_notify')) return { rows: [], rowCount: 0 };
        return { rows: [], rowCount: 0 };
      });
      const col = new Collection(db, 'users');
      const result = await col.updateOne(
        { name: 'NewUser' },
        { $set: { age: 25 } },
        { upsert: true }
      );
      assert.ok(result.upsertedId);
      assert.strictEqual(result.upsertedCount, 1);
    });
  });

  describe('updateMany with upsert', () => {
    it('should upsert when no docs match', async () => {
      const db = createMockDb((sql) => {
        if (sql.includes('CREATE') || sql.includes('INDEX')) return { rows: [], rowCount: 0 };
        if (sql.includes('UPDATE')) return { rows: [], rowCount: 0 };
        if (sql.includes('INSERT')) return { rows: [], rowCount: 1 };
        return { rows: [], rowCount: 0 };
      });
      const col = new Collection(db, 'users');
      const result = await col.updateMany(
        { status: 'new' },
        { $set: { active: true } },
        { upsert: true }
      );
      assert.ok(result.upsertedId);
    });
  });

  describe('replaceOne', () => {
    it('should replace document data', async () => {
      let callIdx = 0;
      const db = createMockDb((sql) => {
        if (sql.includes('CREATE') || sql.includes('INDEX')) return { rows: [], rowCount: 0 };
        callIdx++;
        if (sql.includes('SELECT _id FROM')) return { rows: [{ _id: 'r1' }], rowCount: 1 };
        if (sql.includes('UPDATE')) return { rows: [], rowCount: 1 };
        return { rows: [], rowCount: 0 };
      });
      const col = new Collection(db, 'users');
      const result = await col.replaceOne(
        { _id: 'r1' },
        { name: 'Replaced', age: 99 }
      );
      assert.strictEqual(result.matchedCount, 1);
      assert.strictEqual(result.modifiedCount, 1);
    });

    it('should upsert when not found', async () => {
      const db = createMockDb((sql) => {
        if (sql.includes('CREATE') || sql.includes('INDEX')) return { rows: [], rowCount: 0 };
        if (sql.includes('SELECT _id FROM')) return { rows: [], rowCount: 0 };
        if (sql.includes('INSERT')) return { rows: [], rowCount: 1 };
        return { rows: [], rowCount: 0 };
      });
      const col = new Collection(db, 'users');
      const result = await col.replaceOne(
        { _id: 'new1' },
        { name: 'New' },
        { upsert: true }
      );
      assert.strictEqual(result.upsertedCount, 1);
    });

    it('should return 0 counts when not found and no upsert', async () => {
      const db = createMockDb((sql) => {
        if (sql.includes('CREATE') || sql.includes('INDEX')) return { rows: [], rowCount: 0 };
        if (sql.includes('SELECT')) return { rows: [], rowCount: 0 };
        return { rows: [], rowCount: 0 };
      });
      const col = new Collection(db, 'users');
      const result = await col.replaceOne({ _id: 'x' }, { name: 'Y' });
      assert.strictEqual(result.matchedCount, 0);
    });
  });

  describe('count (deprecated)', () => {
    it('should delegate to countDocuments', async () => {
      const db = createMockDb((sql) => {
        if (sql.includes('CREATE') || sql.includes('INDEX')) return { rows: [], rowCount: 0 };
        if (sql.includes('COUNT')) return { rows: [{ count: 17 }] };
        return { rows: [], rowCount: 0 };
      });
      const col = new Collection(db, 'users');
      assert.strictEqual(await col.count(), 17);
    });
  });

  describe('estimatedDocumentCount', () => {
    it('should use pg_class for fast estimate', async () => {
      const db = createMockDb((sql) => {
        if (sql.includes('CREATE') || sql.includes('INDEX')) return { rows: [], rowCount: 0 };
        if (sql.includes('reltuples')) return { rows: [{ count: 1000000 }] };
        return { rows: [], rowCount: 0 };
      });
      const col = new Collection(db, 'users');
      const count = await col.estimatedDocumentCount();
      assert.strictEqual(count, 1000000);
    });

    it('should fallback to countDocuments when reltuples unavailable', async () => {
      const db = createMockDb((sql) => {
        if (sql.includes('CREATE') || sql.includes('INDEX')) return { rows: [], rowCount: 0 };
        if (sql.includes('reltuples')) return { rows: [{ count: -1 }] };
        if (sql.includes('COUNT')) return { rows: [{ count: 42 }] };
        return { rows: [], rowCount: 0 };
      });
      const col = new Collection(db, 'users');
      assert.strictEqual(await col.estimatedDocumentCount(), 42);
    });
  });

  describe('distinct', () => {
    it('should parse JSON values', async () => {
      const db = createMockDb((sql) => {
        if (sql.includes('CREATE') || sql.includes('INDEX')) return { rows: [], rowCount: 0 };
        if (sql.includes('DISTINCT')) {
          return { rows: [{ value: '42' }, { value: 'true' }, { value: 'hello' }] };
        }
        return { rows: [], rowCount: 0 };
      });
      const col = new Collection(db, 'users');
      const values = await col.distinct('field');
      assert.strictEqual(values[0], 42); // parsed from '42'
      assert.strictEqual(values[1], true); // parsed from 'true'
      assert.strictEqual(values[2], 'hello');
    });

    it('should filter out null values', async () => {
      const db = createMockDb((sql) => {
        if (sql.includes('CREATE') || sql.includes('INDEX')) return { rows: [], rowCount: 0 };
        if (sql.includes('DISTINCT')) {
          return { rows: [{ value: 'a' }, { value: null }] };
        }
        return { rows: [], rowCount: 0 };
      });
      const col = new Collection(db, 'users');
      const values = await col.distinct('field');
      assert.deepStrictEqual(values, ['a']);
    });
  });

  describe('stats', () => {
    it('should return collection stats', async () => {
      const db = createMockDb((sql) => {
        if (sql.includes('CREATE') || sql.includes('INDEX')) return { rows: [], rowCount: 0 };
        if (sql.includes('COUNT')) return { rows: [{ count: 100 }] };
        if (sql.includes('pg_total_relation_size')) return { rows: [{ size: 8192 }] };
        return { rows: [], rowCount: 0 };
      });
      const col = new Collection(db, 'users');
      const stats = await col.stats();
      assert.strictEqual(stats.ns, 'test.users');
      assert.strictEqual(stats.count, 100);
      assert.strictEqual(stats.size, 8192);
      assert.strictEqual(stats.ok, 1);
    });
  });

  describe('options', () => {
    it('should return stored options', async () => {
      const db = createMockDb();
      const col = new Collection(db, 'users', { capped: true });
      const opts = await col.options();
      assert.deepStrictEqual(opts, { capped: true });
    });
  });

  describe('_applyPostProcessStages', () => {
    it('should handle $sort in post-processing', () => {
      const db = createMockDb();
      const col = new Collection(db, 'users');
      const docs = [{ a: 3 }, { a: 1 }, { a: 2 }];
      const result = col._applyPostProcessStages(docs, [{ $sort: { a: 1 } }]);
      assert.deepStrictEqual(result.map(d => d.a), [1, 2, 3]);
    });

    it('should handle $sort descending', () => {
      const db = createMockDb();
      const col = new Collection(db, 'users');
      const docs = [{ a: 1 }, { a: 3 }, { a: 2 }];
      const result = col._applyPostProcessStages(docs, [{ $sort: { a: -1 } }]);
      assert.deepStrictEqual(result.map(d => d.a), [3, 2, 1]);
    });

    it('should handle $limit in post-processing', () => {
      const db = createMockDb();
      const col = new Collection(db, 'users');
      const result = col._applyPostProcessStages([1, 2, 3, 4, 5], [{ $limit: 3 }]);
      assert.strictEqual(result.length, 3);
    });

    it('should handle $skip in post-processing', () => {
      const db = createMockDb();
      const col = new Collection(db, 'users');
      const result = col._applyPostProcessStages([1, 2, 3, 4, 5], [{ $skip: 2 }]);
      assert.deepStrictEqual(result, [3, 4, 5]);
    });

    it('should handle $unwind in post-processing', () => {
      const db = createMockDb();
      const col = new Collection(db, 'users');
      const docs = [{ tags: ['a', 'b'] }, { tags: ['c'] }];
      const result = col._applyPostProcessStages(docs, [{ $unwind: '$tags' }]);
      assert.strictEqual(result.length, 3);
      assert.strictEqual(result[0].tags, 'a');
      assert.strictEqual(result[1].tags, 'b');
      assert.strictEqual(result[2].tags, 'c');
    });

    it('should handle $unwind with preserveNullAndEmptyArrays', () => {
      const db = createMockDb();
      const col = new Collection(db, 'users');
      const docs = [{ tags: ['a'] }, { tags: [] }, { name: 'no tags' }];
      const result = col._applyPostProcessStages(docs, [
        { $unwind: { path: '$tags', preserveNullAndEmptyArrays: true } }
      ]);
      // First doc unwound, second and third preserved
      assert.strictEqual(result.length, 3);
    });

    it('should handle $unwind with includeArrayIndex', () => {
      const db = createMockDb();
      const col = new Collection(db, 'users');
      const docs = [{ items: ['x', 'y', 'z'] }];
      const result = col._applyPostProcessStages(docs, [
        { $unwind: { path: '$items', includeArrayIndex: 'idx' } }
      ]);
      assert.strictEqual(result.length, 3);
      assert.strictEqual(result[0].idx, 0);
      assert.strictEqual(result[1].idx, 1);
      assert.strictEqual(result[2].idx, 2);
    });

    it('should handle $match in post-processing', () => {
      const db = createMockDb();
      const col = new Collection(db, 'users');
      const docs = [{ a: 1 }, { a: 2 }, { a: 3 }];
      const result = col._applyPostProcessStages(docs, [{ $match: { a: { $gt: 1 } } }]);
      assert.strictEqual(result.length, 2);
    });

    it('should handle $project in post-processing', () => {
      const db = createMockDb();
      const col = new Collection(db, 'users');
      const docs = [{ _id: '1', name: 'Alice', age: 30, secret: 'x' }];
      const result = col._applyPostProcessStages(docs, [{ $project: { name: 1, age: 1 } }]);
      assert.strictEqual(result[0].name, 'Alice');
      assert.strictEqual(result[0].age, 30);
      assert.strictEqual(result[0].secret, undefined);
    });

    it('should handle $facet in post-processing', () => {
      const db = createMockDb();
      const col = new Collection(db, 'users');
      const docs = [{ a: 1 }, { a: 2 }, { a: 3 }];
      const result = col._applyPostProcessStages(docs, [{
        $facet: {
          all: [],
          limited: [{ $limit: 2 }]
        }
      }]);
      assert.strictEqual(result.length, 1);
      assert.strictEqual(result[0].all.length, 3);
      assert.strictEqual(result[0].limited.length, 2);
    });
  });

  describe('_notifyChange', () => {
    it('should call pg_notify', async () => {
      const db = createMockDb((sql) => {
        return { rows: [], rowCount: 0 };
      });
      const col = new Collection(db, 'users');
      // Should not throw even with mock
      await col._notifyChange('insert', 'doc1', db._getPool());
      assert.ok(db._queries.some(q => q.sql.includes('pg_notify')));
    });

    it('should not throw on error', async () => {
      const db = createMockDb((sql) => {
        if (sql.includes('pg_notify')) throw new Error('notify failed');
        return { rows: [], rowCount: 0 };
      });
      const col = new Collection(db, 'users');
      // Should swallow the error
      await col._notifyChange('update', 'doc1', db._getPool());
    });
  });
});
