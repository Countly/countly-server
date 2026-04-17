import { createRequire } from 'module';
import { ObjectId } from 'mongodb';
import assert from 'assert';
import sinon from 'sinon';
import { describe, it, beforeEach } from 'mocha';
import { createSilentLogModule } from '../../mock/logger.ts';

// Silence push logs: message-cache.ts loads common.js via createRequire — patch
// before importing the module under test so its top-level common.log() returns
// a silent logger.
const require = createRequire(import.meta.url);
require('../../../../../api/utils/common.js').log = createSilentLogModule();

const {
    cohortMessageExists,
    eventMessageExists,
    loadAutoMessages,
} = await import('../../../api/lib/message-cache.ts');

function createMockDb(messages: any[] = []) {
    return {
        collection: sinon.stub().returns({
            find: sinon.stub().returns({
                limit: sinon.stub().returns({
                    toArray: sinon.stub().resolves(messages),
                }),
            }),
        }),
    };
}

describe("Message cache", () => {
    describe("with empty cache (before loadAutoMessages)", () => {
        it("cohortMessageExists should return false for any input", () => {
            assert.strictEqual(cohortMessageExists("anyapp", "c1", "enter"), false);
            assert.strictEqual(cohortMessageExists(new ObjectId(), "c1", "exit"), false);
        });

        it("eventMessageExists should return false for any input", () => {
            assert.strictEqual(eventMessageExists("anyapp", "purchase"), false);
            assert.strictEqual(eventMessageExists(new ObjectId(), "signup"), false);
        });
    });

    describe("with populated cache", () => {
        const app1 = new ObjectId();
        const app2 = new ObjectId();
        const msg1 = new ObjectId();
        const msg2 = new ObjectId();
        const msg3 = new ObjectId();
        const msg4 = new ObjectId();

        const messages = [
            {
                _id: msg1, app: app1,
                triggers: [{ kind: "event", start: new Date(Date.now() - 86400000), events: ["purchase", "signup"] }],
            },
            {
                _id: msg2, app: app1,
                triggers: [{ kind: "cohort", start: new Date(Date.now() - 86400000), cohorts: ["vip_users"], entry: true }],
            },
            {
                _id: msg3, app: app2,
                triggers: [{ kind: "cohort", start: new Date(Date.now() - 86400000), cohorts: ["churned"], entry: false }],
            },
            {
                _id: msg4, app: app1,
                triggers: [{ kind: "event", start: new Date(Date.now() - 86400000), events: ["purchase"] }],
            },
        ];

        beforeEach(async() => {
            await loadAutoMessages(createMockDb(messages) as any);
        });

        it("should return true for event keys that have messages", () => {
            assert.strictEqual(eventMessageExists(app1, "purchase"), true);
            assert.strictEqual(eventMessageExists(app1, "signup"), true);
        });

        it("should return false for event keys with no messages", () => {
            assert.strictEqual(eventMessageExists(app1, "nonexistent"), false);
            assert.strictEqual(eventMessageExists(app2, "purchase"), false);
        });

        it("should return true for cohort+direction that has messages", () => {
            assert.strictEqual(cohortMessageExists(app1, "vip_users", "enter"), true);
            assert.strictEqual(cohortMessageExists(app2, "churned", "exit"), true);
        });

        it("should return false for cohort with wrong direction", () => {
            assert.strictEqual(cohortMessageExists(app1, "vip_users", "exit"), false);
            assert.strictEqual(cohortMessageExists(app2, "churned", "enter"), false);
        });

        it("should return false for unknown cohort", () => {
            assert.strictEqual(cohortMessageExists(app1, "unknown", "enter"), false);
        });

        it("should return false for unknown app", () => {
            const unknown = new ObjectId();
            assert.strictEqual(eventMessageExists(unknown, "purchase"), false);
            assert.strictEqual(cohortMessageExists(unknown, "vip_users", "enter"), false);
        });

        it("should accept both string and ObjectId for appId", () => {
            assert.strictEqual(eventMessageExists(app1.toString(), "purchase"), true);
            assert.strictEqual(eventMessageExists(app1, "purchase"), true);
            assert.strictEqual(cohortMessageExists(app1.toString(), "vip_users", "enter"), true);
            assert.strictEqual(cohortMessageExists(app1, "vip_users", "enter"), true);
        });
    });

    describe("loadAutoMessages", () => {
        it("should query the messages collection with correct filter", async() => {
            const db = createMockDb([]);
            await loadAutoMessages(db as any);

            assert(db.collection.calledWith("messages"));
            const findArg = db.collection().find.firstCall.firstArg;
            assert.strictEqual(findArg.status, "active");
            assert(findArg.triggers.$elemMatch);
            assert.deepStrictEqual(findArg.triggers.$elemMatch.kind, { $in: ["cohort", "event"] });
        });

        it("should limit results to 1000", async() => {
            const db = createMockDb([]);
            await loadAutoMessages(db as any);

            assert(db.collection().find().limit.calledWith(1000));
        });

        it("should handle malformed messages without crashing", async() => {
            const goodApp = new ObjectId();
            const db = createMockDb([
                {
                    _id: new ObjectId(), app: new ObjectId(),
                    triggers: [{ kind: "event" }],
                    // missing events array → will throw
                },
                {
                    _id: new ObjectId(), app: goodApp,
                    triggers: [{ kind: "event", start: new Date(Date.now() - 86400000), events: ["valid"] }],
                },
            ]);

            await loadAutoMessages(db as any);

            assert.strictEqual(eventMessageExists(goodApp, "valid"), true);
        });

        it("should clear the cache on each reload", async() => {
            const appId = new ObjectId();

            // First load
            await loadAutoMessages(createMockDb([{
                _id: new ObjectId(), app: appId,
                triggers: [{ kind: "event", start: new Date(Date.now() - 86400000), events: ["old_event"] }],
            }]) as any);
            assert.strictEqual(eventMessageExists(appId, "old_event"), true);

            // Reload with different data
            await loadAutoMessages(createMockDb([{
                _id: new ObjectId(), app: appId,
                triggers: [{ kind: "event", start: new Date(Date.now() - 86400000), events: ["new_event"] }],
            }]) as any);
            assert.strictEqual(eventMessageExists(appId, "old_event"), false);
            assert.strictEqual(eventMessageExists(appId, "new_event"), true);
        });

        it("should handle empty reload gracefully", async() => {
            const appId = new ObjectId();

            await loadAutoMessages(createMockDb([{
                _id: new ObjectId(), app: appId,
                triggers: [{ kind: "event", start: new Date(Date.now() - 86400000), events: ["some_event"] }],
            }]) as any);
            assert.strictEqual(eventMessageExists(appId, "some_event"), true);

            await loadAutoMessages(createMockDb([]) as any);
            assert.strictEqual(eventMessageExists(appId, "some_event"), false);
        });

        it("should group multiple messages under the same app", async() => {
            const appId = new ObjectId();
            await loadAutoMessages(createMockDb([
                {
                    _id: new ObjectId(), app: appId,
                    triggers: [{ kind: "event", events: ["e1"] }],
                },
                {
                    _id: new ObjectId(), app: appId,
                    triggers: [{ kind: "event", events: ["e2"] }],
                },
            ]) as any);

            assert.strictEqual(eventMessageExists(appId, "e1"), true);
            assert.strictEqual(eventMessageExists(appId, "e2"), true);
        });

        it("should handle cohort triggers with multiple cohort IDs", async() => {
            const appId = new ObjectId();
            await loadAutoMessages(createMockDb([{
                _id: new ObjectId(), app: appId,
                triggers: [{ kind: "cohort", cohorts: ["c1", "c2"], entry: true }],
            }]) as any);

            assert.strictEqual(cohortMessageExists(appId, "c1", "enter"), true);
            assert.strictEqual(cohortMessageExists(appId, "c2", "enter"), true);
            assert.strictEqual(cohortMessageExists(appId, "c1", "exit"), false);
        });

        it("should handle cohort exit triggers", async() => {
            const appId = new ObjectId();
            await loadAutoMessages(createMockDb([{
                _id: new ObjectId(), app: appId,
                triggers: [{ kind: "cohort", cohorts: ["c1"], entry: false }],
            }]) as any);

            assert.strictEqual(cohortMessageExists(appId, "c1", "exit"), true);
            assert.strictEqual(cohortMessageExists(appId, "c1", "enter"), false);
        });

        it("should handle event triggers with multiple event keys", async() => {
            const appId = new ObjectId();
            await loadAutoMessages(createMockDb([{
                _id: new ObjectId(), app: appId,
                triggers: [{ kind: "event", events: ["buy", "sell", "trade"] }],
            }]) as any);

            assert.strictEqual(eventMessageExists(appId, "buy"), true);
            assert.strictEqual(eventMessageExists(appId, "sell"), true);
            assert.strictEqual(eventMessageExists(appId, "trade"), true);
            assert.strictEqual(eventMessageExists(appId, "hold"), false);
        });
    });
});
