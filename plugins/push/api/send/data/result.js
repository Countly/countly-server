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
     * @param {number}                  data.sent           number of notifications accepted by service provider
     * @param {number}                  data.actioned       number of actions performed on devices for this message
     * @param {number}                  data.failed        number of errors happened during sending (not necessarily equal to total - processed)
     * @param {object}                  data.errors         non fatal platform-specific response counts ({i400+InvalidToken: 123, a400+WrongMessage: 501})
     * @param {object}                  data.subs           sub results ({key: Result})
     */
    constructor(data) {
        super(data);
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
            sent: {type: 'Number', required: true},
            actioned: {type: 'Number', required: true},
            failed: {type: 'Number', required: true},
            errors: {type: 'Object', required: false},
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
     * Getter for failed
     *
     * @returns {number} number of sending errors
     */
    get failed() {
        return this._data.failed || 0;
    }

    /**
     * Setter for failed
     *
     * @param {number|undefined} failed number of sending errors
     */
    set failed(failed) {
        if (failed !== null && failed !== undefined) {
            this._data.failed = failed;
        }
        else {
            delete this._data.failed;
        }
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