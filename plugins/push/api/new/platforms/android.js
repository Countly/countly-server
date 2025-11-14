/**
 * @typedef {import("../types/queue").PushEvent} PushEvent
 * @typedef {import("../types/message").Content} Content
 * @typedef {import("../types/message").Message} Message
 * @typedef {import("../types/user").User} User
 * @typedef {import("../types/queue").AndroidMessagePayload} AndroidMessagePayload
 * @typedef {import("../types/utils").ProxyConfiguration} ProxyConfiguration
 * @typedef {{ proxy?: ProxyConfiguration, serviceAccount: string }} FirebaseAppConfiguration
 * @typedef {import("../types/credentials").FCMCredentials} FCMCredentials
 * @typedef {import("../types/credentials").UnvalidatedFCMCredentials} UnvalidatedFCMCredentials
 * @typedef {import("firebase-admin").FirebaseError} FirebaseError
 * @typedef {import("../lib/template").TemplateContext} TemplateContext
 */
const firebaseAdmin = require("firebase-admin");
const { HttpsProxyAgent } = require("https-proxy-agent");
const { buildProxyUrl, serializeProxyConfig, flattenObject, removeUPFromUserPropertyKey } = require("../lib/utils.js");
const { PROXY_CONNECTION_TIMEOUT } = require("../constants/proxy-config.json");
const { InvalidCredentials, SendError, FCMErrors } = require("../lib/error.js");
const { createHash } = require("crypto");
const { ObjectId } = require("mongodb");

/** @type {WeakMap<firebaseAdmin.app.App, ProxyConfiguration>} */
const appProxyMap = new WeakMap();

/**
 * Checks weather a previously used proxy configuration for an app is updated or not
 * @param {firebaseAdmin.app.App} app - Previously created FCM application object
 * @param {ProxyConfiguration=} newProxy - Proxy configuration for the given PushEvent
 * @returns {boolean} true if proxy configuration changed
 */
function isProxyConfigurationUpdated(app, newProxy) {
    const oldSerialized = serializeProxyConfig(appProxyMap.get(app));
    const newSerialized = serializeProxyConfig(newProxy);
    return oldSerialized !== newSerialized;
}

/**
 * Sends a push notification using Firebase Cloud Messaging (FCM)
 * @param {PushEvent} pushEvent - Push event object
 * @returns {Promise<string>} Promise that resolves to the message ID string
 */
async function send(pushEvent) {
    const creds = /** @type {FCMCredentials} */(
        pushEvent.credentials
    );
    const appName = creds.hash;
    let firebaseApp = firebaseAdmin.apps.find(
        app => app ? app.name === appName : false
    );
    // delete the old application if proxy configuration is updated
    if (firebaseApp) {
        if (isProxyConfigurationUpdated(firebaseApp, pushEvent.proxy)) {
            appProxyMap.delete(firebaseApp);
            await firebaseApp.delete();
            firebaseApp = undefined;
        }
    }
    // create the application instance
    if (!firebaseApp) {
        const buffer = Buffer.from(
            creds.serviceAccountFile.replace(/^[^,]+,/, ""),
            "base64"
        );
        const serviceAccountObject = JSON.parse(buffer.toString("utf8"));
        /** @type {HttpsProxyAgent<"proxy-address">=} */
        let agent;
        if (pushEvent.proxy) {
            agent = new HttpsProxyAgent(buildProxyUrl(pushEvent.proxy), {
                keepAlive: true,
                timeout: PROXY_CONNECTION_TIMEOUT,
                rejectUnauthorized: pushEvent.proxy.auth,
            });
        }
        firebaseApp = firebaseAdmin.initializeApp({
            httpAgent: agent,
            credential: firebaseAdmin.credential.cert(
                serviceAccountObject,
                agent
            ),
        }, appName);
        // save proxy object to track its state
        if (pushEvent.proxy) {
            appProxyMap.set(firebaseApp, pushEvent.proxy);
        }
    }
    try {
        const messageId = await firebaseApp.messaging().send({
            token: pushEvent.token,
            ...pushEvent.payload
        });
        return messageId;
    }
    catch (error) {
        // if ("code" in  && error.code in FCMErrors) {
        if ("code" in /** @type {FirebaseError} */(error)) {
            const err = /** @type {FirebaseError} */(error);
            const firebaseError = FCMErrors[err.code];
            if (!firebaseError) {
                throw error;
            }
            const { libraryKey, message: defaultMessage, mapsTo } = firebaseError;
            const combinedMessage = libraryKey + ": " + (
                err.message ? err.message : defaultMessage
            );
            if (mapsTo) {
                throw new mapsTo(combinedMessage);
            }
            else {
                throw new SendError(combinedMessage);
            }
        }
        throw error;
    }
}

/**
 * Validates the FCM credentials, hashes the service account file, and returns the credentials with a view object.
 * @param {UnvalidatedFCMCredentials} unvalidatedCreds - FCM credentials object
 * @param {ProxyConfiguration=} proxyConfig - FCM credentials object
 * @returns {Promise<{ creds: FCMCredentials, view: FCMCredentials }>} credentials with validated and hashed service account file and its view object
 * @throws {InvalidCredentials} if credentials are invalid
 */
async function validateCredentials(unvalidatedCreds, proxyConfig) {
    const { serviceAccountFile, type } = unvalidatedCreds;
    if (type !== "fcm") {
        throw new InvalidCredentials("Invalid credentials type");
    }
    if (!serviceAccountFile) {
        throw new InvalidCredentials("Service account file is required");
    }
    let mime = serviceAccountFile.indexOf(';base64,') === -1
        ? null
        : serviceAccountFile.substring(
            0,
            serviceAccountFile.indexOf(';base64,')
        );
    if (mime !== "data:application/json") {
        throw new InvalidCredentials("Service account file must be a base64 encoded JSON file");
    }
    const serviceAccountJSON = Buffer.from(
        serviceAccountFile.substring(serviceAccountFile.indexOf(',') + 1),
        'base64'
    ).toString('utf8');
    let serviceAccountObject;
    try {
        serviceAccountObject = JSON.parse(serviceAccountJSON);
    }
    catch (error) {
        throw new InvalidCredentials(
            "Service account file is not a valid JSON: "
            + (error instanceof SyntaxError ? error.message : "Unknown error")
        );
    }
    if (typeof serviceAccountObject !== "object"
        || Array.isArray(serviceAccountObject)
        || serviceAccountObject === null
        || !serviceAccountObject.project_id
        || !serviceAccountObject.private_key
        || !serviceAccountObject.client_email) {
        throw new InvalidCredentials("Service account file is not a valid Firebase service account JSON");
    }
    const credentials = {
        ...unvalidatedCreds,
        _id: new ObjectId,
        serviceAccountFile,
        hash: createHash("sha256").update(serviceAccountJSON).digest("hex")
    };
    try {
        await send({
            credentials,
            appId: new ObjectId,
            messageId: new ObjectId,
            scheduleId: new ObjectId,
            uid: "1",
            token: Math.random() + '',
            payload: {
                data: {
                    'c.i': Math.random() + '',
                    title: 'test',
                    message: 'test',
                    sound: 'default'
                }
            },
            saveResult: false,
            platform: "a",
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
        // normally, we expect an INVALID_REGISTRATION_TOKEN or REGISTRATION_TOKEN_NOT_REGISTERED
        // but for some reason fcm returns with INVALID_ARGUMENT:
        const invalidTokenErrorMessage = "INVALID_ARGUMENT: The registration token is not a valid FCM registration token";
        if (error instanceof SendError && error.message === invalidTokenErrorMessage) {
            return {
                creds: credentials,
                view: {
                    ...credentials,
                    serviceAccountFile: "service-account.json"
                }
            };
        }
        throw error;
    }
    throw new InvalidCredentials("Test connection failed for an unknown reason.");
}

/**
 * Maps message contents to an FCM request payload
 * @param {Message} messageDoc - Message document
 * @param {Content} content - Content object built from message contents in template builder
 * @param {TemplateContext} context - User object or a map of custom properties
 * @returns {AndroidMessagePayload} Android message payload
 */
function mapMessageToPayload(messageDoc, content, context) {
    /** @type {AndroidMessagePayload} */
    const payload = {
        data: {
            "c.i": messageDoc._id.toString(),
        }
    };
    if (content.buttons && content.buttons.length) {
        payload.data["c.b"] = JSON.stringify(
            content.buttons.map(button => ({
                t: button.title,
                l: button.url
            }))
        );
    }
    if (content.sound) {
        payload.data.sound = content.sound;
    }
    if (content.badge) {
        payload.data.badge = String(content.badge);
    }
    if (content.title) {
        payload.data.title = content.title;
    }
    if (content.message) {
        payload.data.message = content.message;
    }
    if (content.url) {
        payload.data['c.l'] = content.url;
    }
    if (content.media) {
        payload.data['c.m'] = content.media;
    }
    if (content.data) {
        const data = JSON.parse(content.data);
        Object.assign(payload.data, flattenObject(data));
    }
    if (content.extras && content.extras.length && typeof context === "object") {
        for (const userPropKey of content.extras) {
            const key = removeUPFromUserPropertyKey(userPropKey);
            if (key in context) {
                let value = context[key];
                if (value !== undefined && value !== null) {
                    if (typeof value === "object") {
                        value = JSON.stringify(value);
                    }
                    else if (typeof value !== "string") {
                        value = String(value);
                    }
                    payload.data[`c.e.${key}`] = value;
                }
            }
        }
    }
    if (content.specific && content.specific.length) {
        const largeIconItem = content.specific.find(
            specific => typeof specific.large_icon === "string"
        );
        if (largeIconItem) {
            payload.data["c.li"] = /** @type {string} */(largeIconItem.large_icon);
        }
    }
    if (content.expiration) {
        if (!payload.android) {
            payload.android = {};
        }
        payload.android.ttl = content.expiration;
    }
    return payload;
}

module.exports = {
    send,
    isProxyConfigurationUpdated,
    validateCredentials,
    mapMessageToPayload,
};