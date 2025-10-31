import { ObjectId } from "mongodb";
import { ErrorObject } from "./utils";

export type PlatformKey = "a"|"i"|"h"; // android|ios|huawei
export type PlatformEnvKey = "p"|"d"|"a"; // production|debug|adhoc
export type PlatformCombinedKeys = "ap"|"hp"|"ip"|"id"|"ia";

export interface MessageAudienceFilter {
    user?: string;
    drill?: string;
    geos?: ObjectId[];
    cohorts?: string[];
}

export interface BaseTrigger {
    kind:
        "plain" | // One-time message
        "event" | // Automated on-event message
        "cohort"| // Automated on-cohort message
        "api"   | // API (Transactional) message
        "rec"   | // Recurring message
        "multi";  // Multiple times
    start: Date;
}

export interface BaseAutoTrigger extends BaseTrigger {
    kind: "event"|"api"|"cohort";
    end?: Date;
    time?: number; // Delivery time in milliseconds (from clock input)
    reschedule?: boolean;
    delay?: number; // Delivery method: Delayed in milliseconds (from days and hours inputs)
    cap?: number; // Capping: Capped: Maximum number of messages per user
    sleep?: number; // Capping: Capped: Minimum time between messages
}

export interface ReschedulingTrigger extends BaseTrigger {
    kind: "rec"|"multi";
    delayed?: boolean;
    reschedule?: boolean;
}

export interface PlainTrigger extends BaseTrigger {
    kind: "plain";
    tz?: boolean;
    sctz?: number; // exists only if tz: true
    delayed?: boolean;
    reschedule?: boolean;
}

export interface EventTrigger extends BaseAutoTrigger {
    kind: "event";
    events: string[];
}

export interface CohortTrigger extends BaseAutoTrigger {
    kind: "cohort";
    cohorts: string[];
    entry?: boolean;
    cancels?: boolean; // Behavior when trigger condition is no longer met. "Send anyway": false. "Cancel when user exists selected cohort"
}

export interface APITrigger extends BaseAutoTrigger {
    kind: "api";
}

export type AutoTrigger = EventTrigger|CohortTrigger|APITrigger;

export interface RecurringTrigger extends ReschedulingTrigger {
    kind: "rec";
    end?: Date;
    bucket: "daily"|"weekly"|"monthly";
    time: number;
    every: number;
    on?: number[];
    tz: boolean;
    sctz: number;
}

export interface MultiTrigger extends ReschedulingTrigger {
    kind: "multi";
    dates: Date[];
    tz?: boolean;
    sctz?: number;
}

export type MessageTrigger = PlainTrigger | EventTrigger | CohortTrigger | APITrigger | RecurringTrigger | MultiTrigger;

export interface PersonalizationObject {
    k?: string; // key
    c?: boolean; // capitalize
    f?: string; // fallback
    t?: string; // type
}

export interface ContentButton {
    url: string;
    title: string;
    pers?: { [key: string]: PersonalizationObject };
}

export interface Content {
    p?: PlatformKey;
    la?: string;
    title?: string;
    titlePers?: { [key: string]: PersonalizationObject };
    message?: string;
    messagePers?: { [key: string]: PersonalizationObject };
    sound?: string;
    badge?: number;
    // TODO: data: {type: 'JSON', required: false, nonempty: true},
    data?: string;
    extras?: string[];
    expiration?: number;
    url?: string;
    media?: string;
    mediaMime?: string;
    buttons?: ContentButton[];
    specific?: { [key: string]: string|number|boolean; }[];
}

export interface Result {
    subs?: { [key: string]: Result };
    total: number;
    sent: number;
    actioned: number;
    failed: number;
    errors: { [key: string]: number; };
    // for message: the error occured before the message's last schedule. this error should also change message's status to "failed"
    // for schedule: the error encountered before composing starts. this error should also change schedule's status to "failed"
    error?: ErrorObject;
}

export interface Info {
    title?: string;
    appName?: string;
    silent?: boolean;
    scheduled?: boolean;
    locales?: { [key: string]: number };
    created?: Date;
    createdBy?: ObjectId;
    createdByName?: string;
    updated?: Date;
    updatedBy?: ObjectId;
    updatedByName?: string;
    removed?: Date;
    removedBy?: ObjectId;
    removedByName?: string;
    started?: Date;
    startedLast?: Date;
    finished?: Date;
    demo?: boolean;
    // these are being added by push_approver:
    approved?: Date;
    approvedBy?: ObjectId;
    approvedByName?: string;
    rejectedAt?: Date;
    rejectedBy?: ObjectId;
    rejectedByName?: string;
}

export interface Message {
    _id: ObjectId;
    app: ObjectId;
    saveResults: boolean;
    platforms: PlatformKey[];
    status:
        // Active, can be sent. If this message is an API, Cohort or Event message,
        // this means it will be sent when appropriate. If its a Plain, Recurring or
        // Multi message, check its last schedule's status for more details.
        "active"    |
        // Waiting for approval. This message cannot be sent until it is approved.
        "inactive"  |
        // Rejected by the approver. This message cannot be sent until it is approved again.
        "rejected"  |
        // Cannot be sent, can only be duplicated
        "draft"     |
        // Stopped sending (one time from UI)
        "stopped"   |
        // Deleted
        "deleted";
        // these are being calculated from the last schedule's status:
        // 'scheduled' Will be sent when appropriate (there's at least one unfinished schedule for this message)
        // 'sending'   Sending right now (one of the schedules of this message is being sent right now)
        // 'sent'      Some messages were sent, no further actions
        // 'canceled'  Last schedule was canceled, no further actions (not being used right now)
        // 'failed';   All push messages failed to send, no further actions
    filter?: MessageAudienceFilter;
    triggers: MessageTrigger[];
    contents: Content[];
    result: Result;
    info: Info;
}
