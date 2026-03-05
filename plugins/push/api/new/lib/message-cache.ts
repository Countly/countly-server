import type { ObjectId } from "mongodb";

import { createRequire } from 'module';

// createRequire needed for CJS modules without ES exports
const require = createRequire(import.meta.url);
const common: import('../../../../../types/common.d.ts').Common = require("../../../../../api/utils/common");
const log = common.log("push:message-cache");

interface AutoTriggerMessagesCache {
    [appId: string]: {
        event: { [eventKey: string]: string[] };
        cohort: { [cohortId: string]: { enter: string[]; exit: string[] } };
    };
}

let AUTO_TRIGGER_MESSAGES: AutoTriggerMessagesCache = {};

async function loadAutoMessages(): Promise<void> {
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
                const cache = AUTO_TRIGGER_MESSAGES[appId].cohort;
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
                const cache = AUTO_TRIGGER_MESSAGES[appId].event;
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
        }
    }
}
setInterval(
    loadAutoMessages,
    process.env.AUTO_TRIGGER_CACHE_INTERVAL
        ? Number(process.env.AUTO_TRIGGER_CACHE_INTERVAL)
        : 5 * 60 * 1000
);

export function cohortMessageExists(appId: string | ObjectId, cohortId: string, direction: "enter" | "exit"): boolean {
    const numberOfMessages = AUTO_TRIGGER_MESSAGES
        ?.[appId.toString()]
        ?.cohort
        ?.[cohortId]
        ?.[direction]?.length ?? 0;
    return numberOfMessages > 0;
}

export function eventMessageExists(appId: string | ObjectId, eventKey: string): boolean {
    const numberOfMessages = AUTO_TRIGGER_MESSAGES
        ?.[appId.toString()]
        ?.event
        ?.[eventKey]?.length ?? 0;
    return numberOfMessages > 0;
}
