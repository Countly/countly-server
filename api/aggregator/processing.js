/**
 * File contains core data aggregators
 */


var common = require('../utils/common.js');
const { dataBatchReader } = require('../parts/data/dataBatchReader');
const plugins = require('../../plugins/pluginManager.js');
var usage = require('./usage.js');
const log = require('../utils/log.js')('aggregator-core:api');
const {WriteBatcher} = require('../parts/data/batcher.js');
const {Cacher} = require('../parts/data/cacher.js');

//dataviews = require('./parts/data/dataviews.js');

var crypto = require('crypto');

(function() {
    function determineType(value) {
        var type = "l";
        if (Array.isArray(value)) {
            type = "a";
        }
        else if (common.isNumber(value)) {
            if ((value + "").length < 16) {
                if ((value + "").length === 10 || (value + "").length === 13) {
                    type = "d"; //timestamp
                }
                else {
                    type = "n";
                }
            }
        }
        return type;
    }
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
            pipeline: [{"$match": {"e": {"$in": ["[CLY]_session_update"]}}}],
            "name": "session-updates",
            "collection": "drill_events",
        }, async function(token, docs) {
            console.log("Processing session updates " + docs.length);
            if (docs.length > 0) {
                for (var z = 0; z < docs.length; z++) {
                    var next = docs[z];
                    if (next && next.a && next.e && next.e === "[CLY]_session_update" && next.ts) {
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


    //Drill meta aggregator
    plugins.register("/aggregator", function() {
        var drillMetaCache = new Cacher(common.drillDb); //Used for Apps info
        new dataBatchReader(common.drillDb, {
            pipeline: [
                {
                    "$project": {
                        "a": "$a",
                        "e": "$e",
                        "n": "$n",
                        "sg": {"$ifNull": [{"$objectToArray": "$sg"}, [{"k": null, "v": null}]]}
                    }
                },
                {"$unwind": "$sg"},
                {"$group": {"_id": {"a": "$a", "e": "$e", "n": "$n", "sgk": "$sg.k"}, "sgv": {"$first": "$sg.v"}}}],
            "interval": 10000, ///default update interval
            "name": "drill-meta",
            "collection": "drill_events",
            "onClose": async function(callback) {
                if (callback) {
                    callback();
                }
            },
        }, async function(token, results) {
            var updates = {};
            for (var z = 0; z < results.length; z++) {
                if (results[z]._id && results[z]._id.a && results[z]._id.e) {
                    if (results[z]._id.e === "[CLY]_custom") {
                        results[z]._id.e = results[z]._id.n;
                    }
                    let event_hash = crypto.createHash("sha1").update(results[z]._id.e + results[z]._id.a).digest("hex");
                    var meta = await drillMetaCache.getOne("drill_meta", {_id: results[z]._id.a + "_meta_" + event_hash});
                    var app_id = results[z]._id.a;
                    if ((!meta || !meta._id) && !updates[app_id + "_meta_" + event_hash]) {
                        updates[app_id + "_meta_" + event_hash] = {
                            _id: app_id + "_meta_" + event_hash,
                            app_id: results[z]._id.a,
                            e: results[z]._id.e,
                            type: "e"
                        };
                        meta = {
                            _id: app_id + "_meta_" + event_hash,
                            app_id: results[z]._id.a,
                            e: results[z]._id.e,
                            type: "e"
                        };
                    }
                    if (results[z]._id.sgk) {
                        if (!meta.sg || !meta.sg[results[z]._id.sgk]) {
                            meta.sg = meta.sg || {};
                            var type = determineType(results[z].sgv);
                            meta.sg[results[z]._id.sgk] = {
                                type: type
                            };
                            updates[app_id + "_meta_" + event_hash] = updates[app_id + "_meta_" + event_hash] || {};
                            updates[app_id + "_meta_" + event_hash]["sg." + results[z]._id.sgk + ".type"] = type;
                        }
                    }
                }
            }
            //trigger all updates.
            if (Object.keys(updates).length > 0) {
                //bulk operation
                const bulkOps = Object.keys(updates).map(u => {
                    return {
                        updateOne: {
                            filter: {"_id": u},
                            update: {$set: updates[u]},
                            upsert: true
                        }
                    };
                });
                await common.drillDb.collection("drill_meta").bulkWrite(bulkOps);
            }
            // process next document
        });
    });
}());
