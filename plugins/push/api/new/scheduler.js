/**
 * @typedef {import('./types/message.ts').Message} Message
 * @typedef {import('./types/message.ts').MessageTrigger} MessageTrigger
 * @typedef {import('./types/message.ts').RecurringTrigger} RecurringTrigger
 * @typedef {import('./types/message.ts').MultiTrigger} MultiTrigger
 * @typedef {import('./types/schedule.ts').Schedule} Schedule
 * @typedef {import('./types/schedule.ts').AudienceFilters} AudienceFilters
 * @typedef {import('./types/queue.ts').ScheduleEvent} ScheduleEvent
 * @typedef {import('./types/queue.ts').AutoTriggerEvent} AutoTriggerEvent
 * @typedef {import('./types/queue.ts').CohortTriggerEvent} CohortTriggerEvent
 * @typedef {import('./types/queue.ts').EventTriggerEvent} EventTriggerEvent
 * @typedef {import("mongodb").Db} MongoDb
 * @typedef {import("mongodb").Collection<Message>} MessageCollection
 * @typedef {import("mongodb").Filter<MessageTrigger>} MessageTriggerFilter
 * @typedef {import('./types/utils.ts').LogObject} LogObject
 * @typedef {{ [eventName: string]: Set<string> }} AutoTriggerEventMap
 * @typedef {{ [cohortId: string]: { enter: Set<string>, exit: Set<string> } }} AutoTriggerCohortMap
 * @typedef {{ [appId: string]: { event: AutoTriggerEventMap; cohort: AutoTriggerCohortMap; } }} AutoTriggerAppMap
 */

const { ObjectId } = require('mongodb');
const queue = require("./lib/kafka.js");
const moment = require("moment");
const allTZOffsets = require("./constants/all-tz-offsets.json");
const { buildResultObject } = require('./lib/result.js');
/** @type {LogObject} */
const log = require('../../../../api/utils/common').log('push:scheduler');

/** @type {Message["status"][]} */
const INACTIVE_MESSAGE_STATUSES = ["inactive", "draft", "sent", "stopped", "failed"];
/** @type {MessageTrigger["kind"][]} */
const SCHEDULE_BY_DATE_TRIGGERS = ["plain", "rec", "multi"];
// /** @type {MessageTrigger["kind"][]} */
// const AUTO_TRIGGERS = ["cohort", "event", "api"];

/**
 * Schedules the provided message to be sent on the next calculated date,
 * determined by the message's triggering properties
 * @param   {MongoDb} db      - mongodb database object
 * @param   {Message} message - message document from messages collection
 * @returns {Promise<Schedule|undefined>} the created Schedule document from message_schedules collection
 */
async function scheduleMessageByDate(db, message) {
    const trigger = message.triggers
        .find(trigger => SCHEDULE_BY_DATE_TRIGGERS.includes(trigger.kind));
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
        scheduleTo = findNextMatchForRecurring(trigger, startFrom);
        break;
    case "multi":
        scheduleTo = findNextMatchForMulti(trigger, startFrom);
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
 * @param {MongoDb} db
 * @param {AutoTriggerEvent[]} autoTriggerEvents
 * @returns {Promise<Schedule[]>}
 */
async function scheduleMessageByAutoTriggers(db, autoTriggerEvents) {
    const appMap = mergeAutoTriggerEvents(autoTriggerEvents);

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

    /** @type {MessageCollection} */
    const col = db.collection("messages");
    const now = Date.now();
    const promises = messageFilters.map(async ({ appId, triggerFilter, uids }) => {
        let messages = await col.find({
            app: appId,
            status: { $nin: INACTIVE_MESSAGE_STATUSES },
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
        return Promise.allSettled(messages.map(message => createSchedule(
            db, appId, message._id, new Date, false, undefined, {uids}
        )));
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
 *
 * @param {MongoDb}          db                - mongodb database object
 * @param {ObjectId}         appId             - ObjectId of the app
 * @param {ObjectId}         messageId         - ObjectId of the message
 * @param {Date}             scheduledTo       - Date to schedule this message to. UTC user's schedule date when timezone aware
 * @param {Boolean}          timezoneAware     - set true if this is going to be scheduled for each timezone
 * @param {Number=}          schedulerTimezone - timezone of the scheduler
 * @param {AudienceFilters=} audienceFilters    - user ids from app_users{appId} collection
 * @returns {Promise<Schedule>} created Schedule document from message_schedules collection
 */
async function createSchedule(
    db,
    appId,
    messageId,
    scheduledTo,
    timezoneAware,
    schedulerTimezone,
    audienceFilters,
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
        audienceFilters,
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
            const tzAdjustedScheduleDate = new Date(
                utcTime.getTime() + offset * minute
            );
            events.push({
                ...baseEvent,
                scheduledTo: tzAdjustedScheduleDate,
                timezone: String(offset),
            });
        }
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
 * @param {MongoDb} db
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

/**
 * @param {AutoTriggerEvent[]} autoTriggerEvents
 * @returns {AutoTriggerAppMap}
 */
function mergeAutoTriggerEvents(autoTriggerEvents) {
    /** @type {AutoTriggerAppMap} */
    const appMap = {};
    for (let i = 0; i < autoTriggerEvents.length; i++) {
        const event = autoTriggerEvents[i];
        if (!(event.appId.toString() in appMap)) {
            appMap[event.appId.toString()] = { event: {}, cohort: {} };
        }
        const map = appMap[event.appId.toString()];
        switch (event.kind) {
        case "cohort":
            const id = event.cohortId.toString();
            if (!(id in map)) {
                map.cohort[id] = { enter: new Set, exit: new Set };
            }
            event.uids.forEach(map.cohort[id][event.direction].add);
            break;
        case "event":
            if (!(event.name in map.event)) {
                map.event[event.name] = new Set;
            }
            map.event[event.name].add(event.uid);
            break;
        }
    }
    return appMap;
}

module.exports = {
    SCHEDULE_BY_DATE_TRIGGERS,
    INACTIVE_MESSAGE_STATUSES,
    scheduleMessageByDate,
    scheduleMessageByAutoTriggers,
    createScheduleEvents,
    createSchedule,
    tzOffsetAdjustedTime,
    findNextMatchForRecurring,
    findNextMatchForMulti,
    findWhereToStartSearchFrom,
    mergeAutoTriggerEvents,
};