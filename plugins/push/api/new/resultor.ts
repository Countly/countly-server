import { ObjectId } from "mongodb";
import type { Db, AnyBulkWriteOperation, BulkWriteResult, SetFields } from "mongodb";
import type { ResultEvent } from "./types/queue.ts";
import type { Result, PlatformKey } from "./types/message.ts";
import { InvalidDeviceToken } from "./lib/error.ts";
import { updateInternalsWithResults, sanitizeMongoPath } from "./lib/utils.ts";

import { createRequire } from 'module';

// createRequire needed for CJS modules without ES exports
const require = createRequire(import.meta.url);
const log: import('../../../../types/log.d.ts').Logger = require('../../../../api/utils/common').log('push:resultor');

type Stat = "total" | "sent" | "failed" | "actioned";

interface InvalidTokenInfo {
    appId: string;
    uid: string;
    platformAndEnv: string;
}

interface StatIncrementQuery {
    [key: string]: number;
}

export const STAT_KEYS: Stat[] = ["total", "sent", "failed", "actioned"];

/**
 * Processes the given results, updates the relevant Schedule and Message
 * documents, saves the results into message_results collection, clears
 * invalid tokens from app_users{appId} and push_{appId} collections and
 * records sent dates into push_{appId} collections.
 */
export async function saveResults(db: Db, results: ResultEvent[]): Promise<void> {
    try {
        updateInternalsWithResults(results, log);
    }
    catch (error) {
        log.e("Error while updating internals with results", results, error);
    }

    const scheduleMap: { [scheduleId: string]: { resultObject: Result; messageId: ObjectId } } = {};
    for (let i = 0; i < results.length; i++) {
        const result = results[i];
        const scheduleId = result.scheduleId.toString();
        if (!(scheduleId in scheduleMap)) {
            scheduleMap[scheduleId] = {
                resultObject: buildResultObject(),
                messageId: result.messageId
            };
        }
        let stat: Stat = "sent";
        let error: string | undefined = undefined;
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
        const invalidTokens: InvalidTokenInfo[] = results
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
 */
export async function clearInvalidTokens(db: Db, invalidTokens: InvalidTokenInfo[]): Promise<BulkWriteResult[] | undefined> {
    const mappedUserIds: { [appId: string]: { [platformAndEnv: string]: string[] } } = {};
    const bulkWrites: { [collection: string]: AnyBulkWriteOperation[] } = {};
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
                            $in: mappedUserIds[appId][platformAndEnv] as unknown as ObjectId[]
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
    const promises: Promise<BulkWriteResult>[] = [];
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
 */
export async function recordSentDates(db: Db, sentPushEvents: ResultEvent[], date: number = Date.now()): Promise<BulkWriteResult[] | undefined> {
    const mappedUserIds: { [appId: string]: { [messageId: string]: string[] } } = {};
    const bulkWrites: { [collection: string]: AnyBulkWriteOperation[] } = {};

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
                            $in: mappedUserIds[appId][messageId] as unknown as ObjectId[]
                        }
                    },
                    update: {
                        $addToSet: {
                            ['msgs.' + messageId]: date
                        } as SetFields<{ [key: string]: any }>
                    }
                }
            });
        }
    }

    const promises: Promise<BulkWriteResult>[] = [];
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
 */
export function buildResultObject(): Result {
    return {
        total: 0,
        sent: 0,
        failed: 0,
        actioned: 0,
        errors: {},
        subs: {},
    };
}

/**
 * Increases the specified stat in the given Result object and its
 * sub-results for the specified platform and language.
 */
export function increaseResultStat(
    resultObject: Result,
    platform: PlatformKey,
    language: string,
    stat: Stat,
    error?: string,
    amount: number = 1
): void {
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
 */
export function buildUpdateQueryForResult(result: Result, query: StatIncrementQuery = {}, path: string = "result"): StatIncrementQuery {
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
 * identified by the provided scheduleId and messageId.
 */
export async function applyResultObject(db: Db, scheduleId: ObjectId, messageId: ObjectId, resultObject: Result): Promise<void> {
    // update the result object
    const $inc = buildUpdateQueryForResult(resultObject);
    await db.collection("message_schedules")
        .updateOne({ _id: scheduleId }, { $inc });
    await db.collection("messages")
        .updateOne({ _id: messageId }, { $inc });

    // set status of the schedule: "sending".
    await db.collection("message_schedules").updateOne({
        _id: scheduleId,
        // not all schedules are composed:
        $and: [
            { "events.status": "composed" },
            { "events.status": "scheduled" }
        ],
    }, {
        $set: { status: "sending" }
    });

    // set status of the schedule: "sent" or "failed".
    await db.collection("message_schedules").updateOne({
        _id: scheduleId,
        // all schedules are composed:
        "events.status": { $ne: "scheduled" }
    }, [{
        $set: { // sum of sent and failed are equal to total
            status: {
                $cond: {
                    if: {
                        $lte: [
                            "$result.total",
                            { $add: ["$result.sent", "$result.failed"] }
                        ]
                    },
                    then: "sent",
                    else: "sending"
                }
            }
        }
    }, {
        $set: { // failed is equal to total (all of the messages are failed)
            status: {
                $cond: {
                    if: { $lte: ["$result.total", "$result.failed"] },
                    then: "failed",
                    else: "$status"
                }
            }
        }
    }]);
}
