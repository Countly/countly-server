import { createRequire } from 'module';
import assert from 'assert';
import { describe, it, afterEach } from 'mocha';
import sinon from 'sinon';
import esmock from 'esmock';
import { createSilentLogModule } from '../../mock/logger.ts';
import * as mockData from '../../mock/data.ts';

// Silence push logs: sender.ts loads common.js via createRequire, which esmock
// cannot intercept — so we monkey-patch common.log directly before esmock runs.
const require = createRequire(import.meta.url);
require('../../../../../api/utils/common.js').log = createSilentLogModule();

const mockAndroidSend = sinon.stub();
const mockIOSSend = sinon.stub();
const mockHuaweiSend = sinon.stub();
const mockSendResultEvents = sinon.stub();

const {
    sendPush,
} = await esmock("../../../api/send/sender.ts", {
    "../../../api/send/platforms/android.ts": { send: mockAndroidSend },
    "../../../api/send/platforms/ios.ts": { send: mockIOSSend },
    "../../../api/send/platforms/huawei.ts": { send: mockHuaweiSend },
    "../../../api/kafka/producer.ts": { sendResultEvents: mockSendResultEvents },
});

describe("Sender", () => {
    afterEach(() => {
        mockAndroidSend.reset();
        mockIOSSend.reset();
        mockHuaweiSend.reset();
        mockSendResultEvents.reset();
    });

    describe("Platform dispatch", () => {
        it("should dispatch Android pushes to the Android handler", async() => {
            const push = mockData.pushEvent();
            push.platform = "a";
            mockAndroidSend.resolves("android-ok");

            await sendPush(push, false);

            assert(mockAndroidSend.calledOnce);
            assert(mockIOSSend.notCalled);
            assert(mockHuaweiSend.notCalled);
        });

        it("should dispatch iOS pushes to the iOS handler", async() => {
            const push: any = { ...mockData.pushEvent(), platform: "i" };
            mockIOSSend.resolves("ios-ok");

            await sendPush(push, false);

            assert(mockIOSSend.calledOnce);
            assert(mockAndroidSend.notCalled);
        });

        it("should dispatch Huawei pushes to the Huawei handler", async() => {
            const push: any = { ...mockData.pushEvent(), platform: "h" };
            mockHuaweiSend.resolves("huawei-ok");

            await sendPush(push, false);

            assert(mockHuaweiSend.calledOnce);
            assert(mockAndroidSend.notCalled);
        });
    });

    describe("TooLateToSend", () => {
        it("should return error when sendBefore is in the past", async() => {
            const push = mockData.pushEvent();
            push.sendBefore = new Date(Date.now() - 60000);

            const result = await sendPush(push, false);

            assert(result.error);
            assert.strictEqual(result.error!.name, "TooLateToSend");
            assert(mockAndroidSend.notCalled);
        });

        it("should not reject when sendBefore is in the future", async() => {
            const push = mockData.pushEvent();
            push.sendBefore = new Date(Date.now() + 60000);
            mockAndroidSend.resolves("ok");

            const result = await sendPush(push, false);

            assert.strictEqual(result.error, undefined);
            assert(mockAndroidSend.calledOnce);
        });

        it("should not reject when sendBefore is undefined", async() => {
            const push = mockData.pushEvent();
            push.sendBefore = undefined;
            mockAndroidSend.resolves("ok");

            const result = await sendPush(push, false);

            assert.strictEqual(result.error, undefined);
        });
    });

    describe("Result mapping", () => {
        it("should map fulfilled results with response and sentAt", async() => {
            const push = mockData.pushEvent();
            mockAndroidSend.resolves("provider-response-123");

            const before = Date.now();
            const result = await sendPush(push, false);
            const after = Date.now();

            assert.strictEqual(result.response, "provider-response-123");
            assert.strictEqual(result.error, undefined);
            assert(result.sentAt instanceof Date);
            assert(result.sentAt.getTime() >= before && result.sentAt.getTime() <= after);
            assert.strictEqual(result.uid, push.uid);
            assert.strictEqual(result.platform, push.platform);
            assert(result.messageId.equals(push.messageId));
        });

        it("should map rejected Error results with error details", async() => {
            const push = mockData.pushEvent();
            const err = new Error("connection refused");
            mockAndroidSend.rejects(err);

            const result = await sendPush(push, false);

            assert(result.error);
            assert.strictEqual(result.error!.name, "Error");
            assert.strictEqual(result.error!.message, "connection refused");
            assert(typeof result.error!.stack === "string");
            assert(result.sentAt instanceof Date);
        });

        it("should extract response from SendError instances", async() => {
            const push = mockData.pushEvent();
            const { SendError } = await import('../../../api/lib/error.ts');
            const err = new SendError("FCM error", "projects/x/messages/y");
            mockAndroidSend.rejects(err);

            const result = await sendPush(push, false);

            assert.strictEqual(result.error!.name, "SendError");
            assert.strictEqual(result.error!.message, "FCM error");
            assert.strictEqual(result.response, "projects/x/messages/y");
        });

        it("should handle non-Error rejection reasons as UnknownError", async() => {
            const push = mockData.pushEvent();
            mockAndroidSend.callsFake(() => Promise.reject("string-rejection"));

            const result = await sendPush(push, false);

            assert(result.error);
            assert.strictEqual(result.error!.name, "UnknownError");
            assert.strictEqual(result.error!.message, "UnknownError");
        });
    });

    describe("Result event publishing", () => {
        it("should send result events to Kafka when autoHandleResults is true", async() => {
            const push = mockData.pushEvent();
            mockAndroidSend.resolves("ok");
            mockSendResultEvents.resolves();

            await sendPush(push, true);

            assert(mockSendResultEvents.calledOnce);
            assert.strictEqual(mockSendResultEvents.firstCall.firstArg.length, 1);
        });

        it("should not send result events when autoHandleResults is false", async() => {
            const push = mockData.pushEvent();
            mockAndroidSend.resolves("ok");

            await sendPush(push, false);

            assert(mockSendResultEvents.notCalled);
        });

        it("should default autoHandleResults to true", async() => {
            const push = mockData.pushEvent();
            mockAndroidSend.resolves("ok");
            mockSendResultEvents.resolves();

            await sendPush(push);

            assert(mockSendResultEvents.calledOnce);
        });
    });
});
