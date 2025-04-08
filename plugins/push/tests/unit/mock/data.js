/**
 * @typedef {import("../../../api/new/types/message.ts").Message} Message
 * @typedef {import("../../../api/new/types/message.ts").RecurringTrigger} RecurringTrigger
 * @typedef {import("../../../api/new/types/message.ts").PlainTrigger} PlainTrigger
 * @typedef {import("../../../api/new/types/schedule.ts").Schedule} Schedule
 * @typedef {import("../../../api/new/types/queue.ts").ScheduleEvent} ScheduleEvent
 * @typedef {import("../../../api/new/types/user.js").User} User
 */
const { ObjectId } = require("mongodb");

module.exports = {
    /**
     * @returns {Schedule}
     */
    schedule() {
        return {
            _id: new ObjectId,
            appId: new ObjectId,
            messageId: new ObjectId,
            scheduledTo: new Date,
            timezoneAware: true,
            schedulerTimezone: 180,
            status: "scheduled",
            result: {
                actioned: 0,
                total: 0,
                errored: 0,
                sent: 0,
                errors: {},
                subs: {}
            }
        }
    },
    /**
     * @returns {ScheduleEvent}
     */
    scheduleEvent() {
        return {
            appId: new ObjectId,
            messageId: new ObjectId,
            scheduleId: new ObjectId,
            scheduledTo: new Date,
            timezone: "180"
        };
    },
    /**
     * @returns {PlainTrigger}
     */
    plainTrigger() {
        return {
            kind: "plain",
            start: new Date,
        }
    },
    /**
     * @returns {RecurringTrigger}
     */
    dailyRecurringTrigger() {
        return {
            kind: "rec",
            bucket: "daily",
            time: 53100000, // 14:45
            start: new Date("2024-02-01T09:00:00.000+03:00"),
            every: 5,
            end: new Date("2024-03-09T08:00:00.000+03:00"),
            tz: true,
            sctz: -180,
        }
    },
    /**
     * @returns {RecurringTrigger}
     */
    weeklyRecurringTrigger() {
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
        }
    },
    /**
     * @returns {RecurringTrigger}
     */
    monthlyRecurringTrigger() {
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
        }
    },
    /**
     * @returns {User}
     */
    appUser() {
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
        }
    },
    /**
     * @returns {Message}
     */
    message() {
        return {
            _id: new ObjectId,
            app: new ObjectId,
            platforms: ["a"],
            state: 1,
            status: "created",
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
                errored: 0,
                errors: {},
                subs: {
                    a: {
                        total: 1,
                        actioned: 0,
                        sent: 1,
                        errored: 0,
                        errors: {},
                        subs: {
                            en: {
                                total: 1,
                                sent: 1,
                                actioned: 0,
                                errored: 0,
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
        }
    },
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
    /**
     * @returns {Message}
     */
    parametricMessage() {
        return {
            ...this.message(),
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
                        "25": {
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
                    message: "en message content var1:   some text",
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
        }
    }
}
