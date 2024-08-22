const firebaseAdmin = require("firebase-admin");
const FORGE = require('node-forge');
const { Agent } = require('https');
const { proxyAgent } = require("../lib/proxy");

module.exports = { send }

/**
 * 
 * @param {import("../sending").PushTicket} push 
 */
async function send(push) {
    /** @type {Agent=} */
    let agent;
    if (push.proxy) {
        // TODO: check if we need to cache agent. node or firebase app instance
        // might be doing that already. node keeps agents in a pool depending
        // on keepAlive: https://nodejs.org/api/http.html#class-httpagent
        console.log(push.proxy);
        agent = /** @type {Agent} */(proxyAgent({ proxy: push.proxy }));
    }

    const creds = /** @type {import('../types/credentials').FCMCredentials} */ (push.credentials);
    const serviceAccountJSON = FORGE.util.decode64(
        creds.serviceAccountFile.substring(
            creds.serviceAccountFile.indexOf(',') + 1
        )
    );
    const serviceAccountObject = JSON.parse(serviceAccountJSON);
    const appName = creds.hash;
    const firebaseApp = firebaseAdmin.apps.find(app => app ? app.name === appName : false)
        ? firebaseAdmin.app(appName)
        : firebaseAdmin.initializeApp({
            credential: firebaseAdmin.credential.cert(serviceAccountObject, agent),
            httpAgent: agent
        }, appName);

    const firebaseMessaging = firebaseApp.messaging();

    const messageId = await firebaseMessaging.send({
        token: push.token,
        ...push.message
    });

    console.log("FCM messageId", messageId);
}