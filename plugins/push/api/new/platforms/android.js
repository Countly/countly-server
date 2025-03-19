/**
 * @typedef {import("../types/queue.js").PushEvent} PushEvent
 * @typedef {import("../types/proxy.js").ProxyConfiguration} ProxyConfiguration
 * @typedef {import("../types/proxy.js").ProxyConfigurationKey} ProxyConfigurationKey
 * @typedef {{ proxy?: ProxyConfiguration, serviceAccount: string }} FirebaseAppConfiguration
 */
const firebaseAdmin = require("firebase-admin");
const { HttpsProxyAgent } = require("https-proxy-agent");
const { buildProxyUrl, serializeProxyConfig } = require("../lib/utils.js");
const { PROXY_CONNECTION_TIMEOUT } = require("../constants/proxy-config.json");
const { FirebaseError } = require("firebase-admin/lib/utils/error.js");
const { SendError, FCMErrors } = require("../lib/error.js");

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
 * @param {PushEvent} pushEvent
 * @returns {Promise<string>}
 */
async function send(pushEvent) {
    const creds = /** @type {import("../types/credentials").FCMCredentials} */(
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
            ...pushEvent.message
        });
        return messageId;
    }
    catch (error) {
        if (error instanceof FirebaseError) {
            const { libraryKey, message, mapsTo } = FCMErrors[error.code];
            const combinedMessage = libraryKey + ": " + message;
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

module.exports = { send }