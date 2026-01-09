/**
 * @typedef {import("mongodb").Db} MongoDb
 * @typedef {import("./new/types/queue.ts").PushEventHandler} PushEventHandler
 * @typedef {import("./new/types/queue.ts").ScheduleEventHandler} ScheduleEventHandler
 * @typedef {import("./new/types/queue.ts").ResultEventHandler} ResultEventHandler
 */
const plugins = require('../../pluginManager'),
    common = require('../../../api/utils/common'),
    log = common.log('push:api'),
    { ValidationError, PushError } = require('./send'),
    { validateCreate, validateRead, validateUpdate, validateDelete } = require('../../../api/utils/rights.js'),
    { onSessionUser, onAppPluginsUpdate, onMerge } = require('./api-push'),
    { autoOnCohort, /*autoOnCohortDeletion,*/ } = require('./api-auto'),
    { apiPush } = require('./api-tx'),
    { drillAddPushEvents, drillPostprocessUids, drillPreprocessQuery } = require('./api-drill'),
    { estimate, test, create, update, toggle, remove, all, one, mime, user, periodicStats } = require('./api-message'),
    { dashboard } = require('./api-dashboard'),
    { clear, reset, removeUsers } = require('./api-reset'),
    FEATURE_NAME = 'push',
    PUSH = {
        FEATURE_NAME
    },
    apis = {
        o: {
            dashboard: [validateRead, dashboard],
            mime: [validateRead, mime],
            message: {
                estimate: [validateRead, estimate],
                all: [validateRead, all],
                GET: [validateRead, one, '_id'],
                stats: [validateRead, periodicStats],
            },
            user: [validateRead, user],
        },
        i: {
            message: {
                test: [validateCreate, test],
                create: [validateCreate, create],
                update: [validateUpdate, update],
                toggle: [validateUpdate, toggle],
                remove: [validateDelete, remove],
                push: [validateUpdate, apiPush],
            }
        }
    };

const { initPushQueue, loadKafka } = require("./new/lib/kafka.js");
const { composeAllScheduledPushes } = require('./new/composer.js');
const { sendAllPushes } = require('./new/sender.js');
const { saveResults } = require("./new/resultor.js");
const { scheduleMessageByAutoTriggers } = require("./new/scheduler.js");

plugins.register("/master", async function() {
    try {
        const { kafkaInstance, Partitioners } = await loadKafka();
        await initPushQueue(
            kafkaInstance,
            Partitioners.DefaultPartitioner,
            pushes => sendAllPushes(pushes),
            schedules => composeAllScheduledPushes(common.db, schedules),
            results => saveResults(common.db, results),
            autoTriggerEvents => scheduleMessageByAutoTriggers(common.db, autoTriggerEvents),
        );
        log.i("Push queue initialized successfully");
    }
    catch (err) {
        log.e("Error initializing push queue:", err);
    }
});

/**
 * Handy function for handling api calls (see apis obj above)
 *
 * @param {object} apisObj - apis.i or apis.o
 * @param {object} ob - object from pluginManager ({params, qstring, ...})
 * @returns {true|undefined} true - if the call has been handled
 */
function apiCall(apisObj, ob) {
    let {params, paths} = ob,
        method = paths[3],
        sub = paths[4];

    log.d('handling api request %s%s', method, sub ? `/${sub}` : '');
    if (method in apisObj) {
        if (!sub) {
            if (Array.isArray(apisObj[method])) {
                let [check, fn] = apisObj[method];
                check(params, FEATURE_NAME, endpoint(method, fn));
                return true;
            }
        }
        else if (sub in apisObj[method]) {
            if (Array.isArray(apisObj[method][sub])) {
                let [check, fn] = apisObj[method][sub];
                check(params, FEATURE_NAME, endpoint(method + '/' + sub, fn));
                return true;
            }
        }
        else if (params.req.method in apisObj[method]) {
            if (Array.isArray(apisObj[method][params.req.method])) {
                let [check, fn, key] = apisObj[method][params.req.method];
                if (key) {
                    params.qstring[key] = sub;
                }
                check(params, FEATURE_NAME, endpoint(method, fn));
                return true;
            }
        }
    }
}

/**
 * Wrap push endpoint catching any push-specific errors from it
 *
 * @param {string} method endpoint name
 * @param {function} fn actual endpoint returning a promise
 * @returns {function} CRUD callback
 */
function endpoint(method, fn) {
    return params => fn(params).catch(e => {
        log.e('Error during API request /%s', method, e);
        if (e instanceof ValidationError) {
            common.returnMessage(params, 400, {kind: 'ValidationError', errors: e.errors}, null, true);
        }
        else if (e instanceof PushError) {
            common.returnMessage(params, 400, {kind: 'PushError', errors: [e.message]}, null, true);
        }
        else {
            common.returnMessage(params, 500, {kind: 'ServerError', errors: ['Server error']}, null, true);
        }
    });
}

// Token handling, push internal events handling, evented auto push
plugins.register('/session/user', onSessionUser);

// API
plugins.register('/i/push', ob => apiCall(apis.i, ob));
plugins.register('/o/push', ob => apiCall(apis.o, ob));

// Cohort hooks for cohorted auto push
plugins.register('/cohort/enter', ({cohort, uids}) => autoOnCohort(true, cohort, uids));
plugins.register('/cohort/exit', ({cohort, uids}) => autoOnCohort(false, cohort, uids));
// plugins.register('/cohort/delete', ({_id, ack}) => autoOnCohortDeletion(_id, ack));

// Drill hooks for user profiles
plugins.register('/drill/add_push_events', drillAddPushEvents);
plugins.register('/drill/preprocess_query', drillPreprocessQuery);
plugins.register('/drill/postprocess_uids', drillPostprocessUids);

// Hook to move data to new uid on user merge
plugins.register('/i/device_id', onMerge);

// Data clears/resets/deletes
plugins.register('/i/apps/update/plugins/push', onAppPluginsUpdate);
plugins.register('/i/apps/reset', reset);
plugins.register('/i/apps/clear_all', clear);
plugins.register('/i/apps/delete', reset);
plugins.register('/i/app_users/delete', async({app_id, uids}) => {
    await removeUsers(app_id, uids, 'purge');
});
plugins.register('/consent/change', ({params, changes}) => {
    if (changes && changes.push === false && params.app_id && params.app_user && params.app_user.uid !== undefined) {
        return removeUsers(params.app_id, [params.app_user.uid], 'consent');
    }
});
plugins.register('/i/app_users/export', ({app_id, uids, export_commands, dbargs, export_folder}) => {
    if (uids && uids.length) {
        if (!export_commands.push) {
            export_commands.push = [{cmd: 'mongoexport', args: [...dbargs, '--collection', `push_${app_id}`, '-q', `{"_id": {"$in": ${JSON.stringify(uids)}}}`, '--out', `${export_folder}/push_${app_id}.json`]}];
        }
    }
});

/**
 * @apiDefine PushError
 *
 * @apiError PushError Bad Request: push plugin error
 *
 * @apiErrorExample {json} PushError
 *      HTTP/1.1 400 Bad Request
 *      {
 *          "errors": ["Error description here"]
 *      }
 */

/**
 * @apiDefine PushValidationError
 *
 * @apiError PushValidationError Bad Request: invalid request parameters
 *
 * @apiErrorExample {json} PushValidationError
 *      HTTP/1.1 400 Bad Request
 *      {
 *          "errors": ["one", "or many", "data validation error messages here, i.e. 'app_id is required'"]
 *      }
 */

/**
 * @apiDefine PushMessageBody
 *
 * @apiBody {ObjectID} app Application ID
 * @apiBody {Boolean} saveResults Store each individual push message result into message_results for debugging
 * @apiBody {String[]} platforms Array of platforms to send to
 * @apiBody {String="draft"} [status] Message status, only set to draft when creating or editing a draft message, don't set otherwise
 * @apiBody {Object} filter={} User profile filter to limit recipients of this message
 * @apiBody {String} [filter.user] JSON with app_usersAPPID collection filter
 * @apiBody {String} [filter.drill] Drill plugin filter in JSON format
 * @apiBody {ObjectID[]} [filter.geos] Array of geo IDs
 * @apiBody {String[]} [filter.cohorts] Array of cohort IDs
 * @apiBody {Object[]} triggers Array of triggers this message should be sent on
 * @apiBody {String="plain", "event", "cohort", "api"} triggers.kind Trigger kind: "plain" (send on date), "event" (when user performs event), "cohort" (on cohort entry or exit), "api" (on /push API call)
 * @apiBody {Date} triggers.start Campaign start date (epoch or ISO date string)
 * @apiBody {Number} [triggers.sctz] [only for plain trigger] Send in users' timezones switch, a number representing message creator offset timezone in minutes (GMT+3 is -180)
 * @apiBody {Boolean} [triggers.delayed] [only for plain trigger] Delay audience selection to 5 minutes prior to start date
 * @apiBody {Date} [triggers.end] [only for event, cohort & api triggers] Campaign end date (epoch or ISO date string)
 * @apiBody {Number} [triggers.time] [only for event, cohort triggers] Time in ms since 00:00 in case event or cohort message is to be sent in users' timezones
 * @apiBody {Boolean} [triggers.reschedule] [only for event, cohort triggers] Allow rescheduling to next day if it's too late to send on scheduled day
 * @apiBody {Number} [triggers.delay] [only for event, cohort triggers] Milliseconds to delay sending of event or cohort message
 * @apiBody {Number} [triggers.cap] [only for event, cohort & api triggers] Set maximum number of notifications sent to a particular user
 * @apiBody {Number} [triggers.sleep] [only for event, cohort & api triggers] Set minimum time in ms between two notifications for a particular user (a notification is discarded if it's less than that)
 * @apiBody {String[]} [triggers.events] [only for event trigger] Event keys
 * @apiBody {String[]} [triggers.cohorts] [only for cohort trigger] Cohort ids
 * @apiBody {Boolean} [triggers.entry] [only for cohort trigger] Send on cohort entry (true) or exit (false)
 * @apiBody {Boolean} [triggers.cancels] [only for cohort trigger] A notification is to be discarded if user exits cohort (when entry = true) before notification is sent
 * @apiBody {Object[]} contents Array of contents objects. One content object without "p" & "la" keys is required to be first in the array. Every following content object (index 1 or more) can be with or without p/la keys and override properties set previously.
 * @apiBody {String} [contents.p] Platform this content object applies to
 * @apiBody {String} [contents.la] Language this content is for (2-letter ISO language key)
 * @apiBody {String} [contents.message] Notification message string
 * @apiBody {Object} [contents.messagePers] Notification message personalisation object - a map of indexes within message string to an object with keys: "k" (user property key or event data key), "c" (capitalize custom property value), "f" (fallback value), "t" (type of personalization object, can be one of: "e" for event, "u" for user property, "c" for custom user property, "a" for API variable)
 * @apiBody {String} [contents.title] Notification title string
 * @apiBody {Object} [contents.titlePers] Notification title personalisation object (see contents.messagePers for explanation)
 * @apiBody {String} [contents.sound] Notification sound
 * @apiBody {Number} [contents.badge] Notification badge
 * @apiBody {String} [contents.data] Notification data in JSON format
 * @apiBody {String[]} [contents.extras] Array of extras keys - user profile property keys to send along with notification
 * @apiBody {String} [contents.url] Notification on-tap URL
 * @apiBody {String} [contents.media] Notification media attachment URL
 * @apiBody {String} [contents.mediaMime] Notification media MIME type
 * @apiBody {Object[]} [contents.buttons] Button object array
 * @apiBody {String} [contents.buttons.title] Button title
 * @apiBody {String} [contents.buttons.pers] Button title personalization object (see contents.messagePers for explanation)
 * @apiBody {String} [contents.buttons.url] Button URL
 * @apiBody {Object} [contents.specific] Platform-specific content map, currently supported keys are "subtitle" for iOS & "large_icon" for Android
 */

/**
 * @apiDefine PushMessage
 *
 * @apiSuccess {ObjectID} _id Message ID
 * @apiSuccess {ObjectID} app Application ID
 * @apiSuccess {Boolean} saveResults Store each individual push message result into message_results for debugging
 * @apiSuccess {String[]} platforms Array of platforms to send to
 * @apiSuccess {Number} state Message state, for internal use
 * @apiSuccess {String="created", "inactive", "draft", "scheduled", "sending", "sent", "stopped", "failed"} [status] Message status: "created" is for messages yet to be scheduled (put into queue), "inactive" - cannot be scheduled (approval required for push approver plugin), "draft", "scheduled", "sending", "sent", "stopped" - automated message has been stopped, "failed" - failed to send all notifications
 * @apiSuccess {Object} filter={} User profile filter to limit recipients of this message
 * @apiSuccess {String} [filter.user] JSON with app_usersAPPID collection filter
 * @apiSuccess {String} [filter.drill] Drill plugin filter in JSON format
 * @apiSuccess {ObjectID[]} [filter.geos] Array of geo IDs
 * @apiSuccess {String[]} [filter.geos] Array of cohort IDs
 * @apiSuccess {Object[]} triggers Array of triggers this message should be sent on
 * @apiSuccess {String="plain", "event", "cohort", "api"} triggers.kind Trigger kind: "plain" (send on date), "event" (when user performs event), "cohort" (on cohort entry or exit), "api" (on /push API call)
 * @apiSuccess {Date} triggers.start Campaign start date (epoch or ISO date string)
 * @apiSuccess {Number} [triggers.sctz] [only for plain trigger] Send in users' timezones switch, a number representing message creator offset timezone in minutes (GMT+3 is -180)
 * @apiSuccess {Boolean} [triggers.delayed] [only for plain trigger] Delay audience selection to 5 minutes prior to start date
 * @apiSuccess {Date} [triggers.end] [only for event, cohort & api triggers] Campaign end date (epoch or ISO date string)
 * @apiSuccess {Number} [triggers.time] [only for event, cohort triggers] Time in ms since 00:00 in case event or cohort message is to be sent in users' timezones
 * @apiSuccess {Boolean} [triggers.reschedule] [only for event, cohort triggers] Allow rescheduling to next day if it's too late to send on scheduled day
 * @apiSuccess {Number} [triggers.delay] [only for event, cohort triggers] Milliseconds to delay sending of event or cohort message
 * @apiSuccess {Number} [triggers.cap] [only for event, cohort & api triggers] Set maximum number of notifications sent to a particular user
 * @apiSuccess {Number} [triggers.sleep] [only for event, cohort & api triggers] Set minimum time in ms between two notifications for a particular user (a notification is discarded if it's less than that)
 * @apiSuccess {String[]} [triggers.events] [only for event trigger] Event keys
 * @apiSuccess {String[]} [triggers.cohorts] [only for cohort trigger] Cohort ids
 * @apiSuccess {Boolean} [triggers.entry] [only for cohort trigger] Send on cohort entry (true) or exit (false)
 * @apiSuccess {Boolean} [triggers.cancels] [only for cohort trigger] A notification is to be discarded if user exits cohort (when entry = true) before notification is sent
 * @apiSuccess {Object[]} contents Array of contents objects. One content object without "p" & "la" keys is required to be first in the array. Every following content object (index 1 or more) can be with or without p/la keys and override properties set previously.
 * @apiSuccess {String} [contents.p] Platform this content object applies to
 * @apiSuccess {String} [contents.la] Language this content is for (2-letter ISO language key)
 * @apiSuccess {String} [contents.message] Notification message string
 * @apiSuccess {Object} [contents.messagePers] Notification message personalisation object - a map of indexes within message string to an object with keys: "k" (user property key or event data key), "c" (capitalize custom property value), "f" (fallback value), "t" (type of personalization object, can be one of: "e" for event, "u" for user property, "c" for custom user property, "a" for API variable)
 * @apiSuccess {String} [contents.title] Notification title string
 * @apiSuccess {Object} [contents.titlePers] Notification title personalisation object (see contents.messagePers for explanation)
 * @apiSuccess {String} [contents.sound] Notification sound
 * @apiSuccess {Number} [contents.badge] Notification badge
 * @apiSuccess {String} [contents.data] Notification data in JSON format
 * @apiSuccess {String[]} [contents.extras] Array of extras keys - user profile property keys to send along with notification
 * @apiSuccess {String} [contents.url] Notification on-tap URL
 * @apiSuccess {String} [contents.media] Notification media attachment URL
 * @apiSuccess {String} [contents.mediaMime] Notification media MIME type
 * @apiSuccess {Object[]} [contents.buttons] Button object array
 * @apiSuccess {String} [contents.buttons.title] Button title
 * @apiSuccess {String} [contents.buttons.pers] Button title personalization object (see contents.messagePers for explanation)
 * @apiSuccess {String} [contents.buttons.url] Button URL
 * @apiSuccess {Object} [contents.specific] Platform-specific content map, currently supported keys are "subtitle" for iOS & "large_icon" for Android
 * @apiSuccess {Object} result Notification sending result
 * @apiSuccess {Object} [result.total] Total number of push notifications
 * @apiSuccess {Object} [result.processed] Number notifications processed so far
 * @apiSuccess {Object} [result.sent] Number notifications sent successfully
 * @apiSuccess {Object} [result.actioned] Number notifications with positive user reactions (notification taps & button clicks)
 * @apiSuccess {Object} [result.failed] Number notifications which weren't sent due to various errors
 * @apiSuccess {Object[]} [result.lastErrors] Array of last 10 errors
 * @apiSuccess {Object[]} [result.lastRuns] Array of last 10 sending runs
 * @apiSuccess {Date} [result.next] Next sending date
 * @apiSuccess {Object} [result.subs] Sub results - a map of subresult key to Result object. Subresults are used to store platform and locale specific results.
 * @apiSuccess {Object} info Info object - extra information about the message
 * @apiSuccess {String} [info.title] Message title
 * @apiSuccess {String} [info.appName] Application name
 * @apiSuccess {Boolean} [info.silent] UI switch to show the message as silent (data only)
 * @apiSuccess {Boolean} [info.scheduled] UI switch to show the message as scheduled for later as opposed to sending when it was created
 * @apiSuccess {Object} [info.locales] UI object containing user distribution across multiple locales
 * @apiSuccess {Date} info.created Date when the message was created
 * @apiSuccess {String} info.createdBy ID of user who created the message
 * @apiSuccess {String} info.createdByName Name of user who created the message
 * @apiSuccess {Date} [info.updated] Date when the message was updated last
 * @apiSuccess {String} [info.updatedBy] ID of user who updated the message last
 * @apiSuccess {String} [info.updatedByName] Name of user who updated the message last
 * @apiSuccess {Date} [info.removed] Date when the message was removed
 * @apiSuccess {String} [info.removedBy] ID of user who removed the message
 * @apiSuccess {String} [info.removedByName] Name of user who removed the message
 * @apiSuccess {Date} [info.approved] Date when the message was approved
 * @apiSuccess {String} [info.approvedBy] ID of user who approved the message
 * @apiSuccess {String} [info.approvedByName] Name of user who approved the message
 * @apiSuccess {Date} [info.rejectedAt] Date when the message was rejected
 * @apiSuccess {String} [info.rejectedBy] ID of user who rejected the message
 * @apiSuccess {String} [info.rejectedByName] Name of user who rejected the message
 * @apiSuccess {Date} [info.started] Date when the message was started sending
 * @apiSuccess {Date} [info.startedLast] Date when the message was started sending last time
 * @apiSuccess {Date} [info.finished] Date when the message was finished sending
 * @apiSuccess {Boolean} [info.demo] Whether the message was created using populator plugin
 */

module.exports = PUSH;