/**
 * File contains core data aggregators
 */

var common = require('../utils/common.js');
const { dataBatchReader } = require('../parts/data/dataBatchReader');
const plugins = require('../../plugins/pluginManager.js');
var usage = require('./usage.js');
const log = require('../utils/log.js')('aggregator-core:api');
const {WriteBatcher} = require('../parts/data/batcher.js');

//Core events data aggregator
plugins.register("/aggregator", function() {
    new dataBatchReader(common.drillDb, {
        pipeline: [
            {"$match": {"e": "[CLY]_custom"}},
            {
                "$group": {
                    "_id": {
                        "a": "$a",
                        "e": "$n",
                        "h": {"$dateToString": {"date": {"$toDate": "$ts"}, "format": "%Y:%m:%d:%H", "timezone": "UTC"}},
                    },
                    "c": {"$sum": "$c"},
                    "s": {"$sum": "$s"},
                    "dur": {"$sum": "$dur"}
                }
            },
            {"$sort": {"a": 1}},
            {
                "$project": {
                    "_id": 0,
                    "a": "$_id.a",
                    "e": "$_id.e",
                    "h": "$_id.h",
                    "c": 1,
                    "s": 1,
                    "dur": 1
                }
            }
        ],
        "interval": 10000, //10 seconds
        "name": "event-aggregation",
        "collection": "drill_events",
    }, async function(token, results) {
        if (results && results.length > 0) {
            await usage.processEventTotalsFromStream(token, results, common.manualWriteBatcher);
            //Flush collected changes
            await common.manualWriteBatcher.flush("countly", "events_data", token.cd);
        }
        // process next batch of documents
    });
});

//processes session data and updates in aggregated data
plugins.register("/aggregator", function() {
    new dataBatchReader(common.drillDb, {
        pipeline: [
            {"$match": {"e": "[CLY]_session"}},
        ],
        "name": "session-ingestion"
    }, async function(token, data) {
        if (data.length > 0) {
            for (var k = 0; k < data.length; k++) {
                var currEvent = data[k];
                if (currEvent && currEvent.a) {
                    //Record in session data
                    try {
                        var app = await common.readBatcher.getOne("apps", common.db.ObjectID(currEvent.a));
                        //record event totals in aggregated data
                        if (app) {
                            await usage.processSessionFromStream(token, currEvent, {"app_id": currEvent.a, "app": app, "time": common.initTimeObj(app.timezone, currEvent.ts), "appTimezone": (app.timezone || "UTC")});
                        }
                    }
                    catch (ex) {
                        log.e("Error processing session event", ex);
                        return;
                    }
                }
            }
            await common.manualWriteBatcher.flush("countly", "users", token.cd);
        }
    });
});

plugins.register("/aggregator", function() {
    var writeBatcher = new WriteBatcher(common.db, true);
    new dataBatchReader(common.drillDb, {
        pipeline: [{"$match": {"e": {"$in": ["[CLY]_session"]}}}],
        "timefield": "lu",
        "name": "session-updates",
        "collection": "drill_events",
    }, async function(token, docs) {
        console.log("Processing session updates " + docs.length);
        if (docs.length > 0) {
            for (var z = 0; z < docs.length; z++) {
                var next = docs[z];
                if (next && next.a && next.e && next.e === "[CLY]_session" && next.n && next.ts) {
                    try {
                        var app = await common.readBatcher.getOne("apps", common.db.ObjectID(next.a));
                        if (app) {
                            var dur = 0;
                            dur = next.dur || 0;

                            await usage.processSessionDurationRange(writeBatcher, token, dur, next.did, {"app_id": next.a, "app": app, "time": common.initTimeObj(app.timezone, next.ts), "appTimezone": (app.timezone || "UTC")});
                            //}
                        }
                    }
                    catch (e) {
                        log.e(e);
                        return;
                    }

                }
            }
            await writeBatcher.flush("countly", "users", token.cd);
        }
    });
});
