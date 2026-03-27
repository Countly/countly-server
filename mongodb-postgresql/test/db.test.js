'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert');
const { Db, Admin } = require('../lib/db');
const { Collection } = require('../lib/collection');

function createMockClient(queryResponses = {}) {
  const queries = [];
  const pool = {
    query: async (sql, params) => {
      queries.push({ sql, params });
      // Check for custom responses
      for (const [pattern, response] of Object.entries(queryResponses)) {
        if (sql.includes(pattern)) return response;
      }
      return { rows: [], rowCount: 0 };
    }
  };
  return { _pool: pool, _queries: queries };
}

describe('Db', () => {
  describe('constructor', () => {
    it('should store client and dbName', () => {
      const client = createMockClient();
      const db = new Db(client, 'mydb');
      assert.strictEqual(db.databaseName, 'mydb');
    });

    it('should use dbName as schemaName by default', () => {
      const client = createMockClient();
      const db = new Db(client, 'mydb');
      assert.strictEqual(db._schemaName, 'mydb');
    });

    it('should use custom schemaName from options', () => {
      const client = createMockClient();
      const db = new Db(client, 'mydb', { schemaName: 'custom' });
      assert.strictEqual(db._schemaName, 'custom');
    });
  });

  describe('collection', () => {
    it('should return a Collection instance', () => {
      const client = createMockClient();
      const db = new Db(client, 'mydb');
      const col = db.collection('users');
      assert.ok(col instanceof Collection);
      assert.strictEqual(col.collectionName, 'users');
    });

    it('should cache collections', () => {
      const client = createMockClient();
      const db = new Db(client, 'mydb');
      const col1 = db.collection('users');
      const col2 = db.collection('users');
      assert.strictEqual(col1, col2);
    });

    it('should return different collections for different names', () => {
      const client = createMockClient();
      const db = new Db(client, 'mydb');
      const col1 = db.collection('users');
      const col2 = db.collection('orders');
      assert.notStrictEqual(col1, col2);
    });
  });

  describe('createCollection', () => {
    it('should create table and return collection', async () => {
      const client = createMockClient();
      const db = new Db(client, 'mydb');
      const col = await db.createCollection('users');
      assert.ok(col instanceof Collection);
      assert.ok(client._queries.some(q => q.sql.includes('CREATE TABLE')));
    });
  });

  describe('listCollections', () => {
    it('should query information_schema', async () => {
      const client = createMockClient({
        'information_schema': { rows: [{ table_name: 'users' }, { table_name: 'orders' }], rowCount: 2 }
      });
      const db = new Db(client, 'mydb');
      const result = await db.listCollections();
      const collections = await result.toArray();
      assert.strictEqual(collections.length, 2);
      assert.strictEqual(collections[0].name, 'users');
      assert.strictEqual(collections[1].name, 'orders');
    });

    it('should filter by name', async () => {
      const client = createMockClient({
        'information_schema': { rows: [{ table_name: 'users' }], rowCount: 1 }
      });
      const db = new Db(client, 'mydb');
      const result = await db.listCollections({ name: 'users' });
      const collections = await result.toArray();
      assert.strictEqual(collections.length, 1);
      assert.ok(client._queries.some(q => q.params && q.params.includes('users')));
    });

    it('should support async iteration', async () => {
      const client = createMockClient({
        'information_schema': { rows: [{ table_name: 'a' }, { table_name: 'b' }], rowCount: 2 }
      });
      const db = new Db(client, 'mydb');
      const result = await db.listCollections();
      const names = [];
      for await (const col of result) {
        names.push(col.name);
      }
      assert.deepStrictEqual(names, ['a', 'b']);
    });
  });

  describe('collections', () => {
    it('should return Collection instances', async () => {
      const client = createMockClient({
        'information_schema': { rows: [{ table_name: 'users' }], rowCount: 1 }
      });
      const db = new Db(client, 'mydb');
      const cols = await db.collections();
      assert.strictEqual(cols.length, 1);
      assert.ok(cols[0] instanceof Collection);
    });
  });

  describe('dropCollection', () => {
    it('should drop the table', async () => {
      const client = createMockClient();
      const db = new Db(client, 'mydb');
      await db.dropCollection('users');
      assert.ok(client._queries.some(q => q.sql.includes('DROP TABLE')));
    });
  });

  describe('dropDatabase', () => {
    it('should drop schema for non-public schemas', async () => {
      const client = createMockClient();
      const db = new Db(client, 'mydb');
      await db.dropDatabase();
      assert.ok(client._queries.some(q => q.sql.includes('DROP SCHEMA')));
    });

    it('should drop all tables for public schema', async () => {
      const client = createMockClient({
        'information_schema': {
          rows: [{ table_name: 'users' }, { table_name: 'orders' }],
          rowCount: 2
        }
      });
      const db = new Db(client, 'mydb', { schemaName: 'public' });
      await db.dropDatabase();
      assert.ok(client._queries.some(q => q.sql.includes('DROP TABLE')));
    });
  });

  describe('command', () => {
    it('should handle ping', async () => {
      const client = createMockClient();
      const db = new Db(client, 'mydb');
      const result = await db.command({ ping: 1 });
      assert.strictEqual(result.ok, 1);
    });

    it('should handle buildInfo', async () => {
      const client = createMockClient();
      const db = new Db(client, 'mydb');
      const result = await db.command({ buildInfo: 1 });
      assert.strictEqual(result.ok, 1);
      assert.ok(result.version);
    });

    it('should handle serverStatus', async () => {
      const client = createMockClient();
      const db = new Db(client, 'mydb');
      const result = await db.command({ serverStatus: 1 });
      assert.strictEqual(result.ok, 1);
    });

    it('should handle create', async () => {
      const client = createMockClient();
      const db = new Db(client, 'mydb');
      const result = await db.command({ create: 'newcoll' });
      assert.strictEqual(result.ok, 1);
    });

    it('should handle drop', async () => {
      const client = createMockClient();
      const db = new Db(client, 'mydb');
      const result = await db.command({ drop: 'oldcoll' });
      assert.strictEqual(result.ok, 1);
    });

    it('should throw for unsupported commands', async () => {
      const client = createMockClient();
      const db = new Db(client, 'mydb');
      await assert.rejects(() => db.command({ fooBar: 1 }), /Unsupported command/);
    });
  });

  describe('stats', () => {
    it('should return database stats', async () => {
      const client = createMockClient({
        'pg_total_relation_size': {
          rows: [{ collections: 5, datasize: 1024 }],
          rowCount: 1
        }
      });
      const db = new Db(client, 'mydb');
      const stats = await db.stats();
      assert.strictEqual(stats.db, 'mydb');
      assert.strictEqual(stats.ok, 1);
    });
  });

  describe('watch', () => {
    it('should return a ChangeStream', () => {
      const client = createMockClient();
      const db = new Db(client, 'mydb');
      const cs = db.watch();
      assert.ok(cs);
    });
  });

  describe('aggregate', () => {
    it('should throw (not supported)', async () => {
      const client = createMockClient();
      const db = new Db(client, 'mydb');
      await assert.rejects(() => db.aggregate([]), /not supported/);
    });
  });
});

describe('Admin', () => {
  describe('ping', () => {
    it('should execute SELECT 1', async () => {
      const client = createMockClient();
      const admin = new Admin(client);
      const result = await admin.ping();
      assert.strictEqual(result.ok, 1);
      assert.ok(client._queries.some(q => q.sql.includes('SELECT 1')));
    });
  });

  describe('serverInfo', () => {
    it('should return version info', async () => {
      const client = createMockClient({
        'version()': { rows: [{ version: 'PostgreSQL 15.1' }], rowCount: 1 }
      });
      const admin = new Admin(client);
      const info = await admin.serverInfo();
      assert.ok(info.version);
      assert.ok(info.modules.includes('postgresql'));
    });
  });

  describe('serverStatus', () => {
    it('should return status stub', async () => {
      const client = createMockClient();
      const admin = new Admin(client);
      const status = await admin.serverStatus();
      assert.strictEqual(status.ok, 1);
    });
  });

  describe('buildInfo', () => {
    it('should delegate to serverInfo', async () => {
      const client = createMockClient({
        'version()': { rows: [{ version: 'PG 15' }], rowCount: 1 }
      });
      const admin = new Admin(client);
      const info = await admin.buildInfo();
      assert.ok(info.version);
    });
  });

  describe('listDatabases', () => {
    it('should query schemas', async () => {
      const client = createMockClient({
        'schema_name': {
          rows: [
            { name: 'public', sizeondisk: '8192 bytes' },
            { name: 'mydb', sizeondisk: '16384 bytes' }
          ],
          rowCount: 2
        }
      });
      const admin = new Admin(client);
      const result = await admin.listDatabases();
      assert.strictEqual(result.ok, 1);
      assert.ok(Array.isArray(result.databases));
    });
  });

  describe('command', () => {
    it('should handle ping', async () => {
      const client = createMockClient();
      const admin = new Admin(client);
      const result = await admin.command({ ping: 1 });
      assert.strictEqual(result.ok, 1);
    });

    it('should throw for unsupported commands', async () => {
      const client = createMockClient();
      const admin = new Admin(client);
      await assert.rejects(() => admin.command({ fooBar: 1 }), /Unsupported admin command/);
    });
  });
});
