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

/** Mapping of common database properties */
export interface DbMap {
    events: string;
    total: string;
    new: string;
    unique: string;
    duration: string;
    durations: string;
    frequency: string;
    loyalty: string;
    sum: string;
    dur: string;
    count: string;
}

/** Mapping of common user database properties */
export interface DbUserMap {
    device_id: string;
    user_id: string;
    first_seen: string;
    last_seen: string;
    last_payment: string;
    session_duration: string;
    total_session_duration: string;
    session_count: string;
    device: string;
    device_type: string;
    manufacturer: string;
    carrier: string;
    city: string;
    region: string;
    country_code: string;
    platform: string;
    platform_version: string;
    app_version: string;
    last_begin_session_timestamp: string;
    last_end_session_timestamp: string;
    has_ongoing_session: string;
    previous_events: string;
    resolution: string;
    has_hinge: string;
}

/** Mapping of common event database properties */
export interface DbEventMap {
    user_properties: string;
    timestamp: string;
    segmentations: string;
    count: string;
    sum: string;
    duration: string;
    previous_events: string;
}
