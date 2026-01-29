/**
 * Usage module for ingestor - handles location, session, and metrics processing
 * @module api/ingestor/usage
 */

import { createRequire } from 'module';

const require = createRequire(import.meta.url);

const common = require('./../utils/common.js');
const geoip = require('geoip-lite');
const geocoder = require('./../../bin/offline-geocoder/src/index.js')();
const log = require('./../utils/log.js')('ingestor:usage');
const plugins = require('./../../plugins/pluginManager.js');
const moment = require('moment-timezone');

/**
 * Location object for geocoding
 */
export interface LocationData {
    /** Latitude */
    lat?: number;
    /** Longitude */
    lon?: number;
    /** Country code */
    country?: string;
    /** City name */
    city?: string;
    /** Region */
    region?: string;
    /** Timezone offset */
    tz?: number;
    /** Whether location came from GPS */
    gps?: boolean;
    /** Lat/lon array from geoip */
    ll?: [number, number];
}

/**
 * Geocoder result data
 */
interface GeocoderData {
    /** Country info */
    country?: {
        id?: string;
    };
    /** City name */
    name?: string;
    /** Region */
    region?: string;
    /** Coordinates */
    coordinates?: {
        latitude?: number;
        longitude?: number;
    };
    /** Timezone */
    tz?: string;
    /** Lat/lon array */
    ll?: [number, number];
}

/**
 * GeoIP lookup result
 */
interface GeoIPData {
    /** Country code */
    country?: string;
    /** City */
    city?: string;
    /** Region */
    region?: string;
    /** Lat/lon array */
    ll?: [number, number];
}

/**
 * Time object from common.initTimeObj
 */
interface TimeObj {
    /** Millisecond timestamp */
    mstimestamp?: number;
    /** Unix timestamp */
    timestamp?: number;
}

/**
 * User object in params
 */
interface ParamsUser {
    /** Timezone offset */
    tz?: number;
    /** Country code */
    country?: string;
    /** Region */
    region?: string;
    /** City */
    city?: string;
}

/**
 * Location object stored in app_user
 */
interface UserLocation {
    /** Whether from GPS */
    gps: boolean;
    /** GeoJSON point */
    geo: {
        type: 'Point';
        coordinates: [number, number];
    };
    /** Date timestamp */
    date: number;
}

/**
 * App user document
 */
interface AppUser {
    /** Has ongoing session */
    [key: string]: unknown;
    /** Last session ID */
    lsid?: string;
    /** Last session params */
    lsparams?: Record<string, unknown>;
    /** Session duration */
    sd?: number;
    /** Last seen timestamp */
    ls?: number;
    /** View count */
    vc?: number;
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
    /** App version */
    av?: string;
    /** Platform */
    p?: string;
    /** Location */
    loc?: UserLocation;
    /** Had fatal crash */
    hadFatalCrash?: boolean | number;
    /** Had any fatal crash */
    hadAnyFatalCrash?: number;
    /** Had non-fatal crash */
    hadNonfatalCrash?: boolean | number;
    /** Had any non-fatal crash */
    hadAnyNonfatalCrash?: number;
    /** Consent data */
    consent?: Record<string, unknown>;
}

/**
 * App document
 */
interface App {
    /** App ID */
    _id?: string;
    /** App timezone */
    timezone?: string;
    /** Plugin configs */
    plugins?: Record<string, unknown>;
}

/**
 * Query string parameters
 */
interface QString {
    /** Timezone */
    tz?: string;
    /** Country code */
    country_code?: string;
    /** City */
    city?: string;
    /** Region */
    region?: string;
    /** Location string "lat,lon" */
    location?: string;
    /** Metrics object */
    metrics?: Metrics;
    /** Events array */
    events?: EventData[];
    /** Session duration */
    session_duration?: string | number;
    /** Begin session flag */
    begin_session?: boolean;
    /** End session flag */
    end_session?: boolean | EndSessionData;
    /** Ignore cooldown flag */
    ignore_cooldown?: boolean;
}

/**
 * End session data
 */
interface EndSessionData {
    /** Last session ID */
    lsid?: string;
    /** Last seen */
    ls?: number;
    /** Session duration */
    sd?: number;
}

/**
 * Metrics from SDK
 */
interface Metrics {
    /** Carrier */
    _carrier?: string;
    /** OS name */
    _os?: string;
    /** OS version */
    _os_version?: string;
    /** App version */
    _app_version?: string;
    /** Device type */
    _device_type?: string;
    /** Device name */
    _device?: string;
    /** Manufacturer */
    _manufacturer?: string;
    /** Has hinge */
    _has_hinge?: string | boolean;
    /** Resolution */
    _resolution?: string;
}

/**
 * Event data structure
 */
interface EventData {
    /** Event key */
    key: string;
    /** Event segmentation */
    segmentation?: Record<string, unknown>;
    /** Count */
    count?: number;
    /** Sum */
    sum?: number;
    /** Duration */
    dur?: number;
    /** Timestamp */
    timestamp?: number;
    /** Custom event flag */
    ce?: boolean;
}

/**
 * Collected metrics
 */
interface CollectedMetrics {
    [key: string]: string | number | null | undefined;
    /** Country code */
    cc?: string;
    /** City */
    cty?: string;
    /** App version major */
    av_major?: number | null;
    /** App version minor */
    av_minor?: number | null;
    /** App version patch */
    av_patch?: number | null;
    /** App version prerelease */
    av_prerel?: string | null;
    /** App version build */
    av_build?: string | null;
}

/**
 * Params object for request processing
 */
export interface IngestorParams {
    /** Time object */
    time: TimeObj;
    /** User object */
    user: ParamsUser;
    /** Query string params */
    qstring: QString;
    /** IP address */
    ip_address: string;
    /** App document */
    app?: App;
    /** App country */
    app_cc?: string;
    /** App user document */
    app_user: AppUser;
    /** App ID */
    app_id?: string;
    /** Collected metrics */
    collectedMetrics: CollectedMetrics;
    /** OS processed flag */
    is_os_processed?: boolean;
    /** Request ID */
    request_id?: string;
    /** Session duration */
    session_duration?: number;
}

/**
 * Update object for MongoDB
 */
interface UpdateObject {
    /** Set operations */
    $set?: Record<string, unknown>;
    /** Increment operations */
    $inc?: Record<string, number>;
    /** Unset operations */
    $unset?: Record<string, string | number>;
}

/**
 * Observable object for plugin dispatch
 */
export interface UsageObservable {
    /** Params */
    params: IngestorParams;
    /** Updates array */
    updates: UpdateObject[];
}

/**
 * Drill document for session end
 */
interface DrillDocument {
    /** Event key */
    key: string;
    /** Last session ID */
    lsid?: string;
    /** Segmentation */
    segmentation: Record<string, unknown>;
    /** Duration */
    dur: number;
    /** Count */
    count: number;
    /** Extra user properties */
    up_extra: Record<string, unknown>;
    /** Document ID */
    _id?: string;
    /** Timestamp */
    timestamp?: number;
    /** Event name */
    name?: string;
    /** System auto added flag */
    _system_auto_added?: boolean;
}

/**
 * Version components from parsing
 */
interface VersionComponents {
    /** Parse success */
    success: boolean;
    /** Major version */
    major?: number;
    /** Minor version */
    minor?: number;
    /** Patch version */
    patch?: number;
    /** Prerelease string */
    prerelease?: string;
    /** Build string */
    build?: string;
}

/**
 * Usage module interface
 */
export interface IngestorUsageModule {
    setLocation(params: IngestorParams): Promise<void>;
    setUserLocation(params: IngestorParams, loc: LocationData): void;
    processCoreMetrics(params: IngestorParams): void;
    returnRequestMetrics(params: IngestorParams): CollectedMetrics;
    updateEndSessionParams(params: IngestorParams, eventList: DrillDocument[], session_duration?: number): void;
    processSession(ob: UsageObservable): void;
    processUserProperties(ob: UsageObservable): Promise<void>;
}

/**
 * Get location either from coordinate to populate country and city, or from country and city to get coordinates
 * @param params - params object
 * @param loc - location object
 * @returns promise which resolves missing location parameters
 */
function locFromGeocoder(params: IngestorParams, loc: LocationData): Promise<LocationData> {
    return new Promise(resolve => {
        try {
            let promise: Promise<GeocoderData | undefined>;
            if (loc.lat !== undefined && loc.lon !== undefined) {
                loc.gps = true;
                promise = geocoder.reverse(loc.lat, loc.lon);
            }
            else if (loc.city && loc.country) {
                loc.gps = false;
                promise = geocoder.location(loc.city, loc.country);
            }
            else {
                promise = Promise.resolve();
            }
            promise.then((data: GeocoderData | undefined) => {
                loc.country = loc.country || (data && data.country && data.country.id);
                loc.city = loc.city || (data && data.name);
                loc.lat = loc.lat === undefined ? data && data.coordinates && data.coordinates.latitude : loc.lat;
                loc.lon = loc.lon === undefined ? data && data.coordinates && data.coordinates.longitude : loc.lon;
                if (!loc.tz && data && data.tz) {
                    const zone = moment.tz.zone(data.tz);
                    if (zone) {
                        loc.tz = -zone.utcOffset(new Date(params.time.mstimestamp || Date.now()));
                    }
                }
                resolve(loc);
            }, (err: Error) => {
                log.w('Error to reverse geocode: %j', err);
                resolve(loc);
            });
        }
        catch (err) {
            log.e('Error in geocoder: %j', err, (err as Error).stack);
            resolve(loc);
        }
    });
}

/**
 * Get location data from ip address
 * @param loc - location object
 * @param ip_address - User's ip address
 * @returns promise which resolves missing location parameters
 */
function locFromGeoip(loc: LocationData, ip_address: string): Promise<LocationData> {
    return new Promise(resolve => {
        try {
            const data: GeoIPData | null = geoip.lookup(ip_address);
            if (data) {
                loc.country = loc.country || (data && data.country);
                loc.city = loc.city || (data && data.city);
                loc.region = loc.region || (data && data.region);
                loc.lat = loc.lat === undefined ? (data && data.ll && data.ll[0]) : loc.lat;
                loc.lon = loc.lon === undefined ? (data && data.ll && data.ll[1]) : loc.lon;
                resolve(loc);
            }
            else {
                return resolve(loc);
            }
        }
        catch (e) {
            log.e('Error in geoip: %j', e);
            resolve(loc);
        }
    });
}

const usage: IngestorUsageModule = {
    /**
     * Set Location information in params but do not update it in users document
     * @param params - params object
     * @returns promise which resolves upon completing processing
     */
    setLocation: function(params: IngestorParams): Promise<void> {
        if ('tz' in params.qstring) {
            params.user.tz = Number.parseInt(params.qstring.tz as string);
            if (Number.isNaN(params.user.tz)) {
                delete params.user.tz;
            }
        }

        return new Promise(resolve => {
            const loc: LocationData = {
                country: params.qstring.country_code,
                city: params.qstring.city,
                tz: params.user.tz
            };

            if ('location' in params.qstring) {
                if (params.qstring.location) {
                    const coords = params.qstring.location.split(',');
                    if (coords.length === 2) {
                        const lat = Number.parseFloat(coords[0]);
                        const lon = Number.parseFloat(coords[1]);

                        if (!Number.isNaN(lat) && !Number.isNaN(lon)) {
                            loc.lat = lat;
                            loc.lon = lon;
                        }
                    }
                }
            }

            if (loc.lat !== undefined || (loc.country && loc.city)) {
                locFromGeocoder(params, loc).then(loc2 => {
                    if (loc2.city && loc2.country && loc2.lat !== undefined) {
                        usage.setUserLocation(params, loc2);
                        return resolve();
                    }
                    else {
                        loc2.city = loc2.country === undefined ? undefined : loc2.city;
                        loc2.country = loc2.city === undefined ? undefined : loc2.country;
                        locFromGeoip(loc2, params.ip_address).then(loc3 => {
                            usage.setUserLocation(params, loc3);
                            return resolve();
                        });
                    }
                });
            }
            else {
                locFromGeoip(loc, params.ip_address).then(loc2 => {
                    usage.setUserLocation(params, loc2);
                    return resolve();
                });
            }
        });
    },

    /**
     * Set user location in params
     * @param params - params object
     * @param loc - location info
     */
    setUserLocation: function(params: IngestorParams, loc: LocationData): void {
        params.user.country = plugins.getConfig('api', params.app && params.app.plugins, true).country_data === false ? undefined : loc.country;
        params.user.region = plugins.getConfig('api', params.app && params.app.plugins, true).city_data === true ? loc.region : undefined;
        params.user.city = (plugins.getConfig('api', params.app && params.app.plugins, true).city_data === false ||
            plugins.getConfig('api', params.app && params.app.plugins, true).country_data === false) ? undefined : loc.city;
    },

    /**
     * Process core metrics from SDK request
     * @param params - params object
     */
    processCoreMetrics: function(params: IngestorParams): void {
        if (params && params.qstring && params.qstring.metrics) {
            common.processCarrier(params.qstring.metrics);

            if (params.qstring.metrics._carrier) {
                params.collectedMetrics[common.dbUserMap.carrier] = params.qstring.metrics._carrier;
            }
            if (params.qstring.metrics._os) {
                params.qstring.metrics._os += "";
                if (params.qstring.metrics._os_version && !params.is_os_processed) {
                    params.qstring.metrics._os_version += "";

                    if (common.os_mapping[params.qstring.metrics._os.toLowerCase()] && !params.qstring.metrics._os_version.startsWith(common.os_mapping[params.qstring.metrics._os.toLowerCase()])) {
                        params.qstring.metrics._os_version = common.os_mapping[params.qstring.metrics._os.toLowerCase()] + params.qstring.metrics._os_version;
                        params.is_os_processed = true;
                    }
                    else {
                        params.qstring.metrics._os = params.qstring.metrics._os.replace(/\[|\]/g, '');
                        params.qstring.metrics._os_version = "[" + params.qstring.metrics._os + "]" + params.qstring.metrics._os_version;
                        params.is_os_processed = true;
                    }
                    params.collectedMetrics[common.dbUserMap.platform_version] = params.qstring.metrics._os_version;
                }
                params.collectedMetrics[common.dbUserMap.platform] = params.qstring.metrics._os;
            }
            if (params.qstring.metrics._app_version) {
                params.qstring.metrics._app_version += "";
                if (!params.qstring.metrics._app_version.includes('.') && common.isNumber(params.qstring.metrics._app_version)) {
                    params.qstring.metrics._app_version += ".0";
                }
                params.collectedMetrics[common.dbUserMap.app_version] = params.qstring.metrics._app_version;
            }
            if (!params.qstring.metrics._device_type && params.qstring.metrics._device) {
                const device = (params.qstring.metrics._device + "");
                if (params.qstring.metrics._os === "iOS" && (device.startsWith("iPhone") || device.startsWith("iPod"))) {
                    params.qstring.metrics._device_type = "mobile";
                }
                else if (params.qstring.metrics._os === "iOS" && device.startsWith("iPad")) {
                    params.qstring.metrics._device_type = "tablet";
                }
                else if (params.qstring.metrics._os === "watchOS" && device.startsWith("Watch")) {
                    params.qstring.metrics._device_type = "wearable";
                }
                else if (params.qstring.metrics._os === "tvOS" && device.startsWith("AppleTV")) {
                    params.qstring.metrics._device_type = "smarttv";
                }
                else if (params.qstring.metrics._os === "macOS" && (device.startsWith("Mac") || device.startsWith("iMac"))) {
                    params.qstring.metrics._device_type = "desktop";
                }
            }
            if (params.qstring.metrics._device_type) {
                params.collectedMetrics[common.dbUserMap.device_type] = params.qstring.metrics._device_type;
            }
            if (params.qstring.metrics._device) {
                params.collectedMetrics[common.dbUserMap.device] = params.qstring.metrics._device;
            }
            if (!params.qstring.metrics._manufacturer && params.qstring.metrics._os) {
                if (params.qstring.metrics._os === "iOS") {
                    params.qstring.metrics._manufacturer = "Apple";
                }
                else if (params.qstring.metrics._os === "watchOS") {
                    params.qstring.metrics._manufacturer = "Apple";
                }
                else if (params.qstring.metrics._os === "tvOS") {
                    params.qstring.metrics._manufacturer = "Apple";
                }
                else if (params.qstring.metrics._os === "macOS") {
                    params.qstring.metrics._manufacturer = "Apple";
                }
            }
            if (params.qstring.metrics._manufacturer) {
                params.collectedMetrics[common.dbUserMap.manufacturer] = params.qstring.metrics._manufacturer;
            }
            if (params.qstring.metrics._has_hinge) {
                const hasHingeValue = params.qstring.metrics._has_hinge;
                if (hasHingeValue === "true" || hasHingeValue === true || hasHingeValue === "hinged") {
                    params.qstring.metrics._has_hinge = "hinged";
                }
                else {
                    params.qstring.metrics._has_hinge = "not_hinged";
                }
                params.collectedMetrics[common.dbUserMap.has_hinge] = params.qstring.metrics._has_hinge;
            }
            if (params.qstring.metrics._resolution) {
                params.collectedMetrics[common.dbUserMap.resolution] = params.qstring.metrics._resolution;
            }
            if (params.qstring.metrics._app_version) {
                const versionComponents: VersionComponents = common.parseAppVersion(params.qstring.metrics._app_version);
                if (versionComponents.success) {
                    params.collectedMetrics.av_major = versionComponents.major!;
                    params.collectedMetrics.av_minor = versionComponents.minor!;
                    params.collectedMetrics.av_patch = versionComponents.patch!;
                    params.collectedMetrics.av_prerel = versionComponents.prerelease!;
                    params.collectedMetrics.av_build = versionComponents.build!;
                }
                else {
                    log.d("App version %s is not a valid semantic version. It cannot be separated into semantic version parts", params.qstring.metrics._app_version);
                    params.collectedMetrics.av_major = null;
                    params.collectedMetrics.av_minor = null;
                    params.collectedMetrics.av_patch = null;
                    params.collectedMetrics.av_prerel = null;
                    params.collectedMetrics.av_build = null;
                }
            }
        }
    },

    /**
     * Process all metrics and return
     * @param params - params object
     * @returns collected metrics
     */
    returnRequestMetrics: function(params: IngestorParams): CollectedMetrics {
        usage.processCoreMetrics(params);
        for (const key in params.collectedMetrics) {
            // We check if country data logging is on and user's country is the configured country of the app
            if (key === "cc" && (plugins.getConfig("api", params.app && params.app.plugins, true).country_data === false || params.app_cc !== params.user.country)) {
                continue;
            }
            // We check if city data logging is on and user's country is the configured country of the app
            if (key === "cty" && (plugins.getConfig("api", params.app && params.app.plugins, true).city_data === false || params.app_cc !== params.user.country)) {
                continue;
            }

            if (params.collectedMetrics[key]) {
                const escapedMetricVal = (params.collectedMetrics[key] + "").replace(/^\$/, "").replace(/\./g, ":");
                params.collectedMetrics[key] = escapedMetricVal;
            }
            else {
                if (!common.isNumber(params.collectedMetrics[key])) {
                    delete params.collectedMetrics[key];
                }
            }
        }
        return params.collectedMetrics;
    },

    /**
     * Update end session params and add drill documents
     * @param params - params object
     * @param eventList - event list to append to
     * @param session_duration - optional session duration
     */
    updateEndSessionParams: function(params: IngestorParams, eventList: DrillDocument[], session_duration?: number): void {
        const user = params.app_user;
        if (!user || !eventList || !Array.isArray(eventList)) {
            return;
        }
        const up_extra: Record<string, unknown> = { av_prev: params.app_user.av, p_prev: params.app_user.p };
        if (params.app_user.hadFatalCrash) {
            up_extra.hadFatalCrash = params.app_user.hadFatalCrash;
        }
        if (params.app_user.hadAnyFatalCrash) {
            up_extra.hadAnyFatalCrash = params.app_user.hadAnyFatalCrash;
        }
        if (params.app_user.hadNonfatalCrash) {
            up_extra.hadNonfatalCrash = params.app_user.hadNonfatalCrash;
        }
        if (params.app_user.hadAnyNonfatalCrash) {
            up_extra.hadAnyNonfatalCrash = params.app_user.hadAnyNonfatalCrash;
        }
        up_extra.vc = user.vc;
        const drill_doc: DrillDocument = {
            "key": "[CLY]_session",
            "lsid": user.lsid,
            "segmentation": user.lsparams as Record<string, unknown> || {},
            "dur": ((user.sd || 0) + (session_duration || 0)),
            "count": 1,
            "up_extra": up_extra
        };

        let lasts = (user.ls || 0) * 1000;
        const idsplit = (user.lsid || '').split("_");
        if (idsplit[3] && idsplit[3].length === 13) {
            lasts = Number.parseInt(idsplit[3], 10);
        }
        drill_doc._id = params.app_id + "_" + (user as any).uid + "_" + user.lsid;
        if (lasts) {
            drill_doc.timestamp = lasts;
        }
        drill_doc.segmentation.ended = "true";
        eventList.push(drill_doc);

        // Flush last view stored for user
        if (user.last_view) {
            user.last_view.segments = user.last_view.segments || {};
            (user.last_view.segments as any).exit = 1;
            if ((user.vc || 0) < 2) {
                (user.last_view.segments as any).bounce = 1;
            }
            const lastViewDoc: DrillDocument = {
                "key": "[CLY]_view", // Will be renamed to [CLY]_view_update before inserting to drill
                "name": user.last_view.name,
                "segmentation": user.last_view.segments as Record<string, unknown>,
                "dur": user.last_view.duration || 0,
                "_id": (user.last_view._idv ? (params.app_id + "_" + (user as any).uid + '_' + user.last_view._idv + '_up') : (user.lvid + '_up')),
                "timestamp": user.last_view.ts,
                "_system_auto_added": true,
                "count": 1,
                "up_extra": {}
            };
            eventList.push(lastViewDoc);
        }
    },

    /**
     * Process session data
     * @param ob - observable object with params and updates
     */
    processSession: function(ob: UsageObservable): void {
        const params = ob.params;
        const userProps: Record<string, unknown> = {};
        let session_duration = 0;
        const update: UpdateObject = {};

        if (params.qstring.session_duration) {
            if (!params.app_user[common.dbUserMap.has_ongoing_session]) {
                params.qstring.begin_session = true;
            }
            session_duration = Number.parseInt(params.qstring.session_duration as string);
            const session_duration_limit = Number.parseInt(plugins.getConfig("api", params.app && params.app.plugins, true).session_duration_limit);
            if (session_duration) {
                if (session_duration_limit && session_duration > session_duration_limit) {
                    session_duration = session_duration_limit;
                }
                if (session_duration < 0) {
                    session_duration = 30;
                }
            }
        }
        if (params.qstring.end_session) {
            if (!params.qstring.ignore_cooldown && !params.app_user[common.dbUserMap.has_ongoing_session]) {
                params.qstring.begin_session = true;
                delete params.qstring.end_session;
            }
        }

        if (params.qstring.begin_session) {
            const lastEndSession = params.app_user[common.dbUserMap.last_end_session_timestamp] as number | undefined;
            if (!params.app_user[common.dbUserMap.has_ongoing_session]) {
                userProps[common.dbUserMap.has_ongoing_session] = true;
            }

            if (!params.qstring.ignore_cooldown && lastEndSession && ((params.time.timestamp || 0) - lastEndSession) < plugins.getConfig("api", params.app && params.app.plugins, true).session_cooldown) {
                delete params.qstring.begin_session; // do not start a new session.
            }
            else {
                if (params.app_user[common.dbUserMap.has_ongoing_session]) {
                    params.qstring.end_session = { "lsid": ob.params.app_user.lsid, "ls": ob.params.app_user.ls, "sd": ob.params.app_user.sd };
                }
                userProps[common.dbUserMap.last_begin_session_timestamp] = params.time.timestamp;
                userProps.lsid = params.request_id;

                if (params.app_user[common.dbUserMap.has_ongoing_session]) {
                    if (params.app_user.lsid) {
                        try {
                            params.qstring.events = params.qstring.events || [];
                            usage.updateEndSessionParams(params, params.qstring.events as unknown as DrillDocument[]);
                            if (!params.app_user.hadFatalCrash) {
                                userProps.hadAnyFatalCrash = moment((params.time.timestamp || 0)).unix();
                            }
                            else {
                                userProps.hadFatalCrash = false;
                            }

                            if (!params.app_user.hadNonfatalCrash) {
                                userProps.hadAnyNonfatalCrash = moment((params.time.timestamp || 0)).unix();
                            }
                            else {
                                userProps.hadNonfatalCrash = false;
                            }

                        }
                        catch (ex) {
                            log.e("Error adding previous session end event: " + ex);
                        }
                    }
                    userProps.sd = 0 + session_duration;
                    userProps.data = {};
                }
                // new session
                const isNewUser = (params.app_user && params.app_user[common.dbUserMap.first_seen]) ? false : true;
                if (isNewUser) {
                    userProps[common.dbUserMap.first_seen] = params.time.timestamp;
                    userProps[common.dbUserMap.last_seen] = params.time.timestamp;
                }
                else {
                    if (Number.parseInt(params.app_user[common.dbUserMap.last_seen] as string, 10) < (params.time.timestamp || 0)) {
                        userProps[common.dbUserMap.last_seen] = params.time.timestamp;
                    }
                }

                if (!update.$inc) {
                    update.$inc = {};
                }
                if (!update.$unset) {
                    update.$unset = {};
                }
                delete params.app_user.last_view;
                update.$unset.last_view = "";
                update.$inc.sc = 1;

            }
        }
        else if (params.qstring.end_session && params.app_user) {
            // check if request is too old, ignore it
            if (!params.qstring.ignore_cooldown) {
                userProps[common.dbUserMap.last_end_session_timestamp] = params.time.timestamp;
            }
            else {
                if (!params.app_user.lsid || !params.app_user[common.dbUserMap.has_ongoing_session]) {
                    // create new lsid if not present or it is autoclosed
                    params.app_user.lsid = params.request_id;
                    params.qstring.begin_session = true;
                }
                if (params.app_user.lsid) {
                    params.qstring.events = params.qstring.events || [];
                    usage.updateEndSessionParams(params, params.qstring.events as unknown as DrillDocument[], session_duration);
                }
            }
            if (!update.$unset) {
                update.$unset = {};
            }
            if (params.app_user[common.dbUserMap.has_ongoing_session]) {
                update.$unset[common.dbUserMap.has_ongoing_session] = "";
            }
            if (params.app_user.last_view) {
                update.$unset.last_view = "";
            }
        }

        if (!params.qstring.begin_session) {
            if (session_duration) {
                if (!update.$inc) {
                    update.$inc = {};
                }
                update.$inc.sd = session_duration;
                update.$inc.tsd = session_duration;
                params.session_duration = (params.app_user.sd || 0) + session_duration;
            }
        }
        else {
            if (session_duration) {
                userProps.sd = session_duration;
                if (!update.$inc) {
                    update.$inc = {};
                }
                update.$inc.tsd = session_duration;
                params.session_duration = session_duration;
            }
        }

        for (const key in userProps) {
            if (userProps[key] === params.app_user[key]) {
                delete userProps[key];
            }
        }

        if (Object.keys(userProps).length > 0) {
            update.$set = userProps;
        }

        if (Object.keys(update).length > 0) {
            ob.updates.push(update);
        }
        usage.processCoreMetrics(params); // Collects core metrics
    },

    /**
     * Process user properties from request
     * @param ob - observable object with params and updates
     */
    processUserProperties: async function(ob: UsageObservable): Promise<void> {
        const params = ob.params;
        const userProps: Record<string, unknown> = {};
        const update: UpdateObject = {};
        params.user = {} as ParamsUser;
        const config = plugins.getConfig("api", params.app && params.app.plugins, true);

        if (params.qstring.tz) {
            const tz = Number.parseInt(params.qstring.tz);
            if (Number.isNaN(tz)) {
                userProps.tz = tz;
            }
        }

        if (params.qstring.country_code) {
            userProps.cc = params.qstring.country_code;
        }

        if (params.qstring.region) {
            userProps.rgn = params.qstring.region;
        }

        if (params.qstring.city) {
            userProps.cty = params.qstring.city;
        }
        let locationData: LocationData | undefined;
        if (params.qstring.location) {
            const coords = (params.qstring.location + "").split(',');
            if (coords.length === 2) {
                const lat = Number.parseFloat(coords[0]);
                const lon = Number.parseFloat(coords[1]);

                if (!Number.isNaN(lat) && !Number.isNaN(lon)) {
                    (userProps as any).loc = {
                        gps: true,
                        geo: {
                            type: 'Point',
                            coordinates: [lon, lat]
                        },
                        date: params.time.mstimestamp
                    };
                    locationData = await locFromGeocoder(params, {
                        country: userProps.cc as string | undefined,
                        city: userProps.cc as string | undefined,
                        tz: userProps.tz as number | undefined,
                        lat: (userProps as any).loc && (userProps as any).loc.geo.coordinates[1],
                        lon: (userProps as any).loc && (userProps as any).loc.geo.coordinates[0]
                    });

                    if (!userProps.cc && locationData.country) {
                        userProps.cc = locationData.country;
                    }

                    if (!userProps.rgn && locationData.region) {
                        userProps.rgn = locationData.region;
                    }

                    if (!userProps.cty && locationData.city) {
                        userProps.cty = locationData.city;
                    }
                }
            }
        }
        if (params.qstring.begin_session && params.qstring.location === "") {
            // user opted out of location tracking
            userProps.cc = userProps.rgn = userProps.cty = 'Unknown';
            if ((userProps as any).loc) {
                delete (userProps as any).loc;
            }
            if (params.app_user.loc) {
                if (!update.$unset) {
                    update.$unset = {};
                }
                update.$unset = { loc: 1 };
            }
        }
        else if (params.qstring.begin_session && params.qstring.location !== "") {
            if ((userProps as any).loc !== undefined || (userProps.cc && userProps.cty)) {
                const data = locationData || await locFromGeocoder(params, {
                    country: userProps.cc as string | undefined,
                    city: userProps.cc as string | undefined,
                    tz: userProps.tz as number | undefined,
                    lat: (userProps as any).loc && (userProps as any).loc.geo.coordinates[1],
                    lon: (userProps as any).loc && (userProps as any).loc.geo.coordinates[0]
                });
                if (data) {
                    if (!userProps.cc && data.country) {
                        userProps.cc = data.country;
                    }

                    if (!userProps.rgn && data.region) {
                        userProps.rgn = data.region;
                    }

                    if (!userProps.cty && data.city) {
                        userProps.cty = data.city;
                    }

                    if (plugins.getConfig('api', params.app && params.app.plugins, true).city_data === true && !(userProps as any).loc && data.lat !== undefined && data.lon !== undefined) {
                        // only override lat/lon if no recent gps location exists in user document
                        if (!params.app_user.loc || (params.app_user.loc.gps && (params.time.mstimestamp || 0) - params.app_user.loc.date > 7 * 24 * 3600)) {
                            (userProps as any).loc = {
                                gps: false,
                                geo: {
                                    type: 'Point',
                                    coordinates: [data.ll![1], data.ll![0]]
                                },
                                date: params.time.mstimestamp
                            };
                        }
                    }
                }
            }
            else {
                try {
                    const data: GeoIPData | null = geoip.lookup(params.ip_address);
                    if (data) {
                        if (!userProps.cc && data.country) {
                            userProps.cc = data.country;
                        }

                        if (!userProps.rgn && data.region) {
                            userProps.rgn = data.region;
                        }

                        if (!userProps.cty && data.city) {
                            userProps.cty = data.city;
                        }

                        if (plugins.getConfig('api', params.app && params.app.plugins, true).city_data === true && !(userProps as any).loc && data.ll && data.ll[0] !== undefined && data.ll[1] !== undefined) {
                            // only override lat/lon if no recent gps location exists in user document
                            if (!params.app_user.loc || (params.app_user.loc.gps && (params.time.mstimestamp || 0) - params.app_user.loc.date > 7 * 24 * 3600)) {
                                (userProps as any).loc = {
                                    gps: false,
                                    geo: {
                                        type: 'Point',
                                        coordinates: [data.ll[1], data.ll[0]]
                                    },
                                    date: params.time.mstimestamp
                                };
                            }
                        }
                    }
                }
                catch (e) {
                    log.e('Error in geoip: %j', e);
                }
            }
            if (!userProps.cc) {
                userProps.cc = "Unknown";
            }
            if (!userProps.cty) {
                userProps.cty = "Unknown";
            }
            if (!userProps.rgn) {
                userProps.rgn = "Unknown";
            }
        }

        if (config.country_data === false) {
            userProps.cc = 'Unknown';
            userProps.cty = 'Unknown';
        }

        if (config.city_data === false) {
            userProps.cty = 'Unknown';
        }

        params.user.country = (userProps.cc as string) || "Unknown";
        params.user.city = (userProps.cty as string) || "Unknown";

        // if we have metrics, let's process metrics
        if (params.qstring.metrics) {
            // Collect all metrics
            const up = usage.returnRequestMetrics(params);
            if (Object.keys(up).length > 0) {
                for (const key in up) {
                    userProps[key] = up[key];
                }
            }
        }


        if (params.qstring.events) {
            let eventCount = 0;
            for (let i = 0; i < params.qstring.events.length; i++) {
                const currEvent = params.qstring.events[i];
                if (currEvent.key === "[CLY]_orientation") {
                    if (currEvent.segmentation && (currEvent.segmentation as any).mode) {
                        userProps.ornt = (currEvent.segmentation as any).mode;
                    }
                }
                if (!(currEvent.key + "").startsWith("[CLY]_")) {
                    eventCount++;
                    currEvent.ce = false;
                }
                else {
                    currEvent.ce = true;
                }
            }
            if (eventCount > 0) {
                if (!update.$inc) {
                    update.$inc = {};
                }

                update.$inc["data.events"] = eventCount;
            }
        }

        // do not write values that are already assigned to user
        for (const key in userProps) {
            if (userProps[key] === params.app_user[key]) {
                delete userProps[key];
            }
        }

        if (Object.keys(userProps).length > 0) {
            update.$set = userProps;
        }

        if (Object.keys(update).length > 0) {
            ob.updates.push(update);
        }
    }
};

export default usage;
