'use strict';

const { EventEmitter } = require('events');

/**
 * ClientSession wraps a PostgreSQL transaction.
 * MongoDB sessions map to PostgreSQL transactions with SAVEPOINT support.
 */
class ClientSession extends EventEmitter {
  constructor(client, options = {}) {
    super();
    this._client = client;
    this._options = options;
    this._pgClient = null;
    this._inTransaction = false;
    this._transactionOptions = {};
    this._id = { id: require('crypto').randomBytes(16) };
    this._ended = false;
    this._clusterTime = null;
    this._operationTime = null;
  }

  get id() {
    return this._id;
  }

  get inTransaction() {
    return this._inTransaction;
  }

  get clusterTime() {
    return this._clusterTime;
  }

  get operationTime() {
    return this._operationTime;
  }

  advanceClusterTime(clusterTime) {
    this._clusterTime = clusterTime;
  }

  advanceOperationTime(operationTime) {
    this._operationTime = operationTime;
  }

  equals(other) {
    return this._id.id.equals(other._id.id);
  }

  async _getConnection() {
    if (!this._pgClient) {
      this._pgClient = await this._client._pool.connect();
    }
    return this._pgClient;
  }

  startTransaction(options = {}) {
    if (this._inTransaction) {
      throw new Error('Transaction already in progress');
    }
    this._transactionOptions = options;
    this._inTransaction = true;
    this._transactionStarted = false;
  }

  async _ensureTransaction() {
    if (this._inTransaction && !this._transactionStarted) {
      const conn = await this._getConnection();
      const isolationLevel = this._mapReadConcernToIsolation(
        this._transactionOptions.readConcern
      );
      await conn.query(`BEGIN ISOLATION LEVEL ${isolationLevel}`);
      this._transactionStarted = true;
    }
  }

  async commitTransaction() {
    if (!this._inTransaction) {
      throw new Error('No transaction started');
    }
    if (this._transactionStarted) {
      const conn = await this._getConnection();
      await conn.query('COMMIT');
    }
    this._inTransaction = false;
    this._transactionStarted = false;
  }

  async abortTransaction() {
    if (!this._inTransaction) {
      throw new Error('No transaction started');
    }
    if (this._transactionStarted) {
      const conn = await this._getConnection();
      await conn.query('ROLLBACK');
    }
    this._inTransaction = false;
    this._transactionStarted = false;
  }

  async withTransaction(fn, options) {
    this.startTransaction(options);
    try {
      const result = await fn(this);
      await this.commitTransaction();
      return result;
    } catch (err) {
      try {
        await this.abortTransaction();
      } catch (abortErr) {
        // Ignore abort errors
      }
      throw err;
    }
  }

  async endSession() {
    if (this._ended) return;
    this._ended = true;

    if (this._inTransaction) {
      try {
        await this.abortTransaction();
      } catch (err) {
        // Ignore
      }
    }

    if (this._pgClient) {
      this._pgClient.release();
      this._pgClient = null;
    }

    this.emit('ended', this);
  }

  _mapReadConcernToIsolation(readConcern) {
    if (!readConcern) return 'READ COMMITTED';
    switch (readConcern.level || readConcern) {
      case 'snapshot':
        return 'SERIALIZABLE';
      case 'linearizable':
        return 'SERIALIZABLE';
      case 'majority':
        return 'REPEATABLE READ';
      default:
        return 'READ COMMITTED';
    }
  }
}

module.exports = { ClientSession };
