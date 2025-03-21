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
 * @typedef {import('./types/user.ts').User} User
 * @typedef {import('stream').Readable} Readable
 * @typedef {import('./types/utils.ts').LogObject} LogObject
 */

const { ObjectId } = require('mongodb');
const queue = require("./lib/kafka.js"); // do not import by destructuring; it's being mocked in the tests
const { createTemplate, getUserPropertiesUsedInsideMessage } = require("./lib/template.js");
const PLATFORM_KEYMAP = require("./constants/platform-keymap.json");
const { buildResultObject, increaseResultStat, updateScheduleResults} = require("./lib/result.js");
/** @type {LogObject} */
const log = require('../../../../api/utils/common').log('push:composer');

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
async function composeScheduledPushes(db, scheduleEvent) {
    const messageId = scheduleEvent.messageId;
    const message = /** @type {Message|null} */(
        await db.collection("messages").findOne({ _id: messageId })
    );
    if (!message) {
        await db.collection("message_schedules").deleteMany({ messageId });
        log.i("Message " + messageId.toString()
            + " was deleted. Cleaning up all schedules for this message.");
        return 0;
    }
    const scheduleDoc =/** @type {Schedule?} */(
        await db.collection("message_schedules").findOne({
            _id: scheduleEvent.scheduleId,
            status: "scheduled"
        })
    );
    if (!scheduleDoc) {
        log.i("Schedule "+ scheduleEvent.scheduleId.toString()
            + " for message " + messageId.toString()
            + " was deleted or canceled.");
        return 0;
    }

    // TODO: other filters to aggregation pipeline (check PusherPopper.steps)
    const stream = getUserStream(db, message, scheduleEvent.timezone);
    const compileTemplate = createTemplate(message);
    const proxy = await loadProxyConfiguration(db);
    const creds = await loadCredentials(db, scheduleEvent.appId);

    // check if there's a missing credential
    for (let i = 0; i < message.platforms.length; i++) {
        if (!creds[message.platforms[i]]) {
            // TODO: throw a proper error
            throw new Error("Missing platform configuration");
        }
    }

    const result = buildResultObject();
    for await (let user of stream) {
        let tokenObj = user?.tk?.[0]?.tk;
        if (!tokenObj) {
            continue;
        }
        for (let pf in tokenObj) {
            // casts...
            const platform = /** @type {PlatformKeys} */(pf[0]);
            const env = /** @type {PlatformEnvKeys} */(pf[1]);
            const token = /** @type {string} */(
                tokenObj[/** @type {PlatformCombinedKeys} */(pf)]
            );
            const language = user.la ?? "default";

            /** @type {PushEvent} */
            const push = {
                appId: scheduleEvent.appId,
                messageId: scheduleEvent.messageId,
                scheduleId: scheduleEvent.scheduleId,
                saveResult: message.saveResults,
                token,
                uid: user.uid,
                platform,
                env,
                language,
                credentials: creds[platform],
                message: compileTemplate(platform, user),
                proxy,
            };

            await queue.sendPushEvent(push);

            // update results
            increaseResultStat(result, platform, language, "total");
        }
    }

    // update the message document
    await updateScheduleResults(db, scheduleEvent.scheduleId, result);
    return result.total;
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
 * @param {string=} timezone
 * @returns {Readable & AsyncIterable<User>}
 */
function getUserStream(db, message, timezone) {
    const appId = message.app.toString();
    const $match = {};
    const $project = { uid: 1, tk: 1, la: 1, ...userPropsProjection(message) };
    const $lookup = {
        from: "push_" + appId,
        localField: 'uid',
        foreignField: '_id',
        as: "tk"
    };
    // TODO: find out what different ios token types do here (FIELDS: production, debug, adhoc)
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
    if (timezone) {
        $match.tz = timezone;
    }
    return db
        .collection("app_users" + appId)
        .aggregate(
            [{ $match }, { $lookup }, { $project }],
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
    const plugins = await db.collection('plugins').findOne({ _id: "plugins" });
    const pushConfig = plugins?.push;
    if (!pushConfig || !pushConfig.proxyhost || !pushConfig.proxyport) {
        return;
    }
    const { proxyhost: host, proxyport: port, proxyuser: user,
        proxypass: pass, proxyunauthorized: unauth } = pushConfig;
    return { host, port, auth: !(unauth || false), pass, user }
}

module.exports = {
    composeAllScheduledPushes,
    composeScheduledPushes,
    loadProxyConfiguration,
    loadCredentials,
    getUserStream,
    userPropsProjection,
}