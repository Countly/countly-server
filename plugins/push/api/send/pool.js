const Worker = require('./worker'),
    { Duplex } = require('stream'),
    { PushError, ERROR, Message } = require('./data'),
    { FRAME, encode, decode, frame_type, frame_length } = require('./proto'),
    log = require('../../../../api/utils/log.js')('push:send:pool');

/**
 * Connection pool responsible for load balancing worker threads
 */
class Pool extends Duplex {
    /**
     * Connection pool constructor
     * 
     * @param {string} id name of the pool
     * @param {string} type type of connection: ap, at, id, ia, ip, ht, hp
     * @param {Creds} creds credentials instance
     * @param {State} state state instance
     * @param {Object} cfg cfg object
     * @param {integer} cfg.pool.bytes how much bytes can be processed simultaniously by a single connection
     * @param {integer} cfg.pool.concurrency how much connections (workers) can be used in parallel within particular pool
     */
    constructor(id, type, creds, state, cfg) {
        super({
            // writableHighWaterMark: cfg.bytes * cfg.workers,
            readableObjectMode: true,
            writableHighWaterMark: cfg.pool.bytes,
            writableObjectMode: false,
        });
        this.platform = type.substr(0, 1);
        this.workers = cfg.pool.concurrency;
        this.bytes = cfg.pool.bytes;
        this.state = state;
        this.connections = []; // array of workers
        this.meta = []; // array of worker meta, index is the same as for connections
        this.processing = 0; // amount of push object bytes currently in processing by underlying workers
        this.next = 0;
        this.buffer = [];
        this.cmds = [];

        this.workerCounter = 0;
        this.id = id;
        this.log = log.sub(this.id);
        this.factory = () => new Worker({
            id: '' + ++this.workerCounter,
            log: this.log.id(),
            type,
            creds: creds.json,
            messages: this.state.messages(),
            meta: this.meta,
            cfg
        });

        this.state.on('message', message => {
            this.log.d('Sending new message %j', message.json);
            this.write(encode(FRAME.CONNECT, [message.json]));
        });

        this.log.i('initialized (%s)', creds.id);
        this.booting = true;
    }

    /**
     * Check validness of the credentials.
     * This method is one shot, the pool is not supposed to be used after the promise resolves.
     * 
     * @param {integer} timeout timeout in ms
     * @return {Promise} promise which resolves to a boolean indicating validness of the credentials 
     */
    validate(timeout = 10000) {
        let m = Message.test();
        this.state.setMessage(m);
        return this.grow(timeout).then(() => {
        // return this.processOnce([{_id: 0, n: m._id, d: m.triggers[0].start.getTime(), p: {la: 'en'}}], timeout).then(() => {
            this.destroy();
            return true;
        }, e => {
            if (e.isCredentials) {
                return false;
            }
            throw e;
        });
    }

    /**
     * Send notification once, close when done. 
     * This method is one shot, the pool is not supposed to be used after the promise resolves.
     * 
     * @param {Object[]} pushes array of push objects to send
     * @param {integer} timeout timeout in ms
     * @return {Promise} promise which resolves to array of results 
     */
    processOnce(pushes, timeout = 60000) {
        return this.grow().then(conn => {
            return new Promise(res => {
                let results = [], // plain results
                    errors = [], // errors (recoverable errors = SendError instances)
                    count = 0,
                    /**
                     * Done handler, destroys this pool. Promise resolves in 'destroy' handler below.
                     * 
                     * @param {PushError} fail failure if any
                     */
                    done = fail => {
                        if (!this.destroyed) {
                            if (fail) {
                                let result = {results: results.flat(), errors, fail: PushError.deserialize(fail)};
                                if (fail.hasLeft) {
                                    result.left = fail.left;
                                }
                                res(result);
                            }
                            else {
                                res({results: results.flat(), errors});
                            }
                            clearTimeout(tm);
                            this.destroy();
                        }
                    },
                    tm,
                    /**
                     * Rolling timeout
                     */
                    ping = () => {
                        clearTimeout(tm);
                        tm = setTimeout(() => done(new PushError('Timeout in Push Pool', ERROR.EXCEPTION)), timeout).unref();
                    };

                this.on('data', frame => {
                    ping();
                    if (frame.frame & FRAME.CMD) {
                        if (this.cmds[frame.payload]) {
                            this.log.d('cmd', frame.frame, '#', frame.payload, ':', this.cmds[frame.payload]);
                            this.cmds[frame.payload] = this.cmds[frame.payload].filter(id => id !== conn.id);
                            if (!this.cmds[frame.payload].length) {
                                this.log.d('cmd finished', frame);
                                delete this.cmds[frame.payload];
                                this.push(frame);
                            }
                        }
                    }
                    else if (frame.frame & FRAME.ERROR) {
                        this.log.d('recoverable error in processOnce', frame.payload);
                        errors.push(frame.payload);
                        count += frame.payload.length();
                        if (count === pushes.length) {
                            done();
                        }
                    }
                    else {
                        count += frame.payload.length;
                        results.push(frame.payload);
                        if (count === pushes.length) {
                            done();
                        }
                    }
                });
                conn.on('push_fail', error => {
                    this.log.e('push_fail in processOnce', error);
                    count += error.length();
                    done(error);
                });
                conn.on('push_done', error => {
                    if (error) {
                        this.log.e('push_done in processOnce', error);
                    }
                    else {
                        this.log.d('push_done in processOnce');
                    }
                    done(error ? PushError.deserialize(error) : undefined);
                });
                conn.on('error', error => {
                    this.log.e('error in processOnce', error);
                    done(PushError.deserialize(error));
                });
                // this.on('finish', error => {
                //     if (error) {
                //         this.log.e('error in finish', error);
                //         rej({done: results.flat(), error: PushError.deserialize(error)});
                //     }
                //     else {
                //         res({done: results.flat()});
                //     }
                //     this.destroy();
                // });

                // this.write(encode(FRAME.SEND, pushes));
                this.end(encode(FRAME.SEND, pushes));
            });
        });
    }

    // /**
    //  * Initializes the pool by opening first connection, called by Writable, that is this method is not supposed to be used directly.
    //  * 
    //  * @param {function} callback function called after fist connection is made
    //  */
    // _construct(callback) {
    //     this.grow().then(() => {
    //         this.booting = false;
    //         callback();
    //     }, err => {
    //         this.booting = false;
    //         callback(err);
    //     });
    // }

    /**
     * How much notifications total can be processed by the pool
     */
    get capacity() {
        return this.workers * this.bytes;
    }

    /**
     * How much notifications all our connections can accept
     */
    get free() {
        return this.connections ? this.connections.map(c => c.free).reduce((a, b) => a + b, 0) + Math.max(0, (this.workers - this.connections.length) * this.bytes) : 0;
    }

    /**
     * Load of the pool where 0.0 is idle and 1.0 is fully loaded
     */
    get load() {
        return 1 - this.free / this.capacity;
    }

    /**
     * Grow connection pool
     * @returns {Promise} with a stream
     */
    async grow() {
        this.log.i('growing from %d to %d', this.connections.length, this.connections.length + 1);
        let mids = this.state.messages().map(m => m._id.toString());
        let connection = this.factory();
        await connection.init;
        this.booting = false;
        connection.on('data', m => {
            this.log.d('data');
            let frame = decode(m.buffer);
            if (frame.frame & FRAME.CMD) {
                this.log.d('cmd', frame);
                if (this.cmds[frame.payload]) {
                    this.log.d('cmd', frame.frame, '#', frame.payload, ':', this.cmds[frame.payload]);
                    this.cmds[frame.payload] = this.cmds[frame.payload].filter(id => id !== connection.id);
                    if (!this.cmds[frame.payload].length) {
                        this.log.d('cmd finished', frame);
                        delete this.cmds[frame.payload];
                        this.push(frame);
                    }
                }
                return;
            }
            this.processing -= frame.length;
            // this.buffer.push(frame);
            this.push(frame);
            // let {frame, payload, length} = decode(m.buffer);
            // if (frame & FRAME.ERROR) {
            //     this.log.e('push_error in worker', payload);
            //     connection.emit('push_error', payload);
            // }
            // else {
            //     this.processing -= length;
            //     this.push(payload);
            // }
        });
        connection.on('error', data => {
            this.emit('worker_error', data);
        });
        // connection.on('push_error', error => {
        //     this.emit('push_error', error);
        // });
        connection.on('push_fail', error => {
            this.emit('push_fail', error);
            this.processing -= error.bytes();
            connection.destroy();
        });
        connection.on('push_done', () => {
            this.log.i('worker %s %s is done', this.id, connection.id);
            if (!this.destroyed) { // connections are reset to undefined on destroy
                let idx = this.connections.indexOf(connection);
                if (idx !== -1) {
                    this.connections.splice(idx, 1);
                    this.meta.splice(idx, 1);
                }
            }
        });
        this.meta.push({});
        this.connections.push(connection);
        let unsent = this.state.messages().filter(m => mids.indexOf(m._id.toString()) === -1);
        if (unsent.length) {
            this.log.i('Sending unsent messages to %s: %j', connection.worker.threadId, unsent);
            connection.write(encode(FRAME.CONNECT, unsent.map(id => this.state.messages().filter(m => m._id.toString() === id)[0])));
        }
        return connection;
    }

    /**
     * Shrink connection pool reporting any pending results back
     * @returns {Promise} which resolves in `false` if pool was empty
     */
    async shrink() {
        this.log.i('shrinking from %d to %d', this.connections.length, this.connections.length - 1);
        let connection = this.connections.pop();
        if (connection) {
            this.meta.pop();
            await new Promise((res, rej) => {
                connection.end(error => {
                    if (error) {
                        rej(error);
                    }
                    else {
                        res();
                    }
                });
            });
            return true;
        }
        return false;
    }

    /**
     * Convenience method to encode & send data to the underlying worker threads
     * 
     * @param {Object[]} data array of push objects
     */
    send(data) {
        this.write(encode(FRAME.SEND, data));
    }

    /**
     * Nothing here, we push from `grow()`
     */
    _read() {
        for (let i = 0; i < this.buffer.length; i++) {
            if (!this.push(this.buffer[i])) {
                this.buffer.splice(0, i);
                this.log.d('pushed %d out of %d', i + 1, this.buffer.length);
                return;
            }
        }
    }

    /**
     * Just a placeholder since we don't want to call `_writev` from setTimeout (disallowed by spec)
     * 
     * @param {array} chunks Array of chunks
     * @param {function} callback called when the frame is fully processed
     */
    _writev(chunks, callback) {
        this.do_writev_when_ready(chunks, callback);
    }

    /**
     * Spreads incoming data across connections, growing if needed
     * 
     * @param {array} chunks Array of chunks
     * @param {function} callback called when the frame is fully processed
     */
    do_writev_when_ready(chunks, callback) {
        if (this.booting) {
            setTimeout(this.do_writev_when_ready.bind(this, chunks, callback), 100);
        }
        else {
            this.log.i('writing %d chunks, load %s', chunks.length, this.load.toFixed(2));
            let chunksDone = 0,
                chunkCallback = function(err) {
                    if (err) {
                        chunksDone = -1;
                        callback(err);
                    }
                    else if (chunksDone >= 0) {
                        chunksDone++;
                        if (chunksDone === chunks.length) {
                            this.log.d('done writing %d chunks, load %s', chunks.length, this.load.toFixed(2));
                            callback();
                        }
                    }
                }.bind(this);

            for (let c = 0; c < chunks.length; c++) {
                let data = chunks[c].chunk,
                    type = frame_type(data.buffer);

                if (type === FRAME.CONNECT) {
                    this.log.d('sending messages %j', decode(data.buffer).payload.map(m => m._id));
                    let times = timesCallback(this.connections.length, chunkCallback);
                    this.connections.forEach(conn => {
                        let buf = Buffer.alloc(data.length);
                        data.copy(buf);
                        conn.write(buf, times);
                    });
                }
                else if (type === FRAME.SEND) {
                    let sent = false,
                        run = 1,
                        length = frame_length(data.buffer);
                    do {
                        let top = run / 4 * this.bytes; // passing to a connection with 1/4 load, then 2/4, etc

                        for (let i = 0; i < this.connections.length; i++) {
                            let conn = this.connections[i];
                            if (conn.processing < top) {
                                this.processing += length;
                                conn.write(data, chunkCallback);
                                sent = true;
                                break;
                            }
                        }
                    } while (!sent && run++ <= 4);

                    if (!sent) {
                        if (this.connections.length < this.workers) {
                            this.grow().then(conn => {
                                this.processing += length;
                                conn.write(data, chunkCallback);
                            }, chunkCallback);
                        }
                        else {
                            let conn = this.connections[Math.floor(Math.random() * this.connections.length)];
                            this.processing += length;
                            conn.write(data, chunkCallback);
                        }
                    }
                }
                else if (type & FRAME.CMD) {
                    let cmdId = decode(data.buffer).payload,
                        cmdsNumber = this.connections.length,
                        /**
                         * Call chunkCallback when all connection writes are done
                         * 
                         * @param {Error} err error if any
                         */
                        cmdDone = err => {
                            cmdsNumber--;
                            if (err) {
                                cmdsNumber = -1;
                                chunkCallback(err);
                            }
                            else if (cmdsNumber === 0) {
                                chunkCallback();
                            }
                        };
                    this.cmds[cmdId] = [];
                    this.connections.forEach(conn => {
                        this.cmds[cmdId].push(conn.id);
                        let buf = Buffer.alloc(data.length);
                        data.copy(buf);
                        conn.write(buf, cmdDone);
                    });
                }
                else {
                    chunkCallback(new Error(`invalid frame "${type}"`));
                }
            }
        }
    }

    /**
     * Destructive closure of all underlying workers
     * 
     * @param {Error} error optional error
     * @param {function} callback callback to call once done destroying
     */
    _destroy(error, callback) {
        if (error) {
            this.log.e('destroy', error);
        }
        else {
            this.log.d('destroy');
        }
        Promise.all(this.connections.map(c => c.destroy(error))).catch(e => {
            this.log.e('Error during worker destroy', e);
        }).then(() => {
            delete this.connections;
            delete this.state;
            callback();
            if (this.destroyDone) {
                this.destroyDone();
            }
        });
    }

    /**
     * Method mostly for tests which waits for stream destruction
     * 
     * @param {number} timeout timeout to resolve the promise
     * @returns {Promise} which resolves on stream destroy or on timeout of 10s
     */
    awaitDestory(timeout = 10000) {
        return new Promise(res => {
            setTimeout(res, timeout);
            this.destroyDone = res;
        });
    }

    // /**
    //  * Pushes results from outbox while trying to respsect `this.push()` result
    //  * @returns {number} approximate number of bytes written
    //  */
    //  do_push() {
    //     this.log.d('returning results (%d frames to return)', this.outbox.length);
    //     let len = 0;
    //     while (this.outbox.length && this.outboxFree) {
    //         let fr = this.outbox.shift();
    //         len += fr.data.results.length;
    //         if (!this.push(fr)) {
    //             this.log.d('done returning %d result frames (%d frames are still to return)', len, this.outbox.length);
    //             this.outboxFree = false;
    //             return len * 20;
    //         }
    //     }
    //     this.log.d('done returning %d result frames', len);
    //     return len * 20;
    // }



    // /**
    //  * Reads results from connections
    //  */
    // _read() {
    //     this.do_push();
    // }

    // /**
    //  * Pushes results from inbox to the connections while trying to respsect `Connection.push()` result & `Connection.free`
    //  * @param {callback} callback called when inbox is empty or all connections are busy
    //  */
    // asd(callback) {
    //     try {
    //         this.log.d('balancing %d frames', this.inbox.length);
    //         if (!this.connections.length) {
    //             this.log.d('no connections, growing');
    //             this.grow().then(this.balance.bind(this, callback), callback);
    //             return;
    //         }

    //         while (this.connections.length && this.inbox.length && this.capacity < 1) {
    //             let {id, token, tokens} = this.inbox.shift(),
    //                 recipients = tokens || [token],
    //                 message = this.messages.get(id),
    //                 pushed = 0;

    //             this.log.d('balancing next frame, %d frames left', this.inbox.length);

    //             for (let i = 0; i < this.connections.length; i++) {
    //                 let c = this.connections[i],
    //                     free = c.free;

    //                 if (free <= 0) {
    //                     this.log.d('balancing: connection %s is busy', c.id);
    //                     continue;
    //                 }

    //                 this.log.d('balancing to connection %s', c.id);
    //                 if (message.isPersonalized) {
    //                     let data;
    //                     do {
    //                         data = message.compile(this.platform, recipients[pushed++]);
    //                     } while (c.write({data: data, token: recipients[pushed++].t}));
    //                 }
    //                 else {
    //                     let pushin = Math.min(free, recipients.length - pushed);
    //                     c.write({data: message.compile(this.platform), tokens: recipients.slice(pushed, pushin)});
    //                     pushed += pushin;
    //                 }
    //                 this.log.d('balancing to connection %s: pushed %d', c.id, pushed);
    //             }

    //             if (pushed !== recipients.length) {
    //                 this.inbox.unshift(pushed === 0 ? {id, recipients} : {id, recipients: recipients.slice(pushed)});
    //             }
    //         }
    //         this.log.d('dome balancing, %d frames left', this.inbox.length);
    //         if (callback) {
    //             callback();
    //         }
    //     }
    //     catch (e) {
    //         this.log.e('Unhandled error during balancing: %s', e);
    //         callback(e);
    //     }
    // }

    // /**
    //  * Balances tasks between connections on round-robin basis, trying to respect stream limits
    //  * 
    //  * @param {string} id message id
    //  * @param {array} recipients array of token objects
    //  * @param {callback} callback called when inbox is empty or all connections are busy
    //  */
    // balance(id, recipients, callback) {
    //     try {
    //         let pushed = 0;

    //         while (recipients[pushed]) {
    //             if (!this.connections[this.next]) {
    //                 if (!this.free && this.concurrency < this.connections.length) {
    //                     this.log.d('no connections, growing');
    //                     recipients = pushed ? recipients.slice(pushed) : recipients;
    //                     this.grow().then(this.balance.bind(this, id, recipients, callback), callback);
    //                     return;
    //                 }
    //                 else {
    //                     this.next = 0;
    //                 }
    //             }

    //             if (!this.connections.length) {
    //                 this.log.d('no connections, growing');
    //                 recipients = pushed ? recipients.slice(pushed) : recipients;
    //                 this.grow().then(this.balance.bind(this, id, recipients, callback), callback);
    //                 return;
    //             }

    //             let message = this.messages.get(id),
    //                 conn = this.connections[this.next++],
    //                 free = conn.writableLength - conn.writableHighWaterMark;

    //             if (free > 0) {
    //                 if (message.isPersonalized) {
    //                     let data;
    //                     do {
    //                         data = message.compile(this.platform, recipients[pushed++]);
    //                     } while (conn.write({data: data, token: recipients[pushed++].t}));
    //                 }
    //                 else {
    //                     let pushin = Math.min(free, recipients.length - pushed);
    //                     conn.write({data: message.compile(this.platform), tokens: recipients.slice(pushed, pushin)});
    //                     pushed += pushin;
    //                 }

    //                 conn.write({data: data, token: recipients[pushed++].t});
    //             }

    //             this.next++;
    //         }
    //     }
    //     catch (e) {
    //         this.log.e('Caught exception during balancing: %s', e);
    //         callback(e);
    //     }
    // }
}

/**
 * Make a function which would call callback only after times calls
 * 
 * @param {int} times how many times the function should be called before calling callback
 * @param {function} callback callback to be called after times calls
 * @returns {function} the function
 */
function timesCallback(times, callback) {
    return function() {
        if (times !== null && times <= 1) {
            callback.apply(this, arguments);
            times = null;
        }
        else {
            times--;
        }
    };
}

// /**
//  * Make a function which would call callback only after times calls
//  * 
//  * @param {int} times how many times the function should be called before calling callback
//  * @param {function} callback callback to be called after times calls
//  * @returns {function} the function
//  */
// function timesOrErrCallback(times, callback) {
//     return function(err) {
//         if (err && times !== null) {
//             callback(err);
//             times = null;
//         }
//         if (!err && times !== null && --times <= 0) {
//             callback.apply(this, arguments);
//             times = null;
//         }
//     };
// }

module.exports = { Pool };