import { ObjectId } from "mongodb";
import { Result, Content, ErrorObject } from "./message";
import { ScheduleEvent } from "./queue";

export interface AudienceFilters {
    uids?: string[];
    user?: string; // JSON
    drill?: string; // JSON
    geos?: ObjectId[];
    cohorts?: string[];
    cap?: {
        maxMessages?: number; // Maximum number of messages per user.
        minTime?: number; // Minimum time between messages in milliseconds.
        messageId: ObjectId; // Message ID
    };
}

export interface MessageOverrides {
    contents?: Content[];
    variables?: { [key: string]: any; };
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
    status:
        "scheduled" | // Scheduled but not yet sent. Waiting for the scheduled time
        "sending"   | // Currently sending. Will be set to "sent" or "failed" when finished
        "sent"      | // Some messages (or all messages) are sent. No further action for this schedule
        "canceled"  | // Canceled and not sent. No further action for this schedule
        "failed";     // All messages failed to send. No further action for this schedule
    result: Result;
    events: {
        scheduled: (Pick<ScheduleEvent,"timezone"|"scheduledTo">&{date: Date})[];
        composed: (Pick<ScheduleEvent,"timezone"|"scheduledTo">&{date: Date})[];
    };
}
