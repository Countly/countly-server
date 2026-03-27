'use strict';

const { describe, it, beforeEach } = require('node:test');
const assert = require('node:assert');
const { Collection } = require('../lib/collection');
const { ObjectId } = require('../lib/objectId');
const { Cursor } = require('../lib/cursor');
const { AggregationCursor } = require('../lib/aggregationCursor');

/**
 * These tests use a mock pool to verify SQL generation and document
 * transformation without a live PostgreSQL connection.
 */
function createMockDb(rows = []) {
  const queries = [];
  const pool = {
    query: async (sql, params) => {
      queries.push({ sql, params });
      // Return matching rows for SELECT queries
      if (sql.includes('SELECT')) {
        return { rows: rows, rowCount: rows.length };
      }
      // For INSERT/UPDATE/DELETE, return rowCount
      return { rows: [], rowCount: rows.length || 1 };
    }
  };
  return {
    _client: { _pool: pool },
    _dbName: 'testdb',
    _schemaName: 'testdb',
    _getPool: () => pool,
    _queries: queries,
    collection: (name) => new Collection({ _client: { _pool: pool }, _dbName: 'testdb', _schemaName: 'testdb', _getPool: () => pool }, name)
  };
}

describe('Collection', () => {
  describe('properties', () => {
    it('should expose collectionName', () => {
      const db = createMockDb();
      const col = new Collection(db, 'users');
      assert.strictEqual(col.collectionName, 'users');
    });

    it('should expose dbName', () => {
      const db = createMockDb();
      const col = new Collection(db, 'users');
      assert.strictEqual(col.dbName, 'testdb');
    });

    it('should expose namespace', () => {
      const db = createMockDb();
      const col = new Collection(db, 'users');
      assert.strictEqual(col.namespace, 'testdb.users');
    });

    it('should generate correct table name with schema', () => {
      const db = createMockDb();
      const col = new Collection(db, 'users');
      assert.strictEqual(col._tableName(), '"testdb"."users"');
    });

    it('should generate table name without schema', () => {
      const db = { ...createMockDb(), _schemaName: null };
      const col = new Collection(db, 'users');
      assert.strictEqual(col._tableName(), '"users"');
    });
  });

  describe('_ensureTable', () => {
    it('should create table with _id and data columns', async () => {
      const db = createMockDb();
      const col = new Collection(db, 'users');
      await col._ensureTable();
      assert.ok(db._queries.some(q => q.sql.includes('CREATE TABLE')));
      assert.ok(db._queries.some(q => q.sql.includes('_id TEXT PRIMARY KEY')));
      assert.ok(db._queries.some(q => q.sql.includes('JSONB')));
    });

    it('should create GIN index', async () => {
      const db = createMockDb();
      const col = new Collection(db, 'users');
      await col._ensureTable();
      assert.ok(db._queries.some(q => q.sql.includes('GIN')));
    });

    it('should only run once', async () => {
      const db = createMockDb();
      const col = new Collection(db, 'users');
      await col._ensureTable();
      const count1 = db._queries.length;
      await col._ensureTable();
      assert.strictEqual(db._queries.length, count1);
    });
  });

  describe('insertOne', () => {
    it('should generate INSERT statement', async () => {
      const db = createMockDb();
      const col = new Collection(db, 'users');
      const result = await col.insertOne({ name: 'Alice', age: 30 });

      assert.ok(result.acknowledged);
      assert.ok(result.insertedId);
      assert.ok(db._queries.some(q => q.sql.includes('INSERT INTO')));
    });

    it('should auto-generate ObjectId when _id is missing', async () => {
      const db = createMockDb();
      const col = new Collection(db, 'users');
      const result = await col.insertOne({ name: 'Alice' });
      assert.ok(result.insertedId instanceof ObjectId);
    });

    it('should use provided _id', async () => {
      const db = createMockDb();
      const col = new Collection(db, 'users');
      const result = await col.insertOne({ _id: 'custom-id', name: 'Alice' });
      assert.strictEqual(result.insertedId, 'custom-id');
    });

    it('should use provided ObjectId', async () => {
      const db = createMockDb();
      const col = new Collection(db, 'users');
      const oid = new ObjectId();
      const result = await col.insertOne({ _id: oid, name: 'Alice' });
      assert.strictEqual(result.insertedId, oid);
    });

    it('should throw MongoServerError 11000 on duplicate', async () => {
      const pool = {
        query: async () => { const e = new Error('dup'); e.code = '23505'; throw e; }
      };
      const db = {
        _client: { _pool: pool }, _dbName: 'test', _schemaName: 'test', _getPool: () => pool
      };
      const col = new Collection(db, 'users');
      col._initialized = true;

      await assert.rejects(
        () => col.insertOne({ _id: 'dup', name: 'test' }),
        (err) => {
          assert.strictEqual(err.code, 11000);
          assert.ok(err.message.includes('E11000'));
          return true;
        }
      );
    });
  });

  describe('insertMany', () => {
    it('should insert multiple documents', async () => {
      const db = createMockDb();
      const col = new Collection(db, 'users');
      const result = await col.insertMany([
        { name: 'Alice' },
        { name: 'Bob' },
        { name: 'Charlie' }
      ]);

      assert.strictEqual(result.insertedCount, 3);
      assert.ok(result.insertedIds[0] instanceof ObjectId);
      assert.ok(result.insertedIds[1] instanceof ObjectId);
      assert.ok(result.insertedIds[2] instanceof ObjectId);
    });

    it('should generate multi-row INSERT for ordered', async () => {
      const db = createMockDb();
      const col = new Collection(db, 'users');
      await col.insertMany([{ name: 'A' }, { name: 'B' }]);
      const insertQuery = db._queries.find(q => q.sql.includes('INSERT INTO') && q.sql.includes('VALUES'));
      assert.ok(insertQuery);
    });

    it('should use individual INSERTs for unordered', async () => {
      const db = createMockDb();
      const col = new Collection(db, 'users');
      await col.insertMany([{ name: 'A' }, { name: 'B' }], { ordered: false });
      const insertQueries = db._queries.filter(q => q.sql.includes('INSERT INTO'));
      // Should have individual inserts (one per doc) plus the CREATE TABLE
      assert.ok(insertQueries.length >= 2);
    });
  });

  describe('find', () => {
    it('should return a Cursor', () => {
      const db = createMockDb();
      const col = new Collection(db, 'users');
      const cursor = col.find({ status: 'active' });
      assert.ok(cursor instanceof Cursor);
    });

    it('cursor should be chainable', () => {
      const db = createMockDb();
      const col = new Collection(db, 'users');
      const cursor = col.find({})
        .sort({ name: 1 })
        .skip(10)
        .limit(5)
        .project({ name: 1 });
      assert.ok(cursor instanceof Cursor);
      assert.strictEqual(cursor._skipVal, 10);
      assert.strictEqual(cursor._limitVal, 5);
    });
  });

  describe('findOne', () => {
    it('should return single document', async () => {
      const db = createMockDb([{ _id: '1', data: { name: 'Alice', age: 30 } }]);
      const col = new Collection(db, 'users');
      const doc = await col.findOne({ name: 'Alice' });
      assert.strictEqual(doc._id, '1');
      assert.strictEqual(doc.name, 'Alice');
      assert.strictEqual(doc.age, 30);
    });

    it('should return null when not found', async () => {
      const db = createMockDb([]);
      const col = new Collection(db, 'users');
      const doc = await col.findOne({ name: 'Nobody' });
      assert.strictEqual(doc, null);
    });

    it('should add LIMIT 1 to query', async () => {
      const db = createMockDb([]);
      const col = new Collection(db, 'users');
      await col.findOne({});
      const selectQuery = db._queries.find(q => q.sql.includes('SELECT') && q.sql.includes('LIMIT'));
      assert.ok(selectQuery);
    });
  });

  describe('_executeFind', () => {
    it('should generate SELECT with WHERE for filter', async () => {
      const db = createMockDb([]);
      const col = new Collection(db, 'users');
      await col._executeFind({ age: { $gt: 25 } }, null, null, 0, 0, {});
      const selectQuery = db._queries.find(q => q.sql.includes('SELECT') && q.sql.includes('WHERE'));
      assert.ok(selectQuery);
    });

    it('should include ORDER BY for sort', async () => {
      const db = createMockDb([]);
      const col = new Collection(db, 'users');
      await col._executeFind({}, null, { name: 1 }, 0, 0, {});
      assert.ok(db._queries.some(q => q.sql.includes('ORDER BY')));
    });

    it('should include LIMIT when specified', async () => {
      const db = createMockDb([]);
      const col = new Collection(db, 'users');
      await col._executeFind({}, null, null, 0, 10, {});
      assert.ok(db._queries.some(q => q.sql.includes('LIMIT')));
    });

    it('should include OFFSET when specified', async () => {
      const db = createMockDb([]);
      const col = new Collection(db, 'users');
      await col._executeFind({}, null, null, 5, 0, {});
      assert.ok(db._queries.some(q => q.sql.includes('OFFSET')));
    });
  });

  describe('updateOne', () => {
    it('should return matchedCount 0 when no document found', async () => {
      const db = createMockDb([]);
      const col = new Collection(db, 'users');
      const result = await col.updateOne({ name: 'nobody' }, { $set: { age: 1 } });
      assert.strictEqual(result.matchedCount, 0);
      assert.strictEqual(result.modifiedCount, 0);
    });

    it('should return matchedCount 1 when document found', async () => {
      const queries = [];
      let callCount = 0;
      const pool = {
        query: async (sql, params) => {
          queries.push({ sql, params });
          callCount++;
          if (callCount <= 2) {
            // CREATE TABLE and CREATE INDEX
            return { rows: [], rowCount: 0 };
          }
          if (sql.includes('SELECT _id FROM')) {
            return { rows: [{ _id: 'found-id' }], rowCount: 1 };
          }
          if (sql.includes('UPDATE')) {
            return { rows: [], rowCount: 1 };
          }
          // pg_notify
          return { rows: [], rowCount: 0 };
        }
      };
      const db = {
        _client: { _pool: pool }, _dbName: 'test', _schemaName: 'test', _getPool: () => pool, _queries: queries
      };
      const col = new Collection(db, 'users');
      const result = await col.updateOne({ _id: 'found-id' }, { $set: { name: 'updated' } });
      assert.strictEqual(result.matchedCount, 1);
      assert.strictEqual(result.modifiedCount, 1);
    });
  });

  describe('updateMany', () => {
    it('should update multiple documents', async () => {
      const pool = {
        query: async (sql) => {
          if (sql.includes('CREATE')) return { rows: [], rowCount: 0 };
          return { rows: [], rowCount: 5 };
        }
      };
      const db = { _client: { _pool: pool }, _dbName: 'test', _schemaName: 'test', _getPool: () => pool };
      const col = new Collection(db, 'users');
      const result = await col.updateMany({ status: 'old' }, { $set: { status: 'new' } });
      assert.strictEqual(result.matchedCount, 5);
      assert.strictEqual(result.modifiedCount, 5);
    });
  });

  describe('deleteOne', () => {
    it('should generate DELETE with LIMIT 1 subquery', async () => {
      const db = createMockDb();
      const col = new Collection(db, 'users');
      await col.deleteOne({ _id: '1' });
      const delQuery = db._queries.find(q => q.sql.includes('DELETE') && q.sql.includes('LIMIT 1'));
      assert.ok(delQuery);
    });

    it('should return deletedCount', async () => {
      const db = createMockDb();
      const col = new Collection(db, 'users');
      const result = await col.deleteOne({ _id: '1' });
      assert.ok(result.acknowledged);
      assert.ok(typeof result.deletedCount === 'number');
    });
  });

  describe('deleteMany', () => {
    it('should generate DELETE without LIMIT', async () => {
      const db = createMockDb();
      const col = new Collection(db, 'users');
      await col.deleteMany({ status: 'old' });
      const delQuery = db._queries.find(q => q.sql.includes('DELETE') && !q.sql.includes('LIMIT'));
      assert.ok(delQuery);
    });
  });

  describe('findOneAndUpdate', () => {
    it('should return null when not found and no upsert', async () => {
      const db = createMockDb([]);
      const col = new Collection(db, 'users');
      const result = await col.findOneAndUpdate({ _id: 'x' }, { $set: { a: 1 } });
      assert.strictEqual(result.value, null);
      assert.strictEqual(result.ok, 1);
    });
  });

  describe('findOneAndDelete', () => {
    it('should return deleted document', async () => {
      const pool = {
        query: async (sql) => {
          if (sql.includes('CREATE')) return { rows: [], rowCount: 0 };
          if (sql.includes('DELETE')) {
            return { rows: [{ _id: '1', data: { name: 'Alice' } }], rowCount: 1 };
          }
          return { rows: [], rowCount: 0 };
        }
      };
      const db = { _client: { _pool: pool }, _dbName: 'test', _schemaName: 'test', _getPool: () => pool };
      const col = new Collection(db, 'users');
      const result = await col.findOneAndDelete({ _id: '1' });
      assert.strictEqual(result.value._id, '1');
      assert.strictEqual(result.value.name, 'Alice');
    });

    it('should return null when not found', async () => {
      const db = createMockDb([]);
      const col = new Collection(db, 'users');
      const result = await col.findOneAndDelete({ _id: 'x' });
      assert.strictEqual(result.value, null);
    });
  });

  describe('aggregate', () => {
    it('should return AggregationCursor', () => {
      const db = createMockDb();
      const col = new Collection(db, 'users');
      const cursor = col.aggregate([{ $match: { status: 'active' } }]);
      assert.ok(cursor instanceof AggregationCursor);
    });
  });

  describe('countDocuments', () => {
    it('should return count', async () => {
      const pool = {
        query: async (sql) => {
          if (sql.includes('CREATE')) return { rows: [], rowCount: 0 };
          return { rows: [{ count: 42 }], rowCount: 1 };
        }
      };
      const db = { _client: { _pool: pool }, _dbName: 'test', _schemaName: 'test', _getPool: () => pool };
      const col = new Collection(db, 'users');
      const count = await col.countDocuments({ status: 'active' });
      assert.strictEqual(count, 42);
    });

    it('should generate COUNT(*) query', async () => {
      const db = createMockDb([{ count: 0 }]);
      const col = new Collection(db, 'users');
      await col.countDocuments({});
      assert.ok(db._queries.some(q => q.sql.includes('COUNT(*)')));
    });
  });

  describe('distinct', () => {
    it('should return distinct values', async () => {
      const pool = {
        query: async (sql) => {
          if (sql.includes('CREATE')) return { rows: [], rowCount: 0 };
          if (sql.includes('DISTINCT')) {
            return { rows: [{ value: 'a' }, { value: 'b' }, { value: 'c' }], rowCount: 3 };
          }
          return { rows: [], rowCount: 0 };
        }
      };
      const db = { _client: { _pool: pool }, _dbName: 'test', _schemaName: 'test', _getPool: () => pool };
      const col = new Collection(db, 'users');
      const values = await col.distinct('status');
      assert.deepStrictEqual(values, ['a', 'b', 'c']);
    });

    it('should generate SELECT DISTINCT', async () => {
      const db = createMockDb([]);
      const col = new Collection(db, 'users');
      await col.distinct('status', {});
      assert.ok(db._queries.some(q => q.sql.includes('DISTINCT')));
    });
  });

  describe('createIndex', () => {
    it('should generate CREATE INDEX', async () => {
      const db = createMockDb();
      const col = new Collection(db, 'users');
      const name = await col.createIndex({ name: 1 });
      assert.ok(db._queries.some(q => q.sql.includes('CREATE') && q.sql.includes('INDEX')));
      assert.strictEqual(name, 'name_1');
    });

    it('should generate UNIQUE index', async () => {
      const db = createMockDb();
      const col = new Collection(db, 'users');
      await col.createIndex({ email: 1 }, { unique: true });
      assert.ok(db._queries.some(q => q.sql.includes('UNIQUE INDEX')));
    });

    it('should use custom index name', async () => {
      const db = createMockDb();
      const col = new Collection(db, 'users');
      const name = await col.createIndex({ email: 1 }, { name: 'idx_email' });
      assert.strictEqual(name, 'idx_email');
    });

    it('should generate GIN index for text', async () => {
      const db = createMockDb();
      const col = new Collection(db, 'users');
      await col.createIndex({ description: 'text' });
      assert.ok(db._queries.some(q => q.sql.includes('GIN') && q.sql.includes('to_tsvector')));
    });

    it('should generate sparse index', async () => {
      const db = createMockDb();
      const col = new Collection(db, 'users');
      await col.createIndex({ email: 1 }, { sparse: true });
      assert.ok(db._queries.some(q => q.sql.includes('WHERE') && q.sql.includes('?')));
    });
  });

  describe('createIndexes', () => {
    it('should create multiple indexes', async () => {
      const db = createMockDb();
      const col = new Collection(db, 'users');
      const names = await col.createIndexes([
        { key: { name: 1 } },
        { key: { email: 1 }, unique: true }
      ]);
      assert.strictEqual(names.length, 2);
    });
  });

  describe('bulkWrite', () => {
    it('should process multiple operations', async () => {
      const db = createMockDb();
      const col = new Collection(db, 'users');
      const result = await col.bulkWrite([
        { insertOne: { document: { name: 'A' } } },
        { insertOne: { document: { name: 'B' } } }
      ]);
      assert.ok(result instanceof (require('../lib/bulkWrite').BulkWriteResult));
      assert.strictEqual(result.insertedCount, 2);
    });
  });

  describe('watch', () => {
    it('should return a ChangeStream', () => {
      const db = createMockDb();
      const col = new Collection(db, 'users');
      const cs = col.watch();
      assert.ok(cs);
      assert.strictEqual(cs._channelName, 'change_testdb_users');
    });
  });

  describe('drop', () => {
    it('should generate DROP TABLE', async () => {
      const db = createMockDb();
      const col = new Collection(db, 'users');
      await col.drop();
      assert.ok(db._queries.some(q => q.sql.includes('DROP TABLE')));
    });

    it('should reset initialized flag', async () => {
      const db = createMockDb();
      const col = new Collection(db, 'users');
      col._initialized = true;
      await col.drop();
      assert.strictEqual(col._initialized, false);
    });
  });

  describe('rename', () => {
    it('should generate ALTER TABLE RENAME', async () => {
      const db = createMockDb();
      const col = new Collection(db, 'users');
      await col.rename('customers');
      assert.ok(db._queries.some(q => q.sql.includes('RENAME TO')));
      assert.strictEqual(col._name, 'customers');
    });

    it('should drop target if dropTarget is true', async () => {
      const db = createMockDb();
      const col = new Collection(db, 'users');
      await col.rename('customers', { dropTarget: true });
      assert.ok(db._queries.some(q => q.sql.includes('DROP TABLE IF EXISTS')));
    });
  });

  describe('isCapped', () => {
    it('should return false', async () => {
      const db = createMockDb();
      const col = new Collection(db, 'users');
      assert.strictEqual(await col.isCapped(), false);
    });
  });

  describe('document transformation', () => {
    it('_documentToJsonb should strip _id', () => {
      const db = createMockDb();
      const col = new Collection(db, 'users');
      const result = col._documentToJsonb({ _id: '1', name: 'Alice', age: 30 });
      assert.strictEqual(result._id, undefined);
      assert.strictEqual(result.name, 'Alice');
      assert.strictEqual(result.age, 30);
    });

    it('_documentToJsonb should convert Date to $date', () => {
      const db = createMockDb();
      const col = new Collection(db, 'users');
      const date = new Date('2024-01-01');
      const result = col._documentToJsonb({ createdAt: date });
      assert.ok(result.createdAt.$date);
      assert.ok(result.createdAt.$date.includes('2024'));
    });

    it('_documentToJsonb should convert RegExp to $regex', () => {
      const db = createMockDb();
      const col = new Collection(db, 'users');
      const result = col._documentToJsonb({ pattern: /^test/i });
      assert.strictEqual(result.pattern.$regex, '^test');
      assert.strictEqual(result.pattern.$options, 'i');
    });

    it('_documentToJsonb should convert Buffer to $binary', () => {
      const db = createMockDb();
      const col = new Collection(db, 'users');
      const buf = Buffer.from('hello');
      const result = col._documentToJsonb({ data: buf });
      assert.strictEqual(result.data.$binary, buf.toString('base64'));
    });

    it('_documentToJsonb should convert ObjectId to hex string', () => {
      const db = createMockDb();
      const col = new Collection(db, 'users');
      const oid = new ObjectId('507f1f77bcf86cd799439011');
      const result = col._documentToJsonb({ ref: oid });
      assert.strictEqual(result.ref, '507f1f77bcf86cd799439011');
    });

    it('_documentToJsonb should handle nested objects', () => {
      const db = createMockDb();
      const col = new Collection(db, 'users');
      const result = col._documentToJsonb({
        address: { city: 'NYC', coords: { lat: 40.7, lng: -74.0 } }
      });
      assert.strictEqual(result.address.city, 'NYC');
      assert.strictEqual(result.address.coords.lat, 40.7);
    });

    it('_documentToJsonb should handle arrays', () => {
      const db = createMockDb();
      const col = new Collection(db, 'users');
      const result = col._documentToJsonb({ tags: ['a', 'b', 'c'] });
      assert.deepStrictEqual(result.tags, ['a', 'b', 'c']);
    });

    it('_rowToDocument should reconstruct _id', () => {
      const db = createMockDb();
      const col = new Collection(db, 'users');
      const doc = col._rowToDocument({ _id: 'abc', data: { name: 'Alice' } });
      assert.strictEqual(doc._id, 'abc');
      assert.strictEqual(doc.name, 'Alice');
    });

    it('_rowToDocument should restore Date from $date', () => {
      const db = createMockDb();
      const col = new Collection(db, 'users');
      const doc = col._rowToDocument({
        _id: '1',
        data: { createdAt: { $date: '2024-01-01T00:00:00.000Z' } }
      });
      assert.ok(doc.createdAt instanceof Date);
      assert.strictEqual(doc.createdAt.getFullYear(), 2024);
    });

    it('_rowToDocument should restore RegExp from $regex', () => {
      const db = createMockDb();
      const col = new Collection(db, 'users');
      const doc = col._rowToDocument({
        _id: '1',
        data: { pattern: { $regex: '^test', $options: 'i' } }
      });
      assert.ok(doc.pattern instanceof RegExp);
      assert.strictEqual(doc.pattern.source, '^test');
      assert.ok(doc.pattern.ignoreCase);
    });

    it('_rowToDocument should restore Buffer from $binary', () => {
      const db = createMockDb();
      const col = new Collection(db, 'users');
      const b64 = Buffer.from('hello').toString('base64');
      const doc = col._rowToDocument({
        _id: '1',
        data: { blob: { $binary: b64 } }
      });
      assert.ok(Buffer.isBuffer(doc.blob));
      assert.strictEqual(doc.blob.toString(), 'hello');
    });

    it('_rowToDocument should handle null values', () => {
      const db = createMockDb();
      const col = new Collection(db, 'users');
      const doc = col._rowToDocument({ _id: '1', data: { name: null } });
      assert.strictEqual(doc.name, null);
    });

    it('_rowToDocument should handle nested arrays and objects', () => {
      const db = createMockDb();
      const col = new Collection(db, 'users');
      const doc = col._rowToDocument({
        _id: '1',
        data: {
          items: [
            { name: 'a', date: { $date: '2024-01-01T00:00:00.000Z' } },
            { name: 'b' }
          ]
        }
      });
      assert.ok(Array.isArray(doc.items));
      assert.ok(doc.items[0].date instanceof Date);
      assert.strictEqual(doc.items[1].name, 'b');
    });
  });

  describe('_matchesFilter (JS-side post-processing)', () => {
    it('should match simple equality', () => {
      const db = createMockDb();
      const col = new Collection(db, 'users');
      assert.ok(col._matchesFilter({ name: 'Alice' }, { name: 'Alice' }));
      assert.ok(!col._matchesFilter({ name: 'Bob' }, { name: 'Alice' }));
    });

    it('should match $gt', () => {
      const db = createMockDb();
      const col = new Collection(db, 'users');
      assert.ok(col._matchesFilter({ age: 30 }, { age: { $gt: 25 } }));
      assert.ok(!col._matchesFilter({ age: 20 }, { age: { $gt: 25 } }));
    });

    it('should match $in', () => {
      const db = createMockDb();
      const col = new Collection(db, 'users');
      assert.ok(col._matchesFilter({ status: 'active' }, { status: { $in: ['active', 'pending'] } }));
      assert.ok(!col._matchesFilter({ status: 'deleted' }, { status: { $in: ['active', 'pending'] } }));
    });

    it('should match $exists', () => {
      const db = createMockDb();
      const col = new Collection(db, 'users');
      assert.ok(col._matchesFilter({ email: 'a@b.com' }, { email: { $exists: true } }));
      assert.ok(!col._matchesFilter({}, { email: { $exists: true } }));
    });

    it('should match $and', () => {
      const db = createMockDb();
      const col = new Collection(db, 'users');
      assert.ok(col._matchesFilter({ a: 1, b: 2 }, { $and: [{ a: 1 }, { b: 2 }] }));
      assert.ok(!col._matchesFilter({ a: 1, b: 3 }, { $and: [{ a: 1 }, { b: 2 }] }));
    });

    it('should match $or', () => {
      const db = createMockDb();
      const col = new Collection(db, 'users');
      assert.ok(col._matchesFilter({ a: 1 }, { $or: [{ a: 1 }, { b: 2 }] }));
      assert.ok(!col._matchesFilter({ a: 3 }, { $or: [{ a: 1 }, { a: 2 }] }));
    });

    it('should match $nor', () => {
      const db = createMockDb();
      const col = new Collection(db, 'users');
      assert.ok(col._matchesFilter({ a: 3 }, { $nor: [{ a: 1 }, { a: 2 }] }));
      assert.ok(!col._matchesFilter({ a: 1 }, { $nor: [{ a: 1 }, { a: 2 }] }));
    });
  });

  describe('_getNestedValue / _setNestedValue', () => {
    it('should get simple field', () => {
      const db = createMockDb();
      const col = new Collection(db, 'users');
      assert.strictEqual(col._getNestedValue({ name: 'Alice' }, 'name'), 'Alice');
    });

    it('should get nested field', () => {
      const db = createMockDb();
      const col = new Collection(db, 'users');
      assert.strictEqual(col._getNestedValue({ a: { b: { c: 42 } } }, 'a.b.c'), 42);
    });

    it('should return undefined for missing path', () => {
      const db = createMockDb();
      const col = new Collection(db, 'users');
      assert.strictEqual(col._getNestedValue({ a: 1 }, 'b.c'), undefined);
    });

    it('should set simple field', () => {
      const db = createMockDb();
      const col = new Collection(db, 'users');
      const obj = {};
      col._setNestedValue(obj, 'name', 'Alice');
      assert.strictEqual(obj.name, 'Alice');
    });

    it('should set nested field and create intermediates', () => {
      const db = createMockDb();
      const col = new Collection(db, 'users');
      const obj = {};
      col._setNestedValue(obj, 'a.b.c', 42);
      assert.strictEqual(obj.a.b.c, 42);
    });
  });
});
