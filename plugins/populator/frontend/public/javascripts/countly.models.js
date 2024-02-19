/*global chance, CountlyHelpers, countlyAuth, countlyGlobal, countlyCommon, countlyCohorts, countlyFunnel, $, jQuery, app, moment, CV*/
(function(countlyPopulator) {
    var metric_props = {
        mobile: ["_os", "_os_version", "_resolution", "_device", "_device_type", "_manufacturer", "_carrier", "_density", "_locale", "_store"],
        web: ["_os", "_os_version", "_resolution", "_device", "_device_type", "_density", "_locale", "_store", "_browser"],
        desktop: ["_os", "_os_version", "_resolution", "_locale"]
    };
    var props = {
        _os: ["Android", "iOS"],
        _os_web: ["Android", "iOS", "Windows", "MacOS"],
        _os_desktop: ["Windows", "MacOS", "Linux", "tvOS"],
        _os_version_android: ["11", "12", "12L"],
        _os_version_ios: ["10.3.4", "12.5.5", "15.5"],
        _os_version_windows: ["7", "8", "10"],
        _os_version_macos: ["10.15", "11.0", "12.0"],
        _os_version: function() {
            return getRandomInt(1, 9) + "." + getRandomInt(0, 5);
        },
        _resolution: ["320x480", "768x1024", "640x960", "1536x2048", "320x568", "640x1136", "480x800", "240x320", "540x960", "480x854", "240x400", "360x640", "800x1280", "600x1024", "600x800", "768x1366", "720x1280", "1080x1920"],
        _device_android: ["Note10 Lite", "Galaxy A52S", "Redmi 9c", "Note 10S", "Oppo A74", "Nova 9SE", "K41S"],
        _device_ios: ["iPhone13", "iPhone12", "iPhone11", "iPod7,1", "iPad3,6"],
        _device_type: ["console", "mobile", "tablet", "smarttv", "wearable", "embedded", "desktop"],
        _manufacturer_android: ["Samsung", "Sony Ericsson", "LG", "Google", "HTC", "Huaiwei", "Lenovo", "Acer"],
        _manufacturer_ios: ["Apple"],
        _manufacturer_windows_phone: ["Nokia", "Microsoft"],
        _manufacture_android: ["Samsung", "Sony Ericsson", "LG", "Google", "HTC", "Huaiwei", "Lenovo", "Acer"],
        _manufacture_ios: ["Apple"],
        _manufacture_windows_phone: ["Nokia", "Microsoft"],
        _carrier: ["Telus", "Rogers Wireless", "T-Mobile", "Bell Canada", "AT&T", "Verizon", "Vodafone", "Cricket Communications", "O2", "Tele2", "Turkcell", "Orange", "Sprint", "Metro PCS"],
        _cpu: ["armv6", "armv7", "x86"],
        _opengl: ["opengl_es1", "opengl_es2"],
        _density_android: ["XHDPI", "MDPI", "HDPI", "XXHDPI", "TVDPI"],
        _density_ios: ["@1", "@2", "@3"],
        _density_macos: ["@1", "@2", "@3"],
        _density: function() {
            return getRandomInt(1, 3) + "." + getRandomInt(0, 5);
        },
        _locale: ["en_CA", "fr_FR", "de_DE", "it_IT", "ja_JP", "ko_KR", "en_US"],
        _browser: ["Opera", "Chrome", "Internet Explorer", "Safari", "Firefox"],
        _store: ["com.android.vending", "com.google.android.feedback", "com.google.vending", "com.amazon.venezia", "com.sec.android.app.samsungapps", "com.qihoo.appstore", "com.dragon.android.pandaspace", "me.onemobile.android", "com.tencent.android.qqdownloader", "com.android.browser", "com.bbk.appstore", "com.lenovo.leos.appstore", "com.lenovo.leos.appstore.pad", "com.moto.mobile.appstore", "com.aliyun.wireless.vos.appstore", "um.market.android"],
        _source: ["https://www.google.lv/search?q=countly+analytics", "https://www.google.co.in/search?q=mobile+analytics", "https://www.google.ru/search?q=product+analytics", "http://stackoverflow.com/questions?search=what+is+mobile+analytics", "http://stackoverflow.com/unanswered?search=game+app+analytics", "http://stackoverflow.com/tags?search=product+dashboard", "http://r.search.yahoo.com/?query=analytics+product+manager"]
    };

    var ratingWidgetList = [], npsWidgetList = [], surveyWidgetList = {};
    var viewSegments = {
        name: ["Login", "Home", "Dashboard", "Main View", "Detail View Level 1", "Detail View Level 2", "Profile", "Settings", "About", "Privacy Policy", "Terms and Conditions"],
        visit: [1],
        start: [0, 1],
        exit: [0, 1],
        bounce: [0, 1],
        segment: ["Android", "iOS", "Windows Phone"]
    };
    var messages = [
        {"demo": 1, "apps": [countlyCommon.ACTIVE_APP_ID], "platforms": ["i", "a"], "tz": false, "auto": false, "type": "message", "messagePerLocale": {"default|t": "💥 Promotion! 💥", "default|0|t": "Get It", "default|1|t": "Cancel", "default|0|l": "theapp://promo/30off", "default|1|l": "theapp://promo/30off/cancel", "de|t": "💥 SALE! 💥", "de|0|t": "OK", "de|0|l": "theapp://promo/30off", "de|1|t": "Stornieren", "de|1|l": "theapp://promo/30off/cancel", "default": "HOT offers with 30% discount, only 6 hours left!", "default|p": {}, "default|tp": {}, "de|tp": {}, "de": "Abonnieren Sie jetzt mit 30% Rabatt, nur noch 6 Stunden!", "de|p": {}}, "locales": [{"value": "default", "title": "Default", "count": 200, "percent": 100}, {"value": "de", "title": "German", "count": 100, "percent": 50}, {"value": "en", "title": "English", "count": 100, "percent": 50}], "sound": "default", "url": "theapp://promo/30off", "source": "dash", "buttons": 2, "media": location.origin + "/images/push/sale.png", "autoOnEntry": false, "autoCohorts": [], info: {title: "HOT offers with 30% discount, only 6 hours left!"}},
        {"demo": 2, "apps": [countlyCommon.ACTIVE_APP_ID], "platforms": ["i", "a"], "tz": false, "auto": false, "type": "message", "messagePerLocale": {"default|t": "💥 Promotion! 💥", "default|0|t": "Get It", "default|1|t": "Cancel", "default|0|l": "theapp://promo/30off", "default|1|l": "theapp://promo/30off/cancel", "de|t": "💥SALE! 💥", "de|0|t": "OK", "de|0|l": "theapp://promo/30off", "de|1|t": "Stornieren", "de|1|l": "theapp://promo/30off/cancel", "default": "Last chance! Only 3 hours left to get 30% discount!", "default|p": {}, "default|tp": {}, "de|tp": {}, "de": "Letzte Möglichkeit! Nur noch 3 Stunden, um 30% Rabatt zu erhalten", "de|p": {}}, "locales": [{"value": "default", "title": "Default", "count": 200, "percent": 100}, {"value": "de", "title": "German", "count": 100, "percent": 50}, {"value": "en", "title": "English", "count": 100, "percent": 50}], "sound": "default", "url": "theapp://promo/30off", "source": "dash", "buttons": 2, "media": location.origin + "/images/push/sale.png", "autoOnEntry": false, "autoCohorts": [], info: {title: "Last chance! Only 3 hours left to get 30% discount!"}},
        {"demo": 3, "apps": [countlyCommon.ACTIVE_APP_ID], "platforms": ["i", "a"], "tz": false, "auto": true, "type": "message", "messagePerLocale": {"default|t": "💥 Latest 💥", "default|0|t": "Go", "default|0|l": "theapp://offers", "default": "Check our latest offers!"}, "sound": "default", "source": "dash", "buttons": 1, "autoOnEntry": "events", "autoEvents": ["Login"], "autoTime": 576000, "autoCapMessages": 1, "autoCapSleep": 864000, info: {title: "Check our latest offers!"}},
        // {
        //     demo: 4,
        //     app: countlyCommon.ACTIVE_APP_ID,
        //     platforms: ['i', 'a'],
        //     contents: [{
        //         message: 'Automated message'
        //     }],
        //     triggers: [
        //         {kind: 'auto', }
        //     ]
        // }
    ];
    // usa, uk, japan, germany, italy, france, turkey, uruguay, netherlands, new zealand, mexico, canada, china, finland, hungary, ukraine, argentina, bahamas, latvia, malaysia
    var predefined_ip_addresses = ["2.167.106.72", "4.69.238.178", "3.112.23.176", "13.32.136.0", "4.69.130.86", "4.69.208.18", "17.67.198.23", "5.145.169.96", "2.59.88.2", "17.86.219.128", "23.65.126.2", "4.14.242.30", "14.192.76.3", "4.68.30.78", "5.38.128.2", "31.40.128.2", "5.145.169.100", "62.67.185.16", "14.139.54.208", "62.40.112.206", "14.192.192.1"];
    var campaigns = [
        {id: "email", name: "Email campaign", cost: "0.1", type: "click"},
        {id: "email2", name: "Email campaign 2", cost: "0.2", type: "install"},
        {id: "sms", name: "SMS campaign", cost: "0.3", type: "install"},
        {id: "cpc", name: "Cross promotion campaign", cost: "1", type: "install"},
        {id: "blog", name: "Blog post campaign 1", cost: "5", type: "click"},
        {id: "blog2", name: "Blog post campaign 2", cost: "10", type: "install"}];
    var sources = ["facebook", "gideros", "admob", "chartboost", "googleplay"];
    var jsErrors = [
        {
            error: "Error: URIError\n" +
            "    URI malformed\n" +
            "    at decodeURIComponent (<anonymous>)\n" +
            "    at o (bundle.js:1:61)\n" +
            "    at bundle.js:1:247\n" +
            "    at bundle.js:1:276",
            name: 'Error: URIError'
        },
        {
            error: "Error: RangeError\n" +
            "    toFixed() digits argument must be between 0 and 100\n" +
            "    at Number.toFixed (<anonymous>)\n" +
            "    at o (bundle.js:1:100)\n" +
            "    at bundle.js:1:247\n" +
            "    at bundle.js:1:276",
            name: "Error: RangeError"
        },
        {
            error: "Error: SyntaxError\n" +
                "    Hello Countly (at bundle.js:1:138)\n" +
                "    at o (bundle.js:1:138)\n" +
                "    at bundle.js:1:247\n" +
                "    at bundle.js:1:276",
            name: "Error: SyntaxError"
        },
        {
            error: "Error: TypeError\n" +
            '    "Countly".reverse is not a function\n' +
            "    at o (bundle.js:1:190)\n" +
            "    at bundle.js:1:247\n" +
            "    at bundle.js:1:276",
            name: "Error: TypeError"
        },
        {
            error: "Error: ReferenceError\n" +
            "    param is not defined\n" +
            "    at o (bundle.js:1:25)\n" +
            "    at bundle.js:1:247\n" +
            "    at bundle.js:1:276",
            name: "Error: ReferenceError"
        }
    ];
    const crashBuildIds = {
        plc: [
            "1b7d7184-05d6-3a83-bb1b-f9af6aef61f3",
            "1ff7a2fb-9f28-37b7-af39-344206a322bd",
            "7b531a15-3e73-3185-90e2-b88d9476da5e",
            "7b1733b1-74c9-3a33-8a58-853b0a029826",
            "83ba0b04-af12-301a-a7e5-bbbb20af0738",
            "295d93e6-ac06-384a-a469-2df327f697fc",
            "7519e999-1053-3367-b9d5-8844f6d3bdc6",
            "61459536-a83b-36a0-9004-5d168317d2a6",
            "a697479d-4c5c-391e-b117-85b894ab94c6",
            "cefbbc61-fdb3-3db7-86bf-337e511616db",
            "d7630067-7a00-3cb7-99e1-e7f6c55d85c5",
        ],
        ios: [
            "0D63A05D-8C80-3E93-B5FE-8A52208271B4",
            "3C1DC6C9-3E27-3DD3-938E-146C18CC5188",
            "65DB57E4-7B15-316D-8E61-C7E9B36D6EF5",
            "757F024F-EA35-3322-9E77-3AE793023AC3",
            "DB4B7F70-0399-32B4-9DA3-7218B5A4BA49",
        ],
    };
    const platformTypes = {mobile: "Mobile", web: "Web", desktop: "Desktop"};
    var defaultTemplates = [
        {
            "_id": "defaultBanking",
            "name": "Banking",
            "isDefault": true,
            "uniqueUserCount": 100,
            "platformType": [platformTypes.mobile, platformTypes.web, platformTypes.desktop],
            "users": [
                {
                    "key": "Account Type",
                    "values": [
                        {
                            "key": "Individual",
                            "probability": "50"
                        },
                        {
                            "key": "Business",
                            "probability": "50"
                        }
                    ]
                },
                {
                    "key": "Has Credit Card",
                    "values": [
                        {
                            "key": "true",
                            "probability": "50"
                        },
                        {
                            "key": "false",
                            "probability": "50"
                        }
                    ]
                },
                {
                    "key": "Has Loan",
                    "values": [
                        {
                            "key": "true",
                            "probability": "50"
                        },
                        {
                            "key": "false",
                            "probability": "50"
                        }
                    ]
                }
            ],
            "events": [
                {
                    "key": "Login",
                    "duration": {
                        "isActive": false,
                        "minDurationTime": 0,
                        "maxDurationTime": 0
                    },
                    "sum": {
                        "isActive": false,
                        "minSumValue": 0,
                        "maxSumValue": 0
                    },
                    "segmentations": [{
                        "key": "Method",
                        "values": [
                            {
                                "key": "Face ID",
                                "probability": "50"
                            },
                            {
                                "key": "Password",
                                "probability": "50"
                            }
                        ]
                    }]
                },
                {
                    "key": "Fund Transfer Begin",
                    "duration": {
                        "isActive": false,
                        "minDurationTime": 0,
                        "maxDurationTime": 0
                    },
                    "sum": {
                        "isActive": false,
                        "minSumValue": 0,
                        "maxSumValue": 0
                    },
                    "segmentations": [{
                        "key": "Source Currency",
                        "values": [
                            {
                                "key": "EUR",
                                "probability": "33"
                            },
                            {
                                "key": "USD",
                                "probability": "33"
                            },
                            {
                                "key": "GBP",
                                "probability": "33"
                            }
                        ]
                    },
                    {
                        "key": "Destination Currency",
                        "values": [
                            {
                                "key": "EUR",
                                "probability": "33"
                            },
                            {
                                "key": "USD",
                                "probability": "33"
                            },
                            {
                                "key": "GBP",
                                "probability": "33"
                            }
                        ]
                    }]
                },
                {
                    "key": "Fund Transfer",
                    "duration": {
                        "isActive": true,
                        "minDurationTime": 10,
                        "maxDurationTime": 60
                    },
                    "sum": {
                        "isActive": true,
                        "minSumValue": 50,
                        "maxSumValue": 10000
                    },
                    "segmentations": [{
                        "key": "Result",
                        "values": [
                            {
                                "key": "Success",
                                "probability": "50"
                            },
                            {
                                "key": "Failure",
                                "probability": "50"
                            }
                        ]
                    },
                    {
                        "key": "Failure Reason",
                        "values": [
                            {
                                "key": "Insufficient Funds",
                                "probability": "50"
                            },
                            {
                                "key": "Technical Error",
                                "probability": "50"
                            }
                        ]
                    },
                    {
                        "key": "Error Code",
                        "values": [
                            {
                                "key": "100101",
                                "probability": "33"
                            },
                            {
                                "key": "100102",
                                "probability": "33"
                            },
                            {
                                "key": "100103",
                                "probability": "33"
                            }
                        ]
                    }]
                },
                {
                    "key": "Credit Card Application Begin",
                    "duration": {
                        "isActive": false,
                        "minDurationTime": 0,
                        "maxDurationTime": 0
                    },
                    "sum": {
                        "isActive": false,
                        "minSumValue": 0,
                        "maxSumValue": 0
                    },
                    "segmentations": [{
                        "key": "From",
                        "values": [
                            {
                                "key": "Home Banner",
                                "probability": "50"
                            },
                            {
                                "key": "My Credit Cards",
                                "probability": "50"
                            }
                        ]
                    }]
                },
                {
                    "key": "Credit Card Application",
                    "duration": {
                        "isActive": true,
                        "minDurationTime": 60,
                        "maxDurationTime": 600
                    },
                    "sum": {
                        "isActive": false,
                        "minSumValue": 0,
                        "maxSumValue": 0
                    },
                    "segmentations": [{
                        "key": "Card Type",
                        "values": [
                            {
                                "key": "Basic",
                                "probability": "33"
                            },
                            {
                                "key": "Premium",
                                "probability": "33"
                            },
                            {
                                "key": "Black",
                                "probability": "33"
                            }
                        ]
                    }]
                },
                {
                    "key": "Bill Payment",
                    "duration": {
                        "isActive": false,
                        "minDurationTime": 0,
                        "maxDurationTime": 0
                    },
                    "sum": {
                        "isActive": true,
                        "minSumValue": 100,
                        "maxSumValue": 1000
                    },
                    "segmentations": [{
                        "key": "Bill Type",
                        "values": [
                            {
                                "key": "Electricity",
                                "probability": "25"
                            },
                            {
                                "key": "Internet",
                                "probability": "25"
                            },
                            {
                                "key": "Phone",
                                "probability": "25"
                            },
                            {
                                "key": "Cable",
                                "probability": "25"
                            }
                        ]
                    },
                    {
                        "key": "Amount Range",
                        "values": [
                            {
                                "key": "0-20",
                                "probability": "25"
                            },
                            {
                                "key": "20-100",
                                "probability": "25"
                            },
                            {
                                "key": "100-500",
                                "probability": "25"
                            },
                            {
                                "key": "500+",
                                "probability": "25"
                            }
                        ]
                    }]
                }
            ],
            "views": [],
            "sequences": [
                {
                    "steps": [
                        {
                            "key": "session",
                            "value": "start",
                            "probability": 100
                        },
                        {
                            "key": "events",
                            "value": "Login",
                            "probability": "100"
                        },
                        {
                            "key": "events",
                            "value": "Fund Transfer Begin",
                            "probability": "100"
                        },
                        {
                            "key": "events",
                            "value": "Fund Transfer",
                            "probability": "100"
                        },
                        {
                            "key": "events",
                            "value": "Credit Card Application Begin",
                            "probability": "100"
                        },
                        {
                            "key": "events",
                            "value": "Credit Card Application",
                            "probability": "100"
                        },
                        {
                            "key": "events",
                            "value": "Bill Payment",
                            "probability": "100"
                        },
                        {
                            "key": "session",
                            "value": "end",
                            "probability": 100
                        }
                    ]
                }
            ],
            "behavior": {
                "runningSession": [
                    "2",
                    "5"
                ],
                "generalConditions": [],
                "sequences": [
                    {
                        "key": "Sequence_1",
                        "probability": 80
                    },
                    {
                        "key": "random",
                        "probability": 20
                    }
                ],
                "sequenceConditions": []
            }
        },
        {
            "_id": "defaultHealthcare",
            "name": "Healthcare",
            "isDefault": true,
            "uniqueUserCount": 100,
            "platformType": [platformTypes.mobile, platformTypes.web, platformTypes.desktop],
            "users": [
                {
                    "key": "Insurance",
                    "values": [
                        {
                            "key": "Cigna",
                            "probability": "25"
                        },
                        {
                            "key": "AARP",
                            "probability": "25"
                        },
                        {
                            "key": "UnitedHealthcare",
                            "probability": "25"
                        },
                        {
                            "key": "Humana",
                            "probability": "25"
                        }
                    ]
                },
                {
                    "key": "Employer",
                    "values": [
                        {
                            "key": "Company1",
                            "probability": "33"
                        },
                        {
                            "key": "Company2",
                            "probability": "33"
                        },
                        {
                            "key": "Company3",
                            "probability": "34"
                        }
                    ]
                }
            ],
            "events": [
                {
                    "key": "Login",
                    "duration": {
                        "isActive": false,
                        "minDurationTime": 0,
                        "maxDurationTime": 0
                    },
                    "sum": {
                        "isActive": false,
                        "minSumValue": 0,
                        "maxSumValue": 0
                    },
                    "segmentations": [
                        {
                            "key": "Method",
                            "values": [
                                {
                                    "key": "Face ID",
                                    "probability": "50"
                                },
                                {
                                    "key": "Password",
                                    "probability": "50"
                                }
                            ]
                        }
                    ]
                },
                {
                    "key": "Video Call",
                    "duration": {
                        "isActive": true,
                        "minDurationTime": 300,
                        "maxDurationTime": 900
                    },
                    "sum": {
                        "isActive": false,
                        "minSumValue": 0,
                        "maxSumValue": 0
                    },
                    "segmentations": [
                        {
                            "key": "Clinic",
                            "values": [
                                {
                                    "key": "Spanish Springs",
                                    "probability": "25"
                                },
                                {
                                    "key": "North Valleys",
                                    "probability": "25"
                                },
                                {
                                    "key": "Northwest Reno",
                                    "probability": "25"
                                },
                                {
                                    "key": "Galena",
                                    "probability": "25"
                                }
                            ]
                        }
                    ]
                },
                {
                    "key": "Schedule Appointment",
                    "duration": {
                        "isActive": false,
                        "minDurationTime": 0,
                        "maxDurationTime": 0
                    },
                    "sum": {
                        "isActive": false,
                        "minSumValue": 0,
                        "maxSumValue": 0
                    },
                    "segmentations": [
                        {
                            "key": "Type",
                            "values": [
                                {
                                    "key": "In Clinic",
                                    "probability": "50"
                                },
                                {
                                    "key": "Virtual",
                                    "probability": "50"
                                }
                            ]
                        },
                        {
                            "key": "Clinic Selected",
                            "values": [
                                {
                                    "key": "Spanish Springs",
                                    "probability": "25"
                                },
                                {
                                    "key": "North Valleys",
                                    "probability": "25"
                                },
                                {
                                    "key": "Northwest Reno",
                                    "probability": "25"
                                },
                                {
                                    "key": "Galena",
                                    "probability": "25"
                                }
                            ]
                        },
                        {
                            "key": "Condition",
                            "values": [
                                {
                                    "key": "Coronavirus concerns",
                                    "probability": "20"
                                },
                                {
                                    "key": "Rash",
                                    "probability": "20"
                                },
                                {
                                    "key": "Travel vaccination",
                                    "probability": "20"
                                },
                                {
                                    "key": "Sinus infection symptoms",
                                    "probability": "20"
                                },
                                {
                                    "key": "Acute back pain",
                                    "probability": "20"
                                }
                            ]
                        }
                    ]
                },
                {
                    "key": "Used Messaging",
                    "duration": {
                        "isActive": true,
                        "minDurationTime": 180,
                        "maxDurationTime": 300
                    },
                    "sum": {
                        "isActive": false,
                        "minSumValue": 0,
                        "maxSumValue": 0
                    },
                    "segmentations": [
                        {
                            "key": "Provided Care Plan",
                            "values": [
                                {
                                    "key": "no",
                                    "probability": "50"
                                },
                                {
                                    "key": "yes",
                                    "probability": "50"
                                }
                            ]
                        }
                    ]
                },
                {
                    "key": "Invoice Generated",
                    "duration": {
                        "isActive": false,
                        "minDurationTime": 0,
                        "maxDurationTime": 0
                    },
                    "sum": {
                        "isActive": true,
                        "minSumValue": 100,
                        "maxSumValue": 10000
                    },
                    "segmentations": []
                }
            ],
            "views": [],
            "sequences": [
                {
                    "steps": [
                        {
                            "key": "session",
                            "value": "start",
                            "probability": 100
                        },
                        {
                            "key": "events",
                            "value": "Login",
                            "probability": "100"
                        },
                        {
                            "key": "events",
                            "value": "Video Call",
                            "probability": "100"
                        },
                        {
                            "key": "events",
                            "value": "Schedule Appointment",
                            "probability": "100"
                        },
                        {
                            "key": "events",
                            "value": "Used Messaging",
                            "probability": "100"
                        },
                        {
                            "key": "events",
                            "value": "Invoice Generated",
                            "probability": "100"
                        },
                        {
                            "key": "session",
                            "value": "end",
                            "probability": 100
                        }
                    ]
                }
            ],
            "behavior": {
                "runningSession": [
                    "2",
                    "5"
                ],
                "generalConditions": [],
                "sequences": [
                    {
                        "key": "Sequence_1",
                        "probability": 80
                    },
                    {
                        "key": "random",
                        "probability": 20
                    }
                ],
                "sequenceConditions": []
            }
        },
        {
            "_id": "defaultNavigation",
            "name": "Navigation",
            "isDefault": true,
            "uniqueUserCount": 100,
            "platformType": [platformTypes.mobile, platformTypes.web, platformTypes.desktop],
            "users": [
                {
                    "key": "Account Type",
                    "values": [
                        {
                            "key": "Basic",
                            "probability": "50"
                        },
                        {
                            "key": "Premium",
                            "probability": "50"
                        }
                    ]
                }
            ],
            "events": [
                {
                    "key": "Login",
                    "duration": {
                        "isActive": false,
                        "minDurationTime": 0,
                        "maxDurationTime": 0
                    },
                    "sum": {
                        "isActive": false,
                        "minSumValue": 0,
                        "maxSumValue": 0
                    },
                    "segmentations": [
                        {
                            "key": "Method",
                            "values": [
                                {
                                    "key": "Face ID",
                                    "probability": "50"
                                },
                                {
                                    "key": "Password",
                                    "probability": "50"
                                }
                            ]
                        }
                    ]
                },
                {
                    "key": "Journey Configure",
                    "duration": {
                        "isActive": false,
                        "minDurationTime": 0,
                        "maxDurationTime": 0
                    },
                    "sum": {
                        "isActive": false,
                        "minSumValue": 0,
                        "maxSumValue": 0
                    },
                    "segmentations": [
                        {
                            "key": "Vehicle Type",
                            "values": [
                                {
                                    "key": "Fleet",
                                    "probability": "50"
                                },
                                {
                                    "key": "Individual",
                                    "probability": "50"
                                }
                            ]
                        },
                        {
                            "key": "Range",
                            "values": [
                                {
                                    "key": "0-10",
                                    "probability": "25"
                                },
                                {
                                    "key": "11-50",
                                    "probability": "25"
                                },
                                {
                                    "key": "51-100",
                                    "probability": "25"
                                },
                                {
                                    "key": "100+",
                                    "probability": "25"
                                }
                            ]
                        }
                    ]
                },
                {
                    "key": "Journey Begin",
                    "duration": {
                        "isActive": false,
                        "minDurationTime": 0,
                        "maxDurationTime": 0
                    },
                    "sum": {
                        "isActive": false,
                        "minSumValue": 0,
                        "maxSumValue": 0
                    },
                    "segmentations": [
                        {
                            "key": "Vehicle Type",
                            "values": [
                                {
                                    "key": "Fleet",
                                    "probability": "50"
                                },
                                {
                                    "key": "Individual",
                                    "probability": "50"
                                }
                            ]
                        },
                        {
                            "key": "Range",
                            "values": [
                                {
                                    "key": "0-10",
                                    "probability": "25"
                                },
                                {
                                    "key": "11-50",
                                    "probability": "25"
                                },
                                {
                                    "key": "51-100",
                                    "probability": "25"
                                },
                                {
                                    "key": "100+",
                                    "probability": "25"
                                }
                            ]
                        }
                    ]
                },
                {
                    "key": "Journey End",
                    "duration": {
                        "isActive": true,
                        "minDurationTime": 600,
                        "maxDurationTime": 12000
                    },
                    "sum": {
                        "isActive": true,
                        "minSumValue": 10,
                        "maxSumValue": 400
                    },
                    "segmentations": [
                        {
                            "key": "Vehicle Type",
                            "values": [
                                {
                                    "key": "Fleet",
                                    "probability": "50"
                                },
                                {
                                    "key": "Individual",
                                    "probability": "50"
                                }
                            ]
                        },
                        {
                            "key": "Range",
                            "values": [
                                {
                                    "key": "0-10",
                                    "probability": "25"
                                },
                                {
                                    "key": "11-50",
                                    "probability": "25"
                                },
                                {
                                    "key": "51-100",
                                    "probability": "25"
                                },
                                {
                                    "key": "100+",
                                    "probability": "25"
                                }
                            ]
                        }
                    ]
                },
                {
                    "key": "Settings Changed",
                    "duration": {
                        "isActive": false,
                        "minDurationTime": 0,
                        "maxDurationTime": 0
                    },
                    "sum": {
                        "isActive": false,
                        "minSumValue": 0,
                        "maxSumValue": 0
                    },
                    "segmentations": [
                        {
                            "key": "Setting",
                            "values": [
                                {
                                    "key": "Route preference",
                                    "probability": "33"
                                },
                                {
                                    "key": "Vehicle maker",
                                    "probability": "33"
                                },
                                {
                                    "key": "Vehicle model",
                                    "probability": "34"
                                }
                            ]
                        }
                    ]
                }
            ],
            "views": [],
            "sequences": [
                {
                    "steps": [
                        {
                            "key": "session",
                            "value": "start",
                            "probability": 100
                        },
                        {
                            "key": "events",
                            "value": "Login",
                            "probability": "100"
                        },
                        {
                            "key": "events",
                            "value": "Journey Configure",
                            "probability": "100"
                        },
                        {
                            "key": "events",
                            "value": "Journey Begin",
                            "probability": "100"
                        },
                        {
                            "key": "events",
                            "value": "Journey End",
                            "probability": "100"
                        },
                        {
                            "key": "events",
                            "value": "Settings Changed",
                            "probability": "100"
                        },
                        {
                            "key": "session",
                            "value": "end",
                            "probability": 100
                        }
                    ]
                }
            ],
            "behavior": {
                "runningSession": [
                    "2",
                    "5"
                ],
                "generalConditions": [],
                "sequences": [
                    {
                        "key": "Sequence_1",
                        "probability": 80
                    },
                    {
                        "key": "random",
                        "probability": 20
                    }
                ],
                "sequenceConditions": []
            }
        },
        {
            "_id": "defaultEcommerce",
            "name": "eCommerce",
            "isDefault": true,
            "uniqueUserCount": 100,
            "platformType": [platformTypes.mobile, platformTypes.web, platformTypes.desktop],
            "users": [
                {
                    "key": "Account Type",
                    "values": [
                        {
                            "key": "Basic",
                            "probability": "50"
                        },
                        {
                            "key": "Prime",
                            "probability": "50"
                        }
                    ]
                }
            ],
            "events": [
                {
                    "key": "Login",
                    "duration": {
                        "isActive": false,
                        "minDurationTime": 0,
                        "maxDurationTime": 0
                    },
                    "sum": {
                        "isActive": false,
                        "minSumValue": 0,
                        "maxSumValue": 0
                    },
                    "segmentations": [
                        {
                            "key": "Method",
                            "values": [
                                {
                                    "key": "Face ID",
                                    "probability": "50"
                                },
                                {
                                    "key": "Password",
                                    "probability": "50"
                                }
                            ]
                        }
                    ]
                },
                {
                    "key": "Add To Cart",
                    "duration": {
                        "isActive": false,
                        "minDurationTime": 0,
                        "maxDurationTime": 0
                    },
                    "sum": {
                        "isActive": false,
                        "minSumValue": 0,
                        "maxSumValue": 0
                    },
                    "segmentations": [
                        {
                            "key": "Category",
                            "values": [
                                {
                                    "key": "Books",
                                    "probability": "33"
                                },
                                {
                                    "key": "Electronics",
                                    "probability": "33"
                                },
                                {
                                    "key": "Home & Garden",
                                    "probability": "34"
                                }
                            ]
                        }
                    ]
                },
                {
                    "key": "Checkout - Begin",
                    "duration": {
                        "isActive": false,
                        "minDurationTime": 0,
                        "maxDurationTime": 0
                    },
                    "sum": {
                        "isActive": false,
                        "minSumValue": 0,
                        "maxSumValue": 0
                    },
                    "segmentations": []
                },
                {
                    "key": "Checkout - Address",
                    "duration": {
                        "isActive": false,
                        "minDurationTime": 0,
                        "maxDurationTime": 0
                    },
                    "sum": {
                        "isActive": false,
                        "minSumValue": 0,
                        "maxSumValue": 0
                    },
                    "segmentations": []
                },
                {
                    "key": "Checkout - Payment",
                    "duration": {
                        "isActive": false,
                        "minDurationTime": 0,
                        "maxDurationTime": 0
                    },
                    "sum": {
                        "isActive": false,
                        "minSumValue": 0,
                        "maxSumValue": 0
                    },
                    "segmentations": []
                },
                {
                    "key": "Checkout",
                    "duration": {
                        "isActive": true,
                        "minDurationTime": 60,
                        "maxDurationTime": 600
                    },
                    "sum": {
                        "isActive": true,
                        "minSumValue": 50,
                        "maxSumValue": 10000
                    },
                    "segmentations": [
                        {
                            "key": "Delivery Type",
                            "values": [
                                {
                                    "key": "Standard",
                                    "probability": "50"
                                },
                                {
                                    "key": "Express",
                                    "probability": "50"
                                }
                            ]
                        },
                        {
                            "key": "Items",
                            "values": [
                                {
                                    "key": "1",
                                    "probability": "25"
                                },
                                {
                                    "key": "2-5",
                                    "probability": "25"
                                },
                                {
                                    "key": "6-10",
                                    "probability": "25"
                                },
                                {
                                    "key": "10+",
                                    "probability": "25"
                                }
                            ]
                        }
                    ]
                },
                {
                    "key": "Settings Changed",
                    "duration": {
                        "isActive": false,
                        "minDurationTime": 0,
                        "maxDurationTime": 0
                    },
                    "sum": {
                        "isActive": false,
                        "minSumValue": 0,
                        "maxSumValue": 0
                    },
                    "segmentations": [
                        {
                            "key": "Setting",
                            "values": [
                                {
                                    "key": "Address",
                                    "probability": "50"
                                },
                                {
                                    "key": "Payment method",
                                    "probability": "50"
                                }
                            ]
                        }
                    ]
                }
            ],
            "views": [],
            "sequences": [
                {
                    "steps": [
                        {
                            "key": "session",
                            "value": "start",
                            "probability": 100
                        },
                        {
                            "key": "events",
                            "value": "Login",
                            "probability": "100"
                        },
                        {
                            "key": "events",
                            "value": "Add To Cart",
                            "probability": "100"
                        },
                        {
                            "key": "events",
                            "value": "Checkout - Begin",
                            "probability": "100"
                        },
                        {
                            "key": "events",
                            "value": "Checkout - Address",
                            "probability": "100"
                        },
                        {
                            "key": "events",
                            "value": "Checkout - Payment",
                            "probability": "100"
                        },
                        {
                            "key": "events",
                            "value": "Checkout",
                            "probability": "100"
                        },
                        {
                            "key": "events",
                            "value": "Settings Changed",
                            "probability": "100"
                        },
                        {
                            "key": "session",
                            "value": "end",
                            "probability": 100
                        }
                    ]
                }
            ],
            "behavior": {
                "runningSession": [
                    "2",
                    "5"
                ],
                "generalConditions": [],
                "sequences": [
                    {
                        "key": "Sequence_1",
                        "probability": 80
                    },
                    {
                        "key": "random",
                        "probability": 20
                    }
                ],
                "sequenceConditions": []
            }
        },
        {
            "_id": "defaultGaming",
            "name": "Gaming",
            "isDefault": true,
            "uniqueUserCount": 100,
            "platformType": ["mobile", "web", "desktop"],
            "users": [
                {
                    "key": "Experience Points",
                    "values": [
                        {
                            "key": "10",
                            "probability": "10"
                        },
                        {
                            "key": "20",
                            "probability": "10"
                        },
                        {
                            "key": "30",
                            "probability": "10"
                        },
                        {
                            "key": "40",
                            "probability": "10"
                        },
                        {
                            "key": "50",
                            "probability": "10"
                        },
                        {
                            "key": "60",
                            "probability": "10"
                        },
                        {
                            "key": "70",
                            "probability": "10"
                        },
                        {
                            "key": "80",
                            "probability": "10"
                        },
                        {
                            "key": "90",
                            "probability": "10"
                        },
                        {
                            "key": "100",
                            "probability": "10"
                        }
                    ]
                }
            ],
            "events": [
                {
                    "key": "Login",
                    "duration": {
                        "isActive": false,
                        "minDurationTime": 0,
                        "maxDurationTime": 0
                    },
                    "sum": {
                        "isActive": false,
                        "minSumValue": 0,
                        "maxSumValue": 0
                    },
                    "segmentations": [
                        {
                            "key": "Method",
                            "values": [
                                {
                                    "key": "Facebook",
                                    "probability": "33"
                                },
                                {
                                    "key": "Google",
                                    "probability": "33"
                                },
                                {
                                    "key": "Email",
                                    "probability": "34"
                                }
                            ]
                        }
                    ]
                },
                {
                    "key": "Level Up",
                    "duration": {
                        "isActive": true,
                        "minDurationTime": 60,
                        "maxDurationTime": 600
                    },
                    "sum": {
                        "isActive": false,
                        "minSumValue": 0,
                        "maxSumValue": 0
                    },
                    "segmentations": [
                        {
                            "key": "Level",
                            "values": [
                                {
                                    "key": "1",
                                    "probability": "10"
                                },
                                {
                                    "key": "2",
                                    "probability": "10"
                                },
                                {
                                    "key": "3",
                                    "probability": "10"
                                },
                                {
                                    "key": "4",
                                    "probability": "10"
                                },
                                {
                                    "key": "5",
                                    "probability": "10"
                                },
                                {
                                    "key": "6",
                                    "probability": "10"
                                },
                                {
                                    "key": "7",
                                    "probability": "10"
                                },
                                {
                                    "key": "8",
                                    "probability": "10"
                                },
                                {
                                    "key": "9",
                                    "probability": "10"
                                },
                                {
                                    "key": "10",
                                    "probability": "10"
                                }
                            ]
                        },
                        {
                            "key": "Used Level Pass",
                            "values": [
                                {
                                    "key": "true",
                                    "probability": "50"
                                },
                                {
                                    "key": "false",
                                    "probability": "50"
                                }
                            ]
                        }
                    ]
                },
                {
                    "key": "Purchase",
                    "duration": {
                        "isActive": false,
                        "minDurationTime": 0,
                        "maxDurationTime": 0
                    },
                    "sum": {
                        "isActive": true,
                        "minSumValue": 1,
                        "maxSumValue": 100
                    },
                    "segmentations": [
                        {
                            "key": "Item",
                            "values": [
                                {
                                    "key": "Level Pass",
                                    "probability": "33"
                                },
                                {
                                    "key": "Lucky Item",
                                    "probability": "33"
                                },
                                {
                                    "key": "Item Storage Upgrade",
                                    "probability": "34"
                                }
                            ]
                        }
                    ]
                },
                {
                    "key": "Share Score",
                    "duration": {
                        "isActive": false,
                        "minDurationTime": 0,
                        "maxDurationTime": 0
                    },
                    "sum": {
                        "isActive": false,
                        "minSumValue": 0,
                        "maxSumValue": 0
                    },
                    "segmentations": [
                        {
                            "key": "To",
                            "values": [
                                {
                                    "key": "Facebook",
                                    "probability": "33"
                                },
                                {
                                    "key": "Twitter",
                                    "probability": "33"
                                },
                                {
                                    "key": "Instagram",
                                    "probability": "34"
                                }
                            ]
                        }
                    ]
                },
                {
                    "key": "Invite Friends",
                    "duration": {
                        "isActive": false,
                        "minDurationTime": 0,
                        "maxDurationTime": 0
                    },
                    "sum": {
                        "isActive": false,
                        "minSumValue": 0,
                        "maxSumValue": 0
                    },
                    "segmentations": []
                }
            ],
            "views": [],
            "sequences": [
                {
                    "steps": [
                        {
                            "key": "session",
                            "value": "start",
                            "probability": 100
                        },
                        {
                            "key": "events",
                            "value": "Login",
                            "probability": "100"
                        },
                        {
                            "key": "events",
                            "value": "Level Up",
                            "probability": "100"
                        },
                        {
                            "key": "events",
                            "value": "Purchase",
                            "probability": "100"
                        },
                        {
                            "key": "events",
                            "value": "Share Score",
                            "probability": "100"
                        },
                        {
                            "key": "events",
                            "value": "Invite Friends",
                            "probability": "100"
                        },
                        {
                            "key": "session",
                            "value": "end",
                            "probability": 100
                        }
                    ]
                }
            ],
            "behavior": {
                "runningSession": [
                    "2",
                    "5"
                ],
                "generalConditions": [],
                "sequences": [
                    {
                        "key": "Sequence_1",
                        "probability": 80
                    },
                    {
                        "key": "random",
                        "probability": 20
                    }
                ],
                "sequenceConditions": []
            }
        }
    ];
    /**
     * Generate random int between passed range
     * @param {number} min - min value of range
     * @param {number} max - max value of range
     * @returns {number} returns random number between min and max values
     **/
    function getRandomInt(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    /**
     * 
     * @param {array} arr - array of objects with probability property
     * @returns {string} returns random key from array
     */
    function randomGetOne(arr) {
        var randomNum = Math.random() * 100;
        for (let i = 0; i < arr.length; i++) {
            if (randomNum < parseInt(arr[i].probability, 10)) {
                return arr[i].key;
            }
            else {
                randomNum -= parseInt(arr[i].probability, 10);
            }
        }
        return null;
    }

    /**
     * 
     * @param {string} jsonString - stringified json
     * @returns {object} returns parsed json or string
     */
    function tryToParseJSON(jsonString) {
        try {
            jsonString.forEach(function(item) {
                item.key = JSON.parse(item.key);
            });
        }
        catch (e) {
            //
        }
        return jsonString;
    }

    /**
     * 
     * @param {Array} array - array of objects with probability property
     * @returns {string} returns random string from array 
     */
    function randomSelectByProbability(array) {
        const totalProbability = array.reduce(function(sum, item) {
            return sum + parseInt(item.probability, 10);
        }, 0);

        const randomNum = Math.random() * totalProbability;
        let selectedValue = null;
        let cumulativeProbability = 0;

        for (let i = 0; i < array.length; i++) {
            cumulativeProbability += parseInt(array[i].probability, 10);
            if (array[i].probability === 100) {
                selectedValue = array[i].key;
                break;
            }
            else if (randomNum <= cumulativeProbability) {
                selectedValue = array[i].key;
                break;
            }
        }
        return selectedValue;
    }


    /**
     * Capitalize first letter of string
     * @param {string} string - input string
     * @returns {string} returns string which first letter capitalized
     **/
    function capitaliseFirstLetter(string) {
        return string.charAt(0).toUpperCase() + string.slice(1);
    }

    /**
     * Creates an array of html sample pages
     * @param {string} populatorType - populator template type ('banking', 'gaming', etc.)
     * @returns {array} returns an array of html pages based on populatorType
     **/
    function getPageTemplates(populatorType) {
        return [
            "/populator/" + countlyCommon.ACTIVE_APP_KEY + "/demo-" + populatorType + ".html",
            "/populator/" + countlyCommon.ACTIVE_APP_KEY + "/demo-" + populatorType + "-1.html",
            "/populator/" + countlyCommon.ACTIVE_APP_KEY + "/demo-" + populatorType + "-2.html"
        ];
    }

    /**
     * Create user properties with Facebook Login, Twitter Login,
     * Twitter Login name and Has Apple Watch Os properties
     * @param {object} templateUp user properties template, if available
     * @returns {object} returns user properties
     **/
    function getUserProperties(templateUp) {
        if (!templateUp) {
            return {};
        }
        var up = {populator: true};

        if (countlyGlobal.apps[countlyCommon.ACTIVE_APP_ID] && countlyGlobal.apps[countlyCommon.ACTIVE_APP_ID].type === "web" && (Math.random() > 0.5)) {
            up.utm_source = sources[getRandomInt(0, sources.length - 1)];
            up.utm_medium = "cpc";
            up.utm_campaign = campaigns[getRandomInt(0, campaigns.length - 1)].id;
        }

        templateUp.forEach(function(item) {
            up[item.key] = randomSelectByProbability(tryToParseJSON(item.values));
        });

        let modifiedUpOnConditions = {};
        templateUp.forEach(function(item) {
            if (item.condition && up[item.condition.selectedKey] === item.condition.selectedValue) {
                modifiedUpOnConditions[item.key] = randomSelectByProbability(tryToParseJSON(item.condition.values));
            }
        });
        const mergedUp = Object.assign({}, up, modifiedUpOnConditions);
        return mergedUp;
    }

    // helper functions
    /**
     * Generate random string with size property
     * @param {number} size - length of random string
     * @returns {object} returns random string
     **/
    function randomString(size) {
        var alphaChars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
        var generatedString = '';
        for (var index = 0; index < size; index++) {
            generatedString += alphaChars[getRandomInt(0, alphaChars.length - 1)];
        }

        return generatedString;
    }
    /**
     * Get property of prop object with parameter,
     * @param {string} name - name of property
     * @returns {object} returns random object
     **/
    function getProp(name) {
        if (typeof props[name] === "function") {
            return props[name]();
        }
        else if (typeof props[name] !== "undefined") {
            return props[name][Math.floor(Math.random() * props[name].length)];
        }
    }
    /**
     * Get version based on current timestamp for better version adoption plotting,
     * @param {number} ts - current timestamp
     * @param {boolean} trimYear - trim year to look it like semantic versioning
     * @returns {string} returns version
     **/
    function getVersion(ts, trimYear) {
        var seed = ts || Date.now();
        seed = (seed + "").length === 13 ? seed : seed * 1000;
        var d = moment(seed);
        if (parseInt(d.format('DD')[1], 10) < 5) {
            if (Math.random() > 0.5) {
                seed -= 1000 * 60 * 60 * 24 * 6;
                d = moment(seed);
            }
        }
        var year = trimYear ? d.format('YY')[1] : d.format('YY');
        var day = parseInt(d.format('DD')[0], 10) === 3 ? 2 : d.format('DD')[0];
        return year + "." + d.format('MM') + "." + day;
    }
    /**
     * 
     * @param {object} userDetails - user details
     * @param {array} conditions - array of conditions
     * @returns {array} - returns null or array of values
     */
    function pickBehaviorConditionValue(userDetails, conditions) {
        const userCustom = userDetails.custom;
        if (!userCustom) {
            return null;
        }
        for (const condition of conditions) {
            const conditionKey = condition.selectedKey;
            const conditionValue = condition.selectedValue;
            if (userCustom[conditionKey] && userCustom[conditionKey] === conditionValue) {
                return condition.values;
            }
        }
        return null;
    }
    /**
     * Generate a user with random properties and actions
     * @param {object} templateUp user properties template, if available
     **/
    function User() {
        this.getProp = getProp;
        this.startTs = startTs;
        this.endTs = endTs;
        this.ts = getRandomInt(this.startTs, this.endTs);
        this.events = [];
        this.metrics = {};
        this.isRegistered = false;

        this.getUserFromTemplate = function(templateUp, index = 0) {
            this.getId = function() {
                /**
                 * Generate hash for id
                 * @returns {string} returns string contains 4 characters
                 **/
                function s4() {
                    return Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1);
                }
                return s4() + s4() + '-' + s4() + '-' + s4() + '-' + s4() + '-' + s4() + s4() + s4();
            };
            this.id = this.getId();
            this.isRegistered = false;

            // this.hasSession = false;
            this.ip = predefined_ip_addresses[Math.floor(chance.random() * (predefined_ip_addresses.length - 1))];
            if ((index % 3 === 0)) {
                this.userdetails = { custom: getUserProperties(templateUp) };
            }
            else {
                this.userdetails = { name: chance.name(), username: chance.twitter().substring(1), email: chance.email(), organization: capitaliseFirstLetter(chance.word()), phone: chance.phone(), gender: chance.gender().charAt(0), byear: chance.birthday().getFullYear(), custom: getUserProperties(templateUp) };
            }
            this.userdetails.custom.populator = true;


            if (countlyGlobal.apps[countlyCommon.ACTIVE_APP_ID] && countlyGlobal.apps[countlyCommon.ACTIVE_APP_ID].type === "web") {
                this.platform = this.getProp("_os_web");
            }
            else if (countlyGlobal.apps[countlyCommon.ACTIVE_APP_ID] && countlyGlobal.apps[countlyCommon.ACTIVE_APP_ID].type === "desktop") {
                this.platform = this.getProp("_os_desktop");
            }
            else {
                this.platform = this.getProp("_os");
            }
            this.app_version = getVersion(this.ts, true);
            this.metrics._os = this.platform;
            this.metrics._app_version = this.app_version;
            var m_props = metric_props.mobile;
            if (countlyGlobal.apps[countlyCommon.ACTIVE_APP_ID] && countlyGlobal.apps[countlyCommon.ACTIVE_APP_ID].type && metric_props[countlyGlobal.apps[countlyCommon.ACTIVE_APP_ID].type]) {
                m_props = metric_props[countlyGlobal.apps[countlyCommon.ACTIVE_APP_ID].type];
            }
            for (var mPropsIndex = 0; mPropsIndex < m_props.length; mPropsIndex++) {
                if (m_props[mPropsIndex] !== "_os") {
                    //handle specific cases
                    if (m_props[mPropsIndex] === "_store" && countlyGlobal.apps[countlyCommon.ACTIVE_APP_ID] && countlyGlobal.apps[countlyCommon.ACTIVE_APP_ID].type === "web") {
                        this.metrics[m_props[mPropsIndex]] = this.getProp("_source");
                    }
                    else {
                        //check os specific metric
                        if (typeof props[m_props[mPropsIndex] + "_" + this.platform.toLowerCase().replace(/\s/g, "_")] !== "undefined") {
                            this.metrics[m_props[mPropsIndex]] = this.getProp(m_props[mPropsIndex] + "_" + this.platform.toLowerCase().replace(/\s/g, "_"));
                        }
                        //default metric set
                        else {
                            this.metrics[m_props[mPropsIndex]] = this.getProp(m_props[mPropsIndex]);
                        }
                    }
                }
            }
        };
        this.getUserFromEnvironment = function(env) {
            this.id = env._id.split('_', 4)[3]; //device_id
            if (!this.userdetails) {
                this.userdetails = {};
            }
            this.platform = env.platform;
            this.app_version = env.appVersion;
            this.userdetails.custom = env.custom;

            this.metrics._os = this.platform;
            this.metrics._app_version = this.app_version;
        };
        this.getCrash = function() {
            var crash = {};
            crash._os = this.metrics._os;
            crash._os_version = this.metrics._os_version;
            crash._device = this.metrics._device;
            crash._manufacture = this.getProp("_manufacture");
            crash._resolution = this.metrics._resolution;
            crash._app_version = this.app_version;
            crash._cpu = this.getProp("_cpu");
            crash._opengl = this.getProp("_opengl");

            crash._ram_total = getRandomInt(1, 4) * 1024;
            crash._ram_current = getRandomInt(1, crash._ram_total);
            crash._disk_total = getRandomInt(1, 20) * 1024;
            crash._disk_current = getRandomInt(1, crash._disk_total);
            crash._bat_total = 100;
            crash._bat_current = getRandomInt(1, crash._bat_total);
            crash._orientation = (Math.random() > 0.5) ? "landscape" : "portrait";

            crash._root = (Math.random() > 0.5) ? true : false;
            crash._online = (Math.random() > 0.5) ? true : false;
            crash._signal = (Math.random() > 0.5) ? true : false;
            crash._muted = (Math.random() > 0.5) ? true : false;
            crash._background = (Math.random() > 0.5) ? true : false;

            const error = this.getError();
            if (typeof error === 'object') {
                crash = error;
            }
            else {
                crash._error = error;
            }
            crash._name = (crash._error.split('\n')[0] + "").trim();
            crash._logs = this.getLog();
            crash._nonfatal = (Math.random() > 0.5) ? true : false;
            crash._run = getRandomInt(1, 1800);

            var customs = ["facebook", "gideros", "admob", "chartboost", "googleplay"];
            crash._custom = {};
            for (var customsIndex = 0; customsIndex < customs.length; customsIndex++) {
                if (Math.random() > 0.5) {
                    crash._custom[customs[customsIndex]] = getRandomInt(1, 2) + "." + getRandomInt(0, 9);
                }
            }

            return crash;
        };

        this.getError = function() {
            var errors = [];
            if (countlyGlobal.apps[countlyCommon.ACTIVE_APP_ID].type === "web") {
                if (crashSymbolVersions.javascript.indexOf(this.metrics._app_version) === -1) {
                    crashSymbolVersions.javascript.push(this.metrics._app_version);
                }
                return jsErrors[getRandomInt(0, jsErrors.length - 1)].error;
            }
            else if (countlyGlobal.apps[countlyCommon.ACTIVE_APP_ID].type === "mobile") {
                errors = [{ // android
                    "_error": "03-28 19:55:14.784 20944-20944/? D/SomeImportantTag: java.lang.ArithmeticException: divide by zero\nat tt.rr.testprojsymb.MainActivity.i(Unknown Source)\nat tt.rr.testprojsymb.MainActivity.j(Unknown Source)\nat tt.rr.testprojsymb.MainActivity.OnclickTest(Unknown Source)\nat java.lang.reflect.Method.invoke(Native Method)\nat android.support.v7.app.m$a.onClick(Unknown Source)\nat android.view.View.performClick(View.java:5637)\nat android.view.View$PerformClick.run(View.java:22429)\nat android.os.Handler.handleCallback(Handler.java:751)\nat android.os.Handler.dispatchMessage(Handler.java:95)\nat android.os.Looper.loop(Looper.java:154)\nat android.app.ActivityThread.main(ActivityThread.java:6119)\nat java.lang.reflect.Method.invoke(Native Method)\nat com.android.internal.os.ZygoteInit$MethodAndArgsCaller.run(ZygoteInit.java:886)\nat com.android.internal.os.ZygoteInit.main(ZygoteInit.java:776)",
                    "_os_version": "8.1",
                    "_os": "android",
                    "_app_version": "22.02.0"
                },
                { //ios
                    "_architecture": "arm64",
                    "_binary_images": {
                        "GraphicsServices": {
                            "la": "0x1E7862000",
                            "id": "0D63A05D-8C80-3E93-B5FE-8A52208271B4"
                        },
                        "UIKitCore": {
                            "la": "0x21206C000",
                            "id": "DB4B7F70-0399-32B4-9DA3-7218B5A4BA49"
                        },
                        "libdyld.dylib": {
                            "la": "0x1E50B2000",
                            "id": "C6BB1027-199D-3836-888A-BC946A5055F5"
                        },
                        "CountlyTestApp-iOS": {
                            "la": "0x104C80000",
                            "id": "757F024F-EA35-3322-9E77-3AE793023AC3"
                        },
                        "libobjc.A.dylib": {
                            "la": "0x1E4833000",
                            "id": "3C1DC6C9-3E27-3DD3-938E-146C18CC5188"
                        },
                        "CoreFoundation": {
                            "la": "0x1E554D000",
                            "id": "65DB57E4-7B15-316D-8E61-C7E9B36D6EF5"
                        }
                    },
                    "_error": "CoreFoundation                      0x00000001e5669ebc <redacted> + 252\nlibobjc.A.dylib                     0x00000001e4839a50 objc_exception_throw + 56\nCoreFoundation                      0x00000001e55e1384 _CFArgv + 0\nCoreFoundation                      0x00000001e557157c <redacted> + 0\nCountlyTestApp-iOS                  0x0000000104c8910c CountlyTestApp-iOS + 37132\nCountlyTestApp-iOS                  0x0000000104c9a8c0 CountlyTestApp-iOS + 108736\nUIKitCore                           0x0000000212b62458 <redacted> + 1348\nUIKitCore                           0x0000000212b626bc <redacted> + 268\nUIKitCore                           0x000000021296087c <redacted> + 296\nUIKitCore                           0x000000021294e878 <redacted> + 384\nUIKitCore                           0x000000021297d880 <redacted> + 132\nCoreFoundation                      0x00000001e55f96bc <redacted> + 32\nCoreFoundation                      0x00000001e55f4350 <redacted> + 412\nCoreFoundation                      0x00000001e55f48f0 <redacted> + 1264\nCoreFoundation                      0x00000001e55f40e0 CFRunLoopRunSpecific + 436\nGraphicsServices                    0x00000001e786d584 GSEventRunModal + 100\nUIKitCore                           0x0000000212954c00 UIApplicationMain + 212\nCountlyTestApp-iOS                  0x0000000104ca2c3c CountlyTestApp-iOS + 142396\nlibdyld.dylib                       0x00000001e50b2bb4 <redacted> + 4",
                    "_executable_name": "CountlyTestApp-iOS",
                    "_os_version": "12.1.4",
                    "_app_version": "22.02.0",
                    "_os": "iOS",
                    "_build_uuid": crashBuildIds.ios[getRandomInt(0, crashBuildIds.ios.length - 1)]
                },
                { //plc
                    "_architecture": "arm64",
                    "_binary_images": {
                        "CountlyTestApp-iOS": {
                            "la": "0x10250c000",
                            "id": "83ba0b04-af12-301a-a7e5-bbbb20af0738"
                        },
                        "CoreFoundation": {
                            "la": "0x1ae3c3000",
                            "id": "7519e999-1053-3367-b9d5-8844f6d3bdc6"
                        },
                        "libobjc.A.dylib": {
                            "la": "0x1ae210000",
                            "id": "a697479d-4c5c-391e-b117-85b894ab94c6"
                        },
                        "UIKitCore": {
                            "la": "0x1b1b71000",
                            "id": "d7630067-7a00-3cb7-99e1-e7f6c55d85c5"
                        },
                        "GraphicsServices": {
                            "la": "0x1b8404000",
                            "id": "cefbbc61-fdb3-3db7-86bf-337e511616db"
                        },
                        "libdyld.dylib": {
                            "la": "0x1ae2ef000",
                            "id": "7b531a15-3e73-3185-90e2-b88d9476da5e"
                        },
                        "libsystem_kernel.dylib": {
                            "la": "0x1ae2c1000",
                            "id": "1b7d7184-05d6-3a83-bb1b-f9af6aef61f3"
                        },
                        "libsystem_c.dylib": {
                            "la": "0x1ae0e2000",
                            "id": "61459536-a83b-36a0-9004-5d168317d2a6"
                        },
                        "libc++abi.dylib": {
                            "la": "0x1ae2ad000",
                            "id": "295d93e6-ac06-384a-a469-2df327f697fc"
                        },
                        "libsystem_pthread.dylib": {
                            "la": "0x1ae1ff000",
                            "id": "1ff7a2fb-9f28-37b7-af39-344206a322bd"
                        },
                        "Foundation": {
                            "la": "0x1ae79f000",
                            "id": "7b1733b1-74c9-3a33-8a58-853b0a029826"
                        }
                    },
                    "_error": "Incident Identifier: C2F3B745-3450-49B1-B225-85A2795DDBAF\nCrashReporter Key:   TODO\nHardware Model:      iPhone9,1\nProcess:         CountlyTestApp-i [10790]\nPath:            /private/var/containers/Bundle/Application/35CC04E6-3BCF-4929-B2EA-999D3BC48136/CountlyTestApp-iOS.app/CountlyTestApp-iOS\nIdentifier:      ly.count.CountlyTestApp-iOS\nVersion:         1.0 (3.9)\nCode Type:       ARM-64\nParent Process:  ??? [1]\n\nDate/Time:       2020-03-18 14:55:59 +0000\nOS Version:      iPhone OS 13.3.1 (17D50)\nReport Version:  104\n\nException Type:  SIGABRT\nException Codes: #0 at 0x1ae2e5ec4\nCrashed Thread:  0\n\nApplication Specific Information:\n*** Terminating app due to uncaught exception 'NSGenericException', reason: 'This is the exception!'\n\nLast Exception Backtrace:\n0   CoreFoundation                      0x00000001ae4eea48 0x1ae3c3000 + 1227336\n1   libobjc.A.dylib                     0x00000001ae215fa4 0x1ae210000 + 24484\n2   CoreFoundation                      0x00000001ae3f30ec 0x1ae3c3000 + 196844\n3   CountlyTestApp-iOS                  0x0000000102514e88 0x10250c000 + 36488\n4   CountlyTestApp-iOS                  0x00000001025264a4 0x10250c000 + 107684\n5   UIKitCore                           0x00000001b273e948 0x1b1b71000 + 12376392\n6   UIKitCore                           0x00000001b273e464 0x1b1b71000 + 12375140\n7	0x1e401d000 -        0x1e401efff  libsystem_featureflags.dylib arm64  <00868befdde137a1a5d357ef7ae81db4> /usr/lib/system/libsystem_featureflags.dylib\n       0x1e401f000 -        0x1e404cfff  libsystem_m.dylib arm64  <51f1ec8ae61d3e2b821a8e0de77fc175> /usr/lib/system/libsystem_m.dylib\n       0x1e404d000 -        0x1e4052fff  libunwind.dylib arm64  <af53a4f641833a108f50e58c82933157> /usr/lib/system/libunwind.dylib\n       0x1e4332000 -        0x1e439afff  NanoRegistry arm64  <a24beb81e9cd32b59dde4cbb6d824c56> /System/Library/PrivateFrameworks/NanoRegistry.framework/NanoRegistry\n       0x1e439b000 -        0x1e43a8fff  NanoPreferencesSync arm64  <e302f1d35c6834bdb3effeb7e57cd6a5> /System/Library/PrivateFrameworks/NanoPreferencesSync.framework/NanoPreferencesSync\n       0x1e5dc7000 -        0x1e5ddafff  AppSSOCore arm64  <9e6cdcd2edef37dba4177852d95adfe7> /System/Library/PrivateFrameworks/AppSSOCore.framework/AppSSOCore",
                    "_executable_name": "CountlyTestApp-iOS",
                    "_os_version": "13.3.1",
                    "_app_version": "22.02.0", //this.metrics._app_version,
                    "_os": "iOS",
                    "_plcrash": true,
                    "_build_uuid": crashBuildIds.plc[getRandomInt(0, crashBuildIds.plc.length - 1)]
                }
                ];
                if (this.metrics._os && this.metrics._os.toLocaleLowerCase() === 'ios') {
                    const iosErrors = errors.filter(x=>x._os.toLocaleLowerCase() === 'ios');
                    const iosError = iosErrors[getRandomInt(0, iosErrors.length - 1)];
                    if (!crashSymbolVersions.iOS.filter(x=>x._build_uuid === iosError._build_uuid).length) {
                        crashSymbolVersions.iOS.push(iosError);
                    }
                    return crashSymbolVersions.iOS[crashSymbolVersions.iOS.length - 1];
                }
                else if (this.metrics._os && this.metrics._os.toLocaleLowerCase() === 'android') {
                    const androidErrors = errors.filter(x=>x._os.toLocaleLowerCase() === 'android');
                    const androidError = androidErrors[getRandomInt(0, androidErrors.length - 1)];

                    if (!crashSymbolVersions.android.filter(x=>x._app_version === androidError._app_version).length) {
                        crashSymbolVersions.android.push(androidError);
                    }
                    return crashSymbolVersions.android[crashSymbolVersions.android.length - 1];
                }
            }
            else {
                errors = [
                    { // macos
                        "_architecture": "x86_64",
                        "_binary_images": {
                            "CountlyTestApp-macOS": {
                                "la": "0x109904000",
                                "id": "530CF9BF-974B-3B37-B976-309A522FB6AC"
                            },
                            "CoreFoundation": {
                                "la": "0x7FFF41D9F000",
                                "id": "596DBC2A-60E3-3A73-AA5F-7A1806CF3204"
                            },
                            "libobjc.A.dylib": {
                                "la": "0x7FFF6C582000",
                                "id": "7C312627-43CB-3234-9324-4DEA92D59F50"
                            },
                            "libdyld.dylib": {
                                "la": "0x7FFF6DD4F000",
                                "id": "002418CC-AD11-3D10-865B-015591D24E6C"
                            },
                            "AppKit": {
                                "la": "0x7FFF3F3B5000",
                                "id": "E23B2968-32EA-340D-9E5E-12F5370DC55D"
                            }
                        },
                        "_error": "0   CoreFoundation                      0x00007fff41e90acd __exceptionPreprocess + 256\n1   libobjc.A.dylib                     0x00007fff6c596a17 objc_exception_throw + 48\n2   CoreFoundation                      0x00007fff41eaa629 -[NSException raise] + 9\n3   CountlyTestApp-macOS                0x000000010990560d -[AppDelegate onClick_events:] + 565\n4   AppKit                              0x00007fff3f6c1644 -[NSApplication(NSResponder) sendAction:to:from:] + 312\n5   AppKit                              0x00007fff3f72b992 -[NSControl sendAction:to:] + 86\n6   AppKit                              0x00007fff3f72b8c4 __26-[NSCell _sendActionFrom:]_block_invoke + 136\n7   AppKit                              0x00007fff3f72b7c6 -[NSCell _sendActionFrom:] + 178\n8   AppKit                              0x00007fff3f75854b -[NSButtonCell _sendActionFrom:] + 96\n9   AppKit                              0x00007fff3f72a0e1 -[NSCell trackMouse:inRect:ofView:untilMouseUp:] + 2375\n10  AppKit                              0x00007fff3f75829c -[NSButtonCell trackMouse:inRect:ofView:untilMouseUp:] + 698\n11  AppKit                              0x00007fff3f728b1e -[NSControl mouseDown:] + 791\n12  AppKit                              0x00007fff3f604937 -[NSWindow(NSEventRouting) _handleMouseDownEvent:isDelayedEvent:] + 5724\n13  AppKit                              0x00007fff3f53b1a6 -[NSWindow(NSEventRouting) _reallySendEvent:isDelayedEvent:] + 2295\n14  AppKit                              0x00007fff3f53a667 -[NSWindow(NSEventRouting) sendEvent:] + 478\n15  AppKit                              0x00007fff3f3d9e4b -[NSApplication(NSEvent) sendEvent:] + 331\n16  CountlyTestApp-macOS                0x00000001099184f6 -[CLYExceptionHandlingApplication sendEvent:] + 61\n17  AppKit                              0x00007fff3f3c85c0 -[NSApplication run] + 755\n18  AppKit                              0x00007fff3f3b7ac8 NSApplicationMain + 777\n19  libdyld.dylib                       0x00007fff6dd653d5 start + 1\n20  ???                                 0x0000000000000001 0x0 + 1",
                        "_executable_name": "CountlyTestApp-macOS",
                        "_os_version": "10.14.6",
                        "_app_version": "22.02.0", //this.metrics._app_version,
                        "_os": "macOS",
                        "_build_uuid": "530CF9BF-974B-3B37-B976-309A522FB6AC"
                    },
                    { // smartTv
                        "_architecture": "arm64",
                        "_binary_images": {
                            "GraphicsServices": {
                                "la": "0x1B5CC4000",
                                "id": "A6C6685B-0224-3FFE-8B15-6018960EF344"
                            },
                            "UIKitCore": {
                                "la": "0x1D5DEC000",
                                "id": "21E54528-6817-398D-B9C3-79C9B69F1EB9"
                            },
                            "CoreFoundation": {
                                "la": "0x1B375A000",
                                "id": "ADFE7F81-D7AC-3AE1-9517-5BF663E733FF"
                            },
                            "CountlyTestApp-tvOS": {
                                "la": "0x100778000",
                                "id": "71881E31-A5A0-326A-BC1E-92F0C5885C03"
                            },
                            "libobjc.A.dylib": {
                                "la": "0x1B3186000",
                                "id": "17E94787-C2CC-32BA-B81B-6766FCA70EEA"
                            },
                            "libdyld.dylib": {
                                "la": "0x1B3292000",
                                "id": "3DB3C039-2550-3901-A3AE-7C4EAE3C548E"
                            }
                        },
                        "_error": "0   CoreFoundation                      0x00000001b3884e28 ADFE7F81-D7AC-3AE1-9517-5BF663E733FF + 1224232\n1   libobjc.A.dylib                     0x00000001b318e8b0 objc_exception_throw + 56\n2   CoreFoundation                      0x00000001b38da57c ADFE7F81-D7AC-3AE1-9517-5BF663E733FF + 1574268\n3   CoreFoundation                      0x00000001b377c90c ADFE7F81-D7AC-3AE1-9517-5BF663E733FF + 141580\n4   CountlyTestApp-tvOS                 0x000000010077f8e0 +[ViewController crashTest1] + 128\n5   UIKitCore                           0x00000001d66ed4f4 21E54528-6817-398D-B9C3-79C9B69F1EB9 + 9442548\n6   UIKitCore                           0x00000001d61f0ee4 21E54528-6817-398D-B9C3-79C9B69F1EB9 + 4214500\n7   UIKitCore                           0x00000001d61f1248 21E54528-6817-398D-B9C3-79C9B69F1EB9 + 4215368\n8   UIKitCore                           0x00000001d633e744 21E54528-6817-398D-B9C3-79C9B69F1EB9 + 5580612\n9   UIKitCore                           0x00000001d6346c84 21E54528-6817-398D-B9C3-79C9B69F1EB9 + 5614724\n10  UIKitCore                           0x00000001d6344420 21E54528-6817-398D-B9C3-79C9B69F1EB9 + 5604384\n11  UIKitCore                           0x00000001d6343980 21E54528-6817-398D-B9C3-79C9B69F1EB9 + 5601664\n12  UIKitCore                           0x00000001d6337b74 21E54528-6817-398D-B9C3-79C9B69F1EB9 + 5553012\n13  UIKitCore                           0x00000001d63372ec 21E54528-6817-398D-B9C3-79C9B69F1EB9 + 5550828\n14  UIKitCore                           0x00000001d63370b0 21E54528-6817-398D-B9C3-79C9B69F1EB9 + 5550256\n15  UIKitCore                           0x00000001d67256b0 21E54528-6817-398D-B9C3-79C9B69F1EB9 + 9672368\n16  UIKitCore                           0x00000001d6702f04 21E54528-6817-398D-B9C3-79C9B69F1EB9 + 9531140\n17  UIKitCore                           0x00000001d67750cc 21E54528-6817-398D-B9C3-79C9B69F1EB9 + 9998540\n18  UIKitCore                           0x00000001d6776e94 21E54528-6817-398D-B9C3-79C9B69F1EB9 + 10006164\n19  UIKitCore                           0x00000001d6770a8c 21E54528-6817-398D-B9C3-79C9B69F1EB9 + 9980556\n20  CoreFoundation                      0x00000001b3802eec ADFE7F81-D7AC-3AE1-9517-5BF663E733FF + 691948\n21  CoreFoundation                      0x00000001b3802e44 ADFE7F81-D7AC-3AE1-9517-5BF663E733FF + 691780\n22  CoreFoundation                      0x00000001b38025dc ADFE7F81-D7AC-3AE1-9517-5BF663E733FF + 689628\n23  CoreFoundation                      0x00000001b37fd728 ADFE7F81-D7AC-3AE1-9517-5BF663E733FF + 669480\n24  CoreFoundation                      0x00000001b37fcfc8 CFRunLoopRunSpecific + 464\n25  GraphicsServices                    0x00000001b5cca328 GSEventRunModal + 104\n26  UIKitCore                           0x00000001d66ec40c UIApplicationMain + 1852\n27  CountlyTestApp-tvOS                 0x000000010078e96c main + 88\n28  libdyld.dylib                       0x00000001b32955f8 3DB3C039-2550-3901-A3AE-7C4EAE3C548E + 13816",
                        "_executable_name": "CountlyTestApp-tvOS",
                        "_os_version": "13.3.1",
                        "_app_version": "22.02.0", //this.metrics._app_version,
                        "_os": "tvOS",
                        "_build_uuid": "71881E31-A5A0-326A-BC1E-92F0C5885C03"
                    }
                ];
                if (this.metrics._os && this.metrics._os.toLocaleLowerCase() === "tvos") {
                    const tvosError = errors.filter(x=>x._os.toLocaleLowerCase() === "tvos")[0];
                    if (!crashSymbolVersions.tvOS.filter(x=>x._build_uuid === tvosError._build_uuid).length) {
                        crashSymbolVersions.tvOS.push(tvosError);
                    }
                    return crashSymbolVersions.tvOS[crashSymbolVersions.tvOS.length - 1];
                }
                else if (this.metrics._os && this.metrics._os.toLocaleLowerCase() === "macos") {
                    const macosError = errors.filter(x=>x._os.toLocaleLowerCase() === "macos")[0];
                    if (!crashSymbolVersions.macOS.filter(x=>x._build_uuid === macosError._build_uuid).length) {
                        crashSymbolVersions.macOS.push(macosError);
                    }
                    return crashSymbolVersions.macOS[crashSymbolVersions.macOS.length - 1];
                }
                else {
                    return "System.ArgumentOutOfRangeException\n" +
                    "   at System.ThrowHelper.ThrowArgumentOutOfRangeException()\n" +
                    "   at System.Collections.Generic.List`1.get_Item(Int32 index)\n" +
                    "   at StorePuzzle.PuzzleRenderer.HandleTileReleased(Object sender, PointerRoutedEventArgs e)";
                }
            }
        };

        this.getLog = function() {
            var actions = [
                "clicked button 1",
                "clicked button 2",
                "clicked button 3",
                "clicked button 4",
                "clicked button 5",
                "rotated phone",
                "clicked back",
                "entered screen",
                "left screen",
                "touched screen",
                "taped screen",
                "long touched screen",
                "swipe left detected",
                "swipe right detected",
                "swipe up detected",
                "swipe down detected",
                "gesture detected",
                "shake detected"
            ];

            var items = getRandomInt(5, 10);
            var logs = [];
            for (var itemIndex = 0; itemIndex < items; itemIndex++) {
                logs.push(actions[getRandomInt(0, actions.length - 1)]);
            }
            return logs.join("\n");
        };

        this.getTrace = function() {
            var trace = {};
            trace.stz = getRandomInt(this.startTs, this.endTs);
            trace.etz = getRandomInt(trace.stz, this.endTs);
            trace.stz *= 1000;
            trace.etz *= 1000;
            var rand = Math.random();
            if (rand < 0.3) {
                trace.type = "device";
                trace.apm_metrics = {};
                if (countlyGlobal.apps[countlyCommon.ACTIVE_APP_ID].type === "web") {
                    trace.name = viewSegments.name[getRandomInt(0, viewSegments.name.length - 1)];
                    trace.apm_metrics.first_paint = getRandomInt(0, 100);
                    trace.apm_metrics.first_contentful_paint = getRandomInt(0, 500);
                    trace.apm_metrics.dom_interactive = getRandomInt(0, 1000);
                    trace.apm_metrics.dom_content_loaded_event_end = getRandomInt(0, 300);
                    trace.apm_metrics.load_event_end = getRandomInt(0, 500);
                    trace.apm_metrics.first_input_delay = getRandomInt(0, 500);
                }
                else {
                    var device_traces = ["app_start", "app_in_background", "app_in_foreground"];
                    trace.name = device_traces[getRandomInt(0, device_traces.length - 1)];
                    trace.apm_metrics.duration = getRandomInt(0, 5000);
                }
            }
            else if (rand < 0.6) {
                trace.type = "device";
                trace.name = viewSegments.name[getRandomInt(0, viewSegments.name.length - 1)];
                trace.apm_metrics = {};
                trace.apm_metrics.slow_rendering_frames = getRandomInt(0, 100);
                trace.apm_metrics.frozen_frames = getRandomInt(0, 100);
            }
            else {
                trace.type = "network";
                trace.name = this.getProp("_source");
                trace.apm_metrics = {
                    response_time: getRandomInt(0, 5000),
                    response_payload_size: getRandomInt(0, 5000000),
                    request_payload_size: getRandomInt(0, 5000000),
                    response_code: (Math.random() > 0.5) ? getRandomInt(400, 500) : 200
                };
            }
            return trace;
        };

        this.getEvent = function(id, eventTemplate, ts, isRandom) {
            var event = {
                "key": id,
                "count": 1,
                "timestamp": ts || this.ts,
                "hour": getRandomInt(0, 23),
                "dow": getRandomInt(0, 6)
            };

            if (!id && eventTemplate && Object.keys(eventTemplate).length) {
                event.key = eventTemplate.key;
            }

            if (eventTemplate && eventTemplate.duration && eventTemplate.duration.isActive) {
                event.dur = getRandomInt(parseInt(eventTemplate.duration.minDurationTime, 10), parseInt(eventTemplate.duration.maxDurationTime, 10) || 10);
            }

            if (eventTemplate && eventTemplate.sum && eventTemplate.sum.isActive) {
                event.sum = getRandomInt(parseInt(eventTemplate.sum.minSumValue, 10), parseInt(eventTemplate.sum.maxSumValue, 10) || 10);
            }
            else if (eventTemplate && eventTemplate.segmentations && eventTemplate.segmentations.length) {
                event.segmentation = {};
                var eventSegmentations = {};
                var modifiedSegmentationsOnCondition = {};
                eventTemplate.segmentations.forEach(function(item) {
                    var values = item.values;
                    var key = item.key;
                    eventSegmentations[key] = randomSelectByProbability(tryToParseJSON(values));
                    if (id === "[CLY]_view") {
                        eventSegmentations.name = eventTemplate.key;
                        eventSegmentations.visit = 1;
                        eventSegmentations.start = 1;
                        eventSegmentations.bounce = 1;
                    }
                });
                eventTemplate.segmentations.forEach(function(item) {
                    if (item.condition && Object.keys(eventSegmentations).includes(item.condition.selectedKey) && eventSegmentations[item.condition.selectedKey] === item.condition.selectedValue) {
                        var values = item.condition.values;
                        var key = item.key;
                        modifiedSegmentationsOnCondition[key] = randomSelectByProbability(tryToParseJSON(values));
                    }
                });
                event.segmentation = Object.assign({}, eventSegmentations, modifiedSegmentationsOnCondition);
            }
            else if (id === "[CLY]_view" && isRandom) {
                event.segmentation = {};
                var populatorType = countlyPopulator.getSelectedTemplate().substr(7).toLowerCase();
                Object.keys(viewSegments).forEach(function(key) {
                    var values = [];
                    if (countlyGlobal.apps[countlyCommon.ACTIVE_APP_ID].type === "web" && key === "name") {
                        values = getPageTemplates(populatorType);
                    }
                    else {
                        values = viewSegments[key];
                    }
                    event.segmentation[key] = values[getRandomInt(0, values.length - 1)];
                });
            }
            else if (id === "[CLY]_orientation") {
                event.segmentation = {mode: (Math.random() > 0.5) ? "landscape" : "portrait"};
            }
            else if (id === "[CLY]_view" && eventTemplate && (!eventTemplate.segmentations || !eventTemplate.segmentations.length)) {
                event.segmentation = {};
                event.segmentation.name = eventTemplate.key;
                event.segmentation.visit = 1;
                event.segmentation.start = 1;
                event.segmentation.bounce = 1;
            }

            return [event];
        };

        this.getEvents = function(count, templateEvents) {
            if (!templateEvents || !templateEvents.length) {
                return [];
            }

            var events = [];
            for (var eventIndex = 0; eventIndex < count; eventIndex++) {
                var randomEvent = templateEvents[getRandomInt(0, templateEvents.length - 1)]; //eventKeys[getRandomInt(0, eventKeys.length - 1)];
                events.push(this.getEvent(randomEvent.key, randomEvent));
            }

            return events;
        };

        this.getFeedbackEvents = function() {
            var events = [];
            events.push(this.getRatingEvent());
            if (countlyGlobal.plugins.indexOf("surveys") !== -1 && countlyAuth.validateCreate("surveys")) {
                events.push(this.getNPSEvent());
                events.push(this.getSurveyEvent());
            }
            return events;
        };

        this.getRatingEvent = function() {
            var event = {
                "key": "[CLY]_star_rating",
                "count": 1,
                "timestamp": this.ts,
                "hour": getRandomInt(0, 23),
                "dow": getRandomInt(1, 6),
                "test": 1,
            };

            this.ts += 1000;
            event.segmentation = {};
            event.segmentation.email = chance.email();
            event.segmentation.comment = chance.sentence({words: 7});
            event.segmentation.rating = getRandomInt(1, 5);
            event.segmentation.app_version = this.app_version;
            event.segmentation.platform = this.platform ? this.platform : this.metrics._os;
            if (ratingWidgetList.length) {
                event.segmentation.widget_id = ratingWidgetList[getRandomInt(0, ratingWidgetList.length - 1)]._id;
            }
            return event;
        };

        this.getNPSEvent = function() {
            var event = {
                "key": "[CLY]_nps",
                "count": 1,
                "timestamp": this.ts,
                "hour": getRandomInt(0, 23),
                "dow": getRandomInt(1, 6),
                "test": 1,
            };

            this.ts += 1000;
            event.segmentation = {};
            event.segmentation.comment = chance.sentence({words: 7});
            event.segmentation.rating = getRandomInt(0, 10);
            event.segmentation.app_version = this.app_version;
            event.segmentation.platform = this.metrics._os;
            event.segmentation.shown = 1;
            if (npsWidgetList.length) {
                event.segmentation.widget_id = npsWidgetList[getRandomInt(0, npsWidgetList.length - 1)];
            }
            return event;
        };

        this.getSurveyEvent = function() {
            var event = {
                "key": "[CLY]_survey",
                "count": 1,
                "timestamp": this.ts,
                "hour": getRandomInt(0, 23),
                "dow": getRandomInt(1, 6),
                "test": 1,
            };

            this.ts += 1000;
            event.segmentation = {};
            event.segmentation.app_version = this.app_version;
            event.segmentation.platform = this.metrics._os;
            event.segmentation.shown = 1;
            var keys = Object.keys(surveyWidgetList);
            if (keys.length) {

                event.segmentation.widget_id = keys[getRandomInt(0, keys.length - 1)];

                var structure = surveyWidgetList[event.segmentation.widget_id];

                for (var z = 0; z < structure.questions.length; z++) {
                    //"multi", "radio", "text", "dropdown", "rating"
                    if (structure.questions[z].type === "text") {
                        event.segmentation["answ-" + structure.questions[z].id] = chance.sentence({words: 7});
                    }
                    else if (structure.questions[z].type === "rating") {
                        event.segmentation["answ-" + structure.questions[z].id] = getRandomInt(0, 10);
                    }
                    else {
                        if (structure.questions[z].choices && structure.questions[z].choices.length > 0) {

                            var ch = [];
                            var chcount = 1;
                            if (structure.questions[z].type === "multi") { //multiple choices
                                chcount = getRandomInt(1, structure.questions[z].choices.length - 1);
                            }
                            var pp = getRandomInt(0, structure.questions[z].choices.length - 1);
                            var ll = structure.questions[z].choices.length;
                            for (var k = 0; k < chcount; k++) {
                                ch.push(structure.questions[z].choices[(pp + k) % ll].key);
                            }
                            event.segmentation["answ-" + structure.questions[z].id] = ch.join(",");
                        }
                        else {
                            event.segmentation["answ-" + structure.questions[z].id] = "No chances???";
                        }
                    }
                }
            }
            return event;
        };

        this.getHeatmapEvents = function() {
            var events = this.getHeatmapEvent();

            if (Math.random() >= 0.5) {
                events = events.concat(this.getHeatmapEvent());

                if (Math.random() >= 0.8) {
                    events = events.concat(this.getHeatmapEvent());
                }
            }

            return events;
        };

        this.getHeatmapEvent = function() {
            var populatorType = countlyPopulator.getSelectedTemplate().substr(7).toLowerCase();

            var views = getPageTemplates(populatorType);
            var event = {
                "key": "[CLY]_action",
                "count": 1,
                "timestamp": this.ts,
                "hour": getRandomInt(0, 23),
                "dow": getRandomInt(0, 6),
                "test": 1
            };
            var selectedOffsets = [{x: 468, y: 366}, {x: 1132, y: 87}, {x: 551, y: 87}, {x: 647, y: 87}, {x: 1132, y: 87}];

            this.ts += 1000;

            event.segmentation = {};
            event.segmentation.type = "click";

            var dice = getRandomInt(0, 6) % 2 === 0 ? true : false;
            if (dice) {
                var randomIndex = getRandomInt(0, selectedOffsets.length - 1);
                event.segmentation.x = selectedOffsets[randomIndex].x;
                event.segmentation.y = selectedOffsets[randomIndex].y;
            }
            else {
                event.segmentation.x = getRandomInt(0, 1440);
                event.segmentation.y = getRandomInt(0, 990);
            }

            event.segmentation.width = 1440;
            event.segmentation.height = 3586;
            event.segmentation.domain = window.location.origin;
            event.segmentation.view = views[Math.floor(Math.random() * views.length)];
            return [event];
        };

        this.getScrollmapEvents = function() {
            var events = this.getScrollmapEvent();

            if (Math.random() >= 0.5) {
                events = events.concat(this.getScrollmapEvent());

                if (Math.random() >= 0.8) {
                    events = events.concat(this.getScrollmapEvent());
                }
            }

            return events;
        };

        this.getScrollmapEvent = function() {
            var populatorType = countlyPopulator.getSelectedTemplate().substr(7).toLowerCase();

            var views = getPageTemplates(populatorType);
            var event = {
                "key": "[CLY]_action",
                "count": 1,
                "timestamp": this.ts,
                "hour": getRandomInt(0, 23),
                "dow": getRandomInt(0, 6),
                "test": 1
            };
            this.ts += 1000;
            event.segmentation = {};
            event.segmentation.type = "scroll";
            // 0: min value of scrollY variable for demoPage
            // 3270: max value of scrollY variable for demoPage
            // 983: viewportHeight
            event.segmentation.y = getRandomInt(0, 3602) + 983;
            event.segmentation.width = 1440;
            event.segmentation.height = 3586;
            event.domain = window.location.origin;
            event.segmentation.view = views[Math.floor(Math.random() * views.length)];
            return [event];
        };

        this.getAllEventsAndSessionsForRandomSequence = function(template) {
            var req = {};
            var events;

            if (!this.isRegistered) {
                this.isRegistered = true;
                events = this.getEvent("[CLY]_view", template && template.events && template.events["[CLY]_view"], this.ts, true)
                    .concat(
                        this.getEvent("[CLY]_orientation", template && template.events && template.events["[CLY]_orientation"], this.ts + getRandomInt(100, 300)),
                        this.getEvents(4, template && template.events)
                    );
                if (template && template.events && Object.keys(template.events).length > 0) {
                    events = events.concat(this.getEvent(null, template.events[0]));
                }
                req = {timestamp: this.ts, begin_session: 1, metrics: this.metrics, user_details: this.userdetails, events: events, apm: this.getTrace(), ignore_cooldown: '1'};
                req.events = req.events.concat(this.getHeatmapEvents());
                req.events = req.events.concat(this.getFeedbackEvents());
                req.events = req.events.concat(this.getScrollmapEvents());
            }
            else {
                events = this.getEvent("[CLY]_view", template && template.events && template.events["[CLY]_view"], this.ts, true)
                    .concat(
                        this.getEvent("[CLY]_orientation", template && template.events && template.events["[CLY]_orientation"], this.ts + getRandomInt(100, 300)),
                        this.getEvents(4, template && template.events)
                    );
                if (template && template.events && template.events.length) {
                    events = events.concat(this.getEvent(null, template.events[0]));
                }
                req = {timestamp: this.ts, begin_session: 1, events: events, apm: this.getTrace(), ignore_cooldown: '1'};
            }

            if (Math.random() > 0.10) {
                this.hasPush = true;
                req.token_session = 1;
                req.test_mode = 0;
                req[this.platform.toLowerCase() + "_token"] = randomString(8);
            }

            if (Math.random() > 0.50) {
                req.crash = this.getCrash();
            }

            var consents = ["sessions", "events", "views", "scrolls", "clicks", "forms", "crashes", "push", "attribution", "users"];
            req.consent = {};

            for (var consentIndex = 0; consentIndex < consents.length; consentIndex++) {
                req.consent[consents[consentIndex]] = (Math.random() > 0.8) ? false : true;
            }
            req.user_details = this.userdetails;
            return req;
        };

        this.startSessionForAb = function(user) {
            var req = {timestamp: this.ts, begin_session: 1, metrics: this.metrics, user_details: user, ignore_cooldown: '1'};
            this.request(req);
            flushAllRequests([req]);
            this.ts = this.ts + getRandomInt(100, 300);
        };

        this.request = function(params) {
            params.device_id = this.id;
            if (this.ip) {
                params.ip_address = this.ip;
            }
            params.hour = getRandomInt(0, 23);
            params.dow = getRandomInt(0, 6);
            params.populator = true;
            if (countlyGlobal.apps[countlyCommon.ACTIVE_APP_ID] && countlyGlobal.apps[countlyCommon.ACTIVE_APP_ID].type === "web") {
                params.sdk_name = "javascript_native_web";
            }
            else {
                params.sdk_name = (Math.random() > 0.5) ? "objc-native-ios" : "java-native-android";
            }
            params.sdk_version = getVersion(params.timestamp);
            bulk.push(params);
        };

        this.reportConversion = function(uid, campaingId, deviceId) {
            $.ajax({
                type: "GET",
                url: countlyCommon.API_URL + "/i",
                data: {
                    campaign_id: uid,
                    campaign_user: campaingId,
                    app_key: countlyCommon.ACTIVE_APP_KEY,
                    device_id: deviceId,
                    timestamp: getRandomInt(startTs, endTs),
                    populator: true
                },
                success: function() {}
            });
        };

        this.generateAllEventsAndSessions = function(template, runCount, hasEnvironment) {
            return new Promise((resolve) => {
                completedRequestCount++;
                this.ts = getRandomInt(startTs, endTs);
                var endSessionTs = null;
                var req = {};
                let selectedSequence = null;
                if (template && template.behavior && template.behavior.sequences && template.behavior.sequences.length) {
                    // process every sequence
                    while (runCount > 0) {
                        // select random sequence from behavior
                        if (template.behavior.sequenceConditions && template.behavior.sequenceConditions.length) {
                            const matchedConditionValues = pickBehaviorConditionValue(this.userdetails, template.behavior.sequenceConditions);
                            selectedSequence = matchedConditionValues ? randomSelectByProbability(matchedConditionValues) : randomSelectByProbability(template.behavior.sequences);
                        }
                        else {
                            selectedSequence = randomSelectByProbability(template.behavior.sequences);
                        }
                        if (selectedSequence === "random") {
                            req = this.getAllEventsAndSessionsForRandomSequence(template);
                        }
                        else {
                            selectedSequence = template.sequences[parseInt(selectedSequence.split('_', 2)[1], 10) - 1];
                            // process every step of a sequence
                            for (let i = 0; i < selectedSequence.steps.length; i++) {
                                let sequenceEvents = [];
                                let sequenceViews = [];
                                let selectedSequenceStep = selectedSequence.steps[i];
                                // decides if step should be executed in accordance with probability.
                                // e.g./ if the probability of a step is %20, it will be executed with a %20 probability otherwise it will be skipped
                                if (!randomGetOne([selectedSequenceStep])) {
                                    continue;
                                }

                                switch (selectedSequenceStep.key) {
                                case "session":
                                    if (selectedSequenceStep.value === "start") {
                                        // this.hasSession = true;
                                        this.isRegistered = true;
                                        req = {timestamp: this.ts, begin_session: 1, ignore_cooldown: '1'};
                                        if (!hasEnvironment) {
                                            req.metrics = this.metrics;
                                            req.user_details = this.userdetails;
                                        }
                                        this.ts = this.ts + getRandomInt(100, 300);
                                    }
                                    break;
                                case "events":
                                    sequenceEvents = template.events.filter(x=>x.key === selectedSequenceStep.value);
                                    if (sequenceEvents && sequenceEvents.length) {
                                        var randomGapBetweenEvents = getRandomInt(100, 300);
                                        this.ts = this.ts + randomGapBetweenEvents;
                                        if (!req.events) {
                                            req.events = [];
                                        }
                                        req.events = req.events.concat(this.getEvent(null, sequenceEvents[0], this.ts));
                                    }
                                    break;
                                case "views":
                                    var randomGapBetweenViews = getRandomInt(100, 300);
                                    this.ts = this.ts + randomGapBetweenViews;
                                    sequenceViews = template.views.filter(x=>x.key === selectedSequenceStep.value);
                                    if (!req.events) {
                                        req.events = [];
                                    }
                                    req.events = req.events.concat(this.getEvent("[CLY]_view", sequenceViews[0], this.ts));
                                    break;
                                default:
                                    break;
                                }
                            }
                        }
                        runCount--;
                        this.request(req);
                        req = {};
                        let minRunningSession = parseInt(template.behavior.runningSession[0], 10);
                        let maxRunningSession = parseInt(template.behavior.runningSession[1], 10);

                        if (template.behavior.generalConditions && template.behavior.generalConditions.length) {
                            const matchedConditionValues = pickBehaviorConditionValue(this.userdetails, template.behavior.generalConditions);
                            if (matchedConditionValues) {
                                minRunningSession = parseInt(matchedConditionValues[0], 10);
                                maxRunningSession = parseInt(matchedConditionValues[1], 10);
                            }
                        }

                        endSessionTs = this.ts;
                        var randomHours = getRandomInt(minRunningSession, maxRunningSession);
                        var randomSeconds = randomHours * 3600;
                        this.ts = this.ts + randomSeconds;
                        if (runCount === 0) {
                            req = {timestamp: endSessionTs, end_session: 1, ignore_cooldown: '1'};
                            this.request(req);
                            resolve(bulk);
                        }
                    }
                }
            });
        };

        this.saveEnvironment = function(environmentUserList, setEnviromentInformationOnce) {
            const data = {
                app_key: countlyCommon.ACTIVE_APP_KEY,
                users: JSON.stringify(environmentUserList),
                populator: true
            };
            if (setEnviromentInformationOnce) {
                data.setEnviromentInformationOnce = true;
            }
            return new Promise((resolve, reject) => {
                $.ajax({
                    type: "POST",
                    url: countlyCommon.API_URL + "/i/populator/environment/save",
                    data: data,
                    success: function() {
                        resolve(true);
                    },
                    error: function() {
                        reject(false);
                    }
                });
            });
        };
    }

    var bulk = [];
    var campaingClicks = [];
    var startTs = 1356998400;
    var endTs = new Date().getTime() / 1000;
    var generating = false;
    var stopCallback = null;
    var users = [];
    var userAmount = 1000;
    var abExampleCount = 1;
    var abExampleName = "Pricing";
    var _templateType = '';
    var runCount = 0;
    var completedRequestCount = 0;
    var crashSymbolVersions = {
        javascript: [],
        iOS: [],
        android: [],
        macOS: [],
        tvOS: [],
        plc: []
    };

    /**
     * 
     * @param {array} req - request 
     * @returns {promise} returns promise
     */
    function flushAllRequests(req) {
        return new Promise((resolve, reject) => {
            if (generating) {
                $.ajax({
                    type: "POST",
                    url: countlyCommon.API_URL + "/i/bulk",
                    data: {
                        app_key: countlyCommon.ACTIVE_APP_KEY,
                        requests: JSON.stringify(req),
                        populator: true
                    },
                    success: function(response) {
                        if (response && response.status === 504) {
                            reject(false);
                        }
                        else {
                            resolve(true);
                        }
                    },
                    error: function() {
                        reject(false);
                    }
                });
            }
            else {
                resolve(true);
            }
        });
    }
    /**
     * Create campaign
     * @param {string} id - id of campaign
     * @param {string} name - name of campaign
     * @param {number} cost - cost of campaign
     * @param {string} type - cost type of campaign
     * @param {callback} callback - callback method
     **/
    function createCampaign(id, name, cost, type, callback) {
        $.ajax({
            type: "GET",
            url: countlyCommon.API_URL + "/i/campaign/create",
            data: {
                args: JSON.stringify({
                    "_id": id + countlyCommon.ACTIVE_APP_ID,
                    "name": name,
                    "link": "http://count.ly",
                    "cost": cost,
                    "costtype": type,
                    "fingerprint": false,
                    "links": {},
                    "postbacks": [],
                    "app_id": countlyCommon.ACTIVE_APP_ID
                }),
                populator: true
            },
            success: callback,
            error: callback
        });
    }
    /**
     * Create message
     * @param {object} data - message data
     * @param {callback} callback - callback method
     **/
    function createMessage(data, callback) {
        if (data._id) {
            return;
        }

        if (data.triggers) {
            $.ajax({
                type: "POST",
                url: countlyCommon.API_URL + "/i/push/message/create",
                data: data,
                contentTYpe: "application/json",
                success: function(json) {
                    data._id = json._id;
                    if (callback) {
                        callback();
                    }
                },
                error: callback
            });
        }
        else {
            $.ajax({
                type: "POST",
                url: countlyCommon.API_URL + "/i/pushes/create",
                data: {
                    args: JSON.stringify(data),
                },
                success: function(json) {
                    data._id = json._id;
                    if (callback) {
                        callback();
                    }
                },
                error: callback
            });
        }
    }
    /**
     * Add Parameter
     * @param {string} parameter_key - Parameter Key
     * @param {string} description - Parameter description
     * @param {string} default_value - Default value of parameter
     * @param {function} callback - callback method
     * @return {function} returns ajax get request
     **/
    function addParameter(parameter_key, description, default_value, callback) {
        var parameter = {
            parameter_key: parameter_key,
            description: description,
            default_value: default_value
        };
        return $.ajax({
            type: "GET",
            url: countlyCommon.API_URL + "/i/remote-config/add-parameter",
            data: {
                parameter: JSON.stringify(parameter),
                app_id: countlyCommon.ACTIVE_APP_ID,
                populator: true
            },
            success: function() {
                callback();
            },
            error: function() {
                callback();
            }
        });
    }
    /**
     * Add Parameter
     * @param {string} name - Name
     * @param {function} callback - callback method
     * @return {function} returns ajax get request
     **/
    function addExperiment(name, callback) {
        var experiment = {
            name: name,
            description: 'TestPricing',
            show_target_users: false,
            target_users: {
                byVal: [],
                byValText: "",
                condition_definition: "",
                percentage: 100,
                condition: {}
            },
            "goals": [{"user_segmentation": "{\"query\":{},\"queryText\":\"\"}", "steps": "[{\"type\":\"did\",\"event\":\"[CLY]_session\",\"times\":\"{\\\"$gte\\\":1}\",\"period\":\"0days\",\"query\":\"{}\",\"queryText\":\"\",\"byVal\":\"\",\"group\":0,\"conj\":\"and\"}]"}],
            variants: [
                {
                    "name": "Control group",
                    "parameters": [
                        {
                            "name": abExampleName,
                            "description": "",
                            "value": "5000/month"
                        }
                    ]
                },
                {
                    "name": "Variant A",
                    "parameters": [
                        {
                            "name": abExampleName,
                            "description": "",
                            "value": "10000/month"
                        }
                    ]
                }
            ]
        };
        return $.ajax({
            type: "GET",
            url: countlyCommon.API_PARTS.data.w + "/ab-testing/add-experiment",
            data: {
                app_id: countlyCommon.ACTIVE_APP_ID,
                experiment: JSON.stringify(experiment)
            },
            success: function(json) {
                callback(json);
            },
            error: function(json) {
                callback(json);
            }
        });
    }
    /**
     * Create feedback popup
     * @param {string} popup_header_text - Popup header text
     * @param {string} popup_comment_callout - Popup comment input callout
     * @param {string} popup_email_callout - Popup email input callout
     * @param {string} popup_button_callout - Popup button callout
     * @param {string} popup_thanks_message - Popup thanks message
     * @param {string} trigger_position - Position of feedback trigger div on the screen
     * @param {string} trigger_bg_color - Background color of feedback trigger div
     * @param {string} trigger_font_color - Text color of feedback trigger div
     * @param {string} trigger_button_text - Text of trigger button text
     * @param {object} target_devices - Target devices object
     * @param {array}  target_pages - Array of target pages
     * @param {string} target_page - Only selected pages? or all pages (one of these; "all","selected")
     * @param {boolean} is_active - Is feedback popup active?
     * @param {boolean} hide_sticker - Hide sticker option
     * @param {function} callback - callback method
     * @return {function} returns ajax get request
     **/
    function createFeedbackWidget(popup_header_text, popup_comment_callout, popup_email_callout, popup_button_callout, popup_thanks_message, trigger_position, trigger_bg_color, trigger_font_color, trigger_button_text, target_devices, target_pages, target_page, is_active, hide_sticker, callback) {
        return $.ajax({
            type: "GET",
            url: countlyCommon.API_URL + "/i/feedback/widgets/create",
            data: {
                popup_header_text: popup_header_text,
                popup_comment_callout: popup_comment_callout,
                popup_email_callout: popup_email_callout,
                popup_button_callout: popup_button_callout,
                popup_thanks_message: popup_thanks_message,
                trigger_position: trigger_position,
                trigger_bg_color: trigger_bg_color,
                trigger_font_color: trigger_font_color,
                trigger_button_text: trigger_button_text,
                target_devices: JSON.stringify(target_devices),
                target_pages: JSON.stringify(target_pages),
                target_page: target_page,
                is_active: is_active,
                hide_sticker: hide_sticker,
                app_id: countlyCommon.ACTIVE_APP_ID,
                populator: true
            },
            success: function(json, textStatus, xhr) {
                callback(json, textStatus, xhr);
            },
            error: function(json, textStatus, xhr) {
                callback(json, textStatus, xhr);
            }
        });
    }

    /**
     *  Create NPS popup
     *  @param {string} name - NPS Widget name
     *  @param {string} followUpType - type of follow up question
     *  @param {string} mainQuestion - main question
     *  @param {string} followUpPromoter - follow up question for promoter
     *  @param {string} followUpPassive - follow up question for passive
     *  @param {string} followUpDetractor - follow up question for detractor
     *  @param {string} followUpAll - follow up question for all
     *  @param {string} thanks - thank you text
     *  @param {string} style - type of displaying widget (full or outline)
     *  @param {string} show - show until specific action from user
     *  @param {string} color - color theme
     *  @param {function} callback - callback method
     *  @return {function} returns ajax get request
     */
    function createNPSWidget(name, followUpType, mainQuestion, followUpPromoter, followUpPassive, followUpDetractor, followUpAll, thanks, style, show, color, callback) {
        return $.ajax({
            type: "GET",
            url: countlyCommon.API_URL + "/i/surveys/nps/create",
            data: {
                status: true,
                name: name,
                followUpType: followUpType || "score",
                msg: JSON.stringify({
                    mainQuestion: mainQuestion,
                    followUpPromoter: followUpPromoter,
                    followUpPassive: followUpPassive,
                    followUpDetractor: followUpDetractor,
                    followUpAll: followUpAll,
                    thanks: thanks
                }),
                appearance: JSON.stringify({
                    style: style || "",
                    show: show || "",
                    color: color || ""
                }),
                targeting: null,
                app_id: countlyCommon.ACTIVE_APP_ID,
                populator: true
            },
            success: function(json, textStatus, xhr) {
                if (json && json.result) {
                    var id = json.result.split(" ");
                    npsWidgetList.push(id[2]);
                }
                callback(json, textStatus, xhr);
            },
            error: function(json, textStatus, xhr) {
                callback(json, textStatus, xhr);
            }
        });
    }

    /**
     *  Create survey popup
     *  @param {string} name - widget name
     *  @param {array} questions - array with question objects
     *  @param {string} thanks - thank you message
     *  @param {string} position - survey position
     *  @param {string} show - show until specific action from user
     *  @param {string} color - color theme
     *  @param {string} logo - link to logo
     *  @param {string} exitPolicy - what to count as exit
     *  @param {function} callback - callback method
     *  @return {function} returns ajax get request
     */
    function createSurveyWidget(name, questions, thanks, position, show, color, logo, exitPolicy, callback) {
        return $.ajax({
            type: "GET",
            url: countlyCommon.API_URL + "/i/surveys/survey/create",
            data: {
                status: true,
                name: name,
                questions: JSON.stringify(questions),
                msg: JSON.stringify({
                    thanks: thanks
                }),
                appearance: JSON.stringify({
                    position: position,
                    show: show,
                    color: color,
                    logo: logo
                }),
                targeting: null,
                exitPolicy: exitPolicy || "onAbandon",
                app_id: countlyCommon.ACTIVE_APP_ID,
                populator: true
            },
            success: function(json, textStatus, xhr) {
                callback(json, textStatus, xhr);
            },
            error: function(json, textStatus, xhr) {
                callback(json, textStatus, xhr);
            }
        });
    }

    /**
     * Generate feedback popups three times
     * @param {funciton} done - callback method
     **/
    function generateWidgets(done) {

        /**
         *  Create rating widgets
         *  @param {function} callback - callback method
         */
        function generateRatingWidgets(callback) {
            createFeedbackWidget("What's your opinion about this page?", "Add comment", "Contact me by e-mail", "Send feedback", "Thanks for feedback!", "mleft", "#fff", "#ddd", "Feedback", {phone: true, tablet: false, desktop: true}, ["/"], "selected", true, false, function() {
                createFeedbackWidget("Leave us a feedback", "Add comment", "Contact me by e-mail", "Send feedback", "Thanks!", "mleft", "#fff", "#ddd", "Feedback", {phone: true, tablet: false, desktop: false}, ["/"], "selected", true, false, function() {
                    createFeedbackWidget("Did you like this web page?", "Add comment", "Contact me by e-mail", "Send feedback", "Thanks!", "bright", "#fff", "#ddd", "Feedback", {phone: true, tablet: false, desktop: false}, ["/"], "selected", true, false, function() {
                        $.ajax({
                            type: "GET",
                            url: countlyCommon.API_URL + "/o/feedback/widgets",
                            data: {
                                app_id: countlyCommon.ACTIVE_APP_ID
                            },
                            success: function(json) {
                                ratingWidgetList = json;
                                callback();
                            },
                            error: function() {
                                callback();
                            }
                        });
                    });
                });
            });
        }

        /**
         *  Create NPS widgets
         *  @param {function} callback - callback method
         */
        function generateNPSWidgets(callback) {
            createNPSWidget("Separate per response type", "score", "How likely are you to recommend our product to a friend or colleague?", "We're glad you like us. What do you like the most about our product?", "Thank you for your feedback. How can we improve your experience?", "We're sorry to hear it. What would you like us to improve on?", "", "Thank you for your feedback", "full", "uclose", "#ddd", function() {
                createNPSWidget("One response for all", "one", "How likely are you to recommend our product to a friend or colleague?", "", "", "", "What can/should we do to WOW you?", "Thank you for your feedback", "full", "uclose", "#ddd", callback);
            });
        }

        /**
         *  Create survey widget 1
         *  @param {function} callback - callback method
         */
        function generateSurveyWidgets1(callback) {
            createSurveyWidget("Customer support example", [
                {
                    "type": "radio",
                    "question": "Were you able to find the information you were looking for?",
                    "choices": ["Yes", "No"],
                    "required": true
                },
                {
                    "type": "text",
                    "question": "What type of support communication methods do you prefer?",
                    "required": true
                },
                {
                    "type": "rating",
                    "question": "How would you rate our service on a scale of 0-10?",
                    "required": true
                }
            ], "Thank you for your feedback", "bottom right", "uclose", "#ddd", null, "onAbandon", function() {
                $.ajax({
                    type: "GET",
                    url: countlyCommon.API_URL + "/o/surveys/survey/widgets",
                    data: {
                        app_id: countlyCommon.ACTIVE_APP_ID
                    },
                    success: function(json) {
                        if (json && json.aaData) {
                            for (var i = 0; i < json.aaData.length; i++) {
                                surveyWidgetList[json.aaData[i]._id] = json.aaData[i];
                            }
                        }
                        callback();
                    },
                    error: function() {
                        callback();
                    }
                });
            });
        }

        /**
         *  Create survey widget 2
         *  @param {function} callback - callback method
         */
        function generateSurveyWidgets2(callback) {
            createSurveyWidget("Product Feedback example", [
                {
                    "type": "rating",
                    "question": "How satisfied are you with the stability of the app?",
                    "required": true
                },
                {
                    "type": "multi",
                    "question": "Which feature of the app are most important to you?",
                    "choices": ["Ready-to-use templates", "Image editor", "Download in multiple formats"],
                    "required": true
                },
                {
                    "type": "text",
                    "question": "What features would you like to add to the app?",
                    "required": true
                }
            ], "Thank you for your feedback", "bottom right", "uclose", "#ddd", null, "onAbandon", function() {
                $.ajax({
                    type: "GET",
                    url: countlyCommon.API_URL + "/o/surveys/survey/widgets",
                    data: {
                        app_id: countlyCommon.ACTIVE_APP_ID
                    },
                    success: function(json) {
                        if (json && json.aaData) {
                            for (var i = 0; i < json.aaData.length; i++) {
                                surveyWidgetList[json.aaData[i]._id] = json.aaData[i];
                            }
                        }
                        callback();
                    },
                    error: function() {
                        callback();
                    }
                });
            });
        }

        /**
         *  Create survey widget 3
         *  @param {function} callback - callback method
         */
        function generateSurveyWidgets3(callback) {
            createSurveyWidget("User Experience example", [
                {
                    "type": "rating",
                    "question": "How satisfied are you with the look and feel of the app?",
                    "required": true
                },
                {
                    "type": "text",
                    "question": "What confused/annoyed you about the app?",
                    "required": true
                },
                {
                    "type": "dropdown",
                    "question": "Which feature did you like most on new version?",
                    "choices": ["In-app support", "Quick access to menu", "Template library", "User management"],
                    "required": true
                }
            ], "Thank you for your feedback", "bottom right", "uclose", "#ddd", null, "onAbandon", function() {
                $.ajax({
                    type: "GET",
                    url: countlyCommon.API_URL + "/o/surveys/survey/widgets",
                    data: {
                        app_id: countlyCommon.ACTIVE_APP_ID
                    },
                    success: function(json) {
                        if (json && json.aaData) {
                            for (var i = 0; i < json.aaData.length; i++) {
                                surveyWidgetList[json.aaData[i]._id] = json.aaData[i];
                            }
                        }
                        callback();
                    },
                    error: function() {
                        callback();
                    }
                });
            });
        }
        if (countlyGlobal.plugins.indexOf("star-rating") !== -1 && countlyAuth.validateCreate("star-rating")) {
            generateRatingWidgets(function() {
                if (countlyGlobal.plugins.indexOf("surveys") !== -1 && countlyAuth.validateCreate("surveys")) {
                    generateNPSWidgets(function() {
                        setTimeout(function() {
                            generateSurveyWidgets1(function() {
                                generateSurveyWidgets2(function() {
                                    generateSurveyWidgets3(done);
                                });
                            });
                        }, 100);
                    });
                }
                else {
                    done();
                }
            });
        }
        else {
            done();
        }
    }


    /**
     * Generate ab test
     * @param {funciton} callback - callback method
     **/
    function generateAbTests(callback) {
        addParameter(abExampleName, "Test Pricing", "5000/month", function() {
            addExperiment(abExampleName, function(json) {
                $.ajax({
                    type: "GET",
                    url: countlyCommon.API_PARTS.data.w + "/ab-testing/start-experiment",
                    data: {
                        app_id: countlyCommon.ACTIVE_APP_ID,
                        "experiment_id": json
                    },
                    success: function() {
                        callback();
                    },
                    error: function() {
                        callback();
                    }
                });
            });
        });

    }

    /**
     * To parse querystring
     * @param {string} queryString | Query string
     * @returns {object} | Query string params as object
     */
    function parseQueryString(queryString) {
        var params = {}, queries, temp, i, l;
        queries = queryString.split("&");
        for (i = 0, l = queries.length; i < l; i++) {
            temp = queries[i].split('=');
            params[temp[0]] = temp[1];
        }
        return params;
    }

    /**
     * Create a click for campaign which passed as param
     * @param {string} name - campaign name
     **/
    function clickCampaign(name) {
        var ip = predefined_ip_addresses[Math.floor(chance.random() * (predefined_ip_addresses.length - 1))];
        $.ajax({
            type: "GET",
            url: countlyCommon.API_URL + "/i/campaign/click/" + name + countlyCommon.ACTIVE_APP_ID,
            data: {ip_address: ip, test: true, timestamp: getRandomInt(startTs, endTs), populator: true},
            success: function(data) {
                var link = data.link.replace('&amp;', '&');
                var queryString = link.split('?')[1];
                if (queryString) {
                    var parameters = parseQueryString(queryString);
                    campaingClicks.push({
                        name: name,
                        cly_id: parameters.cly_id,
                        cly_uid: parameters.cly_uid
                    });
                }
            }
        });
    }
    /**
     * Generate social, ads and landing campaings and
     * generate some dummy click for them
     * @param {callback} callback - callback method
     **/
    function generateCampaigns(callback) {
        if (typeof countlyAttribution === "undefined") {
            callback();
            return;
        }

        var campaignsIndex = 0;

        /**
         * Recursively generates all the campaigns in the global variable
         **/
        function recursiveCallback() {
            if (campaignsIndex < campaigns.length) {
                createCampaign(campaigns[campaignsIndex].id, campaigns[campaignsIndex].name, campaigns[campaignsIndex].cost, campaigns[campaignsIndex].type, recursiveCallback);
                campaignsIndex++; // future async issues?
            }
            else {
                const randomCampaignClick = getRandomInt(3, campaigns.length * 5);
                for (var clickIndex = 0; clickIndex < randomCampaignClick; clickIndex++) {
                    clickCampaign(campaigns[getRandomInt(0, campaigns.length - 1)].id);
                }
                setTimeout(callback, 50);
            }
        }

        recursiveCallback();
    }

    /**
     * To report campaign clicks conversion
     */
    function reportConversions() {
        var i = 0;
        for (i = 0; i < campaingClicks.length; i++) {
            var click = campaingClicks[i];
            if (i > users.length - 1) {
                break;
            }
            if (Math.random() > 0.5) {
                users[i].reportConversion(click.cly_id, click.cly_uid, users[i].id);
            }
        }
    }

    //Public Methods
    countlyPopulator.setStartTime = function(time) {
        startTs = time;
    };
    countlyPopulator.getStartTime = function() {
        return startTs;
    };
    countlyPopulator.setEndTime = function(time) {
        endTs = time;
    };
    countlyPopulator.getEndTime = function() {
        return endTs;
    };
    countlyPopulator.getUserAmount = function() {
        return userAmount;
    };

    countlyPopulator.generateUsers = function(run, template, environment) {
        this.currentTemplate = template;
        stopCallback = null;
        userAmount = template.uniqueUserCount || 100;
        bulk = [];
        users = [];
        runCount = run;
        generating = true;
        completedRequestCount = 0;
        crashSymbolVersions = {
            javascript: [],
            iOS: [],
            android: [],
            macOS: [],
            tvOS: [],
            plc: []
        };
        let environmentUsers = [];

        /**
         * Get users from environment 
        **/
        async function getUsers() {
            let batchSize = getRandomInt(3, 10); //5;
            let currentIndex = 0;
            userAmount = environment.length;

            /**
             * 
             * @returns {array} - array of users
             */
            async function getUserBatch() {
                const userBatch = [];
                for (let i = 0; i < batchSize && currentIndex < userAmount; i++) {
                    const u = new User();
                    u.getUserFromEnvironment(environment[currentIndex]);
                    const requests = u.generateAllEventsAndSessions(template, runCount, true);
                    userBatch.push(requests);
                    bulk = [];
                    currentIndex++;
                }
                try {
                    const partialUserList = await Promise.allSettled(userBatch);
                    return partialUserList;
                }
                catch (error) {
                    return [];
                }
            }

            /**
             * 
             * @param {array} userBatch - array of users
             */
            async function processUserBatch(userBatch) {
                for (const u of userBatch) {
                    const startTime = new Date().getTime();
                    await flushAllRequests(u.value);
                    const endTime = new Date().getTime();
                    const timeDiff = endTime - startTime;
                    if (timeDiff > 3000 && batchSize > 3) { // process min 3 batch at a time
                        batchSize--;
                    }
                }
            }

            /**
             * 
             * 
             */
            async function createAndProcessUsers() {
                const userBatch = await getUserBatch();
                await processUserBatch(userBatch);

                if (currentIndex < userAmount) {
                    await createAndProcessUsers();
                }
                if (environment.length < template.uniqueUserCount) { // if environment users are less than template user count(in case of stop generate or error), complete the rest with new users in next run
                    CountlyHelpers.notify({type: 'warning', message: CV.i18n("populator.warning-environment-users", environment.length, template.uniqueUserCount, template.uniqueUserCount - environment.length), sticky: true});

                    userAmount = template.uniqueUserCount - environment.length;
                    template.saveEnvironment = true;
                    template.environmentName = environment[0].name;
                    await createUsers(false);
                    environment.length = template.uniqueUserCount;
                }
                else {
                    generating = false;
                }
            }
            await createAndProcessUsers();
        }

        /**
         * @param {boolean} setEnvironmentInformationOnce - set environment information once
         * Create new user 
        **/
        async function createUsers(setEnvironmentInformationOnce) {
            let batchSize = getRandomInt(3, 10); //5;
            let currentIndex = 0;

            /**
             * Create batch of users
             * @param {boolean} setEnviromentInformationOnce - set environment information once
             * @returns {array} - array of users
             * */
            async function createUserBatch(setEnviromentInformationOnce) {
                const batchPromises = [];

                for (let i = 0; i < batchSize && currentIndex < userAmount; i++) {
                    const u = new User();
                    u.getUserFromTemplate(template.users, currentIndex);
                    const requests = u.generateAllEventsAndSessions(template, runCount);
                    batchPromises.push(requests);
                    bulk = [];

                    if (template.saveEnvironment && generating) {
                        await checkEnvironment(u, setEnviromentInformationOnce);
                        setEnviromentInformationOnce = false;
                    }
                    if (currentIndex < userAmount && users.length < 50 && Math.random() > 0.5) {
                        users.push(u);
                    }
                    currentIndex++;
                }
                try {
                    const partialUserList = await Promise.allSettled(batchPromises);
                    return partialUserList;
                }
                catch (error) {
                    return [];
                }
            }

            /**
             * 
             * @param {object} user - user object
             * @param {boolean} setEnviromentInformationOnce - set environment information once
             */
            async function checkEnvironment(user, setEnviromentInformationOnce) {
                const requestEnv = {
                    deviceId: user.id,
                    templateId: template._id,
                    appId: countlyCommon.ACTIVE_APP_ID,
                    environmentName: template.environmentName,
                    userName: user.userdetails.name ? user.userdetails.name : user.id,
                    platform: user.platform,
                    device: user.metrics._device || 'Unknown',
                    appVersion: user.metrics._app_version || 'Unknown',
                    custom: user.userdetails.custom || {},
                };
                environmentUsers.push(requestEnv);
                if (environmentUsers.length > 10 || setEnviromentInformationOnce) {
                    await user.saveEnvironment(environmentUsers, setEnviromentInformationOnce);
                    environmentUsers = [];
                }
            }

            /**
             * Process batch of users
             * @param {array} userBatch - request array
             * */
            async function processUsers(userBatch) {
                for (const u of userBatch) {
                    const startTime = new Date().getTime();
                    await flushAllRequests(u.value);
                    const endTime = new Date().getTime();
                    const timeDiff = endTime - startTime;
                    if (timeDiff > 3000 && batchSize > 3) { // process min 3 batch at a time
                        batchSize--;
                    }
                }
            }

            /**
             * @param {boolean} setEnviromentInformationOnce - set environment information once
             * Create and process users
             * */
            async function createAndProcessUsers(setEnviromentInformationOnce) {
                const u = await createUserBatch(setEnviromentInformationOnce);
                await processUsers(u);

                if (currentIndex < userAmount) {
                    await createAndProcessUsers(false);
                }
                else {
                    generating = false;
                }
            }
            await createAndProcessUsers(typeof setEnvironmentInformationOnce !== "undefined" ? setEnvironmentInformationOnce : true);
        }

        if (environment && environment.length) {
            getUsers();
        }
        else {
            generateWidgets(function() {
                generateCampaigns(async function() {
                    await createUsers();

                    if (countlyGlobal.plugins.indexOf("ab-testing") !== -1 && countlyAuth.validateCreate("ab-testing")) {
                        abExampleName = "Pricing" + abExampleCount++;
                        generateAbTests(function() {
                            if (users.length) {
                                const usersForAbTests = getRandomInt(1, users.length / 2);
                                for (var i = 0; i < usersForAbTests; i++) {
                                    users[i].startSessionForAb(users[i]);
                                }
                            }
                        });
                    }
                    if (countlyGlobal.apps[countlyCommon.ACTIVE_APP_ID] && countlyGlobal.apps[countlyCommon.ACTIVE_APP_ID].type === "web") {
                        setTimeout(reportConversions, 100);
                    }
                });
            });
        }


        if (countlyGlobal.plugins.indexOf("systemlogs") !== -1) {
            $.ajax({
                type: "POST",
                url: countlyCommon.API_URL + "/i/systemlogs",
                data: {
                    data: JSON.stringify({app_id: countlyCommon.ACTIVE_APP_ID}),
                    action: "populator_run",
                    populator: true
                },
                success: function() {}
            });
        }
        var seg = {};

        if (template.name) {
            seg.template = template.name;
        }

        app.recordEvent({
            "key": "populator-execute",
            "count": 1,
            "segmentation": seg
        });
    };

    countlyPopulator.stopGenerating = function(ensureJobs, callback) {
        stopCallback = callback;
        generating = false;

        if (ensureJobs) {
            countlyPopulator.ensureJobs();
        }
        if (stopCallback) {
            stopCallback(true);
        }
    };

    countlyPopulator.isGenerating = function() {
        return generating;
    };

    countlyPopulator.ensureJobs = function() {
        messages.forEach(function(m) {
            m.apps = [countlyCommon.ACTIVE_APP_ID];
        });

        var template = this.currentTemplate || {};

        if (typeof countlyCohorts !== "undefined" && countlyAuth.validateCreate('cohorts')) {
            if (template && template.events && Object.keys(template.events).length > 0) {
                var firstEventKey = Object.keys(template.events)[0];

                if (template.users && Object.keys(template.users).length > 0) {
                    var firstUserProperty = Object.keys(template.users)[0];
                    var firstUserPropertyValue = JSON.stringify(template.users[firstUserProperty][0]);

                    countlyCohorts.add({
                        cohort_name: firstUserProperty + " = " + firstUserPropertyValue + " users who performed " + firstEventKey,
                        steps: JSON.stringify([
                            {
                                type: "did",
                                event: firstEventKey,
                                times: "{\"$gte\":1}",
                                period: "0days",
                                query: "{\"custom." + firstUserProperty + "\":{\"$in\":[" + firstUserPropertyValue + "]}}",
                                byVal: "",
                            }
                        ]),
                        populator: true
                    });
                }


                if (template.events[firstEventKey].segments && Object.keys(template.events[firstEventKey].segments).length > 0) {
                    var firstEventSegment = Object.keys(template.events[firstEventKey].segments)[0];
                    var firstEventSegmentValue = JSON.stringify(template.events[firstEventKey].segments[firstEventSegment][0]);

                    countlyCohorts.add({
                        cohort_name: "Users who performed " + firstEventKey + " with " + firstEventSegment + " = " + firstEventSegmentValue,
                        steps: JSON.stringify([
                            {
                                type: "did",
                                event: firstEventKey,
                                times: "{\"$gte\":1}",
                                period: "0days",
                                query: "{\"sg." + firstEventSegment + ":{\"$in\":[" + firstEventSegmentValue + "]}}",
                                byVal: "",
                            }
                        ]),
                        populator: true
                    });
                }

                if (Object.keys(template.events).length > 1) {
                    var secondEventKey = Object.keys(template.events)[1];

                    countlyCohorts.add({
                        cohort_name: "Users who performed " + firstEventKey + " but not " + secondEventKey,
                        steps: JSON.stringify([
                            {
                                type: "did",
                                event: firstEventKey,
                                times: "{\"$gte\":1}",
                                period: "0days",
                                query: "{}",
                                byVal: "",
                                conj: "and"
                            },
                            {
                                type: "didnot",
                                event: secondEventKey,
                                times: "{\"$gte\":1}",
                                period: "0days",
                                query: "{}",
                                byVal: "",
                                conj: "and"
                            }
                        ]),
                        populator: true
                    });
                }
            }

            countlyCohorts.add({
                cohort_name: "Users who experienced a crash",
                steps: JSON.stringify([
                    {
                        type: "did",
                        event: "[CLY]_crash",
                        times: "{\"$gte\":1}",
                        period: "0days",
                        query: "{}",
                        byVal: "",
                    }
                ]),
                populator: true
            });

            countlyCohorts.add({
                cohort_name: "iOS users with at least 2 sessions",
                steps: JSON.stringify([
                    {
                        type: "did",
                        event: "[CLY]_session",
                        times: "{\"$gte\":2}",
                        period: "0days",
                        query: "{\"up.p\":{\"$in\":[\"iOS\"]}}",
                        byVal: "",
                    }
                ]),
                populator: true
            });

            countlyCohorts.add({
                cohort_name: "Users who didn’t view privacy policy",
                steps: JSON.stringify([
                    {
                        type: "didnot",
                        event: "[CLY]_view",
                        times: "{\"$gte\":1}",
                        period: "0days",
                        query: "{\"sg.name\":{\"$in\":[\"Privacy Policy\"]}}",
                        byVal: "",
                    }
                ]),
                populator: true
            });
        }

        if (typeof countlyFunnel !== "undefined" && countlyAuth.validateCreate('funnels')) {

            let pages = countlyGlobal.apps[countlyCommon.ACTIVE_APP_ID].type === "mobile" ? viewSegments.name : getPageTemplates(countlyPopulator.getSelectedTemplate().substr(7).toLowerCase());
            let page1 = pages[getRandomInt(0, pages.length - 1)];
            let page2 = pages[getRandomInt(0, pages.length - 1)];

            countlyFunnel.createFunnel({
                name: "View (View name = " + page1 + ") -> View (View name = " + page2 + ")",
                description: "",
                type: "session-independent",
                steps: ["[CLY]_view", "[CLY]_view"],
                queries: [{"sg.name": {"$in": [page1]}}, {"sg.name": {"$in": [page2]}}],
                queryTexts: ["View name = " + page1 + ", View name = " + page2 + ""],
                stepGroups: [{"c": "and", "g": 0}, {"c": "and", "g": 1}],
            });

            if (template && template.events && Object.keys(template.events).length > 0) {

                let firstEvent = Object.keys(template.events)[0];
                let secondEvent = Object.keys(template.events)[1] || "[CLY]_view";

                countlyFunnel.createFunnel({
                    name: firstEvent + " -> " + secondEvent + "",
                    description: "",
                    type: "session-independent",
                    steps: [firstEvent, secondEvent],
                    queries: [{}, {}],
                    queryTexts: ["", ""],
                    stepGroups: [{"c": "and", "g": 0}, {"c": "and", "g": 1}],
                });
            }
        }

        if (countlyGlobal.plugins.indexOf('crash_symbolication') !== -1 && countlyAuth.validateCreate('crash_symbolication')) {
            const crashPlatforms = Object.keys(crashSymbolVersions).filter(key => crashSymbolVersions[key].length);


            // process every platform and their versions one by one
            for (let i = 0; i < crashPlatforms.length; i++) {
                const platformVersions = crashSymbolVersions[crashPlatforms[i]];
                for (let j = 0; j < platformVersions.length; j++) {
                    let form_data = new FormData();
                    if (crashPlatforms[i] === "javascript") {
                        form_data.append('build', crashSymbolVersions[crashPlatforms[i]]); // send all js versions at once as they have same symbolication file
                    }
                    else {
                        form_data.append('build', platformVersions[j]._build_uuid ? platformVersions[j]._build_uuid : platformVersions[j]._app_version);
                    }
                    form_data.append('platform', crashPlatforms[i]);
                    form_data.append('app_key', countlyCommon.ACTIVE_APP_KEY);
                    form_data.append("app_id", countlyCommon.ACTIVE_APP_ID);
                    form_data.append('populator', true);

                    $.ajax({
                        url: countlyCommon.API_URL + "/i/crash_symbols/add_symbol",
                        data: form_data,
                        processData: false,
                        contentType: false,
                        type: "POST",
                        success: function() {},
                        error: function() {}
                    });
                    if (crashPlatforms[i] === "javascript") {
                        break;
                    }
                }
            }
        }

        createMessage(messages[0]);
        createMessage(messages[1]);
        createMessage(messages[2]);
    };

    countlyPopulator.getSelectedTemplate = function() {
        return _templateType;
    };

    countlyPopulator.getCompletedRequestCount = function() {
        return completedRequestCount;
    };

    countlyPopulator.setSelectedTemplate = function(value) {
        _templateType = value;
    };

    countlyPopulator.getTemplate = function(templateId, callback) {
        var foundDefault = defaultTemplates.find(function(template) {
            return template._id === templateId;
        });

        if (typeof foundDefault !== "undefined") {
            callback(foundDefault);
        }
        else {
            $.ajax({
                type: "GET",
                url: countlyCommon.API_URL + "/o/populator/templates",
                data: {template_id: templateId, app_id: countlyCommon.ACTIVE_APP_ID},
                success: callback,
                error: function() {
                    CountlyHelpers.notify({message: CV.i18n("populator.failed-to-fetch-template", templateId), type: "error"});
                }
            });
        }
    };

    countlyPopulator.getTemplates = function(platformType, callback) {
        const data = {app_id: countlyCommon.ACTIVE_APP_ID};
        if (platformType) {
            data.platform_type = platformType.charAt(0).toUpperCase() + platformType.slice(1);
        }
        $.ajax({
            type: "GET",
            url: countlyCommon.API_URL + "/o/populator/templates",
            data: data,
            contentType: "application/json; charset=utf-8",
            dataType: "json",
            success: function(templates) {
                callback(defaultTemplates.concat(templates));
            },
            error: function() {
                CountlyHelpers.notify({message: CV.i18n("populator.failed-to-fetch-templates"), type: "error"});
            }
        });
    };

    countlyPopulator.createTemplate = function(template, callback) {
        template.app_id = countlyCommon.ACTIVE_APP_ID;

        $.ajax({
            type: "POST",
            url: countlyCommon.API_URL + "/i/populator/templates/create",
            data: JSON.stringify(template),
            contentType: "application/json; charset=utf-8",
            dataType: "json",
            success: callback || function() {},
            error: function() {
                CountlyHelpers.notify({message: CV.i18n("populator.failed-to-create-template"), type: "error"});
            }
        });
    };

    countlyPopulator.editTemplate = function(templateId, newTemplate, callback) {
        newTemplate.template_id = templateId;
        newTemplate.generated_on = newTemplate.generatedOnTs;
        var foundDefault = defaultTemplates.find(function(template) {
            return template._id === templateId;
        });

        if (typeof foundDefault !== "undefined") {
            // this should never happen
        }
        else {
            $.ajax({
                type: "POST",
                url: countlyCommon.API_URL + "/i/populator/templates/edit",
                data: JSON.stringify(newTemplate),
                contentType: "application/json; charset=utf-8",
                dataType: "json",
                success: callback || function() {},
                error: function(err) {
                    CountlyHelpers.notify({
                        title: CV.i18n('common.error'),
                        message: CV.i18n("populator.failed-to-edit-template", templateId) + " " + err.status + " " + err.statusText,
                        type: "error"
                    });
                }
            });
        }
    };

    countlyPopulator.removeTemplate = function(templateId, callback) {
        var foundDefault = defaultTemplates.find(function(template) {
            return template._id === templateId;
        });

        if (typeof foundDefault !== "undefined") {
            // this should never happen
        }
        else {
            $.ajax({
                type: "GET",
                url: countlyCommon.API_URL + "/i/populator/templates/remove",
                data: {template_id: templateId, app_id: countlyCommon.ACTIVE_APP_ID},
                success: callback,
                error: function() {
                    CountlyHelpers.notify({message: CV.i18n("populator.failed-to-remove-template", templateId), type: "error"});
                }
            });
        }
    };

    countlyPopulator.checkEnvironment = function(environmentName, callback) {
        const data = {app_id: countlyCommon.ACTIVE_APP_ID, environment_name: environmentName};
        $.ajax({
            type: "GET",
            url: countlyCommon.API_URL + "/o/populator/environment/check",
            data: data,
            contentType: "application/json; charset=utf-8",
            dataType: "json",
            success: function(enviroment) {
                callback(enviroment);
            },
            error: function() {
                CountlyHelpers.notify({message: CV.i18n("populator.failed-to-fetch-environment"), type: "error"});
            }
        });
    };

    countlyPopulator.getEnvironments = function(callback) {
        const data = {app_id: countlyCommon.ACTIVE_APP_ID};
        $.ajax({
            type: "GET",
            url: countlyCommon.API_URL + "/o/populator/environment/list",
            data: data,
            contentType: "application/json; charset=utf-8",
            dataType: "json",
            success: function(enviroments) {
                callback(enviroments);
            },
            error: function() {
                CountlyHelpers.notify({message: CV.i18n("populator.failed-to-fetch-environments"), type: "error"});
            }
        });
    };

    countlyPopulator.getEnvironment = function(templateId, environmentId, callback) {
        const data = { app_id: countlyCommon.ACTIVE_APP_ID, template_id: templateId, environment_id: environmentId };
        $.ajax({
            type: "GET",
            url: countlyCommon.API_URL + "/o/populator/environment/get",
            data: data,
            contentType: "application/json; charset=utf-8",
            dataType: "json",
            success: function(enviroment) {
                callback(enviroment);
            },
            error: function() {
                CountlyHelpers.notify({message: CV.i18n("populator.failed-to-fetch-environment"), type: "error"});
            }
        });
    };

    countlyPopulator.removeEnvironment = function(templateId, environmentId, callback) {
        const data = { app_id: countlyCommon.ACTIVE_APP_ID, template_id: templateId, environment_id: environmentId };
        $.ajax({
            type: "GET",
            url: countlyCommon.API_URL + "/o/populator/environment/remove",
            data: data,
            contentType: "application/json; charset=utf-8",
            dataType: "json",
            success: function(enviroment) {
                callback(enviroment);
            },
            error: function() {
                CountlyHelpers.notify({message: CV.i18n("populator.failed-to-delete-environment"), type: "error"});
            }
        });
    };

    countlyPopulator.defaultTemplates = defaultTemplates;
}(window.countlyPopulator = window.countlyPopulator || {}, jQuery));