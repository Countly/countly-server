var plugins = require('../../pluginManager.js'),
    common = require('../../../api/utils/common.js'),
    stats = require('./parts/stats.js');
var log = common.log('server-stats:aggregator');
//const { DataBatchReader } = require('../../../api/parts/data/dataBatchReader');
const UnifiedEventSource = require('../../../api/eventSource/UnifiedEventSource.js');
const internalEventsSkipped = ["[CLY]_orientation", "[CLY]_session", "[CLY]_property_update", "[CLY]_view_update"];
(function() {
    /** Data batch reader option for data point counting*/
    /*plugins.register("/aggregator", function() {
        //I should register all to common manager which makes sure it is alive from time to time.
        new DataBatchReader(common.drillDb, {
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
    });*/


    plugins.register("/aggregator", async function() {
        const eventSource = new UnifiedEventSource('server-stats', {
            mongo: {
                db: common.drillDb,
                pipeline: [
                    {"$match": {"operationType": "insert"}},
                    {"$project": {"__id": "$fullDocument._id", "cd": "$fullDocument.cd", "a": "$fullDocument.a", "e": "$fullDocument.e"}}
                ],
                fallback: {
                    pipeline: [ {"$project": {"__id": "$_id", "cd": "$cd", "a": "$a", "e": "$e"}}]
                }
            }
        });
        try {
            for await (const {token, events} of eventSource) {
                if (events && Array.isArray(events)) {
                    for (var k = 0; k < events.length; k++) {
                        if (internalEventsSkipped.includes(events[k].e)) {
                            continue;
                        }
                        else if (events[k].e === "[CLY]_session_begin") {
                            stats.updateDataPoints(common.manualWriteBatcher, events[k].a, 1, 0, false, token);
                        }
                        else if (events[k].e in stats.internalEventsEnum) {
                            var uu = {"e": 1};
                            uu[stats.internalEventsEnum[events[k].e]] = 1;
                            stats.updateDataPoints(common.manualWriteBatcher, events[k].a, 0, uu, false, token);
                        }
                        else {
                            stats.updateDataPoints(common.manualWriteBatcher, events[k].a, 0, {"e": 1, "ce": 1}, false, token);
                        }
                    }
                    await common.manualWriteBatcher.flush("countly", "server_stats_data_points");
                }
            }
        }
        catch (err) {
            log.e('Event processing error:', err);
        }
    });


}());
