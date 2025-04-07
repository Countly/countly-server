import { ObjectId } from "mongodb";
import { SomeCredential } from "./credentials";
import { ProxyConfiguration } from "./proxy";
import { AutoTrigger } from "./message";
import { PlatformKeys, PlatformEnvKeys } from "./message";

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
    saveResult: boolean;
    platform: PlatformKeys;
    env: PlatformEnvKeys;
    language: string;
    credentials: SomeCredential;
    proxy?: ProxyConfiguration;
}

export interface ResultEvent extends PushEvent {
    response?: any;
    error?: ResultError;
}

export interface ResultError {
    name: string;
    message: string;
    stack?: string;
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

export interface ApiTriggerEvent extends BaseTriggerEvent {
    kind: "api";
    messageId: ObjectId;
}

export type AutoTriggerEvent = CohortTriggerEvent|EventTriggerEvent|ApiTriggerEvent;

type Optional<T> = T|undefined;
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
export type CredentialsDTO = DTO<SomeCredential>;
export type PushEventDTO = Omit<DTO<PushEvent>,"credentials"> & { credentials: CredentialsDTO };
export type ResultEventDTO = Omit<DTO<ResultEvent>,"credentials"> & { credentials: CredentialsDTO };
export type AutoTriggerEventDTO = DTO<AutoTriggerEvent>;

export type PushEventHandler = (pushes: PushEvent[]) => Promise<void>;
export type ScheduleEventHandler = (schedules: ScheduleEvent[]) => Promise<void>;
export type ResultEventHandler = (results: ResultEvent[]) => Promise<void>;
export type AutoTriggerEventHandler = (autoTriggers: AutoTriggerEvent[]) => Promise<void>;