/**
 *  Check datapoints based on drill documents for specified period
 *  requires index on cd collections or else will be slower
 *  Server: countly
 *  Path: $(countly dir)/bin/scripts/data-reports
 *  Command: node datapoints_based_on_drill.js
 */

//period to check
var startDate = new Date("2021-03-01T00:00:00");
var endDate = new Date("2021-04-01T00:00:00");

var plugins = require("../../../plugins/pluginManager");
var map = require("./db_mapping.json");
var asyncjs = require("async");
var remap = {};
for (var key in map.collections) {
    remap[map.collections[key]] = key;
}

var data = [];
plugins.dbConnection("countly_drill").then(function(db) {
    db.collections(function(error, results) {
        var cnt = 1;
        asyncjs.eachSeries(results, function(col, done) {
            if (col.collectionName.indexOf("system.indexes") === -1 && col.collectionName.indexOf("sessions_") === -1) {
                db.collection(col.collectionName).find({"cd": {"$gte": startDate, "$lt": endDate}}).count(function(err, count) {
                    if (count) {
                        console.log("Processing", col.collectionName, cnt++, results.length);
                        data.push([remap[col.collectionName], count]);
                    }
                    done();
                });
            }
            else {
                done();
            }
        }, function() {
            db.close();
            data.sort(function(a, b) {
                return b[1] - a[1];
            });
            console.table(data);
        });
    });
});