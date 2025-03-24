/**
 * @typedef {import('./types/queue.ts').ResultEvent} ResultEvent
 * @typedef {import('./types/queue.ts').ResultError} ResultError
 * @typedef {import('./types/message.ts').Result} Result
 * @typedef {import("mongodb").Db} MongoDb
 * @typedef {import("mongodb").AnyBulkWriteOperation} AnyBulkWriteOperation
 * @typedef {import("mongodb").BulkWriteResult} BulkWriteResult
 * @typedef {import('./types/utils.ts').LogObject} LogObject
 * @typedef {import('./types/message.js').PlatformEnvKeys} PlatformEnvKeys
 * @typedef {import('./types/message.js').PlatformKeys} PlatformKeys
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

        // clean up the relevant information of invalid tokens in app_users{appId} and push_{appId}
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

        // record [CLY]_push_sent events into drill
        await sendResultsToDrill(db, results);
    }
    catch (error) {
        log.e("Error while updating meta results", error);
    }
}

/**
 * @param {MongoDb} db
 * @param {{appId: string; uid: string; platformAndEnv: string;}[]} invalidTokens
 * @returns {Promise<BulkWriteResult[]|undefined>}
 */
async function clearInvalidTokens(db, invalidTokens) {
    /** @type {{[appId: string]: { [platformAndEnv: string]: string[] }}} */
    const mappedUserIds = {};
    /** @type {{[collection: string]: AnyBulkWriteOperation[]}} */
    const bulkWrites = {};

    for (const invalidToken of invalidTokens) {
        const { appId, uid, platformAndEnv } = invalidToken;
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
 * @param {MongoDb} db
 * @param {ResultEvent[]} results
 */
async function recordSentDates(db, results) {
    const sentMessages = results.filter(result => !result.error);
    /** @type {{[appId: string]: { [messageId: string]: string[] }}} */
    const mappedUserIds = {};
}

/**
 * @param {MongoDb} db
 * @param {ResultEvent[]} results
 */
async function sendResultsToDrill(db, results) {

}

module.exports = {
    saveResults
}
