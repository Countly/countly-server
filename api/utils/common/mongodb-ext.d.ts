/**
 * Module for MongoDB extension utilities
 * @module api/utils/common/mongodb-ext
 */

declare module "api/utils/common/mongodb-ext" {
  import { ObjectId } from "mongodb";

  /**
   * DB-related extensions / functions
   */
  export const dbext: {
    /**
     * Wrapper for MongoDB ObjectID
     * @param {string} id - ID to convert to ObjectID
     * @returns {ObjectID} MongoDB ObjectID
     */
    ObjectID(id: string): ObjectId | string;

    /**
     * MongoDB ObjectId reference
     */
    ObjectId: typeof ObjectId;

    /**
     * Check if passed value is an ObjectId
     *
     * @param {any} id value
     * @returns {boolean} true if id is instance of ObjectId
     */
    isoid(id: any): boolean;

    /**
     * Decode string to ObjectID if needed
     *
     * @param {String|ObjectID|null|undefined} id string or object id, empty string is invalid input
     * @returns {ObjectID} id
     */
    oid(id: string | ObjectId | null | undefined): ObjectId | undefined | null;

    /**
     * Create ObjectID with given timestamp. Uses current ObjectID random/server parts, meaning the
     * object id returned still has same uniquness guarantees as random ones.
     *
     * @param {Date|number} date Date object or timestamp in seconds, current date by default
     * @returns {ObjectID} with given timestamp
     */
    oidWithDate(date?: Date | number): ObjectId;

    /**
     * Create blank ObjectID with given timestamp. Everything except for date part is zeroed.
     * For use in queries like {_id: {$gt: oidBlankWithDate()}}
     *
     * @param {Date|number} date Date object or timestamp in seconds, current date by default
     * @returns {ObjectID} with given timestamp and zeroes in the rest of the bytes
     */
    oidBlankWithDate(date?: Date | number): ObjectId;
  };
}
