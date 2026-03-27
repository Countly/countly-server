'use strict';

class Long {
  constructor(low, high) {
    if (typeof low === 'bigint') {
      this.value = low;
    } else if (typeof low === 'number' && high === undefined) {
      this.value = BigInt(low);
    } else {
      const lowBits = BigInt(low >>> 0);
      const highBits = BigInt((high || 0) >>> 0);
      this.value = (highBits << 32n) | lowBits;
    }
  }

  static fromNumber(value) {
    return new Long(BigInt(Math.trunc(value)));
  }

  static fromString(str, radix) {
    return new Long(BigInt(parseInt(str, radix || 10)));
  }

  toNumber() {
    return Number(this.value);
  }

  toString(radix) {
    return this.value.toString(radix || 10);
  }

  toJSON() {
    return this.value.toString();
  }

  equals(other) {
    if (other instanceof Long) return this.value === other.value;
    return this.value === BigInt(other);
  }

  valueOf() {
    return this.value;
  }
}

class Decimal128 {
  constructor(value) {
    if (typeof value === 'string') {
      this.value = value;
    } else if (typeof value === 'number') {
      this.value = value.toString();
    } else if (Buffer.isBuffer(value)) {
      this.value = value.toString();
    } else {
      this.value = String(value);
    }
  }

  static fromString(str) {
    return new Decimal128(str);
  }

  toString() {
    return this.value;
  }

  toJSON() {
    return { $numberDecimal: this.value };
  }

  valueOf() {
    return parseFloat(this.value);
  }
}

class Binary {
  constructor(buffer, subType) {
    this.buffer = Buffer.isBuffer(buffer) ? buffer : Buffer.from(buffer || '');
    this.subType = subType || Binary.SUBTYPE_DEFAULT;
    this.position = this.buffer.length;
  }

  static get SUBTYPE_DEFAULT() { return 0; }
  static get SUBTYPE_FUNCTION() { return 1; }
  static get SUBTYPE_BYTE_ARRAY() { return 2; }
  static get SUBTYPE_UUID_OLD() { return 3; }
  static get SUBTYPE_UUID() { return 4; }
  static get SUBTYPE_MD5() { return 5; }
  static get SUBTYPE_USER_DEFINED() { return 128; }

  length() {
    return this.position;
  }

  value() {
    return this.buffer.slice(0, this.position);
  }

  toString(encoding) {
    return this.buffer.toString(encoding || 'base64');
  }

  toJSON() {
    return this.buffer.toString('base64');
  }
}

class Timestamp {
  constructor(low, high) {
    if (typeof low === 'bigint') {
      this.value = low;
    } else if (typeof low === 'object' && low !== null) {
      this.value = (BigInt(low.t || 0) << 32n) | BigInt(low.i || 0);
    } else {
      this.value = (BigInt(high || 0) << 32n) | BigInt(low || 0);
    }
  }

  getHighBits() {
    return Number(this.value >> 32n);
  }

  getLowBits() {
    return Number(this.value & 0xFFFFFFFFn);
  }

  toJSON() {
    return { t: this.getHighBits(), i: this.getLowBits() };
  }

  toString() {
    return `Timestamp(${this.getHighBits()}, ${this.getLowBits()})`;
  }
}

class MinKey {
  toJSON() {
    return { $minKey: 1 };
  }
}

class MaxKey {
  toJSON() {
    return { $maxKey: 1 };
  }
}

class Code {
  constructor(code, scope) {
    this.code = code;
    this.scope = scope || {};
  }

  toJSON() {
    return { $code: this.code, $scope: this.scope };
  }
}

class Double {
  constructor(value) {
    this.value = typeof value === 'number' ? value : parseFloat(value);
  }

  valueOf() {
    return this.value;
  }

  toJSON() {
    return this.value;
  }

  toString() {
    return this.value.toString();
  }

  equals(other) {
    if (other instanceof Double) return this.value === other.value;
    return this.value === Number(other);
  }

  [Symbol.for('nodejs.util.inspect.custom')]() {
    return `Double(${this.value})`;
  }
}

class Int32 {
  constructor(value) {
    this.value = typeof value === 'number' ? (value | 0) : (parseInt(value, 10) | 0);
  }

  valueOf() {
    return this.value;
  }

  toJSON() {
    return this.value;
  }

  toString() {
    return this.value.toString();
  }

  equals(other) {
    if (other instanceof Int32) return this.value === other.value;
    return this.value === (Number(other) | 0);
  }

  [Symbol.for('nodejs.util.inspect.custom')]() {
    return `Int32(${this.value})`;
  }
}

class UUID {
  constructor(input) {
    if (input instanceof UUID) {
      this._hex = input._hex;
    } else if (typeof input === 'string') {
      this._hex = input.replace(/-/g, '').toLowerCase();
      if (this._hex.length !== 32 || !/^[0-9a-f]{32}$/.test(this._hex)) {
        throw new Error(`Invalid UUID string: ${input}`);
      }
    } else if (Buffer.isBuffer(input)) {
      if (input.length !== 16) throw new Error('UUID buffer must be 16 bytes');
      this._hex = input.toString('hex');
    } else if (input == null) {
      this._hex = UUID.generate();
    } else {
      throw new Error('Invalid UUID input');
    }
  }

  static generate() {
    const bytes = require('crypto').randomBytes(16);
    // Set version 4
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    // Set variant 1
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    return bytes.toString('hex');
  }

  static isValid(input) {
    if (input instanceof UUID) return true;
    if (typeof input === 'string') {
      const hex = input.replace(/-/g, '');
      return hex.length === 32 && /^[0-9a-f]{32}$/i.test(hex);
    }
    if (Buffer.isBuffer(input)) return input.length === 16;
    return false;
  }

  toHexString(includeDashes) {
    if (includeDashes === false) return this._hex;
    const h = this._hex;
    return `${h.slice(0,8)}-${h.slice(8,12)}-${h.slice(12,16)}-${h.slice(16,20)}-${h.slice(20)}`;
  }

  toString() {
    return this.toHexString();
  }

  toJSON() {
    return this.toHexString();
  }

  toBuffer() {
    return Buffer.from(this._hex, 'hex');
  }

  toBinary() {
    return new Binary(this.toBuffer(), Binary.SUBTYPE_UUID);
  }

  equals(other) {
    if (other instanceof UUID) return this._hex === other._hex;
    if (typeof other === 'string') {
      return this._hex === other.replace(/-/g, '').toLowerCase();
    }
    return false;
  }

  [Symbol.for('nodejs.util.inspect.custom')]() {
    return `UUID("${this.toHexString()}")`;
  }
}

class DBRef {
  constructor(collection, oid, db, fields) {
    this.collection = collection;
    this.oid = oid;
    this.db = db || '';
    this.fields = fields || {};
  }

  get namespace() {
    return this.collection;
  }

  set namespace(value) {
    this.collection = value;
  }

  toJSON() {
    const result = { $ref: this.collection, $id: this.oid };
    if (this.db) result.$db = this.db;
    for (const [k, v] of Object.entries(this.fields)) {
      result[k] = v;
    }
    return result;
  }

  toString() {
    return `DBRef("${this.collection}", ${this.oid}${this.db ? `, "${this.db}"` : ''})`;
  }

  [Symbol.for('nodejs.util.inspect.custom')]() {
    return this.toString();
  }
}

class BSONRegExp {
  constructor(pattern, options) {
    this.pattern = pattern;
    this.options = options || '';
  }

  toRegExp() {
    return new RegExp(this.pattern, this.options);
  }
}

module.exports = {
  Long,
  Decimal128,
  Binary,
  Timestamp,
  MinKey,
  MaxKey,
  Code,
  BSONRegExp,
  Double,
  Int32,
  UUID,
  DBRef
};
