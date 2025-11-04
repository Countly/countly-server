/**
 * @typedef {import("../types/message.ts").Message} Message
 * @typedef {import("../types/message.ts").Content} Content
 * @typedef {import("../types/user.ts").User} User
 * @typedef {import("../types/queue.ts").HuaweiMessagePayload} HuaweiMessagePayload
 * @typedef {import("../types/credentials.ts").HMSCredentials} HMSCredentials
 * @typedef {import("../types/credentials.ts").UnvalidatedHMSCredentials} UnvalidatedHMSCredentials
 * @typedef {import("../types/utils.ts").ProxyConfiguration} ProxyConfiguration
 * @typedef {import("../types/queue.ts").PushEvent} PushEvent
 * @typedef {{ token?: string; expiryDate?: number; promise?: Promise<string>; }} TokenCache
 * @typedef {import("../lib/template.js").TemplateContext} TemplateContext
 */
const https = require("https");
const { ObjectId } = require("mongodb");
const { URLSearchParams } = require("url");
const { HttpsProxyAgent } = require("https-proxy-agent");
const { buildProxyUrl } = require("../lib/utils.js");
const { createHash } = require("crypto");
const {
    mapMessageToPayload: mapMessageToAndroidPayload
} = require("./android.js");
const { PROXY_CONNECTION_TIMEOUT } = require("../constants/proxy-config.json");
const {
    InvalidCredentials,
    SendError,
    InvalidResponse,
    InvalidDeviceToken,
    HMSErrors
} = require("../lib/error.js");
/** @type {{[credentialHash: string]: TokenCache}} */
const TOKEN_CACHE = {};

/**
 * Gets an auth token for the given HMS credentials
 *
 * @param {HMSCredentials} credentials - HMS Credentials
 * @param {ProxyConfiguration=} proxy - Optional proxy configuration
 * @returns {Promise<string>} Resolves with auth token
 */
async function getAuthToken(credentials, proxy) {
    if (credentials.hash in TOKEN_CACHE) {
        const cache = TOKEN_CACHE[credentials.hash];
        if (cache.token) {
            if (cache.expiryDate && cache.expiryDate > Date.now()) {
                return cache.token;
            }
        }
        else if (cache.promise) {
            return cache.promise;
        }
    }

    TOKEN_CACHE[credentials.hash] = {};

    const requestBody = (new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: credentials.app,
        client_secret: credentials.secret
    })).toString();

    /** @type {HttpsProxyAgent<"proxy-address">=} */
    let agent;
    if (proxy) {
        agent = new HttpsProxyAgent(buildProxyUrl(proxy), {
            keepAlive: true,
            timeout: PROXY_CONNECTION_TIMEOUT,
            rejectUnauthorized: proxy.auth,
        });
    }

    const promise = new Promise((resolve, reject) => {
        let request = https.request({
            agent,
            hostname: 'oauth-login.cloud.huawei.com',
            path: '/oauth2/v3/token',
            method: 'POST',
            headers: {
                accept: 'application/json',
                'Content-Type': 'application/x-www-form-urlencoded',
                'Content-Length': requestBody.length
            }
        }, response => {
            let data = '';
            response.on('data', chunk => data = data + chunk);
            response.on('end', () => {
                // raw response to attach to error
                const raw = Object.entries(response.headers)
                    .map(([key, value]) => key + ": " + value)
                    .join("\n")
                    + "\n\n" + data;

                let parsed;
                try {
                    parsed = JSON.parse(data);
                }
                catch (error) {
                    return reject(new InvalidResponse(
                        "Auth: response is not a valid json",
                        raw
                    ));
                }

                if (response.statusCode === 200 && parsed?.access_token) {
                    const expiryDate = parsed.expires_in
                        ? Date.now() + Number(parsed.expires_in) * 1000 - 5 * 60 * 1000
                        : Date.now() + 30 * 60 * 1000; // default 30 mins
                    TOKEN_CACHE[credentials.hash].token = parsed.access_token;
                    TOKEN_CACHE[credentials.hash].expiryDate = expiryDate;
                    return resolve(parsed.access_token);
                }

                if (parsed?.error_description) {
                    return reject(new SendError(
                        "Auth: " + parsed.error_description, raw
                    ));
                }

                return reject(new InvalidResponse("HMS auth: invalid response", raw));
            });
        });

        request.on('error', err => reject(err));
        request.end(requestBody);
    });

    TOKEN_CACHE[credentials.hash].promise = promise;
    return promise;
}

/**
 * Sends a push notification via HMS
 * @param {PushEvent} pushEvent - Push event object
 * @returns {Promise<string>} Resolves with raw HMS response
 */
async function send(pushEvent) {
    const credentials = /** @type {HMSCredentials} */(pushEvent.credentials);
    const authToken = await getAuthToken(credentials, pushEvent.proxy);

    /** @type {HttpsProxyAgent<"proxy-address">=} */
    let agent;
    if (pushEvent.proxy) {
        agent = new HttpsProxyAgent(buildProxyUrl(pushEvent.proxy), {
            keepAlive: true,
            timeout: PROXY_CONNECTION_TIMEOUT,
            rejectUnauthorized: pushEvent.proxy.auth,
        });
    }
    const huaweiContent = /** @type {HuaweiMessagePayload} */(
        pushEvent.payload
    );
    huaweiContent.message.token = [pushEvent.token];
    const payload = JSON.stringify(huaweiContent);
    delete huaweiContent.message.token;

    return new Promise((resolve, reject) => {
        const request = https.request({
            agent: agent,
            hostname: 'push-api.cloud.huawei.com',
            path: '/v1/' + credentials.app + '/messages:send',
            method: 'POST',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
                'Authorization': "Bearer " + authToken,
                "Content-Length": payload.length
            },
        }, (response) => {
            let data = "";
            response.on("data", chunk => data += chunk);
            response.on("end", () => {
                // raw response to attach to error
                const raw = Object.entries(response.headers)
                    .map(([key, value]) => key + ": " + value)
                    .join("\n")
                    + "\n\n" + data;

                let parsed;
                try {
                    parsed = JSON.parse(data);
                }
                catch (error) {
                    return reject(new InvalidResponse(
                        "HMS response body couldn't be parsed",
                        raw
                    ));
                }

                if (response.statusCode === 200
                    && parsed?.code === "80000000") {
                    return resolve(raw);
                }

                if (parsed?.code && parsed.code in HMSErrors) {
                    const { message, mapsTo } = HMSErrors[parsed.code];
                    const combined = parsed.code + ": " + message;
                    if (mapsTo) {
                        return reject(new mapsTo(combined, raw));
                    }
                    return reject(new SendError(combined, raw));
                }

                return reject(new InvalidResponse("Invalid response", raw));
            });
        });
        request.on("error", reject);
        request.end(payload);
    });
}

/**
 * Validates the given unvalidated credentials, returns the validated
 * @param {UnvalidatedHMSCredentials} unvalidatedCreds - Unvalidated credentials
 * @param {ProxyConfiguration=} proxyConfig - Optional proxy configuration
 * @returns {Promise<{ creds: HMSCredentials, view: HMSCredentials }>} Validated credentials and a view object
 * @throws {Error} if credentials are invalid
 */
async function validateCredentials(unvalidatedCreds, proxyConfig) {
    if (unvalidatedCreds.type !== "hms") {
        throw new InvalidCredentials("Invalid credentials type");
    }
    const requiredFields = /** @type {Array<keyof UnvalidatedHMSCredentials>} */(
        ["app", "secret"]
    );
    for (const field of requiredFields) {
        if (!unvalidatedCreds[field] || typeof unvalidatedCreds[field] !== "string") {
            throw new InvalidCredentials(
                `Invalid HMSCredentials: ${field} is required and must be a string`
            );
        }
    }
    if (unvalidatedCreds.app.length < 6 || unvalidatedCreds.app.length > 32) {
        throw new InvalidCredentials(
            "Invalid HMSCredentials: app length must be between 6 and 32 characters"
        );
    }
    if (unvalidatedCreds.secret.length !== 64) {
        throw new InvalidCredentials(
            "Invalid HMSCredentials: secret length must be 64 characters"
        );
    }
    /** @type {HMSCredentials} */
    const creds = {
        ...unvalidatedCreds,
        _id: new ObjectId(),
        hash: createHash("sha256").update(JSON.stringify(unvalidatedCreds))
            .digest("hex")
    };
    /** @type {HMSCredentials} */
    const view = {
        ...creds,
        secret: `HPK secret "${creds.secret.slice(0, 10)}...${creds.secret.slice(-10)}"`,
    };
    try {
        await send({
            credentials: creds,
            appId: new ObjectId,
            messageId: new ObjectId,
            scheduleId: new ObjectId,
            uid: "1",
            token: Math.random() + '',
            payload: {
                message: {
                    data: '{"c.i":"' + Math.random() + '","title":"test","message":"test"}',
                    android: {}
                }
            },
            saveResult: false,
            platform: "h",
            env: "p",
            language: "en",
            platformConfiguration: {},
            trigger: {
                kind: "plain",
                start: new Date(),
            },
            appTimezone: "NA",
            proxy: proxyConfig,
        });
    }
    catch (error) {
        if (error instanceof InvalidDeviceToken) {
            return { creds, view };
        }
        throw error;
    }
    throw new InvalidCredentials("Test connection failed for an unknown reason.");
}

/**
 * Maps message contents to an HMS request payload
 * @param {Message} messageDoc - Message document
 * @param {Content} content - Content object built from message contents in template builder
 * @param {TemplateContext} context - User object or a map of custom properties
 * @returns {HuaweiMessagePayload} Huawei message payload
 */
function mapMessageToPayload(messageDoc, content, context) {
    const androidPayload = mapMessageToAndroidPayload(messageDoc, content, context);
    /** @type {HuaweiMessagePayload} */
    const payload = {
        message: {
            data: JSON.stringify(androidPayload.data),
            android: {},
        }
    };
    return payload;
}

module.exports = {
    send,
    getAuthToken,
    mapMessageToPayload,
    validateCredentials,
};