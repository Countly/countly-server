var common = {},
    moment = require('moment'),
    time = require('time')(Date),
    crypto = require('crypto'),
    mongo = require('mongoskin'),
    countlyConfig = require('./../config');

(function (common) {

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
        'count': 'c'
    };

    common.dbUserMap = {
        'device_id': 'did',
        'first_seen': 'fs',
        'last_seen': 'ls',
        'session_duration': 'sd',
        'total_session_duration': 'tsd',
        'session_count': 'sc',
        'device': 'd',
        'carrier': 'c',
        'city': 'cty',
        'country_code': 'cc',
        'platform': 'p',
        'platform_version': 'pv',
        'app_version': 'av'
    };

    var connectionString = (typeof countlyConfig.mongodb === "string")? countlyConfig.mongodb : (countlyConfig.mongodb.host + ':' + countlyConfig.mongodb.port + '/' + countlyConfig.mongodb.db + '?auto_reconnect=true');
    common.db = mongo.db(connectionString, {safe:false, maxPoolSize: countlyConfig.mongodb.max_pool_size || 1000});

    common.config = countlyConfig;

    common.time = time;

    common.moment = moment;

    common.crypto = crypto;

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

    common.zeroFill = function(number, width) {
        width -= number.toString().length;

        if (width > 0) {
            return new Array(width + (/\./.test(number) ? 2 : 1)).join('0') + number;
        }

        return number + ""; // always return a string
    };

    common.arrayAddUniq = function (arr, item) {
        if (arr.indexOf(item) === -1) {
            arr[arr.length] = item;
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
            property.substr(0,3) == (common.dbMap["durations"] + "."))
        {
            object[timeObj.yearly + ".w" + timeObj.weekly + '.' + property] = increment;
        }
    };

    // Adjusts the time to current app's configured timezone appTimezone and returns a time object.
    common.initTimeObj = function (appTimezone, reqTimestamp) {
        var currTimestamp,
            currDate;

        // Check if the timestamp parameter exists in the request and is an 10 digit integer
        if (reqTimestamp && (reqTimestamp + "").length === 10 && common.isNumber(reqTimestamp)) {
            // If the received timestamp is greater than current time use the current time as timestamp
            currTimestamp = (reqTimestamp > time.time()) ? time.time() : parseInt(reqTimestamp, 10);
            currDate = new Date(currTimestamp * 1000);
        } else {
            currTimestamp = time.time(); // UTC
            currDate = new Date();
        }

        currDate.setTimezone(appTimezone);

        var tmpMoment = moment(currDate);

        return {
            now: tmpMoment,
            nowUTC: moment.utc(currDate),
            timestamp: currTimestamp,
            yearly: tmpMoment.format("YYYY"),
            monthly: tmpMoment.format("YYYY.M"),
            daily: tmpMoment.format("YYYY.M.D"),
            hourly: tmpMoment.format("YYYY.M.D.H"),
            weekly: Math.ceil(tmpMoment.format("DDD") / 7)
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
                    } else if (argProperties[arg].type === 'Boolean') {
                        if (!(args[arg] !== true || args[arg] !== false || toString.call(args[arg]) !== '[object Boolean]')) {
                            return false;
                        }
                    } else if (argProperties[arg].type === 'Array') {
                        if (!Array.isArray(args[arg])) {
                            return false;
                        }
                    } else {
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

    common.returnMessage = function (params, returnCode, message) {
        params.res.writeHead(returnCode, {'Content-Type': 'application/json; charset=utf-8'});
        if (params.qstring.callback) {
            params.res.write(params.qstring.callback + '(' + JSON.stringify({result: message}) + ')');
        } else {
            params.res.write(JSON.stringify({result: message}));
        }
        params.res.end();
    };

    common.returnOutput = function (params, output) {
        params.res.writeHead(200, {'Content-Type': 'application/json; charset=utf-8'});
        if (params.qstring.callback) {
            params.res.write(params.qstring.callback + '(' + JSON.stringify(output) + ')');
        } else {
            params.res.write(JSON.stringify(output));
        }

        params.res.end();
    };

}(common));

module.exports = common;