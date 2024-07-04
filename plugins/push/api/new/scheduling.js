/**
 * @typedef {import('./types/message.js').Message} Message
 * @typedef {import('./types/message.js').PlainTrigger} PlainTrigger
 * @typedef {import('./types/message.js').RecurringTrigger} RecurringTrigger
 * @typedef {import('./types/message.js').MultiTrigger} MultiTrigger
 * @typedef {import('./types/schedule.js').MessageSchedule} MessageSchedule
 * @typedef {import('./types/queue.js').JobTicket} JobTicket
 */

const common = require('../../../../api/utils/common');
const { ObjectId } = require('mongodb');
const { createJob } = require("./queue/kafka.js");

const allTZOffsets = require("./constants/all-tz-offsets.json").map(val => {
    const factor = val[0] === "-" ? -1 : 1;
    const hours = parseInt(val.slice(1, 3));
    const minutes = parseInt(val.slice(4, 6));
    return factor * (hours * 60 + minutes);
});

const schedulableTriggerKinds = ["plain", "rec", "multi"];

/**
 * 
 * @param {Message} message 
 */
async function scheduleMessage(message) {
    const triggers = message.triggers
        .filter(trigger => schedulableTriggerKinds.includes(trigger.kind));
    for (let i = 0; i < triggers.length; i++) {
        const trigger = triggers[i];

        switch(triggers[i].kind) {
        case "plain":
            await scheduleWithPlainTrigger(
                message,
                /** @type {PlainTrigger} */(trigger)
            );
            break;

        case "rec":
            await scheduleWithRecurringTrigger(
                message,
                /** @type {RecurringTrigger} */(trigger)
            );
            break;

        case "multi":
            await scheduleWithMultiTrigger(
                message,
                /** @type {MultiTrigger} */(trigger)
            );
            break;
        }
    }
}

/**
 * 
 * @param {Message} message 
 * @param {PlainTrigger} trigger 
 */
async function scheduleWithPlainTrigger(message, trigger) {
    let scheduleTo = trigger.start;
    let timezoneAware = trigger.tz;
    if (timezoneAware) {
        if (typeof trigger.sctz !== "number") {
            throw new Error("Scheduler timezone is required when a "
                + "message schedule is timezone aware");
        }
        scheduleTo = new Date(scheduleTo.getTime() - trigger.sctz * 60 * 1000);
    }
    return await createSchedule(message.app, message._id, scheduleTo, timezoneAware);
}
/**
 * 
 * @param {Message} message 
 * @param {RecurringTrigger} trigger 
 */
async function scheduleWithRecurringTrigger(message, trigger) {
    
}
/**
 * 
 * @param {Message} message 
 * @param {MultiTrigger} trigger 
 */
async function scheduleWithMultiTrigger(message, trigger) {

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
        appId: appId,
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
            const offset = allTZOffsets[i];
            const tzAdjustedScheduleDate = new Date(
                messageSchedule.scheduledTo.getTime() - offset * 60 * 1000
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
    await Promise.all(jobs.map(createJob));
    return jobs;
}

module.exports = {
    scheduleMessage
};

// =============================== TESTS ================================
(async() => {
    // if (!require('cluster').isPrimary) {
    //     return;
    // }
    // await require("./queue/kafka.js").init(
    //     async function(push) {},
    //     async function(job) {},
    //     false,
    // );
    // await createSchedule(
    //     new ObjectId("667e7619df6b3fe64d1de3ba"),
    //     new Date("2024-06-28T07:00:42.000Z"),
    //     true
    // );
})();