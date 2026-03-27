'use strict';

const { ObjectId } = require('./objectId');
const { QueryTranslator } = require('./queryTranslator');
const { UpdateTranslator } = require('./updateTranslator');
const { AggregateTranslator } = require('./aggregateTranslator');
const { Cursor } = require('./cursor');
const { AggregationCursor } = require('./aggregationCursor');
const { ChangeStream } = require('./changeStream');
const { OrderedBulkOperation, UnorderedBulkOperation, BulkWriteResult } = require('./bulkWrite');
const { MongoServerError } = require('./errors');

class Collection {
  constructor(db, name, options = {}) {
    this._db = db;
    this._name = name;
    this._options = options;
    this._initialized = false;
    this._hint = null;
  }

  get hint() {
    return this._hint;
  }

  set hint(value) {
    this._hint = value;
  }

  get collectionName() {
    return this._name;
  }

  get dbName() {
    return this._db._dbName;
  }

  get namespace() {
    return `${this._db._dbName}.${this._name}`;
  }

  _tableName() {
    const schema = this._db._schemaName;
    return schema ? `"${schema}"."${this._name}"` : `"${this._name}"`;
  }

  _getPool() {
    return this._db._getPool();
  }

  async _getClient(session) {
    if (session) {
      await session._ensureTransaction();
      if (session._pgClient) {
        return session._pgClient;
      }
    }
    return this._getPool();
  }

  async _ensureTable() {
    if (this._initialized) return;
    const pool = this._getPool();
    try {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS ${this._tableName()} (
          _id TEXT PRIMARY KEY,
          data JSONB NOT NULL DEFAULT '{}'::jsonb
        )
      `);
      // Create GIN index for JSONB queries
      const indexName = `idx_${this._name}_data_gin`.replace(/[^a-zA-Z0-9_]/g, '_');
      await pool.query(`
        CREATE INDEX IF NOT EXISTS "${indexName}" ON ${this._tableName()} USING GIN (data)
      `).catch(() => {}); // Ignore if exists
    } catch (err) {
      // Table might already exist from another connection
      if (!err.message.includes('already exists')) {
        throw err;
      }
    }
    this._initialized = true;
  }

  // ==================== INSERT ====================

  async insertOne(doc, options = {}) {
    await this._ensureTable();
    const client = await this._getClient(options.session);

    const document = { ...doc };
    if (!document._id) {
      document._id = new ObjectId();
    }

    const id = this._extractId(document._id);
    const data = this._documentToJsonb(document);

    try {
      await client.query(
        `INSERT INTO ${this._tableName()} (_id, data) VALUES ($1, $2)`,
        [id, JSON.stringify(data)]
      );
    } catch (err) {
      if (err.code === '23505') {
        throw new MongoServerError(`E11000 duplicate key error collection: ${this.namespace} index: _id_ dup key: { _id: "${id}" }`, 11000);
      }
      throw err;
    }

    return {
      acknowledged: true,
      insertedId: document._id
    };
  }

  async insertMany(docs, options = {}) {
    await this._ensureTable();
    const client = await this._getClient(options.session);
    const ordered = options.ordered !== false;

    const insertedIds = {};
    const documents = docs.map((doc, i) => {
      const document = { ...doc };
      if (!document._id) {
        document._id = new ObjectId();
      }
      insertedIds[i] = document._id;
      return document;
    });

    if (ordered) {
      // Build a single multi-row INSERT
      const values = [];
      const placeholders = [];
      let paramIdx = 0;

      for (const doc of documents) {
        const id = this._extractId(doc._id);
        const data = this._documentToJsonb(doc);
        paramIdx++;
        const idParam = `$${paramIdx}`;
        paramIdx++;
        const dataParam = `$${paramIdx}`;
        placeholders.push(`(${idParam}, ${dataParam})`);
        values.push(id, JSON.stringify(data));
      }

      try {
        await client.query(
          `INSERT INTO ${this._tableName()} (_id, data) VALUES ${placeholders.join(', ')}`,
          values
        );
      } catch (err) {
        if (err.code === '23505') {
          throw new MongoServerError(`E11000 duplicate key error`, 11000);
        }
        throw err;
      }
    } else {
      // Unordered: try each, collect errors
      for (const doc of documents) {
        try {
          const id = this._extractId(doc._id);
          const data = this._documentToJsonb(doc);
          await client.query(
            `INSERT INTO ${this._tableName()} (_id, data) VALUES ($1, $2)`,
            [id, JSON.stringify(data)]
          );
        } catch (err) {
          // Continue on error for unordered
        }
      }
    }

    return {
      acknowledged: true,
      insertedCount: documents.length,
      insertedIds
    };
  }

  // ==================== FIND ====================

  find(filter = {}, options = {}) {
    return new Cursor(this, filter, options);
  }

  async findOne(filter = {}, options = {}) {
    const results = await this._executeFind(filter, options.projection, options.sort, 0, 1, options);
    return results[0] || null;
  }

  async _executeFind(filter, projection, sort, skip, limit, options = {}) {
    await this._ensureTable();
    const client = await this._getClient(options.session);

    const translator = new QueryTranslator();
    const { where, params } = translator.translateFilter(filter);
    const orderBy = translator.translateSort(sort);
    const { postProcess } = translator.translateProjection(projection);

    let sql = `SELECT _id, data FROM ${this._tableName()} WHERE ${where}`;
    if (orderBy) sql += ` ${orderBy}`;
    if (limit > 0) {
      sql += ` LIMIT $${params.length + 1}`;
      params.push(limit);
    }
    if (skip > 0) {
      sql += ` OFFSET $${params.length + 1}`;
      params.push(skip);
    }

    const result = await client.query(sql, params);
    let docs = result.rows.map(row => this._rowToDocument(row));

    if (postProcess) {
      docs = docs.map(postProcess);
    }

    return docs;
  }

  async findOneAndUpdate(filter, update, options = {}) {
    await this._ensureTable();
    const client = await this._getClient(options.session);

    const qt = new QueryTranslator();
    const { where, params: filterParams } = qt.translateFilter(filter);

    // First, find the document
    const sortClause = options.sort ? qt.translateSort(options.sort) : '';
    let findSql = `SELECT _id, data FROM ${this._tableName()} WHERE ${where} ${sortClause} LIMIT 1`;

    const findResult = await client.query(findSql, filterParams);

    if (findResult.rows.length === 0) {
      if (options.upsert) {
        return this._upsertDocument(filter, update, options, client);
      }
      return { value: null, ok: 1 };
    }

    const row = findResult.rows[0];
    const originalDoc = this._rowToDocument(row);

    // Apply update — use fresh params since we already found the doc by _id
    const ut = new UpdateTranslator();
    const updateResult = ut.translateUpdate(update);

    const updateSql = `UPDATE ${this._tableName()} SET ${updateResult.setClause} WHERE _id = $${updateResult.params.length + 1} RETURNING _id, data`;
    updateResult.params.push(row._id);

    const updatedResult = await client.query(updateSql, updateResult.params);

    const returnDocument = options.returnDocument || options.returnOriginal !== false ? 'before' : 'after';
    const returnNew = returnDocument === 'after' || options.returnDocument === 'after';

    let value;
    if (returnNew && updatedResult.rows.length > 0) {
      value = this._rowToDocument(updatedResult.rows[0]);
    } else {
      value = originalDoc;
    }

    if (options.projection) {
      const { postProcess } = qt.translateProjection(options.projection);
      if (postProcess) value = postProcess(value);
    }

    return { value, ok: 1, lastErrorObject: { n: 1, updatedExisting: true } };
  }

  async findOneAndReplace(filter, replacement, options = {}) {
    return this.findOneAndUpdate(filter, replacement, options);
  }

  async findOneAndDelete(filter, options = {}) {
    await this._ensureTable();
    const client = await this._getClient(options.session);

    const translator = new QueryTranslator();
    const { where, params } = translator.translateFilter(filter);
    const sortClause = options.sort ? translator.translateSort(options.sort) : '';

    const sql = `DELETE FROM ${this._tableName()} WHERE _id = (SELECT _id FROM ${this._tableName()} WHERE ${where} ${sortClause} LIMIT 1) RETURNING _id, data`;

    const result = await client.query(sql, params);

    if (result.rows.length === 0) {
      return { value: null, ok: 1 };
    }

    let value = this._rowToDocument(result.rows[0]);
    if (options.projection) {
      const { postProcess } = translator.translateProjection(options.projection);
      if (postProcess) value = postProcess(value);
    }

    return { value, ok: 1, lastErrorObject: { n: 1 } };
  }

  // ==================== UPDATE ====================

  async updateOne(filter, update, options = {}) {
    await this._ensureTable();
    const client = await this._getClient(options.session);

    const qt = new QueryTranslator();
    const { where, params: filterParams } = qt.translateFilter(filter);

    // Find the single document to update
    const findSql = `SELECT _id FROM ${this._tableName()} WHERE ${where} LIMIT 1`;
    const findResult = await client.query(findSql, filterParams);

    if (findResult.rows.length === 0) {
      if (options.upsert) {
        return this._upsertDocument(filter, update, options, client);
      }
      return { acknowledged: true, matchedCount: 0, modifiedCount: 0, upsertedId: null, upsertedCount: 0 };
    }

    // We already found the _id, so the UPDATE only needs update params + _id
    const ut = new UpdateTranslator();
    const updateResult = ut.translateUpdate(update);

    const docId = findResult.rows[0]._id;
    const updateSql = `UPDATE ${this._tableName()} SET ${updateResult.setClause} WHERE _id = $${updateResult.params.length + 1}`;
    updateResult.params.push(docId);

    await client.query(updateSql, updateResult.params);

    // Emit change notification
    await this._notifyChange('update', docId, client);

    return { acknowledged: true, matchedCount: 1, modifiedCount: 1, upsertedId: null, upsertedCount: 0 };
  }

  async updateMany(filter, update, options = {}) {
    await this._ensureTable();
    const client = await this._getClient(options.session);

    const qt = new QueryTranslator();
    const { where, params: filterParams } = qt.translateFilter(filter);

    const ut = new UpdateTranslator();
    const updateResult = ut.translateUpdate(update, filterParams.length, filterParams);

    const sql = `UPDATE ${this._tableName()} SET ${updateResult.setClause} WHERE ${where}`;
    const result = await client.query(sql, updateResult.params);

    if (result.rowCount === 0 && options.upsert) {
      return this._upsertDocument(filter, update, options, client);
    }

    return {
      acknowledged: true,
      matchedCount: result.rowCount,
      modifiedCount: result.rowCount,
      upsertedId: null,
      upsertedCount: 0
    };
  }

  async replaceOne(filter, replacement, options = {}) {
    await this._ensureTable();
    const client = await this._getClient(options.session);

    const qt = new QueryTranslator();
    const { where, params: filterParams } = qt.translateFilter(filter);

    const findSql = `SELECT _id FROM ${this._tableName()} WHERE ${where} LIMIT 1`;
    const findResult = await client.query(findSql, filterParams);

    if (findResult.rows.length === 0) {
      if (options.upsert) {
        const doc = { ...replacement };
        if (filter._id) doc._id = filter._id;
        const result = await this.insertOne(doc, options);
        return {
          acknowledged: true,
          matchedCount: 0,
          modifiedCount: 0,
          upsertedId: result.insertedId,
          upsertedCount: 1
        };
      }
      return { acknowledged: true, matchedCount: 0, modifiedCount: 0, upsertedId: null, upsertedCount: 0 };
    }

    const docId = findResult.rows[0]._id;
    const data = this._documentToJsonb(replacement);

    await client.query(
      `UPDATE ${this._tableName()} SET data = $1 WHERE _id = $2`,
      [JSON.stringify(data), docId]
    );

    return { acknowledged: true, matchedCount: 1, modifiedCount: 1, upsertedId: null, upsertedCount: 0 };
  }

  // ==================== DELETE ====================

  async deleteOne(filter, options = {}) {
    await this._ensureTable();
    const client = await this._getClient(options.session);

    const translator = new QueryTranslator();
    const { where, params } = translator.translateFilter(filter);

    const sql = `DELETE FROM ${this._tableName()} WHERE _id = (SELECT _id FROM ${this._tableName()} WHERE ${where} LIMIT 1)`;
    const result = await client.query(sql, params);

    return { acknowledged: true, deletedCount: result.rowCount };
  }

  async deleteMany(filter = {}, options = {}) {
    await this._ensureTable();
    const client = await this._getClient(options.session);

    const translator = new QueryTranslator();
    const { where, params } = translator.translateFilter(filter);

    const sql = `DELETE FROM ${this._tableName()} WHERE ${where}`;
    const result = await client.query(sql, params);

    return { acknowledged: true, deletedCount: result.rowCount };
  }

  // ==================== AGGREGATE ====================

  aggregate(pipeline = [], options = {}) {
    return new AggregationCursor(this, pipeline, options);
  }

  async _executeAggregate(pipeline, options = {}) {
    await this._ensureTable();
    const client = await this._getClient(options.session);

    const translator = new AggregateTranslator(this._name, this._db._schemaName);
    const { sql, params, postProcessStages } = translator.translate(pipeline);

    const result = await client.query(sql, params);
    let docs = result.rows.map(row => this._rowToDocument(row));

    // Apply any stages that couldn't be translated to SQL
    if (postProcessStages && postProcessStages.length > 0) {
      docs = this._applyPostProcessStages(docs, postProcessStages);
    }

    return docs;
  }

  _applyPostProcessStages(docs, stages) {
    for (const stage of stages) {
      const op = Object.keys(stage)[0];
      const value = stage[op];

      switch (op) {
        case '$facet': {
          const result = {};
          for (const [name, subPipeline] of Object.entries(value)) {
            result[name] = this._applyPostProcessStages([...docs], subPipeline);
          }
          docs = [result];
          break;
        }
        case '$redact': {
          // Simplified $redact
          docs = docs.filter(doc => {
            return this._evaluateExpression(value, doc) !== '$$PRUNE';
          });
          break;
        }
        case '$match': {
          docs = docs.filter(doc => this._matchesFilter(doc, value));
          break;
        }
        case '$project': {
          const qt = new QueryTranslator();
          const entries = Object.entries(value);
          const isInclusion = entries.some(([k, v]) => v === 1 || v === true);
          const isExclusion = entries.some(([k, v]) => v === 0 || v === false);
          docs = docs.map(doc => qt._applyProjection(doc, value, isInclusion, isExclusion));
          break;
        }
        case '$sort': {
          docs.sort((a, b) => {
            for (const [field, dir] of Object.entries(value)) {
              const aVal = this._getNestedValue(a, field);
              const bVal = this._getNestedValue(b, field);
              if (aVal < bVal) return -dir;
              if (aVal > bVal) return dir;
            }
            return 0;
          });
          break;
        }
        case '$limit':
          docs = docs.slice(0, value);
          break;
        case '$skip':
          docs = docs.slice(value);
          break;
        case '$unwind': {
          const path = typeof value === 'string' ? value : value.path;
          const field = path.startsWith('$') ? path.substring(1) : path;
          const preserveNull = typeof value === 'object' ? value.preserveNullAndEmptyArrays : false;
          const includeIndex = typeof value === 'object' ? value.includeArrayIndex : null;

          const unwound = [];
          for (const doc of docs) {
            const arr = this._getNestedValue(doc, field);
            if (Array.isArray(arr) && arr.length > 0) {
              arr.forEach((item, idx) => {
                const newDoc = { ...doc };
                this._setNestedValue(newDoc, field, item);
                if (includeIndex) newDoc[includeIndex] = idx;
                unwound.push(newDoc);
              });
            } else if (preserveNull) {
              unwound.push(doc);
            }
          }
          docs = unwound;
          break;
        }
        default:
          // Skip unsupported stages
          break;
      }
    }
    return docs;
  }

  // ==================== COUNT / DISTINCT / ESTIMATED ====================

  async countDocuments(filter = {}, options = {}) {
    await this._ensureTable();
    const client = await this._getClient(options.session);

    const translator = new QueryTranslator();
    const { where, params } = translator.translateFilter(filter);

    let sql = `SELECT COUNT(*)::integer AS count FROM ${this._tableName()} WHERE ${where}`;

    if (options.skip) {
      sql += ` OFFSET $${params.length + 1}`;
      params.push(options.skip);
    }
    if (options.limit) {
      // For count with limit, use subquery
      sql = `SELECT COUNT(*)::integer AS count FROM (SELECT 1 FROM ${this._tableName()} WHERE ${where}`;
      if (options.skip) sql += ` OFFSET $${params.length}`;
      sql += ` LIMIT $${params.length + 1}) sub`;
      params.push(options.limit);
    }

    const result = await client.query(sql, params);
    return result.rows[0].count;
  }

  async count(filter = {}, options = {}) {
    // Deprecated but still widely used
    return this.countDocuments(filter, options);
  }

  async estimatedDocumentCount(options = {}) {
    await this._ensureTable();
    const pool = this._getPool();

    // Use PostgreSQL statistics for fast approximate count
    const schema = this._db._schemaName || 'public';
    const result = await pool.query(
      `SELECT reltuples::bigint AS count FROM pg_class
       JOIN pg_namespace ON pg_namespace.oid = relnamespace
       WHERE relname = $1 AND nspname = $2`,
      [this._name, schema]
    );

    if (result.rows.length > 0 && result.rows[0].count >= 0) {
      return Number(result.rows[0].count);
    }

    // Fallback to actual count
    return this.countDocuments();
  }

  async distinct(field, filter = {}, options = {}) {
    await this._ensureTable();
    const client = await this._getClient(options.session);

    const translator = new QueryTranslator();
    const { where, params } = translator.translateFilter(filter);

    let fieldExpr;
    if (field === '_id') {
      fieldExpr = '_id';
    } else {
      fieldExpr = `data->>'${field}'`;
    }

    const sql = `SELECT DISTINCT ${fieldExpr} AS value FROM ${this._tableName()} WHERE ${where}`;
    const result = await client.query(sql, params);

    return result.rows.map(row => {
      if (field === '_id') return row.value;
      // Try to parse JSON values
      try {
        return JSON.parse(row.value);
      } catch {
        return row.value;
      }
    }).filter(v => v !== null && v !== undefined);
  }

  // ==================== INDEX ====================

  async createIndex(keys, options = {}) {
    await this._ensureTable();
    const pool = this._getPool();

    const indexName = options.name || this._generateIndexName(keys);
    const unique = options.unique ? 'UNIQUE' : '';
    const entries = typeof keys === 'object' ? Object.entries(keys) : [[keys, 1]];

    // Build index expression based on key types
    const indexExprs = entries.map(([field, spec]) => {
      if (field === '_id') return '_id';
      if (spec === 'text') {
        // Full-text index
        return `to_tsvector('english', data->>'${field}')`;
      }
      if (spec === '2dsphere' || spec === '2d') {
        // PostGIS GiST index on GeoJSON stored in JSONB
        // Uses ST_GeomFromGeoJSON to cast the JSONB field to geometry
        return `ST_GeomFromGeoJSON((data->>'${field}')::text)`;
      }
      return `(data->>'${field}')`;
    });

    const isText = entries.some(([, spec]) => spec === 'text');
    const isGeo = entries.some(([, spec]) => spec === '2dsphere' || spec === '2d');
    const indexType = isText ? 'USING GIN' : isGeo ? 'USING GIST' : '';

    const sparse = options.sparse ? `WHERE ${entries.map(([f]) => f === '_id' ? '_id IS NOT NULL' : `data ? '${f}'`).join(' AND ')}` : '';

    const ttl = options.expireAfterSeconds;
    // Note: TTL is handled separately via a background cleanup

    try {
      const safeIndexName = indexName.replace(/[^a-zA-Z0-9_]/g, '_');
      await pool.query(
        `CREATE ${unique} INDEX IF NOT EXISTS "${safeIndexName}" ON ${this._tableName()} ${indexType} (${indexExprs.join(', ')}) ${sparse}`
      );
    } catch (err) {
      if (!err.message.includes('already exists')) {
        throw err;
      }
    }

    // If TTL index, set up cleanup
    if (ttl !== undefined) {
      await this._setupTTLCleanup(entries[0][0], ttl);
    }

    return indexName;
  }

  async createIndexes(indexes) {
    const results = [];
    for (const index of indexes) {
      const name = await this.createIndex(index.key, index);
      results.push(name);
    }
    return results;
  }

  async dropIndex(indexName) {
    const pool = this._getPool();
    const schema = this._db._schemaName || 'public';
    const safeIndexName = indexName.replace(/[^a-zA-Z0-9_]/g, '_');
    await pool.query(`DROP INDEX IF EXISTS "${schema}"."${safeIndexName}"`);
  }

  async dropIndexes() {
    const pool = this._getPool();
    const schema = this._db._schemaName || 'public';
    const result = await pool.query(
      `SELECT indexname FROM pg_indexes WHERE tablename = $1 AND schemaname = $2 AND indexname != $3`,
      [this._name, schema, `${this._name}_pkey`]
    );
    for (const row of result.rows) {
      await pool.query(`DROP INDEX IF EXISTS "${schema}"."${row.indexname}"`);
    }
  }

  async _getIndexes() {
    const pool = this._getPool();
    const schema = this._db._schemaName || 'public';
    const result = await pool.query(
      `SELECT indexname, indexdef FROM pg_indexes WHERE tablename = $1 AND schemaname = $2`,
      [this._name, schema]
    );
    return result.rows.map(row => ({
      name: row.indexname,
      key: { _id: 1 }, // Simplified
      v: 2,
      _sql: row.indexdef
    }));
  }

  async listIndexes() {
    const { ArrayCursor } = require('./db');
    const indexes = await this._getIndexes();
    return new ArrayCursor(indexes);
  }

  async indexExists(names) {
    const indexes = await this._getIndexes();
    const indexNames = indexes.map(i => i.name);
    if (Array.isArray(names)) {
      return names.every(n => indexNames.includes(n));
    }
    return indexNames.includes(names);
  }

  async indexes(options = {}) {
    return this._getIndexes();
  }

  async indexInformation(options = {}) {
    const indexes = await this._getIndexes();
    const result = {};
    for (const idx of indexes) {
      result[idx.name] = Object.entries(idx.key).map(([k, v]) => [k, v]);
    }
    return result;
  }

  // ==================== BULK OPERATIONS ====================

  initializeOrderedBulkOp() {
    return new OrderedBulkOperation(this);
  }

  initializeUnorderedBulkOp() {
    return new UnorderedBulkOperation(this);
  }

  async bulkWrite(operations, options = {}) {
    const ordered = options.ordered !== false;
    const bulk = ordered
      ? this.initializeOrderedBulkOp()
      : this.initializeUnorderedBulkOp();

    for (const op of operations) {
      bulk.raw(op);
    }

    return bulk.execute(options);
  }

  // ==================== CHANGE STREAMS ====================

  watch(pipeline = [], options = {}) {
    return new ChangeStream(this, pipeline, options);
  }

  // ==================== OTHER ====================

  async drop() {
    const pool = this._getPool();
    await pool.query(`DROP TABLE IF EXISTS ${this._tableName()} CASCADE`);
    this._initialized = false;
  }

  async rename(newName, options = {}) {
    const pool = this._getPool();
    const dropTarget = options.dropTarget;

    if (dropTarget) {
      const newTableName = this._db._schemaName
        ? `"${this._db._schemaName}"."${newName}"`
        : `"${newName}"`;
      await pool.query(`DROP TABLE IF EXISTS ${newTableName}`);
    }

    await pool.query(`ALTER TABLE ${this._tableName()} RENAME TO "${newName}"`);
    this._name = newName;
    this._initialized = true;
  }

  async isCapped() {
    return false; // PostgreSQL tables are not capped
  }

  async options() {
    return this._options;
  }

  async stats() {
    const pool = this._getPool();
    const schema = this._db._schemaName || 'public';

    const countResult = await pool.query(`SELECT COUNT(*)::integer AS count FROM ${this._tableName()}`);
    const sizeResult = await pool.query(
      `SELECT pg_total_relation_size('"${schema}"."${this._name}"') AS size`
    ).catch(() => ({ rows: [{ size: 0 }] }));

    return {
      ns: this.namespace,
      count: countResult.rows[0].count,
      size: Number(sizeResult.rows[0].size),
      storageSize: Number(sizeResult.rows[0].size),
      ok: 1
    };
  }

  // ==================== HELPERS ====================

  _extractId(id) {
    if (id instanceof ObjectId) return id.toHexString();
    if (typeof id === 'object' && id !== null && id._id) return this._extractId(id._id);
    return String(id);
  }

  _documentToJsonb(doc) {
    const result = {};
    for (const [key, value] of Object.entries(doc)) {
      if (key === '_id') continue; // _id is stored separately
      result[key] = this._valueToJsonb(value);
    }
    return result;
  }

  _valueToJsonb(value) {
    if (value instanceof ObjectId) return value.toHexString();
    if (value instanceof Date) return { $date: value.toISOString() };
    if (value instanceof RegExp) return { $regex: value.source, $options: value.flags };
    if (Buffer.isBuffer(value)) return { $binary: value.toString('base64') };
    if (typeof value === 'bigint') return Number(value);
    // Handle BSON types that have valueOf()
    if (value && typeof value.valueOf === 'function' && typeof value !== 'string') {
      const { Long, Decimal128, Double, Int32 } = require('./bson');
      if (value instanceof Long) return Number(value.value);
      if (value instanceof Decimal128) return value.toString();
      if (value instanceof Double) return value.value;
      if (value instanceof Int32) return value.value;
    }
    if (Array.isArray(value)) return value.map(v => this._valueToJsonb(v));
    if (value !== null && typeof value === 'object') {
      const result = {};
      for (const [k, v] of Object.entries(value)) {
        result[k] = this._valueToJsonb(v);
      }
      return result;
    }
    return value;
  }

  _rowToDocument(row) {
    const doc = { _id: row._id };
    if (row.data && typeof row.data === 'object') {
      this._restoreTypes(row.data, doc);
    }
    return doc;
  }

  _restoreTypes(data, target) {
    for (const [key, value] of Object.entries(data)) {
      target[key] = this._restoreValue(value);
    }
  }

  _restoreValue(value) {
    if (value === null || value === undefined) return value;

    if (Array.isArray(value)) {
      return value.map(v => this._restoreValue(v));
    }

    if (typeof value === 'object') {
      // Check for special BSON-like types
      if (value.$date) {
        return new Date(value.$date);
      }
      if (value.$regex !== undefined) {
        return new RegExp(value.$regex, value.$options || '');
      }
      if (value.$binary !== undefined) {
        return Buffer.from(value.$binary, 'base64');
      }
      if (value.$oid !== undefined) {
        return new ObjectId(value.$oid);
      }

      const result = {};
      this._restoreTypes(value, result);
      return result;
    }

    return value;
  }

  async _upsertDocument(filter, update, options, client) {
    // Create a new document from the filter and update
    const doc = {};

    // Extract equality conditions from filter as initial fields
    for (const [key, value] of Object.entries(filter)) {
      if (!key.startsWith('$') && (typeof value !== 'object' || value instanceof ObjectId || value instanceof Date)) {
        doc[key] = value;
      }
    }

    if (!doc._id) {
      doc._id = new ObjectId();
    }

    // Apply $set and $setOnInsert
    if (update.$set) {
      for (const [key, value] of Object.entries(update.$set)) {
        this._setNestedValue(doc, key, value);
      }
    }
    if (update.$setOnInsert) {
      for (const [key, value] of Object.entries(update.$setOnInsert)) {
        this._setNestedValue(doc, key, value);
      }
    }

    // Apply $inc with initial value of 0 + increment
    if (update.$inc) {
      for (const [key, value] of Object.entries(update.$inc)) {
        this._setNestedValue(doc, key, value);
      }
    }

    const result = await this.insertOne(doc, options);

    return {
      acknowledged: true,
      matchedCount: 0,
      modifiedCount: 0,
      upsertedId: result.insertedId,
      upsertedCount: 1,
      value: options.returnDocument === 'after' ? doc : null,
      ok: 1,
      lastErrorObject: { n: 1, updatedExisting: false, upserted: result.insertedId }
    };
  }

  async _notifyChange(operationType, docId, client) {
    try {
      const schema = this._db._schemaName || 'public';
      const channel = `change_${schema}_${this._name}`;
      const payload = JSON.stringify({
        operationType,
        documentKey: { _id: docId },
        ns: { db: this._db._dbName, coll: this._name }
      });
      await client.query(`SELECT pg_notify($1, $2)`, [channel, payload]);
    } catch (e) {
      // Non-critical, don't fail the operation
    }
  }

  async _setupTTLCleanup(field, expireAfterSeconds) {
    // In a real deployment, this would be a pg_cron job or similar
    // For now, we create a function that can be called periodically
    const pool = this._getPool();
    const funcName = `ttl_cleanup_${this._name}`.replace(/[^a-zA-Z0-9_]/g, '_');

    await pool.query(`
      CREATE OR REPLACE FUNCTION "${funcName}"() RETURNS void AS $$
      BEGIN
        DELETE FROM ${this._tableName()}
        WHERE (data->>'${field}')::timestamp < NOW() - INTERVAL '${expireAfterSeconds} seconds';
      END;
      $$ LANGUAGE plpgsql;
    `).catch(() => {});
  }

  _generateIndexName(keys) {
    const entries = typeof keys === 'object' ? Object.entries(keys) : [[keys, 1]];
    return entries.map(([field, dir]) => `${field}_${dir}`).join('_');
  }

  _matchesFilter(doc, filter) {
    for (const [key, value] of Object.entries(filter)) {
      if (key === '$and') return value.every(f => this._matchesFilter(doc, f));
      if (key === '$or') return value.some(f => this._matchesFilter(doc, f));
      if (key === '$nor') return !value.some(f => this._matchesFilter(doc, f));

      const docValue = this._getNestedValue(doc, key);
      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        for (const [op, opVal] of Object.entries(value)) {
          switch (op) {
            case '$eq': if (docValue !== opVal) return false; break;
            case '$ne': if (docValue === opVal) return false; break;
            case '$gt': if (!(docValue > opVal)) return false; break;
            case '$gte': if (!(docValue >= opVal)) return false; break;
            case '$lt': if (!(docValue < opVal)) return false; break;
            case '$lte': if (!(docValue <= opVal)) return false; break;
            case '$in': if (!opVal.includes(docValue)) return false; break;
            case '$nin': if (opVal.includes(docValue)) return false; break;
            case '$exists': if ((docValue !== undefined) !== opVal) return false; break;
          }
        }
      } else {
        if (docValue !== value) return false;
      }
    }
    return true;
  }

  _getNestedValue(obj, path) {
    const parts = path.split('.');
    let current = obj;
    for (const part of parts) {
      if (current == null) return undefined;
      current = current[part];
    }
    return current;
  }

  _setNestedValue(obj, path, value) {
    const parts = path.split('.');
    let current = obj;
    for (let i = 0; i < parts.length - 1; i++) {
      if (!(parts[i] in current) || typeof current[parts[i]] !== 'object') {
        current[parts[i]] = {};
      }
      current = current[parts[i]];
    }
    current[parts[parts.length - 1]] = value;
  }

  _evaluateExpression(expr, doc) {
    // Simplified expression evaluator for post-processing
    if (typeof expr === 'string' && expr.startsWith('$')) {
      return this._getNestedValue(doc, expr.substring(1));
    }
    return expr;
  }
}

module.exports = { Collection };
