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
 * Converts ScheduleEventDTO to ScheduleEvent by transforming string IDs to ObjectId and date strings to Date objects.
 * @param {ScheduleEventDTO} scheduleEventDTO - The ScheduleEventDTO object to be converted.
 * @returns {ScheduleEvent} The converted ScheduleEvent object.
 */
function scheduleEventDTOToObject(scheduleEventDTO) {
    return {
        ...scheduleEventDTO,
        appId: new ObjectId(scheduleEventDTO.appId),
        messageId: new ObjectId(scheduleEventDTO.messageId),
        scheduleId: new ObjectId(scheduleEventDTO.scheduleId),
        scheduledTo: new Date(scheduleEventDTO.scheduledTo),
    };
}

/**
 * Converts PushEventDTO to PushEvent by transforming string IDs to ObjectId and date strings to Date objects.
 * @param {PushEventDTO} pushEventDTO - The PushEventDTO object to be converted.
 * @returns {PushEvent} The converted PushEvent object.
 */
function pushEventDTOToObject(pushEventDTO) {
    return {
        ...pushEventDTO,
        appId: new ObjectId(pushEventDTO.appId),
        messageId: new ObjectId(pushEventDTO.messageId),
        scheduleId: new ObjectId(pushEventDTO.scheduleId),
        credentials: credentialsDTOToObject(pushEventDTO.credentials),
        sendBefore: pushEventDTO.sendBefore
            ? new Date(pushEventDTO.sendBefore)
            : undefined,
    };
}

/**
 * Converts CredentialsDTO to PlatformCredential by transforming string IDs to ObjectId and date strings to Date objects if present.
 * @param {CredentialsDTO} credentialsDTO - The CredentialsDTO object to be converted.
 * @returns {PlatformCredential} The converted PlatformCredential object.
 */
function credentialsDTOToObject(credentialsDTO) {
    if ("notAfter" in credentialsDTO) {
        return {
            ...credentialsDTO,
            notAfter: new Date(credentialsDTO.notAfter),
            notBefore: new Date(credentialsDTO.notBefore),
            _id: new ObjectId(credentialsDTO._id)
        };
    }
    else {
        return {
            ...credentialsDTO,
            _id: new ObjectId(credentialsDTO._id)
        };
    }
}

/**
 * Converts ResultEventDTO to ResultEvent by transforming string IDs to ObjectId and date strings to Date objects if present.
 * @param {ResultEventDTO} resultEventDTO - The ResultEventDTO object to be converted.
 * @returns {ResultEvent} The converted ResultEvent object.
 */
function resultEventDTOToObject(resultEventDTO) {
    return {
        ...resultEventDTO,
        appId: new ObjectId(resultEventDTO.appId),
        messageId: new ObjectId(resultEventDTO.messageId),
        scheduleId: new ObjectId(resultEventDTO.scheduleId),
        credentials: credentialsDTOToObject(resultEventDTO.credentials),
        sendBefore: resultEventDTO.sendBefore
            ? new Date(resultEventDTO.sendBefore)
            : undefined,
    };
}

/**
 * Converts AutoTriggerEventDTO to AutoTriggerEvent by transforming string IDs to ObjectId.
 * @param {AutoTriggerEventDTO} autoTriggerEvent - The AutoTriggerEventDTO object to be converted.
 * @returns {AutoTriggerEvent} The converted AutoTriggerEvent object.
 */
function autoTriggerEventDTOToObject(autoTriggerEvent) {
    switch (autoTriggerEvent.kind) {
    case "cohort":
        return {
            ...autoTriggerEvent,
            appId: new ObjectId(autoTriggerEvent.appId),
        };
    case "event":
        return {
            ...autoTriggerEvent,
            appId: new ObjectId(autoTriggerEvent.appId),
        };
    }
}


module.exports = {
    scheduleEventDTOToObject,
    pushEventDTOToObject,
    resultEventDTOToObject,
    credentialsDTOToObject,
    autoTriggerEventDTOToObject,
};