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
    sendAllPushes,
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

            await sendAllPushes([push], false);

            assert(mockAndroidSend.calledOnce);
            assert(mockIOSSend.notCalled);
            assert(mockHuaweiSend.notCalled);
        });

        it("should dispatch iOS pushes to the iOS handler", async() => {
            const push: any = { ...mockData.pushEvent(), platform: "i" };
            mockIOSSend.resolves("ios-ok");

            await sendAllPushes([push], false);

            assert(mockIOSSend.calledOnce);
            assert(mockAndroidSend.notCalled);
        });

        it("should dispatch Huawei pushes to the Huawei handler", async() => {
            const push: any = { ...mockData.pushEvent(), platform: "h" };
            mockHuaweiSend.resolves("huawei-ok");

            await sendAllPushes([push], false);

            assert(mockHuaweiSend.calledOnce);
            assert(mockAndroidSend.notCalled);
        });

        it("should dispatch multiple pushes to their respective handlers", async() => {
            const android = mockData.pushEvent();
            const ios: any = { ...mockData.pushEvent(), platform: "i" };
            const huawei: any = { ...mockData.pushEvent(), platform: "h" };
            mockAndroidSend.resolves("a-ok");
            mockIOSSend.resolves("i-ok");
            mockHuaweiSend.resolves("h-ok");

            const results = await sendAllPushes([android, ios, huawei], false);

            assert.strictEqual(mockAndroidSend.callCount, 1);
            assert.strictEqual(mockIOSSend.callCount, 1);
            assert.strictEqual(mockHuaweiSend.callCount, 1);
            assert.strictEqual(results.length, 3);
        });
    });

    describe("TooLateToSend", () => {
        it("should reject with TooLateToSend when sendBefore is in the past", async() => {
            const push = mockData.pushEvent();
            push.sendBefore = new Date(Date.now() - 60000);

            const results = await sendAllPushes([push], false);

            assert.strictEqual(results.length, 1);
            assert(results[0].error);
            assert.strictEqual(results[0].error!.name, "TooLateToSend");
            // Platform handler should NOT have been called
            assert(mockAndroidSend.notCalled);
        });

        it("should not reject when sendBefore is in the future", async() => {
            const push = mockData.pushEvent();
            push.sendBefore = new Date(Date.now() + 60000);
            mockAndroidSend.resolves("ok");

            const results = await sendAllPushes([push], false);

            assert.strictEqual(results.length, 1);
            assert.strictEqual(results[0].error, undefined);
            assert(mockAndroidSend.calledOnce);
        });

        it("should not reject when sendBefore is undefined", async() => {
            const push = mockData.pushEvent();
            push.sendBefore = undefined;
            mockAndroidSend.resolves("ok");

            const results = await sendAllPushes([push], false);

            assert.strictEqual(results.length, 1);
            assert.strictEqual(results[0].error, undefined);
        });
    });

    describe("Result mapping", () => {
        it("should map fulfilled results with response and sentAt", async() => {
            const push = mockData.pushEvent();
            mockAndroidSend.resolves("provider-response-123");

            const before = Date.now();
            const results = await sendAllPushes([push], false);
            const after = Date.now();

            assert.strictEqual(results.length, 1);
            const r = results[0];
            assert.strictEqual(r.response, "provider-response-123");
            assert.strictEqual(r.error, undefined);
            assert(r.sentAt instanceof Date);
            assert(r.sentAt.getTime() >= before && r.sentAt.getTime() <= after);
            // Push event fields should be spread into result
            assert.strictEqual(r.uid, push.uid);
            assert.strictEqual(r.platform, push.platform);
            assert(r.messageId.equals(push.messageId));
        });

        it("should map rejected Error results with error details", async() => {
            const push = mockData.pushEvent();
            const err = new Error("connection refused");
            mockAndroidSend.rejects(err);

            const results = await sendAllPushes([push], false);

            assert.strictEqual(results.length, 1);
            const r = results[0];
            assert(r.error);
            assert.strictEqual(r.error!.name, "Error");
            assert.strictEqual(r.error!.message, "connection refused");
            assert(typeof r.error!.stack === "string");
            assert(r.sentAt instanceof Date);
        });

        it("should extract response from SendError instances", async() => {
            const push = mockData.pushEvent();
            const { SendError } = await import('../../../api/lib/error.ts');
            const err = new SendError("FCM error", "projects/x/messages/y");
            mockAndroidSend.rejects(err);

            const results = await sendAllPushes([push], false);

            assert.strictEqual(results.length, 1);
            const r = results[0];
            assert.strictEqual(r.error!.name, "SendError");
            assert.strictEqual(r.error!.message, "FCM error");
            assert.strictEqual(r.response, "projects/x/messages/y");
        });

        it("should handle non-Error rejection reasons as UnknownError", async() => {
            const push = mockData.pushEvent();
            mockAndroidSend.callsFake(() => Promise.reject("string-rejection"));

            const results = await sendAllPushes([push], false);

            assert.strictEqual(results.length, 1);
            const r = results[0];
            assert(r.error);
            assert.strictEqual(r.error!.name, "UnknownError");
            assert.strictEqual(r.error!.message, "UnknownError");
        });
    });

    describe("Result event publishing", () => {
        it("should send result events to Kafka when autoHandleResults is true", async() => {
            const push = mockData.pushEvent();
            mockAndroidSend.resolves("ok");
            mockSendResultEvents.resolves();

            await sendAllPushes([push], true);

            assert(mockSendResultEvents.calledOnce);
            assert.strictEqual(mockSendResultEvents.firstCall.firstArg.length, 1);
        });

        it("should not send result events when autoHandleResults is false", async() => {
            const push = mockData.pushEvent();
            mockAndroidSend.resolves("ok");

            await sendAllPushes([push], false);

            assert(mockSendResultEvents.notCalled);
        });

        it("should default autoHandleResults to true", async() => {
            const push = mockData.pushEvent();
            mockAndroidSend.resolves("ok");
            mockSendResultEvents.resolves();

            await sendAllPushes([push]);

            assert(mockSendResultEvents.calledOnce);
        });
    });

    describe("Concurrent processing", () => {
        it("should process all pushes even if some fail", async() => {
            const push1 = mockData.pushEvent();
            const push2 = mockData.pushEvent();
            const push3 = mockData.pushEvent();
            mockAndroidSend.onFirstCall().resolves("ok");
            mockAndroidSend.onSecondCall().rejects(new Error("fail"));
            mockAndroidSend.onThirdCall().resolves("ok-again");

            const results = await sendAllPushes([push1, push2, push3], false);

            assert.strictEqual(results.length, 3);
            assert.strictEqual(results[0].error, undefined);
            assert.strictEqual(results[1].error!.name, "Error");
            assert.strictEqual(results[2].error, undefined);
        });

        it("should handle empty push array", async() => {
            const results = await sendAllPushes([], false);

            assert.deepStrictEqual(results, []);
            assert(mockAndroidSend.notCalled);
        });

        it("should mix TooLateToSend with platform results", async() => {
            const expired = mockData.pushEvent();
            expired.sendBefore = new Date(Date.now() - 1000);

            const valid = mockData.pushEvent();
            valid.sendBefore = undefined;
            mockAndroidSend.resolves("sent");

            const results = await sendAllPushes([expired, valid], false);

            assert.strictEqual(results.length, 2);
            assert.strictEqual(results[0].error!.name, "TooLateToSend");
            assert.strictEqual(results[1].response, "sent");
        });
    });
});
