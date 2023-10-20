/**
* This module processes main session and user information
* @module "api/parts/data/usage"
*/

/** @lends module:api/parts/data/usage */
var usage = {},
    common = require('./../../utils/common.js'),
    geoip = require('geoip-lite'),
    geocoder = require('offline-geocoder')(),
    log = require('../../utils/log.js')('api:usage'),
    async = require('async'),
    plugins = require('../../../plugins/pluginManager.js'),
    moment = require('moment-timezone');

/**
* Get location either from coordinate to populate country and city, or from country and city to get coordinates
* @param {params} params - params object
* @param {object} loc - location object    
* @param {number} loc.lat - lattitude    
* @param {number} loc.lon - longitude 
* @param {string} loc.country - country 
* @param {string} loc.city - city
* @param {string} loc.tz - timezone
* @returns {Promise} promise which resolves missing location parameters
**/
function locFromGeocoder(params, loc) {
    return new Promise(resolve => {
        try {
            let promise;
            if (loc.lat !== undefined && loc.lon !== undefined) {
                loc.gps = true;
                promise = geocoder.reverse(loc.lat, loc.lon);
            }
            else if (loc.city && loc.country) {
                loc.gps = false;
                promise = geocoder.location(loc.city, loc.country);
            }
            else {
                promise = Promise.resolve();
            }
            promise.then(data => {
                loc.country = loc.country || (data && data.country && data.country.id);
                loc.city = loc.city || (data && data.name);
                loc.lat = loc.lat === undefined ? data && data.coordinates && data.coordinates.latitude : loc.lat;
                loc.lon = loc.lon === undefined ? data && data.coordinates && data.coordinates.longitude : loc.lon;
                if (!loc.tz && data && data.tz) {
                    var zone = moment.tz.zone(data.tz);
                    if (zone) {
                        loc.tz = -zone.utcOffset(new Date(params.time.mstimestamp || Date.now()));
                    }
                }
                resolve(loc);
            }, err => {
                log.w('Error to reverse geocode: %j', err);
                resolve(loc);
            });
        }
        catch (err) {
            log.e('Error in geocoder: %j', err, err.stack);
            resolve(loc);
        }
    });
}

/**
* Get location data from ip address
* @param {object} loc - location object    
* @param {number} loc.lat - lattitude    
* @param {number} loc.lon - longitude 
* @param {string} loc.country - country 
* @param {string} loc.city - city
* @param {string} loc.tz - timezone
* @param {string} ip_address - User's ip address
* @returns {Promise} promise which resolves missing location parameters
**/
function locFromGeoip(loc, ip_address) {
    return new Promise(resolve => {
        try {
            var data = geoip.lookup(ip_address);
            if (data) {
                loc.country = loc.country || (data && data.country);
                loc.city = loc.city || (data && data.city);
                loc.region = loc.region || (data && data.region);
                loc.lat = loc.lat === undefined ? (data && data.ll && data.ll[0]) : loc.lat;
                loc.lon = loc.lon === undefined ? (data && data.ll && data.ll[1]) : loc.lon;
                resolve(loc);
            }
            else {
                return resolve(loc);
            }
        }
        catch (e) {
            log.e('Error in geoip: %j', e);
            resolve(loc);
        }
    });
}

/**
 * Set Location information in params but donot update it in users document
 * @param  {params} params - params object
 * @returns {Promise} promise which resolves upon completeing processing
 */
usage.setLocation = function(params) {
    if ('tz' in params.qstring) {
        params.user.tz = parseInt(params.qstring.tz);
        if (isNaN(params.user.tz)) {
            delete params.user.tz;
        }
    }

    return new Promise(resolve => {
        var loc = {
            country: params.qstring.country_code,
            city: params.qstring.city,
            tz: params.user.tz
        };

        if ('location' in params.qstring) {
            if (params.qstring.location) {
                var coords = params.qstring.location.split(',');
                if (coords.length === 2) {
                    var lat = parseFloat(coords[0]),
                        lon = parseFloat(coords[1]);

                    if (!isNaN(lat) && !isNaN(lon)) {
                        loc.lat = lat;
                        loc.lon = lon;
                    }
                }
            }
        }

        if (loc.lat !== undefined || (loc.country && loc.city)) {
            locFromGeocoder(params, loc).then(loc2 => {
                if (loc2.city && loc2.country && loc2.lat !== undefined) {
                    usage.setUserLocation(params, loc2);
                    return resolve();
                }
                else {
                    loc2.city = loc2.country === undefined ? undefined : loc2.city;
                    loc2.country = loc2.city === undefined ? undefined : loc2.country;
                    locFromGeoip(loc2, params.ip_address).then(loc3 => {
                        usage.setUserLocation(params, loc3);
                        return resolve();
                    });
                }
            });
        }
        else {
            locFromGeoip(loc, params.ip_address).then(loc2 => {
                usage.setUserLocation(params, loc2);
                return resolve();
            });
        }
    });
};

/**
 * Set user location in params
 * @param  {params} params - params object
 * @param  {object} loc - location info
 */
usage.setUserLocation = function(params, loc) {
    params.user.country = plugins.getConfig('api', params.app && params.app.plugins, true).country_data === false ? undefined : loc.country;
    params.user.region = plugins.getConfig('api', params.app && params.app.plugins, true).city_data === true ? loc.region : undefined;
    params.user.city = (plugins.getConfig('api', params.app && params.app.plugins, true).city_data === false ||
        plugins.getConfig('api', params.app && params.app.plugins, true).country_data === false) ? undefined : loc.city;
};

/**
* Process session_duration calls
* @param {params} params - params object
* @param {function} callback - callback when done
**/
usage.processSessionDuration = function(params, callback) {
    var updateUsers = {},
        session_duration = parseInt(params.qstring.session_duration),
        session_duration_limit = parseInt(plugins.getConfig("api", params.app && params.app.plugins, true).session_duration_limit);

    if (session_duration) {
        if (session_duration_limit && session_duration > session_duration_limit) {
            session_duration = session_duration_limit;
        }

        if (session_duration < 0) {
            session_duration = 30;
        }

        common.fillTimeObjectMonth(params, updateUsers, common.dbMap.events);
        common.fillTimeObjectMonth(params, updateUsers, common.dbMap.duration, session_duration);

        var postfix = common.crypto.createHash("md5").update(params.qstring.device_id).digest('base64')[0];
        var dbDateIds = common.getDateIds(params);

        common.writeBatcher.add("users", params.app_id + "_" + dbDateIds.month + "_" + postfix, {'$inc': updateUsers});
        params.qstring.session_duration = session_duration;

        if (!params.qstring.begin_session) {
            plugins.dispatch("/session/duration", {
                params: params,
                session_duration: session_duration
            });
        }

        if (callback) {
            callback();
        }
    }
};

/**
* Gets metrics to collect from plugins
* @param {params} params - params object
* @param {object} userProps - object where to populate with user properties to set to user document
* @returns {array} collected metrics
**/
usage.getPredefinedMetrics = function(params, userProps) {

    if (params.qstring.metrics) {
        common.processCarrier(params.qstring.metrics);
        if (params.qstring.metrics._os && params.qstring.metrics._os_version && !params.is_os_processed) {
            params.qstring.metrics._os += "";
            params.qstring.metrics._os_version += "";

            if (common.os_mapping[params.qstring.metrics._os.toLowerCase()] && !params.qstring.metrics._os_version.startsWith(common.os_mapping[params.qstring.metrics._os.toLowerCase()])) {
                params.qstring.metrics._os_version = common.os_mapping[params.qstring.metrics._os.toLowerCase()] + params.qstring.metrics._os_version;
                params.is_os_processed = true;
            }
            else {
                var value;
                var length;
                for (var key in common.os_mapping) {
                    if (params.qstring.metrics._os.toLowerCase().startsWith(key)) {
                        if (value) {
                            if (length < key.length) {
                                value = common.os_mapping[key];
                                length = key.length;
                            }
                        }
                        else {
                            value = common.os_mapping[key];
                            length = key.length;
                        }
                    }
                }

                if (!value) {
                    params.qstring.metrics._os_version = params.qstring.metrics._os[0].toLowerCase() + params.qstring.metrics._os_version;
                    params.is_os_processed = true;
                }
                else {
                    params.qstring.metrics._os_version = value + params.qstring.metrics._os_version;
                    params.is_os_processed = true;
                }
            }
        }
        if (params.qstring.metrics._app_version) {
            params.qstring.metrics._app_version += "";
            if (params.qstring.metrics._app_version.indexOf('.') === -1 && common.isNumber(params.qstring.metrics._app_version)) {
                params.qstring.metrics._app_version += ".0";
            }
        }
        if (!params.qstring.metrics._device_type && params.qstring.metrics._device) {
            var device = (params.qstring.metrics._device + "");
            if (params.qstring.metrics._os === "iOS" && (device.startsWith("iPhone") || device.startsWith("iPod"))) {
                params.qstring.metrics._device_type = "mobile";
            }
            else if (params.qstring.metrics._os === "iOS" && device.startsWith("iPad")) {
                params.qstring.metrics._device_type = "tablet";
            }
            else if (params.qstring.metrics._os === "watchOS" && device.startsWith("Watch")) {
                params.qstring.metrics._device_type = "wearable";
            }
            else if (params.qstring.metrics._os === "tvOS" && device.startsWith("AppleTV")) {
                params.qstring.metrics._device_type = "smarttv";
            }
            else if (params.qstring.metrics._os === "macOS" && (device.startsWith("Mac") || device.startsWith("iMac"))) {
                params.qstring.metrics._device_type = "desktop";
            }
        }
        if (!params.qstring.metrics._manufacturer && params.qstring.metrics._os) {
            if (params.qstring.metrics._os === "iOS") {
                params.qstring.metrics._manufacturer = "Apple";
            }
            else if (params.qstring.metrics._os === "watchOS") {
                params.qstring.metrics._manufacturer = "Apple";
            }
            else if (params.qstring.metrics._os === "tvOS") {
                params.qstring.metrics._manufacturer = "Apple";
            }
            else if (params.qstring.metrics._os === "macOS") {
                params.qstring.metrics._manufacturer = "Apple";
            }
        }
    }

    var predefinedMetrics = [
        {
            db: "carriers",
            metrics: [{
                name: "_carrier",
                set: "carriers",
                short_code: common.dbUserMap.carrier
            }]
        },
        {
            db: "devices",
            metrics: [
                {
                    name: "_device",
                    set: "devices",
                    short_code: common.dbUserMap.device
                },
                {
                    name: "_manufacturer",
                    set: "manufacturers",
                    short_code: common.dbUserMap.manufacturer
                }
            ]
        },
        {
            db: "device_details",
            metrics: [
                {
                    name: "_app_version",
                    set: "app_versions",
                    short_code: common.dbUserMap.app_version
                },
                {
                    name: "_os",
                    set: "os",
                    short_code: common.dbUserMap.platform
                },
                {
                    name: "_device_type",
                    set: "device_type",
                    short_code: common.dbUserMap.device_type
                },
                {
                    name: "_os_version",
                    set: "os_versions",
                    short_code: common.dbUserMap.platform_version
                },
                {
                    name: "_resolution",
                    set: "resolutions",
                    short_code: common.dbUserMap.resolution
                }
            ]
        },
        {
            db: "cities",
            metrics: [{
                is_user_prop: true,
                name: "city",
                set: "cities",
                short_code: common.dbUserMap.city
            }]
        }
    ];
    var isNewUser = (params.app_user && params.app_user[common.dbUserMap.first_seen]) ? false : true;
    plugins.dispatch("/session/metrics", {
        params: params,
        predefinedMetrics: predefinedMetrics,
        userProps: userProps,
        user: params.app_user,
        isNewUser: isNewUser
    });

    return predefinedMetrics;
};


/**
 * Process all metrics and return
 * @param  {params} params - params object
 * @returns {object} params
 */
usage.returnAllProcessedMetrics = function(params) {
    var userProps = {};
    var processedMetrics = {};
    var predefinedMetrics = usage.getPredefinedMetrics(params, userProps);

    for (var i = 0; i < predefinedMetrics.length; i++) {
        for (var j = 0; j < predefinedMetrics[i].metrics.length; j++) {
            var tmpMetric = predefinedMetrics[i].metrics[j];
            var recvMetricValue = undefined;

            if (tmpMetric.is_user_prop) {
                recvMetricValue = params.user[tmpMetric.name];
            }
            else if (params.qstring.metrics && (tmpMetric.name in params.qstring.metrics)) {
                recvMetricValue = params.qstring.metrics[tmpMetric.name];
            }

            // We check if country data logging is on and user's country is the configured country of the app
            if (tmpMetric.name === "country" && (plugins.getConfig("api", params.app && params.app.plugins, true).country_data === false || params.app_cc !== params.user.country)) {
                continue;
            }
            // We check if city data logging is on and user's country is the configured country of the app
            if (tmpMetric.name === "city" && (plugins.getConfig("api", params.app && params.app.plugins, true).city_data === false || params.app_cc !== params.user.country)) {
                continue;
            }

            if (recvMetricValue) {
                var escapedMetricVal = (recvMetricValue + "").replace(/^\$/, "").replace(/\./g, ":");
                processedMetrics[tmpMetric.short_code] = escapedMetricVal;
            }
        }
    }

    params.processed_metrics = processedMetrics;
    return processedMetrics;
};

/**
* Process session duration ranges for Session duration metric
* @param {number} totalSessionDuration - duration of session
* @param {params} params - params object
* @param {function} done - callback when done
**/
usage.processSessionDurationRange = function(totalSessionDuration, params, done) {
    var durationRanges = [
            [0, 10],
            [11, 30],
            [31, 60],
            [61, 180],
            [181, 600],
            [601, 1800],
            [1801, 3600]
        ],
        durationMax = 3601,
        calculatedDurationRange,
        updateUsers = {},
        updateUsersZero = {},
        dbDateIds = common.getDateIds(params),
        monthObjUpdate = [];

    if (totalSessionDuration >= durationMax) {
        calculatedDurationRange = (durationRanges.length) + '';
    }
    else {
        for (var i = 0; i < durationRanges.length; i++) {
            if (totalSessionDuration <= durationRanges[i][1] && totalSessionDuration >= durationRanges[i][0]) {
                calculatedDurationRange = i + '';
                break;
            }
        }
    }

    monthObjUpdate.push(common.dbMap.durations + '.' + calculatedDurationRange);
    common.fillTimeObjectMonth(params, updateUsers, monthObjUpdate);
    common.fillTimeObjectZero(params, updateUsersZero, common.dbMap.durations + '.' + calculatedDurationRange);
    var postfix = common.crypto.createHash("md5").update(params.qstring.device_id).digest('base64')[0];
    common.writeBatcher.add("users", params.app_id + "_" + dbDateIds.month + "_" + postfix, {'$inc': updateUsers});
    var update = {
        '$inc': updateUsersZero,
        '$set': {}
    };
    update.$set['meta_v2.d-ranges.' + calculatedDurationRange] = true;
    common.writeBatcher.add("users", params.app_id + "_" + dbDateIds.zero + "_" + postfix, update);

    if (done) {
        done();
    }
};

/**
* Process ending user session and calculate loyalty and frequency range metrics
* @param {object} dbAppUser - user's document
* @param {params} params - params object
* @param {function} done - callback when done
* @returns {void} void
**/
function processUserSession(dbAppUser, params, done) {
    var updateUsersZero = {},
        updateUsersMonth = {},
        usersMeta = {},
        sessionFrequency = [
            [0, 24],
            [24, 48],
            [48, 72],
            [72, 96],
            [96, 120],
            [120, 144],
            [144, 168],
            [168, 192],
            [192, 360],
            [360, 744]
        ],
        sessionFrequencyMax = 744,
        calculatedFrequency,
        uniqueLevels = [],
        uniqueLevelsZero = [],
        uniqueLevelsMonth = [],
        zeroObjUpdate = [],
        monthObjUpdate = [],
        dbDateIds = common.getDateIds(params);

    monthObjUpdate.push(common.dbMap.events);
    monthObjUpdate.push(common.dbMap.total);
    monthObjUpdate.push(params.user.country + '.' + common.dbMap.total);

    if (dbAppUser && dbAppUser[common.dbUserMap.first_seen]) {
        var userLastSeenTimestamp = dbAppUser[common.dbUserMap.last_seen],
            currDate = common.getDate(params.time.timestamp, params.appTimezone),
            userLastSeenDate = common.getDate(userLastSeenTimestamp, params.appTimezone),
            secInMin = (60 * (currDate.minutes())) + currDate.seconds(),
            secInHour = (60 * 60 * (currDate.hours())) + secInMin,
            secInMonth = (60 * 60 * 24 * (currDate.date() - 1)) + secInHour,
            secInYear = (60 * 60 * 24 * (common.getDOY(params.time.timestamp, params.appTimezone) - 1)) + secInHour;

        if (dbAppUser.cc !== params.user.country) {
            monthObjUpdate.push(params.user.country + '.' + common.dbMap.unique);
            zeroObjUpdate.push(params.user.country + '.' + common.dbMap.unique);
        }

        // Calculate the frequency range of the user

        if ((params.time.timestamp - userLastSeenTimestamp) >= (sessionFrequencyMax * 60 * 60)) {
            calculatedFrequency = sessionFrequency.length + '';
        }
        else {
            for (let i = 0; i < sessionFrequency.length; i++) {
                if ((params.time.timestamp - userLastSeenTimestamp) < (sessionFrequency[i][1] * 60 * 60) &&
                        (params.time.timestamp - userLastSeenTimestamp) >= (sessionFrequency[i][0] * 60 * 60)) {
                    calculatedFrequency = (i + 1) + '';
                    break;
                }
            }
        }

        //if for some reason we received past data lesser than last session timestamp
        //we can't calculate frequency for that part
        if (typeof calculatedFrequency !== "undefined") {
            zeroObjUpdate.push(common.dbMap.frequency + '.' + calculatedFrequency);
            monthObjUpdate.push(common.dbMap.frequency + '.' + calculatedFrequency);
            usersMeta['meta_v2.f-ranges.' + calculatedFrequency] = true;
        }

        if (userLastSeenTimestamp < (params.time.timestamp - secInMin)) {
            // We don't need to put hourly fragment to the unique levels array since
            // we will store hourly data only in sessions collection
            updateUsersMonth['d.' + params.time.day + '.' + params.time.hour + '.' + common.dbMap.unique] = 1;
        }

        if (userLastSeenTimestamp < (params.time.timestamp - secInHour)) {
            uniqueLevels[uniqueLevels.length] = params.time.daily;
            uniqueLevelsMonth.push(params.time.day);
        }

        if (userLastSeenDate.year() === params.time.yearly &&
                Math.ceil(userLastSeenDate.format("DDD") / 7) < params.time.weekly) {
            uniqueLevels[uniqueLevels.length] = params.time.yearly + ".w" + params.time.weekly;
            uniqueLevelsZero.push("w" + params.time.weekly);
        }

        if (userLastSeenTimestamp < (params.time.timestamp - secInMonth)) {
            uniqueLevels[uniqueLevels.length] = params.time.monthly;
            uniqueLevelsZero.push(params.time.month);
        }

        if (userLastSeenTimestamp < (params.time.timestamp - secInYear)) {
            uniqueLevels[uniqueLevels.length] = params.time.yearly;
            uniqueLevelsZero.push("Y");
        }

        for (let k = 0; k < uniqueLevelsZero.length; k++) {
            if (uniqueLevelsZero[k] === "Y") {
                updateUsersZero['d.' + common.dbMap.unique] = 1;
                if (dbAppUser.cc === params.user.country) {
                    updateUsersZero['d.' + params.user.country + '.' + common.dbMap.unique] = 1;
                }
            }
            else {
                updateUsersZero['d.' + uniqueLevelsZero[k] + '.' + common.dbMap.unique] = 1;
                if (dbAppUser.cc === params.user.country) {
                    updateUsersZero['d.' + uniqueLevelsZero[k] + '.' + params.user.country + '.' + common.dbMap.unique] = 1;
                }
            }
        }

        for (let l = 0; l < uniqueLevelsMonth.length; l++) {
            updateUsersMonth['d.' + uniqueLevelsMonth[l] + '.' + common.dbMap.unique] = 1;
            if (dbAppUser.cc === params.user.country) {
                updateUsersMonth['d.' + uniqueLevelsMonth[l] + '.' + params.user.country + '.' + common.dbMap.unique] = 1;
            }
        }
    }
    else {
        // User is not found in app_users collection so this means she is both a new and unique user.
        zeroObjUpdate.push(common.dbMap.unique);
        monthObjUpdate.push(common.dbMap.new);
        monthObjUpdate.push(common.dbMap.unique);

        zeroObjUpdate.push(params.user.country + '.' + common.dbMap.unique);
        monthObjUpdate.push(params.user.country + '.' + common.dbMap.new);
        monthObjUpdate.push(params.user.country + '.' + common.dbMap.unique);

        // First time user.
        calculatedFrequency = '0';

        zeroObjUpdate.push(common.dbMap.frequency + '.' + calculatedFrequency);
        monthObjUpdate.push(common.dbMap.frequency + '.' + calculatedFrequency);

        usersMeta['meta_v2.f-ranges.' + calculatedFrequency] = true;
    }

    usersMeta['meta_v2.countries.' + (params.user.country || "Unknown")] = true;

    common.fillTimeObjectZero(params, updateUsersZero, zeroObjUpdate);
    common.fillTimeObjectMonth(params, updateUsersMonth, monthObjUpdate);

    var postfix = common.crypto.createHash("md5").update(params.qstring.device_id).digest('base64')[0];
    if (Object.keys(updateUsersZero).length || Object.keys(usersMeta).length) {
        usersMeta.m = dbDateIds.zero;
        usersMeta.a = params.app_id + "";
        var updateObjZero = {$set: usersMeta};

        if (Object.keys(updateUsersZero).length) {
            updateObjZero.$inc = updateUsersZero;
        }
        common.writeBatcher.add("users", params.app_id + "_" + dbDateIds.zero + "_" + postfix, updateObjZero);
    }
    if (Object.keys(updateUsersMonth).length) {
        common.writeBatcher.add("users", params.app_id + "_" + dbDateIds.month + "_" + postfix, {
            $set: {
                m: dbDateIds.month,
                a: params.app_id + ""
            },
            '$inc': updateUsersMonth
        });
    }

    plugins.dispatch("/session/user", {
        params: params,
        dbAppUser: dbAppUser
    });

    processMetrics(dbAppUser, uniqueLevelsZero, uniqueLevelsMonth, params, done);
}

/**
* Process metrics from request into aggregated data
* @param {object} user - user's document
* @param {array} uniqueLevelsZero - unique properties of zero document
* @param {array} uniqueLevelsMonth - unique properties of month document
* @param {params} params - params object
* @param {function} done - callback when done
* @returns {boolean} true
**/
function processMetrics(user, uniqueLevelsZero, uniqueLevelsMonth, params, done) {
    var userProps = {},
        isNewUser = (user && user[common.dbUserMap.first_seen]) ? false : true,
        metricChanges = {};

    if (isNewUser) {
        userProps[common.dbUserMap.first_seen] = params.time.timestamp;
        userProps[common.dbUserMap.last_seen] = params.time.timestamp;
        userProps[common.dbUserMap.device_id] = params.qstring.device_id;
    }
    else {
        if (parseInt(user[common.dbUserMap.last_seen], 10) < params.time.timestamp) {
            userProps[common.dbUserMap.last_seen] = params.time.timestamp;
        }

        if (user[common.dbUserMap.country_code] !== params.user.country) {
            /*
                 Init metric changes object here because country code is not a part of
                 "metrics" object received from begin_session thus won't be tracked otherwise
            */
            metricChanges.uid = user.uid;
            metricChanges.ts = params.time.timestamp;
            metricChanges.cd = new Date();
            metricChanges[common.dbUserMap.country_code] = {
                "o": user[common.dbUserMap.country_code],
                "n": params.user.country
            };
        }

        if (user[common.dbUserMap.device_id] !== params.qstring.device_id) {
            userProps[common.dbUserMap.device_id] = params.qstring.device_id;
        }
    }

    var predefinedMetrics = usage.getPredefinedMetrics(params, userProps);

    var dateIds = common.getDateIds(params);
    var metaToFetch = {};
    if (plugins.getConfig("api", params.app && params.app.plugins, true).metric_limit > 0) {
        for (let i = 0; i < predefinedMetrics.length; i++) {
            for (let j = 0; j < predefinedMetrics[i].metrics.length; j++) {
                let tmpMetric = predefinedMetrics[i].metrics[j],
                    recvMetricValue = null,
                    postfix = null;
                if (tmpMetric.is_user_prop) {
                    recvMetricValue = params.user[tmpMetric.name];
                }
                else if (params.qstring.metrics && params.qstring.metrics[tmpMetric.name]) {
                    recvMetricValue = params.qstring.metrics[tmpMetric.name];
                }

                // We check if country data logging is on and user's country is the configured country of the app
                if (tmpMetric.name === "country" && (plugins.getConfig("api", params.app && params.app.plugins, true).country_data === false || params.app_cc !== params.user.country)) {
                    continue;
                }
                // We check if city data logging is on and user's country is the configured country of the app
                if (tmpMetric.name === "city" && (plugins.getConfig("api", params.app && params.app.plugins, true).city_data === false || params.app_cc !== params.user.country)) {
                    continue;
                }

                if (recvMetricValue) {
                    recvMetricValue = (recvMetricValue + "").replace(/^\$/, "").replace(/\./g, ":");
                    postfix = common.crypto.createHash("md5").update(recvMetricValue).digest('base64')[0];
                    metaToFetch[predefinedMetrics[i].db + params.app_id + "_" + dateIds.zero + "_" + postfix] = {
                        coll: predefinedMetrics[i].db,
                        id: params.app_id + "_" + dateIds.zero + "_" + postfix
                    };
                }
            }
        }
    }

    /**
    * Get meta of aggregated data
    * @param {string} id - id of the document in database
    * @param {function} callback - callback when done
    **/
    function fetchMeta(id, callback) {
        common.readBatcher.getOne(metaToFetch[id].coll, {'_id': metaToFetch[id].id}, {meta_v2: 1}, (err, metaDoc) => {
            var retObj = metaDoc || {};
            retObj.coll = metaToFetch[id].coll;
            callback(null, retObj);
        });
    }

    var metas = {};
    async.map(Object.keys(metaToFetch), fetchMeta, function(err, metaDocs) {
        for (let i = 0; i < metaDocs.length; i++) {
            if (metaDocs[i].coll && metaDocs[i].meta_v2) {
                metas[metaDocs[i]._id] = metaDocs[i].meta_v2;
            }
        }

        for (let i = 0; i < predefinedMetrics.length; i++) {
            for (let j = 0; j < predefinedMetrics[i].metrics.length; j++) {
                let tmpTimeObjZero = {},
                    tmpTimeObjMonth = {},
                    tmpSet = {},
                    needsUpdate = false,
                    zeroObjUpdate = [],
                    monthObjUpdate = [],
                    tmpMetric = predefinedMetrics[i].metrics[j],
                    recvMetricValue = "",
                    escapedMetricVal = "",
                    postfix = "";

                if (tmpMetric.is_user_prop) {
                    recvMetricValue = params.user[tmpMetric.name];
                }
                else if (params.qstring.metrics && params.qstring.metrics[tmpMetric.name]) {
                    recvMetricValue = params.qstring.metrics[tmpMetric.name];
                }

                // We check if country data logging is on and user's country is the configured country of the app
                if (tmpMetric.name === "country" && (plugins.getConfig("api", params.app && params.app.plugins, true).country_data === false || params.app_cc !== params.user.country)) {
                    continue;
                }
                // We check if city data logging is on and user's country is the configured country of the app
                if (tmpMetric.name === "city" && (plugins.getConfig("api", params.app && params.app.plugins, true).city_data === false || params.app_cc !== params.user.country)) {
                    continue;
                }

                if (recvMetricValue) {
                    escapedMetricVal = (recvMetricValue + "").replace(/^\$/, "").replace(/\./g, ":");
                    postfix = common.crypto.createHash("md5").update(escapedMetricVal).digest('base64')[0];

                    // Assign properties to app_users document of the current user
                    if (isNewUser || (!isNewUser && user[tmpMetric.short_code] !== escapedMetricVal)) {
                        userProps[tmpMetric.short_code] = escapedMetricVal;
                    }
                    var tmpZeroId = params.app_id + "_" + dateIds.zero + "_" + postfix;
                    var ignore = false;
                    if (metas[tmpZeroId] &&
                            metas[tmpZeroId][tmpMetric.set] &&
                            Object.keys(metas[tmpZeroId][tmpMetric.set]).length &&
                            Object.keys(metas[tmpZeroId][tmpMetric.set]).length >= plugins.getConfig("api", params.app && params.app.plugins, true).metric_limit &&
                            typeof metas[tmpZeroId][tmpMetric.set][escapedMetricVal] === "undefined") {
                        ignore = true;
                    }

                    //should metric be ignored for reaching the limit
                    if (!ignore) {

                        //making sure metrics are strings
                        needsUpdate = true;
                        tmpSet["meta_v2." + tmpMetric.set + "." + escapedMetricVal] = true;

                        monthObjUpdate.push(escapedMetricVal + '.' + common.dbMap.total);

                        if (isNewUser) {
                            zeroObjUpdate.push(escapedMetricVal + '.' + common.dbMap.unique);
                            monthObjUpdate.push(escapedMetricVal + '.' + common.dbMap.new);
                            monthObjUpdate.push(escapedMetricVal + '.' + common.dbMap.unique);
                        }
                        else if (!tmpMetric.is_user_prop && tmpMetric.short_code && user[tmpMetric.short_code] !== escapedMetricVal) {
                            zeroObjUpdate.push(escapedMetricVal + '.' + common.dbMap.unique);
                            monthObjUpdate.push(escapedMetricVal + '.' + common.dbMap.unique);
                        }
                        else {
                            for (let k = 0; k < uniqueLevelsZero.length; k++) {
                                if (uniqueLevelsZero[k] === "Y") {
                                    tmpTimeObjZero['d.' + escapedMetricVal + '.' + common.dbMap.unique] = 1;
                                }
                                else {
                                    tmpTimeObjZero['d.' + uniqueLevelsZero[k] + '.' + escapedMetricVal + '.' + common.dbMap.unique] = 1;
                                }
                            }

                            for (let l = 0; l < uniqueLevelsMonth.length; l++) {
                                tmpTimeObjMonth['d.' + uniqueLevelsMonth[l] + '.' + escapedMetricVal + '.' + common.dbMap.unique] = 1;
                            }
                        }
                    }


                    /*
                        If track_changes is not specifically set to false for a metric, track metric value changes on a per user level
                        with a document like below inside metric_changesAPPID collection
            
                        { "uid" : "1", "ts" : 1463778143, "d" : { "o" : "iPhone1", "n" : "iPhone2" }, "av" : { "o" : "1:0", "n" : "1:1" } }
                    */
                    if (predefinedMetrics[i].metrics[j].track_changes !== false && !isNewUser && user[tmpMetric.short_code] !== escapedMetricVal) {
                        if (!metricChanges.uid) {
                            metricChanges.uid = user.uid;
                            metricChanges.ts = params.time.timestamp;
                            metricChanges.cd = new Date();
                        }

                        metricChanges[tmpMetric.short_code] = {
                            "o": user[tmpMetric.short_code],
                            "n": escapedMetricVal
                        };
                    }
                    common.fillTimeObjectZero(params, tmpTimeObjZero, zeroObjUpdate);
                    common.fillTimeObjectMonth(params, tmpTimeObjMonth, monthObjUpdate);

                    if (needsUpdate) {
                        tmpSet.m = dateIds.zero;
                        tmpSet.a = params.app_id + "";
                        var tmpMonthId = params.app_id + "_" + dateIds.month + "_" + postfix,
                            updateObjZero = {$set: tmpSet};

                        if (Object.keys(tmpTimeObjZero).length) {
                            updateObjZero.$inc = tmpTimeObjZero;
                        }

                        if (Object.keys(tmpTimeObjZero).length || Object.keys(tmpSet).length) {
                            common.writeBatcher.add(predefinedMetrics[i].db, tmpZeroId, updateObjZero);
                        }

                        common.writeBatcher.add(predefinedMetrics[i].db, tmpMonthId, {
                            $set: {
                                m: dateIds.month,
                                a: params.app_id + ""
                            },
                            '$inc': tmpTimeObjMonth
                        });
                    }
                }
            }
        }

        if (!isNewUser) {
            /*
                If metricChanges object contains a uid this means we have at least one metric that has changed
                in this begin_session so we'll insert it into metric_changesAPPID collection.
                Inserted document has below format;
        
                { "uid" : "1", "ts" : 1463778143, "d" : { "o" : "iPhone1", "n" : "iPhone2" }, "av" : { "o" : "1:0", "n" : "1:1" } }
            */
            if (plugins.getConfig("api", params.app && params.app.plugins, true).metric_changes && metricChanges.uid && params.qstring.begin_session) {
                common.db.collection('metric_changes' + params.app_id).insert(metricChanges, function() {});
            }
        }

        if (done) {
            done();
        }
    });

    return true;
}

plugins.register("/i", function(ob) {
    var params = ob.params;
    var config = plugins.getConfig("api", params.app && params.app.plugins, true);
    if (params.qstring.end_session) {
        setTimeout(function() {
            //need to query app user again to get data modified by another request
            common.db.collection('app_users' + params.app_id).findOne({'_id': params.app_user_id }, function(err, dbAppUser) {
                if (!dbAppUser || err) {
                    return;
                }
                //if new session did not start during cooldown, then we can post process this session
                if (!dbAppUser[common.dbUserMap.has_ongoing_session]) {
                    usage.processSessionDurationRange(params.session_duration || 0, params);
                    let updates = [];
                    plugins.dispatch("/session/end", {
                        params: params,
                        dbAppUser: dbAppUser,
                        updates: updates
                    });
                    plugins.dispatch("/session/post", {
                        params: params,
                        dbAppUser: dbAppUser,
                        updates: updates,
                        session_duration: params.session_duration,
                        end_session: true
                    }, function() {
                        updates.push({$set: {sd: 0, data: {}}});
                        let updateUser = {};
                        for (let i = 0; i < updates.length; i++) {
                            updateUser = common.mergeQuery(updateUser, updates[i]);
                        }
                        common.updateAppUser(params, updateUser);
                    });


                }
            });
        }, params.qstring.ignore_cooldown ? 0 : config.session_cooldown);
    }
});

plugins.register("/sdk/user_properties", async function(ob) {
    var params = ob.params;
    var userProps = {};
    var update = {};
    params.user = {};
    var config = plugins.getConfig("api", params.app && params.app.plugins, true);

    if (params.qstring.tz) {
        var tz = parseInt(params.qstring.tz);
        if (isNaN(tz)) {
            userProps.tz = tz;
        }
    }

    if (params.qstring.country_code) {
        userProps.cc = params.qstring.country_code;
    }

    if (params.qstring.region) {
        userProps.rgn = params.qstring.region;
    }

    if (params.qstring.city) {
        userProps.cty = params.qstring.city;
    }

    if (params.qstring.location) {
        var coords = (params.qstring.location + "").split(',');
        if (coords.length === 2) {
            var lat = parseFloat(coords[0]),
                lon = parseFloat(coords[1]);

            if (!isNaN(lat) && !isNaN(lon)) {
                userProps.loc = {
                    gps: true,
                    geo: {
                        type: 'Point',
                        coordinates: [lon, lat]
                    },
                    date: params.time.mstimestamp
                };
            }
        }
    }

    if (params.qstring.begin_session && params.qstring.location === "") {
        //user opted out of location tracking
        userProps.cc = userProps.rgn = userProps.cty = 'Unknown';
        if (userProps.loc) {
            delete userProps.loc;
        }
        if (params.app_user.loc) {
            if (!update.$unset) {
                update.$unset = {};
            }
            update.$unset = {loc: 1};
        }
    }
    else if (params.qstring.begin_session && params.qstring.location !== "") {
        if (userProps.loc !== undefined || (userProps.cc && userProps.cty)) {
            let data = await locFromGeocoder(params, {
                country: userProps.cc,
                city: userProps.cc,
                tz: userProps.tz,
                lat: userProps.loc && userProps.loc.geo.coordinates[1],
                lon: userProps.loc && userProps.loc.geo.coordinates[0]
            });
            if (data) {
                if (!userProps.cc && data.country) {
                    userProps.cc = data.country;
                }

                if (!userProps.rgn && data.region) {
                    userProps.rgn = data.region;
                }

                if (!userProps.cty && data.city) {
                    userProps.cty = data.city;
                }

                if (plugins.getConfig('api', params.app && params.app.plugins, true).city_data === true && !userProps.loc && typeof data.lat !== "undefined" && typeof data.lon !== "undefined") {
                    // only override lat/lon if no recent gps location exists in user document
                    if (!params.app_user.loc || (params.app_user.loc.gps && params.time.mstimestamp - params.app_user.loc.date > 7 * 24 * 3600)) {
                        userProps.loc = {
                            gps: false,
                            geo: {
                                type: 'Point',
                                coordinates: [data.ll[1], data.ll[0]]
                            },
                            date: params.time.mstimestamp
                        };
                    }
                }
            }
        }
        else {
            try {
                let data = geoip.lookup(params.ip_address);
                if (data) {
                    if (!userProps.cc && data.country) {
                        userProps.cc = data.country;
                    }

                    if (!userProps.rgn && data.region) {
                        userProps.rgn = data.region;
                    }

                    if (!userProps.cty && data.city) {
                        userProps.cty = data.city;
                    }

                    if (plugins.getConfig('api', params.app && params.app.plugins, true).city_data === true && !userProps.loc && data.ll && typeof data.ll[0] !== "undefined" && typeof data.ll[1] !== "undefined") {
                        // only override lat/lon if no recent gps location exists in user document
                        if (!params.app_user.loc || (params.app_user.loc.gps && params.time.mstimestamp - params.app_user.loc.date > 7 * 24 * 3600)) {
                            userProps.loc = {
                                gps: false,
                                geo: {
                                    type: 'Point',
                                    coordinates: [data.ll[1], data.ll[0]]
                                },
                                date: params.time.mstimestamp
                            };
                        }
                    }
                }
            }
            catch (e) {
                log.e('Error in geoip: %j', e);
            }
        }
        if (!userProps.cc) {
            userProps.cc = "Unknown";
        }
        if (!userProps.cty) {
            userProps.cty = "Unknown";
        }
        if (!userProps.rgn) {
            userProps.rgn = "Unknown";
        }
    }

    if (config.country_data === false) {
        userProps.cc = 'Unknown';
        userProps.cty = 'Unknown';
    }

    if (config.city_data === false) {
        userProps.cty = 'Unknown';
    }

    params.user.country = userProps.cc || "Unknown";
    params.user.city = userProps.cty || "Unknown";

    //if we have metrics, let's process metrics
    if (params.qstring.metrics) {
        var up = usage.returnAllProcessedMetrics(params);

        if (Object.keys(up).length) {
            for (let key in up) {
                userProps[key] = up[key];
            }
        }
    }

    if (params.qstring.session_duration) {
        var session_duration = parseInt(params.qstring.session_duration),
            session_duration_limit = parseInt(plugins.getConfig("api", params.app && params.app.plugins, true).session_duration_limit);

        if (session_duration) {
            if (session_duration_limit && session_duration > session_duration_limit) {
                session_duration = session_duration_limit;
            }

            if (session_duration < 0) {
                session_duration = 30;
            }

            if (!update.$inc) {
                update.$inc = {};
            }

            update.$inc.sd = session_duration;
            update.$inc.tsd = session_duration;
            params.session_duration = (params.app_user.sd || 0) + session_duration;

            usage.processSessionDuration(params);
        }
    }

    if (!params.session_duration) {
        params.session_duration = params.app_user.sd || 0;
    }

    //if session began
    if (params.qstring.begin_session) {
        var lastEndSession = params.app_user[common.dbUserMap.last_end_session_timestamp];

        if (!params.app_user[common.dbUserMap.has_ongoing_session]) {
            userProps[common.dbUserMap.has_ongoing_session] = true;
        }

        userProps[common.dbUserMap.last_begin_session_timestamp] = params.time.timestamp;

        //check when last session ended and if it was less than cooldown
        if (!params.qstring.ignore_cooldown && lastEndSession && (params.time.timestamp - lastEndSession) < config.session_cooldown) {
            plugins.dispatch("/session/extend", {
                params: params,
                dbAppUser: params.app_user,
                updates: ob.updates
            });
            if (params.qstring.session_duration) {
                plugins.dispatch("/session/duration", {
                    params: params,
                    session_duration: params.qstring.session_duration
                });
            }
        }
        else {
            userProps.lsid = params.request_id;

            if (params.app_user[common.dbUserMap.has_ongoing_session]) {
                usage.processSessionDurationRange(params.session_duration || 0, params);

                //process duration from unproperly ended previous session
                plugins.dispatch("/session/post", {
                    params: params,
                    dbAppUser: params.app_user,
                    updates: ob.updates,
                    session_duration: params.session_duration,
                    end_session: false
                });
                userProps.sd = 0;
                userProps.data = {};
            }
            processUserSession(params.app_user, params);

            //new session
            var isNewUser = (params.app_user && params.app_user[common.dbUserMap.first_seen]) ? false : true;

            plugins.dispatch("/session/begin", {
                params: params,
                dbAppUser: params.app_user,
                updates: ob.updates,
                isNewUser: isNewUser
            });

            if (isNewUser) {
                userProps[common.dbUserMap.first_seen] = params.time.timestamp;
                userProps[common.dbUserMap.last_seen] = params.time.timestamp;
            }
            else {
                if (parseInt(params.app_user[common.dbUserMap.last_seen], 10) < params.time.timestamp) {
                    userProps[common.dbUserMap.last_seen] = params.time.timestamp;
                }
            }

            if (!update.$inc) {
                update.$inc = {};
            }

            update.$inc.sc = 1;
        }
    }
    else if (params.qstring.end_session) {
        // check if request is too old, ignore it
        userProps[common.dbUserMap.last_end_session_timestamp] = params.time.timestamp;
        if (params.app_user[common.dbUserMap.has_ongoing_session]) {
            if (!update.$unset) {
                update.$unset = {};
            }
            update.$unset[common.dbUserMap.has_ongoing_session] = "";
        }
    }

    if (!params.qstring.begin_session && !params.qstring.session_duration) {
        const dbDateIds = common.getDateIds(params),
            updateUsers = {};

        common.fillTimeObjectMonth(params, updateUsers, common.dbMap.events);
        const postfix = common.crypto.createHash("md5").update(params.qstring.device_id).digest('base64')[0];
        common.writeBatcher.add("users", params.app_id + "_" + dbDateIds.month + "_" + postfix, {'$inc': updateUsers});
    }

    if (params.qstring.events) {
        var eventCount = 0;
        for (let i = 0; i < params.qstring.events.length; i++) {
            let currEvent = params.qstring.events[i];
            if (currEvent.key === "[CLY]_orientation") {
                if (currEvent.segmentation && currEvent.segmentation.mode) {
                    userProps.ornt = currEvent.segmentation.mode;
                }
            }
            if (!(currEvent.key + "").startsWith("[CLY]_")) {
                eventCount++;
            }
        }
        if (eventCount > 0) {
            if (!update.$inc) {
                update.$inc = {};
            }

            update.$inc["data.events"] = eventCount;
        }
    }

    //do not write values that are already assignd to user
    for (var key in userProps) {
        if (userProps[key] === params.app_user[key]) {
            delete userProps[key];
        }
    }

    if (Object.keys(userProps).length) {
        update.$set = userProps;
    }

    if (Object.keys(update).length) {
        ob.updates.push(update);
    }
});

module.exports = usage;