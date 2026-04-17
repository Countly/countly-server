import type { PushEvent, ResultEvent } from "../kafka/types.ts";
import type { ErrorObject } from "../lib/error.ts";
import { send as androidSend } from "./platforms/android.ts";
import { send as iosSend } from "./platforms/ios.ts";
import { send as huaweiSend } from "./platforms/huawei.ts";
import { sendResultEvents } from "../kafka/producer.ts";
import { SendError, TooLateToSend } from "../lib/error.ts";

import { createRequire } from 'module';

// createRequire needed for CJS modules without ES exports
const require = createRequire(import.meta.url);
const common: import('../../../../types/common.d.ts').Common = require('../../../../api/utils/common.js');
const log = common.log('push:sender');

/**
 * Sends a single push event to the appropriate platform handler.
 * Returns the result event with either a response or error.
 * If `autoHandleResults` is true, the result is also sent to Kafka.
 */
export async function sendPush(push: PushEvent, autoHandleResults = true): Promise<ResultEvent> {
    let resultEvent: ResultEvent;
    try {
        if (push.sendBefore && push.sendBefore.getTime() < Date.now()) {
            throw new TooLateToSend;
        }
        let response: string;
        switch (push.platform) {
        case "i":
            response = await iosSend(push);
            break;
        case "a":
            response = await androidSend(push);
            break;
        case "h":
            response = await huaweiSend(push);
            break;
        default:
            throw new Error(`Unknown platform: ${push.platform}`);
        }
        resultEvent = { ...push, response, sentAt: new Date };
    }
    catch (reason) {
        let response: string | undefined;
        let error: ErrorObject = { name: "UnknownError", message: "UnknownError" };
        if (reason instanceof Error) {
            const { name, message, stack } = reason;
            error = { name, message, stack };
            if (reason instanceof SendError) {
                response = reason.response;
            }
        }
        else {
            log.e(
                "Invalid rejection reason for push event:",
                JSON.stringify(push, null, 2),
                JSON.stringify(reason, null, 2)
            );
        }
        resultEvent = { ...push, response, error, sentAt: new Date };
    }
    if (autoHandleResults) {
        await sendResultEvents([resultEvent]);
    }
    return resultEvent;
}
