var plugins = require('../../pluginManager.js'),
    common = require('../../../api/utils/common.js'),
    stats = require('./parts/stats.js');
const { changeStreamReader } = require('../../../api/parts/data/changeStreamReader');

(function() {
    plugins.register("/aggregator", function() {
        var changeStream = new changeStreamReader(common.drillDb, {
            pipeline: [
                {"$match": {"operationType": "insert"}},
                {"$project": {"a": "$fullDocument.a", "e": "$fullDocument.e"}}
            ],
            "name": "server-stats",
            "collection": "drill_events",
            "onClose":function(){
                common.writeBatcher.flush("countly","server_stats_data_points");
            }
        }, (token, next) => {
            if (next.e === "[CLY]_session") {
                stats.updateDataPoints(common.writeBatcher, next.a, 1, 0, false, token);
            }
            else if (stats.internalEventsEnum[next.e]) {
                var uu = {"e": 1};
                uu[stats.internalEventsEnum[next.e]] = 1;
                stats.updateDataPoints(common.writeBatcher, next.a, 0, uu, false, token);
                //if it is internal event, then we need to update the event count
            }
            else {
                stats.updateDataPoints(common.writeBatcher, next.a, 0, {"e": 1, "ce": 1}, false, token);
            }
            // process next document
        });

        common.writeBatcher.addFlushCallback("server_stats_data_points", function(token) {
            changeStream.acknowledgeToken(token);
        });

    });
}());
