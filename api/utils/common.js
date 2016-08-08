var common = {},
    moment = require('moment'),
    time = require('time')(Date),
    crypto = require('crypto'),
    mongo = require('mongoskin'),
    logger = require('./log.js'),
    escape_html_entities = require('escape-html-in-json'),
    plugins = require('../../plugins/pluginManager.js'),
    countlyConfig = require('./../config', 'dont-enclose');

(function (common) {

    var log = logger('common');

    common.log = logger;

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

    common.dbEventMap = {
        'user_properties':'up',
        'timestamp':'ts',
        'segmentations':'sg',
        'count':'c',
        'sum':'s',
        'duration': 'dur',
        'previous_events': 'pe'
    };
    
    common.db = plugins.dbConnection(countlyConfig);

    common.config = countlyConfig;

    common.time = time;

    common.moment = moment;

    common.crypto = crypto;

    common.dbPromise = function() {
        var args = Array.prototype.slice.call(arguments);
        return new Promise(function(resolve, reject) {
            var collection = common.db.collection(args[0]),
                method = args[1];

            collection[method].apply(collection, args.slice(2).concat([function(err, result){
                if (err) { reject(err); }
                else { resolve(result); }
            }]));
        });
    };

    common.getDescendantProp = function (obj, desc) {
        desc = String(desc);

        if (desc.indexOf(".") === -1) {
            return obj[desc];
        }

        var arr = desc.split(".");
        while (arr.length && (obj = obj[arr.shift()]));

        return obj;
    };

    common.isNumber = function (n) {
        return !isNaN(parseFloat(n)) && isFinite(n);
    };
    
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

    common.safeDivision = function(dividend, divisor) {
        var tmpAvgVal;
        tmpAvgVal = dividend / divisor;
        if(!tmpAvgVal || tmpAvgVal == Number.POSITIVE_INFINITY){
            tmpAvgVal = 0;
        }
        return tmpAvgVal;
    }

    common.zeroFill = function(number, width) {
        width -= number.toString().length;

        if (width > 0) {
            return new Array(width + (/\./.test(number) ? 2 : 1)).join('0') + number;
        }

        return number + ""; // always return a string
    };

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

    common.sha1Hash = function (str, addSalt) {
        var salt = (addSalt) ? new Date().getTime() : '';
        return crypto.createHmac('sha1', salt + '').update(str + '').digest('hex');
    };

    common.md5Hash = function (str) {
        return crypto.createHash('md5').update(str + '').digest('hex');
    };

    // Creates a time object in the format object["2012.7.20.property"] = increment.
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

    // Adjusts the time to current app's configured timezone appTimezone and returns a time object.
    common.initTimeObj = function (appTimezone, reqTimestamp) {
        var currTimestamp,
            currDate,
            currDateWithoutTimestamp = new Date();
            
        if(common.isNumber(reqTimestamp))
            reqTimestamp = Math.round(reqTimestamp);

        // Check if the timestamp parameter exists in the request and is a 10 or 13 digit integer
        if (reqTimestamp && (reqTimestamp + "").length === 10 && common.isNumber(reqTimestamp)) {
            // If the received timestamp is greater than current time use the current time as timestamp
            currTimestamp = (reqTimestamp > time.time()) ? time.time() : parseInt(reqTimestamp, 10);
            currDate = new Date(currTimestamp * 1000);
        } else if (reqTimestamp && (reqTimestamp + "").length === 13 && common.isNumber(reqTimestamp)) {
            var tmpTimestamp = Math.round(parseInt(reqTimestamp, 10) / 1000);
            currTimestamp = (tmpTimestamp > time.time()) ? time.time() : tmpTimestamp;
            currDate = new Date(currTimestamp * 1000);
        } else {
            currTimestamp = time.time(); // UTC
            currDate = new Date();
        }
		
		currDate.setTimezone(appTimezone);
		currDateWithoutTimestamp.setTimezone(appTimezone);

        var tmpMoment = moment(currDate);

        return {
            now: tmpMoment,
            nowUTC: moment.utc(currDate),
            nowWithoutTimestamp: moment(currDateWithoutTimestamp),
            timestamp: currTimestamp,
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

    // Returns an extended Date object that has setTimezone function
    common.getDate = function (timestamp, timezone) {
        var tmpDate = (timestamp)? new Date(timestamp * 1000) : new Date();

        if (timezone) {
			tmpDate.setTimezone(timezone);
        }

        return tmpDate;
    };

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

    common.getDaysInYear = function (year) {
        if(new Date(year, 1, 29).getMonth() === 1) {
            return 366;
        } else {
            return 365;
        }
    };

    common.getISOWeeksInYear = function (year) {
        var d = new Date(year, 0, 1),
            isLeap = new Date(year, 1, 29).getMonth() === 1;

        //Check for a Jan 1 that's a Thursday or a leap year that has a
        //Wednesday Jan 1. Otherwise it's 52
        return d.getDay() === 4 || isLeap && d.getDay() === 3 ? 53 : 52
    };

    /*
     argProperties = { argName: { required: true, type: 'String', max-length: 25, min-length: 25, exclude-from-ret-obj: false }};
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
                        if (toString.call(args[arg]) !== '[object ' + argProperties[arg].type + ']') {
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

                if (!argProperties[arg]['exclude-from-ret-obj']) {
                    returnObj[arg] = args[arg];
                }
            }
        }

        return returnObj;
    };

    common.fixEventKey = function (eventKey) {
        var shortEventName = eventKey.replace(/system\.|\.\.|\$/g, "");

        if (shortEventName.length >= 128) {
            return false;
        } else {
            return shortEventName;
        }
    };

    common.blockResponses = function(params) {
        params.blockResponses = true;
    };

    common.unblockResponses = function(params) {
        params.blockResponses = false;
    };

    common.returnMessage = function (params, returnCode, message) {
        if (params && params.res && !params.blockResponses) {
            params.res.writeHead(returnCode, {'Content-Type': 'application/json; charset=utf-8', 'Access-Control-Allow-Origin':'*'});
            if (params.qstring.callback) {
                params.res.write(params.qstring.callback + '(' + JSON.stringify({result: message},escape_html_entities) + ')');
            } else {
                params.res.write(JSON.stringify({result: message},escape_html_entities));
            }

            params.res.end();
        }
    };

    common.returnOutput = function (params, output) {
        if (params && params.res && !params.blockResponses) {
            params.res.writeHead(200, {'Content-Type': 'application/json; charset=utf-8', 'Access-Control-Allow-Origin':'*'});
            if (params.qstring.callback) {
                params.res.write(params.qstring.callback + '(' + JSON.stringify(output,escape_html_entities) + ')');
            } else {
                params.res.write(JSON.stringify(output,escape_html_entities));
            }

            params.res.end();
        }
    };
    
    common.getIpAddress = function(req) {
        var ipAddress = req.headers['x-forwarded-for'] || req.headers['x-real-ip'] || req.connection.remoteAddress || req.socket.remoteAddress || (req.connection.socket ? req.connection.socket.remoteAddress : '');
    
        /* Since x-forwarded-for: client, proxy1, proxy2, proxy3 */
        return ipAddress.split(',')[0];
    };

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
                        updateUsersZero['d.' + '.' + metric] = 1;
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
    
    //adjust timestamp with app's timezone for timestamp queries that should equal bucket results
    common.adjustTimestampByTimezone = function(ts, tz){
        var d = new Date();
        d.setTimezone(tz);
        return ts + (d.getTimezoneOffset()*60);
    };
	

    // getter/setter for dot notatons:
    // getter: dot({a: {b: {c: 'string'}}}, 'a.b.c') === 'string'
    // getter: dot({a: {b: {c: 'string'}}}, ['a', 'b', 'c']) === 'string'
    // setter: dot({a: {b: {c: 'string'}}}, 'a.b.c', 5) === 5
    // getter: dot({a: {b: {c: 'string'}}}, 'a.b.c') === 5
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

    // Return plain object with key set to value
    common.o = function() {
        var o = {};
        for (var i = 0; i < arguments.length; i += 2) {
            o[arguments[i]] = arguments[i + 1];
        }
        return o;
    };

    // Return index of array element with property = value
    common.indexOf = function(array, property, value) {
        for (var i = 0; i < array.length; i += 1) {
            if (array[i][property] === value) { return i; }
        }
        return -1;
    };

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
}(common));

module.exports = common;