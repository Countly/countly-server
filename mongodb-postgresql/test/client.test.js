'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert');
const MongoClient = require('../lib/client');

describe('MongoClient', () => {
  describe('constructor', () => {
    it('should store uri and options', () => {
      const client = new MongoClient('postgresql://localhost/test', { maxPoolSize: 20 });
      assert.strictEqual(client._uri, 'postgresql://localhost/test');
      assert.strictEqual(client._options.maxPoolSize, 20);
    });

    it('should not be connected initially', () => {
      const client = new MongoClient('postgresql://localhost/test');
      assert.strictEqual(client.isConnected(), false);
    });
  });

  describe('_parseConnectionString', () => {
    it('should pass through postgresql:// URIs', () => {
      const client = new MongoClient('postgresql://localhost/test');
      const config = client._parseConnectionString('postgresql://user:pass@localhost:5432/mydb', {});
      assert.strictEqual(config.connectionString, 'postgresql://user:pass@localhost:5432/mydb');
    });

    it('should convert mongodb:// to postgresql://', () => {
      const client = new MongoClient('test');
      const config = client._parseConnectionString('mongodb://user:pass@host:27017/mydb', {});
      assert.ok(config.connectionString.startsWith('postgresql://'));
      assert.ok(config.connectionString.includes('user:pass'));
      assert.ok(config.connectionString.includes('host'));
    });

    it('should convert mongodb+srv:// to postgresql://', () => {
      const client = new MongoClient('test');
      const config = client._parseConnectionString('mongodb+srv://user:pass@cluster.example.com/mydb', {});
      assert.ok(config.connectionString.startsWith('postgresql://'));
    });

    it('should strip MongoDB-specific query params', () => {
      const client = new MongoClient('test');
      const config = client._parseConnectionString(
        'mongodb://user:pass@host/db?retryWrites=true&w=majority&authSource=admin&replicaSet=rs0',
        {}
      );
      assert.ok(!config.connectionString.includes('retryWrites'));
      assert.ok(!config.connectionString.includes('authSource'));
      assert.ok(!config.connectionString.includes('replicaSet'));
    });

    it('should set default pool size', () => {
      const client = new MongoClient('test');
      const config = client._parseConnectionString('postgresql://localhost/test', {});
      assert.strictEqual(config.max, 10);
    });

    it('should respect maxPoolSize option', () => {
      const client = new MongoClient('test');
      const config = client._parseConnectionString('postgresql://localhost/test', { maxPoolSize: 50 });
      assert.strictEqual(config.max, 50);
    });

    it('should set ssl config when ssl option is true', () => {
      const client = new MongoClient('test');
      const config = client._parseConnectionString('postgresql://localhost/test', { ssl: true });
      assert.ok(config.ssl);
    });

    it('should set ssl config when tls option is true', () => {
      const client = new MongoClient('test');
      const config = client._parseConnectionString('postgresql://localhost/test', { tls: true });
      assert.ok(config.ssl);
    });

    it('should pass ssl object through', () => {
      const client = new MongoClient('test');
      const sslConfig = { rejectUnauthorized: true, ca: 'cert' };
      const config = client._parseConnectionString('postgresql://localhost/test', { ssl: sslConfig });
      assert.strictEqual(config.ssl, sslConfig);
    });

    it('should use auth options for user/password', () => {
      const client = new MongoClient('test');
      const config = client._parseConnectionString('postgresql://localhost/test', {
        auth: { username: 'admin', password: 'secret' }
      });
      assert.strictEqual(config.user, 'admin');
      assert.strictEqual(config.password, 'secret');
    });

    it('should set connectionTimeoutMillis from connectTimeoutMS', () => {
      const client = new MongoClient('test');
      const config = client._parseConnectionString('postgresql://localhost/test', { connectTimeoutMS: 10000 });
      assert.strictEqual(config.connectionTimeoutMillis, 10000);
    });

    it('should set idleTimeoutMillis from maxIdleTimeMS', () => {
      const client = new MongoClient('test');
      const config = client._parseConnectionString('postgresql://localhost/test', { maxIdleTimeMS: 60000 });
      assert.strictEqual(config.idleTimeoutMillis, 60000);
    });
  });

  describe('db', () => {
    it('should return Db instance', () => {
      const client = new MongoClient('postgresql://localhost/test');
      client._defaultDbName = 'test';
      const db = client.db('mydb');
      assert.ok(db);
      assert.strictEqual(db.databaseName, 'mydb');
    });

    it('should cache Db instances', () => {
      const client = new MongoClient('postgresql://localhost/test');
      client._defaultDbName = 'test';
      const db1 = client.db('mydb');
      const db2 = client.db('mydb');
      assert.strictEqual(db1, db2);
    });

    it('should use default db name when none specified', () => {
      const client = new MongoClient('postgresql://localhost/test');
      client._defaultDbName = 'defaultdb';
      const db = client.db();
      assert.strictEqual(db.databaseName, 'defaultdb');
    });

    it('should return different Db instances for different names', () => {
      const client = new MongoClient('postgresql://localhost/test');
      const db1 = client.db('db1');
      const db2 = client.db('db2');
      assert.notStrictEqual(db1, db2);
    });
  });

  describe('startSession', () => {
    it('should return a ClientSession', () => {
      const client = new MongoClient('postgresql://localhost/test');
      const session = client.startSession();
      assert.ok(session);
      assert.ok(session.id);
    });

    it('should track sessions', () => {
      const client = new MongoClient('postgresql://localhost/test');
      const session = client.startSession();
      assert.ok(client._sessions.has(session));
    });

    it('should remove session on endSession', async () => {
      const client = new MongoClient('postgresql://localhost/test');
      const session = client.startSession();
      await session.endSession();
      assert.ok(!client._sessions.has(session));
    });
  });

  describe('topology', () => {
    it('should report connected state', () => {
      const client = new MongoClient('postgresql://localhost/test');
      assert.ok(!client.topology.isConnected());
      assert.ok(client.topology.isDestroyed());

      client._connected = true;
      assert.ok(client.topology.isConnected());
      assert.ok(!client.topology.isDestroyed());
    });
  });

  describe('watch', () => {
    it('should return a ChangeStream', () => {
      const client = new MongoClient('postgresql://localhost/test');
      const cs = client.watch();
      assert.ok(cs);
      assert.strictEqual(cs._channelName, 'change_all');
    });

    it('should pass pipeline and options', () => {
      const client = new MongoClient('postgresql://localhost/test');
      const pipeline = [{ $match: { operationType: 'insert' } }];
      const cs = client.watch(pipeline, { fullDocument: 'updateLookup' });
      assert.deepStrictEqual(cs._pipeline, pipeline);
      assert.strictEqual(cs._fullDocument, 'updateLookup');
    });
  });

  describe('connect error handling', () => {
    it('should throw MongoNetworkError on connection failure', async () => {
      const client = new MongoClient('postgresql://nonexistent-host:5432/test', {
        connectTimeoutMS: 500
      });
      await assert.rejects(
        () => client.connect(),
        (err) => {
          assert.strictEqual(err.name, 'MongoNetworkError');
          return true;
        }
      );
    });
  });
});
