/**
 *  Setup TTL indexes to delete older data for one specific app. This script should be run periodically, to create TTL indexes on new collections too, like new events, etc for specific app
 *  Server: countly
 *  Path: countly dir/bin/scripts/expire-data
 *  Command: node countly_single_app_expireData.js
 */

var APP_ID = "5d68e5012257c30a2f409e0e";
var EXPIRE_AFTER = 60 * 60 * 24 * 365; //1 year in seconds
var INDEX_NAME = "cd_1";

var async = require('async'),
    crypto = require('crypto'),
    Promise = require("bluebird"),
    plugins = require('../../../plugins/pluginManager.js');

//var db = plugins.dbConnection("countly");
//var db_drill = plugins.dbConnection("countly_drill");

Promise.all([plugins.dbConnection("countly"), plugins.dbConnection("countly_drill")]).spread(function(db, db_drill) {
    var collections = [];
    collections.push("drill_events" + crypto.createHash('sha1').update("[CLY]_session" + APP_ID).digest('hex'));
    collections.push("drill_events" + crypto.createHash('sha1').update("[CLY]_crash" + APP_ID).digest('hex'));
    collections.push("drill_events" + crypto.createHash('sha1').update("[CLY]_view" + APP_ID).digest('hex'));
    collections.push("drill_events" + crypto.createHash('sha1').update("[CLY]_action" + APP_ID).digest('hex'));
    collections.push("drill_events" + crypto.createHash('sha1').update("[CLY]_push_action" + APP_ID).digest('hex'));
    collections.push("drill_events" + crypto.createHash('sha1').update("[CLY]_push_sent" + APP_ID).digest('hex'));
    collections.push("drill_events" + crypto.createHash('sha1').update("[CLY]_star_rating" + APP_ID).digest('hex'));
    collections.push("drill_events" + crypto.createHash('sha1').update("[CLY]_consent" + APP_ID).digest('hex'));
    collections.push("drill_events" + crypto.createHash('sha1').update("[CLY]_nps" + APP_ID).digest('hex'));
    collections.push("drill_events" + crypto.createHash('sha1').update("[CLY]_survey" + APP_ID).digest('hex'));
    collections.push("drill_events" + crypto.createHash('sha1').update("[CLY]_apm_device" + APP_ID).digest('hex'));
    collections.push("drill_events" + crypto.createHash('sha1').update("[CLY]_apm_network" + APP_ID).digest('hex'));
    db.collection("events").findOne({'_id': db.ObjectID(APP_ID)}, {list: 1}, function(err, eventData) {
        if (eventData && eventData.list) {
            for (var i = 0; i < eventData.list.length; i++) {
                collections.push("drill_events" + crypto.createHash('sha1').update(eventData.list[i] + APP_ID).digest('hex'));
            }
        }
        function eventIterator(collection, done) {
            console.log("processing", collection);
            db_drill.collection(collection).indexes(function(err, indexes) {
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