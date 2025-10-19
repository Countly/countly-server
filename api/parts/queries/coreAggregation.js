/**
 * Retention Aggregation Query Definition
 * Provides Mongodb aggregation. Can be wxtended with other dbs implementations.
 */

const common = require('../../utils/common.js');
const log = common.log('core:queries');
var coreAggregator = {};
//Include mongodb functions
const mongodbRunner = require('./mongodbQueries.js');
var clickHouseRunner;
try {
    clickHouseRunner = require('../../../plugins/clickhouse/api/queries/clickhouseCoreQueries.js');
}
catch (error) {
    log.e('Failed to load ClickHouse query runner', error);
}



(function(agg) {
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

            if (events && events.length) {
                var isSystemEvents = false;
                for (let i = 0; i < events.length; i++) {
                    if (events[i].startsWith("[CLY]_")) {
                        isSystemEvents = true;
                        break;
                    }
                }
                if (isSystemEvents) {
                    if (events.length === 1) {
                        match.e = events[0];
                    }
                    else {
                        match.e = {$in: events};
                    }
                }
                else {
                    match.e = "[CLY]_custom";
                    if (events.length === 1) {
                        match.n = events[0];
                    }
                    else {
                        match.n = {$in: events};
                    }
                }
            }
            match.ts = {"$gt": ts.$gt, "$lt": ts.$lt};
            match[segmentation] = {"$ne": null};
            var pipeline = [];
            if (previous) {
                match.ts.$gt = match.ts.$gt - (ts.$lt - ts.$gt) + 1;
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
            var data = await common.drillDb.collection("drill_events").aggregate(pipeline, {allowDiskUse: true}).toArray();
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
 * @param {Object} params - Query parameters object containing all necessary data
 * @param {Object} options  - options. 
 * @returns {Promise<Cursor>} Returns cursor for traversing data
 */
    agg.fetchAggregatedSegmentedEventData = function(params, options) {
        if (!common.queryRunner) {
            throw new Error('QueryRunner not initialized. Ensure API server is fully started.');
        }
        const queryDef = {
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
    };


    agg.aggregateFromGranular = function(params, options) {
        if (!common.queryRunner) {
            throw new Error('QueryRunner not initialized. Ensure API server is fully started.');
        }
        if (!params.name) {
            throw new Error('Name not specified');
        }

        const queryDef = {
            name: 'AGGREGATE_FROM_GRANURAL_' + params.name,
            adapters: {
                mongodb: {
                    handler: mongodbRunner[params.name]
                }
            }
        };
        if (clickHouseRunner && clickHouseRunner[params.name]) {
            queryDef.adapters.clickhouse = {
                handler: clickHouseRunner[params.name]
            };
        }
        return common.queryRunner.executeQuery(queryDef, params, options);
    };


    /**
   * Gets aggregated data chosen timezone.If not set - returns in UTC timezone.
   * @param {object} params  - options
   * @param {object} options - options
   * @returns {object} - aggregated data
   */
    agg.getAggregatedData = async function(params, options) {
        if (!common.queryRunner) {
            throw new Error('QueryRunner not initialized. Ensure API server is fully started.');
        }

        const queryDef = {
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
    };

    agg.getSegmentedEventModelData = async function(params, options) {
        if (!common.queryRunner) {
            throw new Error('QueryRunner not initialized. Ensure API server is fully started.');
        }

        const queryDef = {
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
    };


    /**
   * Gets aggregated data chosen timezone.If not set - returns in UTC timezone.
   * @param {object} params - options
   * params.appID - application id
   * params.event - string as event key or array with event keys
   * params.period - Normal Countly period
   * @param {object} options - options
   *
   * @returns {object} - aggregated data
   */
    agg.aggregatedSessionData = async function(params, options) {
        if (!common.queryRunner) {
            throw new Error('QueryRunner not initialized. Ensure API server is fully started.');
        }

        const queryDef = {
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
    };


    agg.viewsTableData = async function(params, options) {
        if (!common.queryRunner) {
            throw new Error('QueryRunner not initialized. Ensure API server is fully started.');
        }

        const queryDef = {
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
    };

    agg.segmentValuesForPeriod = async function(params, options) {
        if (!common.queryRunner) {
            throw new Error('QueryRunner not initialized. Ensure API server is fully started.');
        }

        const queryDef = {
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
    };
}(coreAggregator));
module.exports = coreAggregator;
