import { ObjectId } from "mongodb";
import type {
    ScheduleEvent, ScheduleEventDTO,
    PushEvent, PushEventDTO,
    ResultEvent, ResultEventDTO,
    AutoTriggerEvent, AutoTriggerEventDTO,
    CredentialsDTO,
} from "../types/queue.ts";
import type { PlatformCredential } from "../types/credentials.ts";

export function scheduleEventDTOToObject(scheduleEventDTO: ScheduleEventDTO): ScheduleEvent {
    return {
        ...scheduleEventDTO,
        appId: new ObjectId(scheduleEventDTO.appId),
        messageId: new ObjectId(scheduleEventDTO.messageId),
        scheduleId: new ObjectId(scheduleEventDTO.scheduleId),
        scheduledTo: new Date(scheduleEventDTO.scheduledTo),
    };
}

export function pushEventDTOToObject(pushEventDTO: PushEventDTO): PushEvent {
    return {
        ...pushEventDTO,
        appId: new ObjectId(pushEventDTO.appId),
        messageId: new ObjectId(pushEventDTO.messageId),
        scheduleId: new ObjectId(pushEventDTO.scheduleId),
        credentials: credentialsDTOToObject(pushEventDTO.credentials),
        sendBefore: pushEventDTO.sendBefore
            ? new Date(pushEventDTO.sendBefore)
            : undefined,
    } as PushEvent;
}

export function credentialsDTOToObject(credentialsDTO: CredentialsDTO): PlatformCredential {
    if ("notAfter" in credentialsDTO) {
        return {
            ...credentialsDTO,
            notAfter: new Date(credentialsDTO.notAfter),
            notBefore: new Date(credentialsDTO.notBefore),
            _id: new ObjectId(credentialsDTO._id)
        } as PlatformCredential;
    }
    else {
        return {
            ...credentialsDTO,
            _id: new ObjectId(credentialsDTO._id)
        } as PlatformCredential;
    }
}

export function resultEventDTOToObject(resultEventDTO: ResultEventDTO): ResultEvent {
    return {
        ...resultEventDTO,
        appId: new ObjectId(resultEventDTO.appId),
        messageId: new ObjectId(resultEventDTO.messageId),
        scheduleId: new ObjectId(resultEventDTO.scheduleId),
        credentials: credentialsDTOToObject(resultEventDTO.credentials),
        sendBefore: resultEventDTO.sendBefore
            ? new Date(resultEventDTO.sendBefore)
            : undefined,
    } as unknown as ResultEvent;
}

export function autoTriggerEventDTOToObject(autoTriggerEvent: AutoTriggerEventDTO): AutoTriggerEvent {
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
