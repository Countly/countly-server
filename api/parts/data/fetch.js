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
                        collection = result.order[0];
                    } else {
                        result.list.sort();
                        collection = result.list[0];
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
                    var output = {},
                        periods = [
                            {period: "30days", out: "30days"},
                            {period: "7days", out: "7days"},
                            {period: "hour", out: "today"}
                        ];

                    countlyCommon.setTimezone(params.appTimezone);
                    countlySession.setDb(usersDoc || {});
                    countlyDeviceDetails.setDb(deviceDetailsDoc || {});
                    countlyCarrier.setDb(carriersDoc || {});

                    for (var i = 0; i < periods.length; i++) {
                        countlyCommon.setPeriod(periods[i].period);

                        output[periods[i].out] = {
                            dashboard: countlySession.getSessionData(),
                            top: {
                                platforms: countlyDeviceDetails.getPlatformBars(),
                                resolutions: countlyDeviceDetails.getResolutionBars(),
                                carriers: countlyCarrier.getCarrierBars(),
                                users: countlySession.getTopUserBars()
                            },
                            period: countlyCommon.getDateRange()
                        };
                    }

                    common.returnOutput(params, output);
                });
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
            var output = {},
                periods = [
                    {period: "30days", out: "30days"},
                    {period: "7days", out: "7days"},
                    {period: "hour", out: "today"}
                ];

            countlyCommon.setTimezone(params.appTimezone);
            countlyLocation.setDb(locationsDoc || {});

            for (var i = 0; i < periods.length; i++) {
                countlyCommon.setPeriod(periods[i].period);

                output[periods[i].out] = countlyLocation.getLocationData({maxCountries: 10, sort: "new"});
            }

            common.returnOutput(params, output);
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
	
	fetch.fetchMetric = function(params) {
		function getMetric(metric){
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
				if (doc['meta'] && doc['meta'][params.qstring.metric]) {
					var data = countlyCommon.extractMetric(doc, doc['meta'][params.qstring.metric], clearMetricObject, [
						{
							name:params.qstring.metric,
							func:function (rangeArr, dataObj) {
								return rangeArr;
							}
						},
						{ "name":"t" },
						{ "name":"n" },
						{ "name":"u" }
					]);
					common.returnOutput(params, data);
				}
				else{
					common.returnOutput(params, []);
				}
			});
		}
		if(!params.qstring.metric)
			common.returnMessage(params, 400, 'Must provide metric');
		else{
			switch (params.qstring.metric) {
                case 'locations':
                case 'countries':
                case 'sessions':
                case 'users':
					getMetric('users');
                    break;
                case 'app_versions':
                case 'os':
                case 'os_versions':
                case 'resolutions':
                case 'device_details':
					getMetric('device_details');
                    break;
                case 'cities':
                    if (plugins.getConfig("api").city_data !== false) {
						getMetric(params.qstring.metric);
                    } else {
                        common.returnOutput(params, []);
                    }
                    break;
                default:
					getMetric(params.qstring.metric);
                    break;
            }
		}
    };

    fetch.fetchTimeObj = function (collection, params, isCustomEvent) {
        fetchTimeObj(collection, params, isCustomEvent, function(output) {
            common.returnOutput(params, output);
        });
    };
    
    fetch.getTimeObj = function (collection, params, callback) {
        fetchTimeObj(collection, params, null, callback);
    };

    function fetchTimeObj(collection, params, isCustomEvent, callback) {
        if (params.qstring.action == "refresh") {
            var dbDateIds = common.getDateIds(params),
                fetchFromZero = {},
                fetchFromMonth = {};

            if (isCustomEvent) {
                fetchFromZero['meta'] = 1;
                fetchFromZero['m'] = 1;
                fetchFromMonth["d." + params.time.day] = 1;
                fetchFromMonth["m"] = 1;
            } else {
                fetchFromZero["d." + common.dbMap.unique] = 1;
                fetchFromZero["d." + params.time.month + "." + common.dbMap.unique] = 1;
                fetchFromZero['meta'] = 1;
                fetchFromZero['m'] = 1;

                fetchFromMonth["d.w" + params.time.weekly + "." + common.dbMap.unique] = 1;
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
                zeroIdToFetch = params.app_id + "_" + dbDateIds.zero;
                monthIdToFetch = params.app_id + "_" + dbDateIds.month;
            }

            common.db.collection(collection).findOne({'_id': zeroIdToFetch}, fetchFromZero, function(err, zeroObject) {
                common.db.collection(collection).findOne({'_id': monthIdToFetch}, fetchFromMonth, function(err, monthObject) {
                    var tmpDataArr = [];
                    tmpDataArr.push(zeroObject);
                    tmpDataArr.push(monthObject);

                    callback(getMergedObj(tmpDataArr, true));
                });
            });
        } else {
            var periodObj = getPeriodObj(params),
                documents = [];

            if (isCustomEvent) {
                var segment = params.qstring.segmentation || "no-segment";

                for (var i = 0; i < periodObj.reqZeroDbDateIds.length; i++) {
                    documents.push("no-segment_" + periodObj.reqZeroDbDateIds[i]);
                }

                for (var i = 0; i < periodObj.reqMonthDbDateIds.length; i++) {
                    documents.push(segment + "_" + periodObj.reqMonthDbDateIds[i]);
                }
            } else {
                for (var i = 0; i < periodObj.reqZeroDbDateIds.length; i++) {
                    documents.push(params.app_id + "_" + periodObj.reqZeroDbDateIds[i]);
                }

                for (var i = 0; i < periodObj.reqMonthDbDateIds.length; i++) {
                    documents.push(params.app_id + "_" + periodObj.reqMonthDbDateIds[i]);
                }
            }

            common.db.collection(collection).find({'_id': {$in: documents}}, {}).toArray(function(err, dataObjects) {
                callback(getMergedObj(dataObjects));
            });
        }

        function getMergedObj(dataObjects, isRefresh) {
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
                        if (mergedDataObj['meta']) {
                            for (var metaEl in dataObjects[i]['meta']) {
                                if (mergedDataObj['meta'][metaEl]) {
                                    mergedDataObj['meta'][metaEl] = union(mergedDataObj['meta'][metaEl], dataObjects[i]['meta'][metaEl]);
                                } else {
                                    mergedDataObj['meta'][metaEl] = dataObjects[i]['meta'][metaEl];
                                }
                            }
                        } else {
                            mergedDataObj['meta'] = dataObjects[i]['meta'] || [];
                        }
    
                        if (mergedDataObj[year]) {
                            for (var prop in dataObjects[i]['d']) {
                                mergedDataObj[year][prop] = dataObjects[i]['d'][prop];
                            }
                        } else {
                            mergedDataObj[year] = dataObjects[i]['d'] || {};
                        }
                    } else {
                        if (mergedDataObj[year][month]) {
                            for (var prop in dataObjects[i]['d']) {
                                mergedDataObj[year][month][prop] = dataObjects[i]['d'][prop];
                            }
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
                                            if (secondLevel == common.dbMap.total || secondLevel == common.dbMap.new ||
                                                secondLevel == common.dbEventMap.count || secondLevel == common.dbEventMap.sum) {
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
                                    } else if (prop == common.dbMap.total || prop == common.dbMap.new ||
                                        prop == common.dbMap.duration || prop == common.dbMap.events ||
                                        prop == common.dbEventMap.count || prop == common.dbEventMap.sum) {
    
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