/**
 * Crashes Aggregation Query Definition
 * Provides both MongoDB and ClickHouse implementations for drill aggregation
 */
const common = require('../../../../api/utils/common.js');
const log = common.log('crashes:queries');
var bools = {"root": true, "online": true, "muted": true, "signal": true, "background": true};
var trace = require("../parts/stacktrace.js");
var clickHouseRunner;
try {
    clickHouseRunner = require('../../../clickhouse/api/queries/crashes.js');
}
catch (error) {
    log.e('Failed to load ClickHouse query runner', error);
}

/**
 * Transforms database result to expected format
 * @param {Array} res0  - array with data
 */
function transformCrashData(res0) {
    if (res0 && res0.length) {
        for (var z = 0; z < res0.length; z++) {
            res0[z].sg = res0[z].sg || {};
            var dd = res0[z].sg;
            dd.ts = res0[z].ts;
            dd._id = res0[z]._id;
            for (var bkey in bools) {
                if (res0[z].sg[bkey] === "true") {
                    res0[z].sg[bkey] = 1;
                }
                else if (res0[z].sg[bkey] === "false") {
                    res0[z].sg[bkey] = 0;
                }
            }
            var rw = ["not_os_specific", "nonfatal", "javascript", "native_cpp", "plcrash"];
            for (var ii = 0; ii < rw.length; ii++) {
                if (res0[z].sg[rw[ii]] === "true") {
                    res0[z].sg[rw[ii]] = true;
                }
                else if (res0[z].sg[rw[ii]] === "false") {
                    res0[z].sg[rw[ii]] = false;
                }
            }
            dd.custom = res0[z].custom || {};
            for (var key in res0[z].sg) {
                if (key.indexOf("custom_") === 0) {
                    dd.custom[key.replace("custom_", "")] = res0[z].sg[key];
                }
            }
            dd.group = res0[z].n;
            dd.uid = res0[z].uid;
            dd.cd = res0[z].cd;

            var name = dd.uid;
            if (res0[z].up) {
                name = res0[z].up.name || res0[z].up.username || res0[z].up.email || dd.uid;
            }
            dd.user = {"uid": dd.uid, "name": name};
            res0[z] = dd;
            trace.postprocessCrash(res0[z]);
        }
    }
}

/**
 * Fetches crashes table from ClickHouse
 * @param {Object} params - Query parameters
 * @returns {Promise<Object>} - Promise resolving to the crashes table data
 */
async function getCrashesTableClickHouse(params) {
    var {query, limit} = params;
    var data = await clickHouseRunner.getCrashesTable({query: query, limit: limit});
    //Transform data
    transformCrashData(data.data);
    return data;
}

/**
 * Fetches crashes table from MongoDB
 * @param {Object} params - Query parameters
 * @returns {Promise<Object>} - Promise resolving to the crashes table data
 */
async function getCrashesTableMongodb(params) {
    var { query, limit } = params;
    try {
        var cursor0 = common.drillDb.collection("drill_events").find(query).sort({ts: -1});
        cursor0.limit(limit || 100);
        var res0 = await cursor0.toArray();
        res0 = res0 || [];
        transformCrashData(res0);

        return {
            _queryMeta: {
                adapter: 'mongodb',
                query: [{"$match": query}] || 'MongoDB aggregation pipeline',
            },
            data: res0
        };
    }
    catch (error) {
        log.e(error);
        log.e('MongoDB crashes table fetching  failed', error);
        throw error;
    }
}

/**
 * Fetches crashes breakdown from MongoDB
 * @param {*} params - Query parameters
 * @returns {Promise<Object>} - Promise resolving to the crashes breakdown data
 */
async function getCrashesBreakdownMongodb(params) {
    var { query, limit, field} = params;
    try {
        var aggregate = [
            {"$match": query},
            {
                "$group": {
                    "_id": ("$" + field),
                    "count": {"$sum": 1}
                }
            },
            {"$sort": {"count": -1}},
            {"$limit": limit || 100}
        ];
        var data = await common.drillDb.collection("drill_events").aggregate(aggregate).toArray();
        data = data || [];

        return {
            _queryMeta: {
                adapter: 'mongodb',
                query: [{"$match": query}] || 'MongoDB aggregation pipeline',
            },
            data
        };
    }
    catch (error) {
        log.e(error);
        log.e('MongoDB crashes table fetching  failed', error);
        throw error;
    }

}


/**
 * Fetch table with crash occurences
 * @param {*} params - Query parameters object containing all necessary data
 * @param {*} options - Options for the query
 * @returns {Promise<Cursor>} Returns cursor for traversing data
 */
async function getCrashesTable(params, options) {
    if (!common.queryRunner) {
        throw new Error('QueryRunner not initialized. Ensure API server is fully started.');
    }

    const queryDef = {
        name: 'GET_CRASHES_TABLE',
        adapters: {
            mongodb: {
                handler: getCrashesTableMongodb
            }
        }
    };
    if (clickHouseRunner && clickHouseRunner.getCrashesTable) {
        queryDef.adapters.clickhouse = {
            handler: getCrashesTableClickHouse
        };
    }

    return common.queryRunner.executeQuery(queryDef, params, options);
}

/**
 * Fetch breakdown of crashes by specific field
 * @param {*} params - Query parameters object containing all necessary data
 * @param {*} options - Options for the query
 * @returns {Object} Returns breakdown data
 */
async function getCrashesBreakdown(params, options) {
    if (!common.queryRunner) {
        throw new Error('QueryRunner not initialized. Ensure API server is fully started.');
    }

    const queryDef = {
        name: 'GET_CRASHES_BREAKDOWN',
        adapters: {
            mongodb: {
                handler: getCrashesBreakdownMongodb
            }
        }
    };

    if (clickHouseRunner && clickHouseRunner.getCrashesBreakdown) {
        queryDef.adapters.clickhouse = {
            handler: clickHouseRunner.getCrashesBreakdown
        };
    }
    return common.queryRunner.executeQuery(queryDef, params, options);
}

module.exports = {
    getCrashesTable,
    getCrashesBreakdown
};
