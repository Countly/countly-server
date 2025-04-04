import { ServerResponse, IncomingMessage } from "http";
import { ObjectId } from "mongodb";
import { TimeObject } from "./common";
/** Application user interface representing a document from the app_users collection */
export interface AppUser {
    /** Application user ID */
    uid: ObjectId;
    /** Device ID */
    did: string;
    /** User's country */
    country: string;
    /** User's city */
    city: string;
    /** User's timezone offset (in minutes) */
    tz: number;
    /** Custom properties for the application user */
    custom?: Record<string, any>;
    /** Last session timestamp of the app user */
    ls?: object;
    /** Flag indicating if the user has an ongoing session */
    has_ongoing_session?: boolean;
    /** Timestamp of the user's last request */
    last_req?: number;
    /** Last GET request URL */
    last_req_get?: string;
    /** Last POST request body */
    last_req_post?: string;
    /** First access timestamp */
    fac?: number;
    /** First seen timestamp */
    fs?: number;
    /** Last access timestamp */
    lac?: number;
    /** SDK information */
    sdk?: {
        /** SDK name */
        name?: string;
        /** SDK version */
        version?: string;
    };
    /** Request count */
    req_count?: number;
    /** Type or token identifier */
    t?: string | number;
    /** Flag indicating if the user has information */
    hasInfo?: boolean;
    /** Information about merged users */
    merges?: any;
}

/** Main request processing object containing all information shared through all the parts of the same request */
export interface Params {
    /** full URL href */
    href: string;
    /** The HTTP response object */
    res: ServerResponse;
    /** The HTTP request object */
    req: IncomingMessage;
    /** API output handler. Which should handle API response */
    APICallback: (error: boolean, response: any, headers?: any, returnCode?: number, params?: Params) => void;
    /** all the passed fields either through query string in GET requests or body and query string for POST requests */
    qstring: Record<string, any>;
    /** two top level url path, for example /i/analytics, first two segments from the fullPath */
    apiPath: string;
    /** full url path, for example /i/analytics/dashboards */
    fullPath: string;
    /** object with uploaded files, available in POST requests which upload files */
    files: {
        app_image?: {
            /** The temporary path of the uploaded app image file */
            path: string;
            /** The original name of the uploaded app image file */
            name: string;
            /** The MIME type of the uploaded app image file */
            type: string;
            /** The size (in bytes) of the uploaded app image file */
            size: number;
        };
    };
    /** Used for skipping SDK requests, if contains true, then request should be ignored and not processed. Can be set at any time by any plugin, but API only checks for it in beggining after / and /sdk events, so that is when plugins should set it if needed. Should contain reason for request cancelation */
    cancelRequest: string;
    /** [blockResponses=false] Flag to block responses from being sent */
    blockResponses?: boolean;
    /** [forceProcessingRequestTimeout=false] Flag to force processing request timeout */
    forceProcessingRequestTimeout?: boolean;
    /** True if this SDK request is processed from the bulk method */
    bulk: boolean;
    /** Array of the promises by different events. When all promises are fulfilled, request counts as processed */
    promises: Array<Promise<any>>;
    /** IP address of the device submitted request, exists in all SDK requests */
    ip_address: string;
    /** Data with some user info, like country geolocation, etc from the request, exists in all SDK requests */
    user: {
        /** User's country */
        country: string;
        /** User's city */
        city: string;
        /** User's timezone offset (in minutes) */
        tz?: number;
    };
    /** Document from the app_users collection for current user, exists in all SDK requests after validation */
    app_user: AppUser;
    /** ID of app_users document for the user, exists in all SDK requests after validation */
    app_user_id: object;
    /** Document for the app sending request, exists in all SDK requests after validation and after validateUserForDataReadAPI validation */
    app: {
        /** ID of the app document */
        _id: string;
        /** Name of the app */
        name: string;
        /** Country of the app */
        country: string;
        /** Category of the app */
        category: string;
        /** Timezone of the app */
        timezone: string;
        /** Type of the app */
        type: string;
        /** Flag indicating if the app is locked */
        locked: boolean;
        /** Plugin-specific configuration for the app */
        plugins: Record<string, any>;
    };
    /** ObjectID of the app document, available after validation */
    app_id: ObjectId;
    /** Selected app country, available after validation */
    app_cc: string;
    /** Selected app timezone, available after validation */
    appTimezone: string;
    /** All data about dashboard user sending the request, exists on all requests containing api_key, after validation through validation methods */
    member: {
        /** ID of the dashboard user */
        _id: string;
        /** Flag indicating if the user has global admin rights */
        global_admin: boolean;
        /** The authentication token for the user */
        auth_token: string;
        /** Flag indicating if the user is locked */
        locked: boolean;
        /** Array of app IDs the user is an admin of (legacy) */
        admin_of?: Array<string>;
        /** Array of app IDs the user has user access to (legacy) */
        user_of?: Array<string>;
        /** Username of the dashboard user */
        username: string;
        /** Email address of the dashboard user */
        email: string;
        /** Full name of the dashboard user */
        full_name: string;
        /** API key of the dashboard user */
        api_key: string;
        /** Object containing user's access permissions */
        permission: {
            _: {
                /** Array of arrays containing app IDs the user has user access to */
                u: Array<Array<string>>;
                /** Array of app IDs the user has admin access to */
                a: Array<string>;
            };
            /** Object containing create permissions for specific apps */
            c?: Record<string, { all?: boolean; allowed?: Record<string, any> }>;
            /** Object containing read permissions for specific apps */
            r?: Record<string, { all?: boolean; allowed?: Record<string, any> }>;
            /** Object containing update permissions for specific apps */
            u?: Record<string, { all?: boolean; allowed?: Record<string, any> }>;
            /** Object containing delete permissions for specific apps */
            d?: Record<string, { all?: boolean; allowed?: Record<string, any> }>;
        };
        /** Object containing event collections with replaced app names */
        eventList: Record<string, any>;
        /** Object containing view collections with replaced app names */
        viewList: Record<string, any>;
    };
    /** Time object for the request */
    time: TimeObject;
    /** Hash of the request data */
    request_hash: string;
    /** ID of the user's previous session */
    previous_session?: string;
    /** Start timestamp of the user's previous session */
    previous_session_start?: number;
    /** Unique ID for this request */
    request_id: string;
    /** ID of the user making the request */
    user_id?: string;
    /** URL encoded form data */
    formDataUrl?: string;
    /** Flag indicating if this is a retry of a failed request */
    retry_request?: boolean;
    /** Flag indicating if this request is from the populator */
    populator?: boolean;
    /** Parsed URL parts */
    urlParts: {
        /** Parsed query string as key-value pairs */
        query: Record<string, any>;
        /** The URL path */
        pathname: string;
        /** The full URL */
        href: string;
    };
    /** The URL path split into segments */
    paths: Array<string>;
    /** Callback function to handle the API response */
    output?: (response: any) => void;
    /** If false, return immediately and do not wait for plugin chain execution to complete */
    waitForResponse?: boolean;
    /** Name of the app */
    app_name?: string;
    /** [truncateEventValuesList=false] Flag indicating whether to truncate event values list */
    truncateEventValuesList?: boolean;
    /** Total session duration */
    session_duration?: number;
    /** [is_os_processed=false] Flag indicating if OS and OS version have been processed */
    is_os_processed?: boolean;
    /** Processed metrics data */
    processed_metrics?: Record<string, any>;
    /** Object with date IDs for different time periods */
    dbDateIds?: Record<string, any>;
    /** [dataTransformed=false] Flag indicating if the data is already transformed */
    dataTransformed?: boolean;
    response?: {
        /** HTTP response code */
        code: number;
        /** Response body */
        body: string;
    };
    /** Default value for metrics */
    defaultValue?: number;
}
