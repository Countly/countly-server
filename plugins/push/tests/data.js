const { ObjectID } = require('bson');

const d = Date.now(),
    {hash} = require('../api/send').util;

module.exports = {
    compilation: [
        {_id: 1, n: 'n1', u: 'u1', t: 't1', d, p: {}},
        {_id: 2, n: 'n1', u: 'u2', t: 't2', d, p: {la: 'en'}},
        {_id: 3, n: 'n1', u: 'u2', t: 't2', d, p: {la: 'en'}, o: {sound: 'sound.wav'}},
        {_id: 4, n: 'n1', u: 'u2', t: 't2', d, p: {}, o: {sound: 'sound.wav', data: '{"a": 2}'}},
        {_id: 5, n: 'n1', u: 'u3', t: 't3', d, p: {la: 'en', name: 'n3', 'custom.arr': ['a', 'b', 'c']}, o: {}},
        {_id: 6, n: 'n1', u: 'u4', t: 't4', d, p: {la: 'en', name: 'n4', 'custom.obj': {a: 10, x: 'x', y: 1}}},
    ],
    compilation_results: {
        i: [
            {c: {i: 'n1'}, aps: {sound: 'default', badge: 0, alert: {body: 'message/default'}}, a: 1, b: {c: 2}},
            {c: {i: 'n1'}, aps: {sound: 'default', badge: 0, alert: {body: 'message/en'}}, a: 1, b: {c: 2}},
            {c: {i: 'n1'}, aps: {sound: 'sound.wav', badge: 0, alert: {body: 'message/en'}}, a: 1, b: {c: 2}},
            {c: {i: 'n1'}, aps: {sound: 'sound.wav', badge: 0, alert: {body: 'message/default'}}, a: 2},
            {c: {i: 'n1', e: {name: 'n3', 'custom.arr': ['a', 'b', 'c']}}, aps: {sound: 'default', badge: 0, alert: {body: 'message/en'}}, a: 1, b: {c: 2}},
            {c: {i: 'n1', e: {name: 'n4', 'custom.obj': {a: 10, x: 'x', y: 1}}}, aps: {sound: 'default', badge: 0, alert: {body: 'message/en'}}, a: 1, b: {c: 2}},
        ]
    },

    personalization: [
        {_id: 1, n: 'n5', u: 'u1', t: 't1', d, p: {}},
        {_id: 2, n: 'n5', u: 'u2', t: 't2', d, p: {la: 'en'}},
        {_id: 3, n: 'n5', u: 'u3', t: 't3', d, p: {la: 'en', name: 'n3', 'custom.sum': 5}},
        {_id: 4, n: 'n5', u: 'u4', t: 't4', d, p: {la: 'en', name: 'n4', 'custom.arr': ['a', 'b', 'c'], 'custom.obj': {a: 'a', b: true, c: 3}}},
        {_id: 5, n: 'n5', u: 'u4', t: 't4', d, p: {la: 'en', name: 'n4', 'custom.sum': 12, 'custom.arr': ['a', 'b'], 'custom.obj': {a: 'a', b: false}}},
        {_id: 6, n: 'n5', u: 'u4', t: 't4', d, p: {la: 'en', name: 'n4', 'custom.sum': 12, 'custom.arr': ['a', 'b'], 'custom.obj': {a: 'a', b: false}}, o: {messagePerLocale: {en: 'Over/en', default: 'Over/default'}}},
        {_id: 7, n: 'n5', u: 'u4', t: 't4', d, p: {la: 'en', name: 'n4', 'custom.sum': 12, 'custom.arr': ['a', 'b'], 'custom.obj': {a: 'a', b: false}}, o: {a: 2, name: 'Over/User', 'custom.arr': 'x'}},
    ],

    notes: {
        n1: {_id: 'n1', platforms: ['i', 't'], sound: 'default', badge: 0, data: '{"a": 1, "b": {"c": 2}}', expiration: 1000 * 3600 * 4, messagePerLocale: {default: 'message/default', en: 'message/en'}, extras: ['name', 'custom.arr', 'custom.obj']},
        // ultimate personalization / compilation test: message with "name" & "custom.sum" personalization, 2 locales, single title for all messages, extras & overrides
        n5: {
            _id: 'n5',
            platforms: ['i', 't'],
            sound: 'default',
            messagePerLocale: {
                default: 'Hello, \nHere\'s your  message',
                'default|p': {
                    '7': {
                        f: 'User',
                        c: true,
                        k: 'name'
                    },
                    '20': {
                        f: '0',
                        c: false,
                        k: 'custom.sum'
                    }
                },
                'default|t': 'Single title',
                en: 'Hello, \nHere\'s your english message',
                'en|p': {
                    '7': {
                        f: 'User',
                        c: true,
                        k: 'name'
                    }
                },
            },
            data: '{"a": 1, "b": {"c": 2}}',
            extras: ['name', 'custom.sum', 'custom.arr', 'custom.obj']
        },
    },

    // app_usersAPPID collection
    users: [
        {_id: 'id1', uid: 'u1', la: 'en', name: 'name1', tktp: true, tktt: true, custom: {sum: 12, arr: ['a', 'b', 'c'], obj: {a: 'a', b: true, c: 3}}},
        {_id: 'id2', uid: 'u2', la: 'en', name: 'name2', tktp: true},
        {_id: 'id2', uid: 'u3', la: 'de', tktp: true},
        {_id: 'id2', uid: 'u4', la: 'de', name: 'Till'},
    ],

    // push_APPID collection
    tokens: [
        {_id: 'id1', uid: 'u1', la: 'en', tk: {tp: 'prod 1', tt: 'test 1'}},
        {_id: 'id2', uid: 'u2', la: 'en', tk: {tp: 'prod 2'}},
        {_id: 'id2', uid: 'u3', la: 'de', tk: {tp: 'prod 3'}},
        {_id: 'id2', uid: 'u10', la: 'en', tk: {}},
        {_id: 'id2', uid: 'u11', la: '', tk: null},
        {_id: 'id2', uid: 'u12'},
    ],

    migration: [
        {
            "_id": ObjectID("608947c6bbe31a5c90ebc8af"),
            "apps": [
                ObjectID("5fbb72974e19c6614411d95f")
            ],
            "appNames": [
                "Halu"
            ],
            "platforms": [
                "a"
            ],
            "source": "dash",
            "delayed": true,
            "result": {
                "status": 1,
                "total": 0,
                "processed": 0,
                "sent": 0,
                "errors": 0,
                "error": null,
                "errorCodes": {
                },
                "resourceErrors": [ ],
                "aborts": [ ],
                "nextbatch": null
            },
            "expiration": 604800000,
            "date": Date("2021-04-28T11:36:34.655Z"),
            "tz": false,
            "tx": false,
            "auto": false,
            "actualDates": false,
            "created": Date("2021-04-28T11:36:34.655Z"),
            "test": false,
            "v": 190600,
            "build": {
                "total": 1,
                "count": {
                    "en": 1
                }
            },
            "badge": 5,
            "buttons": 2,
            "creator": "5fbb71e24ca6bb618088af89",
            "data": "{\"some\":\"data\"}",
            "media": "https://www.google.com/images/branding/googlelogo/2x/googlelogo_color_272x92dp.png",
            "mediaMime": "image/png",
            "messagePerLocale": {
                "default|t": "Default hello, \n",
                "default|0|t": "Default 1",
                "default|1|t": "Default 2",
                "default|0|l": "some://default_1",
                "default|1|l": "some://default_2",
                "en|0|t": "En 1",
                "en|1|t": "En 2",
                "en|0|l": "some://en_1",
                "en|1|l": "",
                "default|tp": {
                    "15": {
                        "f": "username_fallback",
                        "c": false,
                        "k": "username"
                    }
                },
                "default": "Here's your default message, Mr. !\n",
                "default|p": {
                    "33": {
                        "f": "email_fallback",
                        "c": false,
                        "k": "email"
                    }
                },
                "en": "And here's your English message, Mr. !\n",
                "en|p": {
                    "37": {
                        "f": "city_fallback",
                        "c": false,
                        "k": "cty"
                    }
                }
            },
            "sound": "default",
            "type": "message",
            "url": "some://url"
        },
        {
            "_id": ObjectID("608ac9b0f580a4838f2fef6f"),
            "apps": [
                ObjectID("5fbb72974e19c6614411d95f")
            ],
            "appNames": [
                "Halu"
            ],
            "platforms": [
                "a"
            ],
            "source": "dash",
            "delayed": true,
            "result": {
                "status": 41,
                "total": 1,
                "processed": 1,
                "sent": 1,
                "errors": 0,
                "error": null,
                "errorCodes": {
                },
                "resourceErrors": [ ],
                "aborts": [ ],
                "nextbatch": 1619708345599
            },
            "expiration": 604800000,
            "date": Date("2021-04-29T14:59:05.599Z"),
            "tz": false,
            "tx": false,
            "auto": false,
            "actualDates": false,
            "created": Date("2021-04-29T14:59:05.599Z"),
            "test": false,
            "v": 190600,
            "build": {
                "total": 1,
                "count": {
                    "en": 1
                }
            },
            "buttons": 0,
            "creator": "5fbb71e24ca6bb618088af89",
            "data": "{\"some\":\"data\"}",
            "type": "data",
            "jobs": [ ]
        },
        {
            "_id": ObjectID("6018174dac6e94947818c8a3"),
            "type": "message",
            "apps": [
                ObjectID("5fbb72974e19c6614411d95f")
            ],
            "appNames": [
                "Halu"
            ],
            "platforms": [
                "a"
            ],
            "source": "dash",
            "delayed": true,
            "messagePerLocale": {
                "default|0|t": "Button 1",
                "default|1|t": "Button 2",
                "default": "123",
                "default|p": {
                }
            },
            "sound": "default",
            "buttons": 0,
            "result": {
                "status": 35,
                "total": 7,
                "processed": 7,
                "sent": 2,
                "errors": 5,
                "errorCodes": {
                    "skiptz": 5
                },
                "resourceErrors": [ ],
                "aborts": [ ],
                "nextbatch": null,
                "actioned": 2,
                "actioned|0": 2
            },
            "expiryDate": new Date("2021-02-08T14:59:32.705Z"),
            "date": new Date("2021-02-01T14:59:32.705Z"),
            "tz": false,
            "tx": true,
            "auto": false,
            "actualDates": false,
            "created": new Date("2021-02-01T14:59:32.705Z"),
            "test": false,
            "v": 190600,
            "creator": "5fbb71e24ca6bb618088af89",
            "jobs": [ ]
        },
        {
            "_id": ObjectID("6014208c6ca12c2a54f56cea"),
            "apps": [
                ObjectID("5fbb72974e19c6614411d95f")
            ],
            "appNames": [
                "Halu"
            ],
            "platforms": [
                "a"
            ],
            "source": "dash",
            "delayed": true,
            "result": {
                "status": 1049,
                "total": 1,
                "processed": 0,
                "sent": 0,
                "errors": 1,
                "error": "ECONNREFUSED",
                "errorCodes": {
                    "aborted": 1
                },
                "resourceErrors": [
                    {
                        "date": 1611931796149,
                        "field": "ap",
                        "error": "closed"
                    },
                    {
                        "date": 1611931796153,
                        "field": "ap",
                        "error": "ECONNREFUSED"
                    },
                    {
                        "date": 1611931796165,
                        "field": "ap",
                        "error": "ECONNREFUSED"
                    },
                    {
                        "date": 1611931797726,
                        "field": "ap",
                        "error": "closed"
                    },
                    {
                        "date": 1611931797745,
                        "field": "ap",
                        "error": "ECONNREFUSED"
                    }
                ],
                "aborts": [
                    {
                        "date": 1611931797745,
                        "field": "ap",
                        "error": "ECONNREFUSED"
                    }
                ],
                "nextbatch": 1611931856154
            },
            "expiryDate": new Date("2021-02-05T14:49:53.109Z"),
            "date": new Date("2021-01-29T14:49:53.109Z"),
            "tz": false,
            "tx": false,
            "auto": false,
            "actualDates": false,
            "created": new Date("2021-01-29T14:49:53.109Z"),
            "test": false,
            "v": 190600,
            "build": {
                "total": 1,
                "count": {
                    "en": 1
                }
            },
            "buttons": 0,
            "creator": "5fbb71e24ca6bb618088af89",
            "messagePerLocale": {
                "default|0|t": "Button 1",
                "default|1|t": "Button 2",
                "default": "123",
                "default|p": {
                }
            },
            "sound": "default",
            "type": "message",
            "jobs": [ ]
        }
    ]
};

['compilation', 'personalization'].forEach(k => {
    module.exports[k].forEach(p => {
        p.h = hash(p.p, p.o ? hash(p.o) : 0);
    });
});