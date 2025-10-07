/**
 * Retention Aggregation Query Definition
 * Provides both MongoDB and ClickHouse implementations for drill aggregation
 */
const common = require('../../../../api/utils/common.js');
const log = common.log('views:queries');


var clickHouseRunner;
try {
    clickHouseRunner = require('../../clickhouse/api/queries/clickhouseCoreQueries.js');
}
catch (error) {
    log.e('Failed to load ClickHouse query runner', error);
}

/**
 * MongoDB handler ccalculating total user count for events in given period
 * Executes drill aggregation using MongoDB pipeline
 * @param {Object} params - Query parameters object containing all necessary data
 * @param {Object} params.query - query for match stage
 * @param {string} params.userKey - field to determine unique user by. (uid by default)
 * @returns {Array} Returns array with data
 */
async function getTotalsMongodb(params) {
    var { query, userKey } = params;
    try {
        let pipeline = [{
            $match: query
        }];
        userKey = (userKey || "uid");
        userKey = '$' + userKey; // convert to MongoDB field notation

        pipeline.push({
            $group: {
                _id: userKey,
                t: { $sum: "$c"}
            }
        });

        pipeline.push({
            $group: {
                _id: null,
                t: { $sum: "$t"},
                u: { $sum: 1},
            }
        });
        var data = await common.drillDb.collection("drill_events").aggregate(pipeline, { allowDiskUse: true, cursor: {} }).toArray();
        data = data[0];
        return {
            _queryMeta: {
                adapter: 'mongodb',
                query: pipeline || 'MongoDB aggregation pipeline',
            },
            data: data
        };
    }
    catch (error) {
        log.e(error);
        log.e('MongoDB formulas.getNumberOfPromiseMongoDb aggregation failed', error);
        throw error;
    }
}

/**
 * MongoDB handler ccalculating unique user count for specific views
 * Executes drill aggregation using MongoDB pipeline
 * @param {Object} params - Query parameters object containing all necessary data
 * @param {Object} params.query - query for match stage
 * @param {string} params.userKey - field to determine unique user by. (uid by default)
 * @returns {Array} Returns array with data
 */
async function getUniqueCountMongodb(params) {
    var { query, userKey } = params;
    try {
        let pipeline = [{
            $match: query
        }];
        userKey = (userKey || "uid");
        userKey = '$' + userKey; // convert to MongoDB field notation

        pipeline.push({
            $group: {
                _id: {"uid": userKey, "n": "$n"},
            }
        });

        pipeline.push({
            $group: {
                _id: "$_id.n",
                u: { $sum: 1},
            }
        });
        var data = await common.drillDb.collection("drill_events").aggregate(pipeline, { allowDiskUse: true, cursor: {} }).toArray();
        return {
            _queryMeta: {
                adapter: 'mongodb',
                query: pipeline || 'MongoDB aggregation pipeline',
            },
            data: data
        };
    }
    catch (error) {
        log.e(error);
        log.e('MongoDB formulas.getNumberOfPromiseMongoDb aggregation failed', error);
        throw error;
    }
}


/**
 * Fetches unique graph values from mongodb
 * @param {Object} params - Query parameters object containing all necessary data
 * @param {Object} params.query - query for match stage
 * @param {string} params.userKey - field to determine unique user by. (uid by default)
 * @returns {Array} Returns array with data
 */
async function getGraphValuesMongodb(params) {
    var { query, userKey, bucket, timezone} = params;
    try {
        let pipeline = [{
            $match: query
        }];
        userKey = (userKey || "uid");
        userKey = '$' + userKey; // convert to MongoDB field notation

        if (bucket === "m") {
            bucket = {
                $dateToString: { format: "%Y:m%m", date: { $toDate: "$ts"}, "timezone": timezone || "UTC" }
            };
        }
        else if (bucket === "w") {
            bucket = {
                $dateToString: { format: "%Y:w%V", date: { $toDate: "$ts" }, "timezone": timezone || "UTC" }
            };
        }
        else if (bucket === "d") {
            bucket = {
                $dateToString: { format: "%Y:%m:%d", date: { $toDate: "$ts" }, "timezone": timezone || "UTC" }
            };
        }
        else {
            bucket = {
                $dateToString: { format: "%Y:%m:%d:%H", date: { $toDate: "$ts" }, "timezone": timezone || "UTC" }
            };
        }

        pipeline.push({
            $group: {
                _id: {"uid": userKey, "n": "$n", "bucket": bucket},
            }
        });

        pipeline.push({
            $group: {
                _id: {"n": "$_id.n", "bucket": "$_id.bucket"},
                u: { $sum: 1},
            }
        });
        pipeline.push({
            $project: {
                _id: "$_id.bucket",
                n: "$_id.n",
                u: "$u"
            }
        });
        var data = await common.drillDb.collection("drill_events").aggregate(pipeline, { allowDiskUse: true, cursor: {} }).toArray();
        return {
            _queryMeta: {
                adapter: 'mongodb',
                query: pipeline || 'MongoDB aggregation pipeline',
            },
            data: data
        };
    }
    catch (error) {
        log.e(error);
        log.e('MongoDB formulas.getNumberOfPromiseMongoDb aggregation failed', error);
        throw error;
    }

}


/**
 * Fetches unique graph values from clickhouse
 * @param {Object} params - Query parameters object containing all necessary data
 * @param {Object} params.query - query for match stage
 * @param {string} params.userKey - field to determine unique user by. (uid by default)
 * @returns {Array} Returns array with data
 */


/**
 * Fetch totals for period
 * @param {Object} params - Query parameters object containing all necessary data
 * @param {Object} options  - options. 
 * @returns {Promise<Cursor>} Returns cursor for traversing data
 */
async function getTotals(params, options) {
    if (!common.queryRunner) {
        log.e('QueryRunner not initialized. Ensure API server is fully started.');
        throw new Error('QueryRunner not initialized. Ensure API server is fully started.');
    }

    const queryDef = {
        name: 'VIEWS_TOTALS',
        adapters: {
            mongodb: {
                handler: getTotalsMongodb
            }
        }
    };

    if (clickHouseRunner && clickHouseRunner.getViewsTotals) {
        queryDef.adapters.clickhouse = {
            handler: clickHouseRunner.getViewsTotals
        };
    }
    return common.queryRunner.executeQuery(queryDef, params, options);
}

/**
 * Fetch unique count for specific views
 * @param {Object} params - Query parameters object containing all necessary data
 * @param {Object} options  - options. 
 * @returns {Promise<Cursor>} Returns cursor for traversing data
 */
async function getUniqueCount(params, options) {
    if (!common.queryRunner) {
        throw new Error('QueryRunner not initialized. Ensure API server is fully started.');
    }

    const queryDef = {
        name: 'VIEWS_UNIQUE_COUNT',
        adapters: {
            mongodb: {
                handler: getUniqueCountMongodb
            }
        }
    };
    if (clickHouseRunner && clickHouseRunner.getViewsUniqueCount) {
        queryDef.adapters.clickhouse = {
            handler: clickHouseRunner.getViewsUniqueCount
        };
    }
    return common.queryRunner.executeQuery(queryDef, params, options);
}

/**
 * Fetch graph values for specific views
 * @param {*} params - Query parameters object containing all necessary data
 * @param {*} options - Options for the query
 * @returns {Promise<Cursor>} Returns cursor for traversing data
 */
async function getGraphValues(params, options) {
    if (!common.queryRunner) {
        throw new Error('QueryRunner not initialized. Ensure API server is fully started.');
    }

    const queryDef = {
        name: 'VIEWS_GRAPH_VALUES',
        adapters: {
            mongodb: {
                handler: getGraphValuesMongodb
            }
        }
    };
    if (clickHouseRunner && clickHouseRunner.getViewsGraphValues) {
        queryDef.adapters.clickhouse = {
            handler: clickHouseRunner.getViewsGraphValues
        };
    }

    return common.queryRunner.executeQuery(queryDef, params, options);
}

module.exports = {
    getTotals,
    getUniqueCount,
    getGraphValues
    /*getUniqueGraph*/
};
