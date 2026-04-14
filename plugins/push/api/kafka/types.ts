import type { AndroidMessagePayload, AndroidConfig } from "../send/platforms/android.ts";
import type { IOSMessagePayload, IOSConfig } from "../send/platforms/ios.ts";
import type { HuaweiMessagePayload, HuaweiConfig } from "../send/platforms/huawei.ts";
import type { PlatformCredential } from "../models/credentials.ts";
import type { ProxyConfiguration } from "../lib/utils.ts";
import type { AutoTrigger, MessageTrigger, PlatformKey, PlatformEnvKey } from "../models/message.ts";
import type { ErrorObject } from "../lib/error.ts";
import { ObjectId } from "mongodb";

export type PushEventHandler = (pushes: PushEvent[]) => Promise<any>;
export type ScheduleEventHandler = (schedules: ScheduleEvent[]) => Promise<any>;
export type ResultEventHandler = (results: ResultEvent[]) => Promise<any>;
export type AutoTriggerEventHandler = (autoTriggers: AutoTriggerEvent[]) => Promise<any>;

type Optional<T> = T|undefined;
// converts ObjectId and Date to string
type DTO<T> = {
    [P in keyof T]: T[P] extends ObjectId|Date
        ? string
        : (
            T[P] extends Optional<ObjectId>|Optional<Date>
                ? Optional<string>
                : (
                    T[P] extends ObjectId[]|Date[]
                        ? string[]
                        : T[P]
                )
        )
}

export type ScheduleEventDTO = DTO<ScheduleEvent>;
export type CredentialsDTO = DTO<PlatformCredential>;
export type AndroidPushEventDTO = Omit<DTO<AndroidPushEvent>,"credentials"> & { credentials: CredentialsDTO };
export type IOSPushEventDTO = Omit<DTO<IOSPushEvent>,"credentials"> & { credentials: CredentialsDTO };
export type HuaweiPushEventDTO = Omit<DTO<HuaweiPushEvent>,"credentials"> & { credentials: CredentialsDTO };
export type PushEventDTO = AndroidPushEventDTO|IOSPushEventDTO|HuaweiPushEventDTO;
export type AndroidResultEventDTO = Omit<DTO<AndroidResultEvent>,"credentials"> & { credentials: CredentialsDTO };
export type IOSResultEventDTO = Omit<DTO<IOSResultEvent>,"credentials"> & { credentials: CredentialsDTO };
export type HuaweiResultEventDTO = Omit<DTO<HuaweiResultEvent>,"credentials"> & { credentials: CredentialsDTO };
export type ResultEventDTO = AndroidResultEventDTO|IOSResultEventDTO|HuaweiResultEventDTO;
export type AutoTriggerEventDTO = DTO<AutoTriggerEvent>;

export interface ScheduleEvent {
    appId: ObjectId;
    messageId: ObjectId;
    scheduleId: ObjectId;
    scheduledTo: Date;
    timezone?: string;
}

export type PlatformConfig = IOSConfig|AndroidConfig|HuaweiConfig;

export interface BasePushEvent {
    appId: ObjectId;
    messageId: ObjectId;
    scheduleId: ObjectId;
    uid: string;
    token: string;
    payload: AndroidMessagePayload | IOSMessagePayload | HuaweiMessagePayload; // actual message to be sent. data structure depends on the platform
    saveResult: boolean;
    platform: PlatformKey;
    env: PlatformEnvKey;
    language: string;
    credentials: PlatformCredential;
    proxy?: ProxyConfiguration;
    // the date when this push should be sent until. the only use for this is
    // to keep track of the original send date and throw TooLateToSend error in
    // the sender if the push event is not sent before this date.
    sendBefore?: Date;
    // these are required for internal post processing in resultor.js@updateInternals
    // could be removed to reduce the size of this PushEvent and ResultEvent in the future.
    trigger: MessageTrigger; // trigger that caused this push event to be created:
    appTimezone: string; // timezone of the app
}

export interface AndroidPushEvent extends BasePushEvent {
    platform: "a";
    platformConfiguration: AndroidConfig;
    payload: AndroidMessagePayload;
}

export interface HuaweiPushEvent extends BasePushEvent {
    platform: "h";
    platformConfiguration: HuaweiConfig;
    payload: HuaweiMessagePayload;
}

export interface IOSPushEvent extends BasePushEvent {
    platform: "i";
    platformConfiguration: IOSConfig;
    payload: IOSMessagePayload;
}

export type PushEvent = AndroidPushEvent | HuaweiPushEvent | IOSPushEvent;

export interface AndroidResultEvent extends AndroidPushEvent {
    response?: any;
    error?: ErrorObject;
    sentAt: Date; // the date when this push was actually sent or attempted to be sent
}

export interface HuaweiResultEvent extends HuaweiPushEvent {
    response?: any;
    error?: ErrorObject;
    sentAt: Date;
}

export interface IOSResultEvent extends IOSPushEvent {
    response?: any;
    error?: ErrorObject;
    sentAt: Date;
}

export type ResultEvent = AndroidResultEvent | HuaweiResultEvent | IOSResultEvent;

export interface BaseTriggerEvent {
    appId: ObjectId;
    kind: AutoTrigger["kind"];
}

export interface CohortTriggerEvent extends BaseTriggerEvent {
    kind: "cohort";
    direction: "enter"|"exit";
    cohortId: string;
    uids: string[];
}

export interface EventTriggerEvent extends BaseTriggerEvent {
    kind: "event";
    eventKeys: string[];
    uid: string;
}

export type AutoTriggerEvent = CohortTriggerEvent|EventTriggerEvent;

// DTO conversion functions

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
        }
    }
    else {
        return {
            ...credentialsDTO,
            _id: new ObjectId(credentialsDTO._id)
        }
    }
}

export function resultEventDTOToObject(resultEventDTO: ResultEventDTO): ResultEvent {
    return {
        ...resultEventDTO,
        appId: new ObjectId(resultEventDTO.appId),
        messageId: new ObjectId(resultEventDTO.messageId),
        scheduleId: new ObjectId(resultEventDTO.scheduleId),
        credentials: credentialsDTOToObject(resultEventDTO.credentials),
        sentAt: new Date(resultEventDTO.sentAt),
        sendBefore: resultEventDTO.sendBefore
            ? new Date(resultEventDTO.sendBefore)
            : undefined,
    } as ResultEvent;
}

export function autoTriggerEventDTOToObject(autoTriggerEvent: AutoTriggerEventDTO): AutoTriggerEvent {
    return {
        ...autoTriggerEvent,
        appId: new ObjectId(autoTriggerEvent.appId),
    }
}
