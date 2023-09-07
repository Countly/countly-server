/**
 *  Description: This script is used to recheck merges and update drill data with new uid
 *  Server: countly
 *  Path: $(countly dir)/bin/scripts/fix-data
 *  Command: node recheck_merges.js
 */


var asyncjs = require("async");
const pluginManager = require('../../../plugins/pluginManager.js');
const dataviews = require('../../../plugins/drill/api/parts/data/dataviews.js');

Promise.all([pluginManager.dbConnection("countly"), pluginManager.dbConnection("countly_drill")]).then(async function([countlyDb, drillDb]) {
    console.log("Connected to databases.");
    //get all apps
    countlyDb.collection("apps").find().toArray(function(err, apps) {
        if (err) {
            return close(err);
        }
        //get all drill collections
        drillDb.collections(function(err, collections) {
            if (err) {
                return close(err);
            }
            //for each app
            asyncjs.eachOf(apps, function(app, index, done) {
                var app_id = app._id;
                if (err) {
                    return done();
                }
                //get all users with merges
                countlyDb.collection('app_users' + app_id).find({merges: {$gt: 0}}).toArray(function(err, users) {
                    if (err) {
                        return done();
                    }
                    //for each user
                    asyncjs.eachOf(users, function(user, index, done) {
                        var new_uid = user.uid;
                        //get all merges to this user
                        countlyDb.collection('app_user_merges' + app_id).find({merged_to: new_uid}).toArray(function(err, merges) {
                            if (err) {
                                return done();
                            }
                            //for each merge, check if old uid still exists in any drill collection
                            asyncjs.eachOf(merges, function(merge, index, done) {
                                let old_uid = merge._id;
                                asyncjs.eachOf(collections, function(collection, index, done) {
                                    collection = collection.collectionName;
                                    //get event with old_uid
                                    drillDb.collection(collection).find({uid: old_uid}, {_id: 1}).limit(1).toArray(function(err, events) {
                                        if (err) {
                                            return done();
                                        }
                                        //if there is an event with the old uid, update them to the new uid
                                        if (events[0]) {
                                            console.log("Found at least one event with old uid ", old_uid, "in collection ", collection, "for app ", app.name, "updating to new uid", new_uid);
                                            drillDb.collection(drillDb.getCollectionName(events[0], app_id)).update({uid: old_uid}, {'$set': {uid: new_uid}}, {multi: true}, function() {
                                                dataviews.mergeUserTimes({uid: old_uid}, {uid: new_uid}, app_id, function() {
                                                    return done();
                                                });
                                            });
                                        }
                                    });
                                }, function() {
                                    done();
                                });
                            }, function() {
                                done();
                            });
                        });
                    }, function() {
                        done();
                    });
                });
            }, function(err) {
                close(err);
            });
        });
    });

    function close(err) {
        if (err) {
            console.log("Error: ", err);
        }
        countlyDb.close();
        drillDb.close();
        console.log("Done.");
    }
});