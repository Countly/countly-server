/**
 * Retention Aggregation Query Definition
 * Provides both MongoDB and ClickHouse implementations for drill aggregation
 */
const WhereClauseConverter = require('../../../clickhouse/api/WhereClauseConverter');
const QueryHelpers = require('../../../clickhouse/api/QueryHelpers');
const common = require('../../../../api/utils/common.js');
const log = common.log('views:queries');


var bucketExpr = function(bucket, timezone = 'UTC') {
    switch (bucket) {
    case 'd': return "formatDateTime(toTimeZone(ts, '" + timezone + "'), '%Y:%m:%d')";
    case 'w': return "formatDateTime(toTimeZone(ts, '" + timezone + "'), '%Y:w%V')";
    case 'm': return "formatDateTime(toTimeZone(ts, '" + timezone + "'), '%Y:m%m')";
    case 'h': return "formatDateTime(toTimeZone(ts, '" + timezone + "'), '%Y:%m:%d:%H')";
    default: return '';
    }
};

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
 * Clickhouse handler calculating total user count for events in given period
 * Executes drill aggregation using Clickhouse SQL
 * @param {Object} params - Query parameters object containing all necessary data
 * @param {Object} params.query - query for match stage
 * @param {string} params.userKey - field to determine unique user by. (uid by default)
 * @returns {Array} Returns array with data
 */
async function getTotalsClickhouse(params) {
    var { query, userKey, useApproximateUniq = true } = params;
    try {

        userKey = userKey || "uid";
        if (userKey.indexOf(".") > 0) {
            userKey = "`" + userKey.replaceAll(".", "`.`") + "`";
        }
        const uniqFunction = QueryHelpers.getUniqFunction(useApproximateUniq);

        const converter = new WhereClauseConverter();
        const { sql: whereSQL, params: ch_params } = converter.queryObjToWhere(query);
        const clickhouse_query = `
            SELECT ${uniqFunction}(${userKey}) as u,
            COUNT(c) as t
            FROM drill_events
            ${whereSQL}
        `;
        var rawResult = await common.clickhouseQueryService.aggregate({query: clickhouse_query, params: ch_params}, {});
        //converting to same we have in mongodb
        rawResult = rawResult[0] || {};
        return {
            _queryMeta: {
                adapter: 'clickhouse',
                query: clickhouse_query
            },
            data: rawResult
        };
    }
    catch (error) {
        log.e(error);
        log.e('ClickHouse views.getTotalsClickhouse failed', error);
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
 * Clickhouse handler calculating unique user count for specific views
 * Executes drill aggregation using Clickhouse SQL
 * @param {Object} params - Query parameters object containing all necessary data
 * @param {Object} params.query - query for match stage
 * @param {string} params.userKey - field to determine unique user by. (uid by default)
 * @returns {Array} Returns array with data
 */
async function getUniqueCountClickhouse(params) {
    var { query, userKey, useApproximateUniq = true } = params;
    try {
        userKey = userKey || "uid";
        if (userKey.indexOf(".") > 0) {
            userKey = "`" + userKey.replaceAll(".", "`.`") + "`";
        }

        const uniqFunction = QueryHelpers.getUniqFunction(useApproximateUniq);
        const converter = new WhereClauseConverter();
        const { sql: whereSQL, params: ch_params } = converter.queryObjToWhere(query);
        const clickhouse_query = `
            SELECT n as _id, ${uniqFunction}(${userKey}) as u
            FROM drill_events
            ${whereSQL}
            GROUP BY n
        `;
        const rawResult = await common.clickhouseQueryService.aggregate({query: clickhouse_query, params: ch_params}, {});
        //converting to same we have in mongodb

        return {
            _queryMeta: {
                adapter: 'clickhouse',
                query: clickhouse_query
            },
            data: rawResult
        };
    }
    catch (error) {
        log.e(error);
        log.e('ClickHouse views.getTotalsClickhouse failed', error);
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
async function getGraphValuesClickhouse(params) {
    var { query, userKey, useApproximateUniq = true, timezone, bucket} = params;
    try {
        userKey = userKey || "uid";
        if (userKey.indexOf(".") > 0) {
            userKey = "`" + userKey.replaceAll(".", "`.`") + "`";
        }

        const uniqFunction = QueryHelpers.getUniqFunction(useApproximateUniq);
        const converter = new WhereClauseConverter();
        const { sql: whereSQL, params: ch_params } = converter.queryObjToWhere(query);
        const clickhouse_query = `
            SELECT ${bucketExpr(bucket, timezone)} as _id,n as n, ${uniqFunction}(${userKey}) as u
            FROM drill_events
            ${whereSQL}
            GROUP BY n, ${bucketExpr(bucket, timezone)}
        `;
        const rawResult = await common.clickhouseQueryService.aggregate({query: clickhouse_query, params: ch_params}, {});
        //converting to same we have in mongodb

        return {
            _queryMeta: {
                adapter: 'clickhouse',
                query: clickhouse_query
            },
            data: rawResult
        };
    }
    catch (error) {
        log.e(error);
        log.e('ClickHouse views.getTotalsClickhouse failed', error);
        throw error;
    }
}

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
            },
            clickhouse: {
                handler: getTotalsClickhouse
            }
        }
    };
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
            },
            clickhouse: {
                handler: getUniqueCountClickhouse
            }
        }
    };
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
            },
            clickhouse: {
                handler: getGraphValuesClickhouse
            }
        }
    };
    return common.queryRunner.executeQuery(queryDef, params, options);
}

module.exports = {
    getTotals,
    getUniqueCount,
    getGraphValues
    /*getUniqueGraph*/
};
