'use strict';

const crypto = require('crypto');

let processUnique = null;
let index = Math.floor(Math.random() * 0xffffff);

function getProcessUnique() {
  if (processUnique === null) {
    processUnique = crypto.randomBytes(5);
  }
  return processUnique;
}

class ObjectId {
  constructor(id) {
    if (id instanceof ObjectId) {
      this._id = id._id;
    } else if (typeof id === 'string') {
      if (id.length === 24 && /^[0-9a-fA-F]{24}$/.test(id)) {
        this._id = id.toLowerCase();
      } else {
        throw new Error(`Argument passed in must be a string of 24 hex characters, got "${id}"`);
      }
    } else if (Buffer.isBuffer(id) && id.length === 12) {
      this._id = id.toString('hex');
    } else if (id == null) {
      this._id = ObjectId.generate();
    } else {
      throw new Error(`Argument passed in does not match the accepted types`);
    }
  }

  static generate(time) {
    const timestamp = time ? Math.floor(time / 1000) : Math.floor(Date.now() / 1000);
    const inc = (index = (index + 1) % 0xffffff);
    const buffer = Buffer.alloc(12);

    // 4-byte timestamp
    buffer.writeUInt32BE(timestamp, 0);

    // 5-byte process unique
    const unique = getProcessUnique();
    buffer[4] = unique[0];
    buffer[5] = unique[1];
    buffer[6] = unique[2];
    buffer[7] = unique[3];
    buffer[8] = unique[4];

    // 3-byte counter
    buffer[9] = (inc >> 16) & 0xff;
    buffer[10] = (inc >> 8) & 0xff;
    buffer[11] = inc & 0xff;

    return buffer.toString('hex');
  }

  static createFromHexString(hexString) {
    return new ObjectId(hexString);
  }

  static createFromTime(time) {
    const buffer = Buffer.alloc(12);
    buffer.writeUInt32BE(Math.floor(time / 1000), 0);
    return new ObjectId(buffer);
  }

  static isValid(id) {
    if (id instanceof ObjectId) return true;
    if (typeof id === 'string') return id.length === 24 && /^[0-9a-fA-F]{24}$/.test(id);
    if (Buffer.isBuffer(id)) return id.length === 12;
    return false;
  }

  getTimestamp() {
    const buffer = Buffer.from(this._id, 'hex');
    const timestamp = buffer.readUInt32BE(0);
    return new Date(timestamp * 1000);
  }

  toHexString() {
    return this._id;
  }

  toString() {
    return this._id;
  }

  toJSON() {
    return this._id;
  }

  equals(otherId) {
    if (otherId instanceof ObjectId) {
      return this._id === otherId._id;
    }
    if (typeof otherId === 'string') {
      return this._id === otherId.toLowerCase();
    }
    return false;
  }

  [Symbol.for('nodejs.util.inspect.custom')]() {
    return `ObjectId("${this._id}")`;
  }
}

module.exports = { ObjectId };
