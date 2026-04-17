import { ObjectId } from "mongodb";
import type { Db, Collection, Document } from "mongodb";
import type { ScheduleEvent, PushEvent, PlatformConfig } from "../kafka/types.ts";
import type {
    MessageCollection, Message, PlatformKey, PlatformEnvKey, PlatformCombinedKey,
} from "../models/message.ts";
import type { PlatformCredential } from "../models/credentials.ts";
import type { ErrorObject } from "../lib/error.ts";
import type { Schedule, ScheduleCollection, AudienceFilter } from "../models/schedule.ts";
import * as queue from "../kafka/producer.ts"; // do not import by destructuring; it's being mocked in the tests
import { createTemplate, getUserPropertiesUsedInsideMessage } from "../lib/template.ts";
import PLATFORM_KEYMAP from "../constants/platform-keymap.ts";
import { buildResultObject, increaseResultStat, applyResultObject } from "./resultor.ts";
import { loadDrillAPI, loadPluginConfiguration } from "../lib/utils.ts";
import { RESCHEDULABLE_DATE_TRIGGERS, scheduleMessageByDateTrigger } from "./scheduler.ts";
import { createRequire } from 'module';

// createRequire needed for CJS modules without ES exports
const require = createRequire(import.meta.url);
const common: import('../../../../types/common.d.ts').Common = require("../../../../api/utils/common.js");
const log = common.log('push:composer');

const QUEUE_WRITE_BATCH_SIZE = 100;

interface App {
    _id: ObjectId;
    timezone: string;
}

type GeosCollection = Collection<{ radius: number; unit: "mi" | "km"; geo: { coordinates: [number, number] } }>;
type AppCollection = Collection<App>;

interface MatchStage {
    $match: { [key: string]: any };
}

interface PlatformCredentialsMap {
    [key: string]: PlatformCredential;
}

interface UserPropertiesProjection {
    [key: string]: any;
}

/**
 * Composes push notifications for all given schedule events.
 */
export async function composeAllScheduledPushes(db: Db, scheduleEvents: ScheduleEvent[]): Promise<number> {
    let totalNumberOfPushes = 0;
    for (let i = 0; i < scheduleEvents.length; i++) {
        const scheduleEvent = scheduleEvents[i];
        try {
            const result = await composeScheduledPushes(db, scheduleEvent);
            totalNumberOfPushes += result;
        }
        catch (err) {
            log.e("Error while composing scheduleEvents", scheduleEvent, err);
            let error: ErrorObject = {
                name: "UnknownError",
                message: "Unknown error occurred while composing the scheduled push messages"
            };
            if (err instanceof Error) {
                error = {
                    name: err.name,
                    message: err.message,
                    stack: err.stack
                };
            }
            db.collection("message_schedules").updateOne(
                {
                    _id: scheduleEvent.scheduleId,
                    "events.scheduledTo": scheduleEvent.scheduledTo
                },
                {
                    $set: {
                        "events.$.status": "failed",
                        "events.$.error": error,
                    }
                }
            );
        }
    }
    return totalNumberOfPushes;
}

/**
 * Composes push notifications for a single schedule event.
 * Loads necessary documents, builds aggregation pipeline, creates push events,
 * sends them to the queue, and updates the schedule and message documents.
 */
export async function composeScheduledPushes(db: Db, scheduleEvent: ScheduleEvent): Promise<number> {
    const { appId, scheduleId, messageId, timezone, scheduledTo } = scheduleEvent;
    // load necessary documents:
    const messageCol: MessageCollection = db.collection("messages");
    const scheduleCol: ScheduleCollection = db.collection("message_schedules");
    const appCol: AppCollection = db.collection("apps");
    // in case the schedule was deleted, canceled, already sent or
    // already processed by the state fixing job, we do nothing
    const scheduleDoc = await scheduleCol.findOne({
        _id: scheduleId,
        status: {
            $in: ["scheduled", "sending"]
        },
        // make sure this specific schedule event is still scheduled
        events: {
            $elemMatch: {
                scheduledTo,
                status: "scheduled"
            }
        }
    });
    const messageDoc = await messageCol.findOne({ _id: messageId, status: "active" });
    if (!messageDoc) {
        log.w("Message", messageId, "was deleted or became inactive.",
            "Canceling all schedules for this message.");
        scheduleCol.updateMany({ messageId }, { $set: { status: "canceled" } });
        return 0;
    }
    if (!scheduleDoc) {
        log.i("Schedule", scheduleId, "for message",
            messageId, "was deleted, canceled or failed.");
        return 0;
    }
    const appDoc = await appCol.findOne({ _id: scheduleDoc.appId });
    if (!appDoc) {
        log.w("App", appId, "is deleted");
        return 0;
    }
    if (scheduleDoc.messageOverrides?.contents) {
        messageDoc.contents = [
            ...messageDoc.contents,
            ...scheduleDoc.messageOverrides.contents
        ];
    }
    const aggregationPipeline = await buildUserAggregationPipeline(
        db,
        messageDoc,
        appDoc.timezone,
        timezone,
        scheduleDoc.audienceFilter
    );
    const compileTemplate = createTemplate(messageDoc);
    const pluginConfig = await loadPluginConfiguration();
    const creds = await loadCredentials(db, appId);
    // check if there's a missing credential
    for (let i = 0; i < messageDoc.platforms.length; i++) {
        const p = messageDoc.platforms[i];
        if (!creds[p]) {
            const title = PLATFORM_KEYMAP[p]?.title ?? "unknown (" + p + ")";
            log.e("Missing", title, "configuration for message",
                messageId.toString());
        }
    }
    let events: PushEvent[] = [];
    const resultObject = buildResultObject();
    const stream = createPushStream(
        db, appDoc, messageDoc, scheduleDoc, scheduledTo, creds, pluginConfig,
        compileTemplate, aggregationPipeline
    );
    for await (let push of stream) {
        events.push(push);
        if (events.length === QUEUE_WRITE_BATCH_SIZE) {
            await queue.sendPushEvents(events);
            events = [];
        }
        // update results
        increaseResultStat(resultObject, push.platform, push.language, "total");
    }
    // write the remaining pushes in the buffer
    if (events && events.length) {
        await queue.sendPushEvents(events);
    }
    // Mark this specific schedule event as 'composed' BEFORE running
    // applyResultObject. The status-transition queries inside applyResultObject
    // need this event to be "composed" so the { "events.status": { $ne:
    // "scheduled" } } filter can match. For timezone-aware schedules with
    // many timezone slots (most having zero users), the resultor may have
    // already processed results while later zero-user slots are still being
    // composed. Only the LAST slot's applyResultObject will see all events as
    // "composed" and can transition the status to "sent".
    await scheduleCol.updateOne(
        { _id: scheduleId, "events.scheduledTo": scheduledTo },
        { $set: { "events.$.status": "composed" } }
    );
    // update the schedule and message document
    await applyResultObject(db, scheduleId, messageId, resultObject);

    // check if we need to re-schedule this message
    const reschedulableTrigger = messageDoc.triggers
        .find(trigger => RESCHEDULABLE_DATE_TRIGGERS.includes(trigger.kind));
    if (reschedulableTrigger) {
        const schedules = await scheduleMessageByDateTrigger(db, messageId);
        if (schedules && schedules.length) {
            log.d("Message", messageId, "is scheduled again to",
                schedules.map(s => s.scheduledTo));
        }
    }
    return resultObject.total;
}

/**
 * Creates a stream of push events for the given app, message, schedule and credentials.
 * Pipeline needs to be built before this function is called.
 */
export async function* createPushStream(
    db: Db,
    appDoc: App,
    messageDoc: Message,
    scheduleDoc: Schedule,
    scheduledTo: Date,
    creds: PlatformCredentialsMap,
    pluginConfig: Awaited<ReturnType<typeof loadPluginConfiguration>> | undefined,
    template: ReturnType<typeof createTemplate>,
    pipeline: Document[]
): AsyncGenerator<PushEvent, void, void> {
    const stream = db.collection("app_users" + appDoc._id.toString())
        .aggregate(pipeline, { allowDiskUse: true })
        .stream();
    for await (let user of stream) {
        let tokenObj = user?.tk?.[0]?.tk;
        if (!tokenObj) {
            continue;
        }
        for (let combined in tokenObj) {
            const platform = combined[0] as PlatformKey;
            if (!(platform in creds)) {
                continue;
            }
            const env = combined[1] as PlatformEnvKey;
            const token = tokenObj[combined as PlatformCombinedKey] as string;
            const language = user.la ?? "default";
            let variables = {
                ...user,
                ...(scheduleDoc.messageOverrides?.variables ?? {})
            };
            const sendBefore = typeof pluginConfig?.messageTimeout === "number"
                ? new Date(scheduledTo.getTime() + pluginConfig?.messageTimeout)
                : undefined;
            yield {
                appId: appDoc._id,
                messageId: messageDoc._id,
                scheduleId: scheduleDoc._id,
                token,
                uid: user.uid,
                platform,
                sendBefore,
                env,
                language,
                credentials: creds[platform],
                payload: template(platform, variables),
                proxy: pluginConfig?.proxy,
                platformConfiguration: getPlatformConfiguration(platform, messageDoc),
                trigger: messageDoc.triggers[0],
                appTimezone: appDoc.timezone,
                userProfile: {
                    _uid: user._id,
                    did: user.did,
                    up: {
                        fs: user.fs, ls: user.ls, sc: user.sc, tsd: user.tsd,
                        d: user.d, dt: user.dt, p: user.p, pv: user.pv, av: user.av,
                        cc: user.cc, cty: user.cty, rgn: user.rgn,
                        src: user.src, src_ch: user.src_ch, la: user.la,
                    },
                    custom: user.custom,
                    cmp: user.cmp,
                },
            } as PushEvent;
        }
    }
}

/**
 * Builds an aggregation pipeline to filter users based on the message and audience filters.
 */
export async function buildUserAggregationPipeline(
    db: Db,
    message: Message,
    appTimezone?: string,
    timezone?: string,
    filters?: AudienceFilter
): Promise<Document[]> {
    const appId = message.app.toString();
    const $match: { [key: string]: any } = {};
    const $project = {
        uid: 1, tk: 1, la: 1,
        // Fields needed for drill event emission in the resultor (via PushEvent.userProfile).
        // These are read by event-emitter.ts to produce drill_events rows without a
        // second round-trip to app_users.
        did: 1, custom: 1, cmp: 1,
        d: 1, dt: 1, p: 1, pv: 1, av: 1, cc: 1, cty: 1, rgn: 1, src: 1, src_ch: 1,
        fs: 1, ls: 1, sc: 1, tsd: 1,
        ...userPropsProjection(message),
    };
    const $lookup = {
        from: "push_" + appId,
        localField: 'uid',
        foreignField: '_id',
        as: "tk"
    };
    // Platforms:
    const platformFilters: { [key: string]: { $exists: true } }[] = [];
    for (let platformKey of message.platforms) {
        const combinedKeys = PLATFORM_KEYMAP[platformKey].combined;
        for (let combinedKey of combinedKeys) {
            platformFilters.push({ ["tk" + combinedKey]: { $exists: true } });
        }
    }
    if (platformFilters.length) {
        $match.$or = platformFilters;
    }
    // Timezone:
    if (timezone) {
        $match.tz = timezone;
    }
    let filterPipeline: MatchStage[] = [];
    if (filters) {
        filterPipeline = await convertAudienceFiltersToMatchStage(db, filters, appId, appTimezone);
    }
    return [{ $match }, ...filterPipeline, { $lookup }, { $project }];
}

/**
 * Converts audience filters into MongoDB aggregation match stages.
 */
export async function convertAudienceFiltersToMatchStage(
    db: Db,
    filters: AudienceFilter,
    appIdStr: string,
    appTimezone?: string
): Promise<MatchStage[]> {
    const pipeline: MatchStage[] = [];
    // User ids:
    if (Array.isArray(filters.uids)) {
        pipeline.push({ $match: { uid: { $in: filters.uids } } });
    }
    // User ids with cohort status:
    if (Array.isArray(filters.userCohortStatuses)) {
        const $or: { [key: string]: string | { $exists: false } }[] = [];
        for (let i = 0; i < filters.userCohortStatuses.length; i++) {
            const { uid, cohort } = filters.userCohortStatuses[i];
            $or.push({
                uid,
                ["chr." + cohort.id + ".in"]: cohort.status
                    ? "true"
                    : { $exists: false }
            });
        }
        pipeline.push({ $match: { $or } });
    }
    // Cohorts:
    if (Array.isArray(filters.cohorts) && filters.cohorts.length) {
        const $match: { [cohortPath: string]: "true" } = {};
        for (let i = 0; i < filters.cohorts.length; i++) {
            $match["chr." + filters.cohorts[i] + ".in"] = "true";
        }
        pipeline.push({ $match });
    }
    // Geos:
    if (Array.isArray(filters.geos) && filters.geos.length) {
        const col: GeosCollection = db.collection("geos");
        const geoDocs = await col.find({
            "geo.type": "Point",
            unit: { $in: ["mi", "km"] },
            _id: { $in: filters.geos }
        }).toArray();
        if (!geoDocs.length) {
            pipeline.push({ $match: { "loc.geo": "no such geo" } });
        }
        else {
            pipeline.push({
                $match: {
                    $or: geoDocs.map(({ geo, radius, unit }) => ({
                        "loc.geo": {
                            $geoWithin: {
                                $centerSphere: [
                                    geo.coordinates,
                                    radius / (unit === "km" ? 6378.1 : 3963.2)
                                ]
                            }
                        }
                    }))
                }
            });
        }
    }
    // User filter:
    if (filters.user) {
        const userFilter = JSON.parse(filters.user);
        if (appTimezone) {
            let params = {
                time: common.initTimeObj(appTimezone, String(Date.now())),
                qstring: Object.assign({ app_id: appIdStr }, userFilter),
                app_id: appIdStr
            };
            await common.plugins.dispatchAsPromise("/drill/preprocess_query", {
                query: userFilter,
                params
            });
        }
        if (Object.keys(userFilter).length) {
            pipeline.push({ $match: userFilter });
        }
    }
    // Drill:
    // TODO: BETTER IMPLEMENTATION OF THIS
    if (filters.drill && appTimezone) {
        const drillAPI = loadDrillAPI();
        if (!drillAPI) {
            pipeline.push({
                $match: { "nonExistingProperty": "Non existing value" }
            });
        }
        else {
            const drillQuery = JSON.parse(filters.drill);
            if (drillQuery.queryObject && drillQuery.queryObject.chr
                && Object.keys(drillQuery.queryObject).length === 1) {
                let cohorts: { [key: string]: any } = {};
                let chr = drillQuery.queryObject.chr, i;
                if (chr.$in && chr.$in.length) {
                    for (i = 0; i < chr.$in.length; i++) {
                        cohorts['chr.' + chr.$in[i] + '.in'] = 'true';
                    }
                }
                if (chr.$nin && chr.$nin.length) {
                    for (i = 0; i < chr.$nin.length; i++) {
                        cohorts['chr.' + chr.$nin[i] + '.in'] = {
                            $exists: false
                        };
                    }
                }
                pipeline.push({ $match: cohorts });
            }
            else {
                let params = {
                    time: common.initTimeObj(appTimezone, String(Date.now())),
                    qstring: Object.assign({ app_id: appIdStr }, drillQuery),
                    app_id: appIdStr
                };
                if ("queryObject" in params.qstring) {
                    delete params.qstring.queryObject.chr;
                }
                log.d('Drilling: %j', params);
                let userIdArray = await new Promise<string[]>(
                    (resolve, reject) => drillAPI.fetchUsers(params, (err: any, uids: string[]) => {
                        log.i("Done drilling:",
                            err ? 'error %j' : '%d uids',
                            err || (uids && uids.length) || 0);
                        if (err) {
                            reject(err);
                        }
                        else {
                            resolve(uids || []);
                        }
                    }, db)
                );
                pipeline.push({ $match: { uid: { $in: userIdArray } } });
            }
        }
    }
    // Cap filter (only for cohort and event trigger).
    if (filters.cap) {
        const field = "msgs." + filters.cap.messageId.toString();
        // limit the maximum number of push notifications for the given messageId
        if (typeof filters.cap.maxMessages === "number" && filters.cap.maxMessages > 0) {
            pipeline.push({
                $match: {
                    [field + "." + String(filters.cap.maxMessages - 1)]: {
                        $exists: false
                    }
                }
            });
        }
        // minimum required time to send the same message again
        if (typeof filters.cap.minTime === "number" && filters.cap.minTime > 0) {
            pipeline.push({
                $match: {
                    [field]: {
                        $not: {
                            $gt: Date.now() - filters.cap.minTime
                        }
                    }
                }
            });
        }
    }
    return pipeline;
}

/**
 * Loads platform credentials configured for the given app.
 * Skips missing or demo credentials.
 */
export async function loadCredentials(db: Db, appId: ObjectId): Promise<PlatformCredentialsMap> {
    const app = await db.collection("apps").findOne({ _id: appId });
    const configuredCreds = app?.plugins?.push || {};

    const creds: PlatformCredentialsMap = {};
    for (let pKey in configuredCreds) {
        const credId = configuredCreds?.[pKey]?._id;
        if (!credId || credId === "demo") {
            continue;
        }
        const cred = await db.collection("creds").findOne({ _id: credId }) as PlatformCredential | null;
        if (cred) {
            creds[pKey] = cred;
        }
    }
    return creds;
}

/**
 * Extracts platform-specific configuration from the message document.
 */
function getPlatformConfiguration(platform: PlatformKey, message: Message): PlatformConfig {
    if (platform === "i") {
        let setContentAvailable = false;
        const contentItem = message.contents.find(i => Array.isArray(i.specific));
        if (contentItem && contentItem.specific) {
            const obj = contentItem.specific.find(i => i.setContentAvailable !== undefined);
            if (obj && obj.setContentAvailable) {
                setContentAvailable = true;
            }
        }
        return { setContentAvailable };
    }

    return {};
}

/**
 * Generates a projection object for user properties used in the message.
 */
export function userPropsProjection(message: Message): UserPropertiesProjection {
    const props = getUserPropertiesUsedInsideMessage(message);
    const result: { [key: string]: 1 } = {};
    for (let i = 0; i < props.length; i++) {
        result[props[i].replace(/\..+$/, "")] = 1;
    }
    return result;
}
