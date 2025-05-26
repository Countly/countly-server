import { Params } from "./common";
import { Db } from "mongodb";

export interface ValidateUserForRead {
  (params: Params, callback: Function, callbackParam?: any): Promise<any>;
}

export interface ValidateGlobalAdmin {
  (params: Params, callback: Function, callbackParam?: any): Promise<any>;
}

export interface ValidateAppAdmin {
  (params: Params, callback: Function, callbackParam?: any): Promise<any>;
}

export interface ValidateUser {
  (params: Params, callback: Function, callbackParam?: any): Promise<any>;
}

export declare const validateUserForRead: ValidateUserForRead;
export declare const validateUserForWrite: ValidateUserForRead;
export declare const validateGlobalAdmin: ValidateGlobalAdmin;
export declare const validateAppAdmin: ValidateAppAdmin;
export declare const validateUser: ValidateUser;
export declare function dbUserHasAccessToCollection(
  params: Params,
  collection: string,
  callback: (hasAccess: boolean) => void
): void;
export declare function getBaseAppFilter(
  member: any,
  db: string,
  collection: string
): any;
export declare function hasAdminAccess(member: any, appId: string): boolean;
export declare function getUserApps(member: any): string[];
export declare function validateUpdate(
  params: Params,
  feature: string,
  callback: () => void
): void;
export declare function validateDelete(
  params: Params,
  feature: string,
  callback: () => void
): void;
export declare function validateCreate(
  params: Params,
  feature: string,
  callback: () => void
): void;
