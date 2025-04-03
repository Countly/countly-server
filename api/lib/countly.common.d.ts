import * as moment from "moment-timezone";
import * as underscore from "underscore";

declare const countlyCommon: {
  /**
   * Calculate unique users from map
   * @param {object} dbObj - database object
   * @param {object} uniqueMap - unique map
   * @returns {number} unique users
   */
  calculateUniqueFromMap: (dbObj: any, uniqueMap: any) => number;
  /**
   * Get descendant property
   * @param {object} obj - object to get property from
   * @param {string} desc - descendant property
   * @returns {any} property value
   */
  getDescendantProp: (obj: any, desc: string) => any;
  /**
   * Set descendant property
   * @param {object} obj - object to set property on
   * @param {string} desc - descendant property
   * @param {any} value - value to set
   */
  setDescendantProp: (obj: any, desc: string, value: any) => void;
  /**
   * Remove descendant property
   * @param {object} obj - object to remove property from
   * @param {string} desc - descendant property
   */
  removeDescendantProp: (obj: any, desc: string) => void;
  /**
   * Get time series
   * @param {object} dbObj - database object
   * @param {string} period - period
   * @param {string} timezone - timezone
   * @param {string} dateId - date id
   * @param {boolean} isUTC - is UTC
   * @returns {array} time series
   */
  getTimeSeries: (
    dbObj: any,
    period: string,
    timezone: string,
    dateId: string,
    isUTC: boolean
  ) => any;
  /**
   * Get period object
   * @param {string} period - period
   * @param {string} timezone - timezone
   * @param {moment} date - date
   * @returns {object} period object
   */
  getPeriodObject: (
    period: string,
    timezone: string,
    date: moment.Moment
  ) => any;
  /**
   * Get period name
   * @param {string} period - period
   * @returns {string} period name
   */
  getPeriodName: (period: string) => string;
  /**
   * Get period start
   * @param {string} period - period
   * @param {string} timezone - timezone
   * @param {moment} date - date
   * @returns {number} period start
   */
  getPeriodStart: (
    period: string,
    timezone: string,
    date: moment.Moment
  ) => number;
  /**
   * Get period end
   * @param {string} period - period
   * @param {string} timezone - timezone
   * @param {moment} date - date
   * @returns {number} period end
   */
  getPeriodEnd: (
    period: string,
    timezone: string,
    date: moment.Moment
  ) => number;
  /**
   * Get timestamp
   * @param {moment} date - date
   * @returns {number} timestamp
   */
  getTimestamp: (date: moment.Moment) => number;
  /**
   * Get timestamp string
   * @param {moment} date - date
   * @returns {string} timestamp string
   */
  getTimestampString: (date: moment.Moment) => string;
  /**
   * Get ISO date
   * @param {moment} date - date
   * @returns {string} ISO date
   */
  getISODate: (date: moment.Moment) => string;
  /**
   * Get start of current day
   * @param {string} timezone - timezone
   * @returns {moment} start of current day
   */
  getStartOfCurrentDay: (timezone: string) => moment.Moment;
  /**
   * Get start of today UTC
   * @returns {moment} start of today UTC
   */
  getStartOfTodayUTC: () => moment.Moment;
  /**
   * Get start of today
   * @param {string} timezone - timezone
   * @returns {moment} start of today
   */
  getStartOfToday: (timezone: string) => moment.Moment;
  /**
   * Get start of this week
   * @param {string} timezone - timezone
   * @returns {moment} start of this week
   */
  getStartOfThisWeek: (timezone: string) => moment.Moment;
  /**
   * Get start of this month
   * @param {string} timezone - timezone
   * @returns {moment} start of this month
   */
  getStartOfThisMonth: (timezone: string) => moment.Moment;
  /**
   * Get start of this year
   * @param {string} timezone - timezone
   * @returns {moment} start of this year
   */
  getStartOfThisYear: (timezone: string) => moment.Moment;
  /**
   * Get start of next day
   * @param {string} timezone - timezone
   * @returns {moment} start of next day
   */
  getStartOfNextDay: (timezone: string) => moment.Moment;
  /**
   * Get start of next week
   * @param {string} timezone - timezone
   * @returns {moment} start of next week
   */
  getStartOfNextWeek: (timezone: string) => moment.Moment;
  /**
   * Get start of next month
   * @param {string} timezone - timezone
   * @returns {moment} start of next month
   */
  getStartOfNextMonth: (timezone: string) => moment.Moment;
  /**
   * Get start of next year
   * @param {string} timezone - timezone
   * @returns {moment} start of next year
   */
  getStartOfNextYear: (timezone: string) => moment.Moment;
  /**
   * Get days in month
   * @param {moment} date - date
   * @returns {number} days in month
   */
  getDaysInMonth: (date: moment.Moment) => number;
  /**
   * Get months in year
   * @returns {number} months in year
   */
  getMonthsInYear: () => number;
  /**
   * Get start of UTC day
   * @param {moment} date - date
   * @returns {moment} start of UTC day
   */
  getStartOfUTCDay: (date: moment.Moment) => moment.Moment;
  /**
   * Get start of timezone day
   * @param {moment} date - date
   * @param {string} timezone - timezone
   * @returns {moment} start of timezone day
   */
  getStartOfTimezoneDay: (
    date: moment.Moment,
    timezone: string
  ) => moment.Moment;
  /**
   * Get start of timezone week
   * @param {moment} date - date
   * @param {string} timezone - timezone
   * @returns {moment} start of timezone week
   */
  getStartOfTimezoneWeek: (
    date: moment.Moment,
    timezone: string
  ) => moment.Moment;
  /**
   * Get start of timezone month
   * @param {moment} date - date
   * @param {string} timezone - timezone
   * @returns {moment} start of timezone month
   */
  getStartOfTimezoneMonth: (
    date: moment.Moment,
    timezone: string
  ) => moment.Moment;
  /**
   * Get start of timezone year
   * @param {moment} date - date
   * @param {string} timezone - timezone
   * @returns {moment} start of timezone year
   */
  getStartOfTimezoneYear: (
    date: moment.Moment,
    timezone: string
  ) => moment.Moment;
  /**
   * Get start of next timezone day
   * @param {moment} date - date
   * @param {string} timezone - timezone
   * @returns {moment} start of next timezone day
   */
  getStartOfNextTimezoneDay: (
    date: moment.Moment,
    timezone: string
  ) => moment.Moment;
  /**
   * Get start of next timezone week
   * @param {moment} date - date
   * @param {string} timezone - timezone
   * @returns {moment} start of next timezone week
   */
  getStartOfNextTimezoneWeek: (
    date: moment.Moment,
    timezone: string
  ) => moment.Moment;
  /**
   * Get start of next timezone month
   * @param {moment} date - date
   * @param {string} timezone - timezone
   * @returns {moment} start of next timezone month
   */
  getStartOfNextTimezoneMonth: (
    date: moment.Moment,
    timezone: string
  ) => moment.Moment;
  /**
   * Get start of next timezone year
   * @param {moment} date - date
   * @param {string} timezone - timezone
   * @returns {moment} start of next timezone year
   */
  getStartOfNextTimezoneYear: (
    date: moment.Moment,
    timezone: string
  ) => moment.Moment;
  /**
   * Get UTC timestamp
   * @param {moment} date - date
   * @returns {number} UTC timestamp
   */
  getUTCTimestamp: (date: moment.Moment) => number;
  /**
   * Get timezone timestamp
   * @param {moment} date - date
   * @param {string} timezone - timezone
   * @returns {number} timezone timestamp
   */
  getTimezoneTimestamp: (date: moment.Moment, timezone: string) => number;
  /**
   * Get UTC timestamp string
   * @param {moment} date - date
   * @returns {string} UTC timestamp string
   */
  getUTCTimestampString: (date: moment.Moment) => string;
  /**
   * Get timezone timestamp string
   * @param {moment} date - date
   * @param {string} timezone - timezone
   * @returns {string} timezone timestamp string
   */
  getTimezoneTimestampString: (date: moment.Moment, timezone: string) => string;
  /**
   * Get UTC timestamp for filename
   * @param {moment} date - date
   * @returns {number} UTC timestamp for filename
   */
  getUTCTimestampForFilename: (date: moment.Moment) => number;
  /**
   * Get timezone timestamp for filename
   * @param {moment} date - date
   * @param {string} timezone - timezone
   * @returns {number} timezone timestamp for filename
   */
  getTimezoneTimestampForFilename: (
    date: moment.Moment,
    timezone: string
  ) => number;
  /**
   * Get UTC timestamp for query
   * @param {moment} date - date
   * @returns {number} UTC timestamp for query
   */
  getUTCTimestampForQuery: (date: moment.Moment) => number;
  /**
   * Get timezone timestamp for query
   * @param {moment} date - date
   * @param {string} timezone - timezone
   * @returns {number} timezone timestamp for query
   */
  getTimezoneTimestampForQuery: (
    date: moment.Moment,
    timezone: string
  ) => number;
  /**
   * Get UTC timestamp for filename query
   * @param {moment} date - date
   * @returns {number} UTC timestamp for filename query
   */
  getUTCTimestampForFilenameQuery: (date: moment.Moment) => number;
  /**
   * Get timezone timestamp for filename query
   * @param {moment} date - date
   * @param {string} timezone - timezone
   * @returns {number} timezone timestamp for filename query
   */
  getTimezoneTimestampForFilenameQuery: (
    date: moment.Moment,
    timezone: string
  ) => number;
  /**
   * Get UTC timestamp for filename query string
   * @param {moment} date - date
   * @returns {string} UTC timestamp for filename query string
   */
  getUTCTimestampForFilenameQueryString: (date: moment.Moment) => string;
  /**
   * Get timezone timestamp for filename query string
   * @param {moment} date - date
   * @param {string} timezone - timezone
   * @returns {string} timezone timestamp for filename query string
   */
  getTimezoneTimestampForFilenameQueryString: (
    date: moment.Moment,
    timezone: string
  ) => string;
};

export = countlyCommon;
