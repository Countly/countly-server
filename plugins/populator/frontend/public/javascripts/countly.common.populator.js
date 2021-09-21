/* global countlyCommon, CountlyHelpers, countlyGlobal, faker, _, $, Vue, countlyVue */

(function(countlyPopulator) {
    var metricProps = {
        mobile: ["_os_version", "_resolution", "_device", "_device_type", "_manufacturer", "_carrier", "_app_version", "_density", "_locale", "_store"],
        web: ["_os_version", "_resolution", "_device", "_device_type", "_app_version", "_density", "_locale", "_store", "_browser"],
        desktop: ["_os_version", "_resolution", "_app_version", "_locale"]
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
            return faker.datatype.number({min: 1, max: 9}) + "." + faker.datatype.number({min: 0, max: 5});
        },
        _resolution: ["320x480", "768x1024", "640x960", "1536x2048", "320x568", "640x1136", "480x800", "240x320", "540x960", "480x854", "240x400", "360x640", "800x1280", "600x1024", "600x800", "768x1366", "720x1280", "1080x1920"],
        _device_android: ["GT-S5830L", "HTC6525LVW", "MB860", "LT18i", "LG-P500", "Desire V", "Wildfire S A510e"],
        _device_ios: ["iPhone8,1", "iPhone9,1", "iPhone9,2", "iPod7,1", "iPad3,6"],
        _device_windows_phone: ["Lumia 535", "Lumia 540", "Lumia 640 XL"],
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
            return faker.datatype.number({min: 1, max: 3}) + "." + faker.datatype.number({min: 0, max: 5});
        },
        _locale: ["en_CA", "fr_FR", "de_DE", "it_IT", "ja_JP", "ko_KR", "en_US"],
        _browser: ["Opera", "Chrome", "Internet Explorer", "Safari", "Firefox"],
        _store: ["com.android.vending", "com.google.android.feedback", "com.google.vending", "com.slideme.sam.manager", "com.amazon.venezia", "com.sec.android.app.samsungapps", "com.nokia.payment.iapenabler", "com.qihoo.appstore", "cn.goapk.market", "com.wandoujia.phoenix2", "com.hiapk.marketpho", "com.hiapk.marketpad", "com.dragon.android.pandaspace", "me.onemobile.android", "com.aspire.mm", "com.xiaomi.market", "com.miui.supermarket", "com.baidu.appsearch", "com.tencent.android.qqdownloader", "com.android.browser", "com.bbk.appstore", "cm.aptoide.pt", "com.nduoa.nmarket", "com.rim.marketintent", "com.lenovo.leos.appstore", "com.lenovo.leos.appstore.pad", "com.keenhi.mid.kitservice", "com.yingyonghui.market", "com.moto.mobile.appstore", "com.aliyun.wireless.vos.appstore", "com.appslib.vending", "com.mappn.gfan", "com.diguayouxi", "um.market.android", "com.huawei.appmarket", "com.oppo.market", "com.taobao.appcenter"],
        _source: ["https://www.google.lv/search?q=countly+analytics", "https://www.google.co.in/search?q=mobile+analytics", "https://www.google.ru/search?q=product+analytics", "http://stackoverflow.com/questions?search=what+is+mobile+analytics", "http://stackoverflow.com/unanswered?search=game+app+analytics", "http://stackoverflow.com/tags?search=product+dashboard", "http://r.search.yahoo.com/?query=analytics+product+manager"]
    };

    var sdkLogActions = [
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

    var viewSegments = {
        name: ["Login", "Home", "Dashboard", "Main View", "Detail View Level 1", "Detail View Level 2", "Profile", "Settings", "About", "Privacy Policy", "Terms and Conditions"],
        visit: [1],
        start: [0, 1],
        exit: [0, 1],
        bounce: [0, 1],
        segment: ["Android", "iOS", "Windows Phone"]
    };

    // eslint-disable-next-line no-unused-vars
    var messages = [
        {"demo": 1, "apps": [countlyCommon.ACTIVE_APP_ID], "platforms": ["i", "a"], "tz": false, "auto": false, "type": "message", "messagePerLocale": {"default|t": "💥 Promotion! 💥", "default|0|t": "Get It", "default|1|t": "Cancel", "default|0|l": "theapp://promo/30off", "default|1|l": "theapp://promo/30off/cancel", "de|t": "💥 SALE! 💥", "de|0|t": "OK", "de|1|t": "Stornieren", "default": "HOT offers with 30% discount, only 6 hours left!", "default|p": {}, "default|tp": {}, "de|tp": {}, "de": "Abonnieren Sie jetzt mit 30% Rabatt, nur noch 6 Stunden!", "de|p": {}}, "locales": [{"value": "default", "title": "Default", "count": 200, "percent": 100}, {"value": "de", "title": "German", "count": 100, "percent": 50}, {"value": "en", "title": "English", "count": 100, "percent": 50}], "sound": "default", "url": "theapp://promo/30off", "source": "dash", "buttons": 2, "media": location.origin + "/images/push/sale.png", "autoOnEntry": false, "autoCohorts": []},
        {"demo": 2, "apps": [countlyCommon.ACTIVE_APP_ID], "platforms": ["i", "a"], "tz": false, "auto": false, "type": "message", "messagePerLocale": {"default|t": "💥 Promotion! 💥", "default|0|t": "Get It", "default|1|t": "Cancel", "default|0|l": "theapp://promo/30off", "default|1|l": "theapp://promo/30off/cancel", "de|t": "💥 SALE! 💥", "de|0|t": "OK", "de|1|t": "Stornieren", "default": "Last chance! Only 3 hours left to get 30% discount!", "default|p": {}, "default|tp": {}, "de|tp": {}, "de": "Letzte Möglichkeit! Nur noch 3 Stunden, um 30% Rabatt zu erhalten", "de|p": {}}, "locales": [{"value": "default", "title": "Default", "count": 200, "percent": 100}, {"value": "de", "title": "German", "count": 100, "percent": 50}, {"value": "en", "title": "English", "count": 100, "percent": 50}], "sound": "default", "url": "theapp://promo/30off", "source": "dash", "buttons": 2, "media": location.origin + "/images/push/sale.png", "autoOnEntry": false, "autoCohorts": []},
        {"demo": 3, "apps": [countlyCommon.ACTIVE_APP_ID], "platforms": ["i", "a"], "tz": false, "auto": true, "type": "message", "messagePerLocale": {"default|t": "What your friends don't know", "default|0|t": "Share", "default|1|t": "Button 2", "default|0|l": "theapp://scores/share", "default|tp": {}, "default|p": {}, "default": "... is your personal best score! Share it now!"}, "locales": [{"value": "default", "title": "Default", "count": 200, "percent": 100}, {"value": "de", "title": "German", "count": 100, "percent": 50}, {"value": "en", "title": "English", "count": 100, "percent": 50}], "sound": "default", "source": "dash", "buttons": 1, "autoOnEntry": true, "autoCohorts": [], "autoTime": 57600000, "autoCapMessages": 1, "autoCapSleep": 86400000}
    ];

    var predefinedIPAddresses = ["2.167.106.72", "4.69.238.178", "3.112.23.176", "13.32.136.0", "4.69.130.86", "4.69.208.18", "17.67.198.23", "5.145.169.96", "2.59.88.2", "17.86.219.128", "23.65.126.2", "4.14.242.30", "14.192.76.3", "4.68.30.78", "5.38.128.2", "31.40.128.2", "5.145.169.100", "62.67.185.16", "14.139.54.208", "62.40.112.206", "14.192.192.1"];

    var campaigns = [
        {id: "email", name: "Email campaign", cost: "0.1", type: "click"},
        {id: "email2", name: "Email campaign 2", cost: "0.2", type: "install"},
        {id: "sms", name: "SMS campaign", cost: "0.3", type: "install"},
        {id: "cpc", name: "Cross promotion campaign", cost: "1", type: "install"},
        {id: "blog", name: "Blog post campaign 1", cost: "5", type: "click"},
        {id: "blog2", name: "Blog post campaign 2", cost: "10", type: "install"}
    ];

    var sources = ["facebook", "gideros", "admob", "chartboost", "googleplay"];

    // eslint-disable-next-line no-unused-vars
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

    // eslint-disable-next-line require-jsdoc
    function chancePercent(percent) {
        return faker.datatype.number({min: 1, max: 100}) <= percent;
    }

    /**
    * Create user properties with Facebook Login, Twitter Login,
    * Twitter Login name and Has Apple Watch Os properties
    * @param {object} templateUp user properties template, if available
    * @returns {object} returns user properties
    **/
    function generateUserProperties(templateUp) {
        var up = {populator: true};

        if (countlyGlobal.apps[countlyCommon.ACTIVE_APP_ID] && countlyGlobal.apps[countlyCommon.ACTIVE_APP_ID].type === "web" && chancePercent(50)) {
            up.utm_source = faker.random.arrayElement(sources);
            up.utm_medium = "cpc";
            up.utm_campaign = faker.random.arrayElement(campaigns).id;
        }

        Object.keys(templateUp || {}).forEach(function(key) {
            up[key] = faker.random.arrayElement(templateUp[key]);
        });

        return up;
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
            return faker.random.arrayElement(props[name]);
        }
    }

    /**
    * Generate a user with random properties and actions
    * @param {object} templateUp user properties template, if available
    **/
    function User(templateUp, state, syncFn) {
        var self = this;

        this.appType = countlyGlobal.apps[countlyCommon.ACTIVE_APP_ID] && countlyGlobal.apps[countlyCommon.ACTIVE_APP_ID].type || "mobile";
        this.device_id = faker.datatype.uuid();
        this.isRegistered = false;
        this.hasSession = false;
        this.ip = faker.random.arrayElement(predefinedIPAddresses);

        var gender = (chancePercent(50) ? "male" : "female"),
            firstName = faker.name.firstName(gender),
            lastName = faker.name.lastName(),
            currentYear = new Date().getFullYear();

        this.userDetails = {
            name: faker.name.findName(firstName, lastName),
            username: faker.internet.userName(firstName, lastName),
            email: faker.internet.email(firstName, lastName),
            organization: faker.company.companyName(),
            phone: faker.phone.phoneNumber(),
            gender: gender.charAt(0).toUpperCase(),
            byear: faker.datatype.number({min: currentYear - 80, max: currentYear - 20}),
            custom: generateUserProperties(templateUp)
        };

        this.events = [];
        this.ts = faker.datatype.number({min: state.startTs, max: state.endTs});

        if (this.appType === "web") {
            this.platform = getProp("_os_web");
        }
        else if (this.appType === "desktop") {
            this.platform = getProp("_os_desktop");
        }
        else {
            this.platform = getProp("_os");
        }

        this.metrics = {
            "_os": this.platform
        };

        metricProps[this.appType].forEach(function(metricProp) {
            if (metricProp === "_store" && self.appType === "web") {
                self.metrics[metricProp] = getProp("_source");
            }
            else {
                // check os specific metric
                if (typeof props[metricProp + "_" + self.platform.toLowerCase().replace(/\s/g, "_")] !== "undefined") {
                    self.metrics[metricProp] = getProp(metricProp + "_" + self.platform.toLowerCase().replace(/\s/g, "_"));
                }
                // otherwise, use default metric set
                else {
                    self.metrics[metricProp] = getProp(metricProp);
                }
            }
        });

        this.generateStacktrace = function() {
            var errors = [],
                error = "";

            if (self.appType === "web") {
                errors = ["EvalError", "InternalError", "RangeError", "ReferenceError", "SyntaxError", "TypeError", "URIError"];
                var errorObj = new Error(faker.random.arrayElement(errors), faker.datatype.string(5) + ".js", faker.datatype.number({min: 1, max: 100}));

                return errorObj.stack + "";
            }
            else if (this.platform === "Android") {
                errors = [
                    "java.lang.RuntimeException",
                    "java.lang.NullPointerException",
                    "java.lang.NoSuchMethodError",
                    "java.lang.NoClassDefFoundError",
                    "java.lang.ExceptionInInitializerError",
                    "java.lang.IllegalStateException"
                ];

                error = faker.random.arrayElement(errors) + ": com.domain.app.Exception<init>\n";
                Array(faker.datatype.number({min: 5, max: 9})).fill(null).forEach(function(_, lineNumber) {
                    error += "at com.domain.app.<init>(Activity.java:" + (lineNumber * 32) + ")\n";
                });

                return error;
            }
            else if (this.platform === "iOS") {
                errors = [
                    "CoreFoundation                  0x182e3adb0 __exceptionPreprocess + 124",
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

                Array(faker.datatype.number({min: 9, max: 19})).fill(null).forEach(function(_, lineNumber) {
                    error += lineNumber + " " + faker.random.arrayElement(errors) + "\n";
                });

                return error;
            }
            else {
                return "System.ArgumentOutOfRangeException\n" +
                "   at System.ThrowHelper.ThrowArgumentOutOfRangeException()\n" +
                "   at System.Collections.Generic.List`1.get_Item(Int32 index)\n" +
                "   at StorePuzzle.PuzzleRenderer.HandleTileReleased(Object sender, PointerRoutedEventArgs e)";
            }
        };

        this.generateCrash = function() {
            var crash = {};

            crash._os = self.metrics._os;
            crash._os_version = self.metrics._os_version;
            crash._device = self.metrics._device;
            crash._manufacture = getProp("_manufacture");
            crash._resolution = self.metrics._resolution;
            crash._app_version = self.metrics._app_version;
            crash._cpu = getProp("_cpu");
            crash._opengl = getProp("_opengl");

            crash._ram_total = faker.datatype.number({min: 1, max: 4}) * 1024;
            crash._ram_current = faker.datatype.number({min: 1, max: crash._ram_total});
            crash._disk_total = faker.datatype.number({min: 1, max: 20}) * 1024;
            crash._disk_current = faker.datatype.number({min: 1, max: crash._disk_total});
            crash._bat_total = 100;
            crash._bat_current = faker.datatype.number({min: 1, max: 100});
            crash._orientation = chancePercent(50) ? "landscape" : "portrait";

            crash._root = chancePercent(50);
            crash._online = chancePercent(50);
            crash._signal = chancePercent(50);
            crash._muted = chancePercent(50);
            crash._background = chancePercent(50);

            crash._error = self.generateError();
            crash._logs = self.generateSDKLog();
            crash._name = (crash._error.split("\n")[0] + "").trim();
            crash._nonfatal = chancePercent(50);
            crash._run = faker.datatype.number({min: 1, max: 1800});

            crash._custom = {};
            ["facebook", "gideros", "admob", "chartboost", "googleplay"].forEach(function(custom) {
                if (chancePercent(50)) {
                    crash._custom[custom] = faker.datatype.number({min: 1, max: 2}) + "." + faker.datatype.number({min: 0, max: 9});
                }
            });

            return crash;
        };

        this.generateSDKLog = function() {
            return Array(faker.datatype.number({min: 5, max: 10})).fill(null).map(function() {
                return faker.random.arrayElement(sdkLogActions);
            }).join("\n");
        };

        this.generateTrace = function() {
            var trace = {};

            trace.stz = faker.datatype.number({min: state.startTs, max: state.endTs}) * 1000;
            trace.etz = faker.datatype.number({min: trace.stz, max: state.endTs}) * 1000;

            if (chancePercent(30)) {
                trace.type = "device";
                trace.apm_metrics = {};
                if (self.appType === "web") {
                    trace.name = faker.random.arrayElement(viewSegments.name);
                    trace.apm_metrics.first_paint = faker.datatype.number({min: 0, max: 100});
                    trace.apm_metrics.first_contentful_paint = faker.datatype.number({min: 0, max: 500});
                    trace.apm_metrics.dom_interactive = faker.datatype.number({min: 0, max: 1000});
                    trace.apm_metrics.dom_content_loaded_event_end = faker.datatype.number({min: 0, max: 300});
                    trace.apm_metrics.load_event_end = faker.datatype.number({min: 0, max: 500});
                    trace.apm_metrics.first_input_delay = faker.datatype.number({min: 0, max: 500});
                }
                else {
                    trace.name = faker.random.arrayElement(["app_start", "app_in_background", "app_in_foreground"]);
                    trace.apm_metrics.duration = faker.datatype.number({min: 0, max: 5000});
                }
            }
            else if (chancePercent(60)) {
                trace.type = "device";
                trace.name = faker.random.arrayElement(viewSegments.name);
                trace.apm_metrics = {};
                trace.apm_metrics.slow_rendering_frames = faker.datatype.number({min: 0, max: 100});
                trace.apm_metrics.frozen_frames = faker.datatype.number({min: 0, max: 100});
            }
            else {
                trace.type = "network";
                trace.name = getProp("_source");
                trace.apm_metrics = {
                    response_time: faker.datatype.number({min: 0, max: 5000}),
                    response_payload_size: faker.datatype.number({min: 0, max: 5000000}),
                    request_payload_size: faker.datatype.number({min: 0, max: 5000000}),
                    response_code: chancePercent(50) ? faker.datatype.number({min: 400, max: 500}) : 200
                };
            }

            return trace;
        };

        this.generateEvent = function(id, eventTemplates) {
            state.stats.e++;

            var event = {
                "key": id,
                "count": 1,
                "timestamp": self.ts,
                "hour": faker.datatype.number({min: 0, max: 23}),
                "dow": faker.datatype.number({min: 0, max: 6})
            };

            self.ts += 1000;

            var eventTemplate = Array.isArray(eventTemplates) ? faker.random.arrayElement(eventTemplates) : eventTemplates;

            if (eventTemplate && eventTemplate.duration) {
                event.dur = faker.datatype.number({min: eventTemplate.duration[0], max: eventTemplate.duration[1] || 10});
            }
            else if (id === "[CLY]_view") {
                event.dur = faker.datatype.number({min: 0, max: 100});
            }

            if (eventTemplate && eventTemplate.sum) {
                event.sum = faker.datatype.number({min: eventTemplate.sum[0], max: eventTemplate.sum[1] || 10});
            }

            if (eventTemplate && eventTemplate.segments) {
                event.segmentation = {};
                Object.keys(eventTemplate.segments).forEach(function(key) {
                    event.segmentation[key] = faker.random.arrayElement(eventTemplate.segments[key]);
                });
            }
            else if (id === "[CLY]_view") {
                event.segmentation = {};
                var populatorType = state.type || "banking";
                Object.keys(viewSegments).forEach(function(key) {
                    var values = [];
                    if (self.appType === "web" && key === "name") {
                        values = ["/populator/" + countlyCommon.ACTIVE_APP_KEY + "/demo-" + populatorType + ".html"];
                    }
                    else {
                        values = viewSegments[key];
                    }
                    event.segmentation[key] = faker.random.arrayElement(values);
                });
            }
            else if (id === "[CLY]_orientation") {
                event.segmentation = {mode: chancePercent(50) ? "landscape" : "portrait"};
            }

            return [event];
        };


        this.generateEvents = function(count, templateEvents) {
            if (typeof templateEvents === "object" || Object.keys(templateEvents).length === 0) {
                return [];
            }

            var events = [];

            Array(count).fill(null).forEach(function() {
                var eventKey = faker.random.arrayElement(Object.keys(templateEvents || {}));
                events.push(self.generateEvent(eventKey, templateEvents[eventKey])[0]);
            });

            return events;
        };

        this.generateFeedbackEvents = function() {
            var events = [];

            events.push(self.generateRatingEvent());
            if (countlyGlobal.plugins.includes("surveys")) {
                events.push(self.generateNPSEvent());
                events.push(self.generateSurveyEvent());
            }

            return events;
        };

        this.generateRatingEvent = function() {
            state.stats.e++;

            var event = {
                "key": "[CLY]_star_rating",
                "count": 1,
                "timestamp": self.ts,
                "hour": faker.datatype.number({min: 0, max: 23}),
                "dow": faker.datatype.number({min: 1, max: 6}),
                "test": 1,
            };

            self.ts += 1000;

            event.segmentation = {};
            event.segmentation.email = self.userDetails.email;
            event.segmentation.comment = faker.lorem.sentence(7);
            event.segmentation.rating = faker.datatype.number({min: 1, max: 5});
            event.segmentation.app_version = self.metrics._app_version;
            event.segmentation.platform = self.metrics._os;

            if (state.ratingWidgets.length > 0) {
                event.segmentation.widget_id = faker.random.arrayElement(state.ratingWidgets)._id;
            }
            return event;
        };

        this.generateNPSEvent = function() {
            state.stats.e++;

            var event = {
                "key": "[CLY]_nps",
                "count": 1,
                "timestamp": self.ts,
                "hour": faker.datatype.number({min: 0, max: 23}),
                "dow": faker.datatype.number({min: 1, max: 6}),
                "test": 1,
            };

            self.ts += 1000;

            event.segmentation = {};
            event.segmentation.comment = faker.lorem.sentence(7);
            event.segmentation.rating = faker.datatype.number({min: 0, max: 10});
            event.segmentation.app_version = self.metrics._app_version;
            event.segmentation.platform = self.metrics._os;
            event.segmentation.shown = 1;
            if (state.npsWidgets.length) {
                event.segmentation.widget_id = faker.random.arrayElement(state.npsWidgets);
            }
            return event;
        };

        this.generateSurveyEvent = function() {
            state.stats.e++;

            var event = {
                "key": "[CLY]_survey",
                "count": 1,
                "timestamp": this.ts,
                "hour": faker.datatype.number({min: 0, max: 23}),
                "dow": faker.datatype.number({min: 1, max: 6}),
                "test": 1,
            };

            self.ts += 1000;
            event.segmentation = {};
            event.segmentation.app_version = self.metrics._app_version;
            event.segmentation.platform = self.metrics._os;
            event.segmentation.shown = 1;
            var keys = Object.keys(state.surveyWidgets);
            if (keys.length > 0) {
                event.segmentation.widget_id = faker.random.elementArray(keys);

                var structure = state.surveyWidgets[event.segmentation.widget_id];
                structure.questions.forEach(function(question) {
                    // "multi", "radio", "text", "dropdown", "rating"
                    if (question.type === "text") {
                        event.segmentation["answ-" + question.id] = faker.lorem.sentence(7);
                    }
                    else if (question.type === "rating") {
                        event.segmentation["answ-" + question.id] = faker.datatype.number({min: 0, max: 10});
                    }
                    else {
                        if (question.choices && question.choices.length > 0) {
                            var ch = [],
                                chcount = 1;

                            if (question.type === "multi") { //multiple choices
                                chcount = faker.datatype.number({min: 1, max: question.choices.length - 1});
                            }

                            var pp = faker.datatype.number({min: 1, max: question.choices.length - 1});
                            for (var k = 0; k < chcount; k++) {
                                ch.push(question.choices[(pp + k) % question.choices.length].key);
                            }
                            event.segmentation["answ-" + question.id] = ch.join(",");
                        }
                        else {
                            event.segmentation["answ-" + question.id] = "No chances???";
                        }
                    }
                });
            }
            return event;
        };

        this.generateHeatmapEvent = function() {
            state.stats.e++;
            var populatorType = state.type || "banking";
            var views = ["/populator/" + countlyCommon.ACTIVE_APP_KEY + "/demo-" + populatorType + ".html"];
            var event = {
                "key": "[CLY]_action",
                "count": 1,
                "timestamp": self.ts,
                "hour": faker.datatype.number({min: 0, max: 23}),
                "dow": faker.datatype.number({min: 0, max: 6}),
                "test": 1
            };
            var selectedOffsets = [{x: 468, y: 366}, {x: 1132, y: 87}, {x: 551, y: 87}, {x: 647, y: 87}, {x: 1132, y: 87}];

            self.ts += 1000;

            event.segmentation = {};
            event.segmentation.type = "click";

            if (chancePercent(50)) {
                var offset = faker.random.arrayElement(selectedOffsets);
                event.segmentation.x = offset.x;
                event.segmentation.y = offset.y;
            }
            else {
                event.segmentation.x = faker.datatype.number({min: 0, max: 1440});
                event.segmentation.y = faker.datatype.number({min: 0, max: 990});
            }

            event.segmentation.width = 1440;
            event.segmentation.height = 3586;
            event.segmentation.domain = window.location.origin;
            event.segmentation.view = faker.random.arrayElement(views);

            return event;
        };

        this.generateHeatmapEvents = function() {
            var events = [self.generateHeatmapEvent()];

            if (chancePercent(50)) {
                events = events.push(self.generateHeatmapEvent());

                if (chancePercent(20)) {
                    events = events.push(self.generateHeatmapEvent());
                }
            }

            return events;
        };

        this.generateScrollmapEvent = function() {
            state.stats.e++;
            var populatorType = state.type || "banking";
            var views = ["/populator/" + countlyCommon.ACTIVE_APP_KEY + "/demo-" + populatorType + ".html"];
            var event = {
                "key": "[CLY]_action",
                "count": 1,
                "timestamp": self.ts,
                "hour": faker.datatype.number({min: 0, max: 23}),
                "dow": faker.datatype.number({min: 0, max: 6}),
                "test": 1
            };
            self.ts += 1000;
            event.segmentation = {};
            event.segmentation.type = "scroll";
            event.segmentation.y = faker.datatype.number({min: 0, max: 3602}) + 983;
            event.segmentation.width = 1440;
            event.segmentation.height = 3586;
            event.domain = window.location.origin;
            event.segmentation.view = faker.random.arrayElement(views);
            return event;
        };

        this.generateScrollmapEvents = function() {
            var events = [self.generateHeatmapEvent()];

            if (chancePercent(50)) {
                events = events.push(self.generateScrollmapEvent());

                if (chancePercent(20)) {
                    events = events.push(self.generateScrollmapEvent());
                }
            }

            return events;
        };

        this.startSession = function(template) {
            self.ts = self.ts + 60 * 60 * 24 + 100;
            state.stats.s++;
            var req = {};
            var events;

            if (!self.isRegistered) {
                self.isRegistered = true;
                state.stats.u++;
                // note login event was here
                events = self.generateEvent("[CLY]_view", template && template.events && template.events["[CLY]_view"]).concat(self.generateEvent("[CLY]_orientation", template && template.events && template.events["[CLY]_orientation"]), self.generateEvents(4, template && template.events));
                req = {timestamp: self.ts, begin_session: 1, metrics: self.metrics, user_details: self.userdetails, events: events, apm: self.generateTrace()};
                if (chancePercent(50)) {
                    self.hasPush = true;
                    state.stats.p++;
                    req.token_session = 1;
                    req.test_mode = 0;
                    req.events = req.events.concat(self.generateHeatmapEvents());
                    req.events = req.events.concat(self.generateFeedbackEvents());
                    req.events = req.events.concat(self.generateScrollmapEvents());
                    req[self.platform.toLowerCase() + "_token"] = faker.random.string(8);
                }
            }
            else {
                events = self.generateEvent("[CLY]_view", template && template.events && template.events["[CLY]_view"]).concat(self.generateEvent("[CLY]_orientation", template && template.events && template.events["[CLY]_orientation"]), self.generateEvents(4, template && template.events));
                req = {timestamp: self.ts, begin_session: 1, events: events, apm: self.generateTrace()};
            }

            if (chancePercent(50)) {
                state.stats.c++;
                req.crash = self.generateCrash();
            }

            var consents = ["sessions", "events", "views", "scrolls", "clicks", "forms", "crashes", "push", "attribution", "users"];
            req.consent = {};
            consents.forEach(function(consent) {
                req.consent[consent] = chancePercent(80);
            });

            self.hasSession = true;
            self.request(req);
            self.timer = setTimeout(function() {
                self.extendSession(template);
            }, state.timeout);
        };

        this.extendSession = function(template) {
            if (self.hasSession) {
                var req = {};
                state.stats.x++;
                state.stats.d += 30;
                self.ts = self.ts + 30;

                var events = self.generateEvent("[CLY]_view", template && template.events && template.events["[CLY]_view"]).concat(self.generateEvent("[CLY]_orientation", template && template.events && template.events["[CLY]_orientation"]), self.generateEvents(2, template && template.events));

                req = {
                    timestamp: self.ts,
                    session_duration: 30,
                    events: events,
                    apm: self.generateTrace()
                };

                if (chancePercent(20)) {
                    self.timer = setTimeout(function() {
                        self.extendSession(template);
                    }, state.timeout);
                }
                else {
                    if (chancePercent(50)) {
                        state.stats.c++;
                        req.crash = self.generateCrash();
                    }
                    self.timer = setTimeout(function() {
                        self.endSession(template);
                    }, state.timeout);
                }
                self.request(req);
            }
        };

        this.endSession = function(template) {
            if (self.timer) {
                clearTimeout(self.timer);
                self.timer = null;
            }
            if (self.hasSession) {
                self.hasSession = false;
                var events = self.generateEvents(2, template && template.events);
                self.request({
                    timestamp: self.ts,
                    end_session: 1,
                    events: events,
                    apm: self.generateTrace()
                });
            }
        };

        this.request = function(params) {
            state.stats.r++;

            params.device_id = self.id;
            params.ip_address = self.ip;
            params.hour = faker.datatype.number({min: 0, max: 23});
            params.dow = faker.datatype.number({min: 0, max: 6});
            params.stats = JSON.parse(JSON.stringify(state.stats));
            params.populator = true;

            state.bulk.push(params);

            state.stats = {u: 0, s: 0, x: 0, d: 0, e: 0, r: 0, b: 0, c: 0, p: 0};
            countlyPopulator.sync();
        };

        this.reportConversion = function(uid, campaignId) {
            $.ajax({
                type: "GET",
                url: countlyCommon.API_URL + "/i",
                data: {
                    campaign_id: uid,
                    campaign_user: campaignId,
                    app_key: countlyCommon.ACTIVE_APP_KEY,
                    device_id: self.id,
                    timestamp: faker.datatype.number({min: state.startTs, max: state.endTs}),
                    populator: true
                },
                success: function() {}
            });
        };
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

        if (template && template.events && typeof template.events === "object") {
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

        return template;
    }

    Object.assign(countlyPopulator, {
        metricProps: metricProps,
        props: props,
        sdkLogActions: sdkLogActions,
        viewSegments: viewSegments,
        messages: messages,
        predefinedIPAddresses: predefinedIPAddresses,
        campaigns: campaigns,
        sources: sources,
        defaultTemplates: defaultTemplates,
        chancePercent: chancePercent,
        generateUserProperties: generateUserProperties,
        getProp: getProp,
        User: User,
        serializeTemplate: serializeTemplate
    });

    Vue.component("cly-populator-template-drawer", countlyVue.views.create({
        props: {
            controls: {type: Object}
        },
        data: function() {
            return {
                appId: countlyCommon.ACTIVE_APP_ID,
            };
        },
        computed: {
            title: function() {
                return "Title";
            }
        },
        methods: {
            addUserProperty: function(editedObject) {
                if (typeof editedObject.up === "undefined") {
                    Vue.set(editedObject, "up", []);
                }

                var lastPair = editedObject.up[editedObject.up.length - 1];
                console.log({lastPair});
                if (typeof lastPair === "undefined" || (lastPair[0] !== "" && lastPair[1] !== "")) {
                    editedObject.up.splice(-1, 0, ["", ""]);
                }
            },
            onSubmit: function(editedObject) {
                var isEdit = !!editedObject._id;

                if (isEdit) {
                    this.$store.dispatch("countlyPopulator/editTemplate", editedObject);
                }
                else {
                    this.$store.dispatch("countlyPopulator/createTemplate", editedObject);
                }
            }
        },
        template: countlyVue.T("/populator/templates/template_drawer.html")
    }));
}(window.countlyPopulator = window.countlyPopulator || {}));