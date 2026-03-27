'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert');
const { ObjectId } = require('../lib/objectId');

describe('ObjectId', () => {
  describe('constructor', () => {
    it('should generate a new id when called with no arguments', () => {
      const id = new ObjectId();
      assert.strictEqual(typeof id._id, 'string');
      assert.strictEqual(id._id.length, 24);
      assert.ok(/^[0-9a-f]{24}$/.test(id._id));
    });

    it('should generate unique ids on each call', () => {
      const ids = new Set();
      for (let i = 0; i < 1000; i++) {
        ids.add(new ObjectId().toHexString());
      }
      assert.strictEqual(ids.size, 1000);
    });

    it('should accept a valid 24-char hex string', () => {
      const hex = '507f1f77bcf86cd799439011';
      const id = new ObjectId(hex);
      assert.strictEqual(id.toHexString(), hex);
    });

    it('should normalize uppercase hex to lowercase', () => {
      const hex = '507F1F77BCF86CD799439011';
      const id = new ObjectId(hex);
      assert.strictEqual(id.toHexString(), hex.toLowerCase());
    });

    it('should accept another ObjectId', () => {
      const original = new ObjectId();
      const copy = new ObjectId(original);
      assert.strictEqual(copy.toHexString(), original.toHexString());
    });

    it('should accept a 12-byte Buffer', () => {
      const buf = Buffer.alloc(12, 0xab);
      const id = new ObjectId(buf);
      assert.strictEqual(id.toHexString(), 'abababababababababababab');
    });

    it('should accept null and generate new id', () => {
      const id = new ObjectId(null);
      assert.strictEqual(id._id.length, 24);
    });

    it('should accept undefined and generate new id', () => {
      const id = new ObjectId(undefined);
      assert.strictEqual(id._id.length, 24);
    });

    it('should throw for invalid hex string (wrong length)', () => {
      assert.throws(() => new ObjectId('abc'), /must be a string of 24 hex characters/);
    });

    it('should throw for invalid hex string (non-hex chars)', () => {
      assert.throws(() => new ObjectId('zzzzzzzzzzzzzzzzzzzzzzzz'), /must be a string of 24 hex characters/);
    });

    it('should throw for number input', () => {
      assert.throws(() => new ObjectId(12345), /does not match the accepted types/);
    });

    it('should throw for boolean input', () => {
      assert.throws(() => new ObjectId(true), /does not match the accepted types/);
    });

    it('should throw for wrong-length Buffer', () => {
      assert.throws(() => new ObjectId(Buffer.alloc(5)), /does not match the accepted types/);
    });
  });

  describe('generate', () => {
    it('should return a 24-char hex string', () => {
      const hex = ObjectId.generate();
      assert.strictEqual(hex.length, 24);
      assert.ok(/^[0-9a-f]{24}$/.test(hex));
    });

    it('should embed the current timestamp', () => {
      const before = Math.floor(Date.now() / 1000);
      const hex = ObjectId.generate();
      const after = Math.floor(Date.now() / 1000);
      const ts = parseInt(hex.substring(0, 8), 16);
      assert.ok(ts >= before && ts <= after);
    });

    it('should embed a custom timestamp when provided', () => {
      const customTime = new Date('2020-01-01T00:00:00Z').getTime();
      const hex = ObjectId.generate(customTime);
      const ts = parseInt(hex.substring(0, 8), 16);
      assert.strictEqual(ts, Math.floor(customTime / 1000));
    });

    it('should increment the counter', () => {
      const hex1 = ObjectId.generate();
      const hex2 = ObjectId.generate();
      const counter1 = parseInt(hex1.substring(18), 16);
      const counter2 = parseInt(hex2.substring(18), 16);
      assert.strictEqual(counter2, (counter1 + 1) % 0xffffff);
    });
  });

  describe('static factory methods', () => {
    it('createFromHexString should create ObjectId from hex', () => {
      const hex = '507f1f77bcf86cd799439011';
      const id = ObjectId.createFromHexString(hex);
      assert.ok(id instanceof ObjectId);
      assert.strictEqual(id.toHexString(), hex);
    });

    it('createFromTime should embed the given time', () => {
      const time = new Date('2023-06-15T12:00:00Z').getTime();
      const id = ObjectId.createFromTime(time);
      const ts = id.getTimestamp();
      assert.strictEqual(ts.getTime(), Math.floor(time / 1000) * 1000);
    });

    it('createFromTime should zero-fill remaining bytes', () => {
      const id = ObjectId.createFromTime(0);
      assert.strictEqual(id.toHexString().substring(8), '0000000000000000');
    });
  });

  describe('isValid', () => {
    it('should return true for ObjectId instances', () => {
      assert.ok(ObjectId.isValid(new ObjectId()));
    });

    it('should return true for valid 24-char hex string', () => {
      assert.ok(ObjectId.isValid('507f1f77bcf86cd799439011'));
    });

    it('should return true for 12-byte Buffer', () => {
      assert.ok(ObjectId.isValid(Buffer.alloc(12)));
    });

    it('should return false for empty string', () => {
      assert.ok(!ObjectId.isValid(''));
    });

    it('should return false for short hex string', () => {
      assert.ok(!ObjectId.isValid('507f1f77'));
    });

    it('should return false for non-hex 24-char string', () => {
      assert.ok(!ObjectId.isValid('zzzzzzzzzzzzzzzzzzzzzzzz'));
    });

    it('should return false for number', () => {
      assert.ok(!ObjectId.isValid(12345));
    });

    it('should return false for null', () => {
      assert.ok(!ObjectId.isValid(null));
    });

    it('should return false for undefined', () => {
      assert.ok(!ObjectId.isValid(undefined));
    });

    it('should return false for wrong-length Buffer', () => {
      assert.ok(!ObjectId.isValid(Buffer.alloc(5)));
    });
  });

  describe('getTimestamp', () => {
    it('should return a Date close to now for new ObjectId', () => {
      const id = new ObjectId();
      const ts = id.getTimestamp();
      assert.ok(ts instanceof Date);
      assert.ok(Math.abs(ts.getTime() - Date.now()) < 2000);
    });

    it('should return correct time for known ObjectId', () => {
      // 507f1f77 in hex = 1350844279 in decimal -> Oct 21, 2012
      const id = new ObjectId('507f1f77bcf86cd799439011');
      const ts = id.getTimestamp();
      assert.strictEqual(ts.getFullYear(), 2012);
      assert.strictEqual(ts.getMonth(), 9); // October = 9
    });
  });

  describe('serialization', () => {
    it('toHexString should return lowercase hex', () => {
      const hex = '507f1f77bcf86cd799439011';
      const id = new ObjectId(hex);
      assert.strictEqual(id.toHexString(), hex);
    });

    it('toString should match toHexString', () => {
      const id = new ObjectId();
      assert.strictEqual(id.toString(), id.toHexString());
    });

    it('toJSON should match toHexString', () => {
      const id = new ObjectId();
      assert.strictEqual(id.toJSON(), id.toHexString());
    });

    it('should serialize correctly with JSON.stringify', () => {
      const id = new ObjectId('507f1f77bcf86cd799439011');
      assert.strictEqual(JSON.stringify(id), '"507f1f77bcf86cd799439011"');
    });

    it('custom inspect should show ObjectId("...")', () => {
      const id = new ObjectId('507f1f77bcf86cd799439011');
      const inspected = id[Symbol.for('nodejs.util.inspect.custom')]();
      assert.strictEqual(inspected, 'ObjectId("507f1f77bcf86cd799439011")');
    });
  });

  describe('equals', () => {
    it('should return true for identical ObjectIds', () => {
      const hex = '507f1f77bcf86cd799439011';
      assert.ok(new ObjectId(hex).equals(new ObjectId(hex)));
    });

    it('should return false for different ObjectIds', () => {
      assert.ok(!new ObjectId().equals(new ObjectId()));
    });

    it('should compare against hex string', () => {
      const hex = '507f1f77bcf86cd799439011';
      assert.ok(new ObjectId(hex).equals(hex));
    });

    it('should compare case-insensitively against string', () => {
      const hex = '507f1f77bcf86cd799439011';
      assert.ok(new ObjectId(hex).equals('507F1F77BCF86CD799439011'));
    });

    it('should return false for non-matching string', () => {
      assert.ok(!new ObjectId().equals('000000000000000000000000'));
    });

    it('should return false for invalid types', () => {
      assert.ok(!new ObjectId().equals(12345));
      assert.ok(!new ObjectId().equals(null));
    });
  });
});
