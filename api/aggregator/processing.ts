/**
 * File contains core data aggregators
 */

import type { AggregatorUsageModule } from './usage.ts';
import { createRequire } from 'module';

import common from '../utils/common.js';
//const { DataBatchReader } = require('../parts/data/dataBatchReader');
import usage from './usage.js';

// createRequire needed for CJS modules without ES exports
// @ts-expect-error TS1470 - import.meta is valid at runtime (Node 22 treats .ts with imports as ESM)
const require = createRequire(import.meta.url);
const plugins = require('../../plugins/pluginManager.js');

/**
 * Drill event structure from MongoDB change stream
 */
export interface DrillEvent {
    /** Internal document ID */
    __iid?: string;
    /** Creation date */
    cd?: Date;
    /** App ID */
    a: string;
    /** Event type */
    e: string;
    /** Event name (for custom events) */
    n?: string;
    /** Timestamp */
    ts: number;
    /** Count */
    c?: number;
    /** Sum */
    s?: number;
    /** Duration */
    dur?: number;
    /** Device ID */
    did?: string;
    /** Segmentation data */
    sg?: Record<string, unknown>;
    /** User properties */
    up?: Record<string, unknown>;
    /** Extra user properties (e.g., view count) */
    up_extra?: {
        vc?: number | string;
        [key: string]: unknown;
    };
    /** Custom properties */
    custom?: Record<string, unknown>;
    /** Campaign data */
    cmp?: Record<string, unknown>;
}

/**
 * Token from event source for tracking processing state
 */
export interface EventToken {
    /** Creation date marker */
    cd?: Date;
    /** Resume token */
    resumeToken?: unknown;
}

/**
 * Drill meta update structure
 */
export interface DrillMetaUpdate {
    /** Document ID */
    _id: string;
    /** App ID */
    app_id: string;
    /** Event name */
    e: string;
    /** Document type */
    type: string;
    /** Last timestamp */
    lts?: number;
    /** Segmentation types */
    [key: string]: unknown;
}
const moment = require('moment');
const log = require('../utils/log.js')('aggregator-core:api');
const {WriteBatcher} = require('../parts/data/batcher.js');
const {Cacher} = require('../parts/data/cacher.js');
const {preset} = require('../lib/countly.preset.js');

const UnifiedEventSource = require('../eventSource/UnifiedEventSource.js');
//dataviews = require('./parts/data/dataviews.js');

const crypto = require('crypto');

(function() {
    let loaded_configs_time = 0;
    const reloadConfig = function(): Promise<void> {
        return new Promise(function(resolve) {
            const my_time = Date.now();
            const reload_configs_after = common.config.reloadConfigAfter || 10000;
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
        let type: 'l' | 'a' | 'n' | 'd' = "l";
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
                        for (const event of events) {
                            if (event.e === "[CLY]_session_begin" && event.a) {
                                try {
                                    const app = await common.readBatcher.getOne("apps", common.db.ObjectID(event.a));
                                    //record event totals in aggregated data
                                    if (app) {
                                        await usage.processSessionFromStream(token, event as any, {"app_id": event.a, "app": app, "time": common.initTimeObj(app.timezone, event.ts), "appTimezone": (app.timezone || "UTC")});
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
        const writeBatcher = new WriteBatcher(common.db, true);

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
                        for (const event of events) {
                            if (event.e === "[CLY]_session" && event.a) {
                                try {
                                    const app = await common.readBatcher.getOne("apps", common.db.ObjectID(event.a));
                                    //record event totals in aggregated data
                                    if (app) {
                                        let dur = 0;
                                        dur = event.dur || 0;
                                        await usage.processSessionDurationRange(writeBatcher, token, dur, event.did!, {"app_id": event.a, "app": app, "time": common.initTimeObj(app.timezone, event.ts), "appTimezone": (app.timezone || "UTC")});
                                        await usage.processViewCount(writeBatcher, token, event?.up_extra?.vc, event.did!, {"app_id": event.a, "app": app, "time": common.initTimeObj(app.timezone, event.ts), "appTimezone": (app.timezone || "UTC")});

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
        const drillMetaCache = new Cacher(common.drillDb, {configs_db: common.db}); //Used for Apps info
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
                        const updates: Record<string, DrillMetaUpdate> = {};
                        //Should sort before by event
                        for (const event of events) {
                            if (event.a && event.e) {
                                if (event.e === "[CLY]_property_update") {
                                    continue;
                                }
                                if (event.e === "[CLY]_custom") {
                                    event.e = event.n!;
                                }
                                if (event.e === "[CLY]_view_update") {
                                    event.e = "[CLY]_view";
                                }
                                if (event.e === "[CLY]_session_begin") {
                                    event.e = "[CLY]_session";
                                }
                                const event_hash = crypto.createHash("sha1").update(event.e + event.a).digest("hex");
                                let meta = await drillMetaCache.getOne("drill_meta", {_id: event.a + "_meta_" + event_hash});
                                const app_id = event.a;
                                if ((!meta || !meta._id) && !updates[app_id + "_meta_" + event_hash]) {
                                    const lts = Date.now();
                                    updates[app_id + "_meta_" + event_hash] = {
                                        _id: app_id + "_meta_" + event_hash,
                                        app_id: event.a,
                                        e: event.e,
                                        type: "e",
                                        lts: lts
                                    };
                                    meta = {
                                        _id: app_id + "_meta_" + event_hash,
                                        app_id: event.a,
                                        e: event.e,
                                        type: "e",
                                        lts: lts
                                    };
                                }

                                if (!meta.lts || moment(Date.now()).isAfter(moment(meta.lts), 'day')) {
                                    const lts2 = Date.now();
                                    updates[app_id + "_meta_" + event_hash] = updates[app_id + "_meta_" + event_hash] || {} as DrillMetaUpdate;
                                    updates[app_id + "_meta_" + event_hash].lts = lts2;
                                    meta.lts = lts2;
                                }
                                for (const sgk in event.sg) {
                                    if (!meta.sg || !meta.sg[sgk]) {
                                        meta.sg = meta.sg || {};
                                        const type = determineType(event.sg![sgk]);
                                        meta.sg[sgk] = {
                                            type: type
                                        };
                                        updates[app_id + "_meta_" + event_hash] = updates[app_id + "_meta_" + event_hash] || {} as DrillMetaUpdate;
                                        updates[app_id + "_meta_" + event_hash]["sg." + sgk + ".type"] = type;
                                    }
                                }

                                if (event.e === "[CLY]_session" || event.e === "[CLY]_session_begin") {
                                    let meta_up = await drillMetaCache.getOne("drill_meta", {_id: event.a + "_meta_up"});
                                    if ((!meta_up || !meta_up._id) && !updates[app_id + "_meta_up"]) {
                                        updates[app_id + "_meta_up"] = {
                                            _id: app_id + "_meta_up",
                                            app_id: event.a,
                                            e: "up",
                                            type: "up"
                                        };
                                        meta_up = {
                                            _id: app_id + "_meta_up",
                                            app_id: event.a,
                                            e: "up",
                                            type: "up"
                                        };
                                    }
                                    const groups: Array<'up' | 'cmp' | 'custom'> = ["up", "cmp", "custom"];
                                    for (const group of groups) {
                                        if (event[group]) {
                                            for (const key in event[group]) {
                                                if (!meta_up[group] || !meta_up[group][key]) {
                                                    meta_up[group] = meta_up[group] || {};
                                                    if (preset[group] && preset[group][key]) {
                                                        meta_up[group][key] = {type: preset[group][key].type};
                                                    }
                                                    else {
                                                        meta_up[group][key] = {type: determineType(event[group]![key])};
                                                    }

                                                    updates[app_id + "_meta_up"] = updates[app_id + "_meta_up"] || {} as DrillMetaUpdate;
                                                    updates[app_id + "_meta_up"][group + "." + key + ".type"] = meta_up[group][key].type;
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
