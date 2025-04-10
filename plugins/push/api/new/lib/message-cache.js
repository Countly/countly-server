/**
 * @typedef {import("mongodb").Db} MongoDb
 * @typedef {import("mongodb").ObjectId} ObjectId
 * @typedef {import('../types/utils.ts').LogObject} LogObject
 */

/** @type {{db: MongoDb; log: (name: string) => LogObject }} */
const common = require("../../../../../api/utils/common");
const log = common.log("push:api:cache");

/** @type {{
    [appId: string]: {
        event: { [eventKey: string]: string[] };
        cohort: { [cohortId: string]: { enter: string[]; exit: string[]; } };
        api: string[]
    }
}} */
let AUTO_AND_API_MESSAGES = {};
const { INACTIVE_MESSAGE_STATUSES } = require("../scheduler.js");

async function loadAutoAndAPIMessages() {
    const now = new Date;
    const messages = await common.db.collection("messages")
        .find({
            status: { $nin: INACTIVE_MESSAGE_STATUSES },
            triggers: {
                $elemMatch: {
                    kind: { $in: ["cohort", "event", "api"] },
                    start: { $lt: now },
                    $or: [
                        { end: { $exists: false } },
                        { end: { $gt: now } },
                    ],
                }
            }
        })
        .limit(1000)
        .toArray();

    AUTO_AND_API_MESSAGES = {};
    for (let i = 0; i < messages.length; i++) {
        const appId = messages[i].app.toString();
        if (!(appId in AUTO_AND_API_MESSAGES)) {
            AUTO_AND_API_MESSAGES[appId] = {event: {}, cohort: {}, api: []};
        }
        try {
            const trigger = messages[i].triggers[0];
            if (trigger.kind === "cohort") {
                const cache = AUTO_AND_API_MESSAGES[appId][/** @type {"cohort"} */(trigger.kind)];
                for (let j = 0; j < trigger.cohorts.length; j++) {
                    const direction = trigger.entry ? "enter" : "exit";
                    const cohortId = trigger.cohorts[j];
                    if (!(cohortId in cache)) {
                        cache[cohortId] = { enter: [], exit: [] };
                    }
                    cache[cohortId][direction].push(messages[i]._id.toString());
                }
            }
            else if (trigger.kind === "event") {
                const cache = AUTO_AND_API_MESSAGES[appId][/** @type {"event"} */(trigger.kind)];
                for (let j = 0; j < trigger.events.length; j++) {
                    const eventKey = trigger.events[j];
                    if (!(eventKey in cache)) {
                        cache[eventKey] = [];
                    }
                    cache[eventKey].push(messages[i]._id.toString());
                }
            }
            else if (trigger.kind === "api") {
                const cache = AUTO_AND_API_MESSAGES[appId][/** @type {"api"} */(trigger.kind)];
                if (!cache.includes(messages[i]._id.toString())) {
                    cache.push(messages[i]._id.toString());
                }
            }
        }
        catch (err) {
            log.e("Malformed message", err);
            // do nothing...
        }
    }
}
setInterval(
    loadAutoAndAPIMessages,
    process.env.AUTO_TRIGGER_CACHE_INTERVAL
        ? Number(process.env.AUTO_TRIGGER_CACHE_INTERVAL)
        : 5 * 60 * 1000
);

module.exports = {
    /**
     * @param {string|ObjectId} appId
     * @param {string} cohortId
     * @param {"enter"|"exit"} direction
     * @returns {boolean}
     */
    cohortMessageExists(appId, cohortId, direction) {
        const numberOfMessages = AUTO_AND_API_MESSAGES
            ?.[appId.toString()]
            ?.cohort
            ?.[cohortId]
            ?.[direction]?.length ?? 0;
        return numberOfMessages > 0;
    },
    /**
     * @param {string|ObjectId} appId
     * @param {string} eventKey
     * @returns {boolean}
     */
    eventMessageExists(appId, eventKey) {
        const numberOfMessages = AUTO_AND_API_MESSAGES
            ?.[appId.toString()]
            ?.event
            ?.[eventKey]?.length ?? 0;
        return numberOfMessages > 0;
    },
    /**
     * @param {string|ObjectId} appId
     * @param {string|ObjectId} messageId
     * @returns {boolean}
     */
    apiMessageExists(appId, messageId) {
        const cache = AUTO_AND_API_MESSAGES?.[appId.toString()]?.api;
        if (!Array.isArray(cache)) {
            return false;
        }
        return cache.includes(messageId.toString());
    }
}