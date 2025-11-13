/**
 * Surveys Query Functions for QueryRunner
 */
const common = require('../../../../api/utils/common.js');

const log = common.log('star:queries');
var clickHouseRunner;
try {
    clickHouseRunner = require('../../../clickhouse/api/queries/star.js');
}
catch (error) {
    log.e('Failed to load ClickHouse query runner', error);
}



var fetchCommentsTableMongodb = async function(params) {
    var {query, sSearch, sort, skip, limit} = params;

    var pipe = [
        {"$match": query },
        {
            "$facet": {
                "totalCount": [{"$group": {"_id": "totalCount", "count": {"$sum": 1}}}],
            }
        }
    ];

    var dataPipe = [
        {"$match": query },
        {
            "$project": {
                "_id": 1,
                comment: "$sg.comment",
                email: "$sg.email",
                rating: "$sg.rating",
                ts: 1,
                uid: 1
            }
        }];
    if (sSearch) {
        dataPipe.push({
            "$match": {
                $or: [
                    {"$comment": { $regex: sSearch, $options: 'i' }},
                    {"$email": { $regex: sSearch, $options: 'i' }}
                ]
            }
        }
        );
        pipe[1].$facet.displayCount = [
            {
                "$match": {
                    $or: [
                        {"sg.comment": { $regex: sSearch, $options: 'i' }},
                        {"sg.email": { $regex: sSearch, $options: 'i' }}
                    ]
                }
            },
            {"$group": {"_id": "displayCount", "count": {"$sum": 1}}}
        ];
    }
    dataPipe.push({"$sort": sort || { ts: -1 }});
    dataPipe.push({"$skip": skip || 0});
    dataPipe.push({"$limit": limit || 10});

    pipe.push({
        "$unionWith": {
            coll: "drill_events",
            pipeline: dataPipe
        }
    });

    var data = await common.drillDb.collection("drill_events").aggregate(pipe).toArray();
    var total = 0;
    var display = 0;
    for (var i = 0; i < data.length; i++) {
        if (data[i].totalCount) {
            total = data[i].totalCount[0] ? data[i].totalCount[0].count : 0;
            if (display === 0) {
                display = total;
            }
            //remove this element from array
            data.splice(i, 1);
            i--;
        }
    }

    return {
        _queryMeta: {
            adapter: 'mongodb',
            query: pipe || 'MongoDB aggregation pipeline',
        },
        data: {total: total, display: display, data: data}
    };



};

/**
 * Fetch surveys data table with pagination and optional transforms
 * @param {Object} params - Query parameters
 * @param {Object} [options={}] - Execution options (project/transform)
 * @returns {Promise<Object>} QueryRunner execution result
 */
async function fetchCommentsTable(params, options = {}) {
    if (!common.queryRunner) {
        throw new Error('QueryRunner not initialized. Ensure API server is fully started.');
    }

    const queryDef = {
        name: 'FETCH_COMMENTS_STAR_TABLE',
        adapters: {
            mongodb: {
                handler: fetchCommentsTableMongodb
            }
        }
    };
    if (clickHouseRunner && clickHouseRunner.fetchCommentsTableClickHouse) {
        queryDef.adapters.clickhouse = {
            handler: clickHouseRunner.fetchCommentsTableClickHouse
        };
    }

    return common.queryRunner.executeQuery(queryDef, params, options);
}



module.exports = {
    fetchCommentsTable
};
