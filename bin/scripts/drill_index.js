var async = require('async'),
    crypto = require('crypto'),
    plugins = require('../../plugins/pluginManager.js');

console.log("Updating drill indexes");
var hashes = {};
Promise.all([plugins.dbConnection("countly"), plugins.dbConnection("countly_drill")]).then(function([countlyDb, db]) {
    countlyDb.collection('apps').find({}).toArray(function(err, apps) {
        if (!apps || err) {
            console.log("No apps to upgrade");
            db.close();
            countlyDb.close();
            return;
        }
        for (var i = 0; i < apps.length; i++) {
            hashes["drill_events" + crypto.createHash('sha1').update("[CLY]_view" + apps[i]._id).digest('hex')] = "[CLY]_view";
            hashes["drill_events" + crypto.createHash('sha1').update("[CLY]_session" + apps[i]._id).digest('hex')] = "[CLY]_session";
            hashes["drill_events" + crypto.createHash('sha1').update("[CLY]_crash" + apps[i]._id).digest('hex')] = "[CLY]_crash";
            hashes["drill_events" + crypto.createHash('sha1').update("[CLY]_push_action" + apps[i]._id).digest('hex')] = "[CLY]_push_action";
            hashes["drill_events" + crypto.createHash('sha1').update("[CLY]_push_sent" + apps[i]._id).digest('hex')] = "[CLY]_push_sent";
            hashes["drill_events" + crypto.createHash('sha1').update("[CLY]_consent" + apps[i]._id).digest('hex')] = "[CLY]_consent";
            hashes["drill_events" + crypto.createHash('sha1').update("[CLY]_star_rating" + apps[i]._id).digest('hex')] = "[CLY]_star_rating";
            hashes["drill_events" + crypto.createHash('sha1').update("[CLY]_nps" + apps[i]._id).digest('hex')] = "[CLY]_nps";
            hashes["drill_events" + crypto.createHash('sha1').update("[CLY]_survery" + apps[i]._id).digest('hex')] = "[CLY]_survey";
            hashes["drill_events" + crypto.createHash('sha1').update("[CLY]_action" + apps[i]._id).digest('hex')] = "[CLY]_action";
            hashes["drill_events" + crypto.createHash('sha1').update("[CLY]_apm_device" + apps[i]._id).digest('hex')] = "[CLY]_apm_device";
            hashes["drill_events" + crypto.createHash('sha1').update("[CLY]_apm_network" + apps[i]._id).digest('hex')] = "[CLY]_apm_network";
        }
        db.collections(function(error, results) {
            if (error || !results) {
                db.close();
                countlyDb.close();
                console.log("Error occured:", error);
            }
            var cnt = 0;
            results = results.filter(collection => collection && collection.collectionName && collection.collectionName.startsWith("drill_events"));
            async.eachSeries(results, function(collection, done) {
                cnt++;
                console.log("Processing", cnt, "of", results.length, collection.collectionName);
                var col = db.collection(collection.collectionName);
                col.createIndex({uid: 1}, {background: true}, function() {
                    console.log("Done", {uid: 1});
                    if (hashes[collection.collectionName] === "[CLY]_session") {
                        col.createIndex({ts: 1, "up.cc": 1, uid: 1}, {background: true}, function() {
                            console.log("Done", "[CLY]_session", {ts: 1, "up.cc": 1, uid: 1});
                            done();
                        });
                    }
                    else if (hashes[collection.collectionName] === "[CLY]_view") {
                        col.createIndex({ts: 1, "sg.name": 1}, {background: true}, function() {
                            console.log("Done", "[CLY]_view", {ts: 1, "sg.name": 1});
                            done();
                        });
                    }
                    else if (hashes[collection.collectionName] === "[CLY]_crash") {
                        col.createIndex({ts: 1, "sg.crash": 1}, {background: true}, function() {
                            console.log("Done", "[CLY]_crash", {ts: 1, "sg.crash": 1});
                            done();
                        });
                    }
                    else if (hashes[collection.collectionName] === "[CLY]_push_action") {
                        col.createIndex({ts: 1, "sg.i": 1, uid: 1}, {background: true}, function() {
                            console.log("Done", "[CLY]_push_action", {ts: 1, "sg.i": 1});
                            done();
                        });
                    }
                    else if (hashes[collection.collectionName] === "[CLY]_star_rating") {
                        col.createIndex({ts: 1, "sg.widget_id": 1, "sg.rating": 1, uid: 1}, {background: true}, function() {
                            console.log("Done", "[CLY]_star_rating", {ts: 1, "sg.widget_id": 1, "sg.rating": 1});
                            done();
                        });
                    }
                    else if (hashes[collection.collectionName] === "[CLY]_nps") {
                        col.createIndex({ts: 1, "sg.widget_id": 1, "sg.rating": 1, uid: 1}, {background: true}, function() {
                            console.log("Done", "[CLY]_nps", {ts: 1, "sg.widget_id": 1, "sg.rating": 1});
                            done();
                        });
                    }
                    else if (hashes[collection.collectionName] === "[CLY]_survey") {
                        col.createIndex({ts: 1, "sg.widget_id": 1, uid: 1}, {background: true}, function() {
                            console.log("Done", "[CLY]_survey", {ts: 1, "sg.widget_id": 1});
                            done();
                        });
                    }
                    else {
                        col.createIndex({ts: 1}, {background: true}, function() {
                            console.log("Done", {ts: 1});
                            done();
                        });
                    }
                });
            }, function() {
                console.log("Fixing indexes on eventTimes collections");
                async.eachSeries(apps, function(app, done) {
                    countlyDb.collection('eventTimes' + app._id).ensureIndex({"uid": 1}, function() {
                        done();
                    });
                }, function() {
                    db.close();
                    countlyDb.close();
                    console.log("Drill index finished");
                });
            });
        });
    });
});