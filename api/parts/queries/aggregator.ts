/**
 * Retention Aggregation Query Definition
 * Provides both MongoDB and ClickHouse implementations for drill aggregation
 */
import { createRequire } from 'module';

// @ts-expect-error - import.meta is available at runtime with Node's native TypeScript support
const require = createRequire(import.meta.url);

const common = require('../../utils/common.js');
const log = common.log('core:queries');

interface AggregatorParams {
    collection?: string;
    pipeline?: Record<string, unknown>[];
    name?: string;
    [key: string]: unknown;
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
            handler: (params: AggregatorParams) => Promise<QueryResult>;
        };
        clickhouse?: {
            handler: (params: AggregatorParams) => Promise<QueryResult>;
        };
    };
}

/**
 * MongoDB handler for drill aggregation
 * Executes drill aggregation using MongoDB pipeline
 * @param params - Query parameters object containing all necessary data
 * @returns Cursor for traversing data
 */
async function mongodbHandler(params: AggregatorParams): Promise<QueryResult> {
    let { collection, pipeline } = params;
    collection = collection || 'drill_events';

    const db = common.drillDb;
    try {
        const data = await db.collection(collection).aggregate(pipeline, { allowDiskUse: true }).toArray();
        return {
            _queryMeta: {
                adapter: 'mongodb',
                query: pipeline || 'MongoDB aggregation pipeline',
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
async function fetchDataForAggregator(params: AggregatorParams, options?: Record<string, unknown>): Promise<unknown> {
    if (!common.queryRunner) {
        throw new Error('QueryRunner not initialized. Ensure API server is fully started.');
    }
    const defined_aggregators: Record<string, boolean> = {}; // Define all we create aggregation for clickhouse
    const queryDef: QueryDefinition = {
        name: 'FETCH_SEGMENTATION_' + params.name,
        adapters: {
            mongodb: {
                handler: mongodbHandler
            }
        }
    };
    if (!defined_aggregators[params.name!]) {
        delete queryDef.adapters.clickhouse;
    }

    return common.queryRunner.executeQuery(queryDef, params, options);
}

export { fetchDataForAggregator };
