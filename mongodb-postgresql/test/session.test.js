'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert');
const { ClientSession } = require('../lib/session');

describe('ClientSession', () => {
  function createMockClient() {
    const queries = [];
    return {
      _pool: {
        connect: async () => ({
          query: async (sql) => { queries.push(sql); },
          release: () => {}
        })
      },
      _queries: queries
    };
  }

  describe('constructor', () => {
    it('should generate a random session id', () => {
      const client = createMockClient();
      const session = new ClientSession(client);
      assert.ok(session.id);
      assert.ok(Buffer.isBuffer(session.id.id));
      assert.strictEqual(session.id.id.length, 16);
    });

    it('should not be in transaction initially', () => {
      const client = createMockClient();
      const session = new ClientSession(client);
      assert.strictEqual(session.inTransaction, false);
    });

    it('should have null clusterTime and operationTime initially', () => {
      const client = createMockClient();
      const session = new ClientSession(client);
      assert.strictEqual(session.clusterTime, null);
      assert.strictEqual(session.operationTime, null);
    });
  });

  describe('advanceClusterTime / advanceOperationTime', () => {
    it('should update clusterTime', () => {
      const client = createMockClient();
      const session = new ClientSession(client);
      const ct = { clusterTime: { t: 1, i: 1 } };
      session.advanceClusterTime(ct);
      assert.strictEqual(session.clusterTime, ct);
    });

    it('should update operationTime', () => {
      const client = createMockClient();
      const session = new ClientSession(client);
      const ot = { t: 1, i: 1 };
      session.advanceOperationTime(ot);
      assert.strictEqual(session.operationTime, ot);
    });
  });

  describe('equals', () => {
    it('should return true for same session id', () => {
      const client = createMockClient();
      const session = new ClientSession(client);
      // A session should equal itself
      assert.ok(session.equals(session));
    });

    it('should return false for different sessions', () => {
      const client = createMockClient();
      const s1 = new ClientSession(client);
      const s2 = new ClientSession(client);
      assert.ok(!s1.equals(s2));
    });
  });

  describe('startTransaction', () => {
    it('should set inTransaction to true', () => {
      const client = createMockClient();
      const session = new ClientSession(client);
      session.startTransaction();
      assert.strictEqual(session.inTransaction, true);
    });

    it('should throw if already in transaction', () => {
      const client = createMockClient();
      const session = new ClientSession(client);
      session.startTransaction();
      assert.throws(() => session.startTransaction(), /already in progress/);
    });

    it('should accept transaction options', () => {
      const client = createMockClient();
      const session = new ClientSession(client);
      session.startTransaction({ readConcern: { level: 'snapshot' } });
      assert.strictEqual(session._transactionOptions.readConcern.level, 'snapshot');
    });
  });

  describe('commitTransaction', () => {
    it('should throw if not in transaction', async () => {
      const client = createMockClient();
      const session = new ClientSession(client);
      await assert.rejects(() => session.commitTransaction(), /No transaction started/);
    });

    it('should execute COMMIT and reset state', async () => {
      const client = createMockClient();
      const session = new ClientSession(client);
      session.startTransaction();
      // Simulate that transaction was actually started
      session._transactionStarted = true;
      session._pgClient = await client._pool.connect();

      await session.commitTransaction();
      assert.strictEqual(session.inTransaction, false);
      assert.ok(client._queries.some(q => q === 'COMMIT'));
    });

    it('should be a no-op if transaction was never started (no DB ops)', async () => {
      const client = createMockClient();
      const session = new ClientSession(client);
      session.startTransaction();
      // No DB operations, so _transactionStarted is false
      await session.commitTransaction();
      assert.strictEqual(session.inTransaction, false);
    });
  });

  describe('abortTransaction', () => {
    it('should throw if not in transaction', async () => {
      const client = createMockClient();
      const session = new ClientSession(client);
      await assert.rejects(() => session.abortTransaction(), /No transaction started/);
    });

    it('should execute ROLLBACK and reset state', async () => {
      const client = createMockClient();
      const session = new ClientSession(client);
      session.startTransaction();
      session._transactionStarted = true;
      session._pgClient = await client._pool.connect();

      await session.abortTransaction();
      assert.strictEqual(session.inTransaction, false);
      assert.ok(client._queries.some(q => q === 'ROLLBACK'));
    });
  });

  describe('_ensureTransaction', () => {
    it('should execute BEGIN on first call', async () => {
      const client = createMockClient();
      const session = new ClientSession(client);
      session.startTransaction();
      await session._ensureTransaction();

      assert.ok(client._queries.some(q => q.includes('BEGIN')));
      assert.strictEqual(session._transactionStarted, true);
    });

    it('should not execute BEGIN on subsequent calls', async () => {
      const client = createMockClient();
      const session = new ClientSession(client);
      session.startTransaction();
      await session._ensureTransaction();
      const countBefore = client._queries.filter(q => q.includes('BEGIN')).length;
      await session._ensureTransaction();
      const countAfter = client._queries.filter(q => q.includes('BEGIN')).length;
      assert.strictEqual(countBefore, countAfter);
    });

    it('should use SERIALIZABLE for snapshot read concern', async () => {
      const client = createMockClient();
      const session = new ClientSession(client);
      session.startTransaction({ readConcern: { level: 'snapshot' } });
      await session._ensureTransaction();
      assert.ok(client._queries.some(q => q.includes('SERIALIZABLE')));
    });

    it('should use REPEATABLE READ for majority read concern', async () => {
      const client = createMockClient();
      const session = new ClientSession(client);
      session.startTransaction({ readConcern: { level: 'majority' } });
      await session._ensureTransaction();
      assert.ok(client._queries.some(q => q.includes('REPEATABLE READ')));
    });

    it('should use READ COMMITTED by default', async () => {
      const client = createMockClient();
      const session = new ClientSession(client);
      session.startTransaction();
      await session._ensureTransaction();
      assert.ok(client._queries.some(q => q.includes('READ COMMITTED')));
    });

    it('should be a no-op if not in transaction', async () => {
      const client = createMockClient();
      const session = new ClientSession(client);
      await session._ensureTransaction();
      assert.strictEqual(client._queries.length, 0);
    });
  });

  describe('withTransaction', () => {
    it('should auto-commit on success', async () => {
      const client = createMockClient();
      const session = new ClientSession(client);
      let fnCalled = false;

      const result = await session.withTransaction(async (s) => {
        fnCalled = true;
        assert.strictEqual(s, session);
        return 42;
      });

      assert.ok(fnCalled);
      assert.strictEqual(result, 42);
      assert.strictEqual(session.inTransaction, false);
    });

    it('should auto-abort on error', async () => {
      const client = createMockClient();
      const session = new ClientSession(client);

      await assert.rejects(
        () => session.withTransaction(async () => { throw new Error('boom'); }),
        /boom/
      );

      assert.strictEqual(session.inTransaction, false);
    });
  });

  describe('endSession', () => {
    it('should be idempotent', async () => {
      const client = createMockClient();
      const session = new ClientSession(client);
      await session.endSession();
      await session.endSession(); // Should not throw
      assert.strictEqual(session._ended, true);
    });

    it('should abort active transaction', async () => {
      const client = createMockClient();
      const session = new ClientSession(client);
      session.startTransaction();
      await session.endSession();
      assert.strictEqual(session.inTransaction, false);
      assert.strictEqual(session._ended, true);
    });

    it('should release pg client', async () => {
      const client = createMockClient();
      const session = new ClientSession(client);
      let released = false;
      session._pgClient = {
        query: async () => {},
        release: () => { released = true; }
      };
      await session.endSession();
      assert.ok(released);
      assert.strictEqual(session._pgClient, null);
    });

    it('should emit "ended" event', async () => {
      const client = createMockClient();
      const session = new ClientSession(client);
      let emitted = false;
      session.on('ended', () => { emitted = true; });
      await session.endSession();
      assert.ok(emitted);
    });
  });

  describe('isolation level mapping', () => {
    it('should map snapshot to SERIALIZABLE', () => {
      const client = createMockClient();
      const session = new ClientSession(client);
      assert.strictEqual(session._mapReadConcernToIsolation('snapshot'), 'SERIALIZABLE');
    });

    it('should map linearizable to SERIALIZABLE', () => {
      const client = createMockClient();
      const session = new ClientSession(client);
      assert.strictEqual(session._mapReadConcernToIsolation('linearizable'), 'SERIALIZABLE');
    });

    it('should map majority to REPEATABLE READ', () => {
      const client = createMockClient();
      const session = new ClientSession(client);
      assert.strictEqual(session._mapReadConcernToIsolation('majority'), 'REPEATABLE READ');
    });

    it('should map local to READ COMMITTED', () => {
      const client = createMockClient();
      const session = new ClientSession(client);
      assert.strictEqual(session._mapReadConcernToIsolation('local'), 'READ COMMITTED');
    });

    it('should map null to READ COMMITTED', () => {
      const client = createMockClient();
      const session = new ClientSession(client);
      assert.strictEqual(session._mapReadConcernToIsolation(null), 'READ COMMITTED');
    });

    it('should handle readConcern as object with level', () => {
      const client = createMockClient();
      const session = new ClientSession(client);
      assert.strictEqual(session._mapReadConcernToIsolation({ level: 'snapshot' }), 'SERIALIZABLE');
    });
  });
});
