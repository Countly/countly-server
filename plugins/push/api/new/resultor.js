/**
 * @typedef {import('./types/queue.ts').ResultEvent} ResultEvent
 * @typedef {import('./types/message.ts').Result} Result
 * @typedef {import("mongodb").Db} MongoDb
 * @typedef {import("mongodb").AnyBulkWriteOperation} AnyBulkWriteOperation
 * @typedef {import("mongodb").BulkWriteResult} BulkWriteResult
 * @typedef {import("mongodb").SetFields<{[key: string]: any}>} SetFields
 * @typedef {import('./types/utils.ts').LogObject} LogObject
 * @typedef {import('./types/message.js').PlatformKeys} PlatformKeys
 * @typedef {"total"|"sent"|"errored"|"actioned"} Stat
 */

const { ObjectId } = require("mongodb");
const { InvalidDeviceToken } = require('./lib/error.js');

/** @type {LogObject} */
const log = require('../../../../api/utils/common').log('push:resultor');

/** @type {Stat[]} */
const STAT_KEYS = ["total", "sent", "errored", "actioned"];

/**
 * @param {MongoDb} db
 * @param {ResultEvent[]} results
 */
async function saveResults(db, results) {
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
        /** @type {"total"|"sent"|"errored"|"actioned"} */
        let stat = "sent";
        /** @type {string|undefined} */
        let error = undefined;
        if (result.error) {
            stat = "errored";
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
        log.e("Error while updating meta results", error);
    }
}

/**
 * Clears all tokens from push_{appId} collection filtered by its app id,
 * user id, platform and environment. Also unsets the token property
 * (eg: "tkap" for an android production token) from app_users{appId} collection.
 * This should be ran after receving an InvalidDeviceToken error from the
 * provider during PushEvent processing.
 * @param {MongoDb} db
 * @param {{appId: string; uid: string; platformAndEnv: string;}[]} invalidTokens
 * @returns {Promise<BulkWriteResult[]|undefined>}
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
                        _id: { $in: mappedUserIds[appId][platformAndEnv] }
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
 * @param {MongoDb} db
 * @param {ResultEvent[]} sentPushEvents
 * @returns {Promise<BulkWriteResult[]|undefined>}
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
                    filter: { _id: { $in: mappedUserIds[appId][messageId] } },
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
 * @param {Result} result
 * @param {{[key: string]: number}} query
 * @param {string} path
 * @returns {{[key: string]: number}}
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
 * @param {MongoDb} db
 * @param {ObjectId} scheduleId
 * @param {ObjectId} messageId
 * @param {Result} resultObject
 */
async function applyResultObject(db, scheduleId, messageId, resultObject) {
    const $inc = buildUpdateQueryForResult(resultObject);
    await db.collection("message_schedules")
        .updateOne({ _id: scheduleId }, { $inc });
    await db.collection("messages")
        .updateOne({ _id: messageId }, { $inc });
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
