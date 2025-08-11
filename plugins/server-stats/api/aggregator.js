var plugins = require('../../pluginManager.js'),
    common = require('../../../api/utils/common.js'),
    stats = require('./parts/stats.js');
const { dataBatchReader } = require('../../../api/parts/data/dataBatchReader');

const internalEventsSkipped = ["[CLY]_orientation", "[CLY]_session_update"];
(function() {
    plugins.register("/aggregator", function() {
        //I should register all to common manager which makes sure it is alive from time to time.
        new dataBatchReader(common.drillDb, {
            pipeline: [{"$group": {"_id": {"a": "$a", "e": "$e"}, "count": {"$sum": 1}}}],
            "interval": 10000, //10 seconds
            "name": "server-stats",
            "collection": "drill_events",
            "onClose": async function(callback) {
                await common.writeBatcher.flush("countly", "server_stats_data_points");
                if (callback) {
                    callback();
                }
            },
        }, async function(token, results) {
            for (var z = 0; z < results.length; z++) {
                if (results[z]._id && results[z]._id.a && results[z]._id.e) {
                    if (internalEventsSkipped.includes(results[z]._id.e)) {
                        continue;
                    }
                    else if (results[z]._id.e === "[CLY]_session") {
                        stats.updateDataPoints(common.manualWriteBatcher, results[z]._id.a, results[z].count, 0, false, token);
                    }
                    else if (results[z]._id.e in stats.internalEventsEnum) {
                        var uu = {"e": results[z].count};
                        uu[stats.internalEventsEnum[results[z]._id.e]] = results[z].count;
                        stats.updateDataPoints(common.manualWriteBatcher, results[z]._id.a, 0, uu, false, token);
                    }
                    else {
                        stats.updateDataPoints(common.manualWriteBatcher, results[z]._id.a, 0, {"e": results[z].count, "ce": results[z].count}, false, token);
                    }
                }
            }
            await common.manualWriteBatcher.flush("countly", "server_stats_data_points", token.cd);
            // process next document
        });
    });
}());
