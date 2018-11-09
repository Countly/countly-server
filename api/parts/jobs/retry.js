'use strict';

const log = require('../../utils/log.js')('jobs:retry');


/**
 * By default job will be retried 3 times with 1, 2 and 3 second delays for any error = new DefaultRetryPolicy(3)
 */
class DefaultRetryPolicy {
    /**
    * Constructor
    * @param {numbe} retries
    **/
    constructor(retries) {
        this._retries = retries;
        this._retried = 0;
        this._retrying = null;
    }

    /**
    * Delay for retrying
    * @returns {Promise} promise
    **/
    delay() {
        if (!this._retrying) {
            this._retrying = new Promise((resolve) => {
                setTimeout(() => {
                    this._retrying = null;
                    resolve();
                }, this._retried * 1000);
            });
        }
        return this._retrying;
    }

    /**
    * Check if error is retryable
    * @returns {boolean} true
    **/
    errorIsRetriable(/*error*/) {
        return true;
    }

    /**
    * Run
    * @param {function} runFun - function to run
    * @returns {Promise} promise
    **/
    run(runFun) {
        return new Promise((resolve, reject) => {
            try {
                log.d('Running job %d time out of %d attempts', this._retried + 1, this._retries);
                runFun().then(resolve, (error) => {
                    log.w('Error in retry: ', error, error.stack);
                    if (this.errorIsRetriable(error)) {
                        log.w('Retriable error in retry: spent %d, left %d attempts', this._retried, this._retries);
                        if (this._retries) {
                            this._retries--;
                            this._retried++;

                            this.delay().then(() => {
                                this.run(runFun).then(resolve, reject);
                            });
                        }
                        else {
                            reject(error);
                        }
                    }
                    else {
                        try {
                            log.e('Non-retriable error in retry: spent %d attempts, error %j', this._retried, error.stack);
                            reject(error);
                        }
                        catch (e) {
                            log.e(e, e.stack);
                        }
                    }
                });
            }
            catch (e) {
                log.e('Error in retry.run', e, e.stack);
                reject(e);
            }
        });
    }
}

/**
 * RetryPolicy which retries only crashed & timed out resources, default for IPCJob
 */
class IPCRetryPolicy extends DefaultRetryPolicy {
    /**
    * Check if error is retryable
    * @param {Error} error - error to check
    * @returns {boolean} true if retryable
    **/
    errorIsRetriable(error) {
        return (error === 'Process exited') ||
				(error.message === require('./job.js').ERROR.TIMEOUT) ||
				(typeof error === 'object' && error.length === 2 &&
					(error[0] === require('./job.js').ERROR.CRASH || error[0] === require('./job.js').ERROR.TIMEOUT));
    }
}

/**
 * Never retry
 */
class NoRetryPolicy extends DefaultRetryPolicy {
    /** Constructor **/
    constructor() {
        super(0);
    }

    /**
    * Check if error is retryable
    * @returns {boolean} false
    **/
    errorIsRetriable(/*error*/) {
        return false;
    }
}

module.exports = {
    DefaultRetryPolicy: DefaultRetryPolicy,
    IPCRetryPolicy: IPCRetryPolicy,
    NoRetryPolicy: NoRetryPolicy
};