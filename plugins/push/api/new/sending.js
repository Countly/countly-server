/**
 * @typedef {import('./types/queue.ts').JobTicket} JobTicket
 * @typedef {import('./types/queue.ts').PushTicket} PushTicket
 * @typedef {import('./types/message.ts').Message} Message
 * @typedef {import('./types/credentials.ts').SomeCredential} SomeCredential
 * @typedef {import('./types/proxy.ts').ProxyConfiguration} ProxyConfiguration
 * @typedef {import("mongodb").Db} MongoDb
 * @typedef {import('./types/schedule.ts').MessageSchedule} MessageSchedule
 */

const common = require('../../../../api/utils/common');
const { sendPushTicket } = require("./queue/kafka.js");
const { Template } = require("../send/data/template.js");
const { send: androidSend } = require("./platforms/android.js");
const { Message: OldMessage } = require("../send/data/message.js");
const { PLATFORM: OLD_PLATFORM } = require("../send/platforms");
const { ObjectId } = require('mongodb');

/** @type {MongoDb} */
const db = common.db;

const PLATFORM_CONFIGS = {
    "a": { // android message
        platforms: ["a", "h"],   // android, huawei
        fields: ["p"],           // production
        pf: ["ap", "hp"],
    },
    "i": { // apple ios message
        platforms: ["i"],        // ios
        fields: ["p", "d", "a"], // production, development, adhoc/testflight token
        pf: ["ip", "id", "ia"],
    }
};

/**
 * 
 * @param {JobTicket} messageScheduleJob
 */
async function sendMessagesToQueue(messageScheduleJob) {
    const messageSchedule =/** @type {MessageSchedule|null} */(
        await db.collection("message_schedules").findOne({
            _id: messageScheduleJob.messageScheduleId
        })
    );
    // if the schedule is canceled
    if (!messageSchedule) {
        // TODO: delete the schedule record
        // TODO: log
        // do not continue
        return;
    }
    
    const message = /** @type {Message} */(
        await db.collection("messages").findOne({
            _id: messageScheduleJob.messageId
        })
    );
    // if message is deleted
    if (!message) {
        // TODO: delete all schedules for this message
        // TODO: log
        // do not continue
        return;
    }

    // pipeline:
    const $match = {};
    const $project = { uid: 1, tk: 1, la: 1, };
    const $lookup = {
        from: `push_${messageScheduleJob.appId.toString()}`,
        localField: 'uid',
        foreignField: '_id',
        as: "tk"
    };
    // TODO: check what different ios FIELDS do here (production, development, adhoc)
    // Platform filters and projection:
    const platformFilters = [];
    for (let pKey of message.platforms) {
        const pfKeys = PLATFORM_CONFIGS[pKey].pf;
        for (let pfKey of pfKeys) {
            platformFilters.push({ ["tk" + pfKey]: { $exists: true } });
        }
    }
    if (platformFilters.length) {
        $match.$or = platformFilters;
    }
    // timezone filter:
    if (messageScheduleJob.timezone) {
        $match.tz = messageScheduleJob.timezone;
    }
    // TODO: other filters to aggregation pipeline (check PusherPopper.steps)
    // TODO: for parametric messages, add user fields to projection
    // TODO: build parametric messages
    const compileTemplate = createTemplate(message);
    const stream = db.collection(`app_users${message.app.toString()}`)
        .aggregate([{$match}, {$lookup}, {$project}], { allowDiskUse: true })
        .stream();

    // check if there's a missing credential
    const creds = await loadCreds(messageScheduleJob.appId);
    for (let i = 0; i < message.platforms.length; i++) {
        if (!creds[message.platforms[i]]) {
            // TODO: throw proper error
            throw new Error("Missing platform configuration");
        }
    }

    // load proxy configuration
    const proxy = await loadProxyConfig();

    for await (let user of stream) {
        let pushUser = user?.tk?.[0];
        if (!pushUser) {
            continue;
        }
        for (let pf in pushUser.tk) {
            const token = pushUser.tk[pf];
            const language = pushUser.la || "default";
            const platform = pf[0];
            /** @type {PushTicket} */
            const push = {
                appId: messageScheduleJob.appId,
                messageId: messageScheduleJob.messageId,
                messageScheduleId: messageScheduleJob.messageScheduleId,
                token,
                platform: pf[0],
                credentials: creds[pf[0]],
                // TODO: build parametric message for user
                message: compileTemplate({ language, platform }),
                proxy,
            };

            await sendPushTicket(push);
        }
    }
}

/**
 * 
 * @param {PushTicket} push 
 */
async function sendPushMessage(push) {
    if (push.platform === "a") {
        await androidSend(push);
    }
    else if (push.platform === "i") {
        // TODO: IMPLEMENT
        console.log("IOS SEND IS NOT IMPLEMENTED");
    }
    else if (push.platform === "h") {
        // TODO: IMPLEMENT
        console.log("HUAWEI SEND IS NOT IMPLEMENTED");
    }
}

module.exports = {
    sendMessagesToQueue,
    sendPushMessage,
}

/**
 * 
 * @param {Message} message 
 */
function createTemplate(message) {
    const messageObj = new OldMessage(message);
    const platforms = message.platforms.map(key => OLD_PLATFORM[key]);
    const templates = Object.fromEntries(
        platforms.map(
            platform => [
                platform.key,
                new Template(messageObj, platform)
            ]
        )
    );
    // a note (push document):
    // the ones start with a * is required by the template builder
    // {
    //     "_id": "655ef9d845f3a64d09de2572",
    //     "a": "655b6dcd84ea28c204af50ca",    app id (apps._id)
    //     "m": "655dd2d6b29f24798f570056",    message id (messages._id)
    //     "p": "a",                           platform: android
    //     "f": "p",                           token type (p: production, d: debug, a: test(ad hoc))
    //     "u": "1",                           user id (app_users{APPID}.uid)
    //     "t": "cRTmhA...",                   device token
    //     *"h": "a535fbb5d4664c49",            hash created with "pr" key
    //     *"pr": {                             variables to interpolate message string
    //         "la": "en"                      language (default)
    //     }
    // }
    return function(user) {
        const note = {
            h: String(Math.random()),
            pr: {
                la: user.language,
            }
        }
        return templates[user.platform].compile(note);
    }
}

/**
 * 
 * @param {ObjectId} appId 
 * @returns {Promise<{[key: string]: SomeCredential}>}
 */
async function loadCreds(appId) {
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
 * @returns {Promise<ProxyConfiguration|undefined>}
 */
async function loadProxyConfig() {
    const plugins = await db.collection('plugins').findOne({ _id: "plugins" });
    if (!plugins) {
        return;
    }
    const pushConfig = plugins?.push;
    if (!pushConfig) {
        return;
    }
    if (!pushConfig.proxyhost || !pushConfig.proxyport) {
        return;
    }
    const { proxyhost: host, proxyport: port, proxyuser: user,
        proxypass: pass, proxyunauthorized: unauth } = pushConfig;
    return { host, port, auth: !(unauth || false), pass, user }
}