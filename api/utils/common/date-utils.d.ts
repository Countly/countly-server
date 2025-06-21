/**
 * Module for date and time utility functions
 * @module api/utils/common/date-utils
 */

declare module "api/utils/common/date-utils" {
  import moment from "moment-timezone";

  /**
   * @typedef timeObject
   * @type {object}
   * @global
   * @property {momentjs} now - momentjs instance for request's time in app's timezone
   * @property {momentjs} nowUTC - momentjs instance for request's time in UTC
   * @property {momentjs} nowWithoutTimestamp - momentjs instance for current time in app's timezone
   * @property {number} timestamp -  request's seconds timestamp
   * @property {number} mstimestamp -  request's miliseconds timestamp
   * @property {string} yearly -  year of request time in app's timezone in YYYY format
   * @property {string} monthly -  month of request time in app's timezone in YYYY.M format
   * @property {string} daily -  date of request time in app's timezone in YYYY.M.D format
   * @property {string} hourly -  hour of request time in app's timezone in YYYY.M.D.H format
   * @property {number} weekly -  week of request time in app's timezone as result day of the year, divided by 7
   * @property {string} month -  month of request time in app's timezone in format M
   * @property {string} day -  day of request time in app's timezone in format D
   * @property {string} hour -  hour of request time in app's timezone in format H
   */
  type timeObject = {
    now: moment.Moment;
    nowUTC: moment.Moment;
    nowWithoutTimestamp: moment.Moment;
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
  };

  /**
   * Creates a time object from request's milisecond or second timestamp in provided app's timezone
   * @param {string} appTimezone - app's timezone
   * @param {number} reqTimestamp - timestamp in the request
   * @returns {timeObject} Time object for current request
   */
  export function initTimeObj(
    appTimezone: string,
    reqTimestamp: number
  ): timeObject;

  /**
   * Creates a Date object from provided seconds timestamp in provided timezone
   * @param {number} timestamp - unix timestamp in seconds
   * @param {string} timezone - name of the timezone
   * @returns {moment} moment object for provided time
   */
  export function getDate(timestamp: number, timezone: string): moment.Moment;

  /**
   * Returns day of the year from provided seconds timestamp in provided timezone
   * @param {number} timestamp - unix timestamp in seconds
   * @param {string} timezone - name of the timezone
   * @returns {number} current day of the year
   */
  export function getDOY(timestamp: number, timezone: string): number;

  /**
   * Returns amount of days in provided year
   * @param {number} year - year to check for days
   * @returns {number} number of days in provided year
   */
  export function getDaysInYear(year: number): number;

  /**
   * Returns amount of iso weeks in provided year
   * @param {number} year - year to check for days
   * @returns {number} number of iso weeks in provided year
   */
  export function getISOWeeksInYear(year: number): number;

  /**
   * Get diference between 2 momentjs instances in specific measurement
   * @param {moment} moment1 - momentjs with start date
   * @param {moment} moment2 - momentjs with end date
   * @param {string} measure - units of difference, can be minutes, hours, days, weeks
   * @returns {number} difference in provided units
   */
  export function getDiff(
    moment1: moment.Moment,
    moment2: moment.Moment,
    measure: string
  ): number;

  /**
   * Adjust timestamp with app's timezone for timestamp queries that should equal bucket results
   * @param {number} ts - miliseconds timestamp
   * @param {string} tz - timezone
   * @returns {number} adjusted timestamp for timezone
   */
  export function adjustTimestampByTimezone(ts: number, tz: string): number;

  /**
   * Checks if provided value could be converted to a number,
   * even if current type is other, as string, as example value "42"
   * @param {any} n - value to check if it can be converted to number
   * @returns {boolean} true if can be a number, false if can't be a number
   * @example
   * isNumber(1) //outputs true
   * isNumber("2") //outputs true
   * isNumber("test") //outputs false
   */
  export function isNumber(n: any): boolean;
}
