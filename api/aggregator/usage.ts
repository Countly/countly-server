/**
 * Usage aggregation module for processing session and event data
 * @module api/aggregator/usage
 */

import type { WriteBatcher } from '../../types/batcher';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const common = require('./../utils/common.js');
const plugins = require('./../../plugins/pluginManager.js');
const async = require('async');
const crypto = require('crypto');
const moment = require('moment-timezone');

/**
 * Event token for stream processing
 */
export interface StreamToken {
    /** Creation date marker */
    cd?: Date;
    /** Resume token */
    resumeToken?: unknown;
}

/**
 * Parameters for aggregator processing
 */
export interface AggregatorParams {
    /** App ID */
    app_id: string;
    /** App document */
    app?: {
        timezone?: string;
        plugins?: Record<string, unknown>;
    };
    /** App timezone */
    appTimezone: string;
    /** Time object */
    time: {
        timestamp?: number;
        mstimestamp?: number;
        yearly?: string | number;
        monthly?: string;
        month?: string;
        weekly?: number;
        daily?: string;
        day?: string | number;
        hour?: string | number;
    };
    /** App user document */
    app_user?: Record<string, unknown>;
}

/**
 * Event from aggregation batch
 */
export interface AggregatedEvent {
    /** App ID */
    a: string;
    /** Event type */
    e: string;
    /** Event name */
    n?: string;
    /** Hour string (YYYY:MM:DD:HH) */
    h: string;
    /** Count */
    c?: number;
    /** Sum */
    s?: number;
    /** Duration */
    dur?: number;
}

/**
 * Stream event structure
 */
export interface StreamEvent {
    /** App ID */
    a: string;
    /** Event type */
    e: string;
    /** Event name (for custom events) */
    n?: string;
    /** Timestamp (milliseconds) */
    ts: number;
    /** Hour string (calculated) */
    h?: string;
    /** Count */
    c?: number;
    /** Sum */
    s?: number;
    /** Duration */
    dur?: number;
    /** Device ID */
    did?: string;
    /** Segmentation data */
    sg?: Record<string, unknown> & {
        prev_session?: boolean;
        prev_start?: number;
    };
    /** User properties */
    up?: Record<string, unknown> & {
        cc?: string;
    };
    /** Extra update properties */
    up_extra?: {
        vc?: number | string;
    };
}

/**
 * Predefined metric definition
 */
export interface MetricDefinition {
    /** Metric name (e.g., "_carrier", "_device") */
    name: string;
    /** Set name for storage */
    set: string;
    /** Short code for user document */
    short_code: string;
    /** Whether this is a user property */
    is_user_prop?: boolean;
    /** Whether to track changes */
    track_changes?: boolean;
    /** Custom function to get metric value */
    getMetricValue?: (doc: StreamEvent) => string | number | undefined;
}

/**
 * Predefined metrics group
 */
export interface PredefinedMetricsGroup {
    /** Database collection name */
    db: string;
    /** Array of metric definitions */
    metrics: MetricDefinition[];
}

/**
 * User properties object
 */
export interface UserProperties {
    [key: string]: string | number | boolean | object;
}

/**
 * Aggregator usage module interface
 */
export interface AggregatorUsageModule {
    processViewCount(
        writeBatcher: WriteBatcher,
        token: StreamToken,
        vc: number | string | undefined,
        did: string,
        params: AggregatorParams
    ): Promise<void>;

    processSessionDurationRange(
        writeBatcher: WriteBatcher,
        token: StreamToken,
        totalSessionDuration: number,
        did: string,
        params: AggregatorParams
    ): Promise<void>;

    processSessionFromStream(
        token: StreamToken,
        currEvent: StreamEvent,
        params: AggregatorParams
    ): Promise<void>;

    processEventTotalsFromAggregation(
        token: StreamToken,
        currEventArray: AggregatedEvent[],
        writeBatcher: WriteBatcher
    ): Promise<void>;

    processEventTotalsFromStream(
        token: StreamToken,
        currEvent: StreamEvent,
        writeBatcher: WriteBatcher
    ): Promise<void>;

    processEventFromStream(
        token: StreamToken,
        currEvent: StreamEvent,
        writeBatcher?: WriteBatcher
    ): void;

    processSessionMetricsFromStream(
        currEvent: StreamEvent,
        uniqueLevelsZero: string[],
        uniqueLevelsMonth: string[],
        params: AggregatorParams
    ): void;

    getPredefinedMetrics(
        params: AggregatorParams,
        userProps: UserProperties
    ): PredefinedMetricsGroup[];
}

const usage: AggregatorUsageModule = {
    /**
     * Process view count range for session
     * @param writeBatcher - Write batcher instance
     * @param token - Stream token
     * @param vc - View count
     * @param did - Device ID
     * @param params - Aggregator parameters
     * @returns Resolves when processing is complete
     */
    processViewCount: async function(writeBatcher: WriteBatcher, token: StreamToken, vc: number | string | undefined, did: string, params: AggregatorParams): Promise<void> {
        if (plugins.isPluginEnabled("views") && vc) {
            if (!common.isNumber(vc)) {
                try {
                    vc = Number.parseInt(vc as string, 10);
                }
                catch (ex) {
                    return;
                }
            }
            const ranges = [
                    [0, 2],
                    [3, 5],
                    [6, 10],
                    [11, 15],
                    [16, 30],
                    [31, 50],
                    [51, 100]
                ],
                rangesMax = 101,
                updateUsers: Record<string, any> = {},
                updateUsersZero: Record<string, any> = {},
                dbDateIds = common.getDateIds(params),
                monthObjUpdate: string[] = [];
            let calculatedRange: string;

            if ((vc as number) >= rangesMax) {
                calculatedRange = (ranges.length) + '';
            }
            else {
                for (const [i, range] of ranges.entries()) {
                    if ((vc as number) <= range[1] && (vc as number) >= range[0]) {
                        calculatedRange = i + '';
                        break;
                    }
                }
            }

            monthObjUpdate.push('vc.' + calculatedRange!);
            common.fillTimeObjectMonth(params, updateUsers, monthObjUpdate);
            common.fillTimeObjectZero(params, updateUsersZero, 'vc.' + calculatedRange!);
            const postfix = common.crypto.createHash("md5").update(did).digest('base64')[0];
            writeBatcher.add('users', params.app_id + "_" + dbDateIds.month + "_" + postfix, {'$inc': updateUsers}, "countly", {token: token});
            const update: Record<string, any> = {'$inc': updateUsersZero, '$set': {}};
            update.$set['meta_v2.v-ranges.' + calculatedRange!] = true;
            writeBatcher.add('users', params.app_id + "_" + dbDateIds.zero + "_" + postfix, update, "countly", {token: token});
        }

    },

    /**
     * Process session duration range
     * @param writeBatcher - Write batcher instance
     * @param token - Stream token
     * @param totalSessionDuration - Total session duration in seconds
     * @param did - Device ID
     * @param params - Aggregator parameters
     * @returns Resolves when processing is complete
     */
    processSessionDurationRange: async function(writeBatcher: WriteBatcher, token: StreamToken, totalSessionDuration: number, did: string, params: AggregatorParams): Promise<void> {
        const durationRanges = [
                [0, 10],
                [11, 30],
                [31, 60],
                [61, 180],
                [181, 600],
                [601, 1800],
                [1801, 3600]
            ],
            durationMax = 3601,
            updateUsers: Record<string, any> = {},
            updateUsersZero: Record<string, any> = {},
            dbDateIds = common.getDateIds(params),
            monthObjUpdate: string[] = [];
        let calculatedDurationRange: string;

        if (totalSessionDuration >= durationMax) {
            calculatedDurationRange = (durationRanges.length) + '';
        }
        else {
            for (const [i, durationRange] of durationRanges.entries()) {
                if (totalSessionDuration <= durationRange[1] && totalSessionDuration >= durationRange[0]) {
                    calculatedDurationRange = i + '';
                    break;
                }
            }
        }
        if (totalSessionDuration > 0) {
            common.fillTimeObjectMonth(params, updateUsers, common.dbMap.duration, totalSessionDuration);
        }
        monthObjUpdate.push(common.dbMap.durations + '.' + calculatedDurationRange!);
        common.fillTimeObjectMonth(params, updateUsers, monthObjUpdate);
        common.fillTimeObjectZero(params, updateUsersZero, common.dbMap.durations + '.' + calculatedDurationRange!);
        const postfix = common.crypto.createHash("md5").update(did).digest('base64')[0];
        writeBatcher.add("users", params.app_id + "_" + dbDateIds.month + "_" + postfix, {'$inc': updateUsers});
        const update: Record<string, any> = {
            '$inc': updateUsersZero,
            '$set': {"a": params.app_id + "", "m": dbDateIds.zero}
        };
        update.$set['meta_v2.d-ranges.' + calculatedDurationRange!] = true;
        writeBatcher.add("users", params.app_id + "_" + dbDateIds.zero + "_" + postfix, update, "countly", {token: token});
    },

    /**
     * Process session data from stream
     * @param token - Stream token
     * @param currEvent - Current session event
     * @param params - Aggregator parameters
     * @returns Resolves when processing is complete
     */
    processSessionFromStream: async function(token: StreamToken, currEvent: StreamEvent, params: AggregatorParams): Promise<void> {
        currEvent.up = currEvent.up || {};
        const updateUsersZero: Record<string, any> = {},
            updateUsersMonth: Record<string, any> = {},
            usersMeta: Record<string, any> = {},
            sessionFrequency = [
                [0, 24],
                [24, 48],
                [48, 72],
                [72, 96],
                [96, 120],
                [120, 144],
                [144, 168],
                [168, 192],
                [192, 360],
                [360, 744]
            ],
            sessionFrequencyMax = 744,
            uniqueLevels: string[] = [],
            uniqueLevelsZero: string[] = [],
            uniqueLevelsMonth: string[] = [],
            zeroObjUpdate: string[] = [],
            monthObjUpdate: string[] = [],
            dbDateIds = common.getDateIds(params);
        let calculatedFrequency: string | undefined;

        monthObjUpdate.push(common.dbMap.total);
        if (currEvent.up.cc) {
            monthObjUpdate.push(currEvent.up.cc + '.' + common.dbMap.total);
        }
        if (currEvent.sg && currEvent.sg.prev_session) {
            //user had session before
            if (currEvent.sg.prev_start) {
                const userLastSeenTimestamp = currEvent.sg.prev_start,
                    currDate = common.getDate(currEvent.ts, params.appTimezone),
                    userLastSeenDate = common.getDate(userLastSeenTimestamp, params.appTimezone),
                    secInMin = (60 * (currDate.minutes())) + currDate.seconds(),
                    secInHour = (60 * 60 * (currDate.hours())) + secInMin,
                    secInMonth = (60 * 60 * 24 * (currDate.date() - 1)) + secInHour,
                    secInYear = (60 * 60 * 24 * (common.getDOY(currEvent.ts, params.appTimezone) - 1)) + secInHour;

                /* if (dbAppUser.cc !== params.user.country) {
                monthObjUpdate.push(params.user.country + '.' + common.dbMap.unique);
                zeroObjUpdate.push(params.user.country + '.' + common.dbMap.unique);
            }*/

                // Calculate the frequency range of the user
                const ts_sec = currEvent.ts / 1000;
                if ((ts_sec - userLastSeenTimestamp) >= (sessionFrequencyMax * 60 * 60)) {
                    calculatedFrequency = sessionFrequency.length + '';
                }
                else {
                    for (const [i, element] of sessionFrequency.entries()) {
                        if ((ts_sec - userLastSeenTimestamp) < (element[1] * 60 * 60) &&
                            (ts_sec - userLastSeenTimestamp) >= (element[0] * 60 * 60)) {
                            calculatedFrequency = (i + 1) + '';
                            break;
                        }
                    }
                }

                //if for some reason we received past data lesser than last session timestamp
                //we can't calculate frequency for that part
                if (calculatedFrequency !== undefined) {
                    zeroObjUpdate.push(common.dbMap.frequency + '.' + calculatedFrequency);
                    monthObjUpdate.push(common.dbMap.frequency + '.' + calculatedFrequency);
                    usersMeta['meta_v2.f-ranges.' + calculatedFrequency] = true;
                }

                if (userLastSeenTimestamp < (ts_sec - secInMin)) {
                // We don't need to put hourly fragment to the unique levels array since
                // we will store hourly data only in sessions collection
                    updateUsersMonth['d.' + params.time.day + '.' + params.time.hour + '.' + common.dbMap.unique] = 1;
                }

                if (userLastSeenTimestamp < (ts_sec - secInHour)) {
                    uniqueLevels[uniqueLevels.length] = params.time.daily as string;
                    uniqueLevelsMonth.push(params.time.day as string);
                }

                if ((userLastSeenDate.year() + "") === (params.time.yearly + "") &&
                    Math.ceil(userLastSeenDate.format("DDD") / 7) < (params.time.weekly || 0)) {
                    uniqueLevels[uniqueLevels.length] = params.time.yearly + ".w" + params.time.weekly;
                    uniqueLevelsZero.push("w" + params.time.weekly);
                }

                if (userLastSeenTimestamp < (ts_sec - secInMonth)) {
                    uniqueLevels[uniqueLevels.length] = params.time.monthly as string;
                    uniqueLevelsZero.push(params.time.month as string);
                }

                if (userLastSeenTimestamp < (ts_sec - secInYear)) {
                    uniqueLevels[uniqueLevels.length] = params.time.yearly + "";
                    uniqueLevelsZero.push("Y");
                }
            }
        }
        else {
            zeroObjUpdate.push(common.dbMap.unique);
            monthObjUpdate.push(common.dbMap.new);
            monthObjUpdate.push(common.dbMap.unique);
            if (currEvent.up.cc) {
                zeroObjUpdate.push(currEvent.up.cc + '.' + common.dbMap.unique);
                monthObjUpdate.push(currEvent.up.cc + '.' + common.dbMap.new);
                monthObjUpdate.push(currEvent.up.cc + '.' + common.dbMap.unique);
            }

            // First time user.
            calculatedFrequency = '0';

            zeroObjUpdate.push(common.dbMap.frequency + '.' + calculatedFrequency);
            monthObjUpdate.push(common.dbMap.frequency + '.' + calculatedFrequency);

            usersMeta['meta_v2.f-ranges.' + calculatedFrequency] = true;
            //this was first session for this user
        }
        usersMeta['meta_v2.countries.' + (currEvent.up.cc || "Unknown")] = true;
        common.fillTimeObjectZero(params, updateUsersZero, zeroObjUpdate);
        common.fillTimeObjectMonth(params, updateUsersMonth, monthObjUpdate);

        const postfix = common.crypto.createHash("md5").update(currEvent.did).digest('base64')[0];
        if (Object.keys(updateUsersZero).length > 0 || Object.keys(usersMeta).length > 0) {
            usersMeta.m = dbDateIds.zero;
            usersMeta.a = params.app_id + "";
            const updateObjZero: Record<string, any> = {$set: usersMeta};

            if (Object.keys(updateUsersZero).length > 0) {
                updateObjZero.$inc = updateUsersZero;
            }
            common.writeBatcher.add("users", params.app_id + "_" + dbDateIds.zero + "_" + postfix, updateObjZero, "countly", {token: token});
        }
        if (Object.keys(updateUsersMonth).length > 0) {
            common.writeBatcher.add("users", params.app_id + "_" + dbDateIds.month + "_" + postfix, {
                $set: {
                    m: dbDateIds.month,
                    a: params.app_id + ""
                },
                '$inc': updateUsersMonth
            }, "countly", {token: token});
        }
        usage.processSessionMetricsFromStream(currEvent, uniqueLevelsZero, uniqueLevelsMonth, params);
    },

    /**
     * Process event totals from aggregation batch
     * @param token - Stream token
     * @param currEventArray - Array of aggregated events
     * @param writeBatcher - Write batcher instance
     * @returns Resolves when processing is complete
     */
    processEventTotalsFromAggregation: async function(token: StreamToken, currEventArray: AggregatedEvent[], writeBatcher: WriteBatcher): Promise<void> {
        const rootUpdate: Record<string, any> = {};
        for (const element of currEventArray) {
            let eventColl = await common.readBatcher.getOne("events", common.db.ObjectID(element.a), {"transformation": "event_object"});
            const appData = await common.readBatcher.getOne("apps", common.db.ObjectID(element.a), {timezone: 1, plugins: 1});
            const conff = plugins.getConfig("api", appData.plugins, true);
            //Get timezone offset in hours from timezone name
            const appTimezone = appData.timezone || "UTC";

            const d = moment();
            if (appTimezone) {
                d.tz(appTimezone);
            }
            const tmpEventObj: Record<string, any> = {};
            const tmpTotalObj: Record<string, any> = {};

            const shortEventName = element.e;
            eventColl = eventColl || {};
            if (!eventColl._list || eventColl._list[shortEventName] !== true) {
                eventColl._list = eventColl._list || {};
                eventColl._list_length = eventColl._list_length || 0;
                if (eventColl._list_length <= conff.event_limit) {
                    eventColl._list[shortEventName] = true;
                    eventColl._list_length++;
                    rootUpdate.$addToSet = {list: shortEventName};
                }
                else {
                    return; //do not record this event in aggregated data
                }
            }
            const eventCollectionName = crypto.createHash('sha1').update(shortEventName + element.a).digest('hex');
            common.shiftHourlyData(element, Math.floor(d.utcOffset() / 60), "h");
            const date = element.h.split(":");
            const timeObj = {"yearly": date[0], "weekly": 1, "monthly": date[1], "month": date[1], "day": date[2], "hour": date[3]};
            if (element.s && common.isNumber(element.s)) {
                common.fillTimeObjectMonth({"time": timeObj}, tmpEventObj, common.dbMap.sum, element.s);
                common.fillTimeObjectMonth({"time": timeObj}, tmpTotalObj, shortEventName + '.' + common.dbMap.sum, element.s);
            }
            else {
                element.s = 0;
            }
            if (element.dur && common.isNumber(element.dur)) {
                common.fillTimeObjectMonth({"time": timeObj}, tmpEventObj, common.dbMap.dur, element.dur);
                common.fillTimeObjectMonth({"time": timeObj}, tmpTotalObj, shortEventName + '.' + common.dbMap.dur, element.dur);
            }
            else {
                element.dur = 0;
            }
            element.c = element.c || 1;
            if (element.c && common.isNumber(element.c)) {
                element.c = Number.parseInt(element.c as unknown as string, 10);
            }

            common.fillTimeObjectMonth({"time": timeObj}, tmpEventObj, common.dbMap.count, element.c);
            common.fillTimeObjectMonth({"time": timeObj}, tmpTotalObj, shortEventName + '.' + common.dbMap.count, element.c);

            const postfix2 = common.crypto.createHash("md5").update(shortEventName).digest('base64')[0];
            const dateIds = common.getDateIds({"time": timeObj});

            const _id = element.a + "_" + eventCollectionName + "_no-segment_" + dateIds.month;
            //Current event
            writeBatcher.add("events_data", _id, {
                "$set": {
                    "m": dateIds.month,
                    "s": "no-segment",
                    "a": element.a + "",
                    "e": shortEventName
                },
                "$inc": tmpEventObj
            }, "countly");

            //Total event
            writeBatcher.add("events_data", element.a + "_all_key_" + dateIds.month + "_" + postfix2, {
                "$set": {
                    "m": dateIds.month,
                    "s": "key",
                    "a": element.a + "",
                    "e": "all"
                },
                "$inc": tmpTotalObj
            }, "countly");

            //Meta document for all events:
            writeBatcher.add("events_data", element.a + "_all_" + "no-segment_" + dateIds.zero + "_" + postfix2, {
                $set: {
                    m: dateIds.zero,
                    s: "no-segment",
                    a: element.a + "",
                    e: "all",
                    ["meta_v2.key." + shortEventName]: true,
                    "meta_v2.segments.key": true

                }
            }, "countly",
            {token: token});
            if (Object.keys(rootUpdate).length > 0) {
                await common.db.collection("events").updateOne({_id: common.db.ObjectID(element.a)}, rootUpdate, {upsert: true});
            }
        }
    },

    /**
     * Process event totals from stream
     * @param token - Stream token
     * @param currEvent - Current event
     * @param writeBatcher - Write batcher instance
     * @returns Resolves when processing is complete
     */
    processEventTotalsFromStream: async function(token: StreamToken, currEvent: StreamEvent, writeBatcher: WriteBatcher): Promise<void> {
        const rootUpdate: Record<string, any> = {};
        let eventColl = await common.readBatcher.getOne("events", common.db.ObjectID(currEvent.a), {"transformation": "event_object"});
        const appData = await common.readBatcher.getOne("apps", common.db.ObjectID(currEvent.a), {timezone: 1, plugins: 1});
        const conff = plugins.getConfig("api", appData.plugins, true);
        //Get timezone offset in hours from timezone name
        const appTimezone = appData.timezone || "UTC";

        const tmpEventObj: Record<string, any> = {};
        const tmpTotalObj: Record<string, any> = {};

        const shortEventName = currEvent.e;
        eventColl = eventColl || {};
        if (!eventColl._list || eventColl._list[shortEventName] !== true) {
            eventColl._list = eventColl._list || {};
            eventColl._list_length = eventColl._list_length || 0;
            if (eventColl._list_length <= conff.event_limit) {
                eventColl._list[shortEventName] = true;
                eventColl._list_length++;
                rootUpdate.$addToSet = {list: shortEventName};
            }
            else {
                return; //do not record this event in aggregated data
            }
        }
        const eventCollectionName = crypto.createHash('sha1').update(shortEventName + currEvent.a).digest('hex');
        //Calculate h based on ts and app timezone
        const momentDate = common.getDate(currEvent.ts, appTimezone);
        const hValue = momentDate.format("YYYY:MM:DD:HH").replaceAll(":0", ":");
        currEvent.h = hValue;
        const date = hValue.split(":");
        const timeObj = {"yearly": date[0], "weekly": 1, "monthly": date[1], "month": date[1], "day": date[2], "hour": date[3]};
        if (currEvent.s && common.isNumber(currEvent.s)) {
            common.fillTimeObjectMonth({"time": timeObj}, tmpEventObj, common.dbMap.sum, currEvent.s);
            common.fillTimeObjectMonth({"time": timeObj}, tmpTotalObj, shortEventName + '.' + common.dbMap.sum, currEvent.s);
        }
        else {
            currEvent.s = 0;
        }
        if (currEvent.dur && common.isNumber(currEvent.dur)) {
            common.fillTimeObjectMonth({"time": timeObj}, tmpEventObj, common.dbMap.dur, currEvent.dur);
            common.fillTimeObjectMonth({"time": timeObj}, tmpTotalObj, shortEventName + '.' + common.dbMap.dur, currEvent.dur);
        }
        else {
            currEvent.dur = 0;
        }
        currEvent.c = currEvent.c || 1;
        if (currEvent.c && common.isNumber(currEvent.c)) {
            currEvent.c = Number.parseInt(currEvent.c as unknown as string, 10);
        }

        common.fillTimeObjectMonth({"time": timeObj}, tmpEventObj, common.dbMap.count, currEvent.c);
        common.fillTimeObjectMonth({"time": timeObj}, tmpTotalObj, shortEventName + '.' + common.dbMap.count, currEvent.c);

        const postfix2 = common.crypto.createHash("md5").update(shortEventName).digest('base64')[0];
        const dateIds = common.getDateIds({"time": timeObj});

        const _id = currEvent.a + "_" + eventCollectionName + "_no-segment_" + dateIds.month;
        //Current event
        writeBatcher.add("events_data", _id, {
            "$set": {
                "m": dateIds.month,
                "s": "no-segment",
                "a": currEvent.a + "",
                "e": shortEventName
            },
            "$inc": tmpEventObj
        }, "countly");

        //Total event
        writeBatcher.add("events_data", currEvent.a + "_all_key_" + dateIds.month + "_" + postfix2, {
            "$set": {
                "m": dateIds.month,
                "s": "key",
                "a": currEvent.a + "",
                "e": "all"
            },
            "$inc": tmpTotalObj
        }, "countly");

        //Meta document for all events:
        writeBatcher.add("events_data", currEvent.a + "_all_" + "no-segment_" + dateIds.zero + "_" + postfix2, {
            $set: {
                m: dateIds.zero,
                s: "no-segment",
                a: currEvent.a + "",
                e: "all",
                ["meta_v2.key." + shortEventName]: true,
                "meta_v2.segments.key": true

            }
        }, "countly",
        {token: token});
        if (Object.keys(rootUpdate).length > 0) {
            await common.db.collection("events").updateOne({_id: common.db.ObjectID(currEvent.a)}, rootUpdate, {upsert: true});
        }


    },

    /**
     * Process individual event from stream
     * @param token - Stream token
     * @param currEvent - Current event
     * @param writeBatcher - Write batcher instance (optional)
     */
    processEventFromStream: function(token: StreamToken, currEvent: StreamEvent, writeBatcher?: WriteBatcher): void {
        writeBatcher = writeBatcher || common.writeBatcher;
        const forbiddenSegValues: string[] = [];
        for (let i = 1; i < 32; i++) {
            forbiddenSegValues.push(i + "");
        }

        //Write event totals for aggregated Data

        common.readBatcher.getOne("apps", common.db.ObjectID(currEvent.a), function(err: Error | null, app: any) {
            if (err || !app) {
                return;
            }
            else {
                common.readBatcher.getOne("events", common.db.ObjectID(currEvent.a), {"transformation": "event_object"}, async function(err2: Error | null, eventColl: any) {
                    const tmpEventObj: Record<string, any> = {};
                    const tmpEventColl: Record<string, any> = {};
                    const tmpTotalObj: Record<string, any> = {};
                    const pluginsGetConfig = plugins.getConfig("api", app.plugins, true);

                    const time = common.initTimeObj(app.timezone, currEvent.ts);
                    const params = {time: time, app_id: currEvent.a, app: app, appTimezone: app.timezone || "UTC"};

                    let shortEventName: string = currEvent.n || '';
                    if (currEvent.e !== "[CLY]_custom") {
                        shortEventName = currEvent.e;
                    }
                    const rootUpdate: Record<string, any> = {};
                    eventColl = eventColl || {};
                    if (!eventColl._list || eventColl._list[shortEventName] !== true) {
                        eventColl._list = eventColl._list || {};
                        eventColl._list_length = eventColl._list_length || 0;
                        if (eventColl._list_length <= 500) {
                            eventColl._list[shortEventName] = true;
                            eventColl._list_length++;
                            rootUpdate.$addToSet = {list: shortEventName};
                        }
                        else {
                            return; //do not record this event in aggregated data
                        }
                    }
                    eventColl._segments = eventColl._segments || {};
                    const eventCollectionName = crypto.createHash('sha1').update(shortEventName + params.app_id).digest('hex');
                    const updates: Array<{id: string, update: Record<string, any>}> = [];

                    if (currEvent.s && common.isNumber(currEvent.s)) {
                        common.fillTimeObjectMonth(params, tmpEventObj, common.dbMap.sum, currEvent.s);
                        common.fillTimeObjectMonth(params, tmpTotalObj, shortEventName + '.' + common.dbMap.sum, currEvent.s);
                    }
                    else {
                        currEvent.s = 0;
                    }

                    if (currEvent.dur && common.isNumber(currEvent.dur)) {
                        common.fillTimeObjectMonth(params, tmpEventObj, common.dbMap.dur, currEvent.dur);
                        common.fillTimeObjectMonth(params, tmpTotalObj, shortEventName + '.' + common.dbMap.dur, currEvent.dur);
                    }
                    else {
                        currEvent.dur = 0;
                    }
                    currEvent.c = currEvent.c || 1;
                    if (currEvent.c && common.isNumber(currEvent.c)) {
                        (currEvent as any).count = Number.parseInt(currEvent.c as unknown as string, 10);
                    }

                    common.fillTimeObjectMonth(params, tmpEventObj, common.dbMap.count, (currEvent as any).count);
                    common.fillTimeObjectMonth(params, tmpTotalObj, shortEventName + '.' + common.dbMap.count, (currEvent as any).count);


                    for (const seg in currEvent.sg) {
                        if (forbiddenSegValues.includes(currEvent.sg[seg] + "")) {
                            continue;
                        }
                        if (eventColl._omitted_segments && eventColl._omitted_segments[shortEventName]) {
                            if (eventColl._omitted_segments[shortEventName][seg]) {
                                continue;
                            }
                        }
                        if (eventColl._whitelisted_segments && eventColl._whitelisted_segments[shortEventName]) {
                            if (!eventColl._whitelisted_segments[shortEventName][seg]) {
                                continue;
                            }
                        }
                        if (Array.isArray(currEvent.sg[seg])) {
                            continue; //Skipping arrays
                        }

                        //Segment is not registred in meta.
                        if (!eventColl._segments[shortEventName] || !eventColl._segments[shortEventName]._list[seg]) {
                            eventColl._segments[shortEventName] = eventColl._segments[shortEventName] || {_list: {}, _list_length: 0};
                            eventColl._segments[shortEventName]._list[seg] = true;
                            rootUpdate.$addToSet = rootUpdate.$addToSet || {};
                            if (rootUpdate.$addToSet["segments." + shortEventName]) {
                                if (rootUpdate.$addToSet["segments." + shortEventName].$each) {
                                    rootUpdate.$addToSet["segments." + shortEventName].$each.push(seg);
                                }
                                else {
                                    rootUpdate.$addToSet["segments." + shortEventName] = {$each: [rootUpdate.$addToSet["segments." + shortEventName], seg]};
                                }
                            }
                            else {
                                rootUpdate.$addToSet["segments." + shortEventName] = seg;
                            }
                        }

                        //load meta for this segment in cacher. Add new value if needed

                        let tmpSegVal = currEvent.sg[seg] + "";
                        tmpSegVal = tmpSegVal.replace(/^\$+/, "").replace(/\./g, ":");
                        tmpSegVal = common.encodeCharacters(tmpSegVal);

                        if (forbiddenSegValues.includes(tmpSegVal)) {
                            tmpSegVal = "[CLY]" + tmpSegVal;
                        }

                        const postfix_seg = common.crypto.createHash("md5").update(tmpSegVal).digest('base64')[0];
                        const meta = await common.readBatcher.getOne("events_meta", {"_id": eventCollectionName + "no-segment_" + common.getDateIds(params).zero + "_" + postfix_seg});

                        if (pluginsGetConfig.event_segmentation_value_limit && meta.meta_v2 &&
                            meta.meta_v2[seg] &&
                            !meta.meta_v2[seg].includes(tmpSegVal) &&
                            meta.meta_v2[seg].length >= pluginsGetConfig.event_segmentation_value_limit) {
                            continue;
                        }

                        if (!meta.meta_v2 || !meta.meta_v2[seg] || !meta.meta_v2[seg].includes(tmpSegVal)) {
                            meta.meta_v2 = meta.meta_v2 || {};
                            meta.meta_v2[seg] = meta.meta_v2[seg] || [];
                            meta.meta_v2[seg].push(tmpSegVal);
                            updates.push({
                                id: currEvent.a + "_" + eventCollectionName + "_no-segment_" + common.getDateIds(params).zero + "_" + postfix_seg,
                                update: {"$set": {["meta_v2." + seg + "." + tmpSegVal]: true, ["meta_v2.segments." + seg]: true, "s": "no-segment", "e": shortEventName, "m": common.getDateIds(params).zero, "a": params.app_id + ""}}
                            });
                        }
                        //record data
                        const tmpObj: Record<string, any> = {};

                        if (currEvent.s) {
                            common.fillTimeObjectMonth(params, tmpObj, tmpSegVal + '.' + common.dbMap.sum, currEvent.s);
                        }

                        if (currEvent.dur) {
                            common.fillTimeObjectMonth(params, tmpEventObj, tmpSegVal + '.' + common.dbMap.dur, currEvent.dur);
                        }

                        common.fillTimeObjectMonth(params, tmpObj, tmpSegVal + '.' + common.dbMap.count, currEvent.c);
                        updates.push({
                            id: currEvent.a + "_" + eventCollectionName + "_" + seg + "_" + common.getDateIds(params).month + "_" + postfix_seg,
                            update: {$inc: tmpObj, $set: {"s": seg, "e": shortEventName, m: common.getDateIds(params).month, a: params.app_id + ""}}
                        });
                    }

                    const dateIds = common.getDateIds(params);
                    const postfix2 = common.crypto.createHash("md5").update(shortEventName).digest('base64')[0];

                    tmpEventColl["no-segment" + "." + dateIds.month] = tmpEventObj;

                    for (const update of updates) {
                        writeBatcher!.add("events_data", update.id, update.update, "countly", {token: token});
                    }
                    //ID is - appID_hash_no-segment_month

                    const _id = currEvent.a + "_" + eventCollectionName + "_no-segment_" + dateIds.month;
                    //Current event
                    writeBatcher!.add("events_data", _id, {
                        "$set": {
                            "m": dateIds.month,
                            "s": "no-segment",
                            "a": params.app_id + "",
                            "e": shortEventName
                        },
                        "$inc": tmpEventObj
                    }, "countly",
                    {token: token});

                    //Total event
                    writeBatcher!.add("events_data", currEvent.a + "_all_key_" + dateIds.month + "_" + postfix2, {
                        "$set": {
                            "m": dateIds.month,
                            "s": "key",
                            "a": params.app_id + "",
                            "e": "all"
                        },
                        "$inc": tmpTotalObj
                    }, "countly",
                    {token: token});

                    //Meta document for all events:
                    writeBatcher!.add("events_data", params.app_id + "_all_" + "no-segment_" + dateIds.zero + "_" + postfix2, {
                        $set: {
                            m: dateIds.zero,
                            s: "no-segment",
                            a: params.app_id + "",
                            e: "all",
                            ["meta_v2.key." + shortEventName]: true,
                            "meta_v2.segments.key": true

                        }
                    }, "countly",
                    {token: token});
                    //Total event meta data

                    if (Object.keys(rootUpdate).length > 0) {
                        common.db.collection("events").updateOne({_id: common.db.ObjectID(currEvent.a)}, rootUpdate, {upsert: true});
                    }

                });
            }
        });
    },

    /**
     * Process session metrics from stream
     * @param currEvent - Current session event
     * @param uniqueLevelsZero - Unique levels for zero document
     * @param uniqueLevelsMonth - Unique levels for month document
     * @param params - Aggregator parameters
     */
    processSessionMetricsFromStream: function(currEvent: StreamEvent, uniqueLevelsZero: string[], uniqueLevelsMonth: string[], params: AggregatorParams): void {
        /**
         * @param id - document id
         * @param callback  - calback function
         */
        function fetchMeta(id: string, callback: (err: Error | null, result: any) => void): void {
            common.readBatcher.getOne(metaToFetch[id].coll, {'_id': metaToFetch[id].id}, {meta_v2: 1}, (err: Error | null, metaDoc: any) => {
                const retObj = metaDoc || {};
                retObj.coll = metaToFetch[id].coll;
                callback(null, retObj);
            });
        }

        let isNewUser = true;
        const userProps: UserProperties = {};
        if (currEvent.sg && currEvent.sg.prev_session) {
            isNewUser = false;
            //Not a new user

        }
        /**
         * Gets metric value from drill document based on metric rules
         * @param metricRules  - object drscribing metric rules
         * @param doc  - drill docment
         * @returns - metric value
         */
        function getMetricValue(metricRules: MetricDefinition, doc: StreamEvent): string | number | undefined {
            if (metricRules.getMetricValue) {
                return metricRules.getMetricValue(doc);
            }
            else {
                return doc.up?.[metricRules.short_code] as string | number | undefined;
            }
        }
        //We can't do metric changes unless we fetch previous session doc.
        const predefinedMetrics = usage.getPredefinedMetrics(params, userProps);

        const dateIds = common.getDateIds(params);
        const metaToFetch: Record<string, {coll: string, id: string}> = {};

        if ((plugins.getConfig("api", params.app && params.app.plugins, true).metric_limit || 1000) > 0) {
            let postfix: string | null;
            for (const predefinedMetric of predefinedMetrics) {
                for (let j = 0; j < predefinedMetric.metrics.length; j++) {
                    const tmpMetric = predefinedMetric.metrics[j];
                    let recvMetricValue = getMetricValue(tmpMetric, currEvent);
                    postfix = null;

                    // We check if country data logging is on and user's country is the configured country of the app
                    if (tmpMetric.name === "country" && (plugins.getConfig("api", params.app && params.app.plugins, true).country_data === false)) {
                        continue;
                    }
                    // We check if city data logging is on and user's country is the configured country of the app
                    if (tmpMetric.name === "city" && (plugins.getConfig("api", params.app && params.app.plugins, true).city_data === false)) {
                        continue;
                    }

                    if (recvMetricValue) {
                        recvMetricValue = (recvMetricValue + "").replace(/^\$/, "").replace(/\./g, ":");
                        postfix = common.crypto.createHash("md5").update(recvMetricValue).digest('base64')[0];
                        metaToFetch[predefinedMetric.db + params.app_id + "_" + dateIds.zero + "_" + postfix] = {
                            coll: predefinedMetric.db,
                            id: params.app_id + "_" + dateIds.zero + "_" + postfix
                        };
                    }
                }
            }

            const metas: Record<string, any> = {};
            async.map(Object.keys(metaToFetch), fetchMeta, function(err: Error | null, metaDocs: any[]) {
                for (const metaDoc of metaDocs) {
                    if (metaDoc.coll && metaDoc.meta_v2) {
                        metas[metaDoc._id] = metaDoc.meta_v2;
                    }
                }

                for (const predefinedMetric of predefinedMetrics) {
                    for (let j = 0; j < predefinedMetric.metrics.length; j++) {
                        const tmpTimeObjZero: Record<string, any> = {},
                            tmpTimeObjMonth: Record<string, any> = {},
                            tmpSet: Record<string, any> = {},
                            zeroObjUpdate: string[] = [],
                            monthObjUpdate: string[] = [],
                            tmpMetric = predefinedMetric.metrics[j];
                        let recvMetricValue: string | number | undefined = "",
                            needsUpdate = false,
                            escapedMetricVal = "";

                        postfix = "";

                        recvMetricValue = getMetricValue(tmpMetric, currEvent);

                        // We check if country data logging is on and user's country is the configured country of the app
                        if (tmpMetric.name === "country" && (plugins.getConfig("api", params.app && params.app.plugins, true).country_data === false)) {
                            continue;
                        }
                        // We check if city data logging is on and user's country is the configured country of the app
                        if (tmpMetric.name === "city" && (plugins.getConfig("api", params.app && params.app.plugins, true).city_data === false)) {
                            continue;
                        }

                        if (recvMetricValue) {
                            escapedMetricVal = (recvMetricValue + "").replace(/^\$/, "").replace(/\./g, ":");
                            postfix = common.crypto.createHash("md5").update(escapedMetricVal).digest('base64')[0];

                            const tmpZeroId = params.app_id + "_" + dateIds.zero + "_" + postfix;
                            let ignore = false;
                            if (metas[tmpZeroId] &&
                                            metas[tmpZeroId][tmpMetric.set] &&
                                            Object.keys(metas[tmpZeroId][tmpMetric.set]).length > 0 &&
                                            Object.keys(metas[tmpZeroId][tmpMetric.set]).length >= plugins.getConfig("api", params.app && params.app.plugins, true).metric_limit &&
                                            metas[tmpZeroId][tmpMetric.set][escapedMetricVal] === undefined) {
                                ignore = true;
                            }

                            //should metric be ignored for reaching the limit
                            if (!ignore) {
                                //making sure metrics are strings
                                needsUpdate = true;
                                tmpSet["meta_v2." + tmpMetric.set + "." + escapedMetricVal] = true;

                                monthObjUpdate.push(escapedMetricVal + '.' + common.dbMap.total);

                                if (isNewUser) {
                                    zeroObjUpdate.push(escapedMetricVal + '.' + common.dbMap.unique);
                                    monthObjUpdate.push(escapedMetricVal + '.' + common.dbMap.new);
                                    monthObjUpdate.push(escapedMetricVal + '.' + common.dbMap.unique);
                                }
                                else {
                                    for (const element of uniqueLevelsZero) {
                                        if (element === "Y") {
                                            tmpTimeObjZero['d.' + escapedMetricVal + '.' + common.dbMap.unique] = 1;
                                        }
                                        else {
                                            tmpTimeObjZero['d.' + element + '.' + escapedMetricVal + '.' + common.dbMap.unique] = 1;
                                        }
                                    }

                                    for (const element of uniqueLevelsMonth) {
                                        tmpTimeObjMonth['d.' + element + '.' + escapedMetricVal + '.' + common.dbMap.unique] = 1;
                                    }
                                }
                            }

                            common.fillTimeObjectZero(params, tmpTimeObjZero, zeroObjUpdate);
                            common.fillTimeObjectMonth(params, tmpTimeObjMonth, monthObjUpdate);

                            if (needsUpdate) {
                                tmpSet.m = dateIds.zero;
                                tmpSet.a = params.app_id + "";
                                const tmpMonthId = params.app_id + "_" + dateIds.month + "_" + postfix,
                                    updateObjZero: Record<string, any> = {$set: tmpSet};

                                if (Object.keys(tmpTimeObjZero).length > 0) {
                                    updateObjZero.$inc = tmpTimeObjZero;
                                }

                                if (Object.keys(tmpTimeObjZero).length > 0 || Object.keys(tmpSet).length > 0) {
                                    common.writeBatcher.add(predefinedMetric.db, tmpZeroId, updateObjZero);
                                }

                                common.writeBatcher.add(predefinedMetric.db, tmpMonthId, {
                                    $set: {
                                        m: dateIds.month,
                                        a: params.app_id + ""
                                    },
                                    '$inc': tmpTimeObjMonth
                                });
                            }
                        }
                    }
                }
            });
        }
    },

    /**
     * Get predefined metrics for user
     * @param params - Aggregator parameters
     * @param userProps - User properties object
     * @returns Array of predefined metrics groups
     */
    getPredefinedMetrics: function(params: AggregatorParams, userProps: UserProperties): PredefinedMetricsGroup[] {
        const predefinedMetrics: PredefinedMetricsGroup[] = [
            {
                db: "carriers",
                metrics: [{
                    name: "_carrier",
                    set: "carriers",
                    short_code: common.dbUserMap.carrier
                }]
            },
            {
                db: "devices",
                metrics: [
                    {
                        name: "_device",
                        set: "devices",
                        short_code: common.dbUserMap.device
                    },
                    {
                        name: "_manufacturer",
                        set: "manufacturers",
                        short_code: common.dbUserMap.manufacturer
                    }
                ]
            },
            {
                db: "device_details",
                metrics: [
                    {
                        name: "_app_version",
                        set: "app_versions",
                        short_code: common.dbUserMap.app_version
                    },
                    {
                        name: "_os",
                        set: "os",
                        short_code: common.dbUserMap.platform
                    },
                    {
                        name: "_device_type",
                        set: "device_type",
                        short_code: common.dbUserMap.device_type
                    },
                    {
                        name: "_os_version",
                        set: "os_versions",
                        short_code: common.dbUserMap.platform_version
                    },
                    {
                        name: "_resolution",
                        set: "resolutions",
                        short_code: common.dbUserMap.resolution
                    },
                    {
                        name: "_has_hinge",
                        set: "has_hinge",
                        short_code: common.dbUserMap.has_hinge
                    }
                ]
            },
            {
                db: "cities",
                metrics: [{
                    is_user_prop: true,
                    name: "city",
                    set: "cities",
                    short_code: common.dbUserMap.city
                }]
            }
        ];
        const isNewUser = (params.app_user && params.app_user[common.dbUserMap.first_seen]) ? false : true;
        plugins.dispatch("/session/metrics", {
            params: params,
            predefinedMetrics: predefinedMetrics,
            userProps: userProps,
            user: params.app_user,
            isNewUser: isNewUser
        });

        return predefinedMetrics;
    }
};

export default usage;
