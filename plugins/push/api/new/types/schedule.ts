import { ObjectId } from "mongodb";

export interface Schedule {
    _id: ObjectId;
    appId: ObjectId;
    messageId: ObjectId;
    scheduledTo: Date;
    startedAt?: Date;
    finishedAt?: Date;
    timezoneAware: boolean;
    schedulerTimezone: number;
    status: "scheduled" | "started" | "finished";
}