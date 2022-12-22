/**
 * Outputs list of drill collection names for specific app
 * Server: countly
 * Path: bin/scripts/export-data
 * Command: node getallEventsForApp.js
 */

// App id for which to get list of event collections
var APP_ID = "5ab0c3ef92938d0e61cf77f4";

var plugins = require("../../../plugins/pluginManager.js");
var crypto = require("crypto");
var internalDrillEvents = ["[CLY]_session", "[CLY]_view", "[CLY]_nps", "[CLY]_crash", "[CLY]_action", "[CLY]_session", "[CLY]_survey", "[CLY]_star_rating", "[CLY]_apm_device", "[CLY]_apm_network", "[CLY]_push_action"];
var result = [];
plugins.dbConnection("countly").then(function(db) {
    db.collection("events").findOne({_id: db.ObjectID(APP_ID)}, {"list": true}, function(err, event) {
        if (event && event.list) {
            for (let i = 0; i < event.list.length; i++) {
                result.push("drill_events" + crypto.createHash('sha1').update(event.list[i] + APP_ID + "").digest('hex'));
            }
        }
        if (internalDrillEvents) {
            for (let i = 0; i < internalDrillEvents.length; i++) {
                result.push("drill_events" + crypto.createHash('sha1').update(internalDrillEvents[i] + APP_ID + "").digest('hex'));
            }
        }
        db.close();
        console.log(result);
    });
});
