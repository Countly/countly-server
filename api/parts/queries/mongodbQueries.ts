/*
 *
 * Mongodb queries to calculate aggregated data from granular data
 *
 */
import { createRequire } from 'module';

// @ts-expect-error - import.meta is available at runtime with Node's native TypeScript support
const require = createRequire(import.meta.url);

const countlyCommon = require('../../lib/countly.common.js');
const common = require('../../utils/common.js');

interface QueryMeta {
    adapter: string;
    query: Record<string, unknown>[] | string;
}

interface QueryResult {
    _queryMeta: QueryMeta;
    data: unknown;
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
    n?: number | string;
    e?: number;
    b?: number;
    scr?: number;
    'scr-calc'?: number;
    'd-calc'?: number;
    br?: number;
    view?: string;
    totalc?: number;
    values?: unknown[];
}

interface QueryOptions {
    appID?: string;
    event?: string | string[];
    name?: string | string[];
    period?: unknown;
    periodOffset?: number;
    timezone?: string;
    bucket?: string;
    buckets?: string[];
    segmentation?: string;
    field?: string;
    limit?: number;
    dbFilter?: Record<string, unknown>;
    pipeline?: Record<string, unknown>[];
    match?: Record<string, unknown>;
    query?: Record<string, unknown>;
    event_breakdown?: boolean;
}

/**
 * Gets projection based on timezone and bucket
 * @param bucket - d, h, m, w
 * @param timezone - timezone for display
 * @returns projection
 */
function getDateStringProjection(bucket: string, timezone?: string): Record<string, unknown> {
    if (!(bucket === 'h' || bucket === 'd' || bucket === 'm' || bucket === 'w' || bucket === 'y')) {
        bucket = 'd';
    }
    let dstr: Record<string, unknown> = { '$toDate': '$ts' };
    if (bucket === 'h') {
        dstr = { '$dateToString': { 'date': dstr, 'format': '%Y:%m:%d:%H', 'timezone': (timezone || 'UTC') } };
    }
    if (bucket === 'm') {
        dstr = { '$dateToString': { 'date': dstr, 'format': '%Y:%m', 'timezone': (timezone || 'UTC') } };
    }
    else if (bucket === 'w') {
        dstr = { '$dateToString': { 'date': dstr, 'format': '%Y:%U', 'timezone': (timezone || 'UTC') } };
    }
    else if (bucket === 'd') {
        dstr = { '$dateToString': { 'date': dstr, 'format': '%Y:%m:%d', 'timezone': (timezone || 'UTC') } };
    }
    else if (bucket === 'y') {
        dstr = { '$dateToString': { 'date': dstr, 'format': '%Y', 'timezone': (timezone || 'UTC') } };
    }
    return dstr;
}

async function getUniqueUserModel(options: QueryOptions): Promise<QueryResult> {
    const pipeline: Record<string, unknown>[] = [];
    pipeline.push({ '$match': options.query });
    const facets: Record<string, Record<string, unknown>[]> = {};
    for (let z = 0; z < options.buckets!.length; z++) {
        const facet: Record<string, unknown>[] = [];
        facet.push({ '$group': { '_id': { 'u': '$uid', 'd': getDateStringProjection(options.buckets![z], options.timezone) } } });
        facet.push({ '$group': { '_id': '$_id.d', 'u': { '$sum': 1 } } });
        facets[options.buckets![z]] = facet;
    }
    pipeline.push({ '$facet': facets });
    let data = await common.drillDb.collection('drill_events').aggregate(pipeline).toArray();
    const returnData: { _id: string; u: number }[] = [];
    data = data[0] || {};
    for (let i = 0; i < options.buckets!.length; i++) {
        for (let m = 0; m < (data[options.buckets![i]] || []).length; m++) {
            let iid = data[options.buckets![i]][m]._id.replaceAll(/:/gi, '.').replaceAll(/\.0/gi, '.');
            if (options.buckets![i] === 'w') {
                iid = iid.replace('.', '.w');
            }

            returnData.push({
                _id: iid,
                u: data[options.buckets![i]][m].u
            });
        }
    }
    return {
        _queryMeta: {
            adapter: 'mongodb',
            query: pipeline || 'MongoDB event segmentation aggregation pipeline',
        },
        data: returnData
    };
}

/**
 * Gets session table data
 * @param options - options
 * @returns aggregated data
 */
async function aggregatedSessionData(options: QueryOptions): Promise<QueryResult> {
    const pipeline = options.pipeline || [];
    const match: Record<string, unknown> = { 'e': '[CLY]_session' };

    if (options.appID) {
        match.a = options.appID + '';
    }

    if (options.period) {
        match.ts = countlyCommon.getPeriodRange(options.period, options.timezone, options.periodOffset);
    }

    pipeline.push({ '$match': match });
    pipeline.push({ '$addFields': { 'n': { '$cond': [{ '$eq': ['$up.sc', 1] }, 1, 0] } } });
    if (options.segmentation) {
        pipeline.push({ '$group': { '_id': { 'u': '$uid', 'sg': '$' + options.segmentation }, 'd': { '$sum': '$dur' }, 't': { '$sum': 1 }, 'n': { '$sum': '$n' } } });
        pipeline.push({ '$group': { '_id': '$_id.sg', 't': { '$sum': '$t' }, 'd': { '$sum': '$d' }, 'n': { '$sum': '$n' }, 'u': { '$sum': 1 } } });
    }
    else {
        pipeline.push({ '$group': { '_id': '$uid', 't': { '$sum': 1 }, 'd': { '$sum': '$dur' }, 'n': { '$sum': '$n' } } });
        pipeline.push({ '$group': { '_id': null, 'u': { '$sum': 1 }, 'd': { '$sum': '$d' }, 't': { '$sum': '$t' }, 'n': { '$sum': '$n' } } });
    }

    // Union with the one having [CLY]_session_begin.
    const copy_pipeline = JSON.parse(JSON.stringify(pipeline)) as Record<string, unknown>[];
    (copy_pipeline[0] as { $match: Record<string, unknown> }).$match.e = '[CLY]_session_begin';
    pipeline.push({ '$unionWith': { 'coll': 'drill_events', 'pipeline': copy_pipeline } });
    pipeline.push({ '$group': { '_id': '$_id', 'u': { '$max': '$u' }, 'd': { '$max': '$d' }, 't': { '$max': '$t' }, 'n': { '$max': '$n' } } });
    const data = await common.drillDb.collection('drill_events').aggregate(pipeline).toArray() as AggregatedDataItem[];
    for (const datum of data) {
        if (datum.sg) {
            datum.sg = datum.sg!.replaceAll(/\./gi, ':');
        }
    }
    return {
        _queryMeta: {
            adapter: 'mongodb',
            query: pipeline || 'MongoDB event segmentation aggregation pipeline',
        },
        data: data
    };
}

/**
 * Gets aggregated data chosen timezone. If not set - returns in UTC timezone.
 * @param options - options
 * @returns aggregated data
 */
async function getAggregatedData(options: QueryOptions): Promise<QueryResult> {
    const pipeline = options.pipeline || [];
    const match: Record<string, unknown> = options.match || { 'e': '[CLY]_custom' };

    if (options.appID) {
        match.a = options.appID + '';
    }
    if (options.event) {
        if (Array.isArray(options.event)) {
            match.e = { '$in': options.event };
        }
        else {
            match.e = options.event;
        }
    }
    if (options.name) {
        if (Array.isArray(options.name)) {
            match.n = { '$in': options.name };
        }
        else {
            match.n = options.name;
        }
    }
    if (options.period) {
        match.ts = countlyCommon.getPeriodRange(options.period, options.timezone, options.periodOffset);
    }
    if (options.bucket !== 'h' && options.bucket !== 'd' && options.bucket !== 'm' && options.bucket !== 'w') {
        options.bucket = 'h';
    }
    pipeline.push({ '$match': match });

    pipeline.push({ '$addFields': { 'd': getDateStringProjection(options.bucket, options.timezone) } });
    if (options.segmentation) {
        pipeline.push({ '$unwind': ('$' + options.segmentation) });
        if (options.event_breakdown) {
            pipeline.push({ '$group': { '_id': { 'd': '$d', 'sg': '$' + options.segmentation, 'n': '$n' }, 'c': { '$sum': '$c' }, 'dur': { '$sum': '$dur' }, 's': { '$sum': '$s' } } });
            pipeline.push({ '$project': { '_id': '$_id.d', 'sg': '$_id.sg', 'n': '$_id.n', 'c': 1, 'dur': 1, 's': 1 } });
        }
        else {
            pipeline.push({ '$group': { '_id': { 'd': '$d', 'sg': '$' + options.segmentation }, 'c': { '$sum': '$c' }, 'dur': { '$sum': '$dur' }, 's': { '$sum': '$s' } } });
            pipeline.push({ '$project': { '_id': '$_id.d', 'sg': '$_id.sg', 'c': 1, 'dur': 1, 's': 1 } });
        }
    }
    else {
        if (options.event_breakdown) {
            pipeline.push({ '$group': { '_id': { 'd': '$d', 'n': '$n' }, 'c': { '$sum': '$c' }, 'dur': { '$sum': '$dur' }, 's': { '$sum': '$s' } } });
            pipeline.push({ '$project': { '_id': '$_id.d', 'n': '$_id.n', 'c': 1, 'dur': 1, 's': 1 } });
        }
        else {
            pipeline.push({ '$group': { '_id': '$d', 'c': { '$sum': '$c' }, 'dur': { '$sum': '$dur' }, 's': { '$sum': '$s' } } });
        }
    }
    let data: AggregatedDataItem[];
    try {
        data = await common.drillDb.collection('drill_events').aggregate(pipeline).toArray();
    }
    catch (e) {
        console.log(e);
        data = [];
    }
    data = data || [];
    for (const datum of data) {
        datum._id = datum._id.replaceAll(/:0/gi, ':');
        if (datum.sg) {
            datum.sg = datum.sg!.replaceAll(/\./gi, ':');
        }
    }

    return {
        _queryMeta: {
            adapter: 'mongodb',
            query: pipeline || 'MongoDB event segmentation aggregation pipeline',
        },
        data: data
    };
}

async function getSegmentedEventModelData(options: QueryOptions): Promise<QueryResult> {
    const pipeline: Record<string, unknown>[] = [];
    const match: Record<string, unknown> = { 'e': '[CLY]_custom', 'a': options.appID + '' };
    if (options.name) {
        if (Array.isArray(options.name)) {
            match.n = { '$in': options.name };
        }
        else {
            match.n = options.name;
        }
    }
    if (options.period) {
        match.ts = countlyCommon.getPeriodRange(options.period, options.timezone, options.periodOffset);
    }

    if (options.bucket !== 'h' && options.bucket !== 'd' && options.bucket !== 'm' && options.bucket !== 'w') {
        options.bucket = 'h';
    }

    pipeline.push({ '$match': match });
    pipeline.push({ '$addFields': { 'd': getDateStringProjection(options.bucket, options.timezone) } });

    pipeline.push({ '$unwind': ('$' + options.segmentation) });
    pipeline.push({ '$group': { '_id': { 'd': '$d', 'sg': '$' + options.segmentation }, 'c': { '$sum': '$c' }, 'dur': { '$sum': '$dur' }, 's': { '$sum': '$s' } } });
    pipeline.push({ '$group': { '_id': '$_id.sg', 'totalc': { '$sum': '$c' }, 'values': { '$push': { 'd': '$_id.d', 'c': '$c', 'dur': '$dur', 's': '$s' } } } });
    pipeline.push({ '$sort': { 'totalc': -1 } });
    if (options.limit) {
        pipeline.push({ '$limit': options.limit });
    }
    pipeline.push({ '$unwind': '$values' });
    pipeline.push({ '$project': { '_id': '$_id', 'd': '$values.d', 'c': '$values.c', 'dur': '$values.dur', 's': '$values.s' } });

    let data: AggregatedDataItem[];
    try {
        data = await common.drillDb.collection('drill_events').aggregate(pipeline).toArray();
    }
    catch (e) {
        console.log(e);
        data = [];
    }
    data = data || [];
    for (const datum of data) {
        datum._id = datum._id.replaceAll(/:0/gi, ':');
        if (datum.sg) {
            datum.sg = datum.sg!.replaceAll(/\./gi, ':');
        }
    }

    return {
        _queryMeta: {
            adapter: 'mongodb',
            query: pipeline || 'MongoDB event segmentation aggregation pipeline',
        },
        data: data
    };
}

async function getViewsTableData(options: QueryOptions): Promise<QueryResult> {
    const match: Record<string, unknown> = options.dbFilter || {};
    if (options.appID) {
        match.a = options.appID + '';
    }
    match.e = '[CLY]_view';
    if (options.period) {
        match.ts = countlyCommon.getPeriodRange(options.period, 'UTC', options.periodOffset);
    }

    const pipeline: Record<string, unknown>[] = [];
    pipeline.push({ '$match': match });
    pipeline.push({ '$group': { '_id': { 'u': '$uid', 'sg': '$n' }, 't': { '$sum': 1 }, 'd': { '$sum': '$dur' }, 's': { '$sum': '$sg.start' }, 'e': { '$sum': '$sg.exit' }, 'b': { '$sum': '$sg.bounce' } } });
    pipeline.push({ '$addFields': { 'u': 1 } });
    // Union with cly action
    pipeline.push({
        '$unionWith': {
            'coll': 'drill_events',
            'pipeline': [
                { '$match': { 'e': '[CLY]_action', 'sg.type': 'scroll', 'ts': match.ts, 'a': match.a } },
                { '$group': { '_id': { 'u': '$uid', 'sg': '$n' }, 'scr': { '$sum': '$sg.scr' } } }
            ]
        }
    });
    pipeline.push({ '$group': { '_id': '$_id.sg', 'u': { '$sum': '$u' }, 't': { '$sum': '$t' }, 'd': { '$sum': '$d' }, 's': { '$sum': '$s' }, 'e': { '$sum': '$e' }, 'b': { '$sum': '$b' }, 'scr': { '$sum': '$scr' } } });

    // Union with data from view updates and group by _id.sg
    const match2 = JSON.parse(JSON.stringify(match)) as Record<string, unknown>;
    match2.e = '[CLY]_view_update';
    const pipeline2: Record<string, unknown>[] = [
        { '$match': match2 },
        { '$group': { '_id': { 'u': '$uid', 'sg': '$n' }, 't': { '$sum': 0 }, 'd': { '$sum': '$dur' }, 's': { '$sum': 0 }, 'e': { '$sum': '$sg.exit' }, 'b': { '$sum': '$sg.bounce' }, 'scr': { '$sum': 0 }, 'u': { '$sum': 1 } } },
        { '$group': { '_id': '$_id.sg', 'u': { '$sum': '$u' }, 't': { '$sum': '$t' }, 'd': { '$sum': '$d' }, 's': { '$sum': '$s' }, 'e': { '$sum': '$e' }, 'b': { '$sum': '$b' }, 'scr': { '$sum': '$scr' } } }
    ];

    pipeline.push({ '$unionWith': { 'coll': 'drill_events', 'pipeline': pipeline2 } });
    pipeline.push({ '$group': { '_id': '$_id', 'u': { '$max': '$u' }, 't': { '$max': '$t' }, 'd': { '$sum': '$d' }, 's': { '$max': '$s' }, 'e': { '$max': '$e' }, 'b': { '$max': '$b' }, 'scr': { '$max': '$scr' } } });
    pipeline.push({
        '$addFields': {
            'scr-calc': { $cond: [{ $or: [{ $eq: ['$t', 0] }, { $eq: ['$scr', 0] }] }, 0, { '$divide': ['$scr', '$t'] }] },
            'd-calc': { $cond: [{ $or: [{ $eq: ['$t', 0] }, { $eq: ['$d', 0] }] }, 0, { '$divide': ['$d', '$t'] }] },
            'br': { $cond: [{ $or: [{ $eq: ['$s', 0] }, { $eq: ['$b', 0] }] }, 0, { '$divide': [{ '$min': ['$b', '$s'] }, '$s'] }] },
            'b': { '$min': [{ '$ifNull': ['$b', 0] }, { '$ifNull': ['$s', 0] }] },
            'view': '$_id'
        }
    });
    const data = await common.drillDb.collection('drill_events').aggregate(pipeline).toArray() as AggregatedDataItem[];
    for (const datum of data) {
        datum._id = datum._id.replaceAll(/:0/gi, ':');
        if (datum.sg) {
            datum.sg = datum.sg!.replaceAll(/\./gi, ':');
        }
    }
    return {
        _queryMeta: {
            adapter: 'mongodb',
            query: pipeline || 'MongoDB event segmentation aggregation pipeline',
        },
        data: data
    };
}

/**
 * Fetches list of most popular segment values for a given period
 * @param options - query options
 * @returns fetched data
 */
async function segmentValuesForPeriod(options: QueryOptions): Promise<QueryResult> {
    const match: Record<string, unknown> = options.dbFilter || {};
    if (options.appID) {
        match.a = options.appID + '';
    }
    if (options.event) {
        match.e = options.event;
    }
    if (options.name) {
        match.n = options.name;
    }
    if (options.period) {
        match.ts = countlyCommon.getPeriodRange(options.period, 'UTC', options.periodOffset);
    }

    const pipeline: Record<string, unknown>[] = [];
    pipeline.push({ '$match': match });
    pipeline.push({ '$group': { '_id': '$' + options.field, 'c': { '$sum': 1 } } });
    pipeline.push({ '$sort': { 'c': -1 } });
    pipeline.push({ '$limit': options.limit || 1000 });
    const data = await common.drillDb.collection('drill_events').aggregate(pipeline).toArray();
    return {
        _queryMeta: {
            adapter: 'mongodb',
            query: pipeline || 'MongoDB event segmentation aggregation pipeline',
        },
        data: data
    };
}

async function getDrillCursorForExport(options: { pipeline: Record<string, unknown>[] }): Promise<QueryResult> {
    const cursor = common.drillDb.collection('drill_events').aggregate(options.pipeline).stream();
    return {
        _queryMeta: {
            adapter: 'mongodb',
            query: options.pipeline || 'MongoDB event segmentation aggregation pipeline',
        },
        data: cursor
    };
}

export {
    getDateStringProjection,
    getUniqueUserModel,
    aggregatedSessionData,
    getAggregatedData,
    getSegmentedEventModelData,
    getViewsTableData,
    segmentValuesForPeriod,
    getDrillCursorForExport
};

export type { QueryOptions, QueryResult, AggregatedDataItem };
