/**
 * @typedef {import('./types/queue.ts').PushEvent} PushEvent
 * @typedef {import('./types/queue.ts').ResultEvent} ResultEvent
 * @typedef {import('./types/message.ts').ErrorObject} ErrorObject
 */

const { send: androidSend } = require("./platforms/android.js");
const { send: iosSend } = require("./platforms/ios.js");
const { send: huaweiSend } = require("./platforms/huawei.js");
const { sendResultEvents } = require("./lib/kafka.js");
const { SendError, TooLateToSend } = require("./lib/error.js");
const log = require('../../../../api/utils/common').log('push:sender');

/**
 * Sends an array of push events to the appropriate platform handlers.
 * Each push event is processed based on its platform type (iOS, Android, Huawei).
 * The function waits for all push events to be processed and returns an array of result events.
 * If any push event fails, it captures the error and includes it in the result.
 * If `autoHandleResults` is false, the function will not send the results to Kafka.
 * @param {PushEvent[]} pushes - Array of push events to send
 * @param {boolean} autoHandleResults - If false, the function will not send the results to Kafka.
 * @returns {Promise<ResultEvent[]>} A promise that resolves to an array of result events.
 */
async function sendAllPushes(pushes, autoHandleResults = true) {
    /** @type {Promise<string>[]} */
    const promises = [];
    for (let i = 0; i < pushes.length; i++) {
        const push = pushes[i];
        if (push.sendBefore && push.sendBefore.getTime() < Date.now()) {
            promises.push(Promise.reject(new TooLateToSend));
            continue;
        }
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
            /** @type {ErrorObject} */
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
    if (autoHandleResults) {
        await sendResultEvents(resultEvents);
    }
    return resultEvents;
}

module.exports = {
    sendAllPushes
}