/**
 * Minimal Promise helpers that replace the bluebird dependency.
 *
 * Extends the native Promise class with the handful of bluebird methods the
 * Countly codebase depends on so the migration stays a single line per file
 * (swap the bluebird require path for this module).
 *
 * @module api/utils/promise
 */

'use strict';

/**
 * Native Promise with the bluebird methods this codebase calls: each, spread and asCallback.
 */
class CountlyPromise extends global.Promise {
    /**
     * Iterate over an iterable (or promise of one) sequentially. The iterator
     * may return a value or a promise; the next iteration waits for it.
     * Resolves to the original iterable, matching bluebird's Promise.each.
     *
     * @param {any} iterable - values to iterate over
     * @param {Function} iterator - invoked as (value, index, length)
     * @returns {Promise<any>} resolves to the resolved iterable
     */
    static each(iterable, iterator) {
        return CountlyPromise.resolve(iterable).then(function(arr) {
            const list = Array.from(arr);
            return list.reduce(function(prev, item, index) {
                return prev.then(function() {
                    return iterator(item, index, list.length);
                });
            }, CountlyPromise.resolve()).then(function() {
                return arr;
            });
        });
    }

    /**
     * Call the handler with the resolved array spread as positional arguments.
     * Matches bluebird's Promise.prototype.spread.
     *
     * @param {Function} handler - receives the resolved values as arguments
     * @returns {Promise<any>} result of the handler, as a promise
     */
    spread(handler) {
        return this.then(function(values) {
            return handler.apply(null, values);
        });
    }

    /**
     * Settle this promise into a node-style (err, value) callback while still
     * returning the underlying promise. Matches bluebird's asCallback/nodeify.
     *
     * @param {Function} callback - node-style callback
     * @returns {Promise<any>} the same promise for chaining
     */
    asCallback(callback) {
        if (typeof callback !== 'function') {
            return this;
        }
        this.then(function(value) {
            callback(null, value);
        }, function(err) {
            callback(err);
        });
        return this;
    }
}

module.exports = CountlyPromise;
