import { z } from "zod";
import { createRequire } from "module";
import { router, publicProcedure } from "../../../trpc.ts";

// @ts-expect-error TS1470 - import.meta is valid at runtime (Node 22+ treats .ts with imports as ESM)
const require = createRequire(import.meta.url);

// Lazy-loaded modules: these depend on the DB/server being initialized,
// so we require them on first use rather than at import time.
let _common: any, _countlyCommon: any, _fetch: any, _getGraphValues: any, _getTotals: any, _moment: any;

function deps() {
    if (!_common) {
        _common = require("../../../api/utils/common.js");
        _countlyCommon = require("../../../api/lib/countly.common.js");
        _fetch = require("../../../api/parts/data/fetch.js");
        const viewsQueries = require("./queries/views.js");
        _getGraphValues = viewsQueries.getGraphValues;
        _getTotals = viewsQueries.getTotals;
        _moment = require("moment-timezone");
    }
    return {
        common: _common,
        countlyCommon: _countlyCommon,
        fetch: _fetch,
        getGraphValues: _getGraphValues,
        getTotals: _getTotals,
        moment: _moment,
    };
}

/**
 * Wraps fetch.getTimeObj in a promise
 */
function getTimeObj(
    collection: string,
    params: any,
    options: any
): Promise<any> {
    const { fetch } = deps();
    return new Promise((resolve, reject) => {
        try {
            fetch.getTimeObj(collection, params, options, (data: any) => {
                resolve(data);
            });
        }
        catch (err) {
            reject(err);
        }
    });
}

const chartInput = z.object({
    app_id: z.string(),
    period: z.union([
        z.string(),                                   // "30days", "month", "hour", etc.
        z.tuple([z.number(), z.number()]),             // [startTs, endTs]
    ]),
    selectedViews: z.array(z.object({
        view: z.string(),                             // view _id from app_viewsmeta
    })).min(1),
    bucket: z.enum(["h", "d", "w", "m"]).optional(),  // hourly, daily, weekly, monthly
    segment: z.string().optional(),
    segmentVal: z.string().optional(),
    periodOffset: z.number().optional(),               // client timezone offset in minutes
});

type ChartInput = z.infer<typeof chartInput>;

const metricsInput = z.object({
    app_id: z.string(),
    period: z.union([
        z.string(),                                   // "30days", "month", etc.
        z.tuple([z.number(), z.number()]),             // [startTs, endTs]
    ]),
    periodOffset: z.number().optional(),               // client timezone offset in minutes
});

type ViewTimeSeriesData = Record<string, any>;

type ChartOutput = {
    appID: string;
    data: Record<string, ViewTimeSeriesData>;
};

export const viewsRouter = router({
    chart: publicProcedure
        .meta({
            openapi: {
                method: "POST",
                path: "/views/chart",
                tags: ["Views"],
                summary: "Get view chart time-series data",
            },
        })
        .input(chartInput)
        .output(z.object({
            appID: z.string(),
            data: z.record(z.string(), z.any()),
        }))
        .query(async ({ input }): Promise<ChartOutput> => {
            const { common, countlyCommon, getGraphValues, moment } = deps();
            const { app_id, period, selectedViews, bucket, segment: segmentKey, segmentVal, periodOffset } = input;

            const segment = segmentKey || "no-segment";
            const retData: Record<string, any> = {};

            // Fetch view names
            const ids = selectedViews.map((v) => v.view);
            const viewMeta: any[] = await common.db
                .collection("app_viewsmeta")
                .find({ _id: { $in: ids } })
                .toArray();

            const graphKeys = selectedViews.map((v) => {
                const meta = viewMeta.find((m: any) => m._id === v.view);
                return {
                    view: v.view,
                    name: meta ? meta.view : v.view,
                };
            });

            for (const meta of viewMeta) {
                retData[meta._id + "_name"] = meta.display || meta.view;
            }

            // Build timezone + period range for drill query
            const app = await common.db.collection("apps").findOne({ _id: common.db.ObjectID(app_id) });
            const appTimezone = app?.timezone || "UTC";

            let tz: string;
            if (periodOffset != null) {
                const offsetHours = Math.round(periodOffset / 60);
                tz = offsetHours >= 0 ? "Etc/GMT+" + offsetHours : "Etc/GMT-" + Math.abs(offsetHours);
            }
            else {
                tz = appTimezone;
            }

            const periodValue = typeof period === "string" ? period : JSON.stringify(period);
            const currentRange = countlyCommon.getPeriodRange(periodValue, tz);

            // Compute hourly offset for timezone shifting
            let offset = 0;
            if (periodOffset != null) {
                const dd = moment(new Date());
                if (appTimezone) {
                    dd.tz(appTimezone);
                }
                const appOffset = dd.utcOffset();
                offset = (appOffset + periodOffset) / 60;
            }

            // Build params.time (needed by fetch.getTimeObj)
            const time = common.initTimeObj(appTimezone);

            for (const viewItem of graphKeys) {
                const paramsObj: any = {
                    time,
                    app_id,
                    qstring: {
                        app_id,
                        period: periodValue,
                    },
                };

                const levels = ["u", "t", "s", "b", "e", "d", "scr", "uvc"];

                // 1. Get pre-aggregated time series from app_viewdata
                let data2 = await getTimeObj("app_viewdata", paramsObj, {
                    dontBreak: true,
                    id_prefix: app_id + "_",
                    id: segment,
                    id_postfix: "_" + viewItem.view.replace(app_id + "_", ""),
                    levels: {
                        daily: levels,
                        monthly: ["t", "s", "b", "e", "d", "scr"],
                    },
                });

                // Timezone shift if needed
                if (offset) {
                    const props = { b: true, t: true, s: true, d: true, u: true, scr: true, e: true };
                    let arrayData = common.convertModelToArray(data2, segment !== "no-segment");
                    arrayData = common.shiftHourlyData(arrayData, offset * -1);
                    data2 = common.convertArrayToModel(
                        arrayData,
                        segment !== "no-segment" ? segment : null,
                        props
                    );
                }

                // 2. Get unique user graph values from drill
                const drillQuery: any = {
                    a: app_id,
                    e: "[CLY]_view",
                    ts: currentRange,
                    n: viewItem.name,
                };
                if (segmentKey && segmentVal) {
                    drillQuery["sg." + segmentKey] = segmentVal;
                }

                try {
                    const graphResult = await getGraphValues({
                        timezone: tz,
                        bucket: bucket || "d",
                        query: drillQuery,
                    }, { adapter: "mongodb" });
                    if (graphResult?.data) {
                        common.applyUniqueOnModel(data2, graphResult.data, "u", segmentVal);
                    }
                }
                catch (err) {
                    // Graph values are supplementary; continue without them
                }

                retData[viewItem.view] = {};
                retData[viewItem.view][segment] = data2;
            }

            return { appID: app_id, data: retData };
        }),

    metrics: publicProcedure
        .meta({
            openapi: {
                method: "POST",
                path: "/views/metrics",
                tags: ["Views"],
                summary: "Get aggregate view metrics (total views, users, bounces)",
            },
        })
        .input(metricsInput)
        .output(z.object({
            t: z.number(),
            u: z.number(),
            s: z.number(),
            b: z.number(),
            br: z.number(),
        }))
        .query(async ({ input }) => {
            const { common, countlyCommon, moment, getTotals } = deps();
            const { app_id, period, periodOffset } = input;

            // Get app timezone
            const app = await common.db.collection("apps").findOne(
                { _id: common.db.ObjectID(app_id) },
                { projection: { timezone: 1 } },
            );
            const appTimezone = app?.timezone || "UTC";

            // Compute timezone offset (same logic as chart endpoint)
            let offset = 0;
            if (periodOffset != null) {
                const dd = moment(new Date());
                if (appTimezone) dd.tz(appTimezone);
                const appOffset = dd.utcOffset();
                offset = (appOffset + periodOffset) / 60;
                offset = offset * -1;
            }

            // Get period day array
            const periodValue = typeof period === "string" ? period : JSON.stringify(period);
            let periodObj = countlyCommon.getPeriodObj({ qstring: { period: periodValue } });

            if (offset) {
                const adjusted = JSON.stringify([
                    periodObj.start - offset * 3600000,
                    periodObj.end - offset * 3600000,
                ]);
                periodObj = countlyCommon.getPeriodObj({ qstring: { period: adjusted } });
            }

            const dayArray: string[] = periodObj.currentPeriodArr;
            const prefix = app_id + "_no-segment_";

            // Group days by year:month
            const monthDays: Record<string, string[]> = {};
            for (const dayStr of dayArray) {
                const [year, month, day] = dayStr.split(".");
                const key = year + ":" + month;
                if (!monthDays[key]) monthDays[key] = [];
                monthDays[key].push(day);
            }

            let t = 0, s = 0, b = 0, u = 0;

            // Aggregate app_viewdata for t, s, b
            const monthEntries = Object.entries(monthDays);
            if (monthEntries.length > 0) {
                const pipeline: any[] = [];
                let isFirst = true;

                for (const [yearMonth, days] of monthEntries) {
                    const match = { $match: { _id: { $regex: "^" + prefix + yearMonth + "_" } } };
                    const project: any = {
                        _id: "$vw",
                        t: { $sum: days.map((d: string) => "$d." + d + ".t") },
                        s: { $sum: days.map((d: string) => "$d." + d + ".s") },
                        b: { $sum: days.map((d: string) => "$d." + d + ".b") },
                    };

                    if (isFirst) {
                        pipeline.push(match, { $project: project });
                        isFirst = false;
                    }
                    else {
                        pipeline.push({
                            $unionWith: {
                                coll: "app_viewdata",
                                pipeline: [match, { $project: project }],
                            },
                        });
                    }
                }

                // Group per view (a view may span multiple monthly documents)
                pipeline.push({
                    $group: {
                        _id: "$_id",
                        t: { $sum: "$t" },
                        s: { $sum: "$s" },
                        b: { $sum: "$b" },
                    },
                });

                // Cap bounces at starts per view (same as legacy pipeline)
                pipeline.push({
                    $project: {
                        t: 1,
                        s: 1,
                        b: { $min: [{ $ifNull: ["$b", 0] }, { $ifNull: ["$s", 0] }] },
                    },
                });

                // Sum across all views
                pipeline.push({
                    $group: { _id: null, t: { $sum: "$t" }, s: { $sum: "$s" }, b: { $sum: "$b" } },
                });

                const result = await common.db
                    .collection("app_viewdata")
                    .aggregate(pipeline, { allowDiskUse: true })
                    .toArray();

                if (result[0]) {
                    t = result[0].t || 0;
                    s = result[0].s || 0;
                    b = result[0].b || 0;
                }
            }

            // Get unique users from drill_events
            try {
                let tz: string;
                if (periodOffset != null) {
                    const offsetHours = Math.round(periodOffset / 60);
                    tz = offsetHours >= 0
                        ? "Etc/GMT+" + offsetHours
                        : "Etc/GMT-" + Math.abs(offsetHours);
                }
                else {
                    tz = appTimezone;
                }

                const currentRange = countlyCommon.getPeriodRange(periodValue, tz);
                const drillResult = await getTotals(
                    { query: { a: app_id, e: "[CLY]_view", ts: currentRange } },
                    { adapter: "mongodb" },
                );
                if (drillResult?.u) {
                    u = drillResult.u;
                }
                else if (drillResult?.data?.u) {
                    u = drillResult.data.u;
                }
            }
            catch (_err) {
                // drill is supplementary; continue without unique users
            }

            // Bounce rate (same formula as legacy frontend)
            const br = s ? Math.round(Math.min(b, s) / s * 1000) / 10 : 0;

            return { t, u, s, b, br };
        }),

    table: publicProcedure
        .meta({
            openapi: {
                method: "POST",
                path: "/views/table",
                tags: ["Views"],
                summary: "Get per-view table data with bounce rate and duration",
            },
        })
        .input(metricsInput)
        .output(z.object({
            rows: z.array(z.object({
                _id: z.string(),
                view: z.string(),
                display: z.string(),
                t: z.number(),
                s: z.number(),
                e: z.number(),
                b: z.number(),
                d: z.number(),
                br: z.number(),
                avgDuration: z.number(),
            })),
        }))
        .query(async ({ input }) => {
            const { common, countlyCommon, moment } = deps();
            const { app_id, period, periodOffset } = input;

            // Get app timezone
            const app = await common.db.collection("apps").findOne(
                { _id: common.db.ObjectID(app_id) },
                { projection: { timezone: 1 } },
            );
            const appTimezone = app?.timezone || "UTC";

            // Compute timezone offset
            let offset = 0;
            if (periodOffset != null) {
                const dd = moment(new Date());
                if (appTimezone) dd.tz(appTimezone);
                const appOffset = dd.utcOffset();
                offset = (appOffset + periodOffset) / 60;
                offset = offset * -1;
            }

            // Get period day array
            const periodValue = typeof period === "string" ? period : JSON.stringify(period);
            let periodObj = countlyCommon.getPeriodObj({ qstring: { period: periodValue } });

            if (offset) {
                const adjusted = JSON.stringify([
                    periodObj.start - offset * 3600000,
                    periodObj.end - offset * 3600000,
                ]);
                periodObj = countlyCommon.getPeriodObj({ qstring: { period: adjusted } });
            }

            const dayArray: string[] = periodObj.currentPeriodArr;
            const prefix = app_id + "_no-segment_";

            // Group days by year:month
            const monthDays: Record<string, string[]> = {};
            for (const dayStr of dayArray) {
                const [year, month, day] = dayStr.split(".");
                const key = year + ":" + month;
                if (!monthDays[key]) monthDays[key] = [];
                monthDays[key].push(day);
            }

            const monthEntries = Object.entries(monthDays);
            if (monthEntries.length === 0) {
                return { rows: [] };
            }

            // Build aggregation pipeline (same pattern as metrics, but per-view)
            const pipeline: any[] = [];
            let isFirst = true;

            for (const [yearMonth, days] of monthEntries) {
                const match = { $match: { _id: { $regex: "^" + prefix + yearMonth + "_" } } };
                const project: any = {
                    _id: "$vw",
                    t: { $sum: days.map((d: string) => "$d." + d + ".t") },
                    s: { $sum: days.map((d: string) => "$d." + d + ".s") },
                    e: { $sum: days.map((d: string) => "$d." + d + ".e") },
                    b: { $sum: days.map((d: string) => "$d." + d + ".b") },
                    d: { $sum: days.map((d: string) => "$d." + d + ".d") },
                };

                if (isFirst) {
                    pipeline.push(match, { $project: project });
                    isFirst = false;
                }
                else {
                    pipeline.push({
                        $unionWith: {
                            coll: "app_viewdata",
                            pipeline: [match, { $project: project }],
                        },
                    });
                }
            }

            // Group per view across months
            pipeline.push({
                $group: {
                    _id: "$_id",
                    t: { $sum: "$t" },
                    s: { $sum: "$s" },
                    e: { $sum: "$e" },
                    b: { $sum: "$b" },
                    d: { $sum: "$d" },
                },
            });

            // Only include views with at least 1 view
            pipeline.push({ $match: { t: { $gt: 0 } } });

            // Compute bounce rate and avg duration; cap bounces
            pipeline.push({
                $project: {
                    t: 1,
                    s: 1,
                    e: 1,
                    b: { $min: [{ $ifNull: ["$b", 0] }, { $ifNull: ["$s", 0] }] },
                    d: 1,
                    br: {
                        $cond: [
                            { $eq: ["$s", 0] },
                            0,
                            { $round: [{ $multiply: [{ $divide: [{ $min: ["$b", "$s"] }, "$s"] }, 100] }, 1] },
                        ],
                    },
                    avgDuration: {
                        $cond: [
                            { $eq: ["$t", 0] },
                            0,
                            { $round: [{ $divide: ["$d", "$t"] }, 1] },
                        ],
                    },
                },
            });

            // Join with app_viewsmeta for view names
            pipeline.push({
                $lookup: {
                    from: "app_viewsmeta",
                    localField: "_id",
                    foreignField: "_id",
                    as: "meta",
                },
            });

            pipeline.push({
                $project: {
                    t: 1, s: 1, e: 1, b: 1, d: 1, br: 1, avgDuration: 1,
                    view: { $ifNull: [{ $arrayElemAt: ["$meta.view", 0] }, "$_id"] },
                    display: {
                        $ifNull: [
                            { $arrayElemAt: ["$meta.display", 0] },
                            { $ifNull: [{ $arrayElemAt: ["$meta.view", 0] }, "$_id"] },
                        ],
                    },
                },
            });

            // Sort by total views descending
            pipeline.push({ $sort: { t: -1 } });

            const result = await common.db
                .collection("app_viewdata")
                .aggregate(pipeline, { allowDiskUse: true })
                .toArray();

            const rows = result.map((r: any) => ({
                _id: r._id,
                view: r.view || r._id,
                display: r.display || r.view || r._id,
                t: r.t || 0,
                s: r.s || 0,
                e: r.e || 0,
                b: r.b || 0,
                d: r.d || 0,
                br: r.br || 0,
                avgDuration: r.avgDuration || 0,
            }));

            return { rows };
        }),
});

export type ViewsRouter = typeof viewsRouter;
