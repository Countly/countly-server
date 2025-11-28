/**
 * File contains core data aggregators
 */
var common = require('../utils/common.js');
//const { DataBatchReader } = require('../parts/data/dataBatchReader');
const plugins = require('../../plugins/pluginManager.js');
var usage = require('./usage.js');
var moment = require('moment');
const log = require('../utils/log.js')('aggregator-core:api');
const {WriteBatcher} = require('../parts/data/batcher.js');
const {Cacher} = require('../parts/data/cacher.js');
const {preset} = require('../lib/countly.preset.js');

const UnifiedEventSource = require('../eventSource/UnifiedEventSource.js');
//dataviews = require('./parts/data/dataviews.js');

var crypto = require('crypto');

(function() {
    var loaded_configs_time = 0;
    const reloadConfig = function() {
        return new Promise(function(resolve) {
            var my_time = Date.now();
            var reload_configs_after = common.config.reloadConfigAfter || 10000;
            //once in minute
            if (loaded_configs_time === 0 || (my_time - loaded_configs_time) >= reload_configs_after) {
                plugins.loadConfigs(common.db, () => {
                    loaded_configs_time = my_time;
                    resolve();
                }, true);
            }
            else {
                resolve();
            }
        });
    };

    /**
     * Determines the type of a value for aggregation purposes.
     * @param {*} value - The value to determine the type of.
     * @returns {string} - The determined type ('l' for list, 'a' for array, 'n' for number, 'd' for date).
     */
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
    //Core events aggregator for querying data. Queries data in batches based on cd field on drill_events collection in mongodb, aggregates in pipeline
    /* plugins.register("/aggregator", function() {
        new DataBatchReader(common.drillDb, {
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
                await usage.processEventTotalsFromAggregation(token, results, common.manualWriteBatcher);
                //Flush collected changes
                await common.manualWriteBatcher.flush("countly", "events_data", token.cd);
            }
        // process next batch of documents
        });
    });*/

    //Events processing
    plugins.register("/aggregator", async function() {
        const eventSource = new UnifiedEventSource('event-aggregator', {
            mongo: {
                db: common.drillDb,
                pipeline: [
                    {"$match": {"operationType": "insert", "fullDocument.e": "[CLY]_custom"}},
                    {"$project": {"__iid": "$fullDocument._id", "cd": "$fullDocument.cd", "a": "$fullDocument.a", "e": "$fullDocument.e", "n": "$fullDocument.n", "ts": "$fullDocument.ts", "c": "$fullDocument.c", "s": "$fullDocument.s", "dur": "$fullDocument.dur"}}
                ],
                fallback: {
                    pipeline: [{
                        "$match": {"e": {"$in": ["[CLY]_custom"]}}
                    }, {"$project": {"__id": "$_id", "cd": "$cd", "a": "$a", "e": "$e", "n": "$n", "ts": "$ts", "c": "$c", "s": "$s", "dur": "$dur"}}]
                }
            }
        });
        try {
            for await (const {token, events} of eventSource) {
                if (events && Array.isArray(events)) {
                    // Process each event in the batch
                    for (const currEvent of events) {
                        if (currEvent && currEvent.a && currEvent.e && currEvent.e === "[CLY]_custom") {
                            currEvent.e = currEvent.n;
                            await usage.processEventTotalsFromStream(token, currEvent, common.manualWriteBatcher);
                        }
                    }
                    common.manualWriteBatcher.flush("countly", "events_data");
                }
            }
        }
        catch (err) {
            log.e('Event processing error:', err);
        }
    });


    //processes session data and updates in aggregated data
    //!!! NOT FULLY AWAITING
    plugins.register("/aggregator", async function() {
        const eventSource = new UnifiedEventSource('session-ingestion', {
            mongo: {
                db: common.drillDb,
                pipeline: [
                    {"$match": {"operationType": "insert", "fullDocument.e": "[CLY]_session_begin"}},
                ],
                fallback: {
                    pipeline: [{
                        "$match": {"e": {"$in": ["[CLY]_session_begin"]}}
                    }]
                }
            }
        });
        try {
            for await (const {token, events} of eventSource) {
                if (events && Array.isArray(events)) {
                    for (var k = 0; k < events.length; k++) {
                        if (events[k].e === "[CLY]_session_begin" && events[k].a) {
                            try {
                                var app = await common.readBatcher.getOne("apps", common.db.ObjectID(events[k].a));
                                //record event totals in aggregated data
                                if (app) {
                                    await usage.processSessionFromStream(token, events[k], {"app_id": events[k].a, "app": app, "time": common.initTimeObj(app.timezone, events[k].ts), "appTimezone": (app.timezone || "UTC")});
                                }
                            }
                            catch (ex) {
                                log.e("Error processing session event", ex);
                            }
                        }
                    }
                    await common.manualWriteBatcher.flush("countly", "users");
                }
            }
        }
        catch (err) {
            log.e('Event processing error:', err);
        }
    });


    plugins.register("/aggregator", async function() {
        var writeBatcher = new WriteBatcher(common.db, true);

        const eventSource = new UnifiedEventSource('session-updates', {
            mongo: {
                db: common.drillDb,
                pipeline: [
                    {"$match": {"operationType": "insert", "fullDocument.e": "[CLY]_session"}},
                ],
                fallback: {
                    pipeline: [{
                        "$match": {"e": {"$in": ["[CLY]_session"]}}
                    }]
                }
            }
        });
        try {
            for await (const {token, events} of eventSource) {
                if (events && Array.isArray(events)) {
                    for (var k = 0; k < events.length; k++) {
                        if (events[k].e === "[CLY]_session" && events[k].a) {
                            try {
                                var app = await common.readBatcher.getOne("apps", common.db.ObjectID(events[k].a));
                                //record event totals in aggregated data
                                if (app) {
                                    var dur = 0;
                                    dur = events[k].dur || 0;

                                    await usage.processSessionDurationRange(writeBatcher, token, dur, events[k].did, {"app_id": events[k].a, "app": app, "time": common.initTimeObj(app.timezone, events[k].ts), "appTimezone": (app.timezone || "UTC")});

                                }
                            }
                            catch (ex) {
                                log.e("Error processing session event", ex);
                            }
                        }
                    }
                    await common.manualWriteBatcher.flush("countly", "users");
                }
            }
        }
        catch (err) {
            log.e('Event processing error:', err);
        }
    });


    //Drill meta aggregator in batches
    /* plugins.register("/aggregator", function() {
        var drillMetaCache = new Cacher(common.drillDb); //Used for Apps info
        new DataBatchReader(common.drillDb, {
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
    });*/

    //Processing event meta
    plugins.register("/aggregator", async function() {
        var drillMetaCache = new Cacher(common.drillDb);
        const eventSource = new UnifiedEventSource('drill-meta', {
            mongo: {
                db: common.drillDb,
                pipeline: [
                    {"$match": {"operationType": "insert"}},
                    {
                        "$project": {
                            "__iid": "$fullDocument._id",
                            "cd": "$fullDocument.cd",
                            "a": "$fullDocument.a",
                            "e": "$fullDocument.e",
                            "n": "$fullDocument.n",
                            "sg": "$fullDocument.sg",
                            "up": "$fullDocument.up",
                            "custom": "$fullDocument.custom",
                            "cmp": "$fullDocument.cmp"
                        }
                    }
                ],
                fallback: {
                    pipeline: []
                }
            }
        });
        try {
            for await (const {/*token,*/ events} of eventSource) {
                if (events && Array.isArray(events)) {
                    await reloadConfig(); //reloads configs if needed.
                    // Process each event in the batch
                    var updates = {};
                    //Should sort before by event 
                    for (var z = 0; z < events.length; z++) {
                        if (events[z].a && events[z].e) {
                            if (events[z].e === "[CLY]_property_update") {
                                continue;
                            }
                            if (events[z].e === "[CLY]_custom") {
                                events[z].e = events[z].n;
                            }
                            if (events[z].e === "[CLY]_view_update") {
                                events[z].e = "[CLY]_view";
                            }
                            if (events[z].e === "[CLY]_session_begin") {
                                events[z].e = "[CLY]_session";
                            }
                            let event_hash = crypto.createHash("sha1").update(events[z].e + events[z].a).digest("hex");
                            var meta = await drillMetaCache.getOne("drill_meta", {_id: events[z].a + "_meta_" + event_hash});
                            var app_id = events[z].a;
                            if ((!meta || !meta._id) && !updates[app_id + "_meta_" + event_hash]) {
                                var lts = Date.now();
                                updates[app_id + "_meta_" + event_hash] = {
                                    _id: app_id + "_meta_" + event_hash,
                                    app_id: events[z].a,
                                    e: events[z].e,
                                    type: "e",
                                    lts: lts
                                };
                                meta = {
                                    _id: app_id + "_meta_" + event_hash,
                                    app_id: events[z].a,
                                    e: events[z].e,
                                    type: "e",
                                    lts: lts
                                };
                            }

                            if (!meta.lts || moment(Date.now()).isAfter(moment(meta.lts), 'day')) {
                                var lts2 = Date.now();
                                updates[app_id + "_meta_" + event_hash] = updates[app_id + "_meta_" + event_hash] || {};
                                updates[app_id + "_meta_" + event_hash].lts = lts2;
                                meta.lts = lts2;
                            }
                            for (var sgk in events[z].sg) {
                                if (!meta.sg || !meta.sg[sgk]) {
                                    meta.sg = meta.sg || {};
                                    var type = determineType(events[z].sg[sgk]);
                                    meta.sg[sgk] = {
                                        type: type
                                    };
                                    updates[app_id + "_meta_" + event_hash] = updates[app_id + "_meta_" + event_hash] || {};
                                    updates[app_id + "_meta_" + event_hash]["sg." + sgk + ".type"] = type;
                                }
                            }

                            if (events[z].e === "[CLY]_session" || events[z].e === "[CLY]_session_begin") {
                                var meta_up = await drillMetaCache.getOne("drill_meta", {_id: events[z].a + "_meta_up"});
                                if ((!meta_up || !meta_up._id) && !updates[app_id + "_meta_up"]) {
                                    updates[app_id + "_meta_up"] = {
                                        _id: app_id + "_meta_up",
                                        app_id: events[z].a,
                                        e: "[CLY]_session",
                                        type: "up"
                                    };
                                    meta_up = {
                                        _id: app_id + "_meta_up",
                                        app_id: events[z].a,
                                        e: "[CLY]_session",
                                        type: "up"
                                    };
                                }
                                var groups = ["up", "cmp", "custom"];
                                for (var p = 0; p < groups.length; p++) {
                                    if (events[z][groups[p]]) {
                                        for (var key in events[z][groups[p]]) {
                                            if (!meta_up[groups[p]] || !meta_up[groups[p]][key]) {
                                                meta_up[groups[p]] = meta_up[groups[p]] || {};
                                                if (preset[groups[p]] && preset[groups[p]][key]) {
                                                    meta_up[groups[p]][key] = {type: preset[groups[p]][key].type};
                                                }
                                                else {
                                                    meta_up[groups[p]][key] = {type: determineType(events[z][groups[p]][key])};
                                                }

                                                updates[app_id + "_meta_up"] = updates[app_id + "_meta_up"] || {};
                                                updates[app_id + "_meta_up"][groups[p] + "." + key + ".type"] = meta_up[groups[p]][key].type;
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
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
                }
            }
        }
        catch (err) {
            log.e('Event processing error:', err);
        }
    });
}());
