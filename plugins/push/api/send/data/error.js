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
     * Asserts, unhandled errors, etc.
     * 8192
     */
    EXCEPTION: ERROR_TYPE.EXCEPTION
};

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
}

/**
 * Reconstruct error to a correct type from serialized JSON
 * 
 * @param {object} data error JSON
 * @returns {PushError} correct error class instance
 */
PushError.deserialize = function(data) {
    if (data.name === 'SendError') {
        return new SendError(data.message, data.type, data.affected, data.left);
    }
    else if (data.name === 'ConnectionError') {
        return new ConnectionError(data.message, data.type, data.connectionErrorCode, data.connectionErrorMessage);
    }
    else {
        return new PushError(data.message, data.type);
    }
};

/**
 * Error which happens during sending which indicates that some of the notifications (affected) were not sent correctly,
 * while optionally some others (left) were not processed at all and won't be processed in the future because of this error.
 */
class SendError extends PushError {
    /**
     * 
     * @param {string} message Error message
     * @param {number} type Error type, {@see ERROR}
     * @param {array} affected Array of notification objects which might not be sent due to this error
     * @param {array} left Array of notification objects which won't be sent due to this error
     */
    constructor(message, type, affected, left = []) {
        super(message, type);
        this.name = 'SendError';
        this.affected = affected;
        this.left = left;
    }

    /**
     * Convert error to plain JSON
     * @returns {object} JSON contents of the error
     */
    serialize() {
        return {
            type: this.type,
            message: this.message,
            name: this.name,
            affected: this.affected,
            left: this.left
        };
    }
}

/**
 * Error which happens during sending which indicates that some of the notifications (affected) were not sent correctly,
 * while optionally some others (left) were not processed at all and won't be processed in the future because of this error.
 */
class ConnectionError extends PushError {
    /**
     * 
     * @param {string} message Error message
     * @param {number} type Error type, {@see ERROR}
     * @param {array} connectionErrorCode connection error code (i.e., 401 for wrong credentials)
     * @param {array} connectionErrorMessage connection error code (i.e., Unauthorized for wrong credentials)
     */
    constructor(message, type, connectionErrorCode, connectionErrorMessage) {
        super(message, type);
        this.name = 'ConnectionError';
        this.connectionErrorCode = connectionErrorCode || 0;
        this.connectionErrorMessage = connectionErrorMessage || 'Unknown connection error';
    }

    /**
     * Convert error to plain JSON
     * @returns {object} JSON contents of the error
     */
    serialize() {
        return {
            type: this.type,
            message: this.message,
            name: this.name,
            connectionErrorCode: this.connectionErrorCode,
            connectionErrorMessage: this.connectionErrorMessage
        };
    }
}

module.exports = { PushError, SendError, ConnectionError, ERROR };