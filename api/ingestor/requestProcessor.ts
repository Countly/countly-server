/**
 * Request processor for ingestor - handles SDK request processing
 * @module api/ingestor/requestProcessor
 */

import type { IngestorParams, UsageObservable } from './usage.ts';
import type { IncomingMessage, ServerResponse } from 'http';
import { createRequire } from 'module';

import usage from './usage.js';
import common from '../utils/common.js';
import url from 'url';
import logModule from '../utils/log.js';
import crypto from 'crypto';
import { ignorePossibleDevices, checksumSaltVerification, validateRedirect } from '../utils/requestProcessorCommon.js';
import { ObjectId } from "mongodb";
import { preset } from '../lib/countly.preset.js';

// createRequire needed for CJS modules without ES exports
// @ts-expect-error TS1470 - import.meta is valid at runtime (Node 22 treats .ts with imports as ESM)
const require = createRequire(import.meta.url);
const plugins = require("../../plugins/pluginManager.js");
const UnifiedEventSink = require('../eventSink/UnifiedEventSink.js');

const log = logModule('core:ingestor');

const countlyApi = {
    mgmt: {
        appUsers: require('../parts/mgmt/app_users.js'),
    }
};

const eventsWithDefaultPlatformSegment = new Set(["[CLY]_view", "[CLY]_action", "[CLY]_nps", "[CLY]_survey"]);
const escapedViewSegments: Record<string, boolean> = {
    "name": true,
    "segment": true,
    "height": true,
    "width": true,
    "y": true,
    "x": true,
    "visit": true,
    "uvc": true,
    "start": true,
    "bounce": true,
    "exit": true,
    "type": true,
    "view": true,
    "domain": true,
    "dur": true,
    "_id": true,
    "_idv": true,
    "utm_source": true,
    "utm_medium": true,
    "utm_campaign": true,
    "utm_term": true,
    "utm_content": true,
    "referrer": true
};

/**
 * Event sink instance
 */
interface EventSinkInstance {
    write(events: DrillBulkOperation[]): Promise<EventSinkResult>;
}

/**
 * Event sink write result
 */
interface EventSinkResult {
    overall: {
        success: boolean;
        written?: number;
        error?: string;
    };
}

// Initialize unified event sink
let eventSink: EventSinkInstance | null = null;
try {
    eventSink = new UnifiedEventSink();
    log.i('UnifiedEventSink initialized for ingestor');
}
catch (error) {
    log.e('Failed to initialize UnifiedEventSink for ingestor:', error);
    throw error;
}

let loaded_configs_time = 0;

/**
 * App document from database
 */
interface AppDocument {
    /** App ID */
    _id?: string;
    /** App key */
    key?: string;
    /** App name */
    name?: string;
    /** App timezone */
    timezone?: string;
    /** App country */
    country?: string;
    /** Plugin configs */
    plugins?: Record<string, unknown>;
    /** Is app paused */
    paused?: boolean;
    /** Is app locked */
    locked?: boolean;
    /** Last data timestamp */
    last_data?: number;
    /** Overridden types */
    ovveridden_types?: {
        prop?: Record<string, unknown>;
        events?: Record<string, Record<string, string>>;
    };
}

/**
 * App user document
 */
interface AppUserDocument {
    /** Document ID */
    _id?: string;
    /** User ID */
    uid?: string;
    /** Device ID */
    did?: string;
    /** Last request hash */
    last_req?: string;
    /** Last session ID */
    lsid?: string;
    /** Last session params */
    lsparams?: Record<string, unknown>;
    /** Last seen */
    ls?: number;
    /** First access */
    fac?: number;
    /** Last access */
    lac?: number;
    /** First seen */
    fs?: number;
    /** Session duration */
    sd?: number;
    /** View count */
    vc?: number;
    /** Session count */
    sc?: number;
    /** Total session duration */
    tsd?: number;
    /** Custom properties */
    custom?: Record<string, unknown>;
    /** Campaign data */
    cmp?: Record<string, unknown>;
    /** Consent data */
    consent?: Record<string, unknown>;
    /** SDK info */
    sdk?: {
        name?: string;
        version?: string;
    };
    /** App version */
    av?: string;
    /** Platform */
    p?: string;
    /** Last view */
    last_view?: {
        name?: string;
        segments?: Record<string, unknown>;
        duration?: number;
        ts?: number;
        _idv?: string;
    };
    /** Last view ID */
    lvid?: string;
    /** Had fatal crash */
    hadFatalCrash?: boolean | number;
    /** Had any fatal crash */
    hadAnyFatalCrash?: number;
    /** Had non-fatal crash */
    hadNonfatalCrash?: boolean | number;
    /** Had any non-fatal crash */
    hadAnyNonfatalCrash?: number;
    /** Location */
    loc?: {
        gps: boolean;
        geo: {
            type: 'Point';
            coordinates: [number, number];
        };
        date: number;
    };
    /** Dynamic properties */
    [key: string]: unknown;
}

/**
 * Request event structure
 */
interface RequestEvent {
    /** Event key */
    key: string;
    /** Event name */
    name?: string;
    /** Segmentation */
    segmentation?: Record<string, unknown>;
    /** Count */
    count?: number;
    /** Sum */
    sum?: number;
    /** Duration */
    dur?: number;
    /** Timestamp */
    timestamp?: number;
    /** Hour */
    hour?: number;
    /** Day of week */
    dow?: number;
    /** Current view ID */
    cvid?: string;
    /** Previous view ID */
    pvid?: string;
    /** Event ID */
    id?: string;
    /** Parent event ID */
    peid?: string;
    /** Last session ID */
    lsid?: string;
    /** Extra user properties */
    up_extra?: Record<string, unknown>;
    /** Custom event flag */
    ce?: boolean;
    /** System event flag */
    _system_event?: boolean;
    /** ID value */
    _id?: string;
}

/**
 * Drill event object for database
 */
interface DrillEventObject {
    /** App ID */
    a: string;
    /** Event type */
    e: string;
    /** Creation date */
    cd: Date;
    /** Timestamp */
    ts: number;
    /** User ID */
    uid: string;
    /** User document ID */
    _uid: string;
    /** Device ID */
    did: string;
    /** Event name */
    n?: string;
    /** User ID field */
    [key: string]: unknown;
    /** Last session ID */
    lsid?: string;
    /** Sum */
    s?: number;
    /** Duration */
    dur?: number;
    /** Count */
    c?: number;
    /** Document ID */
    _id?: string;
    /** Current view ID */
    cvid?: string;
    /** Previous view ID */
    pvid?: string;
    /** Event ID */
    id?: string;
    /** Parent event ID */
    peid?: string;
    /** Extra user properties */
    up_extra?: Record<string, unknown>;
    /** After consent state */
    after?: Record<string, unknown>;
}

/**
 * Bulk write operation for drill
 */
interface DrillBulkOperation {
    insertOne?: {
        document: DrillEventObject;
    };
    updateOne?: {
        filter: Record<string, unknown>;
        update: Record<string, unknown>;
        upsert?: boolean;
    };
}

/**
 * View update structure
 */
interface ViewUpdate {
    /** Last view ID */
    lvid: string;
    /** Timestamp */
    ts: number;
    /** App ID */
    a: string;
    /** Segmentation */
    sg?: Record<string, unknown>;
}

/**
 * User properties result from fillUserProperties
 */
interface UserPropertiesResult {
    /** User properties */
    up: Record<string, unknown>;
    /** Custom properties */
    upCustom: Record<string, unknown>;
    /** Campaign properties */
    upCampaign: Record<string, unknown>;
}

/**
 * Meta document for type overrides
 */
interface MetaDocument {
    /** User property types */
    up?: Record<string, string>;
    /** Custom property types */
    custom?: Record<string, string>;
    /** Campaign property types */
    cmp?: Record<string, string>;
}

/**
 * Request parameters for ingestor
 */
interface RequestParams {
    /** Request object */
    req: IncomingMessage & {
        body?: string | Record<string, unknown>;
        method?: string;
        headers?: Record<string, string>;
        socket?: Record<string, unknown>;
        connection?: Record<string, unknown>;
    };
    /** Response object */
    res: ServerResponse & {
        finished?: boolean;
    };
    /** Query string parameters */
    qstring: Record<string, unknown> & {
        app_key?: string;
        device_id?: string;
        old_device_id?: string;
        app_id?: string;
        user_id?: string;
        events?: RequestEvent[];
        metrics?: Record<string, unknown>;
        requests?: unknown[];
        timestamp?: number;
        hour?: number;
        dow?: number;
        populator?: boolean;
        location?: string;
        country_code?: string;
        city?: string;
        region?: string;
        tz?: string;
        begin_session?: boolean;
        end_session?: boolean;
        session_duration?: number;
        ignore_cooldown?: boolean;
    };
    /** Href */
    href?: string;
    /** URL parts */
    urlParts?: ReturnType<typeof url.parse>;
    /** Path segments */
    paths?: string[];
    /** API path */
    apiPath?: string;
    /** Full path */
    fullPath?: string;
    /** App ID */
    app_id?: string;
    /** App country code */
    app_cc?: string;
    /** App name */
    app_name?: string;
    /** App timezone */
    appTimezone?: string;
    /** App document */
    app?: AppDocument;
    /** App user ID (hashed) */
    app_user_id?: string;
    /** App user document */
    app_user?: AppUserDocument;
    /** Time object */
    time?: {
        mstimestamp?: number;
        timestamp?: number;
    };
    /** IP address */
    ip_address?: string;
    /** User info */
    user?: {
        country?: string;
        city?: string;
        tz?: number;
    };
    /** Collected metrics */
    collectedMetrics?: Record<string, unknown>;
    /** Request hash */
    request_hash?: string;
    /** Request ID */
    request_id?: string;
    /** Timestamp for timing */
    tt?: number;
    /** Cancel request flag */
    cancelRequest?: string;
    /** Wait for response flag */
    waitForResponse?: boolean;
    /** Populator flag */
    populator?: boolean;
    /** Bulk request flag */
    bulk?: boolean;
    /** Block responses flag */
    blockResponses?: boolean;
    /** Promises array */
    promises?: Promise<unknown>[];
    /** Previous session */
    previous_session?: string;
    /** Previous session start */
    previous_session_start?: number;
    /** OS processed flag */
    is_os_processed?: boolean;
    /** Session duration */
    session_duration?: number;
}

/**
 * Observable for request processing
 */
interface RequestObservable {
    /** Request params */
    params: RequestParams;
    /** App document */
    app?: AppDocument;
    /** Updates array */
    updates: Record<string, unknown>[];
    /** Drill updates */
    drill_updates: DrillBulkOperation[];
}

/**
 * Reload configuration from database
 */
const reloadConfig = function(): Promise<void> {
    return new Promise(function(resolve) {
        const my_time = Date.now();
        const reload_configs_after = common.config.reloadConfigAfter || 10000;
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
 * Process user - handle device ID merge or user creation
 * @param params - request parameters
 * @param done - callback function
 */
function processUser(params: RequestParams, done: (err?: string) => void): void {
    if (params && params.qstring && params.qstring.old_device_id && params.qstring.old_device_id !== params.qstring.device_id) {
        const old_id = common.crypto.createHash('sha1')
            .update(params.qstring.app_key + params.qstring.old_device_id + "")
            .digest('hex');

        countlyApi.mgmt.appUsers.merge(params.app_id, params.app_user, params.app_user_id, old_id, params.qstring.device_id, params.qstring.old_device_id, function(err0: Error | null, userdoc: AppUserDocument | null) {
            params.qstring.old_device_id = undefined;
            if (err0) {
                log.e(err0);
                done('Cannot update user');
            }
            else if (userdoc) {
                if (!userdoc.uid) {
                    countlyApi.mgmt.appUsers.createUserDocument(params, function(err: Error | null, userDoc2: AppUserDocument | null) {
                        if (err) {
                            log.e(err);
                            done('Cannot update user');
                        }
                        else if (!userDoc2) {
                            done('Cannot update user');
                        }
                        else {
                            params.app_user = userDoc2;
                            done();
                        }
                    });
                }
                else {
                    params.app_user = userdoc;
                    done();
                }
            }
            else {
                done('User merged. Failed to record data.');
            }
        });
    }
    else if (params && params.app_user && !params.app_user.uid) {
        countlyApi.mgmt.appUsers.createUserDocument(params, function(err: Error | null, userDoc2: AppUserDocument | null) {
            if (err) {
                done(err.message || 'User creation failed');
            }
            else if (userDoc2) {
                params.app_user = userDoc2;
                done();
            }
            else {
                done("User creation failed");
            }
        });
    }
    else {
        done();
    }
}

/**
 * Fills user properties from dbAppUser object
 * @param dbAppUser - app user object
 * @param meta_doc - meta document
 * @returns user properties, custom, and campaign data
 */
function fillUserProperties(dbAppUser: AppUserDocument | null | undefined, meta_doc?: MetaDocument): UserPropertiesResult {
    const userProperties: Record<string, unknown> = {};
    const userCustom: Record<string, unknown> = {};
    const userCampaign: Record<string, unknown> = {};
    let setType = "";

    if (!dbAppUser) {
        return { up: userProperties, upCustom: userCustom, upCampaign: userCampaign };
    }
    const countlyUP = preset.up;
    for (const i in countlyUP) {
        const shortRep = common.dbUserMap[countlyUP[i].name] || countlyUP[i].name;

        if (shortRep === "fs") {
            (dbAppUser as any).fs = (dbAppUser.fac) ? dbAppUser.fac : dbAppUser.fs;
        }
        else if (shortRep === "ls") {
            (dbAppUser as any).ls = (dbAppUser.lac) ? dbAppUser.lac : dbAppUser.ls;
        }
        else if (shortRep === "sdk_name") {
            (dbAppUser as any).sdk_name = dbAppUser?.sdk?.name;
        }
        else if (shortRep === "sdk_version") {
            (dbAppUser as any).sdk_version = dbAppUser?.sdk?.version;
        }

        if (dbAppUser[shortRep] !== undefined) {
            setType = countlyUP[i].type || "";
            if (meta_doc && meta_doc.up && meta_doc.up[i]) {
                setType = meta_doc.up[i];
            }
            userProperties[i] = dbAppUser[shortRep];
            if (setType === 's') {
                userProperties[i] = userProperties[i] + "";
            }
            else if (setType === 'n' && common.isNumber(userProperties[i])) {
                userProperties[i] = Number.parseFloat(userProperties[i] as string);
            }
        }
    }
    if (dbAppUser.custom) {
        let key;
        for (const i in dbAppUser.custom) {
            key = common.fixEventKey(i);

            if (!key) {
                continue;
            }
            setType = "";
            if (meta_doc && meta_doc.custom && meta_doc.custom[key]) {
                setType = meta_doc.custom[key];
            }
            let tmpVal;

            if (Array.isArray((dbAppUser.custom as any)[i])) {
                for (let z = 0; z < (dbAppUser.custom as any)[i].length; z++) {
                    (dbAppUser.custom as any)[i][z] = (dbAppUser.custom as any)[i][z] + "";
                }
                tmpVal = (dbAppUser.custom as any)[i];
            }
            else if (setType === "s") {
                tmpVal = (dbAppUser.custom as any)[i] + "";
            }
            else if (setType === "n" && common.isNumber((dbAppUser.custom as any)[i])) {
                if ((dbAppUser.custom as any)[i].length > 0 && (dbAppUser.custom as any)[i].length <= 16) {
                    tmpVal = Number.parseFloat((dbAppUser.custom as any)[i]);
                }
                else {
                    tmpVal = (dbAppUser.custom as any)[i];
                }
            }
            else {
                tmpVal = (dbAppUser.custom as any)[i];
            }

            userCustom[key] = tmpVal;
        }
    }

    // add referral campaign data if any (legacy campaign data)
    if (dbAppUser.cmp) {
        let key;
        for (const i in dbAppUser.cmp) {
            key = common.fixEventKey(i);

            if (!key || key === "_id" || key === "did" || key === "bv" || key === "ip" || key === "os" || key === "r" || key === "cty" || key === "last_click") {
                continue;
            }

            setType = "";
            if (meta_doc && meta_doc.cmp && meta_doc.cmp[key]) {
                setType = meta_doc.cmp[key];
            }

            let tmpVal;
            if (setType && setType === 's') {
                tmpVal = (dbAppUser.cmp as any)[i] + "";
            }
            else if (common.isNumber((dbAppUser.cmp as any)[i])) {
                if ((dbAppUser.cmp as any)[i].length > 0 && (dbAppUser.cmp as any)[i].length <= 16) {
                    tmpVal = Number.parseFloat((dbAppUser.cmp as any)[i]);
                }
                else {
                    tmpVal = (dbAppUser.cmp as any)[i];
                }
            }
            else if (Array.isArray((dbAppUser.cmp as any)[i])) {
                tmpVal = (dbAppUser.cmp as any)[i];
            }
            else {
                tmpVal = (dbAppUser.cmp as any)[i];
            }

            userCampaign[key] = tmpVal;
        }
    }
    else {
        userCampaign.c = "Organic";
    }

    return {
        up: userProperties,
        upCustom: userCustom,
        upCampaign: userCampaign
    };
}

/**
 * Process events to drill database
 * @param params - request parameters
 * @param drill_updates - additional drill updates
 * @param callback - callback function
 */
const processToDrill = async function(params: RequestParams, drill_updates: DrillBulkOperation[], callback: (error?: Error | null) => void): Promise<void> {
    const events = params.qstring?.events || [];
    if (!Array.isArray(events)) {
        log.w("invalid events passed for recording" + JSON.stringify(events));
        callback();
        return;
    }
    const dbAppUser = params.app_user;

    const eventsToInsert: DrillBulkOperation[] = [];
    const timestamps: Record<number, boolean> = {};
    const viewUpdate: Record<string, ViewUpdate> = {};

    if (events.length > 0) {
        for (const [i, currEvent] of events.entries()) {
            if (!currEvent.key) {
                continue;
            }
            if (!currEvent.key || (currEvent.key.indexOf('[CLY]_') === 0 && !plugins.internalDrillEvents.includes(currEvent.key))) {
                continue;
            }

            if (currEvent.key === "[CLY]_view" && !(currEvent.segmentation && (currEvent.segmentation as any).visit)) {
                currEvent.key = "[CLY]_view_update";
            }

            const dbEventObject: DrillEventObject = {
                "a": params.app_id + "",
                "e": currEvent.key,
                "cd": new Date(),
                "ts": currEvent.timestamp || Date.now().valueOf(),
                "uid": params.app_user!.uid!,
                "_uid": params.app_user!._id!,
                "did": params.app_user!.did!
            };

            if (currEvent.key.indexOf('[CLY]_') === 0) {
                dbEventObject.n = currEvent.key;
            }
            else {
                dbEventObject.n = currEvent.key;
                dbEventObject.e = "[CLY]_custom";
            }
            if (currEvent.name) {
                dbEventObject.n = currEvent.name;
            }

            if (dbAppUser && dbAppUser[common.dbUserMap.user_id]) {
                dbEventObject[common.dbUserMap.user_id] = dbAppUser[common.dbUserMap.user_id];
            }
            const upWithMeta = fillUserProperties(dbAppUser, params.app?.ovveridden_types?.prop as MetaDocument | undefined);
            dbEventObject[common.dbUserMap.device_id] = params.qstring?.device_id;
            dbEventObject.lsid = currEvent.lsid || dbAppUser?.lsid;
            dbEventObject[common.dbEventMap.user_properties] = upWithMeta.up;
            dbEventObject.custom = upWithMeta.upCustom;
            dbEventObject.cmp = upWithMeta.upCampaign;

            let eventKey = currEvent.key;
            // Setting params depending on event
            if (eventKey === "[CLY]_session") {
                dbEventObject._id = params.request_id;
            }
            else {
                dbEventObject._id = params.request_hash + "_" + params.app_user!.uid + "_" + Date.now().valueOf() + "_" + i;
            }
            eventKey = currEvent.key;

            if ('up_extra' in currEvent) {
                dbEventObject.up_extra = currEvent.up_extra;
            }

            let time = params.time;
            if (currEvent.timestamp) {
                time = common.initTimeObj(params.appTimezone, currEvent.timestamp);
            }
            if (currEvent.cvid) {
                dbEventObject.cvid = currEvent.cvid;
            }

            if (currEvent.pvid) {
                dbEventObject.pvid = currEvent.pvid;
            }

            if (currEvent.id) {
                dbEventObject.id = currEvent.id;
            }

            if (currEvent.peid) {
                dbEventObject.peid = currEvent.peid;
            }

            if (eventsWithDefaultPlatformSegment.has(eventKey)) {
                if (upWithMeta.up && upWithMeta.up.p && !(currEvent.segmentation && (currEvent.segmentation as any).platform)) {
                    currEvent.segmentation = currEvent.segmentation || {};
                    (currEvent.segmentation as any).platform = upWithMeta.up.p;
                }
            }
            if (eventKey === "[CLY]_view" && currEvent && currEvent.segmentation && (currEvent.segmentation as any)._idv) {
                dbEventObject._id = params.app_id + "_" + dbAppUser!.uid + "_" + (currEvent.segmentation as any)._idv;
                if (!currEvent.id) {
                    currEvent.id = (currEvent.segmentation as any)._idv;
                }
            }
            if (eventKey === "[CLY]_consent") {
                dbEventObject.after = dbAppUser?.consent;
            }

            dbEventObject[common.dbEventMap.timestamp] = time?.mstimestamp;

            while (timestamps[dbEventObject[common.dbEventMap.timestamp] as number]) {
                (dbEventObject[common.dbEventMap.timestamp] as number) += 1;
            }
            timestamps[dbEventObject[common.dbEventMap.timestamp] as number] = true;

            currEvent.hour = (currEvent.hour !== undefined) ? currEvent.hour : params.qstring?.hour;
            if (currEvent.hour !== undefined) {
                currEvent.hour = Number.parseInt(currEvent.hour as unknown as string);
                if (currEvent.hour === 24) {
                    currEvent.hour = 0;
                }
                if (currEvent.hour! >= 0 && currEvent.hour! < 24) {
                    (upWithMeta.up as any).hour = currEvent.hour;
                }
            }

            currEvent.dow = (currEvent.dow !== undefined) ? currEvent.dow : params.qstring?.dow;
            if (currEvent.dow !== undefined) {
                currEvent.dow = Number.parseInt(currEvent.dow as unknown as string);
                if (currEvent.dow === 0) {
                    currEvent.dow = 7;
                }
                if (currEvent.dow! > 0 && currEvent.dow! <= 7) {
                    (upWithMeta.up as any).dow = currEvent.dow;
                }
            }

            if (currEvent.segmentation) {
                let tmpSegVal;
                const meta_doc = params.app?.ovveridden_types?.events;
                for (const segKey in currEvent.segmentation) {
                    const segKeyAsFieldName = segKey.replace(/^\$|\./g, "");

                    if (segKey === "" || segKeyAsFieldName === "" || (currEvent.segmentation as any)[segKey] === null || (currEvent.segmentation as any)[segKey] === undefined) {
                        continue;
                    }
                    let setType = "";
                    if (meta_doc && meta_doc[eventKey] && meta_doc[eventKey][segKey]) {
                        setType = meta_doc[eventKey][segKey];
                    }

                    if (Array.isArray((currEvent.segmentation as any)[segKey])) {
                        const pluginsGetConfig = plugins.getConfig("api", params.app && params.app.plugins, true);
                        (currEvent.segmentation as any)[segKey] = (currEvent.segmentation as any)[segKey].splice(0, (pluginsGetConfig.array_list_limit || 10));
                        for (let z = 0; z < (currEvent.segmentation as any)[segKey].length; z++) {
                            (currEvent.segmentation as any)[segKey][z] = (currEvent.segmentation as any)[segKey][z] + "";
                            (currEvent.segmentation as any)[segKey][z] = common.encodeCharacters((currEvent.segmentation as any)[segKey][z]);
                        }
                    }
                    if (setType) {
                        if (setType === "s" || setType === "l" || setType === "bl" || setType === "a") {
                            tmpSegVal = (currEvent.segmentation as any)[segKey] + "";
                            tmpSegVal = common.encodeCharacters(tmpSegVal);
                        }
                        else if (setType === "n") {
                            if (common.isNumber((currEvent.segmentation as any)[segKey])) {
                                tmpSegVal = Number.parseFloat((currEvent.segmentation as any)[segKey]);
                            }
                            else {
                                tmpSegVal = (currEvent.segmentation as any)[segKey];
                            }
                        }
                    }
                    else {
                        if (typeof (currEvent.segmentation as any)[segKey] === "string") {
                            tmpSegVal = common.encodeCharacters((currEvent.segmentation as any)[segKey] + "");
                        }
                        else {
                            tmpSegVal = (currEvent.segmentation as any)[segKey];
                        }
                    }
                    dbEventObject[common.dbEventMap.segmentations] = dbEventObject[common.dbEventMap.segmentations] || {};
                    (dbEventObject[common.dbEventMap.segmentations] as Record<string, unknown>)[segKeyAsFieldName] = tmpSegVal;
                }
            }
            if (currEvent.sum && common.isNumber(currEvent.sum)) {
                currEvent.sum = Number.parseFloat(Number.parseFloat(currEvent.sum as unknown as string).toFixed(5));
            }

            if (currEvent.dur && common.isNumber(currEvent.dur)) {
                currEvent.dur = Number.parseFloat(currEvent.dur as unknown as string);
            }

            if (currEvent.count && common.isNumber(currEvent.count)) {
                currEvent.count = Number.parseInt(currEvent.count as unknown as string, 10);
            }
            else {
                currEvent.count = 1;
            }
            dbEventObject.s = currEvent.sum || 0;
            dbEventObject.dur = currEvent.dur || 0;
            dbEventObject.c = currEvent.count || 1;
            eventsToInsert.push({ "insertOne": { "document": dbEventObject } });

            if (eventKey === "[CLY]_view") {
                const view_id = crypto.createHash('md5').update((currEvent.segmentation as any).name).digest('hex');
                viewUpdate[view_id] = { "lvid": dbEventObject._id!, "ts": dbEventObject.ts, "a": params.app_id + "" };
                if (currEvent.segmentation) {
                    const sgm: Record<string, unknown> = {};
                    let have_sgm = false;
                    for (const key in currEvent.segmentation) {
                        if (key === 'platform' || !escapedViewSegments[key]) {
                            sgm[key] = (currEvent.segmentation as any)[key];
                            have_sgm = true;
                        }
                    }
                    if (have_sgm) {
                        viewUpdate[view_id].sg = sgm;
                    }
                }
            }
        }
    }

    if (drill_updates && drill_updates.length > 0) {
        for (const drill_update of drill_updates) {
            eventsToInsert.push(drill_update);
        }
    }

    if (eventsToInsert.length > 0) {
        try {
            const result = await eventSink!.write(eventsToInsert);

            if (result.overall.success) {
                log.d(`Successfully wrote ${result.overall.written} events using EventSink`);
                callback(null);
            }
            else {
                log.e('EventSink failed to write events:', result.overall.error);
                callback(new Error(result.overall.error));
                return;
            }
        }
        catch (error) {
            log.e('Error writing events via EventSink:', error);
            callback(error as Error);
        }
    }
    else {
        callback(null);
    }
};

plugins.register("/sdk/process_user", async function(ob: UsageObservable) {
    await usage.processUserProperties(ob);
});

/**
 * Process request data - update app user and write to drill
 * @param ob - request observable
 * @param done - callback function
 */
const processRequestData = (ob: RequestObservable, done: () => void): void => {
    let update: Record<string, unknown> = {};
    if (ob.params.app_user!.last_req !== ob.params.request_hash && ob.updates.length > 0) {
        for (let i = 0; i < ob.updates.length; i++) {
            update = common.mergeQuery(update, ob.updates[i]);
        }
        ob.params.qstring!.events = ob.params.qstring!.events || [];
        if (ob.params.qstring!.events!.length === 0) {
            ob.params.qstring!.events!.push({ "key": "[CLY]_property_update" });
        }
    }

    common.updateAppUser(ob.params, update, false, function() {
        processToDrill(ob.params, ob.drill_updates, function(error) {
            if (error) {
                common.returnMessage(ob.params, 400, 'Could not record events:' + error);
            }
            else {
                common.returnMessage(ob.params, 200, 'Success');
                done();
            }
        });
    });
};

plugins.register("/sdk/process_request", async function(ob: UsageObservable) {
    await usage.setLocation(ob.params as unknown as IngestorParams);
    usage.processSession(ob);
});

/**
 * Validate app for write API
 * @param params - request parameters
 * @param done - callback function
 */
const validateAppForWriteAPI = (params: RequestParams, done: () => void): void => {
    if (ignorePossibleDevices(params)) {
        common.returnMessage(params, 400, "Device ignored");
        done();
        return;
    }

    common.readBatcher.getOne("apps", { 'key': params.qstring?.app_key + "" }, {}, (err: Error | null, app: AppDocument | null) => {
        if (err) {
            log.e(err);
        }
        if (!app || !app._id) {
            common.returnMessage(params, 400, 'App does not exist');
            params.cancelRequest = "App not found or no Database connection";
            done();
            return;
        }

        if (app.paused) {
            common.returnMessage(params, 400, 'App is currently not accepting data');
            params.cancelRequest = "App is currently not accepting data";
            plugins.dispatch("/sdk/cancel", { params: params });
            done();
            return;
        }

        if ((params.populator || params.qstring?.populator) && app.locked) {
            common.returnMessage(params, 403, "App is locked");
            params.cancelRequest = "App is locked";
            plugins.dispatch("/sdk/cancel", { params: params });
            done();
            return;
        }
        if (!validateRedirect({ params: params, app: app })) {
            if (!params.res.finished && !params.waitForResponse) {
                common.returnOutput(params, { result: 'Success', info: 'Request redirected: ' + params.cancelRequest });
            }
            done();
            return;
        }

        params.app_id = app._id + "";
        params.app_cc = app.country;
        params.app_name = app.name;
        params.appTimezone = app.timezone;
        params.app = app;
        params.time = common.initTimeObj(params.appTimezone, params.qstring?.timestamp);

        let time = Date.now().valueOf();
        time = Math.round((time || 0) / 1000);
        if (params.app && (!params.app.last_data || params.app.last_data < time - 60 * 60 * 24) && !params.populator && !params.qstring?.populator) {
            common.readBatcher.updateCacheOne("apps", { 'key': params.qstring?.app_key + "" }, { "last_data": time });
            try {
                common.db.collection("apps").findOneAndUpdate({ "_id": new ObjectId(params.app._id) }, { "$set": { "last_data": time } });
                params.app.last_data = time;
            }
            catch (err3) {
                log.e(err3);
            }
        }

        if (!checksumSaltVerification(params)) {
            done();
            return;
        }

        if (params.qstring?.metrics && typeof params.qstring.metrics === "string") {
            try {
                params.qstring.metrics = JSON.parse(params.qstring.metrics);
            }
            catch (e) {
                console.log('Parse metrics JSON failed', params.qstring.metrics, params.req.url, params.req.body);
            }
        }

        plugins.dispatch("/sdk/validate_request", { params: params }, async function() {
            if (params.cancelRequest) {
                if (!params.res.finished && !params.waitForResponse) {
                    common.returnOutput(params, { result: 'Success', info: 'Request ignored: ' + params.cancelRequest });
                }
                common.log("request").i('Request ignored: ' + params.cancelRequest, params.req.url, params.req.body);
                done();
                return;
            }
            try {
                const user = await common.db.collection('app_users' + params.app_id).findOne({ '_id': params.app_user_id });
                params.app_user = user || {};
                params.collectedMetrics = {};

                let payload = (params.href?.substr(3) || "");
                if (params.req && params.req.method && params.req.method.toLowerCase() === 'post') {
                    payload += "&" + params.req.body;
                }
                else if (params.bulk) {
                    payload += "&" + params.req.body;
                }
                payload = payload.replace(new RegExp("[?&]?(rr=[^&\n]+)", "gm"), "");
                payload = payload.replace(new RegExp("[?&]?(checksum=[^&\n]+)", "gm"), "");
                payload = payload.replace(new RegExp("[?&]?(checksum256=[^&\n]+)", "gm"), "");
                params.request_hash = common.crypto.createHash('sha1').update(payload).digest('hex') + (params.qstring?.timestamp || params.time?.mstimestamp);

                if (plugins.getConfig("api", params.app && params.app.plugins, true).prevent_duplicate_requests) {
                    if (params.app_user?.last_req === params.request_hash) {
                        params.cancelRequest = "Duplicate request";
                    }
                }

                if (params.qstring?.metrics && typeof params.qstring.metrics === "string") {
                    try {
                        params.qstring.metrics = JSON.parse(params.qstring.metrics);
                    }
                    catch (ex) {
                        console.log('Parse metrics JSON failed', params.qstring.metrics, params.req.url, params.req.body);
                    }
                }

                if (!params.cancelRequest) {
                    processUser(params, function(userErr) {
                        if (userErr) {
                            if (!params.res.finished) {
                                common.returnMessage(params, 400, userErr);
                            }
                        }
                        else {
                            const ob: RequestObservable = { params: params, app: app!, updates: [], drill_updates: [] };
                            ob.params.request_id = ob.params.request_hash + "_" + ob.params.app_user!.uid + "_" + ob.params.time!.mstimestamp;
                            plugins.dispatch("/sdk/process_request", ob, function() {
                                plugins.dispatch("/sdk/validate_user", ob, function() {
                                    if (params.cancelRequest) {
                                        if (!params.res.finished && !params.waitForResponse) {
                                            common.returnOutput(params, { result: 'Success', info: 'Request ignored: ' + params.cancelRequest });
                                        }
                                        common.log("request").i('Request ignored: ' + params.cancelRequest, params.req.url, params.req.body);
                                        done();
                                        return;
                                    }
                                    else {
                                        ob.params.previous_session = ob.params.app_user!.lsid;
                                        ob.params.previous_session_start = ob.params.app_user!.ls;

                                        if (ob.params.qstring?.begin_session) {
                                            ob.params.app_user!.lsparams = {
                                                request_id: params.request_id,
                                                prev_session: params.previous_session,
                                                prev_start: params.previous_session_start,
                                                postfix: crypto.createHash('md5').update(params.app_user!.did + "").digest('base64')[0],
                                                ended: "false"
                                            };

                                            params.qstring!.events = params.qstring!.events || [];

                                            ob.updates.push({ "$set": { "lsparams": ob.params.app_user!.lsparams } });
                                            const up_extra: Record<string, unknown> = { av_prev: params.app_user!.av, p_prev: params.app_user!.p };
                                            if (params.app_user!.hadFatalCrash) {
                                                up_extra.hadFatalCrash = params.app_user!.hadFatalCrash;
                                            }
                                            if (params.app_user!.hadAnyFatalCrash) {
                                                up_extra.hadAnyFatalCrash = params.app_user!.hadAnyFatalCrash;
                                            }
                                            if (params.app_user!.hadNonfatalCrash) {
                                                up_extra.hadNonfatalCrash = params.app_user!.hadNonfatalCrash;
                                            }
                                            if (params.app_user!.hadAnyNonfatalCrash) {
                                                up_extra.hadAnyNonfatalCrash = params.app_user!.hadAnyNonfatalCrash;
                                            }
                                            params.qstring!.events!.unshift({
                                                key: "[CLY]_session_begin",
                                                dur: 0,
                                                count: 1,
                                                timestamp: params.time!.mstimestamp,
                                                segmentation: {
                                                    request_id: params.request_id,
                                                    prev_session: params.previous_session,
                                                    prev_start: params.previous_session_start,
                                                    postfix: crypto.createHash('md5').update(params.app_user!.did + "").digest('base64')[0],
                                                    ended: "false"
                                                },
                                                up_extra
                                            });
                                        }
                                        plugins.dispatch("/sdk/process_user", ob, function() {
                                            processRequestData(ob, done);
                                        });
                                    }
                                });
                            });
                        }
                    });
                }
                else {
                    if (!params.res.finished && !params.waitForResponse) {
                        common.returnOutput(params, { result: 'Success', info: 'Request ignored: ' + params.cancelRequest });
                    }
                    common.log("request").i('Request ignored: ' + params.cancelRequest, params.req.url, params.req.body);
                    done();
                    return;
                }
            }
            catch (error) {
                common.returnMessage(params, 400, 'Cannot get app user');
                params.cancelRequest = "Cannot get app user or no Database connection";
                done();
                return;
            }
        });
    });
};

/**
 * Process bulk request
 * @param requests - array of requests
 * @param params - params object
 */
const processBulkRequest = async function(requests: Record<string, unknown>[], params: RequestParams): Promise<void> {
    const appKey = params.qstring?.app_key;
    const skippedRequests: Record<string, unknown>[] = [];

    for (const request of requests) {
        if (!request || (!(request as any).app_key && !appKey) || !(request as any).device_id) {
            continue;
        }
        else {
            (request as any).app_key = (request as any).app_key || appKey;
            params.req.body = JSON.stringify(request);
            const tmpParams: RequestParams = {
                'app_id': '',
                'app_cc': '',
                'ip_address': (request as any).ip_address || common.getIpAddress(params.req),
                'user': {
                    'country': (request as any).country_code || 'Unknown',
                    'city': (request as any).city || 'Unknown'
                },
                'qstring': request as any,
                'href': "/i",
                'res': params.res,
                'req': params.req,
                'promises': [],
                'bulk': true,
                'populator': params.qstring?.populator,
                'blockResponses': true
            };

            tmpParams.qstring!.device_id += "";
            tmpParams.app_user_id = common.crypto.createHash('sha1')
                .update(tmpParams.qstring!.app_key + tmpParams.qstring!.device_id + "")
                .digest('hex');

            await new Promise<void>((resolve) => {
                validateAppForWriteAPI(tmpParams, () => {
                    if (tmpParams.cancelRequest) {
                        skippedRequests.push(tmpParams.qstring!);
                    }
                    plugins.dispatch("/sdk/log", { params: tmpParams });
                    resolve();
                });
            });
        }
    }
    common.unblockResponses(params);
    common.returnMessage(params, 200, 'Success');
};

/**
 * Process incoming request
 * @param params - request parameters
 * @returns false if request is cancelled
 */
const processRequest = (params: RequestParams): boolean | void => {
    if (!params.req || !params.req.url) {
        return common.returnMessage(params, 400, "Please provide request data");
    }

    params.tt = Date.now().valueOf();
    const urlParts = url.parse(params.req.url, true);
    const queryString = urlParts.query;
    const paths = urlParts.pathname.split("/");

    params.href = urlParts.href;
    params.qstring = params.qstring || {};
    params.res = params.res || {} as ServerResponse;
    params.urlParts = urlParts;
    params.paths = paths;

    params.req.headers = params.req.headers || {};
    params.req.socket = params.req.socket || {};
    params.req.connection = params.req.connection || {};

    if (queryString) {
        for (const i in queryString) {
            (params.qstring as any)[i] = queryString[i];
        }
    }

    if (params.req.body && typeof params.req.body === "object") {
        for (const i in params.req.body) {
            (params.qstring as any)[i] = (params.req.body as any)[i];
        }
    }

    if (params.qstring?.app_id && (params.qstring.app_id as string).length !== 24) {
        common.returnMessage(params, 400, 'Invalid parameter "app_id"');
        return false;
    }

    if (params.qstring?.user_id && (params.qstring.user_id as string).length !== 24) {
        common.returnMessage(params, 400, 'Invalid parameter "user_id"');
        return false;
    }

    if (common.config.path === "/" + paths[1]) {
        paths.splice(1, 1);
    }

    let apiPath = '';

    for (let i = 1; i < paths.length; i++) {
        if (i > 2) {
            break;
        }
        apiPath += "/" + paths[i];
    }

    params.apiPath = apiPath;
    params.fullPath = paths.join("/");

    reloadConfig().then(function() {
        switch (apiPath) {
        case '/o/ping': {
            common.db.collection("plugins").findOne({ _id: "plugins" }, { _id: 1 }).then(() => {
                common.returnMessage(params, 200, 'Success');
            }).catch(() => {
                common.returnMessage(params, 404, 'DB Error');
            });
            return;
        }
        case '/i': {
            if ([true, "true"].includes(plugins.getConfig("api", params.app && params.app.plugins, true).trim_trailing_ending_spaces)) {
                params.qstring = common.trimWhitespaceStartEnd(params.qstring);
            }
            params.ip_address = params.qstring?.ip_address as string || common.getIpAddress(params.req);
            params.user = {};

            if (!params.qstring?.app_key || !params.qstring?.device_id) {
                common.returnMessage(params, 400, 'Missing parameter "app_key" or "device_id"');
                return false;
            }
            else {
                params.qstring.device_id += "";
                params.qstring.app_key += "";
                params.app_user_id = common.crypto.createHash('sha1')
                    .update(params.qstring.app_key + params.qstring.device_id + "")
                    .digest('hex');
            }

            if (params.qstring?.events && typeof params.qstring.events === "string") {
                try {
                    params.qstring.events = JSON.parse(params.qstring.events);
                }
                catch (err) {
                    console.log('Parse events JSON failed', params.qstring.events, params.req.url, params.req.body);
                    params.qstring.events = [];
                }
            }

            if (!params.qstring?.events || !Array.isArray(params.qstring.events)) {
                params.qstring!.events = [];
            }
            validateAppForWriteAPI(params, () => {
                plugins.dispatch("/sdk/log", { params: params });
            });
            break;
        }
        case '/i/bulk': {
            let requests = params.qstring?.requests;
            if (requests && typeof requests === "string") {
                try {
                    requests = JSON.parse(requests);
                }
                catch (err) {
                    console.log('Parse bulk JSON failed', requests, params.req.url, params.req.body);
                    requests = null;
                }
            }
            if (!requests) {
                common.returnMessage(params, 400, 'Missing parameter "requests"');
                return false;
            }
            if (!Array.isArray(requests)) {
                console.log("Passed invalid param for request. Expected Array, got " + typeof requests);
                common.returnMessage(params, 400, 'Invalid parameter "requests"');
                return false;
            }
            common.blockResponses(params);

            processBulkRequest(requests, params);
            break;
        }
        default:
            if (!plugins.dispatch(apiPath, {
                params: params,
                paths: paths
            })) {
                if (!plugins.dispatch(params.fullPath, {
                    params: params,
                    paths: paths
                })) {
                    common.returnMessage(params, 400, 'Invalid path');
                }
            }
        }
    }).catch((err: Error) => {
        log.e('Error reloading config:', err);
        common.returnMessage(params, 500, 'Server error');
    });
};

export { processRequest, processToDrill };
export type { RequestParams, RequestEvent, AppDocument, AppUserDocument, DrillEventObject, DrillBulkOperation };
