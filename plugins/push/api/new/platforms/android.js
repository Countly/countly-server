/**
 * @typedef {import("../types/results.js").FCMResponse} FCMResponse
 */

const firebaseAdmin = require("firebase-admin");
const FORGE = require('node-forge');
const { HttpsProxyAgent } = require("https-proxy-agent");
const { buildProxyUrl } = require("../lib/utils.js");

module.exports = { send }

/**
 * @param {import("../types/queue.js").PushEvent} push
 * @returns {Promise<FCMResponse>}
 */
async function send(push) {
    const creds = /** @type {import('../types/credentials').FCMCredentials} */(push.credentials);
    const serviceAccountJSON = FORGE.util.decode64(
        creds.serviceAccountFile.substring(
            creds.serviceAccountFile.indexOf(',') + 1
        )
    );
    const serviceAccountObject = JSON.parse(serviceAccountJSON);
    const appName = creds.hash;

    let firebaseApp = firebaseAdmin.apps.find(app => app ? app.name === appName : false);

    if (!firebaseApp) {
        /** @type {HttpsProxyAgent<"proxy-address">=} */
        let agent = undefined;

        if (push.proxy) {
            agent = new HttpsProxyAgent(buildProxyUrl(push.proxy), {
                keepAlive: true,
                timeout: 5000,
                rejectUnauthorized: push.proxy.auth,
                // ALPNProtocols: push.proxy.http2 ? ["h2"] : undefined,
            });
        }

        firebaseApp = firebaseAdmin.initializeApp({
            credential: firebaseAdmin.credential.cert(serviceAccountObject, agent),
            httpAgent: agent
        }, appName);
    }

    const messageId = await firebaseApp.messaging().send({
        token: push.token,
        ...push.message
    });

    return { messageId }
}
