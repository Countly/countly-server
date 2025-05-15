const asyncHooks = require('async_hooks');
const common = require('../../../api/utils/common.js');
const log = common.log('AsyncTracker');
const path = require('path');
/**
 * Class to track asynchronous operations and log potentially stuck operations.
 */
class AsyncTracker {
    /**
     * Creates an instance of AsyncTracker.
     * @param {number} [timeoutMs=5000] - The timeout in milliseconds to consider an async operation as stuck.
     */
    constructor(timeoutMs = 10000) {
        this.timeoutMs = timeoutMs;
        this.asyncOps = new Map();
        this.hook = asyncHooks.createHook({
            init: this.init.bind(this),
            destroy: this.destroy.bind(this)
        });
        // this.logFile = fs.createWriteStream('async-ops.log', { flags: 'a' });
    }

    /**
     * Initializes tracking for a new async operation.
     * @param {number} asyncId - The unique identifier for the async operation.
     * @param {string} type - The type of the async operation.
     * @param {number} triggerAsyncId - The unique identifier of the async operation that triggered this one.
     */
    init(asyncId, type, triggerAsyncId) {
        if (type === 'PROMISE') {
            const startTime = Date.now();
            const stackTrace = this.captureStackTrace();
            this.asyncOps.set(asyncId, { type, startTime, triggerAsyncId, stackTrace });
        }
    }

    /**
     * Removes tracking for a completed async operation.
     * @param {number} asyncId - The unique identifier for the async operation.
     */
    destroy(asyncId) {
        this.asyncOps.delete(asyncId);
    }

    /**
     * Captures the current stack trace.
     * @returns {string} The captured stack trace.
     */
    captureStackTrace() {
        const stackTraceLimit = Error.stackTraceLimit;
        Error.stackTraceLimit = Infinity;
        const obj = {};
        Error.captureStackTrace(obj, this.captureStackTrace);
        Error.stackTraceLimit = stackTraceLimit;
        return obj.stack;
    }

    /**
     * Starts tracking async operations.
     */
    start() {
        this.hook.enable();
    }

    /**
     * Stops tracking async operations.
     */
    stop() {
        this.hook.disable();
    }

    /**
     * Logs potentially stuck async operations.
     */
    logStuckOperations() {
        const now = Date.now();
        log.d('Checking for stuck async operations...');

        for (const [asyncId, { type, startTime, triggerAsyncId, stackTrace }] of this.asyncOps) {
            const elapsedTime = now - startTime;
            if (elapsedTime > this.timeoutMs) {
                log.d(`Potentially stuck ${type} operation detected:`);
                log.d(`AsyncID: ${asyncId}`);
                log.d(`TriggerAsyncID: ${triggerAsyncId}`);
                log.d(`Elapsed time: ${elapsedTime}ms`);
                this.logStackTrace(stackTrace);
                log.d('---');
            }
        }

        if (this.asyncOps.size === 0) {
            log.d('No pending async operations detected.');
        }
    }

    /**
     * Logs a stack trace.
     * @param {string} stackTrace - The stack trace to log.
     */
    logStackTrace(stackTrace) {
        const stackLines = stackTrace.split('\n');
        for (let i = 1; i < stackLines.length; i++) {
            const line = stackLines[i].trim();
            if (line.startsWith('at ')) {
                const match = line.match(/at (?:(.+?)\s+\()?(?:(.+?):(\d+):(\d+))/);
                if (match) {
                    const [, fnName, filename, lineNumber, columnNumber] = match;
                    log.d(`  at ${fnName || '<anonymous>'} (${path.basename(filename)}:${lineNumber}:${columnNumber})`);
                }
                else {
                    log.d(`  ${line}`);
                }
            }
        }
    }
}

module.exports = AsyncTracker;