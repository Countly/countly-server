const assert = require("assert");
/**
 * @typedef {import("../../api/new/types/message.js").RecurringTrigger} RecurringTrigger
 * @typedef {import("../../api/new/types/message.js").MultiTrigger} MultiTrigger
 */

const {
    tzOffsetAdjustedTime,
    findNextMatchForRecurring,
} = require("../../api/new/scheduler.js");

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


    describe("find matching dates for daily recurring trigger", () => {
        /** @type {() => RecurringTrigger} */
        const trigger = () => ({
            kind: "rec",
            bucket: "daily",
            time: 53100000, // 14:45
            start: new Date("2024-02-01T09:00:00.000+03:00"),
            every: 5,
            end: new Date("2024-03-09T08:00:00.000+03:00"),
            tz: true,
            sctz: -180,
        });
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
        it("should find exactly " + matches.length + " matching trigger dates from the start", () => {
            /** @type {Date|undefined} */
            let nextDate;
            let i = 0;
            while (nextDate = findNextMatchForRecurring(trigger(), nextDate ? new Date(nextDate.getTime() + 1) : now)) {
                assert.equal(nextDate.getTime(), matches[i].getTime());
                i++;
                if (i > 100) break;
            }
            assert.equal(i, matches.length);
        });
        it("should find the correct matching date when it starts searching from middle", () => {
            const now = new Date("2024-02-13T11:15:00+03:00");
            const expected = new Date("2024-02-16T14:45:00+03:00");
            const nextMatch = findNextMatchForRecurring(trigger(), now);
            assert(nextMatch instanceof Date);
            assert.equal(nextMatch.getTime(), expected.getTime());
        });
    });

    describe("find matching dates for weekly recurring trigger", () => {
        /** @type {() => RecurringTrigger} */
        const trigger = () => ({
            kind: "rec",
            bucket: "weekly",
            time: 53100000, // 14:45
            start: new Date("2024-02-01T09:00:00.000+03:00"),
            tz: true,
            sctz: -180,
            every: 2,
            end: new Date("2024-03-15T09:00:00.000+03:00"),
            on: [2, 4, 5] // on monday, thursday, friday,
        });
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
        it("should find exactly " + matches.length + " matching trigger dates", () => {
            /** @type {Date|undefined} */
            let nextDate;
            let i = 0;
            while (nextDate = findNextMatchForRecurring(trigger(), nextDate ? new Date(nextDate.getTime() + 1) : now)) {
                assert.equal(nextDate.getTime(), matches[i].getTime());
                i++;
                if (i > 100) break;
            }
            assert.equal(i, matches.length);
        });
    });
    describe("find matching dates for monthly recurring trigger", () => {
        /** @type {() => RecurringTrigger} */
        const trigger = () => ({
            kind: "rec",
            bucket: "monthly",
            time: 53100000, // 14:45
            tz: true,
            sctz: -180,
            start: new Date("2024-02-01T09:00:00.000+03:00"),
            every: 3,
            end: new Date("2024-09-15T09:00:00.000+03:00"),
            on: [3, -1, 0, 20] // 0: last day of the month, -1: previous day of the last day
        });
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
        it("should find exactly " + matches.length + " matching trigger dates", () => {
            /** @type {Date|undefined} */
            let nextDate;
            let i = 0;
            while (nextDate = findNextMatchForRecurring(trigger(), nextDate ? new Date(nextDate.getTime() + 1) : now)) {
                assert.equal(nextDate.getTime(), matches[i].getTime());
                i++;
                if (i > 100) break;
            }
            assert.equal(i, matches.length);
        });
    });
});



// since mocha is in the root package.json, vscode doesn't recognize
// test suite functions without importing mocha
const mocha = require("mocha");

const {
    findNextMatchForMulti,
} = require("../../../api/new/scheduling.js");

describe("scheduling messages being sent on multiple days", () => {
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

    describe("find all matching dates", () => {
        const now = new Date("2024-01-10T00:00:00+03:00");
        /** @type {() => MultiTrigger} */
        const trigger = () => ({
            kind: "multi",
            start: new Date("2024-07-10T00:00:00.000Z"),
            dates,
        });
        it("should find exactly " + dates.length + " matching trigger dates", () => {
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
    });

    describe("should find the dates only after 'now'", () => {
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
        it("should find exactly " + filtered.length + " matching trigger dates", () => {
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
});