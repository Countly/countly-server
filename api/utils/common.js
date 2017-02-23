/**
* Module for some common utility functions and references
* @module api/utils/common
*/

/** @lends module:api/utils/common */
var common = {},
    moment = require('moment'),
    time = require('time')(Date),
    crypto = require('crypto'),
    mongo = require('mongoskin'),
    logger = require('./log.js'),
    escape_html = require('escape-html'),
    mcc_mnc_list = require('mcc-mnc-list'),
    plugins = require('../../plugins/pluginManager.js'),
    countlyConfig = require('./../config', 'dont-enclose');

(function (common) {

    var log = logger('common');
    
    function escape_html_entities(key, value) {		
        if(typeof value === 'object' && value){		
            if(Array.isArray(value)){		
                var replacement = [];		
                for (var k = 0; k < value.length; k++) {		
                    if(typeof value[k] === "string")		
                    replacement[k] = escape_html(value[k]);		
                    else		
                    replacement[k] = value[k];		
                }		
                return replacement;		
            }		
            else{		
                var replacement = {};		
                for (var k in value) {		
                    if (Object.hasOwnProperty.call(value, k)) {		
                        if(typeof value[k] === "string")		
                            replacement[escape_html(k)] = escape_html(value[k]);		
                        else		
                            replacement[escape_html(k)] = value[k];		
                    }		
                }		
                return replacement;		
            }		
        }		
        return value;		
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
        'user_id' : 'uid',
        'first_seen': 'fs',
        'last_seen': 'ls',
        'last_payment': 'lp',
        'session_duration': 'sd',
        'total_session_duration': 'tsd',
        'session_count': 'sc',
        'device': 'd',
        'carrier': 'c',
        'city': 'cty',
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
        'user_properties':'up',
        'timestamp':'ts',
        'segmentations':'sg',
        'count':'c',
        'sum':'s',
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
        "unknown":"unk",
        "undefined":"unk",
        "tvos":"atv",
        "watchos":"wos",
        "unity editor":"uty",
        "qnx":"qnx",
        "os/2":"os2",
        "windows":"mw",
        "open bsd":"ob",
        "searchbot":"sb",
        "sun os":"so",
        "solaris":"so",		
        "beos":"bo",
        "mac osx":"o",
        "macos":"o",
        "mac":"o",
        "webos":"web",		
        "brew":"brew"
    };
    
    /**
    * Whole base64 alphabet for fetching splitted documents
    * @type {object} 
    */
    common.base64 = ["0","1","2","3","4","5","6","7","8","9","a","b","c","d","e","f","g","h","i","j","k","l","m","n","o","p","q","r","s","t","u","v","w","x","y","z","A","B","C","D","E","F","G","H","I","J","K","L","M","N","O","P","Q","R","S","T","U","V","W","X","Y","Z","+","/"];

    common.dbPromise = function() {
        var args = Array.prototype.slice.call(arguments);
        return new Promise(function(resolve, reject) {
            var collection = common.db.collection(args[0]),
                method = args[1];

            if (method === 'find') {
                collection[method].apply(collection, args.slice(2)).toArray(function(err, result){
                    if (err) { reject(err); }
                    else { resolve(result); }
                });
            } else {
                collection[method].apply(collection, args.slice(2).concat([function(err, result){
                    if (err) { reject(err); }
                    else { resolve(result); }
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
    common.getDescendantProp = function (obj, desc) {
        desc = String(desc);

        if (desc.indexOf(".") === -1) {
            return obj[desc];
        }

        var arr = desc.split(".");
        while (arr.length && (obj = obj[arr.shift()]));

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
    common.isNumber = function (n) {
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
    common.convertToType = function(value){
        //handle array values
        if(Array.isArray(value)){
            for(var i = 0; i <  value.length; i++){
                value[i] = common.convertToType(value[i]);
            }
            return value;
        }
        //if value can be a number
        else if (common.isNumber(value)) {
            //check if it is string but is less than 16 length
            if(value.length && value.length <= 16)
                //convert to number
                return parseFloat(value);
            //check if it is number, but longer than 16 digits (max limit)
            else if((value+"").length > 16)
                //convert to string
                return value+"";
            else
                //return number as is
                return value;
        } else{
            //return as string
            return value+"";
        }
    }

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
        if(!tmpAvgVal || tmpAvgVal == Number.POSITIVE_INFINITY){
            tmpAvgVal = 0;
        }
        return tmpAvgVal;
    }

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
    * @returns {array} array with unique values
    */
    common.arrayAddUniq = function (arr, item) {
        if (!arr) {
            arr = [];
        }

        if (toString.call(item) === "[object Array]") {
            for (var i = 0; i < item.length; i++) {
                if (arr.indexOf(item[i]) === -1) {
                    arr[arr.length] = item[i];
                }
            }
        } else {
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
    common.sha1Hash = function (str, addSalt) {
        var salt = (addSalt) ? new Date().getTime() : '';
        return crypto.createHmac('sha1', salt + '').update(str + '').digest('hex');
    };

    /**
    * Create MD5 hash from provided value
    * @param {string} str - value to hash
    * @returns {string} MD5 hash
    */
    common.md5Hash = function (str) {
        return crypto.createHash('md5').update(str + '').digest('hex');
    };

    /**
    * Modifies provided object in the format object["2012.7.20.property"] = increment. 
    * Usualy used when filling up Countly metric model data
    * @param {params} params - {@link params} object
    * @param {object} object - object to fill
    * @param {string} property - meric value or segment or property to fill/increment
    * @param {number=} increment - by how much to increments, default is 1
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
    common.fillTimeObject = function (params, object, property, increment) {
        var increment = (increment) ? increment : 1,
            timeObj = params.time;

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
        if (property.substr(-2) == ("." + common.dbMap["unique"]) ||
            property == common.dbMap["unique"] ||
            property.substr(0,2) == (common.dbMap["frequency"] + ".") ||
            property.substr(0,2) == (common.dbMap["loyalty"] + ".") ||
            property.substr(0,3) == (common.dbMap["durations"] + ".") ||
            property == common.dbMap["paying"])
        {
            object[timeObj.yearly + ".w" + timeObj.weekly + '.' + property] = increment;
        }
    };

    /**
    * Creates a time object from request's milisecond or second timestamp in provided app's timezone
    * @param {object} params - {@link params} object
    * @param {object} object - object to fill
    * @param {string} property - meric value or segment or property to fill/increment
    * @param {number=} increment - by how much to increments, default is 1
    * @returns {timeObject} Time object for current request
    */
    common.initTimeObj = function (appTimezone, reqTimestamp) {
        var currTimestamp,
            curMsTimestamp,
            currDate,
            currDateWithoutTimestamp = new Date();
        
        // Check if the timestamp parameter exists in the request and is a 10 or 13 digit integer, handling also float timestamps with ms after dot
        if (reqTimestamp && (Math.round(parseFloat(reqTimestamp, 10)) + "").length === 10 && common.isNumber(reqTimestamp)) {
            // If the received timestamp is greater than current time use the current time as timestamp
            currTimestamp = ( parseInt(reqTimestamp, 10) > time.time()) ? time.time() : parseInt(reqTimestamp, 10);
            curMsTimestamp = ( parseInt(reqTimestamp, 10) > time.time()) ? time.time()*1000 : parseFloat(reqTimestamp, 10)*1000;
            currDate = new Date(currTimestamp * 1000);
        } else if (reqTimestamp && (reqTimestamp + "").length === 13 && common.isNumber(reqTimestamp)) {
            var tmpTimestamp = Math.round(parseInt(reqTimestamp, 10) / 1000);
            curMsTimestamp = ( tmpTimestamp > time.time()) ? time.time() * 1000 :  parseInt(reqTimestamp, 10);
            currTimestamp = (tmpTimestamp > time.time()) ? time.time() : tmpTimestamp;
            currDate = new Date(currTimestamp * 1000);
        } else {
            currTimestamp = time.time(); // UTC
            currDate = new Date();
            curMsTimestamp = currDate.getTime();
        }
		
		currDate.setTimezone(appTimezone);
		currDateWithoutTimestamp.setTimezone(appTimezone);

        var tmpMoment = moment(currDate);

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
            nowWithoutTimestamp: moment(currDateWithoutTimestamp),
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
    common.getDate = function (timestamp, timezone) {
        var tmpDate = (timestamp)? new Date(timestamp * 1000) : new Date();

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
    common.getDOY = function (timestamp, timezone) {
        var endDate = (timestamp)? new Date(timestamp * 1000) : new Date();

        if (timezone) {
			endDate.setTimezone(timezone);
        }

        var startDate = (timestamp)? new Date(timestamp * 1000) : new Date();

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
    common.getDaysInYear = function (year) {
        if(new Date(year, 1, 29).getMonth() === 1) {
            return 366;
        } else {
            return 365;
        }
    };

    /**
    * Returns amount of iso weeks in provided year
    * @param {number} year - year to check for days
    * @returns {number} number of iso weeks in provided year
    */
    common.getISOWeeksInYear = function (year) {
        var d = new Date(year, 0, 1),
            isLeap = new Date(year, 1, 29).getMonth() === 1;

        //Check for a Jan 1 that's a Thursday or a leap year that has a
        //Wednesday Jan 1. Otherwise it's 52
        return d.getDay() === 4 || isLeap && d.getDay() === 3 ? 53 : 52
    };

    /**
    * Validates provided arguments
    * @param {object} args - arguments to validate
    * @param {object} argProperties - rules for validating each argument
    * @param {boolean} argProperties.required - should property be present in args
    * @param {string} argProperties.type - what type should property be, possible values: String, Array, Number, URL, Boolean, Object
    * @param {string} argProperties.max-length - property should not be longer than provided value
    * @param {string} argProperties.min-length - property should not be shorter than provided value
    * @param {string} argProperties.exclude-from-ret-obj - should property be present in returned validated args object
    * @param {string} argProperties.has-number - should string property has any number in it
    * @param {string} argProperties.has-char - should string property has any latin character in it
    * @param {string} argProperties.has-upchar - should string property has any upper cased latin character in it
    * @param {string} argProperties.has-special - should string property has any none latin character in it
    * @returns {object|false} validated args or false if args do not pass validation
    */
    common.validateArgs = function (args, argProperties) {

        var returnObj = {};

        if (!args) {
            return false;
        }

        for (var arg in argProperties) {
            if (argProperties[arg].required) {
                if (args[arg] === void 0) {
                    return false;
                }
            }

            if (args[arg] !== void 0) {
                if (argProperties[arg].type) {
                    if (argProperties[arg].type === 'Number' || argProperties[arg].type === 'String') {
                        if (toString.call(args[arg]) !== '[object ' + argProperties[arg].type + ']') {
                            return false;
                        }
                    } else if (argProperties[arg].type === 'URL') {
                        if (toString.call(args[arg]) !== '[object String]') {
                            return false;
                        } else if (args[arg] && !/^([a-z]([a-z]|\d|\+|-|\.)*):(\/\/(((([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:)*@)?((\[(|(v[\da-f]{1,}\.(([a-z]|\d|-|\.|_|~)|[!\$&'\(\)\*\+,;=]|:)+))\])|((\d|[1-9]\d|1\d\d|2[0-4]\d|25[0-5])\.(\d|[1-9]\d|1\d\d|2[0-4]\d|25[0-5])\.(\d|[1-9]\d|1\d\d|2[0-4]\d|25[0-5])\.(\d|[1-9]\d|1\d\d|2[0-4]\d|25[0-5]))|(([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=])*)(:\d*)?)(\/(([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:|@)*)*|(\/((([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:|@)+(\/(([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:|@)*)*)?)|((([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:|@)+(\/(([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:|@)*)*)|((([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:|@)){0})(\?((([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:|@)|[\uE000-\uF8FF]|\/|\?)*)?(\#((([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:|@)|\/|\?)*)?$/i.test(args[arg])) {
                            return false;
                        }
                    } else if (argProperties[arg].type === 'Boolean') {
                        if (!(args[arg] !== true || args[arg] !== false || toString.call(args[arg]) !== '[object Boolean]')) {
                            return false;
                        }
                    } else if (argProperties[arg].type === 'Array') {
                        if (!Array.isArray(args[arg])) {
                            return false;
                        }
                    } else if (argProperties[arg].type === 'Object') {
                        if (toString.call(args[arg]) !== '[object ' + argProperties[arg].type + ']' && !(!argProperties[arg].required && args[arg] === null)) {
                            return false;
                        }
                    } 
					else {
                        return false;
                    }
                } else {
                    if (toString.call(args[arg]) !== '[object String]') {
                        return false;
                    }
                }

                /*
                if (toString.call(args[arg]) === '[object String]') {
                    args[arg] = args[arg].replace(/([.$])/mg, '');
                }
                */

                if (argProperties[arg]['max-length']) {
                    if (args[arg].length > argProperties[arg]['max-length']) {
                        return false;
                    }
                }

                if (argProperties[arg]['min-length']) {
                    if (args[arg].length < argProperties[arg]['min-length']) {
                        return false;
                    }
                }
                
                if (argProperties[arg]['has-number']) {
                    if (!/\d/.test(args[arg])) {
                        return false;
                    }
                }
                
                if (argProperties[arg]['has-char']) {
                    if (!/[A-Za-z]/.test(args[arg])) {
                        return false;
                    }
                }
                
                if (argProperties[arg]['has-upchar']) {
                    if (!/[A-Z]/.test(args[arg])) {
                        return false;
                    }
                }
                
                if (argProperties[arg]['has-special']) {
                    if (!/[^A-Za-z\d]/.test(args[arg])) {
                        return false;
                    }
                }

                if (!argProperties[arg]['exclude-from-ret-obj']) {
                    returnObj[arg] = args[arg];
                }
            }
        }

        return returnObj;
    };

    /**
    * Fix event keys before storing in database by removing dots and $ from the string, removing other prefixes and limiting length
    * @param {string} eventKey - key value to fix
    * @returns {string|false} escaped key or false if not possible to use key at all
    */
    common.fixEventKey = function (eventKey) {
        var shortEventName = eventKey.replace(/system\.|\.\.|\$/g, "");

        if (shortEventName.length >= 128) {
            return false;
        } else {
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
    * Output message as request response with provided http code
    * @param {params} params - params object
    * @param {number} returnCode - http code to use
    * @param {string} message - Message to output, will be encapsulated in JSON object under result property
    */
    common.returnMessage = function (params, returnCode, message) {
        //set provided in configuration headers
        var headers = {'Content-Type': 'application/json; charset=utf-8', 'Access-Control-Allow-Origin':'*'};
        var add_headers = (plugins.getConfig("security").api_additional_headers || "").replace(/\r\n|\r|\n|\/n/g, "\n").split("\n");
        var parts;
        for(var i = 0; i < add_headers.length; i++){
            if(add_headers[i] && add_headers[i].length){
                parts = add_headers[i].split(/:(.+)?/);
                if(parts.length == 3){
                    headers[parts[0]] = parts[1];
                }
            }
        }
        if (params && params.res && !params.blockResponses) {
            params.res.writeHead(returnCode, headers);
            if (params.qstring.callback) {
                params.res.write(params.qstring.callback + '(' + JSON.stringify({result: message}, escape_html_entities) + ')');
            } else {
                params.res.write(JSON.stringify({result: message}, escape_html_entities));
            }

            params.res.end();
        }
    };

    /**
    * Output message as request response with provided http code
    * @param {params} params - params object
    * @param {output} output - object to stringify and output
    * @param {string} noescape - prevent escaping HTML entities
    */
    common.returnOutput = function (params, output, noescape) {
        //set provided in configuration headers
        var headers = {'Content-Type': 'application/json; charset=utf-8', 'Access-Control-Allow-Origin':'*'};
        var add_headers = (plugins.getConfig("security").api_additional_headers || "").replace(/\r\n|\r|\n|\/n/g, "\n").split("\n");
        var parts;
        var escape = noescape ? undefined : escape_html_entities;
        for(var i = 0; i < add_headers.length; i++){
            if(add_headers[i] && add_headers[i].length){
                parts = add_headers[i].split(/:(.+)?/);
                if(parts.length == 3){
                    headers[parts[0]] = parts[1];
                }
            }
        }
        if (params && params.res && !params.blockResponses) {
            params.res.writeHead(200, headers);
            if (params.qstring.callback) {
                params.res.write(params.qstring.callback + '(' + JSON.stringify(output, escape) + ')');
            } else {
                params.res.write(JSON.stringify(output, escape));
            }

            params.res.end();
        }
    };
    var ipLogger = common.log('ip:api');
    
    /**
    * Get IP address from request object
    * @param {req} req - nodejs request object
    * @returns {string} ip address
    */
    common.getIpAddress = function(req) {
        var ipAddress = req.headers['x-forwarded-for'] || req.headers['x-real-ip'] || req.connection.remoteAddress || req.socket.remoteAddress || (req.connection.socket ? req.connection.socket.remoteAddress : '');
        /* Since x-forwarded-for: client, proxy1, proxy2, proxy3 */
        var ips = ipAddress.split(',');
        
        //if ignoreProxies not setup, use outmost left ip address
        if(!countlyConfig.ignoreProxies || !countlyConfig.ignoreProxies.length){
            ipLogger.d("From %s found ip %s", ipAddress, ips[0]);
            return ips[0];
        }
        //search for the outmost right ip address ignoring provided proxies
        var ip = "";
        for(var i = ips.length-1; i >= 0; i--){
            if(ips[i].trim() != "127.0.0.1" && (!countlyConfig.ignoreProxies || countlyConfig.ignoreProxies.indexOf(ips[i].trim()) === -1)){
                ip = ips[i].trim();
                break;
            }
        }
        ipLogger.d("From %s found ip %s", ipAddress, ip);
        return ip;
    };

    /**
    * Modifies provided object filling properties used in zero documents in the format object["2012.7.20.property"] = increment. 
    * Usualy used when filling up Countly metric model zero document
    * @param {params} params - {@link params} object
    * @param {object} object - object to fill
    * @param {string} property - meric value or segment or property to fill/increment
    * @param {number=} increment - by how much to increments, default is 1
    * @example
    * var obj = {};
    * common.fillTimeObjectZero(params, obj, "u", 1);
    * console.log(obj);
    * //outputs
    * { 'd.u': 1, 'd.2.u': 1, 'd.w8.u': 1 }
    */
    common.fillTimeObjectZero = function (params, object, property, increment) {
        var tmpIncrement = (increment) ? increment : 1,
            timeObj = params.time;

        if (!timeObj || !timeObj.yearly || !timeObj.month) {
            return false;
        }

        if (property instanceof Array) {
            for (var i = 0; i < property.length; i ++) {
                object['d.' + property[i]] = tmpIncrement;
                object['d.' + timeObj.month + '.' + property[i]] = tmpIncrement;

                // For properties that hold the unique visitor count we store weekly data as well.
                if (property[i].substr(-2) == ("." + common.dbMap["unique"]) ||
                    property[i] == common.dbMap["unique"] ||
                    property[i].substr(0,2) == (common.dbMap["frequency"] + ".") ||
                    property[i].substr(0,2) == (common.dbMap["loyalty"] + ".") ||
                    property[i].substr(0,3) == (common.dbMap["durations"] + ".") ||
                    property[i] == common.dbMap["paying"])
                {
                    object['d.' + "w" + timeObj.weekly + '.' + property[i]] = tmpIncrement;
                }
            }
        } else {
            object['d.' + property] = tmpIncrement;
            object['d.' + timeObj.month + '.' + property] = tmpIncrement;

            if (property.substr(-2) == ("." + common.dbMap["unique"]) ||
                property == common.dbMap["unique"] ||
                property.substr(0,2) == (common.dbMap["frequency"] + ".") ||
                property.substr(0,2) == (common.dbMap["loyalty"] + ".") ||
                property.substr(0,3) == (common.dbMap["durations"] + ".") ||
                property == common.dbMap["paying"])
            {
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
    * @example
    * var obj = {};
    * common.fillTimeObjectMonth(params, obj, "u", 1);
    * console.log(obj);
    * //outputs
    * { 'd.23.u': 1, 'd.23.12.u': 1 }
    */
    common.fillTimeObjectMonth = function (params, object, property, increment, forceHour) {
        var tmpIncrement = (increment) ? increment : 1,
            timeObj = params.time;

        if (!timeObj || !timeObj.yearly || !timeObj.month || !timeObj.weekly || !timeObj.day || !timeObj.hour) {
            return false;
        }

        if (property instanceof Array) {
            for (var i = 0; i < property.length; i ++) {
                object['d.' + timeObj.day + '.' + property[i]] = tmpIncrement;

                // If the property parameter contains a dot, hourly data is not saved in
                // order to prevent two level data (such as 2012.7.20.TR.u) to get out of control.
                if (forceHour || property[i].indexOf('.') === -1) {
                    object['d.' + timeObj.day + '.' + timeObj.hour + '.' + property[i]] = tmpIncrement;
                }
            }
        } else {
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
    * @param {id} string - id to prefix document ids, like app_id or segment id, etc
    * @param {array} metrics - array of metrics to record, as ["u","t", "n"]
    * @param {number=} value - value to increment all metrics for, default 1
    * @param {object} segments - object with segments to record data, key segment name and value segment value
    * @param {array} uniques - names of the metrics, which should be treated as unique, and stored in 0 docs and be estimated on output
    * @param {number} lastTimestamp - timestamp in seconds to be used to determine if unique metrics it unique for specific period
    * @example
    * //recording attribution
    * common.recordCustomMetric(params, "campaigndata", campaignId, ["clk", "aclk"], 1, {pl:"Android", brw:"Chrome"}, ["clk"], user["last_click"]);
    */
    common.recordCustomMetric = function(params, collection, id, metrics, value, segments, uniques, lastTimestamp){
		value = value || 1;
		var updateUsersZero = {},
		updateUsersMonth = {},
		tmpSet = {};
		var dbDateIds = common.getDateIds(params);
	
		for(var i = 0; i < metrics.length; i++){
			var metric = metrics[i],
				zeroObjUpdate = [],
				monthObjUpdate = [],
				escapedMetricVal, escapedMetricKey;
            
            if(uniques && uniques.indexOf(metric) !== -1){
                if (lastTimestamp) {
                    var currDate = common.getDate(params.time.timestamp, params.appTimezone),
                        lastDate = common.getDate(lastTimestamp, params.appTimezone),
                        secInMin = (60 * (currDate.getMinutes())) + currDate.getSeconds(),
                        secInHour = (60 * 60 * (currDate.getHours())) + secInMin,
                        secInMonth = (60 * 60 * 24 * (currDate.getDate() - 1)) + secInHour,
                        secInYear = (60 * 60 * 24 * (common.getDOY(params.time.timestamp, params.appTimezone) - 1)) + secInHour;
                        
                    if (lastTimestamp < (params.time.timestamp - secInMin)) {
                        updateUsersMonth['d.' + params.time.day + '.' + params.time.hour + '.' + metric] = 1;
                    }
            
                    if (lastTimestamp < (params.time.timestamp - secInHour)) {
                        updateUsersMonth['d.' + params.time.day + '.' + metric] = 1;
                    }
            
                    if (lastDate.getFullYear() == params.time.yearly &&
                        Math.ceil(common.moment(lastDate).format("DDD") / 7) < params.time.weekly) {
                        updateUsersZero["d.w" + params.time.weekly + '.' + metric] = 1;
                    }
            
                    if (lastTimestamp < (params.time.timestamp - secInMonth)) {
                        updateUsersZero['d.' + params.time.month + '.' + metric] = 1;
                    }
            
                    if (lastTimestamp < (params.time.timestamp - secInYear)) {
                        updateUsersZero['d.' + metric] = 1;
                    }
                }
                else{
                    common.fillTimeObjectZero(params, updateUsersZero, metric);
                    common.fillTimeObjectMonth(params, updateUsersMonth, metric, 1, true);
                }
            }
            else{
                zeroObjUpdate.push(metric);
                monthObjUpdate.push(metric);
            }
            if(segments){
                for(var j in segments){
                    if(segments[j]){
                        escapedMetricKey = j.replace(/^\$/, "").replace(/\./g, ":");
                        escapedMetricVal = (segments[j]+"").replace(/^\$/, "").replace(/\./g, ":");
                        tmpSet["meta." + escapedMetricKey] = escapedMetricVal;
                        if(uniques && uniques.indexOf(metric) !== -1){
                            if (lastTimestamp) {
                                var currDate = common.getDate(params.time.timestamp, params.appTimezone),
                                    lastDate = common.getDate(lastTimestamp, params.appTimezone),
                                    secInMin = (60 * (currDate.getMinutes())) + currDate.getSeconds(),
                                    secInHour = (60 * 60 * (currDate.getHours())) + secInMin,
                                    secInMonth = (60 * 60 * 24 * (currDate.getDate() - 1)) + secInHour,
                                    secInYear = (60 * 60 * 24 * (common.getDOY(params.time.timestamp, params.appTimezone) - 1)) + secInHour;
                                    
                                if (lastTimestamp < (params.time.timestamp - secInMin)) {
                                    updateUsersMonth['d.' + params.time.day + '.' + params.time.hour + '.' + escapedMetricVal + '.' + metric] = 1;
                                }
                        
                                if (lastTimestamp < (params.time.timestamp - secInHour)) {
                                    updateUsersMonth['d.' + params.time.day + '.' + escapedMetricVal + '.' + metric] = 1;
                                }
                        
                                if (lastDate.getFullYear() == params.time.yearly &&
                                    Math.ceil(common.moment(lastDate).format("DDD") / 7) < params.time.weekly) {
                                    updateUsersZero["d.w" + params.time.weekly + '.' + escapedMetricVal + '.' + metric] = 1;
                                }
                        
                                if (lastTimestamp < (params.time.timestamp - secInMonth)) {
                                    updateUsersZero['d.' + params.time.month + '.' + escapedMetricVal + '.' + metric] = 1;
                                }
                        
                                if (lastTimestamp < (params.time.timestamp - secInYear)) {
                                    updateUsersZero['d.' + escapedMetricVal + '.' + metric] = 1;
                                }
                            }
                            else{
                                common.fillTimeObjectZero(params, updateUsersZero, escapedMetricVal + '.' + metric);
                                common.fillTimeObjectMonth(params, updateUsersMonth, escapedMetricVal + '.' + metric, 1, true);
                            }
                        }
                        else{
                            zeroObjUpdate.push(escapedMetricVal+"."+metric);
                            monthObjUpdate.push(escapedMetricVal+"."+metric);
                        }
                    }
                }
            }

			common.fillTimeObjectZero(params, updateUsersZero, zeroObjUpdate, value);
			common.fillTimeObjectMonth(params, updateUsersMonth, monthObjUpdate, value);
		}
        
        if (Object.keys(updateUsersZero).length || Object.keys(tmpSet).length) {
            var update = {$set: {m: dbDateIds.zero, a: params.app_id + ""}};
            if (Object.keys(updateUsersZero).length) {
                update["$inc"] = updateUsersZero;
            }
            if (Object.keys(tmpSet).length) {
                update["$addToSet"] = tmpSet;
            }
			common.db.collection(collection).update({'_id': id + "_" + dbDateIds.zero}, update, {'upsert': true},function(){});
		}
		if (Object.keys(updateUsersMonth).length){
            common.db.collection(collection).update({'_id': id + "_" + dbDateIds.month}, {$set: {m: dbDateIds.month, a: params.app_id + ""}, '$inc': updateUsersMonth}, {'upsert': true},function(err, res){});
        }
	};

    /**
    * Get object of date ids that should be used in fetching standard metric model documents
    * @param {params} params - {@link params} object
    * return {object} with date ids, as {zero:"2017:0", month:"2017:2"}
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
    * return {number} difference in provided units
    */
    common.getDiff = function(moment1, moment2, measure){
        var divider = 1;
        switch (measure) {
            case "minutes":
                divider = 60;
                break;
            case "hours":
                divider = 60*60;
                break;
            case "days":
                divider = 60*60*24;
                break;
            case "weeks":
                divider = 60*60*24*7;
                break;
        }
        return Math.floor((moment1.unix() - moment2.unix())/divider);
    };
	
    /**
    * Compares two version strings with : as delimiter (which we used to escape dots in app versions)
    * @param {string} v1 - first version
    * @param {string} v2 - second version
    * @returns {number} 0 if they are both the same, 1 if first one is higher and -1 is second one is highet
    */
	common.versionCompare = function(v1, v2, options) {
		var lexicographical = options && options.lexicographical,
			zeroExtend = options && options.zeroExtend,
			v1parts = v1.split(':'),
			v2parts = v2.split(':');
	
		function isValidPart(x) {
			return (lexicographical ? /^\d+[A-Za-z]*$/ : /^\d+$/).test(x);
		}
	
		if (!v1parts.every(isValidPart) || !v2parts.every(isValidPart)) {
			return NaN;
		}
	
		if (zeroExtend) {
			while (v1parts.length < v2parts.length) v1parts.push("0");
			while (v2parts.length < v1parts.length) v2parts.push("0");
		}
	
		if (!lexicographical) {
			v1parts = v1parts.map(Number);
			v2parts = v2parts.map(Number);
		}
	
		for (var i = 0; i < v1parts.length; ++i) {
			if (v2parts.length == i) {
				return 1;
			}
	
			if (v1parts[i] == v2parts[i]) {
				continue;
			}
			else if (v1parts[i] > v2parts[i]) {
				return 1;
			}
			else {
				return -1;
			}
		}
	
		if (v1parts.length != v2parts.length) {
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
    common.adjustTimestampByTimezone = function(ts, tz){
        var d = new Date();
        d.setTimezone(tz);
        return ts - (d.getTimezoneOffset()*60);
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
        if (typeof is == 'string') {
            return common.dot(obj,is.split('.'), value);
        } else if (is.length==1 && value!==undefined) {
            obj[is[0]] = value;
            return value;
        } else if (is.length==0) {
            return obj;
        } else if (!obj) {
            return obj;
        } else {
            return common.dot(obj[is[0]],is.slice(1), value);
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
            if (array[i][property] === value) { return i; }
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
    common.optional = function(module, options){
        try {
            if (module[0] in {'.': 1}) {
                module = process.cwd() + module.substr(1);
            }
            return require(module);
        } catch(err) { 
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
            function check() {
                if (func()) {
                    resolve();
                } else if (count <= 0) {
                    reject('Timed out');
                } else {
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
    * @param {function} callback - function to run when update is done or failes, passing error and result as arguments
    */
    common.updateAppUser = function(params, update, callback){
        if(Object.keys(update).length){
            for(var i in update){
                if(i.indexOf("$") !== 0){
                    var err = "Unkown modifier " + i + " in " + update + " for " + params.href
                    console.log(err);
                    if(callback)
                        callback(err);
                    return;
                }
            }
            common.db.collection('app_users' + params.app_id).findAndModify({'_id': params.app_user_id},{}, update, {new:true, upsert:true}, function(err, res) {
                if(!err && res && res.value)
                    params.app_user = res.value;
                if(callback)
                    callback(err, res);
            });
        }
        else if(callback)
            callback();
    };
    
    /**
    * Update carrier from metrics to convert mnc/mcc code to carrier name
    * @param {object} metrics - metrics object from SDK request
    */
    common.processCarrier = function(metrics){
        if(metrics && metrics._carrier){
            var carrier = metrics._carrier+"";
            
            //random hash without spaces
            if(carrier.length === 16 && carrier.indexOf(" ") === -1){
                delete metrics._carrier;
                return;
            }
            
            //random code
            if((carrier.length === 5 || carrier.length === 6) && /^[0-9]+$/.test(carrier)){
                //check if mcc and mnc match some operator
                var arr = mcc_mnc_list.filter({ mccmnc: carrier });
                if(arr && arr.length && (arr[0].brand || arr[0].operator)){
                    carrier = arr[0].brand || arr[0].operator;
                }
                else{
                    delete metrics._carrier
                    return;
                }
            }
            
            carrier = carrier.replace(/\w\S*/g, function (txt) {
                return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
            });
            metrics._carrier = carrier;
        }
    };
}(common));

module.exports = common;