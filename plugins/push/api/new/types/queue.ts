import { ObjectId } from "mongodb";
import { PlatformCredential } from "./credentials";
import { ProxyConfiguration } from "./utils";
import { AutoTrigger, MessageTrigger } from "./message";
import { PlatformKey, PlatformEnvKey } from "./message";
import { ErrorObject } from "./message";

export interface AndroidMessagePayload {
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

export interface IOSMessagePayload {
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

export interface HuaweiMessagePayload {
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

export type PlatformMessagePayload = AndroidMessagePayload | IOSMessagePayload | HuaweiMessagePayload;

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
    payload: PlatformMessagePayload; // actual message to be sent. data structure depends on the platform
    saveResult: boolean;
    platform: PlatformKey;
    env: PlatformEnvKey;
    language: string;
    credentials: PlatformCredential;
    proxy?: ProxyConfiguration;
    platformConfiguration: PlatformConfig;
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
}

export interface HuaweiResultEvent extends HuaweiPushEvent {
    response?: any;
    error?: ErrorObject;
}

export interface IOSResultEvent extends IOSPushEvent {
    response?: any;
    error?: ErrorObject;
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

export type PushEventHandler = (pushes: PushEvent[]) => Promise<any>;
export type ScheduleEventHandler = (schedules: ScheduleEvent[]) => Promise<any>;
export type ResultEventHandler = (results: ResultEvent[]) => Promise<any>;
export type AutoTriggerEventHandler = (autoTriggers: AutoTriggerEvent[]) => Promise<any>;









