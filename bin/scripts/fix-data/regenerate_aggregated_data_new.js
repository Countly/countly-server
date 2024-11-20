/*
* Scrript triggers data regeneration for events and sessions.
* It stores progress in county.data_regeneration_progress collection. 
* Collection can be dropped once regeneration is complete. Data in there ensures that if script dies unexpectedly, then upon staring again it will not regenerate collections again.
*   mongosh countly
*   db.data_regeneration_progress.drop();
*
*   script path: {countly}/bin/scripts/fix-data/
*
* To run script:
*   node regenerate_aggregated_data.js
*/
//Adjust settings below before running script
var regenerate_events = true; //if true will regenerate all custom events aggregated data
var regenerate_sessions = false;
var period = "732days"; //any valid period

//Each app IDis listed as string, for example var appList = ["6075f94b7e5e0d392902520c",6075f94b7e5e0d392902520d]
var appList = [];//If left empty, will run for all apps.
//For each app defined there only listed events will be regenerated. If left empty, all events will be regenerated.
//Example var eventMap = {"6075f94b7e5e0d392902520c":["Logout","Login"],"6075f94b7e5e0d392902520d":["Logout","Login","Buy"]};
var eventMap = {}; //If left empty will run for all alls/events.
//End of adjustable settings

var metaData = {};
const common = require("../../../api/utils/common.js");
const drillCommon = require("../../../plugins/drill/api/common.js");
const pluginManager = require('../../../plugins/pluginManager.js');
const asyncjs = require('async');
const drill = require('../../../plugins/drill/api/parts/data/drill.js');
const crypto = require('crypto');
var Promise = require("bluebird");

var started = Date.now();
Promise.all([pluginManager.dbConnection("countly"), pluginManager.dbConnection("countly_drill")]).then(async function([countlyDb, drillDb]) {
    console.log("Connected to databases...");
    common.db = countlyDb;
    common.drillDb = drillDb;
    //get all apps
    try {
        pluginManager.loadConfigs(common.db, async function() {
            var query = {};
            if (appList && appList.length) {
                query._id = {$in: appList.map(app_id=>common.db.ObjectID(app_id))};
            }
            const apps = await countlyDb.collection("apps").find(query, {_id: 1, name: 1, timezone: 1, plugins: 1}).toArray();
            if (!apps || !apps.length) {
                return close();
            }
            try {
            //for each app serially process users
                asyncjs.eachSeries(apps, async function(app) {
                    console.log("Processing app: ", app.name);
                    //get all drill collections for this app

                    var skipped_ec = 0;
                    if (regenerate_events) {
                        var events = await countlyDb.collection("events").findOne({_id: app._id}, {'list': 1});
                        var limit_segment = pluginManager.getConfig("drill", app.plugins, true).event_segmentation_limit;
                        var limmit_segment_values = pluginManager.getConfig("drill", app.plugins, true).event_segmentation_value_limit;
                        if (events && events.list && events.list.length) {
                            events.list = events.list.filter(function(ee) {
                                if (ee.indexOf("[CLY]_") === 0) {
                                    return false;
                                }
                                else if (eventMap && eventMap[app._id + ""]) {
                                    return eventMap[app._id + ""].indexOf(ee) > -1;
                                }
                                else {
                                    return true;
                                }
                            });
                            for (var z = 0; z < events.list.length; z++) {
                                var qq = {_id: app._id + ""};
                                qq[events.list[z]] = {$exists: true};
                                var doc = await countlyDb.collection("data_regeneration_progress").findOne(qq);
                                if (!doc) {
                                    var event = events.list[z];
                                    console.log("      Processing event: ", event);
                                    var params = {
                                        appTimezone: app.timezone,
                                        time: common.initTimeObj(app.timezone),
                                        qstring: {
                                            app_id: app._id + "",
                                            event: event,
                                            period: period,
                                            limit_segment: limit_segment,
                                            limmit_segment_values: limmit_segment_values
                                        }
                                    };
                                    try {
                                        await new Promise((resolve)=>{
                                            calculateEvents(params, function() {
                                                resolve();
                                            });
                                        });
                                        var update = {};
                                        update[event] = Date.now();
                                        await countlyDb.collection("data_regeneration_progress").updateOne({_id: app._id + ""}, {"$set": update}, {"upsert": true});

                                    }
                                    catch (err) {
                                        console.log(err);
                                    }
                                }
                                else {
                                    skipped_ec++;
                                }
                            }
                        }
                        else {
                            console.log("      No events found for app: ", app.name);
                        }
                        if (skipped_ec) {
                            console.log("      Skipped ", skipped_ec, " events as they are marked as recalculated");
                        }
                    }
                    if (regenerate_sessions) {
                        var doc2 = await countlyDb.collection("data_regeneration_progress").findOne({_id: app._id + "", "[CLY]_session": {$exists: true}});
                        if (!doc2) {
                            console.log("      Processing sessions");
                            var params2 = {
                                appTimezone: app.timezone,
                                time: common.initTimeObj(app.timezone),
                                qstring: {
                                    app_id: app._id + "",
                                    period: period
                                }
                            };
                            try {
                                await new Promise((resolve)=>{
                                    drill.calculateSessions(params2, function() {
                                        resolve();
                                    });
                                });
                                await countlyDb.collection("data_regeneration_progress").updateOne({_id: app._id + ""}, {"$set": { "[CLY]_session": Date.now()}}, {"upsert": true});
                            }
                            catch (err) {
                                console.log(err);
                            }
                        }
                        else {
                            console.log("      Sessions already processed for app: ", app.name);
                        }
                    }

                }, function(err) {
                    return close(err);
                });
            }
            catch (err) {
                return close(err);
            }
        });
    }
    catch (err) {
        return close(err);
    }

    function close(err) {
        if (err) {
            console.log(err);
            console.log('EXITED WITH ERROR');
        }
        console.log("Closing connections...");
        countlyDb.close();
        drillDb.close();
        console.log("DONE");
        var ended = Date.now();
        console.log("Total time: ", (ended - started) / 1000, " seconds");
    }

    var calculateEvents = function(params, callback) {
        var appId = params.qstring.app_id;
        var eventKeys = [];
        var ranges = [];

        eventKeys.push(params.qstring.event);
        var queryObject = {};
        queryObject.ts = {};
        var periodObject = drill.calculate_time_ranges(params, queryObject);
        var periodRanges = periodObject.periodRanges;

        //rangeFixed['$gte'] = periodObj.start;
        for (var z = 0; z < eventKeys.length; z++) {
            for (var k = 0; k < periodRanges.length; k++) {
                ranges.push({"event": eventKeys[z], "label": periodRanges[k].label, "start": periodRanges[k].start, "end": periodRanges[k].end});
            }
        }
        console.log("Regenerating events for: " + eventKeys.join(","));
        var currentTime = new Date().getTime();
        Promise.each(ranges, function(range) {
            return new Promise(function(resolve/*, reject*/) {
                var collection = drillCommon.getCollectionName(range.event, appId);
                recalculateEvents({"app_id": appId, "event": range.event, collection: collection, range: range, limit_segment: params.limit_segment, limit_segment_values: params.limmit_segment_values}, function() {
                    resolve();
                });
            });
        }).then(function() {
            var newTime = new Date().getTime();
            newTime = Math.round((newTime - currentTime) / 1000);
            console.log("Regeneration time:" + Math.floor(newTime / 60) + ":" + (newTime % 60));
            callback(periodObject);
        });
    };

    function loadMetaData(options, callback) {
        if (metaData[options.app_id]) {
            callback(metaData[options.app_id]);
        }
        else {
            console.log("   Loading segmented meta data...");
            var dd = options._id.split(":");
            var collectionBase = "events" + crypto.createHash('sha1').update(options.event + options.app_id).digest('hex');
            common.db.collection(collectionBase).aggregate([{"$match": {"_id": {"$regex": "^no-segment_" + dd[0] + ":" + dd[1] + ".*"}}}], function(err, resMeta) {
                var loadedMeta = {"segments": 0};
                resMeta = resMeta || [];
                for (var i = 0; i < resMeta.length; i++) {
                    for (var key in resMeta[i].meta_v2) {
                        if (key !== "segments") {
                            if (!loadedMeta[key]) {
                                loadedMeta["segments"]++;
                            }
                            loadedMeta[key] = loadedMeta[key] || {"v": {}, "c": 0};
                            for (var key2 in resMeta[i].meta_v2[key]) {
                                loadedMeta[key]["v"][key2] = true;
                                loadedMeta[key]["c"]++;
                            }
                        }
                    }
                }
                for (var k in metaData) {
                    delete metaData[k];
                }
                metaData[options.app_id] = loadedMeta;
                callback(loadedMeta);
            });
        }
    }

    var recalculateEvents = function(options, callback) {
        var collection = options.collection;
        var range = options.range;
        var runSegmented = options.runSegmented || true;
        var forbiddenSegValues = [];
        for (let i = 1; i < 32; i++) {
            forbiddenSegValues.push(i + "");
        }
        var pipeline = [];
        pipeline.push({$match: {"ts": {$gte: range.start, $lte: range.end}}});

        pipeline.push({$group: {_id: {"d": "$d", "h": "$h"}, "s": {"$sum": "$s"}, "dur": {"$sum": "$dur"}, "c": {"$sum": "$c"}}});
        pipeline.push({$group: {_id: "$_id.d", "d": {"$addToSet": {"h": "$_id.h", "s": "$s", "dur": "$dur", "c": "$c"}}, "s": {"$sum": "$s"}, "dur": {"$sum": "$dur"}, "c": {"$sum": "$c"}}});

        function runBothPipelines(callback) {
            var result = {};
            common.drillDb.collection(collection).aggregate(pipeline, {allowDiskUse: true}, function(err, res) {
                if (err) {
                    console.log(err);
                }
                //test
                result['no-segment'] = res;
                if (runSegmented) {
                    var segmented = [];
                    segmented.push({$match: {"ts": {$gte: range.start, $lte: range.end}}});
                    segmented.push({"$project": {"d": true, "sg": {"$objectToArray": "$sg"}, "s": true, "c": true, "dur": true}});
                    segmented.push({"$unwind": "$sg"});
                    segmented.push({"$group": {"_id": {"d": "$d", "key": "$sg.k", "value": "$sg.v"}, "s": {"$sum": "$s"}, "dur": {"$sum": "$dur"}, "c": {"$sum": "$c"}}});
                    segmented.push({"$sort": {"c": -1}});
                    common.drillDb.collection(collection).aggregate(segmented, {allowDiskUse: true}, function(err2, res2) {
                        if (err2) {
                            console.log(err2);
                        }
                        result.segmented = res2;
                        callback(err2, result);
                    });
                }
                else {
                    callback(null, result);
                }
            });
        }
        function processSegmentedData(res, docs, options, callback) {
            if (runSegmented && res.segmented && res.segmented.length > 0 && res.segmented[0]._id && res.segmented[0]._id.d) {
                var valueLimit = options.limit_segment_values || 1000;
                var segmentLimit = options.limit_segment || 100;
                common.db.collection("events").findOne({"_id": common.db.ObjectID(options.app_id)}, {"omitted_segments": 1, "_id": 1}, function(errEvents, segments) {
                    if (errEvents) {
                        console.log('Error while fetching events:' + errEvents);
                    }
                    //fetch currently stored values from aggregated data
                    loadMetaData({_id: res.segmented[0]._id.d, app_id: options.app_id, event: options.event}, function(loadedMeta) {
                        var Segment = {};
                        for (let k = 0; k < res.segmented.length; k++) {
                            if (res.segmented[k]._id && res.segmented[k]._id.key && typeof res.segmented[k]._id.value !== "undefined") {
                                var segmentKey = res.segmented[k]._id.key;
                                if (!loadedMeta[segmentKey]) {
                                    if (loadedMeta["segments"] >= segmentLimit) {
                                        console.log("Skipping segment " + segmentKey + " as it is over limit");
                                        continue;
                                    }
                                    else {
                                        loadedMeta[segmentKey] = {"v": {}, "c": 0};
                                        loadedMeta["segments"]++;
                                    }
                                }
                                //skiping segments that are over limit
                                var value = res.segmented[k]._id.value || "";
                                value = value + "";
                                value = value.replace(/^\$/, "").replace(/\./g, ":").replace(/[\x00-\x1f\x80-\x9f]+/g, "");// eslint-disable-line
                                if (forbiddenSegValues.indexOf(value) !== -1) {
                                    value = "[CLY]" + value;
                                }
                                var postfix = crypto.createHash("md5").update(value).digest('base64')[0];
                                var day = res.segmented[k]._id.d.split(":");
                                var key = res.segmented[k]._id.key + "_" + day[0] + ":" + day[1] + "_" + postfix;

                                //if value does not exists and we are over limit - skip it
                                if (loadedMeta[segmentKey] && loadedMeta[segmentKey]["v"] && !loadedMeta[segmentKey]["v"][value] && loadedMeta[segmentKey]["c"] >= valueLimit) {
                                    console.log("Skipping value " + value + " for key " + key + " as it is over limit");
                                    continue;
                                }

                                if (segments && segments.omitted_segments && segments.omitted_segments[options.event] && segments.omitted_segments[options.event].indexOf(res.segmented[k]._id.key) !== -1) {
                                    continue;
                                }
                                if (!value) {
                                    //console.log("Skipping invalid value " + value + " for key " + key+" "+value);
                                    continue;
                                }

                                if (!loadedMeta[segmentKey]["v"][value]) {
                                    loadedMeta[segmentKey]["v"][value] = true;
                                    loadedMeta[segmentKey]["c"]++;
                                }

                                if (!Segment[key]) {
                                    Segment[key] = {"m": day[0] + ":" + day[1], "s": res.segmented[k]._id.key};
                                }
                                Segment[key]["d" + "." + day[2] + "." + value] = {"c": res.segmented[k].c || 0, "dur": res.segmented[k].dur || 0, "s": res.segmented[k].s || 0 };

                                //Zero docs
                                if (!Segment["no-segment_" + day[0] + ":0_" + postfix]) {
                                    Segment["no-segment_" + day[0] + ":0_" + postfix] = {"m": day[0] + ":0", "s": 'no-segment'};
                                }

                                Segment["no-segment_" + day[0] + ":0_" + postfix]["meta_v2.segments." + res.segmented[k]._id.key] = true;
                                Segment["no-segment_" + day[0] + ":0_" + postfix]["meta_v2." + res.segmented[k]._id.key + "." + value] = true;
                            }
                        }
                        for (var kzz in Segment) {
                            docs.push({"_id": kzz, "$set": Segment[kzz]});
                        }
                        callback();
                    });
                });
            }
            else {
                callback();
            }
        }

        runBothPipelines(function(err, res) {
            if (err) {
                console.log(err);
            }
            if (res && res[0]) {
                res = res[0];
            }
            var docs = [];
            //Process not segmented
            var day;
            var key;
            if (res['no-segment']) {
                var noSegment = {};
                for (let k = 0; k < res['no-segment'].length; k++) {
                    day = res['no-segment'][k]._id.split(":");
                    if (day.length === 3) { //always should be, but in case of bad data
                        key = "no-segment_" + day[0] + ":" + day[1];
                        if (!noSegment[key]) {
                            noSegment[key] = {"m": day[0] + ":" + day[1], "s": "no-segment"};
                        }
                        noSegment[key]["d." + day[2] + ".dur"] = res['no-segment'][k].dur || 0;
                        noSegment[key]["d." + day[2] + ".c"] = res['no-segment'][k].c || 0;
                        noSegment[key]["d." + day[2] + ".s"] = res['no-segment'][k].s || 0;
                        for (var j = 0; j < res['no-segment'][k].d.length; j++) {
                            var hh = res['no-segment'][k].d[j].h.split(":");
                            hh = hh[hh.length - 1]; //last
                            noSegment[key]["d" + "." + day[2] + "." + hh.replace("h", "")] = {"c": res['no-segment'][k].d[j].c || 0, "dur": res['no-segment'][k].d[j].dur || 0, "s": res['no-segment'][k].d[j].s || 0 };
                        }
                    }
                }
                for (var kz in noSegment) {
                    docs.push({"_id": kz, "$set": noSegment[kz]});
                }
            }
            processSegmentedData(res, docs, {limit_segment: options.limit_segment, limit_segment_values: options.limit_segment_values, app_id: options.app_id, event: options.event}, function() {
                if (docs.length > 0) {
                    //console.log("Updating " + docs.length + "documents");
                    var collectionBase = "events" + crypto.createHash('sha1').update(options.event + options.app_id).digest('hex');
                    var bulk = common.db.collection(collectionBase).initializeUnorderedBulkOp();
                    for (var k = 0; k < docs.length; k++) {
                        bulk.find({
                            "_id": docs[k]._id
                        }).upsert().updateOne({
                            "$set": docs[k].$set
                        });
                    }
                    bulk.execute(function(err1/*, updateResult*/) {
                        if (err1) {
                            console.log(err1);
                        }
                        callback();
                    });
                }
                else {
                    callback();
                }
            });
        });
    };
});
