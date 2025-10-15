import { Params } from "./common";
import { ObjectId } from "mongodb";
import { Logger } from "./log";
import { IncomingMessage, ServerResponse } from "http";
import { Moment } from "moment";
import { pluginManager } from "../../plugins/pluginManager";

/**
 * Callback for API responses
 * @callback APICallback
 * @param {Error|null} err - Error object if there was an error, null otherwise
 * @param {any} data - Response data
 * @param {Record<string, string>} headers - Response headers
 * @param {number} returnCode - HTTP status code
 * @param {Params} params - Request parameters
 */
export type APICallback = (
  err: Error | null,
  data: any,
  headers: Record<string, string>,
  returnCode: number,
  params: RequestParams
) => void;

/**
 * Interface for the Countly API structure
 */
export interface CountlyApi {
  /** Data-related API endpoints */
  data: {
    /** Usage-related endpoints */
    usage: {
      /**
       * Processes a write API request
       * @param params - Request parameters
       */
      processRequest: (params: Params) => void;
    };
    /** Data fetching endpoints */
    fetch: {
      /**
       * Fetches data based on request parameters
       * @param params - Request parameters
       */
      fetchData: (params: Params) => void;
      /**
       * Fetches time data
       * @param params - Request parameters
       */
      fetchTimeData: (params: Params) => void;
      /**
       * Fetches collection data
       * @param params - Request parameters
       */
      fetchCollection: (params: Params) => void;
    };
    /** Event-related endpoints */
    events: {
      /**
       * Fetches events
       * @param params - Request parameters
       */
      fetchEvents: (params: Params) => void;
      /**
       * Fetches event overview
       * @param params - Request parameters
       */
      fetchOverview: (params: Params) => void;
      /**
       * Fetches event details
       * @param params - Request parameters
       */
      fetchEventDetails: (params: Params) => void;
    };
    /** Export-related endpoints */
    exports: {
      /**
       * Exports data
       * @param params - Request parameters
       */
      exportData: (params: Params) => void;
    };
    /** Geo data-related endpoints */
    geoData: {
      /**
       * Fetches geo data
       * @param params - Request parameters
       */
      fetchGeoData: (params: Params) => void;
    };
  };
  /** Management-related API endpoints */
  mgmt: {
    /** User management endpoints */
    users: {
      /**
       * Creates a new user
       * @param params - Request parameters
       */
      createUser: (params: Params) => void;
      /**
       * Updates an existing user
       * @param params - Request parameters
       */
      updateUser: (params: Params) => void;
      /**
       * Deletes a user
       * @param params - Request parameters
       */
      deleteUser: (params: Params) => void;
      /**
       * Deletes the user's own account
       * @param params - Request parameters
       */
      deleteOwnAccount: (params: Params) => void;
      /**
       * Updates home settings for a user
       * @param params - Request parameters
       */
      updateHomeSettings: (params: Params) => void;
      /**
       * Acknowledges a notification
       * @param params - Request parameters
       */
      ackNotification: (params: Params) => void;
      /**
       * Saves a note
       * @param params - Request parameters
       */
      saveNote: (params: Params) => void;
      /**
       * Deletes a note
       * @param params - Request parameters
       */
      deleteNote: (params: Params) => void;
    };
    /** App management endpoints */
    apps: {
      /**
       * Creates a new app
       * @param params - Request parameters
       */
      createApp: (params: Params) => void;
      /**
       * Updates an existing app
       * @param params - Request parameters
       */
      updateApp: (params: Params) => void;
      /**
       * Deletes an app
       * @param params - Request parameters
       */
      deleteApp: (params: Params) => void;
      /**
       * Resets an app
       * @param params - Request parameters
       */
      resetApp: (params: Params) => void;
    };
    /** App user management endpoints */
    appUsers: {
      /**
       * Creates a new app user
       * @param appId - App ID
       * @param data - User data
       * @param params - Request parameters
       * @param callback - Callback function
       */
      create: (
        appId: string,
        data: Record<string, any>,
        params: Params,
        callback: (err: Error | string | null, result?: any) => void
      ) => void;
    };
    /** Event group management endpoints */
    eventGroups: {
      /**
       * Creates a new event group
       * @param params - Request parameters
       */
      createEventGroup: (params: Params) => void;
      /**
       * Updates an existing event group
       * @param params - Request parameters
       */
      updateEventGroup: (params: Params) => void;
      /**
       * Deletes an event group
       * @param params - Request parameters
       */
      deleteEventGroup: (params: Params) => void;
    };
    /** CMS management endpoints */
    cms: {
      /**
       * Creates a new CMS entry
       * @param params - Request parameters
       */
      createCMS: (params: Params) => void;
      /**
       * Updates an existing CMS entry
       * @param params - Request parameters
       */
      updateCMS: (params: Params) => void;
      /**
       * Deletes a CMS entry
       * @param params - Request parameters
       */
      deleteCMS: (params: Params) => void;
    };
    /** Date preset management endpoints */
    datePresets: {
      /**
       * Creates a new date preset
       * @param params - Request parameters
       */
      createDatePreset: (params: Params) => void;
      /**
       * Updates an existing date preset
       * @param params - Request parameters
       */
      updateDatePreset: (params: Params) => void;
      /**
       * Deletes a date preset
       * @param params - Request parameters
       */
      deleteDatePreset: (params: Params) => void;
    };
  };
}

/**
 * Options for DataTable
 */
export interface Options {
  /** Order of columns */
  columnOrder?: string[];
  /** Default sorting configuration */
  defaultSorting?: Record<string, 1 | -1>;
  /** Fields that can be searched */
  searchableFields?: string[];
  /** Search strategy to use */
  searchStrategy?: "regex" | "hard";
  /** Projection for output */
  outputProjection?: Record<string, 0 | 1>;
  /** Default output format */
  defaultOutputFormat?: "full" | "rows";
  /** Unique key for the data */
  uniqueKey?: string;
  /** Whether to disable unique sorting */
  disableUniqueSorting?: boolean;
}

/**
 * DataTable class for handling tabular data
 */
export class DataTable {
  /**
   * Creates a new DataTable instance
   * @param queryString - Query string parameters
   * @param options - DataTable options
   */
  constructor(queryString: Record<string, any>, options?: Options);

  /**
   * Gets the aggregation pipeline for MongoDB
   * @param options - Pipeline options
   * @returns MongoDB aggregation pipeline
   */
  getAggregationPipeline(options?: {
    /** Initial pipeline stages */
    initialPipeline?: Record<string, any>[];
    /** Filtered pipeline stages */
    filteredPipeline?: Record<string, any>[];
    /** Custom facets */
    customFacets?: Record<string, any>;
  }): Record<string, any>[];

  /**
   * Processes the query result
   * @param queryResult - Result from MongoDB query
   * @param processFn - Function to process rows
   * @returns Processed result
   */
  getProcessedResult(
    queryResult: any,
    processFn?: (rows: any[]) => any
  ): Record<string, any>;

  /**
   * Gets the search field
   * @private
   * @returns Search field configuration
   */
  private _getSearchField(): Record<string, any>;
}

/**
 * Extensions to MongoDB for Countly
 */
export interface CommonDbExt {
  /**
   * Creates a MongoDB ObjectID from a string
   * @param id - ID string
   * @returns MongoDB ObjectID
   */
  ObjectID(id: string): ObjectId;

  /** MongoDB ObjectId constructor */
  ObjectId: typeof ObjectId;

  /**
   * Checks if a value is a valid MongoDB ObjectID
   * @param id - Value to check
   * @returns Whether the value is a valid ObjectID
   */
  isoid(id: any): boolean;

  /**
   * Converts a value to a MongoDB ObjectID if possible
   * @param id - Value to convert
   * @returns MongoDB ObjectID or the original value
   */
  oid(
    id: string | ObjectId | null | undefined
  ): ObjectId | string | null | undefined;

  /**
   * Creates a MongoDB ObjectID with a specific date
   * @param date - Date to use
   * @returns MongoDB ObjectID
   */
  oidWithDate(date?: Date | number): ObjectId;

  /**
   * Creates a MongoDB ObjectID with a specific date and blank identifier
   * @param date - Date to use
   * @returns MongoDB ObjectID
   */
  oidBlankWithDate(date?: Date | number): ObjectId;
}

/**
 * Function to process a request
 */
export interface ProcessRequest {
  /**
   * Processes a request
   * @param params - Request parameters
   */
  (params: RequestParams): void;
}

/**
 * Function to validate an app for write API
 */
export interface ValidateAppForWriteAPI {
  /**
   * Validates an app for write API
   * @param params - Request parameters
   * @param done - Callback function
   * @param try_times - Number of retry attempts
   */
  (params: RequestParams, done: () => void, try_times?: number): void;
}

/**
 * Function to restart a request
 */
export interface RestartRequest {
  /**
   * Restarts a request
   * @param params - Request parameters
   * @param initiator - Validation function
   * @param done - Callback function
   * @param try_times - Number of retry attempts
   * @param fail - Failure callback
   */
  (
    params: RequestParams,
    initiator: ValidateAppForWriteAPI,
    done: () => void,
    try_times: number,
    fail: (reason: string) => void
  ): void;
}

/**
 * Function to process a user
 */
export interface ProcessUser {
  /**
   * Processes a user
   * @param params - Request parameters
   * @param initiator - Validation function
   * @param done - Callback function
   * @param try_times - Number of retry attempts
   * @returns Promise
   */
  (
    params: RequestParams,
    initiator: ValidateAppForWriteAPI,
    done: () => void,
    try_times: number
  ): Promise<any>;
}

/**
 * Function to validate an app for fetch API
 */
export interface ValidateAppForFetchAPI {
  /**
   * Validates an app for fetch API
   * @param params - Request parameters
   * @param done - Callback function
   * @param try_times - Number of retry attempts
   */
  (params: RequestParams, done: () => void, try_times?: number): void;
}

/**
 * Function to process a bulk request
 */
export interface ProcessBulkRequest {
  /**
   * Processes a bulk request
   * @param i - Current request index
   * @param requests - Array of requests
   * @param params - Request parameters
   */
  (i: number, requests: any[], params: RequestParams): void;
}

/**
 * Function to process request data
 */
export interface ProcessRequestData {
  /**
   * Processes request data
   * @param params - Request parameters
   * @param app - App object
   * @param done - Callback function
   */
  (params: RequestParams, app: Record<string, any>, done: () => void): void;
}

/**
 * Function to process a fetch request
 */
export interface ProcessFetchRequest {
  /**
   * Processes a fetch request
   * @param params - Request parameters
   * @param app - App object
   * @param done - Callback function
   */
  (params: RequestParams, app: Record<string, any>, done: () => void): void;
}

/**
 * Function to verify checksum salt
 */
export interface ChecksumSaltVerification {
  /**
   * Verifies checksum salt
   * @param params - Request parameters
   * @returns Whether verification passed
   */
  (params: RequestParams): boolean;
}

/**
 * Function to validate redirect
 */
export interface ValidateRedirect {
  /**
   * Validates a redirect
   * @param ob - Object to validate
   * @returns Validation result
   */
  (ob: Record<string, any>): boolean;
}

/**
 * Function to fetch an app user
 */
export interface FetchAppUser {
  /**
   * Fetches an app user
   * @param params - Request parameters
   * @returns Promise
   */
  (params: RequestParams): Promise<void>;
}

/**
 * Function to ignore possible devices
 */
export interface IgnorePossibleDevices {
  /**
   * Ignores possible devices
   * @param params - Request parameters
   * @returns Whether devices should be ignored
   */
  (params: RequestParams): boolean;
}

/**
 * Function to reload configuration
 */
export interface ReloadConfig {
  /**
   * Reloads configuration
   * @returns Promise
   */
  (): Promise<void>;
}

/** Process request function */

/**
 * Time object for request processing
 */
export interface TimeObject {
  /** momentjs instance for request's time in app's timezone */
  now: Moment;
  /** momentjs instance for request's time in UTC */
  nowUTC: Moment;
  /** momentjs instance for current time in app's timezone */
  nowWithoutTimestamp: Moment;
  /** request's seconds timestamp */
  timestamp: number;
  /** Request timestamp in milliseconds */
  mstimestamp: number;
  /** year of request time in app's timezone in YYYY format */
  yearly: string;
  /** month of request time in app's timezone in YYYY.M format */
  monthly: string;
  /** date of request time in app's timezone in YYYY.M.D format */
  daily: string;
  /** hour of request time in app's timezone in YYYY.M.D.H format */
  hourly: string;
  /** week of request time in app's timezone as result day of the year, divided by 7 */
  weekly: number;
  /** Other time-related properties */
  [key: string]: any;
}

/**
 * Main request processing object containing all information shared through all the parts of the same request
 */
export interface RequestParams extends Params {
  /** Full URL href */
  href: string;
  /** The HTTP response object */
  res: ServerResponse;
  /** The HTTP request object */
  req: IncomingMessage & {
    /** Request body */
    body?: any;
    /** Request URL */
    url?: string;
    /** Request method */
    method?: string;
    /** Request headers */
    headers?: Record<string, string>;
    /** Request socket */
    socket?: any;
    /** Request connection */
    connection?: any;
  };
  /** API output handler. Which should handle API response */
  APICallback?: APICallback;
  /** All the passed fields either through query string in GET requests or body and query string for POST requests */
  qstring: Record<string, any>;
  /** Two top level url path, for example /i/analytics, first two segments from the fullPath */
  apiPath: string;
  /** Full url path, for example /i/analytics/dashboards */
  fullPath: string;
  /** Object with uploaded files, available in POST requests which upload files */
  files?: {
    /** Uploaded app image file */
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
    [key: string]: any;
  };
  /** Used for skipping SDK requests, if contains true, then request should be ignored and not processed */
  cancelRequest?: string;
  /** Flag to block responses from being sent */
  blockResponses?: boolean;
  /** Flag to force processing request timeout */
  forceProcessingRequestTimeout?: boolean;
  /** True if this SDK request is processed from the bulk method */
  bulk?: boolean;
  /** Array of the promises by different events. When all promises are fulfilled, request counts as processed */
  promises?: Promise<any>[];
  /** IP address of the device submitted request, exists in all SDK requests */
  ip_address?: string;
  /** Data with some user info, like country geolocation, etc from the request, exists in all SDK requests */
  user: {
    /** User's country */
    country?: string;
    /** User's city */
    city?: string;
    /** User's timezone offset (in minutes) */
    tz?: number;
    [key: string]: any;
  };
  /** Document from the app_users collection for current user, exists in all SDK requests after validation */
  app_user?: {
    /** Application user ID */
    uid?: string;
    /** Device ID */
    did?: string;
    /** User's country */
    country?: string;
    /** User's city */
    city?: string;
    /** User's timezone offset (in minutes) */
    tz?: number;
    /** Custom properties for the application user */
    custom?: Record<string, any>;
    /** Last session timestamp of the app user */
    ls?: any;
    /** Flag indicating if the user has an ongoing session */
    has_ongoing_session?: boolean;
    /** Timestamp of the user's last request */
    last_req?: number | string;
    [key: string]: any;
  };
  /** ID of app_users document for the user, exists in all SDK requests after validation */
  app_user_id?: string;
  /** Document for the app sending request, exists in all SDK requests after validation */
  app?: Record<string, any>;
  /** ObjectID of the app document, available after validation */
  app_id?: string;
  /** Selected app country, available after validation */
  app_cc?: string;
  /** Name of the app */
  app_name?: string;
  /** Selected app timezone, available after validation */
  appTimezone?: string;
  /** Time object for the request */
  time: TimeObject;
  /** Parsed URL parts */
  urlParts?: any;
  /** The URL path split into segments */
  paths?: string[];
}

declare const processRequest: ProcessRequest;

/** Process user function */
declare const processUserFunction: ProcessUser;

/** Process request data function */
declare const processRequestData: ProcessRequestData;

/** Process fetch request function */
declare const processFetchRequest: ProcessFetchRequest;

/** Process bulk request function */
declare const processBulkRequest: ProcessBulkRequest;

/** Checksum salt verification function */
declare const checksumSaltVerification: ChecksumSaltVerification;

/** Validate redirect function */
declare const validateRedirect: ValidateRedirect;

/** Validate app for write API function */
declare const validateAppForWriteAPI: ValidateAppForWriteAPI;

/** Validate app for fetch API function */
declare const validateAppForFetchAPI: ValidateAppForFetchAPI;

/** Restart request function */
declare const restartRequest: RestartRequest;

/** Fetch app user function */
declare const fetchAppUser: FetchAppUser;

/** Ignore possible devices function */
declare const ignorePossibleDevices: IgnorePossibleDevices;

/** Reload config function */
declare const reloadConfig: ReloadConfig;

/** Logger instance */
declare const log: Logger;

/**
 * Function to validate user for write API
 */
export interface ValidateUserForWriteAPI {
  /**
   * Validates a user for write API
   * @param params - Request parameters or callback function
   * @param callback - Callback function (optional if params is a function)
   */
  (params: RequestParams | Function, callback?: Function): void;
}

/**
 * Function to validate user for data read API
 */
export interface ValidateUserForDataReadAPI {
  /**
   * Validates a user for data read API
   * @param params - Request parameters or callback function
   * @param feature - Feature to validate for
   * @param callback - Callback function (optional if params is a function)
   */
  (
    params: RequestParams | Function,
    feature: string,
    callback?: Function
  ): void;
}

/**
 * Function to validate user for data write API
 */
export interface ValidateUserForDataWriteAPI {
  /**
   * Validates a user for data write API
   * @param params - Request parameters or callback function
   * @param callback - Callback function (optional if params is a function)
   */
  (params: RequestParams | Function, callback?: Function): void;
}

/**
 * Function to validate user for global admin
 */
export interface ValidateUserForGlobalAdmin {
  /**
   * Validates a user for global admin
   * @param params - Request parameters or callback function
   * @param callback - Callback function (optional if params is a function)
   */
  (params: RequestParams | Function, callback?: Function): void;
}

/**
 * Function to validate user for management read API
 */
export interface ValidateUserForMgmtReadAPI {
  /**
   * Validates a user for management read API
   * @param params - Request parameters or callback function
   * @param callback - Callback function (optional if params is a function)
   */
  (params: RequestParams | Function, callback?: Function): void;
}

/**
 * Function to load version marks from filesystem
 */
export interface LoadFsVersionMarks {
  /**
   * Loads version marks from filesystem
   * @param callback - Callback function
   */
  (callback: (err: Error | null, data: any[]) => void): void;
}

/**
 * Function to load version marks from database
 */
export interface LoadDbVersionMarks {
  (callback: (err: Error | null, data: any[]) => void): void;
}

/** Validate user for write API function */
declare const validateUserForWriteAPI: ValidateUserForWriteAPI;

/** Validate user for data read API function */
declare const validateUserForDataReadAPI: ValidateUserForDataReadAPI;

/** Validate user for data write API function */
declare const validateUserForDataWriteAPI: ValidateUserForDataWriteAPI;

/** Validate user for global admin function */
declare const validateUserForGlobalAdmin: ValidateUserForGlobalAdmin;

/** Validate user for management read API function */
declare const validateUserForMgmtReadAPI: ValidateUserForMgmtReadAPI;

/** Load filesystem version marks function */
declare const loadFsVersionMarks: LoadFsVersionMarks;

/** Load database version marks function */
declare const loadDbVersionMarks: LoadDbVersionMarks;

/** Countly API object */
declare const countlyApi: CountlyApi;

export {
  processRequest,
  processUserFunction as processUser,
  processRequestData,
  processFetchRequest,
  processBulkRequest,
  checksumSaltVerification,
  validateRedirect,
  validateAppForWriteAPI,
  validateAppForFetchAPI,
  restartRequest,
  fetchAppUser,
  ignorePossibleDevices,
  reloadConfig,
  loadFsVersionMarks,
  loadDbVersionMarks,
  validateUserForWriteAPI,
  validateUserForDataReadAPI,
  validateUserForDataWriteAPI,
  validateUserForGlobalAdmin,
  validateUserForMgmtReadAPI,
  log,
  countlyApi,
};
