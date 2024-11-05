/**
 *  Check for which dates data was recorded 
 *  requires index on cd collections or else will be slower
 *  Server: countly
 *  Path: $(countly dir)/bin/scripts/data-reports
 *  Command: node drill_data_cd.js
 */

//period to check
var startDate = new Date("2021-04-02T00:00:00");
var endDate = new Date("2025-04-03T00:00:00");
var apps = []; //Put in your APP ID like ["3469834986y34968y206y2"]

var Promise = require("bluebird");
var pluginManager = require("../../../plugins/pluginManager");
var results = {};
var dates = {};

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

    countlyDb.collection("apps").find(queryApps).toArray(function(err, apps2) {
        if (err) {
            console.log(err);
            countlyDb.close();
            drillDb.close();
        }
        else {
            var query = {"cd": {"$gte": startDate, "$lt": endDate}};
            if (apps.length > 0) {

                var a = [];
                for (var i = 0; i < apps2.length; i++) {
                    a.push(apps2[i]._id + "");
                }
                query.a = {$in: a};
            }
            var pipeline = [{"$match": query}, {"$group": {"_id": {"a": "$a", "e": "$e", "d": "$d"}, "c": {"$sum": 1}}}];
            drillDb.collection("drill_events").aggregate(pipeline, {"allowDiskUse": true}).toArray(function(err, data) {
                if (err) {
                    console.log(err);
                }
                if (data && data.length > 0) {
                    results["_total"] = results["_total"] || {};

                    for (var z = 0; z < data.length; z++) {
                        var event = data[z]._id.e;
                        if (!dates[data[z]._id.d]) {
                            dates[data[z]._id.d] = true;
                        }
                        results[data[z]._id.e] = {};
                        results[event][data[z]._id.d] = data[z].c;
                        results["_total"][data[z]._id.d] = results["_total"][data[z]._id.d] || 0;
                        results["_total"][data[z]._id.d] += data[z].c || 0;
                    }
                    output_data(dates, results);
                }

                countlyDb.close();
                drillDb.close();
            });


        }
    });
});
