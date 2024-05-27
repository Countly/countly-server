'use strict';

const { toDate } = require('./const');
/**
 * @module error
 */

/**
 * General bits for error kinds
 */
const ERROR_TYPE = {
    /**
     * Crendentials-related error
     * 1024
     */
    CREDENTIALS: 1 << 10,

    /**
     * Connection-related error
     * 2048
     */
    CONNECTION: 1 << 11,

    /**
     * Data-related error
     * 4096
     */
    DATA: 1 << 12,

    /**
     * Assertion/exception/invalid state
     * 8192
     */
    EXCEPTION: 1 << 13,
};

/**
 * Errors enum
 */
const ERROR = {
    /**
     * Cannot use provided credentials (invalid data, parsing errors, etc.)
     * 32768 | 1024 = 33792
     */
    INVALID_CREDENTIALS: 1 << 15 | ERROR_TYPE.CREDENTIALS,

    /**
     * Credentials specified are rejected by push provider
     * 65536 | 1024 = 66560
     */
    WRONG_CREDENTIALS: 1 << 16 | ERROR_TYPE.CREDENTIALS,

    /**
     * Proxy-related errors: proxy unreachable, invalid, etc.
     * 131072 | 2048 = 133120
     */
    CONNECTION_PROXY: 1 << 17 | ERROR_TYPE.CONNECTION,

    /**
     * Provider connectivity error: unreachable, timeouts, etc.
     * 262144 | 2048 = 264192
     */
    CONNECTION_PROVIDER: 1 << 18 | ERROR_TYPE.CONNECTION,

    /**
     * Invalid data supplied to Countly
     * 524288 | 4096 = 528384
     */
    DATA_COUNTLY: 1 << 19 | ERROR_TYPE.DATA,

    /**
     * Invalid data error returned by push provider
     * 1048576 | 4096 = 1052672
     */
    DATA_PROVIDER: 1 << 20 | ERROR_TYPE.DATA,

    /**
     * Invalid token error returned by push provider
     * 2097152 | 4096 = 2101248
     */
    DATA_TOKEN_EXPIRED: 1 << 21 | ERROR_TYPE.DATA,

    /**
     * Invalid token error returned by push provider
     * 4194304 | 4096 = 4198400
     */
    DATA_TOKEN_INVALID: 1 << 22 | ERROR_TYPE.DATA,

    /**
     * Asserts, unhandled errors, etc.
     * 8192
     */
    EXCEPTION: ERROR_TYPE.EXCEPTION
};

// /**
//  * Stardardized provider error code
//  */
// const PROVIDER_STATUS = {
//     /**
//      * Message was sent
//      */
//     OK: 0,

//     /**
//      * Token is invalid, delete token
//      */
//     TOKEN_INVALID: -1,
//     /**
//      * Token is expired, delete token
//      */
//     TOKEN_EXPIRED: -2,
//     /**
//      * Token has been refreshed, use new one
//      */
//     TOKEN_REFRESH: -3,
//     /**
//      * Wrong configuration (MistmatchSenderId for FCM or device token not for topic for APN)
//      */
//     TOKEN_MISCONFIGURATION: -4,

//     /**
//      * Invalid request, check parameters
//      */
//     ERROR_DATA: -5,

//     /**
//      * Invalid request, check parameters
//      */
//     ERROR_REQUEST: -6,
// };

/**
 * Base class for all push errors
 */
class PushError extends Error {
    /**
     * PushError Constructor
     * @param {string} message Error message
     * @param {number} type Error code
     * @param {number} date Error ms timestamp
     */
    constructor(message, type = ERROR.EXCEPTION, date = new Date()) {
        super(message);
        this.name = 'PushError';
        this.type = type;
        this.date = toDate(date);
    }

    /**
     * Check if error is related to credentials
     */
    get isCredentials() {
        return (this.type & ERROR_TYPE.CREDENTIALS) > 0;
    }

    /**
     * Check if error is related to connectivity
     */
    get isConnection() {
        return (this.type & ERROR_TYPE.CONNECTION) > 0;
    }

    /**
     * Check if error is related to the notification data
     */
    get isData() {
        return (this.type & ERROR_TYPE.DATA) > 0;
    }

    /**
     * Check if error is related to the notification data
     */
    get isException() {
        return (this.type & ERROR_TYPE.EXCEPTION) > 0;
    }

    /**
     * Check that error type is bitwise same as typ
     * 
     * @param {int} typ error flag
     * @returns {boolean} true if the error corresponds to the typ
     */
    is(typ) {
        return (this.type & typ) === typ;
    }

    /**
     * Convert this error to plain JSON
     * @returns {object} JSON contents of the error
     */
    serialize() {
        return {
            name: this.name,
            type: this.type,
            message: this.message,
            date: this.date,
            stack: this.stack
        };
    }

    /**
     * Reconstruct error to a correct type from serialized JSON
     * 
     * @param {object} data error JSON
     * @param {constructor} C default error constructor used when data is a generic Error instance or string / object / nothing
     * @returns {PushError} correct error class instance
     */
    static deserialize(data, C = PushError) {
        if (typeof data === 'string' || !data) {
            data = new Error(data || 'Unknown error');
        }
        if (data instanceof PushError) {
            return data;
        }
        else if (data instanceof Error) {
            let e = new C(data.message, ERROR.EXCEPTION);
            e.stack = data.stack;
            return e;
        }
        else {
            let e;
            if (data.name === 'SendError') {
                e = new SendError(data.message, data.type, data.date)
                    .setAffected(data.affected, data.affectedBytes);
            }
            else if (data.name === 'ConnectionError') {
                e = new ConnectionError(data.message, data.type, data.date)
                    .setConnectionError(data.connectionErrorMessage, data.connectionErrorCode)
                    .setAffected(data.affected, data.affectedBytes)
                    .setLeft(data.left, data.leftBytes);
            }
            else {
                e = new C(data.message, data.type || ERROR.EXCEPTION, data.date);
            }

            e.stack = data.stack;
            return e;
        }
    }

    /**
     * Returns total bytes of this error (0 for PushError)
     * 
     * @returns {number} how many bytes is in this error
     */
    bytes() {
        return 0;
    }

    /**
     * Returns total number of pushes of this error (0 for PushError)
     * 
     * @returns {number} how many pushes is in this error
     */
    length() {
        return 0;
    }
}

/**
 * Validation error
 */
class ValidationError extends PushError {
    /**
     * Construct validation error
     * 
     * @param {string[]|string} errors array of error strings
     */
    constructor(errors) {
        super('Validation error', ERROR.DATA_COUNTLY);
        this.errors = typeof errors === 'string' ? [errors] : errors;
    }

    /**
     * toString override
     * 
     * @returns {string} string representation of the error
     */
    toString() {
        return `${super.message}: ${this.errors.join('; ')}`;
    }
}

/**
 * Internal class for subclassing
 */
class ProcessingError extends PushError {

    /**
     * PushError Constructor
     * @param {string} message Error message
     * @param {number} type Error code
     * @param {number} date Error ms timestamp
     */
    constructor(message, type = ERROR.EXCEPTION, date = new Date()) {
        super(message, type, date);
        this.affected = [];
        this.left = [];
        this.affectedBytes = this.leftBytes = 0;
    }

    /**
     * Returns true if the error contains `affected` pushes
     */
    get hasAffected() {
        return this.affectedBytes > 0;
    }

    /**
     * Returns true if the error contains `affected` pushes
     */
    get hasLeft() {
        return this.leftBytes > 0;
    }

    /**
     * Set affected push objects which were in flight when error happened and therefore could be not sent, returns this for chaining
     * 
     * Affected pushes will be returned in a recoverable error. Once 3 ProcessingError happen in a row, sending will be terminated with the rest (left) removed from the queue.
     * 
     * @param {string[]} affected Array of push object ids which might not be sent due to this error
     * @param {number} bytes number of bytes in affected
     * @returns {ProcessingError} this instance
     */
    setAffected(affected, bytes) {
        this.affected = affected;
        this.affectedBytes = bytes;
        return this;
    }

    /**
     * Set affected push objects which were in flight when error happened and therefore could be not sent, returns this for chaining
     * 
     * Affected pushes will be returned in a recoverable error. Once 3 ProcessingError happen in a row, sending will be terminated with the rest (left) removed from the queue.
     * 
     * @param {string|string[]} id ID of push object which might not be sent due to this error
     * @param {number} bytes number of bytes in push object behind id
     * @returns {ProcessingError} this instance
     */
    addAffected(id, bytes) {
        if (Array.isArray(id)) {
            id.forEach(i => this.affected.push(i));
        }
        else {
            this.affected.push(id);
        }
        this.affectedBytes += bytes;
        return this;
    }

    /**
     * Return new SendError containing affected from this instance as a way to report these notifications being failed to send. 
     * @see {@link ProcessingError#setAffected}
     * 
     * @returns {SendError} with affected from this instance
     */
    affectedError() {
        let e = new SendError(this.message, this.type, this.date).setAffected(this.affected, this.affectedBytes);
        e.stack = this.stack;
        return e;
    }

    /**
     * Return new SendError not containing affected/left from this instance to be saved in a message 
     * 
     * @returns {SendError} with no affected/left from this instance
     */
    messageError() {
        let e = new SendError(this.message, this.type, this.date);
        e.stack = this.stack;
        return e;
    }

    /**
     * Set left to send push objects which were not sent due to this error, returns this for chaining
     * 
     * @param {string[]} left Array of push ids left to send due to this error
     * @param {array} bytes number of bytes in left
     * @returns {ProcessingError} this instance
     */
    setLeft(left, bytes) {
        this.left = left;
        this.leftBytes = bytes;
        return this;
    }

    /**
     * Add left push object which was still in queue when unrecoverable error happened
     * 
     * @param {string|string[]} id ID of push object which won't be sent because an unrecoverable error happened earlier
     * @param {number} bytes number of bytes in push object behind id
     * @returns {ProcessingError} this instance
     */
    addLeft(id, bytes) {
        if (Array.isArray(id)) {
            id.forEach(i => this.left.push(i));
        }
        else {
            this.left.push(id);
        }
        this.leftBytes += bytes;
        return this;
    }

    /**
     * Convert this error to plain JSON
     * @returns {object} JSON contents of the error
     */
    serialize() {
        return Object.assign(super.serialize(), {
            affected: this.affected,
            affectedBytes: this.affectedBytes,
            left: this.left,
            leftBytes: this.leftBytes,
        });
    }

    /**
     * Returns total bytes of this error (left + affected)
     * 
     * @returns {number} how much bytes is in this error
     */
    bytes() {
        return this.leftBytes + this.affectedBytes;
    }

    /**
     * Returns total number of pushes of this error (left + affected)
     * 
     * @returns {number} how many pushes is in this error
     */
    length() {
        return this.left.length + this.affected.length;
    }
}

/**
 * Error which happens during sending which indicates that some of the notifications (affected) were not sent correctly,
 * while optionally some others (left) were not processed at all and won't be processed in the future because of this error.
 */
class SendError extends ProcessingError {
    /**
     * 
     * @param {string} message Error message
     * @param {number} type Error type, {@see ERROR}
     * @param {number} date Error ms timestamp
     */
    constructor(message, type, date) {
        super(message, type, date);
        this.name = 'SendError';
    }
}

/**
 * Connection error which happens during sending or connection check, contains code & message returned by the provider.
 */
class ConnectionError extends ProcessingError {
    /**
     * 
     * @param {string} message Error message
     * @param {number} type Error type, {@see ERROR}
     * @param {number} date Error ms timestamp
     */
    constructor(message, type, date) {
        super(message, type, date);
        this.name = 'ConnectionError';
    }

    /**
     * Set connection error info, returns this for chaining
     * 
     * @param {array} message connection error code (i.e., Unauthorized for wrong credentials)
     * @param {array} code connection error code (i.e., 401 for wrong credentials)
     * @returns {ConnectionError} this instance
     */
    setConnectionError(message = 'Unknown connection error', code = 0) {
        this.connectionErrorCode = code;
        this.connectionErrorMessage = message;
        return this;
    }

    /**
     * Convert this error to plain JSON
     * @returns {object} JSON contents of the error
     */
    serialize() {
        return Object.assign(super.serialize(), {
            connectionErrorCode: this.connectionErrorCode,
            connectionErrorMessage: this.connectionErrorMessage,
        });
    }

    // /**
    //  * Method to get error description
    //  * @returns {string} error description
    //  */
    // toString() {
    //     return `${this.name}: ${this.connectionErrorMessage}, affected ${this.affected.length} / ${this.affectedBytes}, left ${this.left.length} / ${this.leftBytes}`;
    // }
}

module.exports = { PushError, SendError, ConnectionError, ValidationError, ERROR };
