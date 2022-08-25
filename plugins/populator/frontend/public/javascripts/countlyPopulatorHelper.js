/**
 * Common variables and methods for the Populator are defined in this file.
 * @name countlyPopulatorHelper
 * @global
 * @namespace countlyPopulatorHelper
 */
/* eslint-disable no-undef */
var countlyPopulatorHelper = {
    metric_props: {
        mobile: ["_os", "_os_version", "_resolution", "_device", "_device_type", "_manufacturer", "_carrier", "_app_version", "_density", "_locale", "_store"],
        web: ["_os", "_os_version", "_resolution", "_device", "_device_type", "_app_version", "_density", "_locale", "_store", "_browser"],
        desktop: ["_os", "_os_version", "_resolution", "_app_version", "_locale"]
    },
    props: {
        _os: ["Android", "iOS"],
        _os_web: ["Android", "iOS", "Windows", "MacOS"],
        _os_desktop: ["Windows", "MacOS", "Linux"],
        _os_version_android: ["11", "12", "12L"],
        _os_version_ios: ["10.3.4", "12.5.5", "15.5"],
        _os_version_windows: ["7", "8", "10"],
        _os_version_macos: ["10.15", "11.0", "12.0"],
        _os_version: function() {
            return countlyPopulatorHelper.getRandomInt(1, 9) + "." + countlyPopulatorHelper.getRandomInt(0, 5);
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
        _app_version: ["1.0", "1.1", "1.2", "1.3", "1.4", "1.5", "1.6", "1.7", "1.8", "1.9", "2.0", "2.1", "2.2", "2.3", "2.4", "2.5", "2.6", "2.7", "2.8", "2.9", "3.0", "3.1", "3.2"],
        _cpu: ["armv6", "armv7", "x86"],
        _opengl: ["opengl_es1", "opengl_es2"],
        _density_android: ["XHDPI", "MDPI", "HDPI", "XXHDPI", "TVDPI"],
        _density_ios: ["@1", "@2", "@3"],
        _density_macos: ["@1", "@2", "@3"],
        _density: function() {
            return countlyPopulatorHelper.getRandomInt(1, 3) + "." + countlyPopulatorHelper.getRandomInt(0, 5);
        },
        _locale: ["en_CA", "fr_FR", "de_DE", "it_IT", "ja_JP", "ko_KR", "en_US"],
        _browser: ["Opera", "Chrome", "Internet Explorer", "Safari", "Firefox"],
        _store: ["com.android.vending", "com.google.android.feedback", "com.google.vending", "com.amazon.venezia", "com.sec.android.app.samsungapps", "com.qihoo.appstore", "com.dragon.android.pandaspace", "me.onemobile.android", "com.tencent.android.qqdownloader", "com.android.browser", "com.bbk.appstore", "com.lenovo.leos.appstore", "com.lenovo.leos.appstore.pad", "com.moto.mobile.appstore", "com.aliyun.wireless.vos.appstore", "um.market.android"],
        _source: ["https://www.google.lv/search?q=countly+analytics", "https://www.google.co.in/search?q=mobile+analytics", "https://www.google.ru/search?q=product+analytics", "http://stackoverflow.com/questions?search=what+is+mobile+analytics", "http://stackoverflow.com/unanswered?search=game+app+analytics", "http://stackoverflow.com/tags?search=product+dashboard", "http://r.search.yahoo.com/?query=analytics+product+manager"]
    },
    ratingWidgetList: [],
    npsWidgetList: [],
    surveyWidgetList: {},
    viewSegments: {
        name: ["Login", "Home", "Dashboard", "Main View", "Detail View Level 1", "Detail View Level 2", "Profile", "Settings", "About", "Privacy Policy", "Terms and Conditions"],
        visit: [1],
        start: [0, 1],
        exit: [0, 1],
        bounce: [0, 1],
        segment: ["Android", "iOS", "Windows Phone"]
    },

    // usa, uk, japan, germany, italy, france, turkey, uruguay, netherlands, new zealand, mexico, canada, china, finland, hungary, ukraine, argentina, bahamas, latvia, malaysia
    predefined_ip_addresses: ["2.167.106.72", "4.69.238.178", "3.112.23.176", "13.32.136.0", "4.69.130.86", "4.69.208.18", "17.67.198.23", "5.145.169.96", "2.59.88.2", "17.86.219.128", "23.65.126.2", "4.14.242.30", "14.192.76.3", "4.68.30.78", "5.38.128.2", "31.40.128.2", "5.145.169.100", "62.67.185.16", "14.139.54.208", "62.40.112.206", "14.192.192.1"],
    campaigns: [
        {id: "email", name: "Email campaign", cost: "0.1", type: "click"},
        {id: "email2", name: "Email campaign 2", cost: "0.2", type: "install"},
        {id: "sms", name: "SMS campaign", cost: "0.3", type: "install"},
        {id: "cpc", name: "Cross promotion campaign", cost: "1", type: "install"},
        {id: "blog", name: "Blog post campaign 1", cost: "5", type: "click"},
        {id: "blog2", name: "Blog post campaign 2", cost: "10", type: "install"}],
    sources: ["facebook", "gideros", "admob", "chartboost", "googleplay"],
    defaultTemplates: [
        {
            "_id": "defaultBanking",
            "name": "Banking",
            "isDefault": true,
            "up": {
                "Account Type": ["Individual", "Business"],
                "Has Credit Card": [true, false],
                "Has Loan": [true, false]
            },
            "events": {
                "Login": {
                    "segments": {"Method": ["Face ID", "Password"]}
                },
                "Fund Transfer Begin": {
                    "segments": {"Source Currency": ["EUR", "USD", "GBP"], "Destination Currency": ["EUR", "USD", "GBP"]}
                },
                "Fund Transfer": {
                    "segments": {"Result": ["Success", "Failure"], "Failure Reason": ["Insufficient Funds", "Technical Error"], "Error Code": [100101, 100102, 100103]},
                    "sum": [50, 10000],
                    "dur": [10, 60]
                },
                "Credit Card Application Begin": {
                    "segments": {"From": ["Home Banner", "My Credit Cards"]}
                },
                "Credit Card Application": {
                    "segments": {"Card Type": ["Basic", "Premium", "Black"]},
                    "dur": [60, 600]
                },
                "Bill Payment": {
                    "segments": {"Bill Type": ["Electricity", "Internet", "Phone", "Cable"], "Amount Range": ["0-20", "20-100", "100-500", "500+"]},
                    "sum": [100, 1000]
                }
            }
        },
        {
            "_id": "defaultHealthcare",
            "name": "Healthcare",
            "isDefault": true,
            "up": {
                "Insurance": ["Cigna", "AARP", "UnitedHealthcare", "Humana"],
                "Employer": ["Company1", "Company2", "Company3"]
            },
            "events": {
                "Login": {
                    "segments": {"Method": ["Face ID", "Password"]}
                },
                "Video Call": {
                    "segments": {"Clinic": ["Spanish Springs", "North Valleys", "Northwest Reno", "Galena"]},
                    "dur": [300, 900]
                },
                "Schedule Appointment": {
                    "segments": {"Type": ["In Clinic", "Virtual"], "Clinic Selected": ["Spanish Springs", "North Valleys", "Northwest Reno", "Galena"], "Condition": ["Coronavirus concerns", "Rash", "Travel vaccination", "Sinus infection symptoms", "Acute back pain"]},
                },
                "Used Messaging": {
                    "segments": {"Provided Care Plan": ["no", "yes"]},
                    "dur": [180, 300]
                },
                "Invoice Generated": {
                    "sum": [100, 10000]
                }
            }
        },
        {
            "_id": "defaultNavigation",
            "name": "Navigation",
            "isDefault": true,
            "up": {
                "Account Type": ["Basic", "Premium"]
            },
            "events": {
                "Login": {
                    "segments": {"Method": ["Face ID", "Password"]}
                },
                "Journey Configure": {
                    "segments": {"Vehicle Type": ["Fleet", "Individual"], "Range": ["0-10", "11-50", "51-100", "100+"]}
                },
                "Journey Begin": {
                    "segments": {"Vehicle Type": ["Fleet", "Individual"], "Range": ["0-10", "11-50", "51-100", "100+"]}
                },
                "Journey End": {
                    "segments": {"Vehicle Type": ["Fleet", "Individual"], "Range": ["0-10", "11-50", "51-100", "100+"]},
                    "sum": [10, 400],
                    "dur": [600, 12000]
                },
                "Settings Changed": {
                    "segments": {"Setting": ["Route preference", "Vehicle maker", "Vehicle model"]}
                },
            }
        },
        {
            "_id": "defaultEcommerce",
            "name": "eCommerce",
            "isDefault": true,
            "up": {
                "Account Type": ["Basic", "Prime"]
            },
            "events": {
                "Login": {
                    "segments": {"Method": ["Face ID", "Password"]}
                },
                "Add To Cart": {
                    "segments": {"Category": ["Books", "Electronics", "Home & Garden"]}
                },
                "Checkout - Begin": {},
                "Checkout - Address": {},
                "Checkout - Payment": {},
                "Checkout": {
                    "segments": {"Delivery Type": ["Standard", "Express"], "Items": ["1", "2-5", "6-10", "10+"]},
                    "sum": [50, 10000],
                    "dur": [60, 600]
                },
                "Settings Changed": {
                    "segments": {"Setting": ["Address", "Payment method"]}
                },
            }
        },
        {
            "_id": "defaultGaming",
            "name": "Gaming",
            "isDefault": true,
            "up": {
                "Experience Points": [10, 20, 30, 40, 50, 60, 70, 80, 90, 100]
            },
            "events": {
                "Login": {
                    "segments": {"Method": ["Facebook", "Google", "Email"]}
                },
                "Level Up": {
                    "segments": {"Level": [1, 2, 3, 4, 5, 6, 7, 8, 9, 10], "Used Level Pass": [true, false]},
                    "dur": [60, 600]
                },
                "Purchase": {
                    "segments": {"Item": ["Level Pass", "Lucky Item", "Item Storage Upgrade"]},
                    "sum": [1, 100]
                },
                "Share Score": {
                    "segments": {"To": ["Facebook", "Twitter", "Instagram"]}
                },
                "Invite Friends": {}
            }
        }
    ],

    /**
     * Generate random int between passed range
     * @param {number} min - min value of range
     * @param {number} max - max value of range
     * @returns {number} returns random number between min and max values
    **/
    getRandomInt: function(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    },

    /**
     * Capitalize first letter of string
     * @param {string} string - input string
     * @returns {string} returns string which first letter capitalized
    **/
    capitaliseFirstLetter: function(string) {
        return string.charAt(0).toUpperCase() + string.slice(1);
    },

    /**
     * Get property of prop object with parameter,
     * @param {string} name - name of property
     * @returns {object} returns random object
    **/
    getProp: function(name) {
        if (typeof countlyPopulatorHelper.props[name] === "function") {
            return countlyPopulatorHelper.props[name]();
        }
        else if (typeof countlyPopulatorHelper.props[name] !== "undefined") {
            return countlyPopulatorHelper.props[name][Math.floor(Math.random() * countlyPopulatorHelper.props[name].length)];
        }
    },

    /**
     * Create user properties with Facebook Login, Twitter Login,
     * Twitter Login name and Has Apple Watch Os properties
     * @param {object} templateUp user properties template, if available
     * @param {object} app app object only sends from script
     * @returns {object} returns user properties
    **/
    getUserProperties: function(templateUp, app) {
        var up = {populator: true};

        if (app) {
            if (app && app.type === "web" && (Math.random() > 0.5)) {
                up.utm_source = countlyPopulatorHelper.sources[countlyPopulatorHelper.getRandomInt(0, countlyPopulatorHelper.sources.length - 1)];
                up.utm_medium = "cpc";
                up.utm_campaign = countlyPopulatorHelper.campaigns[countlyPopulatorHelper.getRandomInt(0, countlyPopulatorHelper.campaigns.length - 1)].id;
            }
        }
        else {
            if (countlyGlobal.apps[countlyCommon.ACTIVE_APP_ID] && countlyGlobal.apps[countlyCommon.ACTIVE_APP_ID].type === "web" && (Math.random() > 0.5)) {
                up.utm_source = countlyPopulatorHelper.sources[countlyPopulatorHelper.getRandomInt(0, countlyPopulatorHelper.sources.length - 1)];
                up.utm_medium = "cpc";
                up.utm_campaign = countlyPopulatorHelper.campaigns[countlyPopulatorHelper.getRandomInt(0, countlyPopulatorHelper.campaigns.length - 1)].id;
            }
        }

        Object.keys(templateUp || {}).forEach(function(key) {
            var values = templateUp[key];
            up[key] = values[countlyPopulatorHelper.getRandomInt(0, values.length - 1)];
        });

        return up;
    },

    /**
     * Generate random string with size property
     * @param {number} size - length of random string
     * @returns {object} returns random string
     **/
    randomString: function(size) {
        var alphaChars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
        var generatedString = '';
        for (var index = 0; index < size; index++) {
            generatedString += alphaChars[countlyPopulatorHelper.getRandomInt(0, alphaChars.length - 1)];
        }
        return generatedString;
    },

    getId: function() {
    /**
         * Generate hash for id
         * @returns {string} returns string contains 4 characters
         **/
        function s4() {
            return Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1);
        }
        return s4() + s4() + '-' + s4() + '-' + s4() + '-' + s4() + '-' + s4() + s4() + s4();
    },

    getCrash: function(app) {
        var crash = {};
        crash._os = this.metrics._os;
        crash._os_version = this.metrics._os_version;
        crash._device = this.metrics._device;
        crash._manufacture = this.getProp("_manufacture");
        crash._resolution = this.metrics._resolution;
        crash._app_version = this.metrics._app_version;
        crash._cpu = this.getProp("_cpu");
        crash._opengl = this.getProp("_opengl");

        crash._ram_total = countlyPopulatorHelper.getRandomInt(1, 4) * 1024;
        crash._ram_current = countlyPopulatorHelper.getRandomInt(1, crash._ram_total);
        crash._disk_total = countlyPopulatorHelper.getRandomInt(1, 20) * 1024;
        crash._disk_current = countlyPopulatorHelper.getRandomInt(1, crash._disk_total);
        crash._bat_total = 100;
        crash._bat_current = countlyPopulatorHelper.getRandomInt(1, crash._bat_total);
        crash._orientation = (Math.random() > 0.5) ? "landscape" : "portrait";

        crash._root = (Math.random() > 0.5) ? true : false;
        crash._online = (Math.random() > 0.5) ? true : false;
        crash._signal = (Math.random() > 0.5) ? true : false;
        crash._muted = (Math.random() > 0.5) ? true : false;
        crash._background = (Math.random() > 0.5) ? true : false;

        crash._error = this.getError(app);
        crash._name = (crash._error.split('\n')[0] + "").trim();
        crash._logs = this.getLog();
        crash._nonfatal = (Math.random() > 0.5) ? true : false;
        crash._run = countlyPopulatorHelper.getRandomInt(1, 1800);

        var customs = ["facebook", "gideros", "admob", "chartboost", "googleplay"];
        crash._custom = {};
        for (var customsIndex = 0; customsIndex < customs.length; customsIndex++) {
            if (Math.random() > 0.5) {
                crash._custom[customs[customsIndex]] = countlyPopulatorHelper.getRandomInt(1, 2) + "." + countlyPopulatorHelper.getRandomInt(0, 9);
            }
        }

        return crash;
    },

    getError: function(app) {
        var errors = [];
        var error = "";
        var stacks = 0;
        var appTypeCondition = app ? app.type : countlyGlobal.apps[countlyCommon.ACTIVE_APP_ID];

        if (appTypeCondition === "web") {
            errors = ["EvalError", "InternalError", "RangeError", "ReferenceError", "SyntaxError", "TypeError", "URIError"];
            var err = new Error(errors[Math.floor(Math.random() * errors.length)], countlyPopulatorHelper.randomString(5) + ".js", countlyPopulatorHelper.getRandomInt(1, 100));
            return err.stack + "";
        }
        else if (this.platform === "Android") {
            errors = ["java.lang.RuntimeException", "java.lang.NullPointerException", "java.lang.NoSuchMethodError", "java.lang.NoClassDefFoundError", "java.lang.ExceptionInInitializerError", "java.lang.IllegalStateException"];
            error = errors[Math.floor(Math.random() * errors.length)] + ": com.domain.app.Exception<init>\n";
            stacks = countlyPopulatorHelper.getRandomInt(5, 9);
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
            stacks = countlyPopulatorHelper.getRandomInt(9, 19);
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
    },

    getLog: function() {
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

        var items = countlyPopulatorHelper.getRandomInt(5, 10);
        var logs = [];
        for (var itemIndex = 0; itemIndex < items; itemIndex++) {
            logs.push(actions[countlyPopulatorHelper.getRandomInt(0, actions.length - 1)]);
        }
        return logs.join("\n");
    },

    getTrace: function(app) {
        var trace = {};
        trace.stz = countlyPopulatorHelper.getRandomInt(this.startTs, this.endTs);
        trace.etz = countlyPopulatorHelper.getRandomInt(trace.stz, this.endTs);
        trace.stz *= 1000;
        trace.etz *= 1000;
        var rand = Math.random();
        var appTypeCondition = app ? app.type : countlyGlobal.apps[countlyCommon.ACTIVE_APP_ID].type;
        if (rand < 0.3) {
            trace.type = "device";
            trace.apm_metrics = {};
            if (appTypeCondition === "web") {
                trace.name = countlyPopulatorHelper.viewSegments.name[countlyPopulatorHelper.getRandomInt(0, countlyPopulatorHelper.viewSegments.name.length - 1)];
                trace.apm_metrics.first_paint = countlyPopulatorHelper.getRandomInt(0, 100);
                trace.apm_metrics.first_contentful_paint = countlyPopulatorHelper.getRandomInt(0, 500);
                trace.apm_metrics.dom_interactive = countlyPopulatorHelper.getRandomInt(0, 1000);
                trace.apm_metrics.dom_content_loaded_event_end = countlyPopulatorHelper.getRandomInt(0, 300);
                trace.apm_metrics.load_event_end = countlyPopulatorHelper.getRandomInt(0, 500);
                trace.apm_metrics.first_input_delay = countlyPopulatorHelper.getRandomInt(0, 500);
            }
            else {
                var device_traces = ["app_start", "app_in_background", "app_in_foreground"];
                trace.name = device_traces[countlyPopulatorHelper.getRandomInt(0, device_traces.length - 1)];
                trace.apm_metrics.duration = countlyPopulatorHelper.getRandomInt(0, 5000);
            }
        }
        else if (rand < 0.6) {
            trace.type = "device";
            trace.name = countlyPopulatorHelper.viewSegments.name[countlyPopulatorHelper.getRandomInt(0, countlyPopulatorHelper.viewSegments.name.length - 1)];
            trace.apm_metrics = {};
            trace.apm_metrics.slow_rendering_frames = countlyPopulatorHelper.getRandomInt(0, 100);
            trace.apm_metrics.frozen_frames = countlyPopulatorHelper.getRandomInt(0, 100);
        }
        else {
            trace.type = "network";
            trace.name = this.getProp("_source");
            trace.apm_metrics = {
                response_time: countlyPopulatorHelper.getRandomInt(0, 5000),
                response_payload_size: countlyPopulatorHelper.getRandomInt(0, 5000000),
                request_payload_size: countlyPopulatorHelper.getRandomInt(0, 5000000),
                response_code: (Math.random() > 0.5) ? countlyPopulatorHelper.getRandomInt(400, 500) : 200
            };
        }
        return trace;
    },

    getEvent: function(id, eventTemplates, scriptObject) {
        this.stats.e++;
        var event = {
            "key": id,
            "count": 1,
            "timestamp": this.ts,
            "hour": countlyPopulatorHelper.getRandomInt(0, 23),
            "dow": countlyPopulatorHelper.getRandomInt(0, 6)
        };

        this.ts += 1000;

        if (Array.isArray(eventTemplates)) {
            var eventTemplate = eventTemplates[countlyPopulatorHelper.getRandomInt(0, eventTemplates.length - 1)];
        }
        else {
            eventTemplate = eventTemplates;
        }

        if (eventTemplate && eventTemplate.duration) {
            event.dur = countlyPopulatorHelper.getRandomInt(eventTemplate.duration[0], eventTemplate.duration[1] || 10);
        }
        else if (id === "[CLY]_view") {
            event.dur = countlyPopulatorHelper.getRandomInt(0, 100);
        }

        if (eventTemplate && eventTemplate.sum) {
            event.sum = countlyPopulatorHelper.getRandomInt(eventTemplate.sum[0], eventTemplate.sum[1] || 10);
        }

        if (eventTemplate && eventTemplate.segments) {
            event.segmentation = {};
            Object.keys(eventTemplate.segments).forEach(function(key) {
                var values = eventTemplate.segments[key];
                event.segmentation[key] = values[countlyPopulatorHelper.getRandomInt(0, values.length - 1)];
            });
        }
        else if (id === "[CLY]_view") {
            event.segmentation = {};
            // var populatorType = $(".populator-template-name.cly-select").clySelectGetSelection().substr(7).toLowerCase();
            if (scriptObject) {
                var populatorType = null;
                if (scriptObject.populatorTemplateId.length <= 10) { //defaultTemplate
                    countlyPopulatorHelper.defaultTemplates.forEach(function(template) {
                        if (template.name === scriptObject.populatorTemplateId) {
                            populatorType = template._id;
                        }
                    });
                }
                else {
                    populatorType = scriptObject.populatorTemplateId;
                }
            }
            else {
                populatorType = countlyPopulator.getSelectedTemplate().substr(7).toLowerCase();
            }

            if (scriptObject) {
                Object.keys(countlyPopulatorHelper.viewSegments).forEach(function(key) {
                    var values = [];
                    if (scriptObject.app.type === "web" && key === "name") {
                        values = ["/populator/" + scriptObject.appKey + "/demo-" + populatorType + ".html"];
                    }
                    else {
                        values = countlyPopulatorHelper.viewSegments[key];
                    }
                    event.segmentation[key] = values[countlyPopulatorHelper.getRandomInt(0, values.length - 1)];
                });
            }
            else {
                Object.keys(countlyPopulatorHelper.viewSegments).forEach(function(key) {
                    var values = [];
                    if (countlyGlobal.apps[countlyCommon.ACTIVE_APP_ID].type === "web" && key === "name") {
                        values = countlyPopulatorHelper.getPageTemplates(populatorType);
                    }
                    else {
                        values = countlyPopulatorHelper.viewSegments[key];
                    }
                    event.segmentation[key] = values[countlyPopulatorHelper.getRandomInt(0, values.length - 1)];
                });
            }
        }
        else if (id === "[CLY]_orientation") {
            event.segmentation = {mode: (Math.random() > 0.5) ? "landscape" : "portrait"};
        }

        return [event];
    },

    getEvents: function(count, templateEvents, scriptObject) {
        if (scriptObject) {
            if (Object.keys(templateEvents).length === 0) {
                return [];
            }
        }
        else {
            if (!_.isObject(templateEvents) || Object.keys(templateEvents).length === 0) {
                return [];
            }
        }
        var events = [];
        var eventKeys = Object.keys(templateEvents || {});

        for (var eventIndex = 0; eventIndex < count; eventIndex++) {
            var eventKey = eventKeys[countlyPopulatorHelper.getRandomInt(0, eventKeys.length - 1)];
            events.push(this.getEvent(eventKey, templateEvents[eventKey], scriptObject)[0]);
        }

        return events;
    },

    getFeedbackEvents: function(scriptObject) {
        var events = [];
        if (scriptObject) {
            events.push(this.getRatingEvent(scriptObject));
            if (scriptObject.isPluginExists) {
                events.push(this.getNPSEvent(scriptObject));
                events.push(this.getSurveyEvent(scriptObject));
            }
        }
        else {
            events.push(this.getRatingEvent());
            if (countlyGlobal.plugins.indexOf("surveys") !== -1 && countlyAuth.validateCreate("surveys")) {
                events.push(this.getNPSEvent());
                events.push(this.getSurveyEvent());
            }
        }
        return events;
    },

    getRatingEvent: function(scriptObject) {
        this.stats.e++;

        var event = {
            "key": "[CLY]_star_rating",
            "count": 1,
            "timestamp": this.ts,
            "hour": countlyPopulatorHelper.getRandomInt(0, 23),
            "dow": countlyPopulatorHelper.getRandomInt(1, 6),
            "test": 1,
        };

        this.ts += 1000;
        event.segmentation = {};
        event.segmentation.email = scriptObject ? scriptObject.chance.email() : chance.email();
        event.segmentation.comment = scriptObject ? scriptObject.chance.sentence({words: 7}) : chance.sentence({words: 7});
        event.segmentation.rating = countlyPopulatorHelper.getRandomInt(1, 5);
        event.segmentation.app_version = this.metrics._app_version;
        event.segmentation.platform = this.metrics._os;
        if (countlyPopulatorHelper.ratingWidgetList.length) {
            event.segmentation.widget_id = countlyPopulatorHelper.ratingWidgetList[countlyPopulatorHelper.getRandomInt(0, countlyPopulatorHelper.ratingWidgetList.length - 1)]._id;
        }
        return event;
    },

    getNPSEvent: function(scriptObject) {
        this.stats.e++;

        var event = {
            "key": "[CLY]_nps",
            "count": 1,
            "timestamp": this.ts,
            "hour": countlyPopulatorHelper.getRandomInt(0, 23),
            "dow": countlyPopulatorHelper.getRandomInt(1, 6),
            "test": 1,
        };

        this.ts += 1000;
        event.segmentation = {};
        event.segmentation.comment = scriptObject ? scriptObject.chance.sentence({words: 7}) : chance.sentence({words: 7});
        event.segmentation.rating = countlyPopulatorHelper.getRandomInt(0, 10);
        event.segmentation.app_version = this.metrics._app_version;
        event.segmentation.platform = this.metrics._os;
        event.segmentation.shown = 1;
        if (countlyPopulatorHelper.npsWidgetList.length) {
            event.segmentation.widget_id = countlyPopulatorHelper.npsWidgetList[countlyPopulatorHelper.getRandomInt(0, countlyPopulatorHelper.npsWidgetList.length - 1)];
        }
        return event;
    },

    getSurveyEvent: function(scriptObject) {
        this.stats.e++;

        var event = {
            "key": "[CLY]_survey",
            "count": 1,
            "timestamp": this.ts,
            "hour": countlyPopulatorHelper.getRandomInt(0, 23),
            "dow": countlyPopulatorHelper.getRandomInt(1, 6),
            "test": 1,
        };

        this.ts += 1000;
        event.segmentation = {};
        event.segmentation.app_version = this.metrics._app_version;
        event.segmentation.platform = this.metrics._os;
        event.segmentation.shown = 1;
        var keys = Object.keys(countlyPopulatorHelper.surveyWidgetList);
        if (keys.length) {

            event.segmentation.widget_id = keys[countlyPopulatorHelper.getRandomInt(0, keys.length - 1)];

            var structure = countlyPopulatorHelper.surveyWidgetList[event.segmentation.widget_id];

            for (var z = 0; z < structure.questions.length; z++) {
                //"multi", "radio", "text", "dropdown", "rating"
                if (structure.questions[z].type === "text") {
                    event.segmentation["answ-" + structure.questions[z].id] = scriptObject ? scriptObject.chance.sentence({words: 7}) : chance.sentence({words: 7});
                }
                else if (structure.questions[z].type === "rating") {
                    event.segmentation["answ-" + structure.questions[z].id] = countlyPopulatorHelper.getRandomInt(0, 10);
                }
                else {
                    if (structure.questions[z].choices && structure.questions[z].choices.length > 0) {

                        var ch = [];
                        var chcount = 1;
                        if (structure.questions[z].type === "multi") { //multiple choices
                            chcount = countlyPopulatorHelper.getRandomInt(1, structure.questions[z].choices.length - 1);
                        }
                        var pp = countlyPopulatorHelper.getRandomInt(0, structure.questions[z].choices.length - 1);
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
    },

    getHeatmapEvents: function(scriptObject) {
        var events = this.getHeatmapEvent(scriptObject);

        if (Math.random() >= 0.5) {
            events = events.concat(this.getHeatmapEvent(scriptObject));

            if (Math.random() >= 0.8) {
                events = events.concat(this.getHeatmapEvent(scriptObject));
            }
        }

        return events;
    },

    getHeatmapEvent: function(scriptObject) {
        this.stats.e++;
        var populatorType = null;
        if (scriptObject) {
            if (scriptObject.populatorTemplateId.length <= 10) { //defaultTemplate
                countlyPopulatorHelper.defaultTemplates.forEach(function(template) {
                    if (template.name === scriptObject.populatorTemplateId) {
                        populatorType = template._id;
                    }
                });
            }
            else {
                populatorType = scriptObject.populatorTemplateId;
            }
        }
        else {
            populatorType = countlyPopulator.getSelectedTemplate().substr(7).toLowerCase();
        }

        var appKey = scriptObject ? scriptObject.appKey : countlyCommon.ACTIVE_APP_KEY;
        var views = ["/populator/" + appKey + "/demo-" + populatorType + ".html"];
        var event = {
            "key": "[CLY]_action",
            "count": 1,
            "timestamp": this.ts,
            "hour": countlyPopulatorHelper.getRandomInt(0, 23),
            "dow": countlyPopulatorHelper.getRandomInt(0, 6),
            "test": 1
        };
        var selectedOffsets = [{x: 468, y: 366}, {x: 1132, y: 87}, {x: 551, y: 87}, {x: 647, y: 87}, {x: 1132, y: 87}];

        this.ts += 1000;

        event.segmentation = {};
        event.segmentation.type = "click";

        var dice = countlyPopulatorHelper.getRandomInt(0, 6) % 2 === 0 ? true : false;
        if (dice) {
            var randomIndex = countlyPopulatorHelper.getRandomInt(0, selectedOffsets.length - 1);
            event.segmentation.x = selectedOffsets[randomIndex].x;
            event.segmentation.y = selectedOffsets[randomIndex].y;
        }
        else {
            event.segmentation.x = countlyPopulatorHelper.getRandomInt(0, 1440);
            event.segmentation.y = countlyPopulatorHelper.getRandomInt(0, 990);
        }

        event.segmentation.width = 1440;
        event.segmentation.height = 3586;
        event.segmentation.domain = scriptObject ? scriptObject.SERVER_URL : window.location.origin;
        event.segmentation.view = views[Math.floor(Math.random() * views.length)];
        return [event];
    },

    getScrollmapEvents: function(scriptObject) {
        var events = this.getScrollmapEvent(scriptObject);

        if (Math.random() >= 0.5) {
            events = events.concat(this.getScrollmapEvent(scriptObject));

            if (Math.random() >= 0.8) {
                events = events.concat(this.getScrollmapEvent(scriptObject));
            }
        }

        return events;
    },

    getScrollmapEvent: function(scriptObject) {
        this.stats.e++;
        // var populatorType = $(".populator-template-name.cly-select").clySelectGetSelection().substr(7).toLowerCase();
        var populatorType = null;
        var views = null;
        if (scriptObject) {
            if (scriptObject.populatorTemplateId.length <= 10) { //defaultTemplate
                countlyPopulatorHelper.defaultTemplates.forEach(function(template) {
                    if (template.name === scriptObject.populatorTemplateId) {
                        populatorType = template._id;
                    }
                });
            }
            else {
                populatorType = scriptObject.populatorTemplateId;
            }
            views = ["/populator/" + scriptObject.appKey + "/demo-" + populatorType + ".html"];
        }
        else {
            countlyPopulator.getSelectedTemplate().substr(7).toLowerCase();
            views = countlyPopulatorHelper.getPageTemplates(populatorType);
        }

        var event = {
            "key": "[CLY]_action",
            "count": 1,
            "timestamp": this.ts,
            "hour": countlyPopulatorHelper.getRandomInt(0, 23),
            "dow": countlyPopulatorHelper.getRandomInt(0, 6),
            "test": 1
        };
        this.ts += 1000;
        event.segmentation = {};
        event.segmentation.type = "scroll";
        // 0: min value of scrollY variable for demoPage
        // 3270: max value of scrollY variable for demoPage
        // 983: viewportHeight
        event.segmentation.y = countlyPopulatorHelper.getRandomInt(0, 3602) + 983;
        event.segmentation.width = 1440;
        event.segmentation.height = 3586;
        event.domain = scriptObject ? scriptObject.SERVER_URL : window.location.origin;
        event.segmentation.view = views[Math.floor(Math.random() * views.length)];
        return [event];
    },
    /**
     * Creates an array of html sample pages
     * @param {string} populatorType - populator template type ('banking', 'gaming', etc.)
     * @returns {array} returns an array of html pages based on populatorType
     **/
    getPageTemplates: function(populatorType) {
        return [
            "/populator/" + countlyCommon.ACTIVE_APP_KEY + "/demo-" + populatorType + ".html",
            "/populator/" + countlyCommon.ACTIVE_APP_KEY + "/demo-" + populatorType + "-1.html",
            "/populator/" + countlyCommon.ACTIVE_APP_KEY + "/demo-" + populatorType + "-2.html"
        ];
    }
};

if (typeof module !== 'undefined' && module.exports) {
    module.exports = countlyPopulatorHelper;
}