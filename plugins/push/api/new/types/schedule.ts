import { ObjectId } from "mongodb";
import { Result } from "./message";

export interface AudienceFilters {
    uids?: string[];
    user?: string;//{ type: 'JSON', required: false, nonempty: true, custom: Filter.filterQueryValidator },
    drill?: string; //{ type: 'JSON', required: false, nonempty: true, custom: Filter.filterQueryValidator },
    geos?: ObjectId[];//{ type: 'ObjectID[]', required: false, 'min-length': 1 },
    cohorts?: string[];//{ type: 'String[]', required: false, 'min-length': 1 },
}

export interface Schedule {
    _id: ObjectId;
    appId: ObjectId;
    messageId: ObjectId;
    scheduledTo: Date;
    startedAt?: Date;
    finishedAt?: Date;
    timezoneAware: boolean;
    schedulerTimezone?: number;
    audienceFilters?: AudienceFilters;
    uids?: string[]; // user ids from app_users{appId} collection sent by cohort or event AutoTrigger
    status: "scheduled"|"started"|"finished"|"canceled";
    result: Result;
}
