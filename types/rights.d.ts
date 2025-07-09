/**
 * Module for validation functions that manage access rights to application data.
 * Divided in parts access for Global Admins, Admins and Users.
 */

import { Params } from "./requestProcessor";
import { Database } from "./pluginManager";

/** Member/User document from database */
export interface Member {
    _id: string;
    global_admin: boolean;
    locked: boolean;
    api_key: string;
    username: string;
    email: string;
    full_name: string;
    auth_token?: string;
    /** Legacy admin access array */
    admin_of?: string[];
    /** Legacy user access array */
    user_of?: string[];
    /** New permission system */
    permission?: {
        _: {
            /** Array of arrays containing app IDs the user has user access to */
            u: string[][];
            /** Array of app IDs the user has admin access to */
            a: string[];
        };
        /** Create permissions for specific apps */
        c?: {
            [appId: string]: {
                all?: boolean;
                allowed?: { [feature: string]: boolean };
            };
        };
        /** Read permissions for specific apps */
        r?: {
            [appId: string]: {
                all?: boolean;
                allowed?: { [feature: string]: boolean };
            };
        };
        /** Update permissions for specific apps */
        u?: {
            [appId: string]: {
                all?: boolean;
                allowed?: { [feature: string]: boolean };
            };
        };
        /** Delete permissions for specific apps */
        d?: {
            [appId: string]: {
                all?: boolean;
                allowed?: { [feature: string]: boolean };
            };
        };
    };
    /** App restrictions */
    app_restrict?: {
        [appId: string]: string[];
    };
    /** Event collections with replaced app names */
    eventList?: { [hash: string]: string };
    /** View collections with replaced app names */
    viewList?: { [hash: string]: string };
}

/** App document from database */
export interface App {
    _id: string;
    name: string;
    country: string;
    category: string;
    timezone: string;
    type: string;
    locked: boolean;
    plugins?: { [pluginName: string]: any };
}

/** Collection mapping entry */
export interface CollectionMapEntry {
    /** App ID */
    a: string;
    /** Event name (for events) */
    e?: string;
    /** View segment (for views) */
    vs?: string;
    /** Display name */
    name: string;
    /** Temporary flag during processing */
    n?: boolean;
}

/** Collection mapping object */
export interface CollectionMap {
    [hash: string]: CollectionMapEntry;
}

/** Cached schema entry */
export interface CachedSchemaEntry {
    loading: boolean;
    ts: number;
}

/** Cached schema object */
export interface CachedSchema {
    [appId: string]: CachedSchemaEntry;
}

/** Validation callback function */
export interface ValidationCallback {
    (callbackParam?: any, params?: Params): void | Promise<void>;
}

/** Application collection data for events/views loading */
export interface AppCollectionData {
    appIds: any[];
    appNamesById: { [appId: string]: string };
}

/** Token validation result */
export type TokenValidationResult = string | 'token-not-given' | 'token-invalid';

/** Feature permission type */
export type PermissionType = 'c' | 'r' | 'u' | 'd';

/** Feature name - can be single string or array of strings */
export type FeatureName = string | string[];

/** Access type for write operations */
export type AccessType = 'c' | 'u' | 'd';

/**
 * Validate user for read access by api_key for provided app_id
 * @param params - Request context parameters
 * @param callback - Function to call only if validation passes
 * @param callbackParam - Parameter to pass to callback function
 * @returns Promise that resolves when validation completes
 */
export declare function validateUserForRead(
    params: Params,
    callback: ValidationCallback,
    callbackParam?: any
): Promise<any>;

/**
 * Validate user for write access by api_key for provided app_id
 * @param params - Request context parameters
 * @param callback - Function to call only if validation passes
 * @param callbackParam - Parameter to pass to callback function
 * @returns Promise that resolves when validation completes
 */
export declare function validateUserForWrite(
    params: Params,
    callback: ValidationCallback,
    callbackParam?: any
): Promise<any>;

/**
 * Validate user for global admin access by api_key
 * @param params - Request context parameters
 * @param callback - Function to call only if validation passes
 * @param callbackParam - Parameter to pass to callback function
 * @returns Promise that resolves when validation completes
 */
export declare function validateGlobalAdmin(
    params: Params,
    callback: ValidationCallback,
    callbackParam?: any
): Promise<any>;

/**
 * Validate user for admin access for specific app by api_key
 * @param params - Request context parameters
 * @param callback - Function to call only if validation passes
 * @param callbackParam - Parameter to pass to callback function
 * @returns Promise that resolves when validation completes
 */
export declare function validateAppAdmin(
    params: Params,
    callback: ValidationCallback,
    callbackParam?: any
): Promise<any>;

/**
 * Basic user validation by api_key
 * @param params - Request context parameters
 * @param callback - Function to call only if validation passes
 * @param callbackParam - Parameter to pass to callback function
 * @returns Promise that resolves when validation completes
 */
export declare function validateUser(
    params: Params,
    callback: ValidationCallback,
    callbackParam?: any
): Promise<any>;

/**
 * Validate user for read access with feature-based permissions
 * @param params - Request context parameters
 * @param feature - Feature that is trying to be accessed
 * @param callback - Function to call only if validation passes
 * @param callbackParam - Parameter to pass to callback function
 * @returns Promise that resolves when validation completes
 */
export declare function validateRead(
    params: Params,
    feature: FeatureName,
    callback: ValidationCallback,
    callbackParam?: any
): Promise<any>;

/**
 * Validate user for create access by api_key for provided app_id
 * @param params - Request context parameters
 * @param feature - Feature that is trying to be accessed
 * @param callback - Function to call only if validation passes
 * @param callbackParam - Parameter to pass to callback function
 * @returns Promise that resolves when validation completes
 */
export declare function validateCreate(
    params: Params,
    feature: FeatureName,
    callback: ValidationCallback,
    callbackParam?: any
): Promise<any>;

/**
 * Validate user for update access by api_key for provided app_id
 * @param params - Request context parameters
 * @param feature - Feature that is trying to be accessed
 * @param callback - Function to call only if validation passes
 * @param callbackParam - Parameter to pass to callback function
 * @returns Promise that resolves when validation completes
 */
export declare function validateUpdate(
    params: Params,
    feature: FeatureName,
    callback: ValidationCallback,
    callbackParam?: any
): Promise<any>;

/**
 * Validate user for delete access by api_key for provided app_id
 * @param params - Request context parameters
 * @param feature - Feature that is trying to be accessed
 * @param callback - Function to call only if validation passes
 * @param callbackParam - Parameter to pass to callback function
 * @returns Promise that resolves when validation completes
 */
export declare function validateDelete(
    params: Params,
    feature: FeatureName,
    callback: ValidationCallback,
    callbackParam?: any
): Promise<any>;

/**
 * Get events data for access control checking
 * @param params - Request context parameters
 * @param apps - Array of app documents
 * @param callback - Callback function with events and views data
 */
export declare function dbLoadEventsData(
    params: Params,
    apps: App[],
    callback: (err: Error | null, events?: { [hash: string]: string }, views?: { [hash: string]: string }) => void
): void;

/**
 * Get collection name from hash value
 * @param hashValue - Hash value to look up
 * @returns Display name for the collection or the hash if not found
 */
export declare function getCollectionName(hashValue: string): string;

/**
 * Check if user has access to specific collection
 * @param params - Request context parameters
 * @param collection - Collection name to check access for
 * @param app_id - Optional app ID to restrict access to
 * @param callback - Callback function with access result
 */
export declare function dbUserHasAccessToCollection(
    params: Params,
    collection: string,
    app_id: string | ((hasAccess: boolean) => void),
    callback?: (hasAccess: boolean) => void
): void;

/**
 * Creates filter object to filter by member allowed collections
 * @param member - Member object from params
 * @param dbName - Database name as string
 * @param collectionName - Collection name
 * @returns Filter object for database queries
 */
export declare function getBaseAppFilter(
    member: Member,
    dbName: string,
    collectionName: string
): { [key: string]: any };

/**
 * Check if user has admin access on selected app
 * @param member - Member object from params
 * @param app_id - ID value of related app
 * @param type - Type of access (c, r, u, d)
 * @returns True if user has admin access on that app
 */
export declare function hasAdminAccess(member: Member, app_id: string, type?: PermissionType): boolean;

/**
 * Check if user has create right for feature
 * @param feature - Feature name
 * @param app_id - Application ID
 * @param member - Member object
 * @returns True if user has create right
 */
export declare function hasCreateRight(feature: string, app_id: string, member: Member): boolean;

/**
 * Check if user has read right for feature
 * @param feature - Feature name
 * @param app_id - Application ID
 * @param member - Member object
 * @returns True if user has read right
 */
export declare function hasReadRight(feature: string, app_id: string, member: Member): boolean;

/**
 * Check if user has update right for feature
 * @param feature - Feature name
 * @param app_id - Application ID
 * @param member - Member object
 * @returns True if user has update right
 */
export declare function hasUpdateRight(feature: string, app_id: string, member: Member): boolean;

/**
 * Check if user has delete right for feature
 * @param feature - Feature name
 * @param app_id - Application ID
 * @param member - Member object
 * @returns True if user has delete right
 */
export declare function hasDeleteRight(feature: string, app_id: string, member: Member): boolean;

/**
 * Get all apps that user has access to
 * @param member - Member object
 * @returns Array of app IDs the user has access to
 */
export declare function getUserApps(member: Member): string[];

/**
 * Get apps that user has specific feature permission for
 * @param member - Member object
 * @param feature - Feature name
 * @param permissionType - Permission type (c, r, u, d)
 * @returns Array of app IDs with permission
 */
export declare function getUserAppsForFeaturePermission(
    member: Member,
    feature: string,
    permissionType: PermissionType
): string[];

/**
 * Get apps that user has admin access to
 * @param member - Member object
 * @returns Array of app IDs with admin access
 */
export declare function getAdminApps(member: Member): string[];

declare const rights: {
    validateUserForRead: typeof validateUserForRead;
    validateUserForWrite: typeof validateUserForWrite;
    validateGlobalAdmin: typeof validateGlobalAdmin;
    validateAppAdmin: typeof validateAppAdmin;
    validateUser: typeof validateUser;
    validateRead: typeof validateRead;
    validateCreate: typeof validateCreate;
    validateUpdate: typeof validateUpdate;
    validateDelete: typeof validateDelete;
    dbLoadEventsData: typeof dbLoadEventsData;
    getCollectionName: typeof getCollectionName;
    dbUserHasAccessToCollection: typeof dbUserHasAccessToCollection;
    getBaseAppFilter: typeof getBaseAppFilter;
    hasAdminAccess: typeof hasAdminAccess;
    hasCreateRight: typeof hasCreateRight;
    hasReadRight: typeof hasReadRight;
    hasUpdateRight: typeof hasUpdateRight;
    hasDeleteRight: typeof hasDeleteRight;
    getUserApps: typeof getUserApps;
    getUserAppsForFeaturePermission: typeof getUserAppsForFeaturePermission;
    getAdminApps: typeof getAdminApps;
};

export default rights;