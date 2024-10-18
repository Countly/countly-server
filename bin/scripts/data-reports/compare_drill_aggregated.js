/*
    * Script compares aggregated data from events collection with drill data for given period.
    * Place script ins
    * {countly}/bin/scripts/data-reports/compare_drill_aggregated.js
    *
    * Usage:
    * node compare_drill_aggregated.js
*/
var period = "7days"; //Chose any of formats: "Xdays" ("7days","100days") or  ["1-1-2024", "1-10-2024"], 
var app_list = []; //List with apps
//Example var eventMap = {"6075f94b7e5e0d392902520c":["Logout","Login"],"6075f94b7e5e0d392902520d":["Logout","Login","Buy"]};
var eventMap = {}; //If left empty will run for all alls/events.
var verbose = false; //true to show more output


const Promise = require("bluebird");
const crypto = require("crypto");
var pluginManager = require("../../../plugins/pluginManager");
var fetch = require("../../../api/parts/data/fetch.js");
var countlyCommon = require("../../../api/lib/countly.common.js");
var common = require("../../../api/utils/common.js");
var moment = require("moment");

var endReport = {};

console.log("Script compares numbers in aggregated data with drill data for given period.");
Promise.all([pluginManager.dbConnection("countly"), pluginManager.dbConnection("countly_drill")]).then(async function([countlyDb, drillDb]) {
    common.db = countlyDb;
    console.log("Connected to databases...");
    getAppList({db: countlyDb}, function(err, apps) {
        if (!apps || !apps.length) {
            console.log("No apps found");
            return close();
        }
        else {
            console.log("Apps found:", apps.length);
            Promise.each(apps, function(app) {
                return new Promise(function(resolve, reject) {
                    console.log("Processing app: ", app.name);
                    countlyDb.collection("events").findOne({_id: app._id}, {'list': 1}, function(err, events) {
                        if (err) {
                            console.log("Error getting events: ", err);
                            reject();
                        }
                        else {
                            events = events || {};
                            events.list = events.list || [];
                            events.list = events.list.filter(function(ee) {
                                if (ee.indexOf("[CLY]_") === 0) {
                                    return false;
                                }
                                else {
                                    return true;
                                }
                            });

                            if (eventMap && eventMap[app._id + ""]) {
                                var listBF = events.list.length;
                                events.list = events.list.filter(function(ee) {
                                    if (eventMap && eventMap[app._id + ""]) {
                                        return eventMap[app._id + ""].indexOf(ee) > -1;
                                    }
                                    else {
                                        return false;
                                    }
                                });
                                if (events.list.length != listBF) {
                                    console.log("    Filtered events based on eventMap: ", events.list.length, " from ", listBF);
                                }

                            }
                            if (events && events.list && events.list.length) {
                                endReport[app._id] = {"name": app.name, "total": events.list.length, "bad": 0};
                                Promise.each(events.list, function(event) {
                                    return new Promise(function(resolve2, reject2) {
                                        console.log("    Processing event: ", event);
                                        var params = {
                                            app_id: app._id + "",
                                            appTimezone: app.timezone,
                                            qstring: { period: period},
                                            time: common.initTimeObj(app.timezone, Date.now().valueOf())
                                        };

                                        //fetch drill data
                                        var periodObject = countlyCommon.getPeriodObj({"appTimezone": app.timezone, "qstring": {"period": period}});
                                        getDataFromDrill({event: event, app_id: app._id + "", timezone: app.timezone, drillDb: drillDb, periodObj: periodObject}, function(err, drillData) {
                                            if (err) {
                                                console.log("    Error getting drill data: ", err);
                                                reject2();
                                            }
                                            else {
                                                if (verbose) {
                                                    console.log("    Drill data loaded");
                                                    console.log(JSON.stringify(drillData));
                                                }
                                                //fetch aggregated data
                                                var collectionName = "events" + crypto.createHash('sha1').update(event + app._id).digest('hex');

                                                fetch.getTimeObjForEvents(collectionName, params, null, function(data) {
                                                    var mergedData = {};
                                                    var totals = {"c": 0, "s": 0, "dur": 0};
                                                    for (var z0 = 0; z0 < periodObject.currentPeriodArr.length; z0++) {
                                                        var date = periodObject.currentPeriodArr[z0].split(".");
                                                        if (data && data[date[0]] && data[date[0]][date[1]] && data[date[0]][date[1]][date[2]]) {
                                                            mergedData[periodObject.currentPeriodArr[z0]] = {};
                                                            mergedData[periodObject.currentPeriodArr[z0]].c = data[date[0]][date[1]][date[2]].c || 0;
                                                            mergedData[periodObject.currentPeriodArr[z0]].s = data[date[0]][date[1]][date[2]].s || 0;
                                                            mergedData[periodObject.currentPeriodArr[z0]].dur = data[date[0]][date[1]][date[2]].dur || 0;
                                                            totals.c += data[date[0]][date[1]][date[2]].c || 0;
                                                            totals.s += data[date[0]][date[1]][date[2]].s || 0;
                                                            totals.dur += data[date[0]][date[1]][date[2]].dur || 0;
                                                        }
                                                    }
                                                    if (verbose) {
                                                        console.log("    Aggregated data loaded");
                                                        console.log(JSON.stringify(mergedData));
                                                    }
                                                    var report = {"totals": {}, "data": {}};
                                                    var haveAnything = false;
                                                    for (var key in totals) {
                                                        if (totals[key] != drillData.totals[key]) {
                                                            report.totals[key] = (totals[key] || 0) - (drillData.totals[key] || 0);
                                                            haveAnything = true;
                                                        }
                                                    }
                                                    for (var z = 0; z < periodObject.currentPeriodArr.length; z++) {
                                                        if (drillData.data[periodObject.currentPeriodArr[z]]) {
                                                            if (mergedData[periodObject.currentPeriodArr[z]]) {
                                                                var diff = {};
                                                                for (var key0 in mergedData[periodObject.currentPeriodArr[z]]) {
                                                                    diff[key0] = (mergedData[periodObject.currentPeriodArr[z]][key0] || 0) - (drillData.data[periodObject.currentPeriodArr[z]][key0] || 0);
                                                                }
                                                                if (diff.c || diff.s || diff.dur) {
                                                                    report.data[periodObject.currentPeriodArr[z]] = diff;
                                                                    haveAnything = true;
                                                                }
                                                            }
                                                            else {
                                                                report.data[periodObject.currentPeriodArr[z]] = {};
                                                                report.data[periodObject.currentPeriodArr[z]].c = -1 * drillData.data[periodObject.currentPeriodArr[z]].c;
                                                                report.data[periodObject.currentPeriodArr[z]].s = -1 * drillData.data[periodObject.currentPeriodArr[z]].s;
                                                                report.data[periodObject.currentPeriodArr[z]].dur = -1 * drillData.data[periodObject.currentPeriodArr[z]].dur;
                                                                haveAnything;
                                                            }
                                                        }
                                                        else {
                                                            if (mergedData[periodObject.currentPeriodArr[z]]) {
                                                                report.data[periodObject.currentPeriodArr[z]] = mergedData[periodObject.currentPeriodArr[z]];
                                                                haveAnything = true;
                                                            }
                                                        }
                                                    }
                                                    if (haveAnything) {
                                                        console.log("    " + JSON.stringify(report));
                                                        endReport[app._id]["bad"]++;
                                                        endReport[app._id]["events"] = endReport[app._id]["events"] || {};
                                                        endReport[app._id]["events"][event] = {"e": event, report: report};
                                                    }
                                                    resolve2();
                                                });
                                            }
                                        });
                                    });
                                }).then(function() {
                                    console.log("Finished processing app: ", app.name);
                                    resolve();
                                }).catch(function(eee) {
                                    console.log("Error processing app: ", app.name);
                                    console.log(eee);
                                    reject();
                                });
                            }
                            else {
                                resolve();
                            }
                        }

                    });
                });

            }).then(function() {
                console.log("Finished");
                console.log(JSON.stringify(endReport));
                close();
            }).catch(function(eee) {
                console.log("Error while fetching data");
                console.log(eee);
                console.log("EXITING...");
                console.log(JSON.stringify(endReport));
                close();
            });
        }
    });

    function getDataFromDrill(options, callback) {
        var tmpArr = options.periodObj.currentPeriodArr[0].split(".");
        var startDate = moment(new Date(Date.UTC(parseInt(tmpArr[0]), parseInt(tmpArr[1]) - 1, parseInt(tmpArr[2]))));
        if (options.timezone) {
            startDate.tz(options.timezone);
        }
        startDate = startDate.valueOf() - startDate.utcOffset() * 60000;

        tmpArr = options.periodObj.currentPeriodArr[options.periodObj.currentPeriodArr.length - 1].split(".");
        var endDate = moment(new Date(Date.UTC(parseInt(tmpArr[0]), parseInt(tmpArr[1]) - 1, parseInt(tmpArr[2])))).add(1, 'days');
        if (options.timezone) {
            endDate.tz(options.timezone);
        }
        endDate = endDate.valueOf() - endDate.utcOffset() * 60000;

        let collection = "drill_events" + crypto.createHash('sha1').update(options.event + options.app_id).digest('hex');
        var query = {"ts": {"$gte": startDate, "$lt": endDate}};
        var pipeline = [
            {"$match": query},
        ];

        pipeline.push({"$group": {"_id": "$d", "c": {"$sum": "$c"}, "s": {"$sum": "$s"}, "dur": {"$sum": "$dur"}}});
        options.drillDb.collection(collection).aggregate(pipeline, {"allowDiskUse": true}).toArray(function(err, data) {
            if (err) {
                console.log(err);
            }
            var result = {"data": {}, "totals": {"c": 0, "s": 0, "dur": 0}};
            if (data && data.length > 0) {
                for (var z = 0; z < data.length; z++) {
                    var iid = data[z]._id.split(":").join(".");
                    if (options.periodObj.currentPeriodArr.indexOf(iid) !== -1) {
                        result.data[iid] = data[z];
                        result.totals.c += data[z].c || 0;
                        result.totals.s += data[z].s || 0;
                        result.totals.dur += data[z].dur || 0;
                    }
                }
            }
            callback(err, result);
        });

    }

    function close() {
        countlyDb.close();
        drillDb.close();
        console.log("Done.");
    }

    function getAppList(options, calllback) {
        var query = {};
        if (app_list && app_list.length > 0) {
            var listed = [];
            for (var z = 0; z < app_list.length; z++) {
                listed.push(options.db.ObjectID(app_list[z]));
            }
            query = {_id: {$in: listed}};
        }
        options.db.collection("apps").find(query, {"name": 1, "timezone": 1}).toArray(function(err, apps) {
            if (err) {
                console.log("Error getting apps: ", err);
            }
            calllback(err, apps);
        });


    }
});
