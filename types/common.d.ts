import { Moment } from "moment-timezone";
import { ObjectId } from "mongodb";
import { Params } from "./requestProcessor";
import { PluginManager, Database } from "../plugins/pluginManager";
import { Logger, LogModule } from "./log";
import { CountlyAPIConfig } from "./config";
import { ClickHouseQueryService } from "../plugins/clickhouse/types/clickhouseQueryService";

/** Node.js Request object */
export interface req {
    headers: { [key: string]: string | string[] };
    connection: {
        remoteAddress?: string;
    };
    socket?: {
        remoteAddress?: string;
    };
    ip?: string;
    ips?: string[];
}

/** Generic output object for responses */
export interface output {
    [key: string]: any;
}

export interface TimeObject {   
    /** Momentjs instance for request's time in app's timezone */
    now: Moment;
    /** Momentjs instance for request's time in UTC */
    nowUTC: Moment;
    /** Momentjs instance for current time in app's timezone */
    nowWithoutTimestamp: Moment;
    /** Request's seconds timestamp */
    timestamp: number;
    /** Request's milliseconds timestamp */
    mstimestamp: number;
    /** Year of request time in app's timezone in YYYY format */
    yearly: string;
    /** Month of request time in app's timezone in YYYY.M format */
    monthly: string;
    /** Date of request time in app's timezone in YYYY.M.D format */
    daily: string;
    /** Hour of request time in app's timezone in YYYY.M.D.H format */
    hourly: string;
    /** Week of request time in app's timezone as result day of the year, divided by 7 */
    weekly: number;
    /** Week of request time in app's timezone according to ISO standard */
    weeklyISO: number;
    /** Month of request time in app's timezone in format M */
    month: string;
    /** Day of request time in app's timezone in format D */
    day: string;
    /** Hour of request time in app's timezone in format H */
    hour: string;
}

/** Mapping of common database properties */
export interface DbMap {
    events: string;
    total: string;
    new: string;
    unique: string;
    duration: string;
    durations: string;
    frequency: string;
    loyalty: string;
    sum: string;
    dur: string;
    count: string;
    paying: string;
}

/** Mapping of common user database properties */
export interface DbUserMap {
    device_id: string;
    user_id: string;
    first_seen: string;
    last_seen: string;
    last_payment: string;
    session_duration: string;
    total_session_duration: string;
    session_count: string;
    device: string;
    device_type: string;
    manufacturer: string;
    carrier: string;
    city: string;
    region: string;
    country_code: string;
    platform: string;
    platform_version: string;
    app_version: string;
    app_version_major: string;
    app_version_minor: string;
    app_version_patch: string;
    last_begin_session_timestamp: string;
    last_end_session_timestamp: string;
    has_ongoing_session: string;
    previous_events: string;
    resolution: string;
    has_hinge: string;
}

/** Mapping of common event database properties */
export interface DbEventMap {
    user_properties: string;
    timestamp: string;
    segmentations: string;
    count: string;
    sum: string;
    duration: string;
    previous_events: string;
}

/** Mapping of unique database properties */
export interface DbUniqueMap {
    [key: string]: string[];
}

/** Operating system/platform mappings */
export interface OsMapping {
    [key: string]: string;
}

/** Validation arguments properties */
export interface ValidationArgProperties {
    [key: string]: {
        /** should property be present in args */
        required?: boolean;
        /** what type should property be, possible values: String, Array, Number, URL, Boolean, Object, Email */
        type?: 'String' | 'Array' | 'Number' | 'URL' | 'Boolean' | 'Object' | 'Email' | string;
        /** property should not be longer than provided value */
        'max-length'?: number;
        /** property should not be shorter than provided value */
        'min-length'?: number;
        max?: number;
        min?: number;
        /** should string property has any number in it */
        'has-number'?: boolean;
        /** should string property has any latin character in it */
        'has-char'?: boolean;
        /** should string property has any upper cased latin character in it */
        'has-upchar'?: boolean;
        /** should string property has any none latin character in it */
        'has-special'?: boolean;
        /** allowed values for validation */
        in?: string[] | (() => string[]);
        /** should property be present in returned validated args object */
        'exclude-from-ret-obj'?: boolean;
        /** custom validation function */
        custom?: (value: any) => string | undefined;
        /** regex pattern for validation */
        regex?: string;
        /** should value be non-empty */
        nonempty?: boolean;
        /** should trim whitespace */
        trim?: boolean;
        /** additional modifiers */
        mods?: string;
        /** allow multiple values */
        multiple?: boolean;
        /** array-specific validation options */
        array?: any;
        /** discriminator for validation */
        discriminator?: any;
    };
}

/** Validation result */
export interface ValidationResult {
    result: boolean;
    errors?: string[];
    obj?: Record<string, any>;
}

/** Result of JSON parsing attempt */
export interface JSONParseResult {
    valid: boolean;
    data?: object | undefined;
}

/** Date IDs */
export interface DateIds {
    zero: string;
    month: string;
    [key: string]: string;
}

/** Custom metric properties */
export interface CustomMetricProps {
    /** name of the collections where to store data */
    collection: string;
    /** id to prefix document ids, like app_id or segment id, etc */
    id: string;
    /** object defining metrics to record, using key as metric name and value object for segmentation, unique, etc */    
    metrics: {
        [key: string]: {
            /** value to increment current metric for, default 1 */
            value?: number;
            /** object with segments to record data, key segment name and value segment value or array of segment values */
            segments?: Record<string, string | string[] | number | boolean>;
            /** if metric should be treated as unique, and stored in 0 docs and be estimated on output */
            unique?: boolean;
            /** timestamp in seconds to be used to determine if unique metrics it unique for specific period */
            lastTimestamp?: number;
            /** array of segments that should have hourly data too (by default hourly data not recorded for segments) */
            hourlySegments?: string[];
        };
    };
}

/** Database extensions */
export interface DbExt {
    ObjectID: (id: string | ObjectId) => ObjectId | string;
    ObjectId: typeof ObjectId;
    isoid: (id: any) => boolean;
    oid: (id: string | ObjectId | null | undefined) => ObjectId | null | undefined;
    oidWithDate: (date?: Date | number) => ObjectId;
    oidBlankWithDate: (date?: Date | number) => ObjectId;
}

/**
* Custom API response handler callback
*/
export interface APICallback {
    /**
    * Custom API response handler callback
    * @param {boolean} error - true if there was problem processing request, and false if request was processed successfully 
    * @param {string} responseMessage - what API returns
    * @param {object} headers - what API would have returned to HTTP request
    * @param {number} returnCode - HTTP code, what API would have returned to HTTP request
    * @param {Params} params - request context that was passed to requestProcessor, modified during request processing
    */
    (error: boolean, responseMessage: string, headers: object, returnCode: number, params: Params): void;
}

/** HTML whitelist */
export interface HTMLWhitelist {
    [tag: string]: string[];
}

/**
 * Module for some common utility functions and references
 */
export interface Common {
    /** Reference to plugins */
    plugins: PluginManager;
    
    /**
     * Escape special characters in the given string of html.
     * @param  {string} string - The string to escape for inserting into HTML
     * @param  {boolean} more - if false, escapes only tags, if true escapes also quotes and ampersands
     * @returns {string} escaped string
     **/
    escape_html: (string: string, more?: boolean) => string;

    /**
     * Function to escape unicode characters
     * @param {string} str  - string for which to escape
     * @returns {string} escaped string
     */
    encodeCharacters: (str: string) => string;

    /**
     * Decode escaped html 
     * @param {string} string - The string to decode
     * @returns {string} escaped string
     **/
    decode_html: (string: string) => string;

    /**
     * Encode string for database storage by escaping $ and .
     * @param {string} str - string to encode
     * @returns {string} encoded string
     **/
    dbEncode: (str: string) => string;

    /**
     * Check if string is a valid json
     * @param {string} val - string that might be json encoded
     * @returns {JSONParseResult} with property data for parsed data and property valid to check if it was valid json encoded string or not
     **/
    getJSON: (val: string) => JSONParseResult;

    /**
     * Logger object for creating module-specific logging
     * @type {LogModule}
     * @example
     * const log = common.log('myplugin:api');
     * log.i('myPlugin got a request: %j', params.qstring);
     */
    log: LogModule;

    /**
     * Mapping some common property names from longer understandable to shorter representation stored in database
     */
    dbMap: DbMap;

    /**
     * Mapping some common user property names from longer understandable to shorter representation stored in database
     */
    dbUserMap: DbUserMap;

    /** Mapping unique database properties */
    dbUniqueMap: DbUniqueMap;

    /**
     * Mapping some common event property names from longer understandable to shorter representation stored in database
     */
    dbEventMap: DbEventMap;

    /**
     * Default {@link countlyConfig} object for API server
     */
    config: CountlyAPIConfig;

    /** Reference to moment-timezone which combines moment.js with timezone support */
    moment: typeof import('moment-timezone');

    /**
     * Reference to crypto module
     */
    crypto: typeof import('crypto');

    /**
     * Operating syste/platform mappings from what can be passed in metrics to shorter representations 
     * stored in db as prefix to OS segmented values
     */
    os_mapping: OsMapping;

    /**
     * Whole base64 alphabet for fetching splitted documents
     * @type {Array<string>}
     */
    base64: string[];

    /** Database promise wrapper */
    dbPromise: (collection: string, method: string, ...args: any[]) => Promise<any>;

    /**
     * Fetches nested property values from an obj.
     * @param {object} obj - standard countly metric object
     * @param {string} desc - dot separate path to fetch from object
     * @returns {object} fetched object from provided path
     * @example
     * //outputs {"u":20,"t":20,"n":5}
     * common.getDescendantProp({"2017":{"1":{"2":{"u":20,"t":20,"n":5}}}}, "2017.1.2");
     */
    getDescendantProp: (obj: any, desc: string) => any;

    /**
     * Checks if provided value could be converted to a number, 
     * even if current type is other, as string, as example value "42"
     * @param {any} n - value to check if it can be converted to number
     * @returns {boolean} true if can be a number, false if can't be a number
     * @example
     * common.isNumber(1) //outputs true
     * common.isNumber("2") //outputs true
     * common.isNumber("test") //outputs false
     */
    isNumber: (n: any) => boolean;

    /**
     * This default Countly behavior of type conversion for storing proeprties accepted through API requests
     * dealing with numbers as strings and too long numbers
     * @param {any} value - value to convert to usable type
     * @param {boolean} preventParsingToNumber - do not change value to number (e.g. "1", ["1"]);
     * @returns {any} converted value
     * @example
     * common.convertToType(1) //outputs 1
     * common.convertToType("2") //outputs 2
     * common.convertToType("test") //outputs "test"
     * common.convertToType("12345678901234567890") //outputs "12345678901234567890"
     */
    convertToType: (value: any, preventParsingToNumber?: boolean) => any;

    /**
     * Safe division between numbers providing 0 as result in cases when dividing by 0
     * @param {number} dividend - number which to divide
     * @param {number} divisor - number by which to divide
     * @returns {number} result of division
     * @example
     * //outputs 0
     * common.safeDivision(100, 0);
     */
    safeDivision: (dividend: number, divisor: number) => number;

    /**
     * Pad number with specified character from left to specified length
     * @param {number} number - number to pad
     * @param {number} width - pad to what length in symbols
     * @returns {string} padded number
     * @example
     * //outputs 0012
     * common.zeroFill(12, 4, "0");
     */
    zeroFill: (number: number, width: number) => string;

    /**
     * Add item or array to existing array only if values are not already in original array
     * @param {Array<string|number>} arr - original array where to add unique elements
     * @param {string|number|Array<string|number>} item - item to add or array to merge
     */
    arrayAddUniq: (arr: Array<string | number>, item: string | number | Array<string | number>) => void;

    /**
     * Create HMAC sha1 hash from provided value and optional salt
     * @param {string} str - value to hash
     * @param {string=} addSalt - optional salt, uses ms timestamp by default
     * @returns {string} HMAC sha1 hash
     */
    sha1Hash: (str: string, addSalt?: string) => string;

    /**
     * Create HMAC sha512 hash from provided value and optional salt
     * @param {string} str - value to hash
     * @param {string=} addSalt - optional salt, uses ms timestamp by default
     * @returns {string} HMAC sha1 hash
     */
    sha512Hash: (str: string, addSalt?: string) => string;

    /**
     * Create argon2 hash string
     * @param {string} str - string to hash
     * @returns {Promise<string>} hash promise
     **/
    argon2Hash: (str: string) => Promise<string>;

    /**
     * Create MD5 hash from provided value
     * @param {string} str - value to hash
     * @returns {string} MD5 hash
     */
    md5Hash: (str: string) => string;

    /**
     * Modifies provided object in the format object["2012.7.20.property"] = increment. 
     * Usualy used when filling up Countly metric model data
     * @param {Params} params - {@link Params} object
     * @param {object} object - object to fill
     * @param {string} property - meric value or segment or property to fill/increment
     * @param {number=} increment - by how much to increments, default is 1
     * @returns {void} void
     * @example
     * var obj = {};
     * common.fillTimeObject(params, obj, "u", 1);
     * console.log(obj);
     * //outputs
     * { '2017.u': 1,
     *   '2017.2.u': 1,
     *   '2017.2.23.u': 1,
     *   '2017.2.23.8.u': 1,
     *   '2017.w8.u': 1 }
     */
    fillTimeObject: (params: Params, object: any, property: string, increment?: number) => void;

    /**
     * Creates a time object from request's milisecond or second timestamp in provided app's timezone
     * @param {string} appTimezone - app's timezone
     * @param {string} reqTimestamp - timestamp in the request
     * @returns {TimeObject} Time object for current request
     */
    initTimeObj: (appTimezone: string, reqTimestamp: string | number) => TimeObject;

    /**
     * Creates a Date object from provided seconds timestamp in provided timezone
     * @param {number} timestamp - unix timestamp in seconds
     * @param {string} timezone - name of the timezone
     * @returns {MomentTimezone} moment object for provided time
     */
    getDate: (timestamp: number, timezone: string) => Moment;

    /**
     * Returns day of the year from provided seconds timestamp in provided timezone
     * @param {number} timestamp - unix timestamp in seconds
     * @param {string} timezone - name of the timezone
     * @returns {number} current day of the year
     */
    getDOY: (timestamp: number, timezone: string) => number;

    /**
     * Returns amount of days in provided year
     * @param {number} year - year to check for days
     * @returns {number} number of days in provided year
     */
    getDaysInYear: (year: number) => number;

    /**
     * Returns amount of iso weeks in provided year
     * @param {number} year - year to check for days
     * @returns {number} number of iso weeks in provided year
     */
    getISOWeeksInYear: (year: number) => number;

    /**
     * Validates provided arguments
     * @param {Record<string, any>} args - arguments to validate
     * @param {ValidationArgProperties} argProperties - rules for validating each argument
     * @param {boolean} argProperties.required - should property be present in args
     * @param {string} argProperties.type - what type should property be, possible values: String, Array, Number, URL, Boolean, Object, Email
     * @param {string} argProperties.max-length - property should not be longer than provided value
     * @param {string} argProperties.min-length - property should not be shorter than provided value
     * @param {string} argProperties.exclude-from-ret-obj - should property be present in returned validated args object
     * @param {string} argProperties.has-number - should string property has any number in it
     * @param {string} argProperties.has-char - should string property has any latin character in it
     * @param {string} argProperties.has-upchar - should string property has any upper cased latin character in it
     * @param {string} argProperties.has-special - should string property has any none latin character in it
     * @param {boolean} returnErrors - return error details as array or only boolean result
     * @returns {ValidationResult | Record<string, any> | boolean} validated args in obj property, or false as result property if args do not pass validation and errors array
     */
    validateArgs: (args: Record<string, any>, argProperties: ValidationArgProperties, returnErrors?: boolean) => ValidationResult | Record<string, any> | boolean;

    /**
     * Fix event keys before storing in database by removing dots and $ from the string, removing other prefixes and limiting length
     * @param {string} eventKey - key value to fix
     * @returns {string|false} escaped key or false if not possible to use key at all
     */
    fixEventKey: (eventKey: string) => string | false;

    /**
     * Block {@link module:api/utils/common.returnMessage} and {@link module:api/utils/common.returnOutput} from ouputting anything
     * @param {Params} params - params object
     */
    blockResponses: (params: Params) => void;

    /**
     * Unblock/allow {@link module:api/utils/common.returnMessage} and {@link module:api/utils/common.returnOutput} ouputting anything
     * @param {Params} params - params object
     */
    unblockResponses: (params: Params) => void;

    /**
     * Return raw headers and body
     * @param {Params} params - params object
     * @param {number} returnCode - http code to use
     * @param {string} body - raw data to output
     * @param {object} heads - headers to add to the output
     */
    returnRaw: (params: Params, returnCode: number, body: string, heads?: any) => void;

    /**
     * Output message as request response with provided http code
     * @param {Params} params - params object
     * @param {number} returnCode - http code to use
     * @param {string|object} message - Message to output, will be encapsulated in JSON object under result property
     * @param {object} heads - headers to add to the output
     * @param {boolean} noResult - skip wrapping message object into stupid {result: }
     */
    returnMessage: (params: Params, returnCode: number, message: string | object, heads?: any, noResult?: boolean) => void;

    /**
     * Output message as request response with provided http code
     * @param {Params} params - params object
     * @param {output} output - object to stringify and output
     * @param {string} noescape - prevent escaping HTML entities
     * @param {object} heads - headers to add to the output
     */
    returnOutput: (params: Params, output: output, noescape?: string, heads?: object) => void;

    /**
     * Get IP address from request object
     * @param {req} req - nodejs request object
     * @returns {string} ip address
     */
    getIpAddress: (req: req) => string;

    /**
     * Modifies provided object filling properties used in zero documents in the format object["2012.7.20.property"] = increment. 
     * Usualy used when filling up Countly metric model zero document
     * @param {Params} params - {@link params} object
     * @param {object} object - object to fill
     * @param {string} property - meric value or segment or property to fill/increment
     * @param {number=} increment - by how much to increments, default is 1
     * @param {boolean=} isUnique - if property is unique
     * @returns {boolean} void
     * @example
     * var obj = {};
     * common.fillTimeObjectZero(params, obj, "u", 1);
     * console.log(obj);
     * //outputs
     * { 'd.u': 1, 'd.2.u': 1, 'd.w8.u': 1 }
     */
    fillTimeObjectZero: (params: Params, object: any, property: string, increment?: number, isUnique?: boolean) => boolean;

    /**
     * Modifies provided object filling properties used in monthly documents in the format object["2012.7.20.property"] = increment. 
     * Usualy used when filling up Countly metric model monthly document
     * @param {Params} params - {@link params} object
     * @param {object} object - object to fill
     * @param {string} property - meric value or segment or property to fill/increment
     * @param {number=} increment - by how much to increments, default is 1
     * @param {boolean=} forceHour - force recording hour information too, dfault is false
     * @returns {boolean} (placeholder description to satisfy jsdoc)
     * @example
     * var obj = {};
     * common.fillTimeObjectMonth(params, obj, "u", 1);
     * console.log(obj);
     * //outputs
     * { 'd.23.u': 1, 'd.23.12.u': 1 }
     */
    fillTimeObjectMonth: (params: Params, object: any, property: string, increment?: number, forceHour?: boolean) => boolean;

    /**
     * Record data in Countly standard metric model
     * Can be used by plugins to record data, similar to sessions and users, with optional segments
     * @param {Params} params - {@link params} object
     * @param {string} collection - name of the collections where to store data
     * @param {string} id - id to prefix document ids, like app_id or segment id, etc
     * @param {Array<string>} metrics - array of metrics to record, as ["u","t", "n"]
     * @param {number=} value - value to increment all metrics for, default 1
     * @param {object} segments - object with segments to record data, key segment name and value segment value
     * @param {Array<string>} uniques - names of the metrics, which should be treated as unique, and stored in 0 docs and be estimated on output
     * @param {number} lastTimestamp - timestamp in seconds to be used to determine if unique metrics it unique for specific period
     * @example
     * //recording attribution
     * common.recordCustomMetric(params, "campaigndata", campaignId, ["clk", "aclk"], 1, {pl:"Android", brw:"Chrome"}, ["clk"], user["last_click"]);
     */
    recordCustomMetric: (params: Params, collection: string, id: string, metrics: string[], value?: number, segments?: any, uniques?: string[], lastTimestamp?: number) => void;

    /**
     * Sets passed value in standart model. If there is any value for that date - it gets replaced with new value.
     * Can be used by plugins to record data, similar to sessions and users, with optional segments
     * @param {Params} params - {@link params} object
     * @param {string} collection - name of the collections where to store data
     * @param {string} id - id to prefix document ids, like app_id or segment id, etc
     * @param {Array<string>} metrics - array of metrics to record, as ["u","t", "n"]
     * @param {number=} value - value to increment all metrics for, default 1
     * @param {object} segments - object with segments to record data, key segment name and value segment value
     * @param {Array<string>} uniques - names of the metrics, which should be treated as unique, and stored in 0 docs and be estimated on output
     * @param {number} lastTimestamp - timestamp in seconds to be used to determine if unique metrics it unique for specific period
     * @example
     * //recording attribution
     * common.recordCustomMetric(params, "campaigndata", campaignId, ["clk", "aclk"], 1, {pl:"Android", brw:"Chrome"}, ["clk"], user["last_click"]);
     */
    setCustomMetric: (params: Params, collection: string, id: string, metrics: string[], value?: number, segments?: any, uniques?: string[], lastTimestamp?: number) => void;

    /**
     * Record measurement in Countly standard metric model
     * Can be used by plugins to record measurements, similar to temperature, it will record min/max/avg values
     * Does not support unique values like users
     * @param {Params} params - {@link params} object
     * @param {string} collection - name of the collections where to store data
     * @param {string} id - id to prefix document ids, like app_id or segment id, etc
     * @param {Array<string>} metrics - array of metrics to record, as ["u","t", "n"]
     * @param {number=} value - value to increment all metrics for, default 1
     * @param {object} segments - object with segments to record data, key segment name and value segment value
     * @example
     * //recording attribution
     * common.recordCustomMeasurement(params, "campaigndata", campaignId, ["clk", "aclk"], 1, {pl:"Android", brw:"Chrome"});
     */
    recordCustomMeasurement: (params: Params, collection: string, id: string, metrics: string[], value?: number, segments?: any) => void;

    /**
     * Record data in Countly standard metric model
     * Can be used by plugins to record data, similar to sessions and users, with optional segments
     * @param {Params} params - {@link params} object
     * @param {object} props - object defining what to record
     * @param {string} props.collection - name of the collections where to store data
     * @param {string} props.id - id to prefix document ids, like app_id or segment id, etc
     * @param {object} props.metrics - object defining metrics to record, using key as metric name and value object for segmentation, unique, etc
     * @param {number=} props.metrics[].value - value to increment current metric for, default 1
     * @param {object} props.metrics[].segments - object with segments to record data, key segment name and value segment value or array of segment values
     * @param {boolean} props.metrics[].unique - if metric should be treated as unique, and stored in 0 docs and be estimated on output
     * @param {number} props.metrics[].lastTimestamp - timestamp in seconds to be used to determine if unique metrics it unique for specific period
     * @param {Array<string>} props.metrics[].hourlySegments - array of segments that should have hourly data too (by default hourly data not recorded for segments)
     * @example
     * //recording attribution
     * common.recordCustomMetric(params, "campaigndata", campaignId, ["clk", "aclk"], 1, {pl:"Android", brw:"Chrome"}, ["clk"], user["last_click"]);
     */
    recordMetric: (params: Params, props: CustomMetricProps) => void;

    /**
     * Alias for internal recordMetric function - records specific metric
     * @param {Params} params - params object
     * @param {string} metric - metric to record
     * @param {object} props - properties of a metric defining how to record it
     * @param {object} tmpSet - object with already set meta properties
     * @param {object} updateUsersZero - object with already set update for zero docs
     * @param {object} updateUsersMonth - object with already set update for months docs
     */
    collectMetric: (params: Params, metric: string, props: any, tmpSet: any, updateUsersZero: any, updateUsersMonth: any) => void;

    /**
     * Get object of date ids that should be used in fetching standard metric model documents
     * @param {Params} params - {@link params} object
     * @returns {object} with date ids, as {zero:"2017:0", month:"2017:2"}
     */
    getDateIds: (params: Params) => DateIds;

    /**
     * Get diference between 2 momentjs instances in specific measurement
     * @param {MomentTimezone} moment1 - momentjs with start date
     * @param {MomentTimezone} moment2 - momentjs with end date
     * @param {string} measure - units of difference, can be minutes, hours, days, weeks
     * @returns {number} difference in provided units
     */
    getDiff: (moment1: Moment, moment2: Moment, measure: string) => number;

    /**
     * Compares two version strings with : as delimiter (which we used to escape dots in app versions)
     * @param {string} v1 - first version
     * @param {string} v2 - second version
     * @param {object} options - providing additional options
     * @param {string} options.delimiter - delimiter between version, subversion, etc, defaults :
     * @returns {number} 0 if they are both the same, 1 if first one is higher and -1 is second one is higher
     */
    versionCompare: (v1: string, v2: string, options: { delimiter: string }) => number;

    /**
     * Parses an application version string into its semantic versioning components.
     * Uses the semver library to extract major, minor, and patch numbers.
     *
     * @param version - The version string or number to parse
     * @returns Object containing parsed version components and metadata
     *
     * @example
     * // Returns { major: 1, minor: 2, patch: 3, original: "1.2.3", success: true }
     * parseAppVersion("1.2.3");
     *
     * @example
     * // Returns { major: 2, minor: 0, patch: 0, original: "2", success: true }
     * parseAppVersion(2);
     *
     * @example
     * // Returns { original: "invalid", success: false }
     * parseAppVersion("invalid");
     */
    parseAppVersion: (version: string | number) => {
        major?: number;
        minor?: number;
        patch?: number;
        prerelease?: string|number[];
        build?: string|number[];
        original: string;
        success: boolean;
    };


    /**
     * Checks if a version string follows either semantic versioning (semver) or "half semver" schemes.
     * Semantic versioning follows the pattern: MAJOR.MINOR.PATCH[-PRERELEASE][+BUILD]
     * Half semver follows the pattern: MAJOR.MINOR[-PRERELEASE][+BUILD]
     *
     * @param inpVersion - The version string to check
     * @returns A tuple containing:
     *   - RegExp execution result or null if no match
     *   - String indicating the matched scheme: "semver", "halfSemver", or null if no match
     *
     * @example
     * // Returns [RegExpExecArray, "semver"]
     * checkAppVersion("1.2.3");
     *
     * @example
     * // Returns [RegExpExecArray, "halfSemver"]
     * checkAppVersion("1.2");
     *
     * @example
     * // Returns [RegExpExecArray, "semver"]
     * checkAppVersion("1.2.3-beta.1+build.123");
     *
     * @example
     * // Returns [null, null]
     * checkAppVersion("not.a.version");
     */
    checkAppVersion: (
        inpVersion: string
    ) => [RegExpExecArray | null, "semver" | "halfSemver" | null];

    /**
     * Transforms a version string to ensure correct numerical sorting.
     * Adds 100000 to each numeric version part to ensure proper string-based comparisons.
     * For example, "1.10.2" becomes "100001.100010.100002", which will sort correctly after "1.2.0".
     *
     * @param inpVersion - An application version string to transform
     * @returns The transformed version string for correct sorting
     *
     * @example
     * // Returns "100001.100010.100002"
     * transformAppVersion("1.10.2");
     *
     * @example
     * // Returns "100001.100002.100000"
     * transformAppVersion("1.2.0");
     *
     * @example
     * // Returns "100002.100000.100000"
     * transformAppVersion("2.0.0");
     *
     * @example
     * // Returns "100001.100002-beta.1"
     * transformAppVersion("1.2-beta.1");
     *
     * @example
     * // Returns the input if it doesn't follow a recognized scheme
     * transformAppVersion("not.a.version");
     */
    transformAppVersion: (inpVersion: string) => string;

    /**
     * Adjust timestamp with app's timezone for timestamp queries that should equal bucket results
     * @param {number} ts - miliseconds timestamp
     * @param {string} tz - timezone
     * @returns {number} adjusted timestamp for timezone
     */
    adjustTimestampByTimezone: (ts: number, tz: string) => number;

    /**
     * Getter/setter for dot notatons:
     * @param {object} obj - object to use
     * @param {string | string[]} is - path of properties to get
     * @param {any} value - value to set
     * @returns {any} value at provided path
     * @example
     * common.dot({a: {b: {c: 'string'}}}, 'a.b.c') === 'string'
     * common.dot({a: {b: {c: 'string'}}}, ['a', 'b', 'c']) === 'string'
     * common.dot({a: {b: {c: 'string'}}}, 'a.b.c', 5) === 5
     * common.dot({a: {b: {c: 'string'}}}, 'a.b.c') === 5
     */
    dot: (obj: object, is: string | string[], value: any) => any;

    /**
     * Not deep object and primitive type comparison function
     * 
     * @param  {any} a object to compare
     * @param  {any} b object to compare
     * @param  {boolean} checkFromA true if check should be performed agains keys of a, resulting in true even if b has more keys
     * @return {boolean} true if objects are equal, false if different types or not equal
     */
    equal: (a: any, b: any, checkFromA: boolean) => boolean;

    /**
     * Returns plain object with key set to value
     * @param {any} arguments - every odd value will be used as key and every event value as value for odd key
     * @returns {object} new object with set key/value properties
     */
    o: (...args: any[]) => any;

    /**
     * Return index of array with objects where property = value
     * @param {Array<string>} array - array where to search value
     * @param {string} property - property where to look for value
     * @param {any} value - value you are searching for
     * @returns {number} index of the array
     */
    indexOf: (array: any[], property: string, value: any) => number;

    /**
     * Optionally load module if it exists
     * @param {string} module - module name
     * @param {object} options - additional opeitons
     * @param {boolean} options.rethrow - throw exception if there is some other error
     * @returns {number} index of the array
     */
    optional: (module: string, options: { rethrow: boolean }) => any;

    /**
     * Create promise for function which result should be checked periodically
     * @param {function} func - function to run when verifying result, should return true if success
     * @param {number} count - how many times to run the func before giving up, if result is always negative
     * @param {number} interval - how often to retest function on negative result in miliseconds
     * @returns {Promise} promise for checking task
     */
    checkPromise: (func: () => boolean, count: number, interval: number) => Promise<void>;

    /** [Functionality Needs to be documented] */
    clearClashingQueryOperations: (query: any) => any;

    /**
     * Single method to update app_users document for specific user for SDK requests
     * @param {Params} params - params object
     * @param {object} update - update query for mongodb, should contain operators on highest level, as $set or $unset
     * @param {boolean} no_meta - if true, won't update some auto meta data, like first api call, last api call, etc.
     * @param {function} callback - function to run when update is done or fails, passing error and result as arguments
     */
    updateAppUser: (params: Params, update: any, no_meta: boolean | Function, callback: Function) => void;

    /**
     * Update carrier from metrics to convert mnc/mcc code to carrier name
     * @param {object} metrics - metrics object from SDK request
     */
    processCarrier: (metrics: any) => void;

    /**
     * Parse Sequence
     * @param {number} num - sequence number for id
     * @returns {string} converted to base 62 number
     */
    parseSequence: (num: number) => string;

    /**
     * Promise that tries to catch errors
     * @param  {function} f function which is usually passed to Promise constructor
     * @return {Promise}   Promise with constructor catching errors by rejecting the promise
     */
    p: (f: (resolve: (value?: any) => void, reject: (reason?: any) => void) => void) => Promise<any>;

    /**
     * Revive json encoded data, as for example, regular expressions
     * @param {string} key - key of json object
     * @param {any} value - value of json object
     * @returns {any} modified value, if it had revivable data
     */
    reviver: (key: string, value: any) => any;

    /**
     * Shuffle string using getRandomValues
     * @param {Array<string>} text - text to be shuffled
     * @returns {string} shuffled password
     */
    shuffleString: (text: string[]) => string;

    /**
     * Gets a random string from given character set string with given length
     * @param {string} charSet - charSet string
     * @param {number} length - length of the random string. default 1 
     * @returns {string} random string from charset
     */
    getRandomValue: (charSet: string, length?: number) => string;

    /**
    * Generate random password
    * @param {number} length - length of the password
    * @param {boolean} no_special - do not include special characters
    * @returns {string} password
    * @example
    * //outputs 4UBHvRBG1v
    * common.generatePassword(10, true);
    */
    generatePassword: (length: number, no_special?: boolean) => string;

    /**
     * Check db host match for both of API and Frontend config
     * @param {object} apiConfig - mongodb object from API config
     * @param {object} frontendConfig - mongodb object from Frontend config
     * @returns {boolean} isMatched - is config correct?  
     */
    checkDatabaseConfigMatch: (apiConfig: any, frontendConfig: any) => boolean;

    /**
     * Sanitizes a filename to prevent directory traversals and such.
     * @param {string} filename - filename to sanitize
     * @param {string} replacement - string to replace characters to be removed
     * @returns {string} sanitizedFilename - sanitized filename
     */
    sanitizeFilename: (filename: string, replacement?: string) => string;

    /** Sanitizes html content by allowing only safe tags */
    sanitizeHTML: (html: string, extendedWhitelist?: HTMLWhitelist) => string;

    /**
     *  Merge 2 mongodb update queries
     *  @param {object} ob1 - existing database update query
     *  @param {object} ob2 - addition to database update query
     *  @returns {object} merged database update query
     */
    mergeQuery: (ob1: any, ob2: any) => any;

    /**
     * DB-related extensions / functions
     */
    dbext: DbExt;

    /**
     * Sync license check results to request (and session if present)
     * 
     * @param {object} req request
     * @param {object|undefined} check check results
     */
    licenseAssign: (req: any, check?: { error?: any, notify?: any[] }) => void;

    /**
     * Standard number formatter, taken from frontend's countly.common.js
     * @memberof countlyCommon
     * @param {number} x - number to format
     * @returns {string} formatted number
     * @example
     * //outputs 1,234,567
     * countlyCommon.formatNumber(1234567);
     */
    formatNumber: (x: number) => string;

    /**
     * Second formatter
     * @param {number} number - number of seconds to format
     * @returns {string} formatted seconds
     */
    formatSecond: (number: number) => string;

    /**
     * Remove spaces, tabs, and newlines from the start and end from all levels of a nested object
     * @param {any} value - Arbitrary value
     * @returns {any} Trimmed value
     */
    trimWhitespaceStartEnd: (value: any) => any;

    /**
     * Apply unique estimation on model data
     * @param {any} model - model object to apply unique data to
     * @param {any} uniqueData - unique estimation data
     * @param {string} prop - property name to apply unique data for
     * @param {string} segment - segment name if applying for segment
     */
    applyUniqueOnModel: (model: any, uniqueData: any, prop: string, segment?: string) => void;

    /**
     * Shift hourly data by timezone offset
     * @param {any} data - data object to shift
     * @param {number} offset - timezone offset in hours
     * @param {string} field - field name to use for shifting, defaults to "_id"
     * @returns {any} shifted data
     */
    shiftHourlyData: (data: any, offset: number, field?: string) => any;

    /**
     * Convert model object to array format
     * @param {any} model - model object to convert
     * @param {boolean} segmented - if model is segmented
     * @returns {any[]} converted array
     */
    convertModelToArray: (model: any, segmented?: boolean) => any[];

    /**
     * Convert array to model object format
     * @param {any[]} arr - array to convert
     * @param {boolean} segmented - if array is segmented
     * @param {string[]} props - properties to include in model
     * @returns {any} converted model object
     */
    convertArrayToModel: (arr: any[], segmented?: boolean, props?: string[]) => any;

    /** DataTable class for server-side processing */
    DataTable: any;

    /** Write batcher */
    writeBatcher: {
        add: (collection: string, id: string, update: any) => void;
    };

    /** Database reference */
    db: Database;

    /** Database connection for output */
    outDb: Database; 

    /** Database connection for drill queries */
    drillDb: Database;

    /** Request processor function */
    processRequest?: any;

    /** Read batcher */
    readBatcher?: import('./batcher').ReadBatcher;

    /** Insert batcher */
    insertBatcher?: any;

    /** Drill read batcher */
    drillReadBatcher?: any;

    /** Job runners */
    runners?: any;

    /** Cache instance */
    cache?: any;

    /** Cached schema */
    cachedSchema?: {
        [appId: string]: {
            loading: boolean;
            ts: number;
        };
    };

    /** Collection mapping */
    collectionMap?: {
        [hash: string]: {
            a: string;           // app id
            e?: string;          // event name (for events)
            vs?: string;         // view segment (for views)  
            name: string;        // display name
        };
    };

    /** ClickHouse query service instance */
    clickhouseQueryService?: ClickHouseQueryService;

}

/** Default export of common module */
declare const common: Common;
export default common;
