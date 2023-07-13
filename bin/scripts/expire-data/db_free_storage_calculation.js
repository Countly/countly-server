/**
 *  Shows how much storage can be freed with data retention per app
 *  Server: countly
 *  Path: $(countly dir)/bin/scripts/expire-data
 *  Command: node db_free_storage_calculation.js
 */

var DATA_RETENTION_IN_SECONDS = 60 * 60 * 24 * 365; //one year 
var SCALE = 1024 * 1024; //megabytes

//available_for_reuse = you would free this by doing initial resync now
//total_will_be_free = you will free this by setting retention period to provided date and doing initial resync

var asyncjs = require("async");
var crypto = require('crypto');
var Promise = require("bluebird");
var plugins = require("../../../plugins/pluginManager");
var app_map = {};
var result = {available_for_reuse: 0, total_will_be_free: 0, count: 0, apps: {}};
Promise.all([plugins.dbConnection("countly"), plugins.dbConnection("countly_drill")]).spread(function(db, drill) {
    db.collection("apps").find().toArray(function(err, apps) {
        if (err) {
            return close(err);
        }
        if (!apps || !apps.length) {
            return close("No Apps");
        }
        for (var i = 0; i < apps.length; i++) {
            app_map[apps[i]._id + ""] = apps[i].name;
        }
        db.collection("events").find().toArray(function(err, events) {
            if (err) {
                return close(err);
            }
            if (!events || !events.length) {
                return close("No events");
            }
            asyncjs.each(events, function(item, done) {
                if (!item || !item.list || !item.list.length) {
                    return done();
                }
                var app = app_map[item._id + ""] || item._id + "";
                console.log("Processing app", app);
                asyncjs.eachOf(item.list, function(event, index, done) {
                    console.log("Processing event", index + 1, "of", item.list.length);
                    var event_hash = crypto.createHash('sha1').update(event + item._id).digest('hex');
                    var collection = drill.collection("drill_events" + event_hash);
                    collection.stats({scale: SCALE}, function(err, stats) {
                        if (stats.count > 0) {
                            var avg = stats.storageSize / stats.count;
                            result.available_for_reuse += stats.freeStorageSize || 0;
                            collection.find({cd: {$lt: new Date(Date.now() - (DATA_RETENTION_IN_SECONDS * 1000))}}).count(function(err, count) {
                                if (err) {
                                    return done();
                                }

                                if (count > 0) {
                                    result.count += count;
                                    result.total_will_be_free += Math.round(avg * count);
                                    if (!result.apps[app]) {
                                        result.apps[app] = {available_for_reuse: 0, total_will_be_free: 0, count: 0};
                                    }
                                    result.apps[app].available_for_reuse += stats.freeStorageSize || 0;
                                    result.apps[app].total_will_be_free += Math.round(avg * count);
                                    result.apps[app].count += count;
                                }
                                done();
                            });
                        }
                        else {
                            done();
                        }
                    });
                }, function() {
                    done();
                });
            }, function() {
                console.log(result);
                close();
            });
        });
    });
    function close(err) {
        if (err) {
            console.log("Error: ", err);
        }
        db.close();
        drill.close();
    }
});