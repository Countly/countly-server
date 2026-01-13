/**
 *  Check for which dates data was recorded 
 *  requires index on cd collections or else will be slower
 *  Server: countly
 *  Path: $(countly dir)/bin/scripts/data-reports
 *  Command: node drill_data_cd.js
 */

//period to check
var startDate = new Date("2024-04-2T00:00:00");
var endDate = new Date("2024-04-3T00:00:00");
var apps = []; //Put in your APP ID like ["3469834986y34968y206y2"]

var internal_events = [];
var verbose = true;

var crypto = require('crypto');
var pluginManager = require("../../../plugins/pluginManager");

function output_data(dates, results) {
    var datesList = Object.keys(dates).sort(function(a, b) {
        var d1 = a.split(":");
        var d2 = b.split(":");
        for (var z = 0; z < d1.length; z++) {
            d1[z] = parseInt(d1[z]);
            d2[z] = parseInt(d2[z]);
        }

        for (var k = 0; k < d1.length; k++) {
            if (d1[k] > d2[k]) {
                return 1;
            }
            else if (d1[k] < d2[k]) {
                return -1;
            }
        }
        return 1;

    });
    //output header line
    console.log("Event," + datesList.join(","));
    for (var key in results) {
        if (key !== "_total") {
            var line = key;
            for (var z = 0; z < datesList.length; z++) {
                line += "," + (results[key][datesList[z]] || 0);
            }
            console.log(line);
        }
        //output total



    }
    var line2 = "Total";
    for (var z1 = 0; z1 < datesList.length; z1++) {
        line2 += "," + (results["_total"][datesList[z1]] || 0);
    }
    console.log(line2);

}
Promise.all([pluginManager.dbConnection("countly"), pluginManager.dbConnection("countly_drill")]).then(async function([countlyDb, drillDb]) {
    //get apps
    var queryApps = {};
    if (apps && apps.length) {
        for (var z = 0; z < apps.length; z++) {
            apps[z] = countlyDb.ObjectID(apps[z]);
        }
        queryApps = {_id: {$in: apps}};
    }

    countlyDb.collection("apps").find(queryApps).toArray(function(err, apps) {
        if (err) {
            console.log(err);
            countlyDb.close();
            drillDb.close();
        }
        else {
            (async() => {
                for (const app of apps) {
                    console.log('------' + app.name + '------');
                    await new Promise(function(resolve) {
                        var dates = {};
                        var results = {};
                        //fetch events list
                        countlyDb.collection("events").findOne({"_id": app._id}, {"list": 1}, function(err, events) {
                            events = events || [];
                            var list = events.list || [];
                            if (verbose) {
                                console.log(list.length + " events found");
                            }
                            for (var z = 0; z < internal_events.length; z++) {
                                if (list.indexOf(internal_events[z]) === -1) {
                                    list.push(internal_events[z]);
                                }
                            }
                            (async() => {
                                for (const event of list) {
                                    await new Promise(function(resolve2) {
                                        //get hashed drill collection name
                                        let collection = "drill_events" + crypto.createHash('sha1').update(event + app._id).digest('hex');
                                        if (verbose) {
                                            console.log(collection);
                                        }
                                        var pipeline = [
                                            {"$match": {"cd": {"$gte": startDate, "$lt": endDate}}},
                                            {"$group": {"_id": "$d", "c": {"$sum": 1}}}
                                        ];
                                        drillDb.collection(collection).aggregate(pipeline, {"allowDiskUse": true}).toArray(function(err, data) {
                                            if (err) {
                                                console.log(err);
                                            }
                                            if (data.length > 0) {
                                                results["_total"] = results["_total"] || {};
                                                results[event] = {};
                                                for (var z = 0; z < data.length; z++) {
                                                    if (!dates[data[z]._id]) {
                                                        dates[data[z]._id] = true;
                                                    }
                                                    results[event][data[z]._id] = data[z].c;
                                                    results["_total"][data[z]._id] = results["_total"][data[z]._id] || 0;
                                                    results["_total"][data[z]._id] += data[z].c || 0;
                                                }
                                            }
                                            resolve2();
                                        });
                                    });
                                }
                            })().then(function() {
                                //output
                                //sort dates
                                output_data(dates, results);
                                resolve();
                            }).catch(function(err) {
                                output_data(dates, results);
                                console.log(err);
                                resolve();
                            });
                        });
                    });
                }
            })().then(function() {
                countlyDb.close();
                drillDb.close();
            }).catch(function(err) {
                console.log(err);
                countlyDb.close();
                drillDb.close();
            });
        }
    });
});
