/**
 * @typedef {import("../types/proxy").ProxyConfiguration} ProxyConfiguration
 * @typedef {import("../types/proxy").ProxyConfigurationKey} ProxyConfigurationKey
 * @typedef {import("../types/credentials").APNP12Credentials} APNP12Credentials
 * @typedef {import("../types/credentials").TLSKeyPair} TLSKeyPair
 * @typedef {import("../types/message").Message} Message
 * @typedef {import("../types/schedule").Schedule} Schedule
 * @typedef {import("mongodb").Db} MongoDb
 */

const { URL } = require("url");
const nodeForge = require("node-forge");
const { DATE_TRIGGERS } = require("../scheduler");

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
 * IGNORE THE LSP ERRORS
 * TODO: GET RID OF THIS
 * @returns {{ fetchUsers: (params: any, cb: (err: Error, uids: string[]) => void, db: MongoDb) => void }}
 */
function loadDrillAPI() {
    if (typeof global.it === "function") {
        try {
            return require("../../../../drill/api/api").drill;
        }
        catch (err) {
            return undefined;
        }
    }
    else {
        return require("../../../../pluginManager").getPluginsApis().drill.drill;
    }
}

/**
 * @param {Message} message
 * @param {Schedule=} lastSchedule
 * @returns {Message["status"]|Schedule["status"]}
 */
function getMessageStatus(message, lastSchedule) {
    const trigger = message.triggers?.[0];
    const checkMessage = !trigger                // if there's no trigger somehow (this is probably an error)
        || !DATE_TRIGGERS.includes(trigger.kind) // if the trigger is not a date trigger
        || message.status !== "active"           // if the message is not active
        || !lastSchedule;                        // if there's no schedule record yet
    if (checkMessage) {
        return message.status;
    }
    return lastSchedule.status;
}

module.exports = {
    buildProxyUrl,
    serializeProxyConfig,
    parseKeyPair,
    loadDrillAPI,
    getMessageStatus
}