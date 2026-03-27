'use strict';

const { EventEmitter } = require('events');

class Cursor extends EventEmitter {
  constructor(collection, query, options = {}) {
    super();
    this._collection = collection;
    this._query = query;
    this._options = options;
    this._filter = query || {};
    this._projection = null;
    this._sortSpec = null;
    this._skipVal = 0;
    this._limitVal = 0;
    this._batchSize = 1000;
    this._hint = null;
    this._comment = null;
    this._maxTimeMS = null;
    this._collation = null;
    this._min = null;
    this._max = null;
    this._returnKey = false;
    this._showRecordId = false;
    this._executed = false;
    this._results = null;
    this._index = 0;
    this._closed = false;
  }

  filter(filter) {
    this._filter = filter;
    return this;
  }

  project(projection) {
    this._projection = projection;
    return this;
  }

  sort(sort) {
    this._sortSpec = sort;
    return this;
  }

  skip(n) {
    this._skipVal = n;
    return this;
  }

  limit(n) {
    this._limitVal = n;
    return this;
  }

  batchSize(n) {
    this._batchSize = n;
    return this;
  }

  hint(hint) {
    this._hint = hint;
    return this;
  }

  comment(comment) {
    this._comment = comment;
    return this;
  }

  maxTimeMS(ms) {
    this._maxTimeMS = ms;
    return this;
  }

  collation(collation) {
    this._collation = collation;
    return this;
  }

  min(min) {
    this._min = min;
    return this;
  }

  max(max) {
    this._max = max;
    return this;
  }

  returnKey(value) {
    this._returnKey = value;
    return this;
  }

  showRecordId(value) {
    this._showRecordId = value;
    return this;
  }

  addCursorFlag(flag, value) {
    // Flags like tailable, awaitData, noCursorTimeout, etc.
    // These are MongoDB-specific and mostly no-ops for PostgreSQL
    this[`_${flag}`] = value;
    return this;
  }

  map(transform) {
    this._transform = transform;
    return this;
  }

  async _execute() {
    if (this._executed) return;
    this._executed = true;
    this._results = await this._collection._executeFind(
      this._filter,
      this._projection,
      this._sortSpec,
      this._skipVal,
      this._limitVal,
      this._options
    );
  }

  async toArray() {
    await this._execute();
    let results = this._results;
    if (this._transform) {
      results = results.map(this._transform);
    }
    return results;
  }

  async next() {
    await this._execute();
    if (this._index >= this._results.length) {
      return null;
    }
    let doc = this._results[this._index++];
    if (this._transform) {
      doc = this._transform(doc);
    }
    return doc;
  }

  async hasNext() {
    await this._execute();
    return this._index < this._results.length;
  }

  async count() {
    return this._collection.countDocuments(this._filter);
  }

  async explain(verbosity) {
    const { QueryTranslator } = require('./queryTranslator');
    const translator = new QueryTranslator();
    const { where, params } = translator.translateFilter(this._filter);
    const tableName = this._collection._tableName();
    return {
      queryPlanner: {
        sql: `SELECT _id, data FROM ${tableName} WHERE ${where}`,
        params
      }
    };
  }

  async forEach(callback) {
    await this._execute();
    for (const doc of this._results) {
      const result = this._transform ? this._transform(doc) : doc;
      const shouldContinue = await callback(result);
      if (shouldContinue === false) break;
    }
  }

  async tryNext() {
    await this._execute();
    if (this._index >= this._results.length) {
      return null;
    }
    let doc = this._results[this._index++];
    if (this._transform) {
      doc = this._transform(doc);
    }
    return doc;
  }

  allowDiskUse(allow) {
    this._allowDiskUse = allow !== false;
    return this;
  }

  maxAwaitTimeMS(ms) {
    this._maxAwaitTimeMS = ms;
    return this;
  }

  bufferedCount() {
    if (!this._results) return 0;
    return Math.max(0, this._results.length - this._index);
  }

  readBufferedDocuments(count) {
    if (!this._results) return [];
    const remaining = this._results.length - this._index;
    const n = count != null ? Math.min(count, remaining) : remaining;
    const docs = this._results.slice(this._index, this._index + n);
    this._index += n;
    if (this._transform) {
      return docs.map(this._transform);
    }
    return docs;
  }

  async close() {
    this._closed = true;
    this._results = null;
  }

  async *[Symbol.asyncIterator]() {
    await this._execute();
    for (const doc of this._results) {
      if (this._closed) break;
      yield this._transform ? this._transform(doc) : doc;
    }
  }

  // Stream interface
  stream(options) {
    const self = this;
    const { Readable } = require('stream');
    const readable = new Readable({
      objectMode: true,
      async read() {
        try {
          const doc = await self.next();
          this.push(doc);
        } catch (err) {
          this.destroy(err);
        }
      }
    });
    return readable;
  }

  clone() {
    const cursor = new Cursor(this._collection, this._filter, this._options);
    cursor._projection = this._projection;
    cursor._sortSpec = this._sortSpec;
    cursor._skipVal = this._skipVal;
    cursor._limitVal = this._limitVal;
    cursor._batchSize = this._batchSize;
    cursor._hint = this._hint;
    cursor._comment = this._comment;
    cursor._collation = this._collation;
    cursor._transform = this._transform;
    return cursor;
  }

  rewind() {
    this._index = 0;
    this._executed = false;
    this._results = null;
    return this;
  }
}

module.exports = { Cursor };
