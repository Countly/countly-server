import { ObjectId } from "mongodb";

export type PlatformKeys = "a"|"i"|"h"; // android|ios|huawei
export type PlatformFieldKeys = "p"|"d"|"a"; // production|development|adhoc

export interface MessageAudienceFilter {
    // TODO: user: { type: 'JSON', required: false, nonempty: true, custom: Filter.filterQueryValidator },
    user?: string;
    // TODO: drill: { type: 'JSON', required: false, nonempty: true, custom: Filter.filterQueryValidator },
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
        "multi"   // Multiple times
    start: Date;
    last?: Date;
}

export interface AutoTrigger extends BaseTrigger {
    end?: Date;
    actuals?: boolean;
    time?: number;
    reschedule?: boolean;
    delay?: number;
    cap?: number;
    sleep?: number;
}

export interface ReschedulingTrigger extends BaseTrigger {
    tz?: boolean;
    sctz?: number;
    delayed?: boolean;
    reschedule?: boolean;
    last?: Date;
    prev?: Date;
}

export interface PlainTrigger extends BaseTrigger {
    tz?: boolean;
    sctz?: number;
    delayed?: boolean;
}

export interface EventTrigger extends AutoTrigger {
    events: string[];
}

export interface CohortTrigger extends AutoTrigger {
    cohorts: string[];
    entry?: boolean;
    cancels?: boolean;
}

export interface APITrigger extends AutoTrigger {
    
}

export interface RecurringTrigger extends ReschedulingTrigger {
    sctz: number;
    end?: Date;
    bucket: "daily"|"weekly"|"monthly";
    time: number;
    every: number;
    on?: number[];
}

export interface MultiTrigger extends ReschedulingTrigger {
    dates: Date[];
}

export type MessageTrigger = PlainTrigger | EventTrigger | CohortTrigger | APITrigger | RecurringTrigger;

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
    p?: string;
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
    specific?: { [key: string]: string|number|boolean }[];
}

// TODO: this has missing props
export interface MessageRun {
    start: Date;
    processed: number;
    errored: number;
}

export interface Result {
    total: number;
    processed: number;
    sent: number;
    actioned: number;
    errored?: number;
    virtual?: string;
    error?: any; // this is PushError most of the time
    errors?: { [key: string]: number }; // number of each error
    lastErrors?: any; // this is PushError[] most of the time
    lastRuns?: MessageRun[];
    next?: Date;
    subs?: { [key: string]: Result };
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
    submitted?: Date;
    submittedBy?: ObjectId;
    submittedByName?: string;
    approved?: Date;
    approvedBy?: ObjectId;
    approvedByName?: string;
    rejected?: boolean;
    rejectedAt?: Date;
    rejectedBy?: ObjectId;
    rejectedByName?: string;
    started?: Date;
    startedLast?: Date;
    finished?: Date;
    demo?: boolean;
}

export interface Message {
    _id: ObjectId;
    app: ObjectId;
    platforms: PlatformKeys[];
    state: number;
    status: string;
    filter?: MessageAudienceFilter;
    triggers: MessageTrigger[];
    contents: Content[];
    result: Result;
    info: Info;
}