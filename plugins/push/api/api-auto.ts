import type { ObjectId } from "mongodb";
import type { Cohort } from "./api-patches.ts";
import { cohortMessageExists, eventMessageExists } from "./new/lib/message-cache.ts";
import { sendAutoTriggerEvents } from "./new/lib/kafka.ts";
import { createRequire } from 'module';

// createRequire needed for CJS modules without ES exports
const require = createRequire(import.meta.url);
const common: import('../../../types/common.d.ts').Common = require('../../../api/utils/common');
const log = common.log('push:api:auto');
const logCohorts = log.sub('cohorts');
const logEvents = log.sub('events');

/**
 * Handler function for /cohort/enter (/cohort/exit) hooks
 */
export async function autoOnCohort(entry: boolean, cohort: Cohort, uids: string[]): Promise<void> {
    logCohorts.d("processing cohort %s (%s) %s for %d uids",
        cohort._id, cohort.name, entry ? 'enter' : 'exit', uids.length);
    const direction = entry ? "enter" : "exit" as const;
    if (cohortMessageExists(cohort.app_id, cohort._id, direction)) {
        try {
            await sendAutoTriggerEvents([{
                kind: "cohort",
                appId: cohort.app_id,
                uids,
                cohortId: cohort._id,
                direction,
            }]);
            logCohorts.d("Cohort auto triggers sent", cohort.app_id,
                cohort._id, uids);
        }
        catch (err) {
            logEvents.e("Error while sending auto trigger events", err);
        }
    }
}

/**
 * Handler function for event hooks
 */
export async function autoOnEvent(appId: ObjectId, uid: string, keys: string[], _events: { key: string; timestamp?: number }[]): Promise<void> {
    logEvents.d('Checking event keys', keys);
    const keySet = Array.from(new Set(keys));
    const filteredKeys = keySet.filter(key => eventMessageExists(appId, key));
    if (filteredKeys.length) {
        try {
            await sendAutoTriggerEvents([{
                kind: "event",
                appId,
                eventKeys: filteredKeys,
                uid,
            }]);
            logEvents.d("Event auto triggers sent", appId, filteredKeys, uid);
        }
        catch (err) {
            logEvents.e("Error while sending auto trigger events", err);
        }
    }
}
