const { Transform } = require('stream'),
    { FRAME, frame_type, encode, decode, FRAME_NAME } = require('../../send/proto'),
    { ERROR, PushError } = require('../../send/data/error');

/**
 * Transform which only closes itself after syn frame is received
 */
class SynFlushTransform extends Transform {
    /**
     * Constructor
     * 
     * @param {Log} log logger
     * @param {object} opts standard Transform options
     * @param {number} timeout timeout in ms
     */
    constructor(log, opts, timeout = 1000 * 60 * 5) {
        super(opts);
        this.log = log.sub('syn');
        this.syn = Math.ceil(Math.random() * Number.MAX_SAFE_INTEGER);
        this.TIMEOUT = timeout;

        this.listener = frame => {
            let flush, syn;
            if (this.readableObjectMode) {
                this.log.d('in obj syn', FRAME_NAME[frame.frame]);
                if (frame.flush) {
                    flush = true;
                }
                else if (frame.syn && frame.syn === this.syn) {
                    syn = true;
                }
            }
            else {
                let type = frame_type(frame);
                this.log.d('in syn', FRAME_NAME[type]);
                if (type & FRAME.FLUSH) {
                    flush = true;
                }
                else if ((type & FRAME.SYN) && decode(frame).payload === this.syn) {
                    syn = true;
                }
            }

            if (flush) {
                this.do_flush();
            }

            if (syn) {
                this.log.d('syn back');
                clearTimeout(this.synTimeout);
                this.synCallback && this.synCallback();
                delete this.synCallback;
                delete this.synTimeout;
                this.off('data', this.listener);
            }
            else if (this.synTimeout) {
                clearTimeout(this.synTimeout);
                this.synTimeout = setTimeout(this.synTimeoutCallback, this.TIMEOUT);
            }
        };
        this.synTimeoutCallback = () => {
            this.log.w('syn timeout');
            this.synCallback && this.synCallback(new PushError('Syn timeout', ERROR.EXCEPTION));
            delete this.synCallback;
            delete this.synTimeout;
            this.off('data', this.listener);
        };
    }

    /**
     * Send syn frame and start watching for it
     * 
     * @param {function} cb callback function with boolean argument marking syn time out
     */
    synIt(cb) {
        this.log.d('syn');
        if (this.writableObjectMode) {
            this.write({frame: FRAME.SYN, payload: this.syn, length: 0});
        }
        else {
            this.write(encode(FRAME.SYN, this.syn));
        }
        if (!this.synCallback) {
            this.on('data', this.listener);
            this.synCallback = cb;
        }
        this.synTimeout = setTimeout(this.synTimeoutCallback, this.TIMEOUT);
    }

    /**
     * Send syn and close once the syn is returned back
     */
    synAndDestroy() {
        this.synIt(error => this.destroy(error));
    }

    /**
     * Do the flushing in this method, it's needed for flushIt method
     * 
     * @param {function} callback flush callback
     */
    do_flush(/* callback */) {
        throw new PushError('Must be overridden', ERROR.EXCEPTION);
    }

    /**
     * Send syn and close once the syn is returned back
     * 
     * @returns {number} a numerical id of syn frame
     */
    flushIt() {
        this.log.d('flushIt');
        if (this.writableObjectMode) {
            this.write({frame: FRAME.FLUSH, payload: this.syn, length: 0});
        }
        else {
            this.write(encode(FRAME.FLUSH, this.syn));
        }
        this.flushed = this.syn;

        // if (!this.synCallback) {
        //     this.on('data', this.listener);
        //     this.synCallback = callback;
        // }
        // this.synTimeout = setTimeout(this.synTimeoutCallback, this.TIMEOUT);

        return this.syn;
    }
}

module.exports = { SynFlushTransform };