/* eslint-disable no-unused-vars */
const CRC32 = require('crc-32'),
    crc = require('node-crc'),
    MMHstream = require('murmurhash-native/stream'),
    {getHasher, OutputType, HashType, hashAsBigInt} = require('bigint-hash'),
    { XXHash64 } = require('xxhash-addon'),
    avro = require('avsc'),
    Type = require('js-binary').Type;

const numberBuf = Buffer.alloc(8);

const AvroType = avro.Type.forSchema({
    type: 'record',
    fields: [
        {name: 'a', type: 'int'},
        {
            name: 'b',
            type: [
                'null',
                {
                    type: 'record',
                    fields: [
                        {name: 'c', type: 'boolean'},
                        {name: 'some', type: 'string'},
                    ]
                }
            ]
        },
    ]
});

const JSBType = new Type({
    a: 'int',
    'b?': {
        c: 'boolean',
        some: 'string'
    },
});

/**
 * CRC32-based sort of optimized hasher for any data can be met in `p` (objects, arrays, numbers, bools, strings, nulls)
 * !NOTE! for undefined, null, empty object or empty array returns `seed` without any additional hashing, since for our needs that's preferred
 * 
 * @param {any} data data to hash
 * @param {int32} seed seed for recursion
 * @returns {int32} integer hash code
 */
function hash(data, seed = 0) {
    let t = typeof data;
    if (t === 'string') {
        return CRC32.str(data, seed);
    }
    else if (t === 'object') {
        if (!data) { // null
            return seed;
        }
        else if (Array.isArray(data)) {
            for (let i = data.length - 1; i >= 0; i--) {
                seed = hash(data[i], seed);
            }
        }
        else {
            for (let k in data) {
                seed = CRC32.str(k, seed);
                seed = hash(data[k], seed);
            }
        }
        return seed;
    }
    else if (t === 'number') {
        numberBuf.writeDoubleBE(data);
        return CRC32.buf(numberBuf, seed);
    }
    else if (t === 'boolean') {
        return CRC32.str(data ? '1' : '0', seed);
    }
    else if (t === 'undefined') {
        return seed;
    }
    else {
        return CRC32.str(JSON.stringify(data), seed);
    }
}


/**
 * CRC32-based sort of optimized hasher for any data can be met in `p` (objects, arrays, numbers, bools, strings, nulls)
 * !NOTE! for undefined, null, empty object or empty array returns `seed` without any additional hashing, since for our needs that's preferred
 * 
 * @param {any} data data to hash
 * @param {MMH} h seed for recursion
 * @returns {int32} integer hash code
 */
function hashmm(data, h = MMHstream.createHash('murmurHash128x64')) {
    let t = typeof data;
    if (t === 'string') {
        h.update(data);
        return h;
    }
    else if (t === 'object') {
        if (!data) { // null
            return h;
        }
        else if (Array.isArray(data)) {
            for (let i = data.length - 1; i >= 0; i--) {
                hashmm(data[i], h);
            }
        }
        else {
            for (let k in data) {
                h.update(k);
                hashmm(data[k], h);
            }
        }
        return h;
    }
    else if (t === 'number') {
        let buf = Buffer.alloc(8);
        buf.writeDoubleBE(data);
        h.update(buf);
        return h;
    }
    else if (t === 'boolean') {
        h.update(data ? '1' : '0');
        return h;
    }
    else if (t === 'undefined') {
        return h;
    }
    else {
        h.update(JSON.stringify(data));
        return h;
    }
}

/**
 * CRC32-based sort of optimized hasher for any data can be met in `p` (objects, arrays, numbers, bools, strings, nulls)
 * !NOTE! for undefined, null, empty object or empty array returns `seed` without any additional hashing, since for our needs that's preferred
 * 
 * @param {any} data data to hash
 * @param {MMH} h seed for recursion
 * @returns {int32} integer hash code
 */
function hashxx(data, h = getHasher(HashType.xxHash64)) {
    let t = typeof data;
    if (t === 'string') {
        h.update(data);
        return h;
    }
    else if (t === 'object') {
        if (!data) { // null
            return h;
        }
        else if (Array.isArray(data)) {
            for (let i = data.length - 1; i >= 0; i--) {
                hashxx(data[i], h);
            }
        }
        else {
            for (let k in data) {
                h.update(k);
                hashxx(data[k], h);
            }
        }
        return h;
    }
    else if (t === 'number') {
        let buf = Buffer.alloc(8);
        buf.writeDoubleBE(data);
        h.update(buf);
        return h;
    }
    else if (t === 'boolean') {
        h.update(data ? '1' : '0');
        return h;
    }
    else if (t === 'undefined') {
        return h;
    }
    else {
        h.update(JSON.stringify(data));
        return h;
    }
}

const xx3 = new XXHash64();
/**
 * CRC32-based sort of optimized hasher for any data can be met in `p` (objects, arrays, numbers, bools, strings, nulls)
 * !NOTE! for undefined, null, empty object or empty array returns `seed` without any additional hashing, since for our needs that's preferred
 * 
 * @param {any} data data to hash
 * @param {MMH} h seed for recursion
 * @returns {int32} integer hash code
 */
function hashxx3(data, h) {
    if (!h) {
        xx3.reset();
        h = xx3;
    }
    let t = typeof data;
    if (t === 'string') {
        h.update(Buffer.from(data, 'utf-8'));
        return h;
    }
    else if (t === 'object') {
        if (!data) { // null
            return h;
        }
        else if (Array.isArray(data)) {
            for (let i = data.length - 1; i >= 0; i--) {
                hashxx3(data[i], h);
            }
        }
        else {
            for (let k in data) {
                h.update(Buffer.from(k, 'utf-8'));
                hashxx3(data[k], h);
            }
        }
        return h;
    }
    else if (t === 'number') {
        let buf = Buffer.alloc(8);
        buf.writeDoubleBE(data);
        h.update(buf);
        return h;
    }
    else if (t === 'boolean') {
        h.update(data ? Buffer.from([0x01]) : Buffer.from([0x00]));
        return h;
    }
    else if (t === 'undefined') {
        return h;
    }
    else {
        h.update(Buffer.from(JSON.stringify(data), 'utf-8'));
        return h;
    }
}

/**
 * CRC32-based sort of optimized hasher for any data can be met in `p` (objects, arrays, numbers, bools, strings, nulls)
 * !NOTE! for undefined, null, empty object or empty array returns `seed` without any additional hashing, since for our needs that's preferred
 * 
 * @param {any} data data to hash
 * @param {MMH} h seed for recursion
 * @returns {int32} integer hash code
 */
function hashxx3json(data, h) {
    if (!h) {
        xx3.reset();
        h = xx3;
    }
    h.update(Buffer.from(JSON.stringify(data), 'utf-8'));
    return h;
}

let buffer = Buffer.alloc(4048);
/**
 * 
 * @param {any} data data
 * @returns {BigInt} hash of the data
 */
function databufxx3(data) {
    xx3.reset();
    let len = bufset(buffer, 0, data);
    xx3.update(buffer.slice(0, len));
    return xx3.digest();
}

/**
 * 
 * @param {any} data data
 * @returns {BigInt} hash of the data
 */
function databuf(data) {
    let bufhash = getHasher(HashType.xxHash64);
    let len = bufset(buffer, 0, data);
    bufhash.update(buffer.slice(0, len));
    return bufhash.digest(OutputType.BigInt);
}

/**
 * 
 * @param {any} data data
 * @returns {BigInt} hash of the data
 */
function databufsingle(data) {
    let len = bufset(buffer, 0, data);
    return hashAsBigInt(HashType.xxHash64, buffer.slice(0, len));
}

/**
 * 
 * @param {any} data data
 * @returns {BigInt} hash of the data
 */
function databufjson(data) {
    let bufhash = getHasher(HashType.xxHash64);
    bufhash.update(Buffer.from(JSON.stringify(data), 'utf-8'));
    return bufhash.digest(OutputType.BigInt);
}

// /**
//  * 
//  * @param {any} data data
//  * @returns {BigInt} hash of the data
//  */
// function databufjsonunbuf(data) {
//     let bufhash = getHasher(HashType.xxHash64);
//     let len = bson.serializeWithBufferAndIndex(data, buffer);
//     bufhash.update(buffer.slice(0, len + 1));
//     return bufhash.digest(OutputType.BigInt);
// }

/**
 * 
 * @param {any} data data
 * @returns {BigInt} hash of the data
 */
function databufavro(data) {
    let bufhash = getHasher(HashType.xxHash64);
    bufhash.update(AvroType.toBuffer(data));
    return bufhash.digest(OutputType.BigInt);
}

/**
 * 
 * @param {any} data data
 * @returns {BigInt} hash of the data
 */
function databufjsb(data) {
    let bufhash = getHasher(HashType.xxHash64);
    bufhash.update(JSBType.encode(data, buffer));
    return bufhash.digest(OutputType.BigInt);
}

/**
 * 
 * @param {any} data data
 * @returns {BigInt} hash of the data
 */
function databufcrc(data) {
    let len = bufset(buffer, 0, data);
    return crc.crc64jones(buffer.slice(0, len));
}

/**
 * Sets 
 * @param {Buffer} buf buffer to put data into
 * @param {number} offset start offset for the buffer
 * @param {any} data data
 * @returns {number} number of bytes written
 */
function bufset(buf, offset, data) {
    let t = typeof data,
        len = 0;
    if (t === 'string') {
        len += Buffer.from(data, 'utf-8').copy(buf, offset);
    }
    else if (t === 'object') {
        if (!data) { // null
            return;
        }
        else if (Array.isArray(data)) {
            for (let i = data.length - 1; i >= 0; i--) {
                len += bufset(buf, offset + len, data[i]);
            }
        }
        else {
            for (let k in data) {
                len += Buffer.from(k, 'utf-8').copy(buf, offset + len);
                bufset(buf, offset + len, data[k]);
            }
        }
    }
    else if (t === 'number') {
        let b = Buffer.alloc(8);
        b.writeDoubleBE(data);
        len += b.copy(buf, offset);
    }
    else if (t === 'boolean') {
        len += (data ? Buffer.from([0x01]) : Buffer.from([0x00])).copy(buf, offset);
    }
    else if (t === 'undefined') {
        return len;
    }
    else {
        len += Buffer.from(JSON.stringify(data), 'utf-8').copy(buf, offset);
    }
    return len;
}

/**
 * Measure 
 * 
 * @param {function} f function to measure
 * @param {string} message name of measurement
 * @param {number} n number of iterations in one run (10 runs)
 */
function measure(f, message, n = 10000) {
    let results = [];
    for (let i = 0; i < 10; i++) {
        let now = Date.now(),
            iter = n;
        while (iter--) {
            f();
        }
        results.push(Date.now() - now);
    }
    console.log(`${message}: ${results.reduce((a, b) => a + b, 0) / 10}ms per ${n} iterations`);
}

console.log('json', Buffer.from(JSON.stringify({a: 1, b: {c: false, some: "string"}}), 'utf-8').length);

console.log('avro', AvroType.toBuffer({a: 1, b: {c: false, some: "string"}}).length);
console.log('avro', AvroType.decode(AvroType.toBuffer({a: 1, b: {c: false, some: "string"}})));

// measure(() => hash(1), 'CRC32 for 1');
// measure(() => databuf(1), 'databuf/xx bigint for 1');
// measure(() => databufcrc(1), 'databuf/crc bigint for 1');
// measure(() => databufxx3(1), 'databufxx3 for 1');
// measure(() => databufjson(1), 'databufjson for 1');
// measure(() => databufjsonunbuf(1), 'databufjsonunbuf for 1');

// measure(() => hashmm(1).digest('hex'), 'Murmur for 1');
// measure(() => hashxx(1).digest(), 'XX buffer for 1');
// measure(() => hashxx(1).digest(OutputType.BigInt), 'XX bigint for 1');
// measure(() => hashxx3(1).digest(), 'XX3 for 1');
// measure(() => hashxx3json(1).digest(), 'XX3json for 1');

// measure(() => hash({a: 1}), 'CRC32 for {a: 1}');
measure(() => databuf({a: 1}), 'databuf/xx bigint for {a: 1}');
measure(() => databufsingle({a: 1}), 'databuf/xx/single bigint for {a: 1}');
// measure(() => databufcrc({a: 1}), 'databuf/crc bigint for {a: 1}');
// measure(() => databufxx3({a: 1}), 'databufxx3 bigint for {a: 1}');
measure(() => databufjson({a: 1}), 'databufjson bigint for {a: 1}');
// measure(() => databufjsonunbuf({a: 1}), 'databufjsonunbuf bigint for {a: 1}');
// measure(() => databufavro({a: 1}), 'databufavro bigint for {a: 1}');
measure(() => databufjsb({a: 1}), 'databufjsb bigint for {a: 1}');
measure(() => hashmm({a: 1}).digest('hex'), 'Murmur for {a: 1}');
measure(() => hashxx({a: 1}).digest(), 'XX buffer for {a: 1}');
measure(() => hashxx({a: 1}).digest(OutputType.BigInt), 'XX bigint for {a: 1}');
measure(() => hashxx({a: 1}).digest(), 'XX3 for {a: 1}');
measure(() => hashxx3json({a: 1}).digest(), 'XX3json for {a: 1}');

// measure(() => hash({a: 1, b: {c: false, some: "string"}}), 'CRC32 for {a: 1, b: {c: false, some: "string"}}');
measure(() => databuf({a: 1, b: {c: false, some: "string"}}), 'databuf/xx bigint for {a: 1, b: {c: false, some: "string"}}');
measure(() => databufsingle({a: 1, b: {c: false, some: "string"}}), 'databuf/xx/single bigint for {a: 1, b: {c: false, some: "string"}}');
// measure(() => databufcrc({a: 1, b: {c: false, some: "string"}}), 'databuf/crc bigint for {a: 1, b: {c: false, some: "string"}}');
// measure(() => databufxx3({a: 1, b: {c: false, some: "string"}}), 'databufxx3 for {a: 1, b: {c: false, some: "string"}}');
measure(() => databufjson({a: 1, b: {c: false, some: "string"}}), 'databufjson for {a: 1, b: {c: false, some: "string"}}');
// measure(() => databufjsonunbuf({a: 1, b: {c: false, some: "string"}}), 'databufjsonunbuf for {a: 1, b: {c: false, some: "string"}}');
measure(() => databufavro({a: 1, b: {c: false, some: "string"}}), 'databufavro for {a: 1, b: {c: false, some: "string"}}');
measure(() => databufjsb({a: 1, b: {c: false, some: "string"}}), 'databufjsb for {a: 1, b: {c: false, some: "string"}}');
measure(() => hashmm({a: 1, b: {c: false, some: "string"}}).digest('hex'), 'Murmur for {a: 1, b: {c: false, some: "string"}}');
measure(() => hashxx({a: 1, b: {c: false, some: "string"}}).digest(), 'XX buffer for {a: 1, b: {c: false, some: "string"}}');
measure(() => hashxx({a: 1, b: {c: false, some: "string"}}).digest(OutputType.BigInt), 'XX bigint for {a: 1, b: {c: false, some: "string"}}');
measure(() => hashxx({a: 1, b: {c: false, some: "string"}}).digest(), 'XX3 for {a: 1}');
measure(() => hashxx3json({a: 1, b: {c: false, some: "string"}}).digest(), 'XX3json for {a: 1}');
