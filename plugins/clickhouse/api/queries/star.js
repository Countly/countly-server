/**
 * Core data caluclation from clickhouse database
 */

var obb = {};
const common = require('../../../../api/utils/common.js');
const QueryHelpers = require('../QueryHelpers.js');
var log = common.log('clickhouse:star-queries');
var WhereClauseConverter;
try {
    WhereClauseConverter = require('../WhereClauseConverter');
}
catch (error) {
    log.e('Failed to load WhereClauseConverter', error);
}

(function(agg) {
    /**
     * Fetches comments table for star rating from ClickHouse
     * @param {Object} params - Parameters object
     * @param {Object} params.queryObj - Filter query object
     * @param {String} [params.validation_command_id] - Unique command marker to embed into WHERE for mutation tracking
     * @param {String} [params.targetTable='drill_events'] - Target table
     * @returns {Promise<Object>} QueryRunner response
     */
    agg.fetchCommentsTableClickHouse = async function(params) {
        if (!common.clickhouseQueryService) {
            throw new Error('ClickHouse query service not available. Ensure ClickHouse plugin is active.');
        }
        try {
            const converter = new WhereClauseConverter();
            var uid = params.query.uid;
            delete params.query.uid;

            var { sql: whereSQL, params: bindParams } = converter.queryObjToWhere(params.query || {});
            const fields = [
                "_id",
                "sg.comment as comment",
                "sg.email as email",
                "sg.rating as rating",
                "ts",
                "n as widget_id",
                // IMPORTANT: Query has no GROUP BY, so use forGroupBy=true to avoid any() wrapper
                QueryHelpers.pidFinalSelect('uid', 'userKey', true)
            ];

            var ret = {total: 0, display: 0, data: []};
            if (params.sSearch) {
                var totalQuery = `SELECT count(ts) AS count FROM ${QueryHelpers.resolveTable('drill_events')} ${whereSQL}`;
                const totalResult = await common.clickhouseQueryService.aggregate({query: totalQuery, params: bindParams, appID: params.appID});
                if (totalResult && totalResult[0] && totalResult[0].count) {
                    ret.total = totalResult[0].count;
                }
                params.query.$or = [{"sg.comment": { $regex: (".*" + params.sSearch + ".*") }}, {"sg.email": { $regex: (".*" + params.sSearch + ".*") }}];
                var { sql: whereSQL2, params: bindParams2 } = converter.queryObjToWhere(params.query || {});
                whereSQL = whereSQL2;
                bindParams = bindParams2;
            }

            if (uid) {
                // IMPORTANT: pidClusterPredicate requires (appIdParamToken, uidParamToken, uidColumn, isArray)
                // Must pass both app_id and uid param tokens for proper app-scoped filtering
                const uidPredicate = QueryHelpers.pidClusterPredicate('{app_id:String}', '{uid:String}');
                whereSQL = whereSQL ? `${whereSQL} AND ${uidPredicate}` : `WHERE ${uidPredicate}`;
                bindParams.app_id = params.appID;
                bindParams.uid = uid;
            }
            var ordering = `ORDER BY ts DESC`;
            if (params.sort) {
                var order = "";
                for (var key in params.sort) {
                    order += `${key} ${params.sort[key] === 1 ? 'ASC' : 'DESC'}, `;
                }
                if (order.length > 0) {
                    ordering = `ORDER BY ${order.slice(0, -2)}`;
                }
            }
            var sql = `WITH Source as (SELECT ${fields.join(", ")} FROM ${QueryHelpers.resolveTable('drill_events')} ${whereSQL}) 
                SELECT _id, comment, email, rating, ts, widget_id, userKey as uid FROM Source ${ordering} LIMIT ${params.limit || 100} OFFSET ${params.skip || 0}
                UNION ALL
                SELECT 'total' AS _id, '' AS comment, '' AS email, count(ts) AS rating, any(ts),'', '' AS uid FROM Source`;
            const data = await common.clickhouseQueryService.aggregate({query: sql, params: bindParams, appID: params.appID});
            if (data && data.length > 0) {
                for (var i = 0; i < data.length; i++) {
                    if (data[i]._id === 'total') {
                        ret.display = data[i].rating;
                        ret.total = Math.max(ret.total, ret.display);
                        //remove total row
                        data.splice(i, 1);
                        i--;
                    }
                }
            }
            ret.data = data;
            return {
                _queryMeta: {
                    adapter: 'clickhouse',
                    query: { sql, params: bindParams }
                },
                data: ret
            };
        }
        catch (err) {
            log.e('Error in fetchCommentsTableClickHouse ', err);
            throw err;
        }
    };
}(obb));

module.exports = obb;