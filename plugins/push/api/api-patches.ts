import type { ObjectId } from "mongodb";
import type { IncomingMessage, ServerResponse } from 'http';
import type { Url } from "url";
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const validators: {
    validateCreate: (params: RequestParams, feature: string, callback: (params: RequestParams) => Promise<any>) => Promise<any>;
    validateRead: (params: RequestParams, feature: string, callback: (params: RequestParams) => Promise<any>) => Promise<any>;
    validateUpdate: (params: RequestParams, feature: string, callback: (params: RequestParams) => Promise<any>) => Promise<any>;
    validateDelete: (params: RequestParams, feature: string, callback: (params: RequestParams) => Promise<any>) => Promise<any>;
} = require('../../../api/utils/rights.js');

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

export interface RequestParams {
    req: IncomingMessage;
    res: ServerResponse;
    qstring: Record<string, unknown>;
    href: string;
    urlParts: Url;
    paths: string[];
    apiPath: string;
    fullPath: string;
}

export interface RequestHandlerArg {
    params: RequestParams;
    validateAppForWriteAPI: (params: RequestParams, callback: Function, callbackParam?: any) => Promise<any>;
    validateUserForDataReadAPI: (params: RequestParams, feature: string | string[], callback: Function, callbackParam?: any) => Promise<any>;
    validateUserForDataWriteAPI: (params: RequestParams, callback: Function, callbackParam?: any) => Promise<any>;
    validateUserForGlobalAdmin: (params: RequestParams, callback: Function, callbackParam?: any) => Promise<any>;
}

export interface Cohort {
    app_id: ObjectId;
    _id: string;
    name: string;
}

export interface CohortHookArg {
    cohort: Cohort;
    uids: string[];
}

export function createApi(callback: (params: RequestParams) => Promise<any>) {
    return (arg: RequestHandlerArg) => validators.validateCreate(arg.params, "push", callback);
}

export function updateApi(callback: (params: RequestParams) => Promise<any>) {
    return (arg: RequestHandlerArg) => validators.validateUpdate(arg.params, "push", callback);
}

export function readApi(callback: (params: RequestParams) => Promise<any>) {
    return (arg: RequestHandlerArg) => validators.validateRead(arg.params, "push", callback);
}

export function deleteApi(callback: (params: RequestParams) => Promise<any>) {
    return (arg: RequestHandlerArg) => validators.validateDelete(arg.params, "push", callback);
}