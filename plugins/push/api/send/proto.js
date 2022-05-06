/**
 * Protocol of encoding push data into binary form
 */

const { TextDecoder, TextEncoder } = require('util');

/* global BigInt */

// const std = {o: null, t: "df_OCowGSp-xLnbdqM1xLd:APA91bFZzdItrP2ia7jGk41Q0LxAev7p6lvq4NhFR0NKWw0_Az9yfjbGyKGggJ-22E650MYQEA8rPAKlDdcIjz5n5fwz8ap7mizWqnLhBV1qR3qyG_OkuKxRoOe7xB7OA-Eb-JLP4r0V", n: "5fbb9360b758", d: 1606129072150};
// const pers = {o: {'custom.data': 'Some string'}, t: "df_OCowGSp-xLnbdqM1xLd:APA91bFZzdItrP2ia7jGk41Q0LxAev7p6lvq4NhFR0NKWw0_Az9yfjbGyKGggJ-22E650MYQEA8rPAKlDdcIjz5n5fwz8ap7mizWqnLhBV1qR3qyG_OkuKxRoOe7xB7OA-Eb-JLP4r0V", n: "5fbb960b7358", d: 1606129072150};
// const data = Array.from(new Array(1000)).map(() => Math.random() > .3 ? std : pers);
const {PushError} = require('./data/error'),
    enc = new TextEncoder(),
    dec = new TextDecoder();

const FRAME = {
    ERROR: 1 << 0, // 1, {error: string} in payload
    SUCCESS: 1 << 1, // 2 success for previous frame
    CONNECT: 1 << 2, // 4 try connecting and return status
    SEND: 1 << 3, // 8 [{n, d, t}, {n, d, t, o}, ...] array of recipient objects to send to 
    RESULTS: 1 << 4, // 16 [[id, 200], [id, -200], [id, -200, new token], [id, 500, null, error string]] results array
    CMD: 1 << 5, // 64 marker for service frames (below)
    END: 1 << 6 | 1 << 5, // 32 close connection after processing the queue and return success/error, {force} in payload makes connection ignore the rest of queue
    FLUSH: 1 << 7 | 1 << 5, // 192 flush following streams
};

const FRAME_NAME = {
    [FRAME.CONNECT]: 'CONNECT',
    [FRAME.CONNECT | FRAME.SUCCESS]: 'CONNECT|SUCCESS',
    [FRAME.CONNECT | FRAME.ERROR]: 'CONNECT|ERROR',

    [FRAME.SEND]: 'SEND',
    [FRAME.SEND | FRAME.ERROR]: 'SEND|ERROR',
    [FRAME.RESULTS]: 'RESULTS',
    [FRAME.RESULTS | FRAME.ERROR]: 'RESULTS|ERROR',
    [FRAME.ERROR]: 'ERROR',

    [FRAME.END]: 'END',
    [FRAME.END | FRAME.SUCCESS]: 'END|SUCCESS',
    [FRAME.END | FRAME.ERROR]: 'END|SUCCESS',

    [FRAME.FLUSH]: 'FLUSH',
    [FRAME.END]: 'END',
};

const encode = function(frame, payload = {}, length = 0) {
    if (frame & FRAME.CMD) {
        let array = new Uint8Array(1 + 8),
            view = new DataView(array.buffer);
        view.setUint8(0, frame);
        view.setFloat64(1, payload);
        return array;
    }
    else {
        // making it strictly require PushError instances for error frames, otherwise it'd crash
        let json = enc.encode(JSON.stringify((frame & FRAME.ERROR) ? payload.serialize() : payload, (key, value) => {
                return key === 'h' && typeof value === 'bigint' ? value.toString() : value;
            })),
            array = new Uint8Array(json.length + 1 + 4),
            view = new DataView(array.buffer);
        view.setUint8(0, frame);
        view.setUint32(1, length || ((frame & FRAME.ERROR) ? payload.bytes() : json.length));
        array.set(json, 5);
        return array;
    }
};

const frame_type = function(buffer) {
    return new DataView(buffer).getUint8(0);
};

const frame_length = function(buffer) {
    return new DataView(buffer).getUint32(1);
};

const decode = function(buffer) {
    let view = new DataView(buffer),
        frame = view.getUint8(0),
        length = view.getUint32(1),
        payload;

    if (frame & FRAME.CMD) {
        payload = view.getFloat64(1);
        length = 0;
    }
    else {
        payload = buffer.byteLength > 5 ? JSON.parse(dec.decode(new DataView(buffer, 5, buffer.byteLength - 5)), (key, value) => {
            try {
                return key === 'h' && typeof value === 'string' ? BigInt(value) : value;
            }
            catch (_ignored) {
                return value;
            }
        }) : undefined;

        if (payload && (frame & FRAME.ERROR)) {
            payload = PushError.deserialize(payload);
        }
    }

    return {frame, length, payload};
};

module.exports = {FRAME, FRAME_NAME, encode, frame_type, frame_length, decode};


// /**
//  * JSON encoding test
//  */
// function test_json() {
//     let start = Date.now(),
//         mid = start;
//     // console.log('test_json %d bytes', JSON.stringify(data).length + 12 * data.length);
//     for (let i = 0; i < 100000; i++) {
//         let str = enc.encode(JSON.stringify(Math.random() > .3 ? std : pers));
//         str = JSON.parse(dec.decode(str));
//         if (str && i % 10000 === 0) {
//             console.log('test_json: %d', Date.now() - mid);
//             mid = Date.now();
//         }
//     }
//     console.log('test_json total:', Date.now() - start);
// }


// /**
//  * native encoding test
//  */
// function test_native() {
//     let start = Date.now(),
//         mid = start;
//     // console.log('test_native %d bytes', encode_array(data).length);
//     for (let i = 0; i < 100000; i++) {
//         let arr = encode(Math.random() > .3 ? std : pers);
//         arr = decode(arr);
//         if (arr && i % 10000 === 0) {
//             console.log('test_native: %d', Date.now() - mid);
//             mid = Date.now();
//         }
//     }
//     console.log('test_native total:', Date.now() - start);
// }

// /**
//  * E
//  * @param {object} frame object to endode
//  * @returns {Uint8Array} resulting array
//  */
// function encode(frame) {
//     let [str, len] = length(frame),
//         buf = new ArrayBuffer(len),
//         arr = new Uint8Array(buf),
//         view = new DataView(buf),
//         o = frame.o ? enc.encode(str) : undefined,
//         t = enc.encode(frame.t),
//         n = enc.encode(frame.n);
//     view.setUint8(0, 1);
//     arr.set(n, 1);
//     view.setFloat64(13, frame.d);
//     view.setUint16(21, t.length);
//     arr.set(t, 23);
//     view.setUint16(23 + t.length, o ? o.length : 0);
//     if (o) {
//         arr.set(o, 23 + t.length + 2);
//     }
//     return arr;
// }
// /**
//  * E
//  * @param {array} frames array of frames to encode
//  * @returns {Uint8Array} resulting array
//  */
// function encode_array(frames) {
//     frames = frames.map(encode);

//     let len = frames.map(f => f.byteLength).reduce((a, b) => a + b, 0);
//     if (len) {
//         let buf = new ArrayBuffer(len),
//             arr = new Uint8Array(buf),
//             p = 0;
//         frames.forEach(fr => {
//             arr.set(fr, p);
//             p += fr.length;
//         });
//         return arr;
//     }
// }

// /**
//  * E
//  * @param {Uint8Array} arr array to decode
//  * @param {number} p array index to start from
//  * @returns {object} decoded frame
//  */
// function decode(arr, p = 0) {
//     let view = new DataView(arr.buffer),
//         typ = view.getUint8(p),
//         ret = {};

//     if (typ === 1) {
//         ret.n = dec.decode(new DataView(arr.buffer, p + 1, 12));
//         ret.d = view.getFloat64(p + 13);
//         let len = view.getUint16(p + 21);
//         ret.t = dec.decode(arr.buffer.slice(p + 23, p + 23 + len));
//         let o = view.getUint16(p + 23 + len);
//         if (o) {
//             ret.o = JSON.parse(dec.decode(new DataView(arr.buffer, p + 23 + len + 2, o)));
//         }
//         p = p + 23 + len + 2 + o;
//         return [ret, p];
//     }
// }

// /**
//  * E
//  * @param {Uint8Array} arr array to decode
//  * @param {number} p array index to start from
//  * @returns {array} decoded frames
//  */
// function decode_array(arr, p = 0) {
//     let frames = [];
//     while (p < arr.length) {
//         let [frame, np] = decode(arr, p);
//         frames.push(frame);
//         p = np;
//     }
//     return frames;
// }

// /**
//  * Len
//  * @param {object} frame object to endode
//  * @returns {number} frame length
//  */
// function length(frame) {
//     let str = frame.o ? JSON.stringify(frame.o) : undefined;
//     return [str, 1 // frame type
//         + 12 // n
//         + 8 // d
//         + 2 + frame.t.length // t
//         + 2 + (str ? str.length : 0)]; // o
// }

// // test_json();
// // test_native();

// // let arr = encode(pers);
// // arr = decode(arr);

// /**
//  * 
//  * @param {string} str asd
//  * @returns {Uint8Array} array
//  */
// function utfToUint(str) {
//     let res = [];
//     for (let i = 0; i < str.length; i++) {
//         let c = str.charCodeAt(i);
//         if (c === '') {
//             res.push(0);
//         }
//         else if (c < 0x80) {
//             res.push(c);
//         }
//         else if (c < 0x800) {
//             res.push(0xc0 | (c >> 6), 0x80 | (c & 0x3f));
//         }
//         else if (c < 0xd800 || c >= 0xe000) {
//             res.push(0xe0 | (c >> 12), 0x80 | ((c >> 6) & 0x3f), 0x80 | (c & 0x3f));
//         }
//         else {
//             c = 0x10000 + (((c & 0x3ff) << 10) | (c.charCodeAt(1) & 0x3ff));
//             res.push(0xf0 | (c >> 18), 0x80 | ((c >> 12) & 0x3f), 0x80 | ((c >> 6) & 0x3f), 0x80 | (c & 0x3f));
//         }
//     }
//     return Uint8Array.from(res);
// }

// /**
//  * 
//  * @param {asd} dv asd
//  * @param {asd} p asd
//  * @param {asd} single ads
//  * @returns {asd} asd
//  */
// function uintToUtf (dv, p = 0, single = false) {
//     let chars = [], read = 0;

//     while (p < dv.byteLength && (!single || (single && !chars.length))) {
//         let b = dv.getUint8(p++),
//             size = b >> 4;
//         if (b === 0) {
//             read += 1;
//             break;
//         }
//         else if (size >= 0 && size <= 7) {
//             chars.push(String.fromCharCode(b));
//             read += 1;
//         }
//         else if (size >= 12 && size <= 13) {
//             chars.push(String.fromCharCode(((b & 0x1F) << 6) | (dv.getUint8(p++) & 0x3F)));
//             read += 2;
//         }
//         else if (size === 14) {
//             chars.push(String.fromCharCode(((b & 0x0F) << 12) | ((dv.getUint8(p++) & 0x3F) << 6) | ((dv.getUint8(p++) & 0x3F) << 0)));
//             read += 3;
//         }
//         else {
//             throw new Error('Illegal UTF8 byte');
//         }
//     }
//     return chars.join('');
// }
