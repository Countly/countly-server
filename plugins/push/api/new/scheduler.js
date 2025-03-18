/**
 * @typedef {import('./types/message.ts').Message} Message
 * @typedef {import('./types/message.ts').RecurringTrigger} RecurringTrigger
 * @typedef {import('./types/message.ts').MultiTrigger} MultiTrigger
 * @typedef {import('./types/schedule.ts').Schedule} Schedule
 * @typedef {import('./types/queue.ts').ScheduleEvent} ScheduleEvent
 * @typedef {import("mongodb").Db} Db
 * @typedef {import('./types/utils.ts').LogObject} LogObject
 */

const { ObjectId } = require('mongodb');
const queue = require("./lib/kafka.js"); // do not import by destructuring; it's being mocked in the tests
const moment = require("moment");
const allTZOffsets = require("./constants/all-tz-offsets.json");
const { buildResultObject } = require('./lib/result.js');
const schedulableTriggers = ["plain", "rec", "multi"];
/** @type {LogObject} */
const log = require('../../../../api/utils/common').log('push:scheduler');

/**
 * Schedules the provided message to be sent on the next calculated date,
 * determined by the message's triggering properties
 * @param   {Db}                 db      - mongodb database object
 * @param   {Message}            message - message document from messages collection
 * @returns {Promise<Schedule|undefined>} the created Schedule document from message_schedules collection
 */
async function scheduleMessage(db, message) {
    const trigger = message.triggers
        .find(trigger => schedulableTriggers.includes(trigger.kind));
    if (!trigger) {
        throw new Error(
            "Cannot find a schedulable trigger for the message " + message._id
        );
    }

    /** @type {Date|undefined} */
    let scheduleTo;
    let startFrom = await findWhereToStartSearchFrom(db, message._id, trigger.kind);

    switch(trigger.kind) {
    case "plain":
        if (!message?.info?.scheduled) {
            scheduleTo = new Date;
        }
        else if (trigger.start.getTime() > startFrom.getTime()) {
            scheduleTo = trigger.start;
        }
        break;
    case "rec":
        scheduleTo = findNextMatchForRecurring(
            /** @type {RecurringTrigger} */(trigger),
            startFrom
        );
        break;
    case "multi":
        scheduleTo = findNextMatchForMulti(
            /** @type {MultiTrigger} */(trigger),
            startFrom
        );
        break;
    }

    // couldn't find a matching date
    if (!scheduleTo) {
        log.w("Couldn't find a matchin trigger for the message", message._id);
        return;
    }

    return await createSchedule(
        db,
        message.app,
        message._id,
        scheduleTo,
        "tz" in trigger && trigger.tz ? trigger.tz : false,
        "sctz" in trigger ? trigger.sctz : undefined
    );
}
/**
 *
 * @param {Db}       db                - mongodb database object
 * @param {ObjectId} appId             - ObjectId of the app
 * @param {ObjectId} messageId         - ObjectId of the message
 * @param {Date}     scheduledTo       - Date to schedule this message to. UTC user's schedule date when timezone aware
 * @param {Boolean}  timezoneAware     - set true if this is going to be scheduled for each timezone
 * @param {Number=}  schedulerTimezone - timezone of the scheduler
 * @returns {Promise<Schedule>} created Schedule document from message_schedules collection
 */
async function createSchedule(
    db,
    appId,
    messageId,
    scheduledTo,
    timezoneAware,
    schedulerTimezone
) {
    if (timezoneAware && typeof schedulerTimezone !== "number") {
        throw new Error("Scheduler timezone is required when a "
            + "message schedule is timezone aware");
    }
    /** @type {Schedule} */
    const messageSchedule = {
        _id: new ObjectId,
        appId,
        messageId,
        scheduledTo,
        status: "scheduled",
        timezoneAware,
        schedulerTimezone,
        result: buildResultObject()
    };
    await db.collection("message_schedules").insertOne(messageSchedule);
    await createScheduleEvents(messageSchedule);
    return messageSchedule;
}
/**
 *
 * @param {Schedule} messageSchedule
 * @returns {Promise<ScheduleEvent[]>}
 */
async function createScheduleEvents(messageSchedule) {
    /** @type {ScheduleEvent[]} */
    const events = [];
    if (messageSchedule.timezoneAware) {
        if (typeof messageSchedule.schedulerTimezone !== "number") {
            throw new Error("Scheduler timezone is required when a "
                + "message schedule is timezone aware");
        }
        const minute = 60 * 1000;
        const { scheduledTo, schedulerTimezone } = messageSchedule;
        const utcTime = new Date(
            scheduledTo.getTime() - schedulerTimezone * minute
        );
        for (let i = 0; i < allTZOffsets.length; i++) {
            const offset = allTZOffsets[i].offset;
            const tzAdjustedScheduleDate = new Date(
                utcTime.getTime() + offset * minute
            );
            events.push({
                appId: messageSchedule.appId,
                messageId: messageSchedule.messageId,
                scheduleId: messageSchedule._id,
                scheduledTo: tzAdjustedScheduleDate,
                timezone: String(offset),
            });
        }
    }
    else {
        events.push({
            appId: messageSchedule.appId,
            messageId: messageSchedule.messageId,
            scheduleId: messageSchedule._id,
            scheduledTo: messageSchedule.scheduledTo,
        });
    }
    // schedule all events
    await Promise.all(events.map(queue.sendScheduleEvent));
    return events;
}
/**
 *
 * @param {Date} date
 * @param {number} offset
 * @param {number} time
 * @returns {Date}
 */
function tzOffsetAdjustedTime(date, offset, time) {
    return moment.utc(date.getTime())
        .subtract(offset, "minutes")
        .minutes(0).hours(0).seconds(0).millisecond(0)
        .add(time, "milliseconds")
        .add(offset, "minutes")
        .toDate();
}

/**
 * @param {Db} db
 * @param {ObjectId} messageId
 * @param {string} triggerKind
 * @returns {Promise<Date>}
 */
async function findWhereToStartSearchFrom(db, messageId, triggerKind) {
    let startFrom = new Date;
    // find the last schedule date if this trigger is recurring or multi
    if (["rec", "multi"].includes(triggerKind)) {
        const lastSchedule = /** @type {Schedule[]} */(
            await db.collection("message_schedules")
                .find({ messageId })
                .limit(1)
                .sort({ scheduledTo: -1 })
                .toArray()
        );
        if (lastSchedule.length) {
            if (lastSchedule[0].scheduledTo.getTime() > startFrom.getTime()) {
                startFrom = lastSchedule[0].scheduledTo;
            }
        }
    }
    return startFrom;
}

/**
 *
 * @param {RecurringTrigger} trigger
 * @param {Date=} startFrom
 * @returns {Date=}
 */
function findNextMatchForRecurring(trigger, startFrom = new Date) {
    // to prevent mutation:
    const onDates = trigger.on ? [...trigger.on] : [];
    // to put negative values to the end
    onDates.sort((i, j) => (i < 1 ? i + 100 : i) - (j < 1 ? j + 100 : j))

    /**
     * checks if the given date is exceeding trigger.end
     * @param {Date} date
     * @returns {Boolean}
     */
    const exceeds = date => trigger.end
        ? date.getTime() >= trigger.end.getTime()
        : false;

    // check if startFrom is already exceeding the end date
    if (exceeds(startFrom)) {
        return;
    }

    // check if we can schedule to the same date as trigger.start
    // considering scheduler's timezone might not be the same with server's
    let current = tzOffsetAdjustedTime(
        trigger.start,
        trigger.sctz,
        trigger.time
    );
    if (current.getTime() < trigger.start.getTime()) {
        current = moment(current).add(1, "day").toDate();
    }

    let i = 0;
    while (true) {
        if (trigger.bucket === "daily") {
            if (current.getTime() >= startFrom.getTime()) {
                if (exceeds(current)) {
                    return;
                }
                return current;
            }
            // skip the days defined by the rule
            current = moment(current).add(trigger.every, "days").toDate();
        }
        else {
            const curMoment = moment(current).utcOffset(-1 * trigger.sctz);

            if (trigger.bucket === "weekly") {
                const found = onDates
                    .map(dateIndex => curMoment.isoWeekday(dateIndex).toDate())
                    .filter(date => date.getTime() >= current.getTime())
                    .find(date => date.getTime() >= startFrom.getTime());
                if (found) {
                    if (exceeds(found)) {
                        return;
                    }
                    return found;
                }
                // skip the weeks
                current = curMoment
                    .isoWeekday(1)
                    .add(trigger.every, "week")
                    .toDate();
            }
            else if (trigger.bucket === "monthly") {
                const found = onDates
                    .map(
                        i => curMoment.add(i < 1 ? 1 : 0, "month")
                            .date(i)
                            .toDate()
                    )
                    .filter(date => date.getTime() >= current.getTime())
                    .find(date => date.getTime() >= startFrom.getTime());
                if (found) {
                    if (exceeds(found)) {
                        return;
                    }
                    return found;
                }
                // skip the months
                current = curMoment
                    .date(1)
                    .add(trigger.every, "month")
                    .toDate();
            }
        }
        // just in case:
        if (++i > 100_000) {
            throw new Error("Next date couldn't be found");
        }
    }
}

/**
 *
 * @param {MultiTrigger} trigger
 * @param {Date=} after
 * @returns {Date=}
 */
function findNextMatchForMulti(trigger, after = new Date) {
    // avoid mutation. sort the dates
    const dates = trigger.dates.map(d => new Date(d.getTime()));
    dates.sort((i, j) => i.getTime() - j.getTime());
    const startIncludedAfter = new Date(
        Math.max(trigger.start.getTime(), after.getTime())
    );

    for (let date of dates) {
        if (date.getTime() >= startIncludedAfter.getTime()) {
            return date;
        }
    }
}

module.exports = {
    scheduleMessage,
    createScheduleEvents,
    createSchedule,
    tzOffsetAdjustedTime,
    findNextMatchForRecurring,
    findNextMatchForMulti,
    findWhereToStartSearchFrom,
};