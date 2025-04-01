import { ServerResponse, IncomingMessage } from "http";
import { ObjectId } from "mongodb";
import { Moment } from "moment-timezone";

export namespace Utils {
    // Main request processing object containing all information shared through all the parts of the same request
    export interface Params {
        href: string; // full URL href
        res: ServerResponse; // The HTTP response object
        req: IncomingMessage; // The HTTP request object
        APICallback: (response: any) => void; // API output handler. Which should handle API response
        qstring: Record<string, any>; // all the passed fields either through query string in GET requests or body and query string for POST requests
        apiPath: string; // two top level url path, for example /i/analytics, first two segments from the fullPath
        fullPath: string; // full url path, for example /i/analytics/dashboards
        files: {
            app_image?: {
                path: string; // The temporary path of the uploaded app image file
                name: string; // The original name of the uploaded app image file
                type: string; // The MIME type of the uploaded app image file
                size: number; // The size (in bytes) of the uploaded app image file
            };
        }; // object with uploaded files, available in POST requests which upload files
        cancelRequest: string; // Used for skipping SDK requests, if contains true, then request should be ignored and not processed. Can be set at any time by any plugin, but API only checks for it in beggining after / and /sdk events, so that is when plugins should set it if needed. Should contain reason for request cancelation
        blockResponses?: boolean; // [blockResponses=false] Flag to block responses from being sent
        forceProcessingRequestTimeout?: boolean; // [forceProcessingRequestTimeout=false] Flag to force processing request timeout
        bulk: boolean; // True if this SDK request is processed from the bulk method
        promises: Array<Promise<any>>; // Array of the promises by different events. When all promises are fulfilled, request counts as processed
        ip_address: string; // IP address of the device submitted request, exists in all SDK requests
        user: {
            country: string; // User's country
            city: string; // User's city
            tz?: number; // User's timezone offset (in minutes)
        }; // Data with some user info, like country geolocation, etc from the request, exists in all SDK requests
        app_user: {
            uid: string; // Application user ID
            did: string; // Device ID
            country: string; // User's country
            city: string; // User's city
            tz: number; // User's timezone offset (in minutes)
            custom?: Record<string, any>; // Custom properties for the application user
            ls?: object; // Last session timestamp of the app user
            has_ongoing_session?: boolean; // Flag indicating if the user has an ongoing session
            last_req?: number; // Timestamp of the user's last request
        }; // Document from the app_users collection for current user, exists in all SDK requests after validation
        app_user_id: object; // ID of app_users document for the user, exists in all SDK requests after validation
        app: {
            _id: string; // ID of the app document
            name: string; // Name of the app
            country: string; // Country of the app
            category: string; // Category of the app
            timezone: string; // Timezone of the app
            type: string; // Type of the app
            locked: boolean; // Flag indicating if the app is locked
            plugins: Record<string, any>; // Plugin-specific configuration for the app
        }; // Document for the app sending request, exists in all SDK requests after validation and after validateUserForDataReadAPI validation
        app_id: ObjectId; // ObjectID of the app document, available after validation
        app_cc: string; // Selected app country, available after validation
        appTimezone: string; // Selected app timezone, available after validation
        member: {
            _id: string; // ID of the dashboard user
            global_admin: boolean; // Flag indicating if the user has global admin rights
            auth_token: string; // The authentication token for the user
            locked: boolean; // Flag indicating if the user is locked
            admin_of?: Array<string>; // Array of app IDs the user is an admin of (legacy)
            user_of?: Array<string>; // Array of app IDs the user has user access to (legacy)
            username: string; // Username of the dashboard user
            email: string; // Email address of the dashboard user
            full_name: string; // Full name of the dashboard user
            api_key: string; // API key of the dashboard user
            permission: {
                _: {
                    u: Array<Array<string>>; // Array of arrays containing app IDs the user has user access to
                    a: Array<string>; // Array of app IDs the user has admin access to
                };
                c?: Record<string, { all?: boolean; allowed?: Record<string, any> }>; // Object containing create permissions for specific apps
                r?: Record<string, { all?: boolean; allowed?: Record<string, any> }>; // Object containing read permissions for specific apps
                u?: Record<string, { all?: boolean; allowed?: Record<string, any> }>; // Object containing update permissions for specific apps
                d?: Record<string, { all?: boolean; allowed?: Record<string, any> }>; // Object containing delete permissions for specific apps
            }; // Object containing user's access permissions
            eventList: Record<string, any>; // Object containing event collections with replaced app names
            viewList: Record<string, any>; // Object containing view collections with replaced app names
        }; // All data about dashboard user sending the request, exists on all requests containing api_key, after validation through validation methods
        time: {
            mstimestamp: number; // Request timestamp in milliseconds
            timestamp: number; // Request timestamp in seconds
            yearly: string; // Year in YYYY format
            monthly: string; // Month in YYYY.M format
            daily: string; // Day in YYYY.M.D format
            hourly: string; // Hour in YYYY.M.D.H format
            weekly: number; // Week of the year
            weeklyISO: number; // ISO week of the year
            month: string; // Month in M format
            day: string; // Day in D format
            hour: string; // Hour in H format
        }; // Time object for the request
        request_hash: string; // Hash of the request data
        previous_session?: string; // ID of the user's previous session
        previous_session_start?: number; // Start timestamp of the user's previous session
        request_id: string; // Unique ID for this request
        user_id?: string; // ID of the user making the request
        formDataUrl?: string; // URL encoded form data
        retry_request?: boolean; // Flag indicating if this is a retry of a failed request
        populator?: boolean; // Flag indicating if this request is from the populator
        urlParts: {
            query: Record<string, any>; // Parsed query string as key-value pairs
            pathname: string; // The URL path
            href: string; // The full URL
        }; // Parsed URL parts
        paths: Array<string>; // The URL path split into segments
        output?: (response: any) => void; // Callback function to handle the API response
        waitForResponse?: boolean; // If false, return immediately and do not wait for plugin chain execution to complete
        app_name?: string; // Name of the app
        truncateEventValuesList?: boolean; // [truncateEventValuesList=false] Flag indicating whether to truncate event values list
        session_duration?: number; // Total session duration
        is_os_processed?: boolean; // [is_os_processed=false] Flag indicating if OS and OS version have been processed
        processed_metrics?: Record<string, any>; // Processed metrics data
        dbDateIds?: Record<string, any>; // Object with date IDs for different time periods
        dataTransformed?: boolean; // [dataTransformed=false] Flag indicating if the data is already transformed
        response?: {
            code: number; // HTTP response code
            body: string; // Response body
        };
        defaultValue?: number; // Default value for metrics
    }

    export interface Common {
        escape_html: (string: string, more: boolean) => string;
        encodeCharacters: (str: string) => string;
        decode_html: (string: string) => string;
        log: (module: string) => Logger;
        dbMap: Record<string, string>;
        dbUserMap: Record<string, string>;
        dbUniqueMap: Record<string, string[]>;
        dbEventMap: Record<string, string>;
        config: Record<string, any>;
        moment: Moment;
        crypto: typeof import("crypto");
        os_mapping: Record<string, string>;
        base64: string[];
        dbPromise: (...args: any[]) => Promise<any>;
        getDescendantProp: (obj: object, desc: string) => any;
        isNumber: (n: any) => boolean;
        convertToType: (value: any, preventParsingToNumber?: boolean) => any;
        safeDivision: (dividend: number, divisor: number) => number;
        zeroFill: (number: number, width: number) => string;
        arrayAddUniq: (arr: Array<string | number>, item: string | number | Array<string | number>) => void;
        sha1Hash: (str: string, addSalt?: string) => string;
        sha512Hash: (str: string, addSalt?: string) => string;
        argon2Hash: (str: string) => Promise<string>;
        md5Hash: (str: string) => string;
        fillTimeObject: (params: Params, object: object, property: string, increment?: number) => void;
        initTimeObj: (appTimezone: string, reqTimestamp: number) => TimeObject;
        getDate: (timestamp: number, timezone: string) => Moment;
        getDOY: (timestamp: number, timezone: string) => number;
        getDaysInYear: (year: number) => number;
        getISOWeeksInYear: (year: number) => number;
        validateArgs: (args: object, argProperties: object, returnErrors?: boolean) => object | boolean;
        fixEventKey: (eventKey: string) => string | false;
        blockResponses: (params: Params) => void;
        unblockResponses: (params: Params) => void;
        returnRaw: (params: Params, returnCode: number, body: string, heads: object) => void;
        returnMessage: (params: Params, returnCode: number, message: string | object, heads: object, noResult?: boolean) => void;
        returnOutput: (params: Params, output: object, noescape?: boolean, heads?: object) => void;
        getIpAddress: (req: IncomingMessage) => string;
        recordCustomMetric: (
            params: Params,
            collection: string,
            id: string,
            metrics: string[],
            value?: number,
            segments?: object,
            uniques?: string[],
            lastTimestamp?: number
        ) => void;
        getDateIds: (params: Params) => { zero: string; month: string };
        getDiff: (moment1: Moment, moment2: Moment, measure: string) => number;
        versionCompare: (v1: string, v2: string, options?: { delimiter?: string }) => number;
        adjustTimestampByTimezone: (ts: number, tz: string) => number;
        dot: (obj: object, is: string | string[], value?: any) => any;
        equal: (a: any, b: any, checkFromA?: boolean) => boolean;
        o: (...args: any[]) => object;
        indexOf: (array: Array<any>, property: string, value: any) => number;
        optional: (module: string, options?: { rethrow?: boolean }) => any;
        checkPromise: (func: () => boolean, count: number, interval: number) => Promise<void>;
        updateAppUser: (params: Params, update: object, no_meta?: boolean, callback?: (err: any, res: any) => void) => void;
        processCarrier: (metrics: object) => void;
        parseSequence: (num: number) => string;
        p: (f: (res: Function, rej: Function) => void) => Promise<any>;
        reviver: (key: string, value: any) => any;
        shuffleString: (text: string) => string;
        getRandomValue: (charSet: string, length?: number) => string;
        generatePassword: (length: number, no_special?: boolean) => string;
        checkDatabaseConfigMatch: (apiConfig: object, frontendConfig: object) => boolean;
        sanitizeFilename: (filename: string, replacement?: string) => string;
        sanitizeHTML: (html: string, extendedWhitelist?: object) => string;
        mergeQuery: (ob1: object, ob2: object) => object;
        dbext: {
            ObjectID: (id: string) => ObjectId;
            ObjectId: typeof ObjectId;
            isoid: (id: any) => boolean;
            oid: (id: string | ObjectId | null | undefined) => ObjectId;
            oidWithDate: (date?: Date | number) => ObjectId;
            oidBlankWithDate: (date?: Date | number) => ObjectId;
        };
        DataTable: typeof import("./common").DataTable;
        licenseAssign: (req: any, check: any) => void;
        formatNumber: (x: number) => string;
        formatSecond: (number: number) => string;
        trimWhitespaceStartEnd: (value: any) => any;
    }

    export interface TimeObject {
        now: Moment;
        nowUTC: Moment;
        nowWithoutTimestamp: Moment;
        timestamp: number;
        mstimestamp: number;
        yearly: string;
        monthly: string;
        daily: string;
        hourly: string;
        weekly: number;
        weeklyISO: number;
        month: string;
        day: string;
        hour: string;
    }
}