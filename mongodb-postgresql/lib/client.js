'use strict';

const { Pool } = require('pg');
const { Db, Admin } = require('./db');
const { ClientSession } = require('./session');
const { ChangeStream } = require('./changeStream');
const { MongoNetworkError } = require('./errors');
const { EventEmitter } = require('events');

/**
 * MongoClient replacement that connects to PostgreSQL.
 *
 * Connection string format:
 *   postgresql://user:password@host:port/database
 *   postgres://user:password@host:port/database
 *
 * Or MongoDB-style (auto-converted):
 *   mongodb://user:password@host:port/database -> postgresql equivalent
 *
 * Options are passed through to the pg Pool constructor where applicable.
 */
class MongoClient extends EventEmitter {
  constructor(uri, options = {}) {
    super();
    this._uri = uri;
    this._options = options;
    this._pool = null;
    this._connected = false;
    this._dbs = new Map();
    this._sessions = new Set();
    this._defaultDbName = null;
  }

  /**
   * Static connect method (MongoDB 3.x style)
   */
  static async connect(uri, options = {}) {
    const client = new MongoClient(uri, options);
    await client.connect();
    return client;
  }

  async connect() {
    if (this._connected) return this;

    const pgConfig = this._parseConnectionString(this._uri, this._options);
    this._defaultDbName = pgConfig.database || 'postgres';

    try {
      this._pool = new Pool(pgConfig);

      // Test the connection
      const testClient = await this._pool.connect();
      testClient.release();

      this._connected = true;

      // Set up pool event handlers
      this._pool.on('error', (err) => {
        this.emit('serverHeartbeatFailed', err);
      });

      this.emit('open', this);
      this.emit('topologyOpening');

      return this;
    } catch (err) {
      throw new MongoNetworkError(`Failed to connect to PostgreSQL: ${err.message}`);
    }
  }

  _parseConnectionString(uri, options) {
    // Handle MongoDB-style URIs by converting to PostgreSQL
    let pgUri = uri;
    if (uri.startsWith('mongodb://') || uri.startsWith('mongodb+srv://')) {
      pgUri = uri
        .replace('mongodb+srv://', 'postgresql://')
        .replace('mongodb://', 'postgresql://');

      // Remove MongoDB-specific query params
      const url = new URL(pgUri);
      const mongoParams = ['retryWrites', 'w', 'authSource', 'replicaSet',
        'ssl', 'authMechanism', 'readPreference', 'maxPoolSize',
        'minPoolSize', 'maxIdleTimeMS', 'connectTimeoutMS',
        'serverSelectionTimeoutMS', 'heartbeatFrequencyMS', 'tls',
        'tlsCAFile', 'tlsCertificateKeyFile', 'compressors',
        'zlibCompressionLevel', 'directConnection', 'appName',
        'retryReads', 'loadBalanced'];

      for (const param of mongoParams) {
        url.searchParams.delete(param);
      }

      // Map some params
      if (options.maxPoolSize || uri.includes('maxPoolSize')) {
        const urlObj = new URL(uri.replace('mongodb+srv://', 'http://').replace('mongodb://', 'http://'));
        const maxPool = options.maxPoolSize || urlObj.searchParams.get('maxPoolSize');
        if (maxPool) options.max = parseInt(maxPool);
      }

      pgUri = url.toString();
    }

    const config = {
      connectionString: pgUri,
      max: options.maxPoolSize || options.max || 10,
      idleTimeoutMillis: options.maxIdleTimeMS || 30000,
      connectionTimeoutMillis: options.connectTimeoutMS || options.serverSelectionTimeoutMS || 5000,
    };

    // Additional pg options
    if (options.ssl || options.tls) {
      config.ssl = typeof options.ssl === 'object' ? options.ssl : { rejectUnauthorized: false };
    }

    if (options.auth) {
      config.user = options.auth.username;
      config.password = options.auth.password;
    }

    return config;
  }

  db(name, options = {}) {
    const dbName = name || this._defaultDbName;
    if (!this._dbs.has(dbName)) {
      this._dbs.set(dbName, new Db(this, dbName, options));
    }
    return this._dbs.get(dbName);
  }

  /**
   * Ensure the schema for a database exists
   */
  async _ensureSchema(schemaName) {
    if (!schemaName || schemaName === 'public') return;
    try {
      await this._pool.query(`CREATE SCHEMA IF NOT EXISTS "${schemaName}"`);
    } catch (err) {
      if (!err.message.includes('already exists')) {
        throw err;
      }
    }
  }

  startSession(options = {}) {
    const session = new ClientSession(this, options);
    this._sessions.add(session);

    session.on('ended', () => {
      this._sessions.delete(session);
    });

    return session;
  }

  async withSession(fn, options = {}) {
    const session = this.startSession(options);
    try {
      return await fn(session);
    } finally {
      await session.endSession();
    }
  }

  /**
   * Client-level bulkWrite (MongoDB 8.0+ / driver 6.6+).
   * Accepts operations targeting multiple namespaces.
   *
   * models is an array of:
   *   { namespace: 'db.collection', insertOne: { document } }
   *   { namespace: 'db.collection', updateOne: { filter, update, ... } }
   *   { namespace: 'db.collection', updateMany: { filter, update, ... } }
   *   { namespace: 'db.collection', deleteOne: { filter } }
   *   { namespace: 'db.collection', deleteMany: { filter } }
   *   { namespace: 'db.collection', replaceOne: { filter, replacement, ... } }
   */
  async bulkWrite(models, options = {}) {
    const results = {
      insertedCount: 0,
      matchedCount: 0,
      modifiedCount: 0,
      deletedCount: 0,
      upsertedCount: 0,
      insertResults: {},
      updateResults: {},
      deleteResults: {}
    };

    for (let i = 0; i < models.length; i++) {
      const model = models[i];
      const ns = model.namespace;
      if (!ns) throw new Error('Each model must have a namespace (e.g. "db.collection")');

      const parts = ns.split('.');
      const dbName = parts.length > 1 ? parts.slice(0, -1).join('.') : this._defaultDbName;
      const collName = parts[parts.length - 1];
      const col = this.db(dbName).collection(collName);

      if (model.insertOne) {
        const r = await col.insertOne(model.insertOne.document);
        results.insertedCount++;
        results.insertResults[i] = { insertedId: r.insertedId };
      } else if (model.updateOne) {
        const r = await col.updateOne(model.updateOne.filter, model.updateOne.update, {
          upsert: model.updateOne.upsert
        });
        results.matchedCount += r.matchedCount;
        results.modifiedCount += r.modifiedCount;
        results.upsertedCount += r.upsertedCount || 0;
        results.updateResults[i] = { matchedCount: r.matchedCount, modifiedCount: r.modifiedCount, upsertedId: r.upsertedId };
      } else if (model.updateMany) {
        const r = await col.updateMany(model.updateMany.filter, model.updateMany.update, {
          upsert: model.updateMany.upsert
        });
        results.matchedCount += r.matchedCount;
        results.modifiedCount += r.modifiedCount;
        results.upsertedCount += r.upsertedCount || 0;
        results.updateResults[i] = { matchedCount: r.matchedCount, modifiedCount: r.modifiedCount };
      } else if (model.deleteOne) {
        const r = await col.deleteOne(model.deleteOne.filter);
        results.deletedCount += r.deletedCount;
        results.deleteResults[i] = { deletedCount: r.deletedCount };
      } else if (model.deleteMany) {
        const r = await col.deleteMany(model.deleteMany.filter);
        results.deletedCount += r.deletedCount;
        results.deleteResults[i] = { deletedCount: r.deletedCount };
      } else if (model.replaceOne) {
        const r = await col.replaceOne(model.replaceOne.filter, model.replaceOne.replacement, {
          upsert: model.replaceOne.upsert
        });
        results.matchedCount += r.matchedCount;
        results.modifiedCount += r.modifiedCount;
        results.updateResults[i] = { matchedCount: r.matchedCount, modifiedCount: r.modifiedCount };
      }
    }

    return results;
  }

  watch(pipeline = [], options = {}) {
    return new ChangeStream(this, pipeline, options);
  }

  async close(force) {
    if (!this._connected) return;

    // End all sessions
    for (const session of this._sessions) {
      await session.endSession();
    }
    this._sessions.clear();

    if (this._pool) {
      await this._pool.end();
      this._pool = null;
    }

    this._connected = false;
    this._dbs.clear();
    this.emit('close');
  }

  isConnected() {
    return this._connected;
  }

  get topology() {
    return {
      isConnected: () => this._connected,
      isDestroyed: () => !this._connected
    };
  }
}

module.exports = MongoClient;
