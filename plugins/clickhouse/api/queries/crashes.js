/**
 * Core data caluclation from clickhouse database
 */

var obb = {};
const common = require('../../../../api/utils/common.js');
var log = common.log('clickhouse:crashes-queries');
var WhereClauseConverter;
try {
    WhereClauseConverter = require('../WhereClauseConverter');
}
catch (error) {
    log.e('Failed to load WhereClauseConverter', error);
}
const QueryHelpers = require('../QueryHelpers');

(function(agg) {

    var safeCol = function(col) {
        if (!/^[A-Za-z0-9_. ]+$/.test(col)) {
            throw new Error('Illegal column path: ' + col);
        }
        if (col.indexOf("custom.") === 0) {
            col = col.replace("custom.", "custom`.`");
        }
        if (col.indexOf("sg.") === 0) {
            col = col.replace("sg.", "sg`.`");
        }
        if (col.indexOf("cmp.") === 0) {
            col = col.replace("cmp.", "cmp`.`");
        }
        if (col.indexOf("up.") === 0) {
            col = col.replace("up.", "up`.`");
        }
        return col;
    };

    agg.getCrashesBreakdown = async function(params) {
        if (!common.clickhouseQueryService) {
            throw new Error('ClickHouse query service not available. Ensure ClickHouse plugin is active.');
        }
        const converter = new WhereClauseConverter();
        const { sql: whereSQL, params: bindParams } = converter.queryObjToWhere(params.query || {});
        const groupByField = "`" + safeCol(params.field || 'sg.app_version') + "`";

        var sql = `SELECT ${groupByField} AS _id, COUNT(*) AS count FROM ${QueryHelpers.resolveTable('drill_events')} ${whereSQL} GROUP BY ${groupByField} ORDER BY count DESC LIMIT ${params.limit || 100}`;

        const data = await common.clickhouseQueryService.aggregate({query: sql, params: bindParams, appID: params.appID});

        return {
            _queryMeta: {
                adapter: 'clickhouse',
                query: { sql, params: bindParams }
            },
            data
        };
    };
    /**
     * Delete granular data from ClickHouse triggered by deletion manager job
     * @param {Object} params - Parameters object
     * @param {Object} params.queryObj - Filter query object
     * @param {String} [params.validation_command_id] - Unique command marker to embed into WHERE for mutation tracking
     * @param {String} [params.targetTable='drill_events'] - Target table
     * @returns {Promise<Object>} QueryRunner response
     */
    agg.getCrashesTable = async function(params) {
        if (!common.clickhouseQueryService) {
            throw new Error('ClickHouse query service not available. Ensure ClickHouse plugin is active.');
        }

        const converter = new WhereClauseConverter();
        const { sql: whereSQL, params: bindParams } = converter.queryObjToWhere(params.query || {});
        const fields = [
            "_id",
            "n",
            "sg",
            // IMPORTANT: Query has no GROUP BY, so use forGroupBy=true to avoid any() wrapper
            QueryHelpers.pidFinalSelect('uid', 'uid', true),
            "ts",
            "up"
        ];
        var sql = `SELECT ${fields.join(", ")} FROM ${QueryHelpers.resolveTable('drill_events')} ${whereSQL} ORDER BY ts DESC LIMIT ${params.limit || 100}`;
        const data = await common.clickhouseQueryService.aggregate({query: sql, params: bindParams, appID: params.appID});

        return {
            _queryMeta: {
                adapter: 'clickhouse',
                query: { sql, params: bindParams }
            },
            data
        };
    };
}(obb));

module.exports = obb;