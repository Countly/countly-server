/**
 * @typedef {import('./types/queue.ts').ResultEvent} ResultEvent
 * @typedef {import('./types/queue.ts').ScheduleEvent} ScheduleEvent
 * @typedef {import('./types/message.ts').Result} Result
 * @typedef {import("mongodb").Db} MongoDb
 * @typedef {import("mongodb").AnyBulkWriteOperation} AnyBulkWriteOperation
 * @typedef {import("mongodb").BulkWriteResult} BulkWriteResult
 * @typedef {import("mongodb").SetFields<{[key: string]: any}>} SetFields
 * @typedef {import('./types/message.ts').PlatformKey} PlatformKey
 * @typedef {import('./types/schedule.ts').Schedule} Schedule
 * @typedef {"total"|"sent"|"failed"|"actioned"} Stat
 */

const { ObjectId } = require("mongodb");
const { InvalidDeviceToken } = require('./lib/error.js');
const { updateInternalsWithResults, sanitizeMongoPath } = require("./lib/utils.js");
const log = require('../../../../api/utils/common').log('push:resultor');
/** @type {Stat[]} */
const STAT_KEYS = ["total", "sent", "failed", "actioned"];

/**
 * Processes the given results, updates the relevant Schedule and Message
 * documents, saves the results into message_results collection, clears
 * invalid tokens from app_users{appId} and push_{appId} collections and
 * records sent dates into push_{appId} collections.
 * @param {MongoDb} db - MongoDB database instance
 * @param {ResultEvent[]} results - Array of result events to process
 * @returns {Promise<void>}
 */
async function saveResults(db, results) {
    try {
        updateInternalsWithResults(results, log);
    }
    catch (error) {
        console.error(error);
        log.e("Error while updating internals with results", results, error);
    }

    /** @type {{[scheduleId: string]: { resultObject: Result; messageId: ObjectId; }}} */
    const scheduleMap = {};
    for (let i = 0; i < results.length; i++) {
        const result = results[i];
        const scheduleId = result.scheduleId.toString();
        if (!(scheduleId in scheduleMap)) {
            scheduleMap[scheduleId] = {
                resultObject: buildResultObject(),
                messageId: result.messageId
            };
        }
        /** @type {"total"|"sent"|"failed"|"actioned"} */
        let stat = "sent";
        /** @type {string|undefined} */
        let error = undefined;
        if (result.error) {
            stat = "failed";
            error = result.error.name + ": " + result.error.message;
        }
        increaseResultStat(
            scheduleMap[scheduleId].resultObject,
            result.platform,
            result.language,
            stat,
            error
        );
    }

    // update Schedule (message_schedules) and Message (messages) documents
    for (const scheduleIdStr in scheduleMap) {
        const { resultObject, messageId } = scheduleMap[scheduleIdStr];
        const scheduleId = new ObjectId(scheduleIdStr);
        await applyResultObject(db, scheduleId, messageId, resultObject);
    }

    // if something fails after this line, we ignore it to avoid consuming the same events again
    try {
        // insert the results into message_results
        const resultsToKeep = results.filter(result => result.saveResult);
        if (resultsToKeep.length) {
            await db.collection("message_results")
                .insertMany(resultsToKeep);
        }
        // clean up the relevant information of invalid tokens inside
        // app_users{appId} and push_{appId}
        const tokenError = new InvalidDeviceToken("Adhoc error");
        const invalidTokens = results
            .filter(r => r.error?.name === tokenError.name)
            .map(r => ({
                appId: r.appId.toString(),
                uid: r.uid,
                platformAndEnv: r.platform + r.env
            }));
        if (invalidTokens.length) {
            await clearInvalidTokens(db, invalidTokens);
        }
        // save sent date into the relevant document inside push_{appId} documents
        const sentResults = results.filter(({ error }) => !error);
        await recordSentDates(db, sentResults);
        // TODO: record [CLY]_push_sent events
    }
    catch (error) {
        log.e("Error while updating meta results", results, error);
    }
}

/**
 * Clears all tokens from push_{appId} collection filtered by its app id,
 * user id, platform and environment. Also unsets the token property
 * (eg: "tkap" for an android production token) from app_users{appId} collection.
 * This should be ran after receving an InvalidDeviceToken error from the
 * provider during PushEvent processing.
 * @param {MongoDb} db - MongoDB database instance
 * @param {{appId: string; uid: string; platformAndEnv: string;}[]} invalidTokens - Array of invalid tokens to clear
 * @returns {Promise<BulkWriteResult[]|undefined>} Promise resolving to the result of bulk write operations
 */
async function clearInvalidTokens(db, invalidTokens) {
    /** @type {{[appId: string]: { [platformAndEnv: string]: string[] }}} */
    const mappedUserIds = {};
    /** @type {{[collection: string]: AnyBulkWriteOperation[]}} */
    const bulkWrites = {};
    for (let i = 0; i < invalidTokens.length; i++) {
        const { appId, uid, platformAndEnv } = invalidTokens[i];
        if (!(appId in mappedUserIds)) {
            mappedUserIds[appId] = {};
        }
        if (!(platformAndEnv in mappedUserIds[appId])) {
            mappedUserIds[appId][platformAndEnv] = [];
        }
        mappedUserIds[appId][platformAndEnv].push(uid);
    }
    for (const appId in mappedUserIds) {
        const pushCollectionName = "push_" + appId;
        const appUsersCollectionName = "app_users" + appId;
        if (!(pushCollectionName in bulkWrites)) {
            bulkWrites[pushCollectionName] = [];
        }
        if (!(appUsersCollectionName in bulkWrites)) {
            bulkWrites[appUsersCollectionName] = [];
        }
        for (const platformAndEnv in mappedUserIds[appId]) {
            bulkWrites[pushCollectionName].push({
                updateMany: {
                    filter: {
                        _id: {
                            // this is actualy an array of strings (user ids are not ObjectId)
                            // but to overcome the type error, we cast it to ObjectId[]
                            $in: /** @type {ObjectId[]} */(
                                /** @type {unknown} */(mappedUserIds[appId][platformAndEnv])
                            )
                        }
                    },
                    update: {
                        $unset: { ["tk." + platformAndEnv]: 1 }
                    }
                }
            });
            bulkWrites[appUsersCollectionName].push({
                updateMany: {
                    filter: {
                        uid: { $in: mappedUserIds[appId][platformAndEnv] }
                    },
                    update: {
                        $unset: { ["tk" + platformAndEnv]: 1 }
                    }
                }
            });
        }
    }
    const promises = [];
    for (const collectionName in bulkWrites) {
        promises.push(
            db.collection(collectionName).bulkWrite(bulkWrites[collectionName])
        );
    }
    return Promise.all(promises);
}

/**
 * Records sent dates for the given PushEvents into push_{appId}
 * collection (msg property).
 * example document from push_{appId}:
 * {
 *   _id: "123",
 *   msg: {
 *     "67bc694e4f89382bb2dcea5c": [1740400976395]
 *     "67bcd5736cb172aa14cfdea0": [1740428661597, 1740400976395]
 *   },
 *   tk: {
 *     id: "ios development token"
 *   }
 * }
 * @param {MongoDb} db - MongoDB database instance
 * @param {ResultEvent[]} sentPushEvents - Array of sent push events
 * @param {number=} date - Date to record as sent date (default: current date
 * @returns {Promise<BulkWriteResult[]|undefined>} Promise resolving to the result of bulk write operations
 */
async function recordSentDates(db, sentPushEvents, date = Date.now()) {
    /** @type {{[appId: string]: { [messageId: string]: string[] }}} */
    const mappedUserIds = {};
    /** @type {{[collection: string]: AnyBulkWriteOperation[]}} */
    const bulkWrites = {};

    for (let i = 0; i < sentPushEvents.length; i++) {
        const { appId: _appId, messageId: _messageId, uid } = sentPushEvents[i];
        const appId = _appId.toString();
        const messageId = _messageId.toString();
        if (!(appId in mappedUserIds)) {
            mappedUserIds[appId] = {};
        }
        if (!(messageId in mappedUserIds[appId])) {
            mappedUserIds[appId][messageId] = [];
        }
        mappedUserIds[appId][messageId].push(uid);
    }

    for (const appId in mappedUserIds) {
        const collectionName = "push_" + appId;
        if (!(collectionName in bulkWrites)) {
            bulkWrites[collectionName] = [];
        }
        for (const messageId in mappedUserIds[appId]) {
            bulkWrites[collectionName].push({
                updateMany: {
                    filter: {
                        _id: {
                            // this is actualy an array of strings (user ids are not ObjectId)
                            // but to overcome the type error, we cast it to ObjectId[]
                            $in: /** @type {ObjectId[]} */(
                                /** @type {unknown} */(mappedUserIds[appId][messageId])
                            )
                        }
                    },
                    update: {
                        $addToSet: /** @type {SetFields} */({
                            ['msgs.' + messageId]: date
                        })
                    }
                }
            });
        }
    }

    const promises = [];
    for (const collectionName in bulkWrites) {
        promises.push(
            db.collection(collectionName).bulkWrite(bulkWrites[collectionName])
        );
    }
    return Promise.all(promises);
}

/**
 * Builds and returns a new Result object with all stats initialized to zero
 * and empty errors and sub results.
 * @returns {Result} New Result object
 */
function buildResultObject() {
    return {
        total: 0,
        sent: 0,
        failed: 0,
        actioned: 0,
        errors: {},
        subs: {},
    }
}

/**
 * Increases the specified stat in the given Result object and its
 * sub-results for the specified platform and language. If the stat is "failed",
 * it also increments the count for the given error message in the errors object.
 * If the platform or language sub-results do not exist, they are created.
 * @param {Result} resultObject - The Result object to update
 * @param {PlatformKey} platform - The platform key (e.g., "i", "a", "h")
 * @param {string} language - The language code (e.g., "en")
 * @param {Stat} stat - The stat to increase ("total", "sent", "failed", or "actioned")
 * @param {string=} error - The error message (required if stat is "failed")
 * @param {number=} amount - The amount to increase the stat by (default is 1)
 * @returns {void}
 */
function increaseResultStat(
    resultObject,
    platform,
    language,
    stat,
    error,
    amount = 1
) {
    if (!resultObject.subs) {
        resultObject.subs = {};
    }
    if (!(platform in resultObject.subs)) {
        resultObject.subs[platform] = buildResultObject();
    }
    if (!resultObject.subs[platform].subs) {
        resultObject.subs[platform].subs = {};
    }
    if (!(language in resultObject.subs[platform].subs)) {
        resultObject.subs[platform].subs[language] = buildResultObject();
    }
    resultObject[stat] += amount;
    resultObject.subs[platform][stat] += amount;
    resultObject.subs[platform].subs[language][stat] += amount;
    if (stat === "failed" && typeof error === "string") {
        const errorKey = sanitizeMongoPath(error);
        if (!(errorKey in resultObject.errors)) {
            resultObject.errors[errorKey] = 0;
        }
        if (!(errorKey in resultObject.subs[platform].errors)) {
            resultObject.subs[platform].errors[errorKey] = 0;
        }
        if (!(errorKey in resultObject.subs[platform].subs[language].errors)) {
            resultObject.subs[platform].subs[language].errors[errorKey] = 0;
        }
        resultObject.errors[errorKey] += amount;
        resultObject.subs[platform].errors[errorKey] += amount;
        resultObject.subs[platform].subs[language].errors[errorKey] += amount;
    }
}

/**
 * Recursively builds an update query object for MongoDB to increment
 * the stats and errors of the given Result object and its sub-results.
 * The query object can be used with the $inc operator in an update operation.
 * @param {Result} result - The Result object to build the query from
 * @param {{[key: string]: number}} query - The query object to populate (default is an empty object)
 * @param {string} path - The current path in the Result object (default is "result")
 * @returns {{[key: string]: number}} The populated query object
 */
function buildUpdateQueryForResult(result, query = {}, path = "result") {
    for (let i = 0; i < STAT_KEYS.length; i++) {
        const stat = STAT_KEYS[i];
        query[path + "." + stat] = result[stat];
    }
    for (const error in result.errors) {
        query[path + ".errors." + error] = result.errors[error];
    }
    for (const sub in result.subs) {
        buildUpdateQueryForResult(
            result.subs[sub],
            query,
            path + ".subs." + sub
        );
    }
    return query;
}

/**
 * Applies the given Result object to the Schedule and Message documents
 * identified by the provided scheduleId and messageId. It updates the stats
 * in the Result object, appends any provided events to the Schedule's events,
 * and updates the Schedule's status based on the progress of scheduled and
 * composed events.
 * @param {MongoDb} db - MongoDB database instance
 * @param {ObjectId} scheduleId - The ID of the Schedule document to update
 * @param {ObjectId} messageId - The ID of the Message document to update
 * @param {Result} resultObject - The Result object containing stats to apply
 * @param {{scheduled?: ScheduleEvent[]; composed?: ScheduleEvent[];}=} events - Optional events to append to the Schedule's events
 * @returns {Promise<void>} Promise that resolves when the operation is complete
 */
async function applyResultObject(db, scheduleId, messageId, resultObject, events) {
    // update the result object
    const $inc = buildUpdateQueryForResult(resultObject);
    // update the events object (only for schedule)
    /** @type {{[key: string]: any}=} */
    let $push;
    if (events) {
        $push = {};
        const entries = Object.entries(events);
        for (const [key, value] of entries) {
            /** @type {Schedule["events"]["composed"]} */
            const occuredEvent = value.map(({ timezone, scheduledTo }) => ({
                timezone,
                scheduledTo,
                date: new Date
            }))
            $push["events." + key] = { $each: occuredEvent };
        }
    }
    await db.collection("message_schedules")
        .updateOne({ _id: scheduleId }, $push ? { $inc, $push } : { $inc });
    await db.collection("messages")
        .updateOne({ _id: messageId }, { $inc });
    // set status of the schedule: "sending".
    await db.collection("message_schedules").updateOne({
        _id: scheduleId,
        // there's at least one scheduled event:
        "events.scheduled.0": { $exists: true },
        // not all schedules are composed:
        $expr: {
            $ne: [
                { $size: "$events.scheduled" },
                { $size: "$events.composed" }
            ]
        }
    }, {
        $set: { status: "sending" }
    });
    // set status of the schedule: "sent" or "failed".
    await db.collection("message_schedules").updateOne({
        _id: scheduleId,
        // all schedules are composed:
        $expr: {
            $eq: [
                { $size: "$events.scheduled" },
                { $size: "$events.composed" }
            ]
        }
    }, [{
        $set: { // sum of sent and failed are equal to total
            status: {
                $cond: [
                    {
                        $eq: [
                            "$result.total",
                            { $add: ["$result.sent", "$result.failed"] }
                        ]
                    },
                    "sent",
                    "sending"
                ]
            }
        }
    }, {
        $set: { // failed is equal to total (all of the messages are failed)
            status: {
                $cond: [
                    { $eq: ["$result.total", "$result.failed"] },
                    "failed",
                    "$status"
                ]
            }
        }
    }]);
}

module.exports = {
    STAT_KEYS,
    saveResults,
    clearInvalidTokens,
    recordSentDates,
    buildResultObject,
    buildUpdateQueryForResult,
    increaseResultStat,
    applyResultObject,
}
