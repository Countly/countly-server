var usage = {},
    common = require('./../../utils/common.js'),
    geoip = require('geoip-lite'),
	plugins = require('../../../plugins/pluginManager.js');

(function (usage) {

    // Performs geoip lookup for the IP address of the app user
    usage.beginUserSession = function (params) {
        // Location of the user is retrieved using geoip-lite module from her IP address.
        var locationData = geoip.lookup(params.ip_address);

        if (locationData) {
            if (params.user.country == "Unknown" && locationData.country) {
                params.user.country = locationData.country;
            }

            if (params.user.city == "Unknown" && locationData.city) {
                params.user.city = locationData.city;
            }

            // Coordinate values of the user location has no use for now
            if (locationData.ll && (!params.user.lat || !params.user.lng)) {
                params.user.lat = locationData.ll[0];
                params.user.lng = locationData.ll[1];
            }
        }
        common.db.collection('app_users' + params.app_id).findOne({'_id': params.app_user_id }, function (err, dbAppUser){
            if(dbAppUser){
                var lastTs = dbAppUser[common.dbUserMap['last_end_session_timestamp']] || dbAppUser[common.dbUserMap['last_begin_session_timestamp']];
                if (!lastTs || (params.time.nowWithoutTimestamp.unix() - lastTs) > 15) {
                    //process duration from unproperly ended previous session
                    plugins.dispatch("/session/post", {params:params, dbAppUser:dbAppUser, end_session:false});
                    if (dbAppUser && dbAppUser[common.dbUserMap['session_duration']]) {
                        processSessionDurationRange(dbAppUser[common.dbUserMap['session_duration']], params);
                    }
                }
            }
            processUserSession(dbAppUser, params);
        });
    };

    usage.endUserSession = function (params) {
        //check if end_session is not too old and ignore if it is
        if(params.time.timestamp >= params.time.nowWithoutTimestamp.unix() - plugins.getConfig("api").session_duration_limit){
            // As soon as we receive the end_session we set the timestamp
            // This timestamp is used inside processUserSession
            var userProps = {};
            userProps[common.dbUserMap['last_end_session_timestamp']] = params.time.timestamp;
    
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
                            
                            plugins.dispatch("/session/end", {params:params, dbAppUser:dbAppUser});
                            plugins.dispatch("/session/post", {params:params, dbAppUser:dbAppUser, end_session:true});
    
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

            var dbDateIds = common.getDateIds(params);
            common.db.collection('users').update({'_id': params.app_id + "_" + dbDateIds.month}, {'$inc': updateUsers}, function(){});
            
            var update = {'$inc': {'sd': session_duration, 'tsd': session_duration}};
            if(params.user.lat && params.user.lng){
                update["$set"] = {lat:params.user.lat, lng:params.user.lng};
            }

            // sd: session duration, tsd: total session duration. common.dbUserMap is not used here for readability purposes.
            common.db.collection('app_users' + params.app_id).update({'_id': params.app_user_id}, update, {'upsert': true}, function() {
				
				plugins.dispatch("/session/duration", {params:params, session_duration:session_duration});

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
        common.db.collection('users').update({'_id': params.app_id + "_" + dbDateIds.month}, {'$inc': updateUsers}, function(){});
        common.db.collection('users').update({'_id': params.app_id + "_" + dbDateIds.zero}, {'$inc': updateUsersZero, '$addToSet': {'meta.d-ranges': calculatedDurationRange}}, function(){});

        // sd: session duration. common.dbUserMap is not used here for readability purposes.
        common.db.collection('app_users' + params.app_id).update({'_id': params.app_user_id}, {'$set': {'sd': 0}}, {'upsert': true}, function(){});
    }

    function processUserSession(dbAppUser, params) {
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

            if ((!params.qstring.sdk_version || params.qstring.sdk_version < "15.04") && lastEndSession && (params.time.nowWithoutTimestamp.unix() - lastEndSession) < 15) {
                plugins.dispatch("/session/extend", {params:params});

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
                Math.ceil(common.moment(userLastSeenDate).format("DDD") / 7) < params.time.weekly) {
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
                usersMeta['meta.f-ranges'] = calculatedFrequency;
                usersMeta['meta.l-ranges'] = calculatedLoyaltyRange;
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

            usersMeta['meta.f-ranges'] = calculatedFrequency;
            usersMeta['meta.l-ranges'] = calculatedLoyaltyRange;

			plugins.dispatch("/session/begin", {params:params, isNewUser:isNewUser});
        }

        usersMeta['meta.countries'] = params.user.country;

        common.fillTimeObjectZero(params, updateUsersZero, zeroObjUpdate);
        common.fillTimeObjectMonth(params, updateUsersMonth, monthObjUpdate);

        if (Object.keys(updateUsersZero).length || Object.keys(usersMeta).length) {
            common.db.collection('users').update({'_id': params.app_id + "_" + dbDateIds.zero}, {$set: {m: dbDateIds.zero, a: params.app_id + ""}, '$inc': updateUsersZero, '$addToSet': usersMeta}, {'upsert': true}, function(){});
        }

        common.db.collection('users').update({'_id': params.app_id + "_" + dbDateIds.month}, {$set: {m: dbDateIds.month, a: params.app_id + ""}, '$inc': updateUsersMonth}, {'upsert': true}, function(){});

        processMetrics(dbAppUser, uniqueLevelsZero, uniqueLevelsMonth, params);

        plugins.dispatch("/session/user", {params:params, dbAppUser:dbAppUser});
    }

    function processMetrics(user, uniqueLevelsZero, uniqueLevelsMonth, params) {
        var userProps = {},
            isNewUser = (user && user[common.dbUserMap['first_seen']])? false : true;

        if (isNewUser) {
            userProps[common.dbUserMap['first_seen']] = params.time.timestamp;
            userProps[common.dbUserMap['last_seen']] = params.time.timestamp;
            userProps[common.dbUserMap['device_id']] = params.qstring.device_id;
            userProps[common.dbUserMap['country_code']] = params.user.country;
            userProps[common.dbUserMap['city']] = params.user.city;
            if(params.user.lat && params.user.lng){
                userProps["lat"] = params.user.lat;
                userProps["lng"] = params.user.lng;
            }
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
            
            if(params.user.lat && params.user.lng && (user["lat"] != params.user.lat || user["lng"] != params.user.lng)){
                userProps["lat"] = params.user.lat;
                userProps["lng"] = params.user.lng;
            }
        }

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
		
		plugins.dispatch("/session/metrics", {params:params, predefinedMetrics:predefinedMetrics, userProps:userProps, user:user, isNewUser:isNewUser});

        for (var i=0; i < predefinedMetrics.length; i++) {
            var tmpTimeObjZero = {},
                tmpTimeObjMonth = {},
                tmpSet = {},
                needsUpdate = false,
                zeroObjUpdate = [],
                monthObjUpdate = [];
            
            if (params.qstring.metrics && params.qstring.metrics["_app_version"]) {
                params.qstring.metrics["_app_version"] += "";
                if(params.qstring.metrics["_app_version"].indexOf('.') === -1)
                    params.qstring.metrics["_app_version"] += ".0";
            }
                                    
            for (var j=0; j < predefinedMetrics[i].metrics.length; j++) {
                var tmpMetric = predefinedMetrics[i].metrics[j],
                    recvMetricValue = "",
                    escapedMetricVal = "";

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
					//making sure metrics are strings
                    escapedMetricVal = (recvMetricValue+"").replace(/^\$/, "").replace(/\./g, ":");
                    needsUpdate = true;
                    tmpSet["meta." + tmpMetric.set] = escapedMetricVal;

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

                    // Assign properties to app_users document of the current user
                    if (isNewUser || (!isNewUser && user[tmpMetric.short_code] != escapedMetricVal)) {
                        userProps[tmpMetric.short_code] = escapedMetricVal;
                    }
                }
            }

            common.fillTimeObjectZero(params, tmpTimeObjZero, zeroObjUpdate);
            common.fillTimeObjectMonth(params, tmpTimeObjMonth, monthObjUpdate);

            if (needsUpdate) {
                var dateIds = common.getDateIds(params),
                    tmpZeroId = params.app_id + "_" + dateIds.zero,
                    tmpMonthId = params.app_id + "_" + dateIds.month;

                if (Object.keys(tmpTimeObjZero).length || Object.keys(tmpSet).length) {
                    common.db.collection(predefinedMetrics[i].db).update({'_id': tmpZeroId}, {$set: {m: dateIds.zero, a: params.app_id + ""}, '$inc': tmpTimeObjZero, '$addToSet': tmpSet}, {'upsert': true}, function(){});
                }

                common.db.collection(predefinedMetrics[i].db).update({'_id': tmpMonthId}, {$set: {m: dateIds.month, a: params.app_id + ""}, '$inc': tmpTimeObjMonth}, {'upsert': true}, function(){});
            }
        }

        if (isNewUser) {
            common.db.collection('app_users' + params.app_id).findAndModify({_id:"uid-sequence"},{},{$inc:{seq:1}},{new:true}, function(err,result){
                result = result.value;
                if (result && result.length != 0) {
                    userProps[common.dbUserMap['user_id']] = parseSequence(result.seq);
                }
                common.db.collection('app_users' + params.app_id).update({'_id': params.app_user_id}, {'$inc': {'sc': 1}, '$set': userProps}, {'upsert': true}, function() {
                    //Perform user retention analysis
					plugins.dispatch("/session/retention", {params:params, user:user, isNewUser:isNewUser});
                });
            });
        } else {
            // sc: session count. common.dbUserMap is not used here for readability purposes.
            common.db.collection('app_users' + params.app_id).update({'_id': params.app_user_id}, {'$inc': {'sc': 1}, '$set': userProps}, {'upsert': true}, function() {
                //Perform user retention analysis
                plugins.dispatch("/session/retention", {params:params, user:user, isNewUser:isNewUser});
            });
        }

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
