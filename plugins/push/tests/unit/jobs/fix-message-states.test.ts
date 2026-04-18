import assert from 'assert';
import { describe, it, before, after, beforeEach } from 'mocha';
import { MongoClient, Db, ObjectId } from 'mongodb';
import {
    fixMessageStates,
    EVENT_TIMEOUT_MS,
    RESULT_TIMEOUT_MS,
    LOST_RESULT_ERROR,
} from '../../../api/jobs/fix-message-states-core.ts';

const MONGO_URI = 'mongodb://localhost:27017';
const DB_NAME = 'countly_push_test_fix_states_' + process.pid;

let client: MongoClient;
let db: Db;

const silentLog = {
    i: () => {},
    e: () => {},
};

function hours(n: number): number {
    return n * 60 * 60 * 1000;
}

function ago(ms: number): Date {
    return new Date(Date.now() - ms);
}

function baseResult(overrides: Record<string, any> = {}) {
    return { total: 0, sent: 0, failed: 0, actioned: 0, errors: {}, subs: {}, ...overrides };
}

function makeSchedule(overrides: Record<string, any> = {}) {
    return {
        _id: new ObjectId(),
        appId: new ObjectId(),
        messageId: new ObjectId(),
        scheduledTo: new Date(),
        timezoneAware: false,
        status: "scheduled",
        result: baseResult(),
        events: [{
            status: "scheduled",
            scheduledTo: new Date(),
        }],
        ...overrides,
    };
}

function makeMessage(overrides: Record<string, any> = {}) {
    return {
        _id: new ObjectId(),
        app: new ObjectId(),
        platforms: ["a"],
        status: "active",
        triggers: [{ kind: "plain", start: new Date() }],
        contents: [{ title: "t", message: "m" }],
        result: baseResult(),
        info: {},
        ...overrides,
    };
}

function makeApp(overrides: Record<string, any> = {}) {
    return {
        _id: new ObjectId(),
        name: "Test App",
        ...overrides,
    };
}

async function run() {
    await fixMessageStates({ db, log: silentLog });
}

before(async function() {
    this.timeout(10000);
    client = await MongoClient.connect(MONGO_URI, { directConnection: true });
    db = client.db(DB_NAME);
});

beforeEach(async () => {
    const collections = await db.listCollections().toArray();
    for (const col of collections) {
        await db.collection(col.name).deleteMany({});
    }
});

after(async function() {
    this.timeout(10000);
    if (client) {
        await db.dropDatabase();
        await client.close();
    }
});

// ============================================================
// Step 1: Cancel orphaned schedules
// ============================================================

describe("fix-message-states", () => {
    describe("Step 1: Cancel orphaned schedules", () => {
        it("should cancel schedules whose message does not exist", async () => {
            const app = makeApp();
            const schedule = makeSchedule({ appId: app._id });
            // message not inserted — orphaned

            await db.collection("apps").insertOne(app);
            await db.collection("message_schedules").insertOne(schedule);

            await run();

            const updated = await db.collection("message_schedules").findOne({ _id: schedule._id });
            assert.strictEqual(updated!.status, "canceled");
        });

        it("should cancel schedules whose message is deleted", async () => {
            const app = makeApp();
            const msg = makeMessage({ status: "deleted" });
            const schedule = makeSchedule({ appId: app._id, messageId: msg._id });

            await db.collection("apps").insertOne(app);
            await db.collection("messages").insertOne(msg);
            await db.collection("message_schedules").insertOne(schedule);

            await run();

            const updated = await db.collection("message_schedules").findOne({ _id: schedule._id });
            assert.strictEqual(updated!.status, "canceled");
        });

        it("should cancel schedules whose message is stopped", async () => {
            const app = makeApp();
            const msg = makeMessage({ status: "stopped" });
            const schedule = makeSchedule({ appId: app._id, messageId: msg._id });

            await db.collection("apps").insertOne(app);
            await db.collection("messages").insertOne(msg);
            await db.collection("message_schedules").insertOne(schedule);

            await run();

            const updated = await db.collection("message_schedules").findOne({ _id: schedule._id });
            assert.strictEqual(updated!.status, "canceled");
        });

        it("should cancel schedules whose message is inactive", async () => {
            const app = makeApp();
            const msg = makeMessage({ status: "inactive" });
            const schedule = makeSchedule({ appId: app._id, messageId: msg._id });

            await db.collection("apps").insertOne(app);
            await db.collection("messages").insertOne(msg);
            await db.collection("message_schedules").insertOne(schedule);

            await run();

            const updated = await db.collection("message_schedules").findOne({ _id: schedule._id });
            assert.strictEqual(updated!.status, "canceled");
        });

        it("should cancel schedules whose message is draft", async () => {
            const app = makeApp();
            const msg = makeMessage({ status: "draft" });
            const schedule = makeSchedule({ appId: app._id, messageId: msg._id });

            await db.collection("apps").insertOne(app);
            await db.collection("messages").insertOne(msg);
            await db.collection("message_schedules").insertOne(schedule);

            await run();

            const updated = await db.collection("message_schedules").findOne({ _id: schedule._id });
            assert.strictEqual(updated!.status, "canceled");
        });

        it("should cancel schedules whose message is rejected", async () => {
            const app = makeApp();
            const msg = makeMessage({ status: "rejected" });
            const schedule = makeSchedule({ appId: app._id, messageId: msg._id });

            await db.collection("apps").insertOne(app);
            await db.collection("messages").insertOne(msg);
            await db.collection("message_schedules").insertOne(schedule);

            await run();

            const updated = await db.collection("message_schedules").findOne({ _id: schedule._id });
            assert.strictEqual(updated!.status, "canceled");
        });

        it("should cancel schedules whose app does not exist", async () => {
            const msg = makeMessage();
            const schedule = makeSchedule({ messageId: msg._id });
            // app not inserted — orphaned

            await db.collection("messages").insertOne(msg);
            await db.collection("message_schedules").insertOne(schedule);

            await run();

            const updated = await db.collection("message_schedules").findOne({ _id: schedule._id });
            assert.strictEqual(updated!.status, "canceled");
        });

        it("should not cancel schedules with active message and existing app", async () => {
            const app = makeApp();
            const msg = makeMessage({ status: "active" });
            const schedule = makeSchedule({ appId: app._id, messageId: msg._id });

            await db.collection("apps").insertOne(app);
            await db.collection("messages").insertOne(msg);
            await db.collection("message_schedules").insertOne(schedule);

            await run();

            const updated = await db.collection("message_schedules").findOne({ _id: schedule._id });
            assert.strictEqual(updated!.status, "scheduled");
        });

        it("should not touch schedules already in terminal states", async () => {
            const app = makeApp();
            const msg = makeMessage({ status: "deleted" });
            const sentSchedule = makeSchedule({
                appId: app._id,
                messageId: msg._id,
                status: "sent",
            });
            const canceledSchedule = makeSchedule({
                appId: app._id,
                messageId: msg._id,
                status: "canceled",
            });

            await db.collection("apps").insertOne(app);
            await db.collection("messages").insertOne(msg);
            await db.collection("message_schedules").insertMany([sentSchedule, canceledSchedule]);

            await run();

            const s1 = await db.collection("message_schedules").findOne({ _id: sentSchedule._id });
            const s2 = await db.collection("message_schedules").findOne({ _id: canceledSchedule._id });
            assert.strictEqual(s1!.status, "sent");
            assert.strictEqual(s2!.status, "canceled");
        });

        it("should cancel sending schedule when message is inactive", async () => {
            const app = makeApp();
            const msg = makeMessage({ status: "inactive" });
            const schedule = makeSchedule({
                appId: app._id,
                messageId: msg._id,
                status: "sending",
                events: [{ status: "composed", scheduledTo: ago(hours(1)) }],
                result: baseResult({ total: 10, sent: 5 }),
            });

            await db.collection("apps").insertOne(app);
            await db.collection("messages").insertOne(msg);
            await db.collection("message_schedules").insertOne(schedule);

            await run();

            const updated = await db.collection("message_schedules").findOne({ _id: schedule._id });
            assert.strictEqual(updated!.status, "canceled");
        });
    });

    // ============================================================
    // Step 2: Fail timed-out schedule events
    // ============================================================

    describe("Step 2: Fail timed-out schedule events", () => {
        it("should fail events that are past the 48h timeout", async () => {
            const app = makeApp();
            const msg = makeMessage();
            const schedule = makeSchedule({
                appId: app._id,
                messageId: msg._id,
                events: [{
                    status: "scheduled",
                    scheduledTo: ago(EVENT_TIMEOUT_MS + hours(1)),
                }],
            });

            await db.collection("apps").insertOne(app);
            await db.collection("messages").insertOne(msg);
            await db.collection("message_schedules").insertOne(schedule);

            await run();

            const updated = await db.collection("message_schedules").findOne({ _id: schedule._id });
            assert.strictEqual(updated!.events[0].status, "failed");
            assert.strictEqual(updated!.events[0].error.name, "TimeoutError");
        });

        it("should not fail events that are within the 48h timeout", async () => {
            const app = makeApp();
            const msg = makeMessage();
            const schedule = makeSchedule({
                appId: app._id,
                messageId: msg._id,
                events: [{
                    status: "scheduled",
                    scheduledTo: ago(hours(1)),
                }],
            });

            await db.collection("apps").insertOne(app);
            await db.collection("messages").insertOne(msg);
            await db.collection("message_schedules").insertOne(schedule);

            await run();

            const updated = await db.collection("message_schedules").findOne({ _id: schedule._id });
            assert.strictEqual(updated!.events[0].status, "scheduled");
        });

        it("should fail multiple timed-out events in the same schedule", async () => {
            const app = makeApp();
            const msg = makeMessage();
            const schedule = makeSchedule({
                appId: app._id,
                messageId: msg._id,
                events: [
                    { status: "scheduled", scheduledTo: ago(EVENT_TIMEOUT_MS + hours(2)) },
                    { status: "composed", scheduledTo: ago(EVENT_TIMEOUT_MS + hours(3)) },
                    { status: "scheduled", scheduledTo: ago(EVENT_TIMEOUT_MS + hours(1)) },
                ],
            });

            await db.collection("apps").insertOne(app);
            await db.collection("messages").insertOne(msg);
            await db.collection("message_schedules").insertOne(schedule);

            await run();

            const updated = await db.collection("message_schedules").findOne({ _id: schedule._id });
            assert.strictEqual(updated!.events[0].status, "failed");
            assert.strictEqual(updated!.events[1].status, "composed"); // unchanged
            assert.strictEqual(updated!.events[2].status, "failed");
        });

        it("should only fail old events and leave recent ones", async () => {
            const app = makeApp();
            const msg = makeMessage();
            const schedule = makeSchedule({
                appId: app._id,
                messageId: msg._id,
                status: "sending",
                events: [
                    { status: "composed", scheduledTo: ago(EVENT_TIMEOUT_MS + hours(5)) },
                    { status: "scheduled", scheduledTo: ago(EVENT_TIMEOUT_MS + hours(1)) },
                    { status: "scheduled", scheduledTo: ago(hours(1)) }, // recent
                ],
            });

            await db.collection("apps").insertOne(app);
            await db.collection("messages").insertOne(msg);
            await db.collection("message_schedules").insertOne(schedule);

            await run();

            const updated = await db.collection("message_schedules").findOne({ _id: schedule._id });
            assert.strictEqual(updated!.events[0].status, "composed");
            assert.strictEqual(updated!.events[1].status, "failed");
            assert.strictEqual(updated!.events[2].status, "scheduled");
        });

        it("should not touch events on terminal schedules", async () => {
            const app = makeApp();
            const msg = makeMessage();
            const schedule = makeSchedule({
                appId: app._id,
                messageId: msg._id,
                status: "sent",
                events: [{
                    status: "scheduled",
                    scheduledTo: ago(EVENT_TIMEOUT_MS + hours(1)),
                }],
            });

            await db.collection("apps").insertOne(app);
            await db.collection("messages").insertOne(msg);
            await db.collection("message_schedules").insertOne(schedule);

            await run();

            const updated = await db.collection("message_schedules").findOne({ _id: schedule._id });
            assert.strictEqual(updated!.events[0].status, "scheduled");
        });
    });

    // ============================================================
    // Step 3: Close result gaps
    // ============================================================

    describe("Step 3: Close result gaps", () => {
        it("should increment failed by gap when results are missing", async () => {
            const app = makeApp();
            const msg = makeMessage({ result: baseResult({ total: 100, sent: 60, failed: 20 }) });
            const schedule = makeSchedule({
                appId: app._id,
                messageId: msg._id,
                status: "sending",
                scheduledTo: ago(RESULT_TIMEOUT_MS + hours(1)),
                events: [{ status: "composed", scheduledTo: ago(RESULT_TIMEOUT_MS + hours(1)) }],
                result: baseResult({ total: 100, sent: 60, failed: 20 }),
            });

            await db.collection("apps").insertOne(app);
            await db.collection("messages").insertOne(msg);
            await db.collection("message_schedules").insertOne(schedule);

            await run();

            const updatedSchedule = await db.collection("message_schedules").findOne({ _id: schedule._id });
            assert.strictEqual(updatedSchedule!.result.failed, 40); // 20 + gap of 20
            assert.strictEqual(updatedSchedule!.result.errors[LOST_RESULT_ERROR], 20);

            const updatedMsg = await db.collection("messages").findOne({ _id: msg._id });
            assert.strictEqual(updatedMsg!.result.failed, 40);
            assert.strictEqual(updatedMsg!.result.errors[LOST_RESULT_ERROR], 20);
        });

        it("should not touch schedules where results are complete", async () => {
            const app = makeApp();
            const msg = makeMessage();
            const schedule = makeSchedule({
                appId: app._id,
                messageId: msg._id,
                status: "sending",
                scheduledTo: ago(RESULT_TIMEOUT_MS + hours(1)),
                events: [{ status: "composed", scheduledTo: ago(RESULT_TIMEOUT_MS + hours(1)) }],
                result: baseResult({ total: 100, sent: 80, failed: 20 }),
            });

            await db.collection("apps").insertOne(app);
            await db.collection("messages").insertOne(msg);
            await db.collection("message_schedules").insertOne(schedule);

            await run();

            const updated = await db.collection("message_schedules").findOne({ _id: schedule._id });
            assert.strictEqual(updated!.result.failed, 20); // unchanged
        });

        it("should not touch schedules within the 24h result timeout", async () => {
            const app = makeApp();
            const msg = makeMessage();
            const schedule = makeSchedule({
                appId: app._id,
                messageId: msg._id,
                status: "sending",
                scheduledTo: ago(hours(2)),
                events: [{ status: "composed", scheduledTo: ago(hours(2)) }],
                result: baseResult({ total: 100, sent: 10, failed: 0 }),
            });

            await db.collection("apps").insertOne(app);
            await db.collection("messages").insertOne(msg);
            await db.collection("message_schedules").insertOne(schedule);

            await run();

            const updated = await db.collection("message_schedules").findOne({ _id: schedule._id });
            assert.strictEqual(updated!.result.failed, 0); // unchanged — within 24h buffer
        });

        it("should not close gap when last timezone event is recent even if main scheduledTo is old", async () => {
            const app = makeApp();
            const msg = makeMessage();
            // TZ-aware: main scheduledTo was 30h ago but last TZ event was only 5h ago
            const schedule = makeSchedule({
                appId: app._id,
                messageId: msg._id,
                status: "sending",
                scheduledTo: ago(hours(30)),
                events: [
                    { status: "composed", scheduledTo: ago(hours(30)) },
                    { status: "composed", scheduledTo: ago(hours(5)) }, // last TZ event — recent
                ],
                result: baseResult({ total: 100, sent: 50, failed: 0 }),
            });

            await db.collection("apps").insertOne(app);
            await db.collection("messages").insertOne(msg);
            await db.collection("message_schedules").insertOne(schedule);

            await run();

            const updated = await db.collection("message_schedules").findOne({ _id: schedule._id });
            assert.strictEqual(updated!.result.failed, 0); // unchanged — last event within 24h
        });

        it("should close gap when even the last timezone event is past the timeout", async () => {
            const app = makeApp();
            const msg = makeMessage({ result: baseResult({ total: 200, sent: 100, failed: 50 }) });
            // TZ-aware: all events old enough
            const schedule = makeSchedule({
                appId: app._id,
                messageId: msg._id,
                status: "sending",
                scheduledTo: ago(RESULT_TIMEOUT_MS + hours(30)),
                events: [
                    { status: "composed", scheduledTo: ago(RESULT_TIMEOUT_MS + hours(30)) },
                    { status: "composed", scheduledTo: ago(RESULT_TIMEOUT_MS + hours(4)) }, // last TZ
                ],
                result: baseResult({ total: 200, sent: 100, failed: 50 }),
            });

            await db.collection("apps").insertOne(app);
            await db.collection("messages").insertOne(msg);
            await db.collection("message_schedules").insertOne(schedule);

            await run();

            const updatedSchedule = await db.collection("message_schedules").findOne({ _id: schedule._id });
            assert.strictEqual(updatedSchedule!.result.failed, 100); // 50 + gap of 50
            assert.strictEqual(updatedSchedule!.result.errors[LOST_RESULT_ERROR], 50);
        });

        it("should not touch schedules that still have scheduled events", async () => {
            const app = makeApp();
            const msg = makeMessage();
            const schedule = makeSchedule({
                appId: app._id,
                messageId: msg._id,
                status: "sending",
                scheduledTo: ago(RESULT_TIMEOUT_MS + hours(1)),
                events: [
                    { status: "composed", scheduledTo: ago(RESULT_TIMEOUT_MS + hours(1)) },
                    { status: "scheduled", scheduledTo: new Date() },
                ],
                result: baseResult({ total: 100, sent: 50, failed: 0 }),
            });

            await db.collection("apps").insertOne(app);
            await db.collection("messages").insertOne(msg);
            await db.collection("message_schedules").insertOne(schedule);

            await run();

            const updated = await db.collection("message_schedules").findOne({ _id: schedule._id });
            assert.strictEqual(updated!.result.failed, 0); // unchanged — events still pending
        });

        it("should handle gap where all results are lost (sent=0, failed=0)", async () => {
            const app = makeApp();
            const msg = makeMessage({ result: baseResult({ total: 50 }) });
            const schedule = makeSchedule({
                appId: app._id,
                messageId: msg._id,
                status: "sending",
                scheduledTo: ago(RESULT_TIMEOUT_MS + hours(2)),
                events: [{ status: "composed", scheduledTo: ago(RESULT_TIMEOUT_MS + hours(2)) }],
                result: baseResult({ total: 50 }),
            });

            await db.collection("apps").insertOne(app);
            await db.collection("messages").insertOne(msg);
            await db.collection("message_schedules").insertOne(schedule);

            await run();

            const updated = await db.collection("message_schedules").findOne({ _id: schedule._id });
            assert.strictEqual(updated!.result.failed, 50);
            assert.strictEqual(updated!.result.errors[LOST_RESULT_ERROR], 50);
        });
    });

    // ============================================================
    // Step 4: Fix stale schedule statuses
    // ============================================================

    describe("Step 4: Fix stale schedule statuses", () => {
        it("should transition to 'sent' when all events composed and results complete", async () => {
            const app = makeApp();
            const msg = makeMessage();
            const schedule = makeSchedule({
                appId: app._id,
                messageId: msg._id,
                status: "sending",
                events: [{ status: "composed", scheduledTo: ago(hours(2)) }],
                result: baseResult({ total: 100, sent: 80, failed: 20 }),
            });

            await db.collection("apps").insertOne(app);
            await db.collection("messages").insertOne(msg);
            await db.collection("message_schedules").insertOne(schedule);

            await run();

            const updated = await db.collection("message_schedules").findOne({ _id: schedule._id });
            assert.strictEqual(updated!.status, "sent");
        });

        it("should transition to 'failed' when all pushes failed", async () => {
            const app = makeApp();
            const msg = makeMessage();
            const schedule = makeSchedule({
                appId: app._id,
                messageId: msg._id,
                status: "sending",
                events: [{ status: "composed", scheduledTo: ago(hours(2)) }],
                result: baseResult({ total: 50, sent: 0, failed: 50 }),
            });

            await db.collection("apps").insertOne(app);
            await db.collection("messages").insertOne(msg);
            await db.collection("message_schedules").insertOne(schedule);

            await run();

            const updated = await db.collection("message_schedules").findOne({ _id: schedule._id });
            assert.strictEqual(updated!.status, "failed");
        });

        it("should transition to 'sent' when total is 0 (zero audience)", async () => {
            const app = makeApp();
            const msg = makeMessage();
            const schedule = makeSchedule({
                appId: app._id,
                messageId: msg._id,
                status: "scheduled",
                events: [{ status: "composed", scheduledTo: ago(hours(2)) }],
                result: baseResult({ total: 0, sent: 0, failed: 0 }),
            });

            await db.collection("apps").insertOne(app);
            await db.collection("messages").insertOne(msg);
            await db.collection("message_schedules").insertOne(schedule);

            await run();

            const updated = await db.collection("message_schedules").findOne({ _id: schedule._id });
            assert.strictEqual(updated!.status, "sent");
        });

        it("should transition 'scheduled' to 'sent' when all events failed via timeout and results are complete", async () => {
            const app = makeApp();
            const msg = makeMessage();
            // schedule where step 2 just failed the events in this same run
            const schedule = makeSchedule({
                appId: app._id,
                messageId: msg._id,
                status: "scheduled",
                events: [{ status: "failed", scheduledTo: ago(EVENT_TIMEOUT_MS + hours(1)) }],
                result: baseResult({ total: 0 }),
            });

            await db.collection("apps").insertOne(app);
            await db.collection("messages").insertOne(msg);
            await db.collection("message_schedules").insertOne(schedule);

            await run();

            const updated = await db.collection("message_schedules").findOne({ _id: schedule._id });
            assert.strictEqual(updated!.status, "sent");
        });

        it("should not transition schedules that still have scheduled events", async () => {
            const app = makeApp();
            const msg = makeMessage();
            const schedule = makeSchedule({
                appId: app._id,
                messageId: msg._id,
                status: "sending",
                events: [
                    { status: "composed", scheduledTo: ago(hours(2)) },
                    { status: "scheduled", scheduledTo: new Date() },
                ],
                result: baseResult({ total: 100, sent: 50, failed: 0 }),
            });

            await db.collection("apps").insertOne(app);
            await db.collection("messages").insertOne(msg);
            await db.collection("message_schedules").insertOne(schedule);

            await run();

            const updated = await db.collection("message_schedules").findOne({ _id: schedule._id });
            assert.strictEqual(updated!.status, "sending");
        });

        it("should transition with mixed composed and failed events", async () => {
            const app = makeApp();
            const msg = makeMessage();
            const schedule = makeSchedule({
                appId: app._id,
                messageId: msg._id,
                status: "sending",
                events: [
                    { status: "composed", scheduledTo: ago(hours(3)) },
                    { status: "failed", scheduledTo: ago(hours(2)), error: { name: "TimeoutError", message: "timed out" } },
                ],
                result: baseResult({ total: 80, sent: 75, failed: 5 }),
            });

            await db.collection("apps").insertOne(app);
            await db.collection("messages").insertOne(msg);
            await db.collection("message_schedules").insertOne(schedule);

            await run();

            const updated = await db.collection("message_schedules").findOne({ _id: schedule._id });
            assert.strictEqual(updated!.status, "sent");
        });
    });

    // ============================================================
    // End-to-end: steps interact correctly
    // ============================================================

    describe("End-to-end scenarios", () => {
        it("step 2 fails events then step 4 transitions the schedule status", async () => {
            const app = makeApp();
            const msg = makeMessage();
            const schedule = makeSchedule({
                appId: app._id,
                messageId: msg._id,
                status: "scheduled",
                events: [{
                    status: "scheduled",
                    scheduledTo: ago(EVENT_TIMEOUT_MS + hours(1)),
                }],
                result: baseResult({ total: 0 }),
            });

            await db.collection("apps").insertOne(app);
            await db.collection("messages").insertOne(msg);
            await db.collection("message_schedules").insertOne(schedule);

            await run();

            const updated = await db.collection("message_schedules").findOne({ _id: schedule._id });
            assert.strictEqual(updated!.events[0].status, "failed");
            assert.strictEqual(updated!.status, "sent"); // 0 total → sent
        });

        it("step 3 closes gap then step 4 transitions to failed", async () => {
            const app = makeApp();
            const msg = makeMessage({ result: baseResult({ total: 100 }) });
            const schedule = makeSchedule({
                appId: app._id,
                messageId: msg._id,
                status: "sending",
                scheduledTo: ago(RESULT_TIMEOUT_MS + hours(2)),
                events: [{ status: "composed", scheduledTo: ago(RESULT_TIMEOUT_MS + hours(2)) }],
                result: baseResult({ total: 100, sent: 0, failed: 0 }),
            });

            await db.collection("apps").insertOne(app);
            await db.collection("messages").insertOne(msg);
            await db.collection("message_schedules").insertOne(schedule);

            await run();

            const updated = await db.collection("message_schedules").findOne({ _id: schedule._id });
            // step 3 added 100 to failed
            assert.strictEqual(updated!.result.failed, 100);
            // step 4 transitions to failed since all pushes failed
            assert.strictEqual(updated!.status, "failed");
        });

        it("step 1 cancels orphan so steps 2-4 don't process it", async () => {
            const app = makeApp();
            // message is deleted
            const msg = makeMessage({ status: "deleted" });
            const schedule = makeSchedule({
                appId: app._id,
                messageId: msg._id,
                status: "sending",
                scheduledTo: ago(RESULT_TIMEOUT_MS + hours(2)),
                events: [{
                    status: "scheduled",
                    scheduledTo: ago(EVENT_TIMEOUT_MS + hours(1)),
                }],
                result: baseResult({ total: 50, sent: 10, failed: 0 }),
            });

            await db.collection("apps").insertOne(app);
            await db.collection("messages").insertOne(msg);
            await db.collection("message_schedules").insertOne(schedule);

            await run();

            const updated = await db.collection("message_schedules").findOne({ _id: schedule._id });
            // canceled by step 1 — events and results untouched
            assert.strictEqual(updated!.status, "canceled");
            assert.strictEqual(updated!.events[0].status, "scheduled"); // not touched by step 2
            assert.strictEqual(updated!.result.failed, 0); // not touched by step 3
        });

        it("should handle multiple schedules with different issues in one run", async () => {
            const app = makeApp();
            const msg = makeMessage();

            // Schedule A: timed-out event
            const schedA = makeSchedule({
                appId: app._id,
                messageId: msg._id,
                status: "scheduled",
                events: [{
                    status: "scheduled",
                    scheduledTo: ago(EVENT_TIMEOUT_MS + hours(1)),
                }],
                result: baseResult(),
            });

            // Schedule B: result gap
            const schedB = makeSchedule({
                appId: app._id,
                messageId: msg._id,
                status: "sending",
                scheduledTo: ago(RESULT_TIMEOUT_MS + hours(1)),
                events: [{ status: "composed", scheduledTo: ago(RESULT_TIMEOUT_MS + hours(1)) }],
                result: baseResult({ total: 20, sent: 15, failed: 0 }),
            });

            // Schedule C: already complete, just stuck in "sending"
            const schedC = makeSchedule({
                appId: app._id,
                messageId: msg._id,
                status: "sending",
                events: [{ status: "composed", scheduledTo: ago(hours(2)) }],
                result: baseResult({ total: 10, sent: 8, failed: 2 }),
            });

            await db.collection("apps").insertOne(app);
            await db.collection("messages").insertOne(msg);
            await db.collection("message_schedules").insertMany([schedA, schedB, schedC]);

            await run();

            const a = await db.collection("message_schedules").findOne({ _id: schedA._id });
            const b = await db.collection("message_schedules").findOne({ _id: schedB._id });
            const c = await db.collection("message_schedules").findOne({ _id: schedC._id });

            // A: event failed by step 2, status fixed by step 4
            assert.strictEqual(a!.events[0].status, "failed");
            assert.strictEqual(a!.status, "sent");

            // B: gap closed by step 3, status fixed by step 4
            assert.strictEqual(b!.result.failed, 5);
            assert.strictEqual(b!.status, "sent");

            // C: status fixed by step 4 (was already complete)
            assert.strictEqual(c!.status, "sent");
        });

        it("should do nothing when there are no active schedules", async () => {
            const app = makeApp();
            const msg = makeMessage();
            const schedule = makeSchedule({
                appId: app._id,
                messageId: msg._id,
                status: "sent",
                events: [{ status: "composed", scheduledTo: ago(hours(10)) }],
                result: baseResult({ total: 10, sent: 10 }),
            });

            await db.collection("apps").insertOne(app);
            await db.collection("messages").insertOne(msg);
            await db.collection("message_schedules").insertOne(schedule);

            await run();

            const updated = await db.collection("message_schedules").findOne({ _id: schedule._id });
            assert.strictEqual(updated!.status, "sent");
            assert.strictEqual(updated!.result.sent, 10);
        });
    });

    // ============================================================
    // Progress callback
    // ============================================================

    describe("Progress callback", () => {
        it("should call progress for each step", async () => {
            const calls: [number, number, string][] = [];
            await fixMessageStates({
                db,
                log: silentLog,
                progress: (total: number, step: number, msg: string) => {
                    calls.push([total, step, msg]);
                },
            });
            assert.strictEqual(calls.length, 4);
            assert.deepStrictEqual(calls.map(c => c[1]), [1, 2, 3, 4]);
            assert.strictEqual(calls[0][0], 4);
        });
    });
});
