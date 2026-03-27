'use strict';

const { describe, it, beforeEach } = require('node:test');
const assert = require('node:assert');
const { BulkWriteResult, OrderedBulkOperation, UnorderedBulkOperation } = require('../lib/bulkWrite');

describe('BulkWriteResult', () => {
  it('should initialize with zero counts', () => {
    const r = new BulkWriteResult();
    assert.strictEqual(r.insertedCount, 0);
    assert.strictEqual(r.matchedCount, 0);
    assert.strictEqual(r.modifiedCount, 0);
    assert.strictEqual(r.deletedCount, 0);
    assert.strictEqual(r.upsertedCount, 0);
    assert.deepStrictEqual(r.insertedIds, {});
    assert.deepStrictEqual(r.upsertedIds, {});
    assert.strictEqual(r.ok, 1);
  });
});

describe('OrderedBulkOperation', () => {
  // Create a mock collection for testing the operation builder
  let operations;

  function createMockCollection() {
    const ops = [];
    return {
      insertOne: async (doc) => { ops.push({ type: 'insert', doc }); return { insertedId: doc._id || 'id1' }; },
      updateOne: async (filter, update, options) => {
        ops.push({ type: 'updateOne', filter, update, options });
        return { matchedCount: 1, modifiedCount: 1 };
      },
      updateMany: async (filter, update, options) => {
        ops.push({ type: 'updateMany', filter, update, options });
        return { matchedCount: 2, modifiedCount: 2 };
      },
      deleteOne: async (filter) => { ops.push({ type: 'deleteOne', filter }); return { deletedCount: 1 }; },
      deleteMany: async (filter) => { ops.push({ type: 'deleteMany', filter }); return { deletedCount: 3 }; },
      replaceOne: async (filter, replacement, options) => {
        ops.push({ type: 'replaceOne', filter, replacement, options });
        return { matchedCount: 1, modifiedCount: 1 };
      },
      _ops: ops
    };
  }

  it('should queue insert operations', () => {
    const mockCol = createMockCollection();
    const bulk = new OrderedBulkOperation(mockCol);
    bulk.insert({ name: 'Alice' });
    bulk.insert({ name: 'Bob' });
    assert.strictEqual(bulk._operations.length, 2);
    assert.strictEqual(bulk._operations[0].type, 'insert');
    assert.strictEqual(bulk._operations[1].type, 'insert');
  });

  it('find().updateOne() should queue updateOne', () => {
    const mockCol = createMockCollection();
    const bulk = new OrderedBulkOperation(mockCol);
    bulk.find({ status: 'old' }).updateOne({ $set: { status: 'new' } });
    assert.strictEqual(bulk._operations.length, 1);
    assert.strictEqual(bulk._operations[0].type, 'updateOne');
  });

  it('find().update() should queue updateMany', () => {
    const mockCol = createMockCollection();
    const bulk = new OrderedBulkOperation(mockCol);
    bulk.find({ status: 'old' }).update({ $set: { status: 'new' } });
    assert.strictEqual(bulk._operations.length, 1);
    assert.strictEqual(bulk._operations[0].type, 'updateMany');
  });

  it('find().deleteOne() should queue deleteOne', () => {
    const mockCol = createMockCollection();
    const bulk = new OrderedBulkOperation(mockCol);
    bulk.find({ status: 'deleted' }).deleteOne();
    assert.strictEqual(bulk._operations.length, 1);
    assert.strictEqual(bulk._operations[0].type, 'deleteOne');
  });

  it('find().delete() should queue deleteMany', () => {
    const mockCol = createMockCollection();
    const bulk = new OrderedBulkOperation(mockCol);
    bulk.find({ status: 'deleted' }).delete();
    assert.strictEqual(bulk._operations.length, 1);
    assert.strictEqual(bulk._operations[0].type, 'deleteMany');
  });

  it('find().replaceOne() should queue replaceOne', () => {
    const mockCol = createMockCollection();
    const bulk = new OrderedBulkOperation(mockCol);
    bulk.find({ _id: '1' }).replaceOne({ name: 'New', status: 'active' });
    assert.strictEqual(bulk._operations.length, 1);
    assert.strictEqual(bulk._operations[0].type, 'replaceOne');
  });

  it('find().upsert().updateOne() should queue upsert updateOne', () => {
    const mockCol = createMockCollection();
    const bulk = new OrderedBulkOperation(mockCol);
    bulk.find({ name: 'Alice' }).upsert().updateOne({ $set: { age: 30 } });
    assert.strictEqual(bulk._operations[0].upsert, true);
    assert.strictEqual(bulk._operations[0].type, 'updateOne');
  });

  it('find().upsert().update() should queue upsert updateMany', () => {
    const mockCol = createMockCollection();
    const bulk = new OrderedBulkOperation(mockCol);
    bulk.find({ name: 'Alice' }).upsert().update({ $set: { age: 30 } });
    assert.strictEqual(bulk._operations[0].upsert, true);
    assert.strictEqual(bulk._operations[0].type, 'updateMany');
  });

  it('find().upsert().replaceOne() should queue upsert replaceOne', () => {
    const mockCol = createMockCollection();
    const bulk = new OrderedBulkOperation(mockCol);
    bulk.find({ name: 'Alice' }).upsert().replaceOne({ name: 'Alice', age: 30 });
    assert.strictEqual(bulk._operations[0].upsert, true);
    assert.strictEqual(bulk._operations[0].type, 'replaceOne');
  });

  it('raw() should accept insertOne format', () => {
    const mockCol = createMockCollection();
    const bulk = new OrderedBulkOperation(mockCol);
    bulk.raw({ insertOne: { document: { name: 'Test' } } });
    assert.strictEqual(bulk._operations[0].type, 'insert');
    assert.deepStrictEqual(bulk._operations[0].document, { name: 'Test' });
  });

  it('raw() should accept updateOne format', () => {
    const mockCol = createMockCollection();
    const bulk = new OrderedBulkOperation(mockCol);
    bulk.raw({ updateOne: { filter: { _id: '1' }, update: { $set: { x: 1 } }, upsert: true } });
    assert.strictEqual(bulk._operations[0].type, 'updateOne');
    assert.strictEqual(bulk._operations[0].upsert, true);
  });

  it('raw() should accept updateMany format', () => {
    const mockCol = createMockCollection();
    const bulk = new OrderedBulkOperation(mockCol);
    bulk.raw({ updateMany: { filter: {}, update: { $set: { x: 1 } } } });
    assert.strictEqual(bulk._operations[0].type, 'updateMany');
  });

  it('raw() should accept deleteOne format', () => {
    const mockCol = createMockCollection();
    const bulk = new OrderedBulkOperation(mockCol);
    bulk.raw({ deleteOne: { filter: { _id: '1' } } });
    assert.strictEqual(bulk._operations[0].type, 'deleteOne');
  });

  it('raw() should accept deleteMany format', () => {
    const mockCol = createMockCollection();
    const bulk = new OrderedBulkOperation(mockCol);
    bulk.raw({ deleteMany: { filter: { status: 'old' } } });
    assert.strictEqual(bulk._operations[0].type, 'deleteMany');
  });

  it('raw() should accept replaceOne format', () => {
    const mockCol = createMockCollection();
    const bulk = new OrderedBulkOperation(mockCol);
    bulk.raw({ replaceOne: { filter: { _id: '1' }, replacement: { x: 1 } } });
    assert.strictEqual(bulk._operations[0].type, 'replaceOne');
  });

  it('execute() should process all operations and return result', async () => {
    const mockCol = createMockCollection();
    const bulk = new OrderedBulkOperation(mockCol);
    bulk.insert({ _id: 'a', name: 'A' });
    bulk.find({ x: 1 }).updateOne({ $set: { y: 2 } });
    bulk.find({ z: 3 }).delete();

    const result = await bulk.execute();
    assert.strictEqual(result.insertedCount, 1);
    assert.strictEqual(result.matchedCount, 1);
    assert.strictEqual(result.modifiedCount, 1);
    assert.strictEqual(result.deletedCount, 3);
    assert.ok(result instanceof BulkWriteResult);
  });

  it('execute() should throw on second call', async () => {
    const mockCol = createMockCollection();
    const bulk = new OrderedBulkOperation(mockCol);
    bulk.insert({ name: 'Test' });
    await bulk.execute();
    await assert.rejects(() => bulk.execute(), /cannot be re-executed/);
  });

  it('execute() should stop on error (ordered)', async () => {
    const mockCol = {
      insertOne: async (doc) => {
        if (doc.fail) throw new Error('insert failed');
        return { insertedId: 'id' };
      },
      updateOne: async () => ({ matchedCount: 1, modifiedCount: 1 }),
      deleteOne: async () => ({ deletedCount: 1 })
    };
    const bulk = new OrderedBulkOperation(mockCol);
    bulk.insert({ name: 'OK' });
    bulk.insert({ fail: true });
    bulk.insert({ name: 'Never reached' });

    await assert.rejects(() => bulk.execute(), /insert failed/);
  });
});

describe('UnorderedBulkOperation', () => {
  it('should continue on error and collect all errors', async () => {
    let callCount = 0;
    const mockCol = {
      insertOne: async (doc) => {
        callCount++;
        if (doc.fail) throw new Error('insert failed');
        return { insertedId: 'id' };
      }
    };
    const bulk = new UnorderedBulkOperation(mockCol);
    bulk.insert({ name: 'OK' });
    bulk.insert({ fail: true });
    bulk.insert({ name: 'Also OK' });

    await assert.rejects(async () => bulk.execute(), (err) => {
      assert.ok(err.result);
      assert.ok(err.result.writeErrors.length > 0);
      return true;
    });
    // All 3 operations should have been attempted
    assert.strictEqual(callCount, 3);
  });

  it('should succeed if no errors', async () => {
    const mockCol = {
      insertOne: async (doc) => ({ insertedId: doc._id || 'id' }),
      updateOne: async () => ({ matchedCount: 1, modifiedCount: 1 })
    };
    const bulk = new UnorderedBulkOperation(mockCol);
    bulk.insert({ name: 'A' });
    bulk.insert({ name: 'B' });

    const result = await bulk.execute();
    assert.strictEqual(result.insertedCount, 2);
    assert.strictEqual(result.ok, 1);
  });
});
