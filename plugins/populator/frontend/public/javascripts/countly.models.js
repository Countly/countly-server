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
            },
            "views": ["view1", "view2", "view3"],
            "sequences": ["sequence1", "sequence2", "sequence3"],
            "generatedOn": Math.round((Date.now().valueOf() || 0)),
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
            },
            "users": ["user1", "user2", "user3"],
            "views": ["view1", "view2", "view3", "view4", "view5", "view6"],
            "sequences": ["sequence1", "sequence2", "sequence3", "sequence4"],
            "generatedOn": Math.round((Date.now().valueOf() || 0)),
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
     * 
     * @param {array} arr - array of objects with probability property
     * @returns {string} returns random key from array
     */
    function randomGetOne(arr) {
        var randomNum = Math.random() * 100;
        for (let i = 0; i < arr.length; i++) {
            if (randomNum < parseInt(arr[i].probability)) {
                return arr[i].key;
            }
            else {
                randomNum -= parseInt(arr[i].probability);
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
            return sum + parseInt(item.probability);
        }, 0);

        const randomNum = Math.random() * totalProbability;
        let selectedValue = null;
        let cumulativeProbability = 0;

        for (let i = 0; i < array.length; i++) {
            cumulativeProbability += parseInt(array[i].probability);
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
            this.id = env._id.split('_', 3)[0]; //device_id
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
                var randomError = errors[Math.floor(Math.random() * errors.length)];
                var err = new Error(randomError + " in " + randomString(5) + ".js at line " + getRandomInt(1, 100));
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
                event.dur = getRandomInt(parseInt(eventTemplate.duration.minDurationTime), parseInt(eventTemplate.duration.maxDurationTime) || 10);
            }

            if (eventTemplate && eventTemplate.sum && eventTemplate.sum.isActive) {
                event.sum = getRandomInt(parseInt(eventTemplate.sum.minSumValue), parseInt(eventTemplate.sum.maxSumValue) || 10);
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

            req.crash = this.getCrash();

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
            countlyPopulator.sync();
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
                            selectedSequence = template.sequences[parseInt(selectedSequence.split('_', 2)[1]) - 1];
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
                        let minRunningSession = parseInt(template.behavior.runningSession[0]);
                        let maxRunningSession = parseInt(template.behavior.runningSession[1]);

                        if (template.behavior.generalConditions && template.behavior.generalConditions.length) {
                            const matchedConditionValues = pickBehaviorConditionValue(this.userdetails, template.behavior.generalConditions);
                            if (matchedConditionValues) {
                                minRunningSession = parseInt(matchedConditionValues[0]);
                                maxRunningSession = parseInt(matchedConditionValues[1]);
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

        this.saveEnvironment = function(environmentUserList) {
            return new Promise((resolve, reject) => {
                $.ajax({
                    type: "POST",
                    url: countlyCommon.API_URL + "/i/populator/environment/save",
                    data: {
                        app_key: countlyCommon.ACTIVE_APP_KEY,
                        users: JSON.stringify(environmentUserList),
                        populator: true
                    },
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
        runCount = run;
        generating = true;
        completedRequestCount = 0;

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
                    await createUsers();
                }
                else {
                    generating = false;
                }
            }
            await createAndProcessUsers();
        }

        /**
         * Create new user 
        **/
        async function createUsers() {
            let batchSize = getRandomInt(3, 10); //5;
            let currentIndex = 0;

            /**
             * Create batch of users
             * @returns {array} - array of users
             * */
            async function createUserBatch() {
                const batchPromises = [];

                for (let i = 0; i < batchSize && currentIndex < userAmount; i++) {
                    const u = new User();
                    u.getUserFromTemplate(template.users, currentIndex);
                    const requests = u.generateAllEventsAndSessions(template, runCount);
                    batchPromises.push(requests);
                    bulk = [];

                    if (template.saveEnvironment) {
                        await checkEnvironment(u);
                    }
                    if (currentIndex < userAmount && users.length < 50 && Math.random() > 0.5) {
                        users.push(u.user);
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
             */
            async function checkEnvironment(user) {
                let environmentUsers = [];
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
                if (environmentUsers.length > 0) {
                    await user.saveEnvironment(environmentUsers);
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
             * Create and process users
             * */
            async function createAndProcessUsers() {
                const u = await createUserBatch();
                await processUsers(u);

                if (currentIndex < userAmount) {
                    await createAndProcessUsers();
                }
                else {
                    generating = false;
                }
            }
            await createAndProcessUsers();
        }

        if (environment && environment.length) {
            getUsers();
        }
        else {
            generateWidgets(function() {
                generateCampaigns(async function() {
                    const usersResult = await createUsers();

                    if (countlyGlobal.plugins.indexOf("ab-testing") !== -1 && countlyAuth.validateCreate("ab-testing") && usersResult) {
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

    countlyPopulator.sync = function() {
        return new Promise((resolve, reject) => {
            if (bulk.length > 1) {
                $.ajax({
                    type: "POST",
                    url: countlyCommon.API_URL + "/i/bulk",
                    data: {
                        app_key: countlyCommon.ACTIVE_APP_KEY,
                        requests: JSON.stringify(bulk),
                        populator: true
                    },
                    success: function() {
                        bulk = [];
                        resolve();
                    },
                    error: function() {
                        bulk = [];
                        reject();
                    }
                });
            }
        });
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
                CountlyHelpers.notify({message: $.i18n.map["populator.failed-to-fetch-templates"], type: "error"});
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
                CountlyHelpers.notify({message: $.i18n.map["populator.failed-to-create-template"], type: "error"});
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
                CountlyHelpers.notify({message: $.i18n.map["populator.failed-to-fetch-environment"], type: "error"});
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
                CountlyHelpers.notify({message: $.i18n.map["populator.failed-to-fetch-environments"], type: "error"});
            }
        });
    };

    countlyPopulator.getEnvironment = function(environmentId, callback) {
        const data = {environment_id: environmentId};
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
                CountlyHelpers.notify({message: $.i18n.map["populator.failed-to-fetch-environment"], type: "error"});
            }
        });
    };

    countlyPopulator.removeEnvironment = function(environmentId, callback) {
        const data = {app_id: countlyCommon.ACTIVE_APP_ID, environment_id: environmentId};
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
                CountlyHelpers.notify({message: $.i18n.map["populator.failed-to-delete-environment"], type: "error"});
            }
        });
    };

    countlyPopulator.defaultTemplates = defaultTemplates;
}(window.countlyPopulator = window.countlyPopulator || {}, jQuery));