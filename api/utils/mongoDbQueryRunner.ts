/**
 * Class for running MongoDB drill queries
 */
import { createRequire } from 'module';

// @ts-expect-error - import.meta is available at runtime with Node's native TypeScript support
const require = createRequire(import.meta.url);

const moment = require('moment-timezone');

interface PeriodRange {
    $gt: number;
    $lt: number;
}

interface PeriodObject {
    period?: string | number[] | PeriodObject;
    since?: number;
    exclude_current_day?: boolean;
}

type Period = string | number[] | PeriodObject;

interface QueryOptions {
    appID?: string;
    event?: string | string[];
    name?: string | string[];
    period?: Period;
    periodOffset?: number;
    timezone?: string;
    bucket?: string;
    segmentation?: string;
    field?: string;
    limit?: number;
    dbFilter?: Record<string, unknown>;
    pipeline?: Record<string, unknown>[];
    match?: Record<string, unknown>;
}

interface AggregatedDataItem {
    _id: string;
    sg?: string;
    c?: number;
    dur?: number;
    s?: number;
    u?: number;
    t?: number;
    d?: number;
    n?: number;
    e?: number;
    b?: number;
    scr?: number;
    'scr-calc'?: number;
    'd-calc'?: number;
    br?: number;
    view?: string;
}

interface Db {
    collection(name: string): {
        aggregate(pipeline: Record<string, unknown>[]): {
            toArray(): Promise<AggregatedDataItem[]>;
        };
    };
}

class MongoDbQueryRunner {
    private db: Db;

    /**
     * Constructor
     * @param mongoDb - mongodb connection
     */
    constructor(mongoDb: Db) {
        this.db = mongoDb;
    }

    /**
     * Returns number for timestamp making sure it is 13 digits
     * @param ts - number we need to set as timestamp
     * @returns timestamp in ms
     */
    fixTimestampToMilliseconds(ts: number): number {
        if ((ts + "").length > 13) {
            ts = Number.parseInt((ts + '').substring(0, 13), 10);
        }
        return ts;
    }

    /**
     * Gets start and end points of period for querying in drill
     * @param period - common period in Countly
     * @param timezone - app timezone
     * @param offset - offset in minutes
     * @returns describes period range
     */
    getPeriodRange(period: Period, timezone: string, offset?: number): PeriodRange {
        let startTimestamp: ReturnType<typeof moment> = 0;
        let endTimestamp: ReturnType<typeof moment> = 0;
        const _currMoment = moment();

        if (typeof period === 'string' && period.includes(",")) {
            try {
                period = JSON.parse(period);
            }
            catch (error) {
                console.log("period JSON parse failed");
                period = "30days";
            }
        }

        const excludeCurrentDay = (period as PeriodObject).exclude_current_day || false;
        if ((period as PeriodObject).period) {
            period = (period as PeriodObject).period!;
        }

        if ((period as PeriodObject).since) {
            period = [(period as PeriodObject).since!, endTimestamp.clone().valueOf()];
        }

        endTimestamp = excludeCurrentDay ? _currMoment.clone().subtract(1, 'days').endOf('day') : _currMoment.clone().endOf('day');

        if (Array.isArray(period)) {
            if ((period[0] + "").length === 10) {
                period[0] *= 1000;
            }
            if ((period[1] + "").length === 10) {
                period[1] *= 1000;
            }
            let fromDate: ReturnType<typeof moment>;
            let toDate: ReturnType<typeof moment>;

            if (Number.isInteger(period[0]) && Number.isInteger(period[1])) {
                period[0] = this.fixTimestampToMilliseconds(period[0]);
                period[1] = this.fixTimestampToMilliseconds(period[1]);
                fromDate = moment(period[0]);
                toDate = moment(period[1]);
            }
            else {
                fromDate = moment(period[0], ["DD-MM-YYYY HH:mm:ss", "DD-MM-YYYY"]);
                toDate = moment(period[1], ["DD-MM-YYYY HH:mm:ss", "DD-MM-YYYY"]);
            }

            startTimestamp = fromDate.clone().startOf("day");
            endTimestamp = toDate.clone().endOf("day");

            fromDate.tz(timezone);
            toDate.tz(timezone);

            if (fromDate.valueOf() > toDate.valueOf()) {
                // Incorrect range - reset to 30 days
                const nDays = 30;

                startTimestamp = _currMoment.clone().startOf("day").subtract(nDays - 1, "days");
                endTimestamp = _currMoment.clone().endOf("day");
            }
        }
        else if (period === "month") {
            startTimestamp = _currMoment.clone().startOf("year");
        }
        else if (period === "day") {
            startTimestamp = _currMoment.clone().startOf("month");
        }
        else if (period === "prevMonth") {
            startTimestamp = _currMoment.clone().subtract(1, "month").startOf("month");
            endTimestamp = _currMoment.clone().subtract(1, "month").endOf("month");
        }
        else if (period === "hour") {
            startTimestamp = _currMoment.clone().startOf("day");
        }
        else if (period === "yesterday") {
            const yesterday = _currMoment.clone().subtract(1, "day");
            startTimestamp = yesterday.clone().startOf("day");
            endTimestamp = yesterday.clone().endOf("day");
        }
        else if (/([1-9][0-9]*)minutes/.test(period as string)) {
            const nMinutes = Number.parseInt(/([1-9][0-9]*)minutes/.exec(period as string)![1]);
            startTimestamp = _currMoment.clone().startOf("minute").subtract(nMinutes - 1, "minutes");
        }
        else if (/([1-9][0-9]*)hours/.test(period as string)) {
            const nHours = Number.parseInt(/([1-9][0-9]*)hours/.exec(period as string)![1]);
            startTimestamp = _currMoment.clone().startOf("hour").subtract(nHours - 1, "hours");
        }
        else if (/([1-9][0-9]*)days/.test(period as string)) {
            const nDays = Number.parseInt(/([1-9][0-9]*)days/.exec(period as string)![1]);
            startTimestamp = _currMoment.clone().startOf("day").subtract(nDays - 1, "days");
        }
        else if (/([1-9][0-9]*)weeks/.test(period as string)) {
            const nWeeks = Number.parseInt(/([1-9][0-9]*)weeks/.exec(period as string)![1]);
            startTimestamp = _currMoment.clone().startOf("week").subtract((nWeeks - 1), "weeks");
        }
        else if (/([1-9][0-9]*)months/.test(period as string)) {
            const nMonths = Number.parseInt(/([1-9][0-9]*)months/.exec(period as string)![1]);
            startTimestamp = _currMoment.clone().startOf("month").subtract((nMonths - 1), "months");
        }
        else if (/([1-9][0-9]*)years/.test(period as string)) {
            const nYears = Number.parseInt(/([1-9][0-9]*)years/.exec(period as string)![1]);
            startTimestamp = _currMoment.clone().startOf("year").subtract((nYears - 1), "years");
        }
        // Incorrect period, defaulting to 30 days
        else {
            const nDays = 30;
            startTimestamp = _currMoment.clone().startOf("day").subtract(nDays - 1, "days");
        }
        if (!offset) {
            offset = startTimestamp.utcOffset();
            offset = offset * -1;
        }

        return {"$gt": startTimestamp.valueOf() + offset * 60000, "$lt": endTimestamp.valueOf() + offset * 60000};
    }

    /**
     * Gets projection based on timezone and bucket
     * @param bucket - d, h, m, w
     * @param timezone - timezone for display
     * @returns projection
     */
    getDateStringProjection(bucket: string, timezone?: string): Record<string, unknown> {
        if (!(bucket === "h" || bucket === "d" || bucket === "m" || bucket === "w")) {
            bucket = "d";
        }
        let dstr: Record<string, unknown> = {"$toDate": "$ts"};
        if (bucket === "h") {
            dstr = {"$dateToString": {"date": dstr, "format": "%Y:%m:%d:%H", "timezone": (timezone || "UTC")}};
        }
        if (bucket === "m") {
            dstr = {"$dateToString": {"date": dstr, "format": "%Y:%m", "timezone": (timezone || "UTC")}};
        }
        else if (bucket === "w") {
            dstr = {"$dateToString": {"date": dstr, "format": "%Y:%U", "timezone": (timezone || "UTC")}};
        }
        else if (bucket === "d") {
            dstr = {"$dateToString": {"date": dstr, "format": "%Y:%m:%d", "timezone": (timezone || "UTC")}};
        }
        return dstr;
    }

    /**
     * Calculates timezone for mongo based on offset
     * @param offset - offset in minutes
     * @returns timezone
     */
    calculateTimezoneFromOffset(offset: number): string {
        const hours = Math.abs(Math.floor(offset / 60));
        const minutes = Math.abs(offset % 60);
        return (offset < 0 ? "+" : "-") + (hours < 10 ? "0" : "") + hours + ":" + (minutes < 10 ? "0" : "") + minutes;
    }

    /**
     * Fetches list of most popular segment values for a given period
     * @param options - query options
     * @returns fetched data
     */
    async segmentValuesForPeriod(options: QueryOptions): Promise<AggregatedDataItem[]> {
        const match: Record<string, unknown> = options.dbFilter || {};
        if (options.appID) {
            match.a = options.appID + "";
        }
        if (options.event) {
            match.e = options.event;
        }
        if (options.name) {
            match.n = options.name;
        }
        if (options.period) {
            match.ts = this.getPeriodRange(options.period, "UTC", options.periodOffset);
        }

        const pipeline: Record<string, unknown>[] = [];
        pipeline.push({"$match": match});
        pipeline.push({"$group": {"_id": "$" + options.field, "c": {"$sum": 1}}});
        pipeline.push({"$sort": {"c": -1}});
        pipeline.push({"$limit": options.limit || 1000});
        const data = await this.db.collection("drill_events").aggregate(pipeline).toArray();
        return data;
    }

    /**
     * Gets aggregated data chosen timezone. If not set - returns in UTC timezone.
     * @param options - options
     * @returns aggregated data
     */
    async getAggregatedData(options: QueryOptions): Promise<AggregatedDataItem[]> {
        const pipeline = options.pipeline || [];
        const match: Record<string, unknown> = options.match || {};

        if (options.appID) {
            match.a = options.appID + "";
        }
        if (options.event) {
            if (Array.isArray(options.event)) {
                match.e = {"$in": options.event};
            }
            else {
                match.e = options.event;
            }
        }
        if (options.name) {
            if (Array.isArray(options.event)) {
                match.n = {"$in": options.name};
            }
            else {
                match.n = options.name;
            }
        }
        if (options.period) {
            match.ts = this.getPeriodRange(options.period, options.timezone || "UTC", options.periodOffset);
        }
        if (options.bucket !== "h" && options.bucket !== "d" && options.bucket !== "m" && options.bucket !== "w") {
            options.bucket = "h";
        }
        pipeline.push({"$match": match});

        pipeline.push({"$addFields": {"d": this.getDateStringProjection(options.bucket, options.timezone)}});
        if (options.segmentation) {
            pipeline.push({"$unwind": ("$" + options.segmentation)});
            pipeline.push({"$group": {"_id": {"d": "$d", "sg": "$" + options.segmentation}, "c": {"$sum": "$c"}, "dur": {"$sum": "$dur"}, "s": {"$sum": "$s"}}});
            pipeline.push({"$project": { "_id": "$_id.d", "sg": "$_id.sg", "c": 1, "dur": 1, "s": 1}});
        }
        else {
            pipeline.push({"$group": {"_id": "$d", "c": {"$sum": "$c"}, "dur": {"$sum": "$dur"}, "s": {"$sum": "$s"}}});
        }
        let data: AggregatedDataItem[];
        try {
            data = await this.db.collection("drill_events").aggregate(pipeline).toArray();
        }
        catch (e) {
            console.log(e);
            data = [];
        }

        for (const datum of data) {
            datum._id = datum._id.replaceAll(/:0/gi, ":");
            if (datum.sg) {
                datum.sg = datum.sg!.replaceAll(/\./gi, ":");
            }
        }

        return data;
    }

    /**
     * Gets session table data
     * @param options - options
     * @returns aggregated data
     */
    async aggregatedSessionData(options: QueryOptions): Promise<AggregatedDataItem[]> {
        const pipeline = options.pipeline || [];
        const match: Record<string, unknown> = {"e": "[CLY]_session"};

        if (options.appID) {
            match.a = options.appID + "";
        }

        if (options.period) {
            match.ts = this.getPeriodRange(options.period, options.timezone || "UTC", options.periodOffset);
        }

        pipeline.push({"$match": match});
        pipeline.push({"$addFields": {"n": {"$cond": [{"$eq": ["$up.sc", 1]}, 1, 0]}}});
        if (options.segmentation) {
            pipeline.push({"$group": {"_id": {"u": "$uid", "sg": "$" + options.segmentation}, "d": {"$sum": "$dur"}, "t": {"$sum": 1}, "n": {"$sum": "$n"}}});
            pipeline.push({"$group": {"_id": "$_id.sg", "t": {"$sum": "$t"}, "d": {"$sum": "$d"}, "n": {"$sum": "$n"}, "u": {"$sum": 1}}});
        }
        else {
            pipeline.push({"$group": {"_id": "$uid", "t": {"$sum": 1}, "d": {"$sum": "$dur"}, "n": {"$sum": "$n"}}});
            pipeline.push({"$group": {"_id": null, "u": {"$sum": 1}, "d": {"$sum": "$d"}, "t": {"$sum": "$t"}, "n": {"$sum": "$n"}}});
        }
        console.log(JSON.stringify(pipeline));
        const data = await this.db.collection("drill_events").aggregate(pipeline).toArray();
        for (const datum of data) {
            if (datum.sg) {
                datum.sg = datum.sg!.replaceAll(/\./gi, ":");
            }
        }
        return data;
    }

    /**
     * Get graph data based on unique
     * @param options - options
     * @returns model data as array
     */
    async getUniqueGraph(options: QueryOptions): Promise<AggregatedDataItem[]> {
        const match: Record<string, unknown> = options.dbFilter || {};
        if (options.appID) {
            match.a = options.appID + "";
        }
        if (options.event) {
            match.e = options.event;
        }
        if (options.name) {
            match.n = options.name;
        }
        if (options.period) {
            match.ts = this.getPeriodRange(options.period, "UTC", options.periodOffset);
        }
        const field = options.field || "uid";

        if (options.bucket !== "h" && options.bucket !== "d" && options.bucket !== "m" && options.bucket !== "w") {
            options.bucket = "d";
        }

        if (options.periodOffset) {
            options.timezone = this.calculateTimezoneFromOffset(options.periodOffset);
        }
        const pipeline: Record<string, unknown>[] = [];
        pipeline.push({"$match": match});
        pipeline.push({"$addFields": {"d": this.getDateStringProjection(options.bucket, options.timezone)}});
        pipeline.push({"$group": {"_id": {"d": "$d", "id": "$" + field}}});
        pipeline.push({"$group": {"_id": "$_id.d", "u": {"$sum": 1}}});
        const data = await this.db.collection("drill_events").aggregate(pipeline).toArray();
        for (const datum of data) {
            datum._id = datum._id.replaceAll(/:0/gi, ":");
            if (datum.sg) {
                datum.sg = datum.sg!.replaceAll(/\./gi, ":");
            }
        }
        return data;
    }

    /**
     * Gets unique count (single number)
     * @param options - options
     * @returns number
     */
    async getUniqueCount(options: QueryOptions): Promise<number> {
        const match: Record<string, unknown> = options.dbFilter || {};
        if (options.appID) {
            match.a = options.appID + "";
        }
        if (options.event) {
            match.e = options.event;
        }
        if (options.name) {
            match.n = options.name;
        }
        if (options.period) {
            match.ts = this.getPeriodRange(options.period, "UTC", options.periodOffset);
        }
        const field = options.field || "uid";
        const pipeline: Record<string, unknown>[] = [
            {"$match": match},
            {"$group": {"_id": "$" + field}},
            {"$group": {"_id": null, "c": {"$sum": 1}}}
        ];
        const data = await this.db.collection("drill_events").aggregate(pipeline).toArray();
        const result = data[0] || {"c": 0};
        return result.c || 0;
    }

    /**
     * Gets views table data
     * @param options - options
     * @returns table data
     */
    async getViewsTableData(options: QueryOptions): Promise<AggregatedDataItem[]> {
        const match: Record<string, unknown> = options.dbFilter || {};
        if (options.appID) {
            match.a = options.appID + "";
        }
        match.e = "[CLY]_view";
        if (options.period) {
            match.ts = this.getPeriodRange(options.period, "UTC", options.periodOffset);
        }

        const pipeline: Record<string, unknown>[] = [];
        pipeline.push({"$match": match});
        pipeline.push({"$group": {"_id": {"u": "$uid", "sg": "$n" }, "t": {"$sum": 1}, "d": {"$sum": "$dur"}, "s": {"$sum": "$sg.visit"}, "e": {"$sum": "$sg.exit"}, "b": {"$sum": "$sg.bounce"}}});
        pipeline.push({"$addFields": {"u": 1}});
        // Union with cly action
        pipeline.push({
            "$unionWith": {
                "coll": "drill_events",
                "pipeline": [
                    {"$match": {"e": "[CLY]_action", "sg.type": "scroll", "ts": match.ts, "a": match.a}},
                    {"$group": {"_id": {"u": "$uid", "sg": "$n"}, "scr": {"$sum": "$sg.scr"}}}
                ]
            }
        });
        pipeline.push({"$group": {"_id": "$_id.sg", "u": {"$sum": "$u"}, "t": {"$sum": "$t"}, "d": {"$sum": "$d"}, "s": {"$sum": "$s"}, "e": {"$sum": "$e"}, "b": {"$sum": "$b"}, "scr": {"$sum": "$scr"}}});
        pipeline.push({
            "$addFields": {
                "scr-calc": { $cond: [ { $or: [{$eq: ["$t", 0]}, {$eq: ['$scr', 0]}]}, 0, {'$divide': ['$scr', "$t"]}] },
                "d-calc": { $cond: [ { $or: [{$eq: ["$t", 0]}, {$eq: ['$d', 0]}]}, 0, {'$divide': ['$d', "$t"]}] },
                "br": { $cond: [ { $or: [{$eq: ["$s", 0]}, {$eq: ['$b', 0]}]}, 0, {'$divide': [{"$min": ['$b', "$s"]}, "$s"]}] },
                "b": {"$min": [{"$ifNull": ["$b", 0]}, {"$ifNull": ["$s", 0]}]},
                "view": "$_id"
            }
        });
        console.log(JSON.stringify(pipeline));
        const data = await this.db.collection("drill_events").aggregate(pipeline).toArray();
        for (const datum of data) {
            datum._id = datum._id.replaceAll(/:0/gi, ":");
            if (datum.sg) {
                datum.sg = datum.sg!.replaceAll(/\./gi, ":");
            }
        }
        return data;
    }

    /**
     * Fetches data for times of day plugin from granular
     * @param options - options
     * @returns table data
     */
    async timesOfDay(options: QueryOptions): Promise<AggregatedDataItem[]> {
        const match: Record<string, unknown> = options.match || {};
        if (options.appID) {
            match.a = options.appID + "";
        }

        if (options.event) {
            match.e = options.event;
        }

        const pipeline: Record<string, unknown>[] = [
            {"$match": match},
            {"$group": {"_id": {"d": "$up.dow", "h": "$up.hour"}, "c": {"$sum": 1}}}
        ];

        const data = await this.db.collection("drill_events").aggregate(pipeline).toArray();
        return data || [];
    }
}

export { MongoDbQueryRunner };
export type { QueryOptions, PeriodRange, AggregatedDataItem };
