/**
 *  Script clears out data for chosen data labels from timeline and timeline meta so it can be fully regenerated
 *  Server: countly
 *  Path: $(countly dir)/bin/scripts/fix-data
 *  Command: node clear_timeline_period.js
 */

var pluginManager = require('./../../../plugins/pluginManager.js');
var Promise = require("bluebird");
const APPS = []; //leave array empty to process all apps;
var query_ids = {"_id": {"$regex": "^2024:1:30.*"}};


Promise.all([pluginManager.dbConnection("countly"), pluginManager.dbConnection("countly_drill")]).then(async function([countlyDb, drillDb]) {
    //get all apps
    var query = {};
    if (APPS.length > 0) {
        APPS.forEach(function(id, index) {
            APPS[index] = countlyDb.ObjectID(id);
        });
        query = {_id: {$in: APPS}};
    }

    countlyDb.collection("apps").find(query).toArray(function(err, apps) {
        if (err) {
            console.log(err);
            countlyDb.close();
            drillDb.close();
            return;
        }
        else {
            Promise.each(apps, function(app) {
                return new Promise(function(resolve, reject) {
                    console.log("Clearing out data from timeline collection for: " + app.name);
                    countlyDb.collection("eventTimes" + app._id).remove(query_ids, function(err) {
                        if (err) {
                            console.log(err);
                            reject();
                        }
                        else {
                            console.log("Cleared out data from timeline collection for: " + app.name);
                            resolve();

                        }
                    });
                });

            }).then(function() {

                console.log("Clearing out data from timeline status collection");
                var query2 = {};
                var regex2 = "^.{40}_" + query_ids._id.$regex.substring(1);
                query2["_id"] = {"$regex": regex2};
                console.log(JSON.stringify(query2));
                countlyDb.collection("timelineStatus").update(query2, {$set: {"g": false}}, {multi: true}, function(err, res) {
                    if (err) {
                        console.log(err);
                    }
                    else {
                        res = res || {};
                        console.log(JSON.stringify(res.result));
                        console.log("Cleared out data from timeline status collection for");

                    }

                    console.log("Finished cleanup. Data will be regenerated upon job starting rechecking process or upon API request triggering timeline generation.");
                    countlyDb.close();
                    drillDb.close();
                });
            }).catch(function(error) {
                console.log(error);
                countlyDb.close();
                drillDb.close();
            });
        }

    });


});