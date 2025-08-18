/**
 * @typedef {import("../types/message.ts").Message} Message
 * @typedef {import("../types/message.ts").Content} Content
 * @typedef {import("../types/message.ts").IOSMessageContent} IOSMessageContent
 * @typedef {import("../types/user.ts").User} User
 * @typedef {import("../types/queue.ts").PushEvent} PushEvent
 * @typedef {import("../types/queue.ts").IOSConfig} IOSConfig
 * @typedef {import("../types/credentials.ts").APNCredentials} APNCredentials
 * @typedef {import("../types/credentials.ts").APNP12Credentials} APNP12Credentials
 * @typedef {import("../types/credentials.ts").APNP8Credentials} APNP8Credentials
 * @typedef {import("../types/proxy.ts").ProxyConfiguration} ProxyConfiguration
 * @typedef {{ token: string; createdAt: number; }} JWTCache
 * @typedef {{ agent: http2Wrapper.proxies.Http2OverHttp; lastUsedAt: number; }} ProxyCache
 * @typedef {import("../types/credentials.ts").TLSKeyPair} TLSKeyPair
 * @typedef {{ keyPair: TLSKeyPair; lastUsedAt: number; }} TLSKeyPairCache
 * @typedef {import("http2").OutgoingHttpHeaders} OutgoingHttpHeaders
 */
const jwt = require("jsonwebtoken");
const http2Wrapper = require("http2-wrapper");
const { URL } = require("url");
const { PROXY_CONNECTION_TIMEOUT } = require("../constants/proxy-config.json");
const { serializeProxyConfig, parseKeyPair, removeUPFromUserPropertyKey } = require("../lib/utils.js");
const { SendError, InvalidResponse, APNSErrors } = require("../lib/error.js");
/** @type {{[serializedProxyConfig: string]: ProxyCache}} */
const PROXY_CACHE = {};
/** @type {{[credentialHash: string]: JWTCache }} */
const TOKEN_CACHE = {};
const TOKEN_TTL = 20 * 60 * 1000; // 20 mins

/**
 * This function caches created tokens for a 20 mins. This is required because
 * APNs doesn't like changing tokens more than twice in 20 mins on the same
 * TCP connection.
 * @param {APNCredentials} credentials
 * @returns {string=}
 */
function getAuthToken(credentials) {
    if (credentials.type !== "apn_token") {
        return;
    }
    const cache = TOKEN_CACHE[credentials.hash];
    if (cache && cache.createdAt + TOKEN_TTL > Date.now()) {
        return cache.token;
    }
    const token = jwt.sign(
        { iss: credentials.team, iat: Math.floor(Date.now() / 1000) },
        Buffer.from(credentials.key, "base64").toString(),
        { algorithm: "ES256", header: { alg: "ES256", kid: credentials.keyid } }
    );
    TOKEN_CACHE[credentials.hash] = { token, createdAt: Date.now() };
    return token;
}

/**
 * Creates a proxy agent with the given configuration, then caches it.
 * @param {ProxyConfiguration=} config
 * @returns {http2Wrapper.proxies.Http2OverHttp=}
 */
function getProxyAgent(config) {
    if (!config) {
        return;
    }
    const serializedProxyConfig = serializeProxyConfig(config);
    if (serializedProxyConfig in PROXY_CACHE) {
        PROXY_CACHE[serializedProxyConfig].lastUsedAt = Date.now();
        return PROXY_CACHE[serializedProxyConfig].agent;
    }
    /** @type {http2Wrapper.ProxyOptions} */
    const proxyOptions = {
        url: "http://" + config.host + ":" + config.port,
        headers: { connection: "keep-alive" }
    };
    if (config.user || config.pass) {
        const basicAuth = Buffer.from(config.user + ':' + config.pass)
            .toString('base64');
        if (proxyOptions.headers) {
            proxyOptions.headers["Proxy-Authorization"] = "Basic " + basicAuth;
        }
    }
    const agent = new http2Wrapper.proxies.Http2OverHttp({
        timeout: PROXY_CONNECTION_TIMEOUT,
        proxyOptions
    });
    PROXY_CACHE[serializedProxyConfig] = {
        lastUsedAt: Date.now(),
        agent
    }
    return agent;
}

/** @type {{[hash: string]: TLSKeyPairCache}} */
const tlsKeyPairCache = {};
/**
 * @param {APNP12Credentials} credentials
 * @returns {TLSKeyPair}
 */
function getTlsKeyPair(credentials) {
    const cache = tlsKeyPairCache[credentials.hash];
    if (cache) {
        cache.lastUsedAt = Date.now();
        return cache.keyPair;
    }
    const keyPair = parseKeyPair(credentials);
    tlsKeyPairCache[credentials.hash] = { keyPair, lastUsedAt: Date.now() };
    return keyPair;
}

/**
 * @param {PushEvent} pushEvent
 * @returns {Promise<string>}
 * @throws Unknown connection errors
 * @throws {SendError}
 * @throws {InvalidDeviceToken}
 * @throws {InvalidResponse}
 */
async function send(pushEvent) {
    const hostname = pushEvent.env === "d"
        ? "api.development.push.apple.com"
        : "api.push.apple.com";
    const url = new URL("https://"+ hostname +":2197");
    const credentials = /** @type {APNCredentials} */(pushEvent.credentials);
    /** @type {OutgoingHttpHeaders} */
    const headers = {
        ":method": "POST",
        ":path": "/3/device/" + pushEvent.token,
        ":scheme": url.protocol.replace(/:$/, ""),
        ":authority": url.host,
        "apns-topic": credentials.bundle,
    };
    /** @type {http2Wrapper.RequestOptions} */
    const options = {
        headers,
        agent: getProxyAgent(pushEvent.proxy)
    };
    if (credentials.type === "apn_token") {
        headers.authorization = "Bearer " + getAuthToken(credentials);
    }
    else if (credentials.type === "apn_universal") {
        const keyPair = getTlsKeyPair(credentials);
        options.key = keyPair.key;
        options.cert = keyPair.cert;
    }
    const platformConfig = /** @type {IOSConfig} */(pushEvent.platformConfiguration);
    if (platformConfig.setContentAvailable) {
        headers["apns-priority"] = 5;
    }

    const request = http2Wrapper.request(url, options);

    return new Promise((resolve, reject) => {
        request.on("error", reject);
        request.on("response", (response) => {
            let data = "";
            response.on("data", chunk => data += chunk);
            response.on("end", () => {
                const raw = Object.entries(response.headers)
                    .map(([key, value]) => key + ": " + value)
                    .join("\n")
                    + "\n\n" + data;
                const status = response.statusCode;

                // Success:
                if (status === 200) {
                    return resolve(raw);
                }

                // Error:
                if (!status) {
                    return reject(new InvalidResponse(
                        "APNs response doesn't have a valid status code",
                        raw
                    ));
                }
                try {
                    const parsed = JSON.parse(data);
                    if (parsed.reason && parsed.reason in APNSErrors) {
                        const { message, mapsTo } = APNSErrors[parsed.reason];
                        const combined = parsed.reason + ": " + message;
                        if (mapsTo) {
                            return reject(new mapsTo(combined, raw));
                        }
                        return reject(new SendError(combined, raw));
                    }
                }
                catch(error) {
                    return reject(new InvalidResponse(
                        "APNs response body couldn't be parsed",
                        raw
                    ));
                }
                return reject(
                    new InvalidResponse("Invalid response", raw)
                );
            });
        });
        request.end(JSON.stringify(pushEvent.message));
    });
}

/**
 * Validates the APN credentials
 * @param {APNCredentials} credentials - APN credentials object
 * @returns {Promise<APNCredentials>} credentials with validated and hashed service account file
 * @throws {Error} if credentials are invalid
 */
async function validateCredentials(credentials) {
    console.log(credentials);
    if (credentials.type === "apn_universal") {
        const cert = credentials.cert;
        if (typeof cert !== "string" || !cert) {
            throw new Error(`Invalid APNP12Credentials: cert is required and must be a string`);
        }
    }
    else if (credentials.type === "apn_token") {
        const requiredFields = /** @type {Array<keyof APNP8Credentials>} */(
            ["key", "keyid", "bundle", "team"]
        );
        for (const field of requiredFields) {
            if (!credentials[field] || typeof credentials[field] !== "string") {
                throw new Error(`Invalid APNP8Credentials: ${field} is required`);
            }
        }
    }

    return credentials;
}

/**
 * Maps message contents to an APNS request payload
 * @param {Message} messageDoc - Message document
 * @param {Content} content - Content object built from message contents in template builder
 * @param {User|{[key: string]: string;}} userProps - User object or a map of custom properties
 * @returns {IOSMessageContent} IOS message payload
 */
function mapMessageToPayload(messageDoc, content, userProps) {
    /** @type {IOSMessageContent} */
    const payload = {
        aps: {},
        c: { i: messageDoc._id.toString() }
    };
    if (content.buttons && content.buttons.length) {
        payload.c.b = content.buttons.map((b) => ({ t: b.title, l: b.url }));
        payload.aps["mutable-content"] = 1;
    }
    if (content.sound) {
        payload.aps.sound = content.sound;
    }
    if (content.badge) {
        payload.aps.badge = content.badge;
    }
    if (content.title || content.message) {
        payload.aps.alert = {};
        if (content.title) {
            payload.aps.alert.title = content.title;
        }
        if (content.message) {
            payload.aps.alert.body = content.message;
        }
    }
    if (content.url) {
        payload.c.l = content.url;
    }
    if (content.media) {
        payload.c.a = content.media;
        payload.aps["mutable-content"] = 1;
    }
    if (content.data) {
        const data = JSON.parse(content.data);
        Object.assign(payload, data);
    }
    if (content.extras && content.extras.length && typeof userProps === "object") {
        for (const userPropKey of content.extras) {
            const key = removeUPFromUserPropertyKey(userPropKey);
            if (key in userProps) {
                let value = userProps[key];
                if (value !== undefined || value !== null) {
                    if (!payload.c.e) {
                        payload.c.e = {};
                    }
                    payload.c.e[key] = value;
                }
            }
        }
    }
    if (content.specific && content.specific.length) {
        const platformSpecifics = content.specific
            .reduce((acc, item) => ({ ...acc, ...item }), {});
        if (platformSpecifics.subtitle) {
            payload.aps.alert = payload.aps.alert || {};
            payload.aps.alert.subtitle = /** @type {string} */(platformSpecifics.subtitle);
        }
        if (platformSpecifics.setContentAvailable) {
            payload.aps["content-available"] = 1;
        }
    }
    return payload;
}

module.exports = {
    send,
    getTlsKeyPair,
    getAuthToken,
    getProxyAgent,
    mapMessageToPayload,
};