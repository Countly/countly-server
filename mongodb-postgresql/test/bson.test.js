'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert');
const { Long, Decimal128, Binary, Timestamp, MinKey, MaxKey, Code, BSONRegExp } = require('../lib/bson');

describe('Long', () => {
  it('should construct from a single number', () => {
    const l = new Long(42);
    assert.strictEqual(l.toNumber(), 42);
  });

  it('should construct from bigint', () => {
    const l = new Long(9007199254740993n);
    assert.strictEqual(l.value, 9007199254740993n);
  });

  it('should construct from low and high bits', () => {
    const l = new Long(0, 1);
    assert.strictEqual(l.value, 4294967296n);
  });

  it('fromNumber should create Long from number', () => {
    const l = Long.fromNumber(100);
    assert.strictEqual(l.toNumber(), 100);
  });

  it('fromNumber should truncate decimals', () => {
    const l = Long.fromNumber(42.7);
    assert.strictEqual(l.toNumber(), 42);
  });

  it('fromString should parse decimal string', () => {
    const l = Long.fromString('12345');
    assert.strictEqual(l.toNumber(), 12345);
  });

  it('fromString should parse with radix', () => {
    const l = Long.fromString('ff', 16);
    assert.strictEqual(l.toNumber(), 255);
  });

  it('toString should return decimal string by default', () => {
    const l = new Long(255);
    assert.strictEqual(l.toString(), '255');
  });

  it('toString should support radix', () => {
    const l = new Long(255);
    assert.strictEqual(l.toString(16), 'ff');
  });

  it('toJSON should return string representation', () => {
    const l = new Long(42);
    assert.strictEqual(l.toJSON(), '42');
  });

  it('equals should compare with another Long', () => {
    const a = new Long(42);
    const b = new Long(42);
    const c = new Long(43);
    assert.ok(a.equals(b));
    assert.ok(!a.equals(c));
  });

  it('equals should compare with number', () => {
    const l = new Long(42);
    assert.ok(l.equals(42));
  });

  it('valueOf should return bigint', () => {
    const l = new Long(42);
    assert.strictEqual(l.valueOf(), 42n);
  });
});

describe('Decimal128', () => {
  it('should construct from string', () => {
    const d = new Decimal128('3.14159');
    assert.strictEqual(d.toString(), '3.14159');
  });

  it('should construct from number', () => {
    const d = new Decimal128(3.14);
    assert.strictEqual(d.toString(), '3.14');
  });

  it('fromString should create Decimal128', () => {
    const d = Decimal128.fromString('1.23456789');
    assert.strictEqual(d.toString(), '1.23456789');
  });

  it('toJSON should return $numberDecimal format', () => {
    const d = new Decimal128('3.14');
    assert.deepStrictEqual(d.toJSON(), { $numberDecimal: '3.14' });
  });

  it('valueOf should return float', () => {
    const d = new Decimal128('3.14');
    assert.strictEqual(d.valueOf(), 3.14);
  });

  it('should handle special values', () => {
    const inf = new Decimal128('Infinity');
    assert.strictEqual(inf.toString(), 'Infinity');

    const nan = new Decimal128('NaN');
    assert.strictEqual(nan.toString(), 'NaN');
  });
});

describe('Binary', () => {
  it('should construct from Buffer', () => {
    const buf = Buffer.from([1, 2, 3]);
    const b = new Binary(buf);
    assert.ok(Buffer.isBuffer(b.buffer));
    assert.strictEqual(b.length(), 3);
    assert.strictEqual(b.subType, Binary.SUBTYPE_DEFAULT);
  });

  it('should construct with subtype', () => {
    const b = new Binary(Buffer.alloc(0), Binary.SUBTYPE_UUID);
    assert.strictEqual(b.subType, 4);
  });

  it('should construct from empty/null', () => {
    const b = new Binary(null);
    assert.strictEqual(b.length(), 0);
  });

  it('value should return the buffer content', () => {
    const buf = Buffer.from([0xDE, 0xAD]);
    const b = new Binary(buf);
    assert.ok(b.value().equals(buf));
  });

  it('toString should return base64 by default', () => {
    const buf = Buffer.from('hello');
    const b = new Binary(buf);
    assert.strictEqual(b.toString(), buf.toString('base64'));
  });

  it('toString should support encoding', () => {
    const buf = Buffer.from('hello');
    const b = new Binary(buf);
    assert.strictEqual(b.toString('utf8'), 'hello');
  });

  it('toJSON should return base64', () => {
    const buf = Buffer.from('test');
    const b = new Binary(buf);
    assert.strictEqual(b.toJSON(), buf.toString('base64'));
  });

  it('should have correct subtype constants', () => {
    assert.strictEqual(Binary.SUBTYPE_DEFAULT, 0);
    assert.strictEqual(Binary.SUBTYPE_FUNCTION, 1);
    assert.strictEqual(Binary.SUBTYPE_BYTE_ARRAY, 2);
    assert.strictEqual(Binary.SUBTYPE_UUID_OLD, 3);
    assert.strictEqual(Binary.SUBTYPE_UUID, 4);
    assert.strictEqual(Binary.SUBTYPE_MD5, 5);
    assert.strictEqual(Binary.SUBTYPE_USER_DEFINED, 128);
  });
});

describe('Timestamp', () => {
  it('should construct from low and high', () => {
    const ts = new Timestamp(1, 100);
    assert.strictEqual(ts.getLowBits(), 1);
    assert.strictEqual(ts.getHighBits(), 100);
  });

  it('should construct from bigint', () => {
    const ts = new Timestamp(429496729601n);
    assert.strictEqual(ts.getHighBits(), 100);
    assert.strictEqual(ts.getLowBits(), 1);
  });

  it('should construct from {t, i} object', () => {
    const ts = new Timestamp({ t: 1234567890, i: 1 });
    assert.strictEqual(ts.getHighBits(), 1234567890);
    assert.strictEqual(ts.getLowBits(), 1);
  });

  it('toJSON should return {t, i}', () => {
    const ts = new Timestamp({ t: 100, i: 5 });
    assert.deepStrictEqual(ts.toJSON(), { t: 100, i: 5 });
  });

  it('toString should return formatted string', () => {
    const ts = new Timestamp({ t: 100, i: 5 });
    assert.strictEqual(ts.toString(), 'Timestamp(100, 5)');
  });
});

describe('MinKey', () => {
  it('toJSON should return { $minKey: 1 }', () => {
    assert.deepStrictEqual(new MinKey().toJSON(), { $minKey: 1 });
  });
});

describe('MaxKey', () => {
  it('toJSON should return { $maxKey: 1 }', () => {
    assert.deepStrictEqual(new MaxKey().toJSON(), { $maxKey: 1 });
  });
});

describe('Code', () => {
  it('should store code string', () => {
    const c = new Code('function() { return 1; }');
    assert.strictEqual(c.code, 'function() { return 1; }');
    assert.deepStrictEqual(c.scope, {});
  });

  it('should store code with scope', () => {
    const c = new Code('return x + 1', { x: 10 });
    assert.strictEqual(c.code, 'return x + 1');
    assert.deepStrictEqual(c.scope, { x: 10 });
  });

  it('toJSON should return { $code, $scope }', () => {
    const c = new Code('return 1', { a: 2 });
    assert.deepStrictEqual(c.toJSON(), { $code: 'return 1', $scope: { a: 2 } });
  });
});

describe('BSONRegExp', () => {
  it('should store pattern and options', () => {
    const r = new BSONRegExp('^test', 'i');
    assert.strictEqual(r.pattern, '^test');
    assert.strictEqual(r.options, 'i');
  });

  it('should default options to empty string', () => {
    const r = new BSONRegExp('abc');
    assert.strictEqual(r.options, '');
  });

  it('toRegExp should return native RegExp', () => {
    const r = new BSONRegExp('^test', 'gi');
    const re = r.toRegExp();
    assert.ok(re instanceof RegExp);
    assert.strictEqual(re.source, '^test');
    assert.ok(re.global);
    assert.ok(re.ignoreCase);
  });
});
