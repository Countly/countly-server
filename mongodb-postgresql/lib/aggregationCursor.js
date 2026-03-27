'use strict';

const { EventEmitter } = require('events');

class AggregationCursor extends EventEmitter {
  constructor(collection, pipeline, options = {}) {
    super();
    this._collection = collection;
    this._pipeline = pipeline;
    this._options = options;
    this._executed = false;
    this._results = null;
    this._index = 0;
    this._closed = false;
    this._transform = null;
  }

  batchSize(n) {
    this._batchSize = n;
    return this;
  }

  maxTimeMS(ms) {
    this._maxTimeMS = ms;
    return this;
  }

  comment(comment) {
    this._comment = comment;
    return this;
  }

  hint(hint) {
    this._hint = hint;
    return this;
  }

  map(transform) {
    this._transform = transform;
    return this;
  }

  async _execute() {
    if (this._executed) return;
    this._executed = true;
    this._results = await this._collection._executeAggregate(this._pipeline, this._options);
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
    if (this._index >= this._results.length) return null;
    let doc = this._results[this._index++];
    if (this._transform) doc = this._transform(doc);
    return doc;
  }

  async hasNext() {
    await this._execute();
    return this._index < this._results.length;
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
    if (this._index >= this._results.length) return null;
    let doc = this._results[this._index++];
    if (this._transform) doc = this._transform(doc);
    return doc;
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
    if (this._transform) return docs.map(this._transform);
    return docs;
  }

  async close() {
    this._closed = true;
    this._results = null;
  }

  clone() {
    return new AggregationCursor(this._collection, [...this._pipeline], { ...this._options });
  }

  rewind() {
    this._index = 0;
    this._executed = false;
    this._results = null;
    return this;
  }

  get pipeline() {
    return this._pipeline;
  }

  // Fluent pipeline builders
  addStage(stage) {
    this._pipeline.push(stage);
    return this;
  }

  group(document) {
    return this.addStage({ $group: document });
  }

  match(document) {
    return this.addStage({ $match: document });
  }

  sort(sort) {
    return this.addStage({ $sort: sort });
  }

  limit(value) {
    return this.addStage({ $limit: value });
  }

  skip(value) {
    return this.addStage({ $skip: value });
  }

  project(document) {
    return this.addStage({ $project: document });
  }

  unwind(field) {
    return this.addStage({ $unwind: field });
  }

  lookup(document) {
    return this.addStage({ $lookup: document });
  }

  out(destination) {
    return this.addStage({ $out: destination });
  }

  redact(document) {
    return this.addStage({ $redact: document });
  }

  geoNear(document) {
    return this.addStage({ $geoNear: document });
  }

  async explain(verbosity) {
    const { AggregateTranslator } = require('./aggregateTranslator');
    const translator = new AggregateTranslator(
      this._collection._name,
      this._collection._db._schemaName
    );
    const { sql, params } = translator.translate(this._pipeline);
    return { queryPlanner: { sql, params } };
  }

  async *[Symbol.asyncIterator]() {
    await this._execute();
    for (const doc of this._results) {
      if (this._closed) break;
      yield this._transform ? this._transform(doc) : doc;
    }
  }

  stream(options) {
    const self = this;
    const { Readable } = require('stream');
    return new Readable({
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
  }
}

module.exports = { AggregationCursor };
