/**
 * Pure utility functions with no external dependencies.
 * This module exists to avoid circular dependencies between countly.common.js and countly.helpers.js
 * @module countly.utils
 */

/**
 * Get currently selected period that can be used in ajax requests.
 * @param {string|number[]} period - Selected date period
 * @returns {string} Supported values are: 'month', '60days', '30days', '7days', 'yesterday', 'hour' or JSON string of [startMilliseconds, endMilliseconds]
 */
export function getPeriodUrlQueryParameter(period) {
    if (Object.prototype.toString.call(period) === '[object Array]') {
        return JSON.stringify(period);
    }
    else {
        return period;
    }
}
