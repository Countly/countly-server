import type { Message, RecurringTrigger, PlainTrigger, PlatformKey } from '../../api/models/message.ts';
import type { Schedule } from '../../api/models/schedule.ts';
import type { ScheduleEvent, PushEvent, ResultEvent, CohortTriggerEvent, EventTriggerEvent } from '../../api/models/queue.ts';
import type { User } from '../../api/lib/template.ts';
import type { FCMCredentials, APNP8Credentials, HMSCredentials } from '../../api/models/credentials.ts';
import type { ProxyConfiguration } from '../../api/lib/utils.ts';
import { ObjectId } from 'mongodb';

export function schedule(): Schedule {
    return {
        _id: new ObjectId,
        appId: new ObjectId,
        messageId: new ObjectId,
        scheduledTo: new Date,
        timezoneAware: true,
        schedulerTimezone: 180,
        status: "scheduled",
        events: [
            {
                scheduledTo: new Date,
                status: "scheduled",
            }
        ],
        result: {
            actioned: 0,
            total: 0,
            failed: 0,
            sent: 0,
            errors: {},
            subs: {}
        }
    };
}

export function scheduleEvent(): ScheduleEvent {
    return {
        appId: new ObjectId,
        messageId: new ObjectId,
        scheduleId: new ObjectId,
        scheduledTo: new Date,
        timezone: "180"
    };
}

export function plainTrigger(): PlainTrigger {
    return {
        kind: "plain",
        start: new Date,
    };
}

export function dailyRecurringTrigger(): RecurringTrigger {
    return {
        kind: "rec",
        bucket: "daily",
        time: 53100000, // 14:45
        start: new Date("2024-02-01T09:00:00.000+03:00"),
        every: 5,
        end: new Date("2024-03-09T08:00:00.000+03:00"),
        tz: true,
        sctz: -180,
    };
}

export function weeklyRecurringTrigger(): RecurringTrigger {
    return {
        kind: "rec",
        bucket: "weekly",
        time: 53100000, // 14:45
        start: new Date("2024-02-01T09:00:00.000+03:00"),
        tz: true,
        sctz: -180,
        every: 2,
        end: new Date("2024-03-15T09:00:00.000+03:00"),
        on: [2, 4, 5] // on monday, thursday, friday,
    };
}

export function monthlyRecurringTrigger(): RecurringTrigger {
    return {
        kind: "rec",
        bucket: "monthly",
        time: 53100000, // 14:45
        tz: true,
        sctz: -180,
        start: new Date("2024-02-01T09:00:00.000+03:00"),
        every: 3,
        end: new Date("2024-09-15T09:00:00.000+03:00"),
        on: [3, -1, 0, 20] // 0: last day of the month, -1: previous day of the last day
    };
}

export function appUser(): User {
    const uid = "1";
    return {
        uid,
        _id: uid,
        did: '0b5efc45fa4885ed',
        la: 'en',
        tz: '180',
        tk: [
            {
                _id: uid,
                tk: {
                    ap: "token"
                }
            }
        ],
        custom: {
            property: "lorem ipsum"
        },
        d: 'sdk_gphone64_arm64',
        dt: 'mobile',
        fs: 1700549799,
        loc: {
            gps: true,
            date: 1701081863696,
            geo: {
                type: 'Point',
                coordinates: [-46.6718331, -23.8043604]
            }
        },
        p: 'Android',
        src: 'Android',
        src_ch: 'Direct',
        lv: 'MainActivity',
        ornt: 'portrait',
        tkip: 404199324,
    };
}

export function message(): Message {
    return {
        _id: new ObjectId,
        app: new ObjectId,
        platforms: ["a"],
        status: "active",
        saveResults: true,
        triggers: [
            {
                kind: 'plain',
                start: new Date,
                tz: false,
                delayed: false
            }
        ],
        filter: {
            user: '{"message":{"$nin":["67b892be7b12b404b790efa1"]}}'
        },
        contents: [
            { title: 'title', message: 'message', expiration: 604800000 },
            { p: 'a', sound: 'default' }
        ],
        result: {
            total: 1,
            actioned: 0,
            sent: 1,
            failed: 0,
            errors: {},
            subs: {
                a: {
                    total: 1,
                    actioned: 0,
                    sent: 1,
                    failed: 0,
                    errors: {},
                    subs: {
                        en: {
                            total: 1,
                            sent: 1,
                            actioned: 0,
                            failed: 0,
                            errors: {},
                            subs: {}
                        }
                    }
                }
            }
        },
        info: {
            appName: "test",
            silent: false,
            scheduled: false,
            locales: { en: 1, default: 0, count: 1 },
            created: new Date,
            createdBy: new ObjectId,
            createdByName: "Test admin",
            updated: new Date,
            updatedBy: new ObjectId,
            updatedByName: "Test admin",
            started: new Date,
            startedLast: new Date,
            finished: new Date
        }
    };
}

/**
 * Bare Firebase service account JSON used for FCM credentials. Returns a plain
 * object so tests can inspect/encode it before assembling a credential.
 */
export function fcmServiceAccount(overrides: Record<string, any> = {}): Record<string, any> {
    return {
        type: "service_account",
        project_id: "countlydemo",
        private_key_id: "0000000000",
        private_key: "-----BEGIN PRIVATE KEY-----\nfakekey\n-----END PRIVATE KEY-----\n",
        client_email: "client@countlydemo.iam.gserviceaccount.com",
        client_id: "102258429722735018634",
        auth_uri: "https://accounts.google.com/o/oauth2/auth",
        token_uri: "https://oauth2.googleapis.com/token",
        auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
        client_x509_cert_url: "https://www.googleapis.com/robot/v1/metadata/x509/client_email",
        universe_domain: "googleapis.com",
        ...overrides,
    };
}

const JSON_DATA_URI_PREFIX = "data:application/json;base64,";

export function androidCredential(overrides: Partial<FCMCredentials> = {}): FCMCredentials {
    return {
        _id: new ObjectId,
        hash: "0f07c581fd44f570b7b4133c49656c714364f859a36d1f58d13a32338a1e1e11",
        type: "fcm",
        serviceAccountFile: JSON_DATA_URI_PREFIX
            + Buffer.from(JSON.stringify(fcmServiceAccount())).toString("base64"),
        ...overrides,
    };
}

export function iosCredential(overrides: Partial<APNP8Credentials> = {}): APNP8Credentials {
    return {
        _id: new ObjectId,
        type: "apn_token",
        hash: "ioshashvalue",
        bundle: "com.example.app",
        key: Buffer.from("-----BEGIN PRIVATE KEY-----\nfake\n-----END PRIVATE KEY-----").toString("base64"),
        keyid: "ABC123DEF4",
        team: "TEAM123456",
        ...overrides,
    };
}

export function huaweiCredential(overrides: Partial<HMSCredentials> = {}): HMSCredentials {
    return {
        _id: new ObjectId,
        type: "hms",
        app: "123456",
        secret: "a".repeat(64),
        // randomized so per-test token caches keyed by hash don't bleed across tests
        hash: "hmshash" + Math.random().toString(36).slice(2),
        ...overrides,
    };
}

export function proxyConfig(overrides: Partial<ProxyConfiguration> = {}): ProxyConfiguration {
    return {
        host: "proxy.com",
        port: "8080",
        auth: false,
        ...overrides,
    };
}

export function appUserMultiToken(): User {
    const uid = "multi";
    return {
        uid,
        _id: uid,
        did: 'multi-device',
        la: 'fr',
        tz: '60',
        tk: [
            {
                _id: uid,
                tk: {
                    ap: "android-token-123",
                    ip: "ios-token-456",
                }
            }
        ],
        d: 'iPhone15',
        dt: 'mobile',
        fs: 1700549799,
        p: 'iOS',
    };
}

export function appUserNoToken(): User {
    const uid = "notoken";
    return {
        uid,
        _id: uid,
        did: 'device-no-token',
        la: 'en',
        tz: '180',
        tk: [],
        d: 'sdk_gphone64_arm64',
        dt: 'mobile',
        fs: 1700549799,
        p: 'Android',
    };
}

export function appUserNoLanguage(): User {
    const uid = "nolang";
    return {
        uid,
        _id: uid,
        did: 'device-no-lang',
        tz: '180',
        tk: [
            {
                _id: uid,
                tk: { ap: "token-nolang" }
            }
        ],
        d: 'sdk_gphone64_arm64',
        dt: 'mobile',
        fs: 1700549799,
        p: 'Android',
    };
}

export function recurringMessage(): Message {
    return {
        ...message(),
        triggers: [dailyRecurringTrigger()],
    };
}

export function multiPlatformMessage(): Message {
    return {
        ...message(),
        platforms: ["a", "i"],
        contents: [
            { title: 'title', message: 'message', expiration: 604800000 },
            { p: 'a', sound: 'default' },
            { p: 'i', sound: 'default' },
        ],
    };
}

export function pushEvent(): PushEvent {
    return {
        appId: new ObjectId,
        messageId: new ObjectId,
        scheduleId: new ObjectId,
        token: "",
        saveResult: true,
        uid: "",
        platform: "a",
        env: "p",
        credentials: androidCredential(),
        payload: {
            data: {
                "c.i": "67c9bb34630cd98e0fb95a14",
                title: "test",
                message: "test",
                sound: "default"
            }
        },
        proxy: undefined,
        language: "en",
        appTimezone: "NA",
        trigger: plainTrigger(),
        platformConfiguration: {}
    };
}

export function iosPushEvent(overrides: Partial<PushEvent> = {}): PushEvent {
    return {
        ...pushEvent(),
        platform: "i",
        env: "p",
        credentials: iosCredential(),
        payload: {
            aps: { alert: { title: "test", body: "test" }, sound: "default" },
            c: { i: new ObjectId().toString() },
        },
        platformConfiguration: { setContentAvailable: false },
        ...overrides,
    } as PushEvent;
}

export function huaweiPushEvent(overrides: Partial<PushEvent> = {}): PushEvent {
    return {
        ...pushEvent(),
        platform: "h",
        credentials: huaweiCredential(),
        payload: {
            message: {
                data: '{"c.i":"test","title":"test","message":"test"}',
                android: {},
            },
        },
        platformConfiguration: {},
        ...overrides,
    } as PushEvent;
}

/**
 * Minimal Message-shaped doc for `mapMessageToPayload` tests in
 * `send/platforms/{android,ios,huawei}.test.ts`. The mappers only read `_id`
 * and `platforms`, so we don't need a full Message document here.
 */
export function mapperMessageDoc(platform: PlatformKey, overrides: Record<string, any> = {}): any {
    return {
        _id: new ObjectId(),
        app: new ObjectId(),
        platforms: [platform],
        status: "active",
        saveResults: true,
        triggers: [{ kind: "plain", start: new Date() }],
        filter: {},
        contents: [],
        result: { total: 0, sent: 0, actioned: 0, failed: 0, errors: {}, subs: {} },
        info: {},
        ...overrides,
    };
}

export function resultEvent(): ResultEvent {
    return {
        ...pushEvent(),
        response: "Android response",
        sentAt: new Date,
    };
}

export function cohortTriggerEvent(): CohortTriggerEvent {
    return {
        appId: new ObjectId,
        kind: "cohort",
        cohortId: "cohort id",
        uids: ["1", "2"],
        direction: "enter",
    };
}

export function eventTriggerEvent(): EventTriggerEvent {
    return {
        appId: new ObjectId,
        kind: "event",
        eventKeys: ["event1", "event2"],
        uid: "1",
    };
}

/*
AGGREGATION PIPELINE: [
  {
    "$match": {
      "$or": [
        {
          "tkap": {
            "$exists": true
          }
        },
        {
          "tkhp": {
            "$exists": true
          }
        }
      ]
    }
  },
  {
    "$match": {
      "uid": {
        "$in": [
          "1"
        ]
      }
    }
  },
  {
    "$project": {
      "dt": 1,
      "asdf.qwert": 1,
      "d": 1,
      "did": 1,
      "fs": 1,
      "la": 1,
      "uid": 1,
      "tk": 1,
      "tz": 1
    }
  },
  {
    "$sort": {
      "la": 1
    }
  },
  {
    "$lookup": {
      "from": "push_67b868f115891e7800e2f563",
      "localField": "uid",
      "foreignField": "_id",
      "as": "tk"
    }
  }
]
AGGREGATION RESULT: {
  "_id": "1",
  "did": "0b5efc45fa4885ed",
  "tz": "180",
  "d": "sdk_gphone64_arm64",
  "dt": "mobile",
  "fs": 1700549799,
  "la": "en",
  "uid": "1",
  "tk": [
    {
      "_id": "1",
      "msgs": {
        "67bc68c1e0eecf12eb8a9e90": [
          1740400835270
        ]
      },
      "tk": {
        "ap": "czM26brETrCuh-J2xWFJjv:APA91bEwqhq7VYTFhZCfbhn8AHLwzlax0t-XAv5Yk8xGtPtFd7TqAKD6HUGFzMKuo0D9Um8f51CKXZ6q21XUYWqqu1HzxDAVL8KziqW9ECxHqJslZ04ahpc"
      }
    }
  ]
}
NOTE: {
  "_id": "67bcd573d6ad2d12d1d23ef0",
  "a": "67b868f115891e7800e2f563",
  "m": "67bcd5736cb172aa14cfdea0",
  "p": "a",
  "f": "p",
  "u": "1",
  "t": "czM26brETrCuh-J2xWFJjv:APA91bEwqhq7VYTFhZCfbhn8AHLwzlax0t-XAv5Yk8xGtPtFd7TqAKD6HUGFzMKuo0D9Um8f51CKXZ6q21XUYWqqu1HzxDAVL8KziqW9ECxHqJslZ04ahpc",
  "pr": {
    "dt": "mobile",
    "d": "sdk_gphone64_arm64",
    "did": "0b5efc45fa4885ed",
    "fs": 1700549799,
    "la": "en"
  }
}
COMPILED: {
  "data": {
    "c.i": "67bcd5736cb172aa14cfdea0",
    "c.m": "https://cdn.prod.website-files.com/61c1b7c3e2f3805325be4594/63cc3bf4f604a36f748082ba_Logo%20-%20Light%20background.png",
    "title": "en message title",
    "sound": "awef",
    "badge": 423,
    "c.l": "http://google.com",
    "message": "en message content var1: Sdk_gphone64_arm64asdfasd",
    "c.b": [
      {
        "t": "enokbutton",
        "l": "http://google.com"
      }
    ],
    "custom": "json",
    "c.e.did": "0b5efc45fa4885ed",
    "c.e.fs": 1700549799,
    "c.li": "https://cdn.prod.website-files.com/61c1b7c3e2f3805325be4594/66c463f98ba261d454be2d2b_favcon.svg"
  }
}
*/

export function parametricMessage(): Message {
    return {
        ...message(),
        contents: [
            {
                title: "Default message title",
                message: "Default message content",
                messagePers: {
                    "24": {
                        f: "fallbackValue",
                        c: true,
                        k: "up.dt",
                        t: "u"
                    },
                    "29": {
                        f: "fallbackValue",
                        c: true,
                        k: "nonExisting.parameter",
                        t: "a"
                    }
                },
                expiration: 604800000,
                media: "https://example.com/image.png",
                mediaMime: "image/png",
                buttons: [
                    {
                        title: "<Default> Button",
                        url: "https://example.com"
                    }
                ]
            },
            {
                la: "en",
                title: "en message title",
                message: "en message content var1:  some text",
                messagePers: {
                    "25": {
                        f: "fallback",
                        c: true,
                        k: "up.d",
                        t: "u"
                    }
                },
                buttons: [
                    {
                        title: "<En> Button",
                        url: "https://example.com"
                    }
                ]
            },
            {
                p: "a",
                sound: "sound",
                badge: 423,
                data: '{"custom":"json"}',
                extras: ["did", "up.fs"],
                url: "https://example.com",
                media: "https://example.com/example-media.png",
                mediaMime: "image/png",
                specific: [
                    {
                        large_icon: "https://example.com/logo.png"
                    }
                ]
            }
        ]
    };
}
