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
    countlyDb.collection("apps").find({}, {_id: 1, name: 1}).toArray(function(err, apps) {
        if (err || !apps || !apps.length) {
            return close(err);
        }
        //get all drill collections
        drillDb.collections(function(err, collections) {
            if (err || !collections || !collections.length) {
                return close(err);
            }
            //for each app
            asyncjs.eachSeries(apps, function(app, done) {
                //get users with merges
                const usersCursor = countlyDb.collection('app_users' + app._id).find({merges: {$gt: 0}}, {_id: 1, uid: 1, merged_uid: 1});
                //for each user
                usersCursor.next(function(err, user) {
                    if (err || !user) {
                        return done(err);
                    }
                    //check if old uid still exists in drill collections
                    if (user.merged_uid) {
                        processUser(user.merged_uid, user.uid, collections, app);
                    }
                });
            }, function(err) {
                close(err);
            });
        });
    });

    function processUser(old_uid, new_uid, collections, app) {
        asyncjs.eachSeries(collections, function(collection, done) {
            collection = collection.collectionName;
            drillDb.collection(collection).find({uid: old_uid}, {_id: 1}).limit(1).toArray().then(async function(err, events) {
                if (err || !events || !events.length) {
                    done();
                }
                if (events && events[0]) {
                    console.log("Found at least one event with old uid ", old_uid, "in collection ", collection, "for app ", app.name, "updating to new uid", new_uid);
                    drillDb.collection(drillDb.getCollectionName(events[0], app._id)).update({uid: old_uid}, {'$set': {uid: new_uid}}, {multi: true}, function() {
                        dataviews.mergeUserTimes({uid: old_uid}, {uid: new_uid}, app._id, function() {
                            return done();
                        });
                    });
                }
            });
        }, function(err) {
            return close(err);
        });
    }

    function close(err) {
        if (err) {
            console.log("Error: ", err);
        }
        countlyDb.close();
        drillDb.close();
        console.log("Done.");
    }
});