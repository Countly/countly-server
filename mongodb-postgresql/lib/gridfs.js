'use strict';

const { ObjectId } = require('./objectId');
const { Readable, Writable } = require('stream');

/**
 * GridFSBucket implementation using PostgreSQL large objects
 * or a chunked table approach matching MongoDB's GridFS schema:
 *
 * <bucket>.files: { _id, length, chunkSize, uploadDate, filename, metadata, ... }
 * <bucket>.chunks: { _id, files_id, n, data }
 */
class GridFSBucket {
  constructor(db, options = {}) {
    this._db = db;
    this._bucketName = options.bucketName || 'fs';
    this._chunkSizeBytes = options.chunkSizeBytes || 255 * 1024; // 255KB default
    this._filesCollection = `${this._bucketName}_files`;
    this._chunksCollection = `${this._bucketName}_chunks`;
    this._initialized = false;
  }

  async _ensureCollections() {
    if (this._initialized) return;
    const pool = this._db._getPool();
    const schema = this._db._schemaName;
    const prefix = schema ? `"${schema}".` : '';

    await pool.query(`
      CREATE TABLE IF NOT EXISTS ${prefix}"${this._filesCollection}" (
        _id TEXT PRIMARY KEY,
        data JSONB NOT NULL DEFAULT '{}'::jsonb
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS ${prefix}"${this._chunksCollection}" (
        _id TEXT PRIMARY KEY,
        data JSONB NOT NULL DEFAULT '{}'::jsonb
      )
    `);

    // Create index on chunks for efficient retrieval
    await pool.query(`
      CREATE INDEX IF NOT EXISTS "idx_${this._chunksCollection}_files_id_n"
      ON ${prefix}"${this._chunksCollection}" ((data->>'files_id'), ((data->>'n')::integer))
    `).catch(() => {}); // Ignore if exists

    this._initialized = true;
  }

  openUploadStream(filename, options = {}) {
    const bucket = this;
    const fileId = options.id || new ObjectId();
    const chunkSize = options.chunkSizeBytes || this._chunkSizeBytes;
    const metadata = options.metadata || {};
    const contentType = options.contentType;
    const aliases = options.aliases;

    let chunkIndex = 0;
    let totalLength = 0;
    let buffer = Buffer.alloc(0);

    const writable = new Writable({
      async write(chunk, encoding, callback) {
        try {
          await bucket._ensureCollections();
          buffer = Buffer.concat([buffer, chunk]);

          while (buffer.length >= chunkSize) {
            const chunkData = buffer.slice(0, chunkSize);
            buffer = buffer.slice(chunkSize);
            await bucket._writeChunk(fileId, chunkIndex, chunkData);
            chunkIndex++;
            totalLength += chunkData.length;
          }
          callback();
        } catch (err) {
          callback(err);
        }
      },
      async final(callback) {
        try {
          // Write remaining data
          if (buffer.length > 0) {
            await bucket._writeChunk(fileId, chunkIndex, buffer);
            totalLength += buffer.length;
          }

          // Write file record
          const fileDoc = {
            length: totalLength,
            chunkSize,
            uploadDate: { $date: new Date().toISOString() },
            filename,
            metadata,
          };
          if (contentType) fileDoc.contentType = contentType;
          if (aliases) fileDoc.aliases = aliases;

          const pool = bucket._db._getPool();
          const schema = bucket._db._schemaName;
          const prefix = schema ? `"${schema}".` : '';
          const id = fileId instanceof ObjectId ? fileId.toHexString() : String(fileId);

          await pool.query(
            `INSERT INTO ${prefix}"${bucket._filesCollection}" (_id, data) VALUES ($1, $2)`,
            [id, JSON.stringify(fileDoc)]
          );

          writable.emit('finish');
          callback();
        } catch (err) {
          callback(err);
        }
      }
    });

    writable.id = fileId;
    return writable;
  }

  openUploadStreamWithId(id, filename, options = {}) {
    return this.openUploadStream(filename, { ...options, id });
  }

  openDownloadStream(fileId, options = {}) {
    const bucket = this;
    const id = fileId instanceof ObjectId ? fileId.toHexString() : String(fileId);
    let chunkIndex = options.start ? Math.floor(options.start / this._chunkSizeBytes) : 0;
    let started = false;

    const readable = new Readable({
      async read() {
        try {
          if (!started) {
            await bucket._ensureCollections();
            started = true;
          }

          const pool = bucket._db._getPool();
          const schema = bucket._db._schemaName;
          const prefix = schema ? `"${schema}".` : '';

          const result = await pool.query(
            `SELECT data FROM ${prefix}"${bucket._chunksCollection}"
             WHERE data->>'files_id' = $1 AND (data->>'n')::integer = $2`,
            [id, chunkIndex]
          );

          if (result.rows.length === 0) {
            this.push(null);
            return;
          }

          const chunkData = result.rows[0].data.data;
          const buf = Buffer.from(chunkData, 'base64');
          chunkIndex++;
          this.push(buf);
        } catch (err) {
          this.destroy(err);
        }
      }
    });

    return readable;
  }

  openDownloadStreamByName(filename, options = {}) {
    const bucket = this;
    const revision = options.revision !== undefined ? options.revision : -1;

    const readable = new Readable({
      objectMode: false,
      async read() {
        try {
          await bucket._ensureCollections();
          const pool = bucket._db._getPool();
          const schema = bucket._db._schemaName;
          const prefix = schema ? `"${schema}".` : '';

          // Find file by name
          const order = revision >= 0 ? 'ASC' : 'DESC';
          const offset = revision >= 0 ? revision : -revision - 1;

          const fileResult = await pool.query(
            `SELECT _id FROM ${prefix}"${bucket._filesCollection}"
             WHERE data->>'filename' = $1
             ORDER BY data->'uploadDate' ${order}
             LIMIT 1 OFFSET $2`,
            [filename, offset]
          );

          if (fileResult.rows.length === 0) {
            this.destroy(new Error(`File not found: ${filename}`));
            return;
          }

          const fileId = fileResult.rows[0]._id;
          const downloadStream = bucket.openDownloadStream(fileId, options);
          downloadStream.on('data', (chunk) => this.push(chunk));
          downloadStream.on('end', () => this.push(null));
          downloadStream.on('error', (err) => this.destroy(err));
        } catch (err) {
          this.destroy(err);
        }
      }
    });

    return readable;
  }

  async delete(fileId) {
    await this._ensureCollections();
    const pool = this._db._getPool();
    const schema = this._db._schemaName;
    const prefix = schema ? `"${schema}".` : '';
    const id = fileId instanceof ObjectId ? fileId.toHexString() : String(fileId);

    await pool.query(`DELETE FROM ${prefix}"${this._chunksCollection}" WHERE data->>'files_id' = $1`, [id]);
    await pool.query(`DELETE FROM ${prefix}"${this._filesCollection}" WHERE _id = $1`, [id]);
  }

  async rename(fileId, filename) {
    await this._ensureCollections();
    const pool = this._db._getPool();
    const schema = this._db._schemaName;
    const prefix = schema ? `"${schema}".` : '';
    const id = fileId instanceof ObjectId ? fileId.toHexString() : String(fileId);

    await pool.query(
      `UPDATE ${prefix}"${this._filesCollection}" SET data = jsonb_set(data, '{filename}', $1::jsonb) WHERE _id = $2`,
      [JSON.stringify(filename), id]
    );
  }

  async drop() {
    const pool = this._db._getPool();
    const schema = this._db._schemaName;
    const prefix = schema ? `"${schema}".` : '';

    await pool.query(`DROP TABLE IF EXISTS ${prefix}"${this._chunksCollection}"`);
    await pool.query(`DROP TABLE IF EXISTS ${prefix}"${this._filesCollection}"`);
    this._initialized = false;
  }

  find(filter = {}, options = {}) {
    const filesCol = this._db.collection(this._filesCollection);
    return filesCol.find(filter, options);
  }

  async _writeChunk(fileId, n, data) {
    const pool = this._db._getPool();
    const schema = this._db._schemaName;
    const prefix = schema ? `"${schema}".` : '';
    const id = fileId instanceof ObjectId ? fileId.toHexString() : String(fileId);
    const chunkId = new ObjectId().toHexString();

    const chunkDoc = {
      files_id: id,
      n: n,
      data: data.toString('base64')
    };

    await pool.query(
      `INSERT INTO ${prefix}"${this._chunksCollection}" (_id, data) VALUES ($1, $2)`,
      [chunkId, JSON.stringify(chunkDoc)]
    );
  }
}

module.exports = { GridFSBucket };
