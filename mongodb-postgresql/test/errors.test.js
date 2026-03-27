'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert');
const {
  MongoError,
  MongoNetworkError,
  MongoServerError,
  MongoWriteConcernError,
  MongoBulkWriteError,
  MongoServerSelectionError
} = require('../lib/errors');

describe('MongoError', () => {
  it('should be an instance of Error', () => {
    const err = new MongoError('test error');
    assert.ok(err instanceof Error);
    assert.ok(err instanceof MongoError);
  });

  it('should have correct name and message', () => {
    const err = new MongoError('something failed');
    assert.strictEqual(err.name, 'MongoError');
    assert.strictEqual(err.message, 'something failed');
  });

  it('should have a stack trace', () => {
    const err = new MongoError('test');
    assert.ok(err.stack);
    assert.ok(err.stack.includes('MongoError'));
  });
});

describe('MongoNetworkError', () => {
  it('should extend MongoError', () => {
    const err = new MongoNetworkError('connection refused');
    assert.ok(err instanceof MongoError);
    assert.ok(err instanceof Error);
    assert.strictEqual(err.name, 'MongoNetworkError');
    assert.strictEqual(err.message, 'connection refused');
  });
});

describe('MongoServerError', () => {
  it('should extend MongoError and include code', () => {
    const err = new MongoServerError('duplicate key', 11000);
    assert.ok(err instanceof MongoError);
    assert.strictEqual(err.name, 'MongoServerError');
    assert.strictEqual(err.code, 11000);
    assert.strictEqual(err.message, 'duplicate key');
  });

  it('should work without code', () => {
    const err = new MongoServerError('some error');
    assert.strictEqual(err.code, undefined);
  });
});

describe('MongoWriteConcernError', () => {
  it('should extend MongoError and include result', () => {
    const result = { n: 1, ok: 0 };
    const err = new MongoWriteConcernError('write concern failed', result);
    assert.ok(err instanceof MongoError);
    assert.strictEqual(err.name, 'MongoWriteConcernError');
    assert.strictEqual(err.result, result);
  });
});

describe('MongoBulkWriteError', () => {
  it('should extend MongoError and include result with writeErrors', () => {
    const result = {
      insertedCount: 1,
      writeErrors: [{ index: 2, code: 11000, errmsg: 'dup key' }]
    };
    const err = new MongoBulkWriteError('bulk write failed', result);
    assert.ok(err instanceof MongoError);
    assert.strictEqual(err.name, 'MongoBulkWriteError');
    assert.strictEqual(err.result, result);
    assert.strictEqual(err.writeErrors.length, 1);
    assert.strictEqual(err.writeErrors[0].code, 11000);
  });

  it('should default writeErrors to empty array', () => {
    const err = new MongoBulkWriteError('error', {});
    assert.deepStrictEqual(err.writeErrors, []);
  });
});

describe('MongoServerSelectionError', () => {
  it('should extend MongoError', () => {
    const err = new MongoServerSelectionError('no servers available');
    assert.ok(err instanceof MongoError);
    assert.strictEqual(err.name, 'MongoServerSelectionError');
  });
});
