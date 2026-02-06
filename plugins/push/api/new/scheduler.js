/**
 * @typedef {import('./types/message.ts').Message} Message
 * @typedef {import('./types/message.ts').MessageTrigger} MessageTrigger
 * @typedef {import('./types/message.ts').RecurringTrigger} RecurringTrigger
 * @typedef {import('./types/message.ts').MultiTrigger} MultiTrigger
 * @typedef {import('./types/message.ts').MessageCollection} MessageCollection
 * @typedef {import('./types/schedule.ts').Schedule} Schedule
 * @typedef {import('./types/schedule.ts').AudienceFilter} AudienceFilter
 * @typedef {import('./types/schedule.ts').MessageOverrides} MessageOverrides
 * @typedef {import('./types/schedule.ts').ScheduleCollection} ScheduleCollection
 * @typedef {import('./types/queue.ts').ScheduleEvent} ScheduleEvent
 * @typedef {import('./types/queue.ts').AutoTriggerEvent} AutoTriggerEvent
 * @typedef {import('./types/queue.ts').CohortTriggerEvent} CohortTriggerEvent
 * @typedef {import('./types/queue.ts').EventTriggerEvent} EventTriggerEvent
 * @typedef {import("mongodb").Db} MongoDb
 * @typedef {import("mongodb").Filter<MessageTrigger>} MessageTriggerFilter
 * @typedef {{ [eventName: string]: Set<string> }} AutoTriggerEventMap
 * @typedef {{ [cohortId: string]: { enter: Set<string>, exit: Set<string> } }} AutoTriggerCohortMap
 * @typedef {{ [appId: string]: { event: AutoTriggerEventMap; cohort: AutoTriggerCohortMap; } }} AutoTriggerAppMap
 * @typedef {{ appId: ObjectId; triggerFilter: MessageTriggerFilter; uids: string[]; }} MergedAutoTriggerFilter
 */

const { ObjectId } = require('mongodb');
const queue = require("./lib/kafka.js");
const moment = require("moment");
const allTZOffsets = require("./constants/all-tz-offsets.json");
const { buildResultObject } = require('./resultor.js');
const log = require('../../../../api/utils/common').log('push:scheduler');

/** @type {MessageTrigger["kind"][]} */
const DATE_TRIGGERS = ["plain", "rec", "multi"];
const RESCHEDULABLE_DATE_TRIGGERS = ["rec", "multi"];
const NUMBER_OF_SCHEDULES_AHEAD_OF_TIME = 5;

/**
 * Schedules the provided message to be sent on the next calculated date,
 * determined by the message's triggering properties.
 * @param {MongoDb} db - Mongodb database object
 * @param {ObjectId} messageId - Message document from messages collection
 * @returns {Promise<Schedule[]|undefined>} The created Schedule documents from message_schedules collection
 */
async function scheduleMessageByDateTrigger(db, messageId) {
    /** @type {MessageCollection} */
    const messageCol = db.collection("messages");
    /** @type {ScheduleCollection} */
    const scheduleCol = db.collection("message_schedules");

    const message = await messageCol.findOne({ _id: messageId, status: "active" });
    if (!message) {
        throw new Error("Message " + messageId + " doesn't exist or it's not active");
    }

    const trigger = message.triggers.find(t => DATE_TRIGGERS.includes(t.kind));
    if (!trigger) {
        throw new Error("Cannot find a schedulable trigger for " + messageId);
    }

    /** @type {Date[]} - Resulted dates from below calculations */
    let scheduleTo = [];

    if (trigger.kind === "plain") {
        if (!message?.info?.scheduled) {
            scheduleTo.push(new Date);
        }
        else if (trigger.start.getTime() > Date.now()) {
            scheduleTo.push(trigger.start);
        }
        else {
            throw new Error("Start date is in the past");
        }
    }
    else {
        // starting from now, always keep NUMBER_OF_SCHEDULES_AHEAD_OF_TIME schedules
        // for the future for recurring and multi triggers.
        let previousSchedules = await scheduleCol
            .find({ messageId, status: { $in: ["scheduled"] }})
            .sort({ scheduledTo: -1 })
            .limit(NUMBER_OF_SCHEDULES_AHEAD_OF_TIME)
            .toArray();

        let lastScheduleDate = previousSchedules[0]?.scheduledTo;
        const numberOfSchedules = NUMBER_OF_SCHEDULES_AHEAD_OF_TIME - previousSchedules.length;

        /** @type {Date|undefined} */
        let foundDate = lastScheduleDate && lastScheduleDate.getTime() > Date.now()
            ? lastScheduleDate
            : new Date;

        for (let i = 0; i < numberOfSchedules; i++) {
            if (trigger.kind === "multi") {
                foundDate = findNextMatchForMulti(
                    trigger,
                    new Date(/** @type {Date} */(foundDate).getTime() + 1)
                );
            }
            else if (trigger.kind === "rec") {
                foundDate = findNextMatchForRecurring(
                    trigger,
                    new Date(/** @type {Date} */(foundDate).getTime() + 1)
                );
            }
            // couldn't find a date
            if (!foundDate) {
                break;
            }
            scheduleTo.push(foundDate);
        }
    }

    // couldn't find a matching date
    if (!scheduleTo.length) {
        log.w("Couldn't find a matching trigger for the message", messageId);
        return;
    }

    return Promise.all(scheduleTo.map(date => createSchedule(
        db,
        message.app,
        messageId,
        date,
        "tz" in trigger && trigger.tz ? trigger.tz : false,
        "sctz" in trigger ? trigger.sctz : undefined,
        trigger.reschedule,
        message.filter,
    )));
}

/**
 * Schedules messages based on auto trigger events (cohort and event).
 * @param {MongoDb} db - Mongodb database object
 * @param {AutoTriggerEvent[]} autoTriggerEvents - List of auto trigger events
 * @returns {Promise<Schedule[]>} The created Schedule documents from message_schedules collection
 */
async function scheduleMessageByAutoTriggers(db, autoTriggerEvents) {
    const messageFilters = mergeAutoTriggerEvents(autoTriggerEvents);
    // find if there are messages for the created "triggerFilter". then load the
    // message, and then create a schedule for it.
    /** @type {MessageCollection} */
    const messageCol = db.collection("messages");
    const now = new Date;
    const promises = messageFilters.map(async({ appId, triggerFilter, uids }) => {
        let messages = await messageCol.find({
            app: appId,
            status: "active",
            triggers: {
                $elemMatch: {
                    ...triggerFilter,
                    start: { $lt: now },
                    $or: [
                        { end: { $exists: false } },
                        { end: { $gt: now } }
                    ]
                }
            }
        }).toArray();
        return Promise.allSettled(messages.map(message => {
            /** @type {AudienceFilter} */
            const audienceFilter = { ...message.filter };
            const trigger = message.triggers[0];
            let scheduleTo = now;
            let timezoneAware = false;
            let schedulerTimezone;
            if (trigger.kind === "cohort" || trigger.kind === "event") {
                if (trigger.kind === "cohort" && trigger.cancels === true) {
                    audienceFilter.userCohortStatuses = uids.map(uid => ({
                        uid,
                        cohort: {
                            id: triggerFilter.cohorts,
                            status: triggerFilter.entry ? "in" : "out"
                        }
                    }));
                }
                else {
                    audienceFilter.uids = uids;
                }
                if (trigger.cap || trigger.sleep) {
                    audienceFilter.cap = { messageId: message._id };
                    if (trigger.cap) {
                        audienceFilter.cap.maxMessages = trigger.cap;
                    }
                    if (trigger.sleep) {
                        audienceFilter.cap.minTime = trigger.sleep;
                    }
                }
                if (trigger.time) {
                    timezoneAware = true;
                    schedulerTimezone = now.getTimezoneOffset();
                    scheduleTo = tzOffsetAdjustedTime(
                        now,
                        schedulerTimezone,
                        trigger.time
                    );
                }
                else if (trigger.delay) {
                    scheduleTo = moment(now).add(trigger.delay, "milliseconds")
                        .toDate();
                }
            }
            return createSchedule(
                db,
                appId,
                message._id,
                scheduleTo,
                timezoneAware,
                schedulerTimezone,
                trigger.reschedule,
                audienceFilter,
            );
        }));
    });
    const results = (await Promise.all(promises)).flat();
    for (let i = 0; i < results.length; i++) {
        const result = results[i];
        if (result.status === "rejected") {
            log.e("Failed to schedule auto triggered message", result.reason);
        }
    }
    return results.filter(result => result.status === "fulfilled")
        .map(result => result.value);
}

/**
 * Creates a schedule for the message to be sent at the given date.
 * This function is used in both auto and date trigger event handlers.
 * API (tx) triggers uses this directly to schedule messages.
 * @param {MongoDb} db - mongodb database object
 * @param {ObjectId} appId - ObjectId of the app
 * @param {ObjectId} messageId - ObjectId of the message
 * @param {Date} scheduledTo - Date to schedule this message to. UTC user's schedule date when timezone aware
 * @param {boolean} timezoneAware - Set true if this is going to be scheduled for each timezone
 * @param {number=} schedulerTimezone - Timezone of the scheduler
 * @param {boolean=} rescheduleIfPassed - True if we want to reschedule to next day if the date is in the past
 * @param {AudienceFilter=} audienceFilter - User ids from app_users{appId} collection
 * @param {MessageOverrides=} messageOverrides - Overrides for the message (content, parameters, etc.)
 * @returns {Promise<Schedule>} Created Schedule document from message_schedules collection
 */
async function createSchedule(
    db,
    appId,
    messageId,
    scheduledTo,
    timezoneAware,
    schedulerTimezone,
    rescheduleIfPassed = false,
    audienceFilter,
    messageOverrides,
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
        rescheduleIfPassed,
        status: "scheduled",
        timezoneAware,
        schedulerTimezone,
        audienceFilter,
        messageOverrides,
        result: buildResultObject(),
        events: [],
    };

    // save the events to keep track of the main schedule's status (there can be
    // multiple schedule events for a single schedule document when timezoneAware)
    const events = await createScheduleEvents(messageSchedule);
    messageSchedule.events = events.map(
        ({ scheduledTo: _scheduledTo, timezone }) => ({
            status: "scheduled",
            scheduledTo: _scheduledTo,
            timezone,
        })
    );

    await db.collection("message_schedules").insertOne(messageSchedule);
    return messageSchedule;
}

/**
 * Creates schedule events for the given message schedule.
 * If the message schedule is timezone aware, it creates multiple events for
 * each timezone offset.
 * @param {Schedule} messageSchedule - Schedule document from message_schedules collection
 * @returns {Promise<ScheduleEvent[]>} Created schedule events
 */
async function createScheduleEvents(messageSchedule) {
    /** @type {ScheduleEvent[]} */
    let events = [{
        appId: messageSchedule.appId,
        messageId: messageSchedule.messageId,
        scheduleId: messageSchedule._id,
        scheduledTo: messageSchedule.scheduledTo,
    }];
    if (messageSchedule.timezoneAware) {
        const baseEvent = events[0];
        events = [];
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
            let tzAdjustedScheduleDate = new Date(
                utcTime.getTime() - offset * minute
            );
            if (tzAdjustedScheduleDate.getTime() < Date.now()) {
                // reschedule to the next day if the date is in the past
                if (messageSchedule.rescheduleIfPassed) {
                    tzAdjustedScheduleDate = new Date(
                        tzAdjustedScheduleDate.getTime() + 24 * 60 * minute
                    );
                }
                else {
                    continue;
                }
            }
            events.push({
                ...baseEvent,
                scheduledTo: tzAdjustedScheduleDate,
                timezone: String(offset),
            });
        }
    }
    // schedule all events
    await queue.sendScheduleEvents(events);
    return events;
}

/**
 * Adjusts the given date by the timezone offset and sets the time.
 * @param {Date} date - Base date
 * @param {number} offset - Timezone offset in minutes
 * @param {number} time - Time in milliseconds from midnight
 * @returns {Date} Adjusted date
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
 * Finds the next matching date for the given recurring trigger.
 * @param {RecurringTrigger} trigger - Recurring trigger object
 * @param {Date=} startFrom - Date to start searching from (default: now)
 * @returns {Date|undefined} Next matching date or undefined if not found
 */
function findNextMatchForRecurring(trigger, startFrom = new Date) {
    // to prevent mutation:
    const onDates = trigger.on ? [...trigger.on] : [];
    // to put negative values to the end
    onDates.sort((i, j) => (i < 1 ? i + 100 : i) - (j < 1 ? j + 100 : j));

    /**
     * checks if the given date is exceeding trigger.end
     * @param {Date} date - Date to check
     * @returns {boolean} True if exceeding, false otherwise
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
    while (/* eslint-disable no-constant-condition */true) {
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
                        j => curMoment.add(j < 1 ? 1 : 0, "month")
                            .date(j)
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
 * Finds the next matching date for the given multi trigger.
 * @param {MultiTrigger} trigger - Multi trigger object
 * @param {Date=} after - Date to start searching from (default: now)
 * @returns {Date|undefined} Next matching date or undefined if not found
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

/**
 * Merges auto trigger events into a map of appId to event and cohort sets.
 * This is used to reduce the number of mongo queries when scheduling messages.
 * It groups events by appId and then by event name or cohort id.
 * @param {AutoTriggerEvent[]} autoTriggerEvents - List of auto trigger events
 * @returns {MergedAutoTriggerFilter[]} Map of appId to event and cohort sets
 */
function mergeAutoTriggerEvents(autoTriggerEvents) {
    // first, we need to group the auto trigger events by appId.
    /** @type {AutoTriggerAppMap} */
    const appMap = {};
    for (let i = 0; i < autoTriggerEvents.length; i++) {
        const event = autoTriggerEvents[i];
        if (!(event.appId.toString() in appMap)) {
            appMap[event.appId.toString()] = { event: {}, cohort: {} };
        }
        const map = appMap[event.appId.toString()];
        /** @type {string} */
        let id;
        switch (event.kind) {
        case "cohort":
            id = event.cohortId.toString();
            if (!(id in map.cohort)) {
                map.cohort[id] = { enter: new Set, exit: new Set };
            }
            event.uids.forEach(uid => map.cohort[id][event.direction].add(uid));
            break;
        case "event":
            for (let j = 0; j < event.eventKeys.length; j++) {
                const key = event.eventKeys[j];
                if (!(key in map.event)) {
                    map.event[key] = new Set;
                }
                map.event[key].add(event.uid);
            }
            break;
        }
    }
    // now we have a map of appId to event and cohort sets.
    /** @type {{appId: ObjectId; triggerFilter: MessageTriggerFilter; uids: string[];}[]} */
    const messageFilters = [];
    for (const appId in appMap) {
        const map = appMap[appId];
        // Events:
        for (const eventName in map.event) {
            messageFilters.push({
                appId: new ObjectId(appId),
                triggerFilter: {
                    kind: "event",
                    events: eventName,
                },
                uids: Array.from(map.event[eventName])
            });
        }

        for (const cohortId in map.cohort) {
            for (const _direction in map.cohort[cohortId]) {
                const direction = /** @type {CohortTriggerEvent["direction"]} */(_direction);
                messageFilters.push({
                    appId: new ObjectId(appId),
                    triggerFilter: {
                        kind: "cohort",
                        cohorts: cohortId,
                        entry: direction === "enter",
                    },
                    uids: Array.from(map.cohort[cohortId][direction])
                });
            }
        }
    }
    // filter out empty filters
    return messageFilters.filter(filter => filter.uids.length > 0);
}

/**
 * Schedules the message if it is eligible for date scheduling.
 * @param {MongoDb} db - Mongodb database object
 * @param {Message} message - Message document from messages collection
 * @returns {Promise<Schedule[]|undefined>} The created Schedule documents from message_schedules collection
 */
async function scheduleIfEligible(db, message) {
    if (message.info.demo || message.status !== "active") {
        return;
    }
    const trigger = message.triggers.find(t => DATE_TRIGGERS.includes(t.kind));
    if (!trigger) {
        return;
    }
    return scheduleMessageByDateTrigger(db, message._id);
}

module.exports = {
    DATE_TRIGGERS,
    RESCHEDULABLE_DATE_TRIGGERS,
    scheduleMessageByDateTrigger,
    scheduleMessageByAutoTriggers,
    createScheduleEvents,
    createSchedule,
    tzOffsetAdjustedTime,
    findNextMatchForRecurring,
    findNextMatchForMulti,
    mergeAutoTriggerEvents,
    scheduleIfEligible,
};