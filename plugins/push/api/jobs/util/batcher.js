const { PushError, ERROR } = require('../../send/data');
const { FRAME_NAME } = require('../../send/proto');
const { SynFlushTransform } = require('./syn'),
    { encode, FRAME, pools } = require('../../send');

/**
 * Transform which buffers up to size of records into an array of records
 */
class Batcher extends SynFlushTransform {
    /**
     * Constructor
     * 
     * @param {Log} log logger
     * @param {State} state State instance shared across streams
     * @param {int} size batch size
     */
    constructor(log, state, size) {
        super(log.sub('batcher'), {objectMode: true});
        this.log = log.sub('batcher');
        this.state = state;
        this.state.on('app', app => {
            this.ids[app._id] = {};

            let { PLATFORM } = require('../../send/platforms');
            for (let p in PLATFORM) {
                this.ids[app._id][p] = {};
                Object.values(PLATFORM[p].FIELDS).forEach(f => {
                    if (app.creds[p]) {
                        this.ids[app._id][p][f] = pools.id(app._id, p, f);
                        this.buffers[this.ids[app._id][p][f]] = [];
                    }
                });
            }
        });

        this.ids = {}; // {aid: {p: {f: id}}}
        this.buffers = {}; // {id: [push, push, ...]}
        this.listeners = {}; // {id: function}
        this.flushes = {}; // {flushid: [pool id, pool id, ...]}
        this.count = 0;
        this.size = size;
    }

    /**
     * Standard transform
     * 
     * @param {object} push push object
     * @param {string} encoding ignored
     * @param {function} callback callback
     */
    _transform(push, encoding, callback) {
        this.log.d('in batcher _transform', FRAME_NAME[push.frame], push._id);
        if (push.frame & FRAME.CMD) {
            if (push.frame & (FRAME.FLUSH | FRAME.SYN)) {
                this.do_flush(() => {
                    this.flushes[push.payload] = [];
                    this.log.d('in batcher _transform', FRAME_NAME[push.frame], push._id, 'sending to', Object.keys(this.listeners));
                    for (let id in this.listeners) {
                        pools.pools[id].write(encode(push.frame, push.payload));
                        this.flushes[push.payload].push(id);
                    }
                    callback();
                });
            }
            else {
                for (let id in this.listeners) {
                    pools.pools[id].write(encode(push.frame, push.payload));
                }
                callback();
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
        this.state.incSending(push.m);

        if (!this.listeners[id]) {
            // this.listeners[id] = true;
            // pools.pools[id].pipe(this);
            this.listeners[id] = result => {
                if (result.frame & FRAME.FLUSH) {
                    let pls = this.flushes[result.payload];
                    if (pls && pls.indexOf(id) !== -1) {
                        pls.splice(pls.indexOf(id), 1);
                        if (!pls.length) {
                            this.log.d('flush %d is done', result.payload);
                            this.push(result);
                            delete this.flushes[result.payload];
                        }
                    }
                }
                else {
                    this.push(result);
                }
            };
            pools.pools[id].on('data', this.listeners[id]);
        }

        if (this.count >= this.size) {
            this.log.d('flushing');
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
     */
    _flush(callback) {
        this.log.d('in batcher _flush');
        // this.do_flush(callback);
        this.do_flush(err => {
            if (err) {
                this.log.d('_flush err, callback', err);
                callback(err);
            }
            else {
                this.log.d('_flush ok, synIt');
                this.synIt(callback);
            }
        });
    }

    /**
     * Flush the leftover
     * 
     * @param {function} callback callback
     * @returns {boolean|undefined} true in case nothing has been written
     */
    do_flush(callback) {
        this.log.d('in batcher do_flush');
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
    _final(callback) {
        this.log.d('in batcher _final');
        if (this.count) {
            callback(new PushError('final with data left', ERROR.EXCEPTION));
            // this.log.d('final: flushing');
            // this.do_flush(err => {
            // for (let id in this.listeners) {
            //     pools.pools[id].unpipe(this);
            //     // pools.pools[id].off('data', this.listeners[id]);
            // }
            // this.listeners = {};
            // callback(err);
            // }, true);
        }
        else {
            this.log.d('final: nothing to flush');
            for (let id in this.listeners) {
                // pools.pools[id].unpipe(this);
                pools.pools[id].off('data', this.listeners[id]);
            }
            this.listeners = {};
            callback();
        }
    }
}

module.exports = { Batcher };