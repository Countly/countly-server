const { PassThrough } = require('stream'),
    { dbext } = require('../../send/index'),
    log = require('../../../../../api/utils/log')('push:send:stream');

/**
 * Wrapper around Mongo stream which handles timeouts and resumes if possible.
 */
class StreamWrapper extends PassThrough {
    /**
     * Stream constructor
     * 
     * @param {Object} col mongo collection object
     * @param {number} sendAhead include notifications scheduled this far in the future
     * @param {number} timeout timeout to restart stream
     * @param {number} maxErrors maximum number of underlying stream errors including timeouts before ending the stream
     */
    constructor(col, sendAhead = 0, timeout = 10000, maxErrors = 10) {
        super({
            objectMode: true,
            emitClose: true
        });
        this.col = col;
        this.sendAhead = sendAhead;
        this.timeout = timeout;
        this.maxErrors = maxErrors;
        this.last = dbext.oidBlankWithDate(new Date(2000, 1, 1));
        this.lastEmited = Date.now();
        this.errors = 0;
        this.newStream();
    }

    /**
     * Start new stream
     * 
     * @returns {object} mongo stream
     */
    newStream() {
        let less = dbext.oidBlankWithDate(new Date(Date.now() + this.sendAhead)),
            stream = this.col.find({_id: {$lte: less, $gt: this.last}}).stream(),
            /** periodic function for checking for timeout */
            check = () => {
                if (this.lastEmited === null) {
                    log.i('stream closed, ignoring timeout');
                }
                else if (this.lastEmited < Date.now() - this.timeout) {
                    stream.unpipe(this);
                    stream.destroy();
                    this.errors++;

                    if (this.errors >= this.maxErrors) {
                        log.i('no data from stream since %s, ending', new Date(this.lastEmited));
                        this.emit('error', new Error(this.errors + 'th timeout'));
                        this.end();
                    }
                    else {
                        log.i('no data from stream since %s, restarting from %s (%s)', new Date(this.lastEmited), this.last, this.last.getTimestamp());
                        this.newStream();
                    }
                }
                else {
                    nextCheck = setTimeout(check, this.timeout / 10);
                }
            },
            nextCheck;

        log.d('streaming starting from %s (%s)', this.last, this.last.getTimestamp());

        let i = 0;
        stream.on('data', obj => {
            if (i % 1000 === 0) {
                log.d('%j', obj);
            }
            i++;
            this.last = obj._id;
            this.lastEmited = Date.now();
        });
        stream.on('end', () => {
            log.i('stream exhausted after %d records, ending', i);
            clearTimeout(nextCheck);
            this.push(null);
        });
        stream.on('close', () => {
            this.lastEmited = null;
            log.i('stream close');
        });
        stream.on('unpipe', () => {
            log.i('stream unpipe');
        });
        stream.on('error', err => {
            log.i('stream error', err);
            this.errors++;
            stream.unpipe(this);
            stream.destroy();

            if (this.errors >= this.maxErrors) {
                this.emit('error', err);
                this.end();
            }
            else {
                this.newStream();
            }
        });

        stream.pipe(this, {end: false});

        nextCheck = setTimeout(check.bind(this), 1000);

        return this.stream = stream;
    }
}


module.exports = { StreamWrapper };