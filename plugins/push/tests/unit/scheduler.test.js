/**
 * @typedef {import("../../api/new/types/message.js").RecurringTrigger} RecurringTrigger
 * @typedef {import("../../api/new/types/message.js").MultiTrigger} MultiTrigger
 * @typedef {import("../../api/new/types/message.js").EventTrigger} EventTrigger
 * @typedef {import("../../api/new/types/schedule.js").Schedule} Schedule
 * @typedef {import("mongodb").Collection} Collection
 * @typedef {import("mongodb").Db} Db
 * @typedef {import("mongodb").FindCursor} FindCursor
 */
const assert = require("assert");
const { describe, it } = require("mocha");
const { ObjectId } = require("mongodb");
const sinon = require("sinon");
const {
    tzOffsetAdjustedTime,
    findNextMatchForRecurring,
    findNextMatchForMulti,
    createScheduleEvents,
    createSchedule,
    scheduleMessage,
    findWhereToStartSearchFrom
} = require("../../api/new/scheduler.js");
const queue = require("../../api/new/lib/kafka.js");
const { mockMongoDb } = require("./mock/mongo.js");
const timezones = require("../../api/new/constants/all-tz-offsets.json");
const mockData = require("./mock/data.js");
const { buildResultObject } = require("../../api/new/lib/result.js");

describe("Scheduler", () => {
    /** @type {sinon.SinonStub} */
    let mockSendScheduleEvent;
    /** @type {sinon.SinonStubbedInstance<FindCursor>} */
    let findCursor;
    /** @type {sinon.SinonStubbedInstance<Collection>} */
    let collection;
    /** @type {sinon.SinonStubbedInstance<Db>} */
    let db;
    /** @type {sinon.SinonSandbox} */
    let mongoSandbox;

    before(() => {
        mockSendScheduleEvent = sinon.stub(queue, "sendScheduleEvent");
        ({ findCursor, collection, db, mongoSandbox } = mockMongoDb());
    });

    beforeEach(() => {
        mockSendScheduleEvent.resetHistory();
        mongoSandbox.resetHistory();
    });
    after(() => {
        mockSendScheduleEvent.restore()
        mongoSandbox.restore();
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

    describe("Start date search", () => {
        const messageId = new ObjectId;
        it("should return Date.now when the message trigger is plain kind", async () => {
            const before = Date.now();
            const result = await findWhereToStartSearchFrom(
                db,
                messageId,
                mockData.plainTrigger().kind
            );
            assert(before <= result.getTime());
            assert(Date.now() >= result.getTime());
            assert(db.collection.notCalled);
        });
        it("should return Date.now when the message is being scheduled for the first time", async () => {
            findCursor.toArray.resolves([]);
            const before = Date.now();
            const result = await findWhereToStartSearchFrom(
                db,
                messageId,
                mockData.dailyRecurringTrigger().kind
            );
            assert(before <= result.getTime());
            assert(Date.now() >= result.getTime());
            assert(db.collection.calledWith("message_schedules"));
            assert(collection.find.calledWith({ messageId }));
            assert(findCursor.limit.calledWith(1));
            assert(findCursor.sort.calledWith({ scheduledTo: -1 }));
            assert(findCursor.toArray.called);
            findCursor.toArray.reset();
        });
        it("should return Date.now when the message's last schedule was before Date.now", async () => {
            const scheduledTo = new Date(Date.now() - 1000);
            const before = Date.now();
            findCursor.toArray.resolves([ { scheduledTo } ]);
            const result = await findWhereToStartSearchFrom(
                db,
                messageId,
                mockData.dailyRecurringTrigger().kind
            );
            assert(before <= result.getTime());
            assert(Date.now() >= result.getTime());
            assert(db.collection.calledWith("message_schedules"));
            assert(collection.find.calledWith({ messageId }));
            assert(findCursor.limit.calledWith(1));
            assert(findCursor.sort.calledWith({ scheduledTo: -1 }));
            assert(findCursor.toArray.called);
            findCursor.toArray.reset();
        });
        it("should return the last schedule date from database when it was already scheduled for a future date", async () => {
            const scheduledTo = new Date(Date.now() + 1000);
            findCursor.toArray.resolves([ { scheduledTo } ]);
            const result = await findWhereToStartSearchFrom(
                db,
                messageId,
                mockData.dailyRecurringTrigger().kind
            );
            assert(scheduledTo.getTime() === result.getTime());
            assert(db.collection.calledWith("message_schedules"));
            assert(collection.find.calledWith({ messageId }));
            assert(findCursor.limit.calledWith(1));
            assert(findCursor.sort.calledWith({ scheduledTo: -1 }));
            assert(findCursor.toArray.called);
            findCursor.toArray.reset();
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
        /** @type {Schedule} */
        const schedule = mockData.schedule();

        it("should send a schedule event for each timezone with correct date", async () => {
            if (schedule.schedulerTimezone === undefined) {
                throw new Error("Scheduler timezone is required");
            }
            const minute = 60 * 1000;
            const utcTime = schedule.scheduledTo.getTime() - schedule.schedulerTimezone * minute;
            const timezoneAdjusted = timezones.map(({ offset }) => utcTime + offset * minute);
            await createScheduleEvents(schedule);
            const dates = mockSendScheduleEvent.args.map((args) => args[0].scheduledTo.getTime());
            assert(mockSendScheduleEvent.callCount === timezoneAdjusted.length);
            assert.deepEqual(dates, timezoneAdjusted);
        });
        it("should send a single schedule event", async () => {
            await createScheduleEvents({ ...schedule, timezoneAware: false });
            assert(mockSendScheduleEvent.callCount === 1);
            assert(
                mockSendScheduleEvent.calledWith({
                    appId: schedule.appId,
                    messageId: schedule.messageId,
                    scheduleId: schedule._id,
                    scheduledTo: schedule.scheduledTo,
                })
            );
        });
    });

    describe("Schedule document creation", () => {
        const appId = new ObjectId;
        const messageId = new ObjectId;
        const scheduledTo = new Date;
        it("should throw an error when scheduler timezone is not passed for timezoneAware message", async () => {
            assert.rejects(createSchedule(db, appId, messageId, scheduledTo, true));
        });
        it("should create a schedule document inside the collection", async () => {
            const result = await createSchedule(db, appId, messageId, scheduledTo, false);
            assert(result._id instanceof ObjectId);
            assert(db.collection.calledWith("message_schedules"));
            assert(collection.insertOne.calledWith({
                _id: result._id,
                appId,
                messageId,
                scheduledTo,
                status: "scheduled",
                timezoneAware: false,
                schedulerTimezone: undefined,
                result: buildResultObject()
            }));
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
            assert.rejects(scheduleMessage(db, mockMessage));
        });
    });
});