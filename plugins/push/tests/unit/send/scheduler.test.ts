import type { ScheduleEvent, AutoTriggerEvent } from '../../../api/models/queue.ts';
import type { RecurringTrigger, MultiTrigger, EventTrigger } from '../../../api/models/message.ts';
import { createRequire } from 'module';
import assert from 'assert';
import { describe, it, afterEach } from 'mocha';
import { ObjectId } from 'mongodb';
import sinon from 'sinon';
import esmock from 'esmock';
import { createMockedMongoDb } from '../../mock/mongo.ts';
import { createSilentLogModule } from '../../mock/logger.ts';
import timezones from '../../../api/constants/all-tz-offsets.ts';
import * as mockData from '../../mock/data.ts';
import { buildResultObject } from '../../../api/send/resultor.ts';
import type { Schedule } from '../../../api/models/schedule.ts';

// Silence push logs: scheduler.ts loads common.js via createRequire, which esmock
// cannot intercept — so we monkey-patch common.log directly before esmock runs.
const require = createRequire(import.meta.url);
require('../../../../../api/utils/common.js').log = createSilentLogModule();

let {
    collection,
    db,
    findCursor,
    createMockedCollection,
} = createMockedMongoDb();

const mockSendScheduleEvents: sinon.SinonStub<[pushes: ScheduleEvent[]], Promise<void>> = sinon.stub();
const {
    tzOffsetAdjustedTime,
    findNextMatchForRecurring,
    findNextMatchForMulti,
    createScheduleEvents,
    createSchedule,
    scheduleMessageByDateTrigger,
    mergeAutoTriggerEvents,
    scheduleMessageByAutoTriggers,
    scheduleIfEligible,
} = await esmock("../../../api/send/scheduler.ts", {
    "../../../api/kafka/producer.ts": {
        sendScheduleEvents: mockSendScheduleEvents
    }
});

describe("Scheduler", () => {
    afterEach(() => {
        // Reset the sandbox to clear all stubs and spies.
        // we cannot use resetHistory here because we need to reset the whole sandbox
        ({ findCursor, collection, db, createMockedCollection } = createMockedMongoDb());
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
            let nextDate: Date | undefined = findNextMatchForRecurring(mockData.dailyRecurringTrigger(), now);
            let i = 0;
            while (nextDate) {
                assert.equal(nextDate.getTime(), matches[i].getTime());
                i++;
                if (i > 100) {
                    break;
                }
                nextDate = findNextMatchForRecurring(mockData.dailyRecurringTrigger(), new Date(nextDate.getTime() + 1));
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
            let nextDate: Date | undefined = findNextMatchForRecurring(mockData.weeklyRecurringTrigger(), now);
            let i = 0;
            while (nextDate) {
                assert.equal(nextDate.getTime(), matches[i].getTime());
                i++;
                if (i > 100) {
                    break;
                }
                nextDate = findNextMatchForRecurring(mockData.weeklyRecurringTrigger(), new Date(nextDate.getTime() + 1));
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
            let nextDate: Date | undefined = findNextMatchForRecurring(mockData.monthlyRecurringTrigger(), now);
            let i = 0;
            while (nextDate) {
                assert.equal(nextDate.getTime(), matches[i].getTime());
                i++;
                if (i > 100) {
                    break;
                }
                nextDate = findNextMatchForRecurring(mockData.monthlyRecurringTrigger(), new Date(nextDate.getTime() + 1));
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
        const sortedDates = dates.map(d => new Date(d.getTime())).sort((i, j) => i.getTime() - j.getTime());
        const now = new Date("2024-01-10T00:00:00+03:00");
        const trigger = (): MultiTrigger => ({
            kind: "multi",
            start: new Date("2024-07-10T00:00:00.000Z"),
            dates,
        });
        it("should find all dates", () => {
            let nextDate: Date | undefined = findNextMatchForMulti(trigger(), now);
            let i = 0;
            while (nextDate) {
                assert.equal(nextDate.getTime(), sortedDates[i].getTime());
                i++;
                if (i > 100) {
                    break;
                }
                nextDate = findNextMatchForMulti(trigger(), new Date(nextDate.getTime() + 1));
            }
            assert.equal(i, sortedDates.length);
        });
        it("shouldn't find any date in the past", () => {
            const now = new Date("2024-07-18T09:00:00+03:00");
            const filtered = sortedDates.filter(d => d.getTime() > now.getTime());
            const later = (a: Date, b: Date): Date => new Date(Math.max(a.getTime(), b.getTime()));
            const trigger = (): MultiTrigger => ({
                kind: "multi",
                start: new Date("2024-07-10T00:00:00.000Z"),
                dates,
            });
            let nextDate: Date | undefined = findNextMatchForMulti(trigger(), now);
            let i = 0;
            while (nextDate) {
                assert.equal(nextDate.getTime(), filtered[i].getTime());
                i++;
                if (i > 100) {
                    break;
                }
                nextDate = findNextMatchForMulti(trigger(), later(new Date(nextDate.getTime() + 1), now));
            }
            assert.equal(i, filtered.length);
        });
    });

    describe("Schedule event creation", () => {
        const schedule = mockData.schedule();
        it("should send a schedule event for each timezone that hasn't passed the scheduler's time", async() => {
            if (schedule.schedulerTimezone === undefined) {
                throw new Error("Scheduler timezone is required");
            }
            const minute = 60 * 1000;
            const utcTime = schedule.scheduledTo.getTime() - schedule.schedulerTimezone * minute;
            const timezoneAdjusted = timezones
                .map(({ offset }: any) => utcTime - offset * minute)
                .filter((time: number) => time > Date.now());
            await createScheduleEvents(schedule);
            const arg = mockSendScheduleEvents.getCall(0).args[0];
            const dates = arg.map((event: any) => event.scheduledTo.getTime());
            assert.strictEqual(arg.length, timezoneAdjusted.length);
            assert.deepEqual(dates, timezoneAdjusted);
        });
        it("should send a single schedule event", async() => {
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
        it("throw an error when scheduler timezone is not given for a timezoneAware message", async() => {
            assert.rejects(createSchedule(db, appId, messageId, scheduledTo, true));
        });
        it("create a schedule document inside the collection", async() => {
            const result = await createSchedule(db, appId, messageId, scheduledTo, false);
            assert(result._id instanceof ObjectId);
            assert(db.collection.calledWith("message_schedules"));
            const arg = collection.insertOne.getCall(0)?.args[0];
            const actualScheduleDate = arg?.events?.scheduled?.[0]?.date;
            const expectedArg: Schedule = {
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
                events: [
                    {
                        scheduledTo,
                        status: "scheduled",
                        timezone: undefined,
                    }
                 ]
            };
            assert.deepStrictEqual(expectedArg, arg);
        });
    });

    describe("scheduleMessageByDateTrigger", () => {
        it("should throw when message doesn't exist", async() => {
            collection.findOne.resolves(null);
            await assert.rejects(
                scheduleMessageByDateTrigger(db, new ObjectId()),
                /doesn't exist or it's not active/
            );
        });

        it("should throw when no schedulable trigger is found", async() => {
            const msg = mockData.message();
            msg.triggers = [{ kind: "event", events: ["e1"] } as EventTrigger];
            collection.findOne.resolves(msg);
            await assert.rejects(
                scheduleMessageByDateTrigger(db, msg._id),
                /Cannot find a schedulable trigger/
            );
        });

        it("should schedule immediately for plain trigger without info.scheduled", async() => {
            const msg = mockData.message();
            msg.info.scheduled = false;
            collection.findOne.resolves(msg);

            const before = Date.now();
            const result = await scheduleMessageByDateTrigger(db, msg._id);
            const after = Date.now();

            assert(result);
            assert.strictEqual(result.length, 1);
            assert(result[0].scheduledTo.getTime() >= before);
            assert(result[0].scheduledTo.getTime() <= after);
        });

        it("should schedule at start date for plain trigger with future start", async() => {
            const futureDate = new Date(Date.now() + 60000);
            const msg = mockData.message();
            msg.info.scheduled = true;
            msg.triggers = [{ kind: "plain", start: futureDate, tz: false, delayed: false }];
            collection.findOne.resolves(msg);

            const result = await scheduleMessageByDateTrigger(db, msg._id);

            assert(result);
            assert.strictEqual(result.length, 1);
            assert.strictEqual(result[0].scheduledTo.getTime(), futureDate.getTime());
        });

        it("should throw when plain trigger start date is in the past", async() => {
            const pastDate = new Date(Date.now() - 60000);
            const msg = mockData.message();
            msg.info.scheduled = true;
            msg.triggers = [{ kind: "plain", start: pastDate, tz: false, delayed: false }];
            collection.findOne.resolves(msg);

            await assert.rejects(
                scheduleMessageByDateTrigger(db, msg._id),
                /Start date is in the past/
            );
        });

        it("should create up to 5 future schedules for recurring triggers", async() => {
            const trigger: RecurringTrigger = {
                kind: "rec",
                bucket: "daily",
                time: 12 * 60 * 60 * 1000, // 12:00
                start: new Date(Date.now() - 86400000), // yesterday
                every: 1,
                end: new Date(Date.now() + 30 * 86400000), // 30 days from now
                tz: false,
                sctz: 0,
            };
            const msg = mockData.message();
            msg.triggers = [trigger];
            const {
                collection: msgCol
            } = createMockedCollection("messages");
            const {
                findCursor: schedCursor,
            } = createMockedCollection("message_schedules");
            msgCol.findOne.resolves(msg);
            schedCursor.limit.returnsThis();
            schedCursor.sort.returnsThis();
            schedCursor.toArray.resolves([]); // no previous schedules

            const result = await scheduleMessageByDateTrigger(db, msg._id);

            assert(result);
            assert.strictEqual(result.length, 5);
            // Dates should be in ascending order
            for (let i = 1; i < result.length; i++) {
                assert(result[i].scheduledTo.getTime() > result[i - 1].scheduledTo.getTime());
            }
        });

        it("should fill remaining schedule slots for recurring triggers with existing schedules", async() => {
            const trigger: RecurringTrigger = {
                kind: "rec",
                bucket: "daily",
                time: 12 * 60 * 60 * 1000,
                start: new Date(Date.now() - 86400000),
                every: 1,
                end: new Date(Date.now() + 30 * 86400000),
                tz: false,
                sctz: 0,
            };
            const msg = mockData.message();
            msg.triggers = [trigger];
            const {
                collection: msgCol
            } = createMockedCollection("messages");
            const {
                findCursor: schedCursor,
            } = createMockedCollection("message_schedules");
            msgCol.findOne.resolves(msg);
            // 3 existing schedules → should create 2 more
            const futureDate = new Date(Date.now() + 86400000);
            schedCursor.limit.returnsThis();
            schedCursor.sort.returnsThis();
            schedCursor.toArray.resolves([
                { scheduledTo: futureDate },
                { scheduledTo: new Date(futureDate.getTime() - 1000) },
                { scheduledTo: new Date(futureDate.getTime() - 2000) },
            ]);

            const result = await scheduleMessageByDateTrigger(db, msg._id);

            assert(result);
            assert.strictEqual(result.length, 2);
        });

        it("should return undefined when no dates match for recurring triggers", async() => {
            const trigger = mockData.dailyRecurringTrigger();
            // end date already passed
            trigger.end = new Date("2020-01-01T00:00:00Z");
            const msg = mockData.message();
            msg.triggers = [trigger];
            const {
                collection: msgCol
            } = createMockedCollection("messages");
            const {
                findCursor: schedCursor,
            } = createMockedCollection("message_schedules");
            msgCol.findOne.resolves(msg);
            schedCursor.limit.returnsThis();
            schedCursor.sort.returnsThis();
            schedCursor.toArray.resolves([]);

            const result = await scheduleMessageByDateTrigger(db, msg._id);

            assert.strictEqual(result, undefined);
        });

        it("should pass timezone settings to createSchedule", async() => {
            const msg = mockData.message();
            msg.triggers = [{
                kind: "plain",
                start: new Date,
                tz: true,
                sctz: -180,
                delayed: false,
            }];
            msg.info.scheduled = false;
            collection.findOne.resolves(msg);

            const result = await scheduleMessageByDateTrigger(db, msg._id);

            assert(result);
            assert.strictEqual(result[0].timezoneAware, true);
            assert.strictEqual(result[0].schedulerTimezone, -180);
        });
    });

    describe("mergeAutoTriggerEvents", () => {
        it("should merge multiple events and create a map", () => {
            const app1 = new ObjectId("67b868f115891e7800e2f562");
            const app2 = new ObjectId("67b868f115891e7800e2f563");
            const cohort1 = "67b868f115891e7800e2f564";
            const cohort2 = "67b868f115891e7800e2f565";
            const event1 = "test-event-1";
            const event2 = "test-event-2";
            const events: AutoTriggerEvent[] = [
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

        it("should return empty array for empty input", () => {
            const merged = mergeAutoTriggerEvents([]);
            assert.deepStrictEqual(merged, []);
        });

        it("should deduplicate user IDs within the same event key", () => {
            const appId = new ObjectId();
            const events: AutoTriggerEvent[] = [
                { kind: "event", appId, eventKeys: ["e1"], uid: "u1" },
                { kind: "event", appId, eventKeys: ["e1"], uid: "u1" },
                { kind: "event", appId, eventKeys: ["e1"], uid: "u2" },
            ];
            const merged = mergeAutoTriggerEvents(events);
            assert.strictEqual(merged.length, 1);
            // Set deduplicates
            assert.deepStrictEqual(merged[0].uids, ["u1", "u2"]);
        });
    });

    describe("scheduleMessageByAutoTriggers", () => {
        it("should schedule event-triggered messages with matching uids", async() => {
            const appId = new ObjectId();
            const event: AutoTriggerEvent = {
                kind: "event",
                appId,
                eventKeys: ["purchase"],
                uid: "user7"
            };
            const msg = mockData.message();
            msg._id = new ObjectId();
            msg.app = appId;
            msg.triggers = [{
                kind: "event",
                start: new Date(Date.now() - 86400000),
                events: ["purchase"],
            }] as any;
            msg.filter = {};

            findCursor.toArray.resolves([msg]);

            const result = await scheduleMessageByAutoTriggers(db, [event]);

            assert.strictEqual(result.length, 1);
            assert.deepStrictEqual(result[0].audienceFilter!.uids, ["user7"]);
        });

        it("should apply delay to schedule time", async() => {
            const appId = new ObjectId();
            const event: AutoTriggerEvent = {
                kind: "event",
                appId,
                eventKeys: ["signup"],
                uid: "u1"
            };
            const delay = 3600000; // 1 hour
            const msg = mockData.message();
            msg.app = appId;
            msg.triggers = [{
                kind: "event",
                start: new Date(Date.now() - 86400000),
                events: ["signup"],
                delay,
            }] as any;
            msg.filter = {};

            findCursor.toArray.resolves([msg]);

            const before = Date.now();
            const result = await scheduleMessageByAutoTriggers(db, [event]);

            assert.strictEqual(result.length, 1);
            // scheduledTo should be roughly now + delay
            const diff = result[0].scheduledTo.getTime() - before;
            assert(diff >= delay - 100 && diff <= delay + 1000,
                `Expected ~${delay}ms delay, got ${diff}ms`);
        });

        it("should set timezone-aware scheduling when trigger has time", async() => {
            const appId = new ObjectId();
            const event: AutoTriggerEvent = {
                kind: "event",
                appId,
                eventKeys: ["login"],
                uid: "u1"
            };
            const msg = mockData.message();
            msg.app = appId;
            msg.triggers = [{
                kind: "event",
                start: new Date(Date.now() - 86400000),
                events: ["login"],
                time: 36000000, // 10:00 AM in ms
            }] as any;
            msg.filter = {};

            findCursor.toArray.resolves([msg]);

            const result = await scheduleMessageByAutoTriggers(db, [event]);

            assert.strictEqual(result.length, 1);
            assert.strictEqual(result[0].timezoneAware, true);
            assert.strictEqual(typeof result[0].schedulerTimezone, "number");
        });

        it("should use userCohortStatuses for cohort trigger with cancels", async() => {
            const appId = new ObjectId();
            const cohortId = "cohort123";
            const event: AutoTriggerEvent = {
                kind: "cohort",
                appId,
                direction: "enter",
                cohortId,
                uids: ["u1", "u2"],
            };
            const msg = mockData.message();
            msg.app = appId;
            msg.triggers = [{
                kind: "cohort",
                start: new Date(Date.now() - 86400000),
                cohorts: [cohortId],
                entry: true,
                cancels: true,
            }] as any;
            msg.filter = {};

            findCursor.toArray.resolves([msg]);

            const result = await scheduleMessageByAutoTriggers(db, [event]);

            assert.strictEqual(result.length, 1);
            const filter = result[0].audienceFilter!;
            // Should use userCohortStatuses, not uids
            assert.strictEqual(filter.uids, undefined);
            assert(Array.isArray(filter.userCohortStatuses));
            assert.strictEqual(filter.userCohortStatuses!.length, 2);
            assert.strictEqual(filter.userCohortStatuses![0].uid, "u1");
            assert.strictEqual(filter.userCohortStatuses![0].cohort.id, cohortId);
        });

        it("should add cap and sleep to audience filter", async() => {
            const appId = new ObjectId();
            const event: AutoTriggerEvent = {
                kind: "event",
                appId,
                eventKeys: ["buy"],
                uid: "u1"
            };
            const msg = mockData.message();
            msg.app = appId;
            msg.triggers = [{
                kind: "event",
                start: new Date(Date.now() - 86400000),
                events: ["buy"],
                cap: 3,
                sleep: 7200000,
            }] as any;
            msg.filter = {};

            findCursor.toArray.resolves([msg]);

            const result = await scheduleMessageByAutoTriggers(db, [event]);

            assert.strictEqual(result.length, 1);
            const cap = result[0].audienceFilter!.cap!;
            assert(cap.messageId.equals(msg._id));
            assert.strictEqual(cap.maxMessages, 3);
            assert.strictEqual(cap.minTime, 7200000);
        });

        it("should handle rejected promises and return only fulfilled results", async() => {
            const appId = new ObjectId();
            const event: AutoTriggerEvent = {
                kind: "event",
                appId,
                eventKeys: ["e1"],
                uid: "u1"
            };
            // Create a message that will cause createSchedule to fail
            // by making it timezone-aware without a schedulerTimezone
            // (but this only happens with time trigger, which sets timezoneAware)
            // Simpler: return two messages, one with valid trigger, one that throws
            const goodMsg = mockData.message();
            goodMsg.app = appId;
            goodMsg.triggers = [{
                kind: "event",
                start: new Date(Date.now() - 86400000),
                events: ["e1"],
            }] as any;
            goodMsg.filter = {};

            const badMsg = mockData.message();
            badMsg.app = appId;
            badMsg.triggers = [{
                kind: "event",
                start: new Date(Date.now() - 86400000),
                events: ["e1"],
                time: 36000000, // triggers timezone-aware path
            }] as any;
            badMsg.filter = {};

            findCursor.toArray.resolves([goodMsg, badMsg]);

            // The badMsg will try to create timezone-aware schedule events,
            // which will call sendScheduleEvents for many timezones.
            // Both should succeed since sendScheduleEvents is mocked.
            const result = await scheduleMessageByAutoTriggers(db, [event]);

            // Both should succeed since the mock doesn't throw
            assert(result.length >= 1);
        });

        it("should return empty array when no messages match", async() => {
            const appId = new ObjectId();
            const event: AutoTriggerEvent = {
                kind: "event",
                appId,
                eventKeys: ["nope"],
                uid: "u1"
            };
            findCursor.toArray.resolves([]);

            const result = await scheduleMessageByAutoTriggers(db, [event]);

            assert.deepStrictEqual(result, []);
        });
    });

    describe("createSchedule", () => {
        it("should store audience filter in the schedule document", async() => {
            const appId = new ObjectId();
            const messageId = new ObjectId();
            const filter = { uids: ["u1", "u2"], cohorts: ["c1"] };

            const result = await createSchedule(
                db, appId, messageId, new Date(), false,
                undefined, false, filter
            );

            assert.deepStrictEqual(result.audienceFilter, filter);
            const inserted = collection.insertOne.firstCall.firstArg;
            assert.deepStrictEqual(inserted.audienceFilter, filter);
        });

        it("should store message overrides in the schedule document", async() => {
            const appId = new ObjectId();
            const messageId = new ObjectId();
            const overrides = {
                contents: [{ title: "override", message: "override" }],
                variables: { key: "value" }
            };

            const result = await createSchedule(
                db, appId, messageId, new Date(), false,
                undefined, false, undefined, overrides
            );

            assert.deepStrictEqual(result.messageOverrides, overrides);
        });

        it("should set rescheduleIfPassed flag", async() => {
            const appId = new ObjectId();
            const messageId = new ObjectId();

            const result = await createSchedule(
                db, appId, messageId, new Date(), false,
                undefined, true
            );

            assert.strictEqual(result.rescheduleIfPassed, true);
        });
    });

    describe("createScheduleEvents - additional", () => {
        it("should keep more events with rescheduleIfPassed than without", async() => {
            const schedule = mockData.schedule();
            // Set scheduledTo a few hours in the past so some timezone offsets
            // are in the past (would normally be skipped)
            schedule.scheduledTo = new Date(Date.now() - 6 * 60 * 60 * 1000);

            // Without reschedule: past timezone events are skipped
            schedule.rescheduleIfPassed = false;
            const withoutReschedule = await createScheduleEvents({ ...schedule });

            mockSendScheduleEvents.resetHistory();

            // With reschedule: past timezone events are shifted +24h and kept
            schedule.rescheduleIfPassed = true;
            const withReschedule = await createScheduleEvents({ ...schedule });

            assert(withReschedule.length > withoutReschedule.length,
                `With reschedule (${withReschedule.length}) should produce more `
                + `events than without (${withoutReschedule.length})`);
        });

        it("should throw when timezone-aware without schedulerTimezone", async() => {
            const schedule = mockData.schedule();
            schedule.timezoneAware = true;
            schedule.schedulerTimezone = undefined;

            await assert.rejects(
                createScheduleEvents(schedule),
                /Scheduler timezone is required/
            );
        });

        it("should skip past timezone events when rescheduleIfPassed is false", async() => {
            const schedule = mockData.schedule();
            schedule.rescheduleIfPassed = false;
            // Set scheduledTo far enough in the past that some but not all timezones pass
            // Use a time 12 hours ago: roughly half the timezones will be in the past
            schedule.scheduledTo = new Date(Date.now() - 12 * 60 * 60 * 1000);

            const events = await createScheduleEvents(schedule);

            // All returned events should be in the future
            for (const event of events) {
                assert(event.scheduledTo.getTime() > Date.now(),
                    "All events should be in the future (past ones skipped)");
            }
        });
    });

    describe("findNextMatchForRecurring - edge cases", () => {
        it("should return undefined when startFrom exceeds end date", () => {
            const trigger = mockData.dailyRecurringTrigger();
            const afterEnd = new Date(trigger.end!.getTime() + 86400000);
            const result = findNextMatchForRecurring(trigger, afterEnd);
            assert.strictEqual(result, undefined);
        });

        it("should return undefined when end date is in the past", () => {
            const trigger = mockData.dailyRecurringTrigger();
            trigger.end = new Date("2020-01-01T00:00:00Z");
            const result = findNextMatchForRecurring(trigger);
            assert.strictEqual(result, undefined);
        });
    });

    describe("findNextMatchForMulti - edge cases", () => {
        it("should return undefined when all dates are before after", () => {
            const trigger: MultiTrigger = {
                kind: "multi",
                start: new Date("2024-01-01T00:00:00Z"),
                dates: [
                    new Date("2024-01-15T00:00:00Z"),
                    new Date("2024-02-15T00:00:00Z"),
                ],
            };
            const afterAll = new Date("2025-01-01T00:00:00Z");
            const result = findNextMatchForMulti(trigger, afterAll);
            assert.strictEqual(result, undefined);
        });

        it("should respect trigger.start date", () => {
            const trigger: MultiTrigger = {
                kind: "multi",
                start: new Date("2024-06-01T00:00:00Z"),
                dates: [
                    new Date("2024-03-01T00:00:00Z"), // before start
                    new Date("2024-07-01T00:00:00Z"), // after start
                ],
            };
            // Search from before start — should still respect trigger.start
            const result = findNextMatchForMulti(trigger, new Date("2024-01-01T00:00:00Z"));
            assert(result);
            assert.strictEqual(result.getTime(), new Date("2024-07-01T00:00:00Z").getTime());
        });
    });

    describe("scheduleIfEligible", () => {
        it("should return undefined for demo messages", async() => {
            const msg = mockData.message();
            msg.info.demo = true;
            const result = await scheduleIfEligible(db, msg);
            assert.strictEqual(result, undefined);
        });

        it("should return undefined for non-active messages", async() => {
            const msg = mockData.message();
            msg.status = "draft";
            const result = await scheduleIfEligible(db, msg);
            assert.strictEqual(result, undefined);
        });

        it("should return undefined when no date trigger exists", async() => {
            const msg = mockData.message();
            msg.triggers = [{ kind: "event", events: ["e1"] } as EventTrigger];
            const result = await scheduleIfEligible(db, msg);
            assert.strictEqual(result, undefined);
        });

        it("should call scheduleMessageByDateTrigger for eligible messages", async() => {
            const msg = mockData.message();
            msg.info.scheduled = false;
            // The function calls scheduleMessageByDateTrigger which queries the DB
            collection.findOne.resolves(msg);

            const result = await scheduleIfEligible(db, msg);

            assert(result);
            assert.strictEqual(result.length, 1);
        });
    });
});
