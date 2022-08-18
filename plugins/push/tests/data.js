const { ObjectID } = require('bson');

const d = Date.now(),
    {hash} = require('../api/send').util;

function clone(smth, deep) {
    let r;

    if (smth === undefined) {
        r = undefined;
    }
    else if (smth === null) {
        r = null;
    }
    else if (Array.isArray(smth)) {
        if (!deep && (!smth.length || smth.filter(x => typeof x !== typeof smth[0]).length === 0)) {
            r = smth.slice();
        }
        else {
            r = [];
            smth.forEach(e => r.push(clone(e)));
        }
    }
    else if (smth instanceof Set) {
        r = new Set(smth);
    }
    else if (smth instanceof Date) {
        r = new Date(smth.getTime());
    }
    else if (typeof smth === 'object') {
        r = {};
        if (deep) {
            for (let k in smth) {
                r[clone(k)] = clone(smth[k]);
            }
        }
        else {
            r = Object.assign({}, smth);
        }
    }
    else if (['string', 'number'].indexOf(typeof smth) !== -1) {
        r = smth;
    }
    else {
        throw new Error(`Unsupported type for ${smth}`);
    }
    return r;
}

function randomize(source, length, custom) {
    return function(randomness) {
        let ret = [],
            l = length;
        while (l--) {
            ret.push(custom(clone(exp[source][Math.floor(exp[source].length * Math.random())]), randomness));
        }
        return ret;
    };
}

let a1 = ObjectID(),
    m1 = ObjectID(),
    m5 = ObjectID(),
    c1 = ObjectID();

let exp = module.exports = {
    compilation: [
        {_id: ObjectID(), a: a1, m: m1, u: 'u1', t: 't1', p: 't', f: 'p', d, pr: {}},
        {_id: ObjectID(), a: a1, m: m1, u: 'u2', t: 't2', p: 't', f: 'p', d, pr: {la: 'en'}},
        {_id: ObjectID(), a: a1, m: m1, u: 'u2', t: 't2', p: 't', f: 'p', d, pr: {la: 'en'}, c: [{sound: 'sound.wav'}]},
        {_id: ObjectID(), a: a1, m: m1, u: 'u2', t: 't2', p: 't', f: 'p', d, pr: {la: 'en'}, c: [{la: 'en', sound: 'sound.wav'}]},
        {_id: ObjectID(), a: a1, m: m1, u: 'u2', t: 't2', p: 't', f: 'p', d, pr: {la: 'en'}, c: [{la: 'de', sound: 'sound.wav'}]},
        {_id: ObjectID(), a: a1, m: m1, u: 'u2', t: 't2', p: 't', f: 'p', d, pr: {}, c: [{sound: 'sound.wav', data: '{"a": 2}'}]},
        {_id: ObjectID(), a: a1, m: m1, u: 'u3', t: 't3', p: 't', f: 'p', d, pr: {la: 'en', name: 'n3', 'custom.arr': ['a', 'b', 'c']}, c: []},
        {_id: ObjectID(), a: a1, m: m1, u: 'u4', t: 't4', p: 't', f: 'p', d, pr: {la: 'en', name: 'n4', 'custom.obj': {a: 10, x: 'x', y: 1}}},
    ],
    compilation_results: {
        i: [
            {c: {i: m1.toString()}, aps: {sound: 'default', badge: 0, alert: {body: 'message/default'}}, a: 1, b: {c: 2}},
            {c: {i: m1.toString()}, aps: {sound: 'default', badge: 0, alert: {body: 'message/en'}}, a: 1, b: {c: 2}},
            {c: {i: m1.toString()}, aps: {sound: 'sound.wav', badge: 0, alert: {body: 'message/en'}}, a: 1, b: {c: 2}},
            {c: {i: m1.toString()}, aps: {sound: 'sound.wav', badge: 0, alert: {body: 'message/en'}}, a: 1, b: {c: 2}},
            {c: {i: m1.toString()}, aps: {sound: 'default', badge: 0, alert: {body: 'message/en'}}, a: 1, b: {c: 2}},
            {c: {i: m1.toString()}, aps: {sound: 'sound.wav', badge: 0, alert: {body: 'message/default'}}, a: 2},
            {c: {i: m1.toString(), e: {name: 'n3', 'custom.arr': ['a', 'b', 'c']}}, aps: {sound: 'default', badge: 0, alert: {body: 'message/en'}}, a: 1, b: {c: 2}},
            {c: {i: m1.toString(), e: {name: 'n4', 'custom.obj': {a: 10, x: 'x', y: 1}}}, aps: {sound: 'default', badge: 0, alert: {body: 'message/en'}}, a: 1, b: {c: 2}},
        ]
    },

    personalization: [
        {_id: ObjectID(), a: a1, m: m5, u: 'u1', t: 't1', p: 't', f: 'p', d, pr: {}},
        {_id: ObjectID(), a: a1, m: m5, u: 'u2', t: 't2', p: 't', f: 'p', d, pr: {la: 'en'}},
        {_id: ObjectID(), a: a1, m: m5, u: 'u3', t: 't3', p: 't', f: 'p', d, pr: {la: 'en', name: 'n3', 'custom.sum': 5}},
        {_id: ObjectID(), a: a1, m: m5, u: 'u4', t: 't4', p: 't', f: 'p', d, pr: {la: 'en', name: 'n4', 'custom.arr': ['a', 'b', 'c'], 'custom.obj': {a: 'a', b: true, c: 3}}},
        {_id: ObjectID(), a: a1, m: m5, u: 'u4', t: 't4', p: 't', f: 'p', d, pr: {la: 'en', name: 'n4', 'custom.sum': 12, 'custom.arr': ['a', 'b'], 'custom.obj': {a: 'a', b: false}}},
        {_id: ObjectID(), a: a1, m: m5, u: 'u4', t: 't4', p: 't', f: 'p', d, pr: {la: 'en', name: 'n4', 'custom.sum': 12, 'custom.arr': ['a', 'b'], 'custom.obj': {a: 'a', b: false}}, ov: {messagePerLocale: {en: 'Over/en', default: 'Over/default'}}},
        {_id: ObjectID(), a: a1, m: m5, u: 'u4', t: 't4', p: 't', f: 'p', d, pr: {la: 'en', name: 'n4', 'custom.sum': 12, 'custom.arr': ['a', 'b'], 'custom.obj': {a: 'a', b: false}}, ov: {a: 2, name: 'Over/User', 'custom.arr': 'x'}},
    ],

    bench_compilation: randomize('compilation', 100000, (m, randomness) => {
        if (m.o) {
            m.o.messagePerLocale = {};
        }
        else {
            m.o = {messagePerLocale: {}};
        }
        m.o.message = m.o.messagePerLocale[m.p.la || 'default'] = 'm' + Math.round(Math.random() * randomness);
        m.h = hash(m.p, hash(m.o));
        return m;
    }),

    bench_personalization: randomize('personalization', 100000, (m, randomness) => {
        if (m.o) {
            m.o.messagePerLocale = {};
        }
        else {
            m.o = {messagePerLocale: {}};
        }
        m.o.message = m.o.messagePerLocale[m.p.la || 'default'] = 'm' + Math.round(Math.random() * randomness);
        m.h = hash(m.p, hash(m.o));
        return m;
    }),

    bench_simple: (randomness) => {
        let ret = [];
        for (let i = 0; i < 100000; i++) {
            let r = Math.random();
            let m = clone(exp.compilation[r > .5 ? 1 : 0]);
            m.o = {messagePerLocale: {}};
            m.o.message = m.o.messagePerLocale[m.p.la || 'default'] = 'm' + Math.round(r * randomness);
            ret.push(m);
        }
        return ret;
    },

    notes: {
        m1: {_id: m1, platforms: ['i', 't'], apps: [ObjectID("5fbb72974e19c6614411d95f")], sound: 'default', badge: 0, data: '{"a": 1, "b": {"c": 2}}', expiration: 1000 * 3600 * 4, messagePerLocale: {default: 'message/default', en: 'message/en'}, extras: ['name', 'custom.arr', 'custom.obj']},
        // ultimate personalization / compilation test: message with "name" & "custom.sum" personalization, 2 locales, single title for all messages, extras & overrides
        m5: {
            _id: m5,
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

    messages: {
        m1: {
            _id: m1,
            app: a1,
            platforms: ['i', 't'],
            state: 2,
            status: 'scheduled',
            filter: {},
            triggers: [{kind: 'plain', start: d}],
            contents: [
                {
                    message: 'message/default',
                    sound: 'default',
                    data: '{"a": 1, "b": {"c": 2}}',
                    badge: 0,
                    extras: ['name', 'custom.arr', 'custom.obj']
                },
                {
                    la: 'en',
                    message: 'message/en'
                }
            ]
        },
        m5: {
            _id: m1,
            app: a1,
            platforms: ['i', 't'],
            state: 2,
            status: 'scheduled',
            filter: {},
            triggers: [{kind: 'plain', start: d}],
            contents: [
                {
                    message: 'Hello, \nHere\'s your  message',
                    messagePers: {
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
                    title: 'Single title',
                    sound: 'default',
                    data: '{"a": 1, "b": {"c": 2}}',
                    extras: ['name', 'custom.sum', 'custom.arr', 'custom.obj']
                },
                {
                    la: 'en',
                    message: 'Hello, \nHere\'s your message',
                    messagePers: {
                        '7': {
                            f: 'User',
                            c: true,
                            k: 'name'
                        }
                    }
                }
            ]
        },
    },

    app: {
        _id: a1,
        plugins: {
            push: {
                t: {
                    _id: c1
                }
            }
        }
    },

    credentials: {
        _id: c1,
        type: 'test',
        key: 'key',
        secret: 'secret'
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
            "date": new Date("2021-04-28T11:36:34.655Z"),
            "tz": 3600000,
            "tx": false,
            "auto": false,
            "actualDates": false,
            "created": new Date("2021-04-28T11:36:34.655Z"),
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
            "date": new Date("2021-04-29T14:59:05.599Z"),
            "tz": false,
            "tx": false,
            "auto": false,
            "actualDates": false,
            "created": new Date("2021-04-29T14:59:05.599Z"),
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
                "i",
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
        p.h = hash(p.pr, p.c ? hash(p.c) : 0);
    });
});