import { ObjectId } from "mongodb";

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
    actuals?: boolean;
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

export interface AndroidMessageContent {
    data: {
        title?: string; // message title
        message?: string; // message content
        "c.i": string; // message id as string
        "c.m"?: string; // message media url
        "c.l"?: string; // message link url
        "c.b"?: string; // buttons: stringified array of objects in the form of: Array<{ t: string; l: string; }>; (button text and link)
        "c.li"?: string; // message icon
        badge?: string; // badge: stringified badge number
        sound?: string;
        // keeping this here for "custom json data" and "extra user properties"
        [key: string]: any;
        // test: 'custom json data for android', // custom json
        // "c.e.cc": string; // extra user property: country code
        // "c.e.cty": string; // extra user property: city
    }
    // EXAMPLE:
    // data: {
    //     'c.i': '689607f8899e1ae6f88173cc',
    //     'c.m': 'https://www.someurl.com/something.png',
    //     sound: 'default',
    //     badge: 32,
    //     'c.l': 'https://www.someurl.com',
    //     title: 'message title',
    //     message: 'message content',
    //     'c.b': [{ t: 'button text', l: 'https://www.someurl.com' } ],
    //     test: 'custom json data',
    //     'c.e.cc': 'us',
    //     'c.e.cty': 'Böston 墨尔本',
    //     'c.e.src': 'Android',
    //     'c.li': 'test-icon'
    // }
}

export interface IOSMessageContent {
    aps: {
        "mutable-content"?: number; // gets set to 1 if the message has media or buttons
        sound?: string; // sound file name, default is 'default'
        badge?: number; // badge number
        alert?: {
            title?: string; // message title
            body?: string; // message content
            subtitle?: string; // message subtitle
        };
        "content-available"?: number; // set to 1 for silent push
    },
    c: {
        i: string; // message id as string
        a?: string; // message media url
        l?: string; // message link url
        b?: Array<{ // buttons
            t: string; // button text
            l: string; // button link
        }>;
        e?: { // extra user properties like: country code, city, source, etc.
            [key: string]: any;
            // av: "0:0" // extra user property: app version
        };
    },
    [key: string]: any; // custom json data
    // NORMAL MESSAGE EXAMPLE:
    // aps: {
    //     'mutable-content': 1,
    //     sound: 'default',
    //     badge: 12,
    //     alert: {
    //         title: 'message title',
    //         body: 'message content',
    //         subtitle: 'message subtitle'
    //     },
    //     'content-available': 1
    // },
    // c: {
    //     i: '689607f8899e1ae6f88173cc',
    //     a: 'https://someurl.com/something.png',
    //     l: 'https://someurl.com/',
    //     b: [{ t: 'button text', l: 'https://www.someurl.com' }],
    //     e: { av: '0:0' }
    // },
    // test: 'custom json data'
    //
    // SILENT MESSAGE EXAMPLE:
    // aps: { badge: 32, 'content-available': 1 },
    // c: {
    //   i: '689624ae899e1ae6f88173d7',
    //   e: { did: '426BCD17-3820-4D69-A8FC-F2C491817A74' }
    // },
    // test: 'custom json data'
}

export interface HuaweiMessageContent {
    message: {
        data: string; // JSON stringified data. should be in the form of: AndroidMessageContent.data
        android: {};
        token?: string[]; // Huawei device token. being included in huawei push sender.
    }
    // EXAMPLE:
    // message: {
    //   data: '{"c.i":"689607f8899e1ae6f88173cc","c.m":"https://www.someurl.com/something.png","title":"message title","message":"message content","c.b":[{"t":"message text"}]}',
    //   android: {}
    // }
}

export type PlatformMessageContent = AndroidMessageContent | IOSMessageContent | HuaweiMessageContent;

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

// TODO: remove this. use self referencing type instead
// To avoid circular referencing:
// export type SubSubResult = BaseResult & { subs: { [key: string]: any } }; // "sub" in here is not being used
// export type SubResult = BaseResult & { subs: { [key: string]: SubSubResult } };
// export type Result = BaseResult & { subs: { [key: string]: SubResult } };

export interface ErrorObject {
    name: string;
    message: string;
    stack?: string;
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
