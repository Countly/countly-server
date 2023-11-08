/**
* This module is meant from fetching data from db and processing and outputting
* @module api/parts/data/fetch
*/

const { getAdminApps, getUserApps } = require('../../utils/rights.js');

/** @lends module:api/parts/data/fetch */
var fetch = {},
    common = require('./../../utils/common.js'),
    moment = require('moment-timezone'),
    async = require('async'),
    countlyModel = require('../../lib/countly.model.js'),
    countlySession = countlyModel.load("users"),
    countlyCarrier = countlyModel.load("carriers"),
    countlyDeviceDetails = countlyModel.load("device_details"),
    countlyLocation = countlyModel.load("countries"),
    countlyEvents = countlyModel.load("event"),
    countlyCommon = require('../../lib/countly.common.js'),
    _ = require('underscore'),
    crypto = require('crypto'),
    usage = require('./usage.js'),
    STATUS_MAP = require('../jobs/job').STATUS_MAP,
    plugins = require('../../../plugins/pluginManager.js');

/**
* Prefetch event data, either by provided key or first event in the list and output result to browser
* @param {string} collection - event key
* @param {params} params - params object
**/
fetch.prefetchEventData = function(collection, params) {
    if (!params.qstring.event) {
        common.readBatcher.getOne("events", { '_id': params.app_id }, (err, result) => {
            if (result && result.list) {
                if (result.order && result.order.length) {
                    for (let i = 0; i < result.order.length; i++) {
                        if (result.order[i].indexOf("[CLY]") !== 0) {
                            collection = result.order[i];
                            break;
                        }
                    }
                }
                else {
                    result.list.sort();
                    for (let i = 0; i < result.list.length; i++) {
                        if (result.list[i].indexOf("[CLY]") !== 0) {
                            collection = result.list[i];
                            break;
                        }
                    }
                }

                var collectionName = "events" + crypto.createHash('sha1').update(collection + params.app_id).digest('hex');
                fetch.fetchTimeObj(collectionName, params, true);
            }
            else {
                common.returnOutput(params, {});
            }
        });
    }
    else {
        var collectionName = "events" + crypto.createHash('sha1').update(params.qstring.event + params.app_id).digest('hex');
        fetch.fetchTimeObj(collectionName, params, true);
    }
};

/**
* Fetch specific event data and output to browser
* @param {string} collection - event key
* @param {params} params - params object
**/
fetch.fetchEventData = function(collection, params) {
    var fetchFields = {};

    if (params.qstring.action === "refresh") {
        fetchFields[params.time.daily] = 1;
        fetchFields.meta = 1;
    }

    if (params.qstring.date === "today") {
        fetchFields[params.time.daily + "." + common.dbMap.count] = 1;
        fetchFields[params.time.daily + "." + common.dbMap.sum] = 1;
        fetchFields[params.time.daily + "." + common.dbMap.dur] = 1;
    }

    var idToFetch = params.qstring.segmentation || "no-segment";

    common.db.collection(collection).findOne({ _id: idToFetch }, fetchFields, function(err, result) {
        if (err || !result) {
            result = {};
            result[moment().year()] = {};
        }

        common.returnOutput(params, result);
    });
};


/**
* The return the event groups data by _id.
* @param {Object} params - params object
* @param {string} params._id - The id of the event group id.
**/
fetch.fetchEventGroupById = function(params) {
    const COLLECTION_NAME = "event_groups";
    const { qstring: { _id } } = params;
    common.db.collection(COLLECTION_NAME).findOne({ _id }, function(error, result) {
        if (error || !result) {
            common.returnMessage(params, 500, `error: ${error}`);
            return false;
        }
        common.returnOutput(params, result);
    });
};

/**
* The return the event groups data by app_id.
* @param {Object} params - params object
* @param {string} params.app_id - The id of the event group of application id.
**/
fetch.fetchEventGroups = function(params) {
    const COLLECTION_NAME = "event_groups";
    const { qstring: { app_id } } = params;
    common.db.collection(COLLECTION_NAME).find({ app_id }).sort({ 'order': 1 }).toArray(function(error, result) {
        if (error || !result) {
            common.returnMessage(params, 500, `error: ${error}`);
            return false;
        }
        common.returnOutput(params, result);
    });
};

/**
* The return the merged event data for event groups.
* @param {Object} params - params object
**/
fetch.fetchMergedEventGroups = function(params) {
    const { qstring: { event } } = params;
    fetch.getMergedEventGroups(params, event, {}, function(result) {
        common.returnOutput(params, result);
    });
};


/**
* The return the merged event data for event groups.
* @param {params} params - params object with app_id and date
* @param {string} event - id of event group
* @param {object=} options - additional optional settings
* @param {object=} options.db - database connection to use, by default will try to use common.db
* @param {string=} options.unique - name of the metric to treat as unique, default "u" from common.dbMap.unique
* @param {string=} options.id - id to use as prefix from documents, by default will use params.app_id
* @param {object=} options.levels - describes which metrics to expect on which levels
* @param {array=} options.levels.daily - which metrics to expect on daily level, default ["t", "n", "c", "s", "dur"]
* @param {array=} options.levels.monthly - which metrics to expect on monthly level, default ["t", "n", "d", "e", "c", "s", "dur"]
* @param {function} callback - callback to retrieve the data, receiving only one param which is output
*/
fetch.getMergedEventGroups = function(params, event, options, callback) {
    const COLLECTION_NAME = "event_groups";
    common.db.collection(COLLECTION_NAME).findOne({ _id: event }, function(error, result) {
        if (error || !result) {
            common.returnMessage(params, 500, `error: ${error}`);
            return false;
        }
        options = options || {};
        options.event_groups = true;
        // options.segmentation = result.segments;

        fetch.getMergedEventData(params, result.source_events, options, function(resultMergedEvents) {
            callback(resultMergedEvents);
        });
    });
};

/**
* Get merged data from multiple events in standard data model and output to browser
* @param {params} params - params object
**/
fetch.fetchMergedEventData = function(params) {
    fetch.getMergedEventData(params, params.qstring.events, {}, function(result) {
        common.returnOutput(params, result);
    });
};

/**
* Get merged data from multiple events in standard data model
* @param {params} params - params object with app_id and date
* @param {array} events - array with event keys
* @param {object=} options - additional optional settings
* @param {object=} options.db - database connection to use, by default will try to use common.db
* @param {string=} options.unique - name of the metric to treat as unique, default "u" from common.dbMap.unique
* @param {string=} options.id - id to use as prefix from documents, by default will use params.app_id
* @param {object=} options.levels - describes which metrics to expect on which levels
* @param {array=} options.levels.daily - which metrics to expect on daily level, default ["t", "n", "c", "s", "dur"]
* @param {array=} options.levels.monthly - which metrics to expect on monthly level, default ["t", "n", "d", "e", "c", "s", "dur"]
* @param {function} callback - callback to retrieve the data, receiving only one param which is output
*/
fetch.getMergedEventData = function(params, events, options, callback) {
    var eventKeysArr = [];

    for (let i = 0; i < events.length; i++) {
        eventKeysArr.push(events[i] + params.app_id);
    }

    if (!eventKeysArr.length) {
        callback({});
    }
    else {
        async.map(eventKeysArr, getEventData, function(err, allEventData) {
            var mergedEventOutput = {};
            let meta = {};

            for (let i = 0; i < allEventData.length; i++) {

                // delete allEventData[i].meta;

                for (let levelOne in allEventData[i]) {
                    if (typeof allEventData[i][levelOne] !== 'object') {
                        if (mergedEventOutput[levelOne]) {
                            mergedEventOutput[levelOne] += allEventData[i][levelOne];
                        }
                        else {
                            mergedEventOutput[levelOne] = allEventData[i][levelOne];
                        }
                    }
                    else {
                        for (let levelTwo in allEventData[i][levelOne]) {
                            if (!mergedEventOutput[levelOne]) {
                                mergedEventOutput[levelOne] = {};
                            }

                            if (typeof allEventData[i][levelOne][levelTwo] !== 'object') {
                                if (mergedEventOutput[levelOne][levelTwo]) {
                                    mergedEventOutput[levelOne][levelTwo] += allEventData[i][levelOne][levelTwo];
                                }
                                else {
                                    mergedEventOutput[levelOne][levelTwo] = allEventData[i][levelOne][levelTwo];
                                }
                            }
                            else {
                                for (let levelThree in allEventData[i][levelOne][levelTwo]) {
                                    if (!mergedEventOutput[levelOne][levelTwo]) {
                                        mergedEventOutput[levelOne][levelTwo] = {};
                                    }

                                    if (typeof allEventData[i][levelOne][levelTwo][levelThree] !== 'object') {
                                        if (mergedEventOutput[levelOne][levelTwo][levelThree]) {
                                            mergedEventOutput[levelOne][levelTwo][levelThree] += allEventData[i][levelOne][levelTwo][levelThree];
                                        }
                                        else {
                                            mergedEventOutput[levelOne][levelTwo][levelThree] = allEventData[i][levelOne][levelTwo][levelThree];
                                        }
                                    }
                                    else {
                                        for (let levelFour in allEventData[i][levelOne][levelTwo][levelThree]) {
                                            if (!mergedEventOutput[levelOne][levelTwo][levelThree]) {
                                                mergedEventOutput[levelOne][levelTwo][levelThree] = {};
                                            }

                                            if (typeof allEventData[i][levelOne][levelTwo][levelThree][levelFour] !== 'object') {
                                                if (mergedEventOutput[levelOne][levelTwo][levelThree][levelFour]) {
                                                    mergedEventOutput[levelOne][levelTwo][levelThree][levelFour] += allEventData[i][levelOne][levelTwo][levelThree][levelFour];
                                                }
                                                else {
                                                    mergedEventOutput[levelOne][levelTwo][levelThree][levelFour] = allEventData[i][levelOne][levelTwo][levelThree][levelFour];
                                                }
                                            }
                                            else {
                                                for (let levelFive in allEventData[i][levelOne][levelTwo][levelThree][levelFour]) {
                                                    if (!mergedEventOutput[levelOne][levelTwo][levelThree][levelFour]) {
                                                        mergedEventOutput[levelOne][levelTwo][levelThree][levelFour] = {};
                                                    }

                                                    if (mergedEventOutput[levelOne][levelTwo][levelThree][levelFour][levelFive]) {
                                                        mergedEventOutput[levelOne][levelTwo][levelThree][levelFour][levelFive] += allEventData[i][levelOne][levelTwo][levelThree][levelFour][levelFive];
                                                    }
                                                    else {
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

            meta = allEventData.map(x => x.meta).reduce((acc, x) => {
                for (var key in x) {
                    if (acc[key]) {
                        acc[key] = acc[key].concat(x[key]);
                    }
                    else {
                        acc[key] = x[key];
                    }
                }
                return acc;
            }, {});

            //make meta with unique values only
            for (let i in meta) {
                meta[i] = [...new Set(meta[i])];
            }

            /*const createSegmentsForMergedEvents = (dummyMeta, sourceSegments)=>{
                for (const segment in dummyMeta) {
                    const _segments = "segments";
                    if (segment === _segments) {
                        continue;
                    }
                    if (sourceSegments.includes(segment)) {
                        dummyMeta[_segments] = Array.from(new Set([...dummyMeta[_segments], segment]));
                    }
                    else {
                        delete dummyMeta[segment];
                    }
                }
                return dummyMeta;
            };*/

            callback({ ...mergedEventOutput, "meta": meta });
        });
    }

    /**
    * Get event data from database
    * @param {string} eventKey - event keys
    * @param {function} done - function to call when data fetched
    **/
    function getEventData(eventKey, done) {
        var collectionName = "events" + crypto.createHash('sha1').update(eventKey).digest('hex');
        fetchTimeObj(collectionName, params, true, options, function(output) {
            done(null, output || {});
        });
    }
};

/**
* Get collection data for specific app and output to browser
* @param {string} collection - collection name
* @param {params} params - params object
**/
fetch.fetchCollection = function(collection, params) {
    common.db.collection(collection).findOne({ '_id': params.app_id }, function(err, result) {
        if (!result) {
            result = {};
        }

        if (result && collection === 'events') {
            if (result.list) {
                result.list = _.filter(result.list, function(l) {
                    return l.indexOf('[CLY]') !== 0;
                });
            }
            if (result.segments) {
                for (let i in result.segments) {
                    if (i.indexOf('[CLY]') === 0) {
                        delete result.segments[i];
                    }
                }
            }
            const pluginsGetConfig = plugins.getConfig("api", params.app && params.app.plugins, true);
            result.limits = {
                event_limit: pluginsGetConfig.event_limit,
                event_segmentation_limit: pluginsGetConfig.event_segmentation_limit,
                event_segmentation_value_limit: pluginsGetConfig.event_segmentation_value_limit,
            };
        }

        common.returnOutput(params, result);
    });
};

/**
* Get time data for specific metric by collection and output to browser
* @param {string} collection - collection name
* @param {params} params - params object
**/
fetch.fetchTimeData = function(collection, params) {

    var fetchFields = {};

    if (params.qstring.action === "refresh") {
        fetchFields[params.time.yearly + "." + common.dbMap.unique] = 1;
        fetchFields[params.time.monthly + "." + common.dbMap.unique] = 1;
        fetchFields[params.time.weekly + "." + common.dbMap.unique] = 1;
        fetchFields[params.time.daily] = 1;
        fetchFields.meta = 1;
    }

    common.db.collection(collection).findOne({ '_id': params.app_id }, fetchFields, function(err, result) {
        if (!result) {
            result = {};
            result[moment.year()] = {};
        }

        common.returnOutput(params, result);
    });
};


/**
* Get data for dashboard api and output to browser
* @param {params} params - params object
**/
fetch.fetchDashboard = function(params) {
    params.qstring.period = params.qstring.period || "30days";

    fetchTimeObj('users', params, false, function(usersDoc) {
        fetchTimeObj('device_details', params, false, function(deviceDetailsDoc) {
            fetchTimeObj('carriers', params, false, function(carriersDoc) {
                var periods = [
                    {
                        period: "30days",
                        out: "30days"
                    },
                    {
                        period: "7days",
                        out: "7days"
                    },
                    {
                        period: "hour",
                        out: "today"
                    }
                ];

                if (params.qstring.period !== "30days") {
                    periods = [{
                        period: params.qstring.period,
                        out: params.qstring.period
                    }];
                }

                countlyCommon.setTimezone(params.appTimezone);
                countlySession.setDb(usersDoc || {});
                countlyDeviceDetails.setDb(deviceDetailsDoc || {});
                countlyCarrier.setDb(carriersDoc || {});

                async.map(periods, function(period, callback) {
                    params.qstring.period = period.period;

                    fetch.getTotalUsersObj("users", params, function(dbTotalUsersObj) {
                        countlyCommon.setPeriod(period.period);

                        countlySession.setTotalUsersObj(fetch.formatTotalUsersObj(dbTotalUsersObj), fetch.formatTotalUsersObj(dbTotalUsersObj, null, true));

                        var data = {
                            out: period.out,
                            data: {
                                dashboard: countlySession.getSessionData(),
                                top: {
                                    platforms: countlyDeviceDetails.getBars("os"),
                                    resolutions: countlyDeviceDetails.getBars("resolutions"),
                                    carriers: countlyCarrier.getBars("carriers"),
                                    users: countlySession.getBars()
                                },
                                period: countlyCommon.getDateRange()
                            }
                        };

                        callback(null, data);
                    });
                },
                function(err, output) {
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

/**
* Get data for old all apps api and output to browser
* @param {params} params - params object
**/
fetch.fetchAllApps = function(params) {
    var filter = {};

    if (params.qstring.filter) {
        try {
            filter = JSON.parse(params.qstring.filter);
        }
        catch (ex) {
            filter = {};
        }
    }

    if (!params.member.global_admin) {
        let apps = {};
        let adminApps = getAdminApps(params.member);
        let userApps = getUserApps(params.member);

        for (let i = 0; i < adminApps.length; i++) {
            if (adminApps[i] === "") {
                continue;
            }
            apps[adminApps[i]] = true;
        }

        for (let i = 0; i < userApps.length; i++) {
            if (userApps[i] === "") {
                continue;
            }
            apps[userApps[i]] = true;
        }

        var fromApps = [];
        for (let i in apps) {
            fromApps.push(common.db.ObjectID(i));
        }
        filter._id = { '$in': fromApps };
    }
    common.db.collection("apps").find(filter, {
        _id: 1,
        name: 1
    }).toArray(function(err, apps) {

        /**
        * Extract chart data from document object
        * @param {object} db - document object from db
        * @param {object} props - property object with name and func
        * @returns {object} extracted chart data
        **/
        function extractData(db, props) {
            var chartData = [
                    {
                        data: [],
                        label: "",
                        color: '#333933'
                    }
                ],
                dataProps = [];
            dataProps.push(props);
            return countlyCommon.extractChartData(db, countlySession.clearObject, chartData, dataProps).chartDP[0].data;
        }

        /**
        * Set app id to params object
        * @param {string} inAppId - app id
        **/
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

                fetch.getTotalUsersObj("users", params, function(dbTotalUsersObj) {
                    countlySession.setDb(usersDoc || {});
                    countlySession.setTotalUsersObj(fetch.formatTotalUsersObj(dbTotalUsersObj), fetch.formatTotalUsersObj(dbTotalUsersObj, null, true));

                    var sessionData = countlySession.getSessionData();
                    var charts = {
                        "total-users": extractData(usersDoc || {}, {
                            name: "t",
                            func: function(dataObj) {
                                return dataObj.u;
                            }
                        }),
                        "new-users": extractData(usersDoc || {}, { name: "n" }),
                        "total-sessions": extractData(usersDoc || {}, { name: "t" }),
                        "time-spent": extractData(usersDoc || {}, {
                            name: "average",
                            func: function(dataObj) {
                                return ((dataObj.t === 0) ? 0 : ((dataObj.d / dataObj.t) / 60).toFixed(1));
                            }
                        }),
                        "total-time-spent": extractData(usersDoc || {}, {
                            name: "t",
                            func: function(dataObj) {
                                return ((dataObj.d / 60).toFixed(1));
                            }
                        }),
                        "avg-events-served": extractData(usersDoc || {}, {
                            name: "average",
                            func: function(dataObj) {
                                return ((dataObj.u === 0) ? 0 : ((dataObj.e / dataObj.u).toFixed(1)));
                            }
                        })
                    };

                    var data = {
                        _id: app._id,
                        name: app.name,
                        test: "1",
                        sessions: sessionData.total_sessions,
                        users: sessionData.total_users,
                        newusers: sessionData.new_users,
                        duration: sessionData.total_time,
                        avgduration: sessionData.avg_time,
                        charts: charts
                    };

                    callback(null, data);
                });
            });
        },
        function(err2, res) {
            common.returnOutput(params, res);
        });
    });
};

/**
* Calls aggregation query to calculate top three values based on 't' in given collection
* @param {params} params - params object
* @param {string} collection - collection name
* @param {function} callback - callback function
**/
function getDataforTops(params, collection, callback) {
    var periodObj = countlyCommon.getPeriodObj(params);
    var pipeline = [];

    var period = params.qstring.period || 'month'; //month is default
    var matchStage = {};
    var selectMap = {};
    var curday = "";
    var curmonth = "";
    var first_month = "";
    var last_month = "";
    if (period === "day") {
        matchStage = { '_id': { $regex: params.app_id + "_" + periodObj.activePeriod + "" } };
    }
    else if (period === "month") {
        matchStage = { '_id': { $regex: params.app_id + "_" + periodObj.activePeriod + "" } };
    }
    else if (period === "hour" || period === "yesterday") {
        var this_date = periodObj.activePeriod.split(".");
        curmonth = this_date[0] + ":" + this_date[1];
        curday = this_date[2];
        matchStage = { '_id': { $regex: params.app_id + "_" + curmonth + "" } };
    }
    else { // days or timestamps
        var last_pushed = "";
        var month_array = [];
        first_month = periodObj.currentPeriodArr[0].split(".");
        first_month = first_month[0] + ":" + first_month[1];

        last_month = periodObj.currentPeriodArr[periodObj.currentPeriodArr.length - 1].split(".");
        last_month = last_month[0] + ":" + last_month[1];
        for (let i = 0; i < periodObj.currentPeriodArr.length; i++) {
            let kk = periodObj.currentPeriodArr[i].split(".");
            if (!selectMap[kk[0] + ":" + kk[1]]) {
                selectMap[kk[0] + ":" + kk[1]] = [];
            }
            selectMap[kk[0] + ":" + kk[1]].push(kk[2]);
            if (last_pushed === "" || last_pushed !== kk[0] + ":" + kk[1]) {
                last_pushed = kk[0] + ":" + kk[1];
                month_array.push({ "_id": { $regex: params.app_id + "_" + kk[0] + ":" + kk[1] } });
            }
        }
        matchStage = { $or: month_array };
    }
    pipeline.push({ $match: matchStage });

    if (period === "hour" || period === "yesterday") {
        pipeline.push({ $project: { d: { $objectToArray: "$d." + curday } } });
        pipeline.push({ $unwind: "$d" });
        pipeline.push({ $group: { _id: "$d.k", "t": { $sum: "$d.v.t" } } });
    }
    else if (period === "month" || period === "day") {
        pipeline.push({ $project: { d: { $objectToArray: "$d" } } });
        pipeline.push({ $unwind: "$d" });
        pipeline.push({ $project: { d: { $objectToArray: "$d.v" } } });
        pipeline.push({ $unwind: "$d" });
        pipeline.push({ $group: { _id: "$d.k", "t": { $sum: "$d.v.t" } } });
    }
    else {
        var branches = [];
        branches.push({ case: { $eq: ["$m", first_month] }, then: { $in: ["$$key.k", selectMap[first_month]] } });
        if (first_month !== last_month) {
            branches.push({ case: { $eq: ["$m", last_month] }, then: { $in: ["$$key.k", selectMap[last_month]] } });
        }

        var rules = { $switch: { branches: branches, default: true } };
        pipeline.push({
            $project: {
                d: {
                    $filter: {
                        input: { $objectToArray: "$d" },
                        as: "key",
                        cond: rules
                    }
                }
            }
        });
        pipeline.push({ $unwind: "$d" });
        pipeline.push({ $project: { d: { $objectToArray: "$d.v" } } });
        pipeline.push({ $unwind: "$d" });
        pipeline.push({ $group: { _id: "$d.k", "t": { $sum: "$d.v.t" } } });
    }
    pipeline.push({ $sort: { "t": -1 } }); //sort values
    // pipeline.push({$limit: 3}); //limit count

    common.db.collection(collection).aggregate(pipeline, { allowDiskUse: true }, function(err, res) {
        callback(res || []);
    });
}

/**
* Get data for tops api and output to browser
* @param {params} params - params object
**/
fetch.fetchTop = function(params) {
    var obj = {};
    var allMetrics = usage.getPredefinedMetrics(params, obj);
    if (params.qstring.metric) {
        let metric = params.qstring.metric;
        fetchData(params, allMetrics, metric, function(res) {
            common.returnOutput(params, res);
        });
    }
    else if (params.qstring.metrics) {
        if (typeof params.qstring.metrics === "string") {
            try {
                params.qstring.metrics = JSON.parse(params.qstring.metrics);
            }
            catch (ex) {
                console.log("Error parsing metrics", params.qstring.metrics);
                params.qstring.metrics = [];
            }
        }
        if (params.qstring.metrics.length) {
            var data = {};
            async.each(params.qstring.metrics, function(metric, done) {
                fetchData(params, allMetrics, metric, function(res) {
                    data[metric] = res;
                    done();
                });
            }, function() {
                common.returnOutput(params, data);
            });
        }
        else {
            common.returnOutput(params, {});
        }
    }
};

/**
* Get data for tops api and output to browser
* @param {params} params - params object
**/
fetch.fetchTops = function(params) {
    if (params.qstring.metric || params.qstring.metrics) {
        fetch.fetchTop(params);
    }
    else {
        fetchTimeObj('users', params, false, function(usersDoc) {
            fetchTimeObj('device_details', params, false, function(deviceDetailsDoc) {
                fetchTimeObj('carriers', params, false, function(carriersDoc) {
                    countlyCommon.setTimezone(params.appTimezone);
                    countlySession.setDb(usersDoc || {});
                    countlyDeviceDetails.setDb(deviceDetailsDoc || {});
                    countlyCarrier.setDb(carriersDoc || {});
                    countlyLocation.setDb(usersDoc || {});

                    var output = {
                        platforms: countlyDeviceDetails.getBars("os"),
                        resolutions: countlyDeviceDetails.getBars("resolutions"),
                        carriers: countlyCarrier.getBars("carriers"),
                        countries: countlyLocation.getBars("countries")
                    };

                    common.returnOutput(params, output);
                });
            });
        });
    }
};

/**
* Get data for countries api and output to browser
* @param {params} params - params object
**/
fetch.fetchCountries = function(params) {
    params.qstring.period = "30days";

    fetchTimeObj('users', params, false, function(locationsDoc) {
        var periods = [
            {
                period: "30days",
                out: "30days"
            },
            {
                period: "7days",
                out: "7days"
            },
            {
                period: "hour",
                out: "today"
            }
        ];

        countlyCommon.setTimezone(params.appTimezone);
        countlyLocation.setDb(locationsDoc || {});

        async.map(periods, function(period, callback) {
            params.qstring.period = period.period;

            fetch.getTotalUsersObj("countries", params, function(dbTotalUsersObj) {
                countlyCommon.setPeriod(period.period);

                countlyLocation.setTotalUsersObj(fetch.formatTotalUsersObj(dbTotalUsersObj), fetch.formatTotalUsersObj(dbTotalUsersObj, null, true));

                var data = {
                    out: period.out,
                    data: countlyLocation.getLocationData({
                        maxCountries: 10,
                        sort: "new"
                    })
                };

                callback(null, data);
            });
        },
        function(err, output) {
            var processedOutput = {};

            for (let i = 0; i < output.length; i++) {
                processedOutput[output[i].out] = output[i].data;
            }

            common.returnOutput(params, processedOutput);
        });
    });
};

/**
* Get session data and output to browser
* @param {params} params - params object
**/
fetch.fetchSessions = function(params) {
    fetchTimeObj('users', params, false, function(usersDoc) {
        countlySession.setDb(usersDoc || {});
        common.returnOutput(params, countlySession.getSubperiodData());
    });
};

/**
* Get loyalty ranges data and output to browser
* @param {params} params - params object
**/
fetch.fetchLoyalty = function(params) {
    fetchTimeObj("users", params, false, function(doc) {
        var _meta = [];
        if (doc.meta) {
            _meta = (doc.meta['l-ranges']) ? doc.meta['l-ranges'] : [];
        }
        var chartData = countlyCommon.extractRangeData(doc, "l", _meta, function(index) {
            return index;
        });

        common.returnOutput(params, chartData);
    });
};

/**
* Get frequency ranges data and output to browser
* @param {params} params - params object
**/
fetch.fetchFrequency = function(params) {
    fetchTimeObj("users", params, false, function(doc) {
        var _meta = [];
        if (doc.meta) {
            _meta = (doc.meta['f-ranges']) ? doc.meta['f-ranges'] : [];
        }
        var chartData = countlyCommon.extractRangeData(doc, "f", _meta, function(index) {
            return index;
        });

        common.returnOutput(params, chartData);
    });
};

/**
* Get durations ranges data and output to browser
* @param {params} params - params object
**/
fetch.fetchDurations = function(params) {
    fetchTimeObj("users", params, false, function(doc) {
        var _meta = [];
        if (doc.meta) {
            _meta = (doc.meta['d-ranges']) ? doc.meta['d-ranges'] : [];
        }
        var chartData = countlyCommon.extractRangeData(doc, "ds", _meta, function(index) {
            return index;
        });

        common.returnOutput(params, chartData);
    });
};

/**
* Get metric segment data from database, merging year and month and splitted docments together and breaking down data by segment
* @param {params} params - params object with app_id and date
* @param {string} metric - name of the collection where to get data from
* @param {object} totalUsersMetric - data from total users api request to correct unique user values
* @param {function} callback - callback to retrieve the data, receiving only one param which is output
* @example <caption>Retrieved data</caption>
* [
*    {"_id":"Cricket Communications","t":37,"n":21,"u":34},
*    {"_id":"Tele2","t":32,"n":19,"u":31},
*    {"_id":"\tAt&amp;t","t":32,"n":20,"u":31},
*    {"_id":"O2","t":26,"n":19,"u":26},
*    {"_id":"Metro Pcs","t":28,"n":13,"u":26},
*    {"_id":"Turkcell","t":23,"n":11,"u":23},
*    {"_id":"Telus","t":22,"n":15,"u":22},
*    {"_id":"Rogers Wireless","t":21,"n":13,"u":21},
*    {"_id":"Verizon","t":21,"n":11,"u":21},
*    {"_id":"Sprint","t":21,"n":11,"u":20},
*    {"_id":"Vodafone","t":22,"n":12,"u":19},
*    {"_id":"Orange","t":18,"n":12,"u":18},
*    {"_id":"T-mobile","t":17,"n":9,"u":17},
*    {"_id":"Bell Canada","t":12,"n":6,"u":12}
* ]
*/
fetch.getMetric = function(params, metric, totalUsersMetric, callback) {
    fetch.getMetricWithOptions(params, metric, totalUsersMetric, {}, callback);
};

/**
* Get metric segment data from database with options, merging year and month and splitted docments together and breaking down data by segment
* @param {params} params - params object with app_id and date
* @param {string} metric - name of the collection where to get data from
* @param {object} totalUsersMetric - data from total users api request to correct unique user values
* @param {object=} fetchTimeOptions - additional optional settings
* @param {object=} fetchTimeOptions.db - database connection to use, by default will try to use common.db
* @param {string=} fetchTimeOptions.unique - name of the metric to treat as unique, default "u" from common.dbMap.unique
* @param {string=} fetchTimeOptions.id - id to use as prefix from documents, by default will use params.app_id
* @param {object=} fetchTimeOptions.levels - describes which metrics to expect on which levels
* @param {array=} fetchTimeOptions.levels.daily - which metrics to expect on daily level, default ["t", "n", "c", "s", "dur"]
* @param {array=} fetchTimeOptions.levels.monthly - which metrics to expect on monthly level, default ["t", "n", "d", "e", "c", "s", "dur"]
* @param {function} callback - callback to retrieve the data, receiving only one param which is output
* @example <caption>Retrieved data</caption>
* [
*    {"_id":"Cricket Communications","t":37,"n":21,"u":34},
*    {"_id":"Tele2","t":32,"n":19,"u":31},
*    {"_id":"\tAt&amp;t","t":32,"n":20,"u":31},
*    {"_id":"O2","t":26,"n":19,"u":26},
*    {"_id":"Metro Pcs","t":28,"n":13,"u":26},
*    {"_id":"Turkcell","t":23,"n":11,"u":23},
*    {"_id":"Telus","t":22,"n":15,"u":22},
*    {"_id":"Rogers Wireless","t":21,"n":13,"u":21},
*    {"_id":"Verizon","t":21,"n":11,"u":21},
*    {"_id":"Sprint","t":21,"n":11,"u":20},
*    {"_id":"Vodafone","t":22,"n":12,"u":19},
*    {"_id":"Orange","t":18,"n":12,"u":18},
*    {"_id":"T-mobile","t":17,"n":9,"u":17},
*    {"_id":"Bell Canada","t":12,"n":6,"u":12}
* ]
*/
fetch.getMetricWithOptions = function(params, metric, totalUsersMetric, fetchTimeOptions, callback) {
    var queryMetric = params.qstring.metric || metric;
    countlyCommon.setTimezone(params.appTimezone);
    if (params.qstring.period) {
        countlyCommon.setPeriod(params.qstring.period);
    }
    fetchTimeObj(metric, params, false, fetchTimeOptions, function(doc) {
        var clearMetricObject = function(obj) {
            if (obj) {
                if (!obj.t) {
                    obj.t = 0;
                }
                if (!obj.n) {
                    obj.n = 0;
                }
                if (!obj.u) {
                    obj.u = 0;
                }
            }
            else {
                obj = {
                    "t": 0,
                    "n": 0,
                    "u": 0
                };
            }

            return obj;
        };

        if (doc.meta && doc.meta[queryMetric]) {
            fetch.getTotalUsersObjWithOptions(totalUsersMetric, params, { db: fetchTimeOptions.db }, function(dbTotalUsersObj) {
                var data = countlyCommon.extractMetric(doc, doc.meta[queryMetric], clearMetricObject, [
                    {
                        name: queryMetric,
                        func: function(rangeArr) {
                            return rangeArr;
                        }
                    },
                    { "name": "t" },
                    { "name": "n" },
                    { "name": "u" }
                ], fetch.formatTotalUsersObj(dbTotalUsersObj));

                if (callback) {
                    callback(data);
                }
            });
        }
        else if (callback) {
            callback([]);
        }
    });
};


/**
* Get collection and metric name from metric string
* @param {string} metric - metric/segment name
* @return {Array} array with collection, metric, model object
**/
fetch.metricToCollection = function(metric) {
    switch (metric) {
    case 'locations':
    case 'countries':
        return ['users', "countries", countlyLocation];
    case 'sessions':
    case 'users':
        return ['users', null, countlySession];
    case 'app_versions':
        return ["device_details", "app_versions", countlyDeviceDetails];
    case 'os':
    case 'platforms':
        return ["device_details", "os", countlyDeviceDetails];
    case 'os_versions':
    case 'platform_version':
        return ["device_details", "os_versions", countlyDeviceDetails];
    case 'resolutions':
        return ["device_details", "resolutions", countlyDeviceDetails];
    case 'device_type':
        return ["device_details", "device_type", countlyDeviceDetails];
    case 'device_details':
        return ['device_details', null, countlyDeviceDetails];
    case 'devices':
        return ['devices', "devices", null];
    case 'manufacturers':
        return ["devices", "manufacturers", null];
    case 'cities':
        return ["cities", "cities"];
    default:
        var data = { metric: metric, data: [metric, null] };
        plugins.dispatch("/metric/collection", data);
        return data.data;
    }
};

/**
* Get metric data for metric api and output to browser
* @param {params} params - params object
**/
fetch.fetchMetric = function(params) {
    var output = function(data) {
        common.returnOutput(params, data);
    };
    if (!params.qstring.metric) {
        common.returnMessage(params, 400, 'Must provide metric');
    }
    else {
        var metrics = fetch.metricToCollection(params.qstring.metric);
        if (metrics[0]) {
            fetch.getMetric(params, metrics[0], metrics[1], output);
        }
        else {
            common.returnOutput(params, []);
        }

    }
};

/**
* Get events overview data for overview api and output to browser
* @param {params} params - params object
**/
fetch.fetchDataEventsOverview = function(params) {
    var ob = {
        app_id: params.qstring.app_id,
        appTimezone: params.appTimezone,
        qstring: { period: params.qstring.period },
        time: common.initTimeObj(params.qstring.timezone, params.qstring.timestamp)
    };

    var map = {};
    for (var k in params.qstring.events) {
        map[params.qstring.events[k]] = { "key": params.qstring.events[k] };
    }

    //get eventgroups information(because we dont know which is what)
    common.db.collection("event_groups").find({ "_id": { "$in": params.qstring.events } }).toArray(function(err, eventgroups) {
        if (err) {
            console.log(err);
        }
        for (var n = 0; n < eventgroups.length; n++) {
            map[eventgroups[n]._id] = { key: eventgroups[n]._id, is_event_group: true, source_events: eventgroups[n].source_events };
        }

        var events = [];
        for (var z in map) {
            events.push(map[z]);
        }

        if (Array.isArray(params.qstring.events)) {
            var data = {};
            async.each(events, function(event, done) {
                if (event.is_event_group) {
                    data[event.key] = {};
                    let options = {};
                    options.event_groups = true;
                    // options.segmentation = result.segments;
                    fetch.getMergedEventData(params, event.source_events, options, function(resultMergedEvents) {
                        countlyEvents.setDb(resultMergedEvents || {});
                        var my_line1 = countlyEvents.getNumber("c");
                        var my_line2 = countlyEvents.getNumber("s");
                        var my_line3 = countlyEvents.getNumber("dur");

                        data[event.key] = {};
                        data[event.key].data = {
                            "count": my_line1,
                            "sum": my_line2,
                            "dur": my_line3
                        };

                        done();
                    });
                }
                else {
                    var collectionName = "events" + crypto.createHash('sha1').update(event.key + params.qstring.app_id).digest('hex');
                    fetch.getTimeObjForEvents(collectionName, ob, function(doc) {
                        countlyEvents.setDb(doc || {});
                        var my_line1 = countlyEvents.getNumber("c");
                        var my_line2 = countlyEvents.getNumber("s");
                        var my_line3 = countlyEvents.getNumber("dur");
                        data[event.key] = {};
                        data[event.key].data = {
                            "count": my_line1,
                            "sum": my_line2,
                            "dur": my_line3
                        };
                        done();
                    });
                }
            },
            function() {
                common.returnOutput(params, data);
            });
        }
        else {
            common.returnOutput(params, {});
        }
    });
};

/**
* Get top events data
* @param {params} params - params object
**/

fetch.fetchDataTopEvents = function(params) {
    const {
        qstring: { app_id, period, limit, filter }
    } = params;
    const collectionName = "top_events";
    const _app_id = common.db.ObjectID(app_id);
    common.db.collection(collectionName).findOne({ period, app_id: _app_id }, function(error, result) {
        if (error || !result) {
            return common.returnOutput(params, false);
        }
        else {
            if (filter) {
                if (filter === "duration") {
                    const { data, _id, ts, totalCount } = result;
                    let _data = Object.keys(data).map(function(key) {
                        const decodeKey = countlyCommon.decode(key);
                        const { total, change, trend } = data[key].data.duration;
                        return { name: decodeKey, duration: total, trend: trend, change: change };
                    });
                    const sortByDuration = _data.sort((a, b) => b.duration - a.duration).slice(0, limit);
                    return common.returnOutput(params, { _id, app_id, ts, period, totalCount, data: sortByDuration });
                }
                else if (filter === "sum") {
                    const { data, _id, ts, totalCount } = result;
                    let _data = Object.keys(data).map(function(key) {
                        const decodeKey = countlyCommon.decode(key);
                        const { total, change, trend } = data[key].data.sum;
                        return { name: decodeKey, sum: total, trend: trend, change: change };
                    });
                    const sortBySum = _data.sort((a, b) => b.sum - a.sum).slice(0, limit);
                    return common.returnOutput(params, { _id, app_id, ts, period, totalCount, data: sortBySum });
                }
                else {
                    const { data, _id, ts, totalCount } = result;
                    let _data = Object.keys(data).map(function(key) {
                        const decodeKey = countlyCommon.decode(key);
                        const { total, change, trend } = data[key].data.count;
                        return { name: decodeKey, count: total, trend: trend, change: change };
                    });
                    const sortByCount = _data.sort((a, b) => b.count - a.count).slice(0, limit);
                    return common.returnOutput(params, { _id, app_id, ts, period, totalCount, data: sortByCount });
                }
            }
            const { data, _id, ts, totalCount, prevTotalCount, totalSum, prevTotalSum, totalDuration, prevTotalDuration, prevSessionCount, totalSessionCount, prevUsersCount, totalUsersCount } = result;
            let _data = Object.keys(data).map(function(key) {
                const decodeKey = countlyCommon.decode(key);
                return {
                    name: decodeKey,
                    count: (data[key].data.count && data[key].data.count.total) || 0,
                    sum: (data[key].data.sum && data[key].data.sum.total) || 0,
                    duration: (data[key].data.duration && data[key].data.duration.total) || 0
                };
            });
            const sortByCount = _data.sort((a, b) => b.count - a.count).slice(0, limit);
            common.returnOutput(params, { _id, app_id, ts, period, data: sortByCount, totalCount, prevTotalCount, totalSum, prevTotalSum, totalDuration, prevTotalDuration, prevSessionCount, totalSessionCount, prevUsersCount, totalUsersCount });
        }
    }
    );
};



/**
* Get events data for events pi output to browser
* @param {params} params - params object
* @returns {void} void
**/
fetch.fetchEvents = function(params) {
    if (params.qstring.event && params.qstring.event.length) {
        let collectionName = "events" + crypto.createHash('sha1').update(params.qstring.event + params.app_id).digest('hex');
        fetch.getTimeObjForEvents(collectionName, params, function(doc) {
            countlyEvents.setDb(doc || {});
            if (params.qstring.segmentation && params.qstring.segmentation !== "no-segment") {
                common.returnOutput(params, countlyEvents.getSegmentedData(params.qstring.segmentation));
            }
            else {
                common.returnOutput(params, countlyEvents.getSubperiodData());
            }
        });
    }
    else if (params.qstring.events && params.qstring.events.length) {
        if (typeof params.qstring.events === "string") {
            try {
                params.qstring.events = JSON.parse(params.qstring.events);
                if (typeof params.qstring.events === "string") {
                    params.qstring.events = [params.qstring.events];
                }
            }
            catch (ex) {
                common.returnMessage(params, 400, 'Must provide valid array with event keys as events param.');
                return false;
            }
        }
        if (Array.isArray(params.qstring.events)) {
            var data = {};
            async.each(params.qstring.events, function(event, done) {
                let collectionName = "events" + crypto.createHash('sha1').update(event + params.app_id).digest('hex');
                fetch.getTimeObjForEvents(collectionName, params, function(doc) {
                    countlyEvents.setDb(doc || {});
                    if (params.qstring.segmentation && params.qstring.segmentation !== "no-segment") {
                        data[event] = countlyEvents.getSegmentedData(params.qstring.segmentation);
                    }
                    else {
                        data[event] = countlyEvents.getSubperiodData();
                    }
                    done();
                });
            }, function() {
                common.returnOutput(params, data);
            });
        }
    }
    else {
        common.returnMessage(params, 400, 'Must provide event or events');
    }
};

/**
* Get Countly standard data model from database for segments or single level data as users, merging year and month and splitted docments together and output to browser
* @param {string} collection - name of the collection where to get data from
* @param {params} params - params object with app_id and date
* @param {boolean} isCustomEvent - if value we are fetching for custom event or standard metric
* @param {object=} options - additional optional settings
* @param {object=} options.db - database connection to use, by default will try to use common.db
* @param {string=} options.unique - name of the metric to treat as unique, default "u" from common.dbMap.unique
* @param {string=} options.id - id to use as prefix from documents, by default will use params.app_id
* @param {object=} options.levels - describes which metrics to expect on which levels
* @param {array=} options.levels.daily - which metrics to expect on daily level, default ["t", "n", "c", "s", "dur"]
* @param {array=} options.levels.monthly - which metrics to expect on monthly level, default ["t", "n", "d", "e", "c", "s", "dur"]
*/
fetch.fetchTimeObj = function(collection, params, isCustomEvent, options) {
    fetchTimeObj(collection, params, isCustomEvent, options, function(output) {
        common.returnOutput(params, output);
    });
};

/**
* Get Countly standard data model from database for segments or single level data as users, merging year and month and splitted docments together
* @param {string} collection - name of the collection where to get data from
* @param {params} params - params object with app_id and date
* @param {object=} options - additional optional settings
* @param {object=} options.db - database connection to use, by default will try to use common.db
* @param {string=} options.unique - name of the metric to treat as unique, default "u" from common.dbMap.unique
* @param {string=} options.id - id to use as prefix from documents, by default will use params.app_id
* @param {object=} options.levels - describes which metrics to expect on which levels
* @param {array=} options.levels.daily - which metrics to expect on daily level, default ["t", "n", "c", "s", "dur"]
* @param {array=} options.levels.monthly - which metrics to expect on monthly level, default ["t", "n", "d", "e", "c", "s", "dur"]
* @param {function} callback - callback to retrieve the data, receiving only one param which is output
*/
fetch.getTimeObj = function(collection, params, options, callback) {
    fetchTimeObj(collection, params, null, options, callback);
};

/**
* Get Countly standard data model from database for events, merging year and month and splitted docments together
* @param {string} collection - name of the collection where to get data from
* @param {params} params - params object with app_id and date
* @param {object=} options - additional optional settings
* @param {object=} options.db - database connection to use, by default will try to use common.db
* @param {string=} options.unique - name of the metric to treat as unique, default "u" from common.dbMap.unique
* @param {string=} options.id - id to use as prefix from documents, by default will use params.app_id
* @param {object=} options.levels - describes which metrics to expect on which levels
* @param {array=} options.levels.daily - which metrics to expect on daily level, default ["t", "n", "c", "s", "dur"]
* @param {array=} options.levels.monthly - which metrics to expect on monthly level, default ["t", "n", "d", "e", "c", "s", "dur"]
* @param {function} callback - callback to retrieve the data, receiving only one param which is output
*/
fetch.getTimeObjForEvents = function(collection, params, options, callback) {
    fetchTimeObj(collection, params, true, options, callback);
};

/**
* Get data for estimating total users count if period contains today and output to browser
* @param {string} metric - name of the collection where to get data from
* @param {params} params - params object with app_id and date
*/
fetch.fetchTotalUsersObj = function(metric, params) {
    fetch.getTotalUsersObj(metric, params, function(output) {
        common.returnOutput(params, output);
    });
};

/**
* Get data for estimating total users count if period contains today
* @param {string} metric - name of the collection where to get data from
* @param {params} params - params object with app_id and date
* @param {function} callback - callback to retrieve the data, receiving only one param which is output
*/
fetch.getTotalUsersObj = function(metric, params, callback) {
    fetch.getTotalUsersObjWithOptions(metric, params, {}, callback);
};

/**
* Get data for estimating total users count allowing plugins to add their own data
* @param {string} metric - name of the collection where to get data from
* @param {params} params - params object with app_id and date
* @param {object=} options - additional optional settings
* @param {object=} options.db - database connection to use, by default will try to use common.db
* @param {function} callback - callback to retrieve the data, receiving only one param which is output
* @returns {void} void
*/
fetch.getTotalUsersObjWithOptions = function(metric, params, options, callback) {
    if (typeof options === "undefined") {
        options = {};
    }

    if (typeof options.db === "undefined") {
        options.db = common.db;
    }

    if (!plugins.getConfig("api", params.app && params.app.plugins, true).total_users) {
        return callback([]);
    }
    var periodObj = countlyCommon.getPeriodObj(params, "30days");

    /*
            List of shortcodes in app_users document for different metrics
    */
    var shortcodesForMetrics = {
        "devices": "d",
        "device_type": "dt",
        "app_versions": "av",
        "os": "p",
        "platforms": "p",
        "os_versions": "pv",
        "platform_versions": "pv",
        "resolutions": "r",
        "countries": "cc",
        "cities": "cty",
        "carriers": "c"
    };

    if (!params.time) {
        params.time = common.initTimeObj(params.appTimezone, params.qstring.timestamp);
    }

    /*
        Aggregation query uses this variable for $match operation
        We skip uid-sequence document and filter results by last session timestamp
    */
    var match = { ls: countlyCommon.getTimestampRangeQuery(params, true) };

    /*
        Let plugins register their short codes and match queries
    */
    plugins.dispatch("/o/method/total_users", {
        shortcodesForMetrics: shortcodesForMetrics,
        match: match
    });

    var ob = { params: params, period: periodObj, metric: metric, options: options, result: [], shortcodesForMetrics: shortcodesForMetrics, match: match };

    plugins.dispatch("/estimation/correction", ob, function() {
        /*
                If no plugin has returned any estimation corrections then
                this API endpoint /o?method=total_users should only be used if
                selected period contains today
        */
        if (ob.result.length === 0 && periodObj.periodContainsToday) {

            /*
                Aggregation query uses this variable for $group operation
                If there is no corresponding shortcode default is to count all
                users in this period
            */
            var groupBy = (shortcodesForMetrics[metric]) ? "$" + shortcodesForMetrics[metric] : "users";

            /*
                In app users we store city information even if user is not from
                the selected timezone country of the app. We $match to get city
                information only for users in app's configured country
            */
            if (metric === "cities") {
                match.cc = params.app_cc;
            }

            if (groupBy === "users") {
                options.db.collection("app_users" + params.app_id).count(match, function(error, appUsersDbResult) {
                    if (!error && appUsersDbResult) {
                        callback([{ "_id": "users", "u": appUsersDbResult }]);
                    }
                    else {
                        callback([]);
                    }
                });
            }
            else {

                options.db.collection("app_users" + params.app_id).aggregate([
                    { $match: match },
                    {
                        $group: {
                            _id: groupBy,
                            u: { $sum: 1 }
                        }
                    }
                ], { allowDiskUse: true }, function(error, appUsersDbResult) {

                    if (appUsersDbResult && plugins.getConfig("api", params.app && params.app.plugins, true).metric_changes && shortcodesForMetrics[metric]) {

                        var metricChangesMatch = { ts: countlyCommon.getTimestampRangeQuery(params, true) };

                        metricChangesMatch[shortcodesForMetrics[metric] + ".o"] = { "$exists": true };

                        /*
                            We track changes to metrics such as app version in metric_changesAPPID collection;
                            { "uid" : "2", "ts" : 1462028715, "av" : { "o" : "1:0:1", "n" : "1:1" } }

                            While returning a total user result for any metric, we check metric_changes to see
                            if any metric change happened in the selected period and include this in the result
                        */
                        options.db.collection("metric_changes" + params.app_id).aggregate([
                            { $match: metricChangesMatch },
                            {
                                $group: {
                                    _id: '$' + shortcodesForMetrics[metric] + ".o",
                                    uniqDeviceIds: { $addToSet: '$uid' }
                                }
                            },
                            {
                                $project: {
                                    _id: "$_id",
                                    u: { $size: "$uniqDeviceIds" }
                                }
                            }
                        ], { allowDiskUse: true }, function(err, metricChangesDbResult) {

                            if (metricChangesDbResult) {
                                var appUsersDbResultIndex = _.pluck(appUsersDbResult, '_id');

                                for (let i = 0; i < metricChangesDbResult.length; i++) {
                                    var itemIndex = appUsersDbResultIndex.indexOf(metricChangesDbResult[i]._id);

                                    if (itemIndex === -1) {
                                        appUsersDbResult.push(metricChangesDbResult[i]);
                                    }
                                    else {
                                        appUsersDbResult[itemIndex].u += metricChangesDbResult[i].u;
                                    }
                                }
                            }
                            callback(appUsersDbResult || {});
                        });
                    }
                    else {
                        callback(appUsersDbResult || {});
                    }
                });
            }
        }
        else {
            callback(ob.result);
        }
    });
};

/**
* Format total users object based on propeties it has (converting short metric values to long proper ones, etc)
* @param {object} obj - total users object
* @param {string} forMetric - for which metric to format result
* @param {boolean} prev - get data for previous period, if available
* @returns {object} total users object with formated values
**/
fetch.formatTotalUsersObj = function(obj, forMetric, prev) {
    var tmpObj = {},
        processingFunction;

    switch (forMetric) {
    case "devices":
        //processingFunction = countlyDevice.getDeviceFullName;
        break;
    }

    if (obj) {
        for (let i = 0; i < obj.length; i++) {
            var tmpKey = (processingFunction) ? processingFunction(obj[i]._id) : obj[i]._id;

            if (prev) {
                tmpObj[tmpKey] = obj[i].pu || 0;
            }
            else {
                tmpObj[tmpKey] = obj[i].u;
            }
        }
    }

    return tmpObj;
};

/**
* Fetch db data in standard format
* @param {string} collection - from which collection to fetch
* @param {params} params - params object
* @param {boolean} isCustomEvent - if we are fetching custom event or not
* @param {object=} options - additional optional settings
* @param {object=} options.db - database connection to use, by default will try to use common.db
* @param {string=} options.unique - name of the metric to treat as unique, default "u" from common.dbMap.unique
* @param {string=} options.id - id to use as prefix from documents, by default will use params.app_id
* @param {object=} options.levels - describes which metrics to expect on which levels
* @param {array=} options.levels.daily - which metrics to expect on daily level, default ["t", "n", "c", "s", "dur"]
* @param {array=} options.levels.monthly - which metrics to expect on monthly level, default ["t", "n", "d", "e", "c", "s", "dur"]
* @param {function} callback - to call when fetch done
**/
function fetchTimeObj(collection, params, isCustomEvent, options, callback) {
    if (typeof options === "function") {
        callback = options;
        options = {};
    }

    if (typeof options === "undefined") {
        options = {};
    }

    if (typeof options.db === "undefined") {
        options.db = common.db;
    }

    if (typeof options.unique === "undefined") {
        options.unique = common.dbUniqueMap[collection] || common.dbUniqueMap["*"];
    }

    if (!Array.isArray(options.unique)) {
        options.unique = [options.unique];
    }

    if (typeof options.id === "undefined") {
        options.id = params.app_id;
    }

    if (typeof options.levels === "undefined") {
        options.levels = {};
    }

    if (typeof options.levels.daily === "undefined") {
        options.levels.daily = [];
    }

    if (typeof options.levels.monthly === "undefined") {
        options.levels.monthly = [];
    }

    if (params.qstring.fullRange) {
        options.db.collection(collection).find({ '_id': { $regex: "^" + options.id + ".*" } }).toArray(function(err1, data) {
            callback(getMergedObj(data, true, options.levels, params.truncateEventValuesList));
        });
    }
    else if (params.qstring.action === "refresh") {
        var dbDateIds = common.getDateIds(params),
            fetchFromZero = {},
            fetchFromMonth = {};

        if (isCustomEvent) {
            fetchFromZero.meta = 1;
            fetchFromZero.meta_v2 = 1;
            fetchFromZero.m = 1;
            fetchFromMonth["d." + params.time.day] = 1;
            fetchFromMonth.m = 1;
        }
        else {
            fetchFromZero.meta = 1;
            fetchFromZero.meta_v2 = 1;
            fetchFromZero.m = 1;
            fetchFromMonth.m = 1;
            fetchFromMonth["d." + params.time.day] = 1;

            for (let i = 0; i < options.unique.length; i++) {
                fetchFromZero["d." + options.unique[i]] = 1;
                fetchFromZero["d." + params.time.month + "." + options.unique[i]] = 1;
                fetchFromMonth["d.w" + params.time.weekly + "." + options.unique[i]] = 1;
            }


            if (collection === 'users') {
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
            let segment = params.qstring.segmentation || "no-segment";

            zeroIdToFetch = "no-segment_" + dbDateIds.zero;
            monthIdToFetch = segment + "_" + dbDateIds.month;
        }
        else {
            zeroIdToFetch = options.id + "_" + dbDateIds.zero;
            monthIdToFetch = options.id + "_" + dbDateIds.month;
        }

        var zeroDocs = [zeroIdToFetch];
        var monthDocs = [monthIdToFetch];
        if (!(options && options.dontBreak)) {
            for (let i = 0; i < common.base64.length; i++) {
                zeroDocs.push(zeroIdToFetch + "_" + common.base64[i]);
                monthDocs.push(monthIdToFetch + "_" + common.base64[i]);
            }
        }

        options.db.collection(collection).find({ '_id': { $in: zeroDocs } }, fetchFromZero).toArray(function(err1, zeroObject) {
            options.db.collection(collection).find({ '_id': { $in: monthDocs } }, fetchFromMonth).toArray(function(err2, monthObject) {
                zeroObject = zeroObject || [];
                monthObject = monthObject || [];
                callback(getMergedObj(zeroObject.concat(monthObject), true, options.levels, params.truncateEventValuesList));
            });
        });
    }
    else {
        var periodObj = countlyCommon.getPeriodObj(params, "30days"),
            documents = [];

        if (isCustomEvent) {
            let segment = params.qstring.segmentation || "no-segment";

            for (let i = 0; i < periodObj.reqZeroDbDateIds.length; i++) {
                documents.push("no-segment_" + periodObj.reqZeroDbDateIds[i]);
                if (!(options && options.dontBreak)) {
                    for (let m = 0; m < common.base64.length; m++) {
                        documents.push("no-segment_" + periodObj.reqZeroDbDateIds[i] + "_" + common.base64[m]);
                    }
                }
            }

            for (let i = 0; i < periodObj.reqMonthDbDateIds.length; i++) {
                documents.push(segment + "_" + periodObj.reqMonthDbDateIds[i]);
                if (!(options && options.dontBreak)) {
                    for (let m = 0; m < common.base64.length; m++) {
                        documents.push(segment + "_" + periodObj.reqMonthDbDateIds[i] + "_" + common.base64[m]);
                    }
                }
            }
        }
        else {
            for (let i = 0; i < periodObj.reqZeroDbDateIds.length; i++) {
                documents.push(options.id + "_" + periodObj.reqZeroDbDateIds[i]);
                if (!(options && options.dontBreak)) {
                    for (let m = 0; m < common.base64.length; m++) {
                        documents.push(options.id + "_" + periodObj.reqZeroDbDateIds[i] + "_" + common.base64[m]);
                    }
                }
            }

            for (let i = 0; i < periodObj.reqMonthDbDateIds.length; i++) {
                documents.push(options.id + "_" + periodObj.reqMonthDbDateIds[i]);
                if (!(options && options.dontBreak)) {
                    for (let m = 0; m < common.base64.length; m++) {
                        documents.push(options.id + "_" + periodObj.reqMonthDbDateIds[i] + "_" + common.base64[m]);
                    }
                }
            }
        }

        options.db.collection(collection).find({ '_id': { $in: documents } }, {}).toArray(function(err, dataObjects) {
            callback(getMergedObj(dataObjects, false, options.levels, params.truncateEventValuesList));
        });
    }

    /**
    * Deep merge of two objects
    * @param {object} ob1 - first object to merge
    * @param {object} ob2 - second object to merge
    * @returns {object} merged first object
    **/
    function deepMerge(ob1, ob2) {
        for (let i in ob2) {
            if (typeof ob1[i] === "undefined") {
                ob1[i] = ob2[i];
            }
            else if (ob1[i] && typeof ob1[i] === "object") {
                ob1[i] = deepMerge(ob1[i], ob2[i]);
            }
            else {
                ob1[i] += ob2[i];
            }
        }
        return ob1;
    }

    /**
     *  Object to clear
     *  @param {object} ob - zero document
     */
    function clearNoneUnique(ob) {
        for (var i in ob) {
            if (i === "meta") {
                continue;
            }
            if (ob[i] && typeof ob[i] === "object" && options.unique.indexOf(i) === -1) {
                clearNoneUnique(ob[i]);
            }
            else if (options.unique.indexOf(i) === -1) {
                delete ob[i];
            }
        }
    }

    /**    
    * Merge multiple db documents into one
    * @param {array} dataObjects - array with db documents
    * @param {boolean} isRefresh - is it refresh data only for today
    * @param {object=} levels - describes which metrics to expect on which levels
    * @param {array=} levels.daily - which metrics to expect on daily level, default ["t", "n", "c", "s", "dur"]
    * @param {array=} levels.monthly - which metrics to expect on monthly level, default ["t", "n", "d", "e", "c", "s", "dur"]
    * @param {boolean} truncateEventValuesList - if true, then will limit returned segment value count in meta.
    * @returns {object} merged object
    **/
    function getMergedObj(dataObjects, isRefresh, levels, truncateEventValuesList) {
        var mergedDataObj = {};
        if (dataObjects) {
            for (let i = 0; i < dataObjects.length; i++) {
                if (!dataObjects[i] || !dataObjects[i].m) {
                    continue;
                }

                var mSplit = dataObjects[i].m.split(":"),
                    year = mSplit[0],
                    month = mSplit[1];

                if (!mergedDataObj[year]) {
                    mergedDataObj[year] = {};
                }

                if (parseInt(month) === 0) {
                    //old meta merge
                    if (mergedDataObj.meta) {
                        for (let metaEl in dataObjects[i].meta) {
                            if (mergedDataObj.meta[metaEl]) {
                                mergedDataObj.meta[metaEl] = union(mergedDataObj.meta[metaEl], dataObjects[i].meta[metaEl]);
                            }
                            else {
                                mergedDataObj.meta[metaEl] = dataObjects[i].meta[metaEl];
                            }
                        }
                    }
                    else {
                        mergedDataObj.meta = dataObjects[i].meta || {};
                    }

                    //new meta merge as hash tables
                    if (dataObjects[i].meta_v2) {
                        for (let metaEl in dataObjects[i].meta_v2) {
                            if (mergedDataObj.meta[metaEl]) {
                                mergedDataObj.meta[metaEl] = union(mergedDataObj.meta[metaEl], Object.keys(dataObjects[i].meta_v2[metaEl]));
                            }
                            else {
                                mergedDataObj.meta[metaEl] = Object.keys(dataObjects[i].meta_v2[metaEl]);
                            }
                        }
                    }
                    clearNoneUnique(dataObjects[i].d || {});
                    if (mergedDataObj[year]) {
                        mergedDataObj[year] = deepMerge(mergedDataObj[year], dataObjects[i].d);
                    }
                    else {
                        mergedDataObj[year] = dataObjects[i].d || {};
                    }
                }
                else {
                    if (mergedDataObj[year][month]) {
                        mergedDataObj[year][month] = deepMerge(mergedDataObj[year][month], dataObjects[i].d);
                    }
                    else {
                        mergedDataObj[year][month] = dataObjects[i].d || {};
                    }

                    if (!isRefresh) {
                        for (let day in dataObjects[i].d) {
                            if (options.unique.indexOf(day) !== -1) {
                                continue;
                            }
                            for (let prop in dataObjects[i].d[day]) {
                                if (options.unique.indexOf(prop) !== -1 || prop <= 23 && prop >= 0) {
                                    continue;
                                }

                                if (typeof dataObjects[i].d[day][prop] === 'object') {
                                    for (let secondLevel in dataObjects[i].d[day][prop]) {
                                        if ((levels.daily.length) ? levels.daily.indexOf(secondLevel) !== -1 : options.unique.indexOf(secondLevel) === -1) {
                                            if (!mergedDataObj[year][month][prop]) {
                                                mergedDataObj[year][month][prop] = {};
                                            }

                                            if (mergedDataObj[year][month][prop][secondLevel]) {
                                                mergedDataObj[year][month][prop][secondLevel] += dataObjects[i].d[day][prop][secondLevel];
                                            }
                                            else {
                                                mergedDataObj[year][month][prop][secondLevel] = dataObjects[i].d[day][prop][secondLevel];
                                            }

                                            if (!mergedDataObj[year][prop]) {
                                                mergedDataObj[year][prop] = {};
                                            }

                                            if (mergedDataObj[year][prop][secondLevel]) {
                                                mergedDataObj[year][prop][secondLevel] += dataObjects[i].d[day][prop][secondLevel];
                                            }
                                            else {
                                                mergedDataObj[year][prop][secondLevel] = dataObjects[i].d[day][prop][secondLevel];
                                            }
                                        }
                                    }
                                }
                                else if ((levels.monthly.length) ? levels.monthly.indexOf(prop) !== -1 : options.unique.indexOf(prop) === -1) {

                                    if (mergedDataObj[year][month][prop]) {
                                        mergedDataObj[year][month][prop] += dataObjects[i].d[day][prop];
                                    }
                                    else {
                                        mergedDataObj[year][month][prop] = dataObjects[i].d[day][prop];
                                    }

                                    if (mergedDataObj[year][prop]) {
                                        mergedDataObj[year][prop] += dataObjects[i].d[day][prop];
                                    }
                                    else {
                                        mergedDataObj[year][prop] = dataObjects[i].d[day][prop];
                                    }
                                }
                            }
                        }
                    }
                }
            }

            //Fixing meta  to be escaped.(Because return output will escape keys and make values incompatable)
            for (let i in mergedDataObj.meta) {
                for (var p = 0; p < mergedDataObj.meta[i].length; p++) {
                    if (mergedDataObj.meta[i][p] && typeof mergedDataObj.meta[i][p] === 'string') {
                        mergedDataObj.meta[i][p] = mergedDataObj.meta[i][p].replace(new RegExp("\"", "g"), '&quot;');
                    }
                }
            }
            //truncate large meta on refresh		
            if (isRefresh) {
                var metric_length = plugins.getConfig("api", params.app && params.app.plugins, true).metric_limit;
                if (metric_length > 0) {
                    for (let i in mergedDataObj.meta) {
                        if (mergedDataObj.meta[i].length > metric_length) {
                            delete mergedDataObj.meta[i]; //don't  return if there is more than limit
                        }
                    }
                }
            }
            else {
                if (truncateEventValuesList === true) {
                    var value_length = plugins.getConfig("api", params.app && params.app.plugins, true).event_segmentation_value_limit;
                    if (value_length > 0) {
                        for (let i in mergedDataObj.meta) {
                            if (mergedDataObj.meta[i].length > value_length) {
                                mergedDataObj.meta[i].splice(value_length); //removes some elements if there is more than set limit
                            }
                        }
                    }
                }
            }
        }
        return mergedDataObj;
    }
}

/**
* Get period and out it to browser
* @param {string} coll - collection, this is not used, but more for compliance with validation functions
* @param {params} params - params object
**/
fetch.getPeriodObj = function(coll, params) {
    common.returnOutput(params, countlyCommon.getPeriodObj(params, "30days"));
};

/**
* Returns the union of two arrays
* @param {array} x - array 1
* @param {array} y - array 2
* @returns {array} merged array
**/
function union(x, y) {
    var obj = {};
    for (let i = x.length - 1; i >= 0; --i) {
        obj[x[i]] = true;
    }

    for (let i = y.length - 1; i >= 0; --i) {
        obj[y[i]] = true;
    }

    var res = [];

    for (let k in obj) {
        res.push(k);
    }

    return res;
}

/**
* Get data for jobs listing for jobs api
* @param {string} metric - name of the collection where to get data from
* @param {params} params - params object with app_id and date
*/
fetch.fetchJobs = async function(metric, params) {
    try {
        if (params.qstring.name) {
            await fetch.jobDetails(metric, params);
        }
        else {
            await fetch.alljobs(metric, params);
        }
    }
    catch (e) {
        console.log(e);
        common.returnOutput(params, 500, "Fetching jobs failed");
    }
};

/**
* Get all jobs grouped by job name for jobs api
* @param {string} metric - name of the collection where to get data from
* @param {params} params - params object with app_id and date
*/
fetch.alljobs = async function(metric, params) {
    const columns = ["name", "schedule", "next", "finished", "status", "total"];
    let sort = {};
    let total = await common.db.collection('jobs').aggregate([
        {
            $group: { _id: "$name" }
        },
        {
            $count: 'total'
        }
    ]).toArray();
    total = total.length > 0 ? total[0].total : 0;
    const pipeline = [
        {
            $sort: {
                finished: -1
            }
        },
        {
            $group: {
                _id: "$name",
                name: { $first: "$name" },
                status: { $first: "$status" },
                schedule: { $first: "$schedule" },
                next: { $first: "$next" },
                finished: { $first: "$finished" },
                total: { $sum: 1 },
                rowId: { $first: "$_id" }
            }
        }
    ];
    if (params.qstring.sSearch) {
        var rr;
        try {
            rr = new RegExp(params.qstring.sSearch, "i");
            pipeline.unshift({
                $match: { name: { $regex: rr } }
            });
        }
        catch (e) {
            console.log('Could not use as regex:' + params.qstring.sSearch);
        }
    }
    const cursor = common.db.collection('jobs').aggregate(pipeline, { allowDiskUse: true });
    sort[columns[params.qstring.iSortCol_0 || 0]] = (params.qstring.sSortDir_0 === "asc") ? 1 : -1;
    cursor.sort(sort);
    cursor.skip(Number(params.qstring.iDisplayStart || 0));
    cursor.limit(Number(params.qstring.iDisplayLength || 10));
    let items = await cursor.toArray();
    items = items.map((job) => {
        job.status = STATUS_MAP[job.status];
        return job;
    });
    cursor.close();
    common.returnOutput(params, { sEcho: params.qstring.sEcho, iTotalRecords: total, iTotalDisplayRecords: total, aaData: items || [] });
};

/**
* Get all documents for a given job name
* @param {string} metric - name of the collection where to get data from
* @param {params} params - params object with app_id and date
*/
fetch.jobDetails = async function(metric, params) {
    const columns = ["schedule", "next", "finished", "status", "data", "duration"];
    let sort = {};
    const total = await common.db.collection('jobs').count({ name: params.qstring.name });
    const cursor = common.db.collection('jobs').find({ name: params.qstring.name });
    sort[columns[params.qstring.iSortCol_0 || 0]] = (params.qstring.sSortDir_0 === "asc") ? 1 : -1;
    cursor.sort(sort);
    cursor.skip(Number(params.qstring.iDisplayStart || 0));
    cursor.limit(Number(params.qstring.iDisplayLength || 10));
    let items = await cursor.toArray();
    items = items.map((job) => {
        job.status = STATUS_MAP[job.status];
        return job;
    });
    cursor.close();
    common.returnOutput(params, { sEcho: params.qstring.sEcho, iTotalRecords: total, iTotalDisplayRecords: total, aaData: items || [] });
};


/**
 * Fetch data for tops
 * @param {params} params - params object
 * @param  {Array} allMetrics - All metrics array
 * @param  {String} metric - metric to fetch data for
 * @param  {Function} cb - callback function
 */
function fetchData(params, allMetrics, metric, cb) {
    var metrics = fetch.metricToCollection(metric);
    var countInCol = 1;
    if (metrics[0]) {
        for (let i = 0; i < allMetrics.length; i++) {
            if (allMetrics[i].db === metrics[0]) {
                countInCol = allMetrics[i].metrics.length;
                break;
            }
        }

        var model;
        if (metrics[2] && typeof metrics[2] === "object") {
            model = metrics[2];
        }
        else if (typeof metrics[2] === "string" && metrics[2].length) {
            model = countlyModel.load(metrics[2]);
        }
        else {
            model = countlyModel.load(metrics[0]);
        }
        if (metrics[0] === metric && countInCol === 1) {
            getDataforTops(params, metrics[0], function(items) {
                items = items || [];
                if (items) {
                    if (model.fixBarSegmentData) {
                        var chData = { chartData: items };
                        chData = model.fixBarSegmentData(params, chData);
                        items = chData.chartData;
                    }

                    var total = 0, totalPercent = 0;
                    for (let k = 0; k < items.length; k++) {
                        items[k].value = items[k].t;
                        items[k].name = items[k]._id;
                        total = total + items[k].value;
                    }

                    items = _.sortBy(items, function(obj) {
                        return -obj.value;
                    });

                    for (let k = items.length - 1; k >= 0; k--) {
                        items[k].percent = countlyCommon.round(items[k].t * 100 / total, 1);
                        totalPercent += items[k].percent;
                    }

                    items = countlyCommon.fixPercentageDelta(items, totalPercent);

                    for (let k = 0; k < items.length; k++) {
                        items[k].name = model.fetchValue(items[k].name);
                    }

                    items = items.slice(0, 3);
                }

                cb(items);
            });
        }
        else {
            fetchTimeObj(metrics[0], params, false, function(db) {
                fetch.getTotalUsersObj(metric, params, function(dbTotalUsersObj) {
                    model.setTotalUsersObj(fetch.formatTotalUsersObj(dbTotalUsersObj), fetch.formatTotalUsersObj(dbTotalUsersObj, null, true));
                    var sgMetric = "t";
                    if (metrics[1] === "os" || metrics[1] === "browser") {
                        sgMetric = "u";
                    }
                    countlyCommon.setTimezone(params.appTimezone);
                    model.setDb(db || {});
                    cb(model.getBars(metrics[1] || metrics[0], 3, sgMetric));
                });
            });
        }
    }
    else {
        cb([]);
    }
}

module.exports = fetch;
