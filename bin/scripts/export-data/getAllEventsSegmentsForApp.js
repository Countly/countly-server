/**
 * Outputs list of drill collection names for specific app
 * Server: countly
 * Path: bin/scripts/export-data
 * Command: node getallEventsSegmentsForApp.js
 */

var plugins = require("../../../plugins/pluginManager.js");

plugins.dbConnection("countly").then(function (db) {
  db.collection("events").find().toArray(function (err, events) {
    db.collection("apps").find().toArray(function (err, names) {

      if (err) {
        console.log("Error fetching data", err);
        db.close();
        return;
      }

      const appMapping = {};
      for (const app of names) {
        appMapping[app._id] = app.name;
      }

      console.log("App Name, Event Key, Segment");
      
      for (const event of events) {
        const appId = event._id;
        const appName = appMapping[appId] || "Unknown";
        const segments = event.segments;

        for (const key in segments) {
          if (segments.hasOwnProperty(key)) {
            const values = segments[key];

            for (const segmentValue of values) {
              const row = [appName, key, segmentValue];
              console.log(row.join(", "))
            }
          }
        }
      }
      db.close();
    });
  });
});