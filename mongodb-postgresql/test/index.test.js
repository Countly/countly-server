'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert');

describe('Package exports', () => {
  it('should export all expected classes', () => {
    const pkg = require('../index');
    const expected = [
      'MongoClient', 'Db', 'Collection', 'Cursor', 'AggregationCursor',
      'ObjectId', 'Long', 'Decimal128', 'Binary', 'Timestamp',
      'MinKey', 'MaxKey', 'Code', 'BSONRegExp', 'Double', 'Int32',
      'UUID', 'DBRef', 'ReadPreference', 'WriteConcern',
      'ReadConcern', 'ReturnDocument', 'ClientSession', 'ChangeStream',
      'GridFSBucket', 'MongoError', 'MongoNetworkError', 'MongoServerError',
      'MongoWriteConcernError', 'BulkWriteResult',
    ];

    for (const name of expected) {
      assert.ok(pkg[name], `Missing export: ${name}`);
      const t = typeof pkg[name];
      assert.ok(t === 'function' || t === 'object', `${name} should be a function/class or object, got ${t}`);
    }
  });

  it('should export exactly the expected number of items', () => {
    const pkg = require('../index');
    assert.strictEqual(Object.keys(pkg).length, 59);
  });

  it('MongoClient should be usable with new', () => {
    const { MongoClient } = require('../index');
    const client = new MongoClient('postgresql://localhost/test');
    assert.ok(client);
  });

  it('ObjectId should be usable with new', () => {
    const { ObjectId } = require('../index');
    const id = new ObjectId();
    assert.ok(id.toHexString());
  });

  it('error classes should extend Error', () => {
    const { MongoError, MongoNetworkError, MongoServerError, MongoWriteConcernError } = require('../index');
    assert.ok(new MongoError('test') instanceof Error);
    assert.ok(new MongoNetworkError('test') instanceof MongoError);
    assert.ok(new MongoServerError('test', 1) instanceof MongoError);
    assert.ok(new MongoWriteConcernError('test', {}) instanceof MongoError);
  });

  it('BSON types should be constructible', () => {
    const { Long, Decimal128, Binary, Timestamp, MinKey, MaxKey, Code, Double, Int32, UUID, DBRef, BSONRegExp } = require('../index');
    assert.ok(new Long(42));
    assert.ok(new Decimal128('3.14'));
    assert.ok(new Binary(Buffer.alloc(0)));
    assert.ok(new Timestamp(0, 0));
    assert.ok(new MinKey());
    assert.ok(new MaxKey());
    assert.ok(new Code('return 1'));
    assert.ok(new Double(1.5));
    assert.ok(new Int32(42));
    assert.ok(new UUID());
    assert.ok(new DBRef('col', 'id'));
    assert.ok(new BSONRegExp('test'));
  });

  it('concern classes should be constructible', () => {
    const { ReadPreference, WriteConcern, ReadConcern } = require('../index');
    assert.ok(new ReadPreference('primary'));
    assert.ok(new WriteConcern('majority'));
    assert.ok(new ReadConcern('local'));
  });
});
