# mongodb-postgresql

A drop-in replacement for the MongoDB Node.js driver that uses PostgreSQL as the backend. Change one `require()` line and your existing MongoDB code runs against PostgreSQL — no other code changes needed.

## Why

You have an application built on MongoDB but a customer (or your ops team) needs to run on PostgreSQL instead. Rewriting every query, update, and aggregation pipeline is months of work. This library translates them for you at runtime.

## How it works

```
Your application code (unchanged)
        |
        v
  mongodb-postgresql        <-- translates at runtime
        |
        v
    PostgreSQL (JSONB)
```

Each MongoDB **collection** becomes a PostgreSQL **table**:

```sql
CREATE TABLE "users" (
  _id  TEXT PRIMARY KEY,
  data JSONB NOT NULL DEFAULT '{}'
);
```

- Documents are stored as JSONB with a GIN index for fast queries
- MongoDB query operators (`$gt`, `$in`, `$regex`, `$elemMatch`, etc.) are translated to PostgreSQL JSONB operators
- Update operators (`$set`, `$inc`, `$push`, `$pull`, etc.) become `jsonb_set()` chains
- Aggregation pipelines become SQL CTEs with `GROUP BY`, window functions, and JSONB aggregations
- Dates, ObjectIds, Buffers, and RegExps survive the roundtrip via typed JSONB encoding

## Quick start

```bash
npm install mongodb-postgresql pg
```

```js
// Before:
// const { MongoClient } = require('mongodb');

// After:
const { MongoClient } = require('mongodb-postgresql');

// Point to PostgreSQL instead of MongoDB
const client = await MongoClient.connect('postgresql://user:pass@localhost:5432/mydb');
const db = client.db('analytics');

// Everything else is the same MongoDB API
await db.collection('users').insertOne({ name: 'Alice', age: 30 });

const users = await db.collection('users')
  .find({ age: { $gt: 25 } })
  .sort({ name: 1 })
  .limit(10)
  .toArray();

const stats = await db.collection('orders').aggregate([
  { $match: { status: 'complete' } },
  { $group: { _id: '$category', total: { $sum: '$amount' } } },
  { $sort: { total: -1 } }
]).toArray();

await client.close();
```

## Connection strings

The library accepts both PostgreSQL and MongoDB connection strings. MongoDB URIs are automatically converted:

```js
// PostgreSQL (native)
MongoClient.connect('postgresql://user:pass@localhost:5432/mydb')

// MongoDB (auto-converted)
MongoClient.connect('mongodb://user:pass@localhost:5432/mydb?retryWrites=true&w=majority')

// MongoDB SRV (auto-converted)
MongoClient.connect('mongodb+srv://user:pass@host/mydb')
```

MongoDB-specific query parameters (`retryWrites`, `authSource`, `replicaSet`, etc.) are automatically stripped.

## API coverage

**~98% of the MongoDB Node.js driver API** is implemented (excluding Atlas-only features and APM monitoring events).

### Fully supported (100%)

| Category | Details |
|---|---|
| **CRUD** | `insertOne`, `insertMany`, `find`, `findOne`, `findOneAndUpdate`, `findOneAndReplace`, `findOneAndDelete`, `updateOne`, `updateMany`, `replaceOne`, `deleteOne`, `deleteMany` |
| **Query operators** | `$eq`, `$ne`, `$gt`, `$gte`, `$lt`, `$lte`, `$in`, `$nin`, `$and`, `$or`, `$nor`, `$not`, `$exists`, `$type`, `$regex`, `$size`, `$all`, `$elemMatch`, `$mod`, `$text`, `$expr`, `$near`, `$nearSphere`, `$geoWithin`, `$geoIntersects`, bitwise operators |
| **Update operators** | `$set`, `$unset`, `$inc`, `$mul`, `$min`, `$max`, `$rename`, `$push` (with `$each`, `$sort`, `$slice`, `$position`), `$pull`, `$pop`, `$addToSet`, `$currentDate`, `$bit`, `$setOnInsert` |
| **Cursors** | `toArray`, `next`, `tryNext`, `hasNext`, `forEach`, `map`, `close`, `rewind`, `clone`, `stream`, `explain`, `count`, `bufferedCount`, `readBufferedDocuments`, async iteration, all chainable modifiers (`sort`, `skip`, `limit`, `project`, `hint`, `collation`, `batchSize`, `allowDiskUse`, etc.) |
| **Aggregation stages** | `$match`, `$group`, `$sort`, `$limit`, `$skip`, `$project`, `$addFields`/`$set`, `$unset`, `$unwind`, `$lookup`, `$count`, `$sample`, `$sortByCount`, `$bucket`, `$replaceRoot`, `$out`, `$merge`, `$facet`, `$graphLookup`, `$unionWith`, `$setWindowFields` |
| **Aggregation accumulators** | `$sum`, `$avg`, `$min`, `$max`, `$first`, `$last`, `$push`, `$addToSet`, `$count`, `$stdDevPop`, `$stdDevSamp`, `$mergeObjects`, `$top`, `$bottom`, `$topN`, `$bottomN`, `$firstN`, `$lastN`, `$maxN`, `$minN` |
| **Aggregation expressions** | 100+ operators including arithmetic, string, date, array, set, conditional, type conversion, comparison, boolean, trigonometric, object, and literal operators |
| **Window functions** | `$rank`, `$denseRank`, `$documentNumber`, `$shift` (LEAD/LAG), `$sum`, `$avg`, `$min`, `$max`, `$count`, `$first`, `$last`, `$stdDevPop`, `$stdDevSamp` via `$setWindowFields` |
| **AggregationCursor** | All cursor methods plus fluent pipeline builders: `addStage`, `group`, `match`, `sort`, `limit`, `skip`, `project`, `unwind`, `lookup`, `out`, `redact`, `geoNear` |
| **BSON types** | `ObjectId`, `Long`, `Decimal128`, `Binary`, `Timestamp`, `MinKey`, `MaxKey`, `Code`, `BSONRegExp`, `Double`, `Int32`, `UUID`, `DBRef` |
| **MongoClient** | `connect`, `close`, `db`, `startSession`, `withSession`, `watch`, `bulkWrite`, `isConnected`, `topology` |
| **Db** | `collection`, `createCollection`, `listCollections`, `collections`, `dropCollection`, `dropDatabase`, `createIndex`, `renameCollection`, `indexInformation`, `command`, `stats`, `admin`, `watch`, `profilingLevel`, `setProfilingLevel`, `removeUser` |
| **Admin** | `ping`, `serverInfo`, `serverStatus`, `buildInfo`, `listDatabases`, `removeUser`, `replSetGetStatus`, `validateCollection`, `command` |
| **Sessions** | `startTransaction`, `commitTransaction`, `abortTransaction`, `withTransaction`, `endSession`, isolation level mapping (snapshot -> SERIALIZABLE, majority -> REPEATABLE READ) |
| **Change streams** | `watch()` on Client, Db, and Collection via PostgreSQL `LISTEN`/`NOTIFY` triggers |
| **GridFS** | `openUploadStream`, `openUploadStreamWithId`, `openDownloadStream`, `openDownloadStreamByName`, `delete`, `rename`, `drop`, `find` |
| **Bulk operations** | `initializeOrderedBulkOp`, `initializeUnorderedBulkOp`, `bulkWrite`, `BulkWriteResult` with full error reporting |
| **Indexes** | B-tree, GIN (text), GiST (geo), unique, sparse, TTL, compound |
| **Error classes** | All 30 MongoDB driver error classes with correct inheritance hierarchy |
| **Geospatial** | `$near`, `$nearSphere`, `$geoWithin` (with `$geometry`, `$centerSphere`, `$center`, `$box`, `$polygon`), `$geoIntersects`, `2dsphere`/`2d` indexes — requires PostGIS (lazy, only loaded when geo operators are used) |

### Not supported (~2%)

These require fundamentally different execution models that can't be mapped to SQL:

| Feature | Reason |
|---|---|
| `$bucketAuto` | Requires equal-frequency binning with a data-scanning algorithm |
| `$accumulator` | Runs arbitrary user-supplied JavaScript inside `$group` |
| `$reduce` | Recursive fold with user-defined JavaScript logic |
| `$expMovingAvg` | Stateful exponential weighting across rows |
| `$linearFill` | Gap-fill interpolation requiring lookahead/lookbehind state |
| `$derivative` / `$integral` | Calculus over time-series windows |
| `Session.toBSON()` | MongoDB wire protocol serialization internal |
| `Db.runCursorCommand()` | Raw MongoDB command passthrough |
| Atlas Search indexes | Cloud-only Atlas feature (`createSearchIndex`, `dropSearchIndex`, etc.) |
| Client-side field-level encryption | `ClientEncryption` class — MongoDB-specific encryption protocol |
| APM / Monitoring events | `CommandStartedEvent`, topology events, connection pool events (30+ event classes) |

## How MongoDB concepts map to PostgreSQL

| MongoDB | PostgreSQL |
|---|---|
| Database | Schema (or separate database) |
| Collection | Table (`_id TEXT PRIMARY KEY, data JSONB`) |
| Document | JSONB row |
| `_id` field | `_id` column (TEXT) |
| ObjectId | 24-char hex string |
| `find()` query | `SELECT ... WHERE` with JSONB operators |
| `$set` / `$inc` / `$push` | `jsonb_set()` chains |
| Aggregation pipeline | CTEs (`WITH stage_1 AS (...), stage_2 AS (...)`) |
| `$group` | `GROUP BY` with SQL aggregates |
| `$setWindowFields` | `OVER (PARTITION BY ... ORDER BY ...)` |
| `$lookup` | Correlated subquery with `jsonb_agg()` |
| `$graphLookup` | Recursive CTE (`WITH RECURSIVE`) |
| Index | B-tree, GIN, or GiST index |
| `2dsphere` index | PostGIS GiST index on `ST_GeomFromGeoJSON()` |
| Text index | GIN index on `to_tsvector()` |
| Transaction / Session | `BEGIN` / `COMMIT` / `ROLLBACK` with isolation levels |
| Change stream | `LISTEN` / `NOTIFY` with triggers |
| GridFS | Two tables (`<bucket>_files`, `<bucket>_chunks`) |
| `ReadPreference` | Accepted but no-op (PostgreSQL handles replication differently) |
| `WriteConcern` | Accepted but no-op (PostgreSQL is synchronous by default) |
| `ReadConcern` | Maps to transaction isolation level |

## Geospatial queries

Geospatial operators (`$near`, `$geoWithin`, etc.) require the [PostGIS](https://postgis.net/) extension. It's available on all major managed PostgreSQL services (AWS RDS, GCP Cloud SQL, Azure, Supabase, Neon, etc.).

Enable it once:

```sql
CREATE EXTENSION IF NOT EXISTS postgis;
```

If you don't use geospatial queries, PostGIS is never referenced and does not need to be installed.

## Date handling

Dates are stored in JSONB as `{ "$date": "2024-01-15T10:30:00.000Z" }` and automatically restored to JavaScript `Date` objects when documents are read back. This preserves type fidelity across the roundtrip.

## Testing

```bash
npm test
```

854 tests across 20 test files covering query translation, update translation, aggregation pipelines, CRUD operations, cursors, sessions, change streams, GridFS, bulk operations, BSON types, error classes, and geospatial queries.

## Project structure

```
mongodb-postgresql/
  index.js                         # 59 exports matching the MongoDB driver API
  lib/
    client.js                      # MongoClient (connection, sessions, client bulkWrite)
    db.js                          # Db, Admin, ArrayCursor
    collection.js                  # Collection (CRUD, aggregation, indexes, bulk ops)
    cursor.js                      # FindCursor
    aggregationCursor.js           # AggregationCursor with fluent pipeline builders
    queryTranslator.js             # MongoDB queries -> SQL WHERE clauses
    updateTranslator.js            # MongoDB updates -> SQL jsonb_set() chains
    aggregateTranslator.js         # Aggregation pipelines -> SQL CTEs
    session.js                     # ClientSession (PostgreSQL transactions)
    changeStream.js                # ChangeStream (LISTEN/NOTIFY)
    gridfs.js                      # GridFSBucket
    bulkWrite.js                   # Ordered/Unordered bulk operations
    objectId.js                    # ObjectId generation and parsing
    bson.js                        # BSON types (Long, UUID, Double, etc.)
    errors.js                      # 30 MongoDB-compatible error classes
    readPreference.js              # ReadPreference (compatibility stub)
    writeConcern.js                # WriteConcern (compatibility stub)
    readConcern.js                 # ReadConcern (maps to isolation levels)
  test/
    20 test files, 854 tests
```

## License

MIT
