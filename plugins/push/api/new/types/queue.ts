import { ObjectId } from "mongodb";
import { SomeCredential } from "./credentials";
import { ProxyConfiguration } from "./proxy";

export interface JobTicket {
    appId: ObjectId;
    messageId: ObjectId;
    messageScheduleId: ObjectId;
    scheduledTo: Date;
    startedAt?: Date;
    finishedAt?: Date;
    timezone?: string;
}

export interface PushTicket {
    appId: ObjectId;
    messageId: ObjectId;
    messageScheduleId: ObjectId;
    token: string;
    message: any;
    platform: string;
    credentials: SomeCredential;
    proxy?: ProxyConfiguration;
}

export type PushTicketHandler = (push: PushTicket) => Promise<void>;
export type JobTicketHandler = (job: JobTicket) => Promise<void>;