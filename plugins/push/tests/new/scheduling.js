const assert = require("assert");
/**
 * @typedef {import("../../api/new/types/message.js").RecurringTrigger} RecurringTrigger
 */

// since mocha is in the root package.json, vscode doesn't recognize
// test suite functions without importing mocha
const mocha = require("mocha"); 

const {
    tzOffsetAdjustedTime,
    findNextMatchForRecurring,
} = require("../../api/new/scheduling.js");

describe("scheduling recurring messages", () => {
    describe("calculate date/time with timezone offset", () => {
        it("should calculate the date object for the given time in given timezone when input date is in different timezone", () => {
            const result = tzOffsetAdjustedTime(
                new Date("2024-01-01T23:15:00.000+02:00"),
                -60, // CET +01:00
                13.5 * 60 * 60 * 1000 // 13:30
            );
            assert.equal(result.getTime(), (new Date("2024-01-01T13:30:00.000+01:00")).getTime());
        });
        it("should calculate the date object for the given time when the input date is in the same timezone", () => {
            const result = tzOffsetAdjustedTime(
                new Date("2024-03-01T13:15:00.000+03:00"),
                -180, // +03:00
                13.5 * 60 * 60 * 1000 // 13:30
            );
            assert.equal(result.getTime(), (new Date("2024-03-01T13:30:00.000+03:00")).getTime());
        });
    });

    describe("find matching dates for daily recurring trigger", () => {
        /** @type {() => RecurringTrigger} */
        const trigger = () => ({
            kind: "rec",
            bucket: "daily",
            time: 53100000, // 14:45
            sctz: -180,
            start: new Date("2024-02-01T09:00:00.000+03:00"),
            every: 5,
            end: new Date("2024-03-09T08:00:00.000+03:00"),
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
            sctz: -180,
            start: new Date("2024-02-01T09:00:00.000+03:00"),
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