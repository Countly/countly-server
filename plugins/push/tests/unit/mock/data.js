/**
 * @typedef {import("../../../api/new/types/message.ts").Message} Message
 * @typedef {import("../../../api/new/types/message.ts").RecurringTrigger} RecurringTrigger
 * @typedef {import("../../../api/new/types/message.ts").PlainTrigger} PlainTrigger
 * @typedef {import("../../../api/new/types/schedule.ts").Schedule} Schedule
 */
const { ObjectId } = require("mongodb");

module.exports = {
    /**
     * @returns {Schedule}
     */
    schedule: () => ({
        _id: new ObjectId,
        appId: new ObjectId,
        messageId: new ObjectId,
        scheduledTo: new Date,
        timezoneAware: true,
        schedulerTimezone: 180,
        status: "scheduled"
    }),
    /**
     * @returns {PlainTrigger}
     */
    plainTrigger: () => ({
        kind: "plain",
        start: new Date,
    }),
    /**
     * @returns {RecurringTrigger}
     */
    dailyRecurringTrigger: () => ({
        kind: "rec",
        bucket: "daily",
        time: 53100000, // 14:45
        start: new Date("2024-02-01T09:00:00.000+03:00"),
        every: 5,
        end: new Date("2024-03-09T08:00:00.000+03:00"),
        tz: true,
        sctz: -180,
    }),
    /**
     * @returns {RecurringTrigger}
     */
    weeklyRecurringTrigger: () => ({
        kind: "rec",
        bucket: "weekly",
        time: 53100000, // 14:45
        start: new Date("2024-02-01T09:00:00.000+03:00"),
        tz: true,
        sctz: -180,
        every: 2,
        end: new Date("2024-03-15T09:00:00.000+03:00"),
        on: [2, 4, 5] // on monday, thursday, friday,
    }),
    /**
     * @returns {RecurringTrigger}
     */
    monthlyRecurringTrigger: () => ({
        kind: "rec",
        bucket: "monthly",
        time: 53100000, // 14:45
        tz: true,
        sctz: -180,
        start: new Date("2024-02-01T09:00:00.000+03:00"),
        every: 3,
        end: new Date("2024-09-15T09:00:00.000+03:00"),
        on: [3, -1, 0, 20] // 0: last day of the month, -1: previous day of the last day
    }),
    /**
     * @returns {Message}
     */
    message: () => ({
        _id: new ObjectId,
        app: new ObjectId,
        platforms: ["a"],
        state: 1,
        status: "created",
        triggers: [

        ],
        contents: [

        ],
        result: {
            total: 0,
            processed: 0,
            sent: 0,
            actioned: 0,
        },
        info: {

        }
    })
}
