import type { PushEvent, ResultEvent } from "../types/queue.ts";
import type { ErrorObject } from "../lib/error.ts";
import { send as androidSend } from "./platforms/android.ts";
import { send as iosSend } from "./platforms/ios.ts";
import { send as huaweiSend } from "./platforms/huawei.ts";
import { sendResultEvents } from "../lib/kafka.ts";
import { SendError, TooLateToSend } from "../lib/error.ts";

import { createRequire } from 'module';

// createRequire needed for CJS modules without ES exports
const require = createRequire(import.meta.url);
const common: import('../../../../types/common.d.ts').Common = require('../../../../api/utils/common.js');
const log = common.log('push:sender');

/**
 * Sends an array of push events to the appropriate platform handlers.
 * Each push event is processed based on its platform type (iOS, Android, Huawei).
 * The function waits for all push events to be processed and returns an array of result events.
 * If any push event fails, it captures the error and includes it in the result.
 * If `autoHandleResults` is false, the function will not send the results to Kafka.
 */
export async function sendAllPushes(pushes: PushEvent[], autoHandleResults = true): Promise<ResultEvent[]> {
    const promises: Promise<string>[] = [];
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
    const resultEvents: ResultEvent[] = results.map((result, i) => {
        const pushEvent = pushes[i];
        if (result.status === "fulfilled") {
            return {
                ...pushEvent,
                response: result.value,
                sentAt: new Date,
            };
        }
        else {
            let response: string | undefined;
            let error: ErrorObject = { name: "UnkownError", message: "UnkownError" };
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
                error,
                sentAt: new Date,
            };
        }
    });
    if (autoHandleResults) {
        await sendResultEvents(resultEvents);
    }
    return resultEvents;
}
