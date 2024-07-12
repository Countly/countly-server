const assert = require("assert");
/**
 * @typedef {import("../../../api/new/types/message.js").MultiTrigger} MultiTrigger
 */

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