var usage = {},
    common = require('./../../utils/common.js'),
    geoip = require('geoip-lite'),
    geocoder = require('offline-geocoder')(),
    log = require('../../utils/log.js')('api:usage'),
    async = require('async'),
    plugins = require('../../../plugins/pluginManager.js'),
    moment = require('moment-timezone');

(function (usage) {

    function locFromGeocoder(params, loc) {
        return new Promise(resolve => {
            try {
                let promise;
                if (loc.lat !== undefined && loc.lon !== undefined) {
                    loc.gps = true;
                    promise = geocoder.reverse(loc.lat, loc.lon);
                } else if (loc.city && loc.country) {
                    loc.gps = false;
                    promise = geocoder.location(loc.city, loc.country);
                } else {
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
                            loc.tz = -zone.offset(new Date(params.time.mstimestamp || Date.now()));
                        }
                    }
                    resolve(loc);
                }, err => {
                    log.w('Error to reverse geocode: %j', err);
                    resolve(loc);
                });
            } catch (err) {
                log.e('Error in geocoder: %j', err, err.stack);
                resolve(loc);
            } 
        });
    }

    function locFromGeoip(loc, ip_address) {
        return new Promise(resolve => {
            try {
                var data = geoip.lookup(ip_address);
                if (data) {
                    loc.country = loc.country || (data && data.country);
                    loc.city = loc.city || (data && data.city);
                    loc.lat = loc.lat === undefined ? (data && data.ll && data.ll[0]) : loc.lat;
                    loc.lon = loc.lon === undefined ? (data && data.ll && data.ll[1]) : loc.lon;
                    resolve(loc);
                } else {
                    return resolve(loc);
                }
            } catch (e) {
                log.e('Error in geoip: %j', e);
                resolve(loc);
            }
        });
    }

    function updateLoc(params, optout, loc) {
        var update = {}, substantialChange = false;

        loc.gps = loc.gps || false;
        if (optout) {
            loc.country = loc.city = 'Unknown';
            update.$unset = {loc: 1};
        } else {
            if (!loc.country) {
                loc.country = loc.city = 'Unknown';
            } else if (!loc.city) {
                loc.city = 'Unknown';
            }
        }

        params.user.country = loc.country;
        params.user.city = loc.city;

        if (!params.app_user || params.app_user[common.dbUserMap.country_code] !== loc.country) {
            update.$set = {[common.dbUserMap.country_code]: loc.country};
        }
        if (!params.app_user || params.app_user[common.dbUserMap.city] !== loc.city) {
            if (!update.$set) { update.$set = {}; }
            update.$set[common.dbUserMap.city] = loc.city;
        }
        if (!params.app_user || (loc.tz !== undefined && params.app_user.tz !== loc.tz)) {
            if (!update.$set) { update.$set = {}; }
            update.$set.tz = loc.tz;
        }

        if (!optout) {
            substantialChange = substantialChange || !params.app_user || !params.app_user.loc || !params.app_user.loc.gps;
            if (loc.lat !== undefined && (loc.gps || substantialChange || (params.time.mstimestamp - params.app_user.loc.date) > 7 * 24 * 3600)) {
                // only override lat/lon if no recent gps location exists in user document
                if (!update.$set) { update.$set = {}; }
                update.$set.loc = params.user.loc = {
                    gps: loc.gps,
                    geo: {
                        type: 'Point',
                        coordinates: [loc.lat, loc.lon]
                    },
                    date: params.time.mstimestamp
                };
            } else if (loc.lat === undefined) {
                // no lat/lon, using existing one if any (assuming dev uses gps)
                params.user.loc = params.app_user.loc;
            }
        }

        if (update.$set || update.$unset) {
            common.updateAppUser(params, update);
        }
    }

    usage.processLocationRequired = function (params) {
        return !params.user.locationProcessed && ('location' in params.qstring || 'country_code' in params.qstring || 'city' in params.qstring || 'tz' in params.qstring || (params.qstring.begin_session && params.ip_address));
    };

    usage.processLocation = function (params) {
        params.user.locationProcessed = true;

        if ('tz' in params.qstring) {
            params.user.tz = parseInt(params.qstring.tz);
            if (isNaN(params.user.tz)) {
                delete params.user.tz;
            }
        }

        // only tz, no location
        if (params.user.tz !== undefined && !('location' in params.qstring || 'country_code' in params.qstring || 'city' in params.qstring || (params.qstring.begin_session && params.ip_address))) {
            common.updateAppUser(params, {$set: {tz: params.user.tz}});
            return Promise.resolve();
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
                } else {
                    updateLoc(params, true, loc);
                    return resolve();
                }
            }

            if (loc.lat !== undefined || (loc.country && loc.city)) {
                locFromGeocoder(params, loc).then(loc => {
                    if (loc.city && loc.country && loc.lat !== undefined) {
                        updateLoc(params, false, loc);
                        return resolve();
                    } else {
                        loc.city = loc.country === undefined ? undefined : loc.city;
                        loc.country = loc.city === undefined ? undefined : loc.country;
                        locFromGeoip(loc, params.ip_address).then(loc => {
                            updateLoc(params, false, loc);
                            return resolve();
                        });
                    }
                });
            } else {
                locFromGeoip(loc, params.ip_address).then(loc => {
                    updateLoc(params, false, loc);
                    return resolve();
                });
            }
        })
    };

    // Performs geoip lookup for the IP address of the app user
    usage.beginUserSession = function (params, done) {
        var dbAppUser = params.app_user
        if(dbAppUser){
            var lastTs = dbAppUser[common.dbUserMap['last_end_session_timestamp']] || dbAppUser[common.dbUserMap['last_begin_session_timestamp']];
            if (!lastTs || (params.time.timestamp - lastTs) > plugins.getConfig("api").session_cooldown) {
                //process duration from unproperly ended previous session
                plugins.dispatch("/session/post", {params:params, dbAppUser:dbAppUser, end_session:false});
                if (dbAppUser && dbAppUser[common.dbUserMap['session_duration']]) {
                    processSessionDurationRange(dbAppUser[common.dbUserMap['session_duration']], params, function(){
                        processUserSession(dbAppUser, params, done);
                    });
                }
                else{
                    processUserSession(dbAppUser, params, done);
                }
            }
            else{
                 processUserSession(dbAppUser, params, done);
            }
        }
        else{
            processUserSession(dbAppUser, params, done);
        }
    };

    usage.endUserSession = function (params, done) {
        //check if end_session is not too old and ignore if it is
        if(params.time.timestamp >= params.time.nowWithoutTimestamp.unix() - plugins.getConfig("api").session_duration_limit){
            // As soon as we receive the end_session we set the timestamp
            // This timestamp is used inside processUserSession
            var userProps = {};
            userProps[common.dbUserMap['last_end_session_timestamp']] = params.time.timestamp;
            params.app_user[common.dbUserMap['last_end_session_timestamp']] = params.time.timestamp;
    
            common.updateAppUser(params, {'$set': userProps});
    
            setTimeout(function() {
                //need to query app user again to get data modified by another request
                common.db.collection('app_users' + params.app_id).findOne({'_id': params.app_user_id }, function (err, dbAppUser){
                    if (!dbAppUser || err) {
                        return done ? done() : false;
                    }
    
                    var lastBeginSession = dbAppUser[common.dbUserMap['last_begin_session_timestamp']],
                        currDateWithoutTimestamp = new Date();
    
                    // We can't use the params.time.timestamp since we are inside a setTimeout
                    // and we need the actual timestamp
                    currDateWithoutTimestamp.setTimezone(params.appTimezone);
                    var currTimestamp = Math.round(currDateWithoutTimestamp.getTime() / 1000);
    
    
                    // If ongoing session flag is set and there is a 11 second difference between the current
                    // timestamp and the timestamp when the last begin_session received then remove the flag
                    // to let the next end_session complete the session
                    if (dbAppUser[common.dbUserMap['has_ongoing_session']] && (currTimestamp - lastBeginSession) > 11) {
                        var userProps = {};
                        userProps[common.dbUserMap['has_ongoing_session']] = 1;
                        common.updateAppUser(params, {'$unset': userProps}, function() {
                            endSession(true);
                        });
                    } else {
                        endSession();
                    }
                    function endSession(overrideFlag) {
                        // If user does not have an ongoing session end it
                        // Ongoing session flag is set inside processUserSession
                        if (overrideFlag || !dbAppUser[common.dbUserMap['has_ongoing_session']]) {
                            
                            plugins.dispatch("/session/end", {params:params, dbAppUser:dbAppUser});
                            plugins.dispatch("/session/post", {params:params, dbAppUser:dbAppUser, end_session:true});
    
                            // If the user does not exist in the app_users collection or she does not have any
                            // previous session duration stored than we dont need to calculate the session
                            // duration range for this user.
                            if (dbAppUser[common.dbUserMap['session_duration']]) {
                                processSessionDurationRange(dbAppUser[common.dbUserMap['session_duration']], params, done);
                            }
                            else{
                                return done ? done() : false;
                            }
                        }
                        else{
                            return done ? done() : false;
                        }
                    }
                });
            }, 10000);
        }
        else{
            return done ? done() : false;
        }
    };

    usage.processSessionDuration = function (params, callback) {
        var updateUsers = {},
            session_duration = parseInt(params.qstring.session_duration);

        if (session_duration == (session_duration | 0)) {
            if (plugins.getConfig("api").session_duration_limit && session_duration > plugins.getConfig("api").session_duration_limit) {
                session_duration = plugins.getConfig("api").session_duration_limit;
            }

            if (session_duration < 0) {
                session_duration = 30;
            }

            common.fillTimeObjectMonth(params, updateUsers, common.dbMap['events']);
            common.fillTimeObjectMonth(params, updateUsers, common.dbMap['duration'], session_duration);

            var postfix = common.crypto.createHash("md5").update(params.qstring.device_id).digest('base64')[0];
            var dbDateIds = common.getDateIds(params);
            common.db.collection('users').update({'_id': params.app_id + "_" + dbDateIds.month + "_" + postfix}, {'$inc': updateUsers}, function(){});
            
            var update = {'$inc': {'sd': session_duration, 'tsd': session_duration}};         
            common.updateAppUser(params, update, function(){
                plugins.dispatch("/session/duration", {params:params, session_duration:session_duration});
                if (callback) {
                    callback();
                }
            });   
        }
    };

    usage.getPredefinedMetrics = function(params, userProps){
        var predefinedMetrics = [
            {
                db: "carriers",
                metrics: [{ name: "_carrier", set: "carriers", short_code: common.dbUserMap['carrier'] }]
            },
            {
                db: "devices",
                metrics: [{ name: "_device", set: "devices", short_code: common.dbUserMap['device'] }]
            },
            {
                db: "device_details",
                metrics: [
                    { name: "_app_version", set: "app_versions", short_code: common.dbUserMap['app_version'] },
                    { name: "_os", set: "os", short_code: common.dbUserMap['platform'] },
                    { name: "_os_version", set: "os_versions", short_code: common.dbUserMap['platform_version'] },
                    { name: "_resolution", set: "resolutions", short_code: common.dbUserMap['resolution'] }
                ]
            },
            {
                db: "cities",
                metrics: [{ is_user_prop:true, name: "city", set: "cities", short_code: common.dbUserMap['city'] }]
            }
        ];
        var isNewUser = (params.app_user && params.app_user[common.dbUserMap['first_seen']])? false : true;
        plugins.dispatch("/session/metrics", {params:params, predefinedMetrics:predefinedMetrics, userProps:userProps, user:params.app_user, isNewUser:isNewUser});
        
        return predefinedMetrics;
    };
    
    usage.processMetrics = function(params){
        var userProps = {};
        var predefinedMetrics = usage.getPredefinedMetrics(params, userProps);
        var isNewUser = (params.app_user && params.app_user[common.dbUserMap['first_seen']])? false : true;
        
        for (var i=0; i < predefinedMetrics.length; i++) {
            for (var j=0; j < predefinedMetrics[i].metrics.length; j++) {
                var tmpMetric = predefinedMetrics[i].metrics[j],
                    recvMetricValue = null;
                if (tmpMetric.is_user_prop) {
                    recvMetricValue = params.user[tmpMetric.name];
                } else if (params.qstring.metrics && params.qstring.metrics[tmpMetric.name]) {
                    recvMetricValue = params.qstring.metrics[tmpMetric.name];
                }

                // We check if city data logging is on and user's country is the configured country of the app
                if (tmpMetric.name == "city" && (plugins.getConfig("api").city_data === false || params.app_cc != params.user.country)) {
                    continue;
                }
                
                if (recvMetricValue) {
                    var escapedMetricVal = (recvMetricValue+"").replace(/^\$/, "").replace(/\./g, ":");
                    
                    // Assign properties to app_users document of the current user
                    if (isNewUser || (!isNewUser && params.app_user[tmpMetric.short_code] != escapedMetricVal)) {
                        userProps[tmpMetric.short_code] = escapedMetricVal;
                    }
                }
            }
        }
        
        if(Object.keys(userProps).length){
            userProps.mt = true;
            common.updateAppUser(params, {"$set" : userProps});
        }
    };
    
    function processSessionDurationRange(totalSessionDuration, params, done) {
        var durationRanges = [
                [0,10],
                [11,30],
                [31,60],
                [61,180],
                [181,600],
                [601,1800],
                [1801,3600]
            ],
            durationMax = 3601,
            calculatedDurationRange,
            updateUsers = {},
            updateUsersZero = {},
            dbDateIds = common.getDateIds(params),
            monthObjUpdate = [];

        if (totalSessionDuration >= durationMax) {
            calculatedDurationRange = (durationRanges.length) + '';
        } else {
            for (var i=0; i < durationRanges.length; i++) {
                if (totalSessionDuration <= durationRanges[i][1] && totalSessionDuration >= durationRanges[i][0]) {
                    calculatedDurationRange = i + '';
                    break;
                }
            }
        }

        monthObjUpdate.push(common.dbMap['events']);
        monthObjUpdate.push(common.dbMap['durations'] + '.' + calculatedDurationRange);
        common.fillTimeObjectMonth(params, updateUsers, monthObjUpdate);
        common.fillTimeObjectZero(params, updateUsersZero, common.dbMap['durations'] + '.' + calculatedDurationRange);
        var postfix = common.crypto.createHash("md5").update(params.qstring.device_id).digest('base64')[0];
        common.db.collection('users').update({'_id': params.app_id + "_" + dbDateIds.month + "_" + postfix}, {'$inc': updateUsers}, function(){});
        var update = {'$inc': updateUsersZero, '$set': {}};
        update["$set"]['meta_v2.d-ranges.'+calculatedDurationRange] = true;
        common.db.collection('users').update({'_id': params.app_id + "_" + dbDateIds.zero + "_" + postfix}, update, function(){});

        // sd: session duration. common.dbUserMap is not used here for readability purposes.
        common.updateAppUser(params, {'$set': {'sd': 0}}, function(){
            return done ? done() : false;
        });
    }

    function processUserSession(dbAppUser, params, done) {
        var updateUsersZero = {},
            updateUsersMonth = {},
            updateCities = {},
            usersMeta = {},
            loyaltyRanges = [
                [0,1],
                [2,2],
                [3,5],
                [6,9],
                [10,19],
                [20,49],
                [50,99],
                [100,499]
            ],
            sessionFrequency = [
                [0,1],
                [1,24],
                [24,48],
                [48,72],
                [72,96],
                [96,120],
                [120,144],
                [144,168],
                [168,192],
                [192,360],
                [360,744]
            ],
            sessionFrequencyMax = 744,
            calculatedFrequency,
            loyaltyMax = 500,
            calculatedLoyaltyRange,
            uniqueLevels = [],
            uniqueLevelsZero = [],
            uniqueLevelsMonth = [],
            isNewUser = false,
            zeroObjUpdate = [],
            monthObjUpdate = [],
            dbDateIds = common.getDateIds(params);

        monthObjUpdate.push(common.dbMap['events']);
        monthObjUpdate.push(common.dbMap['total']);
        monthObjUpdate.push(params.user.country + '.' + common.dbMap['total']);

        if (dbAppUser && dbAppUser[common.dbUserMap['first_seen']]) {
            var userLastSeenTimestamp = dbAppUser[common.dbUserMap['last_seen']],
                currDate = common.getDate(params.time.timestamp, params.appTimezone),
                userLastSeenDate = common.getDate(userLastSeenTimestamp, params.appTimezone),
                secInMin = (60 * (currDate.getMinutes())) + currDate.getSeconds(),
                secInHour = (60 * 60 * (currDate.getHours())) + secInMin,
                secInMonth = (60 * 60 * 24 * (currDate.getDate() - 1)) + secInHour,
                secInYear = (60 * 60 * 24 * (common.getDOY(params.time.timestamp, params.appTimezone) - 1)) + secInHour;

            // If the last end_session is received less than 15 seconds ago we will ignore
            // current begin_session request and mark this user as having an ongoing session
            var lastEndSession = dbAppUser[common.dbUserMap['last_end_session_timestamp']];

            if (!params.qstring.ignore_cooldown && lastEndSession && (params.time.timestamp - lastEndSession) < plugins.getConfig("api").session_cooldown) {
                plugins.dispatch("/session/extend", {params:params});

                var userProps = {};
                userProps[common.dbUserMap['has_ongoing_session']] = true;
                userProps[common.dbUserMap['last_begin_session_timestamp']] = params.time.timestamp;
                
                common.updateAppUser(params, {$set:userProps});

                if (done) { done(); }
                return true;
            }

            // Calculate the frequency range of the user

            if ((params.time.timestamp - userLastSeenTimestamp) >= (sessionFrequencyMax * 60 * 60)) {
                calculatedFrequency = sessionFrequency.length + '';
            } else {
                for (var i=0; i < sessionFrequency.length; i++) {
                    if ((params.time.timestamp - userLastSeenTimestamp) < (sessionFrequency[i][1] * 60 * 60) &&
                        (params.time.timestamp - userLastSeenTimestamp) >= (sessionFrequency[i][0] * 60 * 60)) {
                        calculatedFrequency = (i + 1) + '';
                        break;
                    }
                }
            }

            // Calculate the loyalty range of the user

            var userSessionCount = dbAppUser[common.dbUserMap['session_count']] + 1;

            if (userSessionCount >= loyaltyMax) {
                calculatedLoyaltyRange = loyaltyRanges.length + '';
            } else {
                for (var i = 0; i < loyaltyRanges.length; i++) {
                    if (userSessionCount <= loyaltyRanges[i][1] && userSessionCount >= loyaltyRanges[i][0]) {
                        calculatedLoyaltyRange = i + '';
                        break;
                    }
                }
            }

            if (userLastSeenTimestamp < (params.time.timestamp - secInMin)) {
                // We don't need to put hourly fragment to the unique levels array since
                // we will store hourly data only in sessions collection
                updateUsersMonth['d.' + params.time.day + '.' + params.time.hour + '.' + common.dbMap['unique']] = 1;
            }

            if (userLastSeenTimestamp < (params.time.timestamp - secInHour)) {
                uniqueLevels[uniqueLevels.length] = params.time.daily;
                uniqueLevelsMonth.push(params.time.day);
            }

            if (userLastSeenDate.getFullYear() == params.time.yearly &&
                Math.ceil(common.moment(userLastSeenDate).tz(params.appTimezone).format("DDD") / 7) < params.time.weekly) {
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

            for (var k = 0; k < uniqueLevelsZero.length; k++) {
                if (uniqueLevelsZero[k] == "Y") {
                    updateUsersZero['d.' + common.dbMap['unique']] = 1;
                    updateUsersZero['d.' + common.dbMap['frequency'] + '.' + calculatedFrequency] = 1;
                    updateUsersZero['d.' + common.dbMap['loyalty'] + '.' + calculatedLoyaltyRange] = 1;
                    updateUsersZero['d.' + params.user.country + '.' + common.dbMap['unique']] = 1;
               } else {
                    updateUsersZero['d.' + uniqueLevelsZero[k] + '.' + common.dbMap['unique']] = 1;
                    updateUsersZero['d.' + uniqueLevelsZero[k] + '.' + common.dbMap['frequency'] + '.' + calculatedFrequency] = 1;
                    updateUsersZero['d.' + uniqueLevelsZero[k] + '.' + common.dbMap['loyalty'] + '.' + calculatedLoyaltyRange] = 1;
                    updateUsersZero['d.' + uniqueLevelsZero[k] + '.' + params.user.country + '.' + common.dbMap['unique']] = 1;
                }
            }

            for (var l = 0; l < uniqueLevelsMonth.length; l++) {
                updateUsersMonth['d.' + uniqueLevelsMonth[l] + '.' + common.dbMap['unique']] = 1;
                updateUsersMonth['d.' + uniqueLevelsMonth[l] + '.' + common.dbMap['frequency'] + '.' + calculatedFrequency] = 1;
                updateUsersMonth['d.' + uniqueLevelsMonth[l] + '.' + common.dbMap['loyalty'] + '.' + calculatedLoyaltyRange] = 1;
                updateUsersMonth['d.' + uniqueLevelsMonth[l] + '.' + params.user.country + '.' + common.dbMap['unique']] = 1;
            }

            if (uniqueLevelsZero.length != 0 || uniqueLevelsMonth.length != 0) {
                usersMeta['meta_v2.f-ranges.'+calculatedFrequency] = true;
                usersMeta['meta_v2.l-ranges.'+calculatedLoyaltyRange] = true;
            }
            
            plugins.dispatch("/session/begin", {params:params, isNewUser:isNewUser});
        } else {
            isNewUser = true;

            // User is not found in app_users collection so this means she is both a new and unique user.
            zeroObjUpdate.push(common.dbMap['unique']);
            monthObjUpdate.push(common.dbMap['new']);
            monthObjUpdate.push(common.dbMap['unique']);

            zeroObjUpdate.push(params.user.country + '.' + common.dbMap['unique']);
            monthObjUpdate.push(params.user.country + '.' + common.dbMap['new']);
            monthObjUpdate.push(params.user.country + '.' + common.dbMap['unique']);

            // First time user.
            calculatedLoyaltyRange = '0';
            calculatedFrequency = '0';

            zeroObjUpdate.push(common.dbMap['frequency'] + '.' + calculatedFrequency);
            monthObjUpdate.push(common.dbMap['frequency'] + '.' + calculatedFrequency);
            zeroObjUpdate.push(common.dbMap['loyalty'] + '.' + calculatedLoyaltyRange);
            monthObjUpdate.push(common.dbMap['loyalty'] + '.' + calculatedLoyaltyRange);

            usersMeta['meta_v2.f-ranges.'+calculatedFrequency] = true;
            usersMeta['meta_v2.l-ranges.'+calculatedLoyaltyRange] = true;

            plugins.dispatch("/session/begin", {params:params, isNewUser:isNewUser});
        }

        usersMeta['meta_v2.countries.'+(params.user.country || "Unknown")] = true;

        common.fillTimeObjectZero(params, updateUsersZero, zeroObjUpdate);
        common.fillTimeObjectMonth(params, updateUsersMonth, monthObjUpdate);

        var postfix = common.crypto.createHash("md5").update(params.qstring.device_id).digest('base64')[0];
        if (Object.keys(updateUsersZero).length || Object.keys(usersMeta).length) {
            usersMeta.m = dbDateIds.zero;
            usersMeta.a = params.app_id + "";
            var updateObjZero = {
                $set: usersMeta
            };

            if (Object.keys(updateUsersZero).length) {
                updateObjZero["$inc"] = updateUsersZero;
            }

            common.db.collection('users').update({'_id': params.app_id + "_" + dbDateIds.zero + "_" + postfix}, updateObjZero, {'upsert': true}, function(){});
        }
        if (Object.keys(updateUsersMonth).length) {
            common.db.collection('users').update({'_id': params.app_id + "_" + dbDateIds.month + "_" + postfix}, {$set: {m: dbDateIds.month, a: params.app_id + ""}, '$inc': updateUsersMonth}, {'upsert': true}, function(){});
        }

        plugins.dispatch("/session/user", {params:params, dbAppUser:dbAppUser});
        processMetrics(dbAppUser, uniqueLevelsZero, uniqueLevelsMonth, params, done);
    }

    function processMetrics(user, uniqueLevelsZero, uniqueLevelsMonth, params, done) {
        var userProps = {},
            isNewUser = (user && user[common.dbUserMap['first_seen']])? false : true,
            metricChanges = {};

        if (isNewUser) {
            userProps[common.dbUserMap['first_seen']] = params.time.timestamp;
            userProps[common.dbUserMap['last_seen']] = params.time.timestamp;
            userProps[common.dbUserMap['device_id']] = params.qstring.device_id;
        } else {
            if (parseInt(user[common.dbUserMap['last_seen']], 10) < params.time.timestamp) {
                userProps[common.dbUserMap['last_seen']] = params.time.timestamp;
            }

            if (user[common.dbUserMap['country_code']] != params.user.country) {
                /*
                 Init metric changes object here because country code is not a part of
                 "metrics" object received from begin_session thus won't be tracked otherwise
                */
                metricChanges["uid"] = user.uid;
                metricChanges["ts"] = params.time.timestamp;
                metricChanges["cd"] = new Date();
                metricChanges[common.dbUserMap['country_code']] = {
                    "o": user[common.dbUserMap['country_code']],
                    "n": params.user.country
                };
            }

            if (user[common.dbUserMap['device_id']] != params.qstring.device_id) {
                userProps[common.dbUserMap['device_id']] = params.qstring.device_id;
            }
        }

        var predefinedMetrics = usage.getPredefinedMetrics(params, userProps);
        
        var dateIds = common.getDateIds(params);
        var metaToFetch = {};
        if(plugins.getConfig("api").metric_limit > 0){
            for (var i=0; i < predefinedMetrics.length; i++) {
                for (var j=0; j < predefinedMetrics[i].metrics.length; j++) {
                    var tmpMetric = predefinedMetrics[i].metrics[j],
                        recvMetricValue = null,
                        postfix = null;
                    if (tmpMetric.is_user_prop) {
                        recvMetricValue = params.user[tmpMetric.name];
                    } else if (params.qstring.metrics && params.qstring.metrics[tmpMetric.name]) {
                        recvMetricValue = params.qstring.metrics[tmpMetric.name];
                    }

                    // We check if city data logging is on and user's country is the configured country of the app
                    if (tmpMetric.name == "city" && (plugins.getConfig("api").city_data === false || params.app_cc != params.user.country)) {
                        continue;
                    }

                    if (recvMetricValue) {
                        recvMetricValue = (recvMetricValue+"").replace(/^\$/, "").replace(/\./g, ":");
                        postfix = common.crypto.createHash("md5").update(recvMetricValue).digest('base64')[0];
                        metaToFetch[predefinedMetrics[i].db+params.app_id + "_" + dateIds.zero + "_" + postfix] = {
                            coll: predefinedMetrics[i].db,
                            id: params.app_id + "_" + dateIds.zero + "_" + postfix
                        };
                    }
                }
            }
        }
        
        function fetchMeta(id, callback) {
            common.db.collection(metaToFetch[id].coll).findOne({'_id':metaToFetch[id].id}, {meta_v2:1}, function (err, metaDoc) {
                var retObj = metaDoc || {};
                retObj.coll = metaToFetch[id].coll;
                callback(false, retObj);
            });
        }
            
        var metas = {};
        async.map(Object.keys(metaToFetch), fetchMeta, function (err, metaDocs) {
            for (var i = 0; i < metaDocs.length; i++) {
                if (metaDocs[i].coll && metaDocs[i].meta_v2) {
                    metas[metaDocs[i]._id] = metaDocs[i].meta_v2;
                }
            }
            
            for (var i=0; i < predefinedMetrics.length; i++) {            
                if (params.qstring.metrics && params.qstring.metrics["_app_version"]) {
                    params.qstring.metrics["_app_version"] += "";
                    if(params.qstring.metrics["_app_version"].indexOf('.') === -1)
                        params.qstring.metrics["_app_version"] += ".0";
                }
                                        
                for (var j=0; j < predefinedMetrics[i].metrics.length; j++) {
                    var tmpTimeObjZero = {},
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
                    } else if (params.qstring.metrics && params.qstring.metrics[tmpMetric.name]) {
                        recvMetricValue = params.qstring.metrics[tmpMetric.name];
                    }
        
                    // We check if city data logging is on and user's country is the configured country of the app
                    if (tmpMetric.name == "city" && (plugins.getConfig("api").city_data === false || params.app_cc != params.user.country)) {
                        continue;
                    }
        
                    if (recvMetricValue) {
                        escapedMetricVal = (recvMetricValue+"").replace(/^\$/, "").replace(/\./g, ":");
                        postfix = common.crypto.createHash("md5").update(escapedMetricVal).digest('base64')[0];
                        
                        // Assign properties to app_users document of the current user
                        if (isNewUser || (!isNewUser && user[tmpMetric.short_code] != escapedMetricVal)) {
                            userProps[tmpMetric.short_code] = escapedMetricVal;
                        }
                        var tmpZeroId = params.app_id + "_" + dateIds.zero + "_" + postfix;
                        var ignore = false;
                        if(metas[tmpZeroId] && 
                            metas[tmpZeroId][tmpMetric.set] && 
                            Object.keys(metas[tmpZeroId][tmpMetric.set]).length && 
                            Object.keys(metas[tmpZeroId][tmpMetric.set]).length >= plugins.getConfig("api").metric_limit && 
                            typeof metas[tmpZeroId][tmpMetric.set][escapedMetricVal] === "undefined"){
                                ignore = true;
                        }
                        
                        //should metric be ignored for reaching the limit
                        if(!ignore){
                        
                            //making sure metrics are strings
                            needsUpdate = true;
                            tmpSet["meta_v2." + tmpMetric.set + "." + escapedMetricVal] = true;
                
                            monthObjUpdate.push(escapedMetricVal + '.' + common.dbMap['total']);
                
                            if (isNewUser) {
                                zeroObjUpdate.push(escapedMetricVal + '.' + common.dbMap['unique']);
                                monthObjUpdate.push(escapedMetricVal + '.' + common.dbMap['new']);
                                monthObjUpdate.push(escapedMetricVal + '.' + common.dbMap['unique']);
                            } else if (!tmpMetric.is_user_prop && tmpMetric.short_code && user[tmpMetric.short_code] != escapedMetricVal) {
                                zeroObjUpdate.push(escapedMetricVal + '.' + common.dbMap['unique']);
                                monthObjUpdate.push(escapedMetricVal + '.' + common.dbMap['unique'])
                            } else {
                                for (var k=0; k < uniqueLevelsZero.length; k++) {
                                    if (uniqueLevelsZero[k] == "Y") {
                                        tmpTimeObjZero['d.' + escapedMetricVal + '.' + common.dbMap['unique']] = 1;
                                    } else {
                                        tmpTimeObjZero['d.' + uniqueLevelsZero[k] + '.' + escapedMetricVal + '.' + common.dbMap['unique']] = 1;
                                    }
                                }
                
                                for (var l=0; l < uniqueLevelsMonth.length; l++) {
                                    tmpTimeObjMonth['d.' + uniqueLevelsMonth[l] + '.' + escapedMetricVal + '.' + common.dbMap['unique']] = 1;
                                }
                            }
                        }
                        
        
                        /*
                        If track_changes is not specifically set to false for a metric, track metric value changes on a per user level
                        with a document like below inside metric_changesAPPID collection
            
                        { "uid" : "1", "ts" : 1463778143, "d" : { "o" : "iPhone1", "n" : "iPhone2" }, "av" : { "o" : "1:0", "n" : "1:1" } }
                        */
                        if (predefinedMetrics[i].metrics[j].track_changes !== false && !isNewUser && user[tmpMetric.short_code] != escapedMetricVal) {
                            if (!metricChanges["uid"]) {
                                metricChanges["uid"] = user.uid;
                                metricChanges["ts"] = params.time.timestamp;
                                metricChanges["cd"] = new Date();
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
                            var tmpZeroId = params.app_id + "_" + dateIds.zero + "_" + postfix,
                                tmpMonthId = params.app_id + "_" + dateIds.month + "_" + postfix,
                                updateObjZero = {
                                    $set: tmpSet
                                };
                
                            if (Object.keys(tmpTimeObjZero).length) {
                                updateObjZero["$inc"] = tmpTimeObjZero;
                            }
                
                            if (Object.keys(tmpTimeObjZero).length || Object.keys(tmpSet).length) {
                                common.db.collection(predefinedMetrics[i].db).update({'_id': tmpZeroId}, updateObjZero, {'upsert': true}, function(){});
                            }
                
                            common.db.collection(predefinedMetrics[i].db).update({'_id': tmpMonthId}, {$set: {m: dateIds.month, a: params.app_id + ""}, '$inc': tmpTimeObjMonth}, {'upsert': true}, function(){});
                        }
                    }
                }
            }
            
            // sc: session count. common.dbUserMap is not used here for readability purposes.
            // mt: metric type - provided by session
            var update = {'$inc': {'sc': 1}};
            if(Object.keys(userProps).length){
                userProps.mt = false;
                update["$set"] = userProps;
            }
            
            if (!isNewUser){
                /*
                If metricChanges object contains a uid this means we have at least one metric that has changed
                in this begin_session so we'll insert it into metric_changesAPPID collection.
                Inserted document has below format;
        
                { "uid" : "1", "ts" : 1463778143, "d" : { "o" : "iPhone1", "n" : "iPhone2" }, "av" : { "o" : "1:0", "n" : "1:1" } }
                */
                if (metricChanges.uid && !params.app_user.mt) {
                    common.db.collection('metric_changes' + params.app_id).insert(metricChanges);
                }
            }
            
            common.updateAppUser(params, update, function(){
                //Perform user retention analysis
                plugins.dispatch("/session/retention", {params:params, user:user, isNewUser:isNewUser});
                if (done) { done(); }
            });
        });
        
        return true;
    }

    function parseSequence(num){
        var valSeq = ["0","1","2","3","4","5","6","7","8","9","a","b","c","d","e","f","g","h","i","j","k","l","m","n","o","p","q","r","s","t","u","v","w","x","y","z","A","B","C","D","E","F","G","H","I","J","K","L","M","N","O","P","Q","R","S","T","U","V","W","X","Y","Z"];
        var digits = [];
        var base = valSeq.length;
        while (num > base-1){
            digits.push(num % base);
            num = Math.floor(num / base);
        }
        digits.push(num);
        var result = "";
        for(var i = digits.length-1; i>=0; --i){
            result = result + valSeq[digits[i]];
        }
        return result;
    }

}(usage));

module.exports = usage;
