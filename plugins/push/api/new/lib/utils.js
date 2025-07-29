/**
 * @typedef {import("../types/proxy").ProxyConfiguration} ProxyConfiguration
 * @typedef {import("../types/proxy").ProxyConfigurationKey} ProxyConfigurationKey
 * @typedef {import("../types/credentials").APNP12Credentials} APNP12Credentials
 * @typedef {import("../types/credentials").TLSKeyPair} TLSKeyPair
 * @typedef {import("../types/message").Message} Message
 * @typedef {import("../types/schedule").Schedule} Schedule
 * @typedef {import("../types/queue.ts").ResultEvent} ResultEvent
 * @typedef {import("mongodb").Db} MongoDb
 * @typedef {import("../types/utils").LogObject} LogObject
 * @typedef {{ fetchUsers: (params: any, cb: (err: Error, uids: string[]) => void, db: MongoDb) => void }} DrillAPI
 */

const { URL } = require("url");
const nodeForge = require("node-forge");
const common = require('../../../../../api/utils/common');
const { processEvents: processInternalEvents } = require('../../../../../api/parts/data/events');
const { updateDataPoints } = require('../../../../server-stats/api/parts/stats');

/**
 *
 * @param {ProxyConfiguration} config
 * @returns {URL}
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
/** @type {ProxyConfigurationKey[]} */
const KEY_ORDER = ["auth", "host", "pass", "port", "user"];
/**
 * @param {ProxyConfiguration=} config
 * @returns {string}
 */
function serializeProxyConfig(config) {
    return config
        ? KEY_ORDER.map(key => config[key]).join("-")
        : "undefined"
}
/**
 * @param {APNP12Credentials} credentials
 * @returns {TLSKeyPair} PEM strings
 */
function parseKeyPair(credentials) {
    const buffer = nodeForge.util.decode64(credentials.cert);
    const asn1 = nodeForge.asn1.fromDer(buffer);
    const p12 = nodeForge.pkcs12.pkcs12FromAsn1(asn1, false, credentials.secret);
    const cert = p12.getBags({
        bagType: nodeForge.pki.oids.certBag
    })?.[nodeForge.pki.oids.certBag]?.[0];
    const pk = p12.getBags({
        bagType: nodeForge.pki.oids.pkcs8ShroudedKeyBag
    })?.[nodeForge.pki.oids.pkcs8ShroudedKeyBag]?.[0];
    if (!cert || !pk || !cert.cert || !pk.key) {
        throw new Error('Failed to get TLS key pairs from crededentials');
    }
    return {
        cert: nodeForge.pki.certificateToPem(cert.cert),
        key: nodeForge.pki.privateKeyToPem(pk.key)
    };
}

/**
 * @returns {DrillAPI=}
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
 * // Returns "user\uff0e.name"
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
 * @param {ResultEvent[]} results
 * @param {LogObject} log
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
             * @param {Error} err
             */
            err => {
                log.e('Error while recording %d [CLY]_push_sent\'s: %j', events.length, params, err);
            }
        ).then(() => log.d('Recorded %d [CLY]_push_sent\'s: %j', events.length, params));
        // @ts-ignore
        updateDataPoints(common.writeBatcher, events[0].appId.toString(), 0, {"p": events.length});
    }
}
module.exports = {
    buildProxyUrl,
    serializeProxyConfig,
    parseKeyPair,
    loadDrillAPI,
    updateInternalsWithResults,
    sanitizeMongoPath
}