const { DoFlush } = require('./do_flush');

/**
 * Transform which only closes once syn frame is received 
 */
class DoFinish extends DoFlush {

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
     * 
     * @param {function} callback finish callback
     */
    do_final(/*callback*/) {
        throw new Error('Must be overridden');
    }

    /**
     * Finish the stream by flushing it and then delegating the finish job to do_final() method
     * 
     * @param {function} callback finish callback
     */
    _final(callback) {
        this.log.d('finishing');
        this.do_final(finishErr => {
            if (finishErr) {
                this.log.w('finish error', finishErr);
            }
            else {
                this.log.d('finished successfully');
            }
            callback(finishErr);
        });
    }
}

module.exports = { DoFinish };