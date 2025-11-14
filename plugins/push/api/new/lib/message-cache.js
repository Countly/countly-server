/**
 * @typedef {import("mongodb").Db} MongoDb
 * @typedef {import("mongodb").ObjectId} ObjectId
 */

const common = require("../../../../../api/utils/common");
const log = common.log("push:message-cache");

/** @type {{
    [appId: string]: {
        event: { [eventKey: string]: string[] };
        cohort: { [cohortId: string]: { enter: string[]; exit: string[]; } };
    }
}} */
let AUTO_TRIGGER_MESSAGES = {};

/**
 * Loads auto-trigger messages from the database into memory.
 * This function is called periodically to refresh the cache.
 *
 * @returns {Promise<void>} Promise that resolves when messages are loaded
 */
async function loadAutoMessages() {
    const now = new Date;
    const messages = await common.db.collection("messages")
        .find({
            status: "active",
            triggers: {
                $elemMatch: {
                    kind: { $in: ["cohort", "event"] },
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

    AUTO_TRIGGER_MESSAGES = {};
    for (let i = 0; i < messages.length; i++) {
        const appId = messages[i].app.toString();
        if (!(appId in AUTO_TRIGGER_MESSAGES)) {
            AUTO_TRIGGER_MESSAGES[appId] = {event: {}, cohort: {}};
        }
        try {
            const trigger = messages[i].triggers[0];
            if (trigger.kind === "cohort") {
                const cache = AUTO_TRIGGER_MESSAGES[appId][/** @type {"cohort"} */(trigger.kind)];
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
                const cache = AUTO_TRIGGER_MESSAGES[appId][/** @type {"event"} */(trigger.kind)];
                for (let j = 0; j < trigger.events.length; j++) {
                    const eventKey = trigger.events[j];
                    if (!(eventKey in cache)) {
                        cache[eventKey] = [];
                    }
                    cache[eventKey].push(messages[i]._id.toString());
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
    loadAutoMessages,
    process.env.AUTO_TRIGGER_CACHE_INTERVAL
        ? Number(process.env.AUTO_TRIGGER_CACHE_INTERVAL)
        : 5 * 60 * 1000
);

module.exports = {
    /**
     * Checks if there are any messages for the given cohort event.
     *
     * @param {string|ObjectId} appId - Application ID
     * @param {string} cohortId - Cohort ID
     * @param {"enter"|"exit"} direction - Direction of cohort event
     * @returns {boolean} Whether messages exist for the given cohort event
     */
    cohortMessageExists(appId, cohortId, direction) {
        const numberOfMessages = AUTO_TRIGGER_MESSAGES
            ?.[appId.toString()]
            ?.cohort
            ?.[cohortId]
            ?.[direction]?.length ?? 0;
        return numberOfMessages > 0;
    },
    /**
     * Checks if there are any messages for the given event.
     *
     * @param {string|ObjectId} appId - Application ID
     * @param {string} eventKey - Event key
     * @returns {boolean} Whether messages exist for the given event
     */
    eventMessageExists(appId, eventKey) {
        const numberOfMessages = AUTO_TRIGGER_MESSAGES
            ?.[appId.toString()]
            ?.event
            ?.[eventKey]?.length ?? 0;
        return numberOfMessages > 0;
    },
};