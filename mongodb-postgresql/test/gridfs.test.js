'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert');
const { GridFSBucket } = require('../lib/gridfs');
const { ObjectId } = require('../lib/objectId');

function createMockDb(storedChunks = {}, storedFiles = {}) {
  const queries = [];
  const pool = {
    query: async (sql, params) => {
      queries.push({ sql, params });
      if (sql.includes('CREATE TABLE') || sql.includes('CREATE INDEX')) {
        return { rows: [], rowCount: 0 };
      }
      if (sql.includes('INSERT INTO')) {
        // Store the data for later retrieval
        if (sql.includes('_chunks') && params) {
          const id = params[0];
          storedChunks[id] = JSON.parse(params[1]);
        }
        if (sql.includes('_files') && params) {
          const id = params[0];
          storedFiles[id] = JSON.parse(params[1]);
        }
        return { rows: [], rowCount: 1 };
      }
      if (sql.includes('SELECT data') && sql.includes('_chunks')) {
        // Return chunk data based on files_id and n
        const filesId = params[0];
        const n = params[1];
        const chunk = Object.values(storedChunks).find(
          c => c.files_id === filesId && c.n === n
        );
        if (chunk) {
          return { rows: [{ data: chunk }], rowCount: 1 };
        }
        return { rows: [], rowCount: 0 };
      }
      if (sql.includes('SELECT _id') && sql.includes('_files')) {
        // Return file by name
        const filename = params[0];
        const file = Object.entries(storedFiles).find(
          ([, f]) => f.filename === filename
        );
        if (file) {
          return { rows: [{ _id: file[0] }], rowCount: 1 };
        }
        return { rows: [], rowCount: 0 };
      }
      if (sql.includes('DELETE')) {
        return { rows: [], rowCount: 1 };
      }
      if (sql.includes('UPDATE')) {
        return { rows: [], rowCount: 1 };
      }
      if (sql.includes('DROP TABLE')) {
        return { rows: [], rowCount: 0 };
      }
      return { rows: [], rowCount: 0 };
    }
  };
  return {
    _schemaName: null,
    _getPool: () => pool,
    collection: () => ({ find: () => ({ toArray: async () => Object.values(storedFiles) }) }),
    _queries: queries
  };
}

describe('GridFSBucket', () => {
  describe('constructor', () => {
    it('should use default bucket name "fs"', () => {
      const bucket = new GridFSBucket(createMockDb());
      assert.strictEqual(bucket._bucketName, 'fs');
      assert.strictEqual(bucket._filesCollection, 'fs_files');
      assert.strictEqual(bucket._chunksCollection, 'fs_chunks');
    });

    it('should accept custom bucket name', () => {
      const bucket = new GridFSBucket(createMockDb(), { bucketName: 'photos' });
      assert.strictEqual(bucket._bucketName, 'photos');
      assert.strictEqual(bucket._filesCollection, 'photos_files');
      assert.strictEqual(bucket._chunksCollection, 'photos_chunks');
    });

    it('should use default chunk size of 255KB', () => {
      const bucket = new GridFSBucket(createMockDb());
      assert.strictEqual(bucket._chunkSizeBytes, 255 * 1024);
    });

    it('should accept custom chunk size', () => {
      const bucket = new GridFSBucket(createMockDb(), { chunkSizeBytes: 1024 });
      assert.strictEqual(bucket._chunkSizeBytes, 1024);
    });
  });

  describe('_ensureCollections', () => {
    it('should create tables and index', async () => {
      const db = createMockDb();
      const bucket = new GridFSBucket(db);
      await bucket._ensureCollections();
      assert.ok(db._queries.some(q => q.sql.includes('CREATE TABLE') && q.sql.includes('fs_files')));
      assert.ok(db._queries.some(q => q.sql.includes('CREATE TABLE') && q.sql.includes('fs_chunks')));
      assert.ok(bucket._initialized);
    });

    it('should only run once', async () => {
      const db = createMockDb();
      const bucket = new GridFSBucket(db);
      await bucket._ensureCollections();
      const count = db._queries.length;
      await bucket._ensureCollections();
      assert.strictEqual(db._queries.length, count);
    });
  });

  describe('openUploadStream', () => {
    it('should return a writable stream with an id', () => {
      const bucket = new GridFSBucket(createMockDb());
      const stream = bucket.openUploadStream('test.txt');
      assert.ok(stream);
      assert.ok(stream.id instanceof ObjectId);
      assert.ok(typeof stream.write === 'function');
      assert.ok(typeof stream.end === 'function');
    });

    it('should accept custom options', () => {
      const bucket = new GridFSBucket(createMockDb());
      const customId = new ObjectId();
      const stream = bucket.openUploadStream('test.txt', {
        id: customId,
        metadata: { type: 'document' },
        contentType: 'text/plain'
      });
      assert.strictEqual(stream.id, customId);
    });

    it('should write data and create file record', async () => {
      const chunks = {};
      const files = {};
      const db = createMockDb(chunks, files);
      const bucket = new GridFSBucket(db, { chunkSizeBytes: 10 });

      const stream = bucket.openUploadStream('test.txt');
      const fileId = stream.id;

      await new Promise((resolve, reject) => {
        stream.on('error', reject);
        stream.on('finish', resolve);
        stream.write(Buffer.from('hello'));
        stream.end();
      });

      // Should have created chunks and a file record
      assert.ok(Object.keys(chunks).length > 0);
      assert.ok(Object.keys(files).length > 0);

      const fileRecord = Object.values(files)[0];
      assert.strictEqual(fileRecord.filename, 'test.txt');
      assert.strictEqual(fileRecord.length, 5);
      assert.ok(fileRecord.uploadDate);
    });

    it('should split large data into multiple chunks', async () => {
      const chunks = {};
      const files = {};
      const db = createMockDb(chunks, files);
      const bucket = new GridFSBucket(db, { chunkSizeBytes: 4 });

      const stream = bucket.openUploadStream('big.bin');
      await new Promise((resolve, reject) => {
        stream.on('error', reject);
        stream.on('finish', resolve);
        stream.write(Buffer.from('abcdefghij')); // 10 bytes, 4-byte chunks
        stream.end();
      });

      // Should have 3 chunks: 4+4+2
      const chunkList = Object.values(chunks);
      assert.ok(chunkList.length >= 2);
    });

    it('should store metadata in file record', async () => {
      const chunks = {};
      const files = {};
      const db = createMockDb(chunks, files);
      const bucket = new GridFSBucket(db);

      const stream = bucket.openUploadStream('doc.pdf', {
        metadata: { author: 'Alice' },
        contentType: 'application/pdf'
      });
      await new Promise((resolve, reject) => {
        stream.on('error', reject);
        stream.on('finish', resolve);
        stream.end(Buffer.from('data'));
      });

      const fileRecord = Object.values(files)[0];
      assert.deepStrictEqual(fileRecord.metadata, { author: 'Alice' });
      assert.strictEqual(fileRecord.contentType, 'application/pdf');
    });
  });

  describe('openUploadStreamWithId', () => {
    it('should use the provided id', () => {
      const bucket = new GridFSBucket(createMockDb());
      const customId = 'my-custom-id';
      const stream = bucket.openUploadStreamWithId(customId, 'test.txt');
      assert.strictEqual(stream.id, customId);
    });

    it('should accept ObjectId', () => {
      const bucket = new GridFSBucket(createMockDb());
      const oid = new ObjectId();
      const stream = bucket.openUploadStreamWithId(oid, 'test.txt');
      assert.strictEqual(stream.id, oid);
    });
  });

  describe('openDownloadStream', () => {
    it('should return a readable stream', () => {
      const bucket = new GridFSBucket(createMockDb());
      const stream = bucket.openDownloadStream('some-id');
      assert.ok(stream);
      assert.ok(typeof stream.read === 'function');
      assert.ok(typeof stream.pipe === 'function');
    });

    it('should read chunk data', async () => {
      const chunks = {};
      const db = createMockDb(chunks);
      // Pre-populate a chunk
      chunks['chunk1'] = { files_id: 'file1', n: 0, data: Buffer.from('hello world').toString('base64') };

      const bucket = new GridFSBucket(db);
      bucket._initialized = true;
      const stream = bucket.openDownloadStream('file1');

      const data = await new Promise((resolve, reject) => {
        const bufs = [];
        stream.on('data', chunk => bufs.push(chunk));
        stream.on('end', () => resolve(Buffer.concat(bufs)));
        stream.on('error', reject);
      });

      assert.strictEqual(data.toString(), 'hello world');
    });

    it('should end stream when no more chunks', async () => {
      const db = createMockDb();
      const bucket = new GridFSBucket(db);
      bucket._initialized = true;
      const stream = bucket.openDownloadStream('nonexistent');

      const data = await new Promise((resolve, reject) => {
        const bufs = [];
        stream.on('data', chunk => bufs.push(chunk));
        stream.on('end', () => resolve(Buffer.concat(bufs)));
        stream.on('error', reject);
      });

      assert.strictEqual(data.length, 0);
    });
  });

  describe('openDownloadStreamByName', () => {
    it('should return a readable stream', () => {
      const bucket = new GridFSBucket(createMockDb());
      const stream = bucket.openDownloadStreamByName('test.txt');
      assert.ok(stream);
      assert.ok(typeof stream.pipe === 'function');
    });
  });

  describe('delete', () => {
    it('should delete chunks and file record', async () => {
      const db = createMockDb();
      const bucket = new GridFSBucket(db);
      await bucket.delete('file1');
      assert.ok(db._queries.some(q => q.sql.includes('DELETE') && q.sql.includes('_chunks')));
      assert.ok(db._queries.some(q => q.sql.includes('DELETE') && q.sql.includes('_files')));
    });

    it('should accept ObjectId', async () => {
      const db = createMockDb();
      const bucket = new GridFSBucket(db);
      const oid = new ObjectId();
      await bucket.delete(oid);
      assert.ok(db._queries.some(q => q.params && q.params.includes(oid.toHexString())));
    });
  });

  describe('rename', () => {
    it('should update filename in file record', async () => {
      const db = createMockDb();
      const bucket = new GridFSBucket(db);
      await bucket.rename('file1', 'newname.txt');
      assert.ok(db._queries.some(q => q.sql.includes('UPDATE') && q.sql.includes('jsonb_set')));
      assert.ok(db._queries.some(q => q.params && q.params.includes('"newname.txt"')));
    });
  });

  describe('drop', () => {
    it('should drop both tables', async () => {
      const db = createMockDb();
      const bucket = new GridFSBucket(db);
      bucket._initialized = true;
      await bucket.drop();
      assert.ok(db._queries.some(q => q.sql.includes('DROP TABLE') && q.sql.includes('_chunks')));
      assert.ok(db._queries.some(q => q.sql.includes('DROP TABLE') && q.sql.includes('_files')));
      assert.strictEqual(bucket._initialized, false);
    });
  });

  describe('find', () => {
    it('should delegate to files collection', () => {
      const db = createMockDb();
      const bucket = new GridFSBucket(db);
      const cursor = bucket.find({ filename: 'test.txt' });
      assert.ok(cursor);
    });
  });
});
