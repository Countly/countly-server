/**
 * @typedef {import('./types/queue.ts').PushEvent} PushEvent
 * @typedef {import('./types/queue.ts').ResultEvent} ResultEvent
 * @typedef {import('./types/message.ts').ResultError} ResultError
 * @typedef {import('./types/utils.ts').LogObject} LogObject
 */

const { send: androidSend } = require("./platforms/android.js");
const { send: iosSend } = require("./platforms/ios.js");
const { send: huaweiSend } = require("./platforms/huawei.js");
const { sendResultEvents } = require("./lib/kafka.js");
const { SendError } = require("./lib/error.js");

/** @type {LogObject} */
const log = require('../../../../api/utils/common').log('push:sender');

/**
 *
 * @param {PushEvent[]} pushes
 */
async function sendAllPushes(pushes) {
    /** @type {Promise<string>[]} */
    const promises = [];
    for (let i = 0; i < pushes.length; i++) {
        switch (pushes[i].platform) {
        case "i":
            promises.push(iosSend(pushes[i]));
            break;
        case "a":
            promises.push(androidSend(pushes[i]));
            break;
        case "h":
            promises.push(huaweiSend(pushes[i]));
            break;
        }
    }
    const results = await Promise.allSettled(promises);
    /** @type {ResultEvent[]} */
    const resultEvents = results.map((result, i) => {
        const pushEvent = pushes[i];
        if (result.status === "fulfilled") {
            return {
                ...pushEvent,
                response: result.value,
            }
        }
        else {
            /** @type {string=} */
            let response;
            /** @type {ResultError} */
            let error = { name: "UnkownError", message: "UnkownError" };
            if (result.reason instanceof Error) {
                const { name, message, stack } = result.reason;
                error = { name, message, stack };
                if (result.reason instanceof SendError) {
                    response = result.reason.response;
                }
            }
            else {
                log.e(
                    "Invalid rejection reason for push event:",
                    JSON.stringify(pushEvent, null, 2),
                    JSON.stringify(result.reason, null, 2)
                );
            }
            return {
                ...pushEvent,
                response,
                error
            }
        }
    });
    await sendResultEvents(resultEvents);
}

module.exports = {
    sendAllPushes
}