/**
 *  Set parameters for a specific application and template. This script continuously runs and iterates through all apps and generates some data continuously emulating real user behavior. 
 *  Server: countly
 *  Path: countly dir
 *  Command: node continious-data-population.js
 */

// var date = new Date();
// Please set below parameters properly before running script.
var INTERVAL_PERIOD = 5000; // 60 * 60 * 24 * 30;
var APP_ID = ""; // Enter your app Id
var POPULATOR_TEMPLATE_ID = "defaultBanking"; // Enter the custom populator template ID you created or default template _id "{defaultGaming}"
var SERVER_URL = "https://master.count.ly";


//script variables
let maxUserCount = 100;
var counter = {sent: 0, success: 0, error: 0};
let stopOnError = true;
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
var app = null, template = null, pluginList = null;
var users = [], user = null;
var stats = {u: 0, s: 0, x: 0, d: 0, e: 0, r: 0, b: 0, c: 0, p: 0};

var plugins = require('../../plugins/pluginManager.js'),
    request = require('request'),
    Chance = require('chance');


function writeMsg(msg) {
    process.stdout.write(JSON.stringify(msg) + '\n');
    process.exit(1);
}
/**
 * Checks the correctness of the required parameters.
 **/
async function readDbParameters() {
    try {
        const db = await plugins.dbConnection("countly");
        app = await db.collection('apps').findOne({'_id': db.ObjectID(APP_ID)});
        pluginList = await db.collection('plugins').find({}).toArray();
        if (POPULATOR_TEMPLATE_ID.length > 18) {
            template = await db.collection('populator_templates').findOne({'_id': db.ObjectID(POPULATOR_TEMPLATE_ID)});
        }
        else { // default template
            defaultTemplates.forEach(function(item) {
                if (item._id === POPULATOR_TEMPLATE_ID) {
                    template = item;
                }
            });
            if (!template) {
                db.close();
                writeMsg('INVALID POPULATOR_TEMPLATE_ID ', POPULATOR_TEMPLATE_ID);
            }
        }
        if (!app) {
            db.close();
            writeMsg('INVALID APP_ID ', APP_ID);
        }
        if (!template) {
            db.close();
            writeMsg('INVALID POPULATOR_TEMPLATE_ID ', POPULATOR_TEMPLATE_ID);
        }
        db.close();
    }
    catch (error) {
        clearInterval(interval);
        writeMsg('There was an error while checking db parameters', error);
    }
}

readDbParameters();

var interval = setInterval(async function() {
    if (users.length === 0) {
        for (var i = 0; i < getRandomInt(1, 10); i++) { // will change
            user = new getUser(template && template.up);
            users.push(user);
        }
    }
    else {
        if (users.length !== maxUserCount) {
            if (getRandomInt(1, 10) === 1) {
                user = new getUser(template && template.up);
                users.push(user);
            }
        }
    }

    var shuffledArray = users.sort(() => 0.5 - Math.random());
    var selectedRandomUsers = shuffledArray.slice(0, getRandomInt(1, users.length - 1));

    selectedRandomUsers.forEach(function(user) {
        if (stats.s !== 0) {
            if (getRandomInt(1, 3) === 1) {
                user.addEvent(template, getRandomInt(1, template.events.length - 1));
            }
            else {
                user.startSession(template);
            }
        }
        else {
            user.startSession(template);
        }
    });
}, INTERVAL_PERIOD);


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
 * Dynamic pattern for calls a request.
 * @param {object} params - request params
 * @returns {Promise} - resolved or rejected
 **/
async function sendRequest(params) {
    var body = {};
    //mandatory values for each request
    body.timestamp = Date.now();
    body.hour = 1;
    body.dow = 1;

    //add dynamic values to body

    var requestBodyKeys = params.body ? Object.keys(params.body) : [];
    for (var i = 0; i < requestBodyKeys.length; i++) {
        var requestKey = requestBodyKeys[i];
        body[requestKey] = params.body[requestKey];
    }

    var options = {
        uri: params.Url || SERVER_URL,
        method: params.requestType,
        json: true,
        body: body,
        strictSSL: false
    };
    counter.sent++;
    return new Promise(function(resolve, reject) {
        request(options, function(error, response) {
            if (error || !response) {
                counter.error++;
                reject({err: 'There was an error while sending a request.', code: response.statusCode});
            }
            else if (response.statusCode === 200) {
                counter.success++;
                resolve(true);
            }
            else {
                counter.error++;
                if (!counter[response.statusCode]) {
                    counter[response.statusCode] = 0;
                }
                counter[response.statusCode]++;
                reject({err: 'There was an error while sending a request.', code: response.statusCode});
            }
            if (stopOnError && counter.error > 0) {
                console.log(((Date.now()) / 1000 / 60).toFixed(2), JSON.stringify(counter));
                reject({err: 'There was an error while sending a request.', code: stopOnError});
            }
        });
    });
}

// Populator variables and functions
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
var viewSegments = {
    name: ["Login", "Home", "Dashboard", "Main View", "Detail View Level 1", "Detail View Level 2", "Profile", "Settings", "About", "Privacy Policy", "Terms and Conditions"],
    visit: [1],
    start: [0, 1],
    exit: [0, 1],
    bounce: [0, 1],
    segment: ["Android", "iOS", "Windows Phone"]
};
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


var bulk = [];
var bucket = 50;
var timeout = 1000;
var totalCountWithoutUserProps = 0;
var totalUserCount = 0;
var hasSession = false;
var ratingWidgetList = [], npsWidgetList = [], surveyWidgetList = {};

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
 * Create user properties with Facebook Login, Twitter Login,
 * Twitter Login name and Has Apple Watch Os properties
 * @param {object} templateUp user properties template, if available
 * @returns {object} returns user properties
 **/
function getUserProperties(templateUp) {
    var up = {populator: true};

    if (app && app.type === "web" && (Math.random() > 0.5)) {
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

/**
 * Sends bulk request for populator
 **/
async function countlyPopulatorSync() {
    var req = bulk.splice(0, bucket);
    await sendRequest({
        requestType: 'POST',
        Url: SERVER_URL + "/i/bulk",
        body: {
            app_key: app.key,
            requests: JSON.stringify(req),
            populator: true
        }
    });
}

/**
 * Checks if given plugin name exists in plugins
 * @param {string} pluginName - pluginName
 * @returns {boolean} returns true or false
 **/
function isPluginExists(pluginName) {
    pluginList.forEach(function(item) {
        if (item._id === "plugins") {
            if (item[pluginName]) {
                return true;
            }
            else {
                return false;
            }
        }
    });
}

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
 * Generate a user with random properties and actions
 * @param {object} templateUp user properties template, if available
 **/
function getUser(templateUp) {
    var chance = new Chance();
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
    this.stats = stats;
    this.id = this.getId();
    this.isRegistered = false;
    hasSession = false;
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
    this.events = [];
    if (app && app.type === "web") {
        this.platform = this.getProp("_os_web");
    }
    else if (app && app.type === "desktop") {
        this.platform = this.getProp("_os_desktop");
    }
    else {
        this.platform = this.getProp("_os");
    }
    this.metrics._os = this.platform;
    var m_props = metric_props.mobile;
    if (app && app.type && metric_props[app.type]) {
        m_props = metric_props[app.type];
    }
    for (var mPropsIndex = 0; mPropsIndex < m_props.length; mPropsIndex++) {
        if (m_props[mPropsIndex] !== "_os") {
            //handle specific cases
            if (m_props[mPropsIndex] === "_store" && app && app.type === "web") {
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
        if (app.type === "web") {
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
            if (app.type === "web") {
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
            var populatorType = null;
            if (POPULATOR_TEMPLATE_ID.length <= 10) { //defaultTemplate
                defaultTemplates.forEach(function(template) {
                    if (template.name === POPULATOR_TEMPLATE_ID) {
                        populatorType = template._id;
                    }
                });
            }
            else {
                populatorType = template._id;
            }
            Object.keys(viewSegments).forEach(function(key) {
                var values = [];
                if (app.type === "web" && key === "name") {
                    values = ["/populator/" + app.key + "/demo-" + populatorType + ".html"];
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
        if (Object.keys(templateEvents).length === 0) {
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
        if (isPluginExists('surveys')) {
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

    this.getHeatmapEvent = function() {
        this.stats.e++;
        var populatorType = null;
        if (POPULATOR_TEMPLATE_ID.length <= 10) { //defaultTemplate
            defaultTemplates.forEach(function(template) {
                if (template.name === POPULATOR_TEMPLATE_ID) {
                    populatorType = template._id;
                }
            });
        }
        else {
            populatorType = template._id;
        }
        var views = ["/populator/" + app.key + "/demo-" + populatorType + ".html"];
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
        event.segmentation.domain = SERVER_URL;
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
        var populatorType = null;
        if (POPULATOR_TEMPLATE_ID.length <= 10) { //defaultTemplate
            defaultTemplates.forEach(function(template) {
                if (template.name === POPULATOR_TEMPLATE_ID) {
                    populatorType = template._id;
                }
            });
        }
        else {
            populatorType = template._id;
        }
        var views = ["/populator/" + app.key + "/demo-" + populatorType + ".html"];
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
        event.segmentation.y = getRandomInt(0, 3602) + 983;
        event.segmentation.width = 1440;
        event.segmentation.height = 3586;
        event.domain = SERVER_URL;
        event.segmentation.view = views[Math.floor(Math.random() * views.length)];
        return [event];
    };

    this.addEvent = function(template, eventChance) {
        var req = {};
        var events;

        if (!this.isRegistered) {
            this.isRegistered = true;
            events = this.getEvent("[CLY]_view", template && template.events && template.events["[CLY]_view"]).concat(this.getEvent("[CLY]_orientation", template && template.events && template.events["[CLY]_orientation"]), this.getEvents(4, template && template.events));
            events = events.sort(() => 0.5 - Math.random()).slice(eventChance);
            req = {timestamp: this.ts, events: events};
            req.events = req.events.concat(this.getHeatmapEvents());
            req.events = req.events.concat(this.getFeedbackEvents());
            req.events = req.events.concat(this.getScrollmapEvents());
        }
        else {
            events = this.getEvent("[CLY]_view", template && template.events && template.events["[CLY]_view"]).concat(this.getEvent("[CLY]_orientation", template && template.events && template.events["[CLY]_orientation"]), this.getEvents(4, template && template.events));
            events = events.sort(() => 0.5 - Math.random()).slice(eventChance);
            req = {timestamp: this.ts, events: events};
        }
        this.request(req);
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

        hasSession = true;
        this.request(req);
        this.timer = setTimeout(function() {
            that.extendSession(template);
        }, timeout);
    };

    this.extendSession = function(template) {
        if (hasSession) {
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
        if (hasSession) {
            hasSession = false;
            var events = this.getEvents(2, template && template.events);
            this.request({timestamp: this.ts, end_session: 1, events: events, apm: this.getTrace()});
        }
    };

    this.request = async function(params) {
        this.stats.r++;
        params.device_id = this.id;
        params.ip_address = this.ip;
        params.hour = getRandomInt(0, 23);
        params.dow = getRandomInt(0, 6);
        params.stats = JSON.parse(JSON.stringify(this.stats));
        params.populator = true;
        bulk.push(params);
        this.stats = {u: 0, s: 0, x: 0, d: 0, e: 0, r: 0, b: 0, c: 0, p: 0};
        countlyPopulatorSync();
    };

    this.reportConversion = async function(uid, campaingId) {
        await sendRequest({
            requestType: 'GET',
            body: {
                campaign_id: uid,
                campaign_user: campaingId,
                app_key: app.key,
                device_id: this.id,
                populator: true
            }
        });
    };
}