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
 * @typedef {Omit<APNP12Credentials, "type"|"_id"|"cert"|"secret"|"hash">&TLSKeyPair} P12CertificateContents
 * @typedef {import("http2").OutgoingHttpHeaders} OutgoingHttpHeaders
 */

const jwt = require("jsonwebtoken");
const http2Wrapper = require("http2-wrapper");
const nodeForge = require("node-forge");
const { URL } = require("url");
const { ObjectId } = require("mongodb");
const { PROXY_CONNECTION_TIMEOUT } = require("../constants/proxy-config.json");
const {
    serializeProxyConfig,
    removeUPFromUserPropertyKey
} = require("../lib/utils.js");
const { SendError, InvalidResponse, APNSErrors } = require("../lib/error.js");
const { createHash } = require("crypto");
/** @type {{[serializedProxyConfig: string]: ProxyCache}} */
const PROXY_CACHE = {};
/** @type {{[credentialHash: string]: JWTCache }} */
const TOKEN_CACHE = {};
const TOKEN_TTL = 20 * 60 * 1000; // 20 mins
/** @type {{[hash: string]: TLSKeyPairCache}} */
const TLS_KEY_PAIR_CACHE = {};

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
    };
    return agent;
}

/**
 * @param {APNP12Credentials} credentials
 * @returns {TLSKeyPair}
 */
function getTlsKeyPair(credentials) {
    const cache = TLS_KEY_PAIR_CACHE[credentials.hash];
    if (cache) {
        cache.lastUsedAt = Date.now();
        return cache.keyPair;
    }
    const { cert, key } = parseP12Certificate(
        credentials.cert, credentials.secret
    );
    const keyPair = { cert, key };
    TLS_KEY_PAIR_CACHE[credentials.hash] = { keyPair, lastUsedAt: Date.now() };
    return keyPair;
}

/**
 * @param {string} certificate - Base64 encoded P12 certificate
 * @param {string=} secret - Passphrase for the P12 certificate
 * @returns {P12CertificateContents}
 */
function parseP12Certificate(certificate, secret) {
    /** @type {Partial<P12CertificateContents>&{topics: string[]}} */
    const result = {
        cert: undefined,
        key: undefined,
        notBefore: undefined,
        notAfter: undefined,
        bundle: undefined,
        topics: [],
    };

    // parse the key pair
    const buffer = nodeForge.util.decode64(certificate);
    const asn1 = nodeForge.asn1.fromDer(buffer);
    const p12 = nodeForge.pkcs12.pkcs12FromAsn1(asn1, false, secret);
    const cert = p12.getBags({
        bagType: nodeForge.pki.oids.certBag
    })?.[nodeForge.pki.oids.certBag]?.[0];
    const pk = p12.getBags({
        bagType: nodeForge.pki.oids.pkcs8ShroudedKeyBag
    })?.[nodeForge.pki.oids.pkcs8ShroudedKeyBag]?.[0];
    if (!cert || !pk || !cert.cert || !pk.key) {
        throw new Error('Failed to get TLS key pairs from crededentials');
    }
    result.cert = nodeForge.pki.certificateToPem(cert.cert);
    result.key = nodeForge.pki.privateKeyToPem(pk.key);

    // parse extensions for topics, bundle, notBefore and notAfter:
    p12.safeContents.forEach(safeContents => {
        safeContents.safeBags.forEach(safeBag => {
            if (safeBag.cert) {
                if (safeBag.cert.validity) {
                    if (safeBag.cert.validity.notBefore) {
                        result.notBefore = safeBag.cert.validity.notBefore;
                    }
                    if (safeBag.cert.validity.notAfter) {
                        result.notAfter = safeBag.cert.validity.notAfter;
                    }
                }
                var tpks = safeBag.cert.getExtension({
                    // @ts-ignore
                    id: '1.2.840.113635.100.6.3.6'
                });
                // @ts-ignore
                if (tpks && tpks.value) {
                    // @ts-ignore
                    let strValue = /** @type {string} */(tpks.value)
                        .replace(/0[\x00-\x1f\(\)!]/gi, '');
                    strValue = strValue.replace('\f\f', '\f');
                    let value = strValue.split('\f')
                        .map(s => s.replace(/[^A-Za-z\-\.]/gi, '').trim());
                    // next line is a workaround for a p12 file not being parsed
                    // correctly. in the problematic file, first topic was
                    // starting with a "-". full value of the extension was
                    // something like this:
                    //   - 0\x82\x01\x05\f-ly.count.CountlySwift0\x07\f
                    //   - \x05topic\f2ly.count.CountlySwift.voip0\x06\
                    //   - f\x04voip\f:ly.count.CountlySwift.complicati
                    //   - on0\x0E\f\fcomplication\f6ly.count.CountlySw
                    //   - ift.voip-ptt0\x0B\f\t.voip-ptt
                    value = value.map(
                        s => s.replace(/^[^A-Za-z\.]/, "").trim()
                    );
                    value.shift();
                    for (var i = 0; i < value.length; i++) {
                        for (var j = 0; j < value.length; j++) {
                            if (i !== j && value[j].indexOf(value[i]) === 0) {
                                if (result.topics.indexOf(value[i]) === -1
                                    && value[i]
                                    && value[i].indexOf('.') !== -1
                                    && value[i].indexOf(".") !== 0
                                ) {
                                    result.topics.push(value[i]);
                                }
                                if (result.topics.indexOf(value[j]) === -1
                                    && value[j]
                                    && value[j].indexOf('.') !== -1
                                    && value[j].indexOf(".") !== 0
                                ) {
                                    result.topics.push(value[j]);
                                }
                            }
                        }
                    }
                }
            }
        });
    });
    if (result.topics.length === 0) {
        throw new Error('Not a universal (Sandbox & Production) certificate');
    }
    if (!result.notBefore || !result.notAfter) {
        throw new Error('No validity dates in the certificate');
    }
    result.topics.sort((a, b) => a.length - b.length);
    result.bundle = result.topics[0];
    result.topics = result.topics;
    return /** @type {P12CertificateContents} */(result);
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
 * @param {APNCredentials} creds
 * @param {ProxyConfiguration=} proxyConfig - FCM credentials object
 * @returns {Promise<{ creds: APNCredentials, view: APNCredentials }>}
 * @throws {Error} if credentials are invalid
 */
async function validateCredentials(creds, proxyConfig) {
    /** @type {APNCredentials} */
    let view;
    if (creds.type === "apn_universal") {
        if (typeof creds.cert !== "string" || !creds.cert) {
            throw new Error(`Invalid APNP12Credentials: cert is required and must be a string`);
        }
        const { key, cert, ...content } = parseP12Certificate(
            creds.cert,
            creds.secret
        );
        if (content.notBefore.getTime() > Date.now()) {
            throw new Error('Certificate is not valid yet');
        }
        if (content.notAfter.getTime() < Date.now()) {
            throw new Error('Certificate is expired');
        }
        creds = { ...creds, ...content };
        view = { ...creds, cert: "APN Sandbox & Production Certificate (P12)" };
    }
    else { // creds.type === "apn_token"
        const requiredFields = /** @type {Array<keyof APNP8Credentials>} */(
            ["key", "keyid", "bundle", "team"]
        );
        for (const field of requiredFields) {
            if (!creds[field] || typeof creds[field] !== "string") {
                throw new Error(`Invalid APNP8Credentials: ${field} is required`);
            }
        }
        if (creds.key.indexOf(';base64,') !== -1) {
            let mime = creds.key.substring(0, creds.key.indexOf(';base64,'));
            if (!['data:application/x-pkcs8', 'data:application/pkcs8'].includes(mime)) {
                throw new Error(`Invalid APNP8Credentials: key must be a base64 encoded P8 file`);
            }
            creds.key = creds.key.substring(creds.key.indexOf(',') + 1);
        }
        view = { ...creds, key: 'APN Key File (P8)' };
    }
    const hash = createHash("sha256").update(JSON.stringify(creds)).digest("hex");
    creds.hash = hash;
    view.hash = hash;

    try {
        await send({
            credentials: creds,
            appId: new ObjectId,
            messageId: new ObjectId,
            scheduleId: new ObjectId,
            uid: "1",
            token: Math.random() + '',
            message: {
                aps: {
                    sound: 'default',
                    alert: {
                        title: 'test',
                        body: 'test'
                    }
                },
                c: { i: Math.random() + '' }
            },
            saveResult: false,
            platform: "i",
            env: "p",
            language: "en",
            platformConfiguration: {
                setContentAvailable: false
            },
            trigger: {
                kind: "plain",
                start: new Date(),
            },
            appTimezone: "NA",
            proxy: proxyConfig,
        });
    }
    catch(error) {
        const invalidTokenErrorMessage = "INVALID_ARGUMENT: The registration token is not a valid FCM registration token";
        if (error instanceof SendError && error.message === invalidTokenErrorMessage) {
            return { creds, view };
        }
        throw error;
    }

    throw new Error("Test connection failed for an unknown reason.");
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
    parseP12Certificate,
    getTlsKeyPair,
    getAuthToken,
    getProxyAgent,
    mapMessageToPayload,
    validateCredentials,
};