const { PushError, ERROR } = require('../../send/data');
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
        if (push.frame & FRAME.CMD) {
            if (push.frame & (FRAME.FLUSH | FRAME.SYN)) {
                this.do_flush(() => {});
            }
            for (let id in this.listeners) {
                pools.pools[id].write(encode(push.frame, push.payload));
            }
            return;
        }

        let id = this.ids[push.a][push.p][push.f];
        this.buffers[id].push(push);
        this.count++;

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
        // this.do_flush(callback);
        this.do_flush(err => {
            if (err) {
                callback(err);
            }
            else {
                this.syn(callback);
            }
        });
    }

    /**
     * Flush the leftover
     * 
     * @param {function} callback callback
     */
    do_flush(callback) {
        let count = 0,
            something = false,
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
                something = true;
                count++;
                this.count -= this.buffers[id].length;

                if (!this.listeners[id]) {
                    // this.listeners[id] = true;
                    // pools.pools[id].pipe(this);
                    this.listeners[id] = result => {
                        this.push(result);
                    };
                    pools.pools[id].on('data', this.listeners[id]);
                }
                pools.pools[id].write(encode(FRAME.SEND, this.buffers[id]), cb);

                this.buffers[id] = [];
            }
        }

        if (!something) {
            callback();
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