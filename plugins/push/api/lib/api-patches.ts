// TODO: get rid of this file after project wide typescript adoption

import type { ObjectId } from "mongodb";
import type { IncomingMessage, ServerResponse } from 'http';
import type { Url } from "url";
import { createRequire } from 'module';

// createRequire needed for CJS modules without ES exports
const require = createRequire(import.meta.url);
const validators: {
    validateCreate: (params: RequestParams, feature: string, callback: (params: RequestParams) => Promise<any>) => Promise<any>;
    validateRead: (params: RequestParams, feature: string, callback: (params: RequestParams) => Promise<any>) => Promise<any>;
    validateUpdate: (params: RequestParams, feature: string, callback: (params: RequestParams) => Promise<any>) => Promise<any>;
    validateDelete: (params: RequestParams, feature: string, callback: (params: RequestParams) => Promise<any>) => Promise<any>;
} = require('../../../../api/utils/rights.js');

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
    return (arg: RequestHandlerArg) => {
        validators.validateCreate(arg.params, "push", callback);
        return true;
    }
}

export function updateApi(callback: (params: RequestParams) => Promise<any>) {
    return (arg: RequestHandlerArg) => {
        validators.validateUpdate(arg.params, "push", callback);
        return true;
    }
}

export function readApi(callback: (params: RequestParams) => Promise<any>) {
    return (arg: RequestHandlerArg) => {
        validators.validateRead(arg.params, "push", callback);
        return true;
    }
}

export function deleteApi(callback: (params: RequestParams) => Promise<any>) {
    return (arg: RequestHandlerArg) => {
        validators.validateDelete(arg.params, "push", callback);
        return true;
    }
}