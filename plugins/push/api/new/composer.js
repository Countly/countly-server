/**
 * @typedef {import('./types/queue.ts').ScheduleEvent} ScheduleEvent
 * @typedef {import('./types/queue.ts').PushEvent} PushEvent
 * @typedef {import('./types/message.ts').Message} Message
 * @typedef {import('./types/message.ts').PlatformKeys} PlatformKeys
 * @typedef {import('./types/message.ts').PlatformEnvKeys} PlatformEnvKeys
 * @typedef {import('./types/message.ts').PlatformCombinedKeys} PlatformCombinedKeys
 * @typedef {import('./types/credentials.ts').SomeCredential} SomeCredential
 * @typedef {import('./types/proxy.ts').ProxyConfiguration} ProxyConfiguration
 * @typedef {import("mongodb").Db} MongoDb
 * @typedef {import('./types/schedule.ts').Schedule} Schedule
 * @typedef {import('./types/schedule.ts').AudienceFilters} AudienceFilters
 * @typedef {import('./types/user.ts').User} User
 * @typedef {import('stream').Readable} Readable
 * @typedef {import('./types/utils.ts').LogObject} LogObject
 * @typedef {import('./types/utils.ts').CountlyCommon} CountlyCommon
 * @typedef {import("mongodb").Collection<{ radius: number; unit: "mi"|"km"; geo: { coordinates: [number, number]; } }>} GeosCollection
 * @typedef {import("mongodb").Collection<Message>} MessageCollection
 * @typedef {import("mongodb").Collection<Schedule>} ScheduleCollection
 */

const { ObjectId } = require('mongodb');
const queue = require("./lib/kafka.js"); // do not import by destructuring; it's being mocked in the tests
const { createTemplate, getUserPropertiesUsedInsideMessage } = require("./lib/template.js");
const PLATFORM_KEYMAP = require("./constants/platform-keymap.json");
const { buildResultObject, increaseResultStat, applyResultObject } = require("./resultor.js");
const common = /** @type {CountlyCommon} */(require("../../../../api/utils/common.js"));
const { loadDrillAPI } = require("./lib/utils.js");
/** @type {LogObject} */
const log = require('../../../../api/utils/common').log('push:composer');
const { RESCHEDULABLE_DATE_TRIGGERS, scheduleMessageByDateTrigger } = require("./scheduler.js");
const QUEUE_WRITE_BATCH_SIZE = 100;

/**
 *
 * @param {MongoDb} db
 * @param {ScheduleEvent[]} scheduleEvents
 * @returns {Promise<number>}
 */
async function composeAllScheduledPushes(db, scheduleEvents) {
    let totalNumberOfPushes = 0;
    for (let i = 0; i < scheduleEvents.length; i++) {
        const scheduleEvent = scheduleEvents[i];
        try {
            const result = await composeScheduledPushes(db, scheduleEvent)
            totalNumberOfPushes += result;
        }
        catch(err) {
            log.e("Error while composing scheduleEvents", err);
            // TODO: handle error as result
        }
    }
    return totalNumberOfPushes;
}

/**
 *
 * @param {MongoDb} db
 * @param {ScheduleEvent} scheduleEvent
 * @returns {Promise<number>}
 */
async function composeScheduledPushes(db, { appId, scheduleId, messageId, timezone }) {
    // load necessary documents:
    /** @type {MessageCollection} */
    const messageCol = db.collection("messages");
    /** @type {ScheduleCollection} */
    const scheduleCollection = db.collection("message_schedules");
    const messageDoc = await messageCol.findOne({ _id: messageId });
    if (!messageDoc) {
        await scheduleCollection.deleteMany({ messageId });
        log.i("Message", messageId.toString(),
            "was deleted. Cleaning up all schedules for this message.");
        return 0;
    }
    const scheduleDoc = await scheduleCollection.findOne({
        _id: scheduleId, status: "scheduled" });
    if (!scheduleDoc) {
        log.i("Schedule", scheduleId.toString(),
            "for message" + messageId.toString(), "was deleted or canceled.");
        return 0;
    }
    const appDoc = await db.collection("apps").findOne({
        _id: scheduleDoc.appId });
    if (!appDoc) {
        log.i("App", appId.toString(), "is deleted");
        return 0;
    }

    if (scheduleDoc.messageOverrides?.contents) {
        messageDoc.contents = [
            ...messageDoc.contents,
            ...scheduleDoc.messageOverrides.contents
        ];
    }

    const stream = await getUserStream(
        db,
        messageDoc,
        appDoc.timezone,
        timezone,
        scheduleDoc.audienceFilters
    );
    const compileTemplate = createTemplate(messageDoc);
    const proxy = await loadProxyConfiguration(db);
    const creds = await loadCredentials(db, appId);

    // check if there's a missing credential
    for (let i = 0; i < messageDoc.platforms.length; i++) {
        const p = messageDoc.platforms[i];
        if (!creds[p]) {
            const title = PLATFORM_KEYMAP[p]?.title ?? "unknown ("+ p +")";
            log.e("Missing", title, "configuration for message",
                messageId.toString());
        }
    }

    /** @type {PushEvent[]} */
    let events = [];
    const resultObject = buildResultObject();
    for await (let user of stream) {
        let tokenObj = user?.tk?.[0]?.tk;
        if (!tokenObj) {
            continue;
        }
        for (let pf in tokenObj) {
            const platform = /** @type {PlatformKeys} */(pf[0]);
            if (!(platform in creds)) {
                continue;
            }
            const env = /** @type {PlatformEnvKeys} */(pf[1]);
            const token = /** @type {string} */(
                tokenObj[/** @type {PlatformCombinedKeys} */(pf)]
            );
            const language = user.la ?? "default";
            let variables = {
                ...user,
                ...(scheduleDoc.messageOverrides?.variables ?? {})
            };
            /** @type {PushEvent} */
            const push = {
                appId: appId,
                messageId: messageId,
                scheduleId: scheduleId,
                saveResult: messageDoc.saveResults,
                token,
                uid: user.uid,
                platform,
                env,
                language,
                credentials: creds[platform],
                message: compileTemplate(platform, variables),
                proxy,
            };

            events.push(push);
            if (events.length === QUEUE_WRITE_BATCH_SIZE) {
                await queue.sendPushEvents(events);
                events = [];
            }
            // update results
            increaseResultStat(resultObject, platform, language, "total");
        }
    }
    // write the remaining pushes in the buffer
    if (events && events.length) {
        await queue.sendPushEvents(events);
    }
    // update the message document
    await applyResultObject(db, scheduleId, messageId, resultObject);

    // check if we need to re-schedule this message
    const reschedulableTrigger = messageDoc.triggers
        .find(trigger => RESCHEDULABLE_DATE_TRIGGERS.includes(trigger.kind))
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
 * @param {Message} message
 * @returns {{[key: string]: 1}}
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

/**
 * @param {MongoDb} db
 * @param {Message} message
 * @param {string=} appTimezone
 * @param {string=} timezone
 * @param {AudienceFilters=} filters
 * @returns {Promise<Readable & AsyncIterable<User>>}
 */
async function getUserStream(db, message, appTimezone, timezone, filters) {
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
    for (let pKey of message.platforms) {
        const pfKeys = PLATFORM_KEYMAP[pKey].pf;
        for (let pfKey of pfKeys) {
            platformFilters.push({ ["tk" + pfKey]: { $exists: true } });
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
        filterPipeline = await buildPipelineFromFilters(db, filters, appId, appTimezone);
    }
    return db.collection("app_users" + appId)
        .aggregate(
            [{ $match }, ...filterPipeline, { $lookup }, { $project }],
            { allowDiskUse: true }
        )
        .stream();
}

/**
 *
 * @param {MongoDb} db
 * @param {ObjectId} appId
 * @returns {Promise<{[key: string]: SomeCredential}>}
 */
async function loadCredentials(db, appId) {
    const app = await db.collection("apps").findOne({ _id: appId });
    const configuredCreds = app?.plugins?.push || {};

    const creds = /** @type {{[key: string]: SomeCredential}} */({});
    for (let pKey in configuredCreds) {
        const credId = configuredCreds?.[pKey]?._id;
        if (!credId || credId === "demo") {
            continue;
        }
        const cred = /** @type {SomeCredential|null} */(
            await db.collection("creds").findOne({ _id: credId })
        );
        if (cred) {
            creds[pKey] = cred;
        }
    }
    return creds;
}

/**
 * @param {MongoDb} db
 * @returns {Promise<ProxyConfiguration|undefined>}
 */
async function loadProxyConfiguration(db) {
    /** @type {import("mongodb").Collection<{ _id: string; push?: { proxyhost: string, proxyport: string; proxyuser: string; proxypass: string; proxyunauthorized: boolean; } }>} */
    const col = db.collection('plugins');
    const plugins = await col.findOne({ _id: "plugins" });
    const pushConfig = plugins?.push;
    if (!pushConfig || !pushConfig.proxyhost || !pushConfig.proxyport) {
        return;
    }
    const { proxyhost: host, proxyport: port, proxyuser: user,
        proxypass: pass, proxyunauthorized: unauth } = pushConfig;
    return { host, port, auth: !(unauth || false), pass, user }
}

/**
 * @param {MongoDb} db
 * @param {AudienceFilters} filters
 * @param {string} appIdStr
 * @param {string=} appTimezone
 * @returns {Promise<Array<{ $match: { [key: string]: any } }>>}
 */
async function buildPipelineFromFilters(db, filters, appIdStr, appTimezone) {
    /** @type {Array<{ $match: { [key: string]: any } }>} */
    const pipeline = [];
    // User ids:
    if (Array.isArray(filters.uids)) {
        pipeline.push({ $match: { $in: filters.uids } });
    }
    // Cohorts:
    if (Array.isArray(filters?.cohorts)) {
        /** @type {{ [cohortPath: string]: "true" }} */
        const cohortFilters = {};
        for (let i = 0; i < filters.cohorts.length; i++) {
            cohortFilters["chr." + filters.cohorts[i] + ".in"] = "true";
        }
        pipeline.push({ $match: cohortFilters });
    }
    // Geos:
    if (Array.isArray(filters?.geos)) {
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
    if (filters?.user) {
        const userFilter = JSON.parse(filters.user);
        if (appTimezone) {
            let params = {
                time: common.initTimeObj(appTimezone, Date.now()),
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
    if (filters?.drill && appTimezone) {
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
                let cohorts = {}
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
                    time: common.initTimeObj(appTimezone, Date.now()),
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
    if (filters?.cap) {
        const field = "msgs." + filters.cap.messageId.toString();
        // limit the maximum number of push notifications for the given messageId
        if (typeof filters.cap.maxMessages === "number" && filters.cap.maxMessages > 0) {
            pipeline.push({
                $match: {
                    [field + "." + String(filters.cap.maxMessages)]: {
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

module.exports = {
    composeAllScheduledPushes,
    composeScheduledPushes,
    loadProxyConfiguration,
    loadCredentials,
    getUserStream,
    userPropsProjection,
}