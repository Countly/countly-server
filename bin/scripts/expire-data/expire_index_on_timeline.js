/**
 *  Setup TTL indexes to delete older data for one or many apps in user timeline.
 *  Server: countly
 *  Path: countly dir/bin/scripts/expire_index_on_timeline
 *  Command: node expire_index_on_timeline.js
 */

var EXPIRE_AFTER = 60 * 60 * 24 * 365; //1 year in seconds
var INDEX_NAME = "cd_1";

var async = require('async'),
    Promise = require("bluebird"),
    plugins = require('../../../plugins/pluginManager.js');

//var db = plugins.dbConnection("countly");
//var db_drill = plugins.dbConnection("countly_drill");

var apps = []//leave empty to set to all apps or put in some apps

Promise.all([plugins.dbConnection("countly"), plugins.dbConnection("countly_drill")]).spread(function(db, db_drill) {
    db.collections(function(err, collections) {
        if(err){
            log.e(err);
        }
        collections = collections || [];
        console.log("collection list loaded");
        collections = collections.filter(function(c) {
            if(c && c.collectionName){
                    if(c.collectionName.indexOf("eventTimes") === 0){
                        if(apps.length>0){
                            for(var i = 0; i < apps.length; i++){
                                if(c.collectionName === ("eventTimes"+apps[i])){
                                    return true;
                                }
                            }
                            return false;
                        }
                        else {
                        return true;
                        }
                    }
                    else {
                        return false;
                 }
            }
            else {
                return false;
            }
        });
        function eventIterator(coll, done) {
            var collection = coll.collectionName;
            console.log("processing", collection);
			db.collection(collection).indexes(function(err, indexes) {
                if (err) {
                    console.log(err);
                }
                if (!err && indexes) {
                    var hasIndex = false;
                    var dropIndex = false;
                    for (var i = 0; i < indexes.length; i++) {
                        if (indexes[i].name == INDEX_NAME) {
                            if (indexes[i].expireAfterSeconds == EXPIRE_AFTER) {
                                //print("skipping", c)
                                hasIndex = true;
                            }
                            //has index but incorrect expire time, need to be reindexed
                            else {
                                dropIndex = true;
                            }
                            break;
                        }
                    }
                    if (dropIndex) {
                        console.log("modifying index", collection);
                        db.command({
                            "collMod": collection,
                            "index": {
                                "keyPattern": {"cd": 1},
                                expireAfterSeconds: EXPIRE_AFTER
                            }
                        }, function(err) {
                            if (err) {
                                console.log(err);
                            }
                            done();
                        });

                    }
                    else if (!hasIndex) {
                        console.log("creating index", collection);
                        db.collection(collection).createIndex({"cd": 1}, {expireAfterSeconds: EXPIRE_AFTER, "background": true}, function() {
                            done();
                        });
                    }
                    else {
                        done();
                    }
                }
                else {
                    done();
                }
            });
        }
        async.eachSeries(collections, eventIterator, function() {
            db.close();
            db_drill.close();
        });
    });
});