/**
 * @typedef {import('./types/message.ts').Message} Message
 * @typedef {import('./types/message.ts').PlainTrigger} PlainTrigger
 * @typedef {import('./types/message.ts').RecurringTrigger} RecurringTrigger
 * @typedef {import('./types/message.ts').MultiTrigger} MultiTrigger
 * @typedef {import('./types/schedule.ts').MessageSchedule} MessageSchedule
 * @typedef {import('./types/queue.ts').JobTicket} JobTicket
 * @typedef {import("mongodb").Db} MongoDb
 */

const common = require('../../../../api/utils/common');
const { ObjectId } = require('mongodb');
const { sendJobTicket } = require("./queue/kafka.js");
const moment = require("moment");

/** @type {MongoDb} */
const db = common.db;

const allTZOffsets = require("./constants/all-tz-offsets.json");
const schedulableTriggerKinds = ["plain", "rec", "multi"];
/**
 * 
 * @param {Message} message 
 */
async function scheduleMessage(message) {
    const triggers = message.triggers
        .filter(trigger => schedulableTriggerKinds.includes(trigger.kind));
    const now = new Date();

    for (let i = 0; i < triggers.length; i++) {
        const trigger = triggers[i];

        /** @type {Date|undefined} */
        let scheduleTo;
        /** @type {Date|undefined} */
        let lastScheduleDate;

        // find the last schedule date if this trigger is recurring or multi
        if (["rec", "multi"].includes(trigger.kind)) {
            const lastSchedule = await db.collection("message_schedules").find({
                messageId: message._id,
            }).limit(1).sort({ scheduledTo: -1 }).toArray();
            console.log(lastSchedule);
            lastScheduleDate = lastSchedule?.[0].scheduledTo;
        }

        switch(trigger.kind) {
        case "plain":
            scheduleTo = trigger.start;
            break;

        case "rec":
            scheduleTo = findNextMatchForRecurring(
                /** @type {RecurringTrigger} */(trigger),
                new Date(Math.max(lastScheduleDate?.getTime() || 0, now.getTime()))
            );
            break;

        case "multi":
            scheduleTo = findNextMatchForMulti(
                /** @type {MultiTrigger} */(trigger),
                new Date(Math.max(lastScheduleDate?.getTime() || 0, now.getTime())))
            break;
        }

        if (!scheduleTo) {
            continue;
        }
        console.log(scheduleTo);
        if ("tz" in trigger && trigger.tz) {
            if (typeof trigger.sctz !== "number") {
                throw new Error("Scheduler timezone is required when a "
                    + "message schedule is timezone aware");
            }
            scheduleTo = new Date(scheduleTo.getTime() - trigger.sctz * 60 * 1000);
            await createSchedule(message.app, message._id, scheduleTo, true);
            continue;
        }

        await createSchedule(message.app, message._id, scheduleTo);
    }
}
/**
 * 
 * @param {Date} date
 * @param {number} offset
 * @param {number} time
 * @return {Date}
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
 * 
 * @param {RecurringTrigger} trigger
 * @param {Date=} after
 * @return {Date=}
 */
function findNextMatchForRecurring(trigger, after = new Date) {
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

    // check if after is already exceeding the end date
    if (exceeds(after)) {
        return;
    }

    // check if we can schedule to the same date as trigger.start
    // considering scheduler's timezone might not be the same with server's
    let current = tzOffsetAdjustedTime(trigger.start, trigger.sctz, trigger.time);
    if (current.getTime() < trigger.start.getTime()) {
        current = moment(current).add(1, "day").toDate();
    }

    let i = 0;
    while (true) {
        if (trigger.bucket === "daily") {
            if (current.getTime() >= after.getTime()) {
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
                    .find(date => date.getTime() >= after.getTime());
                if (found) {
                    if (exceeds(found)) {
                        return;
                    }
                    return found;
                }
                // skip the weeks
                current = curMoment.isoWeekday(1).add(trigger.every, "week").toDate();
            }
            else if (trigger.bucket === "monthly") {
                const found = onDates
                    .map(i => curMoment.add(i < 1 ? 1 : 0, "month").date(i).toDate())
                    .filter(date => date.getTime() >= current.getTime())
                    .find(date => date.getTime() >= after.getTime());
                if (found) {
                    if (exceeds(found)) {
                        return;
                    }
                    return found;
                }
                // skip the months
                current = curMoment.date(1).add(trigger.every, "month").toDate();
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
 * @return {Date=}
 */
function findNextMatchForMulti(trigger, after = new Date) {
    // avoid mutation. sort the dates
    const dates = trigger.dates.map(d => new Date(d.getTime()));
    dates.sort((i, j) => i.getTime() - j.getTime());
    const startIncludedAfter = new Date(Math.max(trigger.start.getTime(), after.getTime()));

    for (let date of dates) {
        if (date.getTime() >= startIncludedAfter.getTime()) {
            return date;
        }
    }
}

/**
 * schedules the message
 * @param {ObjectId} appId ObjectId of the app
 * @param {ObjectId} messageId ObjectId of the message
 * @param {Date} scheduledTo date to schedule this message to. UTC user's schedule date when timezone aware
 * @param {Boolean} timezoneAware set true if this is going to be scheduled for each timezone
 * @returns {Promise<MessageSchedule>}
 */
async function createSchedule(appId, messageId, scheduledTo, timezoneAware = false) {
    if (!messageId) {
        throw new Error("Invalid messageId");
    }
    /** @type {MessageSchedule} */
    const messageSchedule = {
        _id: new ObjectId,
        appId,
        messageId,
        scheduledTo,
        status: "started",
        timezoneAware,
    };
    await common.db.collection("message_schedules").insert(messageSchedule);
    await createJobs(messageSchedule);
    return messageSchedule;
}

/**
 * 
 * @param {MessageSchedule} messageSchedule
 * @returns {Promise<JobTicket[]>}
 */
async function createJobs(messageSchedule) {
    /** @type {JobTicket[]} */
    const jobs = [];
    if (messageSchedule.timezoneAware) {
        for (let i = 0; i < allTZOffsets.length; i++) {
            const offset = allTZOffsets[i].offset;
            const tzAdjustedScheduleDate = new Date(
                messageSchedule.scheduledTo.getTime() + offset * 60 * 1000
            );
            jobs.push({
                appId: messageSchedule.appId,
                messageId: messageSchedule.messageId,
                messageScheduleId: messageSchedule._id,
                scheduledTo: tzAdjustedScheduleDate,
                timezone: String(offset),
            });
        }
    }
    else {
        jobs.push({
            appId: messageSchedule.appId,
            messageId: messageSchedule.messageId,
            messageScheduleId: messageSchedule._id,
            scheduledTo: messageSchedule.scheduledTo,
        });
    }
    // schedule all jobs
    await Promise.all(jobs.map(sendJobTicket));
    return jobs;
}

module.exports = {
    scheduleMessage,

    // exported for unit tests
    createJobs,
    createSchedule,
    tzOffsetAdjustedTime,
    findNextMatchForRecurring,
    findNextMatchForMulti,
};
