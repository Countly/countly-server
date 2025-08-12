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
async function fetchAggregatedSegmentedEventDataMongo(params) {
    //{ collection, name, pipeline, cd0, cd1}
    var { apps, events, segmentation, ts, limit, previous = true} = params;
    try {
        var match = {};
        if (apps && apps.length) {
            if (apps.length === 1) {
                match.a = apps[0];
            }
            else {
                match.a = {$in: apps};
            }
        }

        match.e = "[CLY]_custom";
        if (events && events.length) {
            if (events.length === 1) {
                match.n = events[0];
            }
            else {
                match.n = {$in: events};
            }
        }
        match.ts = {"$gt": ts.$gt, "$lt": ts.$lt};
        var pipeline = [];
        if (previous) {
            match.ts.$gt = match.ts.$gt - (ts.$lt - ts.$gt);
            pipeline = [
                {"$match": match},
                {
                    "$group": {
                        "_id": ("$" + segmentation),
                        "c": {"$sum": {"$cond": [{"$gt": ['$ts', ts.$gt]}, "$c", 0]}},
                        "prev_c": {"$sum": {"$cond": [{"$gt": ['$ts', ts.$gt]}, 0, "$c"]}},
                        "s": {"$sum": {"$cond": [{"$gt": ['$ts', ts.$gt]}, "$s", 0]}},
                        "prev_s": {"$sum": {"$cond": [{"$gt": ['$ts', ts.$gt]}, 0, "$s"]}},
                        "dur": {"$sum": {"$cond": [{"$gt": ['$ts', ts.$gt]}, "$dur", 0]}},
                        "prev_dur": {"$sum": {"$cond": [{"$gt": ['$ts', ts.$gt]}, 0, "$dur"]}}
                    }
                }];
        }
        else {
            pipeline = [
                {"$match": match},
                {"$group": {"_id": ("$" + segmentation), "c": {"$sum": "$c"}, "s": {"$sum": "$s"}, "dur": {"$sum": "$dur"}}},
            ];
        }
        pipeline.push({"$match": {"c": {"$gt": 0}}});
        pipeline.push({"$sort": {"c": -1}});
        pipeline.push({"$limit": limit || 1000});

        log.e(JSON.stringify(pipeline));
        var data = await common.drillDb.collection("drill_events").aggregate(pipeline, {allowDiskUse: true}).toArray();
        log.e(JSON.stringify(data));
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
 * ClickHouse handler for drill aggregation
 * Executes drill aggregation using ClickHouse SQL
 * */
async function fetchAggregatedSegmentedEventDataClickhouse(/*params*/) {

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
async function fetchAggregatedSegmentedEventData(params, options) {
    if (!common.queryRunner) {
        throw new Error('QueryRunner not initialized. Ensure API server is fully started.');
    }
    const queryDef = {
        name: 'FETCH_AGGREGATED_EVENTS_DATA',
        adapters: {
            mongodb: {
                handler: fetchAggregatedSegmentedEventDataMongo
            },
            /* clickhouse: {
                handler: fetchAggregatedSegmentedEventDataClickhouse
            }*/
        }
    };



    return common.queryRunner.executeQuery(queryDef, params, options);
}

module.exports = {
    fetchAggregatedSegmentedEventData: fetchAggregatedSegmentedEventData
};
