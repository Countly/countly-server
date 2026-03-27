'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert');
const { ChangeStream } = require('../lib/changeStream');
const { EventEmitter } = require('events');

function createMockParent(type = 'collection') {
  if (type === 'collection') {
    return {
      _name: 'users',
      _db: {
        _schemaName: 'mydb',
        _client: { _pool: createMockPool() }
      }
    };
  }
  if (type === 'db') {
    return {
      _dbName: 'mydb',
      _client: { _pool: createMockPool() }
    };
  }
  return { _pool: createMockPool() };
}

function createMockPool() {
  const mockClient = new EventEmitter();
  mockClient.query = async (sql) => {};
  mockClient.release = () => {};
  return {
    connect: async () => mockClient,
    _mockClient: mockClient
  };
}

describe('ChangeStream detailed', () => {
  describe('_setup', () => {
    it('should connect and LISTEN on the channel', async () => {
      const parent = createMockParent('collection');
      const cs = new ChangeStream(parent);
      const queries = [];
      const pool = parent._db._client._pool;
      const origConnect = pool.connect;
      pool.connect = async () => {
        const client = await origConnect.call(pool);
        const origQuery = client.query;
        client.query = async (sql) => { queries.push(sql); return origQuery.call(client, sql); };
        return client;
      };

      await cs._setup();
      assert.ok(queries.some(q => q.includes('LISTEN')));
      assert.ok(cs._pgClient);
      await cs.close();
    });
  });

  describe('notification handling', () => {
    it('should emit change events from pg notifications', async () => {
      const parent = createMockParent('collection');
      const cs = new ChangeStream(parent);
      await cs._setup();

      const changePromise = new Promise(resolve => {
        cs.once('change', resolve);
      });

      // Simulate a pg notification
      const payload = JSON.stringify({
        operationType: 'insert',
        documentKey: { _id: '123' },
        fullDocument: { _id: '123', name: 'test' }
      });
      cs._pgClient.emit('notification', { payload });

      const change = await changePromise;
      assert.strictEqual(change.operationType, 'insert');
      assert.strictEqual(change.documentKey._id, '123');
      await cs.close();
    });

    it('should update resumeToken on each notification', async () => {
      const parent = createMockParent('collection');
      const cs = new ChangeStream(parent);
      await cs._setup();

      assert.strictEqual(cs.resumeToken, null);

      const payload = JSON.stringify({
        _id: { _data: 'abc123' },
        operationType: 'update'
      });

      const changePromise = new Promise(resolve => cs.once('change', resolve));
      cs._pgClient.emit('notification', { payload });
      await changePromise;

      assert.deepStrictEqual(cs.resumeToken, { _data: 'abc123' });
      await cs.close();
    });

    it('should generate resumeToken if not in payload', async () => {
      const parent = createMockParent('collection');
      const cs = new ChangeStream(parent);
      await cs._setup();

      const payload = JSON.stringify({ operationType: 'delete' });
      const changePromise = new Promise(resolve => cs.once('change', resolve));
      cs._pgClient.emit('notification', { payload });
      await changePromise;

      assert.ok(cs.resumeToken);
      assert.ok(cs.resumeToken._data);
      await cs.close();
    });

    it('should emit error on invalid JSON', async () => {
      const parent = createMockParent('collection');
      const cs = new ChangeStream(parent);
      await cs._setup();

      const errorPromise = new Promise(resolve => cs.once('error', resolve));
      cs._pgClient.emit('notification', { payload: 'not json{{{' });
      const err = await errorPromise;
      assert.ok(err instanceof Error);
      await cs.close();
    });

    it('should not emit after close', async () => {
      const parent = createMockParent('collection');
      const cs = new ChangeStream(parent);
      await cs._setup();
      const pgClient = cs._pgClient;
      await cs.close();

      let emitted = false;
      cs.on('change', () => { emitted = true; });
      // This would normally emit but we closed
      // The listener was removed by close() via removeAllListeners
      pgClient.emit('notification', { payload: JSON.stringify({ operationType: 'insert' }) });

      // Give a tick
      await new Promise(r => setTimeout(r, 10));
      assert.ok(!emitted);
    });
  });

  describe('_matchesPipeline with multiple stages', () => {
    it('should apply all $match stages', () => {
      const cs = new ChangeStream({}, [
        { $match: { operationType: 'insert' } },
        { $match: { 'fullDocument.status': 'active' } }
      ]);
      assert.ok(cs._matchesPipeline({
        operationType: 'insert',
        fullDocument: { status: 'active' }
      }));
      assert.ok(!cs._matchesPipeline({
        operationType: 'insert',
        fullDocument: { status: 'inactive' }
      }));
      assert.ok(!cs._matchesPipeline({
        operationType: 'update',
        fullDocument: { status: 'active' }
      }));
    });
  });

  describe('next', () => {
    it('should wait for and return next change', async () => {
      const parent = createMockParent('collection');
      const cs = new ChangeStream(parent);
      await cs._setup();

      // Schedule a notification after a small delay
      setTimeout(() => {
        cs._pgClient.emit('notification', {
          payload: JSON.stringify({ operationType: 'insert', documentKey: { _id: '1' } })
        });
      }, 10);

      const change = await cs.next();
      assert.strictEqual(change.operationType, 'insert');
      await cs.close();
    });

    it('should return null when closed', async () => {
      const parent = createMockParent('collection');
      const cs = new ChangeStream(parent);
      cs._closed = true;
      const result = await cs.next();
      assert.strictEqual(result, null);
    });

    it('should auto-setup if not started', async () => {
      const parent = createMockParent('collection');
      const cs = new ChangeStream(parent);
      assert.strictEqual(cs._pgClient, null);

      // Schedule notification
      setTimeout(async () => {
        // Wait for setup
        await new Promise(r => setTimeout(r, 20));
        if (cs._pgClient) {
          cs._pgClient.emit('notification', {
            payload: JSON.stringify({ operationType: 'delete' })
          });
        }
      }, 10);

      const change = await cs.next();
      assert.ok(cs._pgClient); // Should have been set up
      assert.strictEqual(change.operationType, 'delete');
      await cs.close();
    });
  });

  describe('tryNext', () => {
    it('should return null immediately if no event pending', async () => {
      const parent = createMockParent('collection');
      const cs = new ChangeStream(parent);
      await cs._setup();

      const result = await cs.tryNext();
      assert.strictEqual(result, null);
      await cs.close();
    });

    it('should return null when closed', async () => {
      const cs = new ChangeStream({});
      cs._closed = true;
      assert.strictEqual(await cs.tryNext(), null);
    });
  });

  describe('stream', () => {
    it('should return a readable stream', () => {
      const parent = createMockParent('collection');
      const cs = new ChangeStream(parent);
      const s = cs.stream();
      assert.ok(s);
      assert.ok(typeof s.pipe === 'function');
      assert.ok(typeof s.read === 'function');
    });
  });

  describe('start', () => {
    it('should be idempotent', async () => {
      const parent = createMockParent('collection');
      const cs = new ChangeStream(parent);
      await cs.start();
      const client1 = cs._pgClient;
      await cs.start();
      assert.strictEqual(cs._pgClient, client1);
      await cs.close();
    });
  });

  describe('_getPool', () => {
    it('should find pool from collection parent', () => {
      const pool = createMockPool();
      const parent = { _name: 'col', _db: { _client: { _pool: pool } } };
      const cs = new ChangeStream(parent);
      assert.strictEqual(cs._getPool(), pool);
    });

    it('should find pool from db parent', () => {
      const pool = createMockPool();
      const parent = { _dbName: 'db', _client: { _pool: pool } };
      const cs = new ChangeStream(parent);
      assert.strictEqual(cs._getPool(), pool);
    });

    it('should find pool from client parent', () => {
      const pool = createMockPool();
      const parent = { _pool: pool };
      const cs = new ChangeStream(parent);
      assert.strictEqual(cs._getPool(), pool);
    });

    it('should throw if no pool found', () => {
      const cs = new ChangeStream({});
      assert.throws(() => cs._getPool(), /Cannot find connection pool/);
    });
  });

  describe('close', () => {
    it('should UNLISTEN and release client', async () => {
      const parent = createMockParent('collection');
      const cs = new ChangeStream(parent);
      await cs._setup();
      assert.ok(cs._pgClient);

      let released = false;
      cs._pgClient.release = () => { released = true; };

      await cs.close();
      assert.ok(cs._closed);
      assert.strictEqual(cs._pgClient, null);
      assert.ok(released);
    });
  });
});
