/**
 *  Setup TTL indexes to delete older data for one specific app. This script should be run periodically, to create TTL indexes on new collections too, like new events, etc for specific app
 *  Server: countly
 *  Path: countly dir/bin/scripts/expire-data
 *  Command: node countly_multi_app_expireData.js
 */

var EXPIRE_AFTER = 60 * 60 * 24 * 365; //1 year in seconds
var INDEX_NAME = "cd_1";

var async = require('async'),
    Promise = require("bluebird"),
    plugins = require('../../../plugins/pluginManager.js');

//var db = plugins.dbConnection("countly");
//var db_drill = plugins.dbConnection("countly_drill");

Promise.all([plugins.dbConnection("countly"), plugins.dbConnection("countly_drill")]).spread(function(db, db_drill) {
    db_drill.collections(function(err, collections) {
        collections = collections || [];
        function eventIterator(coll, done) {
            var collection = coll.collectionName;
            console.log("processing", collection);
            db_drill.collection(collection).indexes(function(err, indexes) {
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
                        db_drill.command({
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
                        db_drill.collection(collection).createIndex({"cd": 1}, {expireAfterSeconds: EXPIRE_AFTER, "background": true}, function() {
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