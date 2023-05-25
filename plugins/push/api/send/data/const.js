const { Jsonable, Validatable, Mongoable } = require('../../../../../api/utils/models');

/* eslint-disable key-spacing, no-multi-spaces */

const MEDIA_MIME_ANDROID = [
        'image/gif',
        'image/png',
        'image/jpg',
        'image/jpeg',
    ],
    MEDIA_MIME_IOS = MEDIA_MIME_ANDROID.concat([
        'audio/mpeg',
        'audio/mp3',
        'audio/wav',
        'audio/x-wav',

        'video/mp4',
        'video/mpeg',
        'video/quicktime'
    ]),
    MEDIA_MIME_ALL = MEDIA_MIME_IOS,

    DBMAP = {
        MESSAGING_ENABLED: 'm',
        MESSAGE_ID: 'm',
    };

const DEFAULTS = {
    schedule_ahead: 5 * 60000,  // schedule job needs to be scheduled this much ms prior to the job date
    queue_insert_batch: 100000,  // insert into "push" collection in batches of 100 000 records
    max_media_size: 1024 * 1024 // 1Mb is a very conservative limit for media attachments
};

/**
 * Internal message states
 * State machine for regular messages:
 *  null
 *      -> Created [created] on insertion
 * 
 *  Created [created]
 *      -> Scheduling [created] during schedule job
 *      -> Created | Deleted [created x] on deletion
 *      -> Created [created result.error] | Error on error before scheduling job
 *  
 *  Scheduling [created]
 *      -> Stremable [scheduled] on schedule job done
 *      -> Scheduling | Error [created result.error] on error during schedule job
 *      -> Done [failed result.error] if no recipients is found during scheduling
 * 
 *  Streamable [scheduled]
 *      -> Streaming [sending] on send job start
 *      -> Streamable | Deleted [scheduled x] on deletion
 *      -> Streamable | Error [scheduled result.error] on error during start of send job
 *      -> Done | Error [failed x result.error='terminated'] on termination
 *      -> Done | Streamable | Error [failed x result.error='terminated'] on termination
 *      -> Done | Error [failed result.error='terminated'] on termination
 *  
 *  Streaming [sending]
 *      -> Done [sent] after send job run
 *      -> Paused [sending result.error] during backoffs
 *      -> ??? Streaming | Error [sending result.error] for recoverable streaming errors
 *      -> Done | Error [failed result.error] after unrecoverable errors or a number of times being Paused 
 *      -> Done | Error [failed result.error='terminated'] on termination
 * 
 *  Streaming | Error [sending result.error]
 *      -> ... same as Streaming ... 
 * 
 *  Paused [sending result.error]
 *      -> Streaming [sending result.error] on next backoff
 *      -> Done | Error [failed result.error] on too many attempts
 *      -> Paused | Deleted [failed x result.error] on deletion
 *  
 *  Done | Error [failed result.error]
 *      -> Streaming [sending] on resume (reset of errors)
 *      -> Done | Error | Deleted [failed x result.error] on deletion
 *      
 * 
 *  
 * State machine for auto/tx messages:
 *  null
 *      -> Streamable [scheduled] for auto/tx
 * 
 *  Created [created]
 *      -> Streamable [scheduled] on activation
 *      -> Created | Deleted [created x] on deletion
 *      -> Created | Error [created result.error] on error during activation
 *  
 *  Streamable [scheduled]
 *      -> Streaming [sending] on send job start
 *      -> Streamable | Deleted [scheduled x] on deletion
 *      -> Streamable | Error [scheduled result.error] on error during start of send job, during /push, /toggle or auto hooks
 *      -> Created [created] when auto/tx are toggled to inactive
 *  
 *  Streaming [sending]
 *      -> Streamable [scheduled] after send job run
 *      -> Paused [sending result.error] during backoffs
 *      -> ??? Streaming | Error [sending result.error] for recoverable streaming errors
 *      -> Done | Error [failed result.error] after unrecoverable errors or a number of times being Paused 
 *      -> !!! Created when auto/tx are toggled to inactive
 *  
 *  Streaming | Error [sending result.error]
 *      -> ... same as Streaming ... 
 * 
 *  Paused [sending result.error]
 *      -> Streaming [sending] on next backoff
 *      -> Done | Error [failed result.error] on too many attempts
 *      -> Paused | Deleted [failed x result.error] on deletion
 * 
 *  Done | Error [failed result.error]
 *      -> Streamable [scheduled] on reactivation / reset of errors
 *      -> Done | Deleted [failed x result.error] on deletion
 * 
 */
const State = {
    Created:    0,              // 0  [created]
    Inactive:   1 << 0,         // 1  [inactive, draft]
    Scheduling: 1 << 1,         // 2  [created] crunching data and putting into queue
    Streamable: 1 << 2,         // 4  [scheduled] in queue, ready to be streamed
    Streaming:  1 << 3,         // 8  [sending] streaming to a sender
    Paused:     1 << 4,         // 16 [sending] paused, exponential backoff, waiting for networking issues to get sorted out
    Done:       1 << 5,         // 32 [sent, stopped, failed] done

    Deleted:    1 << 7,         // 128 Deleted
    Error:      1 << 8,         // 256 Error
    Cleared:    1 << 9          // 512 Cleared queue
};

/**
 * User-facing message statuses.
 */
const Status = {
    Created:    'created',      // [Created] Created, haven't beeing scheduled yet or Stopped for automated/tx (sending is forbidden)
    Inactive:   'inactive',     // [Inactive] Second Created (waiting for approval)
    Draft:      'draft',        // [Inactive] Cannot be sent, can only be duplicated
    Scheduled:  'scheduled',    // [Streamable] Will be sent when appropriate
    Sending:    'sending',      // [Streaming, Paused] Sending right now
    Sent:       'sent',         // [Done] Sent, no further actions
    Stopped:    'stopped',      // [Done] Stopped sending (one time from UI)
    Failed:     'failed',       // [Done] Removed from queue, no further actions
    // pretty much all of above have a corresponding "& Error" companion from State which would make result.error be non empty
};

/**
 * Trigger kinds (types).
 */
const TriggerKind = {
    Plain:      'plain',        // One-time message
    Event:      'event',        // Automated on-event message
    Cohort:     'cohort',       // Automated on-cohort message
    API:        'api',          // API (Transactional) message
    Recurring:  'rec',          // Recurring message,
    Multi:      'multi',        // Multiple times,
};

/**
 * Recurring message types
 */
const RecurringType = {
    Daily: 'daily',
    Weekly: 'weekly',
    Monthly: 'monthly'
};


/**
 * Time limits (0 ... 24h in milliseconds - 1)
 */
const Time = {
    MIN: 0,
    MAX: 24 * 60 * 60 * 1000 - 1
};

/* eslint-enable key-spacing, no-multi-spaces */

/**
 * Separator used in property keys
 */
const S = '|';
const S_REGEXP = '\\|';

/**
 * Type of personalization object
 */
const PersType = {
    Event: 'e',
    User: 'u',
    UserCustom: 'c',
    Api: 'a'
};

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
            require('../../../../../api/utils/common').log('push:const').e(`Invalid date value: ${date}`);
        }
    }
}

module.exports = {
    S,
    S_REGEXP,

    State,
    Status,
    STATUSES: Object.values(Status),

    TriggerKind,
    RecurringType,
    Time,

    PersType,
    PERS_TYPES: Object.values(PersType),

    toDate,

    DEFAULTS,
    DBMAP,

    MEDIA_MIME_ALL,
    MEDIA_MIME_IOS,
    MEDIA_MIME_ANDROID,

    Jsonable,
    Validatable,
    Mongoable
};