/**
 * @typedef {import('mongodb').ObjectId} ObjectId
 * @typedef {import('./types/queue.ts').ScheduleEvent} ScheduleEvent
 * @typedef {import('./types/queue.ts').PushEvent} PushEvent
 * @typedef {import('./types/queue.ts').IOSConfig} IOSConfig
 * @typedef {import('./types/queue.ts').AndroidConfig} AndroidConfig
 * @typedef {import('./types/queue.ts').HuaweiConfig} HuaweiConfig
 * @typedef {import('./types/message.ts').MessageCollection} MessageCollection
 * @typedef {import('./types/message.ts').Message} Message
 * @typedef {import('./types/message.ts').PlatformKey} PlatformKey
 * @typedef {import('./types/message.ts').PlatformEnvKey} PlatformEnvKey
 * @typedef {import('./types/message.ts').PlatformCombinedKeys} PlatformCombinedKeys
 * @typedef {import("./types/queue.ts").AndroidPushEvent} AndroidPushEvent
 * @typedef {import('./types/credentials.ts').PlatformCredential} PlatformCredential
 * @typedef {import('./types/utils.ts').PluginConfiguration} PluginConfiguration
 * @typedef {import('./types/utils.ts').ErrorObject} ErrorObject
 * @typedef {import("mongodb").Db} MongoDb
 * @typedef {import('./types/schedule.ts').Schedule} Schedule
 * @typedef {import('./types/schedule.ts').ScheduleCollection} ScheduleCollection
 * @typedef {import('./types/schedule.ts').AudienceFilter} AudienceFilter
 * @typedef {import('./types/user.ts').User} User
 * @typedef {import('stream').Readable} Readable
 * @typedef {{_id: ObjectId; timezone: string;}} App
 * @typedef {import("mongodb").Collection<{ radius: number; unit: "mi"|"km"; geo: { coordinates: [number, number]; } }>} GeosCollection
 * @typedef {import("mongodb").Collection<App>} AppCollection
 * @typedef {import("mongodb").Document} Document
 * @typedef {{ $match: { [key: string]: any } }} MatchStage
 * @typedef {{[key: string]: PlatformCredential}} PlatformCredentialsMap
 * @typedef {{[key: string]: any}} UserPropertiesProjection
 */

const queue = require("./lib/kafka.js"); // do not import by destructuring; it's being mocked in the tests
const { createTemplate, getUserPropertiesUsedInsideMessage } = require("./lib/template.js");
const PLATFORM_KEYMAP = require("./constants/platform-keymap.js");
const { buildResultObject, increaseResultStat, applyResultObject } = require("./resultor.js");
const common = require("../../../../api/utils/common.js");
const { loadDrillAPI, loadPluginConfiguration } = require("./lib/utils.js");
const log = require('../../../../api/utils/common').log('push:composer');
const { RESCHEDULABLE_DATE_TRIGGERS, scheduleMessageByDateTrigger } = require("./scheduler.js");
const QUEUE_WRITE_BATCH_SIZE = 100;

/**
 * Composes push notifications for all given schedule events.
 * @param {MongoDb} db - MongoDB database instance
 * @param {ScheduleEvent[]} scheduleEvents - Array of schedule events to process
 * @returns {Promise<number>} Total number of composed push notifications
 */
async function composeAllScheduledPushes(db, scheduleEvents) {
    let totalNumberOfPushes = 0;
    for (let i = 0; i < scheduleEvents.length; i++) {
        const scheduleEvent = scheduleEvents[i];
        try {
            const result = await composeScheduledPushes(db, scheduleEvent);
            totalNumberOfPushes += result;
        }
        catch (err) {
            log.e("Error while composing scheduleEvents", scheduleEvent, err);
            /** @type {ErrorObject} */
            let error = {
                name: "UnknownError",
                message: "Unknown error occured while composing the scheduled push messages"
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
 * @param {MongoDb} db - MongoDB database instance
 * @param {ScheduleEvent} scheduleEvent - Schedule event to process
 * @returns {Promise<number>} Number of composed push notifications
 */
async function composeScheduledPushes(db, scheduleEvent) {
    const { appId, scheduleId, messageId, timezone, scheduledTo } = scheduleEvent;
    // load necessary documents:
    /** @type {MessageCollection} */
    const messageCol = db.collection("messages");
    /** @type {ScheduleCollection} */
    const scheduleCol = db.collection("message_schedules");
    /** @type {AppCollection} */
    const appCol = db.collection("apps");
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
    const pluginConfig = await loadPluginConfiguration(db);
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
    /** @type {PushEvent[]} */
    let events = [];
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
    // update the schedule and message document
    await applyResultObject(db, scheduleId, messageId, resultObject);
    // mark this specific schedule event as 'composed'
    await scheduleCol.updateOne(
        { _id: scheduleId, "events.scheduledTo": scheduledTo },
        { $set: { "events.$.status": "composed" } }
    );

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
 * The stream will yield `PushEvent` objects for each user that matches the pipeline.
 * @param {MongoDb} db - MongoDB database instance
 * @param {App} appDoc - Application document
 * @param {Message} messageDoc - Message document
 * @param {Schedule} scheduleDoc - Schedule document
 * @param {Date} scheduledTo - Actual scheduled time
 * @param {Awaited<ReturnType<loadCredentials>>} creds - Credentials for each platform
 * @param {PluginConfiguration|undefined} pluginConfig - Plugin configuration
 * @param {ReturnType<createTemplate>} template - Function to create message template
 * @param {Document[]} pipeline - Aggregation pipeline to filter users
 * @returns {AsyncGenerator<PushEvent, void, void>} Push event stream
 */
async function* createPushStream(
    db,
    appDoc,
    messageDoc,
    scheduleDoc,
    scheduledTo,
    creds,
    pluginConfig,
    template,
    pipeline
) {
    const stream = db.collection("app_users" + appDoc._id.toString())
        .aggregate(pipeline, { allowDiskUse: true })
        .stream();
    for await (let user of stream) {
        let tokenObj = user?.tk?.[0]?.tk;
        if (!tokenObj) {
            continue;
        }
        for (let combined in tokenObj) {
            const platform = /** @type {PlatformKey} */(combined[0]);
            if (!(platform in creds)) {
                continue;
            }
            const env = /** @type {PlatformEnvKey} */(combined[1]);
            const token = /** @type {string} */(
                tokenObj[/** @type {PlatformCombinedKeys} */(combined)]
            );
            const language = user.la ?? "default";
            let variables = {
                ...user,
                ...(scheduleDoc.messageOverrides?.variables ?? {})
            };
            const sendBefore = typeof pluginConfig?.messageTimeout === "number"
                ? new Date(scheduledTo.getTime() + pluginConfig?.messageTimeout)
                : undefined;
            yield /** @type {PushEvent} */({
                appId: appDoc._id,
                messageId: messageDoc._id,
                scheduleId: scheduleDoc._id,
                saveResult: messageDoc.saveResults,
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
            });
        }
    }
}

/**
 * Builds an aggregation pipeline to filter users based on the message and audience filters.
 * The pipeline includes matching by platform, timezone, cohorts, geos, user-defined filters,
 * drill queries, and capping rules.
 * @param {MongoDb} db - MongoDB database instance
 * @param {Message} message - Message document
 * @param {string=} appTimezone - Application timezone
 * @param {string=} timezone - User timezone to filter by
 * @param {AudienceFilter=} filters - Audience filters from the schedule
 * @returns {Promise<Document[]>} Aggregation pipeline
 */
async function buildUserAggregationPipeline(db, message, appTimezone, timezone, filters) {
    const appId = message.app.toString();
    /** @type {{ [key: string]: any }} non-user-defined filters */
    const $match = {};
    const $project = { uid: 1, tk: 1, la: 1, ...userPropsProjection(message) };
    const $lookup = {
        from: "push_" + appId,
        localField: 'uid',
        foreignField: '_id',
        as: "tk"
    };
    // Platforms:
    const platformFilters = [];
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
    /** @type {Array<{ $match: { [key: string]: any } }>} */
    let filterPipeline = [];
    if (filters) {
        filterPipeline = await convertAudienceFiltersToMatchStage(db, filters, appId, appTimezone);
    }
    return [{ $match }, ...filterPipeline, { $lookup }, { $project }];
}

/**
 * Converts audience filters into MongoDB aggregation match stages.
 * Supports filtering by user IDs, cohort statuses, cohorts, geos, user-defined filters,
 * drill queries, and capping rules.
 * @param {MongoDb} db - MongoDB database instance
 * @param {AudienceFilter} filters - Audience filters
 * @param {string} appIdStr - Application ID as string
 * @param {string=} appTimezone - Application timezone
 * @returns {Promise<MatchStage[]>} Aggregation match stages
 */
async function convertAudienceFiltersToMatchStage(db, filters, appIdStr, appTimezone) {
    /** @type {Array<{ $match: { [key: string]: any } }>} */
    const pipeline = [];
    // User ids:
    if (Array.isArray(filters.uids)) {
        pipeline.push({ $match: { uid: { $in: filters.uids } } });
    }
    // User ids with cohort status:
    if (Array.isArray(filters.userCohortStatuses)) {
        /** @type {{[key: string]: string|{$exists: false;};}[]} */
        const $or = [];
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
        /** @type {{ [cohortPath: string]: "true" }} */
        const $match = {};
        for (let i = 0; i < filters.cohorts.length; i++) {
            $match["chr." + filters.cohorts[i] + ".in"] = "true";
        }
        pipeline.push({ $match });
    }
    // Geos:
    if (Array.isArray(filters.geos) && filters.geos.length) {
        /** @type {GeosCollection} */
        const col = db.collection("geos");
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
                /** @type {{ [key: string]: any }} */
                let cohorts = {};
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
                let userIdArray = await new Promise(
                    (resolve, reject) => drillAPI.fetchUsers(params, (err, uids) => {
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
 * @param {MongoDb} db - MongoDB database instance
 * @param {ObjectId} appId - Application ID
 * @returns {Promise<PlatformCredentialsMap>} Platform credentials
 */
async function loadCredentials(db, appId) {
    const app = await db.collection("apps").findOne({ _id: appId });
    const configuredCreds = app?.plugins?.push || {};

    const creds = /** @type {{[key: string]: PlatformCredential}} */({});
    for (let pKey in configuredCreds) {
        const credId = configuredCreds?.[pKey]?._id;
        if (!credId || credId === "demo") {
            continue;
        }
        const cred = /** @type {PlatformCredential|null} */(
            await db.collection("creds").findOne({ _id: credId })
        );
        if (cred) {
            creds[pKey] = cred;
        }
    }
    return creds;
}

/**
 * Extracts platform-specific configuration from the message document.
 * Currently, only iOS configuration is supported.
 * @param {PlatformKey} platform - Platform key (e.g., "i" for iOS)
 * @param {Message} message - Message document
 * @returns {IOSConfig|AndroidConfig|HuaweiConfig} Platform configuration
 */
function getPlatformConfiguration(platform, message) {
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
 * @param {Message} message - Message document
 * @returns {UserPropertiesProjection} Projection object for user properties
 */
function userPropsProjection(message) {
    const props = getUserPropertiesUsedInsideMessage(message);
    /** @type {{[key: string]: 1}} */
    const result = {};
    for (let i = 0; i < props.length; i++) {
        result[props[i].replace(/\..+$/, "")] = 1;
    }
    return result;
}

module.exports = {
    composeAllScheduledPushes,
    composeScheduledPushes,
    createPushStream,
    loadCredentials,
    buildUserAggregationPipeline,
    userPropsProjection,
    convertAudienceFiltersToMatchStage,
};