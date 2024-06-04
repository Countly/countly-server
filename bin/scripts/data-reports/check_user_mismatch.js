/**
 *  Script checks if there are no user list differences between drill and app_users
 *  Server: countly
 *  Path: $(countly dir)/bin/scripts/data-reports
 *  Command: node check_user_mismatch.js
 * 
 * Before running script set eventKey and appID and modify query if needed. It is recommended to do not choose too wide date range. if there is alot of data as script will not be able to run validation query if it matches close to 1M users.
 */

const pluginManager = require('../../../plugins/pluginManager.js'),
    crypto = require('crypto');

var query = {"ts": {"$gt": 1709762400000}}; //Change this query to set date range
var eventKey = "[CLY]_session"; //Write in your event key
var appID = "6075f94b7e5e0d392902520c"; //Write in YOUR app ID

console.log("Running for:" + appID + " " + eventKey + " " + JSON.stringify(query));

Promise.all([pluginManager.dbConnection("countly"), pluginManager.dbConnection("countly_drill")]).then(async function([countlyDb, drillDb]) {

    var pipeline = [];
    pipeline.push({"$match": query});
    pipeline.push({"$group": {"_id": null, "uid": {"$addToSet": "$uid"}}});

    var collection = "drill_events" + crypto.createHash('sha1').update(eventKey + appID).digest('hex');

    drillDb.collection(collection).aggregate(pipeline, function(err, res) {
        if (err) {
            console.log(err);
            countlyDb.close();
            drillDb.close();
        }
        else {
            res = res || [];
            res = res[0] || {};
            res = res.uid || [];
            if (res.length > 0) {
                countlyDb.collection("app_users" + appID).find({"uid": {"$in": res}}, {"uid": 1, "_id": 1}).toArray(function(err, users) {
                    if (err) {
                        console.log(err);
                        countlyDb.close();
                        drillDb.close();
                    }
                    else {
                        users = users || [];
                        if (users.length === res.length) {
                            console.log("MATCHED COUNT");
                        }
                        else {
                            console.log("MISMATCHED COUNT");
                            console.log("Users in drill: " + res.length);
                            console.log("Users in countly: " + users.length);
                        }
                        console.log("checking which users don't have document in app_users collection...");

                        var map1 = {};
                        for (var h = 0; h < users.length; h++) {
                            map1[users[h].uid] = true;
                        }
                        var missingOnes = [];
                        for (var z = 0; z < res.length; z++) {
                            if (!map1[res[z]]) {
                                missingOnes.push(res[z]);
                            }
                        }
                        if (missingOnes.length > 0) {
                            console.log("Users missing in app_users collection: " + missingOnes.length);
                            console.log(JSON.stringify(missingOnes));
                        }

                        countlyDb.close();
                        drillDb.close();
                    }
                });
            }
            else {
                console.log("No users matched");
                console.log("Please run again with changed query to match some results");
            }

        }
    });
});