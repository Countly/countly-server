/**
 *  Delete user properties from users and all historic drill documents
 *  Server: countly
 *  Path: countly dir/bin/scripts/modify-data/delete
 *  Command: node delete_user_properties.js
 */

//app id
var APP_ID = "69f208be3956eabf8824be88";
//paths to properties
var PROPERTIES = ["custom.k2", "email"];
//delete historic properties too
var HISTORIC = true;


var plugins = require("./../../../../plugins/pluginManager.js");
var asyncjs = require("async");
var crypto = require("crypto");

var internal_events = ["[CLY]_session", "[CLY]_crash", "[CLY]_view", "[CLY]_action", "[CLY]_push_action", "[CLY]_push_sent", "[CLY]_star_rating", "[CLY]_nps", "[CLY]_survey", "[CLY]_apm_network", "[CLY]_apm_device", "[CLY]_consent"];

function buildUnset(properties, drillPrefix) {
    var unset = {};
    for (var i = 0; i < properties.length; i++) {
        var prop = properties[i];
        if (drillPrefix && !prop.startsWith("custom") && !prop.startsWith("cmp")) {
            unset["up." + prop] = "";
        }
        else {
            unset[prop] = "";
        }
    }
    return unset;
}

var Promise = require("bluebird");
Promise.all([plugins.dbConnection("countly"), plugins.dbConnection("countly_drill")]).then(async function([db, dbDrill]) {
    console.log("Deleting properties from app users:", PROPERTIES);
    db.collection('app_users' + APP_ID).updateMany({}, {$unset: buildUnset(PROPERTIES, false)}, function(err,) {
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
                        dbDrill.collection("drill_events").updateMany({"a": (APP_ID + "")}, {$unset: buildUnset(PROPERTIES, true)}, function(err) {
                            if (err) {
                                console.log("Error", err);
                            }
                            db.close();
                            dbDrill.close();
                            console.log("done");
                        });
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

    function deleteDrillUserProperties(event, done) {
        console.log("Deleting historic properties from", event);
        var collection = "drill_events" + crypto.createHash('sha1').update(event + APP_ID).digest('hex');
        dbDrill.collection(collection).updateMany({}, {$unset: buildUnset(PROPERTIES, true)}, function(err) {
            if (err) {
                console.log("Error", err);
            }
            done();
        });
    }
});
