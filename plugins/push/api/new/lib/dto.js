/**
 * @typedef {import('../types/queue.ts').ScheduleEvent} ScheduleEvent
 * @typedef {import('../types/queue.ts').PushEvent} PushEvent
 * @typedef {{[key: string]: string|number|boolean|PlainNestedObject}} PlainNestedObject
 */

const { ObjectId } = require("mongodb");

/**
 * @param {any} scheduleEventDTO
 * @returns {ScheduleEvent}
 */
function scheduleEventDTOToObject(scheduleEventDTO) {
    const scheduleEvent = {
        ...scheduleEventDTO,
        appId: new ObjectId(/** @type {string} */(scheduleEventDTO.appId)),
        messageId: new ObjectId(/** @type {string} */(scheduleEventDTO.messageId)),
        scheduleId: new ObjectId(/** @type {string} */(scheduleEventDTO.scheduleId)),
        scheduledTo: new Date(/** @type {string} */(scheduleEventDTO.scheduledTo)),
    }
    return scheduleEvent;
}

/**
 * @param {any} pushEventDTO
 * @returns {PushEvent}
 */
function pushEventDTOToObject(pushEventDTO) {
    const pushEvent = {
        ...pushEventDTO,
        appId: new ObjectId(/** @type {string} */(pushEventDTO.appId)),
        messageId: new ObjectId(/** @type {string} */(pushEventDTO.messageId)),
        scheduleId: new ObjectId(/** @type {string} */(pushEventDTO.scheduleId)),
    }
    if (pushEventDTO.credentials?.notAfter) {
        pushEvent.credentials.notAfter = new Date(pushEvent.credentials.notAfter);
    }
    if (pushEventDTO.credentials?.notBefore) {
        pushEvent.credentials.notBefore = new Date(pushEvent.credentials.notBefore);
    }
    return pushEvent;
}

module.exports = {
    scheduleEventDTOToObject,
    pushEventDTOToObject
}