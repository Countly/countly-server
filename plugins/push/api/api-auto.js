/**
 * @typedef {import("mongodb").Db} MongoDb
 * @typedef {import("mongodb").ObjectId} ObjectId
 */
const common = require('../../../api/utils/common'),
    log = common.log('push:api:auto'),
    logCohorts = log.sub('cohorts'),
    logEvents = log.sub('events');

const { cohortMessageExists, eventMessageExists } = require("./new/lib/message-cache.js");
const { sendAutoTriggerEvents } = require("./new/lib/kafka.js");

/**
 * Handler function for /cohort/enter (/cohort/exit) hooks
 * @param {boolean} entry true if it's cohort enter, false for exit
 * @param {{ app_id: ObjectId; _id: string; name: string; }} cohort cohort object
 * @param {string[]} uids uids array
 */
module.exports.autoOnCohort = async function(entry, cohort, uids) {
    logCohorts.d("processing cohort %s (%s) %s for %d uids",
        cohort._id, cohort.name, entry ? 'enter' : 'exit', uids.length);
    const direction = entry ? "enter" : "exit";
    if (cohortMessageExists(cohort.app_id, cohort._id, direction)) {
        try {
            await sendAutoTriggerEvents([{
                kind: "cohort",
                appId: cohort.app_id,
                uids,
                cohortId: cohort._id,
                direction: entry ? "enter" : "exit",
            }]);
            logCohorts.d("Cohort auto triggers sent", cohort.app_id,
                cohort._id, uids);
        }
        catch (err) {
            logEvents.e("Error while sending auto trigger events", err);
        }
    }
}

/**
 * Stop related auto messages or count them on cohort deletion
 *
 * @param {string} _id cohort id
 * @param {boolean} ack true if stop, false if count
module.exports.autoOnCohortDeletion = async function(_id, ack) {
    if (ack) {
        let msgs = await Message.findMany({'triggers.cohorts': _id, state: {$bitsAnySet: State.Streamable | State.Streaming | State.Paused | State.Scheduling}});
        if (msgs.length) {
            await Promise.all(msgs.map(m => {
                let trigger = m.triggerFind(t => t.kind === TriggerKind.Cohort && t.cohorts.indexOf(_id) !== -1);
                if (trigger) {
                    let audience = new Audience(logCohorts, m);
                    return audience.getApp().then(() => audience.pop(trigger).terminate('Terminated on cohort deletion'));
                }
            }));
        }
    }
    else {
        return await Message.count({'triggers.cohorts': _id, state: {$bitsAnySet: State.Streamable | State.Streaming | State.Paused | State.Scheduling}});
    }

};

*/
/**
 * Handler function for /cohort/enter (/cohort/exit) hooks
 *
 * @param {ObjectId} appId app id
 * @param {string} uid user uid
 * @param {string[]} keys unique event keys
 * @param {{key: string; timestamp?: number;}[]} _events event objects
 */
module.exports.autoOnEvent = async function(appId, uid, keys, _events) {
    logEvents.d('Checking event keys', keys);
    const keySet = Array.from(new Set(keys));
    const filteredKeys = keySet.filter(key => eventMessageExists(appId, key));
    if (filteredKeys.length) {
        try {
            await sendAutoTriggerEvents([{
                kind: "event",
                appId,
                eventKeys: filteredKeys,
                uid,
            }]);
            logEvents.d("Event auto triggers sent", appId, filteredKeys, uid);
        }
        catch (err) {
            logEvents.e("Error while sending auto trigger events", err);
        }
    }
};
