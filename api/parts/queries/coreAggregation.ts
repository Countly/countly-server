/**
 * Retention Aggregation Query Definition
 * Provides Mongodb aggregation. Can be extended with other dbs implementations.
 */
import { createRequire } from 'module';

// @ts-expect-error - import.meta is available at runtime with Node's native TypeScript support
const require = createRequire(import.meta.url);

const common = require('../../utils/common.js');
const log = common.log('core:queries');

// Include mongodb functions
const mongodbRunner = require('./mongodbQueries.ts');

interface ClickHouseRunner {
    fetchAggregatedSegmentedEventDataClickhouse?: (params: unknown) => Promise<QueryResult>;
    getAggregatedData?: (params: unknown) => Promise<QueryResult>;
    getSegmentedEventModelData?: (params: unknown) => Promise<QueryResult>;
    getUniqueUserModel?: (params: unknown) => Promise<QueryResult>;
    aggregatedSessionData?: (params: unknown) => Promise<QueryResult>;
    getViewsTableData?: (params: unknown) => Promise<QueryResult>;
    segmentValuesForPeriod?: (params: unknown) => Promise<QueryResult>;
    getDrillCursorForExport?: (params: unknown) => Promise<QueryResult>;
    [key: string]: ((params: unknown) => Promise<QueryResult>) | undefined;
}

let clickHouseRunner: ClickHouseRunner | undefined;
try {
    clickHouseRunner = require('../../../plugins/clickhouse/api/queries/clickhouseCoreQueries.js');
}
catch (error) {
    log.e('Failed to load ClickHouse query runner', error);
}

interface QueryMeta {
    adapter: string;
    query: Record<string, unknown>[] | string;
}

interface QueryResult {
    _queryMeta: QueryMeta;
    data: unknown;
}

interface QueryDefinition {
    name: string;
    adapters: {
        mongodb: {
            handler: (params: unknown) => Promise<QueryResult>;
        };
        clickhouse?: {
            handler: (params: unknown) => Promise<QueryResult>;
        };
    };
}

interface FetchParams {
    apps?: string[];
    events?: string[];
    segmentation?: string;
    ts?: { $gt: number; $lt: number };
    limit?: number;
    previous?: boolean;
    name?: string;
    [key: string]: unknown;
}

interface AggregationParams {
    appID?: string;
    event?: string | string[];
    name?: string | string[];
    period?: unknown;
    periodOffset?: number;
    timezone?: string;
    bucket?: string;
    segmentation?: string;
    dbFilter?: Record<string, unknown>;
    pipeline?: Record<string, unknown>[];
    [key: string]: unknown;
}

/**
 * MongoDB handler for drill aggregation
 * Executes drill aggregation using MongoDB pipeline
 * @param params - Query parameters object containing all necessary data
 * @returns Cursor for traversing data
 */
async function fetchAggregatedSegmentedEventDataMongo(params: FetchParams): Promise<QueryResult> {
    const { apps, events, segmentation, ts, limit, previous = true } = params;
    try {
        const match: Record<string, unknown> = {};
        if (apps && apps.length > 0) {
            if (apps.length === 1) {
                match.a = apps[0];
            }
            else {
                match.a = { $in: apps };
            }
        }

        if (events && events.length > 0) {
            let isSystemEvents = false;
            for (const event of events) {
                if (event.startsWith('[CLY]_')) {
                    isSystemEvents = true;
                    break;
                }
            }
            if (isSystemEvents) {
                if (events.length === 1) {
                    match.e = events[0];
                }
                else {
                    match.e = { $in: events };
                }
            }
            else {
                match.e = '[CLY]_custom';
                if (events.length === 1) {
                    match.n = events[0];
                }
                else {
                    match.n = { $in: events };
                }
            }
        }
        match.ts = { '$gt': ts!.$gt, '$lt': ts!.$lt };
        match[segmentation!] = { '$ne': null };
        let pipeline: Record<string, unknown>[] = [];
        if (previous) {
            (match.ts as { $gt: number }).$gt = (match.ts as { $gt: number }).$gt - (ts!.$lt - ts!.$gt) + 1;
            pipeline = [
                { '$match': match },
                {
                    '$group': {
                        '_id': ('$' + segmentation),
                        'c': { '$sum': { '$cond': [{ '$gt': ['$ts', ts!.$gt] }, '$c', 0] } },
                        'prev_c': { '$sum': { '$cond': [{ '$gt': ['$ts', ts!.$gt] }, 0, '$c'] } },
                        's': { '$sum': { '$cond': [{ '$gt': ['$ts', ts!.$gt] }, '$s', 0] } },
                        'prev_s': { '$sum': { '$cond': [{ '$gt': ['$ts', ts!.$gt] }, 0, '$s'] } },
                        'dur': { '$sum': { '$cond': [{ '$gt': ['$ts', ts!.$gt] }, '$dur', 0] } },
                        'prev_dur': { '$sum': { '$cond': [{ '$gt': ['$ts', ts!.$gt] }, 0, '$dur'] } }
                    }
                }];
        }
        else {
            pipeline = [
                { '$match': match },
                { '$group': { '_id': ('$' + segmentation), 'c': { '$sum': '$c' }, 's': { '$sum': '$s' }, 'dur': { '$sum': '$dur' } } },
            ];
        }
        pipeline.push({ '$match': { 'c': { '$gt': 0 } } });
        pipeline.push({ '$sort': { 'c': -1 } });
        pipeline.push({ '$limit': limit || 1000 });
        const data = await common.drillDb.collection('drill_events').aggregate(pipeline, { allowDiskUse: true }).toArray();
        return {
            _queryMeta: {
                adapter: 'mongodb',
                query: pipeline || 'MongoDB event segmentation aggregation pipeline',
            },
            data: data
        };
    }
    catch (error) {
        console.trace();
        log.e(error);
        log.e('MongoDB drill aggregation failed', error);
        throw error;
    }
}

/**
 * Fetch segmentation projection data
 * @param params - Query parameters object containing all necessary data
 * @param options - options
 * @returns Returns cursor for traversing data
 */
function fetchAggregatedSegmentedEventData(params: FetchParams, options?: Record<string, unknown>): Promise<unknown> {
    if (!common.queryRunner) {
        throw new Error('QueryRunner not initialized. Ensure API server is fully started.');
    }
    const queryDef: QueryDefinition = {
        name: 'FETCH_AGGREGATED_EVENTS_DATA',
        adapters: {
            mongodb: {
                handler: fetchAggregatedSegmentedEventDataMongo
            }
        }
    };
    if (clickHouseRunner && clickHouseRunner.fetchAggregatedSegmentedEventDataClickhouse) {
        queryDef.adapters.clickhouse = {
            handler: clickHouseRunner.fetchAggregatedSegmentedEventDataClickhouse
        };
    }

    return common.queryRunner.executeQuery(queryDef, params, options);
}

function aggregateFromGranular(params: { name: string; [key: string]: unknown }, options?: Record<string, unknown>): Promise<unknown> {
    if (!common.queryRunner) {
        throw new Error('QueryRunner not initialized. Ensure API server is fully started.');
    }
    if (!params.name) {
        throw new Error('Name not specified');
    }

    const queryDef: QueryDefinition = {
        name: 'AGGREGATE_FROM_GRANURAL_' + params.name,
        adapters: {
            mongodb: {
                handler: mongodbRunner[params.name]
            }
        }
    };
    if (clickHouseRunner && clickHouseRunner[params.name]) {
        queryDef.adapters.clickhouse = {
            handler: clickHouseRunner[params.name]!
        };
    }
    return common.queryRunner.executeQuery(queryDef, params, options);
}

/**
 * Gets aggregated data chosen timezone. If not set - returns in UTC timezone.
 * @param params - options
 * @param options - options
 * @returns aggregated data
 */
async function getAggregatedData(params: AggregationParams, options?: Record<string, unknown>): Promise<unknown> {
    if (!common.queryRunner) {
        throw new Error('QueryRunner not initialized. Ensure API server is fully started.');
    }

    const queryDef: QueryDefinition = {
        name: 'GET_AGGREGATED_DATA',
        adapters: {
            mongodb: {
                handler: mongodbRunner.getAggregatedData
            }
        }
    };
    if (clickHouseRunner && clickHouseRunner.getAggregatedData) {
        queryDef.adapters.clickhouse = {
            handler: clickHouseRunner.getAggregatedData
        };
    }
    return common.queryRunner.executeQuery(queryDef, params, options);
}

async function getSegmentedEventModelData(params: AggregationParams, options?: Record<string, unknown>): Promise<unknown> {
    if (!common.queryRunner) {
        throw new Error('QueryRunner not initialized. Ensure API server is fully started.');
    }

    const queryDef: QueryDefinition = {
        name: 'GET_SEGMENTED_EVENT_MODEL_DATA',
        adapters: {
            mongodb: {
                handler: mongodbRunner.getSegmentedEventModelData
            }
        }
    };
    if (clickHouseRunner && clickHouseRunner.getSegmentedEventModelData) {
        queryDef.adapters.clickhouse = {
            handler: clickHouseRunner.getSegmentedEventModelData
        };
    }
    return common.queryRunner.executeQuery(queryDef, params, options);
}

async function getUniqueUserModel(params: AggregationParams, options?: Record<string, unknown>): Promise<unknown> {
    if (!common.queryRunner) {
        throw new Error('QueryRunner not initialized. Ensure API server is fully started.');
    }

    const queryDef: QueryDefinition = {
        name: 'GET_UNIQUE_USER_MODEL',
        adapters: {
            mongodb: {
                handler: mongodbRunner.getUniqueUserModel
            }
        }
    };
    if (clickHouseRunner && clickHouseRunner.getUniqueUserModel) {
        queryDef.adapters.clickhouse = {
            handler: clickHouseRunner.getUniqueUserModel
        };
    }
    return common.queryRunner.executeQuery(queryDef, params, options);
}

/**
 * Gets aggregated data chosen timezone. If not set - returns in UTC timezone.
 * @param params - options
 * @param options - options
 * @returns aggregated data
 */
async function aggregatedSessionData(params: AggregationParams, options?: Record<string, unknown>): Promise<unknown> {
    if (!common.queryRunner) {
        throw new Error('QueryRunner not initialized. Ensure API server is fully started.');
    }

    const queryDef: QueryDefinition = {
        name: 'GET_AGGREGATED_DATA',
        adapters: {
            mongodb: {
                handler: mongodbRunner.aggregatedSessionData
            }
        }
    };
    if (clickHouseRunner && clickHouseRunner.aggregatedSessionData) {
        queryDef.adapters.clickhouse = {
            handler: clickHouseRunner.aggregatedSessionData
        };
    }
    return common.queryRunner.executeQuery(queryDef, params, options);
}

async function viewsTableData(params: AggregationParams, options?: Record<string, unknown>): Promise<unknown> {
    if (!common.queryRunner) {
        throw new Error('QueryRunner not initialized. Ensure API server is fully started.');
    }

    const queryDef: QueryDefinition = {
        name: 'VIEWS_TABLE_DATA',
        adapters: {
            mongodb: {
                handler: mongodbRunner.getViewsTableData
            }
        }
    };
    if (clickHouseRunner && clickHouseRunner.getViewsTableData) {
        queryDef.adapters.clickhouse = {
            handler: clickHouseRunner.getViewsTableData
        };
    }
    return common.queryRunner.executeQuery(queryDef, params, options);
}

async function segmentValuesForPeriod(params: AggregationParams, options?: Record<string, unknown>): Promise<unknown> {
    if (!common.queryRunner) {
        throw new Error('QueryRunner not initialized. Ensure API server is fully started.');
    }

    const queryDef: QueryDefinition = {
        name: 'SEGMENT_VALUES_FOR_PERIOD',
        adapters: {
            mongodb: {
                handler: mongodbRunner.segmentValuesForPeriod
            }
        }
    };
    if (clickHouseRunner && clickHouseRunner.segmentValuesForPeriod) {
        queryDef.adapters.clickhouse = {
            handler: clickHouseRunner.segmentValuesForPeriod
        };
    }
    return common.queryRunner.executeQuery(queryDef, params, options);
}

async function getDrillCursorForExport(params: { pipeline: Record<string, unknown>[] }, options?: Record<string, unknown>): Promise<unknown> {
    if (!common.queryRunner) {
        throw new Error('QueryRunner not initialized. Ensure API server is fully started.');
    }

    const queryDef: QueryDefinition = {
        name: 'GET_CURSOR_FOR_EXPORT',
        adapters: {
            mongodb: {
                handler: mongodbRunner.getDrillCursorForExport
            }
        }
    };
    if (clickHouseRunner && clickHouseRunner.getDrillCursorForExport) {
        queryDef.adapters.clickhouse = {
            handler: clickHouseRunner.getDrillCursorForExport
        };
    }
    return common.queryRunner.executeQuery(queryDef, params, options);
}

const coreAggregator = {
    fetchAggregatedSegmentedEventData,
    aggregateFromGranular,
    getAggregatedData,
    getSegmentedEventModelData,
    getUniqueUserModel,
    aggregatedSessionData,
    viewsTableData,
    segmentValuesForPeriod,
    getDrillCursorForExport
};

export default coreAggregator;
export {
    fetchAggregatedSegmentedEventData,
    aggregateFromGranular,
    getAggregatedData,
    getSegmentedEventModelData,
    getUniqueUserModel,
    aggregatedSessionData,
    viewsTableData,
    segmentValuesForPeriod,
    getDrillCursorForExport
};
