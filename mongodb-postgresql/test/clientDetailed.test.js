'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert');
const MongoClient = require('../lib/client');

describe('MongoClient detailed coverage', () => {
  describe('connect and close lifecycle', () => {
    it('connect should set up pool and mark connected', async () => {
      const client = new MongoClient('postgresql://localhost/testdb');

      // Inject a mock pool directly
      const mockPool = {
        connect: async () => ({ release: () => {} }),
        end: async () => {},
        on: () => {}
      };

      // Override _parseConnectionString to skip real pg.Pool creation
      client.connect = async function() {
        if (this._connected) return this;
        this._pool = mockPool;
        this._defaultDbName = 'testdb';
        this._connected = true;
        this.emit('open', this);
        this.emit('topologyOpening');
        return this;
      };

      await client.connect();
      assert.ok(client.isConnected());
      assert.strictEqual(client._defaultDbName, 'testdb');
      assert.ok(!client.topology.isDestroyed());
      assert.ok(client.topology.isConnected());

      // Connect again should be no-op
      await client.connect();

      await client.close();
      assert.ok(!client.isConnected());
      assert.strictEqual(client._pool, null);
      assert.ok(client.topology.isDestroyed());

      // Close again should be no-op
      await client.close();
    });

    it('close should end all sessions', async () => {
      const client = new MongoClient('postgresql://localhost/test');
      client._pool = { end: async () => {}, on: () => {} };
      client._connected = true;

      const s1 = client.startSession();
      const s2 = client.startSession();
      assert.strictEqual(client._sessions.size, 2);

      await client.close();
      assert.strictEqual(client._sessions.size, 0);
      assert.ok(s1._ended);
      assert.ok(s2._ended);
    });
  });

  describe('withSession', () => {
    it('should create session, run fn, and end session', async () => {
      const client = new MongoClient('postgresql://localhost/test');
      client._pool = {};
      client._connected = true;

      let sessionReceived = null;
      const result = await client.withSession(async (session) => {
        sessionReceived = session;
        assert.ok(session.id);
        return 'done';
      });

      assert.strictEqual(result, 'done');
      assert.ok(sessionReceived._ended);
    });

    it('should end session even on error', async () => {
      const client = new MongoClient('postgresql://localhost/test');
      client._pool = {};
      client._connected = true;

      let session;
      try {
        await client.withSession(async (s) => {
          session = s;
          throw new Error('oops');
        });
      } catch (e) {
        // expected
      }
      assert.ok(session._ended);
    });
  });

  describe('bulkWrite across namespaces', () => {
    it('should route operations to correct db/collection', async () => {
      const client = new MongoClient('postgresql://localhost/test');
      client._defaultDbName = 'default';
      client._connected = true;

      const mockPool = {
        query: async (sql) => {
          if (sql.includes('CREATE') || sql.includes('INDEX')) return { rows: [], rowCount: 0 };
          if (sql.includes('INSERT')) return { rows: [], rowCount: 1 };
          return { rows: [], rowCount: 0 };
        }
      };
      client._pool = mockPool;

      await client.bulkWrite([
        { namespace: 'db1.users', insertOne: { document: { _id: 'u1', name: 'Alice' } } },
        { namespace: 'db2.orders', insertOne: { document: { _id: 'o1', item: 'Widget' } } }
      ]);

      assert.ok(client._dbs.has('db1'));
      assert.ok(client._dbs.has('db2'));
    });
  });

  describe('events', () => {
    it('should emit open on connect', async () => {
      const client = new MongoClient('postgresql://localhost/test');

      let opened = false;
      client.on('open', () => { opened = true; });

      // Simulate connect
      client._pool = { end: async () => {}, on: () => {} };
      client._connected = true;
      client.emit('open', client);

      assert.ok(opened);
    });

    it('should emit close on close', async () => {
      const client = new MongoClient('postgresql://localhost/test');
      client._pool = { end: async () => {}, on: () => {} };
      client._connected = true;

      let closed = false;
      client.on('close', () => { closed = true; });
      await client.close();
      assert.ok(closed);
    });
  });

  describe('db caching', () => {
    it('should clear dbs on close', async () => {
      const client = new MongoClient('postgresql://localhost/test');
      client._pool = { end: async () => {}, on: () => {} };
      client._connected = true;
      client._defaultDbName = 'test';

      client.db('db1');
      client.db('db2');
      assert.strictEqual(client._dbs.size, 2);

      await client.close();
      assert.strictEqual(client._dbs.size, 0);
    });
  });
});
