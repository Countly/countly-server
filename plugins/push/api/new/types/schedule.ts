import { ObjectId } from "mongodb";
import { Result, Content } from "./message";

export interface AudienceFilters {
    uids?: string[];
    user?: string; // JSON
    drill?: string; // JSON
    geos?: ObjectId[];
    cohorts?: string[];
}

export interface MessageOverrides {
    contents: Content[];
    variables: { [key: string]: any; };
}

export interface Schedule {
    _id: ObjectId;
    appId: ObjectId;
    messageId: ObjectId;
    scheduledTo: Date;
    startedAt?: Date;
    finishedAt?: Date;
    timezoneAware: boolean;
    schedulerTimezone?: number;
    audienceFilters?: AudienceFilters;
    messageOverrides?: MessageOverrides;
    uids?: string[]; // user ids from app_users{appId} collection sent by cohort or event AutoTrigger
    status: "scheduled"|"started"|"sent"|"canceled";
    result: Result;
}
