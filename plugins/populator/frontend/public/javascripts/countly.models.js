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

            const error = this.getError();
            if (typeof error === 'object') {
                crash._error = error.name;
                crash._app_version = error.version;
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
                if (Math.random() < 0.50) {
                    if (crashSymbolVersions.javascript.indexOf(this.metrics._app_version) === -1) {
                        crashSymbolVersions.javascript.push(this.metrics._app_version);
                    }
                    return jsErrors[getRandomInt(0, jsErrors.length - 1)].error;
                }
                else {
                    errors = ["EvalError", "InternalError", "RangeError", "ReferenceError", "SyntaxError", "TypeError", "URIError"];
                    var randomError = errors[Math.floor(Math.random() * errors.length)];
                    var err = new Error(randomError + " in " + randomString(5) + ".js at line " + getRandomInt(1, 100));
                    if (crashSymbolVersions.javascript.indexOf(this.metrics._app_version) === -1) {
                        crashSymbolVersions.javascript.push(this.metrics._app_version);
                    }
                    return err.stack + "";
                }
            }
            else if (countlyGlobal.apps[countlyCommon.ACTIVE_APP_ID].type === "mobile") {
                var stacks = 0;
                var error = "";
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
                    "_app_version": this.metrics._app_version,
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
                    "_error": "Incident Identifier: C2F3B745-3450-49B1-B225-85A2795DDBAF\nCrashReporter Key:   TODO\nHardware Model:      iPhone9,1\nProcess:         CountlyTestApp-i [10790]\nPath:            /private/var/containers/Bundle/Application/35CC04E6-3BCF-4929-B2EA-999D3BC48136/CountlyTestApp-iOS.app/CountlyTestApp-iOS\nIdentifier:      ly.count.CountlyTestApp-iOS\nVersion:         1.0 (3.9)\nCode Type:       ARM-64\nParent Process:  ??? [1]\n\nDate/Time:       2020-03-18 14:55:59 +0000\nOS Version:      iPhone OS 13.3.1 (17D50)\nReport Version:  104\n\nException Type:  SIGABRT\nException Codes: #0 at 0x1ae2e5ec4\nCrashed Thread:  0\n\nApplication Specific Information:\n*** Terminating app due to uncaught exception 'NSGenericException', reason: 'This is the exception!'\n\nLast Exception Backtrace:\n0   CoreFoundation                      0x00000001ae4eea48 0x1ae3c3000 + 1227336\n1   libobjc.A.dylib                     0x00000001ae215fa4 0x1ae210000 + 24484\n2   CoreFoundation                      0x00000001ae3f30ec 0x1ae3c3000 + 196844\n3   CountlyTestApp-iOS                  0x0000000102514e88 0x10250c000 + 36488\n4   CountlyTestApp-iOS                  0x00000001025264a4 0x10250c000 + 107684\n5   UIKitCore                           0x00000001b273e948 0x1b1b71000 + 12376392\n6   UIKitCore                           0x00000001b273e464 0x1b1b71000 + 12375140\n7   UIKitCore                           0x00000001b273eb64 0x1b1b71000 + 12376932\n8   UIKitCore                           0x00000001b257dc84 0x1b1b71000 + 10538116\n9   UIKitCore                           0x00000001b256d7d4 0x1b1b71000 + 10471380\n10  UIKitCore                           0x00000001b259d744 0x1b1b71000 + 10667844\n11  CoreFoundation                      0x00000001ae46be68 0x1ae3c3000 + 691816\n12  CoreFoundation                      0x00000001ae466d54 0x1ae3c3000 + 671060\n13  CoreFoundation                      0x00000001ae467320 0x1ae3c3000 + 672544\n14  CoreFoundation                      0x00000001ae466adc 0x1ae3c3000 + 670428\n15  GraphicsServices                    0x00000001b8407328 0x1b8404000 + 13096\n16  UIKitCore                           0x00000001b257463c 0x1b1b71000 + 10499644\n17  CountlyTestApp-iOS                  0x000000010252b6e0 0x10250c000 + 128736\n18  libdyld.dylib                       0x00000001ae2f0360 0x1ae2ef000 + 4960\n\nThread 0 Crashed:\n0   libsystem_kernel.dylib              0x00000001ae2e5ec4 0x1ae2c1000 + 151236\n1   libsystem_c.dylib                   0x00000001ae155844 0x1ae0e2000 + 473156\n2   CountlyTestApp-iOS                  0x000000010253dd38 0x10250c000 + 204088\n3   CoreFoundation                      0x00000001ae4eed50 0x1ae3c3000 + 1228112\n4   libobjc.A.dylib                     0x00000001ae21624c 0x1ae210000 + 25164\n5   libc++abi.dylib                     0x00000001ae2bb304 0x1ae2ad000 + 58116\n6   libc++abi.dylib                     0x00000001ae2baed8 0x1ae2ad000 + 57048\n7   libobjc.A.dylib                     0x00000001ae216158 0x1ae210000 + 24920\n8   CoreFoundation                      0x00000001ae466b4c 0x1ae3c3000 + 670540\n9   GraphicsServices                    0x00000001b8407328 0x1b8404000 + 13096\n10  UIKitCore                           0x00000001b257463c 0x1b1b71000 + 10499644\n11  CountlyTestApp-iOS                  0x000000010252b6e0 0x10250c000 + 128736\n12  libdyld.dylib                       0x00000001ae2f0360 0x1ae2ef000 + 4960\n\nThread 1:\n0   libsystem_kernel.dylib              0x00000001ae2e6a7c 0x1ae2c1000 + 154236\n1   libsystem_pthread.dylib             0x00000001ae20d760 0x1ae1ff000 + 59232\n\nThread 2:\n0   libsystem_kernel.dylib              0x00000001ae2e6a7c 0x1ae2c1000 + 154236\n1   libsystem_pthread.dylib             0x00000001ae20d760 0x1ae1ff000 + 59232\n\nThread 3:\n0   libsystem_kernel.dylib              0x00000001ae2c4634 0x1ae2c1000 + 13876\n1   CoreFoundation                      0x00000001ae46c288 0x1ae3c3000 + 692872\n2   CoreFoundation                      0x00000001ae4673a8 0x1ae3c3000 + 672680\n3   CoreFoundation                      0x00000001ae466adc 0x1ae3c3000 + 670428\n4   Foundation                          0x00000001ae7a6784 0x1ae79f000 + 30596\n5   Foundation                          0x00000001ae7a6664 0x1ae79f000 + 30308\n6   UIKitCore                           0x00000001b260ce80 0x1b1b71000 + 11124352\n7   Foundation                          0x00000001ae8d709c 0x1ae79f000 + 1278108\n8   libsystem_pthread.dylib             0x00000001ae209d8c 0x1ae1ff000 + 44428\n9   libsystem_pthread.dylib             0x00000001ae20d76c 0x1ae1ff000 + 59244\n\nThread 4:\n0   libsystem_kernel.dylib              0x00000001ae2e6a7c 0x1ae2c1000 + 154236\n1   libsystem_pthread.dylib             0x00000001ae20d760 0x1ae1ff000 + 59232\n\nThread 5:\n0   ???                                 0x0000000000000000 0x0 + 0\n\nThread 0 crashed with ARM-64 Thread State:\n    pc: 0x00000001ae2e5ec4     fp: 0x000000016d8f3750     sp: 0x000000016d8f3730     x0: 0x0000000000000000 \n    x1: 0x0000000000000000     x2: 0x0000000000000000     x3: 0x0000000000000000     x4: 0x0000000000000010 \n    x5: 0x0000000000000022     x6: 0x0000000000000000     x7: 0x0000000000000000     x8: 0x0000000102985800 \n    x9: 0x1036712261ef9372    x10: 0x00000001ae201150    x11: 0x0007000283c1bc80    x12: 0x0000000283c1bca0 \n   x13: 0x000021a1f6ea6109    x14: 0x000000000000003f    x15: 0x7000000000000000    x16: 0x0000000000000148 \n   x17: 0x00000001ae3cf440    x18: 0x0000000000000000    x19: 0x0000000000000006    x20: 0x0000000000000407 \n   x21: 0x0000000102583c10    x22: 0x00000001029858e0    x23: 0x00000001ebe1b870    x24: 0x00000001f6ea2000 \n   x25: 0x00000001e67e52cc    x26: 0x00000001e67e6abf    x27: 0x00000001ae584896    x28: 0x00000001f47da6e0 \n    lr: 0x00000001ae2011d8   cpsr: 0x0000000040000000 \n\nBinary Images:\n       0x10250c000 -        0x10257ffff +CountlyTestApp-iOS arm64  <83ba0b04af12301aa7e5bbbb20af0738> /private/var/containers/Bundle/Application/35CC04E6-3BCF-4929-B2EA-999D3BC48136/CountlyTestApp-iOS.app/CountlyTestApp-iOS\n       0x1026b8000 -        0x1026c3fff  libobjc-trampolines.dylib arm64  <181f3aa866d93165ac54344385ac6e1d> /usr/lib/libobjc-trampolines.dylib\n       0x1ae098000 -        0x1ae0aefff  libsystem_trace.dylib arm64  <b7477df8f6ab3b2b9275ad23c6cc0b75> /usr/lib/system/libsystem_trace.dylib\n       0x1ae0af000 -        0x1ae0e0fff  libxpc.dylib arm64  <e3530448a171371f9e546efda87582ca> /usr/lib/system/libxpc.dylib\n       0x1ae0e1000 -        0x1ae0e1fff  libsystem_blocks.dylib arm64  <0c2d83d53ebf31e4abb1593d5c63cdbf> /usr/lib/system/libsystem_blocks.dylib\n       0x1ae0e2000 -        0x1ae15efff  libsystem_c.dylib arm64  <61459536a83b36a090045d168317d2a6> /usr/lib/system/libsystem_c.dylib\n       0x1ae15f000 -        0x1ae1d3fff  libdispatch.dylib arm64  <b9d95eab9269367db2f4c2b45821a32d> /usr/lib/system/libdispatch.dylib\n       0x1ae1d4000 -        0x1ae1f3fff  libsystem_malloc.dylib arm64  <c5470d04a83c38ab9baf9b34272496a5> /usr/lib/system/libsystem_malloc.dylib\n       0x1ae1f4000 -        0x1ae1fefff  libsystem_platform.dylib arm64  <f77366e7ef173e34a4baf938756212c2> /usr/lib/system/libsystem_platform.dylib\n       0x1ae1ff000 -        0x1ae20ffff  libsystem_pthread.dylib arm64  <1ff7a2fb9f2837b7af39344206a322bd> /usr/lib/system/libsystem_pthread.dylib\n       0x1ae210000 -        0x1ae240fff  libobjc.A.dylib arm64  <a697479d4c5c391eb11785b894ab94c6> /usr/lib/libobjc.A.dylib\n       0x1ae241000 -        0x1ae2acfff  libcorecrypto.dylib arm64  <000272fd529a32009ca910c59c8cacb7> /usr/lib/system/libcorecrypto.dylib\n       0x1ae2ad000 -        0x1ae2c0fff  libc++abi.dylib arm64  <295d93e6ac06384aa4692df327f697fc> /usr/lib/libc++abi.dylib\n       0x1ae2c1000 -        0x1ae2eefff  libsystem_kernel.dylib arm64  <1b7d718405d63a83bb1bf9af6aef61f3> /usr/lib/system/libsystem_kernel.dylib\n       0x1ae2ef000 -        0x1ae320fff  libdyld.dylib arm64  <7b531a153e73318590e2b88d9476da5e> /usr/lib/system/libdyld.dylib\n       0x1ae321000 -        0x1ae329fff  libsystem_darwin.dylib arm64  <aa9881f980883ca6a247048eae839063> /usr/lib/system/libsystem_darwin.dylib\n       0x1ae32a000 -        0x1ae380fff  libc++.1.dylib arm64  <6bc32e62110531eebcdeab97b76d5507> /usr/lib/libc++.1.dylib\n       0x1ae381000 -        0x1ae3c2fff  libsystem_info.dylib arm64  <81f20a84f39c34cc9ae8f74fb8b40bba> /usr/lib/system/libsystem_info.dylib\n       0x1ae3c3000 -        0x1ae737fff  CoreFoundation arm64  <7519e99910533367b9d58844f6d3bdc6> /System/Library/Frameworks/CoreFoundation.framework/CoreFoundation\n       0x1ae738000 -        0x1ae79efff  SystemConfiguration arm64  <3ab0289a1ce13f4bb287bfec1b698117> /System/Library/Frameworks/SystemConfiguration.framework/SystemConfiguration\n       0x1ae79f000 -        0x1aea58fff  Foundation arm64  <7b1733b174c93a338a58853b0a029826> /System/Library/Frameworks/Foundation.framework/Foundation\n       0x1aea59000 -        0x1aea8bfff  libCRFSuite.dylib arm64  <f6c52960d19a302d8b479b38a76ab876> /usr/lib/libCRFSuite.dylib\n       0x1aea8c000 -        0x1aec07fff  CoreServices arm64  <e773b3b521783970a296d0f1195dc06f> /System/Library/Frameworks/CoreServices.framework/CoreServices\n       0x1aec08000 -        0x1aec69fff  libSparse.dylib arm64  <f8f050a2faae356d9d2379caba1ce122> /System/Library/Frameworks/Accelerate.framework/Frameworks/vecLib.framework/libSparse.dylib\n       0x1aec6a000 -        0x1af157fff  ImageIO arm64  <e602f06b1dc537a3933aa50b69a381f0> /System/Library/Frameworks/ImageIO.framework/ImageIO\n       0x1af158000 -        0x1af15afff  ConstantClasses arm64  <589bfc9fc3ec308cbd47d0e8b3e755d4> /System/Library/PrivateFrameworks/ConstantClasses.framework/ConstantClasses\n       0x1af15b000 -        0x1af2f8fff  CoreText arm64  <327db2473387340982adf54d6f2f1364> /System/Library/Frameworks/CoreText.framework/CoreText\n       0x1af2f9000 -        0x1af430fff  Security arm64  <1581c102be5c3ed88d6cd6462a73f610> /System/Library/Frameworks/Security.framework/Security\n       0x1af431000 -        0x1af4d4fff  IOKit arm64  <8c042dc8519e302aa0b3b11c1cc67b0f> /System/Library/Frameworks/IOKit.framework/Versions/A/IOKit\n       0x1af4d5000 -        0x1af50cfff  libMobileGestalt.dylib arm64  <4206b6cb7ff43a7ab4e3485e09dcaee8> /usr/lib/libMobileGestalt.dylib\n       0x1af50d000 -        0x1af569fff  libprotobuf.dylib arm64  <1152685be5c13ba69d96814f4efa0b2b> /usr/lib/libprotobuf.dylib\n       0x1af56a000 -        0x1af57bfff  libprotobuf-lite.dylib arm64  <a354baa0e9e73e8f959e6dc56b11113b> /usr/lib/libprotobuf-lite.dylib\n       0x1af57c000 -        0x1af7cdfff  libicucore.A.dylib arm64  <4aafd9e44eff33a59bfa2de90ed0e390> /usr/lib/libicucore.A.dylib\n       0x1af7ce000 -        0x1af7f7fff  CoreServicesInternal arm64  <cd1e4a4b4d0d34608817a273cc884c72> /System/Library/PrivateFrameworks/CoreServicesInternal.framework/CoreServicesInternal\n       0x1af7f8000 -        0x1af840fff  WirelessDiagnostics arm64  <170ba594d0ab360fb651a2014c171431> /System/Library/PrivateFrameworks/WirelessDiagnostics.framework/WirelessDiagnostics\n       0x1af841000 -        0x1af87afff  libAWDSupport.dylib arm64  <777fa19d4a69380bad4151d7fa9ea6a5> /usr/lib/libAWDSupport.dylib\n       0x1af87b000 -        0x1afd01fff  CoreAudio arm64  <59175503a0bb344db700b12890e8f128> /System/Library/Frameworks/CoreAudio.framework/CoreAudio\n       0x1afd02000 -        0x1affcefff  CoreImage arm64  <36b3592ce754320794cf9be2c085594c> /System/Library/Frameworks/CoreImage.framework/CoreImage\n       0x1affcf000 -        0x1b00bdfff  LanguageModeling arm64  <c41a1f51885d37e1a7ca97319babb891> /System/Library/PrivateFrameworks/LanguageModeling.framework/LanguageModeling\n       0x1b00be000 -        0x1b0104fff  Lexicon arm64  <f690c716437b3a7196396d31db2b85ce> /System/Library/PrivateFrameworks/Lexicon.framework/Lexicon\n       0x1b0105000 -        0x1b0288fff  libsqlite3.dylib arm64  <143e7a27783833cba0f2cddcc0a6585d> /usr/lib/libsqlite3.dylib\n       0x1b0289000 -        0x1b02bafff  MobileKeyBag arm64  <ab1d699209d43fdf8d0dc2147a6d2740> /System/Library/PrivateFrameworks/MobileKeyBag.framework/MobileKeyBag\n       0x1b02bb000 -        0x1b02c4fff  libsystem_notify.dylib arm64  <ea15686a484c30d6ab2d778114c194a0> /usr/lib/system/libsystem_notify.dylib\n       0x1b02c5000 -        0x1b04a9fff  CoreDuet arm64  <2404a55beab5338a91bfd7140f07ccd2> /System/Library/PrivateFrameworks/CoreDuet.framework/CoreDuet\n       0x1b04aa000 -        0x1b05ecfff  Montreal arm64  <f3b892a7d6f63e658e3cf7e05bd4741d> /System/Library/PrivateFrameworks/Montreal.framework/Montreal\n       0x1b05ed000 -        0x1b06d4fff  NLP arm64  <0de38309350c38d8bb87ba886b2c78a4> /System/Library/PrivateFrameworks/NLP.framework/NLP\n       0x1b06d5000 -        0x1b06f1fff  CellularPlanManager arm64  <5c1c2cc4a79130a691f1dffddd0b6caa> /System/Library/PrivateFrameworks/CellularPlanManager.framework/CellularPlanManager\n       0x1b06f2000 -        0x1b072ffff  AppSupport arm64  <627b1af837933058a1f61476623a372b> /System/Library/PrivateFrameworks/AppSupport.framework/AppSupport\n       0x1b0730000 -        0x1b0c01fff  libnetwork.dylib arm64  <d76d50cf0fc03e91ba07f7888d982a04> /usr/lib/libnetwork.dylib\n       0x1b0c02000 -        0x1b0d0dfff  ManagedConfiguration arm64  <a59e2266ca78366085d97a2d12e88f89> /System/Library/PrivateFrameworks/ManagedConfiguration.framework/ManagedConfiguration\n       0x1b0d0e000 -        0x1b0d38fff  CoreServicesStore arm64  <132df15f05613fd5b9683f1db42a35b6> /System/Library/PrivateFrameworks/CoreServicesStore.framework/CoreServicesStore\n       0x1b0d39000 -        0x1b0d59fff  UserManagement arm64  <117b31dbad313834ad8596e8fccbe37c> /System/Library/PrivateFrameworks/UserManagement.framework/UserManagement\n       0x1b0d5a000 -        0x1b1013fff  CoreML arm64  <6a2dc313f622370c9f4d9a01069a8301> /System/Library/Frameworks/CoreML.framework/CoreML\n       0x1b1014000 -        0x1b102afff  ProtocolBuffer arm64  <3b87e3b62e3a36fe8a5c14f2b72ac02d> /System/Library/PrivateFrameworks/ProtocolBuffer.framework/ProtocolBuffer\n       0x1b102b000 -        0x1b1045fff  CommonUtilities arm64  <89d109e72e3c3c589f470b2376ce1610> /System/Library/PrivateFrameworks/CommonUtilities.framework/CommonUtilities\n       0x1b1046000 -        0x1b1046fff  libenergytrace.dylib arm64  <d09e1b85b6e23bddbe9a1dab940fa196> /usr/lib/libenergytrace.dylib\n       0x1b1047000 -        0x1b107dfff  RunningBoardServices arm64  <ce832be0fa543f5ba2187e8cbc443d69> /System/Library/PrivateFrameworks/RunningBoardServices.framework/RunningBoardServices\n       0x1b107e000 -        0x1b10f3fff  BaseBoard arm64  <75638779348e32beaa8c0dde9014b570> /System/Library/PrivateFrameworks/BaseBoard.framework/BaseBoard\n       0x1b164a000 -        0x1b16bbfff  CoreLocation arm64  <2b540c6a2a333a188fc71a6e0933f9cb> /System/Library/Frameworks/CoreLocation.framework/CoreLocation\n       0x1b16c9000 -        0x1b171dfff  Accounts arm64  <79dd258489b23d51aa52a2a91a1ad7f1> /System/Library/Frameworks/Accounts.framework/Accounts\n       0x1b172f000 -        0x1b1a8ffff  CFNetwork arm64  <59b74c73dcc33a999647189b124b265b> /System/Library/Frameworks/CFNetwork.framework/CFNetwork\n       0x1b1a90000 -        0x1b1b70fff  UIFoundation arm64  <a5a0f819e5b33d5b8ff52b8bba1d411e> /System/Library/PrivateFrameworks/UIFoundation.framework/UIFoundation\n       0x1b1b71000 -        0x1b2c37fff  UIKitCore arm64  <d76300677a003cb799e1e7f6c55d85c5> /System/Library/PrivateFrameworks/UIKitCore.framework/UIKitCore\n       0x1b2c38000 -        0x1b2c45fff  AssertionServices arm64  <a9f4defc194e3ad4b858f01369c47fd2> /System/Library/PrivateFrameworks/AssertionServices.framework/AssertionServices\n       0x1b2c46000 -        0x1b2d17fff  CoreTelephony arm64  <6a8061084b3732a99e66f2bfdd120c5e> /System/Library/Frameworks/CoreTelephony.framework/CoreTelephony\n       0x1b2d18000 -        0x1b2d1dfff  AggregateDictionary arm64  <1c9c38f0865e30eb85bd20a6ae0ac941> /System/Library/PrivateFrameworks/AggregateDictionary.framework/AggregateDictionary\n       0x1b2d1e000 -        0x1b2d34fff  libsystem_asl.dylib arm64  <611c5ad01fa135d19914ae6dd8927754> /usr/lib/system/libsystem_asl.dylib\n       0x1b2d35000 -        0x1b2daefff  CloudDocs arm64  <6e37c983e3c431f7b753d624892858d7> /System/Library/PrivateFrameworks/CloudDocs.framework/CloudDocs\n       0x1b2daf000 -        0x1b30d7fff  CoreData arm64  <e24c666c4b2b3977949b38f7ecb77acf> /System/Library/Frameworks/CoreData.framework/CoreData\n       0x1b3344000 -        0x1b336ffff  BoardServices arm64  <75360e4fd9e23e23ac26db3c2f34e0b5> /System/Library/PrivateFrameworks/BoardServices.framework/BoardServices\n       0x1b3370000 -        0x1b3425fff  libboringssl.dylib arm64  <4f90d596ac963a288e0c533a967a875f> /usr/lib/libboringssl.dylib\n       0x1b3426000 -        0x1b3434fff  libsystem_networkextension.dylib arm64  <20ca6a9aa218349ea7a0e557fcc6526b> /usr/lib/system/libsystem_networkextension.dylib\n       0x1b3435000 -        0x1b3455fff  CoreAnalytics arm64  <29ddc6d86fde3ec8b56ff73fa63839a5> /System/Library/PrivateFrameworks/CoreAnalytics.framework/CoreAnalytics\n       0x1b3456000 -        0x1b35c7fff  CloudKit arm64  <c22a8531a4563a3aac1c457e50474d59> /System/Library/Frameworks/CloudKit.framework/CloudKit\n       0x1b35c8000 -        0x1b3614fff  SpringBoardServices arm64  <9e65a64054413b84b0c7b25c2e166e24> /System/Library/PrivateFrameworks/SpringBoardServices.framework/SpringBoardServices\n       0x1b3615000 -        0x1b3688fff  FrontBoardServices arm64  <ba369656afef391aa426eed114a72432> /System/Library/PrivateFrameworks/FrontBoardServices.framework/FrontBoardServices\n       0x1b3689000 -        0x1b37a0fff  Network arm64  <5fd8d3086af139d9aa341e42d08b8e66> /System/Library/Frameworks/Network.framework/Network\n       0x1b37a1000 -        0x1b37fdfff  libusrtcp.dylib arm64  <a9326808573b380ca815b52e3856db27> /usr/lib/libusrtcp.dylib\n       0x1b37fe000 -        0x1b3805fff  libsystem_symptoms.dylib arm64  <759819cb30f43fe5a66f042097999037> /usr/lib/system/libsystem_symptoms.dylib\n       0x1b3806000 -        0x1b46fffff  GeoServices arm64  <0e10b37391f73527bb6a86a4f5dd87ca> /System/Library/PrivateFrameworks/GeoServices.framework/GeoServices\n       0x1b4700000 -        0x1b4708fff  TCC arm64  <ff3f25a5a6f638739a448464b4930400> /System/Library/PrivateFrameworks/TCC.framework/TCC\n       0x1b4709000 -        0x1b4762fff  IMFoundation arm64  <93c261e2c62c303eb5f85e8a10a37416> /System/Library/PrivateFrameworks/IMFoundation.framework/IMFoundation\n       0x1b4763000 -        0x1b48befff  CoreUtils arm64  <d5e1a21a55e1311e8b5c0eff56679548> /System/Library/PrivateFrameworks/CoreUtils.framework/CoreUtils\n       0x1b499c000 -        0x1b49a5fff  libsystem_containermanager.dylib arm64  <ede29a9bd91b33af82a382c843864e3f> /usr/lib/system/libsystem_containermanager.dylib\n       0x1b49a6000 -        0x1b4a22fff  AppleAccount arm64  <420420c089513d0ab1fe092d2437a99a> /System/Library/PrivateFrameworks/AppleAccount.framework/AppleAccount\n       0x1b4a23000 -        0x1b4a3efff  ApplePushService arm64  <040239923f183edeb6113b859725c65e> /System/Library/PrivateFrameworks/ApplePushService.framework/ApplePushService\n       0x1b4a3f000 -        0x1b4b2cfff  IDS arm64  <b33952645fee348b95ee03da501acdef> /System/Library/PrivateFrameworks/IDS.framework/IDS\n       0x1b4b2d000 -        0x1b4c59fff  IDSFoundation arm64  <f0590c6f7a3d3d7cbc4a1eacc2a9da31> /System/Library/PrivateFrameworks/IDSFoundation.framework/IDSFoundation\n       0x1b4c5a000 -        0x1b4c5bfff  libCTGreenTeaLogger.dylib arm64  <24dd3122ac313191b7b4f6103b7e6b9c> /usr/lib/libCTGreenTeaLogger.dylib\n       0x1b4cbf000 -        0x1b4dbdfff  CoreMedia arm64  <853acf0f24723e3d859f000af106f64c> /System/Library/Frameworks/CoreMedia.framework/CoreMedia\n       0x1b4dbe000 -        0x1b4dcdfff  UIKitServices arm64  <8170f61ba48c342294fbcdfcf8c9126c> /System/Library/PrivateFrameworks/UIKitServices.framework/UIKitServices\n       0x1b4dce000 -        0x1b4e20fff  BackBoardServices arm64  <73613c96a32935abaef16bbb48bbb7f3> /System/Library/PrivateFrameworks/BackBoardServices.framework/BackBoardServices\n       0x1b4e21000 -        0x1b5070fff  QuartzCore arm64  <3ee40592f01138cc8472776b3c912a42> /System/Library/Frameworks/QuartzCore.framework/QuartzCore\n       0x1b5071000 -        0x1b522efff  ColorSync arm64  <47014f6f8e1f3e4194f588c1424932ab> /System/Library/PrivateFrameworks/ColorSync.framework/ColorSync\n       0x1b522f000 -        0x1b579dfff  CoreGraphics arm64  <be2c65f7fc8e3a5fa5c618b89f49b6b5> /System/Library/Frameworks/CoreGraphics.framework/CoreGraphics\n       0x1b579e000 -        0x1b58cffff  Contacts arm64  <7b8bbb315c173181b8ae83fa58ad9689> /System/Library/Frameworks/Contacts.framework/Contacts\n       0x1b58d0000 -        0x1b58fffff  UserNotifications arm64  <81951875f07936778a4da79c799f2b08> /System/Library/Frameworks/UserNotifications.framework/UserNotifications\n       0x1b5900000 -        0x1b5923fff  LocationSupport arm64  <30c998f65a7e32bba8d46b1525e45b14> /System/Library/PrivateFrameworks/LocationSupport.framework/LocationSupport\n       0x1b5a81000 -        0x1b6052fff  WebKit arm64  <cc6d4aa00e703d8da0a0bac8a1d6682c> /System/Library/Frameworks/WebKit.framework/WebKit\n       0x1b6053000 -        0x1b7c47fff  WebCore arm64  <83a4a19111a0313897dcef1313f78bae> /System/Library/PrivateFrameworks/WebCore.framework/WebCore\n       0x1b7c48000 -        0x1b7c60fff  libAccessibility.dylib arm64  <f2c0fa2dda973c238a6dacb8a34ae0cb> /usr/lib/libAccessibility.dylib\n       0x1b7c61000 -        0x1b7c6cfff  AXCoreUtilities arm64  <3eef218b27d63f22a96e3323450c6c6f> /System/Library/PrivateFrameworks/AXCoreUtilities.framework/AXCoreUtilities\n       0x1b7c6d000 -        0x1b7ce1fff  ContactsFoundation arm64  <f8adc2d8ab2c3d9aa4e84fff09f99785> /System/Library/PrivateFrameworks/ContactsFoundation.framework/ContactsFoundation\n       0x1b7ce2000 -        0x1b7cf6fff  PowerLog arm64  <d52eff96ac9e35a48e21337dc6ad2829> /System/Library/PrivateFrameworks/PowerLog.framework/PowerLog\n       0x1b7cf7000 -        0x1b7d08fff  IOSurface arm64  <4d7cf4873d21390782cec2ea1a129f8d> /System/Library/Frameworks/IOSurface.framework/IOSurface\n       0x1b7d09000 -        0x1b8403fff  MediaToolbox arm64  <6c44365d76d93d64af81b2c19a30a6f9> /System/Library/Frameworks/MediaToolbox.framework/MediaToolbox\n       0x1b8404000 -        0x1b840cfff  GraphicsServices arm64  <cefbbc61fdb33db786bf337e511616db> /System/Library/PrivateFrameworks/GraphicsServices.framework/GraphicsServices\n       0x1b84f0000 -        0x1b86e2fff  AVFoundation arm64  <8b547ad0cb873383a84c65f07aab40f4> /System/Library/Frameworks/AVFoundation.framework/AVFoundation\n       0x1b871b000 -        0x1b8769fff  MobileWiFi arm64  <4b39ae62af383654aa84e4f443334b33> /System/Library/PrivateFrameworks/MobileWiFi.framework/MobileWiFi\n       0x1b876a000 -        0x1b8782fff  MobileAsset arm64  <1c5bbde9ebbe3f218abd6923239ed366> /System/Library/PrivateFrameworks/MobileAsset.framework/MobileAsset\n       0x1b8783000 -        0x1b8790fff  libGSFont.dylib arm64  <fa687458287e34c1be328c4a7fcc9700> /System/Library/PrivateFrameworks/FontServices.framework/libGSFont.dylib\n       0x1b8791000 -        0x1b879afff  FontServices arm64  <38caa4a4a5f230bd88056be639bd4f1e> /System/Library/PrivateFrameworks/FontServices.framework/FontServices\n       0x1b879b000 -        0x1b88e4fff  libFontParser.dylib arm64  <4984d0e104f634838f547596e55bdf18> /System/Library/PrivateFrameworks/FontServices.framework/libFontParser.dylib\n       0x1b8933000 -        0x1b8a71fff  SearchFoundation arm64  <9d30ef68807d3cd2838aa7eba4ed4212> /System/Library/PrivateFrameworks/SearchFoundation.framework/SearchFoundation\n       0x1b91ff000 -        0x1b9462fff  vImage arm64  <d9b1e202495c334294d97d7e3a2c1ba6> /System/Library/Frameworks/Accelerate.framework/Frameworks/vImage.framework/vImage\n       0x1b9463000 -        0x1b9696fff  AudioToolbox arm64  <9ac0321f74c63bdd88471e7e4ac512f6> /System/Library/Frameworks/AudioToolbox.framework/AudioToolbox\n       0x1b9697000 -        0x1b96ccfff  libAudioToolboxUtility.dylib arm64  <7e1f682862173a8fb1db362c00648bec> /usr/lib/libAudioToolboxUtility.dylib\n       0x1b9afb000 -        0x1b9b8ffff  ShareSheet arm64  <462350dec8b03377bdb962fecea11f85> /System/Library/PrivateFrameworks/ShareSheet.framework/ShareSheet\n       0x1b9ba4000 -        0x1b9c58fff  PDFKit arm64  <d56e02f7112f30798aa62fb48333f1c7> /System/Library/Frameworks/PDFKit.framework/PDFKit\n       0x1b9cd7000 -        0x1b9d04fff  DocumentManager arm64  <f9ff17823b3334a9887d5c989e2a63b5> /System/Library/PrivateFrameworks/DocumentManager.framework/DocumentManager\n       0x1b9f60000 -        0x1b9fd5fff  AuthKit arm64  <2b4c3618550232b2ab239d75f78f54e2> /System/Library/PrivateFrameworks/AuthKit.framework/AuthKit\n       0x1b9fd6000 -        0x1ba3ecfff  Intents arm64  <b19b6dd709e933ee86253e68ecf47e2e> /System/Library/Frameworks/Intents.framework/Intents\n       0x1ba3ed000 -        0x1ba401fff  libCGInterfaces.dylib arm64  <766e37326a673db8a08a136cfbc08e08> /System/Library/Frameworks/Accelerate.framework/Frameworks/vImage.framework/Libraries/libCGInterfaces.dylib\n       0x1ba402000 -        0x1ba54efff  WebKitLegacy arm64  <e259406b03a43977a227fcae8df2bc95> /System/Library/PrivateFrameworks/WebKitLegacy.framework/WebKitLegacy\n       0x1ba54f000 -        0x1ba5b7fff  TextInput arm64  <4d06bfec81303266bfa3ce229732b7ff> /System/Library/PrivateFrameworks/TextInput.framework/TextInput\n       0x1ba635000 -        0x1ba638fff  XCTTargetBootstrap arm64  <0aa0ddefd68833e99c6995e09f415b60> /System/Library/PrivateFrameworks/XCTTargetBootstrap.framework/XCTTargetBootstrap\n       0x1ba639000 -        0x1ba6eefff  CorePDF arm64  <788eef66d4cb3969b57b2d86473e5340> /System/Library/PrivateFrameworks/CorePDF.framework/CorePDF\n       0x1baae8000 -        0x1badf8fff  AppleMediaServices arm64  <c67d6000017c3779a37fc46bbb97f45e> /System/Library/PrivateFrameworks/AppleMediaServices.framework/AppleMediaServices\n       0x1bae20000 -        0x1bafe2fff  CoreMotion arm64  <86e7ee42c1f936fb9bf0af733547d042> /System/Library/Frameworks/CoreMotion.framework/CoreMotion\n       0x1bafe3000 -        0x1bb0d1fff  AVFAudio arm64  <9dd6382681143640a0d126cce251304f> /System/Library/Frameworks/AVFoundation.framework/Frameworks/AVFAudio.framework/AVFAudio\n       0x1bb2f0000 -        0x1bb3a6fff  CoreUI arm64  <8d9c17630c6b3e3bb0bba9ebd31a9743> /System/Library/PrivateFrameworks/CoreUI.framework/CoreUI\n       0x1bb3cc000 -        0x1bb401fff  CoreVideo arm64  <615441c4a6ca3e2a95cc481f479eb5e9> /System/Library/Frameworks/CoreVideo.framework/CoreVideo\n       0x1bb402000 -        0x1bb637fff  AudioToolboxCore arm64  <2993aee104d43b48abdf902c2676551a> /System/Library/PrivateFrameworks/AudioToolboxCore.framework/AudioToolboxCore\n       0x1bb638000 -        0x1bb67cfff  CoreDuetContext arm64  <f6dc4f55b8ae33a5b53b88dca60c5682> /System/Library/PrivateFrameworks/CoreDuetContext.framework/CoreDuetContext\n       0x1bb67d000 -        0x1bb6b6fff  SetupAssistant arm64  <7b6b2c47ce673ca5bb1ab80ece5d65f1> /System/Library/PrivateFrameworks/SetupAssistant.framework/SetupAssistant\n       0x1bb774000 -        0x1bb79efff  PlugInKit arm64  <ddea2f10d3e23f8ab5229b6737ba909e> /System/Library/PrivateFrameworks/PlugInKit.framework/PlugInKit\n       0x1bbc1c000 -        0x1bbc7cfff  ProactiveSupport arm64  <f191df1eab103e97bacd24b5f590007d> /System/Library/PrivateFrameworks/ProactiveSupport.framework/ProactiveSupport\n       0x1bbeb7000 -        0x1bbecefff  PrototypeTools arm64  <d8667b34f5433003b09d091adfb64805> /System/Library/PrivateFrameworks/PrototypeTools.framework/PrototypeTools\n       0x1bbecf000 -        0x1bbfc0fff  MediaExperience arm64  <598bafd00b5c3c42a7fbb40988916721> /System/Library/PrivateFrameworks/MediaExperience.framework/MediaExperience\n       0x1bbfc1000 -        0x1bc289fff  Celestial arm64  <f52eed32db8a3d85b9a3a1999d843a98> /System/Library/PrivateFrameworks/Celestial.framework/Celestial\n       0x1bcbb0000 -        0x1bcc7ffff  AVKit arm64  <f755cb3f9b6d3cf19a41a7bc06c06905> /System/Library/Frameworks/AVKit.framework/AVKit\n       0x1bcc80000 -        0x1bccaefff  Pegasus arm64  <562d126804043f4c954c8202788f9701> /System/Library/PrivateFrameworks/Pegasus.framework/Pegasus\n       0x1bccaf000 -        0x1bccb1fff  libapp_launch_measurement.dylib arm64  <9d0bbb4b26f43f048dfaebdbf0c05eb0> /usr/lib/libapp_launch_measurement.dylib\n       0x1bcd95000 -        0x1bcdf7fff  CoreSpotlight arm64  <c36e99ac58ce3575841e0d0b771f40cd> /System/Library/Frameworks/CoreSpotlight.framework/CoreSpotlight\n       0x1bcdf8000 -        0x1bce8ffff  AddressBookLegacy arm64  <9ca4733ccd0d3b9e984c8688719afe63> /System/Library/PrivateFrameworks/AddressBookLegacy.framework/AddressBookLegacy\n       0x1bce90000 -        0x1bce9ffff  CrashReporterSupport arm64  <8eeddd24d3223b099646fb1aa1026917> /System/Library/PrivateFrameworks/CrashReporterSupport.framework/CrashReporterSupport\n       0x1bceb3000 -        0x1bcf6efff  LinkPresentation arm64  <f85275392e0231bf80dad1ab6349049e> /System/Library/Frameworks/LinkPresentation.framework/LinkPresentation\n       0x1bcfa5000 -        0x1bcfa9fff  libsystem_configuration.dylib arm64  <1e27c5b60a4d3f1ea47cefa749d48f5b> /usr/lib/system/libsystem_configuration.dylib\n       0x1bd18a000 -        0x1bd198fff  HangTracer arm64  <b3e9322fab943496912f7fe7773796d7> /System/Library/PrivateFrameworks/HangTracer.framework/HangTracer\n       0x1bd199000 -        0x1bd1fefff  CoreNLP arm64  <c37e117574f13a84b83cddcc6d36a560> /System/Library/PrivateFrameworks/CoreNLP.framework/CoreNLP\n       0x1bd1ff000 -        0x1bd200fff  liblangid.dylib arm64  <f8030fe861f83b4ba8db4e3133d06e07> /usr/lib/liblangid.dylib\n       0x1bd201000 -        0x1bdf63fff  JavaScriptCore arm64  <c87fa51eb1033902a963faaedb228c86> /System/Library/Frameworks/JavaScriptCore.framework/JavaScriptCore\n       0x1bdf64000 -        0x1bdff1fff  libTelephonyUtilDynamic.dylib arm64  <db9921ca5b1931998bba465f6cb649b7> /usr/lib/libTelephonyUtilDynamic.dylib\n       0x1be281000 -        0x1be28afff  IOMobileFramebuffer arm64  <9ae16b80bede37a680cfd522fc007cfa> /System/Library/PrivateFrameworks/IOMobileFramebuffer.framework/IOMobileFramebuffer\n       0x1be5ea000 -        0x1be604fff  CoreMaterial arm64  <eea54b14217f36bbbba66cad5d287a11> /System/Library/PrivateFrameworks/CoreMaterial.framework/CoreMaterial\n       0x1be605000 -        0x1be6ebfff  libxml2.2.dylib arm64  <7f7184a1438535ea8c550e64d55e5d21> /usr/lib/libxml2.2.dylib\n       0x1bfd98000 -        0x1bfde0fff  MetadataUtilities arm64  <919bfbca98dd3051840efe59b0013602> /System/Library/PrivateFrameworks/MetadataUtilities.framework/MetadataUtilities\n       0x1c0775000 -        0x1c0991fff  NetworkExtension arm64  <71db5bddca78322093c64f4f374d504c> /System/Library/Frameworks/NetworkExtension.framework/NetworkExtension\n       0x1c0992000 -        0x1c09c8fff  DataDetectorsCore arm64  <bcd2f9571dbc35b6b73cda2bbe9c479d> /System/Library/PrivateFrameworks/DataDetectorsCore.framework/DataDetectorsCore\n       0x1c09c9000 -        0x1c0a29fff  CalendarFoundation arm64  <12842f439af23e469a86c68e441d9741> /System/Library/PrivateFrameworks/CalendarFoundation.framework/CalendarFoundation\n       0x1c0a2a000 -        0x1c0b1dfff  EventKit arm64  <d8555ac8820736428a8f883f5a4876f0> /System/Library/Frameworks/EventKit.framework/EventKit\n       0x1c0b1e000 -        0x1c0b53fff  MediaServices arm64  <0d206ca50c643fb0a93dd5d40b3b1b43> /System/Library/PrivateFrameworks/MediaServices.framework/MediaServices\n       0x1c0fae000 -        0x1c0fd9fff  PersistentConnection arm64  <19667077c3673477a67cb2e5c146c4be> /System/Library/PrivateFrameworks/PersistentConnection.framework/PersistentConnection\n       0x1c0fda000 -        0x1c102dfff  CalendarDaemon arm64  <0297bf11f5633d8c8d47dc7b2f717d4f> /System/Library/PrivateFrameworks/CalendarDaemon.framework/CalendarDaemon\n       0x1c102e000 -        0x1c10c4fff  CalendarDatabase arm64  <b094f18038dc38ae9ffc0d1434390f25> /System/Library/PrivateFrameworks/CalendarDatabase.framework/CalendarDatabase\n       0x1c10c5000 -        0x1c12a7fff  MediaRemote arm64  <eea8dd6f2e4b366e89bdb912c10f0300> /System/Library/PrivateFrameworks/MediaRemote.framework/MediaRemote\n       0x1c12a8000 -        0x1c12b0fff  CorePhoneNumbers arm64  <3c3d991d98a23f3dbfd1eb032174e894> /System/Library/PrivateFrameworks/CorePhoneNumbers.framework/CorePhoneNumbers\n       0x1c12c1000 -        0x1c12e7fff  DuetActivityScheduler arm64  <ec932656e7813f1db296d4567105a8e3> /System/Library/PrivateFrameworks/DuetActivityScheduler.framework/DuetActivityScheduler\n       0x1c13eb000 -        0x1c140dfff  CoreSVG arm64  <5589a0bec18d34ada40d42adf27d2d4a> /System/Library/PrivateFrameworks/CoreSVG.framework/CoreSVG\n       0x1c1428000 -        0x1c1445fff  ProactiveEventTracker arm64  <28aa1f82e89f369c808ed513f7b5e894> /System/Library/PrivateFrameworks/ProactiveEventTracker.framework/ProactiveEventTracker\n       0x1c1446000 -        0x1c1450fff  MallocStackLogging arm64  <37c11061daa13446bc06f11914e40361> /System/Library/PrivateFrameworks/MallocStackLogging.framework/MallocStackLogging\n       0x1c1451000 -        0x1c14e6fff  CoreSuggestions arm64  <65b55a99ce963190a6a8def30fd5fbb5> /System/Library/PrivateFrameworks/CoreSuggestions.framework/CoreSuggestions\n       0x1c1ef5000 -        0x1c1f2afff  CoreBluetooth arm64  <b2b99c7c561a3520bf2acdefa088dc3b> /System/Library/Frameworks/CoreBluetooth.framework/CoreBluetooth\n       0x1c1f2b000 -        0x1c1f2dfff  libsystem_sandbox.dylib arm64  <c74f469db77236da854918db15fb8ef6> /usr/lib/system/libsystem_sandbox.dylib\n       0x1c2091000 -        0x1c20fdfff  Rapport arm64  <31e58863b4e63673ac4f100fc32689ce> /System/Library/PrivateFrameworks/Rapport.framework/Rapport\n       0x1c20fe000 -        0x1c212afff  OSAnalytics arm64  <a0003e784185313480c6638c27b5959c> /System/Library/PrivateFrameworks/OSAnalytics.framework/OSAnalytics\n       0x1c212b000 -        0x1c215afff  MobileInstallation arm64  <5c6453d1d3163517b3a383f6136ab676> /System/Library/PrivateFrameworks/MobileInstallation.framework/MobileInstallation\n       0x1c215b000 -        0x1c21f5fff  Metal arm64  <5afbbbb9501c3abbaa93836da30d133d> /System/Library/Frameworks/Metal.framework/Metal\n       0x1c21f6000 -        0x1c21fcfff  IOAccelerator arm64  <6c40b6d52d5137628eb036ab042a4a9a> /System/Library/PrivateFrameworks/IOAccelerator.framework/IOAccelerator\n       0x1c21fd000 -        0x1c2208fff  MediaAccessibility arm64  <8b640f442ded3d0581d639e9fd9049b5> /System/Library/Frameworks/MediaAccessibility.framework/MediaAccessibility\n       0x1c2226000 -        0x1c222dfff  libsystem_dnssd.dylib arm64  <1ead228266503faa9e8efe24a3f937b1> /usr/lib/system/libsystem_dnssd.dylib\n       0x1c222e000 -        0x1c2234fff  PushKit arm64  <5d2460bb22c839748c16b2fe8be86110> /System/Library/Frameworks/PushKit.framework/PushKit\n       0x1c2235000 -        0x1c233bfff  FileProvider arm64  <8b68315b43b43c26a26dd7310ff59e57> /System/Library/Frameworks/FileProvider.framework/FileProvider\n       0x1c234f000 -        0x1c2350fff  BackgroundTaskAgent arm64  <d731ebd58f1e3ecf82284997249ce23d> /System/Library/PrivateFrameworks/BackgroundTaskAgent.framework/BackgroundTaskAgent\n       0x1c2351000 -        0x1c2355fff  LinguisticData arm64  <e9b0246c0b223eb29e993d12ec31691e> /System/Library/PrivateFrameworks/LinguisticData.framework/LinguisticData\n       0x1c239a000 -        0x1c2455fff  VideoToolbox arm64  <9a8f0211a5e133fabb0586e159254703> /System/Library/Frameworks/VideoToolbox.framework/VideoToolbox\n       0x1c29b1000 -        0x1c29b9fff  SymptomDiagnosticReporter arm64  <de6850a91f5330829cd36737b526efb1> /System/Library/PrivateFrameworks/SymptomDiagnosticReporter.framework/SymptomDiagnosticReporter\n       0x1c29ba000 -        0x1c29bcfff  IOSurfaceAccelerator arm64  <4ef0b026a02d37da867b6b4caa00eb86> /System/Library/PrivateFrameworks/IOSurfaceAccelerator.framework/IOSurfaceAccelerator\n       0x1c2a6c000 -        0x1c2a9bfff  DataAccessExpress arm64  <de9fc70210d73f268626056e6221ddc8> /System/Library/PrivateFrameworks/DataAccessExpress.framework/DataAccessExpress\n       0x1c2b0c000 -        0x1c2b21fff  CoreFollowUp arm64  <7497056934323d4183af2938525bc0d1> /System/Library/PrivateFrameworks/CoreFollowUp.framework/CoreFollowUp\n       0x1c2b2b000 -        0x1c2b40fff  libcoretls.dylib arm64  <cdd6e88ab51236f88304ff0e9fdef4ad> /usr/lib/libcoretls.dylib\n       0x1c2b97000 -        0x1c2c26fff  libate.dylib arm64  <cb99ad1b659138dfbe550f38c8e3a088> /usr/lib/libate.dylib\n       0x1c3fe6000 -        0x1c405dfff  SAObjects arm64  <bfdd4674ad013ab9a7bc0c10d221b088> /System/Library/PrivateFrameworks/SAObjects.framework/SAObjects\n       0x1c4111000 -        0x1c411efff  DataMigration arm64  <2b7610c77e5b3baf9bc4ff96ead08425> /System/Library/PrivateFrameworks/DataMigration.framework/DataMigration\n       0x1c42d2000 -        0x1c42f6fff  IconServices arm64  <234299ad5ee035e3b3419cda532eb0b6> /System/Library/PrivateFrameworks/IconServices.framework/IconServices\n       0x1c47ac000 -        0x1c47adfff  WatchdogClient arm64  <d7ff9b9a95503de1a49786760af29d91> /System/Library/PrivateFrameworks/WatchdogClient.framework/WatchdogClient\n       0x1c47ae000 -        0x1c47bffff  libprequelite.dylib arm64  <5d43cd16fd1e3760a914ee604d53d5cc> /usr/lib/libprequelite.dylib\n       0x1c47e7000 -        0x1c47f7fff  CoreEmoji arm64  <4520569fbd88306d9833b1453e7efcc9> /System/Library/PrivateFrameworks/CoreEmoji.framework/CoreEmoji\n       0x1c488f000 -        0x1c48ddfff  ClassKit arm64  <8c81187fd37e37a8b9a7a9795f907671> /System/Library/Frameworks/ClassKit.framework/ClassKit\n       0x1c494a000 -        0x1c4956fff  CPMS arm64  <26ecdd8ff8b1343fb36e2ceb56ee2939> /System/Library/PrivateFrameworks/CPMS.framework/CPMS\n       0x1c4abe000 -        0x1c4b0afff  MobileBackup arm64  <fe223d09348d30329b5e0bfcb862c0f4> /System/Library/PrivateFrameworks/MobileBackup.framework/MobileBackup\n       0x1c4bba000 -        0x1c4bc1fff  CoreTime arm64  <f43fcad4ffec3d7ba9977d546772cb33> /System/Library/PrivateFrameworks/CoreTime.framework/CoreTime\n       0x1c5487000 -        0x1c54a5fff  AppConduit arm64  <ad32742c04f5339ab8320ae813fb783c> /System/Library/PrivateFrameworks/AppConduit.framework/AppConduit\n       0x1c54a6000 -        0x1c54befff  IntlPreferences arm64  <17df023ff77235bb8cf4bd415779fe80> /System/Library/PrivateFrameworks/IntlPreferences.framework/IntlPreferences\n       0x1c583a000 -        0x1c590efff  CoreBrightness arm64  <e6f28809466f3cd7bffd11d3be112019> /System/Library/PrivateFrameworks/CoreBrightness.framework/CoreBrightness\n       0x1c590f000 -        0x1c5916fff  libIOReport.dylib arm64  <9c260447706133cd856cf4212a74f759> /usr/lib/libIOReport.dylib\n       0x1c5aa7000 -        0x1c5c4ffff  libBNNS.dylib arm64  <d7b55fcd4a16326dbed864169a84df05> /System/Library/Frameworks/Accelerate.framework/Frameworks/vecLib.framework/libBNNS.dylib\n       0x1c5c50000 -        0x1c5c57fff  StudyLog arm64  <7cc9e5552c0b305f9e245abf981b62a1> /System/Library/PrivateFrameworks/StudyLog.framework/StudyLog\n       0x1c6e95000 -        0x1c6ea8fff  LocalAuthentication arm64  <72045bcaec7e3a4ca28b50dac50f588e> /System/Library/Frameworks/LocalAuthentication.framework/LocalAuthentication\n       0x1c6ed1000 -        0x1c6edcfff  CaptiveNetwork arm64  <0552986cee333370aa966671ab0aae16> /System/Library/PrivateFrameworks/CaptiveNetwork.framework/CaptiveNetwork\n       0x1c6edd000 -        0x1c6eddfff  AdSupport arm64  <9f5c7085cda33443aba2bdb111046209> /System/Library/Frameworks/AdSupport.framework/AdSupport\n       0x1c702e000 -        0x1c70e0fff  libBLAS.dylib arm64  <57aa1f484644390ba52d46bcf2b9ef5f> /System/Library/Frameworks/Accelerate.framework/Frameworks/vecLib.framework/libBLAS.dylib\n       0x1c70e1000 -        0x1c70effff  CTCarrierSpace arm64  <216a39c5c002354eadf5b65721896e9c> /System/Library/PrivateFrameworks/CTCarrierSpace.framework/CTCarrierSpace\n       0x1c7b97000 -        0x1c7bb1fff  libtailspin.dylib arm64  <109497d4ddfa37bdbbf400754a39ea8f> /usr/lib/libtailspin.dylib\n       0x1c7cf9000 -        0x1c7d07fff  MobileIcons arm64  <b2ea775049743e48b40c413602d6058a> /System/Library/PrivateFrameworks/MobileIcons.framework/MobileIcons\n       0x1c7d08000 -        0x1c7e08fff  ResponseKit arm64  <40dd302f884936708ff18a30f50f6ae9> /System/Library/PrivateFrameworks/ResponseKit.framework/ResponseKit\n       0x1c7ed0000 -        0x1c7f19fff  CoreHaptics arm64  <1157e81a94623a31a0ca98470511a761> /System/Library/Frameworks/CoreHaptics.framework/CoreHaptics\n       0x1c7f1a000 -        0x1c7fe3fff  ProofReader arm64  <44df2d5a1f2634699d677f2fd54f34b1> /System/Library/PrivateFrameworks/ProofReader.framework/ProofReader\n       0x1c8054000 -        0x1c80d4fff  CoreSymbolication arm64  <28d570647ec73ceaaacfc7a3f21b2303> /System/Library/PrivateFrameworks/CoreSymbolication.framework/CoreSymbolication\n       0x1c80d5000 -        0x1c80dbfff  IdleTimerServices arm64  <32df45a981cc3ee8990e4e8a447fbc7a> /System/Library/PrivateFrameworks/IdleTimerServices.framework/IdleTimerServices\n       0x1c8761000 -        0x1c87a8fff  LoggingSupport arm64  <2132f7060d4630ce888ceaf1d40e4aeb> /System/Library/PrivateFrameworks/LoggingSupport.framework/LoggingSupport\n       0x1c88c0000 -        0x1c891afff  ProtectedCloudStorage arm64  <a5bfbbd5554a3910b4275d95cf2377be> /System/Library/PrivateFrameworks/ProtectedCloudStorage.framework/ProtectedCloudStorage\n       0x1c8a04000 -        0x1c8a0dfff  OpenGLES arm64  <3044208ed61c34eca2370a8b687a5ccd> /System/Library/Frameworks/OpenGLES.framework/OpenGLES\n       0x1c8b6e000 -        0x1c8b76fff  libGFXShared.dylib arm64  <69f0756ab7723506b193c7fccf54af28> /System/Library/Frameworks/OpenGLES.framework/libGFXShared.dylib\n       0x1c8b77000 -        0x1c8babfff  SharedUtils arm64  <6f5b156a4ff035ac856a13d000adeffa> /System/Library/Frameworks/LocalAuthentication.framework/Support/SharedUtils.framework/SharedUtils\n       0x1c9c4d000 -        0x1c9c89fff  StreamingZip arm64  <d87249a51fc036bbb9c7a728e842ceea> /System/Library/PrivateFrameworks/StreamingZip.framework/StreamingZip\n       0x1cab7d000 -        0x1cab80fff  InternationalTextSearch arm64  <a674c74860d73dc2bf3367ada28d92a7> /System/Library/PrivateFrameworks/InternationalTextSearch.framework/InternationalTextSearch\n       0x1cb54e000 -        0x1cb566fff  NetworkStatistics arm64  <ebf841b0f0183448aaee15861aa4901f> /System/Library/PrivateFrameworks/NetworkStatistics.framework/NetworkStatistics\n       0x1cb9c2000 -        0x1cb9c8fff  Netrb arm64  <fde3934ed0fb396e9591e0956b91ee22> /System/Library/PrivateFrameworks/Netrb.framework/Netrb\n       0x1cb9cc000 -        0x1cb9fcfff  EAP8021X arm64  <e07743198cd5327e8b3595eb650d6522> /System/Library/PrivateFrameworks/EAP8021X.framework/EAP8021X\n       0x1cb9fd000 -        0x1cb9fffff  OSAServicesClient arm64  <580c56fbc3a236aba11042dcee1989f6> /System/Library/PrivateFrameworks/OSAServicesClient.framework/OSAServicesClient\n       0x1cbba0000 -        0x1cbba4fff  libgermantok.dylib arm64  <8198ea3c7255321fa5db22fd3f3174af> /usr/lib/libgermantok.dylib\n       0x1cbba5000 -        0x1cbc58fff  libmecab.dylib arm64  <d4683ab4e68731e58fd4f8ee0dd5f5a8> /usr/lib/libmecab.dylib\n       0x1cc255000 -        0x1cc263fff  CoreDuetDaemonProtocol arm64  <0970436c4af93f7888b6d2b6a1fe5d6e> /System/Library/PrivateFrameworks/CoreDuetDaemonProtocol.framework/CoreDuetDaemonProtocol\n       0x1cd7b7000 -        0x1cd7b9fff  OAuth arm64  <da98ee74f86f34f58fc2ad172b270a37> /System/Library/PrivateFrameworks/OAuth.framework/OAuth\n       0x1ce007000 -        0x1ce03efff  WatchConnectivity arm64  <655a7ed2736f3f0483c7df9b69ac059e> /System/Library/Frameworks/WatchConnectivity.framework/WatchConnectivity\n       0x1ce27d000 -        0x1ce2ecfff  libarchive.2.dylib arm64  <20d6c601da6f361d89844280e4574581> /usr/lib/libarchive.2.dylib\n       0x1ce2ed000 -        0x1ce31efff  C2 arm64  <a67ece10c2793a2cb7721f32f5d56011> /System/Library/PrivateFrameworks/C2.framework/C2\n       0x1ce31f000 -        0x1ce353fff  NaturalLanguage arm64  <d4d8baf804a83caf914ad9af353ecc7e> /System/Library/Frameworks/NaturalLanguage.framework/NaturalLanguage\n       0x1ce3e7000 -        0x1ce3e8fff  libsystem_coreservices.dylib arm64  <fcab73a3e2173933a5c3ab5116b189c3> /usr/lib/system/libsystem_coreservices.dylib\n       0x1ce3fa000 -        0x1ce40cfff  libmis.dylib arm64  <aa14d34eaea33a079eee3cd19f7acf7f> /usr/lib/libmis.dylib\n       0x1ce5ff000 -        0x1ce607fff  libcopyfile.dylib arm64  <aa5eeef7f5b131cea4db28e6edb5cbd7> /usr/lib/system/libcopyfile.dylib\n       0x1ce96b000 -        0x1ce9fbfff  AccountsDaemon arm64  <6bdda96b6fbd337ab0b927eeba0d3b62> /System/Library/PrivateFrameworks/AccountsDaemon.framework/AccountsDaemon\n       0x1ce9fc000 -        0x1cea07fff  AppleIDSSOAuthentication arm64  <7a4270b2fcd33a6e9333fe4133a25bb2> /System/Library/PrivateFrameworks/AppleIDSSOAuthentication.framework/AppleIDSSOAuthentication\n       0x1ceb4a000 -        0x1cebc6fff  Symbolication arm64  <a8b767353ab43222a64563f5cbc22d5f> /System/Library/PrivateFrameworks/Symbolication.framework/Symbolication\n       0x1ced7c000 -        0x1cedcafff  ChunkingLibrary arm64  <628d7826f51934bfbc36831de9b365d6> /System/Library/PrivateFrameworks/ChunkingLibrary.framework/ChunkingLibrary\n       0x1cf2d2000 -        0x1cf2d4fff  CoreDuetDebugLogging arm64  <93bf2dfd16df3832a4ed4fcd56d2c070> /System/Library/PrivateFrameworks/CoreDuetDebugLogging.framework/CoreDuetDebugLogging\n       0x1cfdde000 -        0x1cfe1cfff  SignpostSupport arm64  <5fae84042c1a39ca9628a4546973ad06> /System/Library/PrivateFrameworks/SignpostSupport.framework/SignpostSupport\n       0x1d007f000 -        0x1d0088fff  SignpostCollection arm64  <ed2a0149cfd630d1831387abe8f94817> /System/Library/PrivateFrameworks/SignpostCollection.framework/SignpostCollection\n       0x1d07b9000 -        0x1d07c0fff  URLFormatting arm64  <d0535b15227c38b996086c162d7eb0c4> /System/Library/PrivateFrameworks/URLFormatting.framework/URLFormatting\n       0x1d08d5000 -        0x1d0b02fff  MobileSpotlightIndex arm64  <e16d194fe64033b6b64ef1d02f784c20> /System/Library/PrivateFrameworks/MobileSpotlightIndex.framework/MobileSpotlightIndex\n       0x1d0ed8000 -        0x1d0f1efff  CoreLocationProtobuf arm64  <3dcb34978e4b36859a075990421d15fb> /System/Library/PrivateFrameworks/CoreLocationProtobuf.framework/CoreLocationProtobuf\n       0x1d0fd2000 -        0x1d104ffff  Quagga arm64  <9db70b2c75ba3568800d72a92f583730> /System/Library/PrivateFrameworks/Quagga.framework/Quagga\n       0x1d135c000 -        0x1d1371fff  libEDR arm64  <a426203d67753c6c8f502ed5c1924090> /System/Library/PrivateFrameworks/libEDR.framework/libEDR\n       0x1d1f90000 -        0x1d1f9efff  libperfcheck.dylib arm64  <546f9a267f063a1890ac443c0b8eb3b9> /usr/lib/libperfcheck.dylib\n       0x1d1f9f000 -        0x1d1faafff  libAudioStatistics.dylib arm64  <0a6aec93ae4e3c779f0da4c2a72d8905> /usr/lib/libAudioStatistics.dylib\n       0x1d216c000 -        0x1d217cfff  caulk arm64  <6f54863c3531357584aa32b7893025e5> /System/Library/PrivateFrameworks/caulk.framework/caulk\n       0x1d21bc000 -        0x1d21c2fff  MobileSystemServices arm64  <51edec88cb953e928413cd1cf32bc802> /System/Library/PrivateFrameworks/MobileSystemServices.framework/MobileSystemServices\n       0x1d32aa000 -        0x1d32e3fff  libGLImage.dylib arm64  <ce4165f7a7e83e65be8f76af50c156e8> /System/Library/Frameworks/OpenGLES.framework/libGLImage.dylib\n       0x1d3711000 -        0x1d3722fff  libSparseBLAS.dylib arm64  <77cc08d444a83670a3c7d64c38450e56> /System/Library/Frameworks/Accelerate.framework/Frameworks/vecLib.framework/libSparseBLAS.dylib\n       0x1d3723000 -        0x1d3736fff  Engram arm64  <1183e3c67e4f370d855999579e401d60> /System/Library/PrivateFrameworks/Engram.framework/Engram\n       0x1d37ae000 -        0x1d37e8fff  DataDetectorsNaturalLanguage arm64  <94326f5e6f1f333d88e05a6657e6d472> /System/Library/PrivateFrameworks/DataDetectorsNaturalLanguage.framework/DataDetectorsNaturalLanguage\n       0x1d3af0000 -        0x1d3b6efff  CoreDAV arm64  <9b36fa2d9e4d372f8b9fbd82bc094860> /System/Library/PrivateFrameworks/CoreDAV.framework/CoreDAV\n       0x1d44bd000 -        0x1d44cdfff  RemoteTextInput arm64  <1218e6d5c5f03ddaa152f65edcbb2032> /System/Library/PrivateFrameworks/RemoteTextInput.framework/RemoteTextInput\n       0x1d44f6000 -        0x1d4525fff  iCalendar arm64  <34d1fb97c3f03fcd8f1b4226952fbca6> /System/Library/PrivateFrameworks/iCalendar.framework/iCalendar\n       0x1d458a000 -        0x1d459efff  libLinearAlgebra.dylib arm64  <0572685470573cd6890b9a5f60f4c149> /System/Library/Frameworks/Accelerate.framework/Frameworks/vecLib.framework/libLinearAlgebra.dylib\n       0x1d483d000 -        0x1d484bfff  CoreAUC arm64  <0b48231b7d8133168b55dcbebde5ecdd> /System/Library/PrivateFrameworks/CoreAUC.framework/CoreAUC\n       0x1d52b5000 -        0x1d52fcfff  PhysicsKit arm64  <9ff5dbc88d2f3567a80e27e845970e6e> /System/Library/PrivateFrameworks/PhysicsKit.framework/PhysicsKit\n       0x1d52fd000 -        0x1d534efff  CorePrediction arm64  <7ec324458867321abf71d9e8e8320ec4> /System/Library/PrivateFrameworks/CorePrediction.framework/CorePrediction\n       0x1d57af000 -        0x1d57fafff  SafariSafeBrowsing arm64  <4a31bd81d64f300193bbebcb2ef6c12a> /System/Library/PrivateFrameworks/SafariSafeBrowsing.framework/SafariSafeBrowsing\n       0x1d5ca7000 -        0x1d5cc5fff  GenerationalStorage arm64  <9c31d008592e30319b90e26e1516d828> /System/Library/PrivateFrameworks/GenerationalStorage.framework/GenerationalStorage\n       0x1d5d2a000 -        0x1d5d35fff  PersonaKit arm64  <78d0464bdc153816b12d43398fff9df0> /System/Library/PrivateFrameworks/PersonaKit.framework/PersonaKit\n       0x1d6150000 -        0x1d6155fff  kperf arm64  <ee9572497fbf33a48220594652071c84> /System/Library/PrivateFrameworks/kperf.framework/kperf\n       0x1d6329000 -        0x1d635cfff  libpcap.A.dylib arm64  <db740f5ee61733cc9cf0395f776372da> /usr/lib/libpcap.A.dylib\n       0x1d66a5000 -        0x1d673ffff  libvDSP.dylib arm64  <dc80adf2f1f93c7d86af56f519205aba> /System/Library/Frameworks/Accelerate.framework/Frameworks/vecLib.framework/libvDSP.dylib\n       0x1d6740000 -        0x1d676bfff  vCard arm64  <525637bd53e13ef78d1e42c4b426b7db> /System/Library/PrivateFrameworks/vCard.framework/vCard\n       0x1d67b3000 -        0x1d683efff  SampleAnalysis arm64  <7f6ef86dbc713402bc0b77a9edf435c1> /System/Library/PrivateFrameworks/SampleAnalysis.framework/SampleAnalysis\n       0x1d683f000 -        0x1d684afff  IntentsFoundation arm64  <7c1e81a3a0683576b94a2df819035b18> /System/Library/PrivateFrameworks/IntentsFoundation.framework/IntentsFoundation\n       0x1d72b6000 -        0x1d72b6fff  Accelerate arm64  <7fbf97ba921e35349dceafc6f2e83085> /System/Library/Frameworks/Accelerate.framework/Accelerate\n       0x1d72b8000 -        0x1d75d3fff  libLAPACK.dylib arm64  <d6ea6a57de14389ca3ec031d84ba62d5> /System/Library/Frameworks/Accelerate.framework/Frameworks/vecLib.framework/libLAPACK.dylib\n       0x1d75d4000 -        0x1d75d8fff  libQuadrature.dylib arm64  <864ba6a8213c3e25a558dacf9c17424b> /System/Library/Frameworks/Accelerate.framework/Frameworks/vecLib.framework/libQuadrature.dylib\n       0x1d75d9000 -        0x1d7632fff  libvMisc.dylib arm64  <2a5cad3e768c3068adde0fcf2c0f525b> /System/Library/Frameworks/Accelerate.framework/Frameworks/vecLib.framework/libvMisc.dylib\n       0x1d7633000 -        0x1d7633fff  vecLib arm64  <165af11d20af32d492e65566bd61e933> /System/Library/Frameworks/Accelerate.framework/Frameworks/vecLib.framework/vecLib\n       0x1d79f1000 -        0x1d7a1efff  GSS arm64  <3c15956942da3635965e0d93087a87e6> /System/Library/Frameworks/GSS.framework/GSS\n       0x1d7a32000 -        0x1d7a63fff  MPSCore arm64  <3783a8c38857344b993a2275dbbe4f32> /System/Library/Frameworks/MetalPerformanceShaders.framework/Frameworks/MPSCore.framework/MPSCore\n       0x1d7a64000 -        0x1d7addfff  MPSImage arm64  <0df2ad87d643399083dc6f043aa01f06> /System/Library/Frameworks/MetalPerformanceShaders.framework/Frameworks/MPSImage.framework/MPSImage\n       0x1d7ade000 -        0x1d7b00fff  MPSMatrix arm64  <03b14bc196133c0faf56c0ddf0fb056d> /System/Library/Frameworks/MetalPerformanceShaders.framework/Frameworks/MPSMatrix.framework/MPSMatrix\n       0x1d7b01000 -        0x1d7b15fff  MPSNDArray arm64  <402ebef5f4293c00910753126b2cf674> /System/Library/Frameworks/MetalPerformanceShaders.framework/Frameworks/MPSNDArray.framework/MPSNDArray\n       0x1d7b16000 -        0x1d7ca6fff  MPSNeuralNetwork arm64  <3f56d22b7d8c3c0abafd7f53cb08efbb> /System/Library/Frameworks/MetalPerformanceShaders.framework/Frameworks/MPSNeuralNetwork.framework/MPSNeuralNetwork\n       0x1d7ca7000 -        0x1d7cecfff  MPSRayIntersector arm64  <38acb90ef6473540ba96cef4852ffd18> /System/Library/Frameworks/MetalPerformanceShaders.framework/Frameworks/MPSRayIntersector.framework/MPSRayIntersector\n       0x1d7ced000 -        0x1d7cedfff  MetalPerformanceShaders arm64  <4d10c81dd6cb3e2eafbde261c6e5162a> /System/Library/Frameworks/MetalPerformanceShaders.framework/MetalPerformanceShaders\n       0x1d7cfa000 -        0x1d7cfafff  MobileCoreServices arm64  <2cb592ab1cfd371ebb935265787f790f> /System/Library/Frameworks/MobileCoreServices.framework/MobileCoreServices\n       0x1d7d05000 -        0x1d7d06fff  libCVMSPluginSupport.dylib arm64  <958fbb083e6136228c0ff7ddee7456d9> /System/Library/Frameworks/OpenGLES.framework/libCVMSPluginSupport.dylib\n       0x1d7d07000 -        0x1d7d0dfff  libCoreFSCache.dylib arm64  <507f7ab6b9b131beb0145aef6b49a26c> /System/Library/Frameworks/OpenGLES.framework/libCoreFSCache.dylib\n       0x1d7d0e000 -        0x1d7d13fff  libCoreVMClient.dylib arm64  <966b47cee1dd32d085826496866b281f> /System/Library/Frameworks/OpenGLES.framework/libCoreVMClient.dylib\n       0x1d7d47000 -        0x1d7d7efff  QuickLookThumbnailing arm64  <f4c80fba72c933b9b89793ec8867eec8> /System/Library/Frameworks/QuickLookThumbnailing.framework/QuickLookThumbnailing\n       0x1d8188000 -        0x1d8188fff  UIKit arm64  <6481cf0cb1813c5bb847eacf0a09ae62> /System/Library/Frameworks/UIKit.framework/UIKit\n       0x1d85bd000 -        0x1d870dfff  ANECompiler arm64  <1d9b89a9a46639b9a848540f8a988f28> /System/Library/PrivateFrameworks/ANECompiler.framework/ANECompiler\n       0x1d870e000 -        0x1d871efff  ANEServices arm64  <8e32f596f2fd33a0aeba7c51c5aa7ff1> /System/Library/PrivateFrameworks/ANEServices.framework/ANEServices\n       0x1d8727000 -        0x1d87bbfff  APFS arm64  <85bcddcd070d345b90ffa6e91fa38181> /System/Library/PrivateFrameworks/APFS.framework/APFS\n       0x1d87bc000 -        0x1d87c0fff  ASEProcessing arm64  <6c8a4d4ea9923377878edad345ac39d0> /System/Library/PrivateFrameworks/ASEProcessing.framework/ASEProcessing\n       0x1d8965000 -        0x1d8970fff  AccountSettings arm64  <fdb003720c8b3bdebb31a7cad8beb55b> /System/Library/PrivateFrameworks/AccountSettings.framework/AccountSettings\n       0x1d929e000 -        0x1d92acfff  AppleFSCompression arm64  <faf2d07e41b937c7b2f91d35153265ff> /System/Library/PrivateFrameworks/AppleFSCompression.framework/AppleFSCompression\n       0x1d92b3000 -        0x1d92c1fff  AppleIDAuthSupport arm64  <ad5978a114c633769351814a6ec47188> /System/Library/PrivateFrameworks/AppleIDAuthSupport.framework/AppleIDAuthSupport\n       0x1d92c2000 -        0x1d9303fff  AppleJPEG arm64  <9875c6bbc7143814b51f865d0d51093b> /System/Library/PrivateFrameworks/AppleJPEG.framework/AppleJPEG\n       0x1d931f000 -        0x1d9330fff  AppleNeuralEngine arm64  <9a2febaec86335a18976db48ac91ae89> /System/Library/PrivateFrameworks/AppleNeuralEngine.framework/AppleNeuralEngine\n       0x1d9337000 -        0x1d935afff  AppleSauce arm64  <9b0fc51f4f6d3caab154c293088a842f> /System/Library/PrivateFrameworks/AppleSauce.framework/AppleSauce\n       0x1d9555000 -        0x1d9585fff  Bom arm64  <65c42a97d7a33701bcada51f3c4045a2> /System/Library/PrivateFrameworks/Bom.framework/Bom\n       0x1da015000 -        0x1da01cfff  CommonAuth arm64  <1bf0a53e84213e848b909b2db46f753b> /System/Library/PrivateFrameworks/CommonAuth.framework/CommonAuth\n       0x1da439000 -        0x1da43dfff  CoreOptimization arm64  <bd6084a322943a35812179c75919d8eb> /System/Library/PrivateFrameworks/CoreOptimization.framework/CoreOptimization\n       0x1da554000 -        0x1da55ffff  DeviceIdentity arm64  <5ee8f236f8a9381e8702326ef54d619a> /System/Library/PrivateFrameworks/DeviceIdentity.framework/DeviceIdentity\n       0x1da6eb000 -        0x1da706fff  DocumentManagerCore arm64  <97581575ca673b3f9cb6c1423835ae9c> /System/Library/PrivateFrameworks/DocumentManagerCore.framework/DocumentManagerCore\n       0x1da7c2000 -        0x1dae1cfff  Espresso arm64  <075f845f82ad3bb6843c1dfe7aba25b0> /System/Library/PrivateFrameworks/Espresso.framework/Espresso\n       0x1db0e5000 -        0x1db4f7fff  FaceCore arm64  <9efae0f103583d3fbf8b1377c8b9e7a7> /System/Library/PrivateFrameworks/FaceCore.framework/FaceCore\n       0x1db5ca000 -        0x1db5defff  libGSFontCache.dylib arm64  <39e55570d2f936579efe88425a75b9d3> /System/Library/PrivateFrameworks/FontServices.framework/libGSFontCache.dylib\n       0x1db642000 -        0x1db64efff  libhvf.dylib arm64  <8f09fb306bd839cd82c0e9cef8fce571> /System/Library/PrivateFrameworks/FontServices.framework/libhvf.dylib\n       0x1dc34b000 -        0x1dc357fff  GraphVisualizer arm64  <4a8def8ad5bb3435b77513bdcca5adb8> /System/Library/PrivateFrameworks/GraphVisualizer.framework/GraphVisualizer\n       0x1dccc3000 -        0x1dcd32fff  Heimdal arm64  <adef335d73a931659d51b482bbed39d8> /System/Library/PrivateFrameworks/Heimdal.framework/Heimdal\n       0x1dd281000 -        0x1dd287fff  InternationalSupport arm64  <d59a132ed1703278b605f9a8f1ff907a> /System/Library/PrivateFrameworks/InternationalSupport.framework/InternationalSupport\n       0x1dd542000 -        0x1dd542fff  Marco arm64  <27d9d06a1358385899cfe95887a94017> /System/Library/PrivateFrameworks/Marco.framework/Marco\n       0x1dda2f000 -        0x1dda42fff  MobileDeviceLink arm64  <58a405e7297938d6b46c85c62ab84954> /System/Library/PrivateFrameworks/MobileDeviceLink.framework/MobileDeviceLink\n       0x1ddcf2000 -        0x1ddd31fff  OTSVG arm64  <6b0beb76b463391b86120b564d081e79> /System/Library/PrivateFrameworks/OTSVG.framework/OTSVG\n       0x1de37f000 -        0x1de37ffff  PhoneNumbers arm64  <0fb60c5e929936be9675a71c4c131c2a> /System/Library/PrivateFrameworks/PhoneNumbers.framework/PhoneNumbers\n       0x1dfd1c000 -        0x1dfd20fff  RevealCore arm64  <e3e3cc0d4bc93d2887b9f9d224156b78> /System/Library/PrivateFrameworks/RevealCore.framework/RevealCore\n       0x1dfeb3000 -        0x1dfebffff  SetupAssistantSupport arm64  <ef014684fac033b386a6b68082037640> /System/Library/PrivateFrameworks/SetupAssistantSupport.framework/SetupAssistantSupport\n       0x1dfedd000 -        0x1dfeddfff  SignpostMetrics arm64  <39844c936b4f399994bded0f1cff359f> /System/Library/PrivateFrameworks/SignpostMetrics.framework/SignpostMetrics\n       0x1e07d0000 -        0x1e0872fff  TextureIO arm64  <b532af04ee7b30b99fecaa9989a53d36> /System/Library/PrivateFrameworks/TextureIO.framework/TextureIO\n       0x1e16ad000 -        0x1e1b92fff  libwebrtc.dylib arm64  <940b218575033aac85a3921437fd9933> /System/Library/PrivateFrameworks/WebCore.framework/Frameworks/libwebrtc.dylib\n       0x1e1d19000 -        0x1e1d21fff  kperfdata arm64  <e569fc53e092356eb122562a13c9bf2b> /System/Library/PrivateFrameworks/kperfdata.framework/kperfdata\n       0x1e1d22000 -        0x1e1d69fff  ktrace arm64  <744300e119093d9d8a62eff7ca8a5224> /System/Library/PrivateFrameworks/ktrace.framework/ktrace\n       0x1e1d82000 -        0x1e1d8efff  perfdata arm64  <1c22afa49c1a3331a9672f3477e2270a> /System/Library/PrivateFrameworks/perfdata.framework/perfdata\n       0x1e218b000 -        0x1e248bfff  libAWDSupportFramework.dylib arm64  <e9e6f61ecadc3ef687fe93970e9be066> /usr/lib/libAWDSupportFramework.dylib\n       0x1e263c000 -        0x1e2646fff  libChineseTokenizer.dylib arm64  <98ede1f2ad0f3bc4aeaa8f164bda62c2> /usr/lib/libChineseTokenizer.dylib\n       0x1e266c000 -        0x1e281ffff  libFosl_dynamic.dylib arm64  <bea0ead4ccfe34ed8d67db9040c5da5f> /usr/lib/libFosl_dynamic.dylib\n       0x1e289a000 -        0x1e28a0fff  libMatch.1.dylib arm64  <ccf39525f1f333a99e71b0c90b775f02> /usr/lib/libMatch.1.dylib\n       0x1e2a40000 -        0x1e2a41fff  libSystem.B.dylib arm64  <290ee19dd68a33e594372096c3256719> /usr/lib/libSystem.B.dylib\n       0x1e2a4a000 -        0x1e2a4cfff  libThaiTokenizer.dylib arm64  <e5cf6e94bb7d3993b36340a76dd10d4a> /usr/lib/libThaiTokenizer.dylib\n       0x1e2b4b000 -        0x1e2b60fff  libapple_nghttp2.dylib arm64  <c3ec66ee9ed13a8998d5858698a92d39> /usr/lib/libapple_nghttp2.dylib\n       0x1e2bd9000 -        0x1e2be9fff  libbsm.0.dylib arm64  <33212acdd6e83c6dbba937b01bf80de7> /usr/lib/libbsm.0.dylib\n       0x1e2bea000 -        0x1e2bf6fff  libbz2.1.0.dylib arm64  <2ac416acf1533616a6c7af36bb95d86a> /usr/lib/libbz2.1.0.dylib\n       0x1e2bf7000 -        0x1e2bf7fff  libcharset.1.dylib arm64  <17cd78616d3b32e99e65055a0e406ae2> /usr/lib/libcharset.1.dylib\n       0x1e2bf8000 -        0x1e2c09fff  libcmph.dylib arm64  <55b3af6de3a436408874d45aec155429> /usr/lib/libcmph.dylib\n       0x1e2c0a000 -        0x1e2c21fff  libcompression.dylib arm64  <e507127bb2d9301da30a04be55a7105d> /usr/lib/libcompression.dylib\n       0x1e2c22000 -        0x1e2c23fff  libcoretls_cfhelpers.dylib arm64  <081c7d2fc9ab3037a28db6e65640037a> /usr/lib/libcoretls_cfhelpers.dylib\n       0x1e2c24000 -        0x1e2c2afff  libcupolicy.dylib arm64  <bc10584cebee364eb12d17b880386907> /usr/lib/libcupolicy.dylib\n       0x1e2c6a000 -        0x1e2c73fff  libdscsym.dylib arm64  <ebcadea82037334b887f66dd7da25bee> /usr/lib/libdscsym.dylib\n       0x1e31d1000 -        0x1e31d6fff  libheimdal-asn1.dylib arm64  <a04b12766fa73471897f66a33892248f> /usr/lib/libheimdal-asn1.dylib\n       0x1e31d7000 -        0x1e32c8fff  libiconv.2.dylib arm64  <2899e6cb6ce637259e6f45802f36d678> /usr/lib/libiconv.2.dylib\n       0x1e32de000 -        0x1e32e9fff  liblockdown.dylib arm64  <50869c96d9c23940849cac239427e6ee> /usr/lib/liblockdown.dylib\n       0x1e32ea000 -        0x1e3302fff  liblzma.5.dylib arm64  <9194af27e56a3747afa73d649580ebd0> /usr/lib/liblzma.5.dylib\n       0x1e3683000 -        0x1e36b2fff  libncurses.5.4.dylib arm64  <0678e36babe8349db91ea40e39fe4ffe> /usr/lib/libncurses.5.4.dylib\n       0x1e36b3000 -        0x1e36c7fff  libnetworkextension.dylib arm64  <8ba88b0a0d3c32e7acc24e0f8b9f66af> /usr/lib/libnetworkextension.dylib\n       0x1e3a51000 -        0x1e3a69fff  libresolv.9.dylib arm64  <18dc421f4eb73d7f98fdd2ef32d29f40> /usr/lib/libresolv.9.dylib\n       0x1e3a6a000 -        0x1e3a6cfff  libsandbox.1.dylib arm64  <5025aba3a7ec30baa8c63c9dfbc57d9b> /usr/lib/libsandbox.1.dylib\n       0x1e3a73000 -        0x1e3aa4fff  libtidy.A.dylib arm64  <5d9e7b97a06b31feb5d3f3df1b5a6ffb> /usr/lib/libtidy.A.dylib\n       0x1e3aac000 -        0x1e3aaffff  libutil.dylib arm64  <d963a051207d3b90b6d610260cd12160> /usr/lib/libutil.dylib\n       0x1e3add000 -        0x1e3aeefff  libz.1.dylib arm64  <dab18c186a373b09b639dbd0322ab694> /usr/lib/libz.1.dylib\n       0x1e3b19000 -        0x1e3b1bfff  liblog_network.dylib arm64  <3524c9be297735ef99717db6456ec648> /usr/lib/log/liblog_network.dylib\n       0x1e3f26000 -        0x1e3f2bfff  libcache.dylib arm64  <111cb14a6b6f3afa993fecb1a68b4632> /usr/lib/system/libcache.dylib\n       0x1e3f2c000 -        0x1e3f38fff  libcommonCrypto.dylib arm64  <4e6a23e09e603187a3411c32d965ab31> /usr/lib/system/libcommonCrypto.dylib\n       0x1e3f39000 -        0x1e3f3dfff  libcompiler_rt.dylib arm64  <23f835d65dd8370496846d62c9697f90> /usr/lib/system/libcompiler_rt.dylib\n       0x1e4013000 -        0x1e4013fff  liblaunch.dylib arm64  <ba493320c24834618a6312598e05fe08> /usr/lib/system/liblaunch.dylib\n       0x1e4014000 -        0x1e4019fff  libmacho.dylib arm64  <0fd5870e9f263a98901dac802d9d131d> /usr/lib/system/libmacho.dylib\n       0x1e401a000 -        0x1e401cfff  libremovefile.dylib arm64  <db4f45521fa33740bed8dc41abe86858> /usr/lib/system/libremovefile.dylib\n       0x1e401d000 -        0x1e401efff  libsystem_featureflags.dylib arm64  <00868befdde137a1a5d357ef7ae81db4> /usr/lib/system/libsystem_featureflags.dylib\n       0x1e401f000 -        0x1e404cfff  libsystem_m.dylib arm64  <51f1ec8ae61d3e2b821a8e0de77fc175> /usr/lib/system/libsystem_m.dylib\n       0x1e404d000 -        0x1e4052fff  libunwind.dylib arm64  <af53a4f641833a108f50e58c82933157> /usr/lib/system/libunwind.dylib\n       0x1e4332000 -        0x1e439afff  NanoRegistry arm64  <a24beb81e9cd32b59dde4cbb6d824c56> /System/Library/PrivateFrameworks/NanoRegistry.framework/NanoRegistry\n       0x1e439b000 -        0x1e43a8fff  NanoPreferencesSync arm64  <e302f1d35c6834bdb3effeb7e57cd6a5> /System/Library/PrivateFrameworks/NanoPreferencesSync.framework/NanoPreferencesSync\n       0x1e5dc7000 -        0x1e5ddafff  AppSSOCore arm64  <9e6cdcd2edef37dba4177852d95adfe7> /System/Library/PrivateFrameworks/AppSSOCore.framework/AppSSOCore",
                    "_executable_name": "CountlyTestApp-iOS",
                    "_os_version": "13.3.1",
                    "_app_version": this.metrics._app_version,
                    "_os": "iOS",
                    "_plcrash": true,
                    "_build_uuid": crashBuildIds.plc[getRandomInt(0, crashBuildIds.plc.length - 1)]
                }
                ];
                if (this.metrics._os && this.metrics._os.toLocaleLowerCase() === 'ios') {
                    const iosErrors = errors.filter(x=>x._os.toLocaleLowerCase() === 'ios');
                    const iosError = iosErrors[getRandomInt(0, iosErrors.length - 1)];
                    if (Math.random() < 0.5) {
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
                        iosError._error = error;
                    }
                    if (crashSymbolVersions.iOS.indexOf(iosError._build_uuid) === -1) {
                        crashSymbolVersions.iOS.push(iosError._build_uuid);
                    }
                    return {name: iosError._error, version: crashSymbolVersions.iOS[crashSymbolVersions.iOS.length - 1]};
                }
                else if (this.metrics._os && this.metrics._os.toLocaleLowerCase() === 'android') {
                    const androidErrors = errors.filter(x=>x._os.toLocaleLowerCase() === 'android');
                    const androidError = androidErrors[getRandomInt(0, androidErrors.length - 1)];
                    if (Math.random() < 0.5) {
                        errors = ["java.lang.RuntimeException", "java.lang.NullPointerException", "java.lang.NoSuchMethodError", "java.lang.NoClassDefFoundError", "java.lang.ExceptionInInitializerError", "java.lang.IllegalStateException"];
                        error = errors[Math.floor(Math.random() * errors.length)] + ": com.domain.app.Exception<init>\n";
                        stacks = getRandomInt(5, 9);
                        for (var stackIndex = 0; stackIndex < stacks; stackIndex++) {
                            error += "at com.domain.app.<init>(Activity.java:" + (stackIndex * 32) + ")\n";
                        }
                        androidError._error = error;
                    }

                    if (crashSymbolVersions.android.indexOf(androidError._app_version) === -1) {
                        crashSymbolVersions.android.push(androidError._app_version);
                    }
                    return {name: androidError._error, version: androidError._app_version};
                }
                else {
                    return "System.ArgumentOutOfRangeException\n" +
                    "   at System.ThrowHelper.ThrowArgumentOutOfRangeException()\n" +
                    "   at System.Collections.Generic.List`1.get_Item(Int32 index)\n" +
                    "   at StorePuzzle.PuzzleRenderer.HandleTileReleased(Object sender, PointerRoutedEventArgs e)";
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
                        "_app_version": this.metrics._app_version,
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
                        "_app_version": this.metrics._app_version,
                        "_os": "tvOS",
                        "_build_uuid": "71881E31-A5A0-326A-BC1E-92F0C5885C03"
                    }
                ];
                if (this.metrics._os && this.metrics._os.toLocaleLowerCase() === "tvos") {
                    const tvosError = errors.filter(x=>x._os.toLocaleLowerCase() === "tvos")[0];
                    if (!crashSymbolVersions.tvOS.length) {
                        crashSymbolVersions.tvOS.push(tvosError._build_uuid);
                    }
                    return {name: tvosError._error, version: tvosError._build_uuid};
                }
                else if (this.metrics._os && this.metrics._os.toLocaleLowerCase() === "macos") {
                    const macosError = errors.filter(x=>x._os.toLocaleLowerCase() === "macos")[0];
                    if (!crashSymbolVersions.macOS.length) {
                        crashSymbolVersions.macOS.push(macosError._build_uuid);
                    }
                    return {name: macosError._error, version: macosError._build_uuid};
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
                        form_data.append('build', platformVersions[j]);
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