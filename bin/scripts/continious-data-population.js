/**
 *  Set parameters for a specific application and template. This script continuously runs and iterates through all apps and generates some data continuously emulating real user behavior. 
 *  Server: countly
 *  Path: countly dir
 *  Command: node continious-data-population.js
 */

var plugins = require('../../plugins/pluginManager.js'),
    request = require('request'),
    Chance = require('chance'),
    countlyPopulatorHelper = require('../../plugins/populator/frontend/public/javascripts/countlyPopulatorHelper');

//var date = new Date();
// Please set below parameters properly before running script.
var INTERVAL_PERIOD = 3000; //(60 - date.getSeconds()) * 1000;
var APP_ID = ""; // Enter your app Id
var POPULATOR_TEMPLATE_ID = "defaultBanking"; // Enter the custom populator template ID you created or default template _id "{defaultGaming}"
var APP_KEY = "";
var SERVER_URL = "https://master.count.ly";


//script variables
let maxUserCount = 100;
var sessionChance = 0, intervalCounter = 0;
var counter = {sent: 0, success: 0, error: 0};
let stopOnError = true;
var app = null, template = null, pluginList = null, users = [];

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
            countlyPopulatorHelper.defaultTemplates.forEach(function(item) {
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

        if (app.key !== APP_KEY) {
            db.close();
            writeMsg('INVALID APP_KEY ', APP_KEY);
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
    sessionChance = countlyPopulatorHelper.getRandomInt(1, 5);
    if (users.length !== maxUserCount) {
        var u = new getUser(template && template.up);
        users.push(u);
    }
    if (sessionChance === 1) { // start session with 20% chance
        try {
            if (template && template.up) {
                users[countlyPopulatorHelper.getRandomInt(0, users.length - 1)].startSession(template);
                intervalCounter++;
                console.log('generating...');
            }
        }
        catch (err) {
            console.log('There was an error sending the session request! ', err);
        }
    }
    // else if (sessionChance === 2) {
    //     console.log('throw error');
    //     // APP_KEY = "0000000000";
    //     users[countlyPopulatorHelper.getRandomInt(0, users.length - 1)].startSession(template);
    // }
    if (intervalCounter === maxUserCount) {
        clearInterval(interval);
        process.exit();
    }
}, INTERVAL_PERIOD);


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
    var requestBodyKeys = Object.keys(params.body);
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
var bulk = [];
var bucket = 50;
var timeout = 1000;
var totalCountWithoutUserProps = 0;
var totalUserCount = 0;
var hasSession = false;

/**
 * Sends bulk request for populator
 **/
async function countlyPopulatorSync() {
    var req = bulk.splice(0, bucket);
    await sendRequest({
        requestType: 'POST',
        Url: SERVER_URL + "/i/bulk",
        body: {
            app_key: APP_KEY,
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
 * Generate a user with random properties and actions
 * @param {object} templateUp user properties template, if available
 **/
function getUser(templateUp) {
    var chance = new Chance();
    this.getId = countlyPopulatorHelper.getId;

    this.getProp = countlyPopulatorHelper.getProp;
    var that = this;
    this.stats = {u: 0, s: 0, x: 0, d: 0, e: 0, r: 0, b: 0, c: 0, p: 0};
    this.id = this.getId();
    this.isRegistered = false;
    hasSession = false;
    this.ip = countlyPopulatorHelper.predefined_ip_addresses[Math.floor(chance.random() * (countlyPopulatorHelper.predefined_ip_addresses.length - 1))];
    if ((totalCountWithoutUserProps < totalUserCount / 3)) {
        this.userdetails = { custom: countlyPopulatorHelper.getUserProperties(templateUp, app) };
        totalCountWithoutUserProps++;
    }
    else {
        this.userdetails = { name: chance.name(), username: chance.twitter().substring(1), email: chance.email(), organization: countlyPopulatorHelper.capitaliseFirstLetter(chance.word()), phone: chance.phone(), gender: chance.gender().charAt(0), byear: chance.birthday().getFullYear(), custom: countlyPopulatorHelper.getUserProperties(templateUp, app) };
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
    var m_props = countlyPopulatorHelper.metric_props.mobile;
    if (app && app.type && countlyPopulatorHelper.metric_props[app.type]) {
        m_props = countlyPopulatorHelper.metric_props[app.type];
    }
    for (var mPropsIndex = 0; mPropsIndex < m_props.length; mPropsIndex++) {
        if (m_props[mPropsIndex] !== "_os") {
            //handle specific cases
            if (m_props[mPropsIndex] === "_store" && app && app.type === "web") {
                this.metrics[m_props[mPropsIndex]] = this.getProp("_source");
            }
            else {
                //check os specific metric
                if (typeof countlyPopulatorHelper.props[m_props[mPropsIndex] + "_" + this.platform.toLowerCase().replace(/\s/g, "_")] !== "undefined") {
                    this.metrics[m_props[mPropsIndex]] = this.getProp(m_props[mPropsIndex] + "_" + this.platform.toLowerCase().replace(/\s/g, "_"));
                }
                //default metric set
                else {
                    this.metrics[m_props[mPropsIndex]] = this.getProp(m_props[mPropsIndex]);
                }
            }
        }
    }

    this.getCrash = countlyPopulatorHelper.getCrash;
    this.getError = countlyPopulatorHelper.getError;
    this.getLog = countlyPopulatorHelper.getLog;
    this.getTrace = countlyPopulatorHelper.getTrace;
    this.getEvent = countlyPopulatorHelper.getEvent;
    this.getEvents = countlyPopulatorHelper.getEvents;

    this.getFeedbackEvents = countlyPopulatorHelper.getFeedbackEvents;
    this.getRatingEvent = countlyPopulatorHelper.getRatingEvent;
    this.getNPSEvent = countlyPopulatorHelper.getNPSEvent;
    this.getSurveyEvent = countlyPopulatorHelper.getSurveyEvent;
    this.getHeatmapEvents = countlyPopulatorHelper.getHeatmapEvents;
    this.getHeatmapEvent = countlyPopulatorHelper.getHeatmapEvent;
    this.getScrollmapEvents = countlyPopulatorHelper.getScrollmapEvents;
    this.getScrollmapEvent = countlyPopulatorHelper.getScrollmapEvent;

    this.startSession = function(template) {
        this.ts = this.ts + 60 * 60 * 24 + 100;
        this.stats.s++;
        var req = {};
        var events;

        if (!this.isRegistered) {
            this.isRegistered = true;
            this.stats.u++;
            // note login event was here
            events = this.getEvent("[CLY]_view", template && template.events && template.events["[CLY]_view"], {populatorTemplateId: POPULATOR_TEMPLATE_ID, app: app, appKey: APP_KEY}).concat(this.getEvent("[CLY]_orientation", template && template.events && template.events["[CLY]_orientation"], {populatorTemplateId: POPULATOR_TEMPLATE_ID, app: app, appKey: APP_KEY}), this.getEvents(4, template && template.events, {populatorTemplateId: POPULATOR_TEMPLATE_ID, app: app, appKey: APP_KEY}));
            req = {timestamp: this.ts, begin_session: 1, metrics: this.metrics, user_details: this.userdetails, events: events, apm: this.getTrace(app)};
            this.stats.p++;
            req.events = req.events.concat(this.getHeatmapEvents({populatorTemplateId: POPULATOR_TEMPLATE_ID, appKey: APP_KEY, serverUrl: SERVER_URL}));
            req.events = req.events.concat(this.getFeedbackEvents({chance: chance, isPluginExists: isPluginExists('surveys')}));
            req.events = req.events.concat(this.getScrollmapEvents({populatorTemplateId: POPULATOR_TEMPLATE_ID, appKey: APP_KEY, serverUrl: SERVER_URL}));
        }
        else {
            events = this.getEvent("[CLY]_view", template && template.events && template.events["[CLY]_view"], {populatorTemplateId: POPULATOR_TEMPLATE_ID, app: app, appKey: APP_KEY}).concat(this.getEvent("[CLY]_orientation", template && template.events && template.events["[CLY]_orientation"], {populatorTemplateId: POPULATOR_TEMPLATE_ID, app: app, appKey: APP_KEY}), this.getEvents(4, template && template.events, {populatorTemplateId: POPULATOR_TEMPLATE_ID, app: app, appKey: APP_KEY}));
            req = {timestamp: this.ts, begin_session: 1, events: events, apm: this.getTrace(app)};
        }

        if (Math.random() > 0.10) {
            this.hasPush = true;
            req.token_session = 1;
            req.test_mode = 0;
            req[this.platform.toLowerCase() + "_token"] = countlyPopulatorHelper.randomString(8);
        }

        this.stats.c++;
        req.crash = this.getCrash(app);

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
            var events = this.getEvent("[CLY]_view", template && template.events && template.events["[CLY]_view"], {populatorTemplateId: POPULATOR_TEMPLATE_ID, app: app, appKey: APP_KEY}).concat(this.getEvent("[CLY]_orientation", template && template.events && template.events["[CLY]_orientation"], {populatorTemplateId: POPULATOR_TEMPLATE_ID, app: app, appKey: APP_KEY}), this.getEvents(2, template && template.events, {populatorTemplateId: POPULATOR_TEMPLATE_ID, app: app, appKey: APP_KEY}));
            req = {timestamp: this.ts, session_duration: 30, events: events, apm: this.getTrace(app)};
            if (Math.random() > 0.8) {
                this.timer = setTimeout(function() {
                    that.extendSession(template);
                }, timeout);
            }
            else {
                if (Math.random() > 0.5) {
                    this.stats.c++;
                    req.crash = this.getCrash(app);
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
            var events = this.getEvents(2, template && template.events, POPULATOR_TEMPLATE_ID, app);
            this.request({timestamp: this.ts, end_session: 1, events: events, apm: this.getTrace(app)});
        }
    };

    this.request = async function(params) {
        this.stats.r++;
        params.device_id = this.id;
        params.ip_address = this.ip;
        params.hour = countlyPopulatorHelper.getRandomInt(0, 23);
        params.dow = countlyPopulatorHelper.getRandomInt(0, 6);
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
                app_key: APP_KEY,
                device_id: this.id,
                populator: true
            }
        });
    };
}
