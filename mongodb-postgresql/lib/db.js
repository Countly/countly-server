'use strict';

const { Collection } = require('./collection');
const { ChangeStream } = require('./changeStream');
const { GridFSBucket } = require('./gridfs');

/**
 * A simple cursor backed by an in-memory array.
 * Used for listCollections, listIndexes, etc.
 */
class ArrayCursor {
  constructor(items) {
    this._items = items;
    this._index = 0;
    this._closed = false;
    this._transform = null;
  }

  async toArray() {
    const items = this._items.slice(this._index);
    this._index = this._items.length;
    return this._transform ? items.map(this._transform) : items;
  }

  async next() {
    if (this._index >= this._items.length) return null;
    let item = this._items[this._index++];
    if (this._transform) item = this._transform(item);
    return item;
  }

  async tryNext() {
    return this.next();
  }

  async hasNext() {
    return this._index < this._items.length;
  }

  async forEach(callback) {
    for (const item of this._items) {
      const val = this._transform ? this._transform(item) : item;
      const shouldContinue = await callback(val);
      if (shouldContinue === false) break;
    }
  }

  map(transform) {
    this._transform = transform;
    return this;
  }

  async close() {
    this._closed = true;
  }

  rewind() {
    this._index = 0;
    return this;
  }

  bufferedCount() {
    return Math.max(0, this._items.length - this._index);
  }

  clone() {
    return new ArrayCursor([...this._items]);
  }

  async *[Symbol.asyncIterator]() {
    while (this._index < this._items.length) {
      let item = this._items[this._index++];
      if (this._transform) item = this._transform(item);
      yield item;
    }
  }

  stream() {
    const self = this;
    const { Readable } = require('stream');
    return new Readable({
      objectMode: true,
      async read() {
        const doc = await self.next();
        this.push(doc);
      }
    });
  }
}

class Db {
  constructor(client, dbName, options = {}) {
    this._client = client;
    this._dbName = dbName;
    this._options = options;
    this._schemaName = options.schemaName || dbName;
    this._collections = new Map();
  }

  get databaseName() {
    return this._dbName;
  }

  get client() {
    return this._client;
  }

  _getPool() {
    return this._client._pool;
  }

  collection(name, options = {}) {
    if (!this._collections.has(name)) {
      this._collections.set(name, new Collection(this, name, options));
    }
    return this._collections.get(name);
  }

  async createCollection(name, options = {}) {
    const col = this.collection(name, options);
    await col._ensureTable();

    if (options.capped) {
      // PostgreSQL doesn't have capped collections natively,
      // but we can create a trigger to enforce max size
      // For now, this is a no-op beyond table creation
    }

    if (options.validator) {
      // Could implement JSON Schema validation via CHECK constraint
      // For now, store as metadata
    }

    return col;
  }

  async listCollections(filter = {}, options = {}) {
    const pool = this._getPool();
    const schema = this._schemaName || 'public';

    let sql = `SELECT table_name FROM information_schema.tables WHERE table_schema = $1`;
    const params = [schema];

    if (filter.name) {
      sql += ` AND table_name = $2`;
      params.push(filter.name);
    }

    const result = await pool.query(sql, params);

    const collections = result.rows.map(row => ({
      name: row.table_name,
      type: 'collection',
      options: {},
      info: { readOnly: false }
    }));

    return new ArrayCursor(collections);
  }

  async collections() {
    const list = await this.listCollections();
    const items = await list.toArray();
    return items.map(item => this.collection(item.name));
  }

  async dropCollection(name) {
    const col = this.collection(name);
    await col.drop();
    this._collections.delete(name);
    return true;
  }

  async dropDatabase() {
    const pool = this._getPool();
    const schema = this._schemaName;

    if (schema && schema !== 'public') {
      await pool.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
    } else {
      // Drop all tables in public schema
      const result = await pool.query(`
        SELECT table_name FROM information_schema.tables
        WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
      `);
      for (const row of result.rows) {
        await pool.query(`DROP TABLE IF EXISTS "public"."${row.table_name}" CASCADE`);
      }
    }
    return true;
  }

  async createIndex(collectionName, keys, options = {}) {
    const col = this.collection(collectionName);
    return col.createIndex(keys, options);
  }

  async stats() {
    const pool = this._getPool();
    const schema = this._schemaName || 'public';

    const result = await pool.query(`
      SELECT
        COUNT(DISTINCT table_name) AS collections,
        SUM(pg_total_relation_size(quote_ident(table_schema) || '.' || quote_ident(table_name))) AS dataSize
      FROM information_schema.tables
      WHERE table_schema = $1 AND table_type = 'BASE TABLE'
    `, [schema]);

    return {
      db: this._dbName,
      collections: Number(result.rows[0].collections || 0),
      dataSize: Number(result.rows[0].datasize || 0),
      ok: 1
    };
  }

  async command(command) {
    // Execute a MongoDB-style command
    if (command.ping) return { ok: 1 };
    if (command.buildInfo) return { ok: 1, version: '7.0.0-compat', modules: ['postgresql'] };
    if (command.serverStatus) return { ok: 1, host: 'postgresql', uptime: 0 };
    if (command.listCollections) {
      const result = await this.listCollections(command.listCollections.filter);
      return { ok: 1, cursor: { firstBatch: await result.toArray() } };
    }
    if (command.collStats) {
      const col = this.collection(command.collStats);
      return col.stats();
    }
    if (command.dbStats) {
      return this.stats();
    }
    if (command.create) {
      await this.createCollection(command.create, command);
      return { ok: 1 };
    }
    if (command.drop) {
      await this.dropCollection(command.drop);
      return { ok: 1 };
    }
    if (command.renameCollection) {
      const [, oldColl] = command.renameCollection.split('.');
      const [, newColl] = command.to.split('.');
      const col = this.collection(oldColl);
      await col.rename(newColl, { dropTarget: command.dropTarget });
      return { ok: 1 };
    }

    throw new Error(`Unsupported command: ${JSON.stringify(command)}`);
  }

  async renameCollection(fromCollection, toCollection, options = {}) {
    const col = this.collection(fromCollection);
    await col.rename(toCollection, options);
    this._collections.delete(fromCollection);
    return this.collection(toCollection);
  }

  async indexInformation(collectionName, options = {}) {
    const col = this.collection(collectionName);
    return col.indexInformation(options);
  }

  async removeUser(username, options = {}) {
    // PostgreSQL user management is different; stub for compatibility
    return true;
  }

  async profilingLevel(options = {}) {
    // No equivalent in PostgreSQL
    return 'off';
  }

  async setProfilingLevel(level, options = {}) {
    // No equivalent in PostgreSQL
    return 'off';
  }

  async admin() {
    return new Admin(this._client);
  }

  async aggregate(pipeline, options = {}) {
    // Db-level aggregation (e.g., $listLocalSessions)
    // Not commonly used; provide basic support
    throw new Error('Database-level aggregation not supported');
  }

  watch(pipeline = [], options = {}) {
    return new ChangeStream(this, pipeline, options);
  }
}

class Admin {
  constructor(client) {
    this._client = client;
  }

  async listDatabases() {
    const pool = this._client._pool;
    const result = await pool.query(`
      SELECT schema_name AS name,
             pg_catalog.pg_size_pretty(
               SUM(pg_total_relation_size(quote_ident(table_schema) || '.' || quote_ident(table_name)))
             ) AS sizeOnDisk
      FROM information_schema.schemata
      LEFT JOIN information_schema.tables ON schema_name = table_schema
      WHERE schema_name NOT IN ('pg_catalog', 'information_schema', 'pg_toast')
      GROUP BY schema_name
    `);

    return {
      databases: result.rows.map(row => ({
        name: row.name,
        sizeOnDisk: row.sizeondisk,
        empty: false
      })),
      ok: 1
    };
  }

  async serverInfo() {
    const pool = this._client._pool;
    const result = await pool.query('SELECT version()');
    return {
      version: '7.0.0-compat',
      gitVersion: 'postgresql',
      modules: ['postgresql'],
      sysInfo: result.rows[0].version,
      ok: 1
    };
  }

  async serverStatus() {
    return { ok: 1, host: 'postgresql', uptime: 0 };
  }

  async ping() {
    const pool = this._client._pool;
    await pool.query('SELECT 1');
    return { ok: 1 };
  }

  async buildInfo() {
    return this.serverInfo();
  }

  async removeUser(username, options = {}) {
    // PostgreSQL user management handled differently; stub
    return true;
  }

  async replSetGetStatus(options = {}) {
    // No replica set in PostgreSQL; return stub
    return { ok: 1, set: 'postgresql', members: [], myState: 1 };
  }

  async validateCollection(collectionName, options = {}) {
    const pool = this._client._pool;
    // Use pg_stat_user_tables as basic validation
    const result = await pool.query(
      `SELECT relname, n_live_tup, n_dead_tup FROM pg_stat_user_tables WHERE relname = $1`,
      [collectionName]
    );
    return {
      ns: collectionName,
      valid: result.rows.length > 0,
      nrecords: result.rows.length > 0 ? Number(result.rows[0].n_live_tup) : 0,
      ok: 1
    };
  }

  async command(command) {
    if (command.ping) return this.ping();
    if (command.listDatabases) return this.listDatabases();
    if (command.serverInfo) return this.serverInfo();
    if (command.serverStatus) return this.serverStatus();
    if (command.buildInfo) return this.buildInfo();
    if (command.replSetGetStatus) return this.replSetGetStatus();
    throw new Error(`Unsupported admin command: ${JSON.stringify(command)}`);
  }
}

module.exports = { Db, Admin, ArrayCursor };
