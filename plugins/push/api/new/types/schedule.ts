import { ObjectId } from "mongodb";
import { Result } from "./message";

export interface Schedule {
    _id: ObjectId;
    appId: ObjectId;
    messageId: ObjectId;
    scheduledTo: Date;
    startedAt?: Date;
    finishedAt?: Date;
    timezoneAware: boolean;
    schedulerTimezone?: number;
    status: "scheduled"|"started"|"finished"|"canceled";
    result: Result;
}
