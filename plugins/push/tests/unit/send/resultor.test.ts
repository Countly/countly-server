import type { Result } from '../../../api/models/message.ts';
import type { ResultEvent } from '../../../api/models/queue.ts';
import { createRequire } from 'module';
import assert from 'assert';
import { describe, it, afterEach } from 'mocha';
import { ObjectId } from 'mongodb';
import sinon from 'sinon';
import esmock from 'esmock';
import { createMockedMongoDb } from '../../mock/mongo.ts';
import { createSilentLogModule } from '../../mock/logger.ts';
import * as mockData from '../../mock/data.ts';

// Silence push logs: resultor.ts loads common.js via createRequire, which esmock
// cannot intercept — so we monkey-patch common.log directly before esmock runs.
const require = createRequire(import.meta.url);
require('../../../../../api/utils/common.js').log = createSilentLogModule();

let {
    collection,
    db,
    sandbox: mongoMockSandbox,
    createMockedCollection
} = createMockedMongoDb();

const mockEmitPushSentEvents = sinon.stub().resolves();

const {
    buildResultObject,
    increaseResultStat,
    buildUpdateQueryForResult,
    applyResultObject,
    saveResults,
    clearInvalidTokens,
    recordSentDates,
} = await esmock("../../../api/send/resultor.ts", {
    "../../../api/lib/utils.ts": {
        sanitizeMongoPath: (path: string) => path.replace(/\./g, '\uff0e').replace(/\$/g, '\uff04').replace(/\\/g, '\uff3c'),
    },
    "../../../api/lib/event-emitter.ts": {
        emitPushSentEvents: mockEmitPushSentEvents,
    },
});

describe("Resultor", () => {
    afterEach(() => {
        ({
            collection,
            db,
            sandbox: mongoMockSandbox,
            createMockedCollection
        } = createMockedMongoDb());
        mockEmitPushSentEvents.resetHistory();
    });

    describe("buildResultObject", () => {
        it("should return a result with all stats zeroed", () => {
            const result = buildResultObject();
            assert.deepStrictEqual(result, {
                total: 0,
                sent: 0,
                failed: 0,
                actioned: 0,
                errors: {},
                subs: {},
            });
        });
    });

    describe("increaseResultStat", () => {
        it("should increment stat at all levels", () => {
            const result = buildResultObject();
            increaseResultStat(result, "a", "en", "sent");

            assert.strictEqual(result.sent, 1);
            assert.strictEqual(result.subs!.a.sent, 1);
            assert.strictEqual(result.subs!.a.subs!.en.sent, 1);
        });

        it("should create nested sub structures on first use", () => {
            const result = buildResultObject();
            increaseResultStat(result, "i", "fr", "total");

            assert(result.subs!.i);
            assert(result.subs!.i.subs!.fr);
            assert.strictEqual(result.subs!.i.total, 1);
            assert.strictEqual(result.subs!.i.subs!.fr.total, 1);
        });

        it("should track errors at all levels when stat is 'failed'", () => {
            const result = buildResultObject();
            increaseResultStat(result, "a", "en", "failed", "SendError: timeout");

            assert.strictEqual(result.failed, 1);
            assert.strictEqual(result.errors["SendError: timeout"], 1);
            assert.strictEqual(result.subs!.a.errors["SendError: timeout"], 1);
            assert.strictEqual(result.subs!.a.subs!.en.errors["SendError: timeout"], 1);
        });

        it("should accumulate multiple increments", () => {
            const result = buildResultObject();
            increaseResultStat(result, "a", "en", "sent");
            increaseResultStat(result, "a", "en", "sent");
            increaseResultStat(result, "a", "tr", "sent");
            increaseResultStat(result, "i", "en", "sent");

            assert.strictEqual(result.sent, 4);
            assert.strictEqual(result.subs!.a.sent, 3);
            assert.strictEqual(result.subs!.a.subs!.en.sent, 2);
            assert.strictEqual(result.subs!.a.subs!.tr.sent, 1);
            assert.strictEqual(result.subs!.i.sent, 1);
        });

        it("should accumulate error counts for the same error", () => {
            const result = buildResultObject();
            increaseResultStat(result, "a", "en", "failed", "InvalidDeviceToken");
            increaseResultStat(result, "a", "en", "failed", "InvalidDeviceToken");
            increaseResultStat(result, "a", "en", "failed", "ServerError");

            assert.strictEqual(result.failed, 3);
            assert.strictEqual(result.errors["InvalidDeviceToken"], 2);
            assert.strictEqual(result.errors["ServerError"], 1);
        });

        it("should not track errors when stat is not 'failed'", () => {
            const result = buildResultObject();
            increaseResultStat(result, "a", "en", "sent", "should-be-ignored");

            assert.deepStrictEqual(result.errors, {});
        });

        it("should support custom amount", () => {
            const result = buildResultObject();
            increaseResultStat(result, "a", "en", "total", undefined, 5);

            assert.strictEqual(result.total, 5);
            assert.strictEqual(result.subs!.a.total, 5);
            assert.strictEqual(result.subs!.a.subs!.en.total, 5);
        });
    });

    describe("buildUpdateQueryForResult", () => {
        it("should build the $inc operator recursively", () => {
            const resultObject: Result = {
                total: 155,
                sent: 138,
                actioned: 48,
                failed: 17,
                errors: {
                    error1: 2,
                    error2: 1,
                    error3: 2,
                },
                subs: {
                    i: {
                        total: 65,
                        sent: 60,
                        actioned: 22,
                        failed: 5,
                        errors: {
                            error1: 2
                        },
                        subs: {
                            en: {
                                total: 35,
                                sent: 33,
                                actioned: 12,
                                failed: 2,
                                errors: {
                                    error1: 2
                                },
                                subs: {}
                            },
                            tr: {
                                total: 30,
                                sent: 27,
                                actioned: 10,
                                failed: 3,
                                errors: {
                                    error2: 1,
                                    error3: 2,
                                },
                                subs: {}
                            }
                        }
                    },
                    a: {
                        total: 70,
                        sent: 62,
                        actioned: 20,
                        failed: 8,
                        errors: {},
                        subs: {
                            en: {
                                total: 33,
                                sent: 31,
                                actioned: 12,
                                failed: 2,
                                errors: {},
                                subs: {}
                            },
                            tr: {
                                total: 37,
                                sent: 31,
                                actioned: 8,
                                failed: 6,
                                errors: {
                                    error4: 4,
                                    error5: 1,
                                    error6: 1,
                                },
                                subs: {}
                            }
                        }
                    },
                    h: {
                        total: 20,
                        sent: 16,
                        actioned: 6,
                        failed: 4,
                        errors: {},
                        subs: {
                            en: {
                                total: 20,
                                sent: 16,
                                actioned: 6,
                                failed: 4,
                                errors: {
                                    error7: 4
                                },
                                subs: {}
                            }
                        }
                    }
                }
            };
            const result = buildUpdateQueryForResult(resultObject);
            assert.deepStrictEqual(result, {
                "result.total": 155,
                "result.sent": 138,
                "result.failed": 17,
                "result.actioned": 48,
                "result.errors.error1": 2,
                "result.errors.error2": 1,
                "result.errors.error3": 2,
                "result.subs.i.total": 65,
                "result.subs.i.sent": 60,
                "result.subs.i.failed": 5,
                "result.subs.i.actioned": 22,
                "result.subs.i.errors.error1": 2,
                "result.subs.i.subs.en.total": 35,
                "result.subs.i.subs.en.sent": 33,
                "result.subs.i.subs.en.failed": 2,
                "result.subs.i.subs.en.actioned": 12,
                "result.subs.i.subs.en.errors.error1": 2,
                "result.subs.i.subs.tr.total": 30,
                "result.subs.i.subs.tr.sent": 27,
                "result.subs.i.subs.tr.failed": 3,
                "result.subs.i.subs.tr.actioned": 10,
                "result.subs.i.subs.tr.errors.error2": 1,
                "result.subs.i.subs.tr.errors.error3": 2,
                "result.subs.a.total": 70,
                "result.subs.a.sent": 62,
                "result.subs.a.failed": 8,
                "result.subs.a.actioned": 20,
                "result.subs.a.subs.en.total": 33,
                "result.subs.a.subs.en.sent": 31,
                "result.subs.a.subs.en.failed": 2,
                "result.subs.a.subs.en.actioned": 12,
                "result.subs.a.subs.tr.total": 37,
                "result.subs.a.subs.tr.sent": 31,
                "result.subs.a.subs.tr.failed": 6,
                "result.subs.a.subs.tr.actioned": 8,
                "result.subs.a.subs.tr.errors.error4": 4,
                "result.subs.a.subs.tr.errors.error5": 1,
                "result.subs.a.subs.tr.errors.error6": 1,
                "result.subs.h.total": 20,
                "result.subs.h.sent": 16,
                "result.subs.h.failed": 4,
                "result.subs.h.actioned": 6,
                "result.subs.h.subs.en.total": 20,
                "result.subs.h.subs.en.sent": 16,
                "result.subs.h.subs.en.failed": 4,
                "result.subs.h.subs.en.actioned": 6,
                "result.subs.h.subs.en.errors.error7": 4
            });
        });

        it("should handle an empty result with no subs", () => {
            const result = buildResultObject();
            const query = buildUpdateQueryForResult(result);
            assert.deepStrictEqual(query, {
                "result.total": 0,
                "result.sent": 0,
                "result.failed": 0,
                "result.actioned": 0,
            });
        });

        it("should support a custom path prefix", () => {
            const result = buildResultObject();
            result.total = 5;
            result.sent = 5;
            const query = buildUpdateQueryForResult(result, {}, "custom.path");
            assert.strictEqual(query["custom.path.total"], 5);
            assert.strictEqual(query["custom.path.sent"], 5);
        });
    });

    describe("applyResultObject", () => {
        it("should $inc both schedule and message documents", async() => {
            const scheduleId = new ObjectId();
            const messageId = new ObjectId();
            const {
                collection: schedulesCollection
            } = createMockedCollection("message_schedules");
            const {
                collection: messagesCollection
            } = createMockedCollection("messages");

            const result = buildResultObject();
            increaseResultStat(result, "a", "en", "sent");
            increaseResultStat(result, "a", "en", "total");

            await applyResultObject(db, scheduleId, messageId, result);

            // First updateOne: $inc on message_schedules
            const scheduleIncCall = schedulesCollection.updateOne.getCall(0);
            assert.deepStrictEqual(scheduleIncCall.args[0], { _id: scheduleId });
            const $inc = (scheduleIncCall.args[1] as any).$inc;
            assert.strictEqual($inc["result.total"], 1);
            assert.strictEqual($inc["result.sent"], 1);
            assert.strictEqual($inc["result.subs.a.subs.en.total"], 1);

            // First updateOne on messages: $inc
            const messageIncCall = messagesCollection.updateOne.getCall(0);
            assert.deepStrictEqual(messageIncCall.args[0], { _id: messageId });
            assert.deepStrictEqual((messageIncCall.args[1] as any).$inc, $inc);
        });

        it("should transition schedule to 'sending' when composed and scheduled events exist", async() => {
            const scheduleId = new ObjectId();
            const messageId = new ObjectId();
            const {
                collection: schedulesCollection
            } = createMockedCollection("message_schedules");
            createMockedCollection("messages");

            const result = buildResultObject();
            await applyResultObject(db, scheduleId, messageId, result);

            // Second updateOne on message_schedules: set status to "sending"
            const sendingCall = schedulesCollection.updateOne.getCall(1);
            assert.deepStrictEqual(sendingCall.args[0], {
                _id: scheduleId,
                $and: [
                    { "events.status": "composed" },
                    { "events.status": "scheduled" }
                ],
            });
            assert.deepStrictEqual(sendingCall.args[1], {
                $set: { status: "sending" }
            });
        });

        it("should use aggregation pipeline to set final status", async() => {
            const scheduleId = new ObjectId();
            const messageId = new ObjectId();
            const {
                collection: schedulesCollection
            } = createMockedCollection("message_schedules");
            createMockedCollection("messages");

            const result = buildResultObject();
            await applyResultObject(db, scheduleId, messageId, result);

            // Third updateOne on message_schedules: aggregation pipeline for final status
            const finalCall = schedulesCollection.updateOne.getCall(2);
            assert.deepStrictEqual(finalCall.args[0], {
                _id: scheduleId,
                "events.status": { $ne: "scheduled" }
            });
            // Should be an aggregation pipeline (array)
            assert(Array.isArray(finalCall.args[1]));
            assert.strictEqual(finalCall.args[1].length, 2);
        });
    });

    describe("clearInvalidTokens", () => {
        it("should unset tokens from push and app_users collections", async() => {
            const appId = "app123";
            const {
                collection: pushCollection
            } = createMockedCollection("push_" + appId);
            const {
                collection: appUsersCollection
            } = createMockedCollection("app_users" + appId);
            pushCollection.bulkWrite.resolves({} as any);
            appUsersCollection.bulkWrite.resolves({} as any);

            await clearInvalidTokens(db, [
                { appId, uid: "user1", platformAndEnv: "ap" },
                { appId, uid: "user2", platformAndEnv: "ap" },
            ]);

            // push_{appId}: unset tk.ap for both users
            assert(pushCollection.bulkWrite.calledOnce);
            const pushOps = pushCollection.bulkWrite.firstCall.firstArg;
            assert.strictEqual(pushOps.length, 1);
            assert.deepStrictEqual(pushOps[0].updateMany.filter, {
                _id: { $in: ["user1", "user2"] }
            });
            assert.deepStrictEqual(pushOps[0].updateMany.update, {
                $unset: { "tk.ap": 1 }
            });

            // app_users{appId}: unset tkap for both users
            assert(appUsersCollection.bulkWrite.calledOnce);
            const appUsersOps = appUsersCollection.bulkWrite.firstCall.firstArg;
            assert.strictEqual(appUsersOps.length, 1);
            assert.deepStrictEqual(appUsersOps[0].updateMany.filter, {
                uid: { $in: ["user1", "user2"] }
            });
            assert.deepStrictEqual(appUsersOps[0].updateMany.update, {
                $unset: { "tkap": 1 }
            });
        });

        it("should group tokens by app and platform", async() => {
            const {
                collection: pushA
            } = createMockedCollection("push_appA");
            const {
                collection: usersA
            } = createMockedCollection("app_usersappA");
            const {
                collection: pushB
            } = createMockedCollection("push_appB");
            const {
                collection: usersB
            } = createMockedCollection("app_usersappB");
            pushA.bulkWrite.resolves({} as any);
            usersA.bulkWrite.resolves({} as any);
            pushB.bulkWrite.resolves({} as any);
            usersB.bulkWrite.resolves({} as any);

            await clearInvalidTokens(db, [
                { appId: "appA", uid: "u1", platformAndEnv: "ap" },
                { appId: "appA", uid: "u2", platformAndEnv: "ip" },
                { appId: "appB", uid: "u3", platformAndEnv: "ap" },
            ]);

            // appA push: 2 ops (ap and ip are different platformAndEnvs)
            const pushAOps = pushA.bulkWrite.firstCall.firstArg;
            assert.strictEqual(pushAOps.length, 2);

            // appA app_users: 2 ops
            const usersAOps = usersA.bulkWrite.firstCall.firstArg;
            assert.strictEqual(usersAOps.length, 2);

            // appB: 1 op each
            assert.strictEqual(pushB.bulkWrite.firstCall.firstArg.length, 1);
            assert.strictEqual(usersB.bulkWrite.firstCall.firstArg.length, 1);
        });
    });

    describe("recordSentDates", () => {
        it("should $addToSet the sent date for each user/message combination", async() => {
            const appId = new ObjectId();
            const messageId = new ObjectId();
            const appIdStr = appId.toString();
            const {
                collection: pushCollection
            } = createMockedCollection("push_" + appIdStr);
            pushCollection.bulkWrite.resolves({} as any);

            const event1 = { ...mockData.resultEvent(), appId, messageId, uid: "u1" };
            const event2 = { ...mockData.resultEvent(), appId, messageId, uid: "u2" };
            const fixedDate = 1700000000000;

            await recordSentDates(db, [event1, event2], fixedDate);

            assert(pushCollection.bulkWrite.calledOnce);
            const ops = pushCollection.bulkWrite.firstCall.firstArg;
            assert.strictEqual(ops.length, 1);
            assert.deepStrictEqual(ops[0].updateMany.filter, {
                _id: { $in: ["u1", "u2"] }
            });
            const addToSet = ops[0].updateMany.update.$addToSet;
            assert.strictEqual(addToSet["msgs." + messageId.toString()], fixedDate);
        });

        it("should create separate ops per message id", async() => {
            const appId = new ObjectId();
            const msg1 = new ObjectId();
            const msg2 = new ObjectId();
            const appIdStr = appId.toString();
            const {
                collection: pushCollection
            } = createMockedCollection("push_" + appIdStr);
            pushCollection.bulkWrite.resolves({} as any);

            const event1 = { ...mockData.resultEvent(), appId, messageId: msg1, uid: "u1" };
            const event2 = { ...mockData.resultEvent(), appId, messageId: msg2, uid: "u2" };

            await recordSentDates(db, [event1, event2]);

            const ops = pushCollection.bulkWrite.firstCall.firstArg;
            assert.strictEqual(ops.length, 2);
            // One op per message
            const msgIds = ops.map((op: any) =>
                Object.keys(op.updateMany.update.$addToSet)[0]
            );
            assert(msgIds.includes("msgs." + msg1.toString()));
            assert(msgIds.includes("msgs." + msg2.toString()));
        });

        it("should handle empty array gracefully", async() => {
            const result = await recordSentDates(db, []);
            assert(Array.isArray(result));
            assert.strictEqual(result!.length, 0);
        });
    });

    describe("saveResults", () => {
        function makeResult(
            overrides: Record<string, any> = {},
            withError = false
        ): ResultEvent {
            const base: any = mockData.resultEvent();
            if (withError) {
                base.error = { name: "SendError", message: "timeout" };
                delete base.response;
            }
            return { ...base, ...overrides } as ResultEvent;
        }

        it("should call emitPushSentEvents with the results", async() => {
            createMockedCollection("message_schedules");
            createMockedCollection("messages");

            const result = makeResult();
            await saveResults(db, [result]);

            assert(mockEmitPushSentEvents.calledOnce);
            assert.strictEqual(mockEmitPushSentEvents.firstCall.firstArg.length, 1);
        });

        it("should aggregate stats by schedule and apply to documents", async() => {
            const scheduleId = new ObjectId();
            const messageId = new ObjectId();
            const {
                collection: schedulesCollection
            } = createMockedCollection("message_schedules");
            const {
                collection: messagesCollection
            } = createMockedCollection("messages");

            const sent1 = makeResult({ scheduleId, messageId, platform: "a", language: "en" });
            const sent2 = makeResult({ scheduleId, messageId, platform: "a", language: "tr" });
            const failed = makeResult({ scheduleId, messageId, platform: "i", language: "en" }, true);

            await saveResults(db, [sent1, sent2, failed]);

            // Should update message_schedules with $inc
            const scheduleIncCall = schedulesCollection.updateOne.getCall(0);
            assert.deepStrictEqual(scheduleIncCall.args[0], { _id: scheduleId });
            const $inc = (scheduleIncCall.args[1] as any).$inc;
            assert.strictEqual($inc["result.sent"], 2);
            assert.strictEqual($inc["result.failed"], 1);

            // Should update messages with same $inc
            const messageIncCall = messagesCollection.updateOne.getCall(0);
            assert.deepStrictEqual(messageIncCall.args[0], { _id: messageId });
        });

        it("should forward results to emitPushSentEvents", async() => {
            createMockedCollection("message_schedules");
            createMockedCollection("messages");

            const result = makeResult({ saveResult: true });
            await saveResults(db, [result]);

            assert(mockEmitPushSentEvents.calledOnce);
            assert.strictEqual(mockEmitPushSentEvents.firstCall.firstArg.length, 1);
            assert.strictEqual(mockEmitPushSentEvents.firstCall.firstArg[0], result);
        });

        it("should call emitPushSentEvents regardless of saveResult (emitter applies its own opt-out)", async() => {
            createMockedCollection("message_schedules");
            createMockedCollection("messages");

            const result = makeResult({ saveResult: false });
            await saveResults(db, [result]);

            // Resultor doesn't filter — emitter is responsible for the saveResult opt-out.
            assert(mockEmitPushSentEvents.calledOnce);
            assert.strictEqual(mockEmitPushSentEvents.firstCall.firstArg[0].saveResult, false);
        });

        it("should clear invalid tokens on InvalidDeviceToken errors", async() => {
            const appId = new ObjectId();
            const appIdStr = appId.toString();
            createMockedCollection("message_schedules");
            createMockedCollection("messages");
            const {
                collection: pushCollection
            } = createMockedCollection("push_" + appIdStr);
            const {
                collection: appUsersCollection
            } = createMockedCollection("app_users" + appIdStr);
            pushCollection.bulkWrite.resolves({} as any);
            appUsersCollection.bulkWrite.resolves({} as any);

            const result = makeResult({
                appId,
                uid: "badtoken-user",
                platform: "a",
                env: "p",
                saveResult: false,
            });
            result.error = { name: "InvalidDeviceToken", message: "bad token" };
            delete (result as any).response;

            await saveResults(db, [result]);

            // Should call bulkWrite on push_{appId} to unset the token
            assert(pushCollection.bulkWrite.calledOnce);
            const pushOps = pushCollection.bulkWrite.firstCall.firstArg;
            assert.deepStrictEqual(pushOps[0].updateMany.update, {
                $unset: { "tk.ap": 1 }
            });

            // Should call bulkWrite on app_users{appId} to unset the flag
            assert(appUsersCollection.bulkWrite.calledOnce);
            const userOps = appUsersCollection.bulkWrite.firstCall.firstArg;
            assert.deepStrictEqual(userOps[0].updateMany.update, {
                $unset: { "tkap": 1 }
            });
        });

        it("should record sent dates for successful results", async() => {
            const appId = new ObjectId();
            const messageId = new ObjectId();
            const appIdStr = appId.toString();
            createMockedCollection("message_schedules");
            createMockedCollection("messages");
            const {
                collection: pushCollection
            } = createMockedCollection("push_" + appIdStr);
            pushCollection.bulkWrite.resolves({} as any);

            const result = makeResult({ appId, messageId, uid: "u1", saveResult: false });
            // Ensure no error (successful send)
            delete result.error;

            await saveResults(db, [result]);

            assert(pushCollection.bulkWrite.calledOnce);
            const ops = pushCollection.bulkWrite.firstCall.firstArg;
            assert.strictEqual(ops.length, 1);
            assert(ops[0].updateMany.update.$addToSet);
            const key = "msgs." + messageId.toString();
            assert(typeof ops[0].updateMany.update.$addToSet[key] === "number");
        });

        it("should not record sent dates for failed results", async() => {
            const appId = new ObjectId();
            const appIdStr = appId.toString();
            createMockedCollection("message_schedules");
            createMockedCollection("messages");
            const {
                collection: pushCollection
            } = createMockedCollection("push_" + appIdStr);
            pushCollection.bulkWrite.resolves({} as any);

            const result = makeResult({ appId, saveResult: false }, true);

            await saveResults(db, [result]);

            // bulkWrite should not be called for sent dates since all results failed.
            // It might be called for invalid token cleanup, so check ops content.
            if (pushCollection.bulkWrite.called) {
                const ops = pushCollection.bulkWrite.firstCall.firstArg;
                // Should be token cleanup ops ($unset), not sent date ops ($addToSet)
                for (const op of ops) {
                    assert(!op.updateMany.update.$addToSet,
                        "Should not record sent dates for failed results");
                }
            }
        });

        it("should handle multiple schedules in a single batch", async() => {
            const scheduleA = new ObjectId();
            const scheduleB = new ObjectId();
            const messageA = new ObjectId();
            const messageB = new ObjectId();
            const {
                collection: schedulesCollection
            } = createMockedCollection("message_schedules");
            const {
                collection: messagesCollection
            } = createMockedCollection("messages");

            const r1 = makeResult({ scheduleId: scheduleA, messageId: messageA, saveResult: false });
            delete r1.error;
            const r2 = makeResult({ scheduleId: scheduleB, messageId: messageB, saveResult: false });
            delete r2.error;

            await saveResults(db, [r1, r2]);

            // Should have separate $inc calls for each schedule
            // applyResultObject calls updateOne 3 times per schedule
            assert.strictEqual(schedulesCollection.updateOne.callCount, 6);
            assert.strictEqual(messagesCollection.updateOne.callCount, 2);
        });

    });
});
