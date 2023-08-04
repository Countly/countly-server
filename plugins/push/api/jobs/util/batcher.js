const { PushError, ERROR } = require('../../send/data');
const { FRAME_NAME } = require('../../send/proto');
const { DoFinish } = require('./do_finish'),
    { encode, FRAME, pools } = require('../../send');

/**
 * Sends multicast to multiple instances and waits for replies. Once all did reply, invokes callback.
 * 
 * @param {object} log logger instance
 * @param {int} frame frame type to send
 * @param {any} payload frame payload to send
 * @param {string[]} recipients array of recipient ids
 * @param {function} callback callback function
 * @param {int} time_out timeout in ms
 * @returns {object} multicast object with some control functions
 */
function multicast(log, frame, payload, recipients, callback, time_out = 300000) {
    let timeout = setTimeout(function() {
            log.e('multicast timeout %s', FRAME_NAME[frame]);
            for (let id in listeners) {
                if (id in pools.pools) {
                    pools.pools[id].off('data', listeners[id]);
                }
            }
            callback(new PushError('Failed to multicast in time', ERROR.EXCEPTION));
        }, time_out),
        listeners = {},
        anything = false;

    payload = payload || Math.random();

    for (let id of recipients) {
        pools.pools[id].on('data', listeners[id] = function(data) {
            if (data.frame === frame && data.payload === payload) {
                log.d('multicast reply %s from %s', FRAME_NAME[frame], id);
                let idx = recipients.indexOf(id);
                if (idx !== -1) {
                    recipients.splice(idx, 1);
                    if (id in pools.pools) {
                        pools.pools[id].off('data', listeners[id]);
                    }
                    delete listeners[id];
                }
                if (!recipients.length) {
                    log.d('multicast %s completed', FRAME_NAME[frame]);
                    clearTimeout(timeout);
                    callback();
                }
            }
        });
        pools.pools[id].write(encode(frame, payload));
        anything = true;
    }

    if (anything) {
        return function() {
            for (let id in listeners) {
                if (id in pools.pools) {
                    pools.pools[id].off('data', listeners[id]);
                }
            }
            clearTimeout(timeout);
        };
    }
    else {
        clearTimeout(timeout);
        callback();
        return function() {
            // do nothing
        };
    }

}
/**
 * Transform which buffers up to size of records into an array of records
 */
class Batcher extends DoFinish {
    /**
     * Constructor
     * 
     * @param {Log} log logger
     * @param {State} state State instance shared across streams
     */
    constructor(log, state) {
        super({objectMode: true});
        this.log = log.sub('batcher');
        this.state = state;
        this.state.on('app', app => {
            this.ids[app._id] = {};

            let { PLATFORM } = require('../../send/platforms');
            for (let p in PLATFORM) {
                if (!this.ids[app._id][p]) {
                    this.ids[app._id][p] = {};
                }
                Object.values(PLATFORM[p].FIELDS).forEach(f => {
                    if (app.creds[p]) {
                        if (!this.ids[app._id][p][f]) {
                            this.ids[app._id][p][f] = pools.id(app.creds[p].hash, p, f);
                        }
                        if (!this.buffers[this.ids[app._id][p][f]]) {
                            this.buffers[this.ids[app._id][p][f]] = [];
                        }
                    }
                });
            }
        });

        this.ids = {}; // {aid: {p: {f: id}}}
        this.buffers = {}; // {id: [push, push, ...]}
        this.listeners = {}; // {id: function}
        this.count = 0;
        this.size = state.cfg.pool.pushes;
    }

    /**
     * Standard transform
     * 
     * @param {object} push push object
     * @param {string} encoding ignored
     * @param {function} callback callback
     */
    _transform(push, encoding, callback) {
        // this.log.d('in batcher _transform', FRAME_NAME[push.frame], push._id);
        if (push.frame & FRAME.CMD) {
            if (push.frame === FRAME.FLUSH) {
                multicast(this.log, FRAME.FLUSH, push.payload, Object.keys(this.listeners), () => {
                    let nothing = this.do_flush(() => {
                        this.push(push);
                    });
                    if (nothing) {
                        this.push(push);
                    }
                    callback();
                });
            }
            else if (push.frame & FRAME.END) {
                callback(new PushError('END frame in batcher'));
            }
            else {
                callback(new PushError('Unsupported CMD frame in batcher'));
            }
            return;
        }
        else if (push.frame & FRAME.RESULTS) {
            this.push(push);
            callback();
            return;
        }

        let id = this.ids[push.a][push.p][push.f];
        this.buffers[id].push(push);
        this.count++;

        if (!this.listeners[id]) {
            // this.listeners[id] = true;
            // pools.pools[id].pipe(this);
            this.listeners[id] = result => {
                if (!(result.frame & FRAME.CMD)) {
                    this.push(result);
                }
            };
            pools.pools[id].on('data', this.listeners[id]);
        }

        if (this.count >= this.size) {
            this.log.d('flushing %d', this.size);
            this.do_flush(callback);
        }
        else {
            callback();
        }
        // if (this.count >= this.size) {
        //     this.log.d('flushing next batch of %d', this.buffers[id].length);

        //     let data = encode(FRAME.SEND, this.buffers[id]);
        //     this.count -= this.buffers[id].length;
        //     this.buffers[id] = [push];

        //     if (!this.listeners[id]) {
        //         this.listeners[id] = result => {
        //             this.push(result);
        //         };
        //         pools.pools[id].on('data', this.listeners[id]);
        //     }
        //     pools.pools[id].write(data, callback);
        // }
        // else {
        //     this.buffers[id].push(push);
        // }
        // callback();
    }

    /**
     * Flush the leftover
     * 
     * @param {function} callback callback
     * @returns {boolean|undefined} true in case nothing has been written
     */
    do_flush(callback) {
        let count = 0,
            anything = false,
            /**
             * Callback for each pool write
             * 
             * @param {Error} err error 
             */
            cb = err => {
                if (err) {
                    callback(err);
                }
                else if (count === 1) {
                    callback();
                }
                else {
                    count--;
                }
            };

        for (let id in this.buffers) {
            if (this.buffers[id].length) {
                anything = true;
                count++;
                this.count -= this.buffers[id].length;
                pools.pools[id].write(encode(FRAME.SEND, this.buffers[id]), cb);
                this.buffers[id] = [];
            }
        }

        if (!anything) {
            callback();
            return true;
        }
        else {
            this.log.d('flushed');
        }
    }

    /**
     * Unregistering listeners on stream closure
     * 
     * @param {function} callback callback
     */
    do_final(callback) {
        this.do_flush(flushErr => {
            let payload = Math.random();
            multicast(this.log, FRAME.END, payload, Object.keys(this.listeners), err => {
                for (let id in this.listeners) {
                    if (pools.pools[id]) {
                        pools.pools[id].off('data', this.listeners[id]);
                    }
                }
                this.listeners = {};
                this.push({frame: FRAME.END, payload});
                callback(flushErr || err);
            });
        });
        // this.finalPayload = Math.random();
        // this.finalLeft = Object.keys(this.listeners);
        // this.finalTimeout = setTimeout(() => {
        //     this.finalLeft = [];
        //     this.finalCallback(null, new PushError('Failed to end in time', ERROR.EXCEPTION));
        // }, 30000);
        // this.finalCallback = (id, err) => {
        //     if (id) {
        //         let idx = this.finalLeft.indexOf(id);
        //         if (idx !== -1) {
        //             this.finalLeft.splice(idx, 1);
        //         }
        //         pools.pools[id].off('data', this.listeners[id]);
        //         delete this.listeners[id];
        //     }
        //     if (!this.finalLeft.length) {
        //         clearTimeout(this.finalTimeout);
        //         delete this.finalPayload;
        //         delete this.finalLeft;
        //         delete this.finalTimeout;
        //         delete this.finalCallback;
        //         callback(err);
        //     }
        // };

        // for (let id in this.listeners) {
        //     pools.pools[id].write(encode(FRAME.END, this.finalPayload));
        // }

        // if (!this.finalLeft.length) {
        //     setImmediate(this.finalCallback.bind(this, null));
        // }
    }
}

module.exports = { Batcher };