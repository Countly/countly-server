'use strict';

const { PushError, ERROR } = require('./error'),
    { toDate, Validatable } = require('./const'),
    MAX_RUNS = 10,
    MAX_ERRORS = 10;

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
     * @param {string}                  data.virtual        wether this result is virtual (part of parent result which belongs to a sibling sub and not counted as individual sub)
     * @param {number}                  data.errored        number of errors happened during sending (not necessarily equal to total - processed)
     * @param {object|PushError}        data.error          message-global error object, message must be Stopped if error is set
     * @param {object}                  data.errors         non fatal platform-specific response counts ({i400+InvalidToken: 123, a400+WrongMessage: 501})
     * @param {object[]|PushError[]}    data.lastErrors     last 10 non fatal noteworthy errors (mostly connectivity)
     * @param {object[]}                data.lastRuns       last 10 sending runs
     * @param {Date}                    data.next           next run if any
     * @param {object}                  data.subs           sub results ({key: Result})
     */
    constructor(data) {
        super(data);
        if (this._data.lastError) {
            this._data.lastError = PushError.deserialize(this._data.lastError);
        }
        if (this._data.lastErrors) {
            this._data.lastErrors = this._data.lastErrors.map(PushError.deserialize);
        }

        if (this._data.subs) {
            let subs = this._data.subs;
            this._data.subs = {};
            Object.keys(subs || {}).forEach(key => this._data.subs[key] = Result.from(subs[key]));
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
            errored: {type: 'Number', required: false},
            virtual: {type: 'String', required: false},
            error: {type: 'String', required: false},
            errors: {type: 'Object', required: false},
            lastErrors: {type: 'Object[]', required: false},
            lastRuns: {type: 'Object[]', required: false},
            next: {type: 'Date', required: false},
            subs: {type: 'Object', required: false},
        };
    }

    /**
     * Getter for total
     * 
     * @returns {number} total number of queued notifications
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
     * @returns {number} number of notifications accepted by service provider
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
     * @returns {number} number of notifications accepted by service provider
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
     * Getter for errored
     * 
     * @returns {number} number of sending errors
     */
    get errored() {
        return this._data.errored || 0;
    }

    /**
     * Setter for errored
     * 
     * @param {number|undefined} errored number of sending errors
     */
    set errored(errored) {
        if (errored !== null && errored !== undefined) {
            this._data.errored = errored;
        }
        else {
            delete this._data.errored;
        }
    }

    /**
     * Getter for virtual
     * 
     * @returns {string|undefined} virtual key of sibling sub which this sub belongs to
     */
    get virtual() {
        return this._data.virtual;
    }

    /**
     * Setter for virtual
     * 
     * @param {string|undefined} virtual virtual key of sibling parent sub
     */
    set virtual(virtual) {
        if (virtual !== null && virtual !== undefined) {
            this._data.virtual = virtual;
        }
        else {
            delete this._data.virtual;
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
        while (this._data.lastErrors.length >= MAX_ERRORS) {
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
        if (!this._data.errors) {
            this._data.errors = {};
        }
        return this._data.errors;
    }

    /**
     * Add an error to errors object
     * 
     * @param {string} code response code
     * @param {number} count number of errors to add
     * @returns {number} response count after addition
     */
    recordError(code, count) {
        if (!this._data.errors) {
            this._data.errors = {};
        }
        this.errored++;
        return this._data.errors[code] = (this._data.errors[code] || 0) + count;
    }

    /**
     * Getter for last of lastRuns
     * 
     * @returns {object|undefined} last run object with start, processed, errored & end? keys
     */
    get lastRun() {
        return this._data.lastRuns && this._data.lastRuns[this._data.lastRuns.length - 1] || undefined;
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
     * @param {Date} date date of run start
     * @returns {object} run object with start, processed & errored props
     */
    startRun(date) {
        if (!this._data.lastRuns) {
            this._data.lastRuns = [];
        }
        while (this._data.lastRuns.length >= MAX_RUNS) {
            this._data.lastRuns.shift();
        }
        let run = {start: date, processed: 0, errored: 0};
        this._data.lastRuns.push(run);
        return run;
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
     * Getter for subs
     * 
     * @returns {object} subs object
     */
    get subs() {
        return this._data.subs;
    }

    /**
     * Setter for subs
     * 
     * @param {object} subs subs object
     */
    set subs(subs) {
        if (subs !== null && subs !== undefined) {
            this._data.subs = subs;
        }
        else {
            delete this._data.subs;
        }
    }

    /**
     * Utility method for getting/setting sub Result
     * 
     * @param {string} key sub result key
     * @param {Result} result Result instance
     * @param {string} virtual virtual key of the sub it belongs to
     * @returns {Result} current Result for given sub key, adds result object if it doesn't exist
     */
    sub(key, result, virtual) {
        if (!this._data.subs) {
            this._data.subs = {};
        }
        if (result !== undefined) {
            this._data.subs[key] = result;
        }
        else if (!this._data.subs[key]) {
            this._data.subs[key] = new Result();
        }
        if (virtual) {
            this._data.subs[key].virtual = virtual;
        }
        return this._data.subs[key];
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
            errors = undefined,
            subs;
        if (note.result.resourceErrors && note.result.resourceErrors.length) {
            lastErrors = note.result.resourceErrors.map(e => new PushError(e.error || 'Unknown error', ERROR.EXCEPTION, e.date || Date.now()));
        }
        if (note.result.error) {
            lastErrors = lastErrors || [];
            lastErrors.unshift(new PushError(note.result.error, ERROR.EXCEPTION, note.date.getTime()));
        }
        if (note.platforms.length === 1) {
            subs = {
                [note.platforms[0]]: new Result({
                    total: note.result.total || (note.build && note.build.total || 0),
                    processed: note.result.processed,
                    sent: note.result.sent,
                    actioned: note.result.actioned,
                })
            };
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
            subs
        });
    }

    /**
     * Construct Result if needed
     * 
     * @param {Result|object} data Result instance or result data
     * @returns {Result} Result instance
     */
    static from(data) {
        if (data instanceof Result) {
            return data;
        }
        else {
            return new Result(data);
        }
    }
}



module.exports = { Result, MAX_RUNS, MAX_ERRORS };

