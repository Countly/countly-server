/**
 * File contains core data aggregators
 */

import type { DrillEvent, EventToken, DrillMetaUpdate } from '../../types/processing';
import type { AggregatorUsageModule } from '../../types/aggregatorUsage';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
var common = require('../utils/common.js');
//const { DataBatchReader } = require('../parts/data/dataBatchReader');
const plugins = require('../../plugins/pluginManager.ts');
/** @type {AggregatorUsageModule} */
var usage: AggregatorUsageModule = require('./usage.ts').default;
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
    const reloadConfig = function(): Promise<void> {
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
     * @param value - The value to determine the type of.
     * @returns - The determined type ('l' for list, 'a' for array, 'n' for number, 'd' for date).
     */
    function determineType(value: any): 'l' | 'a' | 'n' | 'd' {
        var type: 'l' | 'a' | 'n' | 'd' = "l";
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
            await eventSource.processWithAutoAck(
                /**
                 * Process events from stream
                 * @param token - Stream processing token
                 * @param events - Array of drill events to process
                 */
                async(token: EventToken, events: DrillEvent[]) => {
                    if (events && Array.isArray(events)) {
                        // Process each event in the batch
                        for (const currEvent of events) {
                            if (currEvent && currEvent.a && currEvent.e && currEvent.e === "[CLY]_custom") {
                                currEvent.e = currEvent.n!;
                                await usage.processEventTotalsFromStream(token, currEvent as any, common.manualWriteBatcher);
                            }
                        }
                        await common.manualWriteBatcher.flush("countly", "events_data");
                    }
                });
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
            await eventSource.processWithAutoAck(
                /**
                 * Process session events from stream
                 * @param token - Stream processing token
                 * @param events - Array of drill events to process
                 */
                async(token: EventToken, events: DrillEvent[]) => {
                    if (events && Array.isArray(events)) {
                        for (var k = 0; k < events.length; k++) {
                            if (events[k].e === "[CLY]_session_begin" && events[k].a) {
                                try {
                                    var app = await common.readBatcher.getOne("apps", common.db.ObjectID(events[k].a));
                                    //record event totals in aggregated data
                                    if (app) {
                                        await usage.processSessionFromStream(token, events[k] as any, {"app_id": events[k].a, "app": app, "time": common.initTimeObj(app.timezone, events[k].ts), "appTimezone": (app.timezone || "UTC")});
                                    }
                                }
                                catch (ex) {
                                    log.e("Error processing session event", ex);
                                }
                            }
                        }
                        await common.manualWriteBatcher.flush("countly", "users");
                    }
                });
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
            await eventSource.processWithAutoAck(
                /**
                 * Process session update events from stream
                 * @param token - Stream processing token
                 * @param events - Array of drill events to process
                 */
                async(token: EventToken, events: DrillEvent[]) => {
                    if (events && Array.isArray(events)) {
                        for (var k = 0; k < events.length; k++) {
                            if (events[k].e === "[CLY]_session" && events[k].a) {
                                try {
                                    var app = await common.readBatcher.getOne("apps", common.db.ObjectID(events[k].a));
                                    //record event totals in aggregated data
                                    if (app) {
                                        var dur = 0;
                                        dur = events[k].dur || 0;
                                        await usage.processSessionDurationRange(writeBatcher, token, dur, events[k].did!, {"app_id": events[k].a, "app": app, "time": common.initTimeObj(app.timezone, events[k].ts), "appTimezone": (app.timezone || "UTC")});
                                        await usage.processViewCount(writeBatcher, token, events[k]?.up_extra?.vc, events[k].did!, {"app_id": events[k].a, "app": app, "time": common.initTimeObj(app.timezone, events[k].ts), "appTimezone": (app.timezone || "UTC")});

                                    }
                                }
                                catch (ex) {
                                    log.e("Error processing session event", ex);
                                }
                            }
                        }
                        await writeBatcher.flush("countly", "users");
                    }
                });
        }
        catch (err) {
            log.e('Event processing error:', err);
        }
    });

    //Processing event meta
    plugins.register("/aggregator", async function() {
        var drillMetaCache = new Cacher(common.drillDb, {configs_db: common.db}); //Used for Apps info
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
            // eslint-disable-next-line no-unused-vars
            await eventSource.processWithAutoAck(
                /**
                 * Process drill meta events from stream
                 * @param token - Stream processing token
                 * @param events - Array of drill events to process
                 */
                async(token: EventToken, events: DrillEvent[]) => {
                    if (events && Array.isArray(events)) {
                        await reloadConfig(); //reloads configs if needed.
                        // Process each event in the batch
                        var updates: Record<string, DrillMetaUpdate> = {};
                        //Should sort before by event
                        for (var z = 0; z < events.length; z++) {
                            if (events[z].a && events[z].e) {
                                if (events[z].e === "[CLY]_property_update") {
                                    continue;
                                }
                                if (events[z].e === "[CLY]_custom") {
                                    events[z].e = events[z].n!;
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
                                    updates[app_id + "_meta_" + event_hash] = updates[app_id + "_meta_" + event_hash] || {} as DrillMetaUpdate;
                                    updates[app_id + "_meta_" + event_hash].lts = lts2;
                                    meta.lts = lts2;
                                }
                                for (var sgk in events[z].sg) {
                                    if (!meta.sg || !meta.sg[sgk]) {
                                        meta.sg = meta.sg || {};
                                        var type = determineType(events[z].sg![sgk]);
                                        meta.sg[sgk] = {
                                            type: type
                                        };
                                        updates[app_id + "_meta_" + event_hash] = updates[app_id + "_meta_" + event_hash] || {} as DrillMetaUpdate;
                                        updates[app_id + "_meta_" + event_hash]["sg." + sgk + ".type"] = type;
                                    }
                                }

                                if (events[z].e === "[CLY]_session" || events[z].e === "[CLY]_session_begin") {
                                    var meta_up = await drillMetaCache.getOne("drill_meta", {_id: events[z].a + "_meta_up"});
                                    if ((!meta_up || !meta_up._id) && !updates[app_id + "_meta_up"]) {
                                        updates[app_id + "_meta_up"] = {
                                            _id: app_id + "_meta_up",
                                            app_id: events[z].a,
                                            e: "up",
                                            type: "up"
                                        };
                                        meta_up = {
                                            _id: app_id + "_meta_up",
                                            app_id: events[z].a,
                                            e: "up",
                                            type: "up"
                                        };
                                    }
                                    var groups: Array<'up' | 'cmp' | 'custom'> = ["up", "cmp", "custom"];
                                    for (var p = 0; p < groups.length; p++) {
                                        if (events[z][groups[p]]) {
                                            for (var key in events[z][groups[p]]) {
                                                if (!meta_up[groups[p]] || !meta_up[groups[p]][key]) {
                                                    meta_up[groups[p]] = meta_up[groups[p]] || {};
                                                    if (preset[groups[p]] && preset[groups[p]][key]) {
                                                        meta_up[groups[p]][key] = {type: preset[groups[p]][key].type};
                                                    }
                                                    else {
                                                        meta_up[groups[p]][key] = {type: determineType(events[z][groups[p]]![key])};
                                                    }

                                                    updates[app_id + "_meta_up"] = updates[app_id + "_meta_up"] || {} as DrillMetaUpdate;
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
                });
        }
        catch (err) {
            log.e('Event processing error:', err);
        }
    });
}());
