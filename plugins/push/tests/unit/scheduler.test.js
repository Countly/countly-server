/**
 * @typedef {import("../../api/new/types/queue.js").ScheduleEvent} ScheduleEvent
 * @typedef {import("../../api/new/types/message.ts").RecurringTrigger} RecurringTrigger
 * @typedef {import("../../api/new/types/message.ts").MultiTrigger} MultiTrigger
 * @typedef {import("../../api/new/types/message.ts").EventTrigger} EventTrigger
 * @typedef {import("../../api/new/types/schedule.ts").Schedule} Schedule
 * @typedef {import("mongodb").Collection} Collection
 * @typedef {import("mongodb").Db} Db
 * @typedef {import("mongodb").FindCursor} FindCursor
 * @typedef {import("../../api/new/types/queue.ts").AutoTriggerEvent} AutoTriggerEvent
 */
const assert = require("assert");
const { describe, it, afterEach } = require("mocha");
const { ObjectId } = require("mongodb");
const sinon = require("sinon");
const proxyquire = require("proxyquire");
const { createMockedMongoDb } = require("../mock/mongo.js");
const timezones = require("../../api/new/constants/all-tz-offsets.json");
const mockData = require("../mock/data.js");
const { buildResultObject } = require("../../api/new/resultor.js");
let {
    collection,
    db,
    findCursor,
} = createMockedMongoDb();
/** @type {sinon.SinonStub<[pushes: ScheduleEvent[]], Promise<void>>} */
const mockSendScheduleEvents = sinon.stub();
const {
    tzOffsetAdjustedTime,
    findNextMatchForRecurring,
    findNextMatchForMulti,
    createScheduleEvents,
    createSchedule,
    scheduleMessageByDateTrigger,
    mergeAutoTriggerEvents,
    scheduleMessageByAutoTriggers,
} = proxyquire("../../api/new/scheduler", {
    "../../api/new/lib/kafka.js": {
        sendScheduleEvents: mockSendScheduleEvents
    }
});

describe("Scheduler", () => {
    afterEach(() => {
        // Reset the sandbox to clear all stubs and spies.
        // we cannot use resetHistory here because we need to reset the whole sandbox
        ({ findCursor, collection, db } = createMockedMongoDb());
        mockSendScheduleEvents.resetHistory();
    });

    describe("Timezone adjustment", () => {
        it("should calculate the date correctly when timezone is different", () => {
            const result = tzOffsetAdjustedTime(
                new Date("2024-01-01T23:15:00.000+02:00"),
                -60, // CET +01:00
                13.5 * 60 * 60 * 1000 // 13:30
            );
            assert.equal(
                result.getTime(),
                (new Date("2024-01-01T13:30:00.000+01:00")).getTime()
            );
        });
        it("should calculate the date correctly when timezone is the same", () => {
            const result = tzOffsetAdjustedTime(
                new Date("2024-03-01T13:15:00.000+03:00"),
                -180, // +03:00
                13.5 * 60 * 60 * 1000 // 13:30
            );
            assert.equal(
                result.getTime(),
                (new Date("2024-03-01T13:30:00.000+03:00")).getTime()
            );
        });
    });

    describe("Daily recurring date matching", () => {
        const now = new Date("2024-01-01T00:00:00+03:00");
        const matches = [
            new Date("2024-02-01T14:45:00+03:00"),
            new Date("2024-02-06T14:45:00+03:00"),
            new Date("2024-02-11T14:45:00+03:00"),
            new Date("2024-02-16T14:45:00+03:00"),
            new Date("2024-02-21T14:45:00+03:00"),
            new Date("2024-02-26T14:45:00+03:00"),
            new Date("2024-03-02T14:45:00+03:00"),
            new Date("2024-03-07T14:45:00+03:00"),
        ];
        it("should find all dates", () => {
            /** @type {Date|undefined} */
            let nextDate;
            let i = 0;
            while (nextDate = findNextMatchForRecurring(mockData.dailyRecurringTrigger(), nextDate ? new Date(nextDate.getTime() + 1) : now)) {
                assert.equal(nextDate.getTime(), matches[i].getTime());
                i++;
                if (i > 100) break;
            }
            assert.equal(i, matches.length);
        });
        it("should find the first date after 13th", () => {
            const now = new Date("2024-02-13T11:15:00+03:00");
            const expected = new Date("2024-02-16T14:45:00+03:00");
            const nextMatch = findNextMatchForRecurring(mockData.dailyRecurringTrigger(), now);
            assert(nextMatch instanceof Date);
            assert.equal(nextMatch.getTime(), expected.getTime());
        });
    });

    describe("Weekly recurring date matching", () => {
        const now = new Date("2024-01-10T00:00:00+03:00");
        const matches = [
            new Date("2024-02-01T14:45:00+03:00"),
            new Date("2024-02-02T14:45:00+03:00"),
            new Date("2024-02-13T14:45:00+03:00"),
            new Date("2024-02-15T14:45:00+03:00"),
            new Date("2024-02-16T14:45:00+03:00"),
            new Date("2024-02-27T14:45:00+03:00"),
            new Date("2024-02-29T14:45:00+03:00"),
            new Date("2024-03-01T14:45:00+03:00"),
            new Date("2024-03-12T14:45:00+03:00"),
            new Date("2024-03-14T14:45:00+03:00"),
        ];
        it("should find all dates", () => {
            /** @type {Date|undefined} */
            let nextDate;
            let i = 0;
            while (nextDate = findNextMatchForRecurring(mockData.weeklyRecurringTrigger(), nextDate ? new Date(nextDate.getTime() + 1) : now)) {
                assert.equal(nextDate.getTime(), matches[i].getTime());
                i++;
                if (i > 100) break;
            }
            assert.equal(i, matches.length);
        });
    });

    describe("Monthly recurring date matching", () => {
        const now = new Date("2024-01-10T00:00:00+03:00");
        const matches = [
            new Date("2024-02-03T14:45:00+03:00"),
            new Date("2024-02-20T14:45:00+03:00"),
            new Date("2024-02-28T14:45:00+03:00"),
            new Date("2024-02-29T14:45:00+03:00"),
            new Date("2024-05-03T14:45:00+03:00"),
            new Date("2024-05-20T14:45:00+03:00"),
            new Date("2024-05-30T14:45:00+03:00"),
            new Date("2024-05-31T14:45:00+03:00"),
            new Date("2024-08-03T14:45:00+03:00"),
            new Date("2024-08-20T14:45:00+03:00"),
            new Date("2024-08-30T14:45:00+03:00"),
            new Date("2024-08-31T14:45:00+03:00"),
        ];
        it("should find all dates", () => {
            /** @type {Date|undefined} */
            let nextDate;
            let i = 0;
            while (nextDate = findNextMatchForRecurring(mockData.monthlyRecurringTrigger(), nextDate ? new Date(nextDate.getTime() + 1) : now)) {
                assert.equal(nextDate.getTime(), matches[i].getTime());
                i++;
                if (i > 100) break;
            }
            assert.equal(i, matches.length);
        });
    });

    describe("Multiple dates matching", () => {
        const dates = [
            new Date("2024-07-11T16:08:49.000Z"),
            new Date("2024-07-18T16:09:02.000Z"),
            new Date("2024-07-31T16:09:06.000Z"),
            new Date("2024-07-28T16:09:10.000Z"),
            new Date("2024-07-11T18:09:22.000Z"),
            new Date("2024-07-16T20:09:36.000Z"),
            new Date("2024-07-18T05:09:45.000Z")
        ];
        const sortedDates = dates.map(d => new Date(d.getTime())).sort((i,j) => i.getTime() - j.getTime());
        const now = new Date("2024-01-10T00:00:00+03:00");
        /** @type {() => MultiTrigger} */
        const trigger = () => ({
            kind: "multi",
            start: new Date("2024-07-10T00:00:00.000Z"),
            dates,
        });
        it("should find all dates", () => {
            /** @type {Date|undefined} */
            let nextDate;
            let i = 0;
            while (nextDate = findNextMatchForMulti(trigger(), nextDate ? new Date(nextDate.getTime() + 1) : now)) {
                assert.equal(nextDate.getTime(), sortedDates[i].getTime());
                i++;
                if (i > 100) break;
            }
            assert.equal(i, sortedDates.length);
        });
        it("shouldn't find any date in the past", () => {
            const now = new Date("2024-07-18T09:00:00+03:00");
            const filtered = sortedDates.filter(d => d.getTime() > now.getTime());
            /**
             * @param {Date} a
             * @param {Date} b
             * @returns {Date}
             */
            const later = (a, b) => new Date(Math.max(a.getTime(), b.getTime()));
            /** @type {() => MultiTrigger} */
            const trigger = () => ({
                kind: "multi",
                start: new Date("2024-07-10T00:00:00.000Z"),
                dates,
            });
            /** @type {Date|undefined} */
            let nextDate;
            let i = 0;
            while (nextDate = findNextMatchForMulti(trigger(), nextDate ? later(new Date(nextDate.getTime() + 1), now) : now)) {
                assert.equal(nextDate.getTime(), filtered[i].getTime());
                i++;
                if (i > 100) break;
            }
            assert.equal(i, filtered.length);
        });
    });

    describe("Schedule event creation", () => {
        const schedule = mockData.schedule();
        it("should send a schedule event for each timezone that hasn't passed the scheduler's time", async () => {
            if (schedule.schedulerTimezone === undefined) {
                throw new Error("Scheduler timezone is required");
            }
            const minute = 60 * 1000;
            const utcTime = schedule.scheduledTo.getTime() - schedule.schedulerTimezone * minute;
            const timezoneAdjusted = timezones
                .map(({ offset }) => utcTime - offset * minute)
                .filter((time) => time > Date.now());
            await createScheduleEvents(schedule);
            const arg = mockSendScheduleEvents.getCall(0).args[0];
            const dates = arg.map((event) => event.scheduledTo.getTime());
            assert.strictEqual(arg.length, timezoneAdjusted.length);
            assert.deepEqual(dates, timezoneAdjusted);
        });
        it("should send a single schedule event", async () => {
            await createScheduleEvents({ ...schedule, timezoneAware: false });
            assert(mockSendScheduleEvents.callCount === 1);
            assert(
                mockSendScheduleEvents.calledWith([{
                    appId: schedule.appId,
                    messageId: schedule.messageId,
                    scheduleId: schedule._id,
                    scheduledTo: schedule.scheduledTo,
                }])
            );
        });
    });

    describe("Schedule document creation should", () => {
        const appId = new ObjectId;
        const messageId = new ObjectId;
        const scheduledTo = new Date;
        it("throw an error when scheduler timezone is not given for a timezoneAware message", async () => {
            assert.rejects(createSchedule(db, appId, messageId, scheduledTo, true));
        });
        it("create a schedule document inside the collection", async () => {
            const result = await createSchedule(db, appId, messageId, scheduledTo, false);
            assert(result._id instanceof ObjectId);
            assert(db.collection.calledWith("message_schedules"));
            const arg = collection.insertOne.getCall(0)?.args[0];
            const actualScheduleDate = arg?.events?.scheduled?.[0]?.date;
            const expectedArg = {
                _id: result._id,
                appId,
                messageId,
                scheduledTo,
                rescheduleIfPassed: false,
                status: "scheduled",
                timezoneAware: false,
                schedulerTimezone: undefined,
                audienceFilter: undefined,
                messageOverrides: undefined,
                result: buildResultObject(),
                events: {
                    scheduled: [{
                        scheduledTo,
                        date: actualScheduleDate,
                        timezone: undefined,
                    }],
                    composed: []
                }
            };
            assert.deepStrictEqual(expectedArg, arg);
        });
    });

    describe("Message scheduling", () => {
        it("should throw an error if it cannot find a schedulable trigger", async () => {
            const mockMessage = mockData.message();
            mockMessage.triggers = [
                /** @type {EventTrigger} */({
                    kind: "event",
                    events: ["lorem", "ipsum"]
                })
            ];
            collection.findOne.resolves(mockMessage);
            assert.rejects(scheduleMessageByDateTrigger(db, mockMessage._id));
        });
    });

    describe("Auto trigger message scheduling", () => {
        it("should merge multiple events and creates a map", () => {
            const app1 = new ObjectId("67b868f115891e7800e2f562");
            const app2 = new ObjectId("67b868f115891e7800e2f563");
            const cohort1 = "67b868f115891e7800e2f564";
            const cohort2 = "67b868f115891e7800e2f565";
            const event1 = "test-event-1";
            const event2 = "test-event-2";
            /** @type {AutoTriggerEvent[]} */
            const events = [
                { "kind": "event", "appId": app1, "eventKeys": [event1], "uid": "7" },
                { "kind": "event", "appId": app2, "eventKeys": [event2], "uid": "11" },
                { "kind": "cohort", "appId": app1, "direction": "enter", "cohortId": cohort1, "uids": ["1", "2"] },
                { "kind": "event", "appId": app1, "eventKeys": [event2], "uid": "13" },
                { "kind": "event", "appId": app2, "eventKeys": [event2], "uid": "4" },
                { "kind": "cohort", "appId": app1, "direction": "enter", "cohortId": cohort1, "uids": ["5"] },
                { "kind": "event", "appId": app1, "eventKeys": [event1], "uid": "3" },
                { "kind": "cohort", "appId": app1, "direction": "exit", "cohortId": cohort2, "uids": ["6"] },
                { "kind": "cohort", "appId": app1, "direction": "enter", "cohortId": cohort2, "uids": ["9"] },
                { "kind": "event", "appId": app2, "eventKeys": [event1], "uid": "8" },
                { "kind": "cohort", "appId": app2, "direction": "exit", "cohortId": cohort1, "uids": ["10"] },
                { "kind": "event", "appId": app1, "eventKeys": [event1], "uid": "12" },
            ];
            const merged = mergeAutoTriggerEvents(events);
            assert.deepStrictEqual(merged, [
              { appId: app1, triggerFilter: { kind: 'event', events: event1 }, uids: [ '7', '3', '12' ] },
              { appId: app1, triggerFilter: { kind: 'event', events: event2 }, uids: [ '13' ] },
              { appId: app1, triggerFilter: { kind: 'cohort', cohorts: cohort1, entry: true }, uids: [ '1', '2', '5' ] },
              { appId: app1, triggerFilter: { kind: 'cohort', cohorts: cohort2, entry: true }, uids: [ '9' ] },
              { appId: app1, triggerFilter: { kind: 'cohort', cohorts: cohort2, entry: false }, uids: [ '6' ] },
              { appId: app2, triggerFilter: { kind: 'event', events: event2 }, uids: [ '11', '4' ] },
              { appId: app2, triggerFilter: { kind: 'event', events: event1 }, uids: [ '8' ] },
              { appId: app2, triggerFilter: { kind: 'cohort', cohorts: cohort1, entry: false }, uids: [ '10' ] }
            ]);
        });

        it("should ....", async () => {
            /** @type {AutoTriggerEvent} */
            const event = {
                kind: "event",
                appId: new ObjectId("67b868f115891e7800e2f563"),
                eventKeys: [
                    "test-event"
                ],
                uid: "7"
            };
            const message = {
                _id: new ObjectId("67eee6adc2a1c39736eb9803"),
                app: new ObjectId("67b868f115891e7800e2f563"),
                contents: [
                    { title: 'aa', message: 'aa', expiration: 604800000 },
                    { p: 'a', sound: 'default' },
                    { p: 'i', sound: 'default' }
                ],
                filter: {},
                info: {
                    appName: 'test',
                    silent: false,
                    scheduled: false,
                    locales: { default: 0, count: 3 },
                    created: new Date("2025-04-03T19:51:09.792Z"),
                    createdBy: new ObjectId("67b868ed0d4ab938cb9389af"),
                    createdByName: 'Cihad Tekin',
                    updated: new Date("2025-04-03T19:51:09.792Z"),
                    updatedBy: new ObjectId("67b868ed0d4ab938cb9389af"),
                    updatedByName: 'Cihad Tekin'
                },
                platforms: [ 'a', 'i' ],
                result: {
                    total: 0,
                    sent: 0,
                    actioned: 0,
                    errored: 0,
                    errors: {},
                    subs: {}
                },
                saveResults: true,
                state: 0,
                status: 'created',
                triggers: [
                    {
                        kind: 'event',
                        start: new Date("2025-04-03T19:50:47.672Z"),
                        actuals: false,
                        events: [ 'test-event' ]
                    }
                ]
            }
            findCursor.toArray.resolves([message]);
            await scheduleMessageByAutoTriggers(db, [event]);
        });
    });
});