const { Duplex } = require('stream'),
    Measurement = require('./measure'),
    { XXHash64, XXHash32 } = require('xxhash-addon'),
    // { getHasher, OutputType, HashType, hashAsBigInt} = require('bigint-hash'),
    { ERROR, PushError, SendError, ConnectionError, ValidationError, Message} = require('./data'),
    { FRAME, FRAME_NAME } = require('./proto');
    // ,
    // log = require('../../../../api/utils/log.js')('push:send:base');

const xx64 = new XXHash64(),
    xx32 = new XXHash32();

/**
 * Waits for given time
 * @param {number} ms milliseconds to wait
 * @returns {Promise} resolves after ms
 */
async function wait(ms) {
    await new Promise(res => setTimeout(res, ms));
}

/**
 * Base stream class for push senders
 * 
 * Emits:
 * - push_error for recoverable errors (invalid content, try again, etc)
 * - push_fail for non recoverable errors (auth failed, connection reset, etc) which automatically close the stream
 */
class Base extends Duplex {
    /**
     * Standard constructor
     * 
     * @param {string} log logger name
     * @param {string} type type of connection: ap, at, id, ia, ip, ht, hp
     * @param {Creds} creds authorization key: server key for FCM/HW, P8/P12 for APN
     * @param {Object[]} messages initial array of messages to send
     * @param {Object} options standard stream options
     * @param {number} options.pool.pushes number of notifications which can be processed concurrently
     */
    constructor(log, type, creds, messages, options) {
        super({
            readableObjectMode: true,
            writableObjectMode: true,
            writableHighWaterMark: options.pool.pushes,
        });
        this.type = type;
        this.creds = creds;
        // this.id = `wrk-${type}-${hash(key.toString() + (secret || '').toString(16))}-${Date.now()}`;
        // this.log = log.sub(this.id);
        this.messages = {};
        this.sending = 0;
        this._options = options;
        messages.forEach(m => this.message(m));
        // this.log.i('initialized %s', type);
    }

    // /**
    //  * Initializes the connection by calling connect function & using default stream _construct method
    //  * 
    //  * @param {function} callback function called after fist connection is made
    //  */
    // _construct(callback) {
    //     // this.connect().then(() => callback(), e => {
    //     //     throw e;
    //     // });
    // }

    /**
     * Add message into local cache
     * 
     * @param {object} data Message data / Message instance
     */
    message(data) {
        if (this.log) {
            this.log.d('Received message %j', data);
        }
        if (data instanceof Message) {
            this.messages[data.id] = data;
        }
        else {
            this.messages[data._id] = new Message(data);
        }
        if (this.log) {
            this.log.d('Received message %s / %d', data.id, data.result.total);
        }
    }

    /**
     * Empty since we push on send() resolve
     */
    _read() {
    }

    /**
     * Forward incoming data to a corresponding platform stream logic (this.send)
     * 
     * @param {array} chunks Array of chunks
     * @param {function} callback called when all chunks are fully processed
     */
    _writev(chunks, callback) {
        this.log.d('Sending %d chunks', chunks.length);
        this.do_writev(chunks).then(() => {
            this.log.d('Sending %d chunks succeeded', chunks.length);
            callback();
        }, error => {
            this.log.e('Sending %d chunks errored', chunks.length, error);
            this.send_push_fail(PushError.deserialize(error));
            callback();
        });
        // Promise.all(chunks.map(chunk => {
        //     chunk = chunk.chunk;
        //     return this.send(chunk.payload, chunk.length);
        // })).then(() => callback(), callback);
    }

    /**
     * Async version of writeev
     * 
     * @param {array} chunks Array of chunks
     */
    async do_writev(chunks) {
        let i;
        chunks = chunks.map(c => c.chunk);
        try {
            for (i = 0; i < chunks.length; i++) {
                let {frame, payload, length} = chunks[i];
                this.log.d('do_writev %s (%d out of %d)', FRAME_NAME[frame], i, chunks.length);
                if (frame & FRAME.CMD) {
                    this.push(chunks[i]);
                }
                else {
                    await this.send(payload, length);
                }
                this.log.d('do_writev done %s (%d out of %d)', FRAME_NAME[frame], i, chunks.length);
            }
        }
        catch (err) {
            if (i < chunks.length - 1) {
                for (let x = i + 1; x < chunks.length; x++) {
                    if (chunks[x].frame & FRAME.CMD) {
                        this.push(chunks[i]);
                    }
                }
            }
        }
    }

    // /**
    //  * Transform's main method
    //  * 
    //  * @param {Object} data incoming data
    //  * @param {String} data.data message payload
    //  * @param {String} data.token - either push token
    //  * @param {String} data.tokens - or array of push tokens
    //  * @param {String} encoding encoding, ignored since it is an object stream
    //  * @param {function} callback callback
    //  */
    // _transform(data, encoding, callback) {
    //     this.sending += data.length;
    //     this.in.inc(data.length);

    //     this.log.d('transforming %d', data.length);

    //     this.send(data).then(() => {
    //         this.sending -= data.length;
    //         this.log.d('transformed %d', data.length);
    //         callback();
    //     }, err => {
    //         this.log.d('transform %d error %s', data.length, err);
    //         this.sending -= data.length;
    //         callback(err);
    //     });
    // }

    /**
     * Connection establishing abstract method
     */
    async connect() {
        throw new Error('Must be overridden');
    }

    /**
     * Sending abstract method
     * 
     * A few requirements:
     * - results must be buffered (don't do a result call per notification)
     * - recoverable errors (the ones which do not require immediate stream closure) must be returned using 
     * - reject only if error is non recoverable, the stream will be closed automatically after this method, no other calls are allowed after reject
     * 
     * @param {Object} data data to send ([{_id, pr, ov, n, ...}, ...])
     * @param {integer} start first element in data to send (optional)
     * @param {integer} len number of elements to send (optional)
     * @param {integer} bytes number of bytes in data
     */
    async send() {
        throw new Error('Must be overridden');
    }

    /**
     * Results processing function
     * 
     * @param {Array} results results array to process
     * @param {integer} length bytes processed (from send(_, bytes)) for these results
     */
    send_results(results, length) {
        this.push({p: results, l: length});
    }

    /**
     * Recoverable error processing function for using from send()
     * 
     * @param {SendError} error SendError instance
     */
    send_push_error(error) {
        this.push({p: error, l: error.affectedBytes});
    }

    /**
     * Non recoverable error processing function for using from send()
     * 
     * @param {ConnectionError | PushError} error error to send
     */
    send_push_fail(error) {
        this.push({p: error, l: (error.affectedBytes || 0) + (error.leftBytes || 0), nonrecoverable: true});
    }

    /**
     * Sending with retries utility method to be used from send(): 
     * - retry 3 times then fail with last error
     * - fail early if error is non-recoverable
     * 
     * A few requirements:
     * - results must be buffered (don't do a result call per notification)
     * - recoverable errors (the ones which do not require immediate stream closure) must be returned using send_push_error
     * - number & bytes of results must be exactly equal to number & bytes of incoming pushes; for recoverable errors affected & affectedBytes in SendError counts as a result
     * - reject only if error is non recoverable, the stream will be closed automatically after this method, no other calls are allowed after reject
     * 
     * @param {Object} data data to send ([{_id, pr, ov, n, ...}, ...])
     * @param {integer} bytes number of bytes in data
     * @param {function} fun function with single arguments (data, bytes, attempt 1..max)
     * @param {integer} max max number of attempts, 3 by default
     */
    async with_retries(data, bytes, fun, max = this._options.connection.retries || 3) {
        this.sending += bytes;
        let error;
        for (let attempt = 1; attempt <= max; attempt++) {
            try {
                let ret = await fun(data, bytes, attempt);
                this.sending -= bytes;
                return ret;
            }
            catch (e) {
                this.log.w('Retriable error %d of %d', attempt, max, e);
                if (!(e instanceof PushError)) {
                    throw e;
                }
                else if (e.isException) {
                    throw e;
                }
                else if (e.isCredentials) {
                    throw e;
                }
                // else if (e.hasAffected || e.hasLeft) {
                //     if (e.hasAffected) {
                //         this.send_push_error(e.affectedError());
                //         e.affected = [];
                //         e.affectedBytes = 0;
                //     }
                //     if (e.hasLeft) {
                //         data = e.left;
                //         bytes = e.leftBytes;
                //     }
                //     error = e;
                // }
                else {
                    error = e;
                }
            }
        }
        if (error) {
            this.sending -= bytes;
            throw error;
        }
    }

    /**
     * Restart sending of buffered notifications
     */
    tick() {
        if (this.buffered) {
            // do something
        }
    }

    /**
     * Wait for requests to finish and invoke the callback
     * 
     * @param {function} callback callback to call
     */
    drainAndCall(callback) {
        if (this.sending || this.readableLength) {
            this.log.d('.');
            setTimeout(this.drainAndCall.bind(this, callback), 1000);
        }
        else {
            callback();
        }
    }

    /**
     * Tear down the stream
     * 
     * @param {function} callback callback to call when done
     */
    _final(callback) {
        this.drainAndCall(callback);
    }
}

/**
 * Hash 
 * 
 * @param {any} data data to hash
 * @param {String} seed seed to start from
 * @returns {String} 64-bit hash hex string
 */
function hash(data, seed) {
    xx64.reset();
    if (seed) {
        xx64.update(Buffer.from(seed, 'hex'));
    }
    xx64.update(Buffer.from(JSON.stringify(data), 'utf-8'));
    return xx64.digest().toString('hex');
    // if (seed) {
    //     let bufhash = getHasher(HashType.xxHash64);
    //     bigintBuffer.writeBigUInt64BE(seed);
    //     bufhash.update(bigintBuffer);
    //     // eslint-disable-next-line no-unused-vars
    //     for (let _ignored in data) {
    //         bufhash.update(Buffer.from(JSON.stringify(data), 'utf-8'));
    //         return bufhash.digest(OutputType.BigInt);
    //     }
    //     return BigInt(0);
    // }
    // else {
    //     return hashAsBigInt(HashType.xxHash64, Buffer.from(JSON.stringify(data), 'utf-8'));
    // }
}

/**
 * Simple 32-bit hashing
 * 
 * @param {string} string string to hash
 * @returns {integer} 32 bit integer hash of the string, 0 if string is empty or no string is supplied
 */
function hashInt(string) {
    if (typeof string === 'string' && string) {
        xx32.reset();
        xx32.update(Buffer.from(string, 'utf-8'));
        return xx32.digest().readIntBE(0, 4);
    }
    return 0;
}


/** 
 * Flatten object using dot notation ({a: {b: 1}} becomes {'a.b': 1})
 * 
 * @param {object} ob - object to flatten
 * @returns {object} flattened object
 */
function flattenObject(ob) {
    var toReturn = {};

    for (var i in ob) {
        if (!Object.prototype.hasOwnProperty.call(ob, i)) {
            continue;
        }

        if ((typeof ob[i]) === 'object' && ob[i] !== null) {
            var flatObject = flattenObject(ob[i]);
            for (var x in flatObject) {
                if (!Object.prototype.hasOwnProperty.call(flatObject, x)) {
                    continue;
                }

                toReturn[i + '.' + x] = flatObject[x];
            }
        }
        else {
            toReturn[i] = ob[i];
        }
    }
    return toReturn;
}


module.exports = { Base, util: {hash, hashInt, wait, flattenObject}, Measurement, ERROR, PushError, SendError, ConnectionError, ValidationError };
