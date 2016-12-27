var fetch = {},
    common = require('./../../utils/common.js'),
    async = require('async'),
    countlySession = require('../../lib/countly.session.js'),
    countlyCarrier = require('../../lib/countly.carrier.js'),
    countlyDeviceDetails = require('../../lib/countly.device.detail.js'),
    countlyLocation = require('../../lib/countly.location.js'),
    countlyCommon = require('../../lib/countly.common.js'),
    moment = require('moment'),
    _ = require('underscore'),
    crypto = require('crypto'),
    plugins = require('../../../plugins/pluginManager.js');

(function (fetch) {

    fetch.prefetchEventData = function (collection, params) {
        if (!params.qstring.event) {
            common.db.collection('events').findOne({'_id':params.app_id}, function (err, result) {
                if (result && result.list) {
                    if (result.order && result.order.length) {
                        for (var i = 0; i < result.order.length; i++) {
                            if(result.order[i].indexOf("[CLY]") !== 0){
                                collection = result.order[i];
                                break;
                            }
                        }
                    } else {
                        result.list.sort();
                        for (var i = 0; i < result.list.length; i++) {
                            if(result.list[i].indexOf("[CLY]") !== 0){
                                collection = result.list[i];
                                break;
                            }
                        }
                    }

                    var collectionName = "events" + crypto.createHash('sha1').update(collection + params.app_id).digest('hex');
                    fetch.fetchTimeObj(collectionName, params, true);
                } else {
                    common.returnOutput(params, {});
                }
            });
        } else {
            var collectionName = "events" + crypto.createHash('sha1').update(params.qstring.event + params.app_id).digest('hex');
            fetch.fetchTimeObj(collectionName, params, true);
        }
    };

    fetch.fetchEventData = function (collection, params) {
        var fetchFields = {};

        if (params.qstring.action == "refresh") {
            fetchFields[params.time.daily] = 1;
            fetchFields['meta'] = 1;
        }

        if (params.qstring.date == "today") {
            fetchFields[params.time.daily + "." + common.dbMap.count] = 1;
            fetchFields[params.time.daily + "." + common.dbMap.sum] = 1;
            fetchFields[params.time.daily + "." + common.dbMap.dur] = 1;
        }

        var idToFetch = params.qstring.segmentation || "no-segment";

        common.db.collection(collection).findOne({_id: idToFetch}, fetchFields, function (err, result) {
            if (err || !result) {
                now = new common.time.Date();
                result = {};
                result[now.getFullYear()] = {};
            }

            common.returnOutput(params, result);
        });
    };

    fetch.fetchMergedEventData = function (params) {
        var eventKeysArr = [];

        for (var i = 0; i < params.qstring.events.length; i++) {
            eventKeysArr.push(params.qstring.events[i] + params.app_id);
        }

        if (!eventKeysArr.length) {
            common.returnOutput(params, {});
        } else {
            async.map(eventKeysArr, getEventData, function (err, allEventData) {
                var mergedEventOutput = {};

                for (var i = 0; i < allEventData.length; i++) {
                    delete allEventData[i].meta;

                    for (var levelOne in allEventData[i]) {
                        if (typeof allEventData[i][levelOne] !== 'object') {
                            if (mergedEventOutput[levelOne]) {
                                mergedEventOutput[levelOne] += allEventData[i][levelOne];
                            } else {
                                mergedEventOutput[levelOne] = allEventData[i][levelOne];
                            }
                        } else {
                            for (var levelTwo in allEventData[i][levelOne]) {
                                if (!mergedEventOutput[levelOne]) {
                                    mergedEventOutput[levelOne] = {};
                                }

                                if (typeof allEventData[i][levelOne][levelTwo] !== 'object') {
                                    if (mergedEventOutput[levelOne][levelTwo]) {
                                        mergedEventOutput[levelOne][levelTwo] += allEventData[i][levelOne][levelTwo];
                                    } else {
                                        mergedEventOutput[levelOne][levelTwo] = allEventData[i][levelOne][levelTwo];
                                    }
                                } else {
                                    for (var levelThree in allEventData[i][levelOne][levelTwo]) {
                                        if (!mergedEventOutput[levelOne][levelTwo]) {
                                            mergedEventOutput[levelOne][levelTwo] = {};
                                        }

                                        if (typeof allEventData[i][levelOne][levelTwo][levelThree] !== 'object') {
                                            if (mergedEventOutput[levelOne][levelTwo][levelThree]) {
                                                mergedEventOutput[levelOne][levelTwo][levelThree] += allEventData[i][levelOne][levelTwo][levelThree];
                                            } else {
                                                mergedEventOutput[levelOne][levelTwo][levelThree] = allEventData[i][levelOne][levelTwo][levelThree];
                                            }
                                        } else {
                                            for (var levelFour in allEventData[i][levelOne][levelTwo][levelThree]) {
                                                if (!mergedEventOutput[levelOne][levelTwo][levelThree]) {
                                                    mergedEventOutput[levelOne][levelTwo][levelThree] = {};
                                                }

                                                if (typeof allEventData[i][levelOne][levelTwo][levelThree][levelFour] !== 'object') {
                                                    if (mergedEventOutput[levelOne][levelTwo][levelThree][levelFour]) {
                                                        mergedEventOutput[levelOne][levelTwo][levelThree][levelFour] += allEventData[i][levelOne][levelTwo][levelThree][levelFour];
                                                    } else {
                                                        mergedEventOutput[levelOne][levelTwo][levelThree][levelFour] = allEventData[i][levelOne][levelTwo][levelThree][levelFour];
                                                    }
                                                } else {
                                                    for (var levelFive in allEventData[i][levelOne][levelTwo][levelThree][levelFour]) {
                                                        if (!mergedEventOutput[levelOne][levelTwo][levelThree][levelFour]) {
                                                            mergedEventOutput[levelOne][levelTwo][levelThree][levelFour] = {};
                                                        }

                                                        if (mergedEventOutput[levelOne][levelTwo][levelThree][levelFour][levelFive]) {
                                                            mergedEventOutput[levelOne][levelTwo][levelThree][levelFour][levelFive] += allEventData[i][levelOne][levelTwo][levelThree][levelFour][levelFive];
                                                        } else {
                                                            mergedEventOutput[levelOne][levelTwo][levelThree][levelFour][levelFive] = allEventData[i][levelOne][levelTwo][levelThree][levelFour][levelFive];
                                                        }
                                                    }
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }

                common.returnOutput(params, mergedEventOutput);
            });
        }

        function getEventData(eventKey, callback) {
            var collectionName = "events" + crypto.createHash('sha1').update(eventKey).digest('hex');
			fetchTimeObj(collectionName, params, true, function(output) {
				callback(null, output || {});
			});
        }
    };

    fetch.fetchCollection = function (collection, params) {
        common.db.collection(collection).findOne({'_id':params.app_id}, function (err, result) {
            if (!result) {
                result = {};
            }

            if (result && collection === 'events') {
                if (result.list) { result.list = _.filter(result.list, function(l){ return l.indexOf('[CLY]') !== 0; }); }
				if (result.segments) {
					for(var i in result.segments){
						if(i.indexOf('[CLY]') === 0)
							delete result.segments[i];
					}
				}
            }

            common.returnOutput(params, result);
        });
    };

    fetch.fetchTimeData = function (collection, params) {

        var fetchFields = {};

        if (params.qstring.action == "refresh") {
            fetchFields[params.time.yearly + "." + common.dbMap.unique] = 1;
            fetchFields[params.time.monthly + "." + common.dbMap.unique] = 1;
            fetchFields[params.time.weekly + "." + common.dbMap.unique] = 1;
            fetchFields[params.time.daily] = 1;
            fetchFields['meta'] = 1;
        }

        common.db.collection(collection).findOne({'_id':params.app_id}, fetchFields, function (err, result) {
            if (!result) {
                now = new common.time.Date();
                result = {};
                result[now.getFullYear()] = {};
            }

            common.returnOutput(params, result);
        });
    };

    fetch.fetchDashboard = function(params) {
        params.qstring.period = "30days";

        fetchTimeObj('users', params, false, function(usersDoc) {
            fetchTimeObj('device_details', params, false, function(deviceDetailsDoc) {
                fetchTimeObj('carriers', params, false, function(carriersDoc) {
                    var periods = [
                            {period: "30days", out: "30days"},
                            {period: "7days", out: "7days"},
                            {period: "hour", out: "today"}
                        ];

                    countlyCommon.setTimezone(params.appTimezone);
                    countlySession.setDb(usersDoc || {});
                    countlyDeviceDetails.setDb(deviceDetailsDoc || {});
                    countlyCarrier.setDb(carriersDoc || {});

                    async.map(periods, function(period, callback) {
                            params.qstring.period = period.period;

                            getTotalUsersObj("users", params, function(dbTotalUsersObj) {
                                countlyCommon.setPeriod(period.period);

                                countlySession.setTotalUsersObj(formatTotalUsersObj(dbTotalUsersObj));

                                var data = {
                                    out: period.out,
                                    data: {
                                        dashboard: countlySession.getSessionData(),
                                        top: {
                                            platforms: countlyDeviceDetails.getPlatformBars(),
                                            resolutions: countlyDeviceDetails.getResolutionBars(),
                                            carriers: countlyCarrier.getCarrierBars(),
                                            users: countlySession.getTopUserBars()
                                        },
                                        period: countlyCommon.getDateRange()
                                    }
                                };

                                callback(null, data);
                            });
                        },
                        function(err, output){
                            var processedOutput = {};

                            for (var i = 0; i < output.length; i++) {
                                processedOutput[output[i].out] = output[i].data;
                            }

                            common.returnOutput(params, processedOutput);
                        });
                });
            });
        });
    };
    
    fetch.fetchAllApps = function(params) {
        var filter = {};

        if(params.qstring.filter){
            try{
                filter = JSON.parse(params.qstring.filter);
            }
            catch(ex){
                filter = {};
            }            
        }
        
        if(!params.member.global_admin){
            var apps = {};
            for(var i = 0; i < params.member.admin_of.length; i++){
                if (params.member.admin_of[i] == "") {
                    continue;
                }
                apps[params.member.admin_of[i]] = true;
            }
            
            for(var i = 0; i < params.member.user_of.length; i++){
                if (params.member.user_of[i] == "") {
                    continue;
                }
                apps[params.member.user_of[i]] = true;
            }
            
            var fromApps = [];
            for(var i in apps){
                fromApps.push(common.db.ObjectID(i))
            }
            filter["_id"] = { '$in':fromApps }
        }
        common.db.collection("apps").find(filter, {_id:1, name:1}).toArray(function(err, apps){
            function extractData(db, props){
                var chartData = [
                    { data:[], label:"", color:'#333933' }
                ],
                dataProps = [];
                dataProps.push(props);
                return countlyCommon.extractChartData(db, countlySession.clearSessionObject, chartData, dataProps).chartDP[0].data;
            }

            function setAppId(inAppId) {
                params.app_id = inAppId + "";
            }

            countlyCommon.setTimezone(params.appTimezone);

            async.map(apps, function(app, callback) {
                setAppId(app._id);

                fetchTimeObj('users', params, false, function(usersDoc) {

                    // We need to set app_id once again here because after the callback
                    // it is reset to it's original value
                    setAppId(app._id);

                    getTotalUsersObj("users", params, function(dbTotalUsersObj) {
                        countlySession.setDb(usersDoc || {});
                        countlySession.setTotalUsersObj(formatTotalUsersObj(dbTotalUsersObj));

                        var sessionData = countlySession.getSessionData();
                        var charts = {
                            "total-users": extractData(usersDoc || {}, {name:"t",func:function (dataObj) {return dataObj["u"]}}),
                            "new-users": extractData(usersDoc || {}, { name:"n" }),
                            "total-sessions": extractData(usersDoc || {}, { name:"t" }),
                            "time-spent": extractData(usersDoc || {}, {name:"average", func:function (dataObj) {return ((dataObj["t"] == 0) ? 0 : ((dataObj["d"] / dataObj["t"]) / 60).toFixed(1));}}),
                            "total-time-spent": extractData(usersDoc || {}, {name:"t", func:function (dataObj) {return ((dataObj["d"] / 60).toFixed(1));}}),
                            "avg-events-served": extractData(usersDoc || {}, {name:"average", func:function (dataObj) {return ((dataObj["u"] == 0) ? 0 : ((dataObj["e"] / dataObj["u"]).toFixed(1)));}})
                        };

                        var data = {_id:app._id, name:app.name, test:"1", sessions:sessionData['total_sessions'], users:sessionData['total_users'], newusers:sessionData['new_users'], duration:sessionData['total_time'], avgduration:sessionData['avg_time'], charts:charts};

                        callback(null, data);
                    });
                });
            },
            function(err, res){
               common.returnOutput(params, res); 
            });
        });
    };
	
	fetch.fetchTops = function(params) {
        fetchTimeObj('users', params, false, function(usersDoc) {
            fetchTimeObj('device_details', params, false, function(deviceDetailsDoc) {
                fetchTimeObj('carriers', params, false, function(carriersDoc) {
                    countlyCommon.setTimezone(params.appTimezone);
                    countlySession.setDb(usersDoc || {});
                    countlyDeviceDetails.setDb(deviceDetailsDoc || {});
                    countlyCarrier.setDb(carriersDoc || {});
					countlyLocation.setDb(usersDoc || {});

                    var output = {
						platforms: countlyDeviceDetails.getPlatformBars(),
						resolutions: countlyDeviceDetails.getResolutionBars(),
						carriers: countlyCarrier.getCarrierBars(),
						countries: countlyLocation.getLocationBars()
                    };

                    common.returnOutput(params, output);
                });
            });
        });
    };

    fetch.fetchCountries = function(params) {
        params.qstring.period = "30days";

        fetchTimeObj('users', params, false, function(locationsDoc) {
            var periods = [
                    {period: "30days", out: "30days"},
                    {period: "7days", out: "7days"},
                    {period: "hour", out: "today"}
                ];

            countlyCommon.setTimezone(params.appTimezone);
            countlyLocation.setDb(locationsDoc || {});

            async.map(periods, function(period, callback) {
                    params.qstring.period = period.period;

                    getTotalUsersObj("countries", params, function(dbTotalUsersObj) {
                        countlyCommon.setPeriod(period.period);

                        countlyLocation.setTotalUsersObj(formatTotalUsersObj(dbTotalUsersObj));

                        var data = {out: period.out, data: countlyLocation.getLocationData({maxCountries: 10, sort: "new"})};

                        callback(null, data);
                    });
                },
                function(err, output){
                    var processedOutput = {};

                    for (var i = 0; i < output.length; i++) {
                        processedOutput[output[i].out] = output[i].data;
                    }

                    common.returnOutput(params, processedOutput);
                });
        });
    };
	
	fetch.fetchSessions = function(params) {
        fetchTimeObj('users', params, false, function(usersDoc) {
			countlySession.setDb(usersDoc || {});
			common.returnOutput(params, countlySession.getSubperiodData());
        });
    };
	
	fetch.fetchLoyalty = function(params) {
        fetchTimeObj("users", params, false, function(doc) {
			var _meta = [];
			if (doc['meta']) {
				_meta = (doc['meta']['l-ranges']) ? doc['meta']['l-ranges'] : [];
			}
			var chartData = countlyCommon.extractRangeData(doc, "l", _meta, function (index) {return index;});

			common.returnOutput(params, chartData);
		});
    };
	
	fetch.fetchFrequency = function(params) {
        fetchTimeObj("users", params, false, function(doc) {
			var _meta = [];
			if (doc['meta']) {
				_meta = (doc['meta']['f-ranges']) ? doc['meta']['f-ranges'] : [];
			}
			var chartData = countlyCommon.extractRangeData(doc, "f", _meta, function (index) {return index;});

			common.returnOutput(params, chartData);
		});
    };
	
	fetch.fetchDurations = function(params) {
        fetchTimeObj("users", params, false, function(doc) {
			var _meta = [];
			if (doc['meta']) {
				_meta = (doc['meta']['d-ranges']) ? doc['meta']['d-ranges'] : [];
			}
			var chartData = countlyCommon.extractRangeData(doc, "ds", _meta, function (index) {return index;});

			common.returnOutput(params, chartData);
		});
    };
	
	fetch.getMetric = function(params, metric, totalUsersMetric, callback){
        var queryMetric = params.qstring.metric || metric;
        countlyCommon.setTimezone(params.appTimezone);
        if(params.qstring.period)
            countlyCommon.setPeriod(params.qstring.period);
		fetchTimeObj(metric, params, false, function(doc) {
			var clearMetricObject = function (obj) {
				if (obj) {
					if (!obj["t"]) obj["t"] = 0;
					if (!obj["n"]) obj["n"] = 0;
					if (!obj["u"]) obj["u"] = 0;
				}
				else {
					obj = {"t":0, "n":0, "u":0};
				}
		
				return obj;
			};

			if (doc['meta'] && doc['meta'][queryMetric]) {
                getTotalUsersObj(totalUsersMetric, params, function(dbTotalUsersObj) {
                    var data = countlyCommon.extractMetric(doc, doc['meta'][queryMetric], clearMetricObject, [
                        {
                            name:queryMetric,
                            func:function (rangeArr, dataObj) {
                                return rangeArr;
                            }
                        },
                        { "name":"t" },
                        { "name":"n" },
                        { "name":"u" }
                    ], formatTotalUsersObj(dbTotalUsersObj));
                    
                    if(callback){
                        callback(data);
                    }
                });
			}
			else if(callback){
                callback([]);
			}
		});
	};
        
    fetch.fetchMetric = function(params) {
        var output = function(data){
            common.returnOutput(params, data);
        };
		if(!params.qstring.metric) {
			common.returnMessage(params, 400, 'Must provide metric');
        } else {
			switch (params.qstring.metric) {
                case 'locations':
                case 'countries':
                    fetch.getMetric(params, 'users', "countries", output);
                    break;
                case 'sessions':
                case 'users':
					fetch.getMetric(params, 'users', null, output);
                    break;
                case 'app_versions':
                    fetch.getMetric(params, "device_details", "app_versions", output);
                    break;
                case 'os':
                    fetch.getMetric(params, "device_details", "platforms", output);
                    break;
                case 'os_versions':
                    fetch.getMetric(params, "device_details", "platform_versions", output);
                    break;
                case 'resolutions':
                    fetch.getMetric(params, "device_details", "resolutions", output);
                    break;
                case 'device_details':
					fetch.getMetric(params, 'device_details', null, output);
                    break;
                case 'cities':
                    if (plugins.getConfig("api").city_data !== false) {
						fetch.getMetric(params, "cities", "cities", output);
                    } else {
                        common.returnOutput(params, []);
                    }
                    break;
                default:
					fetch.getMetric(params, params.qstring.metric, null, output);
                    break;
            }
		}
    };

    fetch.fetchTimeObj = function (collection, params, isCustomEvent, options) {
        fetchTimeObj(collection, params, isCustomEvent, options, function(output) {
            common.returnOutput(params, output);
        });
    };
    
    fetch.getTimeObj = function (collection, params, options, callback) {
        fetchTimeObj(collection, params, null, options, callback);
    };

    fetch.getTimeObjForEvents = function (collection, params, options, callback) {
        fetchTimeObj(collection, params, true, options, callback);
    };

    fetch.fetchTotalUsersObj = function (metric, params) {
        getTotalUsersObj(metric, params, function(output) {
            common.returnOutput(params, output);
        });
    };

    fetch.getTotalUsersObj = getTotalUsersObj;

    function getTotalUsersObj(metric, params, callback) {
        if(!plugins.getConfig("api").total_users){
            return callback([]);
        }
        var periodObj = getPeriodObj(params);

        /*
            List of shortcodes in app_users document for different metrics
         */
        var shortcodesForMetrics = {
                "devices": "d",
                "app_versions": "av",
                "platforms": "p",
                "platform_versions": "pv",
                "resolutions": "r",
                "countries": "cc",
                "cities": "cty",
                "carriers": "c"
            };

        /*
            This API endpoint /o?method=total_users should only be used if
            selected period contains today
         */
        if (periodObj.periodContainsToday) {
            /*
             Aggregation query uses this variable for $match operation
             We skip uid-sequence document and filter results by last session timestamp
             */
            var match = {
                _id: { $ne: "uid-sequence" },
                ls: countlyCommon.getTimestampRangeQuery(params, true)
            };

            /*
             Let plugins register their short codes and match queries
             */
            plugins.dispatch("/o/method/total_users", {shortcodesForMetrics:shortcodesForMetrics, match:match});

            /*
             Aggregation query uses this variable for $group operation
             If there is no corresponding shortcode default is to count all
             users in this period
             */
            var groupBy = (shortcodesForMetrics[metric])? "$" + shortcodesForMetrics[metric] : "users";

            /*
             In app users we store city information even if user is not from
             the selected timezone country of the app. We $match to get city
             information only for users in app's configured country
             */
            if (metric == "cities") {
                match["cc"] = params.app_cc;
            }

            common.db.collection("app_users" + params.app_id).aggregate([
                {
                    $match: match
                },
                {
                    $group: {
                        _id: groupBy,
                        u: { $sum: 1 }
                    }
                }
            ], { allowDiskUse:true }, function(error, appUsersDbResult) {

                if (shortcodesForMetrics[metric]) {

                    var metricChangesMatch =  {
                        ts: countlyCommon.getTimestampRangeQuery(params, true)
                    };

                    metricChangesMatch[shortcodesForMetrics[metric] + ".o"] = { "$exists": true };

                    /*
                     We track changes to metrics such as app version in metric_changesAPPID collection;
                     { "uid" : "2", "ts" : 1462028715, "av" : { "o" : "1:0:1", "n" : "1:1" } }

                     While returning a total user result for any metric, we check metric_changes to see
                     if any metric change happened in the selected period and include this in the result
                     */
                    common.db.collection("metric_changes" + params.app_id).aggregate([
                        {
                            $match: metricChangesMatch
                        },
                        {
                            $group: { _id: '$' + shortcodesForMetrics[metric] + ".o", uniqDeviceIds: { $addToSet: '$uid'}}
                        },
                        {
                            $unwind:"$uniqDeviceIds"
                        },
                        {
                            $group: { _id: "$_id",  u: { $sum: 1 }}
                        }
                    ], { allowDiskUse:true }, function(error, metricChangesDbResult) {
                        
                        if(metricChangesDbResult){
                            var appUsersDbResultIndex = _.pluck(appUsersDbResult, '_id');
    
                            for (var i = 0; i < metricChangesDbResult.length; i++) {
                                var itemIndex = appUsersDbResultIndex.indexOf(metricChangesDbResult[i]._id);
    
                                if (itemIndex == -1) {
                                    appUsersDbResult.push(metricChangesDbResult[i])
                                } else {
                                    appUsersDbResult[itemIndex].u += metricChangesDbResult[i].u;
                                }
                            }
                        }

                        callback(appUsersDbResult);
                    });
                } else {
                    callback(appUsersDbResult);
                }
            });
        } else {
            callback([]);
        }
    }

    fetch.formatTotalUsersObj = formatTotalUsersObj;

    function formatTotalUsersObj(obj, forMetric) {
        var tmpObj = {},
            processingFunction;

        /*
        switch(forMetric) {
            case "devices":
                processingFunction = countlyDevice.getDeviceFullName;
                break;
        }
        */
        if(obj){
            for (var i = 0; i < obj.length; i++) {
                var tmpKey = (processingFunction)? processingFunction(obj[i]["_id"]) : obj[i]["_id"];
    
                tmpObj[tmpKey] = obj[i]["u"];
            }
        }

        return tmpObj;
    }

    function fetchTimeObj(collection, params, isCustomEvent, options, callback) {
        if(typeof options === "function"){
            callback = options;
            options = {};
        }
        
        if(typeof options === "undefined"){
            options = {};
        }
        
        if(typeof options.unique === "undefined")
            options.unique = common.dbMap.unique;
        
        if(typeof options.id === "undefined")
            options.id = params.app_id;
        
        if(typeof options.levels === "undefined")
            options.levels = {};
        
        if(typeof options.levels.daily === "undefined")
            options.levels.daily = [common.dbMap.total, common.dbMap.new, common.dbEventMap.count, common.dbEventMap.sum, common.dbEventMap.duration];
        
        if(typeof options.levels.monthly === "undefined")
            options.levels.monthly = [common.dbMap.total, common.dbMap.new, common.dbMap.duration, common.dbMap.events, common.dbEventMap.count, common.dbEventMap.sum, common.dbEventMap.duration];
            
        if (params.qstring.action == "refresh") {
            var dbDateIds = common.getDateIds(params),
                fetchFromZero = {},
                fetchFromMonth = {};

            if (isCustomEvent) {
                fetchFromZero['meta'] = 1;
                fetchFromZero['meta_v2'] = 1;
                fetchFromZero['m'] = 1;
                fetchFromMonth["d." + params.time.day] = 1;
                fetchFromMonth["m"] = 1;
            } else {
                fetchFromZero["d." + options.unique] = 1;
                fetchFromZero["d." + params.time.month + "." + options.unique] = 1;
                fetchFromZero['meta'] = 1;
                fetchFromZero['meta_v2'] = 1;
                fetchFromZero['m'] = 1;

                fetchFromMonth["d.w" + params.time.weekly + "." + options.unique] = 1;
                fetchFromMonth["d." + params.time.day] = 1;
                fetchFromMonth["m"] = 1;

                if (collection == 'users') {
                    fetchFromZero["d." + common.dbMap.frequency] = 1;
                    fetchFromZero["d." + common.dbMap.loyalty] = 1;
                    fetchFromZero["d." + params.time.month + "." + common.dbMap.frequency] = 1;
                    fetchFromZero["d." + params.time.month + "." + common.dbMap.loyalty] = 1;

                    fetchFromMonth["d.w" + params.time.weekly + "." + common.dbMap.frequency] = 1;
                    fetchFromMonth["d.w" + params.time.weekly + "." + common.dbMap.loyalty] = 1;
                }
            }

            var zeroIdToFetch = "",
                monthIdToFetch = "";

            if (isCustomEvent) {
                var segment = params.qstring.segmentation || "no-segment";

                zeroIdToFetch = "no-segment_" + dbDateIds.zero;
                monthIdToFetch = segment + "_" + dbDateIds.month;
            } else {
                zeroIdToFetch = options.id + "_" + dbDateIds.zero;
                monthIdToFetch = options.id + "_" + dbDateIds.month;
            }
            
            var zeroDocs = [zeroIdToFetch];
            var monthDocs = [monthIdToFetch];
            for(var i = 0; i < common.base64.length; i++){
                zeroDocs.push(zeroIdToFetch+"_"+common.base64[i]);
                monthDocs.push(monthIdToFetch+"_"+common.base64[i]);
            }

            common.db.collection(collection).find({'_id': {$in: zeroDocs}}, fetchFromZero).toArray(function(err, zeroObject) {
                common.db.collection(collection).find({'_id': {$in: monthDocs}}, fetchFromMonth).toArray(function(err, monthObject) {
                    callback(getMergedObj(zeroObject.concat(monthObject), true, options.levels));
                });
            });
        } else {
            var periodObj = getPeriodObj(params),
                documents = [];

            if (isCustomEvent) {
                var segment = params.qstring.segmentation || "no-segment";

                for (var i = 0; i < periodObj.reqZeroDbDateIds.length; i++) {
                    documents.push("no-segment_" + periodObj.reqZeroDbDateIds[i]);
                    for(var m = 0; m < common.base64.length; m++){
                        documents.push("no-segment_" + periodObj.reqZeroDbDateIds[i]+"_"+common.base64[m]);
                    }
                }

                for (var i = 0; i < periodObj.reqMonthDbDateIds.length; i++) {
                    documents.push(segment + "_" + periodObj.reqMonthDbDateIds[i]);
                    for(var m = 0; m < common.base64.length; m++){
                        documents.push(segment + "_" + periodObj.reqMonthDbDateIds[i]+"_"+common.base64[m]);
                    }
                }
            } else {
                for (var i = 0; i < periodObj.reqZeroDbDateIds.length; i++) {
                    documents.push(options.id + "_" + periodObj.reqZeroDbDateIds[i]);
                    for(var m = 0; m < common.base64.length; m++){
                        documents.push(options.id + "_" + periodObj.reqZeroDbDateIds[i]+"_"+common.base64[m]);
                    }
                }

                for (var i = 0; i < periodObj.reqMonthDbDateIds.length; i++) {
                    documents.push(options.id + "_" + periodObj.reqMonthDbDateIds[i]);
                    for(var m = 0; m < common.base64.length; m++){
                        documents.push(options.id + "_" + periodObj.reqMonthDbDateIds[i]+"_"+common.base64[m]);
                    }
                }
            }

            common.db.collection(collection).find({'_id': {$in: documents}}, {}).toArray(function(err, dataObjects) {
                callback(getMergedObj(dataObjects, false, options.levels));
            });
        }
        
        function deepMerge(ob1, ob2){
            for(var i in ob2){
                if(typeof ob1[i] === "undefined"){
                    ob1[i] = ob2[i];
                }
                else if(ob1[i] && typeof ob1[i] === "object"){
                    ob1[i] = deepMerge(ob1[i], ob2[i]);
                }
                else{
                    ob1[i] += ob2[i];
                }
            }
            return ob1;
        }

        function getMergedObj(dataObjects, isRefresh, levels) {
            var mergedDataObj = {};
        
            if(dataObjects){
                for (var i = 0; i < dataObjects.length; i++) {
                    if (!dataObjects[i] || !dataObjects[i].m) {
                        continue;
                    }
        
                    var mSplit = dataObjects[i].m.split(":"),
                        year = mSplit[0],
                        month = mSplit[1];
        
                    if (!mergedDataObj[year]) {
                        mergedDataObj[year] = {};
                    }
        
                    if (month == 0) {
                        //old meta merge
                        if (mergedDataObj['meta']) {
                            for (var metaEl in dataObjects[i]['meta']) {
                                if (mergedDataObj['meta'][metaEl]) {
                                    mergedDataObj['meta'][metaEl] = union(mergedDataObj['meta'][metaEl], dataObjects[i]['meta'][metaEl]);
                                } else {
                                    mergedDataObj['meta'][metaEl] = dataObjects[i]['meta'][metaEl];
                                }
                            }
                        } else {
                            mergedDataObj['meta'] = dataObjects[i]['meta'] || {};
                        }
                        
                        //new meta merge as hash tables
                        if(dataObjects[i]['meta_v2']){
                            for (var metaEl in dataObjects[i]['meta_v2']) {
                                if (mergedDataObj['meta'][metaEl]) {
                                    mergedDataObj['meta'][metaEl] = union(mergedDataObj['meta'][metaEl], Object.keys(dataObjects[i]['meta_v2'][metaEl]));
                                } else {
                                    mergedDataObj['meta'][metaEl] = Object.keys(dataObjects[i]['meta_v2'][metaEl]);
                                }
                            }
                        }
        
                        if (mergedDataObj[year]) {
                            mergedDataObj[year] = deepMerge(mergedDataObj[year], dataObjects[i]['d']);
                        } else {
                            mergedDataObj[year] = dataObjects[i]['d'] || {};
                        }
                    } else {
                        if (mergedDataObj[year][month]) {
                            mergedDataObj[year][month] = deepMerge(mergedDataObj[year][month], dataObjects[i]['d']);
                        } else {
                            mergedDataObj[year][month] = dataObjects[i]['d'] || {};
                        }
        
                        if (!isRefresh) {
                            for (var day in dataObjects[i]['d']) {
                                for (var prop in dataObjects[i]['d'][day]) {
                                    if ((collection == 'users' || dataObjects[i]['s'] == 'no-segment') && prop <= 23 && prop >= 0) {
                                        continue;
                                    }
        
                                    if (typeof dataObjects[i]['d'][day][prop] === 'object') { 
                                        for (var secondLevel in dataObjects[i]['d'][day][prop]) {
                                            if (levels.daily.indexOf(secondLevel) !== -1) {
                                                if (!mergedDataObj[year][month][prop]) {
                                                    mergedDataObj[year][month][prop] = {};
                                                }
        
                                                if (mergedDataObj[year][month][prop][secondLevel]) {
                                                    mergedDataObj[year][month][prop][secondLevel] += dataObjects[i]['d'][day][prop][secondLevel];
                                                } else {
                                                    mergedDataObj[year][month][prop][secondLevel] = dataObjects[i]['d'][day][prop][secondLevel];
                                                }
        
                                                if (!mergedDataObj[year][prop]) {
                                                    mergedDataObj[year][prop] = {};
                                                }
        
                                                if (mergedDataObj[year][prop][secondLevel]) {
                                                    mergedDataObj[year][prop][secondLevel] += dataObjects[i]['d'][day][prop][secondLevel];
                                                } else {
                                                    mergedDataObj[year][prop][secondLevel] = dataObjects[i]['d'][day][prop][secondLevel];
                                                }
                                            }
                                        }
                                    } else if (levels.monthly.indexOf(prop) !== -1) {
        
                                        if (mergedDataObj[year][month][prop]) {
                                            mergedDataObj[year][month][prop] += dataObjects[i]['d'][day][prop];
                                        } else {
                                            mergedDataObj[year][month][prop] = dataObjects[i]['d'][day][prop];
                                        }
        
                                        if (mergedDataObj[year][prop]) {
                                            mergedDataObj[year][prop] += dataObjects[i]['d'][day][prop];
                                        } else {
                                            mergedDataObj[year][prop] = dataObjects[i]['d'][day][prop];
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        
            return mergedDataObj;
        }
    }

    fetch.getPeriodObj = function(coll, params) {
        common.returnOutput(params, getPeriodObj(params));
    };

    function getDateName(date, bucket) {
        var dateName;
        switch (bucket){
            case "daily":
                dateName = date.year() + "." + (date.month() + 1) + "." + date.format("D");
                break;
            case"weekly":
                dateName = date.isoyear() + ".w" + date.isoweek();
                break;
            case "monthly":
                dateName = date.year() + ".m" +  (date.month() + 1);
                break;
            case "hourly":
                dateName = date.year() + "." + (date.month() + 1) + "." + date.format("D") + ".h" + date.format("H");
                break;
        }
        return dateName;
    }

    //returns the union of two arrays
    function union(x, y) {
        var obj = {};
        for (var i = x.length-1; i >= 0; -- i) {
            obj[x[i]] = x[i];
        }

        for (var i = y.length-1; i >= 0; -- i) {
            obj[y[i]] = y[i];
        }

        var res = [];

        for (var k in obj) {
            res.push(obj[k]);
        }

        return res;
    }

    //removes the duplicates from array
    function unique(x){
        var obj = {};
        for (var i = x.length-1; i >= 0; -- i) {
            obj[x[i]] = x[i];
        }

        var res = [];

        for (var k in obj) {
            res.push(obj[k]);
        }

        return res;
    }

    function getPeriodObj(params) {
		params.qstring.period = params.qstring.period || "month";
        if (params.qstring.period && params.qstring.period.indexOf(",") !== -1) {
            try {
                params.qstring.period = JSON.parse(params.qstring.period);
            } catch (SyntaxError) {
				console.log('Parse period JSON failed');
                return false;
            }
        }

        countlyCommon.setPeriod(params.qstring.period);
        countlyCommon.setTimezone(params.appTimezone);

        return countlyCommon.periodObj;
    }
}(fetch));

module.exports = fetch;