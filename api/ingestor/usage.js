var usage = {},
    common = require('./../utils/common.js'),
    geoip = require('geoip-lite'),
    geocoder = require('./../../bin/offline-geocoder/src/index.js')(),
    log = require('./../utils/log.js')('ingestor:usage'),
    plugins = require('./../../plugins/pluginManager.js'),
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

usage.processCoreMetrics = function(params) {
    if (params && params.qstring && params.qstring.metrics) {
        common.processCarrier(params.qstring.metrics);

        if (params.qstring.metrics._carrier) {
            params.collectedMetrics[common.dbUserMap.carrier] = params.qstring.metrics._carrier;
        }
        if (params.qstring.metrics._os) {
            params.qstring.metrics._os += "";
            if (params.qstring.metrics._os_version && !params.is_os_processed) {
                params.qstring.metrics._os_version += "";

                if (common.os_mapping[params.qstring.metrics._os.toLowerCase()] && !params.qstring.metrics._os_version.startsWith(common.os_mapping[params.qstring.metrics._os.toLowerCase()])) {
                    params.qstring.metrics._os_version = common.os_mapping[params.qstring.metrics._os.toLowerCase()] + params.qstring.metrics._os_version;
                    params.is_os_processed = true;
                }
                else {
                    params.qstring.metrics._os = params.qstring.metrics._os.replace(/\[|\]/g, '');
                    params.qstring.metrics._os_version = "[" + params.qstring.metrics._os + "]" + params.qstring.metrics._os_version;
                    params.is_os_processed = true;
                }
                params.collectedMetrics[common.dbUserMap.platform_version] = params.qstring.metrics._os_version;
            }
            params.collectedMetrics[common.dbUserMap.platform] = params.qstring.metrics._os;
        }
        if (params.qstring.metrics._app_version) {
            params.qstring.metrics._app_version += "";
            if (params.qstring.metrics._app_version.indexOf('.') === -1 && common.isNumber(params.qstring.metrics._app_version)) {
                params.qstring.metrics._app_version += ".0";
            }
            params.collectedMetrics[common.dbUserMap.app_version] = params.qstring.metrics._app_version;
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
        if (params.qstring.metrics._device_type) {
            params.collectedMetrics[common.dbUserMap.device_type] = params.qstring.metrics._device_type;
        }
        if (params.qstring.metrics._device) {
            params.collectedMetrics[common.dbUserMap.device] = params.qstring.metrics._device;
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
        if (params.qstring.metrics._manufacturer) {
            params.collectedMetrics[common.dbUserMap.manufacturer] = params.qstring.metrics._manufacturer;
        }
        if (params.qstring.metrics._has_hinge) {
            var hasHingeValue = params.qstring.metrics._has_hinge;
            if (hasHingeValue === "true" || hasHingeValue === true || hasHingeValue === "hinged") {
                params.qstring.metrics._has_hinge = "hinged";
            }
            else {
                params.qstring.metrics._has_hinge = "not_hinged";
            }
            params.collectedMetrics[common.dbUserMap.has_hinge] = params.qstring.metrics._has_hinge;
        }
        if (params.qstring.metrics._resolution) {
            params.collectedMetrics[common.dbUserMap.resolution] = params.qstring.metrics._resolution;
        }
    }
};

usage;


/**
 * Process all metrics and return
 * @param  {params} params - params object
 * @returns {object} params
 */
usage.returnRequestMetrics = function(params) {
    usage.processCoreMetrics(params);
    for (var key in params.collectedMetrics) {
        // We check if country data logging is on and user's country is the configured country of the app
        if (key === "cc" && (plugins.getConfig("api", params.app && params.app.plugins, true).country_data === false || params.app_cc !== params.user.country)) {
            continue;
        }
        // We check if city data logging is on and user's country is the configured country of the app
        if (key === "cty" && (plugins.getConfig("api", params.app && params.app.plugins, true).city_data === false || params.app_cc !== params.user.country)) {
            continue;
        }

        if (params.collectedMetrics[key]) {
            var escapedMetricVal = (params.collectedMetrics[key] + "").replace(/^\$/, "").replace(/\./g, ":");
            params.collectedMetrics[key] = escapedMetricVal;
        }
        else {
            delete params.collectedMetrics[key];
        }
    }
    return params.collectedMetrics;
};

usage.processSession = function(ob) {
    var params = ob.params;
    var userProps = {};
    var session_duration = 0;
    var update = {};

    if (params.qstring.session_duration) {
        session_duration = parseInt(params.qstring.session_duration);
        var session_duration_limit = parseInt(plugins.getConfig("api", params.app && params.app.plugins, true).session_duration_limit);
        if (session_duration) {
            if (session_duration_limit && session_duration > session_duration_limit) {
                session_duration = session_duration_limit;
            }
            if (session_duration < 0) {
                session_duration = 30;
            }
        }
    }

    if (params.qstring.begin_session) {
        var lastEndSession = params.app_user[common.dbUserMap.last_end_session_timestamp];
        if (!params.app_user[common.dbUserMap.has_ongoing_session]) {
            userProps[common.dbUserMap.has_ongoing_session] = true;
        }

        if (!params.qstring.ignore_cooldown && lastEndSession && (params.time.timestamp - lastEndSession) < plugins.getConfig("api", params.app && params.app.plugins, true).session_cooldown) {
            console.log("Skipping because of cooldown");
            console.log(params.time.timestamp - lastEndSession);
            console.log(plugins.getConfig("api", params.app && params.app.plugins, true).session_cooldown);
            delete params.qstring.begin_session;//do not start a new session.
        }
        else {

            if (params.app_user[common.dbUserMap.has_ongoing_session]) {
                params.qstring.end_session = {"lsid": ob.params.app_user.lsid, "ls": ob.params.app_user.ls, "sd": ob.params.app_user.sd};
            }
            userProps[common.dbUserMap.last_begin_session_timestamp] = params.time.timestamp;
            userProps.lsid = params.request_id;

            if (params.app_user[common.dbUserMap.has_ongoing_session]) {
                var drill_updates = {};
                if (params.app_user.lsid) {
                    if (params.app_user.sd > 0) {
                        drill_updates.dur = params.app_user.sd;
                    }
                    if (params.app_user.custom && Object.keys(params.app_user.custom).length > 0) {
                        drill_updates.custom = JSON.parse(JSON.stringify(params.app_user.custom));
                    }
                    try {
                        var lasts = (params.qstring.end_session.ls * 1000);
                        let idsplit = params.app_user.lsid.split("_");
                        if (idsplit[3] && idsplit[3].length === 13) {
                            lasts = parseInt(idsplit[3]);
                        }
                        params.qstring.events = params.qstring.events || [];
                        params.qstring.events.unshift({
                            "_id": params.app_user.lsid,
                            "key": "[CLY]_session",
                            "segmentation": params.app_user.lsparams || { ended: "true" },
                            "dur": (drill_updates.dur || 0),
                            "count": 1,
                            "timestamp": lasts
                        });
                    }
                    catch (ex) {
                        log.e("Error adding previous session end event: " + ex);
                    }
                    //}
                }
                userProps.sd = 0 + session_duration;
                userProps.data = {};
            }
            //new session
            var isNewUser = (params.app_user && params.app_user[common.dbUserMap.first_seen]) ? false : true;
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
        if (!params.qstring.ignore_cooldown) {
            userProps[common.dbUserMap.last_end_session_timestamp] = params.time.timestamp;
        }
        else {
            var drill_updates2 = {};
            if (params.app_user.lsid) {
                drill_updates2.dur = (params.app_user.sd || 0) + (session_duration || 0);
                if (drill_updates2.dur === 0) {
                    delete drill_updates2.dur;
                }
                if (params.app_user.custom && Object.keys(params.app_user.custom).length > 0) {
                    drill_updates2.custom = JSON.parse(JSON.stringify(params.app_user.custom));
                }
                drill_updates2["sg.ended"] = "true";
                drill_updates2.lu = new Date();
                //if (drill_updates2.dur || drill_updates2.custom) {
                //ob.drill_updates.push({"updateOne": {"filter": {"_id": params.app_user.lsid}, "update": {"$set": drill_updates2}}});
                //}
                var lasts2 = (params.qstring.end_session.ls * 1000);
                let idsplit = params.app_user.lsid.split("_");
                if (idsplit[3] && idsplit[3].length === 13) {
                    lasts2 = parseInt(idsplit[3]);
                }
                params.qstring.events = params.qstring.events || [];
                params.qstring.events.unshift({
                    "_id": params.app_user.lsid,
                    "key": "[CLY]_session",
                    "segmentation": params.app_user.lsparams || { ended: "true" },
                    "dur": (drill_updates2.dur || 0),
                    "count": 1,
                    "timestamp": lasts2
                });

            }
            userProps.data = {};
        }
        if (params.app_user[common.dbUserMap.has_ongoing_session]) {
            if (!update.$unset) {
                update.$unset = {};
            }
            update.$unset[common.dbUserMap.has_ongoing_session] = "";
        }
    }

    if (!params.qstring.begin_session) {
        if (session_duration) {
            if (!update.$inc) {
                update.$inc = {};
            }
            update.$inc.sd = session_duration;
            update.$inc.tsd = session_duration;
            params.session_duration = (params.app_user.sd || 0) + session_duration;
        }
    }

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
    usage.processCoreMetrics(params); //Collexts core metrics

};

usage.processUserProperties = async function(ob) {
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
    var locationData;
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
                locationData = await locFromGeocoder(params, {
                    country: userProps.cc,
                    city: userProps.cc,
                    tz: userProps.tz,
                    lat: userProps.loc && userProps.loc.geo.coordinates[1],
                    lon: userProps.loc && userProps.loc.geo.coordinates[0]
                });

                if (!userProps.cc && locationData.country) {
                    userProps.cc = locationData.country;
                }

                if (!userProps.rgn && locationData.region) {
                    userProps.rgn = locationData.region;
                }

                if (!userProps.cty && locationData.city) {
                    userProps.cty = locationData.city;
                }
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
            let data = locationData || await locFromGeocoder(params, {
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
        //Collect all metrics
        var up = usage.returnRequestMetrics(params);
        if (Object.keys(up).length) {
            for (let key in up) {
                userProps[key] = up[key];
            }
        }
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
                currEvent.ce = false;
            }
            else {
                currEvent.ce = true;
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
};

module.exports = usage;
