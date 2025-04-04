import { Moment } from "moment-timezone";

export interface TimeObject {   
    /** Momentjs instance for request's time in app's timezone */
    now: Moment;
    /** Momentjs instance for request's time in UTC */
    nowUTC: Moment;
    /** Momentjs instance for current time in app's timezone */
    nowWithoutTimestamp: Moment;
    /** Request's seconds timestamp */
    timestamp: number;
    /** Request's milliseconds timestamp */
    mstimestamp: number;
    /** Year of request time in app's timezone in YYYY format */
    yearly: string;
    /** Month of request time in app's timezone in YYYY.M format */
    monthly: string;
    /** Date of request time in app's timezone in YYYY.M.D format */
    daily: string;
    /** Hour of request time in app's timezone in YYYY.M.D.H format */
    hourly: string;
    /** Week of request time in app's timezone as result day of the year, divided by 7 */
    weekly: number;
    /** Week of request time in app's timezone according to ISO standard */
    weeklyISO: number;
    /** Month of request time in app's timezone in format M */
    month: string;
    /** Day of request time in app's timezone in format D */
    day: string;
    /** Hour of request time in app's timezone in format H */
    hour: string;
}
