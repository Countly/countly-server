'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert');

// ==========================
// Error class hierarchy
// ==========================
describe('Error class hierarchy', () => {
  const errors = require('../lib/errors');

  it('MongoDriverError should extend MongoError', () => {
    const e = new errors.MongoDriverError('test');
    assert.ok(e instanceof errors.MongoError);
    assert.ok(e instanceof Error);
    assert.strictEqual(e.name, 'MongoDriverError');
  });

  it('MongoAPIError should extend MongoDriverError', () => {
    const e = new errors.MongoAPIError('test');
    assert.ok(e instanceof errors.MongoDriverError);
    assert.ok(e instanceof errors.MongoError);
  });

  it('MongoRuntimeError should extend MongoDriverError', () => {
    const e = new errors.MongoRuntimeError('test');
    assert.ok(e instanceof errors.MongoDriverError);
  });

  it('MongoInvalidArgumentError should extend MongoAPIError', () => {
    const e = new errors.MongoInvalidArgumentError('test');
    assert.ok(e instanceof errors.MongoAPIError);
    assert.ok(e instanceof errors.MongoDriverError);
    assert.ok(e instanceof errors.MongoError);
  });

  it('MongoNetworkTimeoutError should extend MongoNetworkError', () => {
    const e = new errors.MongoNetworkTimeoutError('test');
    assert.ok(e instanceof errors.MongoNetworkError);
    assert.ok(e instanceof errors.MongoError);
  });

  it('MongoTransactionError should have correct name', () => {
    const e = new errors.MongoTransactionError('tx failed');
    assert.strictEqual(e.name, 'MongoTransactionError');
    assert.strictEqual(e.message, 'tx failed');
  });

  it('MongoExpiredSessionError should have correct name', () => {
    assert.strictEqual(new errors.MongoExpiredSessionError('expired').name, 'MongoExpiredSessionError');
  });

  it('MongoCursorExhaustedError should have default message', () => {
    const e = new errors.MongoCursorExhaustedError();
    assert.strictEqual(e.message, 'Cursor is exhausted');
  });

  it('MongoCursorInUseError should have default message', () => {
    const e = new errors.MongoCursorInUseError();
    assert.strictEqual(e.message, 'Cursor is already initialized');
  });

  it('all 25 error classes should be exported', () => {
    const names = [
      'MongoError', 'MongoDriverError', 'MongoAPIError', 'MongoRuntimeError',
      'MongoNetworkError', 'MongoNetworkTimeoutError',
      'MongoServerError', 'MongoServerSelectionError',
      'MongoParseError', 'MongoInvalidArgumentError', 'MongoCompatibilityError',
      'MongoWriteConcernError', 'MongoBulkWriteError',
      'MongoTransactionError', 'MongoExpiredSessionError',
      'MongoNotConnectedError', 'MongoTopologyClosedError',
      'MongoCursorExhaustedError', 'MongoCursorInUseError',
      'MongoGridFSStreamError', 'MongoGridFSChunkError',
      'MongoChangeStreamError', 'MongoSystemError',
      'MongoMissingCredentialsError', 'MongoMissingDependencyError'
    ];
    for (const name of names) {
      assert.ok(errors[name], `Missing error: ${name}`);
      const e = name === 'MongoServerError'
        ? new errors[name]('test', 1)
        : name === 'MongoWriteConcernError' || name === 'MongoBulkWriteError'
          ? new errors[name]('test', {})
          : new errors[name]('test');
      assert.ok(e instanceof Error, `${name} should be Error`);
      assert.ok(e instanceof errors.MongoError, `${name} should be MongoError`);
    }
  });
});

// ==========================
// BulkWriteResult new methods
// ==========================
describe('BulkWriteResult new methods', () => {
  const { BulkWriteResult } = require('../lib/bulkWrite');

  it('isOk should return true when ok=1', () => {
    const r = new BulkWriteResult();
    assert.ok(r.isOk());
  });

  it('isOk should return false when ok=0', () => {
    const r = new BulkWriteResult();
    r.ok = 0;
    assert.ok(!r.isOk());
  });

  it('hasWriteErrors should return false initially', () => {
    assert.ok(!new BulkWriteResult().hasWriteErrors());
  });

  it('hasWriteErrors should return true when errors present', () => {
    const r = new BulkWriteResult();
    r.writeErrors = [{ index: 0, code: 11000, errmsg: 'dup' }];
    assert.ok(r.hasWriteErrors());
  });

  it('getWriteErrorCount should return count', () => {
    const r = new BulkWriteResult();
    r.writeErrors = [{ index: 0 }, { index: 1 }];
    assert.strictEqual(r.getWriteErrorCount(), 2);
  });

  it('getWriteErrorAt should return error at index', () => {
    const r = new BulkWriteResult();
    const err = { index: 0, code: 11000 };
    r.writeErrors = [err];
    assert.strictEqual(r.getWriteErrorAt(0), err);
    assert.strictEqual(r.getWriteErrorAt(5), null);
  });

  it('getWriteErrors should return all errors', () => {
    const r = new BulkWriteResult();
    r.writeErrors = [{ index: 0 }, { index: 1 }];
    assert.strictEqual(r.getWriteErrors().length, 2);
  });

  it('getWriteConcernError should return null when none', () => {
    assert.strictEqual(new BulkWriteResult().getWriteConcernError(), null);
  });

  it('getWriteConcernError should return first concern error', () => {
    const r = new BulkWriteResult();
    r.writeConcernErrors = [{ code: 100, errmsg: 'wc failed' }];
    assert.strictEqual(r.getWriteConcernError().code, 100);
  });

  it('getUpsertedIdAt should return upserted id', () => {
    const r = new BulkWriteResult();
    r.upsertedIds = { 0: 'abc', 2: 'def' };
    assert.strictEqual(r.getUpsertedIdAt(0), 'abc');
    assert.strictEqual(r.getUpsertedIdAt(2), 'def');
    assert.strictEqual(r.getUpsertedIdAt(1), null);
  });

  it('getRawResponse should return full object', () => {
    const r = new BulkWriteResult();
    r.insertedCount = 5;
    const raw = r.getRawResponse();
    assert.strictEqual(raw.nInserted, 5);
    assert.strictEqual(raw.ok, 1);
    assert.ok(Array.isArray(raw.writeErrors));
  });

  it('toString should return summary', () => {
    const r = new BulkWriteResult();
    r.insertedCount = 3;
    r.modifiedCount = 2;
    const s = r.toString();
    assert.ok(s.includes('3'));
    assert.ok(s.includes('2'));
  });
});

// ==========================
// New aggregation expression operators
// ==========================
describe('New aggregation expressions', () => {
  const { AggregateTranslator } = require('../lib/aggregateTranslator');

  function translate(expr) {
    const at = new AggregateTranslator('t', null);
    return at.translate([{ $addFields: { result: expr } }]);
  }

  describe('date operators', () => {
    it('$isoWeek should use EXTRACT WEEK', () => {
      const r = translate({ $isoWeek: '$d' });
      assert.ok(r.sql.includes('EXTRACT(WEEK'));
    });

    it('$isoWeekYear should use EXTRACT ISOYEAR', () => {
      const r = translate({ $isoWeekYear: '$d' });
      assert.ok(r.sql.includes('ISOYEAR'));
    });

    it('$isoDayOfWeek should use EXTRACT ISODOW', () => {
      const r = translate({ $isoDayOfWeek: '$d' });
      assert.ok(r.sql.includes('ISODOW'));
    });

    it('$dateAdd should generate interval addition', () => {
      const r = translate({ $dateAdd: { startDate: '$d', unit: 'day', amount: 5 } });
      assert.ok(r.sql.includes('+'));
      assert.ok(r.sql.includes('INTERVAL'));
    });

    it('$dateSubtract should generate interval subtraction', () => {
      const r = translate({ $dateSubtract: { startDate: '$d', unit: 'hour', amount: 3 } });
      assert.ok(r.sql.includes('-'));
      assert.ok(r.sql.includes('INTERVAL'));
    });

    it('$dateTrunc should use date_trunc', () => {
      const r = translate({ $dateTrunc: { date: '$d', unit: 'month' } });
      assert.ok(r.sql.includes('date_trunc'));
    });
  });

  describe('string operators', () => {
    it('$indexOfBytes should use POSITION', () => {
      const r = translate({ $indexOfBytes: ['$s', 'abc'] });
      assert.ok(r.sql.includes('POSITION'));
    });

    it('$substrCP should use SUBSTR', () => {
      const r = translate({ $substrCP: ['$s', 1, 3] });
      assert.ok(r.sql.includes('SUBSTR'));
    });

    it('$strcasecmp should compare case-insensitively', () => {
      const r = translate({ $strcasecmp: ['$a', '$b'] });
      assert.ok(r.sql.includes('LOWER'));
      assert.ok(r.sql.includes('CASE WHEN'));
    });

    it('$regexFindAll should use regexp_matches with g flag', () => {
      const r = translate({ $regexFindAll: { input: '$s', regex: 'abc' } });
      assert.ok(r.sql.includes('regexp_matches'));
      assert.ok(r.sql.includes("'g'"));
    });
  });

  describe('array/set operators', () => {
    it('$range should use generate_series', () => {
      const r = translate({ $range: [0, 10] });
      assert.ok(r.sql.includes('generate_series'));
    });

    it('$indexOfArray should find element index', () => {
      const r = translate({ $indexOfArray: ['$arr', '$val'] });
      assert.ok(r.sql.includes('jsonb_array_elements'));
      assert.ok(r.sql.includes('idx'));
    });

    it('$setUnion should use UNION', () => {
      const r = translate({ $setUnion: ['$a', '$b'] });
      assert.ok(r.sql.includes('UNION'));
    });

    it('$setIntersection should use INTERSECT', () => {
      const r = translate({ $setIntersection: ['$a', '$b'] });
      assert.ok(r.sql.includes('INTERSECT'));
    });

    it('$setDifference should use EXCEPT', () => {
      const r = translate({ $setDifference: ['$a', '$b'] });
      assert.ok(r.sql.includes('EXCEPT'));
    });

    it('$setIsSubset should check no elements left after EXCEPT', () => {
      const r = translate({ $setIsSubset: ['$a', '$b'] });
      assert.ok(r.sql.includes('NOT EXISTS'));
      assert.ok(r.sql.includes('EXCEPT'));
    });

    it('$setEquals should check bidirectional subset', () => {
      const r = translate({ $setEquals: ['$a', '$b'] });
      // Should have two NOT EXISTS...EXCEPT checks
      const count = (r.sql.match(/EXCEPT/g) || []).length;
      assert.ok(count >= 2);
    });

    it('$sortArray should ORDER BY', () => {
      const r = translate({ $sortArray: { input: '$arr', sortBy: { score: -1 } } });
      assert.ok(r.sql.includes('ORDER BY'));
      assert.ok(r.sql.includes('DESC'));
    });

    it('$sortArray with numeric sort', () => {
      const r = translate({ $sortArray: { input: '$arr', sortBy: 1 } });
      assert.ok(r.sql.includes('ORDER BY'));
      assert.ok(r.sql.includes('ASC'));
    });
  });

  describe('type/field operators', () => {
    it('$isNumber should check jsonb_typeof', () => {
      const r = translate({ $isNumber: '$val' });
      assert.ok(r.sql.includes('jsonb_typeof'));
      assert.ok(r.sql.includes('number'));
    });

    it('$getField should access field', () => {
      const r = translate({ $getField: 'name' });
      assert.ok(r.sql.includes("data->'name'"));
    });

    it('$getField with input object', () => {
      const r = translate({ $getField: { field: 'x', input: '$obj' } });
      assert.ok(r.sql.includes("'x'"));
    });

    it('$setField should use jsonb_set', () => {
      const r = translate({ $setField: { field: 'x', input: '$obj', value: 42 } });
      assert.ok(r.sql.includes('jsonb_set'));
    });

    it('$unsetField should remove field', () => {
      const r = translate({ $unsetField: { field: 'x', input: '$obj' } });
      assert.ok(r.sql.includes('-'));
    });
  });

  describe('new group accumulators', () => {
    const { AggregateTranslator } = require('../lib/aggregateTranslator');

    it('$mergeObjects should be recognized', () => {
      const at = new AggregateTranslator('t', null);
      const r = at.translate([{ $group: { _id: null, merged: { $mergeObjects: '$data' } } }]);
      assert.ok(r.sql.includes('jsonb_object_agg') || r.sql.includes('jsonb'));
    });

    it('$firstN should be recognized', () => {
      const at = new AggregateTranslator('t', null);
      const r = at.translate([{ $group: { _id: '$g', items: { $firstN: { input: '$val', n: 3 } } } }]);
      assert.ok(r.sql.includes('array_agg'));
    });

    it('$lastN should be recognized', () => {
      const at = new AggregateTranslator('t', null);
      const r = at.translate([{ $group: { _id: '$g', items: { $lastN: { input: '$val', n: 3 } } } }]);
      assert.ok(r.sql.includes('array_agg'));
    });

    it('$maxN should be recognized', () => {
      const at = new AggregateTranslator('t', null);
      const r = at.translate([{ $group: { _id: '$g', items: { $maxN: { input: '$val', n: 3 } } } }]);
      assert.ok(r.sql.includes('DESC'));
    });

    it('$minN should be recognized', () => {
      const at = new AggregateTranslator('t', null);
      const r = at.translate([{ $group: { _id: '$g', items: { $minN: { input: '$val', n: 3 } } } }]);
      assert.ok(r.sql.includes('ASC'));
    });

    it('$top should sort and take first', () => {
      const at = new AggregateTranslator('t', null);
      const r = at.translate([{ $group: { _id: '$g', best: { $top: { sortBy: { score: -1 }, output: '$name' } } } }]);
      assert.ok(r.sql.includes('ORDER BY'));
      assert.ok(r.sql.includes('DESC'));
    });

    it('$bottom should sort and take last', () => {
      const at = new AggregateTranslator('t', null);
      const r = at.translate([{ $group: { _id: '$g', worst: { $bottom: { sortBy: { score: -1 }, output: '$name' } } } }]);
      assert.ok(r.sql.includes('ORDER BY'));
    });
  });
});

// ==========================
// Collection.count (deprecated)
// ==========================
describe('Collection.count (deprecated)', () => {
  const { Collection } = require('../lib/collection');

  it('should delegate to countDocuments', async () => {
    const pool = {
      query: async (sql) => {
        if (sql.includes('CREATE')) return { rows: [], rowCount: 0 };
        return { rows: [{ count: 42 }] };
      }
    };
    const db = { _client: { _pool: pool }, _dbName: 'test', _schemaName: 'test', _getPool: () => pool };
    const col = new Collection(db, 'users');
    assert.strictEqual(await col.count({ status: 'active' }), 42);
  });
});

// ==========================
// Collection.indexes and indexInformation
// ==========================
describe('Collection.indexes and indexInformation', () => {
  const { Collection } = require('../lib/collection');

  function createCol() {
    const pool = {
      query: async (sql) => {
        if (sql.includes('pg_indexes')) {
          return { rows: [
            { indexname: 'users_pkey', indexdef: 'CREATE UNIQUE INDEX users_pkey ON users (_id)' },
            { indexname: 'idx_email', indexdef: 'CREATE INDEX idx_email ON users ((data->>email))' }
          ]};
        }
        return { rows: [], rowCount: 0 };
      }
    };
    const db = { _client: { _pool: pool }, _dbName: 'test', _schemaName: 'test', _getPool: () => pool };
    return new Collection(db, 'users');
  }

  it('indexes() should return array of index info', async () => {
    const col = createCol();
    const indexes = await col.indexes();
    assert.ok(Array.isArray(indexes));
    assert.strictEqual(indexes.length, 2);
    assert.strictEqual(indexes[0].name, 'users_pkey');
  });

  it('indexInformation() should return name->key mapping', async () => {
    const col = createCol();
    const info = await col.indexInformation();
    assert.ok(info.users_pkey);
    assert.ok(Array.isArray(info.users_pkey));
  });
});

// ==========================
// listCollections / listIndexes return ArrayCursor
// ==========================
describe('ArrayCursor (from listCollections/listIndexes)', () => {
  const { ArrayCursor } = require('../lib/db');

  it('should support toArray', async () => {
    const cursor = new ArrayCursor([{ name: 'a' }, { name: 'b' }]);
    const arr = await cursor.toArray();
    assert.strictEqual(arr.length, 2);
  });

  it('should support next', async () => {
    const cursor = new ArrayCursor([{ x: 1 }, { x: 2 }]);
    assert.deepStrictEqual(await cursor.next(), { x: 1 });
    assert.deepStrictEqual(await cursor.next(), { x: 2 });
    assert.strictEqual(await cursor.next(), null);
  });

  it('should support tryNext', async () => {
    const cursor = new ArrayCursor([{ a: 1 }]);
    assert.deepStrictEqual(await cursor.tryNext(), { a: 1 });
    assert.strictEqual(await cursor.tryNext(), null);
  });

  it('should support hasNext', async () => {
    const cursor = new ArrayCursor([{ a: 1 }]);
    assert.ok(await cursor.hasNext());
    await cursor.next();
    assert.ok(!(await cursor.hasNext()));
  });

  it('should support forEach', async () => {
    const items = [];
    const cursor = new ArrayCursor([1, 2, 3]);
    await cursor.forEach(item => items.push(item));
    assert.deepStrictEqual(items, [1, 2, 3]);
  });

  it('forEach should stop on false', async () => {
    const items = [];
    const cursor = new ArrayCursor([1, 2, 3]);
    await cursor.forEach(item => { items.push(item); return item < 2; });
    assert.deepStrictEqual(items, [1, 2]);
  });

  it('should support map', async () => {
    const cursor = new ArrayCursor([{ name: 'a' }, { name: 'b' }]);
    cursor.map(item => item.name);
    const arr = await cursor.toArray();
    assert.deepStrictEqual(arr, ['a', 'b']);
  });

  it('should support close', async () => {
    const cursor = new ArrayCursor([1]);
    await cursor.close();
    assert.strictEqual(cursor._closed, true);
  });

  it('should support rewind', async () => {
    const cursor = new ArrayCursor([1, 2]);
    await cursor.next();
    await cursor.next();
    cursor.rewind();
    assert.deepStrictEqual(await cursor.next(), 1);
  });

  it('should support bufferedCount', () => {
    const cursor = new ArrayCursor([1, 2, 3]);
    assert.strictEqual(cursor.bufferedCount(), 3);
  });

  it('should support clone', () => {
    const cursor = new ArrayCursor([1, 2]);
    const cloned = cursor.clone();
    assert.notStrictEqual(cursor, cloned);
    assert.strictEqual(cloned.bufferedCount(), 2);
  });

  it('should support async iteration', async () => {
    const cursor = new ArrayCursor([1, 2, 3]);
    const items = [];
    for await (const item of cursor) {
      items.push(item);
    }
    assert.deepStrictEqual(items, [1, 2, 3]);
  });

  it('should support stream', () => {
    const cursor = new ArrayCursor([1, 2]);
    const s = cursor.stream();
    assert.ok(typeof s.pipe === 'function');
  });
});

// ==========================
// Db new methods
// ==========================
describe('Db new methods', () => {
  const { Db } = require('../lib/db');

  function createMockClient(queryResponses = {}) {
    const queries = [];
    const pool = {
      query: async (sql, params) => {
        queries.push({ sql, params });
        for (const [pattern, response] of Object.entries(queryResponses)) {
          if (sql.includes(pattern)) return response;
        }
        return { rows: [], rowCount: 0 };
      }
    };
    return { _pool: pool, _queries: queries };
  }

  it('renameCollection should rename and return new collection', async () => {
    const client = createMockClient();
    const db = new Db(client, 'mydb');
    const col = await db.renameCollection('old', 'new');
    assert.strictEqual(col.collectionName, 'new');
    assert.ok(client._queries.some(q => q.sql.includes('RENAME TO')));
  });

  it('indexInformation should delegate to collection', async () => {
    const client = createMockClient({
      'pg_indexes': { rows: [{ indexname: 'idx', indexdef: 'x' }] }
    });
    const db = new Db(client, 'mydb');
    const info = await db.indexInformation('users');
    assert.ok(info.idx);
  });

  it('removeUser should return true', async () => {
    const client = createMockClient();
    const db = new Db(client, 'mydb');
    assert.strictEqual(await db.removeUser('testuser'), true);
  });

  it('profilingLevel should return off', async () => {
    const client = createMockClient();
    const db = new Db(client, 'mydb');
    assert.strictEqual(await db.profilingLevel(), 'off');
  });

  it('setProfilingLevel should return off', async () => {
    const client = createMockClient();
    const db = new Db(client, 'mydb');
    assert.strictEqual(await db.setProfilingLevel('all'), 'off');
  });
});

// ==========================
// Admin new methods
// ==========================
describe('Admin new methods', () => {
  const { Admin } = require('../lib/db');

  function createMockClient() {
    return {
      _pool: {
        query: async (sql) => {
          if (sql.includes('pg_stat')) return { rows: [{ relname: 'test', n_live_tup: 100, n_dead_tup: 5 }] };
          if (sql.includes('SELECT 1')) return { rows: [{ '?column?': 1 }] };
          return { rows: [] };
        }
      }
    };
  }

  it('removeUser should return true', async () => {
    const admin = new Admin(createMockClient());
    assert.strictEqual(await admin.removeUser('user'), true);
  });

  it('replSetGetStatus should return stub', async () => {
    const admin = new Admin(createMockClient());
    const status = await admin.replSetGetStatus();
    assert.strictEqual(status.ok, 1);
    assert.strictEqual(status.set, 'postgresql');
  });

  it('validateCollection should return result', async () => {
    const admin = new Admin(createMockClient());
    const result = await admin.validateCollection('test');
    assert.strictEqual(result.ok, 1);
    assert.strictEqual(result.valid, true);
    assert.strictEqual(result.nrecords, 100);
  });

  it('command should handle more commands', async () => {
    const admin = new Admin(createMockClient());
    assert.ok((await admin.command({ serverStatus: 1 })).ok);
    assert.ok((await admin.command({ replSetGetStatus: 1 })).ok);
  });
});

// ==========================
// Updated exports count
// ==========================
describe('Updated exports (54)', () => {
  it('should have 59 exports', () => {
    const pkg = require('../index');
    assert.strictEqual(Object.keys(pkg).length, 59);
  });

  it('should export all new error classes', () => {
    const pkg = require('../index');
    const errorNames = [
      'MongoError', 'MongoDriverError', 'MongoAPIError', 'MongoRuntimeError',
      'MongoNetworkError', 'MongoNetworkTimeoutError',
      'MongoServerError', 'MongoServerSelectionError',
      'MongoParseError', 'MongoInvalidArgumentError', 'MongoCompatibilityError',
      'MongoWriteConcernError', 'MongoBulkWriteError',
      'MongoTransactionError', 'MongoExpiredSessionError',
      'MongoNotConnectedError', 'MongoTopologyClosedError',
      'MongoCursorExhaustedError', 'MongoCursorInUseError',
      'MongoGridFSStreamError', 'MongoGridFSChunkError',
      'MongoChangeStreamError', 'MongoSystemError',
      'MongoMissingCredentialsError', 'MongoMissingDependencyError'
    ];
    for (const name of errorNames) {
      assert.ok(pkg[name], `Missing: ${name}`);
    }
  });

  it('should export Admin, OrderedBulkOperation, UnorderedBulkOperation', () => {
    const pkg = require('../index');
    assert.ok(pkg.Admin);
    assert.ok(pkg.OrderedBulkOperation);
    assert.ok(pkg.UnorderedBulkOperation);
  });
});
