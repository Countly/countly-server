/**
 *  Set parameters for a specific application and template. This script continuously runs and iterates through all apps and generates some data continuously emulating real user behavior. 
 *  Server: countly
 *  Path: countly dir
 *  Command: node continious-data-population.js
 */

// Please set below parameters properly before running script.
const INTERVAL_AS_SECOND = 60;
const SERVER_URL = "http://localhost";
const inputs = [{"APP_ID": "", "POPULATOR_TEMPLATE_ID": ""}]; //POPULATOR_TEMPLATE_ID: Enter the custom populator template ID you created or default template _id "{defaultGaming}"
const API_KEY = "";


//script variables
let maxUserCount = 50;
const counter = {sent: 0, success: 0, error: 0};
let stopOnError = true;
const defaultTemplates = [
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
const app = {}, template = {}, pluginList = {};
let users = {}, user = null;
let intervalCount = 0;
const campaingClicks = [];
const ratingWidgetList = {}, npsWidgetList = {}, surveyWidgetList = {};


const plugins = require('../../plugins/pluginManager.js'),
    request = require('countly-request')(null, null, null, plugins.getConfig("security")),
    Chance = require('../../plugins/populator/frontend/public/javascripts/chance.js');

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

        for (let i = 0; i < Object.keys(inputs).length; i++) {
            pluginList[inputs[i].APP_ID] = [];
            app[inputs[i].APP_ID] = await db.collection('apps').findOne({'_id': db.ObjectID(inputs[i].APP_ID)});
            if (inputs[i].POPULATOR_TEMPLATE_ID.length > 18) {
                template[inputs[i].APP_ID] = await db.collection('populator_templates').findOne({'_id': db.ObjectID(inputs[i].POPULATOR_TEMPLATE_ID)});
            }
            else { // default template
                defaultTemplates.forEach(function(item) {
                    if (item._id === inputs[i].POPULATOR_TEMPLATE_ID) {
                        template[inputs[i].APP_ID] = item;
                    }
                });
                if (!template[inputs[i].APP_ID]) {
                    db.close();
                    writeMsg('INVALID POPULATOR_TEMPLATE_ID: ' + inputs[i].POPULATOR_TEMPLATE_ID);
                }
            }
            if (!app[inputs[i].APP_ID]) {
                db.close();
                writeMsg('INVALID APP_ID: ' + inputs[i].APP_ID);
            }
            if (!template) {
                db.close();
                writeMsg('INVALID POPULATOR_TEMPLATE_ID: ' + inputs[i].POPULATOR_TEMPLATE_ID);
            }

            users[inputs[i].APP_ID] = [];
            ratingWidgetList[inputs[i].APP_ID] = [];
            npsWidgetList[inputs[i].APP_ID] = [];
            surveyWidgetList[inputs[i].APP_ID] = {};

            pluginList[inputs[i].APP_ID] = await sendRequest({
                requestType: 'GET',
                Url: SERVER_URL + "/o/plugins?",
                requestParamKeys: { app_id: inputs[i].APP_ID, api_key: API_KEY }
            });
            db.close();
        }
    }
    catch (error) {
        clearInterval(interval);
        writeMsg('There was an error while checking db parameters. Error: ' + error);
    }
}
readDbParameters();

const interval = setInterval(async function() {
    for (let z = 0; z < Object.keys(inputs).length; z++) {
        const userCount = getRandomInt(maxUserCount / 2, maxUserCount);
        if (!users[inputs[z].APP_ID] || users[inputs[z].APP_ID].length === 0) {
            for (let i = 0; i < userCount; i++) {
                user = new getUser(template[inputs[z].APP_ID] && template[inputs[z].APP_ID].up);
                users[inputs[z].APP_ID].push(user);
            }
        }
        else {
            if (users[inputs[z].APP_ID].length < maxUserCount) {
                if (getRandomInt(1, 3) === 1) {
                    user = new getUser(template && template.up);
                    users[inputs[z].APP_ID].push(user);
                }
            }
        }

        const upperBoundary = Math.floor(userCount / 10);

        const indexes = [];
        for (let i0 = 0; i0 < upperBoundary; i0++) {
            indexes.push(getRandomInt(0, users[inputs[z].APP_ID].length - 1));
        }

        indexes.forEach(function(index) {
            if (users[inputs[z].APP_ID][index].hasSession) {
                if ((users[inputs[z].APP_ID][index].eventsInSession >= 9)) {
                    users[inputs[z].APP_ID][index].eventsInSession = 0;
                    users[inputs[z].APP_ID][index].startSession(template[inputs[z].APP_ID], app[inputs[z].APP_ID], inputs[z].POPULATOR_TEMPLATE_ID);
                }
                else {
                    users[inputs[z].APP_ID][index].addEvent(template[inputs[z].APP_ID], app[inputs[z].APP_ID], inputs[z].POPULATOR_TEMPLATE_ID);
                }
            }
            else {
                users[inputs[z].APP_ID][index].startSession(template[inputs[z].APP_ID], app[inputs[z].APP_ID], inputs[z].POPULATOR_TEMPLATE_ID);
            }
        });
    }
    if (intervalCount === 5) { // it should run one time each interval with some users.
        for (let x = 0; x < Object.keys(inputs).length; x++) {
            await addCohorts(template[inputs[x].APP_ID], app[inputs[x].APP_ID]);
            addExtras(app[inputs[x].APP_ID]._id);
        }
    }
    intervalCount++;
}, (INTERVAL_AS_SECOND * 1000));

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
    try {
        let body = {};
        //mandatory values for each request
        body.timestamp = Date.now();
        body.hour = 1;
        body.dow = 1;

        //add dynamic values to body

        const requestBodyKeys = params.body ? Object.keys(params.body) : [];
        for (let i = 0; i < requestBodyKeys.length; i++) {
            var requestKey = requestBodyKeys[i];
            body[requestKey] = params.body[requestKey];
        }

        const url = new URL(params.Url || SERVER_URL);

        const requestParamKeys = params.requestParamKeys ? Object.keys(params.requestParamKeys) : [];
        if (requestParamKeys.length > 0) {
            for (let z = 0; z < requestParamKeys.length; z++) {
                const requestParamKey = requestParamKeys[z];
                const requestParamValue = Object.values(params.requestParamKeys)[z];
                url.searchParams.append(requestParamKey, requestParamValue);
            }
        }

        const options = {
            uri: url.href,
            method: params.requestType,
            json: true,
            body: body,
            strictSSL: false
        };
        if (params.print) {
            console.log(options.uri, 'URL');
        }
        counter.sent++;
        return new Promise(function(resolve, reject) {
            request(options, function(error, response) {
                if (error || !response) {
                    counter.error++;
                    reject({err: 'There was an error while sending a request.', code: response});
                }
                else if (response.statusCode === 200 || response.statusCode === 201) {
                    counter.success++;
                    resolve(response.body);
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
                    reject({err: 'There was an error while sending a request.', code: stopOnError});
                }
            });
        });
    }
    catch (e) {
        console.log('sendRequest failed: ', e);
    }
}

// Populator variables and functions
const metric_props = {
    mobile: ["_os", "_os_version", "_resolution", "_device", "_device_type", "_manufacturer", "_carrier", "_app_version", "_density", "_locale", "_store"],
    web: ["_os", "_os_version", "_resolution", "_device", "_device_type", "_app_version", "_density", "_locale", "_store", "_browser"],
    desktop: ["_os", "_os_version", "_resolution", "_app_version", "_locale"]
};
const props = {
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
const viewSegments = {
    name: ["Login", "Home", "Dashboard", "Main View", "Detail View Level 1", "Detail View Level 2", "Profile", "Settings", "About", "Privacy Policy", "Terms and Conditions"],
    visit: [1],
    start: [0, 1],
    exit: [0, 1],
    bounce: [0, 1],
    segment: ["Android", "iOS", "Windows Phone"]
};
// usa, uk, japan, germany, italy, france, turkey, uruguay, netherlands, new zealand, mexico, canada, china, finland, hungary, ukraine, argentina, bahamas, latvia, malaysia
const predefined_ip_addresses = ["2.167.106.72", "4.69.238.178", "3.112.23.176", "13.32.136.0", "4.69.130.86", "4.69.208.18", "17.67.198.23", "5.145.169.96", "2.59.88.2", "17.86.219.128", "23.65.126.2", "4.14.242.30", "14.192.76.3", "4.68.30.78", "5.38.128.2", "31.40.128.2", "5.145.169.100", "62.67.185.16", "14.139.54.208", "62.40.112.206", "14.192.192.1"];
const campaigns = [
    {id: "email", name: "Email campaign", cost: "0.1", type: "click"},
    {id: "email2", name: "Email campaign 2", cost: "0.2", type: "install"},
    {id: "sms", name: "SMS campaign", cost: "0.3", type: "install"},
    {id: "cpc", name: "Cross promotion campaign", cost: "1", type: "install"},
    {id: "blog", name: "Blog post campaign 1", cost: "5", type: "click"},
    {id: "blog2", name: "Blog post campaign 2", cost: "10", type: "install"}];
const sources = ["facebook", "gideros", "admob", "chartboost", "googleplay"];


const bulk = [];
const bucket = 50;
const timeout = 1000;
let totalCountWithoutUserProps = 0;
let totalUserCount = 0;

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
    const up = {populator: true};

    if (app && app.type === "web" && (Math.random() > 0.5)) {
        up.utm_source = sources[getRandomInt(0, sources.length - 1)];
        up.utm_medium = "cpc";
        up.utm_campaign = campaigns[getRandomInt(0, campaigns.length - 1)].id;
    }

    Object.keys(templateUp || {}).forEach(function(key) {
        const values = templateUp[key];
        up[key] = values[getRandomInt(0, values.length - 1)];
    });

    return up;
}

/**
 * Sends bulk request for populator
 **/
async function countlyPopulatorSync(appKey) {
    try {
        const req = bulk.splice(0, bucket);
        await sendRequest({
            requestType: 'POST',
            Url: SERVER_URL + "/i/bulk",
            body: {
                app_key: appKey,
                requests: JSON.stringify(req),
                populator: true
            }
        });
    }
    catch (e) {
        console.log('request failed: ', e);
    }
}

/**
 * Checks if given plugin name exists in plugins
 * @param {string} pluginName - pluginName
 * @returns {boolean} returns true or false
 **/
function isPluginExists(pluginName, appId) {
    let isExist = false;
    pluginList[appId].forEach(function(plugin) {
        if (plugin.code === pluginName && plugin.enabled) {
            isExist = true;
        }
    });
    return isExist;
}

/**
 * Generate random string with size property
 * @param {number} size - length of random string
 * @returns {object} returns random string
 **/
function randomString(size) {
    const alphaChars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
    let generatedString = '';
    for (let index = 0; index < size; index++) {
        generatedString += alphaChars[getRandomInt(0, alphaChars.length - 1)];
    }

    return generatedString;
}

/**
 * Generate a user with random properties and actions
 * @param {object} templateUp user properties template, if available
 **/
function getUser(templateUp) {
    const chance = new Chance();
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
    this.events = [];
    this.eventsInSession = 0;
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
    let m_props = metric_props.mobile;
    if (app && app.type && metric_props[app.type]) {
        m_props = metric_props[app.type];
    }
    for (let mPropsIndex = 0; mPropsIndex < m_props.length; mPropsIndex++) {
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
        let crash = {};
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

        const customs = ["facebook", "gideros", "admob", "chartboost", "googleplay"];
        crash._custom = {};
        for (let customsIndex = 0; customsIndex < customs.length; customsIndex++) {
            if (Math.random() > 0.5) {
                crash._custom[customs[customsIndex]] = getRandomInt(1, 2) + "." + getRandomInt(0, 9);
            }
        }

        return crash;
    };

    this.getError = function() {
        let errors = [];
        let error = "";
        let stacks = 0;
        if (app.type === "web") {
            errors = ["EvalError", "InternalError", "RangeError", "ReferenceError", "SyntaxError", "TypeError", "URIError"];
            const err = new Error(errors[Math.floor(Math.random() * errors.length)] + ' ' + randomString(5) + ".js" + ' ' + getRandomInt(1, 100));
            return err.stack + "";
        }
        else if (this.platform == "Android") {
            errors = ["java.lang.RuntimeException", "java.lang.NullPointerException", "java.lang.NoSuchMethodError", "java.lang.NoClassDefFoundError", "java.lang.ExceptionInInitializerError", "java.lang.IllegalStateException"];
            error = errors[Math.floor(Math.random() * errors.length)] + ": com.domain.app.Exception<init>\n";
            stacks = getRandomInt(5, 9);
            for (let stackIndex = 0; stackIndex < stacks; stackIndex++) {
                error += "at com.domain.app.<init>(Activity.java:" + (stackIndex * 32) + ")\n";
            }
            return error;
        }
        else if (this.platform == "iOS") {
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
            stacks = getRandomInt(9, 19);
            for (let stackIndex2 = 0; stackIndex2 < stacks; stackIndex2++) {
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
        const actions = [
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

        const items = getRandomInt(5, 10);
        const logs = [];
        for (let itemIndex = 0; itemIndex < items; itemIndex++) {
            logs.push(actions[getRandomInt(0, actions.length - 1)]);
        }
        return logs.join("\n");
    };

    this.getTrace = function() {
        let trace = {};
        trace.stz = getRandomInt(this.startTs, this.endTs);
        trace.etz = getRandomInt(trace.stz, this.endTs);
        trace.stz *= 1000;
        trace.etz *= 1000;
        const rand = Math.random();
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
                let device_traces = ["app_start", "app_in_background", "app_in_foreground"];
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

    this.getEvent = function(id, eventTemplates, appKey, templateId) {
        let event = {
            "key": id,
            "count": 1,
            "timestamp": this.ts,
            "hour": getRandomInt(0, 23),
            "dow": getRandomInt(0, 6)
        };

        this.ts += 1000;
        let eventTemplate;

        if (Array.isArray(eventTemplates)) {
            eventTemplate = eventTemplates[getRandomInt(0, eventTemplates.length - 1)];
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
                let values = eventTemplate.segments[key];
                event.segmentation[key] = values[getRandomInt(0, values.length - 1)];
            });
        }
        else if (id === "[CLY]_view") {
            event.segmentation = {};
            let populatorType = null;
            if (templateId.length <= 10) { //defaultTemplate
                defaultTemplates.forEach(function(template) {
                    if (template.name === templateId) {
                        populatorType = template._id;
                    }
                });
            }
            else {
                populatorType = template._id;
            }
            Object.keys(viewSegments).forEach(function(key) {
                let values = [];
                if (app.type === "web" && key === "name") {
                    values = ["/populator/" + appKey + "/demo-" + populatorType + ".html"];
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

    this.getEvents = function(count, templateEvents, appKey, templateId) {
        if (Object.keys(templateEvents).length === 0) {
            return [];
        }

        let events = [];
        const eventKeys = Object.keys(templateEvents);

        for (let eventIndex = 0; eventIndex < count; eventIndex++) {
            const eventKey = eventKeys[getRandomInt(0, eventKeys.length - 1)];
            events.push(this.getEvent(eventKey, templateEvents[eventKey], appKey, templateId)[0]);
        }

        return events;
    };

    this.getFeedbackEvents = function(appId) {
        let events = [];
        events.push(this.getRatingEvent(appId));
        if (isPluginExists('surveys', appId)) {
            events.push(this.getNPSEvent(appId));
            events.push(this.getSurveyEvent(appId));
        }
        return events;
    };

    this.getRatingEvent = function(appId) {
        const event = {
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
        if (ratingWidgetList[appId].length) {
            event.segmentation.widget_id = ratingWidgetList[appId][getRandomInt(0, ratingWidgetList[appId].length - 1)]._id;
        }
        return event;
    };

    this.getNPSEvent = function(appId) {
        const event = {
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
        if (npsWidgetList[appId].length) {
            event.segmentation.widget_id = npsWidgetList[appId][getRandomInt(0, npsWidgetList[appId].length - 1)];
        }
        return event;
    };

    this.getSurveyEvent = function(appId) {
        const event = {
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
        const keys = Object.keys(surveyWidgetList[appId]);
        if (keys.length) {

            event.segmentation.widget_id = keys[getRandomInt(0, keys.length - 1)];

            let structure = surveyWidgetList[appId][event.segmentation.widget_id];

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

    this.getHeatmapEvents = function(appKey, templateId) {
        let events = this.getHeatmapEvent(appKey, templateId);

        if (Math.random() >= 0.5) {
            events = events.concat(this.getHeatmapEvent(appKey, templateId));

            if (Math.random() >= 0.8) {
                events = events.concat(this.getHeatmapEvent(appKey, templateId));
            }
        }

        return events;
    };

    this.getHeatmapEvent = function(appKey, templateId) {
        let populatorType = null;
        if (templateId.length <= 10) { //defaultTemplate
            defaultTemplates.forEach(function(template) {
                if (template.name === templateId) {
                    populatorType = template._id;
                }
            });
        }
        else {
            populatorType = template._id;
        }
        const views = ["/populator/" + appKey + "/demo-" + populatorType + ".html"];
        const event = {
            "key": "[CLY]_action",
            "count": 1,
            "timestamp": this.ts,
            "hour": getRandomInt(0, 23),
            "dow": getRandomInt(0, 6),
            "test": 1
        };
        const selectedOffsets = [{x: 468, y: 366}, {x: 1132, y: 87}, {x: 551, y: 87}, {x: 647, y: 87}, {x: 1132, y: 87}];

        this.ts += 1000;

        event.segmentation = {};
        event.segmentation.type = "click";

        const dice = getRandomInt(0, 6) % 2 === 0 ? true : false;
        if (dice) {
            const randomIndex = getRandomInt(0, selectedOffsets.length - 1);
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

    this.getScrollmapEvents = function(appKey, templateId) {
        let events = this.getHeatmapEvent(appKey, templateId);

        if (Math.random() >= 0.5) {
            events = events.concat(this.getScrollmapEvent(appKey, templateId));

            if (Math.random() >= 0.8) {
                events = events.concat(this.getScrollmapEvent(appKey, templateId));
            }
        }

        return events;
    };

    this.getScrollmapEvent = function(appKey, templateId) {
        let populatorType = null;
        if (templateId.length <= 10) { //defaultTemplate
            defaultTemplates.forEach(function(template) {
                if (template.name === templateId) {
                    populatorType = template._id;
                }
            });
        }
        else {
            populatorType = template._id;
        }
        const views = ["/populator/" + appKey + "/demo-" + populatorType + ".html"];
        const event = {
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

    this.addEvent = function(template, app, templateId) {
        let req = {};
        let events;
        if (!this.isRegistered) {
            this.isRegistered = true;
            events = this.getEvent("[CLY]_view", template && template.events && template.events["[CLY]_view"], app.key, templateId).concat(this.getEvent("[CLY]_orientation", template && template.events && template.events["[CLY]_orientation"], app.key, templateId), this.getEvents(4, template && template.events, app.key, templateId));
            req = {timestamp: this.ts, events: events};
            req.events = req.events.concat(this.getHeatmapEvents(app.key, templateId));
            req.events = req.events.concat(this.getScrollmapEvents(app.key, templateId));
            req.events = [req.events[Math.floor(Math.random() * req.events.length)]];
            req.events = req.events.concat(this.getFeedbackEvents(app._id));
        }
        else {
            events = this.getEvent("[CLY]_view", template && template.events && template.events["[CLY]_view"], app.key, templateId).concat(this.getEvent("[CLY]_orientation", template && template.events && template.events["[CLY]_orientation"], app.key, templateId), this.getEvents(4, template && template.events, app.key, templateId));
            events = [events[Math.floor(Math.random() * events.length)]];
            req = {timestamp: this.ts, events: events};
        }
        if (req.events) {
            this.eventsInSession += req.events.length;
        }
        this.request(req, app.key);
    };

    this.startSession = function(template, app, templateId) {
        this.ts = this.ts + 60 * 60 * 24 + 100;
        let req = {};
        let events;

        if (!this.isRegistered) {
            this.isRegistered = true;
            // note login event was here
            req = {timestamp: this.ts, begin_session: 1, metrics: this.metrics, user_details: this.userdetails, apm: this.getTrace()};
            if (getRandomInt(1, 3) === 3) {
                events = this.getEvent("[CLY]_view", template && template.events && template.events["[CLY]_view"], app.key, templateId).concat(this.getEvent("[CLY]_orientation", template && template.events && template.events["[CLY]_orientation"], app.key, templateId), this.getEvents(4, template && template.events, app.key, templateId));
                req.events = events;
                req.events = req.events.concat(this.getHeatmapEvents(app.key, templateId));
                req.events = req.events.concat(this.getScrollmapEvents(app.key, templateId));
                req.events = [req.events[Math.floor(Math.random() * req.events.length)]];
                req.events = req.events.concat(this.getFeedbackEvents(app._id));
            }
        }
        else {
            req = {timestamp: this.ts, begin_session: 1, apm: this.getTrace()};
            if (getRandomInt(1, 3) === 3) {
                events = this.getEvent("[CLY]_view", template && template.events && template.events["[CLY]_view"], app.key, templateId).concat(this.getEvent("[CLY]_orientation", template && template.events && template.events["[CLY]_orientation"], app.key, templateId), this.getEvents(4, template && template.events, app.key, templateId));
                events = [events[Math.floor(Math.random() * events.length)]];
                req.events = events;
            }
        }
        if (req.events) {
            this.eventsInSession += req.events.length;
        }
        if (Math.random() > 0.10) {
            this.hasPush = true;
            req.token_session = 1;
            req.test_mode = 0;
            req[this.platform.toLowerCase() + "_token"] = randomString(8);
        }

        req.crash = this.getCrash();

        const consents = ["sessions", "events", "views", "scrolls", "clicks", "forms", "crashes", "push", "attribution", "users"];
        req.consent = {};

        for (let consentIndex = 0; consentIndex < consents.length; consentIndex++) {
            req.consent[consents[consentIndex]] = (Math.random() > 0.8) ? false : true;
        }

        this.hasSession = true;
        this.request(req, app.key);
        this.timer = setTimeout(function() {
            that.extendSession(template, app.key, templateId);
        }, timeout);
    };

    this.extendSession = function(template, appKey, templateId) {
        if (this.hasSession) {
            let req = {};
            this.ts = this.ts + 30;
            let events = this.getEvent("[CLY]_view", template && template.events && template.events["[CLY]_view"], appKey, templateId).concat(this.getEvent("[CLY]_orientation", template && template.events && template.events["[CLY]_orientation"], appKey, templateId), this.getEvents(1, template && template.events, appKey, templateId));
            events = [events[Math.floor(Math.random() * events.length)]];
            req = {timestamp: this.ts, session_duration: 30, events: events, apm: this.getTrace()};
            if (Math.random() > 0.8) {
                this.timer = setTimeout(function() {
                    that.extendSession(template, appKey, templateId);
                }, timeout);
            }
            else {
                if (Math.random() > 0.5) {
                    req.crash = this.getCrash();
                }
                this.timer = setTimeout(function() {
                    that.endSession(template, appKey, templateId);
                }, timeout);
            }
            this.request(req, appKey);
        }
    };

    this.endSession = function(template, appKey, templateId) {
        if (this.timer) {
            clearTimeout(this.timer);
            this.timer = null;
        }
        if (this.hasSession) {
            this.hasSession = false;
            const events = this.getEvents(2, template && template.events, appKey, templateId);
            this.request({timestamp: this.ts, end_session: 1, events: events, apm: this.getTrace()}, appKey);
        }
    };

    this.request = async function(params, appKey) {
        params.device_id = this.id;
        params.ip_address = this.ip;
        params.hour = getRandomInt(0, 23);
        params.dow = getRandomInt(0, 6);
        params.populator = true;
        bulk.push(params);
        countlyPopulatorSync(appKey);
    };
}


/**
 * Generates cohorts for once 
 * @param {object} template user properties template
**/
async function addCohorts(template, app) {
    let data = {};
    let DEBUG_STEP_COUNT = "";

    try {
        if (template && template.events && Object.keys(template.events).length > 0) {
            const firstEventKey = Object.keys(template.events)[0];

            if (template.up && Object.keys(template.up).length > 0) {
                const firstUserProperty = Object.keys(template.up)[0];
                const firstUserPropertyValue = JSON.stringify(template.up[firstUserProperty][0]);
                DEBUG_STEP_COUNT = "addCohorts_1.0";
                data = {
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
                    populator: true,
                    app_id: app._id,
                    api_key: API_KEY
                };

                DEBUG_STEP_COUNT = "addCohorts_1.1";
                await sendRequest({
                    requestType: 'POST',
                    Url: SERVER_URL + "/i/cohorts/add?",
                    requestParamKeys: data
                });
            }


            if (template.events[firstEventKey].segments && Object.keys(template.events[firstEventKey].segments).length > 0) {
                const firstEventSegment = Object.keys(template.events[firstEventKey].segments)[0];
                const firstEventSegmentValue = JSON.stringify(template.events[firstEventKey].segments[firstEventSegment][0]);

                DEBUG_STEP_COUNT = "addCohorts_2.0";
                data = {
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
                    populator: true,
                    app_id: app._id,
                    api_key: API_KEY
                };

                DEBUG_STEP_COUNT = "addCohorts_2.1";
                await sendRequest({
                    requestType: 'POST',
                    Url: SERVER_URL + "/i/cohorts/add?",
                    requestParamKeys: data
                });

                DEBUG_STEP_COUNT = "addCohorts_2.2";
            }

            if (Object.keys(template.events).length > 1) {
                const secondEventKey = Object.keys(template.events)[1];
                DEBUG_STEP_COUNT = "addCohorts_3.0";
                data = {
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
                    populator: true,
                    app_id: app._id,
                    api_key: API_KEY
                };

                DEBUG_STEP_COUNT = "addCohorts_3.1";
                await sendRequest({
                    requestType: 'POST',
                    Url: SERVER_URL + "/i/cohorts/add?",
                    requestParamKeys: data
                });

                DEBUG_STEP_COUNT = "addCohorts_3.2";
            }
        }

        data = {
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
            populator: true,
            app_id: app._id,
            api_key: API_KEY
        };
        DEBUG_STEP_COUNT = "addCohorts_4.0";
        await sendRequest({
            requestType: 'POST',
            Url: SERVER_URL + "/i/cohorts/add?",
            requestParamKeys: data
        });

        data = {
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
            populator: true,
            app_id: app._id,
            api_key: API_KEY
        };
        DEBUG_STEP_COUNT = "addCohorts_5.0";
        await sendRequest({
            requestType: 'POST',
            Url: SERVER_URL + "/i/cohorts/add?",
            requestParamKeys: data
        });

        DEBUG_STEP_COUNT = "addCohorts_6.0";
        data = {
            cohort_name: "Users who didnt view privacy policy",
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
            populator: true,
            app_id: app._id,
            api_key: API_KEY
        };


        DEBUG_STEP_COUNT = "addCohorts_7.0";
        await sendRequest({
            requestType: 'POST',
            Url: SERVER_URL + "/i/cohorts/add?",
            requestParamKeys: data
        });
    }
    catch (error) {
        console.log("There was an error in AddCohorts function. Error: ", error, ' Debug: ', DEBUG_STEP_COUNT);
    }
}

async function createFeedbackWidget(popup_header_text, popup_comment_callout, popup_email_callout, popup_button_callout, popup_thanks_message, trigger_position, trigger_bg_color, trigger_font_color, trigger_button_text, target_devices, target_pages, target_page, is_active, hide_sticker, appId, callback) {
    try {
        const data = {
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
            app_id: appId,
            populator: true,
            api_key: API_KEY
        };

        const result = await sendRequest({
            requestType: 'POST',
            Url: SERVER_URL + "/i/feedback/widgets/create?",
            requestParamKeys: data
        });

        if (result) {
            callback();
        }
    }
    catch (error) {
        console.log("There is an error in CreateFeedbackWidget. Err: ", error);
    }
}

async function createNPSWidget(name, followUpType, mainQuestion, followUpPromoter, followUpPassive, followUpDetractor, followUpAll, thanks, style, show, color, appId, callback) {
    try {
        const data = {
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
            app_id: appId,
            populator: true,
            api_key: API_KEY
        };

        const result = await sendRequest({
            requestType: 'POST',
            Url: SERVER_URL + "/i/surveys/nps/create?",
            requestParamKeys: data
        });

        if (result) {
            if (result.result) {
                const id = result.result.split(" ");
                npsWidgetList[appId].push(id[2]);
            }
            callback();
        }
        else {
            callback();
        }
    }
    catch (error) {
        console.log("There is an error in CreateNPSWidget. Err: ", error);
    }
}

async function createSurveyWidget(name, questions, thanks, position, show, color, logo, exitPolicy, appId, callback) {
    try {
        const data = {
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
            app_id: appId,
            populator: true,
            api_key: API_KEY
        };

        const result = await sendRequest({
            requestType: 'POST',
            Url: SERVER_URL + "/i/surveys/survey/create?",
            requestParamKeys: data
        });

        if (result) {
            callback();
        }
    }
    catch (error) {
        console.log("There is an error in createSurveyWidget. Err: ", error);
    }
}

/**
 * Generate feedback popups three times
 * @param {funciton} done - callback method
 **/
function generateWidgets(appId, done) {
    const _appId = appId;
    function generateRatingWidgets(_appId, callback) {
        createFeedbackWidget("What's your opinion about this page?", "Add comment", "Contact me by e-mail", "Send feedback", "Thanks for feedback!", "mleft", "#fff", "#ddd", "Feedback", {phone: true, tablet: false, desktop: true}, ["/"], "selected", true, false, _appId, function() {
            createFeedbackWidget("Leave us a feedback", "Add comment", "Contact me by e-mail", "Send feedback", "Thanks!", "mleft", "#fff", "#ddd", "Feedback", {phone: true, tablet: false, desktop: false}, ["/"], "selected", true, false, _appId, function() {
                createFeedbackWidget("Did you like this web page?", "Add comment", "Contact me by e-mail", "Send feedback", "Thanks!", "bright", "#fff", "#ddd", "Feedback", {phone: true, tablet: false, desktop: false}, ["/"], "selected", true, false, _appId, async function() {
                    const result = await sendRequest({
                        requestType: 'GET',
                        Url: SERVER_URL + "/o/feedback/widgets?app_id=" + _appId + "&api_key=" + API_KEY
                    });
                    if (result) {
                        ratingWidgetList[appId] = result;
                        callback();
                    }
                    else {
                        callback();
                    }
                });
            });
        });
    }

    function generateNPSWidgets(_appId, callback) {
        createNPSWidget("Separate per response type", "score", "How likely are you to recommend our product to a friend or colleague?", "We're glad you like us. What do you like the most about our product?", "Thank you for your feedback. How can we improve your experience?", "We're sorry to hear it. What would you like us to improve on?", "", "Thank you for your feedback", "full", "uclose", "#ddd", _appId, function() {
            createNPSWidget("One response for all", "one", "How likely are you to recommend our product to a friend or colleague?", "", "", "", "What can/should we do to WOW you?", "Thank you for your feedback", "full", "uclose", "#ddd", _appId, callback);
        });
    }

    function generateSurveyWidgets(_appId, callback) {
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
        ], "Thank you for your feedback", "bottom right", "uclose", "#ddd", null, "onAbandon", _appId, function() {
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
            ], "Thank you for your feedback", "bottom right", "uclose", "#ddd", null, "onAbandon", _appId, function() {
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
                ], "Thank you for your feedback", "bottom right", "uclose", "#ddd", null, "onAbandon", _appId, async function() {
                    const result = await sendRequest({
                        requestType: 'GET',
                        Url: SERVER_URL + "/o/surveys/survey/widgets?app_id=" + _appId + "&api_key=" + API_KEY
                    });
                    if (result && result.aaData) {
                        for (let i = 0; i < result.aaData.length; i++) {
                            surveyWidgetList[_appId][result.aaData[i]._id] = result.aaData[i];
                        }
                        callback();
                    }
                    else {
                        callback();
                    }
                });
            });
        });
    }

    generateRatingWidgets(_appId, function() {
        if (isPluginExists("surveys", _appId)) {
            generateNPSWidgets(_appId, function() {
                generateSurveyWidgets(_appId, done);
            });
        }
        else {
            done();
        }
    });
}

function generateRetention(templateUp, callback) {
    const userAmount = 1000;
    if (typeof countlyRetention === "undefined") {
        callback();
        return;
    }
    let ts = new Date().getTime() / 1000 - 60 * 60 * 24 * 9;
    let ids = [ts];
    let userCount = 10;
    let retentionCall = 8; // number of generateRetentionUser function call
    let retentionLastUserCount = (userCount - retentionCall) + 1;

    let idCount = 1;
    for (let i = userCount; i >= retentionLastUserCount; i--) { //total retension user
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

function generateRetentionUser(ts, userCount, ids, templateUp, app, callback) {
    const chance = new Chance();
    let bulker = [];
    for (let userIndex = 0; userIndex < userCount; userIndex++) {
        for (let j = 0; j < ids.length; j++) {
            let metrics = {};
            let platform;
            if (app.type === "web") {
                platform = getProp("_os_web");
            }
            else if (app.type === "desktop") {
                platform = getProp("_os_desktop");
            }
            else {
                platform = getProp("_os");
            }
            metrics._os = platform;
            let m_props = metric_props.mobile;
            if (app.type && metric_props[app.type]) {
                m_props = metric_props[app.type];
            }
            for (let k = 0; k < m_props.length; k++) {
                if (m_props[k] !== "_os") {
                    //handle specific cases
                    if (m_props[k] === "_store" && app.type === "web") {
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

            let userdetails = new getUser(templateUp);
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
        }
    }

    for (let index = 0; index < bulker.length; index++) {
        bulker[index].startSession(template[app._id], app[app._id], template[app._id]._id);
    }

    callback("");
}

async function createCampaign(id, name, cost, type, appId, callback) {
    try {
        const data = {
            args: JSON.stringify({
                "_id": id + appId,
                "name": name,
                "link": "http://count.ly",
                "cost": cost,
                "costtype": type,
                "fingerprint": false,
                "links": {},
                "postbacks": [],
                "app_id": appId
            }),
        };
        const result = await sendRequest({
            requestType: 'POST',
            Url: SERVER_URL + "/i/campaign/create?args=" + data.args + "&populator=true&api_key=" + API_KEY
        });
        if (result) {
            callback();
        }
    }
    catch (error) {
        console.log("There is an error in createCampaign. Err: ", error);
    }
}

function parseQueryString(queryString) {
    let params = {}, queries, temp, i, l;
    queries = queryString.split("&");
    for (i = 0, l = queries.length; i < l; i++) {
        temp = queries[i].split('=');
        params[temp[0]] = temp[1];
    }
    return params;
}

async function clickCampaign(name, appId) {
    try {
        const chance = new Chance();
        const ip = predefined_ip_addresses[Math.floor(chance.random() * (predefined_ip_addresses.length - 1))];
        const data = {ip_address: ip, test: true, timestamp: Date.now(), populator: true, api_key: API_KEY};

        const result = await sendRequest({
            requestType: 'POST',
            Url: SERVER_URL + "/i/campaign/click/" + name + appId + "?",
            requestParamKeys: data
        });

        if (result) {
            const link = result.link.replace('&amp;', '&');
            const queryString = link.split('?')[1];
            const parameters = parseQueryString(queryString);
            campaingClicks.push({
                name: name,
                cly_id: parameters.cly_id,
                cly_uid: parameters.cly_uid
            });
        }
    }
    catch (error) {
        console.log("There is an error in clickCampaign. Err: ", error);
    }
}

function generateCampaigns(appId, callback) {
    let campaignsIndex = 0;

    /**
     * Recursively generates all the campaigns in the global variable
     **/
    function recursiveCallback() {
        try {
            if (campaignsIndex < campaigns.length) {
                createCampaign(campaigns[campaignsIndex].id, campaigns[campaignsIndex].name, campaigns[campaignsIndex].cost, campaigns[campaignsIndex].type, appId, recursiveCallback);
                campaignsIndex++; // future async issues?
            }
            else {
                for (let clickIndex = 0; clickIndex < (campaigns.length * 33); clickIndex++) {
                    clickCampaign(campaigns[getRandomInt(0, campaigns.length - 1)].id, appId);
                }
                setTimeout(callback, 3000);
            }
        }
        catch (error) {
            console.log("There is an error in recursiveCallback. Err: ", error);
        }
    }

    recursiveCallback();
}

function createUser(appId) {
    if (users[appId].length < maxUserCount) {
        let u = new getUser(template[appId] && template[appId].up);
        users[appId].push(u);
        u.timer = setTimeout(function() {
            u.startSession(template[appId], app[appId], template[appId]._id);
        }, Math.random() * 2000);
    }
}

function reportConversions(appId) {
    for (let i = 0; i < campaingClicks.length; i++) {
        const click = campaingClicks[i];
        if ((Math.random() > 0.5)) {
            users[appId][i].reportConversion(click.cly_id, click.cly_uid);
        }
    }
}

function processUser(u, appId) {
    if (u && !u.hasSession) {
        u.timer = setTimeout(function() {
            u.startSession(template[appId], app[appId], template[appId]._id);
        }, Math.random() * timeout);
    }
}

function processUsers(appId) {
    for (let userAmountIndex = 0; userAmountIndex < maxUserCount; userAmountIndex++) {
        processUser(users[appId][userAmountIndex], appId);
    }
    if (users[appId].length > 0) {
        setTimeout(function() {
            processUsers(appId);
        }, timeout);
    }
    else {
        countlyPopulatorSync();
    }
}

function addExtras(appId) {
    if (isPluginExists("star-rating", appId)) {
        generateWidgets(appId, function() {
            generateRetention(template, function() {
                if (isPluginExists("attribution", appId)) {
                    generateCampaigns(appId, function() {
                        const userCount = users[appId].length;
                        for (let campaignAmountIndex = 0; campaignAmountIndex < userCount; campaignAmountIndex++) {
                            createUser(appId);
                        }
                        // Generate campaigns conversion for web
                        if (app.type === "web") {
                            setTimeout(function() {
                                reportConversions(appId);
                            }, timeout);
                        }
                        setTimeout(function() {
                            processUsers(appId);
                        }, timeout);
                    });
                }
            });
        });
    }
}