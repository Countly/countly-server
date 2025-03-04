import { ObjectId } from "mongodb";
import { SomeCredential } from "./credentials";
import { ProxyConfiguration } from "./proxy";
import { PlatformKeys } from "./message";

export interface ScheduleEvent {
    appId: ObjectId;
    messageId: ObjectId;
    scheduleId: ObjectId;
    scheduledTo: Date;
    startedAt?: Date;
    finishedAt?: Date;
    timezone?: string;
}
export interface PushEvent {
    appId: ObjectId;
    messageId: ObjectId;
    scheduleId: ObjectId;
    uid: string;
    token: string;
    message: any;
    platform: PlatformKeys;
    credentials: SomeCredential;
    proxy?: ProxyConfiguration;
}
export interface ResultEvent extends PushEvent {
    result: any;
    error?: string;
}

type DTO<T> = { [P in keyof T]: T[P] extends ObjectId|Date ? string : T[P] }
export type ScheduleEventDTO = DTO<ScheduleEvent>;
export type CredentialsDTO = DTO<SomeCredential>;
export type PushEventDTO = Omit<DTO<PushEvent>,"credentials"> & { credentials: CredentialsDTO };
export type ResultEventDTO = Omit<DTO<ResultEvent>,"credentials"> & { credentials: CredentialsDTO };

export type PushEventHandler = (push: PushEvent) => Promise<void>;
export type ScheduleEventHandler = (schedule: ScheduleEvent) => Promise<void>;
export type ResultEventHandler = (results: ResultEvent[]) => Promise<void>;

export interface PushQueue {
    init(
        onPushMessage: PushEventHandler,
        onMessageSchedule: ScheduleEventHandler,
        onMessageResults: ResultEventHandler,
        isMaster: Boolean,
    ): Promise<void>;
    sendScheduleEvent(scheduleEvent: ScheduleEvent): Promise<void>;
    sendPushEvent(pushEvent: PushEvent): Promise<void>;
    sendResultEvent(resultEvent: ResultEvent): Promise<void>;
}