const { Transform } = require('stream');

/**
 * Transform which only closes once syn frame is received 
 */
class DoFlush extends Transform {

    /**
     * Constructor
     * 
     * @param {object} opts transform options
     */
    constructor(opts) {
        super(opts);
    }

    /**
     * A method to be overridden
     * @param {function} callback flush callback
     */
    do_flush(/*callback*/) {
        throw new Error('Must be overridden');
    }

    /**
     * Flush the stream delegating the job to do_flush() method
     * 
     * @param {function} callback flush callback
     */
    _flush(callback) {
        this.log.d('flushing');
        this.do_flush(err => {
            if (err) {
                this.log.w('flush error', err);
            }
            else {
                this.log.d('flushed successfully');
            }
            callback(err);
        });
    }
}

module.exports = { DoFlush };