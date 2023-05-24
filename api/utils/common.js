/**
* Module for some common utility functions and references
* @module api/utils/common
*/

/** @lends module:api/utils/common */
var common = {},
    moment = require('moment-timezone'),
    crypto = require('crypto'),
    logger = require('./log.js'),
    mcc_mnc_list = require('mcc-mnc-list'),
    plugins = require('../../plugins/pluginManager.js'),
    countlyConfig = require('./../config', 'dont-enclose'),
    argon2 = require('argon2'),
    mongodb = require('mongodb'),
    getRandomValues = require('get-random-values'),
    _ = require('lodash');

var matchHtmlRegExp = /"|'|&(?!amp;|quot;|#39;|lt;|gt;|#46;|#36;)|<|>/;
var matchLessHtmlRegExp = /[<>]/;

/**
 * Because why requiring both all the time
 */
common.plugins = plugins;

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
* Decode escaped html 
* @param  {string} string - The string to decode
* @returns {string} escaped string
**/
common.decode_html = function(string) {
    string = string.replace(/&#39;/g, "'");
    string = string.replace(/&quot;/g, '"');
    string = string.replace(/&lt;/g, '<');
    string = string.replace(/&gt;/g, '>');
    string = string.replace(/&amp;/g, '&');
    return string;
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
    'device_type': 'dt',
    'manufacturer': 'mnf',
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

common.dbUniqueMap = {
    "*": [common.dbMap.unique],
    users: [common.dbMap.unique, common.dbMap.durations, common.dbMap.frequency, common.dbMap.loyalty]
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
    "webos": "webos",
    "brew": "brew",
    "unknown": "unk",
    "undefined": "unk",
    "tvos": "atv",
    "apple tv": "atv",
    "watchos": "wos",
    "unity editor": "uty",
    "qnx": "qnx",
    "os/2": "os2",
    "amazon fire tv": "aft",
    "amazon": "amz",
    "web": "web",
    "windows": "mw",
    "open bsd": "ob",
    "searchbot": "sb",
    "sun os": "so",
    "solaris": "so",
    "beos": "bo",
    "mac osx": "o",
    "macos": "o",
    "mac": "o",
    "osx": "o",
    "linux": "l",
    "unix": "u",
    "ios": "i",
    "android": "a",
    "blackberry": "b",
    "windows phone": "w",
    "wp": "w",
    "roku": "r",
    "symbian": "s",
    "chrome": "c",
    "debian": "d",
    "nokia": "n",
    "firefox": "f",
    "tizen": "t",
    "arch": "l"
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
* @param {boolean} preventParsingToNumber - do not change value to number (e.g. "1", ["1"]);
* @returns {varies} converted value
* @example
* common.convertToType(1) //outputs 1
* common.convertToType("2") //outputs 2
* common.convertToType("test") //outputs "test"
* common.convertToType("12345678901234567890") //outputs "12345678901234567890"
*/
common.convertToType = function(value, preventParsingToNumber) {
    //handle array values
    if (Array.isArray(value)) {
        for (var i = 0; i < value.length; i++) {
            value[i] = common.convertToType(value[i], true);
        }
        return value;
    }
    else if (value && typeof value === "object") {
        for (var key in value) {
            value[key] = common.convertToType(value[key]);
        }
        return value;
    }
    //if value can be a number
    else if (common.isNumber(value)) {
        //check if it is string but is less than 16 length
        if (preventParsingToNumber) {
            return value;
        }
        else if (value.length && value.length <= 16) {
            //convert to number
            return parseFloat(value);
        }
        //check if it is number, but longer than 16 digits (max limit)
        else if ((Math.round(value) + "").length > 16) {
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
        tmpMoment,
        currDateWithoutTimestamp = moment();

    // Check if the timestamp parameter exists in the request and is a 10 or 13 digit integer, handling also float timestamps with ms after dot
    if (reqTimestamp && (Math.round(parseFloat(reqTimestamp, 10)) + "").length === 10 && common.isNumber(reqTimestamp)) {
        // If the received timestamp is greater than current time use the current time as timestamp
        currTimestamp = (parseInt(reqTimestamp, 10) > currDateWithoutTimestamp.unix()) ? currDateWithoutTimestamp.unix() : parseInt(reqTimestamp, 10);
        curMsTimestamp = (parseInt(reqTimestamp, 10) > currDateWithoutTimestamp.unix()) ? currDateWithoutTimestamp.valueOf() : parseFloat(reqTimestamp, 10) * 1000;
        tmpMoment = moment(currTimestamp * 1000);
    }
    else if (reqTimestamp && (Math.round(parseFloat(reqTimestamp, 10)) + "").length === 13 && common.isNumber(reqTimestamp)) {
        var tmpTimestamp = Math.floor(parseInt(reqTimestamp, 10) / 1000);
        currTimestamp = (tmpTimestamp > currDateWithoutTimestamp.unix()) ? currDateWithoutTimestamp.unix() : tmpTimestamp;
        curMsTimestamp = (tmpTimestamp > currDateWithoutTimestamp.unix()) ? currDateWithoutTimestamp.valueOf() : parseInt(reqTimestamp, 10);
        tmpMoment = moment(currTimestamp * 1000);
    }
    else {
        tmpMoment = moment();
        currTimestamp = tmpMoment.unix(); // UTC
        curMsTimestamp = tmpMoment.valueOf();
    }

    if (appTimezone) {
        currDateWithoutTimestamp.tz(appTimezone);
        tmpMoment.tz(appTimezone);
    }

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
        nowUTC: tmpMoment.clone().utc(),
        nowWithoutTimestamp: currDateWithoutTimestamp,
        timestamp: currTimestamp,
        mstimestamp: curMsTimestamp,
        yearly: tmpMoment.format("YYYY"),
        monthly: tmpMoment.format("YYYY.M"),
        daily: tmpMoment.format("YYYY.M.D"),
        hourly: tmpMoment.format("YYYY.M.D.H"),
        weekly: Math.ceil(tmpMoment.format("DDD") / 7),
        weeklyISO: tmpMoment.isoWeek(),
        month: tmpMoment.format("M"),
        day: tmpMoment.format("D"),
        hour: tmpMoment.format("H")
    };
};

/**
* Creates a Date object from provided seconds timestamp in provided timezone
* @param {number} timestamp - unix timestamp in seconds
* @param {string} timezone - name of the timezone
* @returns {moment} moment object for provided time
*/
common.getDate = function(timestamp, timezone) {
    var tmpDate = (timestamp) ? moment.unix(timestamp) : moment();

    if (timezone) {
        tmpDate.tz(timezone);
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
    var endDate = (timestamp) ? moment.unix(timestamp * 1000) : moment();

    if (timezone) {
        endDate.tz(timezone);
    }

    return endDate.dayOfYear();
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
        let argState = true,
            parsed;
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
                if (argProperties[arg].type === 'Number') {
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
                else if (argProperties[arg].type === 'String') {
                    if (argState && argProperties[arg].trim && args[arg]) {
                        args[arg] = args[arg].trim();
                    }
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
                else if (argProperties[arg].type === 'IntegerString') {
                    if (args[arg] === null && !argProperties[arg].required) {
                        // do nothing
                    }
                    else if (typeof args[arg] === 'string' && !isNaN(parseInt(args[arg]))) {
                        parsed = parseInt(args[arg]);
                    }
                    else if (typeof args[arg] === 'number') {
                        parsed = args[arg];
                    }
                    else {
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
                    else {
                        if (argState && argProperties[arg].trim && args[arg]) {
                            args[arg] = args[arg].trim();
                        }
                        let { URL } = require('url');
                        try {
                            new URL(args[arg]);
                        }
                        catch (ignored) {
                            if (returnErrors) {
                                returnObj.errors.push('Invalid url string ' + arg);
                                returnObj.result = false;
                                argState = false;
                            }
                            else {
                                return false;
                            }
                        }
                    }
                }
                else if (argProperties[arg].type === 'URLString') {
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
                    else {
                        let { URL } = require('url');
                        try {
                            parsed = new URL(args[arg]);
                        }
                        catch (ignored) {
                            if (returnErrors) {
                                returnObj.errors.push('Invalid URL string ' + arg);
                                returnObj.result = false;
                                argState = false;
                            }
                            else {
                                return false;
                            }
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
                        else {
                            return false;
                        }
                    }
                }
                else if (argProperties[arg].type === 'BooleanString') {
                    if (args[arg] === null && !argProperties[arg].required) {
                        // do nothing
                    }
                    else if (typeof args[arg] === 'string' && (args[arg] === 'true' || args[arg] === 'false')) {
                        parsed = args[arg] === 'true';
                    }
                    else if (typeof args[arg] === 'boolean') {
                        parsed = args[arg];
                    }
                    else {
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
                else if (argProperties[arg].type === 'Date') {
                    if (args[arg] === null && !argProperties[arg].required) {
                        // do nothing
                    }
                    else if (typeof args[arg] === 'string' && !isNaN(new Date(args[arg]))) {
                        parsed = new Date(args[arg]);
                    }
                    else if (typeof args[arg] === 'number' && args[arg] > 1000000000000 && args[arg] < 2000000000000) { // it's bad and I know it!
                        parsed = new Date(args[arg]);
                    }
                    else if (typeof args[arg] === 'number' && args[arg] > 1000000000 && args[arg] < 2000000000) { // it's bad and I know it!
                        parsed = new Date(args[arg] * 1000);
                    }
                    else if (args[arg] instanceof Date && !isNaN(new Date(args[arg]))) {
                        parsed = args[arg];
                    }
                    else {
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
                    else {
                        parsed = args[arg];
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
                    else {
                        parsed = args[arg];
                    }
                }
                else if (argProperties[arg].type === 'ObjectID') {
                    if (!argProperties[arg].required && args[arg] === null) {
                        // do nothing
                    }
                    else if (typeof args[arg] === 'string') {
                        if (mongodb.ObjectId.isValid(args[arg])) {
                            parsed = mongodb.ObjectId(args[arg]);
                        }
                        else {
                            if (returnErrors) {
                                returnObj.errors.push('Incorrect ObjectID for ' + arg);
                                returnObj.result = false;
                                argState = false;
                            }
                            else {
                                return false;
                            }
                        }
                    }
                    else if (args[arg] instanceof mongodb.ObjectId) {
                        parsed = args[arg];
                    }
                    else {
                        if (returnErrors) {
                            returnObj.errors.push('Neither ObjectID string or ObjectID instance for ' + arg);
                            returnObj.result = false;
                            argState = false;
                        }
                        else {
                            return false;
                        }
                    }
                }
                else if (argProperties[arg].type === 'RegExp') {
                    if (!argProperties[arg].required && args[arg] === null) {
                        // do nothing
                    }
                    else if (typeof args[arg] === 'string') {
                        try {
                            parsed = new RegExp(_.escapeRegExp(args[arg]), argProperties[arg].mods || undefined);
                        }
                        catch (ex) {
                            if (returnErrors) {
                                returnObj.errors.push('Incorrect regex: ' + args[arg]);
                                returnObj.result = false;
                                argState = false;
                            }
                            else {
                                return false;
                            }
                        }
                    }
                    else if (args[arg] instanceof RegExp) {
                        parsed = args[arg];
                    }
                    else {
                        if (returnErrors) {
                            returnObj.errors.push('Must be a valid regexp string or RegExp instance');
                            returnObj.result = false;
                            argState = false;
                        }
                        else {
                            return false;
                        }
                    }
                }
                else if (argProperties[arg].type === 'JSON') {
                    if (typeof args[arg] === 'object') {
                        parsed = JSON.stringify(args[arg]);
                    }
                    else if (typeof args[arg] === 'string') {
                        try {
                            parsed = JSON.stringify(JSON.parse(args[arg])); // to remove all whitespaces
                        }
                        catch (e) {
                            if (returnErrors) {
                                returnObj.errors.push("Invalid JSON for " + arg);
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
                            returnObj.errors.push("Invalid JSON for " + arg);
                            returnObj.result = false;
                            argState = false;
                        }
                        else {
                            return false;
                        }
                    }
                }
                else if (typeof argProperties[arg].type === 'object' && !argProperties[arg].array) {
                    if (typeof args[arg] !== 'object' && !(!argProperties[arg].required && args[arg] === null)) {
                        if (returnErrors) {
                            returnObj.errors.push("Invalid type for " + arg);
                            returnObj.result = false;
                            argState = false;
                        }
                        else {
                            return false;
                        }
                    }

                    let schema = argProperties[arg].discriminator ? argProperties[arg].discriminator(args[arg]) : argProperties[arg].type;

                    let subret = common.validateArgs(args[arg], schema, returnErrors);
                    if (returnErrors && !subret.result) {
                        returnObj.errors.push(...subret.errors.map(e => `${arg}: ${e}`));
                        returnObj.result = false;
                        argState = false;
                    }
                    else if (!returnErrors && !subret) {
                        return false;
                    }
                    else {
                        parsed = args[arg];
                        // parsed = subret.obj;
                    }
                }
                else if ((typeof argProperties[arg].type === 'object' && argProperties[arg].array) || argProperties[arg].type.indexOf('[]') === argProperties[arg].type.length - 2) {
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
                    else if (args[arg].length) {
                        let type,
                            discriminator = argProperties[arg].discriminator,
                            scheme = {},
                            ret;

                        if (typeof argProperties[arg].type === 'object' && argProperties[arg].array) {
                            type = argProperties[arg].type;
                        }
                        else {
                            type = argProperties[arg].type.substr(0, argProperties[arg].type.length - 2);
                        }

                        args[arg].forEach((v, i) => {
                            scheme[i] = { type: discriminator ? discriminator(v) : type, nonempty: argProperties[arg].nonempty, required: true };
                        });

                        ret = common.validateArgs(args[arg], scheme, true);
                        if (!ret.result) {
                            if (returnErrors) {
                                returnObj.errors.push(...ret.errors.map(e => `${arg}: ${e}`));
                                returnObj.result = false;
                                argState = false;
                            }
                            else {
                                return false;
                            }
                        }
                        else {
                            parsed = Object.values(ret.obj);
                        }
                    }
                    else {
                        parsed = args[arg];
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

            if (argProperties[arg].max) {
                if (args[arg] > argProperties[arg].max) {
                    if (returnErrors) {
                        returnObj.errors.push(arg + " is greater than max value");
                        returnObj.result = false;
                        argState = false;
                    }
                    else {
                        return false;
                    }
                }
            }

            if (argProperties[arg].min) {
                if (args[arg] < argProperties[arg].min) {
                    if (returnErrors) {
                        returnObj.errors.push(arg + " is lower than min value");
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
                        returnObj.errors.push(arg + " should have number");
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
                        returnObj.errors.push(arg + " should have char");
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
                        returnObj.errors.push(arg + " should have upchar");
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
                        returnObj.errors.push(arg + " should have special character");
                        returnObj.result = false;
                        argState = false;
                    }
                    else {
                        return false;
                    }
                }
            }

            if (argProperties[arg].in) {
                let inn = typeof argProperties[arg].in === 'function' ? argProperties[arg].in() : argProperties[arg].in;

                if ((Array.isArray(args[arg]) && args[arg].filter(x => inn.indexOf(x) === -1).length) ||
                    (!Array.isArray(args[arg]) && inn.indexOf(args[arg]) === -1)) {
                    if (returnErrors) {
                        returnObj.errors.push("Value of " + arg + " is invalid");
                        returnObj.result = false;
                        argState = false;
                    }
                    else {
                        return false;
                    }
                }
            }

            if (argProperties[arg].nonempty) {
                if (parsed !== null && parsed !== undefined) {
                    let value = parsed;
                    if (argProperties[arg].type === 'JSON') {
                        value = JSON.parse(value);
                    }
                    let any = false;
                    // eslint-disable-next-line no-unused-vars
                    for (let ignored in value) {
                        any = true;
                        break;
                    }
                    if (!any) {
                        if (returnErrors) {
                            returnObj.errors.push(`Value of ${arg} must not be empty`);
                            returnObj.result = false;
                            argState = false;
                        }
                        else {
                            return false;
                        }
                    }
                }
            }

            if (argProperties[arg].custom) {
                let err = argProperties[arg].custom(args[arg]);
                if (err) {
                    if (returnErrors) {
                        returnObj.errors.push(err);
                        returnObj.result = false;
                        argState = false;
                    }
                    else {
                        return false;
                    }
                }
            }

            if (argProperties[arg].regex) {
                try {
                    var re = new RegExp(argProperties[arg].regex);
                    if (!re.test(args[arg])) {
                        if (returnErrors) {
                            returnObj.errors.push(arg + " is not correct format");
                            returnObj.result = false;
                            argState = false;
                        }
                        else {
                            return false;
                        }
                    }
                }
                catch (ex) {
                    if (returnErrors) {
                        returnObj.errors.push('Incorrect regex: ' + args[arg]);
                        returnObj.result = false;
                        argState = false;
                    }
                    else {
                        return false;
                    }
                }
            }

            if (argState && returnErrors && !argProperties[arg]['exclude-from-ret-obj']) {
                returnObj.obj[arg] = parsed === undefined ? args[arg] : parsed;
            }
            else if (!returnErrors && !argProperties[arg]['exclude-from-ret-obj']) {
                returnObj[arg] = parsed === undefined ? args[arg] : parsed;
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
* @param {string|object} message - Message to output, will be encapsulated in JSON object under result property
* @param {object} heads - headers to add to the output
* @param {boolean} noResult - skip wrapping message object into stupid {result: }
*/
common.returnMessage = function(params, returnCode, message, heads, noResult = false) {
    params.response = {
        code: returnCode,
        body: JSON.stringify(noResult && typeof message === 'object' ? message : {result: message}, escape_html_entities)
    };

    if (params && params.APICallback && typeof params.APICallback === 'function') {
        if (!params.blockResponses && (!params.res || !params.res.finished)) {
            if (!params.res) {
                params.res = {};
            }
            params.res.finished = true;
            params.APICallback(returnCode !== 200, JSON.stringify(noResult && typeof message === 'object' ? message : {result: message}), heads, returnCode, params);
        }
        return;
    }
    //set provided in configuration headers
    var headers = {
        'Content-Type': 'application/json; charset=utf-8'
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
                params.res.write(JSON.stringify(noResult && typeof message === 'object' ? message : {result: message}, escape_html_entities));
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
        'Content-Type': 'application/json; charset=utf-8'
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
    var ipAddress = "";
    if (req) {
        if (req.headers) {
            ipAddress = req.headers['x-forwarded-for'] || req.headers['x-real-ip'] || "";
        }
        else if (req.connection && req.connection.remoteAddress) {
            ipAddress = req.connection.remoteAddress;
        }
        else if (req.socket && req.socket.remoteAddress) {
            ipAddress = req.socket.remoteAddress;
        }
        else if (req.connection && req.connection.socket && req.connection.socket.remoteAddress) {
            ipAddress = req.connection.socket.remoteAddress;
        }
    }
    /* Since x-forwarded-for: client, proxy1, proxy2, proxy3 */
    var ips = ipAddress.split(',');

    if (req?.headers?.['x-real-ip']) {
        ips.push(req.headers['x-real-ip']);
    }

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
* @param {boolean=} isUnique - if property is unique
* @returns {void} void
* @example
* var obj = {};
* common.fillTimeObjectZero(params, obj, "u", 1);
* console.log(obj);
* //outputs
* { 'd.u': 1, 'd.2.u': 1, 'd.w8.u': 1 }
*/
common.fillTimeObjectZero = function(params, object, property, increment, isUnique) {
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
            if (isUnique ||
                    property[i].substr(-2) === ("." + common.dbMap.unique) ||
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

        if (isUnique || property.substr(-2) === ("." + common.dbMap.unique) ||
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
        common.writeBatcher.add(collection, id + "_" + dbDateIds.zero, update);

    }
    if (Object.keys(updateUsersMonth).length) {
        common.writeBatcher.add(collection, id + "_" + dbDateIds.month, {
            $set: {
                m: dbDateIds.month,
                a: params.app_id + ""
            },
            '$inc': updateUsersMonth
        });
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
        common.writeBatcher.add(props.collection, props.id + "_" + dbDateIds.zero, update);
    }
    if (Object.keys(updateUsersMonth).length) {
        common.writeBatcher.add(props.collection, props.id + "_" + dbDateIds.month, {
            $set: {
                m: dbDateIds.month,
                a: params.app_id + ""
            },
            '$inc': updateUsersMonth
        });
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
                secInMin = (60 * (currDate.minutes())) + currDate.seconds(),
                secInHour = (60 * 60 * (currDate.hours())) + secInMin,
                secInMonth = (60 * 60 * 24 * (currDate.date() - 1)) + secInHour,
                secInYear = (60 * 60 * 24 * (common.getDOY(params.time.timestamp, params.appTimezone) - 1)) + secInHour;

            if (props.lastTimestamp < (params.time.timestamp - secInMin)) {
                updateUsersMonth['d.' + params.time.day + '.' + params.time.hour + '.' + metric] = props.value;
            }

            if (props.lastTimestamp < (params.time.timestamp - secInHour)) {
                updateUsersMonth['d.' + params.time.day + '.' + metric] = props.value;
            }

            if (lastDate.year() + "" === params.time.yearly + "" &&
                    Math.ceil(lastDate.format("DDD") / 7) < params.time.weekly) {
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
            common.fillTimeObjectZero(params, updateUsersZero, metric, props.value, true);
            common.fillTimeObjectMonth(params, updateUsersMonth, metric, props.value);
        }
    }
    else {
        //zeroObjUpdate.push(metric);
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
                secInMin = (60 * (currDate.minutes())) + currDate.seconds(),
                secInHour = (60 * 60 * (currDate.hours())) + secInMin,
                secInMonth = (60 * 60 * 24 * (currDate.date() - 1)) + secInHour,
                secInYear = (60 * 60 * 24 * (common.getDOY(params.time.timestamp, params.appTimezone) - 1)) + secInHour;

            if (props.lastTimestamp < (params.time.timestamp - secInMin)) {
                updateUsersMonth['d.' + params.time.day + '.' + params.time.hour + '.' + escapedMetricVal + '.' + metric] = props.value;
            }

            if (props.lastTimestamp < (params.time.timestamp - secInHour)) {
                updateUsersMonth['d.' + params.time.day + '.' + escapedMetricVal + '.' + metric] = props.value;
            }

            if (lastDate.year() + "" === params.time.yearly + "" &&
                    Math.ceil(lastDate.format("DDD") / 7) < params.time.weekly) {
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
            common.fillTimeObjectZero(params, updateUsersZero, escapedMetricVal + '.' + metric, props.value, true);
            common.fillTimeObjectMonth(params, updateUsersMonth, escapedMetricVal + '.' + metric, props.value, recordHourly);
        }
    }
    else {
        if (recordHourly) {
            //common.fillTimeObjectZero(params, updateUsersZero, escapedMetricVal + '.' + metric, props.value);
            common.fillTimeObjectMonth(params, updateUsersMonth, escapedMetricVal + '.' + metric, props.value, recordHourly);
        }
        else {
            //zeroObjUpdate.push(escapedMetricVal + "." + metric);
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
* @returns {number} 0 if they are both the same, 1 if first one is higher and -1 is second one is higher
*/
common.versionCompare = function(v1, v2, options) {
    var delimiter = (options && options.delimiter) || ":";

    /**
    * Parses a version string into an object we can process more easily
    * @param {string} s - version string
    * @returns {object} - a version object
    */
    function parseVersion(s) {
        var ob = {},
            build_metadata_index = s.indexOf("+"),
            prerelease_identifier_index = s.indexOf("-");

        // if - appears after +, just use the whole thing as a build metadata identifier
        if ((build_metadata_index !== -1) && (prerelease_identifier_index > build_metadata_index)) {
            prerelease_identifier_index = -1;
        }

        if (build_metadata_index !== -1) {
            ob.build_metadata = s.slice(build_metadata_index + 1);
            s = s.slice(0, build_metadata_index);
        }

        if (prerelease_identifier_index !== -1) {
            ob.prerelease_identifier = s.slice(prerelease_identifier_index + 1);
            s = s.slice(0, prerelease_identifier_index);
        }

        // if it's all decimal digits, parse as number; else, it's a string
        ob.parts = s.split(delimiter).map(function(rawPart) {
            return /^[0-9]+$/.test(rawPart) ? parseInt(rawPart) : rawPart;
        });

        return ob;
    }

    v1 = parseVersion(v1);
    v2 = parseVersion(v2);

    var minPartsLength = Math.min(v1.parts.length, v2.parts.length);
    var compareParts = 0;

    for (var i = 0; i < minPartsLength; i++) {
        var p1 = v1.parts[i],
            p2 = v2.parts[i];

        // if both parts aren't numbers, we'll compare them as strings
        if ((typeof p1 !== "number") || (typeof p1 !== typeof p2)) {
            p1 = p1.toString();
            p2 = p2.toString();
        }

        if (p1 !== p2) {
            compareParts = (p1 < p2) ? -1 : 1;
            break;
        }
    }

    // if the compared parts are equal but...
    if (compareParts === 0) {
        // only one of them has a prerelease identifier, it is the smaller one
        if ((v1.prerelease_identifier === undefined) !== (v2.prerelease_identifier === undefined)) {
            return (v1.prerelease_identifier !== undefined) ? -1 : 1;
        }
        // one has less parts, it is the smaller one
        else if (v1.parts.length !== v2.parts.length) {
            return (v1.parts.length < v2.parts.length) ? -1 : 1;
        }
    }

    return compareParts;
};

/**
* Adjust timestamp with app's timezone for timestamp queries that should equal bucket results
* @param {number} ts - miliseconds timestamp
* @param {string} tz - timezone
* @returns {number} adjusted timestamp for timezone
*/
common.adjustTimestampByTimezone = function(ts, tz) {
    var d = moment();
    if (tz) {
        d.tz(tz);
    }
    return ts + (d.utcOffset() * 60);
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

common.clearClashingQueryOperations = function(query) {
    var map = {};
    var field;
    for (var opp in query) {
        for (field in query[opp]) {
            map[field] = (map[field] || 0) + 1;
        }
    }
    var badPaths = [];
    var allPaths = Object.keys(map);
    for (var z = 0; z < allPaths.length; z++) {
        for (var p = z + 1; p < allPaths.length; p++) {
            if (allPaths[z].startsWith(allPaths[p] + ".")) {
                map[allPaths[z]]++;
                map[allPaths[p]]++;
            }
        }
    }

    for (var path in map) {
        if (map[path] > 1) {
            badPaths.push(path);
        }
    }
    if (badPaths.length > 0) {
        var droppedOp = [];
        var st = JSON.stringify(query);

        for (var op in query) {
            for (field in query[op]) {
                if (badPaths.indexOf(field) > -1) {
                    droppedOp.push("{" + op + ":{" + field + ":" + JSON.stringify(query[op][field]) + "}}");
                    delete query[op][field];

                    if (Object.keys(query[op]).length === 0) {

                        delete query[op];
                    }
                }
            }
        }
        console.log("Conflicting operations. Query:" + st + " OPS:" + droppedOp.join(",") + " Resulted query:" + JSON.stringify(query));
    }
    return query;

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

        if (!params.qstring.device_id && typeof user.did === "undefined") {
            let err = "Device id is not provided for" + params.href;
            console.log(err);
            if (callback) {
                callback(err);
            }
            return;
        }

        if (!no_meta && !params.qstring.no_meta) {
            if (typeof user.fac === "undefined") {
                if (!update.$set) {
                    update.$set = {};
                }
                if (!update.$set.fac) {
                    if (user.fs && user.fs < params.time.timestamp) {
                        update.$set.fac = user.fs;
                    }
                    else {
                        update.$set.fac = params.time.timestamp;
                    }
                }
                update.$set.first_sync = Math.round(Date.now() / 1000);
            }

            if (typeof user.lac === "undefined" || (user.lac + "").length === 13 || user.lac < params.time.timestamp) {
                if (!update.$set) {
                    update.$set = {};
                }
                if (!update.$set.lac) {
                    update.$set.lac = params.time.timestamp;
                }
                update.$set.last_sync = Math.round(Date.now() / 1000);
            }

            if (!user.sdk) {
                user.sdk = {};
            }

            if (params.qstring.sdk_name && params.qstring.sdk_name !== user.sdk.name) {
                if (!update.$set) {
                    update.$set = {};
                }
                update.$set["sdk.name"] = params.qstring.sdk_name;
            }
            if (params.qstring.sdk_version && params.qstring.sdk_version !== user.sdk.version) {
                if (!update.$set) {
                    update.$set = {};
                }
                update.$set["sdk.version"] = params.qstring.sdk_version;
            }

            if (plugins.getConfig("api", params.app && params.app.plugins, true).prevent_duplicate_requests && user.last_req !== params.request_hash) {
                if (!update.$set) {
                    update.$set = {};
                }
                update.$set.last_req = params.request_hash;
                if (params.href && user.last_req_get !== params.href) {
                    update.$set.last_req_get = (params.href + "") || "";
                }
                if (params.req && params.req.body && user.last_req_post !== params.req.body) {
                    update.$set.last_req_post = (params.req.body + "") || "";
                }
                if (!user.req_count || user.req_count < 100) {
                    if (!update.$inc) {
                        update.$inc = {};
                    }
                    update.$inc.req_count = 1;
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

        //store device type and mark users as know by custome device id
        if (params.qstring.t && typeof user.t !== params.qstring.t) {
            if (!update.$set) {
                update.$set = {};
            }
            if (!update.$set.t) {
                update.$set.t = params.qstring.t;
            }
            if (params.qstring.t + "" === "0" && !user.hasInfo) {
                update.$set.hasInfo = true;
            }
        }
        else if (user.merges && !user.hasInfo) {
            if (!update.$set) {
                update.$set = {};
            }
            if (typeof update.$set.hasInfo === "undefined") {
                update.$set.hasInfo = true;
            }
        }

        //store user's timezone offset too
        if (params.qstring.tz && typeof user.tz !== params.qstring.tz) {
            if (!update.$set) {
                update.$set = {};
            }
            if (!update.$set.tz) {
                update.$set.tz = params.qstring.tz;
            }
        }

        if (callback) {
            common.db.collection('app_users' + params.app_id).findAndModify({'_id': params.app_user_id}, {}, common.clearClashingQueryOperations(update), {
                new: true,
                upsert: true
            }, function(err, res) {
                if (!err && res && res.value) {
                    params.app_user = res.value;
                }
                callback(err, res);
            });
        }
        else {
            // using updateOne costs less than findAndModify, so we should use this 
            // when acknowledging writes and updated information is not relevant (aka callback is not passed)
            common.db.collection('app_users' + params.app_id).updateOne({'_id': params.app_user_id}, common.clearClashingQueryOperations(update), {upsert: true}, function() {});
        }
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
 * Shuffle string using getRandomValues
 * @param {string} text - text to be shuffled
 * @returns {string} shuffled password
 */
common.shuffleString = function(text) {
    var j, x, i;
    for (i = text.length; i; i--) {
        j = Math.floor(Math.random() * i);
        x = text[i - 1];
        text[i - 1] = text[j];
        text[j] = x;
    }

    return text.join("");
};

/**
 * Gets a random string from given character set string with given length
 * @param {string} charSet - charSet string
 * @param {number} length - length of the random string. default 1 
 * @returns {string} random string from charset
 */
common.getRandomValue = function(charSet, length = 1) {
    const randomValues = getRandomValues(new Uint8Array(charSet.length));
    let randomValue = "";

    if (length > charSet.length) {
        length = charSet.length;
    }

    for (let i = 0; i < length; i++) {
        randomValue += charSet[randomValues[i] % charSet.length];
    }

    return randomValue;
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
    text.push(this.getRandomValue(upchars));
    //1 number
    text.push(this.getRandomValue(numbers));
    //1 special char
    if (!no_special) {
        text.push(this.getRandomValue(specials));
        length--;
    }

    //5 any chars
    text.push(this.getRandomValue(all, Math.max(length - 2, 5)));

    //randomize order
    return this.shuffleString(text);
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

/**
 * Sanitizes a filename to prevent directory traversals and such.
 * @param {string} filename - filename to sanitize
 * @param {string} replacement - string to replace characters to be removed
 * @returns {string} sanitizedFilename - sanitized filename
 */
common.sanitizeFilename = (filename, replacement = "") => {
    return (filename + "")
        .replace(/[\x00-\x1f\x80-\x9f]+/g, replacement)
        .replace(/[\/\?<>\\:\*\|"]/g, replacement)
        .replace(/^\.{1,2}$/, replacement)
        .replace(/^\.+/, replacement);
};

/**
 * Sanitizes html content by allowing only safe tags
 * @param {string} html - html content to sanitize
 * @returns {string} sanitizedHTML - sanitized html content
 */
common.sanitizeHTML = (html) => {
    const whiteList = {
        a: ["target", "title"],
        abbr: ["title"],
        address: [],
        area: ["shape", "coords", "href", "alt"],
        article: [],
        aside: [],
        audio: [
            "autoplay",
            "controls",
            "crossorigin",
            "loop",
            "muted",
            "preload",
            "src",
        ],
        b: [],
        bdi: ["dir"],
        bdo: ["dir"],
        big: [],
        blockquote: ["cite"],
        br: [],
        caption: [],
        center: [],
        cite: [],
        code: [],
        col: ["align", "valign", "span", "width"],
        colgroup: ["align", "valign", "span", "width"],
        dd: [],
        del: ["datetime"],
        details: ["open"],
        div: [],
        dl: [],
        dt: [],
        em: [],
        figcaption: [],
        figure: [],
        font: ["color", "size", "face"],
        footer: [],
        h1: [],
        h2: [],
        h3: [],
        h4: [],
        h5: [],
        h6: [],
        header: [],
        hr: [],
        i: [],
        img: ["src", "alt", "title", "width", "height"],
        ins: ["datetime"],
        li: [],
        mark: [],
        nav: [],
        ol: [],
        p: [],
        pre: [],
        s: [],
        section: [],
        small: [],
        span: [],
        sub: [],
        summary: [],
        sup: [],
        strong: [],
        strike: [],
        table: ["width", "border", "align", "valign"],
        tbody: ["align", "valign"],
        td: ["width", "rowspan", "colspan", "align", "valign"],
        tfoot: ["align", "valign"],
        th: ["width", "rowspan", "colspan", "align", "valign"],
        thead: ["align", "valign"],
        tr: ["rowspan", "align", "valign"],
        tt: [],
        u: [],
        ul: [],
        video: [
            "autoplay",
            "controls",
            "crossorigin",
            "loop",
            "muted",
            "playsinline",
            "poster",
            "preload",
            "src",
            "height",
            "width",
        ],
    };

    return html.replace(/<\/?([^>]+)>/gi, (tag) => {
        const tagName = tag.match(/<\/?([^\s>/]*)/)[1];

        if (!Object.getOwnPropertyDescriptor(whiteList, tagName)) {
            return "";
        }

        const attributesRegex = /\b(\w+)=["']([^"']*)["']/g;
        var doubleQuote = '"',
            singleQuote = "'";
        let matches;
        let filteredAttributes = [];
        let allowedAttributes = Object.getOwnPropertyDescriptor(whiteList, tagName).value;
        let tagHasAttributes = false;
        while ((matches = attributesRegex.exec(tag)) !== null) {
            tagHasAttributes = true;
            let fullAttribute = matches[0];
            let attributeName = matches[1];
            let attributeValue = matches[2];
            if (allowedAttributes.indexOf(attributeName) > -1) {

                var attributeValueStart = fullAttribute.indexOf(attributeValue);
                if (attributeValueStart >= 1) {
                    var attributeWithQuote = fullAttribute.substring(attributeValueStart - 1);
                    if (attributeWithQuote.indexOf(doubleQuote) === 0) {
                        filteredAttributes.push(`${attributeName}=${doubleQuote}${attributeValue}${doubleQuote}`);
                    }
                    else if ((attributeWithQuote.indexOf(singleQuote) === 0)) {
                        filteredAttributes.push(`${attributeName}=${singleQuote}${attributeValue}${singleQuote}`);
                    }
                    else { //no quote
                        filteredAttributes.push(`${attributeName}=${attributeValue}`);
                    }
                }
            }
        }
        if (!tagHasAttributes) { //closing tag or tag without any attributes
            return tag;
        }
        if (filteredAttributes.length <= 0) { //tag had attributes but none of them on whilelist
            return `<${tagName}>`;
        }

        return `<${tagName} ${filteredAttributes.join(" ")}>`;

    });

};



/**
 *  Merge 2 mongodb update queries
 *  @param {object} ob1 - existing database update query
 *  @param {object} ob2 - addition to database update query
 *  @returns {object} merged database update query
 */
common.mergeQuery = function(ob1, ob2) {
    if (ob2) {
        for (let key in ob2) {
            if (!ob1[key]) {
                ob1[key] = ob2[key];
            }
            else if (key === "$set" || key === "$setOnInsert" || key === "$unset") {
                for (let val in ob2[key]) {
                    ob1[key][val] = ob2[key][val];
                }
            }
            else if (key === "$addToSet") {
                for (let val in ob2[key]) {
                    if (typeof ob1[key][val] !== 'object') {
                        ob1[key][val] = {'$each': [ob1[key][val]]}; //create as object if it is single value
                    }

                    if (typeof ob2[key][val] === 'object' && ob2[key][val].$each) {
                        for (let p = 0; p < ob2[key][val].$each.length; p++) {
                            if (ob1[key][val].$each.indexOf(ob2[key][val].$each[p]) === -1) {
                                ob1[key][val].$each.push(ob2[key][val].$each[p]);
                            }
                        }
                    }
                    else {
                        if (ob1[key][val].$each.indexOf(ob2[key][val]) === -1) {
                            ob1[key][val].$each.push(ob2[key][val]);
                        }
                    }
                }

            }
            else if (key === "$push") {
                for (let val in ob2[key]) {
                    if (typeof ob1[key][val] !== 'object') {
                        ob1[key][val] = {'$each': [ob1[key][val]]};
                    }

                    if (typeof ob2[key][val] === 'object' && ob2[key][val].$each) {
                        for (let p = 0; p < ob2[key][val].$each.length; p++) {
                            ob1[key][val].$each.push(ob2[key][val].$each[p]);
                        }
                        //copy other push modifiers
                        for (let modifier in ob2[key][val]) {
                            if (modifier !== "$each") {
                                ob1[key][val][modifier] = ob2[key][val][modifier];
                            }
                        }
                    }
                    else {
                        ob1[key][val].$each.push(ob2[key][val]);
                    }
                }
            }
            else if (key === "$inc") {
                for (let val in ob2[key]) {
                    ob1[key][val] = ob1[key][val] || 0;
                    ob1[key][val] += ob2[key][val];
                }
            }
            else if (key === "$mul") {
                for (let val in ob2[key]) {
                    ob1[key][val] = ob1[key][val] || 0;
                    ob1[key][val] *= ob2[key][val];
                }
            }
            else if (key === "$min") {
                for (let val in ob2[key]) {
                    ob1[key][val] = ob1[key][val] || ob2[key][val];
                    ob1[key][val] = Math.min(ob1[key][val], ob2[key][val]);
                }
            }
            else if (key === "$max") {
                for (let val in ob2[key]) {
                    ob1[key][val] = ob1[key][val] || ob2[key][val];
                    ob1[key][val] = Math.max(ob1[key][val], ob2[key][val]);
                }
            }
        }
        //try to fix colliding fields
        if (ob1 && ob1.$set && ob1.$set.data && ob1.$inc) {
            for (let key in ob1.$inc) {
                if (key.startsWith("data.")) {
                    ob1.$set.data[key.replace("data.", "")] = ob1.$inc[key];
                    delete ob1.$inc[key];
                }
            }
        }
        if (ob1 && ob1.$set && ob1.$unset) {
            for (let key in ob1.$unset) {
                if (key.startsWith("engagement.")) {
                    if (ob1.$set[key + ".sd"]) {
                        delete ob1.$set[key + ".sd"];
                    }
                    if (ob1.$set[key + ".sc"]) {
                        delete ob1.$set[key + ".sc"];
                    }
                    if (ob1.$inc[key + ".sd"]) {
                        delete ob1.$inc[key + ".sd"];
                    }
                    if (ob1.$inc[key + ".sc"]) {
                        delete ob1.$inc[key + ".sc"];
                    }
                }
            }
        }
    }

    return ob1;
};

/**
 * DB-related extensions / functions
 */
common.dbext = {
    ObjectID: function(id) {
        try {
            return mongodb.ObjectId(id);
        }
        catch (ex) {
            return id;
        }
    },

    ObjectId: mongodb.ObjectId,

    /**
     * Check if passed value is an ObjectId
     * 
     * @param {any} id value
     * @returns {boolean} true if id is instance of ObjectId
     */
    isoid: function(id) {
        return id && (id instanceof mongodb.ObjectId);
    },

    /**
     * Decode string to ObjectID if needed
     * 
     * @param {String|ObjectID|null|undefined} id string or object id, empty string is invalid input
     * @returns {ObjectID} id
     */
    oid: function(id) {
        return !id ? id : id instanceof mongodb.ObjectId ? id : mongodb.ObjectId(id);
    },

    /**
     * Create ObjectID with given timestamp. Uses current ObjectID random/server parts, meaning the 
     * object id returned still has same uniquness guarantees as random ones.
     * 
     * @param {Date|number} date Date object or timestamp in seconds, current date by default
     * @returns {ObjectID} with given timestamp
     */
    oidWithDate: function(date = new Date()) {
        let seconds = (typeof date === 'number' ? (date > 9999999999 ? Math.floor(date / 1000) : date) : Math.floor(date.getTime() / 1000)).toString(16),
            server = new mongodb.ObjectId().toString().substr(8);
        return new mongodb.ObjectId(seconds + server);
    },

    /**
     * Create blank ObjectID with given timestamp. Everything except for date part is zeroed.
     * For use in queries like {_id: {$gt: oidBlankWithDate()}}
     * 
     * @param {Date|number} date Date object or timestamp in seconds, current date by default
     * @returns {ObjectID} with given timestamp and zeroes in the rest of the bytes
     */
    oidBlankWithDate: function(date = new Date()) {
        let seconds = (typeof date === 'number' ? (date > 9999999999 ? Math.floor(date / 1000) : date) : Math.floor(date.getTime() / 1000)).toString(16);
        return new mongodb.ObjectId(seconds + '0000000000000000');
    },
};

/**
 * DataTable is a helper class for data tables in the UI which have bServerSide: true. It provides 
 * abstraction for server side pagination, searching and column based sorting. The class relies 
 * on MongoDB's aggregation for all operations. This doesn't include making db calls though. Since 
 * there can be many different execution scenarios, db left to the users of the class. 
 * 
 * There are two main methods of the class:
 * 
 * 1) getAggregationPipeline: Creates a pipeline which can be executed by MongoDB. The pipeline 
 * can be customized, please see its description. 
 *  
 * 2) getProcessedResult: Processes the aggregation result. Returns an object, which is ready to be 
 * served as a response directly.
 */
class DataTable {

    /**
     * Constructor
     * @param {Object} queryString This object should contain the datatable arguments like iDisplayStart,
     * iDisplayEnd, etc. These are added to request by DataTables automatically. If you have a different 
     * use-case, please make sure that the object has necessary fields.
     * @param {('full'|'rows')} queryString.outputFormat The default output of getProcessedResult is a 
     * DataTable compatible object ("full"). However, some consumers of the API may require simple, array-like 
     * results too ("rows"). In order to allow consumers to specify expected output, the field can be used.
     * @param {Object} options Wraps options
     * @param {Array} options.columnOrder If there are sortable columns in the table, then you need to 
     * specify a column list in order to make it work (e.g. ["name", "status"]). 
     * @param {Object} options.defaultSorting When there is no sorting provided in query string, sorting 
     * falls back to this object, if you provide any (e.g. {"name": "asc"}). 
     * @param {Array} options.searchableFields Specify searchable fields of a record/item (e.g. ["name", "description"]). 
     * @param {('regex'|'hard')} options.searchStrategy Specify searching method. If "regex", then a regex
     * search is performed on searchableFields. Other values will be considered as hard match.
     * @param {Object} options.outputProjection Adds a $project stage to the output rows using the object passed. 
     * @param {('full'|'rows')} options.defaultOutputFormat This is the default value for queryString.outputFormat. 
     * @param {String} options.uniqueKey A generic-purpose unique key for records. Default is _id, as it 
     * is the default identifier of MongoDB docs. Please make sure that this key is in the output of initial pipeline.
     * @param {Boolean} options.disableUniqueSorting When sorting is done, the uniqueKey is automatically
     * injected to the sorting expression, in order to mitigate possible duplicate records in pages. This is
     * a protection for cases when the sorting is done based on non-unique fields. Injection is enabled by default.
     * If you want to disable this feature, pass true.
     */
    constructor(queryString, {
        columnOrder = [],
        defaultSorting = null,
        searchableFields = [],
        searchStrategy = "regex",
        outputProjection = null,
        defaultOutputFormat = "full",
        uniqueKey = "_id",
        disableUniqueSorting = false
    } = {}) {
        this.queryString = queryString;
        this.skip = null;
        this.limit = null;
        this.searchTerm = null;
        this.sorting = null;
        this.echo = "0";
        //
        this.columnOrder = columnOrder;
        this.defaultSorting = defaultSorting;
        this.searchableFields = searchableFields;
        this.searchStrategy = searchStrategy;
        this.outputProjection = outputProjection;
        this.defaultOutputFormat = defaultOutputFormat;
        this.uniqueKey = uniqueKey;
        this.disableUniqueSorting = disableUniqueSorting;
        //
        if (this.columnOrder && this.columnOrder.length > 0) {
            if (this.queryString.iSortCol_0 && this.queryString.sSortDir_0) {
                var sortField = this.columnOrder[parseInt(this.queryString.iSortCol_0, 10)];
                if (sortField) {
                    this.sorting = {[sortField]: this.queryString.sSortDir_0};
                }
            }
        }

        if (!this.sorting && this.defaultSorting) {
            this.sorting = this.defaultSorting;
        }

        if (this.sorting) {
            var _tempSorting = {};
            for (var sortKey in this.sorting) {
                if (this.sorting[sortKey] === "asc") {
                    _tempSorting[sortKey] = 1;
                }
                else {
                    _tempSorting[sortKey] = -1;
                }
            }
            if (this.disableUniqueSorting !== true && !_tempSorting[this.uniqueKey]) {
                _tempSorting[this.uniqueKey] = 1;
            }
            this.sorting = _tempSorting;
        }

        if (this.queryString.iDisplayStart) {
            this.skip = parseInt(this.queryString.iDisplayStart, 10);
        }

        if (this.queryString.iDisplayLength) {
            this.limit = parseInt(this.queryString.iDisplayLength, 10);
        }

        if (this.queryString.sSearch && this.queryString.sSearch !== "") {
            this.searchTerm = this.queryString.sSearch;
        }

        if (this.queryString.sEcho) {
            this.echo = this.queryString.sEcho;
        }
    }

    /**
     * Returns the search field for. Only for internal use.
     * @returns {Object|String} Regex object or search term itself
     */
    _getSearchField() {
        if (this.searchStrategy === "regex") {
            return {$regex: this.searchTerm, $options: 'i'};
        }
        return this.searchTerm;
    }

    /**
     * Creates an aggregation pipeline based on the query string and additional stages/facets
     * if provided any. Data flow between stages are not checked, so please do check manually.
     * 
     * @param {Object} options Wraps options
     * @param {Array} options.initialPipeline If you need to select a subset, to add new fields or 
     * anything else involving aggregation stages, you can pass an array of stages using options.initialPipeline.
     * Initial pipeline is basically used for counting the total number of documents without pagination and search.
     * 
     * # of output rows = total number of docs.
     * 
     * @param {Array} options.filteredPipeline Filtered pipeline will contain the remaining rows tested against a 
     * search query (if any). That is, this pipeline will get only the filtered docs as its input. If there is no 
     * query, then this will be another stage after initialPipeline. Paging and sorting are added after filteredPipeline.
     * 
     * # of output rows = filtered number of docs.
     * 
     * @param {Object} options.customFacets You can add facets to your results using option.customFacets. 
     * Custom facets will use initial pipeline's output as its input. If the documents you're 
     * looking for are included by initial pipeline's output, you can use this to avoid extra db calls.
     * You can obtain outputs of your custom facets via getProcessedResult. Please note that custom facets will only be 
     * available when the output format is "full".
     * 
     * @returns {Object} Pipeline object
     */
    getAggregationPipeline({
        initialPipeline = [],
        filteredPipeline = [],
        customFacets = {}
    } = {}) {
        var pipeline = [...initialPipeline]; // Initial pipeline (beforeMatch)
        var $facetPagedData = [];
        var $facetFilteredTotal = [];

        if (this.searchTerm !== null && this.searchableFields && this.searchableFields.length > 0) {
            var matcher = null;
            if (this.searchableFields.length === 1) {
                matcher = { [this.searchableFields[0]]: this._getSearchField() };
            }
            else {
                var searchOr = [];
                this.searchableFields.forEach((field) => {
                    searchOr.push({ [field]: this._getSearchField() });
                });
                matcher = { $or: searchOr};
            }
            $facetPagedData.push({$match: matcher});
            $facetFilteredTotal.push({$match: matcher});
        }
        $facetPagedData.push(...filteredPipeline);
        $facetFilteredTotal.push(...filteredPipeline); // TODO: optimize (no need to do pipeline operations unless there is match) 
        $facetFilteredTotal.push({$group: {"_id": null, "value": {$sum: 1}}});
        if (this.sorting !== null) {
            $facetPagedData.push({$sort: this.sorting});
        }
        if (this.skip !== null) {
            $facetPagedData.push({$skip: this.skip});
        }
        if (this.limit !== null && this.limit > 0) {
            $facetPagedData.push({$limit: this.limit});
        }
        if (this.outputProjection !== null) {
            $facetPagedData.push({$project: this.outputProjection});
        }
        pipeline.push({
            $facet:
            {
                ...customFacets,
                fullTotal: [{$group: {"_id": null, "value": {$sum: 1}}}],
                filteredTotal: $facetFilteredTotal,
                pagedData: $facetPagedData,
            }
        });
        return pipeline;
    }

    /**
     * Processes the aggregation result and returns a ready-to-use response.
     * @param {Object} queryResult Aggregation result returned by the MongoDB.
     * @param {Function} processFn A callback function that has a single argument 'rows'.
     * As the name implies, it is an array of returned rows. The function can be used as
     * a final stage to do modifications to fetched items before completing the response. 
     * @returns {Object|Array} Returns the final response
     */
    getProcessedResult(queryResult, processFn) {
        var fullTotal = 0,
            filteredTotal = 0,
            pagedData = [];

        var customFacetResults = {};

        if (queryResult && queryResult[0]) {
            var facets = queryResult[0];
            if (facets.fullTotal && facets.fullTotal[0] && facets.fullTotal[0].value) {
                fullTotal = facets.fullTotal[0].value;
            }
            if (facets.filteredTotal && facets.filteredTotal[0] && facets.filteredTotal[0].value) {
                filteredTotal = facets.filteredTotal[0].value;
            }
            if (facets.pagedData) {
                pagedData = facets.pagedData;
            }

            for (var key in facets) {
                if (["fullTotal", "filteredTotal", "pagedData"].includes(key)) {
                    continue;
                }
                customFacetResults[key] = facets[key];
            }

        }
        if (processFn) {
            var processed = processFn(pagedData);
            if (processed) {
                pagedData = processed;
            }
        }

        var outputFormat = this.queryString.outputFormat || this.defaultOutputFormat;

        if (outputFormat === "full") {
            var outputObject = {
                sEcho: this.echo,
                iTotalRecords: fullTotal,
                iTotalDisplayRecords: filteredTotal,
                aaData: pagedData
            };
            return {...outputObject, ...customFacetResults};
        }
        else {
            return pagedData;
        }
    }
}

common.DataTable = DataTable;

/**
 * Assign license check results to request (and session if present)
 * 
 * @param {object} req request
 * @param {object|undefined} check check results
 */
common.licenseAssign = function(req, check) {
    if (check && check.error) {
        req.licenseError = check.error;
        if (req.session) {
            req.session.licenseError = req.licenseError;
        }
    }
    if (check && check.notify && check.notify.length) {
        req.licenseNotification = JSON.stringify(check.notify);
        if (req.session) {
            req.session.licenseNotification = req.licenseNotification;
        }
    }
};

/**
* Standard number formatter, taken from frontend's countly.common.js

* @memberof countlyCommon
* @param {number} x - number to format
* @returns {string} formatted number
* @example
* //outputs 1,234,567
* countlyCommon.formatNumber(1234567);
*/
common.formatNumber = function(x) {
    x = parseFloat(parseFloat(x).toFixed(2));
    var parts = x.toString().split(".");
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    return parts.join(".");
};

/**
* Second formatter

* @memberof countlyCommon
* @param {number} number - number of seconds to format
* @returns {string} formatted seconds
*/
common.formatSecond = function(number) {
    if (number === 0) {
        return '0';
    }

    const days = Math.floor(number / (24 * 60 * 60));
    const hours = Math.floor((number % (24 * 60 * 60)) / (60 * 60));
    const minutes = Math.floor((number % (60 * 60)) / 60);
    const seconds = Math.floor((number % 60)); //floor to discard decimals;

    let formattedDuration = '';

    if (days > 0) {
        formattedDuration += `${days}d `;
    }

    if (hours > 0) {
        formattedDuration += `${hours}h `;
    }

    if (minutes > 0) {
        formattedDuration += `${minutes}m `;
    }

    if (seconds > 0) {
        formattedDuration += `${seconds}s`;
    }

    return formattedDuration.trim();
};

module.exports = common;
