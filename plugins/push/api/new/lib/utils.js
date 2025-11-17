/**
 * @typedef {import("../types/utils").PluginConfigDocument} PluginConfigDocument
 * @typedef {import("../types/utils").PluginConfiguration} PluginConfiguration
 * @typedef {import("../types/utils").ProxyConfiguration} ProxyConfiguration
 * @typedef {import("../types/credentials").APNP12Credentials} APNP12Credentials
 * @typedef {import("../types/credentials").TLSKeyPair} TLSKeyPair
 * @typedef {import("../types/message").PlatformKey} PlatformKey
 * @typedef {import("../types/message").PlatformEnvKey} PlatformEnvKey
 * @typedef {import("../types/message").Message} Message
 * @typedef {import("../types/schedule").Schedule} Schedule
 * @typedef {import("../types/queue.ts").ResultEvent} ResultEvent
 * @typedef {import("mongodb").Db} MongoDb
 * @typedef {{ fetchUsers: (params: any, cb: (err: Error, uids: string[]) => void, db: MongoDb) => void }} DrillAPI
 * @typedef {import("../../../../../types/log").Logger} Logger
 * @typedef {{ [key: string]: any; }} PlainObject
 */

const { URL } = require("url");
const common = require('../../../../../api/utils/common');
const { processEvents: processInternalEvents } = require('../../../../../api/parts/data/events');
const { updateDataPoints } = require('../../../../server-stats/api/parts/stats');
const platforms = require('../constants/platform-keymap');

/**
 * Loads the plugin configuration from the MongoDB database.
 * @returns {Promise<PluginConfiguration|undefined>} The plugin configuration object or undefined if not found.
 */
async function loadPluginConfiguration() {
    /** @type {PluginConfigDocument} */
    const pushConfig = common.plugins.getConfig("push");
    if (!pushConfig) {
        return;
    }
    /** @type {PluginConfiguration} */
    const config = {
        messageResultsTTL: pushConfig.message_results_ttl,
        messageTimeout: pushConfig.message_timeout
    };
    if (pushConfig.proxyhost && pushConfig.proxyport) {
        config.proxy = {
            host: pushConfig.proxyhost,
            port: pushConfig.proxyport,
            auth: !(pushConfig.proxyunauthorized || false),
            user: pushConfig.proxyuser,
            pass: pushConfig.proxypass
        };
    }
    return config;
}

/**
 * Builds a URL object from a ProxyConfiguration object.
 * This function constructs a URL with the scheme set to "http" and the host, port, user, and pass
 * properties from the ProxyConfiguration object.
 * If the user and pass properties are provided, they are set in the URL.
 * @param {ProxyConfiguration} config - The ProxyConfiguration object containing the proxy settings.
 * @returns {URL} A URL object representing the proxy address.
 */
function buildProxyUrl(config) {
    const proxyUrl = new URL("http://google.com");
    proxyUrl.host = config.host;
    proxyUrl.port = config.port;
    if (config.user) {
        proxyUrl.username = config.user;
    }
    if (config.pass) {
        proxyUrl.password = config.pass;
    }
    return proxyUrl;
}

/**
 * Serializes a ProxyConfiguration object into a string.
 * The order of keys is important for consistency.
 * @param {ProxyConfiguration=} config - The ProxyConfiguration object to serialize.
 * @returns {string} The serialized string representation of the ProxyConfiguration.
 */
function serializeProxyConfig(config) {
    /** @type {Array<keyof ProxyConfiguration>} */
    const KEY_ORDER = ["auth", "host", "pass", "port", "user"];
    return config
        ? KEY_ORDER.map(key => config[key]).join("-")
        : "undefined";
}

/**
 * Loads the DrillAPI from the global context or plugin manager.
 * @returns {DrillAPI|undefined} The DrillAPI instance if available, otherwise undefined.
 */
function loadDrillAPI() {
    if (typeof global.it === "function") {
        try {
            return /** @type {{drill: DrillAPI}} */(require("../../../../drill/api/api")).drill;
        }
        catch (err) {
            return;
        }
    }
    else {
        const pluginManager = /** @type {{getPluginsApis: () => {drill: { drill: DrillAPI; }}}} */(
            require("../../../../pluginManager")
        );
        const plugins = pluginManager.getPluginsApis();
        // @ts-ignore
        return plugins.drill.drill;
    }
}

/**
 * Sanitize a MongoDB path by escaping dots, dollar signs, and backslashes.
 * This is necessary to prevent issues with MongoDB queries that use these characters.
 * @param {string} path - The MongoDB path to sanitize.
 * @returns {string} - The sanitized MongoDB path.
 * @example
 * // Returns "user\uff0ename"
 * sanitizeMongoPath("user.name");
 */
function sanitizeMongoPath(path) {
    // escape dots and dollar signs in the path
    return path.replace(/\./g, '\uff0e')
        .replace(/\$/g, '\uff04')
        .replace(/\\/g, '\uff3c');
}

/**
 * Emits [CLY]_push_sent events for each messageId in the results.
 * Updates the data points for each messageId with the number of events.
 * @param {ResultEvent[]} results - Array of ResultEvent objects
 * @param {Logger} log - Logger instance for logging
 */
function updateInternalsWithResults(results, log) {
    /** @type {{[messageId: string]: ResultEvent[]}} */
    const messageIndexedEvents = {};
    for (let i = 0; i < results.length; i++) {
        const mid = results[i].messageId.toString();
        if (!(mid in messageIndexedEvents)) {
            messageIndexedEvents[mid] = [];
        }
        messageIndexedEvents[mid].push(results[i]);
    }
    for (let mid in messageIndexedEvents) {
        const events = messageIndexedEvents[mid];
        const trigger = events[0].trigger;
        const isAutoTrigger = ["cohort", "event"].includes(trigger.kind);
        const isApiTrigger = trigger.kind === "api";
        const params = {
            qstring: {
                events: [
                    {
                        key: "[CLY]_push_sent",
                        count: events.length,
                        segmentation: {
                            i: mid,
                            a: isAutoTrigger,
                            t: isApiTrigger,
                            p: events[0].platform,
                            ap: String(isAutoTrigger) + events[0].platform,
                            tp: String(isApiTrigger) + events[0].platform,
                        }
                    }
                ]
            },
            app_id: events[0].appId,
            appTimezone: events[0].appTimezone,
            time: common.initTimeObj(events[0].appTimezone),
        };
        log.d('Recording %d [CLY]_push_sent\'s: %j', events.length, params);
        processInternalEvents(params).catch(
            /**
             * Logging function for errors that occur while recording events.
             * @param {Error} err - The error that occurred while recording events.
             */
            err => {
                log.e('Error while recording %d [CLY]_push_sent\'s: %j', events.length, params, err);
            }
        ).then(() => log.d('Recorded %d [CLY]_push_sent\'s: %j', events.length, params));
        // @ts-ignore
        updateDataPoints(common.writeBatcher, events[0].appId.toString(), 0, {"p": events.length});
    }
}

/**
 * Recursively flattens an object into a single-level object with dot notation for nested keys.
 * @param {PlainObject} ob - The object to flatten.
 * @returns {PlainObject} A new object with flattened keys.
 */
function flattenObject(ob) {
    /** @type {{ [key: string]: any; }} */
    var toReturn = {};
    for (var i in ob) {
        if (!Object.prototype.hasOwnProperty.call(ob, i)) {
            continue;
        }
        if ((typeof ob[i]) === 'object' && ob[i] !== null) {
            var flatObject = flattenObject(ob[i]);
            for (var x in flatObject) {
                if (!Object.prototype.hasOwnProperty.call(flatObject, x)) {
                    continue;
                }
                toReturn[i + '.' + x] = flatObject[x];
            }
        }
        else {
            toReturn[i] = ob[i];
        }
    }
    return toReturn;
}

/**
 * Cleans up the user property key by removing the "up." prefix.
 * @param {string} key - the user property key to clean up
 * @returns {string} the cleaned up key
 */
function removeUPFromUserPropertyKey(key) {
    return key.replace(/^up\./, "");
}

/**
 * Guesses the platform from the user agent header.
 * @param {string} userAgent - the user agent string to analyze
 * @returns {PlatformKey|undefined} the guessed platform key ('a' for Android, 'i' for iOS, 'h' for Huawei)
 */
function guessThePlatformFromUserAgentHeader(userAgent) {
    if (userAgent.includes('Android') && userAgent.includes('Huawei')) {
        return "h";
    }
    if (userAgent.includes("Android")) {
        return "a";
    }
    if (userAgent.includes("iOS")) {
        return "i";
    }
}

/**
 * Extracts the token from the query string for Android devices.
 * @param {PlainObject} qstring - the query string object
 * @returns {[PlatformKey, PlatformEnvKey, string, string]|undefined} an array containing the platform key, personalization key,
 * the token, and its MD5 hash, or undefined if no token is found
 */
function extractTokenFromQuerystring(qstring) {
    if (qstring.android_token !== undefined && (!qstring.token_provider || qstring.token_provider === 'FCM')) {
        const token = qstring.android_token === 'BLACKLISTED' ? '' : qstring.android_token;
        return [
            "a",
            "p",
            token,
            common.md5Hash(JSON.stringify(token))
        ];
    }
    else if (qstring.ios_token !== undefined && qstring.test_mode in platforms.i.environmentMap) {
        return [
            "i",
            platforms.i.environmentMap[qstring.test_mode],
            qstring.ios_token,
            common.md5Hash(JSON.stringify(qstring.ios_token))
        ];
    }
    else if (qstring.android_token !== undefined && ["HMS", "HPK"].includes(qstring.token_provider)) {
        const token = qstring.android_token === 'BLACKLISTED' ? '' : qstring.android_token;
        return [
            "h",
            "p",
            token,
            common.md5Hash(JSON.stringify(token))
        ];
    }
}

module.exports = {
    buildProxyUrl,
    serializeProxyConfig,
    loadDrillAPI,
    updateInternalsWithResults,
    sanitizeMongoPath,
    flattenObject,
    removeUPFromUserPropertyKey,
    guessThePlatformFromUserAgentHeader,
    extractTokenFromQuerystring,
    loadPluginConfiguration,
};