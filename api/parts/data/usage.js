var usage = {},
    common = require('./../../utils/common.js'),
    geoip = require('geoip-lite');

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
        common.db.collection('app_users' + params.app_id).findOne({'_id': params.app_user_id }, function (err, dbAppUser){

            // If the user does not exist in the app_users collection or she does not have any
            // previous session duration stored than we dont need to calculate the session
            // duration range for this user.
            if (!dbAppUser || !dbAppUser[common.dbUserMap['session_duration']]) {
                return false;
            }

            processSessionDurationRange(dbAppUser[common.dbUserMap['session_duration']], params);
        });
    };

    usage.processSessionDuration = function (params, callback) {

        var updateSessions = {},
            session_duration = parseInt(params.qstring.session_duration);

        if (session_duration == (session_duration | 0)) {
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

        common.fillTimeObject(params, updateSessions, common.dbMap['durations'] + '.' + calculatedDurationRange);
        common.db.collection('sessions').update({'_id': params.app_id}, {'$inc': updateSessions, '$addToSet': {'meta.d-ranges': calculatedDurationRange}}, {'upsert': false});

        // sd: session duration. common.dbUserMap is not used here for readability purposes.
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

        if (common.config.api.city_data === true) {
            common.fillTimeObject(params, updateCities, params.user.city + '.' + common.dbMap['total']);
        }

        if (dbAppUser) {
            var userLastSeenTimestamp = dbAppUser[common.dbUserMap['last_seen']],
                currDate = common.getDate(params.time.timestamp, params.appTimezone),
                userLastSeenDate = common.getDate(userLastSeenTimestamp, params.appTimezone),
                secInMin = (60 * (currDate.getMinutes())) + currDate.getSeconds(),
                secInHour = (60 * 60 * (currDate.getHours())) + secInMin,
                secInMonth = (60 * 60 * 24 * (currDate.getDate() - 1)) + secInHour;

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

            if (userLastSeenTimestamp <= (params.time.timestamp - secInMin)) {
                // We don't need to put hourly fragment to the unique levels array since
                // we will store hourly data only in sessions collection
                updateSessions[params.time.hourly + '.' + common.dbMap['unique']] = 1;
            }

            if (userLastSeenTimestamp <= (params.time.timestamp - secInHour)) {
                uniqueLevels[uniqueLevels.length] = params.time.daily;
            }

            if (userLastSeenTimestamp <= (params.time.timestamp - secInMonth)) {
                uniqueLevels[uniqueLevels.length] = params.time.monthly;
            }

            if (userLastSeenTimestamp < (params.time.timestamp - secInMonth)) {
                uniqueLevels[uniqueLevels.length] = params.time.yearly;
            }

            for (var i = 0; i < uniqueLevels.length; i++) {
                updateSessions[uniqueLevels[i] + '.' + common.dbMap['unique']] = 1;
                updateLocations[uniqueLevels[i] + '.' + params.user.country + '.' + common.dbMap['unique']] = 1;
                updateUsers[uniqueLevels[i] + '.' + common.dbMap['frequency'] + '.' + calculatedFrequency] = 1;
                updateUsers[uniqueLevels[i] + '.' + common.dbMap['loyalty'] + '.' + calculatedLoyaltyRange] = 1;

                if (common.config.api.city_data === true) {
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

            if (common.config.api.city_data === true) {
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

        if (common.config.api.city_data === true && params.app_cc == params.user.country) {
            common.db.collection('cities').update({'_id': params.app_id}, {'$inc': updateCities, '$set': {'country': params.user.country}, '$addToSet': {'meta.cities': params.user.city}}, {'upsert': true});
        }

        processMetrics(dbAppUser, uniqueLevels, params);
    }

    function processMetrics(user, uniqueLevels, params) {

        var userProps = {},
            isNewUser = (user)? false : true;

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