'use strict';

const { PushError, ERROR } = require('./error'),
    { toDate, Validatable } = require('./const');

/**
 * Message sending result
 */
class Result extends Validatable {
    /**
     * 
     * @param {object}                  data                delivery data
     * @param {number}                  data.total          total number of queued notifications
     * @param {number}                  data.processed      number of queued notifications processed
     * @param {number}                  data.sent           number of notifications accepted by service provider
     * @param {number}                  data.actioned       number of actions performed on devices for this message
     * @param {object|PushError}        data.error          message-global error object, message must be Stopped if error is set
     * @param {object}                  data.errors         non fatal platform-specific response counts ({i400+InvalidToken: 123, a400+WrongMessage: 501})
     * @param {object[]|PushError[]}    data.lastErrors     last 10 non fatal noteworthy errors (mostly connectivity)
     * @param {object[]}                data.lastRuns       last 10 sending runs
     * @param {Date}                    data.next           next run if any
     */
    constructor(data) {
        super(data);
        if (this._data.lastError) {
            this._data.lastError = PushError.deserialize(this._data.lastError);
        }
        if (this._data.lastErrors) {
            this._data.lastErrors = this._data.lastErrors.map(PushError.deserialize);
        }
    }

    /**
     * Validation scheme for common.validateArgs
     */
    static get scheme() {
        return {
            total: {type: 'Number', required: true},
            processed: {type: 'Number', required: true},
            sent: {type: 'Number', required: true},
            actioned: {type: 'Number', required: true},
            error: {type: 'Object', required: false},
            errors: {type: 'Object', required: false},
            lastErrors: {type: 'Object[]', required: false},
            lastRuns: {type: 'Object[]', required: false},
            next: {type: 'Date', required: false},
        };
    }

    /**
     * Getter for total
     * 
     * @returns {number|undefined} total number of queued notifications
     */
    get total() {
        return this._data.total || 0;
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
        return this._data.processed || 0;
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
        return this._data.sent || 0;
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
     * Getter for actioned
     * 
     * @returns {number|undefined} number of notifications accepted by service provider
     */
    get actioned() {
        return this._data.actioned || 0;
    }

    /**
     * Setter for actioned
     * 
     * @param {number|undefined} actioned number of notifications accepted by service provider
     */
    set actioned(actioned) {
        if (actioned !== null && actioned !== undefined) {
            this._data.actioned = actioned;
        }
        else {
            delete this._data.actioned;
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
     * Getter for lastErrors
     * 
     * @returns {PushError|undefined} any non fatal noteworthy errors (mostly connectivity)
     */
    get lastError() {
        return this._data.lastErrors ? this._data.lastErrors[this._data.lastErrors.length - 1] : undefined;
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
     * @param {string} code response code
     * @param {number} count number of errors to add
     * @returns {number} response count after addition
     */
    response(platform, code, count) {
        if (!this._data.errors) {
            this._data.errors = {};
        }
        if (!this._data.errors[platform]) {
            this._data.errors[platform] = {};
        }
        return this._data.errors[platform][code] = (this._data.errors[platform][code] || 0) + count;
    }

    /**
     * Returns count of all errors in errors
     * 
     * @returns {number} total number of errors in errors
     */
    get errorsCount() {
        let sum = 0;
        for (let p in this._data.errors) {
            // platform specific codes
            if (require('../platforms').platforms.indexOf(p) !== -1) {
                for (let code in this._data.errors[p]) {
                    sum += this._data.errors[p][code];
                }
            }
            else {
                // p is code, non platform specific codes
                sum += this._data.errors[p];
            }
        }
        return sum;
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
     * Backwards-compatibility conversion of Note to Result
     * 
     * @deprecated
     * @param {object} note Note object
     * @returns {Result} Result instance
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
        return new Result({
            total: note.result.total || (note.build && note.build.total || 0),
            processed: note.result.processed,
            sent: note.result.sent,
            actioned: note.result.actioned,
            error: lastErrors ? lastErrors[0] : undefined,
            lastErrors,
            errors,
        });
    }
}



module.exports = { Result };

