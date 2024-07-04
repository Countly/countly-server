import { ObjectId } from "mongodb";

export interface MessageSchedule {
    _id: ObjectId;
    appId: ObjectId;
    messageId: ObjectId;
    scheduledTo: Date;
    startedAt?: Date;
    finishedAt?: Date;
    timezoneAware: boolean;
    status: "scheduled" | "started" | "finished";
}