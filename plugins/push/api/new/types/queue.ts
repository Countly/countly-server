import { ObjectId } from "mongodb";
import { PlatformCredential, APNCredentials, FCMCredentials, HMSCredentials } from "./credentials";
import { ProxyConfiguration } from "./proxy";
import { AutoTrigger, MessageTrigger } from "./message";
import { PlatformKey, PlatformEnvKey } from "./message";
import { ErrorObject } from "./message";
import { PlatformMessageContent, AndroidMessageContent, HuaweiMessageContent, IOSMessageContent } from "./message";

export interface ScheduleEvent {
    appId: ObjectId;
    messageId: ObjectId;
    scheduleId: ObjectId;
    scheduledTo: Date;
    timezone?: string;
}

export interface IOSConfig {
    setContentAvailable: boolean;
}

export interface AndroidConfig {}

export interface HuaweiConfig {}

export type PlatformConfig = IOSConfig|AndroidConfig|HuaweiConfig;

export interface BasePushEvent {
    appId: ObjectId;
    messageId: ObjectId;
    scheduleId: ObjectId;
    uid: string;
    token: string;
    message: PlatformMessageContent; // actual message to be sent. data structure depends on the platform
    saveResult: boolean;
    platform: PlatformKey;
    env: PlatformEnvKey;
    language: string;
    credentials: PlatformCredential;
    proxy?: ProxyConfiguration;
    platformConfiguration: PlatformConfig;

    // these are required for internal post processing in resultor.js@updateInternals
    // could be removed to reduce the size of this PushEvent and ResultEvent in the future.
    trigger: MessageTrigger; // trigger that caused this push event to be created:
    appTimezone: string; // timezone of the app
}

export interface AndroidPushEvent extends BasePushEvent {
    platform: "a";
    platformConfiguration: AndroidConfig;
    message: AndroidMessageContent;
}

export interface HuaweiPushEvent extends BasePushEvent {
    platform: "h";
    platformConfiguration: HuaweiConfig;
    message: HuaweiMessageContent;
}

export interface IOSPushEvent extends BasePushEvent {
    platform: "i";
    platformConfiguration: IOSConfig;
    message: IOSMessageContent;
}

export type PushEvent = AndroidPushEvent | HuaweiPushEvent | IOSPushEvent;

// export interface PushEvent {
//     appId: ObjectId;
//     messageId: ObjectId;
//     scheduleId: ObjectId;
//     uid: string;
//     token: string;
//     message: AndroidMessageContent|HuaweiMessageContent|IOSMessageContent; // actual message to be sent. data structure depends on the platform
//     saveResult: boolean;
//     platform: PlatformKey;
//     env: PlatformEnvKey;
//     language: string;
//     credentials: PlatformCredential;
//     proxy?: ProxyConfiguration;
//     platformConfiguration: IOSConfig|AndroidConfig|HuaweiConfig;

//     // these are required for internal post processing in resultor.js@updateInternals
//     // could be removed to reduce the size of this PushEvent and ResultEvent in the future.
//     trigger: MessageTrigger; // trigger that caused this push event to be created:
//     appTimezone: string; // timezone of the app
// }

export type ResultEvent = PushEvent & {
    response?: any;
    error?: ErrorObject;
}

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
export type PushEventDTO = Omit<DTO<PushEvent>,"credentials"> & { credentials: CredentialsDTO };
export type ResultEventDTO = Omit<DTO<ResultEvent>,"credentials"> & { credentials: CredentialsDTO };
export type AutoTriggerEventDTO = DTO<AutoTriggerEvent>;

export type PushEventHandler = (pushes: PushEvent[]) => Promise<any>;
export type ScheduleEventHandler = (schedules: ScheduleEvent[]) => Promise<any>;
export type ResultEventHandler = (results: ResultEvent[]) => Promise<any>;
export type AutoTriggerEventHandler = (autoTriggers: AutoTriggerEvent[]) => Promise<any>;