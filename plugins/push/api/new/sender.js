/**
 * @typedef {import('./types/queue.ts').PushEvent} PushEvent
 * @typedef {import('./types/queue.ts').ResultEvent} ResultEvent
 * @typedef {import('./types/utils.ts').LogObject} LogObject
 */

const { send: androidSend } = require("./platforms/android.js");
const { sendResultEvents } = require("./lib/kafka.js");

/** @type {LogObject} */
const log = require('../../../../api/utils/common').log('push:sender');


/**
 *
 * @param {PushEvent[]} pushes
 */
async function sendAllPushes(pushes) {
    /** @type {PushEvent[]} */
    const huaweiPushes = [];
    /** @type {ResultEvent[]} */
    const results = [];

    for (let i = 0; i < pushes.length; i++) {
        /** @type {any} response from provider when successful */
        let response;
        /** @type {string|undefined} */
        let error;
        try {
            switch (pushes[i].platform) {
            case "i":
                // TODO: IMPLEMENT
                console.log("IOS SEND IS NOT IMPLEMENTED");
                break;
            case "h":
                huaweiPushes.push(pushes[i]);
                break;
            case "a":
                response = await androidSend(pushes[i]);
                break;
            }
        }
        catch (err) {
            error = typeof err?.toString === "function"
                ? err.toString()
                : "Unknown Error";
            // TODO: filter out errors to log
            log.e("Error while sending to provider", err);
        }

        results.push({ ...pushes[i], response, error });
    }

    // huawei pushes get sent in batches
    if (huaweiPushes.length) {
        // TODO: IMPLEMENT
        console.log("HUAWEI SEND IS NOT IMPLEMENTED");
    }

    await sendResultEvents(results);
}

module.exports = {
    sendAllPushes
}