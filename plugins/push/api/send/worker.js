const {Worker, threadId, isMainThread, parentPort, workerData} = require('worker_threads'),
    {Duplex} = require('stream'),
    {FRAME, FRAME_NAME, encode, decode, frame_type, frame_length} = require('./proto'),
    Measurement = require('./measure'),
    { PushError } = require('./data/error'),
    logger = require('../../../../api/utils/log.js');

/**
 * Connection factory
 * @param {string} log logger name
 * @param {string} type type of connection: ap, at, id, ia, ip, ht, hp
 * @param {Creds} creds credentials
 * @param {Object[]} messages array of initial messages
 * @param {Object} options stream options
 * @returns {Object} connection instance for the type given
 */
function factory(log, type, creds, messages, options) {
    let { PLATFORM } = require('./platforms'),
        Constr = PLATFORM[type.substr(0, 1)].connection;
    if (!Constr) {
        throw new Error(`Invalid type ${type}`);
    }
    return new Constr(log, type, creds, messages, options);
}

if (isMainThread) {
    module.exports = class ConnectionWorker extends Duplex {
        /**
         * Starts a worker in a separate thread and controls its lifecycle while providing a few usablity features for Pool
         * 
         * @param {object} opts Options to pass to the worker
         */
        constructor(opts) {
            super({writableHighWaterMark: opts.options.bytes});
            this.id = opts.id;
            this.in = new Measurement();
            this.out = new Measurement();
            this.processing = 0;
            this.bytes = opts.options.bytes;
            this.worker = new Worker(__filename, {workerData: opts});
            this.worker.unref();
            this.log = logger(opts.log).sub(`wrk-m`);
            this.init = new Promise((res, rej) => {
                this.initRes = res;
                this.initRej = rej;
            });
            this.worker.on('message', m => {
                let frame = frame_type(m.buffer);
                this.log.d('IN message %s %d bytes', FRAME_NAME[frame], m.buffer.byteLength);
                if (frame & FRAME.CLOSE) {
                    let error = (frame & FRAME.ERROR) ? decode(m.buffer).payload : undefined;
                    if (this.closeCallback) {
                        clearTimeout(this.closeTimeout);
                        // this.end(this.close)
                        this.closeCallback(error);
                        this.closeCallback = undefined;
                    }
                    if (this.worker) {
                        this.destroy();
                        // this.worker.terminate().catch(this.log.e.bind(this.log, 'Error when terminating worker')).then(() => {
                        //     this.emit('push_done');
                        // });
                        // this.worker = undefined;
                    }
                }
                else if (frame & FRAME.CONNECT) {
                    if (frame & FRAME.SUCCESS) { // connected
                        this.connected = true;
                        if (this.initRes) {
                            this.initRes();
                            this.init = this.initRes = this.initRej = undefined;
                        }
                        else {
                            logger.w('Unexpected connection success frame');
                        }
                    }
                    else if (frame & FRAME.ERROR) { // connection error
                        let error = decode(m.buffer).payload;
                        this.connected = false;
                        if (this.initRej) {
                            this.initRej(error);
                            this.init = this.initRes = this.initRej = undefined;
                        }
                        if (!this.destroyed) {
                            this.destroy();
                        }
                    }
                }
                else if (frame & FRAME.RESULTS) {
                    let l = frame_length(m.buffer);
                    this.processing -= l;

                    if ((!frame & FRAME.ERROR)) {
                        this.out.inc(l);
                    }

                    this.push(m);
                }
                else if (frame === (FRAME.SEND | FRAME.ERROR)) {
                    this.emit('push_fail', decode(m.buffer).payload);
                }
                else if (frame & FRAME.CMD) {
                    this.push(m);
                }
                else {
                    this.log.e('Unsupported frame in worker main: %d', frame);
                }
            });
            this.worker.postMessage(encode(FRAME.CONNECT));
        }

        /**
         * How much notifications total can be processed by the worker
         */
        get capacity() {
            return this.bytes;
        }

        /**
         * How much more notifications this worker can accept
         */
        get free() {
            return Math.max(0, this.bytes - this.processing);
        }

        /**
         * Load of the worker where 0.0 is idle and 1.0 is fully loaded
         */
        get load() {
            return 1 - this.free / this.capacity;
        }

        // /**
        //  * This one is only used in single-thread case (when ConnectionWorker is not really a Worker, but a proxy to underlying Base subclass)
        //  * 
        //  * @param {Object[]|undefined} messages array if this is not a first call
        //  * @returns {Promise} Promise from connection
        //  */
        // connect(messages) {
        //     let frame = encode(FRAME.CONNECT, messages);
        //     return this.worker.postMessage(frame, [frame.buffer]);
        // }

        // /**
        //  * This one is only used in single-thread case (when ConnectionWorker is not really a Worker, but a proxy to underlying Base subclass)
        //  * 
        //  * @param {Object} data data to send ({_id, pr, o, n, ...})
        //  * @returns {Promise} Promise from connection
        //  */
        // send(data) {
        //     let frame = encode(FRAME.SEND, data);
        //     return this.worker.postMessage(frame, [frame.buffer]);
        // }


        /**
         * Empty since we push on each message from worker
         */
        _read() {
        }

        /**
         * Passes stream to the worker
         * 
         * @param {array} chunks Array of chunks
         * @param {function} callback called when the frame is fully processed
         */
        _writev(chunks, callback) {
            this.log.d('Writing %d chunks to the worker thread', chunks.length);
            this.log.f('i', log => {
                log('Load %s in %d/%d/%d out %d/%d/%d', this.load.toFixed(2), this.in.avg(5), this.in.avg(30), this.in.avg(60), this.out.avg(5), this.out.avg(30), this.out.avg(60));
            });
            chunks.forEach(chunk => {
                let c = chunk.chunk,
                    l = c.buffer.byteLength;
                if (frame_type(c.buffer) & FRAME.SEND) {
                    this.processing += l;
                    this.in.inc(l);
                }
                this.worker.postMessage(c, [c.buffer]);
            });
            this.log.d('Done writing %d chunks to the worker thread', chunks.length);
            callback(null);
        }

        /**
         * Gracefully shutdown the worker
         * 
         * @param {function} callback callback to call when done
         */
        _final(callback) {
            if (this.worker && this.connected) {
                this.closeCallback = (err) => {
                    clearTimeout(this.closeTimeout);
                    callback(err);
                };
                this.closeTimeout = setTimeout(() => {
                    if (!this.writableEnded) {
                        this.destroy();
                    }
                    callback();
                }, 10000); // close in 10 sec if it didn't close itself
                this.worker.postMessage(encode(FRAME.CLOSE));
            }
            else {
                callback();
            }
        }

        /**
         * Not that gracefully destroy the stream terminating the worker/connection along the way
         * 
         * @param {Error} error error if destroying because of error
         * @param {function} callback callback to call when done
         */
        _destroy(error, callback) {
            if (this.worker) {
                this.worker.terminate().then(() => {
                    this.worker = undefined;
                    this.emit('push_done');
                    callback(error);
                }, err => {
                    this.worker = undefined;
                    this.emit('push_done');
                    callback(err || error);
                });
                delete this.worker;
            }
            else {
                callback(error);
            }
        }
    };
    // module.exports = opts => {
    //     let worker = new Worker(__filename, {workerData: opts});
    //     worker.on('message', m => {
    //         let frame = frame_type(m.buffer);
    //         if (frame & FRAME.CLOSE) {
    //             worker.terminate().catch(logger.e.bind(logger));
    //         }
    //     });
    //     return worker;
    // };
}
else {
    let processing = 0;

    const {id: wrkid, log: logid, type, creds, messages, options} = workerData,
        id = `wrk-${wrkid}-w`,
        connection = factory(logid, type, creds, messages, options),
        log = logger(logid).sub(id),
        post = function(frame, payload, length = 0) {
            processing -= length;
            let arr = encode(frame, payload || {}, length);
            log.d('OUT message %s %d bytes (processing %d)', FRAME_NAME[arr[0]], arr.length, processing);
            parentPort.postMessage(arr);
        };

    connection.on('error', err => {
        log.w('error in worker %s', err);
        if (connection.closingForcefully) {
            post(FRAME.ERROR | FRAME.CLOSE, PushError.deserialize(err));
        }
        else {
            post(FRAME.ERROR, PushError.deserialize(err));
        }
    });

    connection.on('data', results => {
        if (results.frame & FRAME.CMD) { // Cmd
            post(results.frame, results.payload);
        }
        else if (results.p.type) { // PushError
            if (results.nonrecoverable) {
                post(FRAME.SEND | FRAME.ERROR, results.p, results.l); // non recoverable
            }
            else {
                post(FRAME.RESULTS | FRAME.ERROR, results.p, results.l); // recoverable SendError
            }
        }
        else {
            post(FRAME.RESULTS, results.p, results.l);
        }
    });

    connection.on('close', () => {
        if (connection.closingForcefully) {
            log.w('closed forcefully');
        }
        else {
            log.i('closed');
        }
        post(FRAME.CLOSE | (connection.closingForcefully ? FRAME.ERROR : FRAME.SUCCESS), connection.closingForcefully || {});
    });

    parentPort.on('message', arr => {
        log.d('IN message %s %d bytes', FRAME_NAME[arr[0]], arr.length);
        const data = decode(arr.buffer);
        if (data.frame === FRAME.CONNECT) {
            if (connection.connected) {
                if (data.payload && Array.isArray(data.payload)) {
                    data.payload.forEach(m => connection.message(m));
                }
            }
            else {
                connection.connect().then(() => {
                    if (data.payload && Array.isArray(data.payload)) {
                        data.payload.forEach(m => connection.message(m));
                    }
                    post(FRAME.SUCCESS | FRAME.CONNECT, {});
                }, err => {
                    post(FRAME.ERROR | FRAME.CONNECT, err);
                });
            }
        }
        else if (data.frame === FRAME.SEND) {
            processing += data.length;
            log.d('sending %d, processing %d', data.length, processing);
            connection.write(data, err => {
                if (err) {
                    log.e('failed to write to connection', err);
                    if (!(err instanceof PushError)) { // PushError is handled differently, as FRAME.SEND | FRAME.ERROR packet
                        post(FRAME.ERROR, err);
                    }
                }
            });
        }
        else if (data.frame === FRAME.CLOSE) {
            if (connection.writable) {
                if (data.payload.force) {
                    log.w('closing forcefully');
                    connection.closingForcefully = true;
                    connection.destroy();
                }
                else {
                    log.i('closing');
                    connection.end();
                }
            }
            else {
                log.i('already closing');
            }
        }
        else if (data.frame & FRAME.CMD) {
            connection.write(data, err => {
                if (err) {
                    log.e('failed to write to connection', err);
                    if (!(err instanceof PushError)) { // PushError is handled differently, as FRAME.SEND | FRAME.ERROR packet
                        post(FRAME.ERROR, err);
                    }
                }
            });
        }
    });

    log.i('Started');
}
