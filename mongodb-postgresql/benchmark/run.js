'use strict';

/**
 * Benchmark: mongodb-postgresql vs native MongoDB driver
 *
 * Measures operations/second for:
 * - insertOne (single documents)
 * - insertMany (batch of 100)
 * - findOne (by _id)
 * - find (query + sort + limit)
 * - updateOne ($set + $inc)
 * - updateMany ($set on matching docs)
 * - deleteOne (by _id)
 * - deleteMany (by query)
 * - aggregate ($match + $group + $sort)
 *
 * Usage:
 *   node benchmark/run.js --pg postgresql://user:pass@host:port/db
 *   node benchmark/run.js --mongo mongodb://user:pass@host:port/db
 *   node benchmark/run.js --pg <pg_url> --mongo <mongo_url>    # compare both
 */

const ITERATIONS = 1000;
const BATCH_SIZE = 100;
const WARMUP = 50;

async function runBenchmark(label, client, db) {
  const results = {};

  // Seed data
  const col = db.collection('bench');
  try { await col.drop(); } catch (e) { /* */ }
  await col.createIndex({ status: 1 });
  await col.createIndex({ category: 1, value: 1 });

  const seedDocs = [];
  for (let i = 0; i < 10000; i++) {
    seedDocs.push({
      _id: `doc_${String(i).padStart(6, '0')}`,
      name: `User ${i}`,
      status: i % 3 === 0 ? 'active' : i % 3 === 1 ? 'inactive' : 'pending',
      category: `cat_${i % 20}`,
      value: Math.floor(Math.random() * 1000),
      tags: [`tag_${i % 5}`, `tag_${i % 7}`],
      nested: { score: Math.random() * 100, level: i % 10 },
      createdAt: new Date(Date.now() - Math.random() * 86400000 * 365)
    });
  }

  // Batch insert seed data
  for (let i = 0; i < seedDocs.length; i += 1000) {
    await col.insertMany(seedDocs.slice(i, i + 1000));
  }

  // ============================================================
  // insertOne
  // ============================================================
  {
    const tempCol = db.collection('bench_insert');
    try { await tempCol.drop(); } catch (e) { /* */ }

    // Warmup
    for (let i = 0; i < WARMUP; i++) {
      await tempCol.insertOne({ _id: `warm_${i}`, v: i });
    }
    try { await tempCol.drop(); } catch (e) { /* */ }

    const start = process.hrtime.bigint();
    for (let i = 0; i < ITERATIONS; i++) {
      await tempCol.insertOne({ _id: `ins_${i}`, name: `Test ${i}`, value: i });
    }
    const elapsed = Number(process.hrtime.bigint() - start) / 1e6;
    results.insertOne = { ops: ITERATIONS, ms: elapsed, opsPerSec: Math.round(ITERATIONS / (elapsed / 1000)) };
  }

  // ============================================================
  // insertMany (batches of BATCH_SIZE)
  // ============================================================
  {
    const tempCol = db.collection('bench_insertmany');
    try { await tempCol.drop(); } catch (e) { /* */ }

    const batches = Math.floor(ITERATIONS / BATCH_SIZE);
    const start = process.hrtime.bigint();
    for (let b = 0; b < batches; b++) {
      const docs = [];
      for (let i = 0; i < BATCH_SIZE; i++) {
        docs.push({ _id: `batch_${b}_${i}`, v: b * BATCH_SIZE + i });
      }
      await tempCol.insertMany(docs);
    }
    const elapsed = Number(process.hrtime.bigint() - start) / 1e6;
    const totalDocs = batches * BATCH_SIZE;
    results.insertMany = { ops: totalDocs, ms: elapsed, opsPerSec: Math.round(totalDocs / (elapsed / 1000)), batchSize: BATCH_SIZE };
  }

  // ============================================================
  // findOne by _id
  // ============================================================
  {
    // Warmup
    for (let i = 0; i < WARMUP; i++) {
      await col.findOne({ _id: `doc_${String(i).padStart(6, '0')}` });
    }

    const start = process.hrtime.bigint();
    for (let i = 0; i < ITERATIONS; i++) {
      const idx = i % 10000;
      await col.findOne({ _id: `doc_${String(idx).padStart(6, '0')}` });
    }
    const elapsed = Number(process.hrtime.bigint() - start) / 1e6;
    results.findOne = { ops: ITERATIONS, ms: elapsed, opsPerSec: Math.round(ITERATIONS / (elapsed / 1000)) };
  }

  // ============================================================
  // find with query + sort + limit
  // ============================================================
  {
    const queryIterations = Math.floor(ITERATIONS / 2);

    // Warmup
    for (let i = 0; i < WARMUP; i++) {
      await col.find({ status: 'active', value: { $gt: 500 } }).sort({ value: -1 }).limit(20).toArray();
    }

    const start = process.hrtime.bigint();
    for (let i = 0; i < queryIterations; i++) {
      const threshold = (i * 7) % 900 + 50;
      await col.find({ status: 'active', value: { $gt: threshold } }).sort({ value: -1 }).limit(20).toArray();
    }
    const elapsed = Number(process.hrtime.bigint() - start) / 1e6;
    results.find = { ops: queryIterations, ms: elapsed, opsPerSec: Math.round(queryIterations / (elapsed / 1000)) };
  }

  // ============================================================
  // updateOne ($set + $inc)
  // ============================================================
  {
    // Warmup
    for (let i = 0; i < WARMUP; i++) {
      await col.updateOne({ _id: `doc_${String(i).padStart(6, '0')}` }, { $set: { name: 'Warmed' }, $inc: { value: 1 } });
    }

    const start = process.hrtime.bigint();
    for (let i = 0; i < ITERATIONS; i++) {
      const idx = i % 10000;
      await col.updateOne(
        { _id: `doc_${String(idx).padStart(6, '0')}` },
        { $set: { name: `Updated ${i}` }, $inc: { value: 1 } }
      );
    }
    const elapsed = Number(process.hrtime.bigint() - start) / 1e6;
    results.updateOne = { ops: ITERATIONS, ms: elapsed, opsPerSec: Math.round(ITERATIONS / (elapsed / 1000)) };
  }

  // ============================================================
  // updateMany
  // ============================================================
  {
    const updateManyIters = 100;

    const start = process.hrtime.bigint();
    for (let i = 0; i < updateManyIters; i++) {
      const cat = `cat_${i % 20}`;
      await col.updateMany({ category: cat }, { $set: { lastBatch: i } });
    }
    const elapsed = Number(process.hrtime.bigint() - start) / 1e6;
    results.updateMany = { ops: updateManyIters, ms: elapsed, opsPerSec: Math.round(updateManyIters / (elapsed / 1000)) };
  }

  // ============================================================
  // deleteOne
  // ============================================================
  {
    const delCol = db.collection('bench_delete');
    try { await delCol.drop(); } catch (e) { /* */ }
    const delDocs = [];
    for (let i = 0; i < ITERATIONS; i++) {
      delDocs.push({ _id: `del_${i}`, v: i });
    }
    for (let i = 0; i < delDocs.length; i += 1000) {
      await delCol.insertMany(delDocs.slice(i, i + 1000));
    }

    const start = process.hrtime.bigint();
    for (let i = 0; i < ITERATIONS; i++) {
      await delCol.deleteOne({ _id: `del_${i}` });
    }
    const elapsed = Number(process.hrtime.bigint() - start) / 1e6;
    results.deleteOne = { ops: ITERATIONS, ms: elapsed, opsPerSec: Math.round(ITERATIONS / (elapsed / 1000)) };
  }

  // ============================================================
  // deleteMany
  // ============================================================
  {
    // Re-seed for deleteMany
    const delManyCol = db.collection('bench_delmany');
    try { await delManyCol.drop(); } catch (e) { /* */ }
    const docs = [];
    for (let i = 0; i < 5000; i++) {
      docs.push({ _id: `dm_${i}`, batch: i % 100, v: i });
    }
    for (let i = 0; i < docs.length; i += 1000) {
      await delManyCol.insertMany(docs.slice(i, i + 1000));
    }

    const delManyIters = 100;
    const start = process.hrtime.bigint();
    for (let i = 0; i < delManyIters; i++) {
      await delManyCol.deleteMany({ batch: i });
    }
    const elapsed = Number(process.hrtime.bigint() - start) / 1e6;
    results.deleteMany = { ops: delManyIters, ms: elapsed, opsPerSec: Math.round(delManyIters / (elapsed / 1000)) };
  }

  // ============================================================
  // aggregate ($match + $group + $sort)
  // ============================================================
  {
    const aggIters = 200;

    // Warmup
    for (let i = 0; i < 10; i++) {
      await col.aggregate([
        { $match: { status: 'active' } },
        { $group: { _id: '$category', total: { $sum: '$value' }, count: { $sum: 1 } } },
        { $sort: { total: -1 } },
        { $limit: 10 }
      ]).toArray();
    }

    const start = process.hrtime.bigint();
    for (let i = 0; i < aggIters; i++) {
      await col.aggregate([
        { $match: { status: 'active' } },
        { $group: { _id: '$category', total: { $sum: '$value' }, count: { $sum: 1 } } },
        { $sort: { total: -1 } },
        { $limit: 10 }
      ]).toArray();
    }
    const elapsed = Number(process.hrtime.bigint() - start) / 1e6;
    results.aggregate = { ops: aggIters, ms: elapsed, opsPerSec: Math.round(aggIters / (elapsed / 1000)) };
  }

  // Cleanup
  try { await db.collection('bench_insert').drop(); } catch (e) { /* */ }
  try { await db.collection('bench_insertmany').drop(); } catch (e) { /* */ }
  try { await db.collection('bench_delete').drop(); } catch (e) { /* */ }
  try { await db.collection('bench_delmany').drop(); } catch (e) { /* */ }

  return results;
}

function printResults(pgResults, mongoResults) {
  console.log('\n' + '='.repeat(80));
  console.log(' BENCHMARK RESULTS');
  console.log('='.repeat(80));

  const ops = ['insertOne', 'insertMany', 'findOne', 'find', 'updateOne', 'updateMany', 'deleteOne', 'deleteMany', 'aggregate'];
  const header = pgResults && mongoResults
    ? `${'Operation'.padEnd(15)} | ${'PostgreSQL'.padStart(12)} | ${'MongoDB'.padStart(12)} | ${'Ratio'.padStart(8)} | Notes`
    : `${'Operation'.padEnd(15)} | ${'ops/sec'.padStart(12)} | ${'Total ms'.padStart(12)} | ${'Ops'.padStart(8)}`;

  console.log(header);
  console.log('-'.repeat(80));

  for (const op of ops) {
    if (pgResults && mongoResults) {
      const pg = pgResults[op];
      const mg = mongoResults[op];
      if (!pg || !mg) continue;
      const ratio = (pg.opsPerSec / mg.opsPerSec).toFixed(2);
      const faster = pg.opsPerSec > mg.opsPerSec ? 'PG faster' : pg.opsPerSec < mg.opsPerSec ? 'Mongo faster' : 'Equal';
      const note = op === 'insertMany' ? ` (batch=${pg.batchSize})` : '';
      console.log(`${op.padEnd(15)} | ${String(pg.opsPerSec + ' ops/s').padStart(12)} | ${String(mg.opsPerSec + ' ops/s').padStart(12)} | ${(ratio + 'x').padStart(8)} | ${faster}${note}`);
    } else {
      const r = pgResults?.[op] || mongoResults?.[op];
      if (!r) continue;
      const note = op === 'insertMany' ? ` (batch=${r.batchSize})` : '';
      console.log(`${op.padEnd(15)} | ${String(r.opsPerSec + ' ops/s').padStart(12)} | ${String(Math.round(r.ms) + ' ms').padStart(12)} | ${String(r.ops).padStart(8)}${note}`);
    }
  }
  console.log('='.repeat(80));
}

async function main() {
  const args = process.argv.slice(2);
  const pgUrl = args.includes('--pg') ? args[args.indexOf('--pg') + 1] : null;
  const mongoUrl = args.includes('--mongo') ? args[args.indexOf('--mongo') + 1] : null;

  if (!pgUrl && !mongoUrl) {
    console.log('Usage:');
    console.log('  node benchmark/run.js --pg postgresql://user:pass@host:port/db');
    console.log('  node benchmark/run.js --mongo mongodb://user:pass@host:port/db');
    console.log('  node benchmark/run.js --pg <pg_url> --mongo <mongo_url>');
    process.exit(1);
  }

  let pgResults = null;
  let mongoResults = null;

  if (pgUrl) {
    console.log(`\nBenchmarking PostgreSQL: ${pgUrl}`);
    const { default: MongoClient } = await import('../index.js').then(m => ({ default: m.MongoClient }));
    const client = await MongoClient.connect(pgUrl);
    const db = client.db('benchmark');
    try { await client._pool.query('CREATE SCHEMA IF NOT EXISTS "benchmark"'); } catch (e) { /* */ }
    console.log('  Running...');
    pgResults = await runBenchmark('PostgreSQL', client, db);
    try { await db.dropDatabase(); } catch (e) { /* */ }
    await client.close();
  }

  if (mongoUrl) {
    console.log(`\nBenchmarking MongoDB: ${mongoUrl}`);
    let mongodb;
    try {
      mongodb = require('mongodb');
    } catch (e) {
      console.log('  ERROR: "mongodb" package not installed. Run: npm install mongodb');
      process.exit(1);
    }
    const client = await mongodb.MongoClient.connect(mongoUrl);
    const db = client.db('benchmark');
    console.log('  Running...');
    mongoResults = await runBenchmark('MongoDB', client, db);
    try { await db.dropDatabase(); } catch (e) { /* */ }
    await client.close();
  }

  printResults(pgResults, mongoResults);
}

main().catch(err => { console.error(err); process.exit(1); });
