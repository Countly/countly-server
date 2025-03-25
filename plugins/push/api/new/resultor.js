/**
 * @typedef {import('./types/queue.ts').ResultEvent} ResultEvent
 * @typedef {import('./types/queue.ts').ResultError} ResultError
 * @typedef {import('./types/message.ts').Result} Result
 * @typedef {import("mongodb").Db} MongoDb
 * @typedef {import("mongodb").AnyBulkWriteOperation} AnyBulkWriteOperation
 * @typedef {import("mongodb").BulkWriteResult} BulkWriteResult
 * @typedef {import("mongodb").SetFields<{[key: string]: any}>} SetFields
 * @typedef {import('./types/utils.ts').LogObject} LogObject
 * @typedef {import('./types/message.js').PlatformEnvKeys} PlatformEnvKeys
 * @typedef {import('./types/message.js').PlatformKeys} PlatformKeys
 * @typedef {import('./types/message.js').AutoTrigger} AutoTrigger
 */

const { updateScheduleResults, buildResultObject, increaseResultStat } = require("../../api/new/lib/result.js");
const { ObjectId } = require("mongodb");
const { InvalidDeviceToken } = require('./lib/error.js');
/** @type {LogObject} */
const log = require('../../../../api/utils/common').log('push:resultor');

/**
 * @param {MongoDb} db
 * @param {ResultEvent[]} results
 */
async function saveResults(db, results) {
    /** @type {{[scheduleId: string]: Result}} */
    const scheduleMap = {};
    for (let i = 0; i < results.length; i++) {
        const result = results[i];
        const scheduleId = result.scheduleId.toString();
        if (!(scheduleId in scheduleMap)) {
            scheduleMap[scheduleId] = buildResultObject();
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
            scheduleMap[scheduleId],
            result.platform,
            result.language,
            stat,
            error
        );
    }

    // update Schedule (message_schedules) and Message (messages) documents
    for (const scheduleId in scheduleMap) {
        const resultObject = scheduleMap[scheduleId];
        await updateScheduleResults(db, new ObjectId(scheduleId), resultObject);
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
        for (const messageId in mappedUserIds) {
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

module.exports = {
    saveResults
}
