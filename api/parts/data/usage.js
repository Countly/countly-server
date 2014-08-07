var usage = {},
    common = require('./../../utils/common.js'),
    geoip = require('geoip-lite'),
    time = require('time')(Date);

(function (usage) {

    // Performs geoip lookup for the IP address of the app user
    usage.beginUserSession = function (params) {
        // Location of the user is retrieved using geoip-lite module from her IP address.
        var locationData = geoip.lookup(params.ip_address);

        if (locationData) {
            if (locationData.country) {
                params.user.country = locationData.country;
            }

            if (locationData.city) {
                params.user.city = locationData.city;
            } else {
                params.user.city = 'Unknown';
            }

            // Coordinate values of the user location has no use for now
            if (locationData.ll) {
                params.user.lat = locationData.ll[0];
                params.user.lng = locationData.ll[1];
            }
        }

        common.db.collection('app_users' + params.app_id).findOne({'_id': params.app_user_id }, function (err, dbAppUser){
            processUserSession(dbAppUser, params);
        });
    };

    usage.endUserSession = function (params) {
        // As soon as we receive the end_session we set the timestamp
        // This timestamp is used inside processUserSession
        var userProps = {};
        userProps[common.dbUserMap['last_end_session_timestamp']] = params.time.nowWithoutTimestamp.unix();

        common.db.collection('app_users' + params.app_id).update({'_id': params.app_user_id}, {'$set': userProps}, function() {});

        setTimeout(function() {
            common.db.collection('app_users' + params.app_id).findOne({'_id': params.app_user_id }, function (err, dbAppUser){
                if (!dbAppUser || err) {
                    return true;
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

                    common.db.collection('app_users' + params.app_id).update({'_id': params.app_user_id}, {'$unset': userProps}, function() {
                        endSession(true);
                    });
                } else {
                    endSession();
                }

                function endSession(overrideFlag) {
                    // If user does not have an ongoing session end it
                    // Ongoing session flag is set inside processUserSession
                    if (overrideFlag || !dbAppUser[common.dbUserMap['has_ongoing_session']]) {

                        // If the user does not exist in the app_users collection or she does not have any
                        // previous session duration stored than we dont need to calculate the session
                        // duration range for this user.
                        if (dbAppUser[common.dbUserMap['session_duration']]) {
                            processSessionDurationRange(dbAppUser[common.dbUserMap['session_duration']], params);
                        }
                    }
                }
            });
        }, 10000);

    };

    usage.processSessionDuration = function (params, callback) {

        var updateSessions = {},
            session_duration = parseInt(params.qstring.session_duration);

        if (!isNaN(session_duration) && session_duration > 0) {
            if (common.config.api.session_duration_limit && session_duration > common.config.api.session_duration_limit) {
                session_duration = common.config.api.session_duration_limit;
            }

            common.fillTimeObject(params, updateSessions, common.dbMap['duration'], session_duration);

            common.db.collection('sessions').update({'_id': params.app_id}, {'$inc': updateSessions}, {'upsert': false});

            // sd: session duration, tsd: total session duration. common.dbUserMap is not used here for readability purposes.
            common.db.collection('app_users' + params.app_id).update({'_id': params.app_user_id}, {'$inc': {'sd': session_duration, 'tsd': session_duration}}, {'upsert': true}, function() {
                if (callback) {
                    callback();
                }
            });
        } else if (callback) { // session_duration was a bad value, but callback still needs to be called
            callback();
        }
    };

    function processSessionDurationRange(totalSessionDuration, params) {
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
            updateSessions = {};

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

        // check that calculatedDurationRange is not undefined; shouldn't happen now that the server
        // rejects session durations less than 1 second, but check anyways to make sure we don't put
        // 'ds.undefined' into the database, or add 'null' to 'meta.d-ranges'.
        if (calculatedDurationRange != undefined) {
            common.fillTimeObject(params, updateSessions, common.dbMap['durations'] + '.' + calculatedDurationRange);
            common.db.collection('sessions').update({'_id': params.app_id}, {'$inc': updateSessions, '$addToSet': {'meta.d-ranges': calculatedDurationRange}}, {'upsert': false});
        }

        // sd: session duration. common.dbUserMap is not used here for readability purposes.
        // regardless of whether or not the 'sessions' collection was updated above, still need to
        // clear user's current session duration
        common.db.collection('app_users' + params.app_id).update({'_id': params.app_user_id}, {'$set': {'sd': 0}}, {'upsert': true});
    }

    function processUserSession(dbAppUser, params) {
        var updateSessions = {},
            updateUsers = {},
            updateLocations = {},
            updateCities = {},
            userRanges = {},
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
            isNewUser = false;

        common.fillTimeObject(params, updateSessions, common.dbMap['total']);
        common.fillTimeObject(params, updateLocations, params.user.country + '.' + common.dbMap['total']);

        if (common.config.api.city_data !== false) {
            common.fillTimeObject(params, updateCities, params.user.city + '.' + common.dbMap['total']);
        }

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

            if (lastEndSession && (params.time.nowWithoutTimestamp.unix() - lastEndSession) < 15) {
                var userProps = {};
                userProps[common.dbUserMap['has_ongoing_session']] = true;
                userProps[common.dbUserMap['last_begin_session_timestamp']] = params.time.nowWithoutTimestamp.unix();

                common.db.collection('app_users' + params.app_id).update({'_id': params.app_user_id}, {'$set': userProps}, function() {});

                return true;
            }

            // Calculate the frequency range of the user

            if ((params.time.timestamp - userLastSeenTimestamp) >= (sessionFrequencyMax * 60 * 60)) {
                calculatedFrequency = sessionFrequency.length + '';
            } else {
                for (var i=0; i < sessionFrequency.length; i++) {
                    if ((params.time.timestamp - userLastSeenTimestamp) < (sessionFrequency[i][1] * 60 * 60) &&
                        (params.time.timestamp - userLastSeenTimestamp) >= (sessionFrequency[i][0] * 60 * 60)) {
                        calculatedFrequency = i + '';
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

            if (userLastSeenDate.getFullYear() == params.time.yearly &&
                Math.ceil(common.moment(userLastSeenDate).format("DDD") / 7) < params.time.weekly) {
                uniqueLevels[uniqueLevels.length] = params.time.yearly + ".w" + params.time.weekly;
            }

            if (userLastSeenTimestamp < (params.time.timestamp - secInMin)) {
                // We don't need to put hourly fragment to the unique levels array since
                // we will store hourly data only in sessions collection
                updateSessions[params.time.hourly + '.' + common.dbMap['unique']] = 1;
            }

            if (userLastSeenTimestamp < (params.time.timestamp - secInHour)) {
                uniqueLevels[uniqueLevels.length] = params.time.daily;
            }

            if (userLastSeenTimestamp < (params.time.timestamp - secInMonth)) {
                uniqueLevels[uniqueLevels.length] = params.time.monthly;
            }

            if (userLastSeenTimestamp < (params.time.timestamp - secInYear)) {
                uniqueLevels[uniqueLevels.length] = params.time.yearly;
            }

            for (var i = 0; i < uniqueLevels.length; i++) {
                updateSessions[uniqueLevels[i] + '.' + common.dbMap['unique']] = 1;
                updateLocations[uniqueLevels[i] + '.' + params.user.country + '.' + common.dbMap['unique']] = 1;
                updateUsers[uniqueLevels[i] + '.' + common.dbMap['frequency'] + '.' + calculatedFrequency] = 1;
                updateUsers[uniqueLevels[i] + '.' + common.dbMap['loyalty'] + '.' + calculatedLoyaltyRange] = 1;

                if (common.config.api.city_data !== false) {
                    updateCities[uniqueLevels[i] + '.' + params.user.city + '.' + common.dbMap['unique']] = 1;
                }
            }

            if (uniqueLevels.length != 0) {
                userRanges['meta.' + 'f-ranges'] = calculatedFrequency;
                userRanges['meta.' + 'l-ranges'] = calculatedLoyaltyRange;
                common.db.collection('users').update({'_id': params.app_id}, {'$inc': updateUsers, '$addToSet': userRanges}, {'upsert': true});
            }
        } else {
            isNewUser = true;

            // User is not found in app_users collection so this means she is both a new and unique user.
            common.fillTimeObject(params, updateSessions, common.dbMap['new']);
            common.fillTimeObject(params, updateSessions, common.dbMap['unique']);
            common.fillTimeObject(params, updateLocations, params.user.country + '.' + common.dbMap['new']);
            common.fillTimeObject(params, updateLocations, params.user.country + '.' + common.dbMap['unique']);

            if (common.config.api.city_data !== false) {
                common.fillTimeObject(params, updateCities, params.user.city + '.' + common.dbMap['new']);
                common.fillTimeObject(params, updateCities, params.user.city + '.' + common.dbMap['unique']);
            }

            // First time user.
            calculatedLoyaltyRange = '0';
            calculatedFrequency = '0';

            common.fillTimeObject(params, updateUsers, common.dbMap['frequency'] + '.' + calculatedFrequency);
            userRanges['meta.' + 'f-ranges'] = calculatedFrequency;

            common.fillTimeObject(params, updateUsers, common.dbMap['loyalty'] + '.' + calculatedLoyaltyRange);
            userRanges['meta.' + 'l-ranges'] = calculatedLoyaltyRange;

            common.db.collection('users').update({'_id': params.app_id}, {'$inc': updateUsers, '$addToSet': userRanges}, {'upsert': true});
        }

        common.db.collection('sessions').update({'_id': params.app_id}, {'$inc': updateSessions}, {'upsert': true});
        common.db.collection('locations').update({'_id': params.app_id}, {'$inc': updateLocations, '$addToSet': {'meta.countries': params.user.country}}, {'upsert': true});

        if (common.config.api.city_data !== false && params.app_cc == params.user.country) {
            common.db.collection('cities').update({'_id': params.app_id}, {'$inc': updateCities, '$set': {'country': params.user.country}, '$addToSet': {'meta.cities': params.user.city}}, {'upsert': true});
        }

        processMetrics(dbAppUser, uniqueLevels, params);
    }

    function processMetrics(user, uniqueLevels, params) {

        var userProps = {},
            isNewUser = (user && user[common.dbUserMap['first_seen']])? false : true;

        if (isNewUser) {
            userProps[common.dbUserMap['first_seen']] = params.time.timestamp;
            userProps[common.dbUserMap['last_seen']] = params.time.timestamp;
            userProps[common.dbUserMap['device_id']] = params.qstring.device_id;
            userProps[common.dbUserMap['country_code']] = params.user.country;
            userProps[common.dbUserMap['city']] = params.user.city;
        } else {
            if (parseInt(user[common.dbUserMap['last_seen']], 10) < params.time.timestamp) {
                userProps[common.dbUserMap['last_seen']] = params.time.timestamp;
            }

            if (user[common.dbUserMap['city']] != params.user.city) {
                userProps[common.dbUserMap['city']] = params.user.city;
            }

            if (user[common.dbUserMap['country_code']] != params.user.country) {
                userProps[common.dbUserMap['country_code']] = params.user.country;
            }

            if (user[common.dbUserMap['device_id']] != params.qstring.device_id) {
                userProps[common.dbUserMap['device_id']] = params.qstring.device_id;
            }
        }

        if (!params.qstring.metrics) {
            // sc: session count. common.dbUserMap is not used here for readability purposes.
            common.db.collection('app_users' + params.app_id).update({'_id':params.app_user_id}, {'$inc':{'sc':1}, '$set':userProps}, {'upsert':true}, function () {
            });
            return false;
        }

        var predefinedMetrics = [
            { db: "devices", metrics: [{ name: "_device", set: "devices", short_code: common.dbUserMap['device'] }] },
            { db: "carriers", metrics: [{ name: "_carrier", set: "carriers", short_code: common.dbUserMap['carrier'] }] },
            { db: "device_details", metrics: [{ name: "_os", set: "os", short_code: common.dbUserMap['platform'] }, { name: "_os_version", set: "os_versions", short_code: common.dbUserMap['platform_version'] }, { name: "_resolution", set: "resolutions" }] },
            { db: "app_versions", metrics: [{ name: "_app_version", set: "app_versions", short_code: common.dbUserMap['app_version'] }] }
        ];

        for (var i=0; i < predefinedMetrics.length; i++) {
            var tmpTimeObj = {},
                tmpSet = {},
                needsUpdate = false;

            for (var j=0; j < predefinedMetrics[i].metrics.length; j++) {
                var tmpMetric = predefinedMetrics[i].metrics[j],
                    recvMetricValue = params.qstring.metrics[tmpMetric.name];

                if (recvMetricValue) {
                    var escapedMetricVal = recvMetricValue.replace(/^\$/, "").replace(/\./g, ":");
                    needsUpdate = true;
                    tmpSet["meta." + tmpMetric.set] = escapedMetricVal;
                    common.fillTimeObject(params, tmpTimeObj, escapedMetricVal + '.' + common.dbMap['total']);

                    if (isNewUser) {
                        common.fillTimeObject(params, tmpTimeObj, escapedMetricVal + '.' + common.dbMap['new']);
                        common.fillTimeObject(params, tmpTimeObj, escapedMetricVal + '.' + common.dbMap['unique']);
                    } else if (tmpMetric.short_code && user[tmpMetric.short_code] != escapedMetricVal) {
                        common.fillTimeObject(params, tmpTimeObj, escapedMetricVal + '.' + common.dbMap['unique']);
                    } else {
                        for (var k=0; k < uniqueLevels.length; k++) {
                            tmpTimeObj[uniqueLevels[k] + '.' + escapedMetricVal + '.' + common.dbMap['unique']] = 1;
                        }
                    }

                    // Assign properties to app_users document of the current user
                    if (tmpMetric.short_code) {
                        if (isNewUser || (!isNewUser && user[tmpMetric.short_code] != escapedMetricVal)) {
                            userProps[tmpMetric.short_code] = escapedMetricVal;
                        }
                    }
                }
            }

            if (needsUpdate) {
                common.db.collection(predefinedMetrics[i].db).update({'_id': params.app_id}, {'$inc': tmpTimeObj, '$addToSet': tmpSet}, {'upsert': true});
            }
        }

        // sc: session count. common.dbUserMap is not used here for readability purposes.
        common.db.collection('app_users' + params.app_id).update({'_id':params.app_user_id}, {'$inc':{'sc':1}, '$set':userProps}, {'upsert':true}, function () {
        });
    }

}(usage));

module.exports = usage;