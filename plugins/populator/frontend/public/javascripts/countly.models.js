/*global chance, CountlyHelpers, countlyAuth, countlyGlobal, countlyCommon, countlyCohorts, countlyFunnel, $, app, moment, CV*/
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
    var defaultTemplates = [
        { "_id": "defaultEntertainment", "name": "Entertainment", "isDefault": true, "lastEditedBy": "", "users": [{ "key": "Subscription Plan", "values": [{ "key": "Premium", "probability": "30" }, { "key": "Free", "probability": "60" }, { "key": "Family", "probability": "10" }] }, { "key": "Preferred Content", "values": [{ "key": "[\"Movies\"]", "probability": "20" }, { "key": "[\"TV Shows\"]", "probability": "25" }, { "key": "[\"Music Videos\",\"TV Shows\"]", "probability": "15" }, { "key": "[\"Podcasts\"]", "probability": "10" }, { "key": "[\"Movies\",\"Music Videos\"]", "probability": "15" }, { "key": "[\"TV Shows\",\"Movies\",\"Music Videos\"]", "probability": "15" }], "condition": { "selectedKey": "Subscription Plan", "selectedValue": "Premium", "conditionType": 1, "values": [{ "key": "Movies", "probability": "20" }, { "key": "TV Shows", "probability": "10" }, { "key": "Music", "probability": "30" }, { "key": "Podcasts", "probability": "40" }] }, "conditions": [{ "selectedKey": "Achievements", "selectedValue": "Podcast Pioneer (100 Podcast Episodes)", "conditionType": 1, "values": [{ "key": "[\"Podcasts\"]", "probability": "20" }, { "key": "[\"Podcasts\",\"TV Shows\"]", "probability": "30" }, { "key": "[\"Podcasts\",\"Movies\"]", "probability": "40" }, { "key": "[\"Podcasts\",\"Movies\",\"TV Shows\"]", "probability": "10" }] }, { "selectedKey": "Achievements", "selectedValue": "Marathon Master (10 Movies in a Week)", "conditionType": 1, "values": [{ "key": "[\"Movies\"]", "probability": "40" }, { "key": "[\"Movies\",\"Music Videos\"]", "probability": "35" }, { "key": "[\"TV Shows\",\"Movies\",\"Music Videos\"]", "probability": "25" }] }, { "selectedKey": "Achievements", "selectedValue": "Classic Connoisseur (20 Classic Movies)", "conditionType": 1, "values": [{ "key": "[\"Movies\"]", "probability": "60" }, { "key": "[\"Movies\",\"TV Shows\"]", "probability": "40" }] }, { "selectedKey": "Achievements", "selectedValue": "Genre Hopper (10 Different Music Genres)", "conditionType": 1, "values": [{ "key": "[\"Music Videos\",\"TV Shows\"]", "probability": "50" }, { "key": "[\"Music Videos\"]", "probability": "20" }, { "key": "[\"Music Videos\",\"Movies\"]", "probability": "30" }] }, { "selectedKey": "Achievements", "selectedValue": "Binge-Watcher", "conditionType": 1, "values": [{ "key": "[\"TV Shows\"]", "probability": "20" }, { "key": "[\"TV Shows\",\"Movies\"]", "probability": "30" }, { "key": "[\"TV Shows\",\"Movies\",\"Music Videos\",\"Podcasts\"]", "probability": "50" }] }] }, { "key": "Users in Family", "values": [{ "key": "", "probability": "0" }], "conditions": [{ "selectedKey": "Subscription Plan", "selectedValue": "Family", "conditionType": 1, "values": [{ "key": "0", "probability": "15" }, { "key": "1", "probability": "25" }, { "key": "2", "probability": "30" }, { "key": "3", "probability": "30" }] }] }, { "key": "Accessibility Needs", "values": [{ "key": "Subtitles/Closed Captions", "probability": "15" }, { "key": "Audio Descriptions", "probability": "5" }, { "key": "Large Text", "probability": "10" }, { "key": "High Contrast Mode", "probability": "10" }, { "key": "None", "probability": "60" }] }, { "key": "Last TV Show", "values": [{ "key": "Stranger Things - Season 3, Episode 1 - Chapter One: Suzie, Do You Copy?", "probability": "5" }, { "key": "The Mandalorian - Season 2, Episode 5 - Chapter 13: The Jedi", "probability": "10" }, { "key": "The Crown - Season 4, Episode 3 - Fairytale", "probability": "15" }, { "key": "Breaking Bad - Season 5, Episode 14 - Ozymandias", "probability": "20" }, { "key": "The Three-Body Problem - Season 1, Episode 5 - The Countdown Begins", "probability": "30" }, { "key": "", "probability": "20" }] }, { "key": "Last Movie", "values": [{ "key": "Inception (2010)", "probability": "20" }, { "key": "Parasite (2019)", "probability": "5" }, { "key": "The Social Network (2010)", "probability": "10" }, { "key": "La La Land (2016)", "probability": "5" }, { "key": "The Matrix (1999)", "probability": "15" }, { "key": "Interstellar (2014)", "probability": "20" }, { "key": "", "probability": "25" }] }, { "key": "Last Home Interaction", "values": [{ "key": "Recommendations", "probability": 0 }, { "key": "Recently Watched", "probability": 0 }, { "key": "Trending Now", "probability": 0 }, { "key": "Continue Watching", "probability": 0 }, { "key": "Personalized Picks", "probability": 0 }] }, { "key": "Achievements", "values": [{ "key": "Genre Hopper (10 Different Music Genres)", "probability": "10" }, { "key": "Classic Connoisseur (20 Classic Movies)", "probability": "20" }, { "key": "Marathon Master (10 Movies in a Week)", "probability": "10" }, { "key": "Podcast Pioneer (100 Podcast Episodes)", "probability": "10" }, { "key": "Binge-Watcher", "probability": "20" }, { "key": "", "probability": "30" }] }], "events": [{ "key": "View Category", "duration": { "isActive": true, "minDurationTime": "10", "maxDurationTime": "120" }, "sum": { "isActive": false, "minSumValue": 0, "maxSumValue": 0 }, "segmentations": [{ "key": "Category", "values": [{ "key": "Music Videos", "probability": "40" }, { "key": "Podcasts", "probability": "30" }, { "key": "Live Events", "probability": "10" }, { "key": "Documentary", "probability": "5" }, { "key": "New Releases", "probability": "15" }] }] }, { "key": "Playback Started", "duration": { "isActive": false, "minDurationTime": 0, "maxDurationTime": 0 }, "sum": { "isActive": false, "minSumValue": 0, "maxSumValue": 0 }, "segmentations": [{ "key": "Playback Type", "values": [{ "key": "On-Demand", "probability": "50" }, { "key": "Live", "probability": "15" }, { "key": "Downloaded", "probability": "20" }, { "key": "Preview", "probability": "15" }] }, { "key": "Content Type", "values": [{ "key": "Movie", "probability": "15" }, { "key": "Podcast", "probability": "20" }, { "key": "TV Show", "probability": "5" }, { "key": "Music Video", "probability": "60" }] }, { "key": "Genre", "values": [{ "key": "", "probability": 0 }], "conditions": [{ "selectedKey": "Content Type", "selectedValue": "Movie", "conditionType": 1, "values": [{ "key": "Action", "probability": "50" }, { "key": "Romantic Comedy", "probability": "30" }, { "key": "Horror", "probability": "20" }] }, { "selectedKey": "Content Type", "selectedValue": "Podcast", "conditionType": 1, "values": [{ "key": "True Crime", "probability": "10" }, { "key": "Educational", "probability": "60" }, { "key": "Comedy", "probability": "30" }] }, { "selectedKey": "Content Type", "selectedValue": "TV Show", "conditionType": 1, "values": [{ "key": "Fantasy", "probability": "20" }, { "key": "Drama", "probability": "30" }, { "key": "Sitcom", "probability": "22" }, { "key": "Action", "probability": "28" }] }, { "selectedKey": "Content Type", "selectedValue": "Music Video", "conditionType": 1, "values": [{ "key": "Pop", "probability": "70" }, { "key": "Rock", "probability": "10" }, { "key": "Hip-Hop", "probability": "20" }] }] }] }, { "key": "Playback Paused", "duration": { "isActive": false, "minDurationTime": 0, "maxDurationTime": 0 }, "sum": { "isActive": false, "minSumValue": 0, "maxSumValue": 0 }, "segmentations": [{ "key": "Playback Type", "values": [{ "key": "On-Demand", "probability": "50" }, { "key": "Live", "probability": "15" }, { "key": "Downloaded", "probability": "20" }, { "key": "Preview", "probability": "15" }] }, { "key": "Content Type", "values": [{ "key": "Movie", "probability": "40" }, { "key": "Podcast", "probability": "40" }, { "key": "TV Show", "probability": "10" }, { "key": "Music Video", "probability": "10" }] }, { "key": "Genre", "values": [{ "key": "", "probability": 0 }], "conditions": [{ "selectedKey": "Content Type", "selectedValue": "Movie", "conditionType": 1, "values": [{ "key": "Action", "probability": "50" }, { "key": "Romantic Comedy", "probability": "30" }, { "key": "Horror", "probability": "20" }] }, { "selectedKey": "Content Type", "selectedValue": "Podcast", "conditionType": 1, "values": [{ "key": "True Crime", "probability": "10" }, { "key": "Educational", "probability": "60" }, { "key": "Comedy", "probability": "30" }] }, { "selectedKey": "Content Type", "selectedValue": "TV Show", "conditionType": 1, "values": [{ "key": "Fantasy", "probability": "20" }, { "key": "Drama", "probability": "30" }, { "key": "Sitcom", "probability": "22" }, { "key": "Action", "probability": "28" }] }, { "selectedKey": "Content Type", "selectedValue": "Music Video", "conditionType": 1, "values": [{ "key": "Pop", "probability": "70" }, { "key": "Rock", "probability": "10" }, { "key": "Hip-Hop", "probability": "20" }] }] }] }, { "key": "Playback Resumed", "duration": { "isActive": false, "minDurationTime": 0, "maxDurationTime": "3600" }, "sum": { "isActive": false, "minSumValue": 0, "maxSumValue": 0 }, "segmentations": [{ "key": "Playback Type", "values": [{ "key": "On-Demand", "probability": "50" }, { "key": "Live", "probability": "15" }, { "key": "Downloaded", "probability": "20" }, { "key": "Preview", "probability": "15" }] }, { "key": "Content Type", "values": [{ "key": "Movie", "probability": "40" }, { "key": "Podcast", "probability": "40" }, { "key": "TV Show", "probability": "10" }, { "key": "Music Video", "probability": "10" }] }, { "key": "Genre", "values": [{ "key": "", "probability": 0 }], "conditions": [{ "selectedKey": "Content Type", "selectedValue": "Movie", "conditionType": 1, "values": [{ "key": "Action", "probability": "50" }, { "key": "Romantic Comedy", "probability": "30" }, { "key": "Horror", "probability": "20" }] }, { "selectedKey": "Content Type", "selectedValue": "Podcast", "conditionType": 1, "values": [{ "key": "True Crime", "probability": "10" }, { "key": "Educational", "probability": "60" }, { "key": "Comedy", "probability": "30" }] }, { "selectedKey": "Content Type", "selectedValue": "TV Show", "conditionType": 1, "values": [{ "key": "Fantasy", "probability": "20" }, { "key": "Drama", "probability": "30" }, { "key": "Sitcom", "probability": "22" }, { "key": "Action", "probability": "28" }] }, { "selectedKey": "Content Type", "selectedValue": "Music Video", "conditionType": 1, "values": [{ "key": "Pop", "probability": "70" }, { "key": "Rock", "probability": "10" }, { "key": "Hip-Hop", "probability": "20" }] }] }] }, { "key": "Playback Completed", "duration": { "isActive": true, "minDurationTime": "120", "maxDurationTime": "10000" }, "sum": { "isActive": false, "minSumValue": 0, "maxSumValue": 0 }, "segmentations": [{ "key": "Playback Type", "values": [{ "key": "On-Demand", "probability": "50" }, { "key": "Live", "probability": "15" }, { "key": "Downloaded", "probability": "20" }, { "key": "Preview", "probability": "15" }] }, { "key": "Content Type", "values": [{ "key": "Movie", "probability": "40" }, { "key": "Podcast", "probability": "10" }, { "key": "TV Show", "probability": "40" }, { "key": "Music Video", "probability": "10" }] }, { "key": "Genre", "values": [{ "key": "", "probability": 0 }], "conditions": [{ "selectedKey": "Content Type", "selectedValue": "Movie", "conditionType": 1, "values": [{ "key": "Action", "probability": "50" }, { "key": "Romantic Comedy", "probability": "30" }, { "key": "Horror", "probability": "20" }] }, { "selectedKey": "Content Type", "selectedValue": "Podcast", "conditionType": 1, "values": [{ "key": "True Crime", "probability": "10" }, { "key": "Educational", "probability": "60" }, { "key": "Comedy", "probability": "30" }] }, { "selectedKey": "Content Type", "selectedValue": "TV Show", "conditionType": 1, "values": [{ "key": "Fantasy", "probability": "20" }, { "key": "Drama", "probability": "30" }, { "key": "Sitcom", "probability": "22" }, { "key": "Action", "probability": "28" }] }, { "selectedKey": "Content Type", "selectedValue": "Music Video", "conditionType": 1, "values": [{ "key": "Pop", "probability": "70" }, { "key": "Rock", "probability": "10" }, { "key": "Hip-Hop", "probability": "20" }] }] }, { "key": "Number of Times Paused", "values": [{ "key": "0", "probability": "20" }, { "key": "1", "probability": "20" }, { "key": "2", "probability": "20" }, { "key": "3", "probability": "20" }, { "key": "4", "probability": "20" }] }, { "key": "Number of Times Switched Playback Device", "values": [{ "key": "0", "probability": "80" }, { "key": "1", "probability": "15" }, { "key": "2", "probability": "5" }], "conditions": [{ "selectedKey": "Number of Times Paused", "selectedValue": "3", "conditionType": 1, "values": [{ "key": "0", "probability": "50" }, { "key": "1", "probability": "40" }, { "key": "2", "probability": "10" }] }, { "selectedKey": "Number of Times Paused", "selectedValue": "4", "conditionType": 1, "values": [{ "key": "0", "probability": "40" }, { "key": "1", "probability": "30" }, { "key": "2", "probability": "30" }] }] }] }, { "key": "Content Shared", "duration": { "isActive": false, "minDurationTime": 0, "maxDurationTime": 0 }, "sum": { "isActive": false, "minSumValue": 0, "maxSumValue": 0 }, "segmentations": [{ "key": "Content Type", "values": [{ "key": "Movie", "probability": "15" }, { "key": "TV Show", "probability": "20" }, { "key": "Podcast", "probability": "40" }, { "key": "Music Video", "probability": "25" }] }, { "key": "Share Type", "values": [{ "key": "Social Platform", "probability": "40" }, { "key": "Copy Link", "probability": "60" }] }, { "key": "Social Platform Name", "values": [{ "key": "", "probability": "0" }], "condition": { "selectedKey": "Share Platform", "selectedValue": "Social Media", "conditionType": 1, "values": [{ "key": "Messenger", "probability": "40" }, { "key": "Whatsapp", "probability": "40" }, { "key": "Instagram", "probability": "20" }] }, "conditions": [{ "selectedKey": "Share Type", "selectedValue": "Social Platform", "conditionType": 1, "values": [{ "key": "Messenger", "probability": "30" }, { "key": "WhatsApp", "probability": "50" }, { "key": "Instagram", "probability": "20" }] }] }] }, { "key": "Subscription Purchased", "duration": { "isActive": false, "minDurationTime": 0, "maxDurationTime": 0 }, "sum": { "isActive": true, "minSumValue": "6", "maxSumValue": "17" }, "segmentations": [{ "key": "Subscription Type", "values": [{ "key": "Monthly", "probability": "65" }, { "key": "Quarterly", "probability": "15" }, { "key": "Yearly", "probability": "20" }] }] }, { "key": "Subscription Renewed", "duration": { "isActive": false, "minDurationTime": 0, "maxDurationTime": 0 }, "sum": { "isActive": true, "minSumValue": "6", "maxSumValue": "17" }, "segmentations": [{ "key": "Update", "values": [{ "key": "Without Change", "probability": "60" }, { "key": "Plan Changed", "probability": "10" }, { "key": "Billing Period Changed", "probability": "30" }] }, { "key": "Subscription Type", "values": [{ "key": "Monthly", "probability": "50" }, { "key": "Quarterly", "probability": "20" }, { "key": "Yearly", "probability": "30" }] }] }, { "key": "Subscription Cancelled", "duration": { "isActive": false, "minDurationTime": 0, "maxDurationTime": 0 }, "sum": { "isActive": true, "minSumValue": "6", "maxSumValue": "17" }, "segmentations": [{ "key": "Subscription Type", "values": [{ "key": "Monthly", "probability": "70" }, { "key": "Quarterly", "probability": "20" }, { "key": "Yearly", "probability": "10" }] }, { "key": "Cancellation Reason", "values": [{ "key": "Cost", "probability": "35" }, { "key": "Content Availability", "probability": "30" }, { "key": "User Experience", "probability": "10" }, { "key": "Switched to Competitor", "probability": "20" }, { "key": "Technical Issues", "probability": "5" }], "conditions": [{ "selectedKey": "Subscription Type", "selectedValue": "Monthly", "conditionType": 1, "values": [{ "key": "Cost", "probability": "50" }, { "key": "Content Availability", "probability": "30" }, { "key": "User Experience", "probability": "10" }, { "key": "Switched to Competitor", "probability": "5" }, { "key": "Technical Issues", "probability": "5" }] }] }] }, { "key": "Content Feedback Submitted", "duration": { "isActive": false, "minDurationTime": 0, "maxDurationTime": 0 }, "sum": { "isActive": false, "minSumValue": 0, "maxSumValue": 0 }, "segmentations": [{ "key": "Feedback", "values": [{ "key": "I like this", "probability": "50" }, { "key": "I love this", "probability": "35" }, { "key": "Not for me", "probability": "15" }] }, { "key": "Content Type", "values": [{ "key": "Movie", "probability": "30" }, { "key": "Podcast", "probability": "20" }, { "key": "TV Show", "probability": "30" }, { "key": "Music Video", "probability": "20" }] }, { "key": "Genre", "values": [{ "key": "", "probability": 0 }], "conditions": [{ "selectedKey": "Content Type", "selectedValue": "Movie", "conditionType": 1, "values": [{ "key": "Action", "probability": "50" }, { "key": "Romantic Comedy", "probability": "30" }, { "key": "Horror", "probability": "20" }] }, { "selectedKey": "Content Type", "selectedValue": "Podcast", "conditionType": 1, "values": [{ "key": "True Crime", "probability": "10" }, { "key": "Educational", "probability": "60" }, { "key": "Comedy", "probability": "30" }] }, { "selectedKey": "Content Type", "selectedValue": "TV Show", "conditionType": 1, "values": [{ "key": "Fantasy", "probability": "20" }, { "key": "Drama", "probability": "30" }, { "key": "Sitcom", "probability": "22" }, { "key": "Action", "probability": "28" }] }, { "selectedKey": "Content Type", "selectedValue": "Music Video", "conditionType": 1, "values": [{ "key": "Pop", "probability": "70" }, { "key": "Rock", "probability": "10" }, { "key": "Hip-Hop", "probability": "20" }] }] }] }, { "key": "Content Added to List", "duration": { "isActive": false, "minDurationTime": 0, "maxDurationTime": 0 }, "sum": { "isActive": false, "minSumValue": 0, "maxSumValue": 0 }, "segmentations": [{ "key": "Content Type", "values": [{ "key": "Movie", "probability": "15" }, { "key": "Podcast", "probability": "20" }, { "key": "TV Show", "probability": "5" }, { "key": "Music Video", "probability": "60" }] }] }, { "key": "Achievement Unlocked", "duration": { "isActive": false, "minDurationTime": 0, "maxDurationTime": 0 }, "sum": { "isActive": false, "minSumValue": 0, "maxSumValue": 0 }, "segmentations": [{ "key": "Achievement Type", "values": [{ "key": "", "probability": 0 }], "conditions": [{ "selectedKey": "Content Type", "selectedValue": "TV Show", "conditionType": 1, "values": [{ "key": "Binge-Watcher", "probability": "20" }, { "key": "", "probability": "80" }] }, { "selectedKey": "Content Type", "selectedValue": "Podcast", "conditionType": 1, "values": [{ "key": "Podcast Pioneer (100 Podcast Episodes)", "probability": "5" }, { "key": "", "probability": "95" }] }, { "selectedKey": "Content Type", "selectedValue": "Movie", "conditionType": 1, "values": [{ "key": "Marathon Master (10 Movies in a Week)", "probability": "5" }, { "key": "Classic Connoisseur (20 Classic Movies)", "probability": "5" }, { "key": "", "probability": "90" }] }, { "selectedKey": "Content Type", "selectedValue": "Music Video", "conditionType": 1, "values": [{ "key": "Genre Hopper (10 Different Music Genres)", "probability": "10" }, { "key": "", "probability": "90" }] }] }, { "key": "Content Type", "values": [{ "key": "TV Show", "probability": "40" }, { "key": "Podcast", "probability": "10" }, { "key": "Movie", "probability": "35" }, { "key": "Music Video", "probability": "15" }] }] }], "views": [{ "key": "Home", "duration": { "isActive": true, "minDurationTime": "10", "maxDurationTime": "120" }, "segmentations": [] }, { "key": "Account Details", "duration": { "isActive": true, "minDurationTime": "5", "maxDurationTime": "45" }, "segmentations": [] }, { "key": "Settings", "duration": { "isActive": true, "minDurationTime": "10", "maxDurationTime": "90" }, "segmentations": [] }, { "key": "Content Details", "duration": { "isActive": true, "minDurationTime": "85", "maxDurationTime": "120" }, "segmentations": [] }, { "key": "Browse", "duration": { "isActive": true, "minDurationTime": "60", "maxDurationTime": "180" }, "segmentations": [] }, { "key": "My Lists", "duration": { "isActive": true, "minDurationTime": "10", "maxDurationTime": "120" }, "segmentations": [] }, { "key": "Search", "duration": { "isActive": true, "minDurationTime": "30", "maxDurationTime": "300" }, "segmentations": [] }], "sequences": [{ "steps": [{ "key": "session", "value": "start", "probability": 100, "fixed": true }, { "key": "views", "value": "Home", "probability": "100" }, { "key": "events", "value": "Playback Started", "probability": "90" }, { "key": "events", "value": "Playback Paused", "probability": "90" }, { "key": "events", "value": "Playback Resumed", "probability": "90" }, { "key": "events", "value": "Playback Completed", "probability": "90" }, { "key": "events", "value": "Achievement Unlocked", "probability": "50" }, { "key": "events", "value": "Content Feedback Submitted", "probability": "50" }, { "key": "events", "value": "Content Shared", "probability": "50" }, { "key": "session", "value": "end", "probability": 100, "fixed": true }] }, { "steps": [{ "key": "session", "value": "start", "probability": 100, "fixed": true }, { "key": "views", "value": "Settings", "probability": "100" }, { "key": "events", "value": "Subscription Purchased", "probability": "80" }, { "key": "session", "value": "end", "probability": 100, "fixed": true }] }, { "steps": [{ "key": "session", "value": "start", "probability": 100, "fixed": true }, { "key": "views", "value": "Account Details", "probability": "100" }, { "key": "events", "value": "Subscription Cancelled", "probability": "50" }, { "key": "session", "value": "end", "probability": 100, "fixed": true }] }, { "steps": [{ "key": "session", "value": "start", "probability": 100, "fixed": true }, { "key": "views", "value": "Account Details", "probability": "100" }, { "key": "events", "value": "Subscription Renewed", "probability": "50" }, { "key": "session", "value": "end", "probability": 100, "fixed": true }] }, { "steps": [{ "key": "session", "value": "start", "probability": 100, "fixed": true }, { "key": "views", "value": "Browse", "probability": "100" }, { "key": "events", "value": "Content Added to List", "probability": "10" }, { "key": "session", "value": "end", "probability": 100, "fixed": true }] }], "behavior": { "runningSession": ["2", "36"], "generalConditions": [], "sequences": [{ "key": "Sequence_1", "probability": "70" }, { "key": "Sequence_2", "probability": "5" }, { "key": "Sequence_3", "probability": "5" }, { "key": "Sequence_4", "probability": "5" }, { "key": "Sequence_5", "probability": "5" }, { "key": "random", "probability": "10" }], "sequenceConditions": [{ "selectedKey": "Achievements", "selectedValue": "Marathon Master (10 Movies in a Week)", "conditionType": 1, "values": [{ "key": "Sequence_1", "probability": "65" }, { "key": "Sequence_2", "probability": "10" }, { "key": "Sequence_3", "probability": "2" }, { "key": "Sequence_4", "probability": "8" }, { "key": "Sequence_5", "probability": "10" }, { "key": "random", "probability": "5" }] }, { "selectedKey": "Achievements", "selectedValue": "Binge-Watcher", "conditionType": 1, "values": [{ "key": "Sequence_1", "probability": "70" }, { "key": "Sequence_2", "probability": "5" }, { "key": "Sequence_3", "probability": "1" }, { "key": "Sequence_4", "probability": "9" }, { "key": "Sequence_5", "probability": "5" }, { "key": "random", "probability": "10" }] }, { "selectedKey": "Subscription Plan", "selectedValue": "Free", "conditionType": 1, "values": [{ "key": "Sequence_1", "probability": "85" }, { "key": "Sequence_2", "probability": "0" }, { "key": "Sequence_3", "probability": "0" }, { "key": "Sequence_4", "probability": "0" }, { "key": "Sequence_5", "probability": "5" }, { "key": "random", "probability": "10" }] }] }, "uniqueUserCount": 100, "platformType": ["Mobile", "Web", "Desktop"] },
        { "_id": "defaultFinance", "name": "Finance", "isDefault": true, "lastEditedBy": "", "users": [{ "key": "Gender", "values": [{ "key": "Male", "probability": "48" }, { "key": "Female", "probability": "48" }, { "key": "Other", "probability": "4" }], "conditions": [{ "selectedKey": "Customer Type", "selectedValue": "Business", "conditionType": 1, "values": [{ "key": "", "probability": "100" }] }] }, { "key": "Account Types", "values": [{ "key": "Savings", "probability": "40" }, { "key": "Checking", "probability": "30" }, { "key": "[\"Checking\",\"Investment\"]", "probability": "20" }, { "key": "[\"Checking\",\"Savings\",\"Investment\"]", "probability": "10" }] }, { "key": "Credit Cards", "values": [{ "key": "Basic", "probability": "60" }, { "key": "[\"Basic\",\"Gold\"]", "probability": "20" }, { "key": "[\"Platinium\",\"Gold\"]", "probability": "5" }, { "key": "Platinium", "probability": "5" }, { "key": "Gold", "probability": "10" }] }, { "key": "Communication Preference", "values": [{ "key": "Phone", "probability": "15" }, { "key": "Email", "probability": "10" }, { "key": "[\"Phone\",\"Email\",\"SMS\",\"Push Notification\"]", "probability": "60" }, { "key": "[\"Email\",\"SMS\",\"Push Notification\"]", "probability": "15" }] }, { "key": "Customer Type", "values": [{ "key": "Personal", "probability": "80" }, { "key": "Business", "probability": "20" }] }, { "key": "Total Assets", "values": [{ "key": "Less than $50,000", "probability": "70" }, { "key": "$50,000 - $500,000", "probability": "25" }, { "key": "Over $500,000", "probability": "5" }], "conditions": [{ "selectedKey": "Customer Type", "selectedValue": "Business", "conditionType": 1, "values": [{ "key": "Less than $50,000", "probability": "50" }, { "key": "$50,000 - $500,000", "probability": "35" }, { "key": "Over $500,000", "probability": "15" }] }] }], "events": [{ "key": "Transaction Made", "duration": { "isActive": true, "minDurationTime": "30", "maxDurationTime": "600" }, "sum": { "isActive": true, "minSumValue": "10", "maxSumValue": "5000" }, "segmentations": [{ "key": "Transaction Type", "values": [{ "key": "Deposit", "probability": "10" }, { "key": "Withdrawal", "probability": "15" }, { "key": "Transfer", "probability": "40" }, { "key": "Payment", "probability": "35" }] }, { "key": "Currency", "values": [{ "key": "USD", "probability": "40" }, { "key": "EUR", "probability": "35" }, { "key": "GBP", "probability": "10" }, { "key": "CAD", "probability": "5" }, { "key": "Other", "probability": "10" }] }, { "key": "Status", "values": [{ "key": "Success", "probability": "90" }, { "key": "Failure", "probability": "10" }] }, { "key": "Method", "values": [{ "key": "Online", "probability": "65" }, { "key": "ATM", "probability": "25" }, { "key": "Branch", "probability": "10" }] }, { "key": "Status Details", "values": [{ "key": "", "probability": 0 }], "conditions": [{ "selectedKey": "Status", "selectedValue": "Success", "conditionType": 1, "values": [{ "key": "Successful", "probability": "100" }] }, { "selectedKey": "Status", "selectedValue": "Failure", "conditionType": 1, "values": [{ "key": "Insufficient Funds", "probability": "60" }, { "key": "Network Issues", "probability": "8" }, { "key": "Exceeded Daily Limit", "probability": "30" }, { "key": "Account Restrictions", "probability": "2" }] }] }] }, { "key": "Investment Made", "duration": { "isActive": true, "minDurationTime": "60", "maxDurationTime": "1200" }, "sum": { "isActive": true, "minSumValue": "100", "maxSumValue": "10000" }, "segmentations": [{ "key": "Invesment Type", "values": [{ "key": "Stocks", "probability": "40" }, { "key": "Bonds", "probability": "30" }, { "key": "Mutual Funds", "probability": "20" }, { "key": "EFTs", "probability": "10" }] }] }, { "key": "Loan Application", "duration": { "isActive": true, "minDurationTime": 0, "maxDurationTime": 0 }, "sum": { "isActive": true, "minSumValue": "1000", "maxSumValue": "100000" }, "segmentations": [{ "key": "Loan Type", "values": [{ "key": "Personal", "probability": "10" }, { "key": "Auto", "probability": "20" }, { "key": "Mortgage", "probability": "45" }, { "key": "Student", "probability": "25" }] }, { "key": "Loan Term", "values": [{ "key": "Up to 6 months", "probability": "40" }, { "key": "6 to 12 months", "probability": "30" }, { "key": "12 - 36 months", "probability": "20" }, { "key": "36 months+", "probability": "10" }] }] }, { "key": "Account Created", "duration": { "isActive": false, "minDurationTime": 0, "maxDurationTime": 0 }, "sum": { "isActive": false, "minSumValue": 0, "maxSumValue": 0 }, "segmentations": [{ "key": "Account Type", "values": [{ "key": "Savings", "probability": "45" }, { "key": "Checking", "probability": "30" }, { "key": "Invesment", "probability": "25" }] }] }, { "key": "Credit Card Application", "duration": { "isActive": false, "minDurationTime": 0, "maxDurationTime": 0 }, "sum": { "isActive": false, "minSumValue": 0, "maxSumValue": 0 }, "segmentations": [{ "key": "Card Type", "values": [{ "key": "Basic", "probability": "70" }, { "key": "Gold", "probability": "20" }, { "key": "Platinum", "probability": "10" }] }, { "key": "Card Limit", "values": [{ "key": "5000 USD", "probability": "80" }, { "key": "10000 USD ", "probability": "20" }], "conditions": [{ "selectedKey": "Card Type", "selectedValue": "Platinum", "conditionType": 1, "values": [{ "key": "50000 USD", "probability": "100" }] }] }] }, { "key": "Support Contacted", "duration": { "isActive": false, "minDurationTime": 0, "maxDurationTime": 0 }, "sum": { "isActive": false, "minSumValue": 0, "maxSumValue": 0 }, "segmentations": [{ "key": "Contact Method", "values": [{ "key": "Phone", "probability": "70" }, { "key": "Email", "probability": "10" }, { "key": "Live Chat", "probability": "20" }] }, { "key": "Issue Type", "values": [{ "key": "Account Issue", "probability": "40" }, { "key": "Transaction Issue", "probability": "10" }, { "key": "Loan Issue", "probability": "15" }, { "key": "Investment Issue", "probability": "5" }, { "key": "Other Issue", "probability": "30" }] }] }, { "key": "Promotional Offer Viewed", "duration": { "isActive": false, "minDurationTime": 0, "maxDurationTime": 0 }, "sum": { "isActive": false, "minSumValue": 0, "maxSumValue": 0 }, "segmentations": [{ "key": "Offer Type", "values": [{ "key": "Loan Offer", "probability": 0 }, { "key": "Investment Offer", "probability": 0 }, { "key": "Credit Card Offer", "probability": 0 }] }, { "key": "Channel", "values": [{ "key": "Email", "probability": "10" }, { "key": "SMS", "probability": "20" }, { "key": "In-App Notification", "probability": "30" }, { "key": "Push Notification", "probability": "30" }, { "key": "Website", "probability": "10" }] }] }, { "key": "Credit Card Payment", "duration": { "isActive": false, "minDurationTime": 0, "maxDurationTime": 0 }, "sum": { "isActive": false, "minSumValue": 0, "maxSumValue": 0 }, "segmentations": [{ "key": "Payment Type", "values": [{ "key": "Minimum Payment", "probability": "15" }, { "key": "Full Payment", "probability": "80" }, { "key": "Partial Payment", "probability": "5" }] }, { "key": "Method", "values": [{ "key": "Bank Transfer", "probability": "80" }, { "key": "Cash", "probability": "20" }] }] }, { "key": "Bill Payment", "duration": { "isActive": false, "minDurationTime": 0, "maxDurationTime": 0 }, "sum": { "isActive": true, "minSumValue": "10", "maxSumValue": "1000" }, "segmentations": [{ "key": "Bill Type", "values": [{ "key": "Utilities", "probability": "10" }, { "key": "Credit Card", "probability": "40" }, { "key": "Loan Repayment", "probability": "30" }, { "key": "Insurance", "probability": "10" }, { "key": "Rent", "probability": "10" }] }, { "key": "Payment Method", "values": [{ "key": "Bank Account", "probability": "50" }, { "key": "Credit Card", "probability": "30" }, { "key": "Debit Card", "probability": "20" }] }] }, { "key": "Support Issue Closed", "duration": { "isActive": true, "minDurationTime": "300", "maxDurationTime": "30000" }, "sum": { "isActive": false, "minSumValue": 0, "maxSumValue": 0 }, "segmentations": [{ "key": "Contact Method", "values": [{ "key": "Phone", "probability": "70" }, { "key": "Email", "probability": "10" }, { "key": "Live Chat", "probability": "20" }] }, { "key": "Issue Type", "values": [{ "key": "Account Issue", "probability": "40" }, { "key": "Transaction Issue", "probability": "10" }, { "key": "Loan Issue", "probability": "15" }, { "key": "Investment Issue", "probability": "5" }, { "key": "Other Issue", "probability": "30" }] }, { "key": "Status", "values": [{ "key": "Resolved", "probability": "60" }, { "key": "Branch Visit Required", "probability": "20" }, { "key": "Followup Required", "probability": "20" }], "conditions": [{ "selectedKey": "Contact Method", "selectedValue": "Live Chat", "conditionType": 1, "values": [{ "key": "Resolved", "probability": "80" }, { "key": "Branch Visit Required", "probability": "10" }, { "key": "Followup Required", "probability": "10" }] }] }] }, { "key": "Onboarding - 1 - Customer Type and Details", "duration": { "isActive": true, "minDurationTime": "30", "maxDurationTime": "120" }, "sum": { "isActive": false, "minSumValue": 0, "maxSumValue": 0 }, "segmentations": [{ "key": "Customer Type", "values": [{ "key": "Personal", "probability": "80" }, { "key": "Business", "probability": "20" }] }, { "key": "Business Size", "values": [{ "key": "", "probability": 0 }], "conditions": [{ "selectedKey": "Customer Type", "selectedValue": "Business", "conditionType": 1, "values": [{ "key": "1-10 Employees", "probability": "40" }, { "key": "11-200 Employees", "probability": "30" }, { "key": "201-500 Employees", "probability": "20" }, { "key": "500+ Employees", "probability": "10" }] }] }, { "key": "Business Age", "values": [{ "key": "", "probability": 0 }], "conditions": [{ "selectedKey": "Customer Type", "selectedValue": "Business", "conditionType": 1, "values": [{ "key": "Startup (0-2 years)", "probability": "40" }, { "key": "Established (3-10 years)", "probability": "50" }, { "key": "Mature (10+ years)", "probability": "10" }] }] }] }, { "key": "Onboarding - 2 - Individual Details", "duration": { "isActive": true, "minDurationTime": "120", "maxDurationTime": "300" }, "sum": { "isActive": false, "minSumValue": 0, "maxSumValue": 0 }, "segmentations": [{ "key": "Customer Type", "values": [{ "key": "Personal", "probability": "80" }, { "key": "Business", "probability": "20" }] }] }, { "key": "Onboarding - 3 - Identity Verification", "duration": { "isActive": true, "minDurationTime": "180", "maxDurationTime": "600" }, "sum": { "isActive": false, "minSumValue": 0, "maxSumValue": 0 }, "segmentations": [{ "key": "Method", "values": [{ "key": "ID Card Upload", "probability": "70" }, { "key": "Passport Upload", "probability": "20" }, { "key": "Video Call", "probability": "10" }] }] }], "views": [{ "key": "Home", "duration": { "isActive": true, "minDurationTime": "10", "maxDurationTime": "300" }, "segmentations": [] }, { "key": "Account Overview", "duration": { "isActive": true, "minDurationTime": "30", "maxDurationTime": "600" }, "segmentations": [] }, { "key": "Transaction History", "duration": { "isActive": true, "minDurationTime": "20", "maxDurationTime": "500" }, "segmentations": [] }, { "key": "Investment Portfolio ", "duration": { "isActive": true, "minDurationTime": "30", "maxDurationTime": "700" }, "segmentations": [] }, { "key": "Loan Details", "duration": { "isActive": true, "minDurationTime": "15", "maxDurationTime": "400" }, "segmentations": [] }, { "key": "Bill Payment", "duration": { "isActive": true, "minDurationTime": "20", "maxDurationTime": "500" }, "segmentations": [] }, { "key": "Offers", "duration": { "isActive": true, "minDurationTime": "10", "maxDurationTime": "250" }, "segmentations": [] }, { "key": "Fund Transfer", "duration": { "isActive": true, "minDurationTime": "20", "maxDurationTime": "400" }, "segmentations": [] }, { "key": "Credit Card Application", "duration": { "isActive": true, "minDurationTime": "30", "maxDurationTime": "600" }, "segmentations": [] }, { "key": "Support", "duration": { "isActive": true, "minDurationTime": "50", "maxDurationTime": "500" }, "segmentations": [] }, { "key": "Settings", "duration": { "isActive": true, "minDurationTime": "15", "maxDurationTime": "350" }, "segmentations": [] }], "sequences": [{ "steps": [{ "key": "session", "value": "start", "probability": 100, "fixed": true }, { "key": "views", "value": "Home", "probability": "100" }, { "key": "views", "value": "Fund Transfer", "probability": "90" }, { "key": "events", "value": "Transaction Made", "probability": "100" }, { "key": "events", "value": "Loan Application", "probability": "90" }, { "key": "views", "value": "Loan Details", "probability": "100" }, { "key": "events", "value": "Credit Card Payment", "probability": "90" }, { "key": "views", "value": "Bill Payment", "probability": "100" }, { "key": "events", "value": "Bill Payment", "probability": "90" }, { "key": "session", "value": "end", "probability": 100, "fixed": true }] }, { "steps": [{ "key": "session", "value": "start", "probability": 100, "fixed": true }, { "key": "views", "value": "Account Overview", "probability": "100" }, { "key": "views", "value": "Credit Card Application", "probability": "90" }, { "key": "events", "value": "Credit Card Application", "probability": "100" }, { "key": "views", "value": "Settings", "probability": "90" }, { "key": "views", "value": "Investment Portfolio ", "probability": "70" }, { "key": "events", "value": "Investment Made", "probability": "70" }, { "key": "views", "value": "Loan Details", "probability": "50" }, { "key": "events", "value": "Loan Application", "probability": "50" }, { "key": "session", "value": "end", "probability": 100, "fixed": true }] }, { "steps": [{ "key": "session", "value": "start", "probability": 100, "fixed": true }, { "key": "views", "value": "Offers", "probability": "90" }, { "key": "events", "value": "Promotional Offer Viewed", "probability": "90" }, { "key": "events", "value": "Loan Application", "probability": "40" }, { "key": "session", "value": "end", "probability": 100, "fixed": true }] }, { "steps": [{ "key": "session", "value": "start", "probability": 100, "fixed": true }, { "key": "views", "value": "Offers", "probability": "90" }, { "key": "events", "value": "Promotional Offer Viewed", "probability": "90" }, { "key": "views", "value": "Investment Portfolio ", "probability": "100" }, { "key": "events", "value": "Investment Made", "probability": "40" }, { "key": "session", "value": "end", "probability": 100, "fixed": true }] }, { "steps": [{ "key": "session", "value": "start", "probability": 100, "fixed": true }, { "key": "views", "value": "Offers", "probability": "90" }, { "key": "events", "value": "Promotional Offer Viewed", "probability": "90" }, { "key": "views", "value": "Credit Card Application", "probability": "100" }, { "key": "events", "value": "Credit Card Application", "probability": "40" }, { "key": "session", "value": "end", "probability": 100, "fixed": true }] }, { "steps": [{ "key": "session", "value": "start", "probability": 100, "fixed": true }, { "key": "views", "value": "Support", "probability": "90" }, { "key": "events", "value": "Support Contacted", "probability": "90" }, { "key": "events", "value": "Support Issue Closed", "probability": "100" }, { "key": "session", "value": "end", "probability": 100, "fixed": true }] }, { "steps": [{ "key": "session", "value": "start", "probability": 100, "fixed": true }, { "key": "events", "value": "Onboarding - 1 - Customer Type and Details", "probability": "100" }, { "key": "events", "value": "Onboarding - 2 - Individual Details", "probability": "90" }, { "key": "events", "value": "Onboarding - 3 - Identity Verification", "probability": "70" }, { "key": "views", "value": "Home", "probability": "100" }, { "key": "session", "value": "end", "probability": 100, "fixed": true }] }], "behavior": { "runningSession": ["6", "24"], "generalConditions": [], "sequences": [{ "key": "Sequence_1", "probability": "40" }, { "key": "Sequence_2", "probability": "30" }, { "key": "Sequence_3", "probability": "5" }, { "key": "Sequence_4", "probability": "5" }, { "key": "Sequence_5", "probability": "5" }, { "key": "Sequence_6", "probability": "5" }, { "key": "Sequence_7", "probability": "5" }, { "key": "random", "probability": "5" }], "sequenceConditions": [{ "selectedKey": "Total Assets", "selectedValue": "Over $500,000", "conditionType": 1, "values": [{ "key": "Sequence_1", "probability": "46" }, { "key": "Sequence_2", "probability": "36" }, { "key": "Sequence_3", "probability": "1" }, { "key": "Sequence_4", "probability": "1" }, { "key": "Sequence_5", "probability": "1" }, { "key": "Sequence_6", "probability": "5" }, { "key": "Sequence_7", "probability": "5" }, { "key": "random", "probability": "5" }] }, { "selectedKey": "Customer Type", "selectedValue": "Business", "conditionType": 1, "values": [{ "key": "Sequence_1", "probability": "30" }, { "key": "Sequence_2", "probability": "27" }, { "key": "Sequence_3", "probability": "10" }, { "key": "Sequence_4", "probability": "8" }, { "key": "Sequence_5", "probability": "5" }, { "key": "Sequence_6", "probability": "10" }, { "key": "Sequence_7", "probability": "5" }, { "key": "random", "probability": "5" }] }] }, "uniqueUserCount": 100, "platformType": ["Mobile", "Web", "Desktop"] },
        { "_id": "defaultSaas", "name": "B2B SaaS", "isDefault": true, "lastEditedBy": "", "users": [{ "key": "Subscription Plan", "values": [{ "key": "Free", "probability": "40" }, { "key": "Professional", "probability": "35" }, { "key": "Enterprise", "probability": "25" }] }, { "key": "Team Size", "values": [{ "key": "Startup (1-50 employees)", "probability": "50" }, { "key": "SME (51-200 employees)", "probability": "30" }, { "key": "Large Enterprise (200+ employees)", "probability": "20" }], "conditions": [{ "selectedKey": "Subscription Plan", "selectedValue": "Enterprise", "conditionType": 1, "values": [{ "key": "Startup (1-50 employees)", "probability": "10" }, { "key": "SME (51-200 employees)", "probability": "50" }, { "key": "Large Enterprise (200+ employees)", "probability": "40" }] }] }, { "key": "Industry", "values": [{ "key": "Technology", "probability": "30" }, { "key": "Marketing", "probability": "20" }, { "key": "Finance", "probability": "20" }, { "key": "Consulting", "probability": "15" }, { "key": "Others", "probability": "15" }] }, { "key": "Acquisition Source", "values": [{ "key": "Referral", "probability": "40" }, { "key": "Direct", "probability": "30" }, { "key": "Organic", "probability": "20" }, { "key": "Paid", "probability": "10" }] }, { "key": "Onboarding Method", "values": [{ "key": "Self-Onboarding", "probability": "80" }, { "key": "Assisted Onboarding", "probability": "20" }], "conditions": [{ "selectedKey": "Subscription Plan", "selectedValue": "Enterprise", "conditionType": 1, "values": [{ "key": "Self-Onboarding", "probability": "20" }, { "key": "Assisted Onboarding", "probability": "80" }] }] }], "events": [{ "key": "Project Created", "duration": { "isActive": true, "minDurationTime": "10", "maxDurationTime": "300" }, "sum": { "isActive": false, "minSumValue": "1", "maxSumValue": "10" }, "segmentations": [{ "key": "Project Type", "values": [{ "key": "Development", "probability": "40" }, { "key": "Marketing", "probability": "30" }, { "key": "Finance", "probability": "20" }, { "key": "Consulting", "probability": "10" }] }] }, { "key": "Task Created", "duration": { "isActive": true, "minDurationTime": "30", "maxDurationTime": "600" }, "sum": { "isActive": false, "minSumValue": "1", "maxSumValue": "50" }, "segmentations": [{ "key": "Priority", "values": [{ "key": "High", "probability": "30" }, { "key": "Medium", "probability": "50" }, { "key": "Low", "probability": "20" }] }, { "key": "Assigned To", "values": [{ "key": "Team Member", "probability": "100" }], "conditions": [{ "selectedKey": "Priority", "selectedValue": "High", "conditionType": 1, "values": [{ "key": "Senior Developer", "probability": "50" }, { "key": "Project Manager", "probability": "30" }, { "key": "Designer", "probability": "20" }] }] }] }, { "key": "Task Completed", "duration": { "isActive": true, "minDurationTime": "14000", "maxDurationTime": "864000" }, "sum": { "isActive": false, "minSumValue": "", "maxSumValue": "" }, "segmentations": [{ "key": "Completion Time", "values": [{ "key": "Within Deadline", "probability": "70" }, { "key": "Overdue", "probability": "30" }] }] }, { "key": "Comment Added", "duration": { "isActive": true, "minDurationTime": "30", "maxDurationTime": "180" }, "sum": { "isActive": false, "minSumValue": 0, "maxSumValue": 0 }, "segmentations": [{ "key": "Comment Length", "values": [{ "key": "Short", "probability": "50" }, { "key": "Medium", "probability": "30" }, { "key": "Long", "probability": "20" }] }] }, { "key": "File Uploaded", "duration": { "isActive": true, "minDurationTime": "10", "maxDurationTime": "180" }, "sum": { "isActive": true, "minSumValue": "1", "maxSumValue": "100" }, "segmentations": [{ "key": "File Type", "values": [{ "key": "Document", "probability": "50" }, { "key": "Image", "probability": "30" }, { "key": "Video", "probability": "10" }, { "key": "Other", "probability": "10" }] }] }, { "key": "Project Archived", "duration": { "isActive": false, "minDurationTime": 0, "maxDurationTime": 0 }, "sum": { "isActive": false, "minSumValue": "", "maxSumValue": "" }, "segmentations": [] }, { "key": "Task Updated", "duration": { "isActive": true, "minDurationTime": "10", "maxDurationTime": "360" }, "sum": { "isActive": false, "minSumValue": "30", "maxSumValue": "240" }, "segmentations": [{ "key": "Update Type", "values": [{ "key": "Status Change", "probability": "25" }, { "key": "Priority Change", "probability": "15" }, { "key": "Description Update", "probability": "60" }] }] }, { "key": "Integration Connected", "duration": { "isActive": true, "minDurationTime": "300", "maxDurationTime": "1800" }, "sum": { "isActive": false, "minSumValue": 0, "maxSumValue": 0 }, "segmentations": [{ "key": "Integration Type", "values": [{ "key": "CRM", "probability": "30" }, { "key": "Marketing Tools", "probability": "20" }, { "key": "Payment Gateway", "probability": "10" }, { "key": "Communication Tools", "probability": "40" }] }] }, { "key": "Feature Used", "duration": { "isActive": true, "minDurationTime": "30", "maxDurationTime": "600" }, "sum": { "isActive": false, "minSumValue": 0, "maxSumValue": 0 }, "segmentations": [{ "key": "Feature", "values": [{ "key": "Analytics", "probability": "15" }, { "key": "Collaboration Tools", "probability": "25" }, { "key": "File Sharing", "probability": "10" }, { "key": "Task Management", "probability": "40" }, { "key": "Time Tracking", "probability": "10" }] }] }], "views": [{ "key": "Dashboard", "duration": { "isActive": true, "minDurationTime": "10", "maxDurationTime": "600" }, "segmentations": [] }, { "key": "Project Overview", "duration": { "isActive": true, "minDurationTime": "10", "maxDurationTime": "300" }, "segmentations": [] }, { "key": "Task List", "duration": { "isActive": true, "minDurationTime": "10", "maxDurationTime": "240" }, "segmentations": [] }, { "key": "Reports", "duration": { "isActive": true, "minDurationTime": "10", "maxDurationTime": "300" }, "segmentations": [] }, { "key": "Settings", "duration": { "isActive": true, "minDurationTime": "10", "maxDurationTime": "120" }, "segmentations": [] }], "sequences": [{ "steps": [{ "key": "session", "value": "start", "probability": 100, "fixed": true }, { "key": "views", "value": "Dashboard", "probability": "100" }, { "key": "views", "value": "Project Overview", "probability": "90" }, { "key": "events", "value": "Project Created", "probability": "80" }, { "key": "events", "value": "Task Created", "probability": "70" }, { "key": "events", "value": "Task Updated", "probability": "40" }, { "key": "views", "value": "Task List", "probability": "80" }, { "key": "events", "value": "Task Completed", "probability": "50" }, { "key": "events", "value": "Comment Added", "probability": "30" }, { "key": "events", "value": "File Uploaded", "probability": "40" }, { "key": "session", "value": "end", "probability": 100, "fixed": true }] }, { "steps": [{ "key": "session", "value": "start", "probability": 100, "fixed": true }, { "key": "views", "value": "Dashboard", "probability": "100" }, { "key": "views", "value": "Reports", "probability": "70" }, { "key": "events", "value": "Task Created", "probability": "80" }, { "key": "events", "value": "Task Completed", "probability": "60" }, { "key": "views", "value": "Task List", "probability": "90" }, { "key": "events", "value": "Project Archived", "probability": "20" }, { "key": "session", "value": "end", "probability": 100, "fixed": true }] }, { "steps": [{ "key": "session", "value": "start", "probability": 100, "fixed": true }, { "key": "views", "value": "Settings", "probability": "100" }, { "key": "events", "value": "Integration Connected", "probability": "80" }, { "key": "session", "value": "end", "probability": 100, "fixed": true }] }, { "steps": [{ "key": "session", "value": "start", "probability": 100, "fixed": true }, { "key": "views", "value": "Dashboard", "probability": "100" }, { "key": "events", "value": "Feature Used", "probability": "90" }, { "key": "session", "value": "end", "probability": 100, "fixed": true }] }], "behavior": { "runningSession": ["2", "12"], "generalConditions": [], "sequences": [{ "key": "Sequence_1", "probability": "50" }, { "key": "Sequence_2", "probability": "40" }, { "key": "Sequence_3", "probability": "5" }, { "key": "Sequence_4", "probability": "2" }, { "key": "random", "probability": "3" }], "sequenceConditions": [{ "selectedKey": "Subscription Plan", "selectedValue": "Enterprise", "conditionType": 1, "values": [{ "key": "Sequence_1", "probability": "60" }, { "key": "Sequence_2", "probability": "30" }, { "key": "Sequence_3", "probability": "5" }, { "key": "Sequence_4", "probability": "2" }, { "key": "random", "probability": "3" }] }, { "selectedKey": "Onboarding Method", "selectedValue": "Assisted Onboarding", "conditionType": 1, "values": [{ "key": "Sequence_1", "probability": "47" }, { "key": "Sequence_2", "probability": "30" }, { "key": "Sequence_3", "probability": "10" }, { "key": "Sequence_4", "probability": "10" }, { "key": "random", "probability": "3" }] }] }, "uniqueUserCount": 100, "platformType": ["Web", "Desktop", "Mobile"] },
        { "_id": "defaultHealthcare", "name": "Healthcare", "isDefault": true, "lastEditedBy": "", "users": [{ "key": "Chronic Conditions", "values": [{ "key": "Diabetes ", "probability": "15" }, { "key": "Hypertension", "probability": "10" }, { "key": "Asthma", "probability": "15" }, { "key": "None", "probability": "50" }, { "key": "[\"Diabetes\",\"Hypertension\"]", "probability": "5" }, { "key": "[\"Diabetes\",\"Asthma\"]", "probability": "5" }] }, { "key": "Allergies", "values": [{ "key": "Penicillin", "probability": "15" }, { "key": "Nuts", "probability": "15" }, { "key": "Pollen", "probability": "10" }, { "key": "Dust", "probability": "20" }, { "key": "None", "probability": "40" }] }, { "key": "Preferred Language", "values": [{ "key": "English", "probability": "70" }, { "key": "Spanish", "probability": "10" }, { "key": "French", "probability": "10" }, { "key": "German", "probability": "10" }] }, { "key": "Insurance Provider", "values": [{ "key": "Aetna", "probability": "20" }, { "key": "Blue Cross", "probability": "20" }, { "key": "UnitedHealth", "probability": "20" }, { "key": "Kaiser Permanente", "probability": "20" }, { "key": "None", "probability": "20" }] }, { "key": "Insurance Plan", "values": [{ "key": "", "probability": 0 }], "conditions": [{ "selectedKey": "Insurance Provider", "selectedValue": "None", "conditionType": -1, "values": [{ "key": "Basic", "probability": "60" }, { "key": "Family", "probability": "30" }, { "key": "Premium", "probability": "10" }] }] }, { "key": "Age Group", "values": [{ "key": "18-29 years", "probability": "20" }, { "key": "30-44 years", "probability": "30" }, { "key": "45-59 years", "probability": "40" }, { "key": "60+ years", "probability": "10" }] }], "events": [{ "key": "Appointment Scheduled ", "duration": { "isActive": false, "minDurationTime": 0, "maxDurationTime": 0 }, "sum": { "isActive": false, "minSumValue": 0, "maxSumValue": 0 }, "segmentations": [{ "key": "Department", "values": [{ "key": "General Practice", "probability": "25" }, { "key": "Cardiology", "probability": "15" }, { "key": "Dermatology", "probability": "25" }, { "key": "Pediatrics ", "probability": "10" }, { "key": "Orthopedics", "probability": "10" }, { "key": "Other", "probability": "15" }] }, { "key": "Method", "values": [{ "key": "Online", "probability": "20" }, { "key": "Phone", "probability": "60" }, { "key": "In-Person", "probability": "20" }] }] }, { "key": "Appointment Completed", "duration": { "isActive": true, "minDurationTime": "900", "maxDurationTime": "1800" }, "sum": { "isActive": false, "minSumValue": 0, "maxSumValue": 0 }, "segmentations": [{ "key": "Department", "values": [{ "key": "General Practice", "probability": "25" }, { "key": "Cardiology", "probability": "15" }, { "key": "Dermatology", "probability": "25" }, { "key": "Pediatrics ", "probability": "10" }, { "key": "Orthopedics", "probability": "10" }, { "key": "Other", "probability": "15" }] }, { "key": "Outcome", "values": [{ "key": "Follow up", "probability": "20" }, { "key": "Prescription Given", "probability": "20" }, { "key": "Test Ordered", "probability": "20" }, { "key": "Discharged", "probability": "30" }, { "key": "Transfered", "probability": "10" }] }] }, { "key": "Medication Prescribed ", "duration": { "isActive": false, "minDurationTime": 0, "maxDurationTime": 0 }, "sum": { "isActive": false, "minSumValue": 0, "maxSumValue": 0 }, "segmentations": [{ "key": "Medication Type", "values": [{ "key": "Antibiotics", "probability": "50" }, { "key": "Antihypertensive", "probability": "10" }, { "key": "Analgesic", "probability": "10" }, { "key": "Antidiabetic", "probability": "10" }, { "key": "Other", "probability": "20" }] }, { "key": "Prescription Duration", "values": [{ "key": "7 days", "probability": "35" }, { "key": "14 days", "probability": "35" }, { "key": "30 days", "probability": "30" }] }] }, { "key": "Test Ordered", "duration": { "isActive": false, "minDurationTime": 0, "maxDurationTime": 0 }, "sum": { "isActive": false, "minSumValue": 0, "maxSumValue": 0 }, "segmentations": [{ "key": "Test Type", "values": [{ "key": "Blood Test", "probability": "50" }, { "key": "X-Ray", "probability": "30" }, { "key": "MRI", "probability": "10" }, { "key": "CT-Scan", "probability": "5" }, { "key": "EKG", "probability": "5" }] }, { "key": "Urgency", "values": [{ "key": "Routine", "probability": "80" }, { "key": "Urgent", "probability": "20" }] }] }, { "key": "Test Result Received", "duration": { "isActive": false, "minDurationTime": 0, "maxDurationTime": 0 }, "sum": { "isActive": false, "minSumValue": 0, "maxSumValue": 0 }, "segmentations": [{ "key": "Test Type", "values": [{ "key": "Blood Test", "probability": "50" }, { "key": "X-Ray", "probability": "30" }, { "key": "MRI", "probability": "10" }, { "key": "CT-Scan", "probability": "5" }, { "key": "EKG", "probability": "5" }] }, { "key": "Result", "values": [{ "key": "Normal", "probability": "75" }, { "key": "Abnormal", "probability": "25" }] }] }, { "key": "Emergency Visit", "duration": { "isActive": false, "minDurationTime": 0, "maxDurationTime": 0 }, "sum": { "isActive": false, "minSumValue": 0, "maxSumValue": 0 }, "segmentations": [{ "key": "Severity", "values": [{ "key": "Low", "probability": "60" }, { "key": "Medium", "probability": "30" }, { "key": "High", "probability": "10" }] }, { "key": "Outcome", "values": [{ "key": "Admitted", "probability": "30" }, { "key": "Discharged", "probability": "50" }, { "key": "Referred", "probability": "20" }], "conditions": [{ "selectedKey": "Severity", "selectedValue": "High", "conditionType": 1, "values": [{ "key": "Admitted", "probability": "60" }, { "key": "Discharged", "probability": "10" }, { "key": "Referred", "probability": "30" }] }, { "selectedKey": "Severity", "selectedValue": "Medium", "conditionType": 1, "values": [{ "key": "Admitted", "probability": "45" }, { "key": "Discharged", "probability": "30" }, { "key": "Referred", "probability": "25" }] }] }] }, { "key": "Insurance Claim Filed", "duration": { "isActive": false, "minDurationTime": 0, "maxDurationTime": 0 }, "sum": { "isActive": true, "minSumValue": "100", "maxSumValue": "100000" }, "segmentations": [{ "key": "Claim Type", "values": [{ "key": "Consultation", "probability": "40" }, { "key": "Treatment", "probability": "40" }, { "key": "Surgery", "probability": "20" }] }] }, { "key": "Telemedicine Session", "duration": { "isActive": true, "minDurationTime": "600", "maxDurationTime": "1800" }, "sum": { "isActive": false, "minSumValue": 0, "maxSumValue": 0 }, "segmentations": [{ "key": "Session Type", "values": [{ "key": "Video Call", "probability": "60" }, { "key": "Phone Call", "probability": "25" }, { "key": "Chat", "probability": "15" }] }] }, { "key": "Mental Health Check In", "duration": { "isActive": true, "minDurationTime": "120", "maxDurationTime": "300" }, "sum": { "isActive": false, "minSumValue": 0, "maxSumValue": 0 }, "segmentations": [{ "key": "Mood", "values": [{ "key": "Happy", "probability": "20" }, { "key": "Neutral", "probability": "40" }, { "key": "Sad", "probability": "15" }, { "key": "Anxious", "probability": "10" }, { "key": "Stressed", "probability": "15" }] }, { "key": "Activity", "values": [{ "key": "Meditation", "probability": "20" }, { "key": "Counseling", "probability": "50" }, { "key": "Exercise", "probability": "15" }, { "key": "Leisure", "probability": "15" }] }] }, { "key": "Onboarding - 1 - Patient Details", "duration": { "isActive": true, "minDurationTime": "60", "maxDurationTime": "180" }, "sum": { "isActive": false, "minSumValue": 0, "maxSumValue": 0 }, "segmentations": [] }, { "key": "Onboarding - 2 - Patient Health Info", "duration": { "isActive": true, "minDurationTime": "60", "maxDurationTime": "900" }, "sum": { "isActive": false, "minSumValue": 0, "maxSumValue": 0 }, "segmentations": [] }, { "key": "Onboarding - 3 - Identity Verification", "duration": { "isActive": true, "minDurationTime": "120", "maxDurationTime": "600" }, "sum": { "isActive": false, "minSumValue": 0, "maxSumValue": 0 }, "segmentations": [] }], "views": [{ "key": "Home", "duration": { "isActive": true, "minDurationTime": "20", "maxDurationTime": "300" }, "segmentations": [] }, { "key": "Appointments", "duration": { "isActive": true, "minDurationTime": "30", "maxDurationTime": "600" }, "segmentations": [] }, { "key": "Medical Records", "duration": { "isActive": true, "minDurationTime": "40", "maxDurationTime": "500" }, "segmentations": [] }, { "key": "Prescriptions", "duration": { "isActive": true, "minDurationTime": "20", "maxDurationTime": "300" }, "segmentations": [] }, { "key": "Insurance", "duration": { "isActive": true, "minDurationTime": "20", "maxDurationTime": "400" }, "segmentations": [] }, { "key": "Test Results", "duration": { "isActive": true, "minDurationTime": "30", "maxDurationTime": "500" }, "segmentations": [] }, { "key": "Patient Feedback", "duration": { "isActive": true, "minDurationTime": "30", "maxDurationTime": "500" }, "segmentations": [] }, { "key": "Settings", "duration": { "isActive": true, "minDurationTime": "15", "maxDurationTime": "250" }, "segmentations": [] }, { "key": "Doctor Profile", "duration": { "isActive": true, "minDurationTime": "20", "maxDurationTime": "400" }, "segmentations": [] }, { "key": "Billing", "duration": { "isActive": true, "minDurationTime": "15", "maxDurationTime": "300" }, "segmentations": [] }], "sequences": [{ "steps": [{ "key": "session", "value": "start", "probability": 100, "fixed": true }, { "key": "views", "value": "Home", "probability": "100" }, { "key": "events", "value": "Appointment Scheduled ", "probability": "100" }, { "key": "events", "value": "Medication Prescribed ", "probability": "100" }, { "key": "views", "value": "Appointments", "probability": "100" }, { "key": "views", "value": "Medical Records", "probability": "100" }, { "key": "events", "value": "Test Ordered", "probability": "100" }, { "key": "views", "value": "Test Results", "probability": "100" }, { "key": "events", "value": "Appointment Completed", "probability": "100" }, { "key": "views", "value": "Billing", "probability": "100" }, { "key": "session", "value": "end", "probability": 100, "fixed": true }] }, { "steps": [{ "key": "session", "value": "start", "probability": 100, "fixed": true }, { "key": "events", "value": "Emergency Visit", "probability": "100" }, { "key": "events", "value": "Test Ordered", "probability": "75" }, { "key": "events", "value": "Test Result Received", "probability": "75" }, { "key": "views", "value": "Test Results", "probability": "75" }, { "key": "events", "value": "Insurance Claim Filed", "probability": "50" }, { "key": "views", "value": "Prescriptions", "probability": "100" }, { "key": "views", "value": "Patient Feedback", "probability": "65" }, { "key": "views", "value": "Billing", "probability": "100" }, { "key": "session", "value": "end", "probability": 100, "fixed": true }] }, { "steps": [{ "key": "session", "value": "start", "probability": 100, "fixed": true }, { "key": "events", "value": "Appointment Scheduled ", "probability": "100" }, { "key": "views", "value": "Home", "probability": "75" }, { "key": "views", "value": "Appointments", "probability": "100" }, { "key": "views", "value": "Doctor Profile", "probability": "90" }, { "key": "views", "value": "Settings", "probability": "70" }, { "key": "events", "value": "Medication Prescribed ", "probability": "100" }, { "key": "events", "value": "Insurance Claim Filed", "probability": "90" }, { "key": "views", "value": "Prescriptions", "probability": "80" }, { "key": "views", "value": "Insurance", "probability": "90" }, { "key": "events", "value": "Appointment Completed", "probability": "100" }, { "key": "session", "value": "end", "probability": 100, "fixed": true }] }, { "steps": [{ "key": "session", "value": "start", "probability": 100, "fixed": true }, { "key": "views", "value": "Home", "probability": "100" }, { "key": "events", "value": "Mental Health Check In", "probability": "100" }, { "key": "session", "value": "end", "probability": 100, "fixed": true }] }, { "steps": [{ "key": "session", "value": "start", "probability": 100, "fixed": true }, { "key": "events", "value": "Onboarding - 1 - Patient Details", "probability": "100" }, { "key": "events", "value": "Onboarding - 2 - Patient Health Info", "probability": "90" }, { "key": "events", "value": "Onboarding - 3 - Identity Verification", "probability": "80" }, { "key": "views", "value": "Home", "probability": "100" }, { "key": "session", "value": "end", "probability": 100, "fixed": true }] }], "behavior": { "runningSession": ["8", "24"], "generalConditions": [], "sequences": [{ "key": "Sequence_1", "probability": "30" }, { "key": "Sequence_2", "probability": "30" }, { "key": "Sequence_3", "probability": "25" }, { "key": "Sequence_4", "probability": "10" }, { "key": "Sequence_5", "probability": "5" }, { "key": "random", "probability": 0 }], "sequenceConditions": [{ "selectedKey": "Age Group", "selectedValue": "18-29 years", "conditionType": 1, "values": [{ "key": "Sequence_1", "probability": "25" }, { "key": "Sequence_2", "probability": "25" }, { "key": "Sequence_3", "probability": "25" }, { "key": "Sequence_4", "probability": "20" }, { "key": "Sequence_5", "probability": "5" }, { "key": "random", "probability": 0 }] }, { "selectedKey": "Age Group", "selectedValue": "60+ years", "conditionType": 1, "values": [{ "key": "Sequence_1", "probability": "30" }, { "key": "Sequence_2", "probability": "30" }, { "key": "Sequence_3", "probability": "30" }, { "key": "Sequence_4", "probability": "5" }, { "key": "Sequence_5", "probability": "5" }, { "key": "random", "probability": 0 }] }] }, "uniqueUserCount": 100, "platformType": ["Mobile", "Web", "Desktop"] },
        { "_id": "defaultEcommerce", "name": "E-commerce", "isDefault": true, "lastEditedBy": "", "users": [{ "key": "Membership Level", "values": [{ "key": "Basic", "probability": "90" }, { "key": "Premium", "probability": "10" }] }, { "key": "Average Monthly Spend", "values": [{ "key": "Low", "probability": "70" }, { "key": "Medium", "probability": "25" }, { "key": "High", "probability": "5" }], "conditions": [{ "selectedKey": "Membership Level", "selectedValue": "Premium", "conditionType": 1, "values": [{ "key": "Low", "probability": "40" }, { "key": "Medium", "probability": "40" }, { "key": "High", "probability": "20" }] }] }, { "key": "Categories of Interest", "values": [{ "key": "[\"Electronics\"]", "probability": "40" }, { "key": "[\"Books\"]", "probability": "30" }, { "key": "[\"Fashion\"]", "probability": "10" }, { "key": "[\"Electronics\",\"Home\"]", "probability": "10" }, { "key": "[\"Electronics\",\"Fashion\",\"Books\",\"Home\"]", "probability": "10" }] }, { "key": "Acquisition Source", "values": [{ "key": "Social", "probability": "30" }, { "key": "Search", "probability": "20" }, { "key": "Direct", "probability": "20" }, { "key": "Email", "probability": "10" }, { "key": "Paid", "probability": "20" }] }, { "key": "Age Group", "values": [{ "key": "18-44", "probability": "70" }, { "key": "45-64", "probability": "25" }, { "key": "65 and Over", "probability": "5" }] }], "events": [{ "key": "Product Viewed", "duration": { "isActive": true, "minDurationTime": "5", "maxDurationTime": "1200" }, "sum": { "isActive": true, "minSumValue": "10", "maxSumValue": "1000" }, "segmentations": [{ "key": "Category", "values": [{ "key": "Electronics", "probability": "40" }, { "key": "Fashion", "probability": "30" }, { "key": "Books", "probability": "20" }, { "key": "Home", "probability": "10" }] }, { "key": "Brand", "values": [{ "key": "", "probability": "0" }], "conditions": [{ "selectedKey": "Category", "selectedValue": "Electronics", "conditionType": 1, "values": [{ "key": "Apple", "probability": "40" }, { "key": "Samsung", "probability": "30" }, { "key": "Dell", "probability": "10" }, { "key": "Philips", "probability": "10" }, { "key": "LG", "probability": "10" }] }] }] }, { "key": "Product Added to Cart", "duration": { "isActive": false, "minDurationTime": 0, "maxDurationTime": 0 }, "sum": { "isActive": true, "minSumValue": "10", "maxSumValue": "1000" }, "segmentations": [{ "key": "Category", "values": [{ "key": "Electronics", "probability": "40" }, { "key": "Fashion", "probability": "30" }, { "key": "Books", "probability": "20" }, { "key": "Home", "probability": "10" }] }, { "key": "Brand", "values": [{ "key": "", "probability": "0" }], "conditions": [{ "selectedKey": "Category", "selectedValue": "Electronics", "conditionType": 1, "values": [{ "key": "Apple", "probability": "40" }, { "key": "Samsung", "probability": "30" }, { "key": "Dell", "probability": "10" }, { "key": "Philips", "probability": "10" }, { "key": "LG", "probability": "10" }] }] }] }, { "key": "Product Added to Wishlist", "duration": { "isActive": false, "minDurationTime": 0, "maxDurationTime": 0 }, "sum": { "isActive": true, "minSumValue": "10", "maxSumValue": "1000" }, "segmentations": [{ "key": "Category", "values": [{ "key": "Electronics", "probability": "40" }, { "key": "Fashion", "probability": "30" }, { "key": "Books", "probability": "20" }, { "key": "Home", "probability": "10" }] }, { "key": "Brand", "values": [{ "key": "", "probability": "0" }], "conditions": [{ "selectedKey": "Category", "selectedValue": "Electronics", "conditionType": 1, "values": [{ "key": "Apple", "probability": "40" }, { "key": "Samsung", "probability": "30" }, { "key": "Dell", "probability": "10" }, { "key": "Philips", "probability": "10" }, { "key": "LG", "probability": "10" }] }] }] }, { "key": "Product Removed from Cart", "duration": { "isActive": false, "minDurationTime": 0, "maxDurationTime": 0 }, "sum": { "isActive": true, "minSumValue": "10", "maxSumValue": "1000" }, "segmentations": [{ "key": "Category", "values": [{ "key": "Electronics", "probability": "40" }, { "key": "Fashion", "probability": "30" }, { "key": "Books", "probability": "20" }, { "key": "Home", "probability": "10" }] }, { "key": "Brand", "values": [{ "key": "", "probability": "0" }], "conditions": [{ "selectedKey": "Category", "selectedValue": "Electronics", "conditionType": 1, "values": [{ "key": "Apple", "probability": "40" }, { "key": "Samsung", "probability": "30" }, { "key": "Dell", "probability": "10" }, { "key": "Philips", "probability": "10" }, { "key": "LG", "probability": "10" }] }] }] }, { "key": "Cart Viewed", "duration": { "isActive": false, "minDurationTime": 0, "maxDurationTime": 0 }, "sum": { "isActive": true, "minSumValue": "10", "maxSumValue": "5000" }, "segmentations": [] }, { "key": "Checkout Started", "duration": { "isActive": false, "minDurationTime": 0, "maxDurationTime": 0 }, "sum": { "isActive": true, "minSumValue": "10", "maxSumValue": "5000" }, "segmentations": [] }, { "key": "Checkout Completed", "duration": { "isActive": true, "minDurationTime": "60", "maxDurationTime": "300" }, "sum": { "isActive": true, "minSumValue": "10", "maxSumValue": "5000" }, "segmentations": [{ "key": "Loyalty Points Earned", "values": [{ "key": "", "probability": "30" }, { "key": "10", "probability": "30" }, { "key": "20", "probability": "20" }, { "key": "50", "probability": "10" }, { "key": "100", "probability": "8" }, { "key": "500", "probability": "2" }] }, { "key": "Includes Referral", "values": [{ "key": "Yes", "probability": "20" }, { "key": "No", "probability": "80" }] }, { "key": "Product Count", "values": [{ "key": "1", "probability": "50" }, { "key": "2", "probability": "20" }, { "key": "3", "probability": "15" }, { "key": "4", "probability": "10" }, { "key": "5+", "probability": "5" }] }, { "key": "Categories Purchased From", "values": [{ "key": "", "probability": 0 }], "conditions": [{ "selectedKey": "Products Purchased", "selectedValue": "1", "conditionType": 1, "values": [{ "key": "[\"Electronics\"]", "probability": "40" }, { "key": "[\"Books\"]", "probability": "30" }, { "key": "[\"Home\"]", "probability": "20" }, { "key": "[\"Fashion\"]", "probability": "10" }] }, { "selectedKey": "Products Purchased", "selectedValue": "1", "conditionType": -1, "values": [{ "key": "[\"Electronics\",\"Home\"]", "probability": "15" }, { "key": "[\"Electronics\",\"Books\"]", "probability": "15" }, { "key": "[\"Home\"]", "probability": "20" }, { "key": "[\"Electronics\"]", "probability": "15" }, { "key": "[\"Fashion\"]", "probability": "15" }, { "key": "[\"Books\"]", "probability": "20" }] }] }, { "key": "Shipping Cost", "values": [{ "key": "0", "probability": "80" }, { "key": "10", "probability": "10" }, { "key": "50", "probability": "10" }] }] }, { "key": "Checkout Abandoned", "duration": { "isActive": true, "minDurationTime": "10", "maxDurationTime": "120" }, "sum": { "isActive": true, "minSumValue": "10", "maxSumValue": "5000" }, "segmentations": [{ "key": "Shipping Cost", "values": [{ "key": "0", "probability": "40" }, { "key": "10", "probability": "40" }, { "key": "50", "probability": "20" }] }] }, { "key": "Product Reviewed", "duration": { "isActive": true, "minDurationTime": "30", "maxDurationTime": "300" }, "sum": { "isActive": false, "minSumValue": 0, "maxSumValue": 0 }, "segmentations": [{ "key": "Review Score", "values": [{ "key": "1", "probability": "10" }, { "key": "2", "probability": "10" }, { "key": "3", "probability": "40" }, { "key": "4", "probability": "30" }, { "key": "5", "probability": "10" }] }, { "key": "Comment Length", "values": [{ "key": "0", "probability": "40" }, { "key": "1-100", "probability": "40" }, { "key": "101-500", "probability": "10" }, { "key": "501+", "probability": "10" }] }, { "key": "Category", "values": [{ "key": "Electronics", "probability": "40" }, { "key": "Fashion", "probability": "30" }, { "key": "Books", "probability": "20" }, { "key": "Home", "probability": "10" }] }, { "key": "Brand", "values": [{ "key": "", "probability": "0" }], "conditions": [{ "selectedKey": "Category", "selectedValue": "Electronics", "conditionType": 1, "values": [{ "key": "Apple", "probability": "40" }, { "key": "Samsung", "probability": "30" }, { "key": "Dell", "probability": "10" }, { "key": "Philips", "probability": "10" }, { "key": "LG", "probability": "10" }] }] }] }, { "key": "Product Purchased", "duration": { "isActive": false, "minDurationTime": 0, "maxDurationTime": 0 }, "sum": { "isActive": true, "minSumValue": "10", "maxSumValue": "1000" }, "segmentations": [{ "key": "Category", "values": [{ "key": "Electronics", "probability": "40" }, { "key": "Fashion", "probability": "30" }, { "key": "Books", "probability": "20" }, { "key": "Home", "probability": "10" }] }, { "key": "Brand", "values": [{ "key": "", "probability": "0" }], "conditions": [{ "selectedKey": "Category", "selectedValue": "Electronics", "conditionType": 1, "values": [{ "key": "Apple", "probability": "40" }, { "key": "Samsung", "probability": "30" }, { "key": "Dell", "probability": "10" }, { "key": "Philips", "probability": "10" }, { "key": "LG", "probability": "10" }] }] }] }], "views": [{ "key": "Home", "duration": { "isActive": true, "minDurationTime": "10", "maxDurationTime": "120" }, "segmentations": [] }, { "key": "Categories", "duration": { "isActive": true, "minDurationTime": "10", "maxDurationTime": "120" }, "segmentations": [] }, { "key": "Product Details", "duration": { "isActive": true, "minDurationTime": "10", "maxDurationTime": "600" }, "segmentations": [] }, { "key": "Cart", "duration": { "isActive": true, "minDurationTime": "10", "maxDurationTime": "300" }, "segmentations": [] }, { "key": "Account Settings", "duration": { "isActive": true, "minDurationTime": "10", "maxDurationTime": "60" }, "segmentations": [] }], "sequences": [{ "steps": [{ "key": "session", "value": "start", "probability": 100, "fixed": true }, { "key": "views", "value": "Home", "probability": "100" }, { "key": "views", "value": "Product Details", "probability": "90" }, { "key": "events", "value": "Product Viewed", "probability": "100" }, { "key": "events", "value": "Product Added to Cart", "probability": "50" }, { "key": "views", "value": "Cart", "probability": "70" }, { "key": "events", "value": "Cart Viewed", "probability": "100" }, { "key": "events", "value": "Checkout Started", "probability": "30" }, { "key": "events", "value": "Checkout Completed", "probability": "90" }, { "key": "events", "value": "Product Purchased", "probability": "100" }, { "key": "events", "value": "Product Purchased", "probability": "80" }, { "key": "events", "value": "Product Purchased", "probability": "50" }, { "key": "events", "value": "Product Purchased", "probability": "50" }, { "key": "session", "value": "end", "probability": 100, "fixed": true }] }, { "steps": [{ "key": "session", "value": "start", "probability": 100, "fixed": true }, { "key": "views", "value": "Home", "probability": "100" }, { "key": "views", "value": "Product Details", "probability": "90" }, { "key": "events", "value": "Product Viewed", "probability": "100" }, { "key": "events", "value": "Product Added to Cart", "probability": "50" }, { "key": "views", "value": "Cart", "probability": "70" }, { "key": "events", "value": "Cart Viewed", "probability": "100" }, { "key": "events", "value": "Checkout Started", "probability": "30" }, { "key": "events", "value": "Checkout Abandoned", "probability": "90" }, { "key": "session", "value": "end", "probability": 100, "fixed": true }] }], "behavior": { "runningSession": ["4", "48"], "generalConditions": [], "sequences": [{ "key": "Sequence_1", "probability": "45" }, { "key": "Sequence_2", "probability": "45" }, { "key": "random", "probability": "10" }], "sequenceConditions": [{ "selectedKey": "Average Monthly Spend", "selectedValue": "High", "conditionType": 1, "values": [{ "key": "Sequence_1", "probability": "75" }, { "key": "Sequence_2", "probability": "15" }, { "key": "random", "probability": "10" }] }, { "selectedKey": "Average Monthly Spend", "selectedValue": "Medium", "conditionType": 1, "values": [{ "key": "Sequence_1", "probability": "55" }, { "key": "Sequence_2", "probability": "35" }, { "key": "random", "probability": "10" }] }, { "selectedKey": "Average Monthly Spend", "selectedValue": "Low", "conditionType": 1, "values": [{ "key": "Sequence_1", "probability": "35" }, { "key": "Sequence_2", "probability": "55" }, { "key": "random", "probability": "10" }] }, { "selectedKey": "Age Group", "selectedValue": "18-44", "conditionType": 1, "values": [{ "key": "Sequence_1", "probability": "55" }, { "key": "Sequence_2", "probability": "35" }, { "key": "random", "probability": "10" }] }, { "selectedKey": "Age Group", "selectedValue": "45-64", "conditionType": 1, "values": [{ "key": "Sequence_1", "probability": "35" }, { "key": "Sequence_2", "probability": "55" }, { "key": "random", "probability": "10" }] }, { "selectedKey": "Age Group", "selectedValue": "65 and Over", "conditionType": 1, "values": [{ "key": "Sequence_1", "probability": "15" }, { "key": "Sequence_2", "probability": "75" }, { "key": "random", "probability": "10" }] }, { "selectedKey": "Acquisition Source", "selectedValue": "Social", "conditionType": 1, "values": [{ "key": "Sequence_1", "probability": "65" }, { "key": "Sequence_2", "probability": "25" }, { "key": "random", "probability": "10" }] }, { "selectedKey": "Acquisition Source", "selectedValue": "Paid", "conditionType": 1, "values": [{ "key": "Sequence_1", "probability": "25" }, { "key": "Sequence_2", "probability": "65" }, { "key": "random", "probability": "10" }] }] }, "uniqueUserCount": 100, "platformType": ["Mobile", "Web", "Desktop"] },
        { "_id": "defaultSocial", "name": "Social", "isDefault": true, "lastEditedBy": "", "users": [{ "key": "Preferred Language", "values": [{ "key": "English", "probability": "60" }, { "key": "German", "probability": "18" }, { "key": "Spanish", "probability": "12" }, { "key": "French", "probability": "10" }] }, { "key": "Number Of Connections", "values": [{ "key": "1-4", "probability": "5" }, { "key": "5-19", "probability": "10" }, { "key": "20-49", "probability": "10" }, { "key": "50-99", "probability": "5" }, { "key": "100-199", "probability": "35" }, { "key": "200-499", "probability": "25" }, { "key": "500+", "probability": "5" }, { "key": "0", "probability": "5" }] }, { "key": "Number Of Groups", "values": [{ "key": "0", "probability": "5" }, { "key": "1-9", "probability": "20" }, { "key": "10-19", "probability": "45" }, { "key": "20-50", "probability": "20" }, { "key": "50+", "probability": "10" }] }, { "key": "Acquisition Source", "values": [{ "key": "Referral", "probability": "30" }, { "key": "Search", "probability": "20" }, { "key": "Direct", "probability": "30" }, { "key": "Paid", "probability": "20" }] }, { "key": "Interests", "values": [{ "key": "[\"Technology\",\"Music\",\"Travel\"]", "probability": "30" }, { "key": "[\"Sports\",\"Gaming\"]", "probability": "20" }, { "key": "[\"Fashion\",\"Food\",\"Art\"]", "probability": "20" }, { "key": "[\"Music\",\"Art\"]", "probability": "10" }, { "key": "[\"Technology\",\"Sports\",\"Food\",\"Gaming\"]", "probability": "10" }, { "key": "[\"Travel\",\"Fashion\"]", "probability": "10" }] }, { "key": "Age Group", "values": [{ "key": "18-24 years", "probability": "50" }, { "key": "25-34 years", "probability": "30" }, { "key": "35-54 years", "probability": "15" }, { "key": "55+ years", "probability": "5" }] }], "events": [{ "key": "Post Created", "duration": { "isActive": true, "minDurationTime": 0, "maxDurationTime": "240" }, "sum": { "isActive": false, "minSumValue": 0, "maxSumValue": 0 }, "segmentations": [{ "key": "Contains", "values": [{ "key": "[\"Text\"]", "probability": "35" }, { "key": "[\"Image\"]", "probability": "10" }, { "key": "[\"GIF\"]", "probability": "10" }, { "key": "[\"Link\"]", "probability": "5" }, { "key": "[\"Text\",\"Image\"]", "probability": "10" }, { "key": "[\"Text\",\"Link\"]", "probability": "20" }, { "key": "[\"Text\",\"Link\",\"Image\"]", "probability": "10" }] }, { "key": "Number of Emojis", "values": [{ "key": "0", "probability": "30" }, { "key": "1-4", "probability": "50" }, { "key": "5+", "probability": "20" }] }, { "key": "Number of Pictures", "values": [{ "key": "0", "probability": "40" }, { "key": "1", "probability": "35" }, { "key": "2", "probability": "20" }, { "key": "3+", "probability": "5" }] }, { "key": "Post Visibility", "values": [{ "key": "Public", "probability": "45" }, { "key": "Friends", "probability": "45" }, { "key": "Specific Friends", "probability": "10" }] }] }, { "key": "Commented", "duration": { "isActive": false, "minDurationTime": 0, "maxDurationTime": 0 }, "sum": { "isActive": false, "minSumValue": 0, "maxSumValue": 0 }, "segmentations": [{ "key": "Comment Length", "values": [{ "key": "1-50 characters", "probability": "30" }, { "key": "51-200 characters", "probability": "40" }, { "key": "201-500 characters", "probability": "20" }, { "key": "501+ characters", "probability": "10" }] }, { "key": "Commented On", "values": [{ "key": "Post", "probability": "60" }, { "key": "Comment", "probability": "30" }, { "key": "Story", "probability": "10" }] }] }, { "key": "Reaction Added", "duration": { "isActive": false, "minDurationTime": "1", "maxDurationTime": "180" }, "sum": { "isActive": false, "minSumValue": 0, "maxSumValue": 0 }, "segmentations": [{ "key": "Reaction", "values": [{ "key": "Like", "probability": "30" }, { "key": "Love", "probability": "20" }, { "key": "Haha", "probability": "15" }, { "key": "Wow", "probability": "10" }, { "key": "Sad", "probability": "15" }, { "key": "Angry", "probability": "10" }], "conditions": [{ "selectedKey": "Content Type", "selectedValue": "Story", "conditionType": 1, "values": [{ "key": "Like", "probability": "10" }, { "key": "Love", "probability": "40" }, { "key": "Haha", "probability": "10" }, { "key": "Wow", "probability": "20" }, { "key": "Sad", "probability": "5" }, { "key": "Angry", "probability": "15" }] }] }, { "key": "Reacted To", "values": [{ "key": "Post", "probability": "40" }, { "key": "Comment", "probability": "30" }, { "key": "Story", "probability": "30" }] }] }, { "key": "Friend Request Sent", "duration": { "isActive": false, "minDurationTime": 0, "maxDurationTime": 0 }, "sum": { "isActive": false, "minSumValue": 0, "maxSumValue": 0 }, "segmentations": [{ "key": "Source of Discovery", "values": [{ "key": "Recommendation", "probability": "40" }, { "key": "Search", "probability": "30" }, { "key": "Friends List of Friend", "probability": "20" }, { "key": "Direct", "probability": "10" }] }] }, { "key": "Friend Request Responded", "duration": { "isActive": true, "minDurationTime": "3000", "maxDurationTime": "60000" }, "sum": { "isActive": false, "minSumValue": 0, "maxSumValue": 0 }, "segmentations": [{ "key": "Response", "values": [{ "key": "Accepted", "probability": "70" }, { "key": "Rejected", "probability": "30" }] }, { "key": "Reason of Rejection", "values": [{ "key": "", "probability": 0 }], "conditions": [{ "selectedKey": "Response", "selectedValue": "Rejected", "conditionType": 1, "values": [{ "key": "I don&#39;t know this person", "probability": "60" }, { "key": "This looks like a fake account", "probability": "20" }, { "key": "Other", "probability": "20" }] }] }, { "key": "Source of Discovery", "values": [{ "key": "", "probability": 0 }], "conditions": [{ "selectedKey": "Response", "selectedValue": "Accepted", "conditionType": 1, "values": [{ "key": "Recommendation", "probability": "40" }, { "key": "Search", "probability": "20" }, { "key": "Friends List of Friend", "probability": "30" }, { "key": "Direct", "probability": "10" }] }, { "selectedKey": "Response", "selectedValue": "Rejected", "conditionType": 1, "values": [{ "key": "Recommendation", "probability": "10" }, { "key": "Search", "probability": "30" }, { "key": "Friends List of Friend", "probability": "20" }, { "key": "Direct", "probability": "40" }] }] }] }, { "key": "Message Sent", "duration": { "isActive": true, "minDurationTime": "30", "maxDurationTime": "300" }, "sum": { "isActive": false, "minSumValue": 0, "maxSumValue": 0 }, "segmentations": [{ "key": "Message Length", "values": [{ "key": "1-50 characters", "probability": "45" }, { "key": "51-200 characters", "probability": "35" }, { "key": "201-500 characters", "probability": "15" }, { "key": "501+ characters", "probability": "5" }] }, { "key": "Contains", "values": [{ "key": "[\"Text\"]", "probability": "55" }, { "key": "[\"Text\",\"Image\"]", "probability": "10" }, { "key": "[\"GIF\"]", "probability": "10" }, { "key": "[\"Link\"]", "probability": "10" }, { "key": "[\"Text\",\"Link\"]", "probability": "10" }, { "key": "[\"Image\"]", "probability": "5" }] }] }, { "key": "Group Joined", "duration": { "isActive": false, "minDurationTime": 0, "maxDurationTime": 0 }, "sum": { "isActive": false, "minSumValue": 0, "maxSumValue": 0 }, "segmentations": [{ "key": "Joined Via", "values": [{ "key": "Invitation", "probability": "20" }, { "key": "Search", "probability": "30" }, { "key": "Recommendation", "probability": "40" }, { "key": "Browse", "probability": "10" }] }] }, { "key": "Group Left", "duration": { "isActive": false, "minDurationTime": 0, "maxDurationTime": 0 }, "sum": { "isActive": false, "minSumValue": 0, "maxSumValue": 0 }, "segmentations": [{ "key": "From", "values": [{ "key": "Group Details", "probability": "70" }, { "key": "Groups List", "probability": "30" }] }, { "key": "Reason", "values": [{ "key": "Loss of Interest", "probability": "40" }, { "key": "Negative Atmosphere", "probability": "10" }, { "key": "Spam", "probability": "30" }, { "key": "Content Disagreement", "probability": "15" }, { "key": "Other", "probability": "5" }] }, { "key": "Joined Via", "values": [{ "key": "Invitation", "probability": "20" }, { "key": "Search", "probability": "30" }, { "key": "Recommendation", "probability": "40" }, { "key": "Browse", "probability": "10" }], "conditions": [{ "selectedKey": "Reason", "selectedValue": "Loss of Interest", "conditionType": 1, "values": [{ "key": "Invitation", "probability": "30" }, { "key": "Search", "probability": "30" }, { "key": "Recommendation", "probability": "20" }, { "key": "Browse", "probability": "20" }] }] }] }, { "key": "Profile Updated", "duration": { "isActive": true, "minDurationTime": "60", "maxDurationTime": "300" }, "sum": { "isActive": false, "minSumValue": 0, "maxSumValue": 0 }, "segmentations": [{ "key": "Information Type", "values": [{ "key": "Profile Picture", "probability": "45" }, { "key": "Name", "probability": "10" }, { "key": "Bio", "probability": "30" }, { "key": "Birthday", "probability": "5" }, { "key": "Relationship Status", "probability": "10" }] }] }, { "key": "Story Created", "duration": { "isActive": true, "minDurationTime": "30", "maxDurationTime": "300" }, "sum": { "isActive": false, "minSumValue": 0, "maxSumValue": 0 }, "segmentations": [{ "key": "Duration", "values": [{ "key": "Less than 10 seconds", "probability": "15" }, { "key": "10-30 seconds", "probability": "30" }, { "key": "30-60 seconds", "probability": "40" }, { "key": "Over 60 seconds", "probability": "15" }] }, { "key": "Number of Emojis", "values": [{ "key": "0", "probability": "30" }, { "key": "1-4", "probability": "60" }, { "key": "5+", "probability": "10" }] }, { "key": "Interactive Elements", "values": [{ "key": "None", "probability": "20" }, { "key": "Poll", "probability": "30" }, { "key": "Question Sticker", "probability": "20" }, { "key": "Hashtag Sticker", "probability": "15" }, { "key": "Location Sticker", "probability": "15" }] }, { "key": "Number of Mentions", "values": [{ "key": "0", "probability": "60" }, { "key": "1", "probability": "20" }, { "key": "2", "probability": "15" }, { "key": "3+", "probability": "5" }] }] }, { "key": "Onboarding - 1 - Account Details", "duration": { "isActive": true, "minDurationTime": "60", "maxDurationTime": "240" }, "sum": { "isActive": false, "minSumValue": 0, "maxSumValue": 0 }, "segmentations": [{ "key": "Age Group", "values": [{ "key": "18-24 years ", "probability": "50" }, { "key": "25-34 years", "probability": "30" }, { "key": "35-54 years", "probability": "15" }, { "key": "55+ years", "probability": "5" }] }] }, { "key": "Onboarding - 2 - Verification", "duration": { "isActive": true, "minDurationTime": "180", "maxDurationTime": "600" }, "sum": { "isActive": false, "minSumValue": 0, "maxSumValue": 0 }, "segmentations": [{ "key": "Verification Method", "values": [{ "key": "Email", "probability": "70" }, { "key": "SMS", "probability": "30" }] }] }, { "key": "Onboarding - 3 - Interests", "duration": { "isActive": true, "minDurationTime": "120", "maxDurationTime": "300" }, "sum": { "isActive": false, "minSumValue": 0, "maxSumValue": 0 }, "segmentations": [{ "key": "Interests", "values": [{ "key": "[\"Technology\",\"Music\",\"Travel\"]", "probability": "30" }, { "key": "[\"Sports\",\"Gaming\"]", "probability": "20" }, { "key": "[\"Fashion\",\"Food\",\"Art\"]", "probability": "20" }, { "key": "[\"Music\",\"Art\"]", "probability": "10" }, { "key": "[\"Technology\",\"Sports\",\"Food\"]", "probability": "10" }, { "key": "[\"Travel\",\"Fashion\"]", "probability": "10" }] }] }], "views": [{ "key": "Home", "duration": { "isActive": true, "minDurationTime": 0, "maxDurationTime": "120" }, "segmentations": [] }, { "key": "Profile", "duration": { "isActive": true, "minDurationTime": 0, "maxDurationTime": "70" }, "segmentations": [] }, { "key": "Post Feed", "duration": { "isActive": true, "minDurationTime": "120", "maxDurationTime": "600" }, "segmentations": [] }, { "key": "Settings", "duration": { "isActive": true, "minDurationTime": 0, "maxDurationTime": "180" }, "segmentations": [] }, { "key": "Inbox", "duration": { "isActive": true, "minDurationTime": 0, "maxDurationTime": "70" }, "segmentations": [] }, { "key": "Group Details", "duration": { "isActive": true, "minDurationTime": 0, "maxDurationTime": "75" }, "segmentations": [] }, { "key": "Story Feed", "duration": { "isActive": true, "minDurationTime": "120", "maxDurationTime": "1200" }, "segmentations": [] }, { "key": "Groups", "duration": { "isActive": true, "minDurationTime": "60", "maxDurationTime": "600" }, "segmentations": [] }], "sequences": [{ "steps": [{ "key": "session", "value": "start", "probability": 100, "fixed": true }, { "key": "views", "value": "Home", "probability": "100" }, { "key": "views", "value": "Post Feed", "probability": "100" }, { "key": "events", "value": "Commented", "probability": "90" }, { "key": "events", "value": "Reaction Added", "probability": "90" }, { "key": "events", "value": "Reaction Added", "probability": "90" }, { "key": "events", "value": "Post Created", "probability": "50" }, { "key": "session", "value": "end", "probability": 100, "fixed": true }] }, { "steps": [{ "key": "session", "value": "start", "probability": 100, "fixed": true }, { "key": "views", "value": "Home", "probability": "100" }, { "key": "views", "value": "Story Feed", "probability": "100" }, { "key": "events", "value": "Reaction Added", "probability": "100" }, { "key": "events", "value": "Reaction Added", "probability": "90" }, { "key": "events", "value": "Reaction Added", "probability": "90" }, { "key": "events", "value": "Story Created", "probability": "90" }, { "key": "events", "value": "Commented", "probability": "50" }, { "key": "session", "value": "end", "probability": 100, "fixed": true }] }, { "steps": [{ "key": "session", "value": "start", "probability": 100, "fixed": true }, { "key": "events", "value": "Onboarding - 1 - Account Details", "probability": "100" }, { "key": "events", "value": "Onboarding - 2 - Verification", "probability": "80" }, { "key": "events", "value": "Onboarding - 3 - Interests", "probability": "60" }, { "key": "events", "value": "Profile Updated", "probability": "90" }, { "key": "events", "value": "Friend Request Sent", "probability": "80" }, { "key": "events", "value": "Group Joined", "probability": "70" }, { "key": "session", "value": "end", "probability": 100, "fixed": true }] }, { "steps": [{ "key": "session", "value": "start", "probability": 100, "fixed": true }, { "key": "events", "value": "Friend Request Sent", "probability": "100" }, { "key": "events", "value": "Friend Request Responded", "probability": "100" }, { "key": "session", "value": "end", "probability": 100, "fixed": true }] }], "behavior": { "runningSession": ["1", "7"], "generalConditions": [], "sequences": [{ "key": "Sequence_1", "probability": "30" }, { "key": "Sequence_2", "probability": "40" }, { "key": "Sequence_3", "probability": "10" }, { "key": "Sequence_4", "probability": "10" }, { "key": "random", "probability": "10" }], "sequenceConditions": [{ "selectedKey": "Age Group", "selectedValue": "18-24 years", "conditionType": 1, "values": [{ "key": "Sequence_1", "probability": "10" }, { "key": "Sequence_2", "probability": "60" }, { "key": "Sequence_3", "probability": "10" }, { "key": "Sequence_4", "probability": "10" }, { "key": "random", "probability": "10" }] }] }, "uniqueUserCount": 100, "platformType": ["Mobile", "Web", "Desktop"] }
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
            let selectedValue = randomSelectByProbability(tryToParseJSON(item.values));
            if (selectedValue !== "") {
                up[item.key] = selectedValue;
            }
        });

        let modifiedUpOnConditions = {};
        templateUp.forEach(function(item) {
            if (item.conditions && item.conditions.length) {
                item.conditions.forEach(function(condition) {
                    if (condition.conditionType === 1 && up[condition.selectedKey] === condition.selectedValue) {
                        modifiedUpOnConditions[item.key] = randomSelectByProbability(tryToParseJSON(condition.values));
                    }
                    else if (condition.conditionType === -1 && up[condition.selectedKey] !== condition.selectedValue) {
                        modifiedUpOnConditions[item.key] = randomSelectByProbability(tryToParseJSON(condition.values));
                    }
                });
            }
        });
        const mergedUp = Object.assign({}, up, modifiedUpOnConditions);
        Object.keys(mergedUp).forEach(function(key) {
            if (mergedUp[key] === "") { // remove empty values
                delete mergedUp[key];
            }
        });
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
            if (eventTemplate && eventTemplate.segmentations && eventTemplate.segmentations.length) {
                event.segmentation = {};
                var eventSegmentations = {};
                var modifiedSegmentationsOnCondition = {};
                eventTemplate.segmentations.forEach(function(item) {
                    var values = item.values;
                    var key = item.key;
                    let selectedSegmentation = randomSelectByProbability(tryToParseJSON(values));
                    if (selectedSegmentation !== "") {
                        eventSegmentations[key] = selectedSegmentation;
                        if (id === "[CLY]_view") {
                            eventSegmentations.name = eventTemplate.key;
                            eventSegmentations.visit = 1;
                            eventSegmentations.start = 1;
                            eventSegmentations.bounce = 1;
                        }
                    }
                });
                eventTemplate.segmentations.forEach(function(item) {
                    if (item.conditions && item.conditions.length) {
                        item.conditions.forEach(function(condition) {
                            if (condition.selectedKey && condition.selectedValue && condition.conditionType === 1 && eventSegmentations[condition.selectedKey] === condition.selectedValue) {
                                let values = condition.values;
                                let key = item.key;
                                modifiedSegmentationsOnCondition[key] = randomSelectByProbability(tryToParseJSON(values));
                            }
                            else if (condition.selectedKey && condition.selectedValue && condition.conditionType === -1 && eventSegmentations[condition.selectedKey] !== condition.selectedValue) {
                                let values = condition.values;
                                let key = item.key;
                                modifiedSegmentationsOnCondition[key] = randomSelectByProbability(tryToParseJSON(values));
                            }
                        });
                    }
                });
                event.segmentation = Object.assign({}, eventSegmentations, modifiedSegmentationsOnCondition);
                if (event.segmentation && Object.keys(event.segmentation).length) {
                    Object.keys(event.segmentation).forEach(function(key) {
                        if (event.segmentation[key] === "") { // remove empty values
                            delete event.segmentation[key];
                        }
                    });
                }
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
                var randomEvent = templateEvents[getRandomInt(0, templateEvents.length - 1)];
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
                        this.getEvents(4, template && template.events).map((arr) => arr.length && arr[0])
                    );
                if (template && template.events && template.events.length) {
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
                        this.getEvents(4, template && template.events).map((arr) => arr.length && arr[0])
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
                if (template && template.behavior && template.behavior.sequences && template.behavior.sequences.length) {
                    completedRequestCount++;
                    const averageRunningSessionTime = (parseInt(template.behavior.runningSession[0], 10) + parseInt(template.behavior.runningSession[1], 10)) / 2;
                    const randomSelectedTs = getRandomInt(startTs, parseInt(endTs, 10) - parseInt(runCount) * (parseInt(averageRunningSessionTime, 10) + 1) * 3600);
                    this.ts = randomSelectedTs;
                    var endSessionTs = null;
                    var req = {};
                    let selectedSequence = null;
                    let sessionDuration = null;

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
                            req = {timestamp: endSessionTs, end_session: 1, ignore_cooldown: '1', session_duration: getRandomInt(60, 240)};
                            this.request(req);
                            resolve(bulk);
                        }
                        else {
                            const differenceBetweenPreviousSession = this.ts - (endSessionTs || 0);
                            if (differenceBetweenPreviousSession.toString().length >= 10) {
                                sessionDuration = getRandomInt(60, 240);
                            }
                            else {
                                sessionDuration = getRandomInt(60, differenceBetweenPreviousSession);
                            }
                            req = {timestamp: this.ts, session_duration: sessionDuration};
                            this.request(req);
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
        if (!CountlyHelpers.isPluginEnabled("attribution") || typeof countlyAttribution === "undefined") {
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

        if (template.sequences && template.sequences.length) {
            let disabledCounts = {
                "events": 0,
                "views": 0
            };
            template.sequences.forEach(function(sequence) {
                sequence.steps.forEach(function(step) {
                    if (step.disabled) {
                        if (step.key === "events") {
                            disabledCounts.events++;
                        }
                        else if (step.key === "views") {
                            disabledCounts.views++;
                        }
                    }
                });
            });
            if (disabledCounts.events) {
                template.events = [];
            }
            if (disabledCounts.views) {
                template.views = [];
            }
        }
        if (template.behavior && template.behavior.sequences && template.behavior.sequences.length) {
            let disabledCount = 0;
            template.behavior.sequences.forEach(function(sequence) {
                if (sequence.disabled) {
                    disabledCount++;
                }
            });
            if (disabledCount) {
                template.behavior.sequences = template.behavior.sequences.filter(function(sequence) {
                    return !sequence.disabled;
                });
                if (template.behavior.sequenceConditions && template.behavior.sequenceConditions.length) {
                    template.behavior.sequenceConditions.forEach(function(sequenceCondition) {
                        sequenceCondition.values = sequenceCondition.values.filter(function(value) {
                            return !value.disabled;
                        });
                    });
                }
            }
        }
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
            let data = {
                app_id: countlyCommon.ACTIVE_APP_ID,
                date_range: moment(startTs * 1000).format("DD.MM.YYYY, HH:mm:ss") + " - " + moment(endTs * 1000).format("DD.MM.YYYY, HH:mm:ss"),
                selected_template: template.name,
                number_of_runs: runCount,
                save_environment: template.saveEnvironment,
            };
            if (template.saveEnvironment) {
                data.environment_name = template.environmentName;
            }
            if (environment && environment.length) {
                data = {
                    populate_with_environment: true,
                    selected_environment: environment[0].name,
                    date_range: moment(startTs * 1000).format("DD.MM.YYYY, HH:mm:ss") + " - " + moment(endTs * 1000).format("DD.MM.YYYY, HH:mm:ss"),
                    number_of_runs: runCount
                };
            }
            $.ajax({
                type: "POST",
                url: countlyCommon.API_URL + "/i/systemlogs",
                data: {
                    data: JSON.stringify(data),
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

        if (CountlyHelpers.isPluginEnabled("cohorts") && typeof countlyCohorts !== "undefined" && countlyAuth.validateCreate('cohorts')) {
            if (template.events && template.events.length) {
                var firstEventKey = template.events[getRandomInt(0, template.events.length - 1)].key;

                if (template.users && template.users.length) {
                    var randomUserPropertyIndex = getRandomInt(0, template.users.length - 1);
                    var firstUserProperty = template.users[randomUserPropertyIndex].key;
                    var firstUserPropertyValue = JSON.stringify(template.users[randomUserPropertyIndex].values[getRandomInt(0, template.users[randomUserPropertyIndex].values.length - 1)].key);

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


                if (template.events.filter(x=>x.key === firstEventKey) && template.events.filter(x=>x.key === firstEventKey).length && template.events.filter(x=>x.key === firstEventKey)[0].segmentations && template.events.filter(x=>x.key === firstEventKey)[0].segmentations.length) {
                    var randomSegmentIndex = getRandomInt(0, template.events.filter(x=>x.key === firstEventKey)[0].segmentations.length - 1);
                    var firstEventSegment = template.events.filter(x=>x.key === firstEventKey)[0].segmentations[randomSegmentIndex].key;
                    var firstEventSegmentValue = JSON.stringify(template.events.filter(x=>x.key === firstEventKey)[0].segmentations[randomSegmentIndex].values[getRandomInt(0, template.events.filter(x=>x.key === firstEventKey)[0].segmentations[randomSegmentIndex].values.length - 1)].key);

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

                if (template.events.length) {
                    var secondEventKey = template.events[getRandomInt(0, template.events.length - 1)].key;

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

        if (CountlyHelpers.isPluginEnabled("funnels") && typeof countlyFunnel !== "undefined" && countlyAuth.validateCreate('funnels')) {

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

            if (template.events && template.events.length) {
                let firstEvent = template.events[getRandomInt(0, template.events.length - 1)].key;
                let secondEvent = template.events.length === 1 ? "[CLY]_view" : template.events[getRandomInt(0, template.events.length - 1)].key;

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

        if (countlyGlobal.plugins.indexOf('drill') !== -1) {
            $.ajax({
                type: "GET",
                url: countlyCommon.API_URL + "/i/drill/regenerate_meta",
                data: {
                    app_id: countlyCommon.ACTIVE_APP_ID,
                    period: countlyCommon.getPeriodForAjax(),
                },
                contentType: "application/json; charset=utf-8",
                dataType: "json",
                success: function() {
                },
                error: function() {
                    CountlyHelpers.notify({message: CV.i18n("populator.failed-message-regenerate-meta"), type: "error"});
                }
            });
        }

        if (CountlyHelpers.isPluginEnabled("push")) {
            createMessage(messages[0]);
            createMessage(messages[1]);
            createMessage(messages[2]);
        }
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
            error: function(err) {
                callback({err: err.responseJSON.result});
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
            callback({err: "Invalid template ID. Template update failed. Please refresh page and try again."});
        }
        else {
            newTemplate.app_id = countlyCommon.ACTIVE_APP_ID;
            $.ajax({
                type: "POST",
                url: countlyCommon.API_URL + "/i/populator/templates/edit",
                data: JSON.stringify(newTemplate),
                contentType: "application/json; charset=utf-8",
                dataType: "json",
                success: callback || function() {},
                error: function(err) {
                    callback({err: err.responseJSON.result});
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
}(window.countlyPopulator = window.countlyPopulator || {}));