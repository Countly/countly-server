/*global chance, countlyGlobal, countlyCommon, countlyCohorts, $, jQuery*/
(function(countlyPopulator) {
    var metric_props = {
        mobile: ["_os", "_os_version", "_resolution", "_device", "_carrier", "_app_version", "_density", "_locale", "_store"],
        web: ["_os", "_os_version", "_resolution", "_device", "_app_version", "_density", "_locale", "_store", "_browser"],
        desktop: ["_os", "_os_version", "_resolution", "_app_version", "_locale"]
    };
    var props = {
        _os: ["Android", "iOS", "Windows Phone"],
        _os_web: ["Android", "iOS", "Windows Phone", "Windows", "MacOS"],
        _os_desktop: ["Windows", "MacOS", "Linux"],
        _os_version_android: ["2.3", "2.3.7", "3.0", "3.2.6", "4.0", "4.0.4", "4.1", "4.3.1", "4.4", "4.4.4", "5.0", "5.1.1", "6.0", "6.0.1", "7.0", "7.1"],
        _os_version_ios: ["7.1.2", "8.4.1", "9.3.5", "10.1.1", "10.2"],
        _os_version_windows_phone: ["7", "8"],
        _os_version_windows: ["7", "8", "10"],
        _os_version_macos: ["10.8", "10.9", "10.10", "10.11", "10.12"],
        _os_version: function() {
            return getRandomInt(1, 9) + "." + getRandomInt(0, 5);
        },
        _resolution: ["320x480", "768x1024", "640x960", "1536x2048", "320x568", "640x1136", "480x800", "240x320", "540x960", "480x854", "240x400", "360x640", "800x1280", "600x1024", "600x800", "768x1366", "720x1280", "1080x1920"],
        _device_android: ["GT-S5830L", "HTC6525LVW", "MB860", "LT18i", "LG-P500", "Desire V", "Wildfire S A510e"],
        _device_ios: ["iPhone8,1", "iPhone9,1", "iPhone9,2", "iPod7,1", "iPad3,6"],
        _device_windows_phone: ["Lumia 535", "Lumia 540", "Lumia 640 XL"],
        _manufacture_android: ["Samsung", "Sony Ericsson", "LG", "Google", "HTC", "Huaiwei", "Lenovo", "Acer"],
        _manufacture_ios: ["Apple"],
        _manufacture_windows_phone: ["Nokia", "Microsoft"],
        _carrier: ["Telus", "Rogers Wireless", "T-Mobile", "Bell Canada", "AT&T", "Verizon", "Vodafone", "Cricket Communications", "O2", "Tele2", "Turkcell", "Orange", "Sprint", "Metro PCS"],
        _app_version: ["1.0", "1.1", "1.2", "1.3", "1.4", "1.5", "1.6", "1.7", "1.8", "1.9", "2.0", "2.1", "2.2", "2.3", "2.4", "2.5", "2.6", "2.7", "2.8", "2.9", "3.0", "3.1", "3.2"],
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
        _store: ["com.android.vending", "com.google.android.feedback", "com.google.vending", "com.slideme.sam.manager", "com.amazon.venezia", "com.sec.android.app.samsungapps", "com.nokia.payment.iapenabler", "com.qihoo.appstore", "cn.goapk.market", "com.wandoujia.phoenix2", "com.hiapk.marketpho", "com.hiapk.marketpad", "com.dragon.android.pandaspace", "me.onemobile.android", "com.aspire.mm", "com.xiaomi.market", "com.miui.supermarket", "com.baidu.appsearch", "com.tencent.android.qqdownloader", "com.android.browser", "com.bbk.appstore", "cm.aptoide.pt", "com.nduoa.nmarket", "com.rim.marketintent", "com.lenovo.leos.appstore", "com.lenovo.leos.appstore.pad", "com.keenhi.mid.kitservice", "com.yingyonghui.market", "com.moto.mobile.appstore", "com.aliyun.wireless.vos.appstore", "com.appslib.vending", "com.mappn.gfan", "com.diguayouxi", "um.market.android", "com.huawei.appmarket", "com.oppo.market", "com.taobao.appcenter"],
        _source: ["https://www.google.lv", "https://www.google.co.in/", "https://www.google.ru/", "http://stackoverflow.com/questions", "http://stackoverflow.com/unanswered", "http://stackoverflow.com/tags", "http://r.search.yahoo.com/"]
    };
    var widgetList = [];
    var eventsMap = {
        "Login": ["Lost", "Won"],
        "Logout": [],
        "Lost": ["Won", "Achievement", "Lost"],
        "Won": ["Lost", "Achievement"],
        "Achievement": ["Sound", "Shared"],
        "Sound": ["Lost", "Won"],
        "Shared": ["Lost", "Won"]
    };
    var segments = {
        Login: {referer: ["twitter", "notification", "unknown"]},
        Buy: {screen: ["End Level", "Main screen", "Before End"]},
        Lost: {level: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11], mode: ["arcade", "physics", "story"], difficulty: ["easy", "medium", "hard"]},
        Won: {level: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11], mode: ["arcade", "physics", "story"], difficulty: ["easy", "medium", "hard"]},
        Achievement: {name: ["Runner", "Jumper", "Shooter", "Berserker", "Tester"]},
        Sound: {state: ["on", "off"]},
        "[CLY]_action": {}
    };
    segments["[CLY]_view"] = {
        name: ["Settings Page", "Purchase Page", "Credit Card Entry", "Profile page", "Start page", "Message page"],
        visit: [1],
        start: [0, 1],
        exit: [0, 1],
        bounce: [0, 1],
        segment: ["Android", "iOS", "Windows Phone"]
    };
    var messages = [
        {"demo": 1, "apps": [countlyCommon.ACTIVE_APP_ID], "platforms": ["i", "a"], "tz": false, "auto": false, "type": "message", "messagePerLocale": {"default|t": "💥 Promotion! 💥", "default|0|t": "Get It", "default|1|t": "Cancel", "default|0|l": "theapp://promo/30off", "default|1|l": "theapp://promo/30off/cancel", "de|t": "💥 SALE! 💥", "de|0|t": "OK", "de|1|t": "Stornieren", "default": "HOT offers with 30% discount, only 6 hours left!", "default|p": {}, "default|tp": {}, "de|tp": {}, "de": "Abonnieren Sie jetzt mit 30% Rabatt, nur noch 6 Stunden!", "de|p": {}}, "locales": [{"value": "default", "title": "Default", "count": 200, "percent": 100}, {"value": "de", "title": "German", "count": 100, "percent": 50}, {"value": "en", "title": "English", "count": 100, "percent": 50}], "sound": "default", "url": "theapp://promo/30off", "source": "dash", "buttons": 2, "media": location.origin + "/images/push/sale.png", "autoOnEntry": false, "autoCohorts": []},
        {"demo": 2, "apps": [countlyCommon.ACTIVE_APP_ID], "platforms": ["i", "a"], "tz": false, "auto": false, "type": "message", "messagePerLocale": {"default|t": "💥 Promotion! 💥", "default|0|t": "Get It", "default|1|t": "Cancel", "default|0|l": "theapp://promo/30off", "default|1|l": "theapp://promo/30off/cancel", "de|t": "💥 SALE! 💥", "de|0|t": "OK", "de|1|t": "Stornieren", "default": "Last chance! Only 3 hours left to get 30% discount!", "default|p": {}, "default|tp": {}, "de|tp": {}, "de": "Letzte Möglichkeit! Nur noch 3 Stunden, um 30% Rabatt zu erhalten", "de|p": {}}, "locales": [{"value": "default", "title": "Default", "count": 200, "percent": 100}, {"value": "de", "title": "German", "count": 100, "percent": 50}, {"value": "en", "title": "English", "count": 100, "percent": 50}], "sound": "default", "url": "theapp://promo/30off", "source": "dash", "buttons": 2, "media": location.origin + "/images/push/sale.png", "autoOnEntry": false, "autoCohorts": []},
        {"demo": 3, "apps": [countlyCommon.ACTIVE_APP_ID], "platforms": ["i", "a"], "tz": false, "auto": true, "type": "message", "messagePerLocale": {"default|t": "What your friends don't know", "default|0|t": "Share", "default|1|t": "Button 2", "default|0|l": "theapp://scores/share", "default|tp": {}, "default|p": {}, "default": "... is your personal best score! Share it now!"}, "locales": [{"value": "default", "title": "Default", "count": 200, "percent": 100}, {"value": "de", "title": "German", "count": 100, "percent": 50}, {"value": "en", "title": "English", "count": 100, "percent": 50}], "sound": "default", "source": "dash", "buttons": 1, "autoOnEntry": true, "autoCohorts": [], "autoTime": 57600000, "autoCapMessages": 1, "autoCapSleep": 86400000}
    ];
    var ip_address = [];
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
    * Capitalize first letter of string
    * @param {string} string - input string
    * @returns {string} returns string which first letter capitalized
    **/
    function capitaliseFirstLetter(string) {
        return string.charAt(0).toUpperCase() + string.slice(1);
    }
    /**
    * Create random object with Facebook Login, Twitter Login,
    * Twitter Login name and Has Apple Watch Os properties
    * @returns {object} returns random object
    **/
    function createRandomObj() {
        var ob = {
            "Facebook Login": (Math.random() > 0.5) ? true : false,
            "Twitter Login": (Math.random() > 0.5) ? true : false
        };

        if (ob["Twitter Login"]) {
            ob["Twitter Login name"] = chance.twitter();
        }

        if ((Math.random() > 0.5)) {
            ob["Has Apple Watch OS"] = (Math.random() > 0.5) ? true : false;
        }

        if (countlyGlobal.apps[countlyCommon.ACTIVE_APP_ID] && countlyGlobal.apps[countlyCommon.ACTIVE_APP_ID].type === "web") {
            var campaigns = ['Social Campaign', 'Landing page', 'Ads Campaign'];
            var sources = ["facebook", "gideros", "admob", "chartboost", "googleplay"];
            if ((Math.random() > 0.5)) {
                ob.utm_source = sources[getRandomInt(0, sources.length - 1)];
                ob.utm_medium = "cpc";
                ob.utm_campaign = campaigns[getRandomInt(0, campaigns.length - 1)];
            }
        }

        return ob;
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
    * Get In app purchase event
    * @returns {object} returns iap event
    **/
    function getIAPEvents() {
        var iap = [];
        var cur = countlyCommon.dot(countlyGlobal.apps[countlyCommon.ACTIVE_APP_ID], 'plugins.revenue.iap_events');
        if (cur && cur.length) {
            for (var iapIndex = 0; iapIndex < cur.length; iapIndex++) {
                if (cur[iapIndex] && cur[iapIndex].length) {
                    iap.push(cur[iapIndex]);
                    eventsMap[cur[iapIndex]] = segments.Buy;
                }
            }
        }

        if (iap.length === 0) {
            iap = ["Buy"];
            eventsMap.Buy = segments.Buy;
        }
        return iap;
    }
    /**
    * Generate a user with random properties and actions
    **/
    function user() {
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

        this.getProp = getProp;

        var that = this;
        this.stats = {u: 0, s: 0, x: 0, d: 0, e: 0, r: 0, b: 0, c: 0, p: 0};
        this.id = this.getId();
        this.isRegistered = false;
        this.iap = getIAPEvents();

        this.hasSession = false;
        if (ip_address.length > 0 && Math.random() >= 0.5) {
            this.ip = ip_address.pop();
        }
        else {
            this.ip = chance.ip();
        }
        this.userdetails = {name: chance.name(), username: chance.twitter().substring(1), email: chance.email(), organization: capitaliseFirstLetter(chance.word()), phone: chance.phone(), gender: chance.gender().charAt(0), byear: chance.birthday().getFullYear(), custom: createRandomObj()};
        this.userdetails.custom.populator = true;
        this.metrics = {};
        this.startTs = startTs;
        this.endTs = endTs;
        this.events = [];
        this.ts = getRandomInt(this.startTs, this.endTs);
        if (countlyGlobal.apps[countlyCommon.ACTIVE_APP_ID] && countlyGlobal.apps[countlyCommon.ACTIVE_APP_ID].type === "web") {
            this.platform = this.getProp("_os_web");
        }
        else if (countlyGlobal.apps[countlyCommon.ACTIVE_APP_ID] && countlyGlobal.apps[countlyCommon.ACTIVE_APP_ID].type === "desktop") {
            this.platform = this.getProp("_os_desktop");
        }
        else {
            this.platform = this.getProp("_os");
        }
        this.metrics._os = this.platform;
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

        this.getCrash = function() {
            var crash = {};
            crash._os = this.metrics._os;
            crash._os_version = this.metrics._os_version;
            crash._device = this.metrics._device;
            crash._manufacture = this.getProp("_manufacture");
            crash._resolution = this.metrics._resolution;
            crash._app_version = this.metrics._app_version;
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

            crash._error = this.getError();
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
            var error = "";
            var stacks = 0;
            if (countlyGlobal.apps[countlyCommon.ACTIVE_APP_ID].type === "web") {
                errors = ["EvalError", "InternalError", "RangeError", "ReferenceError", "SyntaxError", "TypeError", "URIError"];
                var err = new Error(errors[Math.floor(Math.random() * errors.length)], randomString(5) + ".js", getRandomInt(1, 100));
                return err.stack + "";
            }
            else if (this.platform === "Android") {
                errors = ["java.lang.RuntimeException", "java.lang.NullPointerException", "java.lang.NoSuchMethodError", "java.lang.NoClassDefFoundError", "java.lang.ExceptionInInitializerError", "java.lang.IllegalStateException"];
                error = errors[Math.floor(Math.random() * errors.length)] + ": com.domain.app.Exception<init>\n";
                stacks = getRandomInt(5, 9);
                for (var stackIndex = 0; stackIndex < stacks; stackIndex++) {
                    error += "at com.domain.app.<init>(Activity.java:" + (stackIndex * 32) + ")\n";
                }
                return error;
            }
            else if (this.platform === "iOS") {
                errors = ["CoreFoundation                  0x182e3adb0 __exceptionPreprocess + 124",
                    "libobjc.A.dylib                 0x18249ff80 objc_exception_throw + 56",
                    "CoreFoundation                  0x182d1b098 -[__NSArrayI objectAtIndex:] + 196",
                    "CountlyTestApp-iOS              0x100046988 0x100030000 + 92552",
                    "CountlyTestApp-iOS              0x100044340 0x100030000 + 82752",
                    "UIKit                           0x187fd0be8 -[UIApplication sendAction:to:from:forEvent:] + 100",
                    "UIKit                           0x187fd0b64 -[UIControl sendAction:to:forEvent:] + 80",
                    "UIKit                           0x187fb8870 -[UIControl _sendActionsForEvents:withEvent:] + 436",
                    "UIKit                           0x187fd0454 -[UIControl touchesEnded:withEvent:] + 572",
                    "UIKit                           0x187f88c0c _UIGestureRecognizerUpdate + 8988",
                    "UIKit                           0x187fc9610 -[UIWindow _sendGesturesForEvent:] + 1132",
                    "UIKit                           0x187fc8c0c -[UIWindow sendEvent:] + 764",
                    "UIKit                           0x187f9904c -[UIApplication sendEvent:] + 248",
                    "UIKit                           0x187f97628 _UIApplicationHandleEventQueue + 6568",
                    "CoreFoundation                  0x182df109c __CFRUNLOOP_IS_CALLING_OUT_TO_A_SOURCE0_PERFORM_FUNCTION__ + 24",
                    "CoreFoundation                  0x182df0b30 __CFRunLoopDoSources0 + 540",
                    "CoreFoundation                  0x182dee830 __CFRunLoopRun + 724",
                    "CoreFoundation                  0x182d18c50 CFRunLoopRunSpecific + 384",
                    "GraphicsServices                0x184600088 GSEventRunModal + 180",
                    "UIKit                           0x188002088 UIApplicationMain + 204",
                    "CountlyTestApp-iOS              0x10004342c 0x100030000 + 78892",
                    "libdyld.dylib                   0x1828b68b8 start + 4"
                ];
                error = "";
                stacks = getRandomInt(9, 19);
                for (var stackIndex2 = 0; stackIndex2 < stacks; stackIndex2++) {
                    error += stackIndex2 + " " + errors[Math.floor(Math.random() * errors.length)] + "\n";
                }
                return error;
            }
            else {
                return "System.ArgumentOutOfRangeException\n" +
                "   at System.ThrowHelper.ThrowArgumentOutOfRangeException()\n" +
                "   at System.Collections.Generic.List`1.get_Item(Int32 index)\n" +
                "   at StorePuzzle.PuzzleRenderer.HandleTileReleased(Object sender, PointerRoutedEventArgs e)";
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

        this.getEvent = function(id) {
            this.stats.e++;
            if (!id) {
                if (this.previousEventId) {
                    id = eventsMap[this.previousEventId][Math.floor(Math.random() * eventsMap[this.previousEventId].length)];
                }
                else {
                    id = 'Login';
                }
            }

            if (id in eventsMap) {
                this.previousEventId = id;
            }

            var event = {
                "key": id,
                "count": 1,
                "timestamp": this.ts,
                "hour": getRandomInt(0, 23),
                "dow": getRandomInt(0, 6)
            };
            this.ts += 1000;
            var segment;
            if (this.iap.indexOf(id) !== -1) {
                this.stats.b++;
                event.sum = getRandomInt(100, 500) / 100;
                event.segmentation = {};
                for (var buyEvent in segments.Buy) {
                    segment = segments.Buy[buyEvent];
                    event.segmentation[buyEvent] = segment[Math.floor(Math.random() * segment.length)];
                }
            }
            else if (segments[id]) {
                event.segmentation = {};
                for (var segmentIndex in segments[id]) {
                    if (countlyGlobal.apps[countlyCommon.ACTIVE_APP_ID].type === "web" && (id === "[CLY]_view" && segmentIndex === "name")) {
                        var views = ["/" + countlyCommon.ACTIVE_APP_KEY + "/demo-page.html"];
                        event.segmentation[segmentIndex] = views[Math.floor(Math.random() * views.length)];
                    }
                    else {
                        segment = segments[id][segmentIndex];
                        event.segmentation[segmentIndex] = segment[Math.floor(Math.random() * segment.length)];
                    }
                }
            }
            if (id === "[CLY]_view") {
                event.dur = getRandomInt(0, 100);
            }
            else {
                event.dur = getRandomInt(0, 10);
            }

            return [event];
        };

        this.getEvents = function(count) {
            var events = [];
            for (var eventIndex = 0; eventIndex < count; eventIndex++) {
                events.push(this.getEvent()[0]);
            }
            return events;
        };

        this.getFeedbackEvents = function() {
            var events = this.getFeedbackEvent();
            return events;
        };
        this.getFeedbackEvent = function() {
            this.stats.e++;
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
            event.segmentation.app_version = this.metrics._app_version;
            event.segmentation.platform = this.metrics._os;
            if (widgetList.length) {
                event.segmentation.widget_id = widgetList[getRandomInt(0, widgetList.length - 1)]._id;
            }
            return [event];
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
            this.stats.e++;
            var views = ["/" + countlyCommon.ACTIVE_APP_KEY + "/demo-page.html"];
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
            var events = this.getHeatmapEvent();
            if (Math.random() >= 0.5) {
                events = events.concat(this.getScrollmapEvent());
                if (Math.random() >= 0.8) {
                    events = events.concat(this.getScrollmapEvent());
                }
            }
            return events;
        };
        this.getScrollmapEvent = function() {
            this.stats.e++;
            var views = ["/" + countlyCommon.ACTIVE_APP_KEY + "/demo-page.html"];
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

        this.startSession = function() {
            this.ts = this.ts + 60 * 60 * 24 + 100;
            this.stats.s++;
            var req = {};
            var events;
            if (!this.isRegistered) {
                this.isRegistered = true;
                this.stats.u++;
                events = this.getEvent("Login").concat(this.getEvent("[CLY]_view")).concat(this.getEvents(4));
                req = {timestamp: this.ts, begin_session: 1, metrics: this.metrics, user_details: this.userdetails, events: events};
                if (Math.random() > 0.5) {
                    this.hasPush = true;
                    this.stats.p++;
                    req.token_session = 1;
                    req.test_mode = 0;
                    req.events = req.events.concat(this.getHeatmapEvents());
                    req.events = req.events.concat(this.getFeedbackEvents());
                    req.events = req.events.concat(this.getScrollmapEvents());
                    req[this.platform.toLowerCase() + "_token"] = randomString(8);
                }
            }
            else {
                events = this.getEvent("Login").concat(this.getEvent("[CLY]_view")).concat(this.getEvents(4));
                req = {timestamp: this.ts, begin_session: 1, events: events};
            }
            if (this.iap.length && Math.random() > 0.5) {
                req.events = req.events.concat(this.getEvent(this.iap[getRandomInt(0, this.iap.length - 1)]));
            }
            if (Math.random() > 0.5) {
                this.stats.c++;
                req.crash = this.getCrash();
            }
            var consents = ["sessions", "events", "views", "scrolls", "clicks", "forms", "crashes", "push", "attribution", "users"];
            req.consent = {};
            for (var consentIndex = 0; consentIndex < consents.length; consentIndex++) {
                req.consent[consents[consentIndex]] = (Math.random() > 0.8) ? false : true;
            }
            this.hasSession = true;
            this.request(req);
            this.timer = setTimeout(function() {
                that.extendSession();
            }, timeout);
        };

        this.extendSession = function() {
            if (this.hasSession) {
                var req = {};
                this.ts = this.ts + 30;
                this.stats.x++;
                this.stats.d += 30;
                var events = this.getEvent("[CLY]_view").concat(this.getEvents(2));
                req = {timestamp: this.ts, session_duration: 30, events: events};
                if (Math.random() > 0.8) {
                    this.timer = setTimeout(function() {
                        that.extendSession();
                    }, timeout);
                }
                else {
                    if (Math.random() > 0.5) {
                        this.stats.c++;
                        req.crash = this.getCrash();
                    }
                    this.timer = setTimeout(function() {
                        that.endSession();
                    }, timeout);
                }
                this.request(req);
            }
        };

        this.endSession = function() {
            if (this.timer) {
                clearTimeout(this.timer);
                this.timer = null;
            }
            if (this.hasSession) {
                this.hasSession = false;
                var events = this.getEvents(2).concat(this.getEvent("Logout"));
                this.request({timestamp: this.ts, end_session: 1, events: events});
            }
        };

        this.request = function(params) {
            this.stats.r++;
            params.device_id = this.id;
            params.ip_address = this.ip;
            params.hour = getRandomInt(0, 23);
            params.dow = getRandomInt(0, 6);
            params.stats = JSON.parse(JSON.stringify(this.stats));
            bulk.push(params);
            this.stats = {u: 0, s: 0, x: 0, d: 0, e: 0, r: 0, b: 0, c: 0, p: 0};
            countlyPopulator.sync();
        };

        this.reportConversion = function(uid, campaingId) {
            $.ajax({
                type: "GET",
                url: countlyCommon.API_URL + "/i",
                data: {
                    campaign_id: uid,
                    campaign_user: campaingId,
                    app_key: countlyCommon.ACTIVE_APP_KEY,
                    device_id: this.id,
                    timestamp: getRandomInt(startTs, endTs),
                    populator: true
                },
                success: function() {}
            });
        };
    }

    var bulk = [];
    var campaingClicks = [];
    var startTs = 1356998400;
    var endTs = new Date().getTime() / 1000;
    var timeout = 1000;
    var bucket = 50;
    var generating = false;
    var stopCallback = null;
    var users = [];
    var userAmount = 1000;
    var queued = 0;
    var totalStats = {u: 0, s: 0, x: 0, d: 0, e: 0, r: 0, b: 0, c: 0, p: 0};
    /**
    * Update populator UI
    * @param {object} stats - current populator stats
    **/
    function updateUI(stats) {
        for (var i in stats) {
            totalStats[i] += stats[i];
            $(".populate-stats-" + i).text(totalStats[i]);
        }
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

        $.ajax({
            type: "POST",
            url: countlyCommon.API_URL + "/i/pushes/create",
            data: {
                args: JSON.stringify(data),
                populator: true
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
    * Generate feedback popups three times
    * @param {callback} callback - callback method
    **/
    function generateWidgets(callback) {
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
                            widgetList = json;
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
        var ip = chance.ip();
        if (ip_address.length && Math.random() > 0.5) {
            ip = ip_address[Math.floor(Math.random() * ip_address.length)];
        }
        else {
            ip_address.push(ip);
        }
        $.ajax({
            type: "GET",
            url: countlyCommon.API_URL + "/i/campaign/click/" + name + countlyCommon.ACTIVE_APP_ID,
            data: {ip_address: ip, test: true, timestamp: getRandomInt(startTs, endTs), populator: true},
            success: function(data) {
                var link = data.link.replace('&amp;', '&');
                var queryString = link.split('?')[1];
                var parameters = parseQueryString(queryString);
                campaingClicks.push({
                    name: name,
                    cly_id: parameters.cly_id,
                    cly_uid: parameters.cly_uid
                });

            }
        });
    }
    /**
    * Generate social, ads and landing campaings and
    * generate some dummy click for them
    * @param {callback} callback - callback method
    **/
    function genereateCampaigns(callback) {
        if (typeof countlyAttribution === "undefined") {
            callback();
            return;
        }
        var campaigns = ["social", "ads", "landing"];
        createCampaign("social", "Social Campaign", "0.5", "click", function() {
            createCampaign("ads", "Ads Campaign", "1", "install", function() {
                createCampaign("landing", "Landing page", "30", "campaign", function() {
                    for (var campaignIndex = 0; campaignIndex < 100; campaignIndex++) {
                        setTimeout(function() {
                            clickCampaign(campaigns[getRandomInt(0, campaigns.length - 1)]);
                        }, 1);
                    }
                    setTimeout(callback, 3000);
                });
            });
        });
    }


    /**
    * Generate retention user
    * @param {date} ts - date as timestamp
    * @param {number} userCount - users count will be generated
    * @param {array} ids - ids array
    * @param {callback} callback - callback function
    **/
    function generateRetentionUser(ts, userCount, ids, callback) {
        bulk = [];
        for (var userIndex = 0; userIndex < userCount; userIndex++) {
            for (var j = 0; j < ids.length; j++) {
                var metrics = {};
                var platform;
                if (countlyGlobal.apps[countlyCommon.ACTIVE_APP_ID] && countlyGlobal.apps[countlyCommon.ACTIVE_APP_ID].type === "web") {
                    platform = getProp("_os_web");
                }
                else if (countlyGlobal.apps[countlyCommon.ACTIVE_APP_ID] && countlyGlobal.apps[countlyCommon.ACTIVE_APP_ID].type === "desktop") {
                    platform = getProp("_os_desktop");
                }
                else {
                    platform = getProp("_os");
                }
                metrics._os = platform;
                var m_props = metric_props.mobile;
                if (countlyGlobal.apps[countlyCommon.ACTIVE_APP_ID] && countlyGlobal.apps[countlyCommon.ACTIVE_APP_ID].type && metric_props[countlyGlobal.apps[countlyCommon.ACTIVE_APP_ID].type]) {
                    m_props = metric_props[countlyGlobal.apps[countlyCommon.ACTIVE_APP_ID].type];
                }
                for (var k = 0; k < m_props.length; k++) {
                    if (m_props[k] !== "_os") {
                        //handle specific cases
                        if (m_props[k] === "_store" && countlyGlobal.apps[countlyCommon.ACTIVE_APP_ID] && countlyGlobal.apps[countlyCommon.ACTIVE_APP_ID].type === "web") {
                            metrics[m_props[k]] = getProp("_source");
                        }
                        else {
                            //check os specific metric
                            if (typeof props[m_props[k] + "_" + platform.toLowerCase().replace(/\s/g, "_")] !== "undefined") {
                                metrics[m_props[k]] = getProp(m_props[k] + "_" + platform.toLowerCase().replace(/\s/g, "_"));
                            }
                            //default metric set
                            else {
                                metrics[m_props[k]] = getProp(m_props[k]);
                            }
                        }
                    }
                }

                var userdetails = {name: chance.name(), username: chance.twitter().substring(1), email: chance.email(), organization: capitaliseFirstLetter(chance.word()), phone: chance.phone(), gender: chance.gender().charAt(0), byear: chance.birthday().getFullYear(), custom: createRandomObj()};

                bulk.push({ip_address: chance.ip(), device_id: userIndex + "" + ids[j], begin_session: 1, metrics: metrics, user_details: userdetails, timestamp: ts, hour: getRandomInt(0, 23), dow: getRandomInt(0, 6)});
                totalStats.s++;
                totalStats.u++;
            }
        }
        totalStats.r++;
        $.ajax({
            type: "POST",
            url: countlyCommon.API_URL + "/i/bulk",
            data: {
                app_key: countlyCommon.ACTIVE_APP_KEY,
                requests: JSON.stringify(bulk),
                populator: true
            },
            success: callback,
            error: callback
        });
    }

    /**
    * Generate retentions
    * @param {callback} callback - callback function
    **/
    function generateRetention(callback) {
        if (typeof countlyRetention === "undefined") {
            callback();
            return;
        }
        var ts = endTs - 60 * 60 * 24 * 9;
        var ids = [ts];
        var userCount = 10;
        generateRetentionUser(ts, userCount--, ids, function() {
            ts += 60 * 60 * 24;
            ids.push(ts);
            generateRetentionUser(ts, userCount--, ids, function() {
                ts += 60 * 60 * 24;
                ids.push(ts);
                generateRetentionUser(ts, userCount--, ids, function() {
                    ts += 60 * 60 * 24;
                    ids.push(ts);
                    generateRetentionUser(ts, userCount--, ids, function() {
                        ts += 60 * 60 * 24;
                        ids.push(ts);
                        generateRetentionUser(ts, userCount--, ids, function() {
                            ts += 60 * 60 * 24;
                            ids.push(ts);
                            generateRetentionUser(ts, userCount--, ids, function() {
                                ts += 60 * 60 * 24;
                                ids.push(ts);
                                generateRetentionUser(ts, userCount--, ids, function() {
                                    ts += 60 * 60 * 24;
                                    ids.push(ts);
                                    generateRetentionUser(ts, userCount--, ids, callback);
                                });
                            });
                        });
                    });
                });
            });
        });
    }

    /**
     * To report campaign clicks conversion
     */
    function reportConversions() {
        for (var i = 0; i < campaingClicks.length; i++) {
            var click = campaingClicks[i];
            if ((Math.random() > 0.5)) {
                users[i].reportConversion(click.cly_id, click.cly_uid);
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
    countlyPopulator.generateUI = function() {
        for (var i in totalStats) {
            $(".populate-stats-" + i).text(totalStats[i]);
        }
    };
    countlyPopulator.generateUsers = function(amount) {
        stopCallback = null;
        userAmount = amount;
        bulk = [];
        totalStats = {u: 0, s: 0, x: 0, d: 0, e: 0, r: 0, b: 0, c: 0, p: 0};
        bucket = Math.max(amount / 50, 10);
        var mult = (Math.round(queued / 10) + 1);
        timeout = bucket * 10 * mult * mult;
        generating = true;
        /**
        * Create new user
        **/
        function createUser() {
            var u = new user();
            users.push(u);
            u.timer = setTimeout(function() {
                u.startSession();
            }, Math.random() * timeout);
        }
        /**
        * Start user session process
        * @param {object} u - user object
        **/
        function processUser(u) {
            if (u && !u.hasSession) {
                u.timer = setTimeout(function() {
                    u.startSession();
                }, Math.random() * timeout);
            }
        }
        /**
        * Start user session process
        * @param {object} u - user object
        **/
        function processUsers() {
            for (var userAmountIndex = 0; userAmountIndex < amount; userAmountIndex++) {
                processUser(users[userAmountIndex]);
            }
            if (users.length > 0 && generating) {
                setTimeout(processUsers, timeout);
            }
            else {
                countlyPopulator.sync(true);
            }
        }
        generateRetention(function() {
            genereateCampaigns(function() {
                for (var campaignAmountIndex = 0; campaignAmountIndex < amount; campaignAmountIndex++) {
                    createUser();
                }
                // Generate campaigns conversion for web
                if (countlyGlobal.apps[countlyCommon.ACTIVE_APP_ID] && countlyGlobal.apps[countlyCommon.ACTIVE_APP_ID].type === "web") {
                    setTimeout(reportConversions, timeout);
                }
                setTimeout(processUsers, timeout);
            });
        });
        if (countlyGlobal.plugins.indexOf("systemlogs") !== -1) {
            $.ajax({
                type: "POST",
                url: countlyCommon.API_URL + "/i/systemlogs",
                data: {
                    data: JSON.stringify({app_id: countlyCommon.ACTIVE_APP_ID}),
                    action: "populator_run",
                    "api_key": countlyGlobal.member.api_key,
                    populator: true
                },
                success: function() {}
            });
        }
        if (countlyGlobal.plugins.indexOf("star-rating") !== -1) {
            generateWidgets(function() {
            });
        }
        // for(var i = 0; i < amount; i++){
        //     createUser();
        // }
    };

    countlyPopulator.stopGenerating = function(clb) {
        generating = false;
        stopCallback = clb;
        var u;
        for (var userGenerationIndex = 0; userGenerationIndex < users.length; userGenerationIndex++) {
            u = users[userGenerationIndex];
            if (u) {
                u.endSession();
            }
        }
        users = [];

        if (!countlyPopulator.bulking && stopCallback) {
            countlyPopulator.ensureJobs();
        }
    };

    countlyPopulator.isGenerating = function() {
        return generating;
    };

    countlyPopulator.sync = function(force) {
        if (generating && (force || bulk.length > bucket) && !countlyPopulator.bulking) {
            queued++;
            var mult = Math.round(queued / 10) + 1;
            timeout = bucket * 10 * mult * mult;
            $(".populate-stats-br").text(queued);
            countlyPopulator.bulking = true;
            var req = bulk.splice(0, bucket);
            var temp = {u: 0, s: 0, x: 0, d: 0, e: 0, r: 0, b: 0, c: 0, p: 0};
            for (var i in req) {
                if (req[i].stats) {
                    for (var stat in req[i].stats) {
                        temp[stat] += req[i].stats[stat];
                    }
                    delete req[i].stats;
                }
            }
            $.ajax({
                type: "POST",
                url: countlyCommon.API_URL + "/i/bulk",
                data: {
                    app_key: countlyCommon.ACTIVE_APP_KEY,
                    requests: JSON.stringify(req),
                    populator: true
                },
                success: function() {
                    queued--;
                    $(".populate-stats-br").text(queued);
                    updateUI(temp);
                    countlyPopulator.bulking = false;
                    countlyPopulator.sync();
                    if (!generating && stopCallback) {
                        countlyPopulator.ensureJobs();
                    }
                },
                error: function() {
                    queued--;
                    $(".populate-stats-br").text(queued);
                    countlyPopulator.bulking = false;
                    countlyPopulator.sync();
                    if (!generating && stopCallback) {
                        countlyPopulator.ensureJobs();
                    }
                }
            });
        }
    };

    countlyPopulator.ensureJobs = function() {
        messages.forEach(function(m) {
            m.apps = [countlyCommon.ACTIVE_APP_ID];
        });

        if (typeof countlyCohorts !== "undefined") {
            var iap = getIAPEvents();
            countlyCohorts.add({
                cohort_name: "Bought & Shared",
                steps: JSON.stringify([
                    {
                        "type": "did",
                        "event": iap[0],
                        "period": "30days",
                        "query": "{}",
                        "byVal": ""
                    },
                    {
                        "type": "did",
                        "event": "Shared",
                        "period": "14days",
                        "query": "{}",
                        "byVal": ""
                    }
                ]),
                populator: true
            });
            countlyCohorts.add({
                cohort_name: "Facebook login",
                steps: JSON.stringify([
                    {
                        "type": "did",
                        "event": "[CLY]_session",
                        "period": "30days",
                        "query": "{\"custom.Facebook Login\":{\"$in\":[\"true\"]}}",
                        "byVal": ""
                    }
                ]),
                populator: true
            });
            countlyCohorts.add({
                cohort_name: "Purchased & Engaged",
                steps: JSON.stringify([
                    {
                        "type": "did",
                        "event": iap[0],
                        "period": "30days",
                        "query": "{}",
                        "byVal": ""
                    },
                    {
                        "type": "did",
                        "event": "[CLY]_session",
                        "period": "20days",
                        "query": "{}",
                        "byVal": ""
                    }
                ]),
                populator: true
            });
            countlyCohorts.add({
                cohort_name: "Purchased & Engaged",
                steps: JSON.stringify([
                    {
                        "type": "did",
                        "event": "[CLY]_session",
                        "times": {"$gte": 1},
                        "period": "30days",
                        "query": "{\"custom.Facebook Login\":{\"$in\":[\"true\"]}}",
                        "byVal": ""
                    },
                    {
                        "type": "didnot",
                        "event": "Shared",
                        "times": {"$gte": 1},
                        "period": "0days",
                        "query": "{}",
                        "byVal": ""
                    }
                ]),
                populator: true
            }, function(json) {
                messages[2].autoCohorts = [json.result];
                createMessage(messages[2], stopCallback ? stopCallback.bind(null, true) : function() {});
            });
        }

        createMessage(messages[0]);
        createMessage(messages[1]);
    };
}(window.countlyPopulator = window.countlyPopulator || {}, jQuery));