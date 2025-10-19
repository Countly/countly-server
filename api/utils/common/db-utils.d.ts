/**
 * Module for database utility functions
 * @module api/utils/common/db-utils
 */

declare module "api/utils/common/db-utils" {
  import { Moment } from "moment-timezone";
  import { Collection } from "mongodb";

  /**
   * Promise wrapper for database operations
   * @param {varies} arguments - collection name, operation and operation parameters
   * @returns {Promise} promise for database operation
   */
  export function dbPromise(...args: any[]): Promise<any>;

  /**
   * Modifies provided object filling properties used in zero documents in the format object["2012.7.20.property"] = increment.
   * Usualy used when filling up Countly metric model zero document
   * @param {params} params - {@link params} object
   * @param {object} object - object to fill
   * @param {string} property - meric value or segment or property to fill/increment
   * @param {number=} increment - by how much to increments, default is 1
   * @param {boolean=} isUnique - if property is unique
   * @returns {void} void
   */
  export function fillTimeObjectZero(
    params: any,
    object: any,
    property: string | string[],
    increment?: number,
    isUnique?: boolean
  ): boolean;

  /**
   * Modifies provided object filling properties used in monthly documents in the format object["2012.7.20.property"] = increment.
   * Usualy used when filling up Countly metric model monthly document
   * @param {params} params - {@link params} object
   * @param {object} object - object to fill
   * @param {string} property - meric value or segment or property to fill/increment
   * @param {number=} increment - by how much to increments, default is 1
   * @param {boolean=} forceHour - force recording hour information too, dfault is false
   * @returns {void} void
   */
  export function fillTimeObjectMonth(
    params: any,
    object: any,
    property: string | string[],
    increment?: number,
    forceHour?: boolean
  ): boolean;

  /**
   * Modifies provided object in the format object["2012.7.20.property"] = increment.
   * Usualy used when filling up Countly metric model data
   * @param {params} params - {@link params} object
   * @param {object} object - object to fill
   * @param {string} property - meric value or segment or property to fill/increment
   * @param {number=} increment - by how much to increments, default is 1
   * @returns {void} void
   */
  export function fillTimeObject(
    params: any,
    object: any,
    property: string,
    increment?: number
  ): boolean;

  /**
   * Get object of date ids that should be used in fetching standard metric model documents
   * @param {params} params - {@link params} object
   * @returns {object} with date ids, as {zero:"2017:0", month:"2017:2"}
   */
  export function getDateIds(params: any): { zero: string; month: string };

  /**
   * Clear clashing query operations
   * @param {object} query - MongoDB query object
   * @returns {object} cleaned query
   */
  export function clearClashingQueryOperations(query: any): any;

  /**
   *  Merge 2 mongodb update queries
   *  @param {object} ob1 - existing database update query
   *  @param {object} ob2 - addition to database update query
   *  @returns {object} merged database update query
   */
  export function mergeQuery(ob1: any, ob2: any): any;
}
