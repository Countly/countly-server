'use strict';

class BulkWriteResult {
  constructor() {
    this.insertedCount = 0;
    this.matchedCount = 0;
    this.modifiedCount = 0;
    this.deletedCount = 0;
    this.upsertedCount = 0;
    this.insertedIds = {};
    this.upsertedIds = {};
    this.ok = 1;
    this.writeErrors = [];
    this.writeConcernErrors = [];
  }

  isOk() {
    return this.ok === 1;
  }

  hasWriteErrors() {
    return this.writeErrors.length > 0;
  }

  getWriteErrorCount() {
    return this.writeErrors.length;
  }

  getWriteErrorAt(index) {
    return this.writeErrors[index] || null;
  }

  getWriteErrors() {
    return this.writeErrors;
  }

  getWriteConcernError() {
    return this.writeConcernErrors.length > 0 ? this.writeConcernErrors[0] : null;
  }

  getUpsertedIdAt(index) {
    return this.upsertedIds[index] || null;
  }

  getRawResponse() {
    return {
      ok: this.ok,
      nInserted: this.insertedCount,
      nMatched: this.matchedCount,
      nModified: this.modifiedCount,
      nRemoved: this.deletedCount,
      nUpserted: this.upsertedCount,
      insertedIds: this.insertedIds,
      upsertedIds: this.upsertedIds,
      writeErrors: this.writeErrors,
      writeConcernErrors: this.writeConcernErrors
    };
  }

  toString() {
    return `BulkWriteResult(inserted: ${this.insertedCount}, matched: ${this.matchedCount}, modified: ${this.modifiedCount}, deleted: ${this.deletedCount}, upserted: ${this.upsertedCount})`;
  }
}

class OrderedBulkOperation {
  constructor(collection) {
    this._collection = collection;
    this._operations = [];
    this._executed = false;
  }

  insert(document) {
    this._operations.push({ type: 'insert', document });
    return this;
  }

  find(filter) {
    return new FindOperators(this, filter);
  }

  raw(operation) {
    if (operation.insertOne) {
      this._operations.push({ type: 'insert', document: operation.insertOne.document || operation.insertOne });
    } else if (operation.updateOne) {
      this._operations.push({
        type: 'updateOne',
        filter: operation.updateOne.filter,
        update: operation.updateOne.update,
        upsert: operation.updateOne.upsert
      });
    } else if (operation.updateMany) {
      this._operations.push({
        type: 'updateMany',
        filter: operation.updateMany.filter,
        update: operation.updateMany.update,
        upsert: operation.updateMany.upsert
      });
    } else if (operation.deleteOne) {
      this._operations.push({ type: 'deleteOne', filter: operation.deleteOne.filter });
    } else if (operation.deleteMany) {
      this._operations.push({ type: 'deleteMany', filter: operation.deleteMany.filter });
    } else if (operation.replaceOne) {
      this._operations.push({
        type: 'replaceOne',
        filter: operation.replaceOne.filter,
        replacement: operation.replaceOne.replacement,
        upsert: operation.replaceOne.upsert
      });
    }
    return this;
  }

  async execute(options) {
    if (this._executed) {
      throw new Error('Batch cannot be re-executed');
    }
    this._executed = true;

    const result = new BulkWriteResult();

    // Execute operations sequentially for ordered bulk
    for (let i = 0; i < this._operations.length; i++) {
      const op = this._operations[i];
      try {
        await this._executeOp(op, result, i);
      } catch (err) {
        const { MongoBulkWriteError } = require('./errors');
        result.writeErrors = [{ index: i, code: err.code, errmsg: err.message }];
        throw new MongoBulkWriteError(err.message, result);
      }
    }

    return result;
  }

  async _executeOp(op, result, index) {
    switch (op.type) {
      case 'insert': {
        const r = await this._collection.insertOne(op.document);
        result.insertedCount++;
        result.insertedIds[index] = r.insertedId;
        break;
      }
      case 'updateOne': {
        const r = await this._collection.updateOne(op.filter, op.update, { upsert: op.upsert });
        result.matchedCount += r.matchedCount;
        result.modifiedCount += r.modifiedCount;
        if (r.upsertedId) {
          result.upsertedCount++;
          result.upsertedIds[index] = r.upsertedId;
        }
        break;
      }
      case 'updateMany': {
        const r = await this._collection.updateMany(op.filter, op.update, { upsert: op.upsert });
        result.matchedCount += r.matchedCount;
        result.modifiedCount += r.modifiedCount;
        if (r.upsertedId) {
          result.upsertedCount++;
          result.upsertedIds[index] = r.upsertedId;
        }
        break;
      }
      case 'replaceOne': {
        const r = await this._collection.replaceOne(op.filter, op.replacement, { upsert: op.upsert });
        result.matchedCount += r.matchedCount;
        result.modifiedCount += r.modifiedCount;
        if (r.upsertedId) {
          result.upsertedCount++;
          result.upsertedIds[index] = r.upsertedId;
        }
        break;
      }
      case 'deleteOne': {
        const r = await this._collection.deleteOne(op.filter);
        result.deletedCount += r.deletedCount;
        break;
      }
      case 'deleteMany': {
        const r = await this._collection.deleteMany(op.filter);
        result.deletedCount += r.deletedCount;
        break;
      }
    }
  }
}

class UnorderedBulkOperation extends OrderedBulkOperation {
  async execute(options) {
    if (this._executed) {
      throw new Error('Batch cannot be re-executed');
    }
    this._executed = true;

    const result = new BulkWriteResult();
    const errors = [];

    // Execute all operations, collecting errors instead of stopping
    for (let i = 0; i < this._operations.length; i++) {
      try {
        await this._executeOp(this._operations[i], result, i);
      } catch (err) {
        errors.push({ index: i, code: err.code, errmsg: err.message });
      }
    }

    if (errors.length > 0) {
      result.writeErrors = errors;
      const { MongoBulkWriteError } = require('./errors');
      throw new MongoBulkWriteError(`${errors.length} write errors`, result);
    }

    return result;
  }
}

class FindOperators {
  constructor(bulk, filter) {
    this._bulk = bulk;
    this._filter = filter;
  }

  update(update) {
    this._bulk._operations.push({ type: 'updateMany', filter: this._filter, update });
    return this._bulk;
  }

  updateOne(update) {
    this._bulk._operations.push({ type: 'updateOne', filter: this._filter, update });
    return this._bulk;
  }

  upsert() {
    return {
      update: (update) => {
        this._bulk._operations.push({ type: 'updateMany', filter: this._filter, update, upsert: true });
        return this._bulk;
      },
      updateOne: (update) => {
        this._bulk._operations.push({ type: 'updateOne', filter: this._filter, update, upsert: true });
        return this._bulk;
      },
      replaceOne: (replacement) => {
        this._bulk._operations.push({ type: 'replaceOne', filter: this._filter, replacement, upsert: true });
        return this._bulk;
      }
    };
  }

  replaceOne(replacement) {
    this._bulk._operations.push({ type: 'replaceOne', filter: this._filter, replacement });
    return this._bulk;
  }

  deleteOne() {
    this._bulk._operations.push({ type: 'deleteOne', filter: this._filter });
    return this._bulk;
  }

  delete() {
    this._bulk._operations.push({ type: 'deleteMany', filter: this._filter });
    return this._bulk;
  }
}

module.exports = { BulkWriteResult, OrderedBulkOperation, UnorderedBulkOperation };
