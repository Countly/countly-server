/**
 * @typedef {import('./types/queue.ts').ResultEvent} ResultEvent
 * @typedef {import('./types/queue.ts').ResultError} ResultError
 * @typedef {import('./types/message.ts').Result} Result
 * @typedef {import("mongodb").Db} MongoDb
 * @typedef {import('./types/utils.ts').LogObject} LogObject
 */

const { updateScheduleResults, buildResultObject, increaseResultStat } = require("../../api/new/lib/result.js");
const { ObjectId } = require("mongodb");
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
        let stat = "errored";
        /** @type {ResultError|undefined} */
        let error = undefined;
        if (result.error) {
            stat = "errored";
            error = result.error;
        }
        else if (result.response) {
            stat = "sent";
            error = undefined;
        }
        else {
            stat = "errored";
            error = "NoResponse";
        }
        increaseResultStat(
            scheduleMap[scheduleId],
            result.platform,
            result.language,
            stat,
            error
        );
    }

    for (const scheduleId in scheduleMap) {
        const resultObject = scheduleMap[scheduleId];
        await updateScheduleResults(db, new ObjectId(scheduleId), resultObject);
    }

    // TODO: make it configurable from settings like it is for push_stats right now
    await db.collection("message_results").insertMany(results);
}


module.exports = {
    saveResults
}
