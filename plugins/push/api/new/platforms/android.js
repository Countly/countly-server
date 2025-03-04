// TODO: update firebase-admin and make it work with http2
/**
 * @typedef {import("../types/credentials").FCMCredentials} FCMCredentials
 */
const firebaseAdmin = require("firebase-admin");
const { HttpsProxyAgent } = require("https-proxy-agent");
const { buildProxyUrl } = require("../lib/utils.js");

/**
 * @param {import("../types/queue.js").PushEvent} pushEvent
 * @returns {Promise<string>}
 */
async function send(pushEvent) {
    const creds = /** @type {FCMCredentials} */(pushEvent.credentials);
    const appName = creds.hash;

    let firebaseApp = firebaseAdmin.apps.find(
        app => app ? app.name === appName : false
    );

    if (!firebaseApp) {
        /** @type {HttpsProxyAgent<"proxy-address">=} */
        let agent = undefined;

        if (pushEvent.proxy) {
            agent = new HttpsProxyAgent(buildProxyUrl(pushEvent.proxy), {
                keepAlive: true,
                timeout: 5000,
                rejectUnauthorized: pushEvent.proxy.auth,
                // TODO: this may be required for http2
                // ALPNProtocols: pushEvent.proxy.http2 ? ["h2"] : undefined,
            });
        }
        const serviceAccountObject = JSON.parse(
            Buffer.from(creds.serviceAccountFile.replace(/^[^,]+,/, ""), "base64")
                .toString()
        );

        firebaseApp = firebaseAdmin.initializeApp({
            httpAgent: agent,
            credential: firebaseAdmin.credential.cert(
                serviceAccountObject,
                agent
            ),
        }, appName);
    }

    const messageId = await firebaseApp.messaging().send({
        token: pushEvent.token,
        ...pushEvent.message
    });

    return messageId;
}

module.exports = { send }