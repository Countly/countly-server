/**
 *  Delete user properties from users and all historic drill documents
 *  Server: countly
 *  Path: countly dir/bin/scripts/modify-data/delete
 *  Command: node delete_user_properties.js
 */

//app id
var APP_ID = "5ab0c3ef92938d0e61cf77f4";
//path to property
var PROPERTY = "custom.k2";
//delete historic properties too
var HISTORIC = true;


var plugins = require("./../../../../plugins/pluginManager.js");
var asyncjs = require("async");
var crypto = require("crypto");

var internal_events = ["[CLY]_session", "[CLY]_crash", "[CLY]_view", "[CLY]_action", "[CLY]_push_action", "[CLY]_push_sent", "[CLY]_star_rating", "[CLY]_nps", "[CLY]_survey", "[CLY]_apm_network", "[CLY]_apm_device", "[CLY]_consent"];
var unset = {};
unset[PROPERTY] = "";

var Promise = require("bluebird");
Promise.all([plugins.dbConnection("countly"), plugins.dbConnection("countly_drill")]).spread(function(db, dbDrill) {
    console.log("Deleting property from app users");
    db.collection('app_users' + APP_ID).updateMany({}, {$unset: unset}, function(err,) {
        if (err) {
            console.log("Error", err);
        }
        if (HISTORIC) {
            db.collection('events').find({_id: db.ObjectID(APP_ID)}).toArray(function(err, events) {
                if (err) {
                    console.log("Error", err);
                }
                if (events.length) {
                    asyncjs.each(events, function(event, done) {
                        if (event && event.list && event.list.length) {
                            asyncjs.each(event.list.concat(internal_events), deleteDrillUserProperties, done);
                        }
                        else {
                            done();
                        }
                    }, function() {
                        db.close();
                        dbDrill.close();
                        console.log("done");
                    });
                }
            });
        }
        else {
            db.close();
            dbDrill.close();
            console.log("done");
        }
    });

    //name, email, picture
    function deleteDrillUserProperties(event, done) {
        console.log("Deleting historic property from", event);
        var unset = {};
        if (PROPERTY.startsWith("custom") || PROPERTY.startsWith("cmp")) {
            unset[PROPERTY] = "";
        }
        else {
            unset["up." + PROPERTY] = "";
        }
        var collection = "drill_events" + crypto.createHash('sha1').update(event + APP_ID).digest('hex');
        dbDrill.collection(collection).updateMany({}, {$unset: unset}, function(err) {
            if (err) {
                console.log("Error", err);
            }
            done();
        });
    }
});