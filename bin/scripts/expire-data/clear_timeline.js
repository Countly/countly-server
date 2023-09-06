/**
Put me in {countly dir}/bin/scripts/expire-data/clear_timeline.js
To run it go to scripts folder and run:
node clear_timeline.js

It is recommended to run with dry_run=true first to make sure range for deletion is corect.

Please make sure parameters: keepPeriod and apps are set correctly.
Expected output from dry run:

    Max timestamp to keep:1686038716299
    processing app:Mobile App
    collecting ids to delete
    ids collected: 1698
    collected regexes for deletion
    ["^.{40}_2023:6:6:h\\d?\\d$"]
    Skiping deletion as this is dry run
    processing app:Web App
    collecting ids to delete
    ids collected: 382
    collected regexes for deletion
    ["^.{40}_2023:1:9:h\\d?\\d$","^.{40}_2023:1:10:h\\d?\\d$","^.{40}_2023:1:11:h\\d?\\d$","^.{40}_2023:1:13:h\\d?\\d$","^.{40}_2023:1:14:h\\d?\\d$","^.{40}_2023:1:16:h\\d?\\d$","^.{40}_2023:1:24:h\\d?\\d$","^.{40}_2023:1:25:h\\d?\\d$","^.{40}_2023:1:26:h\\d?\\d$","^.{40}_2023:1:27:h\\d?\\d$","^.{40}_2023:1:28:h\\d?\\d$","^.{40}_2023:1:29:h\\d?\\d$","^.{40}_2023:2:20:h\\d?\\d$","^.{40}_2023:2:21:h\\d?\\d$","^.{40}_2023:2:28:h\\d?\\d$","^.{40}_2023:3:1:h\\d?\\d$","^.{40}_2023:3:4:h\\d?\\d$","^.{40}_2023:3:7:h\\d?\\d$","^.{40}_2023:3:8:h\\d?\\d$","^.{40}_2023:3:11:h\\d?\\d$","^.{40}_2023:3:13:h\\d?\\d$","^.{40}_2023:3:17:h\\d?\\d$","^.{40}_2023:3:18:h\\d?\\d$","^.{40}_2023:3:25:h\\d?\\d$","^.{40}_2023:3:31:h\\d?\\d$","^.{40}_2023:4:2:h\\d?\\d$","^.{40}_2023:4:4:h\\d?\\d$","^.{40}_2023:4:6:h\\d?\\d$","^.{40}_2023:4:9:h\\d?\\d$","^.{40}_2023:4:11:h\\d?\\d$","^.{40}_2023:4:15:h\\d?\\d$","^.{40}_2023:4:17:h\\d?\\d$","^.{40}_2023:4:20:h\\d?\\d$","^.{40}_2023:4:23:h\\d?\\d$","^.{40}_2023:4:26:h\\d?\\d$","^.{40}_2023:4:27:h\\d?\\d$","^.{40}_2023:4:30:h\\d?\\d$","^.{40}_2023:5:1:h\\d?\\d$","^.{40}_2023:5:4:h\\d?\\d$","^.{40}_2023:5:7:h\\d?\\d$","^.{40}_2023:5:13:h\\d?\\d$","^.{40}_2023:5:16:h\\d?\\d$","^.{40}_2023:5:17:h\\d?\\d$","^.{40}_2023:5:18:h\\d?\\d$","^.{40}_2023:5:19:h\\d?\\d$","^.{40}_2023:5:27:h\\d?\\d$","^.{40}_2023:5:31:h\\d?\\d$","^.{40}_2023:6:1:h\\d?\\d$","^.{40}_2023:6:3:h\\d?\\d$","^.{40}_2023:6:4:h\\d?\\d$","^.{40}_2023:6:5:h\\d?\\d$","^.{40}_2023:6:6:h\\d?\\d$"]
    Skiping deletion as this is dry run
    Finished

Ecpected output form dry_run=false
    
    Max timestamp to keep:1686039437676

    processing app:Mobile App
    collecting ids to delete
    ids collected: 1674
    clering timeline Data collection...
    {"acknowledged":true,"deletedCount":1280}
    clering timelineStatus....
    {"acknowledged":true,"deletedCount":120}

    Finished
*/
var pluginManager = require('../../../plugins/pluginManager.js');
var Promise = require("bluebird");
var moment = require('moment-timezone');
const { ObjectId } = require('mongodb');

var keepPeriod = '3month'; //one of 1month, 3month, 6month, 1year, 2year
var app_list = []; //valid app_ids here. If empty array passed script will process all apps.

var dry_run = false; //if true, will not delete anything, just show what dates should be deleted.


Promise.all([pluginManager.dbConnection("countly")]).then(async function([countlyDb]) {
    getAppList({db: countlyDb}, function(err, apps) {
        if (err) {
            console.log(err);
            console.log("Could not connect to databases. Exiting script. ");
            countlyDb.close();
        }
        else {
            var tsMax = getPeriod(keepPeriod);
            console.log("Max timestamp to keep:" + tsMax);
            Promise.each(apps, function(app) {
                return new Promise(function(resolve/*, reject*/) {
                    console.log("\nprocessing app:" + app.name);
                    console.log("collecting ids to delete");

                    var pipeline = [{"$match": {"app_id": (app._id + "")}}, {"$group": {"_id": {"$arrayElemAt": [{"$split": ["$_id", "_"]}, 1]}}}];
                    countlyDb.collection("timelineStatus").aggregate(pipeline, function(err, dates) {
                        console.log("ids collected: " + dates.length);
                        if (err) {
                            console.log(err);
                            resolve();
                        }
                        else {
                            var regex = [];
                            var ids = [];
                            var mappedDates = {};

                            var maxYear = 0;
                            for (var z = 0; z < dates.length; z++) {
                                var dd = dates[z]._id.split(":");
                                if (dd.length > 2) {
                                    var day0 = dates[z]._id.replace("h", "");
                                    var ff = moment(day0, "YYYY:M:D:H");
                                    if (ff.valueOf() < tsMax) {
                                        try {
                                            var yy = parseInt(dd[0]);
                                            if (yy > maxYear) {
                                                maxYear = yy;
                                            }
                                        }
                                        catch (ex) {
                                            console.log(ex);
                                        }
                                        mappedDates[dd[0]] = mappedDates[dd[0]] || {};
                                        mappedDates[dd[0]][dd[1]] = mappedDates[dd[0]][dd[1]] || {};
                                        mappedDates[dd[0]][dd[1]][dd[2]] = true;
                                    }
                                }
                            }
                            var ids_listed = [];
                            var regex_listed = [];
                            for (var year in mappedDates) {
                                if (parseInt(year) < maxYear) { //if there is any year bigger in  clear whole year
                                    ids.push(new RegExp("^.{40}_" + year + ":.*"));
                                    ids_listed.push("^.{40}_" + year + ":.*");
                                    regex.push(new RegExp("^" + year + ":.*"));
                                    regex_listed.push("^" + year + ":.*");
                                }
                                else {
                                    for (var month in mappedDates[year]) {
                                        for (var day in mappedDates[year][month]) {
                                            ids.push(new RegExp("^.{40}_" + maxYear + ":" + month + ":" + day + ":h\\d?\\d$"));
                                            ids_listed.push("^.{40}_" + maxYear + ":" + month + ":" + day + ":h\\d?\\d$");
                                            regex.push(new RegExp("^" + year + ":" + month + ":" + day + ".*"));
                                            regex_listed.push("^" + year + ":" + month + ":" + day + ".*");
                                        }
                                    }
                                }
                            }

                            if (dry_run) {
                                console.log("collected regexes for deletion for data collection");
                                console.log(JSON.stringify(regex_listed));
                                console.log("collected regexes for deletion for status collection");
                                console.log(JSON.stringify(ids_listed));
                                console.log("Skiping deletion as this is dry run");
                                resolve();
                                return;
                            }
                            else {
                                console.log("clering timeline Data collection...");
                                countlyDb.collection("eventTimes" + app._id).remove({"_id": {"$in": regex}}, function(err0, res0) {
                                    if (err0) {
                                        console.e.log(err0);
                                        console.log("Data deletion failied. Skipping this App.");
                                        resolve();
                                    }
                                    else {
                                        console.log(JSON.stringify(res0));
                                        console.log("Process could take long time. Clering timelineStatus....");
                                        countlyDb.collection("timelineStatus").remove({"app_id": (app._id + ""), "_id": {"$in": ids}}, function(err1, res) {
                                            console.log(JSON.stringify(res));
                                            countlyDb.collection("timelineStatus").ensureIndex({"app_id": 1}, function() {});
                                            if (err1) {
                                                console.log(err1);
                                            }
                                            resolve();
                                        });
                                    }
                                });
                            }
                        }
                    });
                });
            }).then(function() {
                console.log("Finished");
                countlyDb.close();
            });
        }
    });
});


function getPeriod(pp) {
    var periods = {
        "1month": 1,
        "3month": 3,
        "6month": 6,
        "1year": 12,
        "2year": 24
    };
    var back = periods[pp];
    if (!back) {
        back = 12;
        console.log('Invalid perod. Falling back to one year');
    }
    var now = moment();
    for (let i = 0; i < back; i++) {
        now = now.subtract(1, "months");
    }
    var oldestTimestampWanted = now.valueOf();
    return oldestTimestampWanted;
}

function getAppList(options, callback) {
    var query = {};
    if (app_list && app_list.length > 0) {
        var listed = [];
        for (var z = 0; z < app_list.length; z++) {
            listed.push(ObjectId(app_list[z]));
        }
        query = {_id: {$in: listed}};
    }

    options.db.collection("apps").find(query).toArray(function(err, myapps) {
        if (err) {
            console.log("Couldn't get app list");
            callback(err, []);
        }
        else {
            callback(err, myapps);
        }
    });

}