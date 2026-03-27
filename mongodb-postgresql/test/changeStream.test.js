'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert');
const { ChangeStream } = require('../lib/changeStream');

describe('ChangeStream', () => {
  describe('constructor', () => {
    it('should set collection-level channel name', () => {
      const parent = { _name: 'users', _db: { _schemaName: 'mydb' } };
      const cs = new ChangeStream(parent);
      assert.strictEqual(cs._channelName, 'change_mydb_users');
    });

    it('should set db-level channel name', () => {
      const parent = { _dbName: 'testdb' };
      const cs = new ChangeStream(parent);
      assert.strictEqual(cs._channelName, 'change_testdb');
    });

    it('should set client-level channel name', () => {
      const parent = {};
      const cs = new ChangeStream(parent);
      assert.strictEqual(cs._channelName, 'change_all');
    });

    it('should default fullDocument to "default"', () => {
      const cs = new ChangeStream({});
      assert.strictEqual(cs._fullDocument, 'default');
    });

    it('should accept fullDocument option', () => {
      const cs = new ChangeStream({}, [], { fullDocument: 'updateLookup' });
      assert.strictEqual(cs._fullDocument, 'updateLookup');
    });

    it('should store pipeline', () => {
      const pipeline = [{ $match: { operationType: 'insert' } }];
      const cs = new ChangeStream({}, pipeline);
      assert.deepStrictEqual(cs._pipeline, pipeline);
    });

    it('resumeToken should be null initially', () => {
      const cs = new ChangeStream({});
      assert.strictEqual(cs.resumeToken, null);
    });

    it('should not be closed initially', () => {
      const cs = new ChangeStream({});
      assert.strictEqual(cs._closed, false);
    });
  });

  describe('_matchesPipeline', () => {
    it('should return true for empty pipeline', () => {
      const cs = new ChangeStream({});
      assert.ok(cs._matchesPipeline({ operationType: 'insert' }));
    });

    it('should filter by operationType', () => {
      const cs = new ChangeStream({}, [{ $match: { operationType: 'insert' } }]);
      assert.ok(cs._matchesPipeline({ operationType: 'insert' }));
      assert.ok(!cs._matchesPipeline({ operationType: 'delete' }));
    });

    it('should filter by fullDocument field', () => {
      const cs = new ChangeStream({}, [{ $match: { 'fullDocument.status': 'active' } }]);
      assert.ok(cs._matchesPipeline({ fullDocument: { status: 'active' } }));
      assert.ok(!cs._matchesPipeline({ fullDocument: { status: 'inactive' } }));
    });

    it('should handle missing fullDocument', () => {
      const cs = new ChangeStream({}, [{ $match: { 'fullDocument.status': 'active' } }]);
      assert.ok(!cs._matchesPipeline({ operationType: 'delete' }));
    });

    it('should pass through non-$match stages', () => {
      const cs = new ChangeStream({}, [{ $project: { operationType: 1 } }]);
      assert.ok(cs._matchesPipeline({ operationType: 'update' }));
    });
  });

  describe('hasNext', () => {
    it('should return true when not closed', async () => {
      const cs = new ChangeStream({});
      assert.ok(await cs.hasNext());
    });

    it('should return false when closed', async () => {
      const cs = new ChangeStream({});
      cs._closed = true;
      assert.ok(!(await cs.hasNext()));
    });
  });

  describe('getCreateTriggerSQL', () => {
    it('should return valid SQL for trigger creation', () => {
      const sql = ChangeStream.getCreateTriggerSQL('users', 'change_mydb_users');
      assert.ok(sql.includes('CREATE OR REPLACE FUNCTION'));
      assert.ok(sql.includes('notify_change_mydb_users'));
      assert.ok(sql.includes('pg_notify'));
      assert.ok(sql.includes('change_mydb_users'));
      assert.ok(sql.includes('CREATE TRIGGER'));
      assert.ok(sql.includes('AFTER INSERT OR UPDATE OR DELETE'));
      assert.ok(sql.includes('FOR EACH ROW'));
    });

    it('should include handling for INSERT, UPDATE, and DELETE', () => {
      const sql = ChangeStream.getCreateTriggerSQL('orders', 'ch');
      assert.ok(sql.includes("'insert'"));
      assert.ok(sql.includes("'update'"));
      assert.ok(sql.includes("'delete'"));
      assert.ok(sql.includes('TG_OP'));
    });

    it('should reference OLD for DELETE and NEW for INSERT/UPDATE', () => {
      const sql = ChangeStream.getCreateTriggerSQL('t', 'ch');
      assert.ok(sql.includes('OLD._id'));
      assert.ok(sql.includes('NEW._id'));
      assert.ok(sql.includes('NEW.data'));
    });

    it('should drop existing trigger before creating', () => {
      const sql = ChangeStream.getCreateTriggerSQL('t', 'ch');
      assert.ok(sql.includes('DROP TRIGGER IF EXISTS'));
    });
  });

  describe('close', () => {
    it('should set closed flag', async () => {
      const cs = new ChangeStream({});
      await cs.close();
      assert.strictEqual(cs._closed, true);
    });

    it('should be idempotent', async () => {
      const cs = new ChangeStream({});
      await cs.close();
      await cs.close(); // Should not throw
    });

    it('should emit close event', async () => {
      const cs = new ChangeStream({});
      let emitted = false;
      cs.on('close', () => { emitted = true; });
      await cs.close();
      assert.ok(emitted);
    });
  });
});
