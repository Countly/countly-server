/**
 * Retention Aggregation Query Definition
 * Provides both MongoDB and ClickHouse implementations for drill aggregation
 */

const common = require('../../utils/common.js');
const log = common.log('core:queries');

/**
 * MongoDB handler for drill aggregation
 * Executes drill aggregation using MongoDB pipeline
 * @param {Object} params - Query parameters object containing all necessary data
 * @param {Object} params.level - Time level for aggregation ('d' for day, 'w' for week, 'm' for month) If not set - "d"
 * @param {Object} params.query - drill query containing limits for data to select
 * @param {string} params.event - Event name to aggregate
 * @param {string} params.breakdown - Breakdown object containing query conditions
 * @returns {Promise<Object>} Cursor for traversing data
 */
async function mongodbHandler(params) {
    //{ collection, name, pipeline, cd0, cd1}
    var { collection, pipeline} = params;
    collection = collection || "drill_events";

    var db = common.drillDb;
    try {
        var data = await db.collection(collection).aggregate(pipeline, {allowDiskUse: true}).toArray();
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
 * ClickHouse handler for drill aggregation
 * Executes drill aggregation using ClickHouse SQL
 * */
async function clickhouseHandler(/*params*/) {

    /*var { collection, name, pipeline, cd0, cd1} = params;

    if (name === 'server-stats') {
    //build query for server stats
    }*/
    try {
        return {
            _queryMeta: {
                adapter: 'clickhouse',
                query: []
            },
            data: {}
        };
    }
    catch (error) {
        log.e('ClickHouse drill aggregation failed', error);
        throw error;
    }
}

/**
 * Fetch segmentation projection data
 * @param {Object} params - Query parameters object containing all necessary data
 * @param {Object} options  - options. 
 * @returns {Promise<Cursor>} Returns cursor for traversing data
 */
async function fetchDataForAggregator(params, options) {
    if (!common.queryRunner) {
        throw new Error('QueryRunner not initialized. Ensure API server is fully started.');
    }
    var defined_aggregators = {};//Define all we create aggregation for clickhouse
    const queryDef = {
        name: 'FETCH_SEGMENTATION_' + params.name,
        adapters: {
            mongodb: {
                handler: mongodbHandler
            },
            clickhouse: {
                handler: clickhouseHandler
            }
        }
    };
    if (!defined_aggregators[params.name]) {
        delete queryDef.adapters.clickhouse;
    }

    return common.queryRunner.executeQuery(queryDef, params, options);
}

module.exports = {
    fetchDataForAggregator: fetchDataForAggregator
};
