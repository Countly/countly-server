'use strict';

const { EventEmitter } = require('events');

/**
 * ChangeStream implementation using PostgreSQL LISTEN/NOTIFY.
 *
 * Each collection gets a notification channel named:
 *   change_<schemaName>_<collectionName>
 *
 * Operations (insert, update, delete) emit NOTIFY with a JSON payload.
 * This is not a perfect match for MongoDB change streams but covers
 * the core use cases.
 */
class ChangeStream extends EventEmitter {
  constructor(parent, pipeline = [], options = {}) {
    super();
    this._parent = parent; // Collection, Db, or MongoClient
    this._pipeline = pipeline;
    this._options = options;
    this._closed = false;
    this._pgClient = null;
    this._resumeToken = null;
    this._fullDocument = options.fullDocument || 'default';
    this._channelName = this._getChannelName();
  }

  get resumeToken() {
    return this._resumeToken;
  }

  _getChannelName() {
    if (this._parent._name) {
      // Collection-level
      const schema = this._parent._db?._schemaName || 'public';
      return `change_${schema}_${this._parent._name}`;
    }
    if (this._parent._dbName) {
      // Db-level
      return `change_${this._parent._dbName}`;
    }
    // Client-level
    return 'change_all';
  }

  async _setup() {
    const pool = this._getPool();
    this._pgClient = await pool.connect();

    this._pgClient.on('notification', (msg) => {
      if (this._closed) return;
      try {
        const payload = JSON.parse(msg.payload);
        this._resumeToken = payload._id || { _data: Date.now().toString(16) };

        // Apply pipeline filters
        if (this._matchesPipeline(payload)) {
          this.emit('change', payload);
        }
      } catch (err) {
        this.emit('error', err);
      }
    });

    await this._pgClient.query(`LISTEN "${this._channelName}"`);
  }

  _getPool() {
    if (this._parent._pool) return this._parent._pool;
    if (this._parent._db?._client?._pool) return this._parent._db._client._pool;
    if (this._parent._client?._pool) return this._parent._client._pool;
    throw new Error('Cannot find connection pool for change stream');
  }

  _matchesPipeline(change) {
    if (!this._pipeline || this._pipeline.length === 0) return true;

    for (const stage of this._pipeline) {
      if (stage.$match) {
        for (const [key, value] of Object.entries(stage.$match)) {
          if (key === 'operationType' && change.operationType !== value) return false;
          if (key.startsWith('fullDocument.')) {
            const field = key.substring('fullDocument.'.length);
            if (change.fullDocument?.[field] !== value) return false;
          }
        }
      }
    }
    return true;
  }

  async start() {
    if (!this._pgClient) {
      await this._setup();
    }
  }

  async next() {
    if (!this._pgClient) {
      await this._setup();
    }

    return new Promise((resolve, reject) => {
      if (this._closed) {
        resolve(null);
        return;
      }

      const onChange = (change) => {
        this.removeListener('error', onError);
        resolve(change);
      };

      const onError = (err) => {
        this.removeListener('change', onChange);
        reject(err);
      };

      this.once('change', onChange);
      this.once('error', onError);
    });
  }

  async tryNext() {
    if (this._closed) return null;
    if (!this._pgClient) {
      await this._setup();
    }
    // Non-blocking: return immediately if no pending change
    return new Promise((resolve) => {
      const onChange = (change) => {
        clearTimeout(timer);
        resolve(change);
      };
      // Return null immediately if no event is queued
      const timer = setTimeout(() => {
        this.removeListener('change', onChange);
        resolve(null);
      }, 0);
      this.once('change', onChange);
    });
  }

  async hasNext() {
    return !this._closed;
  }

  stream(options) {
    const self = this;
    const { Readable } = require('stream');
    const readable = new Readable({
      objectMode: true,
      async read() {
        try {
          if (self._closed) {
            this.push(null);
            return;
          }
          const change = await self.next();
          this.push(change);
        } catch (err) {
          this.destroy(err);
        }
      }
    });
    return readable;
  }

  async close() {
    if (this._closed) return;
    this._closed = true;

    if (this._pgClient) {
      try {
        await this._pgClient.query(`UNLISTEN "${this._channelName}"`);
      } catch (e) {
        // Ignore
      }
      this._pgClient.release();
      this._pgClient = null;
    }

    this.emit('close');
    this.removeAllListeners();
  }

  async *[Symbol.asyncIterator]() {
    if (!this._pgClient) {
      await this._setup();
    }

    while (!this._closed) {
      const change = await this.next();
      if (change === null) break;
      yield change;
    }
  }

  /**
   * Static helper: create the trigger function for a table
   * that emits NOTIFY on changes.
   */
  static getCreateTriggerSQL(tableName, channelName) {
    const funcName = `notify_${channelName}`;
    return `
      CREATE OR REPLACE FUNCTION "${funcName}"() RETURNS trigger AS $$
      DECLARE
        payload jsonb;
        operation text;
      BEGIN
        operation := TG_OP;
        IF (TG_OP = 'DELETE') THEN
          payload := jsonb_build_object(
            'operationType', 'delete',
            'documentKey', jsonb_build_object('_id', OLD._id),
            'ns', jsonb_build_object('coll', TG_TABLE_NAME)
          );
          PERFORM pg_notify('${channelName}', payload::text);
          RETURN OLD;
        ELSIF (TG_OP = 'UPDATE') THEN
          payload := jsonb_build_object(
            'operationType', 'update',
            'documentKey', jsonb_build_object('_id', NEW._id),
            'fullDocument', jsonb_build_object('_id', NEW._id) || NEW.data,
            'updateDescription', jsonb_build_object(
              'updatedFields', NEW.data,
              'removedFields', '[]'::jsonb
            ),
            'ns', jsonb_build_object('coll', TG_TABLE_NAME)
          );
          PERFORM pg_notify('${channelName}', payload::text);
          RETURN NEW;
        ELSIF (TG_OP = 'INSERT') THEN
          payload := jsonb_build_object(
            'operationType', 'insert',
            'documentKey', jsonb_build_object('_id', NEW._id),
            'fullDocument', jsonb_build_object('_id', NEW._id) || NEW.data,
            'ns', jsonb_build_object('coll', TG_TABLE_NAME)
          );
          PERFORM pg_notify('${channelName}', payload::text);
          RETURN NEW;
        END IF;
        RETURN NULL;
      END;
      $$ LANGUAGE plpgsql;

      DROP TRIGGER IF EXISTS "${funcName}_trigger" ON "${tableName}";
      CREATE TRIGGER "${funcName}_trigger"
        AFTER INSERT OR UPDATE OR DELETE ON "${tableName}"
        FOR EACH ROW EXECUTE FUNCTION "${funcName}"();
    `;
  }
}

module.exports = { ChangeStream };
