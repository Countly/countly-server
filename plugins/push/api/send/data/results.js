'use strict';

const { PushError, ERROR } = require('./error'),
    { toDate, Jsonable } = require('./const');

/**
 * Message sending results
 */
class Results extends Jsonable {
    /**
     * 
     * @param {object}                  data                delivery data
     * @param {number}                  data.total          total number of queued notifications
     * @param {number}                  data.processed      number of queued notifications processed
     * @param {number}                  data.sent           number of notifications accepted by service provider
     * @param {obejct|PushError}        data.error          message-global error object, message must be Stopped if error is set
     * @param {obejct}                  data.errors         non fatal platform-specific response counts ({i400+InvalidToken: 123, a400+WrongMessage: 501})
     * @param {obejct[]|PushError[]}    data.lastErrors     last 10 non fatal noteworthy errors (mostly connectivity)
     * @param {object[]}                data.lastRuns       last 10 sending runs
     * @param {Date}                    data.next           next run if any
     */
    constructor(data) {
        super(data);
    }

    /**
     * Getter for total
     * 
     * @returns {number|undefined} total number of queued notifications
     */
    get total() {
        return this._data.total;
    }

    /**
     * Setter for total
     * 
     * @param {number|undefined} total total number of queued notifications
     */
    set total(total) {
        if (total !== null && total !== undefined) {
            this._data.total = total;
        }
        else {
            delete this._data.total;
        }
    }

    /**
     * Getter for processed
     * 
     * @returns {number|undefined} number of queued notifications processed
     */
    get processed() {
        return this._data.processed;
    }

    /**
     * Setter for processed
     * 
     * @param {number|undefined} processed number of queued notifications processed
     */
    set processed(processed) {
        if (processed !== null && processed !== undefined) {
            this._data.processed = processed;
        }
        else {
            delete this._data.processed;
        }
    }

    /**
     * Getter for sent
     * 
     * @returns {number|undefined} number of notifications accepted by service provider
     */
    get sent() {
        return this._data.sent;
    }

    /**
     * Setter for sent
     * 
     * @param {number|undefined} sent number of notifications accepted by service provider
     */
    set sent(sent) {
        if (sent !== null && sent !== undefined) {
            this._data.sent = sent;
        }
        else {
            delete this._data.sent;
        }
    }

    /**
     * Getter for error
     * 
     * @returns {PushError|undefined} message-global critical error object
     */
    get error() {
        return this._data.error;
    }

    /**
     * Setter for error
     * 
     * @param {PushError|undefined} error message-global critical error object
     */
    set error(error) {
        if (error instanceof PushError) {
            this._data.error = error;
        }
        else {
            delete this._data.error;
        }
    }

    /**
     * Getter for lastErrors
     * 
     * @returns {PushError[]|undefined} any non fatal noteworthy errors (mostly connectivity)
     */
    get lastErrors() {
        return this._data.lastErrors;
    }

    /**
     * Add an error to lastErrors
     * 
     * @param {PushError} error any non fatal noteworthy error (mostly connectivity)
     */
    pushError(error) {
        if (!this._data.lastErrors) {
            this._data.lastErrors = [];
        }
        while (this._data.lastErrors.length >= 10) {
            this._data.lastErrors.shift();
        }
        this._data.lastErrors.push(error);
    }

    /**
     * Getter for errors
     * 
     * @returns {object|undefined} errors object 
     */
    get errors() {
        return this._data.errors;
    }

    /**
     * Add a response to errors object
     * 
     * @param {string} platform platform key
     * @param {number} code response code
     * @param {string|undefined} error short error title without spaces (NOT ERROR MESSAGE!)
     * @param {number} count number of errors to add
     * @returns {number} response count after addition
     */
    response(platform, code, error, count) {
        let key = `${platform}${code}`;
        if (error) {
            key += `+${error}`;
        }
        if (!this.errors) {
            this.errors = {};
        }
        return this.errors[key] = this.errors[key] + count;
    }

    /**
     * Returns count of all errors in errors
     * 
     * @returns {number} total number of errors in errors
     */
    get errorsCount() {
        return Object.values(this._data.errors || {}).reduce((a, b) => a + b, 0);
    }

    /**
     * Getter for lastRuns
     * 
     * @returns {object[]|undefined} last 10 lastRuns array
     */
    get lastRuns() {
        return this._data.lastRuns;
    }

    /**
     * Add another run to lastRuns
     * 
     * @param {object} run the run to push
     */
    pushRun(run) {
        if (!this._data.lastRuns) {
            this._data.lastRuns = [];
        }
        while (this._data.lastRuns.length >= 10) {
            this._data.lastRuns.shift();
        }
        this._data.lastRuns.push(run);
    }

    /**
     * Getter for next
     * 
     * @returns {Date} next run if any
     */
    get next() {
        return this._data.next ? toDate(this._data.next) : undefined;
    }

    /**
     * Setter for next
     * 
     * @param {Date|number|undefined} next next run if any
     */
    set next(next) {
        if (next !== null && next !== undefined) {
            this._data.next = toDate(next);
        }
        else {
            delete this._data.next;
        }
    }

    /**
     * Backwards-compatibility conversion of Note to Results
     * 
     * @deprecated
     * @param {object} note Note object
     * @returns {Results} Results instance
     */
    static fromNote(note) {
        let lastErrors = undefined,
            errors = undefined;
        if (note.result.resourceErrors && note.result.resourceErrors.length) {
            lastErrors = note.result.resourceErrors.map(e => new PushError(e.error || 'Unknown error', ERROR.EXCEPTION, e.date || Date.now()));
        }
        if (note.result.error) {
            lastErrors = lastErrors || [];
            lastErrors.unshift(new PushError(note.result.error, ERROR.EXCEPTION, note.date.getTime()));
        }
        // eslint-disable-next-line no-unused-vars
        for (let _k in note.result.errorCodes) {
            errors = note.result.errorCodes;
            break;
        }
        return new Results({
            total: note.result.total || (note.build && note.build.total || 0),
            processed: note.result.processed,
            sent: note.result.sent,
            error: lastErrors ? lastErrors[0] : undefined,
            lastErrors,
            errors,
        });
    }
}



module.exports = { Results };

