/*global _, chance, CountlyHelpers, countlyAuth, countlyGlobal, countlyCommon, countlyCohorts, $, jQuery, app*/
(function(countlyPopulator) {
    var metric_props = {
        mobile: ["_os", "_os_version", "_resolution", "_device", "_device_type", "_manufacturer", "_carrier", "_app_version", "_density", "_locale", "_store"],
        web: ["_os", "_os_version", "_resolution", "_device", "_device_type", "_app_version", "_density", "_locale", "_store", "_browser"],
        desktop: ["_os", "_os_version", "_resolution", "_app_version", "_locale"]
    };
    var props = {
        _os: ["Android", "iOS"],
        _os_web: ["Android", "iOS", "Windows", "MacOS"],
        _os_desktop: ["Windows", "MacOS", "Linux"],
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
        {"demo": 1, "apps": [countlyCommon.ACTIVE_APP_ID], "platforms": ["i", "a"], "tz": false, "auto": false, "type": "message", "messagePerLocale": {"default|t": "💥 Promotion! 💥", "default|0|t": "Get It", "default|1|t": "Cancel", "default|0|l": "theapp://promo/30off", "default|1|l": "theapp://promo/30off/cancel", "de|t": "💥 SALE! 💥", "de|0|t": "OK", "de|0|l": "theapp://promo/30off", "de|1|t": "Stornieren", "de|1|l": "theapp://promo/30off/cancel", "default": "HOT offers with 30% discount, only 6 hours left!", "default|p": {}, "default|tp": {}, "de|tp": {}, "de": "Abonnieren Sie jetzt mit 30% Rabatt, nur noch 6 Stunden!", "de|p": {}}, "locales": [{"value": "default", "title": "Default", "count": 200, "percent": 100}, {"value": "de", "title": "German", "count": 100, "percent": 50}, {"value": "en", "title": "English", "count": 100, "percent": 50}], "sound": "default", "url": "theapp://promo/30off", "source": "dash", "buttons": 2, "media": location.origin + "/images/push/sale.png", "autoOnEntry": false, "autoCohorts": []},
        {"demo": 2, "apps": [countlyCommon.ACTIVE_APP_ID], "platforms": ["i", "a"], "tz": false, "auto": false, "type": "message", "messagePerLocale": {"default|t": "💥 Promotion! 💥", "default|0|t": "Get It", "default|1|t": "Cancel", "default|0|l": "theapp://promo/30off", "default|1|l": "theapp://promo/30off/cancel", "de|t": "💥SALE! 💥", "de|0|t": "OK", "de|0|l": "theapp://promo/30off", "de|1|t": "Stornieren", "de|1|l": "theapp://promo/30off/cancel", "default": "Last chance! Only 3 hours left to get 30% discount!", "default|p": {}, "default|tp": {}, "de|tp": {}, "de": "Letzte Möglichkeit! Nur noch 3 Stunden, um 30% Rabatt zu erhalten", "de|p": {}}, "locales": [{"value": "default", "title": "Default", "count": 200, "percent": 100}, {"value": "de", "title": "German", "count": 100, "percent": 50}, {"value": "en", "title": "English", "count": 100, "percent": 50}], "sound": "default", "url": "theapp://promo/30off", "source": "dash", "buttons": 2, "media": location.origin + "/images/push/sale.png", "autoOnEntry": false, "autoCohorts": []},
        {"demo": 3, "apps": [countlyCommon.ACTIVE_APP_ID], "platforms": ["i", "a"], "tz": false, "auto": true, "type": "message", "messagePerLocale": {"default|t": "💥 Latest 💥", "default|0|t": "Go", "default|0|l": "theapp://offers", "default": "Check our latest offers!"}, "sound": "default", "source": "dash", "buttons": 1, "autoOnEntry": "events", "autoEvents": ["Login"], "autoTime": 576000, "autoCapMessages": 1, "autoCapSleep": 864000},
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
    var defaultTemplates = [
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
        var up = {populator: true};

        if (countlyGlobal.apps[countlyCommon.ACTIVE_APP_ID] && countlyGlobal.apps[countlyCommon.ACTIVE_APP_ID].type === "web" && (Math.random() > 0.5)) {
            up.utm_source = sources[getRandomInt(0, sources.length - 1)];
            up.utm_medium = "cpc";
            up.utm_campaign = campaigns[getRandomInt(0, campaigns.length - 1)].id;
        }

        Object.keys(templateUp || {}).forEach(function(key) {
            var values = templateUp[key];
            up[key] = values[getRandomInt(0, values.length - 1)];
        });

        return up;
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
     * Generate a user with random properties and actions
     * @param {object} templateUp user properties template, if available
     **/
    function getUser(templateUp) {
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

        this.hasSession = false;
        this.ip = predefined_ip_addresses[Math.floor(chance.random() * (predefined_ip_addresses.length - 1))];
        if ((totalCountWithoutUserProps < totalUserCount / 3)) {
            this.userdetails = { custom: getUserProperties(templateUp) };
            totalCountWithoutUserProps++;
        }
        else {
            this.userdetails = { name: chance.name(), username: chance.twitter().substring(1), email: chance.email(), organization: capitaliseFirstLetter(chance.word()), phone: chance.phone(), gender: chance.gender().charAt(0), byear: chance.birthday().getFullYear(), custom: getUserProperties(templateUp) };
        }
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

        this.getEvent = function(id, eventTemplates) {
            this.stats.e++;

            var event = {
                "key": id,
                "count": 1,
                "timestamp": this.ts,
                "hour": getRandomInt(0, 23),
                "dow": getRandomInt(0, 6)
            };

            this.ts += 1000;

            if (Array.isArray(eventTemplates)) {
                var eventTemplate = eventTemplates[getRandomInt(0, eventTemplates.length - 1)];
            }
            else {
                eventTemplate = eventTemplates;
            }

            if (eventTemplate && eventTemplate.duration) {
                event.dur = getRandomInt(eventTemplate.duration[0], eventTemplate.duration[1] || 10);
            }
            else if (id === "[CLY]_view") {
                event.dur = getRandomInt(0, 100);
            }

            if (eventTemplate && eventTemplate.sum) {
                event.sum = getRandomInt(eventTemplate.sum[0], eventTemplate.sum[1] || 10);
            }

            if (eventTemplate && eventTemplate.segments) {
                event.segmentation = {};
                Object.keys(eventTemplate.segments).forEach(function(key) {
                    var values = eventTemplate.segments[key];
                    event.segmentation[key] = values[getRandomInt(0, values.length - 1)];
                });
            }
            else if (id === "[CLY]_view") {
                event.segmentation = {};
                // var populatorType = $(".populator-template-name.cly-select").clySelectGetSelection().substr(7).toLowerCase();
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

            return [event];
        };


        this.getEvents = function(count, templateEvents) {
            if (!_.isObject(templateEvents) || Object.keys(templateEvents).length === 0) {
                return [];
            }

            var events = [];
            var eventKeys = Object.keys(templateEvents || {});

            for (var eventIndex = 0; eventIndex < count; eventIndex++) {
                var eventKey = eventKeys[getRandomInt(0, eventKeys.length - 1)];
                events.push(this.getEvent(eventKey, templateEvents[eventKey])[0]);
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
            if (ratingWidgetList.length) {
                event.segmentation.widget_id = ratingWidgetList[getRandomInt(0, ratingWidgetList.length - 1)]._id;
            }
            return event;
        };

        this.getNPSEvent = function() {
            this.stats.e++;

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
            event.segmentation.app_version = this.metrics._app_version;
            event.segmentation.platform = this.metrics._os;
            event.segmentation.shown = 1;
            if (npsWidgetList.length) {
                event.segmentation.widget_id = npsWidgetList[getRandomInt(0, npsWidgetList.length - 1)];
            }
            return event;
        };

        this.getSurveyEvent = function() {
            this.stats.e++;

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
            event.segmentation.app_version = this.metrics._app_version;
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

        this.createUsersForAB = function(device_id, callback) {
            $.ajax({
                type: "GET",
                url: countlyCommon.API_URL + "/o/sdk",
                data: {
                    app_key: countlyCommon.ACTIVE_APP_KEY,
                    device_id: device_id,
                    keys: JSON.stringify([abExampleName]),
                    method: "ab"
                },
                success: callback,
                error: callback
            });
        };

        this.getHeatmapEvent = function() {
            this.stats.e++;
            // var populatorType = $(".populator-template-name.cly-select").clySelectGetSelection().substr(7).toLowerCase();
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
            this.stats.e++;
            // var populatorType = $(".populator-template-name.cly-select").clySelectGetSelection().substr(7).toLowerCase();
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

        this.startSession = function(template) {
            this.ts = this.ts + 60 * 60 * 24 + 100;
            this.stats.s++;
            var req = {};
            var events;

            if (!this.isRegistered) {
                this.isRegistered = true;
                this.stats.u++;
                // note login event was here
                events = this.getEvent("[CLY]_view", template && template.events && template.events["[CLY]_view"]).concat(this.getEvent("[CLY]_orientation", template && template.events && template.events["[CLY]_orientation"]), this.getEvents(4, template && template.events));
                req = {timestamp: this.ts, begin_session: 1, metrics: this.metrics, user_details: this.userdetails, events: events, apm: this.getTrace()};
                this.stats.p++;
                req.events = req.events.concat(this.getHeatmapEvents());
                req.events = req.events.concat(this.getFeedbackEvents());
                req.events = req.events.concat(this.getScrollmapEvents());
            }
            else {
                events = this.getEvent("[CLY]_view", template && template.events && template.events["[CLY]_view"]).concat(this.getEvent("[CLY]_orientation", template && template.events && template.events["[CLY]_orientation"]), this.getEvents(4, template && template.events));
                req = {timestamp: this.ts, begin_session: 1, events: events, apm: this.getTrace()};
            }

            if (Math.random() > 0.10) {
                this.hasPush = true;
                req.token_session = 1;
                req.test_mode = 0;
                req[this.platform.toLowerCase() + "_token"] = randomString(8);
            }

            this.stats.c++;
            req.crash = this.getCrash();

            var consents = ["sessions", "events", "views", "scrolls", "clicks", "forms", "crashes", "push", "attribution", "users"];
            req.consent = {};

            for (var consentIndex = 0; consentIndex < consents.length; consentIndex++) {
                req.consent[consents[consentIndex]] = (Math.random() > 0.8) ? false : true;
            }

            this.hasSession = true;
            this.request(req);
            this.timer = setTimeout(function() {
                that.extendSession(template);
            }, timeout);
        };

        this.startSessionForAb = function() {
            this.createUsersForAB(this.id);
        };

        this.extendSession = function(template) {
            if (this.hasSession) {
                var req = {};
                this.ts = this.ts + 30;
                this.stats.x++;
                this.stats.d += 30;
                var events = this.getEvent("[CLY]_view", template && template.events && template.events["[CLY]_view"]).concat(this.getEvent("[CLY]_orientation", template && template.events && template.events["[CLY]_orientation"]), this.getEvents(2, template && template.events));
                req = {timestamp: this.ts, session_duration: 30, events: events, apm: this.getTrace()};
                if (Math.random() > 0.8) {
                    this.timer = setTimeout(function() {
                        that.extendSession(template);
                    }, timeout);
                }
                else {
                    if (Math.random() > 0.5) {
                        this.stats.c++;
                        req.crash = this.getCrash();
                    }
                    this.timer = setTimeout(function() {
                        that.endSession(template);
                    }, timeout);
                }
                this.request(req);
            }
        };

        this.endSession = function(template) {
            if (this.timer) {
                clearTimeout(this.timer);
                this.timer = null;
            }
            if (this.hasSession) {
                this.hasSession = false;
                var events = this.getEvents(2, template && template.events);
                this.request({timestamp: this.ts, end_session: 1, events: events, apm: this.getTrace()});
            }
        };

        this.request = function(params) {
            this.stats.r++;
            params.device_id = this.id;
            params.ip_address = this.ip;
            params.hour = getRandomInt(0, 23);
            params.dow = getRandomInt(0, 6);
            params.stats = JSON.parse(JSON.stringify(this.stats));
            params.populator = true;
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
    var totalUserCount = 0;
    var totalCountWithoutUserProps = 0;
    var queued = 0;
    var abExampleCount = 1;
    var abExampleName = "Pricing";
    var totalStats = {u: 0, s: 0, x: 0, d: 0, e: 0, r: 0, b: 0, c: 0, p: 0};
    var _templateType = '';
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

        generateRatingWidgets(function() {
            if (countlyGlobal.plugins.indexOf("surveys") !== -1 && countlyAuth.validateCreate("surveys")) {
                generateNPSWidgets(function() {
                    setTimeout(function() {
                        generateSurveyWidgets1(done);
                    }, 1000);

                    setTimeout(function() {
                        generateSurveyWidgets2(done);
                    }, 3000);

                    setTimeout(function() {
                        generateSurveyWidgets3(done);
                    }, 5000);
                });
            }
            else {
                done();
            }
        });
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
                for (var clickIndex = 0; clickIndex < (campaigns.length * 33); clickIndex++) {
                    clickCampaign(campaigns[getRandomInt(0, campaigns.length - 1)].id);
                }
                setTimeout(callback, 3000);
            }
        }

        recursiveCallback();
    }


    /**
     * Generate retention user
     * @param {date} ts - date as timestamp
     * @param {number} userCount - users count will be generated
     * @param {array} ids - ids array
     * @param {object} templateUp user properties template, if available
     * @param {callback} callback - callback function
     **/
    function generateRetentionUser(ts, userCount, ids, templateUp, callback) {
        var bulker = [];
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

                var userdetails = new getUser(templateUp);
                userdetails.begin_session = 1;
                userdetails.device_id = userIndex + "" + ids[j];
                userdetails.dow = getRandomInt(0, 6);
                userdetails.hour = getRandomInt(0, 23);
                userdetails.ip_address = predefined_ip_addresses[Math.floor(chance.random() * (predefined_ip_addresses.length - 1))];
                delete userdetails.ip;
                userdetails.request_id = userIndex + "" + ids[j] + "_" + ts;
                userdetails.timestamp = ts;
                delete userdetails.metrics;
                userdetails.metrics = metrics;

                bulker.push(userdetails);
                totalStats.s++;
                totalStats.u++;
            }
        }

        totalStats.r++;
        for (var index = 0; index < bulker.length; index++) {
            bulker[index].startSession(templateUp);
        }

        callback("");
    }

    /**
     * Generate retentions
     * @param {object} templateUp user properties template, if available
     * @param {callback} callback - callback function
     **/
    function generateRetention(templateUp, callback) {
        if (typeof countlyRetention === "undefined") {
            callback();
            return;
        }
        var ts = endTs - 60 * 60 * 24 * 9;
        var ids = [ts];
        var userCount = 10;
        var retentionCall = 8; // number of generateRetentionUser function call
        var retentionLastUserCount = (userCount - retentionCall) + 1;

        var idCount = 1;
        for (var i = userCount; i >= retentionLastUserCount; i--) { //total retension user
            totalUserCount += idCount * i;
            idCount++;
        }

        totalUserCount += userAmount + retentionCall; // campaign users
        totalCountWithoutUserProps = 0;

        generateRetentionUser(ts, userCount--, ids, templateUp, function() {
            ts += 60 * 60 * 24;
            ids.push(ts);
            generateRetentionUser(ts, userCount--, ids, templateUp, function() {
                ts += 60 * 60 * 24;
                ids.push(ts);
                generateRetentionUser(ts, userCount--, ids, templateUp, function() {
                    ts += 60 * 60 * 24;
                    ids.push(ts);
                    generateRetentionUser(ts, userCount--, ids, templateUp, function() {
                        ts += 60 * 60 * 24;
                        ids.push(ts);
                        generateRetentionUser(ts, userCount--, ids, templateUp, function() {
                            ts += 60 * 60 * 24;
                            ids.push(ts);
                            generateRetentionUser(ts, userCount--, ids, templateUp, function() {
                                ts += 60 * 60 * 24;
                                ids.push(ts);
                                generateRetentionUser(ts, userCount--, ids, templateUp, function() {
                                    ts += 60 * 60 * 24;
                                    ids.push(ts);
                                    generateRetentionUser(ts, userCount--, ids, templateUp, callback);
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

    /**
     * Serializes a template object members for API use
     * @param {object} template a template object
     * @returns {object} an API-safe template object
     **/
    function serializeTemplate(template) {
        if (template && template.up && !_.isString(template.up)) {
            delete template.up[""]; // delete user properties without keys

            if (Object.keys(template.up).length === 0) {
                delete template.up;
            }
            else {
                template.up = JSON.stringify(template.up);
            }
        }

        if (template && template.events && !_.isString(template.events)) {
            delete template.events[""]; // delete events without keys
            Object.keys(template.events).forEach(function(key) {
                var event = template.events[key];

                if (event.segments) {
                    delete event.segments[""];
                }

                if (event.segments && event.segments.length === 0) {
                    delete event.segments;
                }

                template.events[key] = event;
            });

            if (template.events.length === 0) {
                delete template.events;
            }
            else {
                template.events = JSON.stringify(template.events);
            }
        }
        template.app_id = countlyCommon.ACTIVE_APP_ID;
        return template;
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
    countlyPopulator.generateUsers = function(amount, template) {
        this.currentTemplate = template;
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
            var u = new getUser(template && template.up);
            users.push(u);
            u.timer = setTimeout(function() {
                u.startSession(template);
            }, Math.random() * timeout);
        }

        var seg = {};

        if (template && template.name) {
            seg.template = template.name;
        }

        app.recordEvent({
            "key": "populator-execute",
            "count": 1,
            "segmentation": seg
        });

        /**
         * Start user session process
         * @param {object} u - user object
         **/
        function processUser(u) {
            if (u && !u.hasSession) {
                u.timer = setTimeout(function() {
                    u.startSession(template);
                }, Math.random() * timeout);
            }
        }
        /**
         * Start user session process for AB
         * @param {object} u - user object
         **/
        function processUserForAb(u) {
            if (u && !u.hasSession) {
                u.timer = setTimeout(function() {
                    u.startSessionForAb();
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
        /**
         * Start user session process
         * @param {object} u - user object
         **/
        function processUsersForAb() {
            for (var userAmountIndex = 0; userAmountIndex < amount; userAmountIndex++) {
                processUserForAb(users[userAmountIndex]);
            }
        }
        if ((countlyGlobal.plugins.indexOf("star-rating") !== -1 && countlyAuth.validateCreate("star-rating")) || countlyGlobal.plugins.indexOf("ab-testing") !== -1 && countlyAuth.validateCreate("ab-testing")) {
            for (var campaignAmountIndex = 0; campaignAmountIndex < amount; campaignAmountIndex++) {
                createUser();
            }
        }

        if (countlyGlobal.plugins.indexOf("star-rating") !== -1 && countlyAuth.validateCreate("star-rating")) {
            generateWidgets(function() {
                generateRetention(template && template.up, function() {
                    generateCampaigns(function() {
                        // Generate campaigns conversion for web
                        if (countlyGlobal.apps[countlyCommon.ACTIVE_APP_ID] && countlyGlobal.apps[countlyCommon.ACTIVE_APP_ID].type === "web") {
                            setTimeout(reportConversions, timeout);
                        }
                        setTimeout(processUsers, timeout);
                    });
                });
            });
        }

        if (countlyGlobal.plugins.indexOf("ab-testing") !== -1 && countlyAuth.validateCreate("ab-testing")) {
            abExampleName = "Pricing" + abExampleCount++;
            generateAbTests(function() {
                processUsersForAb();
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

        //if (countlyGlobal.plugins.indexOf("star-rating") !== -1 && countlyAuth.validateCreate("star-rating")) {
        //    generateWidgets(function() {});
        //}
    };

    countlyPopulator.stopGenerating = function(callback) {
        stopCallback = callback;
        generating = false;

        var u;
        for (var userGenerationIndex = 0; userGenerationIndex < users.length; userGenerationIndex++) {
            u = users[userGenerationIndex];
            if (u) {
                u.endSession(this.currentTemplate);
            }
        }
        users = [];


        countlyPopulator.ensureJobs();

        if (stopCallback) {
            stopCallback(!countlyPopulator.bulking);
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
                },
                error: function() {
                    queued--;
                    $(".populate-stats-br").text(queued);
                    countlyPopulator.bulking = false;
                    countlyPopulator.sync();
                }
            });
        }
    };

    countlyPopulator.ensureJobs = function() {
        messages.forEach(function(m) {
            m.apps = [countlyCommon.ACTIVE_APP_ID];
        });

        var template = this.currentTemplate || {};

        if (typeof countlyCohorts !== "undefined" && countlyAuth.validateCreate('cohorts')) {
            if (template && template.events && Object.keys(template.events).length > 0) {
                var firstEventKey = Object.keys(template.events)[0];

                if (template.up && Object.keys(template.up).length > 0) {
                    var firstUserProperty = Object.keys(template.up)[0];
                    var firstUserPropertyValue = JSON.stringify(template.up[firstUserProperty][0]);

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



        createMessage(messages[0]);
        createMessage(messages[1]);
        createMessage(messages[2]);
    };

    countlyPopulator.getSelectedTemplate = function() {
        return _templateType;
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
                    CountlyHelpers.notify({message: $.i18n.prop("populator.failed-to-fetch-template", templateId), type: "error"});
                }
            });
        }
    };

    countlyPopulator.getTemplates = function(callback) {
        $.ajax({
            type: "GET",
            url: countlyCommon.API_URL + "/o/populator/templates",
            data: {
                app_id: countlyCommon.ACTIVE_APP_ID
            },
            success: function(templates) {
                callback(templates.concat(defaultTemplates));
            },
            error: function() {
                CountlyHelpers.notify({message: $.i18n.map["populator.failed-to-fetch-templates"], type: "error"});
            }
        });
    };

    countlyPopulator.createTemplate = function(template, callback) {
        $.ajax({
            type: "GET",
            url: countlyCommon.API_URL + "/i/populator/templates/create",
            data: serializeTemplate(template),
            success: callback || function() {},
            error: function() {
                CountlyHelpers.notify({message: $.i18n.map["populator.failed-to-create-template"], type: "error"});
            }
        });
    };

    countlyPopulator.editTemplate = function(templateId, newTemplate, callback) {
        newTemplate.template_id = templateId;

        var foundDefault = defaultTemplates.find(function(template) {
            return template._id === templateId;
        });

        if (typeof foundDefault !== "undefined") {
            // this should never happen
        }
        else {
            $.ajax({
                type: "GET",
                url: countlyCommon.API_URL + "/i/populator/templates/edit",
                data: serializeTemplate(newTemplate),
                success: callback || function() {},
                error: function() {
                    CountlyHelpers.notify({message: $.i18n.prop("populator.failed-to-edit-template", templateId), type: "error"});
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
                    CountlyHelpers.notify({message: $.i18n.prop("populator.failed-to-remove-template", templateId), type: "error"});
                }
            });
        }
    };
}(window.countlyPopulator = window.countlyPopulator || {}, jQuery));
