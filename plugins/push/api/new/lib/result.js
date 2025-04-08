/**
 * @typedef {import('../types/queue.ts').ScheduleEvent} ScheduleEvent
 * @typedef {import('../types/message.ts').PlatformKeys} PlatformKeys
 * @typedef {import('../types/message.js').Result} Result
 * @typedef {import('../types/message.js').Message} Message
 * @typedef {import('../types/schedule.js').Schedule} Schedule
 * @typedef {import("mongodb").Db} MongoDb
 * @typedef {import("mongodb").ObjectId} ObjectId
 * @typedef {import('../types/utils.ts').LogObject} LogObject
 * @typedef {"total"|"sent"|"errored"|"actioned"} Stat
 */

/** @type {LogObject} */
const log = require('../../../../../api/utils/common').log('push:result');

/** @type {Stat[]} */
const statKeys = ["total", "sent", "errored", "actioned"];

/**
 * @returns {Result}
 */
function buildResultObject() {
    return {
        total: 0,
        sent: 0,
        errored: 0,
        actioned: 0,
        errors: {},
        subs: {},
    }
}

/**
 * @param {Result} resultObject
 * @param {PlatformKeys} platform
 * @param {string} language
 * @param {Stat} stat
 * @param {string=} error
 * @param {number=} amount
 */
function increaseResultStat(
    resultObject,
    platform,
    language,
    stat,
    error,
    amount = 1
) {
    if (!(platform in resultObject.subs)) {
        resultObject.subs[platform] = buildResultObject();
    }
    if (!(language in resultObject.subs[platform].subs)) {
        resultObject.subs[platform].subs[language] = buildResultObject();
    }
    resultObject[stat] += amount;
    resultObject.subs[platform][stat] += amount;
    resultObject.subs[platform].subs[language][stat] += amount;

    if (stat === "errored" && typeof error === "string") {
        if (!(error in resultObject.errors)) {
            resultObject.errors[error] = 0;
        }
        if (!(error in resultObject.subs[platform].errors)) {
            resultObject.subs[platform].errors[error] = 0;
        }
        if (!(error in resultObject.subs[platform].subs[language].errors)) {
            resultObject.subs[platform].subs[language].errors[error] = 0;
        }
        resultObject.errors[error] += amount;
        resultObject.subs[platform].errors[error] += amount;
        resultObject.subs[platform].subs[language].errors[error] += amount;
    }
}

/**
 * @param {MongoDb} db
 * @param {ObjectId} scheduleId
 * @param {Result} resultObject
 * @returns {Promise<Message?>}
 */
async function updateScheduleResults(db, scheduleId, resultObject) {
    const schedule = /** @type {Schedule?} */(
        await db.collection("message_schedules").findOne({ _id: scheduleId })
    );
    if (!schedule) {
        log.w("Schedule", scheduleId.toString(),
            "is deleted before updating the results");
        return null;
    }
    const message = /** @type {Message?} */(
        await db.collection("messages").findOne({
            _id: schedule.messageId
        })
    );
    if (!message) {
        log.w("Message", schedule.messageId.toString(),
            "is deleted before updating the results");
        return null;
    }
    applyResultRecursively(
        /** @type {{result: Result}} */(message),
        resultObject
    );
    await db.collection("messages").updateOne(
        { _id: schedule.messageId },
        { $set: { result: message.result } }
    );
    applyResultRecursively(
        /** @type {{result: Result}} */(schedule),
        resultObject
    );
    await db.collection("message_schedules").updateOne(
        { _id: schedule._id },
        { $set: { result: schedule.result } }
    );
    return message;
}

/**
 *
 * @param {{[nestedKey: string]: Result}} document
 * @param {Result} resultObject
 * @param {string} key
 */
function applyResultRecursively(document, resultObject, key = "result") {
    if (!document?.[key]) {
        document[key] = resultObject;
    }
    else {
        // apply stats
        for (let i = 0; i < statKeys.length; i++) {
            const stat = statKeys[i];
            if (typeof document[key]?.[stat] !== "number") {
                document[key][stat] = 0;
            }
            document[key][stat] += resultObject[stat];
        }

        // apply errors
        for (const error in resultObject.errors) {
            if (typeof document[key].errors !== "object") {
                document[key].errors = {};
            }
            if (typeof document[key].errors?.[error] !== "number") {
                document[key].errors[error] = 0;
            }
            document[key].errors[error] += resultObject.errors[error];
        }

        // continue for subs
        if (typeof document[key].subs !== "object") {
            document[key].subs = {};
        }
        if (typeof resultObject.subs === "object") {
            for (const subKey in resultObject.subs) {
                applyResultRecursively(
                    document[key].subs,
                    resultObject.subs[subKey],
                    subKey
                );
            }
        }
    }
}

module.exports = {
    buildResultObject,
    increaseResultStat,
    updateScheduleResults,
    applyResultRecursively
}