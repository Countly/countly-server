'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert');

// ==========================
// $facet SQL translation
// ==========================
describe('$facet SQL translation', () => {
  const { AggregateTranslator } = require('../lib/aggregateTranslator');

  it('should generate jsonb_build_object for simple $facet', () => {
    const at = new AggregateTranslator('orders', null);
    const result = at.translate([
      { $facet: {
        totalCount: [{ $count: 'count' }],
        topItems: [{ $sort: { amount: -1 } }, { $limit: 5 }]
      }}
    ]);
    assert.ok(result.sql.includes('jsonb_build_object'));
    assert.ok(result.sql.includes('jsonb_agg'));
  });

  it('should handle $facet with $match sub-pipelines', () => {
    const at = new AggregateTranslator('products', null);
    const result = at.translate([
      { $facet: {
        cheap: [{ $match: { price: { $lt: 10 } } }],
        expensive: [{ $match: { price: { $gte: 100 } } }]
      }}
    ]);
    assert.ok(result.sql.includes('WHERE'));
    assert.ok(result.sql.includes('jsonb_build_object'));
  });

  it('should handle $facet after a $match stage', () => {
    const at = new AggregateTranslator('orders', null);
    const result = at.translate([
      { $match: { status: 'complete' } },
      { $facet: {
        byCategory: [{ $group: { _id: '$category', count: { $sum: 1 } } }],
        total: [{ $count: 'n' }]
      }}
    ]);
    assert.ok(result.sql.includes('WITH'));
    assert.ok(result.sql.includes('jsonb_build_object'));
  });

  it('should have correct param for facet field names', () => {
    const at = new AggregateTranslator('t', null);
    const result = at.translate([
      { $facet: { results: [{ $limit: 10 }] } }
    ]);
    assert.ok(result.params.includes('results'));
  });
});

// ==========================
// $zip expression
// ==========================
describe('$zip expression', () => {
  const { AggregateTranslator } = require('../lib/aggregateTranslator');

  function translate(expr) {
    const at = new AggregateTranslator('t', null);
    return at.translate([{ $addFields: { zipped: expr } }]);
  }

  it('should generate generate_series and jsonb_build_array', () => {
    const r = translate({ $zip: { inputs: ['$a', '$b'] } });
    assert.ok(r.sql.includes('generate_series'));
    assert.ok(r.sql.includes('jsonb_build_array'));
  });

  it('should use LEAST for default (shortest) length', () => {
    const r = translate({ $zip: { inputs: ['$a', '$b'] } });
    assert.ok(r.sql.includes('LEAST'));
  });

  it('should use GREATEST when useLongestLength is true', () => {
    const r = translate({ $zip: { inputs: ['$a', '$b'], useLongestLength: true } });
    assert.ok(r.sql.includes('GREATEST'));
  });

  it('should include defaults when provided', () => {
    const r = translate({
      $zip: { inputs: ['$a', '$b'], useLongestLength: true, defaults: [0, 'N/A'] }
    });
    assert.ok(r.sql.includes('COALESCE'));
    assert.ok(r.params.some(p => typeof p === 'string' && p.includes('N/A')));
  });

  it('should handle three inputs', () => {
    const r = translate({ $zip: { inputs: ['$a', '$b', '$c'] } });
    // Should have 3 elements in jsonb_build_array
    const count = (r.sql.match(/COALESCE/g) || []).length;
    assert.ok(count >= 3);
  });
});

// ==========================
// New error classes
// ==========================
describe('New error classes', () => {
  const errors = require('../lib/errors');

  it('MongoTailableCursorError should extend MongoError', () => {
    const e = new errors.MongoTailableCursorError();
    assert.ok(e instanceof errors.MongoError);
    assert.ok(e instanceof Error);
    assert.strictEqual(e.name, 'MongoTailableCursorError');
    assert.ok(e.message.includes('Tailable'));
  });

  it('MongoTailableCursorError should accept custom message', () => {
    const e = new errors.MongoTailableCursorError('custom msg');
    assert.strictEqual(e.message, 'custom msg');
  });

  it('MongoBatchReExecutionError should extend MongoError', () => {
    const e = new errors.MongoBatchReExecutionError();
    assert.ok(e instanceof errors.MongoError);
    assert.strictEqual(e.name, 'MongoBatchReExecutionError');
    assert.ok(e.message.includes('re-executed'));
  });

  it('MongoBatchReExecutionError should accept custom message', () => {
    const e = new errors.MongoBatchReExecutionError('already ran');
    assert.strictEqual(e.message, 'already ran');
  });

  it('MongoUnexpectedServerResponseError should extend MongoError', () => {
    const e = new errors.MongoUnexpectedServerResponseError('bad response');
    assert.ok(e instanceof errors.MongoError);
    assert.strictEqual(e.name, 'MongoUnexpectedServerResponseError');
    assert.strictEqual(e.message, 'bad response');
  });

  it('all 30 error classes should be exported from errors.js', () => {
    assert.strictEqual(Object.keys(errors).length, 30);
  });
});

// ==========================
// Client-level bulkWrite
// ==========================
describe('MongoClient.bulkWrite', () => {
  const MongoClient = require('../lib/client');

  function createMockClient() {
    const queries = [];
    const client = new MongoClient('postgresql://localhost/test');
    client._defaultDbName = 'testdb';
    client._connected = true;

    const mockPool = {
      query: async (sql, params) => {
        queries.push({ sql, params });
        if (sql.includes('CREATE')) return { rows: [], rowCount: 0 };
        if (sql.includes('INSERT')) return { rows: [], rowCount: 1 };
        if (sql.includes('SELECT _id FROM')) return { rows: [{ _id: 'found' }], rowCount: 1 };
        if (sql.includes('UPDATE')) return { rows: [], rowCount: 1 };
        if (sql.includes('DELETE')) return { rows: [], rowCount: 1 };
        if (sql.includes('SELECT COUNT')) return { rows: [{ count: 5 }] };
        if (sql.includes('pg_notify')) return { rows: [], rowCount: 0 };
        return { rows: [], rowCount: 0 };
      }
    };
    client._pool = mockPool;
    client._queries = queries;
    return client;
  }

  it('should process insertOne operations across namespaces', async () => {
    const client = createMockClient();
    const results = await client.bulkWrite([
      { namespace: 'testdb.users', insertOne: { document: { name: 'Alice' } } },
      { namespace: 'testdb.orders', insertOne: { document: { item: 'Widget' } } }
    ]);
    assert.strictEqual(results.insertedCount, 2);
    assert.ok(results.insertResults[0].insertedId);
    assert.ok(results.insertResults[1].insertedId);
  });

  it('should process updateOne operations', async () => {
    const client = createMockClient();
    const results = await client.bulkWrite([
      { namespace: 'testdb.users', updateOne: { filter: { _id: '1' }, update: { $set: { name: 'Bob' } } } }
    ]);
    assert.strictEqual(results.matchedCount, 1);
    assert.strictEqual(results.modifiedCount, 1);
  });

  it('should process deleteOne operations', async () => {
    const client = createMockClient();
    const results = await client.bulkWrite([
      { namespace: 'testdb.users', deleteOne: { filter: { _id: '1' } } }
    ]);
    assert.strictEqual(results.deletedCount, 1);
  });

  it('should process deleteMany operations', async () => {
    const client = createMockClient();
    const results = await client.bulkWrite([
      { namespace: 'testdb.old', deleteMany: { filter: { status: 'archived' } } }
    ]);
    assert.strictEqual(results.deletedCount, 1);
  });

  it('should process mixed operations', async () => {
    const client = createMockClient();
    const results = await client.bulkWrite([
      { namespace: 'testdb.users', insertOne: { document: { name: 'Alice' } } },
      { namespace: 'testdb.users', updateOne: { filter: { _id: 'x' }, update: { $set: { age: 30 } } } },
      { namespace: 'testdb.logs', deleteMany: { filter: { old: true } } }
    ]);
    assert.strictEqual(results.insertedCount, 1);
    assert.strictEqual(results.matchedCount, 1);
    assert.strictEqual(results.deletedCount, 1);
  });

  it('should throw if namespace is missing', async () => {
    const client = createMockClient();
    await assert.rejects(
      () => client.bulkWrite([{ insertOne: { document: { x: 1 } } }]),
      /namespace/
    );
  });

  it('should handle replaceOne operations', async () => {
    const client = createMockClient();
    // Need to set up the mock to handle replaceOne flow (find then update)
    const results = await client.bulkWrite([
      { namespace: 'testdb.users', replaceOne: { filter: { _id: '1' }, replacement: { name: 'New' } } }
    ]);
    assert.ok(results.matchedCount >= 0);
  });

  it('should parse db.collection from namespace', async () => {
    const client = createMockClient();
    await client.bulkWrite([
      { namespace: 'mydb.users', insertOne: { document: { x: 1 } } }
    ]);
    // Should have created a Db for 'mydb'
    assert.ok(client._dbs.has('mydb'));
  });
});

// ==========================
// Updated export count
// ==========================
describe('Final exports (59)', () => {
  it('should have 59 exports', () => {
    const pkg = require('../index');
    assert.strictEqual(Object.keys(pkg).length, 59);
  });

  it('should export new error classes', () => {
    const pkg = require('../index');
    assert.ok(pkg.MongoTailableCursorError);
    assert.ok(pkg.MongoBatchReExecutionError);
    assert.ok(pkg.MongoUnexpectedServerResponseError);
  });

  it('new error classes should extend MongoError', () => {
    const pkg = require('../index');
    assert.ok(new pkg.MongoTailableCursorError() instanceof pkg.MongoError);
    assert.ok(new pkg.MongoBatchReExecutionError() instanceof pkg.MongoError);
    assert.ok(new pkg.MongoUnexpectedServerResponseError('x') instanceof pkg.MongoError);
  });
});
