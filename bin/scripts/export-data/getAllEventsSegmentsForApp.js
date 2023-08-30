/**
 * Output list of app names, event keys, and segments.
 * Server: countly
 * Path: bin/scripts/export-data
 * Command: node getAllEventsSegmentsForApp.js
 */

var plugins = require("../../../plugins/pluginManager.js");

plugins.dbConnection("countly").then(function(db) {
    db.collection("events").find().toArray(function(errNoEvents, events) {
        db.collection("apps").find({}, {name: 1}).toArray(function(errNoApps, names) {

            if (errNoEvents || errNoApps) {
                console.log("Error fetching data", errNoEvents, errNoApps);
                db.close();
                return;
            }

            const appMapping = {};
            for (const app of names) {
                appMapping[app._id] = app.name;
            }

            console.log("App Name, Event Keys, Segments");

            for (const event of events) {
                const appId = event._id;
                const appName = appMapping[appId] || "Unknown";
                const segments = event.segments;

                for (const key in segments) {
                    if (Object.hasOwn(segments, key)) {
                        const values = segments[key];

                        for (const segmentValue of values) {
                            if (segmentValue !== null) {
                                const row = [appName, key, segmentValue];
                                console.log(row.join(", "));
                            }
                        }
                    }
                }
            }
            db.close();
        });
    });
});
