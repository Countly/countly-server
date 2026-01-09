/**
 * @module kafkaRequestQueueFix
 * @description Fixes KafkaJS infinite loop bug (issues #1704, #1751)
 *
 * MUST be imported BEFORE any KafkaJS clients are created.
 *
 * Bug: scheduleCheckPendingRequests() passes negative timeout to setTimeout
 * when pending.length === 0, causing ~694 calls/second infinite loop.
 *
 * References:
 * - https://github.com/tulios/kafkajs/issues/1704 (infinite loop)
 * - https://github.com/tulios/kafkajs/issues/1751 (TimeoutNegativeWarning)
 *
 * REMOVAL: Remove when upgrading to KafkaJS version that fixes #1704
 */

const log = require('../../../../api/utils/log.js')('kafka:requestqueue-fix');

// Import KafkaJS internal RequestQueue class
const RequestQueue = require('kafkajs/src/network/requestQueue');

// Store original method for potential restoration
const originalScheduleCheckPendingRequests = RequestQueue.prototype.scheduleCheckPendingRequests;

// The interval used by KafkaJS for pending request checks (from original source)
const CHECK_PENDING_REQUESTS_INTERVAL = 10;

/**
 * Fixed version of scheduleCheckPendingRequests
 *
 * Changes from original:
 * 1. Early return when nothing to do (breaks the infinite loop)
 * 2. Always ensures scheduleAt is positive (prevents negative timeout warning)
 */
RequestQueue.prototype.scheduleCheckPendingRequests = function scheduleCheckPendingRequests() {
    // Fix: Don't schedule if there's nothing to process and we're not throttled
    const isThrottled = this.throttledUntil > Date.now();
    if (this.pending.length === 0 && !isThrottled) {
        return; // BREAKS THE INFINITE LOOP
    }

    if (!this.throttleCheckTimeoutId) {
        // Fix: Always ensure scheduleAt is positive
        const scheduleAt = isThrottled
            ? Math.max(this.throttledUntil - Date.now(), CHECK_PENDING_REQUESTS_INTERVAL)
            : CHECK_PENDING_REQUESTS_INTERVAL;

        this.throttleCheckTimeoutId = setTimeout(() => {
            this.throttleCheckTimeoutId = null;
            this.checkPendingRequests();
        }, scheduleAt);
    }
};

log.i('KafkaJS RequestQueue.scheduleCheckPendingRequests patched (fixes #1704, #1751)');

module.exports = {
    /**
     * Restore original method (for testing)
     */
    restore: function() {
        RequestQueue.prototype.scheduleCheckPendingRequests = originalScheduleCheckPendingRequests;
        log.i('KafkaJS RequestQueue.scheduleCheckPendingRequests restored to original');
    },

    /**
     * Check if patch is applied
     * @returns {boolean} True if patched, false if original
     */
    isPatched: function() {
        return RequestQueue.prototype.scheduleCheckPendingRequests !== originalScheduleCheckPendingRequests;
    }
};
