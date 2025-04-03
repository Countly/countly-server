import { Moment } from "moment-timezone";

export interface TimeObject {
    now: Moment;
    nowUTC: Moment;
    nowWithoutTimestamp: Moment;
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
}
