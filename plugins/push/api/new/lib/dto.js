/**
 * @typedef {import('../types/queue.ts').ScheduleEvent} ScheduleEvent
 * @typedef {import('../types/queue.ts').PushEvent} PushEvent
 * @typedef {import('../types/queue.ts').ResultEvent} ResultEvent
 * @typedef {import('../types/queue.ts').AutoTriggerEvent} AutoTriggerEvent
 * @typedef {import('../types/queue.ts').ScheduleEventDTO} ScheduleEventDTO
 * @typedef {import('../types/queue.ts').PushEventDTO} PushEventDTO
 * @typedef {import('../types/queue.ts').ResultEventDTO} ResultEventDTO
 * @typedef {import('../types/queue.ts').CredentialsDTO} CredentialsDTO
 * @typedef {import('../types/queue.ts').AutoTriggerEventDTO} AutoTriggerEventDTO
 * @typedef {import('../types/credentials.js').PlatformCredential} PlatformCredential
 */

const { ObjectId } = require("mongodb");

/**
 * @param {ScheduleEventDTO} scheduleEventDTO
 * @returns {ScheduleEvent}
 */
function scheduleEventDTOToObject(scheduleEventDTO) {
    return {
        ...scheduleEventDTO,
        appId: new ObjectId(scheduleEventDTO.appId),
        messageId: new ObjectId(scheduleEventDTO.messageId),
        scheduleId: new ObjectId(scheduleEventDTO.scheduleId),
        scheduledTo: new Date(scheduleEventDTO.scheduledTo),
    }
}

/**
 * @param {PushEventDTO} pushEventDTO
 * @returns {PushEvent}
 */
function pushEventDTOToObject(pushEventDTO) {
    return {
        ...pushEventDTO,
        appId: new ObjectId(pushEventDTO.appId),
        messageId: new ObjectId(pushEventDTO.messageId),
        scheduleId: new ObjectId(pushEventDTO.scheduleId),
        credentials: credentialsDTOToObject(pushEventDTO.credentials)
    }
}

/**
 * @param {CredentialsDTO} credentialsDTO
 * @returns {PlatformCredential}
 */
function credentialsDTOToObject(credentialsDTO) {
    if ("notAfter" in credentialsDTO) {
        return {
            ...credentialsDTO,
            notAfter: new Date(credentialsDTO.notAfter),
            notBefore: new Date(credentialsDTO.notBefore),
            _id: new ObjectId(credentialsDTO._id)
        }
    } else {
        return {
            ...credentialsDTO,
            _id: new ObjectId(credentialsDTO._id)
        }
    }
}

/**
 * @param {ResultEventDTO} resultEvent
 * @returns {ResultEvent}
 */
function resultEventDTOToObject(resultEvent) {
    return {
        ...resultEvent,
        appId: new ObjectId(resultEvent.appId),
        messageId: new ObjectId(resultEvent.messageId),
        scheduleId: new ObjectId(resultEvent.scheduleId),
        credentials: credentialsDTOToObject(resultEvent.credentials)
    }
}

/**
 * @param {AutoTriggerEventDTO} autoTriggerEvent
 * @returns {AutoTriggerEvent}
 */
function autoTriggerEventDTOToObject(autoTriggerEvent) {
    switch (autoTriggerEvent.kind) {
    case "cohort":
        return {
            ...autoTriggerEvent,
            appId: new ObjectId(autoTriggerEvent.appId),
        }
    case "event":
        return {
            ...autoTriggerEvent,
            appId: new ObjectId(autoTriggerEvent.appId),
        }
    }
}


module.exports = {
    scheduleEventDTOToObject,
    pushEventDTOToObject,
    resultEventDTOToObject,
    credentialsDTOToObject,
    autoTriggerEventDTOToObject,
}