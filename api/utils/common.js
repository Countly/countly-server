/**
* Module for some common utility functions and references
* @module api/utils/common
*/

/** @lends module:api/utils/common */
var common = {},
    moment = require('moment-timezone'),
    time = require('time')(Date),
    crypto = require('crypto'),
    logger = require('./log.js'),
    mcc_mnc_list = require('mcc-mnc-list'),
    plugins = require('../../plugins/pluginManager.js'),
    countlyConfig = require('./../config', 'dont-enclose'),
    argon2 = require('argon2');

var matchHtmlRegExp = /"|'|&(?!amp;|quot;|#39;|lt;|gt;|#46;|#36;)|<|>/;
var matchLessHtmlRegExp = /[<>]/;

/**
* Escape special characters in the given string of html.
* @param  {string} string - The string to escape for inserting into HTML
* @param  {bool} more - if false, escapes only tags, if true escapes also quotes and ampersands
* @returns {string} escaped string
**/
common.escape_html = function(string, more) {
    var str = '' + string;
    var match;
    if (more) {
        match = matchHtmlRegExp.exec(str);
    }
    else {
        match = matchLessHtmlRegExp.exec(str);
    }
    if (!match) {
        return str;
    }

    var escape;
    var html = '';
    var index = 0;
    var lastIndex = 0;

    for (index = match.index; index < str.length; index++) {
        switch (str.charCodeAt(index)) {
        case 34: // "
            escape = '&quot;';
            break;
        case 38: // &
            escape = '&amp;';
            break;
        case 39: // '
            escape = '&#39;';
            break;
        case 60: // <
            escape = '&lt;';
            break;
        case 62: // >
            escape = '&gt;';
            break;
        default:
            continue;
        }

        if (lastIndex !== index) {
            html += str.substring(lastIndex, index);
        }

        lastIndex = index + 1;
        html += escape;
    }

    return lastIndex !== index ? html + str.substring(lastIndex, index) : html;
};

/**
* Escape special characters in the given value, may be nested object
* @param  {string} key - key of the value
* @param  {vary} value - value to escape
* @param  {bool} more - if false, escapes only tags, if true escapes also quotes and ampersands
* @returns {vary} escaped value
**/
function escape_html_entities(key, value, more) {
    if (typeof value === 'object' && value && (value.constructor === Object || value.constructor === Array)) {
        if (Array.isArray(value)) {
            let replacement = [];
            for (let k = 0; k < value.length; k++) {
                if (typeof value[k] === "string") {
                    let ob = getJSON(value[k]);
                    if (ob.valid) {
                        replacement[common.escape_html(k, more)] = JSON.stringify(escape_html_entities(k, ob.data, more));
                    }
                    else {
                        replacement[k] = common.escape_html(value[k], more);
                    }
                }
                else {
                    replacement[k] = escape_html_entities(k, value[k], more);
                }
            }
            return replacement;
        }
        else {
            let replacement = {};
            for (let k in value) {
                if (Object.hasOwnProperty.call(value, k)) {
                    if (typeof value[k] === "string") {
                        let ob = getJSON(value[k]);
                        if (ob.valid) {
                            replacement[common.escape_html(k, more)] = JSON.stringify(escape_html_entities(k, ob.data, more));
                        }
                        else {
                            replacement[common.escape_html(k, more)] = common.escape_html(value[k], more);
                        }
                    }
                    else {
                        replacement[common.escape_html(k, more)] = escape_html_entities(k, value[k], more);
                    }
                }
            }
            return replacement;
        }
    }
    return value;
}

/**
* Check if string is a valid json
* @param {string} val - string that might be json encoded
* @returns {object} with property data for parsed data and property valid to check if it was valid json encoded string or not
**/
function getJSON(val) {
    var ret = {valid: false};
    try {
        ret.data = JSON.parse(val);
        if (ret.data && typeof ret.data === "object") {
            ret.valid = true;
        }
    }
    catch (ex) {
        //silent error
    }
    return ret;
}
/**
* Logger object for creating module specific logging
* @type {module:api/utils/log~Logger} 
* @example
* var log = common.log('myplugin:api');
* log.i('myPlugin got a request: %j', params.qstring);
*/
common.log = logger;

/**
* Mapping some common property names from longer understandable to shorter representation stored in database
* @type {object} 
*/
common.dbMap = {
    'events': 'e',
    'total': 't',
    'new': 'n',
    'unique': 'u',
    'duration': 'd',
    'durations': 'ds',
    'frequency': 'f',
    'loyalty': 'l',
    'sum': 's',
    'dur': 'dur',
    'count': 'c'
};

/**
* Mapping some common user property names from longer understandable to shorter representation stored in database
* @type {object} 
*/
common.dbUserMap = {
    'device_id': 'did',
    'user_id': 'uid',
    'first_seen': 'fs',
    'last_seen': 'ls',
    'last_payment': 'lp',
    'session_duration': 'sd',
    'total_session_duration': 'tsd',
    'session_count': 'sc',
    'device': 'd',
    'carrier': 'c',
    'city': 'cty',
    'region': 'rgn',
    'country_code': 'cc',
    'platform': 'p',
    'platform_version': 'pv',
    'app_version': 'av',
    'last_begin_session_timestamp': 'lbst',
    'last_end_session_timestamp': 'lest',
    'has_ongoing_session': 'hos',
    'previous_events': 'pe',
    'resolution': 'r'
};

/**
* Mapping some common event property names from longer understandable to shorter representation stored in database
* @type {object} 
*/
common.dbEventMap = {
    'user_properties': 'up',
    'timestamp': 'ts',
    'segmentations': 'sg',
    'count': 'c',
    'sum': 's',
    'duration': 'dur',
    'previous_events': 'pe'
};

/**
* Default {@link countlyConfig} object for API server
* @type {object} 
*/
common.config = countlyConfig;

/**
* Reference to time module
* @type {object} 
*/
common.time = time;

/**
* Reference to momentjs
* @type {object} 
*/
common.moment = moment;

/**
* Reference to crypto module
* @type {object} 
*/
common.crypto = crypto;

/**
* Operating syste/platform mappings from what can be passed in metrics to shorter representations 
* stored in db as prefix to OS segmented values
* @type {object} 
*/
common.os_mapping = {
    "unknown": "unk",
    "undefined": "unk",
    "tvos": "atv",
    "watchos": "wos",
    "unity editor": "uty",
    "qnx": "qnx",
    "os/2": "os2",
    "windows": "mw",
    "open bsd": "ob",
    "searchbot": "sb",
    "sun os": "so",
    "solaris": "so",
    "beos": "bo",
    "mac osx": "o",
    "macos": "o",
    "mac": "o",
    "webos": "web",
    "brew": "brew"
};

/**
* Whole base64 alphabet for fetching splitted documents
* @type {object} 
*/
common.base64 = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9", "a", "b", "c", "d", "e", "f", "g", "h", "i", "j", "k", "l", "m", "n", "o", "p", "q", "r", "s", "t", "u", "v", "w", "x", "y", "z", "A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L", "M", "N", "O", "P", "Q", "R", "S", "T", "U", "V", "W", "X", "Y", "Z", "+", "/"];

common.dbPromise = function() {
    var args = Array.prototype.slice.call(arguments);
    return new Promise(function(resolve, reject) {
        var collection = common.db.collection(args[0]),
            method = args[1];

        if (method === 'find') {
            collection[method].apply(collection, args.slice(2)).toArray(function(err, result) {
                if (err) {
                    reject(err);
                }
                else {
                    resolve(result);
                }
            });
        }
        else {
            collection[method].apply(collection, args.slice(2).concat([function(err, result) {
                if (err) {
                    reject(err);
                }
                else {
                    resolve(result);
                }
            }]));
        }

    });
};

/**
* Fetches nested property values from an obj.
* @param {object} obj - standard countly metric object
* @param {string} desc - dot separate path to fetch from object
* @returns {object} fetched object from provided path
* @example
* //outputs {"u":20,"t":20,"n":5}
* common.getDescendantProp({"2017":{"1":{"2":{"u":20,"t":20,"n":5}}}}, "2017.1.2");
*/
common.getDescendantProp = function(obj, desc) {
    desc = String(desc);

    if (desc.indexOf(".") === -1) {
        return obj[desc];
    }

    var arr = desc.split(".");
    while (arr.length && (obj = obj[arr.shift()])) {
        //doing operator in the loop condition
    }

    return obj;
};

/**
* Checks if provided value could be converted to a number, 
* even if current type is other, as string, as example value "42"
* @param {any} n - value to check if it can be converted to number
* @returns {boolean} true if can be a number, false if can't be a number
* @example
* common.isNumber(1) //outputs true
* common.isNumber("2") //outputs true
* common.isNumber("test") //outputs false
*/
common.isNumber = function(n) {
    return !isNaN(parseFloat(n)) && isFinite(n);
};

/**
* This default Countly behavior of type conversion for storing proeprties accepted through API requests
* dealing with numbers as strings and too long numbers
* @param {any} value - value to convert to usable type
* @returns {varies} converted value
* @example
* common.convertToType(1) //outputs 1
* common.convertToType("2") //outputs 2
* common.convertToType("test") //outputs "test"
* common.convertToType("12345678901234567890") //outputs "12345678901234567890"
*/
common.convertToType = function(value) {
    //handle array values
    if (Array.isArray(value)) {
        for (var i = 0; i < value.length; i++) {
            value[i] = common.convertToType(value[i]);
        }
        return value;
    }
    //if value can be a number
    else if (common.isNumber(value)) {
        //check if it is string but is less than 16 length
        if (value.length && value.length <= 16) {
            //convert to number
            return parseFloat(value);
        }
        //check if it is number, but longer than 16 digits (max limit)
        else if ((value + "").length > 16) {
            //convert to string
            return value + "";
        }
        else {
            //return number as is
            return value;
        }
    }
    else {
        //return as string
        return value + "";
    }
};

/**
* Safe division between numbers providing 0 as result in cases when dividing by 0
* @param {number} dividend - number which to divide
* @param {number} divisor - number by which to divide
* @returns {number} result of division
* @example
* //outputs 0
* common.safeDivision(100, 0);
*/
common.safeDivision = function(dividend, divisor) {
    var tmpAvgVal;
    tmpAvgVal = dividend / divisor;
    if (!tmpAvgVal || tmpAvgVal === Number.POSITIVE_INFINITY) {
        tmpAvgVal = 0;
    }
    return tmpAvgVal;
};

/**
* Pad number with specified character from left to specified length
* @param {number} number - number to pad
* @param {number} width - pad to what length in symbols
* @returns {string} padded number
* @example
* //outputs 0012
* common.zeroFill(12, 4, "0");
*/
common.zeroFill = function(number, width) {
    width -= number.toString().length;

    if (width > 0) {
        return new Array(width + (/\./.test(number) ? 2 : 1)).join('0') + number;
    }

    return number + ""; // always return a string
};

/**
* Add item or array to existing array only if values are not already in original array
* @param {array} arr - original array where to add unique elements
* @param {string|number|array} item - item to add or array to merge
*/
common.arrayAddUniq = function(arr, item) {
    if (!arr) {
        arr = [];
    }

    if (toString.call(item) === "[object Array]") {
        for (var i = 0; i < item.length; i++) {
            if (arr.indexOf(item[i]) === -1) {
                arr[arr.length] = item[i];
            }
        }
    }
    else {
        if (arr.indexOf(item) === -1) {
            arr[arr.length] = item;
        }
    }
};

/**
* Create HMAC sha1 hash from provided value and optional salt
* @param {string} str - value to hash
* @param {string=} addSalt - optional salt, uses ms timestamp by default
* @returns {string} HMAC sha1 hash
*/
common.sha1Hash = function(str, addSalt) {
    var salt = (addSalt) ? new Date().getTime() : '';
    return crypto.createHmac('sha1', salt + '').update(str + '').digest('hex');
};

/**
* Create HMAC sha512 hash from provided value and optional salt
* @param {string} str - value to hash
* @param {string=} addSalt - optional salt, uses ms timestamp by default
* @returns {string} HMAC sha1 hash
*/
common.sha512Hash = function(str, addSalt) {
    var salt = (addSalt) ? new Date().getTime() : '';
    return crypto.createHmac('sha512', salt + '').update(str + '').digest('hex');
};

/**
* Create argon2 hash string
* @param {string} str - string to hash
* @returns {promise} hash promise
**/
common.argon2Hash = function(str) {
    return argon2.hash(str);
};

/**
* Create MD5 hash from provided value
* @param {string} str - value to hash
* @returns {string} MD5 hash
*/
common.md5Hash = function(str) {
    return crypto.createHash('md5').update(str + '').digest('hex');
};

/**
* Modifies provided object in the format object["2012.7.20.property"] = increment. 
* Usualy used when filling up Countly metric model data
* @param {params} params - {@link params} object
* @param {object} object - object to fill
* @param {string} property - meric value or segment or property to fill/increment
* @param {number=} increment - by how much to increments, default is 1
* @returns {void} void
* @example
* var obj = {};
* common.fillTimeObject(params, obj, "u", 1);
* console.log(obj);
* //outputs
* { '2017.u': 1,
*   '2017.2.u': 1,
*   '2017.2.23.u': 1,
*   '2017.2.23.8.u': 1,
*   '2017.w8.u': 1 }
*/
common.fillTimeObject = function(params, object, property, increment) {
    increment = (increment) ? increment : 1;
    var timeObj = params.time;

    if (!timeObj || !timeObj.yearly || !timeObj.monthly || !timeObj.weekly || !timeObj.daily || !timeObj.hourly) {
        return false;
    }

    object[timeObj.yearly + '.' + property] = increment;
    object[timeObj.monthly + '.' + property] = increment;
    object[timeObj.daily + '.' + property] = increment;

    // If the property parameter contains a dot, hourly data is not saved in
    // order to prevent two level data (such as 2012.7.20.TR.u) to get out of control.
    if (property.indexOf('.') === -1) {
        object[timeObj.hourly + '.' + property] = increment;
    }

    // For properties that hold the unique visitor count we store weekly data as well.
    if (property.substr(-2) === ("." + common.dbMap.unique) ||
            property === common.dbMap.unique ||
            property.substr(0, 2) === (common.dbMap.frequency + ".") ||
            property.substr(0, 2) === (common.dbMap.loyalty + ".") ||
            property.substr(0, 3) === (common.dbMap.durations + ".") ||
            property === common.dbMap.paying) {
        object[timeObj.yearly + ".w" + timeObj.weekly + '.' + property] = increment;
    }
};

/**
* Creates a time object from request's milisecond or second timestamp in provided app's timezone
* @param {string} appTimezone - app's timezone
* @param {number} reqTimestamp - timestamp in the request
* @returns {timeObject} Time object for current request
*/
common.initTimeObj = function(appTimezone, reqTimestamp) {
    var currTimestamp,
        curMsTimestamp,
        currDate,
        currDateWithoutTimestamp = new Date();

    // Check if the timestamp parameter exists in the request and is a 10 or 13 digit integer, handling also float timestamps with ms after dot
    if (reqTimestamp && (Math.round(parseFloat(reqTimestamp, 10)) + "").length === 10 && common.isNumber(reqTimestamp)) {
        // If the received timestamp is greater than current time use the current time as timestamp
        currTimestamp = (parseInt(reqTimestamp, 10) > time.time()) ? time.time() : parseInt(reqTimestamp, 10);
        curMsTimestamp = (parseInt(reqTimestamp, 10) > time.time()) ? time.time() * 1000 : parseFloat(reqTimestamp, 10) * 1000;
        currDate = new Date(currTimestamp * 1000);
    }
    else if (reqTimestamp && (Math.round(parseFloat(reqTimestamp, 10)) + "").length === 13 && common.isNumber(reqTimestamp)) {
        var tmpTimestamp = Math.floor(parseInt(reqTimestamp, 10) / 1000);
        curMsTimestamp = (tmpTimestamp > time.time()) ? Date.now() : parseInt(reqTimestamp, 10);
        currTimestamp = (tmpTimestamp > time.time()) ? time.time() : tmpTimestamp;
        currDate = new Date(currTimestamp * 1000);
    }
    else {
        currTimestamp = time.time(); // UTC
        currDate = new Date();
        curMsTimestamp = currDate.getTime();
    }

    currDate.setTimezone(appTimezone);
    currDateWithoutTimestamp.setTimezone(appTimezone);

    var tmpMoment = moment(currDate);
    tmpMoment.tz(appTimezone);

    /**
   * @typedef timeObject
   * @type {object} 
   * @global
   * @property {momentjs} now - momentjs instance for request's time in app's timezone
   * @property {momentjs} nowUTC - momentjs instance for request's time in UTC
   * @property {momentjs} nowWithoutTimestamp - momentjs instance for current time in app's timezone
   * @property {number} timestamp -  request's seconds timestamp
   * @property {number} mstimestamp -  request's miliseconds timestamp
   * @property {string} yearly -  year of request time in app's timezone in YYYY format
   * @property {string} monthly -  month of request time in app's timezone in YYYY.M format
   * @property {string} daily -  date of request time in app's timezone in YYYY.M.D format
   * @property {string} hourly -  hour of request time in app's timezone in YYYY.M.D.H format
   * @property {number} weekly -  week of request time in app's timezone as result day of the year, divided by 7
   * @property {string} month -  month of request time in app's timezone in format M
   * @property {string} day -  day of request time in app's timezone in format D
   * @property {string} hour -  hour of request time in app's timezone in format H
   */
    return {
        now: tmpMoment,
        nowUTC: moment.utc(currDate),
        nowWithoutTimestamp: moment(currDateWithoutTimestamp).tz(appTimezone),
        timestamp: currTimestamp,
        mstimestamp: curMsTimestamp,
        yearly: tmpMoment.format("YYYY"),
        monthly: tmpMoment.format("YYYY.M"),
        daily: tmpMoment.format("YYYY.M.D"),
        hourly: tmpMoment.format("YYYY.M.D.H"),
        weekly: Math.ceil(tmpMoment.format("DDD") / 7),
        month: tmpMoment.format("M"),
        day: tmpMoment.format("D"),
        hour: tmpMoment.format("H")
    };
};

/**
* Creates a Date object from provided seconds timestamp in provided timezone
* @param {number} timestamp - unix timestamp in seconds
* @param {string} timezone - name of the timezone
* @returns {Date} Date object for provided time
*/
common.getDate = function(timestamp, timezone) {
    var tmpDate = (timestamp) ? new Date(timestamp * 1000) : new Date();

    if (timezone) {
        tmpDate.setTimezone(timezone);
    }

    return tmpDate;
};

/**
* Returns day of the year from provided seconds timestamp in provided timezone
* @param {number} timestamp - unix timestamp in seconds
* @param {string} timezone - name of the timezone
* @returns {number} current day of the year
*/
common.getDOY = function(timestamp, timezone) {
    var endDate = (timestamp) ? new Date(timestamp * 1000) : new Date();

    if (timezone) {
        endDate.setTimezone(timezone);
    }

    var startDate = (timestamp) ? new Date(timestamp * 1000) : new Date();

    if (timezone) {
        startDate.setTimezone(timezone);
    }

    startDate.setMonth(0);
    startDate.setDate(1);
    startDate.setHours(0);
    startDate.setMinutes(0);
    startDate.setSeconds(0);
    startDate.setMilliseconds(0);

    var diff = endDate - startDate;
    var oneDay = 1000 * 60 * 60 * 24;
    var currDay = Math.ceil(diff / oneDay);

    return currDay;
};

/**
* Returns amount of days in provided year
* @param {number} year - year to check for days
* @returns {number} number of days in provided year
*/
common.getDaysInYear = function(year) {
    if (new Date(year, 1, 29).getMonth() === 1) {
        return 366;
    }
    else {
        return 365;
    }
};

/**
* Returns amount of iso weeks in provided year
* @param {number} year - year to check for days
* @returns {number} number of iso weeks in provided year
*/
common.getISOWeeksInYear = function(year) {
    var d = new Date(year, 0, 1),
        isLeap = new Date(year, 1, 29).getMonth() === 1;

    //Check for a Jan 1 that's a Thursday or a leap year that has a
    //Wednesday Jan 1. Otherwise it's 52
    return d.getDay() === 4 || isLeap && d.getDay() === 3 ? 53 : 52;
};

/**
* Validates provided arguments
* @param {object} args - arguments to validate
* @param {object} argProperties - rules for validating each argument
* @param {boolean} argProperties.required - should property be present in args
* @param {string} argProperties.type - what type should property be, possible values: String, Array, Number, URL, Boolean, Object, Email
* @param {string} argProperties.max-length - property should not be longer than provided value
* @param {string} argProperties.min-length - property should not be shorter than provided value
* @param {string} argProperties.exclude-from-ret-obj - should property be present in returned validated args object
* @param {string} argProperties.has-number - should string property has any number in it
* @param {string} argProperties.has-char - should string property has any latin character in it
* @param {string} argProperties.has-upchar - should string property has any upper cased latin character in it
* @param {string} argProperties.has-special - should string property has any none latin character in it
* @param {boolean} returnErrors - return error details as array or only boolean result
* @returns {object} validated args in obj property, or false as result property if args do not pass validation and errors array
*/
common.validateArgs = function(args, argProperties, returnErrors) {

    if (arguments.length === 2) {
        returnErrors = false;
    }

    var returnObj;

    if (returnErrors) {
        returnObj = {
            result: true,
            errors: [],
            obj: {}
        };
    }
    else {
        returnObj = {};
    }

    if (!args) {
        if (returnErrors) {
            returnObj.result = false;
            returnObj.errors.push("Missing 'args' parameter");
            delete returnObj.obj;
            return returnObj;
        }
        else {
            return false;
        }
    }

    for (var arg in argProperties) {
        var argState = true;
        if (argProperties[arg].required) {
            if (args[arg] === void 0) {
                if (returnErrors) {
                    returnObj.errors.push("Missing " + arg + " argument");
                    returnObj.result = false;
                    argState = false;
                }
                else {
                    return false;
                }
            }
        }
        if (args[arg] !== void 0) {

            if (argProperties[arg].type) {
                if (argProperties[arg].type === 'Number' || argProperties[arg].type === 'String') {
                    if (toString.call(args[arg]) !== '[object ' + argProperties[arg].type + ']') {
                        if (returnErrors) {
                            returnObj.errors.push("Invalid type for " + arg);
                            returnObj.result = false;
                            argState = false;
                        }
                        else {
                            return false;
                        }
                    }
                }
                else if (argProperties[arg].type === 'URL') {
                    if (toString.call(args[arg]) !== '[object String]') {
                        if (returnErrors) {
                            returnObj.errors.push("Invalid type for " + arg);
                            returnObj.result = false;
                            argState = false;
                        }
                        else {
                            return false;
                        }
                    }
                    else if (args[arg] && !/^([a-z]([a-z]|\d|\+|-|\.)*):(\/\/(((([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!$&'()*+,;=]|:)*@)?((\[(|(v[\da-f]{1,}\.(([a-z]|\d|-|\.|_|~)|[!$&'()*+,;=]|:)+))\])|((\d|[1-9]\d|1\d\d|2[0-4]\d|25[0-5])\.(\d|[1-9]\d|1\d\d|2[0-4]\d|25[0-5])\.(\d|[1-9]\d|1\d\d|2[0-4]\d|25[0-5])\.(\d|[1-9]\d|1\d\d|2[0-4]\d|25[0-5]))|(([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!$&'()*+,;=])*)(:\d*)?)(\/(([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!$&'()*+,;=]|:|@)*)*|(\/((([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!$&'()*+,;=]|:|@)+(\/(([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!$&'()*+,;=]|:|@)*)*)?)|((([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!$&'()*+,;=]|:|@)+(\/(([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!$&'()*+,;=]|:|@)*)*)|((([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!$&'()*+,;=]|:|@)){0})(\?((([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!$&'()*+,;=]|:|@)|[\uE000-\uF8FF]|\/|\?)*)?(#((([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!$&'()*+,;=]|:|@)|\/|\?)*)?$/i.test(args[arg])) {
                        if (returnErrors) {
                            returnObj.errors.push("Invalid url string " + arg);
                            returnObj.result = false;
                            argState = false;
                        }
                        else {
                            return false;
                        }
                    }
                }
                else if (argProperties[arg].type === 'Email') {
                    if (toString.call(args[arg]) !== '[object String]') {
                        if (returnErrors) {
                            returnObj.errors.push("Invalid type for " + arg);
                            returnObj.result = false;
                            argState = false;
                        }
                        else {
                            return false;
                        }
                    }
                    else if (args[arg] && !/[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*@(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?/i.test(args[arg])) {
                        if (returnErrors) {
                            returnObj.errors.push("Invalid url string " + arg);
                            returnObj.result = false;
                            argState = false;
                        }
                        else {
                            return false;
                        }
                    }
                }
                else if (argProperties[arg].type === 'Boolean') {
                    if (!(args[arg] !== true || args[arg] !== false || toString.call(args[arg]) !== '[object Boolean]')) {
                        if (returnErrors) {
                            returnObj.errors.push("Invalid type for " + arg);
                            returnObj.result = false;
                            argState = false;
                        }
                    }
                }
                else if (argProperties[arg].type === 'Array') {
                    if (!Array.isArray(args[arg])) {
                        if (returnErrors) {
                            returnObj.errors.push("Invalid type for " + arg);
                            returnObj.result = false;
                            argState = false;
                        }
                        else {
                            return false;
                        }
                    }
                }
                else if (argProperties[arg].type === 'Object') {
                    if (toString.call(args[arg]) !== '[object ' + argProperties[arg].type + ']' && !(!argProperties[arg].required && args[arg] === null)) {
                        if (returnErrors) {
                            returnObj.errors.push("Invalid type for " + arg);
                            returnObj.result = false;
                            argState = false;
                        }
                        else {
                            return false;
                        }
                    }
                }
                else {
                    if (returnErrors) {
                        returnObj.errors.push("Invalid type declaration for " + arg);
                        returnObj.result = false;
                        argState = false;
                    }
                    else {
                        return false;
                    }
                }
            }
            else {
                if (toString.call(args[arg]) !== '[object String]') {
                    if (returnErrors) {
                        returnObj.errors.push(arg + " should be string");
                        returnObj.result = false;
                        argState = false;
                    }
                    else {
                        return false;
                    }
                }
            }

            if (argProperties[arg]['max-length']) {
                if (args[arg].length > argProperties[arg]['max-length']) {
                    if (returnErrors) {
                        returnObj.errors.push("Length of " + arg + " is greater than max length value");
                        returnObj.result = false;
                        argState = false;
                    }
                    else {
                        return false;
                    }
                }
            }

            if (argProperties[arg]['min-length']) {
                if (args[arg].length < argProperties[arg]['min-length']) {
                    if (returnErrors) {
                        returnObj.errors.push("Length of " + arg + " is lower than min length value");
                        returnObj.result = false;
                        argState = false;
                    }
                    else {
                        return false;
                    }
                }
            }

            if (argProperties[arg]['has-number']) {
                if (!/\d/.test(args[arg])) {
                    if (returnErrors) {
                        returnObj.errors.push(arg + " should has number");
                        returnObj.result = false;
                        argState = false;
                    }
                    else {
                        return false;
                    }
                }
            }

            if (argProperties[arg]['has-char']) {
                if (!/[A-Za-z]/.test(args[arg])) {
                    if (returnErrors) {
                        returnObj.errors.push(arg + " should has char");
                        returnObj.result = false;
                        argState = false;
                    }
                    else {
                        return false;
                    }
                }
            }

            if (argProperties[arg]['has-upchar']) {
                if (!/[A-Z]/.test(args[arg])) {
                    if (returnErrors) {
                        returnObj.errors.push(arg + " should has upchar");
                        returnObj.result = false;
                        argState = false;
                    }
                    else {
                        return false;
                    }
                }
            }

            if (argProperties[arg]['has-special']) {
                if (!/[^A-Za-z\d]/.test(args[arg])) {
                    if (returnErrors) {
                        returnObj.errors.push(arg + " should has special character");
                        returnObj.result = false;
                        argState = false;
                    }
                    else {
                        return false;
                    }
                }
            }

            if (argState && returnErrors && !argProperties[arg]['exclude-from-ret-obj']) {
                returnObj.obj[arg] = args[arg];
            }
            else if (!returnErrors && !argProperties[arg]['exclude-from-ret-obj']) {
                returnObj[arg] = args[arg];
            }
        }
    }

    if (returnErrors && !returnObj.result) {
        delete returnObj.obj;
        return returnObj;
    }
    else {
        return returnObj;
    }
};

/**
* Fix event keys before storing in database by removing dots and $ from the string, removing other prefixes and limiting length
* @param {string} eventKey - key value to fix
* @returns {string|false} escaped key or false if not possible to use key at all
*/
common.fixEventKey = function(eventKey) {
    var shortEventName = eventKey.replace(/system\.|\.\.|\$/g, "");

    if (shortEventName.length >= 128) {
        return false;
    }
    else {
        return shortEventName;
    }
};

/**
* Block {@link module:api/utils/common.returnMessage} and {@link module:api/utils/common.returnOutput} from ouputting anything
* @param {params} params - params object
*/
common.blockResponses = function(params) {
    params.blockResponses = true;
};

/**
* Unblock/allow {@link module:api/utils/common.returnMessage} and {@link module:api/utils/common.returnOutput} ouputting anything
* @param {params} params - params object
*/
common.unblockResponses = function(params) {
    params.blockResponses = false;
};

/**
* Custom API response handler callback
* @typedef APICallback
* @callback APICallback
* @type {function} 
* @global
* @param {bool} error - true if there was problem processing request, and false if request was processed successfully 
* @param {string} responseMessage - what API returns
* @param {object} headers - what API would have returned to HTTP request
* @param {number} returnCode - HTTP code, what API would have returned to HTTP request
* @param {params} params - request context that was passed to requestProcessor, modified during request processing
*/

/**
* Return raw headers and body
* @param {params} params - params object
* @param {number} returnCode - http code to use
* @param {string} body - raw data to output
* @param {object} heads - headers to add to the output
*/
common.returnRaw = function(params, returnCode, body, heads) {
    params.response = {
        code: returnCode,
        body: body
    };

    if (params && params.APICallback && typeof params.APICallback === 'function') {
        if (!params.blockResponses && (!params.res || !params.res.finished)) {
            if (!params.res) {
                params.res = {};
            }
            params.res.finished = true;
            params.APICallback(returnCode !== 200, body, heads, returnCode, params);
        }
        return;
    }
    //set provided in configuration headers
    var headers = {};
    if (heads) {
        for (var i in heads) {
            headers[i] = heads[i];
        }
    }
    if (params && params.res && params.res.writeHead && !params.blockResponses) {
        if (!params.res.finished) {
            params.res.writeHead(returnCode, headers);
            if (body) {
                params.res.write(body);
            }
            params.res.end();
        }
        else {
            console.error("Output already closed, can't write more");
            console.trace();
            console.log(params);
        }
    }
};

/**
* Output message as request response with provided http code
* @param {params} params - params object
* @param {number} returnCode - http code to use
* @param {string} message - Message to output, will be encapsulated in JSON object under result property
* @param {object} heads - headers to add to the output
*/
common.returnMessage = function(params, returnCode, message, heads) {
    params.response = {
        code: returnCode,
        body: JSON.stringify({result: message}, escape_html_entities)
    };

    if (params && params.APICallback && typeof params.APICallback === 'function') {
        if (!params.blockResponses && (!params.res || !params.res.finished)) {
            if (!params.res) {
                params.res = {};
            }
            params.res.finished = true;
            params.APICallback(returnCode !== 200, JSON.stringify({result: message}), heads, returnCode, params);
        }
        return;
    }
    //set provided in configuration headers
    var headers = {
        'Content-Type': 'application/json; charset=utf-8',
        'Access-Control-Allow-Origin': '*'
    };
    var add_headers = (plugins.getConfig("security").api_additional_headers || "").replace(/\r\n|\r|\n/g, "\n").split("\n");
    var parts;
    for (let i = 0; i < add_headers.length; i++) {
        if (add_headers[i] && add_headers[i].length) {
            parts = add_headers[i].split(/:(.+)?/);
            if (parts.length === 3) {
                headers[parts[0]] = parts[1];
            }
        }
    }
    if (heads) {
        for (let i in heads) {
            headers[i] = heads[i];
        }
    }
    if (params && params.res && params.res.writeHead && !params.blockResponses) {
        if (!params.res.finished) {
            params.res.writeHead(returnCode, headers);
            if (params.qstring.callback) {
                params.res.write(params.qstring.callback + '(' + JSON.stringify({result: message}, escape_html_entities) + ')');
            }
            else {
                params.res.write(JSON.stringify({result: message}, escape_html_entities));
            }

            params.res.end();
        }
        else {
            console.error("Output already closed, can't write more");
            console.trace();
            console.log(params);
        }
    }
};

/**
* Output message as request response with provided http code
* @param {params} params - params object
* @param {output} output - object to stringify and output
* @param {string} noescape - prevent escaping HTML entities
* @param {object} heads - headers to add to the output
*/
common.returnOutput = function(params, output, noescape, heads) {
    var escape = noescape ? undefined : function(k, v) {
        return escape_html_entities(k, v, true);
    };

    params.response = {
        code: 200,
        body: JSON.stringify(output, escape)
    };

    if (params && params.APICallback && typeof params.APICallback === 'function') {
        if (!params.blockResponses && (!params.res || !params.res.finished)) {
            if (!params.res) {
                params.res = {};
            }
            params.res.finished = true;
            params.APICallback(false, output, heads, 200, params);
        }
        return;
    }
    //set provided in configuration headers
    var headers = {
        'Content-Type': 'application/json; charset=utf-8',
        'Access-Control-Allow-Origin': '*'
    };
    var add_headers = (plugins.getConfig("security").api_additional_headers || "").replace(/\r\n|\r|\n/g, "\n").split("\n");
    var parts;
    for (let i = 0; i < add_headers.length; i++) {
        if (add_headers[i] && add_headers[i].length) {
            parts = add_headers[i].split(/:(.+)?/);
            if (parts.length === 3) {
                headers[parts[0]] = parts[1];
            }
        }
    }
    if (heads) {
        for (let i in heads) {
            headers[i] = heads[i];
        }
    }
    if (params && params.res && params.res.writeHead && !params.blockResponses) {
        if (!params.res.finished) {
            params.res.writeHead(200, headers);
            if (params.qstring.callback) {
                params.res.write(params.qstring.callback + '(' + JSON.stringify(output, escape) + ')');
            }
            else {
                params.res.write(JSON.stringify(output, escape));
            }

            params.res.end();
        }
        else {
            console.error("Output already closed, can't write more");
            console.trace();
            console.log(params);
        }
    }
};
var ipLogger = common.log('ip:api');

/**
* Get IP address from request object
* @param {req} req - nodejs request object
* @returns {string} ip address
*/
common.getIpAddress = function(req) {
    var ipAddress = (req) ? req.headers['x-forwarded-for'] || req.headers['x-real-ip'] || req.connection.remoteAddress || req.socket.remoteAddress || (req.connection.socket ? req.connection.socket.remoteAddress : '') : "";
    /* Since x-forwarded-for: client, proxy1, proxy2, proxy3 */
    var ips = ipAddress.split(',');

    //if ignoreProxies not setup, use outmost left ip address
    if (!countlyConfig.ignoreProxies || !countlyConfig.ignoreProxies.length) {
        ipLogger.d("From %s found ip %s", ipAddress, ips[0]);
        return stripPort(ips[0]);
    }
    //search for the outmost right ip address ignoring provided proxies
    var ip = "";
    for (var i = ips.length - 1; i >= 0; i--) {
        ips[i] = stripPort(ips[i]);
        var masks = false;
        if (countlyConfig.ignoreProxies && countlyConfig.ignoreProxies.length) {
            masks = countlyConfig.ignoreProxies.some(function(elem) {
                return ips[i].startsWith(elem);
            });
        }
        if (ips[i] !== "127.0.0.1" && (!countlyConfig.ignoreProxies || !masks)) {
            ip = ips[i];
            break;
        }
    }
    ipLogger.d("From %s found ip %s", ipAddress, ip);
    return ip;
};

/**
 *  This function takes ipv4 or ipv6 with possible port, removes port information and returns plain ip address
 *  @param {string} ip - ip address to check for port and return plain ip
 *  @returns {string} plain ip address
 */
function stripPort(ip) {
    var parts = (ip + "").split(".");
    //check if ipv4
    if (parts.length === 4) {
        return ip.split(":")[0].trim();
    }
    else {
        parts = (ip + "").split(":");
        if (parts.length === 9) {
            parts.pop();
        }
        if (parts.length === 8) {
            ip = parts.join(":");
            //remove enclosing [] for ipv6 if they are there
            if (ip[0] === "[") {
                ip = ip.substring(1);
            }
            if (ip[ip.length - 1] === "]") {
                ip = ip.slice(0, -1);
            }
        }
    }
    return (ip + "").trim();
}

/**
* Modifies provided object filling properties used in zero documents in the format object["2012.7.20.property"] = increment. 
* Usualy used when filling up Countly metric model zero document
* @param {params} params - {@link params} object
* @param {object} object - object to fill
* @param {string} property - meric value or segment or property to fill/increment
* @param {number=} increment - by how much to increments, default is 1
* @returns {void} void
* @example
* var obj = {};
* common.fillTimeObjectZero(params, obj, "u", 1);
* console.log(obj);
* //outputs
* { 'd.u': 1, 'd.2.u': 1, 'd.w8.u': 1 }
*/
common.fillTimeObjectZero = function(params, object, property, increment) {
    var tmpIncrement = (increment) ? increment : 1,
        timeObj = params.time;

    if (!timeObj || !timeObj.yearly || !timeObj.month) {
        return false;
    }

    if (property instanceof Array) {
        for (var i = 0; i < property.length; i++) {
            object['d.' + property[i]] = tmpIncrement;
            object['d.' + timeObj.month + '.' + property[i]] = tmpIncrement;

            // For properties that hold the unique visitor count we store weekly data as well.
            if (property[i].substr(-2) === ("." + common.dbMap.unique) ||
                    property[i] === common.dbMap.unique ||
                    property[i].substr(0, 2) === (common.dbMap.frequency + ".") ||
                    property[i].substr(0, 2) === (common.dbMap.loyalty + ".") ||
                    property[i].substr(0, 3) === (common.dbMap.durations + ".") ||
                    property[i] === common.dbMap.paying) {
                object['d.' + "w" + timeObj.weekly + '.' + property[i]] = tmpIncrement;
            }
        }
    }
    else {
        object['d.' + property] = tmpIncrement;
        object['d.' + timeObj.month + '.' + property] = tmpIncrement;

        if (property.substr(-2) === ("." + common.dbMap.unique) ||
                property === common.dbMap.unique ||
                property.substr(0, 2) === (common.dbMap.frequency + ".") ||
                property.substr(0, 2) === (common.dbMap.loyalty + ".") ||
                property.substr(0, 3) === (common.dbMap.durations + ".") ||
                property === common.dbMap.paying) {
            object['d.' + "w" + timeObj.weekly + '.' + property] = tmpIncrement;
        }
    }

    return true;
};

/**
* Modifies provided object filling properties used in monthly documents in the format object["2012.7.20.property"] = increment. 
* Usualy used when filling up Countly metric model monthly document
* @param {params} params - {@link params} object
* @param {object} object - object to fill
* @param {string} property - meric value or segment or property to fill/increment
* @param {number=} increment - by how much to increments, default is 1
* @param {boolean=} forceHour - force recording hour information too, dfault is false
* @returns {void} void
* @example
* var obj = {};
* common.fillTimeObjectMonth(params, obj, "u", 1);
* console.log(obj);
* //outputs
* { 'd.23.u': 1, 'd.23.12.u': 1 }
*/
common.fillTimeObjectMonth = function(params, object, property, increment, forceHour) {
    var tmpIncrement = (increment) ? increment : 1,
        timeObj = params.time;

    if (!timeObj || !timeObj.yearly || !timeObj.month || !timeObj.weekly || !timeObj.day || !timeObj.hour) {
        return false;
    }

    if (property instanceof Array) {
        for (var i = 0; i < property.length; i++) {
            object['d.' + timeObj.day + '.' + property[i]] = tmpIncrement;

            // If the property parameter contains a dot, hourly data is not saved in
            // order to prevent two level data (such as 2012.7.20.TR.u) to get out of control.
            if (forceHour || property[i].indexOf('.') === -1) {
                object['d.' + timeObj.day + '.' + timeObj.hour + '.' + property[i]] = tmpIncrement;
            }
        }
    }
    else {
        object['d.' + timeObj.day + '.' + property] = tmpIncrement;

        if (forceHour || property.indexOf('.') === -1) {
            object['d.' + timeObj.day + '.' + timeObj.hour + '.' + property] = tmpIncrement;
        }
    }

    return true;
};

/**
* Record data in Countly standard metric model
* Can be used by plugins to record data, similar to sessions and users, with optional segments
* @param {params} params - {@link params} object
* @param {string} collection - name of the collections where to store data
* @param {string} id - id to prefix document ids, like app_id or segment id, etc
* @param {array} metrics - array of metrics to record, as ["u","t", "n"]
* @param {number=} value - value to increment all metrics for, default 1
* @param {object} segments - object with segments to record data, key segment name and value segment value
* @param {array} uniques - names of the metrics, which should be treated as unique, and stored in 0 docs and be estimated on output
* @param {number} lastTimestamp - timestamp in seconds to be used to determine if unique metrics it unique for specific period
* @example
* //recording attribution
* common.recordCustomMetric(params, "campaigndata", campaignId, ["clk", "aclk"], 1, {pl:"Android", brw:"Chrome"}, ["clk"], user["last_click"]);
*/
common.recordCustomMetric = function(params, collection, id, metrics, value, segments, uniques, lastTimestamp) {
    value = value || 1;
    var updateUsersZero = {},
        updateUsersMonth = {},
        tmpSet = {};

    if (metrics) {
        for (let i = 0; i < metrics.length; i++) {
            recordMetric(params, metrics[i], {
                segments: segments,
                value: value,
                unique: (uniques && uniques.indexOf(metrics[i]) !== -1) ? true : false,
                lastTimestamp: lastTimestamp
            },
            tmpSet, updateUsersZero, updateUsersMonth);
        }
    }

    var dbDateIds = common.getDateIds(params);

    if (Object.keys(updateUsersZero).length || Object.keys(tmpSet).length) {
        var update = {
            $set: {
                m: dbDateIds.zero,
                a: params.app_id + ""
            }
        };
        if (Object.keys(updateUsersZero).length) {
            update.$inc = updateUsersZero;
        }
        if (Object.keys(tmpSet).length) {
            update.$addToSet = {};
            for (let i in tmpSet) {
                update.$addToSet[i] = {$each: tmpSet[i]};
            }
        }
        common.db.collection(collection).update({'_id': id + "_" + dbDateIds.zero}, update, {'upsert': true}, function() {});
    }
    if (Object.keys(updateUsersMonth).length) {
        common.db.collection(collection).update({'_id': id + "_" + dbDateIds.month}, {
            $set: {
                m: dbDateIds.month,
                a: params.app_id + ""
            },
            '$inc': updateUsersMonth
        }, {'upsert': true}, function() {});
    }
};

/**
* Record data in Countly standard metric model
* Can be used by plugins to record data, similar to sessions and users, with optional segments
* @param {params} params - {@link params} object
* @param {object} props - object defining what to record
* @param {string} props.collection - name of the collections where to store data
* @param {string} props.id - id to prefix document ids, like app_id or segment id, etc
* @param {object} props.metrics - object defining metrics to record, using key as metric name and value object for segmentation, unique, etc
* @param {number=} props.metrics[].value - value to increment current metric for, default 1
* @param {object} props.metrics[].segments - object with segments to record data, key segment name and value segment value or array of segment values
* @param {boolean} props.metrics[].unique - if metric should be treated as unique, and stored in 0 docs and be estimated on output
* @param {number} props.metrics[].lastTimestamp - timestamp in seconds to be used to determine if unique metrics it unique for specific period
* @param {array} props.metrics[].hourlySegments - array of segments that should have hourly data too (by default hourly data not recorded for segments)
* @example
* //recording attribution
* common.recordCustomMetric(params, "campaigndata", campaignId, ["clk", "aclk"], 1, {pl:"Android", brw:"Chrome"}, ["clk"], user["last_click"]);
*/
common.recordMetric = function(params, props) {
    var updateUsersZero = {},
        updateUsersMonth = {},
        tmpSet = {};

    for (let i in props.metrics) {
        props.metrics[i].value = props.metrics[i].value || 1;
        recordMetric(params, i, props.metrics[i], tmpSet, updateUsersZero, updateUsersMonth);
    }

    var dbDateIds = common.getDateIds(params);

    if (Object.keys(updateUsersZero).length || Object.keys(tmpSet).length) {
        var update = {
            $set: {
                m: dbDateIds.zero,
                a: params.app_id + ""
            }
        };
        if (Object.keys(updateUsersZero).length) {
            update.$inc = updateUsersZero;
        }
        if (Object.keys(tmpSet).length) {
            update.$addToSet = {};
            for (let i in tmpSet) {
                update.$addToSet[i] = {$each: tmpSet[i]};
            }
        }
        common.db.collection(props.collection).update({'_id': props.id + "_" + dbDateIds.zero}, update, {'upsert': true}, function() {});
    }
    if (Object.keys(updateUsersMonth).length) {
        common.db.collection(props.collection).update({'_id': props.id + "_" + dbDateIds.month}, {
            $set: {
                m: dbDateIds.month,
                a: params.app_id + ""
            },
            '$inc': updateUsersMonth
        }, {'upsert': true}, function() {});
    }
};

/**
* Record specific metric
* @param {params} params - params object
* @param {string} metric - metric to record
* @param {object} props - properties of a metric defining how to record it
* @param {object} tmpSet - object with already set meta properties
* @param {object} updateUsersZero - object with already set update for zero docs
* @param {object} updateUsersMonth - object with already set update for months docs
**/
function recordMetric(params, metric, props, tmpSet, updateUsersZero, updateUsersMonth) {
    var zeroObjUpdate = [],
        monthObjUpdate = [];

    if (props.unique) {
        if (props.lastTimestamp) {
            var currDate = common.getDate(params.time.timestamp, params.appTimezone),
                lastDate = common.getDate(props.lastTimestamp, params.appTimezone),
                secInMin = (60 * (currDate.getMinutes())) + currDate.getSeconds(),
                secInHour = (60 * 60 * (currDate.getHours())) + secInMin,
                secInMonth = (60 * 60 * 24 * (currDate.getDate() - 1)) + secInHour,
                secInYear = (60 * 60 * 24 * (common.getDOY(params.time.timestamp, params.appTimezone) - 1)) + secInHour;

            if (props.lastTimestamp < (params.time.timestamp - secInMin)) {
                updateUsersMonth['d.' + params.time.day + '.' + params.time.hour + '.' + metric] = props.value;
            }

            if (props.lastTimestamp < (params.time.timestamp - secInHour)) {
                updateUsersMonth['d.' + params.time.day + '.' + metric] = props.value;
            }

            if (lastDate.getFullYear() + "" === params.time.yearly + "" &&
                    Math.ceil(common.moment(lastDate).tz(params.appTimezone).format("DDD") / 7) < params.time.weekly) {
                updateUsersZero["d.w" + params.time.weekly + '.' + metric] = props.value;
            }

            if (props.lastTimestamp < (params.time.timestamp - secInMonth)) {
                updateUsersZero['d.' + params.time.month + '.' + metric] = props.value;
            }

            if (props.lastTimestamp < (params.time.timestamp - secInYear)) {
                updateUsersZero['d.' + metric] = props.value;
            }
        }
        else {
            common.fillTimeObjectZero(params, updateUsersZero, metric, props.value);
            common.fillTimeObjectMonth(params, updateUsersMonth, metric, props.value);
        }
    }
    else {
        zeroObjUpdate.push(metric);
        monthObjUpdate.push(metric);
    }
    if (props.segments) {
        for (var j in props.segments) {
            if (Array.isArray(props.segments[j])) {
                for (var k = 0; k < props.segments[j].length; k++) {
                    recordSegmentMetric(params, metric, j, props.segments[j][k], props, tmpSet, updateUsersZero, updateUsersMonth, zeroObjUpdate, monthObjUpdate);
                }
            }
            else if (props.segments[j]) {
                recordSegmentMetric(params, metric, j, props.segments[j], props, tmpSet, updateUsersZero, updateUsersMonth, zeroObjUpdate, monthObjUpdate);
            }
        }
    }

    common.fillTimeObjectZero(params, updateUsersZero, zeroObjUpdate, props.value);
    common.fillTimeObjectMonth(params, updateUsersMonth, monthObjUpdate, props.value);
}

/**
* Record specific metric segment
* @param {params} params - params object
* @param {string} metric - metric to record
* @param {string} name - name of the segment to record
* @param {string} val - value of the segment to record
* @param {object} props - properties of a metric defining how to record it
* @param {object} tmpSet - object with already set meta properties
* @param {object} updateUsersZero - object with already set update for zero docs
* @param {object} updateUsersMonth - object with already set update for months docs
* @param {array} zeroObjUpdate - segments to fill for for zero docs
* @param {array} monthObjUpdate - segments to fill for months docs
**/
function recordSegmentMetric(params, metric, name, val, props, tmpSet, updateUsersZero, updateUsersMonth, zeroObjUpdate, monthObjUpdate) {
    var escapedMetricKey = name.replace(/^\$/, "").replace(/\./g, ":");
    var escapedMetricVal = (val + "").replace(/^\$/, "").replace(/\./g, ":");
    if (!tmpSet["meta." + escapedMetricKey]) {
        tmpSet["meta." + escapedMetricKey] = [];
    }
    tmpSet["meta." + escapedMetricKey].push(escapedMetricVal);
    var recordHourly = (props.hourlySegments && props.hourlySegments.indexOf(name) !== -1) ? true : false;
    if (props.unique) {
        if (props.lastTimestamp) {
            var currDate = common.getDate(params.time.timestamp, params.appTimezone),
                lastDate = common.getDate(props.lastTimestamp, params.appTimezone),
                secInMin = (60 * (currDate.getMinutes())) + currDate.getSeconds(),
                secInHour = (60 * 60 * (currDate.getHours())) + secInMin,
                secInMonth = (60 * 60 * 24 * (currDate.getDate() - 1)) + secInHour,
                secInYear = (60 * 60 * 24 * (common.getDOY(params.time.timestamp, params.appTimezone) - 1)) + secInHour;

            if (props.lastTimestamp < (params.time.timestamp - secInMin)) {
                updateUsersMonth['d.' + params.time.day + '.' + params.time.hour + '.' + escapedMetricVal + '.' + metric] = props.value;
            }

            if (props.lastTimestamp < (params.time.timestamp - secInHour)) {
                updateUsersMonth['d.' + params.time.day + '.' + escapedMetricVal + '.' + metric] = props.value;
            }

            if (lastDate.getFullYear() + "" === params.time.yearly + "" &&
                    Math.ceil(common.moment(lastDate).tz(params.appTimezone).format("DDD") / 7) < params.time.weekly) {
                updateUsersZero["d.w" + params.time.weekly + '.' + escapedMetricVal + '.' + metric] = props.value;
            }

            if (props.lastTimestamp < (params.time.timestamp - secInMonth)) {
                updateUsersZero['d.' + params.time.month + '.' + escapedMetricVal + '.' + metric] = props.value;
            }

            if (props.lastTimestamp < (params.time.timestamp - secInYear)) {
                updateUsersZero['d.' + escapedMetricVal + '.' + metric] = props.value;
            }
        }
        else {
            common.fillTimeObjectZero(params, updateUsersZero, escapedMetricVal + '.' + metric, props.value);
            common.fillTimeObjectMonth(params, updateUsersMonth, escapedMetricVal + '.' + metric, props.value, recordHourly);
        }
    }
    else {
        if (recordHourly) {
            common.fillTimeObjectZero(params, updateUsersZero, escapedMetricVal + '.' + metric, props.value);
            common.fillTimeObjectMonth(params, updateUsersMonth, escapedMetricVal + '.' + metric, props.value, recordHourly);
        }
        else {
            zeroObjUpdate.push(escapedMetricVal + "." + metric);
            monthObjUpdate.push(escapedMetricVal + "." + metric);
        }
    }
}

/**
* Get object of date ids that should be used in fetching standard metric model documents
* @param {params} params - {@link params} object
* @returns {object} with date ids, as {zero:"2017:0", month:"2017:2"}
*/
common.getDateIds = function(params) {
    if (!params || !params.time) {
        return {
            zero: "0000:0",
            month: "0000:1"
        };
    }

    return {
        zero: params.time.yearly + ":0",
        month: params.time.yearly + ":" + params.time.month
    };
};

/**
* Get diference between 2 momentjs instances in specific measurement
* @param {moment} moment1 - momentjs with start date
* @param {moment} moment2 - momentjs with end date
* @param {string} measure - units of difference, can be minutes, hours, days, weeks
* @returns {number} difference in provided units
*/
common.getDiff = function(moment1, moment2, measure) {
    var divider = 1;
    switch (measure) {
    case "minutes":
        divider = 60;
        break;
    case "hours":
        divider = 60 * 60;
        break;
    case "days":
        divider = 60 * 60 * 24;
        break;
    case "weeks":
        divider = 60 * 60 * 24 * 7;
        break;
    }
    return Math.floor((moment1.unix() - moment2.unix()) / divider);
};

/**
* Compares two version strings with : as delimiter (which we used to escape dots in app versions)
* @param {string} v1 - first version
* @param {string} v2 - second version
* @param {object} options - providing additional options
* @param {string} options.delimiter - delimiter between version, subversion, etc, defaults :
* @param {string} options.zeroExtend - changes the result if one version string has less parts than the other. In this case the shorter string will be padded with "zero" parts instead of being considered smaller.
* @param {string} options.lexicographical - compares each part of the version strings lexicographically instead of naturally; this allows suffixes such as "b" or "dev" but will cause "1.10" to be considered smaller than "1.2".
* @returns {number} 0 if they are both the same, 1 if first one is higher and -1 is second one is higher
*/
common.versionCompare = function(v1, v2, options) {
    var lexicographical = options && options.lexicographical,
        zeroExtend = options && options.zeroExtend,
        delimiter = options && options.delimiter || ":",
        v1parts = v1.split(delimiter),
        v2parts = v2.split(delimiter);

    /**
    * Check if provided version is correct
    * @param {string} x - version to test
    * @returns {boolean} if version is correct
    **/
    function isValidPart(x) {
        return (lexicographical ? /^\d+[A-Za-z]*$/ : /^\d+$/).test(x);
    }

    if (!v1parts.every(isValidPart) || !v2parts.every(isValidPart)) {
        return NaN;
    }

    if (zeroExtend) {
        while (v1parts.length < v2parts.length) {
            v1parts.push("0");
        }
        while (v2parts.length < v1parts.length) {
            v2parts.push("0");
        }
    }

    if (!lexicographical) {
        v1parts = v1parts.map(Number);
        v2parts = v2parts.map(Number);
    }

    for (var i = 0; i < v1parts.length; ++i) {
        if (v2parts.length === i) {
            return 1;
        }

        if (v1parts[i] === v2parts[i]) {
            continue;
        }
        else if (v1parts[i] > v2parts[i]) {
            return 1;
        }
        else {
            return -1;
        }
    }

    if (v1parts.length !== v2parts.length) {
        return -1;
    }

    return 0;
};

/**
* Adjust timestamp with app's timezone for timestamp queries that should equal bucket results
* @param {number} ts - miliseconds timestamp
* @param {string} tz - timezone
* @returns {number} adjusted timestamp for timezone
*/
common.adjustTimestampByTimezone = function(ts, tz) {
    var d = new Date();
    d.setTimezone(tz);
    return ts - (d.getTimezoneOffset() * 60);
};


/**
* Getter/setter for dot notatons:
* @param {object} obj - object to use
* @param {string} is - path of properties to get
* @param {varies} value - value to set
* @returns {varies} value at provided path
* @example
* common.dot({a: {b: {c: 'string'}}}, 'a.b.c') === 'string'
* common.dot({a: {b: {c: 'string'}}}, ['a', 'b', 'c']) === 'string'
* common.dot({a: {b: {c: 'string'}}}, 'a.b.c', 5) === 5
* common.dot({a: {b: {c: 'string'}}}, 'a.b.c') === 5
*/
common.dot = function(obj, is, value) {
    if (typeof is === 'string') {
        return common.dot(obj, is.split('.'), value);
    }
    else if (is.length === 1 && value !== undefined) {
        obj[is[0]] = value;
        return value;
    }
    else if (is.length === 0) {
        return obj;
    }
    else if (!obj) {
        return obj;
    }
    else {
        return common.dot(obj[is[0]], is.slice(1), value);
    }
};

/**
* Not deep object and primitive type comparison function
* 
* @param  {Any} a object to compare
* @param  {Any} b object to compare
* @param  {Boolean} checkFromA true if check should be performed agains keys of a, resulting in true even if b has more keys
* @return {Boolean} true if objects are equal, false if different types or not equal
*/
common.equal = function(a, b, checkFromA) {
    if (a === b) {
        return true;
    }
    else if (typeof a !== typeof b) {
        return false;
    }
    else if ((a === null && b !== null) || (a !== null && b === null)) {
        return false;
    }
    else if ((a === undefined && b !== undefined) || (a !== undefined && b === undefined)) {
        return false;
    }
    else if (typeof a === 'object') {
        if (!checkFromA && Object.keys(a).length !== Object.keys(b).length) {
            return false;
        }
        for (let k in a) {
            if (a[k] !== b[k]) {
                return false;
            }
        }
        return true;
    }
    else {
        return false;
    }
};

/**
* Returns plain object with key set to value
* @param {varies} arguments - every odd value will be used as key and every event value as value for odd key
* @returns {object} new object with set key/value properties
*/
common.o = function() {
    var o = {};
    for (var i = 0; i < arguments.length; i += 2) {
        o[arguments[i]] = arguments[i + 1];
    }
    return o;
};

/**
* Return index of array with objects where property = value
* @param {array} array - array where to search value
* @param {string} property - property where to look for value
* @param {varies} value - value you are searching for
* @returns {number} index of the array
*/
common.indexOf = function(array, property, value) {
    for (var i = 0; i < array.length; i += 1) {
        if (array[i][property] === value) {
            return i;
        }
    }
    return -1;
};

/**
* Optionally load module if it exists
* @param {string} module - module name
* @param {object} options - additional opeitons
* @param {boolean} options.rethrow - throw exception if there is some other error
* @param {varies} value - value you are searching for
* @returns {number} index of the array
*/
common.optional = function(module, options) {
    try {
        if (module[0] in {'.': 1}) {
            module = process.cwd() + module.substr(1);
        }
        return require(module);
    }
    catch (err) {
        if (err.code !== 'MODULE_NOT_FOUND' && options && options.rethrow) {
            throw err;
        }
    }
    return null;
};

/**
* Create promise for function which result should be checked periodically
* @param {function} func - function to run when verifying result, should return true if success
* @param {number} count - how many times to run the func before giving up, if result is always negative
* @param {number} interval - how often to retest function on negative result in miliseconds
* @returns {Promise} promise for checking task
*/
common.checkPromise = function(func, count, interval) {
    return new Promise((resolve, reject) => {
        /**
        * Check promise
        **/
        function check() {
            if (func()) {
                resolve();
            }
            else if (count <= 0) {
                reject('Timed out');
            }
            else {
                count--;
                setTimeout(check, interval);
            }
        }
        check();
    });
};

/**
* Single method to update app_users document for specific user for SDK requests
* @param {params} params - params object
* @param {object} update - update query for mongodb, should contain operators on highest level, as $set or $unset
* @param {boolean} no_meta - if true, won't update some auto meta data, like first api call, last api call, etc.
* @param {function} callback - function to run when update is done or failes, passing error and result as arguments
*/
common.updateAppUser = function(params, update, no_meta, callback) {
    //backwards compatability
    if (typeof no_meta === "function") {
        callback = no_meta;
        no_meta = false;
    }
    if (Object.keys(update).length) {
        for (var i in update) {
            if (i.indexOf("$") !== 0) {
                let err = "Unkown modifier " + i + " in " + update + " for " + params.href;
                console.log(err);
                if (callback) {
                    callback(err);
                }
                return;
            }
        }

        var user = params.app_user || {};

        if (!no_meta && !params.qstring.no_meta) {
            if (typeof user.fac === "undefined") {
                if (!update.$setOnInsert) {
                    update.$setOnInsert = {};
                }
                if (!update.$setOnInsert.fac) {
                    update.$setOnInsert.fac = params.time.mstimestamp;
                }
            }

            if (typeof user.lac === "undefined" || user.lac < params.time.mstimestamp) {
                if (!update.$set) {
                    update.$set = {};
                }
                if (!update.$set.lac) {
                    update.$set.lac = params.time.mstimestamp;
                }
            }
        }

        if (params.qstring.device_id && typeof user.did === "undefined") {
            if (!update.$set) {
                update.$set = {};
            }
            if (!update.$set.did) {
                update.$set.did = params.qstring.device_id;
            }
        }

        if (plugins.getConfig("api", params.app && params.app.plugins, true).prevent_duplicate_requests && user.last_req !== params.request_hash) {
            if (!update.$set) {
                update.$set = {};
            }
            update.$set.last_req = params.request_hash;
        }

        common.db.collection('app_users' + params.app_id).findAndModify({'_id': params.app_user_id}, {}, update, {
            new: true,
            upsert: true
        }, function(err, res) {
            if (!err && res && res.value) {
                params.app_user = res.value;
            }
            if (callback) {
                callback(err, res);
            }
        });
    }
    else if (callback) {
        callback();
    }
};

/**
* Update carrier from metrics to convert mnc/mcc code to carrier name
* @param {object} metrics - metrics object from SDK request
*/
common.processCarrier = function(metrics) {
    if (metrics && metrics._carrier) {
        var carrier = metrics._carrier + "";

        //random hash without spaces
        if (carrier.length === 16 && carrier.indexOf(" ") === -1) {
            delete metrics._carrier;
            return;
        }

        //random code
        if ((carrier.length === 5 || carrier.length === 6) && /^[0-9]+$/.test(carrier)) {
            //check if mcc and mnc match some operator
            var arr = mcc_mnc_list.filter({ mccmnc: carrier });
            if (arr && arr.length && (arr[0].brand || arr[0].operator)) {
                carrier = arr[0].brand || arr[0].operator;
            }
            else {
                delete metrics._carrier;
                return;
            }
        }

        carrier = carrier.replace(/\w\S*/g, function(txt) {
            return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
        });
        metrics._carrier = carrier;
    }
};

/**
* Parse Sequence
* @param {number} num - sequence number for id
* @returns {string} converted to base 62 number
*/
common.parseSequence = (num) => {
    const valSeq = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9",
        "a", "b", "c", "d", "e", "f", "g", "h", "i", "j", "k", "l", "m",
        "n", "o", "p", "q", "r", "s", "t", "u", "v", "w", "x", "y", "z",
        "A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L", "M",
        "N", "O", "P", "Q", "R", "S", "T", "U", "V", "W", "X", "Y", "Z"];

    const digits = [];
    const base = valSeq.length;
    let result = "";

    while (num > base - 1) {
        digits.push(num % base);
        num = Math.floor(num / base);
    }

    digits.push(num);

    for (let i = digits.length - 1; i >= 0; --i) {
        result = result + valSeq[digits[i]];
    }

    return result;
};

/**
* Promise that tries to catch errors
* @param  {function} f function which is usually passed to Promise constructor
* @return {Promise}   Promise with constructor catching errors by rejecting the promise
*/
common.p = f => {
    return new Promise((res, rej) => {
        try {
            f(res, rej);
        }
        catch (e) {
            rej(e);
        }
    });
};

/**
* Revive json encoded data, as for example, regular expressions
* @param {string} key - key of json object
* @param {vary} value - value of json object
* @returns {vary} modified value, if it had revivable data
*/
common.reviver = (key, value) => {
    if (value.toString().indexOf("__REGEXP ") === 0) {
        const m = value.split("__REGEXP ")[1].match(/\/(.*)\/(.*)?/);
        return new RegExp(m[1], m[2] || "");
    }
    else {
        return value;
    }
};

/**
    * Generate random password
    * @param {number} length - length of the password
    * @param {boolean} no_special - do not include special characters
    * @returns {string} password
    * @example
    * //outputs 4UBHvRBG1v
    * common.generatePassword(10, true);
    */
common.generatePassword = function(length, no_special) {
    var text = [];
    var chars = "abcdefghijklmnopqrstuvwxyz";
    var upchars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    var numbers = "0123456789";
    var specials = '!@#$%^&*()_+{}:"<>?|[];\',./`~';
    var all = chars + upchars + numbers;
    if (!no_special) {
        all += specials;
    }

    //1 char
    text.push(upchars.charAt(Math.floor(Math.random() * upchars.length)));
    //1 number
    text.push(numbers.charAt(Math.floor(Math.random() * numbers.length)));
    //1 special char
    if (!no_special) {
        text.push(specials.charAt(Math.floor(Math.random() * specials.length)));
        length--;
    }

    var j, x, i;
    //5 any chars
    for (i = 0; i < Math.max(length - 2, 5); i++) {
        text.push(all.charAt(Math.floor(Math.random() * all.length)));
    }

    //randomize order
    for (i = text.length; i; i--) {
        j = Math.floor(Math.random() * i);
        x = text[i - 1];
        text[i - 1] = text[j];
        text[j] = x;
    }
    return text.join("");
};

/**
 * Check db host match for both of API and Frontend config
 * @param {object} apiConfig - mongodb object from API config
 * @param {object} frontendConfig - mongodb object from Frontend config
 * @returns {boolean} isMatched - is config correct?  
 */
common.checkDatabaseConfigMatch = (apiConfig, frontendConfig) => {
    if (typeof apiConfig === typeof frontendConfig) {
        if (typeof apiConfig === "string") {
            // mongodb://mongodb0.example.com:27017/admin
            if (!apiConfig.includes("@") && !frontendConfig.includes("@")) {
                // mongodb0.example.com:27017
                if (apiConfig.includes('/') && frontendConfig.includes('/')) {
                    try {
                        let apiMongoHost = apiConfig.split("/")[2];
                        let frontendMongoHost = frontendConfig.split("/")[2];
                        let apiMongoDb,
                            frontendMongoDb;
                        if (apiConfig.includes('?')) {
                            apiMongoDb = apiConfig.split("/")[3].split('?')[0];
                        }
                        else {
                            apiMongoDb = apiConfig.split("/")[3];
                        }
                        if (frontendConfig.includes('?')) {
                            frontendMongoDb = frontendConfig.split("/")[3].split('?')[0];
                        }
                        else {
                            frontendMongoDb = frontendConfig.split("/")[3];
                        }
                        if (apiMongoHost === frontendMongoHost && apiMongoDb === frontendMongoDb) {
                            return true;
                        }
                        else {
                            return false;
                        }
                    }
                    catch (splitErrorBasicString) {
                        return false;
                    }
                }
                else {
                    return false;
                }
            }
            //mongodb://myDBReader:D1fficultP%40ssw0rd@mongodb0.example.com:27017/admin
            else if (apiConfig.includes("@") && frontendConfig.includes("@")) {
                if (apiConfig.includes('/') && frontendConfig.includes('/')) {
                    try {
                        let apiMongoHost = apiConfig.split("@")[1].split("/")[0];
                        let apiMongoDb,
                            frontendMongoDb;
                        if (apiConfig.includes('?')) {
                            apiMongoDb = apiConfig.split("@")[1].split("/")[1].split('?')[0];
                        }
                        else {
                            apiMongoDb = apiConfig.split("@")[1].split("/")[1];
                        }
                        let frontendMongoHost = frontendConfig.split("@")[1].split("/")[0];
                        if (frontendConfig.includes('?')) {
                            frontendMongoDb = frontendConfig.split("@")[1].split("/")[1].split('?')[0];
                        }
                        else {
                            frontendMongoDb = frontendConfig.split("@")[1].split("/")[1];
                        }
                        if (apiMongoHost === frontendMongoHost && apiMongoDb === frontendMongoDb) {
                            return true;
                        }
                        else {
                            return false;
                        }
                    }
                    catch (splitErrorComplexString) {
                        return false;
                    }
                }
                else {
                    return false;
                }
            }
            else {
                return false;
            }
        }
        else if (typeof apiConfig === "object") {
            /**
             * {
             *  mongodb: {
             *      host: 'localhost',
             *      
             *  }
             * }
             */
            if (Object.prototype.hasOwnProperty.call(apiConfig, 'host') && Object.prototype.hasOwnProperty.call(frontendConfig, 'host')) {
                if (apiConfig.host === frontendConfig.host && apiConfig.db === frontendConfig.db) {
                    return true;
                }
                else {
                    return false;
                }
            }
            /**
             * {
             *  mongodb: {
             *      replSetServers: [
             *          '192.168.3.1:27017',
             *          '192.168.3.2:27017
             *      ]
             *  }
             * }
             */ 
            else if (Object.prototype.hasOwnProperty.call(apiConfig, 'replSetServers') && Object.prototype.hasOwnProperty.call(frontendConfig, 'replSetServers')) {
                if (apiConfig.replSetServers.length === frontendConfig.replSetServers.length && apiConfig.db === frontendConfig.db) {
                    let isCorrect = true;
                    for (let i = 0; i < apiConfig.replSetServers.length; i++) {
                        if (apiConfig.replSetServers[i] !== frontendConfig.replSetServers[i]) {
                            isCorrect = false;
                        }
                    }
                    return isCorrect;
                }
                else {
                    return false;
                }
            }
            else {
                return false;
            }
        }
        else {
            return false;
        }
    }
    else {
        return false;
    }
};

module.exports = common;