import { ObjectId } from "mongodb";
import { Result, Content, MessageAudienceFilter } from "./message";
import { ErrorObject } from "./utils";

export interface AudienceFilter extends MessageAudienceFilter {
    // these are inherited from MessageAudienceFilter
    // user?: string;
    // drill?: string;
    // geos?: ObjectId[];
    // cohorts?: string[];
    uids?: string[];
    cap?: {
        /** Maximum number of messages per user. If not set, no cap is applied. */
        maxMessages?: number;
        /** Minimum time between messages to the same user in milliseconds. If not set, no minimum time is applied. */
        minTime?: number;
        messageId: ObjectId;
    };
    // this is required for the cohort trigger with "cancel: true" option
    // it is used to determine the current cohort status of the user
    // so that we can cancel the scheduled message if the user is no longer in the cohort
    // when the message is being sent
    userCohortStatuses?: Array<{
        uid: string;
        cohort: {
            id: string;
            status: "in"|"out";
        };
    }>;
}

export interface MessageOverrides {
    contents?: Content[];
    variables?: { [key: string]: any; };
}

export interface Schedule {
    _id: ObjectId;
    appId: ObjectId;
    messageId: ObjectId;
    // this is main scheduled time for the schedule in countly server timezone
    scheduledTo: Date;
    /** If true, the schedule event will be moved to the next day if the scheduled time has already passed. This property is important for the timezone-aware schedules. */
    rescheduleIfPassed?: boolean;
    timezoneAware: boolean;
    schedulerTimezone?: number;
    audienceFilter?: AudienceFilter;
    messageOverrides?: MessageOverrides;
    status:
        "scheduled" | // Scheduled but not yet sent. Waiting for the scheduled time
        "sending"   | // Currently sending. Will be set to "sent" or "failed" when finished
        "sent"      | // Some messages (or all messages) are sent. No further action for this schedule
        "canceled"  | // Canceled and not sent. No further action for this schedule
        "failed";     // All messages failed to send. No further action for this schedule
    result: Result;
    events: Array<{
        status: "scheduled"|"composed"|"failed";
        // this is the timezone adjusted schedule date for the event to be received
        scheduledTo: Date;
        timezone?: string;
        error?: ErrorObject;
    }>;
}
