/**
 * Script list collections that are not used by Countly
 * Server: countly server
 * Path: countly/bin/scripts/modify-data
 */

var pluginManager = require('./../../../plugins/pluginManager.js'),
    crypto = require('crypto'),
    Promise = require("bluebird");


var appIDs = [];
console.log("This script will list collections not used by Countly");

function checkEvents(countlyDb, collections, apps, callback) {

    countlyDb.collection("events").find({}, {"list": true}).toArray(function(err, eventsDb) {
        var hashMap = {};
        for (let z = 0; z < apps.length; z++) {

            var event = eventsDb.find(function(e) {
                return e._id + "" === apps[z] + "";
            });

            if (event) {
                for (let i = 0; i < event.list.length; i++) {
                    hashMap[crypto.createHash('sha1').update(event.list[i] + apps[z] + "").digest('hex')] = {"a": apps[z], "e": event.list[i]};
                }
            }

            var internalDrillEvents = ["[CLY]_session", "[CLY]_view", "[CLY]_nps", "[CLY]_crash", "[CLY]_action", "[CLY]_session", "[CLY]_survey", "[CLY]_star_rating", "[CLY]_apm_device", "[CLY]_apm_network", "[CLY]_push_action"];
            var internalEvents = ["[CLY]_session", "[CLY]_view", "[CLY]_nps", "[CLY]_crash", "[CLY]_action", "[CLY]_session", "[CLY]_survey", "[CLY]_star_rating", "[CLY]_apm_device", "[CLY]_apm_network", "[CLY]_push_action"];

            if (internalDrillEvents) {
                for (let i = 0; i < internalDrillEvents.length; i++) {
                    hashMap[crypto.createHash('sha1').update(internalDrillEvents[i] + apps[z] + "").digest('hex')] = {"a": apps[z], "e": internalDrillEvents[i]};
                }
            }

            if (internalEvents) {
                for (let i = 0; i < internalEvents.length; i++) {
                    hashMap[crypto.createHash('sha1').update(internalEvents[i] + apps[z] + "").digest('hex')] = {"a": apps[z], "e": internalEvents[i]};
                }
            }
        }
        var toRemove = [];
        for (var z = 0; z < collections.length; z++) {
            if (collections[z].collectionName.startsWith("events") && collections[z].collectionName !== 'events') {
                var pp = collections[z].collectionName.replace("events", "");
                if (!hashMap[pp]) {
                    toRemove.push(collections[z].collectionName + "");
                }
            }
        }
        console.log("Event collections", JSON.stringify(toRemove, null, 2));
        callback();

    });
}

function checkDrillEvents(countlyDb, drillDb, apps, callback) {

    drillDb.collections(function(error, collections) {
        countlyDb.collection("events").find({}, {"list": true}).toArray(function(err, eventsDb) {
            var hashMap = {};
            for (let z = 0; z < apps.length; z++) {

                var event = eventsDb.find(function(e) {
                    return e._id + "" === apps[z] + "";
                });

                if (event) {
                    for (let i = 0; i < event.list.length; i++) {
                        hashMap[crypto.createHash('sha1').update(event.list[i] + apps[z] + "").digest('hex')] = {"a": apps[z], "e": event.list[i]};
                    }
                }

                var internalDrillEvents = ["[CLY]_session", "[CLY]_view", "[CLY]_nps", "[CLY]_crash", "[CLY]_action", "[CLY]_session", "[CLY]_survey", "[CLY]_star_rating", "[CLY]_apm_device", "[CLY]_apm_network", "[CLY]_push_action"];
                var internalEvents = ["[CLY]_session", "[CLY]_view", "[CLY]_nps", "[CLY]_crash", "[CLY]_action", "[CLY]_session", "[CLY]_survey", "[CLY]_star_rating", "[CLY]_apm_device", "[CLY]_apm_network", "[CLY]_push_action"];

                if (internalDrillEvents) {
                    for (let i = 0; i < internalDrillEvents.length; i++) {
                        hashMap[crypto.createHash('sha1').update(internalDrillEvents[i] + apps[z] + "").digest('hex')] = {"a": apps[z], "e": internalDrillEvents[i]};
                    }
                }

                if (internalEvents) {
                    for (let i = 0; i < internalEvents.length; i++) {
                        hashMap[crypto.createHash('sha1').update(internalEvents[i] + apps[z] + "").digest('hex')] = {"a": apps[z], "e": internalEvents[i]};
                    }
                }
            }
            var toRemove = [];
            for (var z = 0; z < collections.length; z++) {
                if (collections[z].collectionName.startsWith("drill_events") && collections[z].collectionName !== 'events') {
                    var pp = collections[z].collectionName.replace("drill_events", "");
                    if (!hashMap[pp]) {
                        toRemove.push(collections[z].collectionName + "");
                    }
                }
            }
            console.log("Drill Event collections", JSON.stringify(toRemove, null, 2));
            callback();

        });
    });
}

function checkViewsCollections(countlyDb, collections, callback) {



    countlyDb.collection('views').aggregate([{"$project": {"_id": true, "segments": {"$objectToArray": "$segments"}}}, {"$unwind": "$segments"}, {"$project": {"_id": true, "segment": "$segments.k"}}], function(err, res) {
        if (err) {
            console.log(err);
            callback();
        }
        else {

            var goodCols = {};

            for (let k = 0; k < res.length; k++) {
                goodCols["app_viewdata" + crypto.createHash('sha1').update("" + res[k]._id).digest('hex')] = true;
                goodCols["app_viewdata" + crypto.createHash('sha1').update(res[k].segment + res[k]._id).digest('hex')] = true;
            }
            var toRemove = [];
            for (let k = 0; k < collections.length; k++) {
                if (collections[k].collectionName.indexOf('app_viewdata') === 0) {
                    if (!goodCols[collections[k].collectionName]) {
                        toRemove.push(collections[k].collectionName + "");
                    }
                }

            }
            console.log("View collections", JSON.stringify(toRemove, null, 2));
            callback();
        }

    });

}

Promise.all([pluginManager.dbConnection("countly"), pluginManager.dbConnection("countly_drill")]).spread(function(countlyDb, drillDb) {
    countlyDb.collection("apps").find({}).toArray(function(err, res) {
        console.log("Currently have " + res.length + " apps");
        var obQuery = [];
        for (var k = 0; k < res.length; k++) {
            appIDs.push(res[k]._id + "");
            obQuery.push(countlyDb.ObjectID(res[k]._id));
        }

        var withID = ['app_users', 'metric_changes', 'event_flows', 'app_crashes', 'app_crashgroups', 'app_crashusers', 'app_nxret', 'app_userviews', 'app_viewsmeta', 'app_views', 'blocked_users', 'campaign_users', 'consent_history', 'crashes_jira', 'event_flows', 'eventTimes', 'flowSchema', 'flowData', 'flows_cache', 'timesofday', 'feedback', 'push_', 'apm_network', 'apm_device', 'app_user_merges', 'concurrent_users_new', 'concurrent_users', 'completed_surveys', 'logs', "survey", "nps"];
        var exclusions = {
            concurrent_users_max: true,
            feedback_widgets: true,
            concurrent_users_active: true
        };

        countlyDb.collections(function(error, collections) {

            console.log(err);
            var toRemove = [];

            for (var k = 0; k < collections.length; k++) {
                for (var p = 0; p < withID.length; p++) {
                    if (collections[k].collectionName.indexOf(withID[p]) === 0 && !exclusions[collections[k].collectionName]) {
                        var id = collections[k].collectionName.replace(withID[p], "");
                        if (appIDs.indexOf(id) === -1) {
                            toRemove.push(collections[k].collectionName + "");
                        }
                        break;
                    }

                }
            }
            console.log("App collections", JSON.stringify(toRemove, null, 2));
            checkViewsCollections(countlyDb, collections, function() {
                checkEvents(countlyDb, collections, appIDs, function() {
                    checkDrillEvents(countlyDb, drillDb, appIDs, function() {
                        countlyDb.close();
                        drillDb.close();
                    });
                });
            });
        });

    });
});


