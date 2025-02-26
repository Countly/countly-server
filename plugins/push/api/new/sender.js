/**
 * @typedef {import('./types/queue.ts').PushEvent} PushEvent
 */

const { send: androidSend } = require("./platforms/android.js");

/**
 *
 * @param {PushEvent} push
 */
async function sendPushMessage(push) {
    if (push.platform === "a") {
        await androidSend(push);
    }
    else if (push.platform === "i") {
        // TODO: IMPLEMENT
        console.log("IOS SEND IS NOT IMPLEMENTED");
    }
    else if (push.platform === "h") {
        // TODO: IMPLEMENT
        console.log("HUAWEI SEND IS NOT IMPLEMENTED");
    }
}