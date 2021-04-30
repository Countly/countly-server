'use strict';

const { PushError } = require('./error');

/* eslint-disable key-spacing, no-multi-spaces */

/**
 * Internal message states
 */
const State = {
    Created:    0,
    Scheduling: 1 << 0,         // 1 crunching data and putting into queue
    Queued:     1 << 1,         // 2 in queue, ready to be streamed
    Streaming:  1 << 2,         // 4 streaming to a sender
    Paused:     1 << 3,         // 8 paused, exponential backoff, waiting for networking issues to get sorted out
    Done:       1 << 4,         // 16 done

    Deleted:    1 << 8,         // 256 Deleted
    Error:      1 << 9          // 512 Error
};

/**
 * User-facing message statuses.
 */
const Status = {
    Draft:      'draft',        // Cannot be sent, can only be duplicated
    Inactive:   'inactive',     // Waiting for approval, Stopped for automated (sending is forbidden)
    Scheduled:  'scheduled',    // Will be sent when appropriate
    Sending:    'sending',      // Sending right now
    Sent:       'sent',         // Sent, no further actions
    Stopped:    'stopped',      // Stopped sending (one time from UI)
    Failed:     'failed',       // Removed from queue, no further actions
};

/**
 * Trigger kinds (types).
 */
const TriggerKind = {
    Plain:      'plain',        // One-time message
    Event:      'event',        // Automated on-event message
    Cohort:     'cohort',       // Automated on-cohort message
    API:        'api',          // API (Transactional) message
};


/* eslint-enable key-spacing, no-multi-spaces */

/**
 * Separator used in property keys
 */
const S = '|';

/**
 * Convert whatever date we have to Date instance
 * 
 * @param {number|string|Date|undefined} date date in any format
 * @returns {Date} Date instance
 */
function toDate(date) {
    if (date) {
        if (typeof date === 'number' || typeof date === 'string') {
            return new Date(date);
        }
        else if (typeof date === 'object') {
            return date;
        }
        else {
            throw new PushError(`Invalid date value: ${date}`);
        }
    }
}

/**
 * Base class for push data classes for json getter
 */
class Jsonable {
    /**
     * Constructor
     * 
     * @param {object} data data object
     */
    constructor(data = {}) {
        this._data = data;
    }

    /**
     * Get new object containing all fields ready for sending to client side
     */
    get json() {
        let json = {};
        Object.keys(this._data)
            .filter(k => this._data[k] !== null && this._data[k] !== undefined)
            .forEach(k => json[k] = this._data[k]);
        return json;
    }
}

module.exports = { S, State, Status, STATUSES: Object.values(Status), TriggerKind, Jsonable, toDate };