/**
 * Core data caluclation from clickhouse database
 */

var obb = {};
const common = require('../../../../api/utils/common.js');
const countlyCommon = require('../../../../api/lib/countly.common.js');
const countlyConfig = require('../../../../api/config');
const ClusterManager = require('../managers/ClusterManager');
var log = common.log('clickhouse:core-queries');
var WhereClauseConverter;
try {
    WhereClauseConverter = require('../WhereClauseConverter');
}
catch (error) {
    log.e('Failed to load WhereClauseConverter', error);
}
let CursorPagination;
try {
    CursorPagination = require('../CursorPagination');
}
catch (error) {
    log.e('Failed to load CursorPagination', error);
}
const queryHelpers = require('../QueryHelpers');

(function(agg) {

    /**
     * Convert bucket name to ClickHouse date formatting expression
     * @param {string} bucket - Bucket name ('d', 'w', 'm', 'h')
     * @param {string} timezone - Timezone to use for date formatting
     * @returns {string} ClickHouse date expression
     */
    var bucketExpr = function(bucket, timezone = 'UTC') {
        switch (bucket) {
        case 'd': return "formatDateTime(toTimeZone(ts, '" + timezone + "'), '%Y:%m:%d')";
        case 'w': return "formatDateTime(toTimeZone(ts, '" + timezone + "'), '%Y:w%V')";
        case 'm': return "formatDateTime(toTimeZone(ts, '" + timezone + "'), '%Y:m%m')";
        case 'h': return "formatDateTime(toTimeZone(ts, '" + timezone + "'), '%Y:%m:%d:%H')";
        case 'y': return "formatDateTime(toTimeZone(ts, '" + timezone + "'), '%Y')";
        default: return '';
        }
    };
    /**
 * ClickHouse handler for drill aggregation
 * Executes drill aggregation using ClickHouse SQL
 * @param {Object} params - Query parameters object containing all necessary data
 * @returns {Promise<Object>} Returns aggregated event data
 */

    agg.fetchAggregatedSegmentedEventDataClickhouse = async function(params) {
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
                    if (events[0] === "[CLY]_star_rating") {
                        match.e = "[CLY]_star_rating";
                    }
                    else {
                        match.n = events[0];
                    }
                }
                else {
                    match.n = {$in: events};
                }
            }
            else {
                match.e = "[CLY]_custom";
            }
            match.ts = {"$gt": ts.$gt, "$lt": ts.$lt};
            if (previous) {
                match.ts.$gt = match.ts.$gt - (ts.$lt - ts.$gt) + 1;
            }
            match[segmentation] = {"$ne": null};

            segmentation = "`" + segmentation.replaceAll(".", "`.`") + "`";
            const converter = new WhereClauseConverter();
            const { sql: whereSQL, params: ch_params } = converter.queryObjToWhere(match);

            var fields = [];
            if (previous) {
                fields = [
                    `${segmentation}::String AS _id`,
                    `sum(c) AS c`,
                    `sum(s) AS s`,
                    `sum(dur) AS dur`
                ];
            }
            else {
                fields = [
                    `${segmentation} AS _id`,
                    `sum(multiIf(ts > ${ts.$gt}, c, 0)) AS c`,
                    `sum(multiIf(ts <= ${ts.$gt}, c, 0)) AS prev_c`,
                    `sum(multiIf(ts > ${ts.$gt}, s, 0)) AS s`,
                    `sum(multiIf(ts <= ${ts.$gt}, s, 0)) AS prev_s`,
                    `sum(multiIf(ts > ${ts.$gt}, dur, 0)) AS dur`,
                    `sum(multiIf(ts <= ${ts.$gt}, dur, 0)) AS prev_dur`
                ];
            }

            let query = `SELECT ${fields.join(', ')} FROM ${queryHelpers.resolveTable('drill_events')} ${whereSQL} \nGROUP BY ${segmentation}::String \nORDER BY c DESC \nLIMIT ${limit || 1000}`;
            const appID = apps && apps.length === 1 ? apps[0] : undefined;
            var data = await common.clickhouseQueryService.aggregate({query: query, params: ch_params, appID: appID}, {});
            for (var z = 0; z < data.length; z++) {
                data[z].c = parseInt(data[z].c, 10);
                data[z].prev_c = parseInt(data[z].prev_c, 10);
            }

            return {
                _queryMeta: {
                    adapter: 'clickhouse',
                    query: query
                },
                data: data
            };
        }
        catch (error) {
            log.e('ClickHouse drill aggregation failed', error);
            throw error;
        }
    };

    agg.aggregatedSessionData = async function(options) {
        var match = {"e": "[CLY]_session"};
        var useApproximateUnique = options.useApproximateUnique || false;

        if (options.appID) {
            match.a = options.appID + "";
        }

        if (options.period) {
            match.ts = countlyCommon.getPeriodRange(options.period, options.timezone, options.periodOffset);
        }

        const converter = new WhereClauseConverter();
        const { sql: whereSQL, params: ch_params, cn: params_count } = converter.queryObjToWhere(match);

        match.e = "[CLY]_session_begin";
        const { sql: whereSQL_session_begin, params: ch_params_session_begin } = converter.queryObjToWhere(match, params_count);
        for (var key in ch_params_session_begin) {
            ch_params[key] = ch_params_session_begin[key];
        }



        var ckQuery = '';
        if (options.segmentation) {
            let segmentation = "`" + options.segmentation.replaceAll(".", "`.`") + "`";
            ckQuery = `SELECT ${segmentation} AS _id, ${queryHelpers.uniqPidFinal(useApproximateUnique, 'uid')} as u, sum(dur) as d, count(*) as t, sum(if(up.sc=1,1,0)) as n FROM ${queryHelpers.resolveTable('drill_events')} ${whereSQL} GROUP BY _id`;
            ckQuery += ` UNION ALL SELECT ${segmentation} AS _id, ${queryHelpers.uniqPidFinal(useApproximateUnique, 'uid')} as u, sum(dur) as d, count(*) as t, sum(if(up.sc=1,1,0)) as n FROM ${queryHelpers.resolveTable('drill_events')} ${whereSQL_session_begin} GROUP BY _id`;
        }
        else {
            ckQuery = `SELECT 'users' AS _id,${queryHelpers.uniqPidFinal(useApproximateUnique, 'uid')} as u, sum(dur) as d, count(*) as t, sum(if(up.sc=1,1,0)) as n FROM ${queryHelpers.resolveTable('drill_events')} ${whereSQL}`;
            ckQuery += ` UNION ALL SELECT 'users' AS _id,${queryHelpers.uniqPidFinal(useApproximateUnique, 'uid')} as u, sum(dur) as d, count(*) as t, sum(if(up.sc=1,1,0)) as n FROM ${queryHelpers.resolveTable('drill_events')} ${whereSQL_session_begin}`;
        }
        ckQuery = `SELECT _id,max(u) as u, max(d) as d, max(t) as t, max(n) as n FROM (${ckQuery}) GROUP BY _id`;

        const appID = options.appID || undefined;
        var data = await common.clickhouseQueryService.aggregate({query: ckQuery, params: ch_params, appID: appID}, {});
        if (!options.segmentation && data?.length === 1) {
            data[0]._id = null; //To have same as in mongo
        }
        for (var z = 0; z < data.length; z++) {
            data[z].c = parseInt(data[z].c, 10);
            if (data[z].sg) {
                data[z].sg = data[z].sg.replaceAll(/\./gi, ":");
            }
        }

        return {
            _queryMeta: {
                adapter: 'clickhouse',
                query: ckQuery
            },
            data: data
        };
    };

    /**
       * Gets aggregated data chosen timezone.If not set - returns in UTC timezone.
       * @param {object} options  - options
       * options.appID - application id
       * options.event - string as event key or array with event keys
       * options.period - Normal Countly period
       * 
       * @returns {object} - aggregated data
       */
    agg.getAggregatedData = async function(options) {
        var match = options.match || {};

        if (options.appID) {
            match.a = options.appID + "";
        }
        if (options.event) {
            if (Array.isArray(options.event)) {
                match.e = {"$in": options.event};
            }
            else {
                match.e = options.event;
            }
        }
        if (options.name) {
            if (Array.isArray(options.name)) {
                match.n = {"$in": options.name};
            }
            else {
                match.n = options.name;
            }
        }
        if (options.period) {
            match.ts = countlyCommon.getPeriodRange(options.period, options.timezone, options.periodOffset);
        }
        if (options.bucket !== "h" && options.bucket !== "d" && options.bucket !== "m" && options.bucket !== "w") {
            options.bucket = "h";
        }

        const converter = new WhereClauseConverter();
        const { sql: whereSQL, params: ch_params, cn: params_count } = converter.queryObjToWhere(match);
        //Breakdown also numbers for each event
        var t1 = "";
        var t2 = "";
        if (options.event === "[CLY]_session") {
            options.event_breakdown = false;
        }
        if (options.event_breakdown) {
            t1 = "n,";
            t2 = ",n";
        }
        var qq = "";
        if (options.segmentation) {
            let segmentation = "`" + options.segmentation.replaceAll(".", "`.`") + "`";
            qq = `SELECT ${segmentation} AS sg,${bucketExpr(options.bucket, options.timezone)} AS _id,${t1} sum(c) AS c, sum(s) AS s, sum(dur) AS dur FROM ${queryHelpers.resolveTable('drill_events')} ${whereSQL} GROUP BY _id,sg${t2}`;
        }
        else {
            qq = `SELECT ${bucketExpr(options.bucket, options.timezone)} AS _id,${t1} sum(c) AS c, sum(s) AS s, sum(dur) AS dur FROM ${queryHelpers.resolveTable('drill_events')} ${whereSQL} GROUP BY _id${t2}`;
        }
        if (options.event === "[CLY]_session") {
            match.e = "[CLY]_session_begin";
            const { sql: whereSQL_session_begin, params: ch_params_session_begin } = converter.queryObjToWhere(match, params_count);
            for (var key in ch_params_session_begin) {
                ch_params[key] = ch_params_session_begin[key];
            }
            if (options.segmentation) {
                let segmentation = "`" + options.segmentation.replaceAll(".", "`.`") + "`";
                qq += ` UNION ALL SELECT ${segmentation} AS sg,${bucketExpr(options.bucket, options.timezone)} AS _id, sum(c) AS c, sum(s) AS s, sum(dur) AS dur FROM ${queryHelpers.resolveTable('drill_events')} ${whereSQL_session_begin} GROUP BY _id,sg`;
            }
            else {
                qq += ` UNION ALL SELECT ${bucketExpr(options.bucket, options.timezone)} AS _id, sum(c) AS c, sum(s) AS s, sum(dur) AS dur FROM ${queryHelpers.resolveTable('drill_events')} ${whereSQL_session_begin} GROUP BY _id`;
            }
            qq = `SELECT _id, max(c) as c, max(s) as s, max(dur) as dur ${options.segmentation ? ', sg' : ''} FROM (${qq}) GROUP BY _id${options.segmentation ? ', sg' : ''} ORDER BY _id`;
        }


        const appID = options.appID || undefined;
        try {
            var data = await common.clickhouseQueryService.aggregate({query: qq, params: ch_params, appID: appID}, {});
        }/*  */
        catch (e) {
            console.log(e);
        }
        data = data || [];
        for (var z = 0; z < data.length; z++) {
            data[z]._id = data[z]._id.replaceAll(/\:0/gi, ":");
            if (data[z].sg) {
                data[z].sg = data[z].sg.replaceAll(/\./gi, ":");
            }
        }

        return {
            _queryMeta: {
                adapter: 'mongodb',
                query: qq
            },
            data: data
        };
        //Group by hour
    };

    agg.getSegmentedEventModelData = async function(options) {
        var match = options.match || {};

        if (options.appID) {
            match.a = options.appID + "";
        }
        if (options.event) {
            if (Array.isArray(options.event)) {
                match.e = {"$in": options.event};
            }
            else {
                match.e = options.event;
            }
        }
        if (options.name) {
            if (Array.isArray(options.name)) {
                match.n = {"$in": options.name};
            }
            else {
                match.n = options.name;
            }
        }
        if (options.period) {
            match.ts = countlyCommon.getPeriodRange(options.period, options.timezone, options.periodOffset);
        }
        if (options.bucket !== "h" && options.bucket !== "d" && options.bucket !== "m" && options.bucket !== "w") {
            options.bucket = "h";
        }

        const converter = new WhereClauseConverter();
        const { sql: whereSQL, params: ch_params } = converter.queryObjToWhere(match);

        var qq = "";
        if (!options.segmentation) {
            options.segmentation = "n";
        }

        let segmentation = "`" + options.segmentation.replaceAll(".", "`.`") + "`";
        qq = `SELECT ${segmentation}::String AS sg, sum(c) as cn FROM ${queryHelpers.resolveTable('drill_events')} ${whereSQL} GROUP BY sg ORDER BY cn DESC LIMIT ${options.limit || 100}`;
        qq = `SELECT ${segmentation}::String AS sg,${bucketExpr(options.bucket, options.timezone)} AS _id, sum(c) AS c, sum(s) AS s, sum(dur) AS dur FROM ${queryHelpers.resolveTable('drill_events')} ${whereSQL} AND sg IN (SELECT sg FROM (${qq})) GROUP BY _id,sg`;

        const appIDSeg = options.appID || undefined;
        var data = await common.clickhouseQueryService.aggregate({query: qq, params: ch_params, appID: appIDSeg}, {});
        return {
            _queryMeta: {
                adapter: 'clickhouse',
                query: {query: qq, params: ch_params}
            },
            data: data
        };
    };


    agg.getViewTotals = async function(params) {
        var { query, userKey, useApproximateUniq = true } = params;
        try {

            userKey = userKey || "uid";
            if (userKey.indexOf(".") > 0) {
                userKey = "`" + userKey.replaceAll(".", "`.`") + "`";
            }
            const uniqFunction = queryHelpers.getUniqFunction(useApproximateUniq);

            const converter = new WhereClauseConverter();
            const { sql: whereSQL, params: ch_params } = converter.queryObjToWhere(query);
            // IMPORTANT: Use forGroupBy=true because idExpr is used inside aggregate function
            const idExpr = queryHelpers.pidFinalExpr(userKey, true);
            const clickhouse_query = `
            SELECT ${uniqFunction}(${idExpr}) as u,
            COUNT(c) as t
            FROM ${queryHelpers.resolveTable('drill_events')}
            ${whereSQL}
        `;
            const appIDUsers = params.appID || undefined;
            var rawResult = await common.clickhouseQueryService.aggregate({query: clickhouse_query, params: ch_params, appID: appIDUsers}, {});
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
    };


    agg.getViewsGraphValues = async function(params) {
        var { query, userKey, useApproximateUniq = true, timezone, bucket} = params;
        try {
            userKey = userKey || "uid";
            if (userKey.indexOf(".") > 0) {
                userKey = "`" + userKey.replaceAll(".", "`.`") + "`";
            }

            const uniqFunction = queryHelpers.getUniqFunction(useApproximateUniq);
            const converter = new WhereClauseConverter();
            const { sql: whereSQL, params: ch_params } = converter.queryObjToWhere(query);
            // IMPORTANT: Use forGroupBy=true because idExpr is used inside aggregate function
            const idExpr = queryHelpers.pidFinalExpr(userKey, true);
            const clickhouse_query = `
            SELECT ${bucketExpr(bucket, timezone)} as _id,n as n, ${uniqFunction}(${idExpr}) as u
            FROM ${queryHelpers.resolveTable('drill_events')}
            ${whereSQL}
            GROUP BY n, ${bucketExpr(bucket, timezone)}
        `;
            const appIDGraph = params.appID || undefined;
            const rawResult = await common.clickhouseQueryService.aggregate({query: clickhouse_query, params: ch_params, appID: appIDGraph}, {});
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
    };

    agg.segmentValuesForPeriod = async function(options) {
        var match = options.dbFilter || {};
        if (options.appID) {
            match.a = options.appID + "";
        }
        if (options.event) {
            match.e = options.event;
        }
        if (options.name) {
            match.n = options.name;
        }
        if (options.period) {
            match.ts = countlyCommon.getPeriodRange(options.period, "UTC", options.periodOffset);
        }

        const converter = new WhereClauseConverter();
        const { sql: whereSQL, params: ch_params } = converter.queryObjToWhere(match);

        var qq = `SELECT ${options.field} AS _id, COUNT(*) AS c FROM ${queryHelpers.resolveTable('drill_events')} ${whereSQL} GROUP BY ${options.field} ORDER BY c DESC LIMIT ${options.limit || 1000}`;

        const appIDField = options.appID || undefined;
        const rawResult = await common.clickhouseQueryService.aggregate({query: qq, params: ch_params, appID: appIDField}, {});
        //converting to same we have in mongodb

        return {
            _queryMeta: {
                adapter: 'clickhouse',
                query: qq
            },
            data: rawResult
        };
    };

    agg.getUniqueUserModel = async function(options) {
        const converter = new WhereClauseConverter();
        const { sql: whereSQL, params: ch_params } = converter.queryObjToWhere(options.query);
        const useApproximateUniq = options.useApproximateUniq !== false;
        const uniqFunc = queryHelpers.getUniqFunction(useApproximateUniq);

        var qq = `WITH Source AS (SELECT ts, ${queryHelpers.pidFinalSelect('uid', 'pid_final', true)} FROM ${queryHelpers.resolveTable('drill_events')} ${whereSQL} ) `;
        var queryParts = [];
        for (var z = 0; z < options.buckets.length; z++) {
            queryParts.push(
                `SELECT ${bucketExpr(options.buckets[z], options.timezone)} AS _id, ${uniqFunc}(pid_final) as u FROM Source GROUP BY _id`
            );
        }

        qq = qq + " " + queryParts.join(" UNION ALL ");
        const appIDField = options.appID || undefined;
        const rawResult = await common.clickhouseQueryService.aggregate({query: qq, params: ch_params, appID: appIDField}, {});

        return {
            _queryMeta: {
                adapter: 'clickhouse',
                query: qq
            },
            data: rawResult
        };
    };


    /**
 * Clickhouse handler calculating unique user count for specific views
 * Executes drill aggregation using Clickhouse SQL
 * @param {Object} params - Query parameters object containing all necessary data
 * @param {Object} params.query - query for match stage
 * @param {string} params.userKey - field to determine unique user by. (uid by default)
 * @returns {Array} Returns array with data
 */
    agg.getViewsUniqueCount = async function(params) {
        var { query, userKey, useApproximateUniq = true } = params;
        try {
            userKey = userKey || "uid";
            if (userKey.indexOf(".") > 0) {
                userKey = "`" + userKey.replaceAll(".", "`.`") + "`";
            }

            const uniqFunction = queryHelpers.getUniqFunction(useApproximateUniq);
            const converter = new WhereClauseConverter();
            const { sql: whereSQL, params: ch_params } = converter.queryObjToWhere(query);
            // IMPORTANT: Use forGroupBy=true because idExpr is used inside aggregate function
            const idExpr = queryHelpers.pidFinalExpr(userKey, true);
            const clickhouse_query = `
            SELECT n as _id, ${uniqFunction}(${idExpr}) as u
            FROM ${queryHelpers.resolveTable('drill_events')}
            ${whereSQL}
            GROUP BY n
        `;
            const appIDEvents = query && query.a ? (Array.isArray(query.a) ? query.a[0] : query.a) : undefined;
            const rawResult = await common.clickhouseQueryService.aggregate({query: clickhouse_query, params: ch_params, appID: appIDEvents}, {});
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
    };


    agg.getViewsTableData = async function(options) {
        var match = options.dbFilter || {};
        if (options.appID) {
            match.a = options.appID + "";
        }
        match.e = "[CLY]_view";
        if (options.period) {
            match.ts = countlyCommon.getPeriodRange(options.period, "UTC", options.periodOffset);
        }

        var pipeline = [];
        pipeline.push({"$match": match});
        pipeline.push({"$group": {"_id": {"u": "$uid", "sg": "$n" }, "t": {"$sum": 1}, "d": {"$sum": "$dur"}, "s": {"$sum": "$sg.start"}, "e": {"$sum": "$sg.exit"}, "b": {"$sum": "$sg.bounce"}}});
        pipeline.push({"$addFields": {"u": 1}});
        //Union with cly action
        pipeline.push({
            "$unionWith": {
                "coll": "drill_events",
                "pipeline": [
                    {"$match": {"e": "[CLY]_action", "sg.type": "scroll", "ts": match.ts, "a": match.a}},
                    {"$group": {"_id": {"u": "$uid", "sg": "$n"}, "scr": {"$sum": "$sg.scr"}}}
                ]
            }
        });
        pipeline.push({"$group": {"_id": "$_id.sg", "u": {"$sum": "$u"}, "t": {"$sum": "$t"}, "d": {"$sum": "$d"}, "s": {"$sum": "$s"}, "e": {"$sum": "$e"}, "b": {"$sum": "$b"}, "scr": {"$sum": "$scr"}}});

        //Union with data from view updates and group by _id.sg
        var match2 = JSON.parse(JSON.stringify(match));
        match2.e = "[CLY]_view_update";
        var pipeline2 = [
            {"$match": match2},
            {"$group": {"_id": {"u": "$uid", "sg": "$n"}, "t": {"$sum": 0}, "d": {"$sum": "$dur"}, "s": {"$sum": 0}, "e": {"$sum": "$sg.exit"}, "b": {"$sum": "$sg.bounce"}, "scr": {"$sum": 0}, "u": {"$sum": 1}}}, //t and scr are 0 as they are not tracked in view update
            {"$group": {"_id": "$_id.sg", "u": {"$sum": "$u"}, "t": {"$sum": "$t"}, "d": {"$sum": "$d"}, "s": {"$sum": "$s"}, "e": {"$sum": "$e"}, "b": {"$sum": "$b"}, "scr": {"$sum": "$scr"}}}
        ];

        pipeline.push({"$unionWith": {"coll": "drill_events", "pipeline": pipeline2}});
        pipeline.push({"$group": {"_id": "$_id", "u": {"$max": "$u"}, "t": {"$max": "$t"}, "d": {"$sum": "$d"}, "s": {"$max": "$s"}, "e": {"$max": "$e"}, "b": {"$max": "$b"}, "scr": {"$max": "$scr"}}});
        pipeline.push({
            "$addFields": {
                "scr-calc": { $cond: [ { $or: [{$eq: ["$t", 0]}, {$eq: ['$scr', 0]}]}, 0, {'$divide': ['$scr', "$t"]}] },
                "d-calc": { $cond: [ { $or: [{$eq: ["$t", 0]}, {$eq: ['$d', 0]}]}, 0, {'$divide': ['$d', "$t"]}] },
                "br": { $cond: [ { $or: [{$eq: ["$s", 0]}, {$eq: ['$b', 0]}]}, 0, {'$divide': [{"$min": ['$b', "$s"]}, "$s"]}] },
                "b": {"$min": [{"$ifNull": ["$b", 0]}, {"$ifNull": ["$s", 0]}]},
                "view": "$_id"
            }
        });

        var data = await common.drillDb.collection("drill_events").aggregate(pipeline).toArray();
        for (var z = 0; z < data.length; z++) {
            data[z]._id = data[z]._id.replaceAll(/\:0/gi, ":");
            if (data[z].sg) {
                data[z].sg = data[z].sg.replaceAll(/\./gi, ":");
            }
        }
        return {
            _queryMeta: {
                adapter: 'mongodb',
                query: pipeline || 'MongoDB event segmentation aggregation pipeline',
            },
            data: data
        };
    };

    /**
     * ClickHouse handler for consent events list
     * @param {Object} params - Query parameters
     * @returns {Promise<Object>} QueryRunner result
     */
    agg.getComplianceHubConsents = async function(params) {
        const {
            appID,
            period,
            query = {},
            sSearch,
            sort = {},
            limit: rawLimit,
            cursor,
            paginationMode,
            useApproximateUniq
        } = params || {};

        const essential = { a: appID, e: '[CLY]_consent' };
        if (period) {
            const tsRange = countlyCommon.getPeriodRange(period);
            if (tsRange) {
                essential.ts = tsRange;
            }
        }

        let userQuery = params._consentsHelpers.mapConsentFieldsForDrillEvents(query);
        userQuery = params._consentsHelpers.sanitizeClickhouseFilterQuery(userQuery);

        let enhanced = essential;
        if (userQuery && Object.keys(userQuery).length) {
            if (userQuery.$and || userQuery.$or || userQuery.$nor) {
                enhanced = { $and: [ essential, userQuery ] };
            }
            else {
                enhanced = { ...userQuery, ...essential };
            }
        }

        // sSearch
        if (sSearch && sSearch !== '') {
            const sCond = { sSearch: [{ field: 'did', value: sSearch }] };
            if (enhanced.$and && Array.isArray(enhanced.$and)) {
                enhanced.$and.push(sCond);
            }
            else {
                enhanced = { $and: [ enhanced, sCond ] };
            }
        }

        const converter = new WhereClauseConverter();
        const { sql: whereSQL, params: bindParams } = converter.queryObjToWhere(enhanced);

        const selectFields = [
            'did AS device_id',
            'uid',
            'sg._type AS type',
            'sg',
            'ts',
            'toUnixTimestamp64Milli(ts) AS ts_ms',
            'a',
            'cd',
            '_id',
            'up'
        ];
        let sql = `SELECT ${selectFields.join(', ')} FROM ${queryHelpers.resolveTable('drill_events')} ${whereSQL}`.trim();

        const paginationModeResolved = CursorPagination.determinePaginationMode({ paginationMode });
        const snapshotTs = paginationModeResolved === CursorPagination.MODES.SNAPSHOT
            ? CursorPagination.formatDateForClickHouse(new Date()) : null;

        if (cursor) {
            const cursorData = CursorPagination.decodeCursor(cursor);
            const cursorWhere = CursorPagination.buildCursorWhere(cursorData, 'ASC', paginationModeResolved);
            if (cursorWhere.sql) {
                sql = `${sql} ${cursorWhere.sql}`;
                Object.assign(bindParams, cursorWhere.params);
            }
        }

        if (sort && Object.keys(sort).length) {
            const allowed = new Set(['device_id', 'uid', 'type', 'ts', 'a', 'e', 'n']);
            const fieldMap = { device_id: 'did', uid: 'uid', type: 'sg._type', ts: 'ts', a: 'a', e: 'e', n: 'n' };
            const clauses = [];
            for (const [field, dir] of Object.entries(sort)) {
                if (allowed.has(field)) {
                    clauses.push(`${fieldMap[field] || field} ${dir === 1 ? 'ASC' : 'DESC'}`);
                }
            }
            if (clauses.length) {
                const tsClause = clauses.find(c => c.startsWith('ts'));
                const others = clauses.filter(c => !c.startsWith('ts'));
                if (tsClause) {
                    sql += ` ORDER BY a, e, n, ${tsClause}`;
                    if (others.length) {
                        sql += `, ${others.join(', ')}`;
                    }
                }
                else {
                    sql += ` ORDER BY a, e, n, ts, ${others.join(', ')}`;
                }
            }
            else {
                sql += ' ORDER BY a, e, n, ts';
            }
        }
        else {
            sql += ' ORDER BY a, e, n, ts';
        }

        const limit = parseInt(rawLimit, 10) || 20;
        sql += ` LIMIT ${limit + 1}`;

        //Not passing app_id as Data redaction will not happen in plugins: complaince hub and audit logs.
        const rows = await common.clickhouseQueryService.query({ query: sql, params: bindParams });
        const countResult = await CursorPagination.getCount(common.clickhouseQueryService, whereSQL, bindParams, useApproximateUniq);
        const pagination = CursorPagination.buildPaginationResponse(rows, limit, countResult, paginationModeResolved, snapshotTs);

        return {
            _queryMeta: {
                adapter: 'clickhouse',
                query: { sql, params: bindParams, countFunction: queryHelpers.getUniqFunction(useApproximateUniq) }
            },
            data: pagination
        };
    };

    /**
     * Generic ClickHouse collection/table fetch for DBViewer
     * @param {Object} params - Query parameters
     * @param {String} params.chDb - ClickHouse database name
     * @param {String} params.table - ClickHouse table name
     * @param {Object} [params.projection] - Projection map of columns to include)
     * @param {Object} [params.sort] - Sort object { column: direction }
     * @param {Object} [params.filter] - Mongo-like filter to be converted by WhereClauseConverter
     * @param {String} [params.sSearch] - Free text search parameter
     * @param {Number|String} [params.limit] - Page size
     * @param {String} [params.cursor] - Encoded cursor for pagination
     * @param {String} [params.paginationMode] - Pagination mode
     * @param {Boolean} [params.useApproximateUniq] - Whether to use approximate uniq for counting
     * @returns {Promise<Object>} Paginated data with cursor
     */
    agg.getDbviewerCollection = async function(params) {
        const {
            chDb,
            table,
            projection,
            sort,
            filter,
            sSearch,
            limit: rawLimit,
            cursor,
            paginationMode,
            useApproximateUniq
        } = params || {};

        if (!chDb || !table) {
            throw new Error('Missing ClickHouse database or table.');
        }

        const helpers = params && params._dbviewerHelpers ? params._dbviewerHelpers : {};
        const qi = typeof helpers.qi === 'function' ? helpers.qi : null;
        const getSchema = typeof helpers.getSchema === 'function' ? helpers.getSchema : null;
        const getSortKeys = typeof helpers.getSortKeys === 'function' ? helpers.getSortKeys : null;
        if (!getSchema || !qi || !getSortKeys) {
            throw new Error('DBViewer helpers are missing. Ensure _dbviewerHelpers with getSchema, getSortKeys, qi are provided.');
        }

        // projection
        let selectList = '*';
        if (projection && typeof projection === 'object' && !Array.isArray(projection)) {
            const cols = Object.keys(projection).filter(k => projection[k]);
            if (cols.length) {
                selectList = cols.map(qi).join(', ');
            }
        }

        // filter
        let finalQuery = (filter && typeof filter === 'object') ? filter : {};
        if (sSearch && sSearch !== '') {
            if (Object.keys(finalQuery).length) {
                finalQuery = { $and: [ finalQuery, { sSearch: sSearch } ] };
            }
            else {
                finalQuery = { sSearch: sSearch };
            }
        }

        const converter = new WhereClauseConverter();
        const { sql: whereSQL, params: whereParams } = converter.queryObjToWhere(finalQuery);

        const schema = await getSchema(chDb, table);
        const hasTs = !!schema.ts;
        const hasId = !!schema._id;

        // sort
        let orderClause = '';
        if (sort && typeof sort === 'object' && !Array.isArray(sort)) {
            const allowedSortKeys = await getSortKeys(chDb, table);
            const invalidKeys = Object.keys(sort).filter(k => !allowedSortKeys.includes(k));
            if (invalidKeys.length) {
                throw new Error('Invalid sort key(s): ' + invalidKeys.join(', ') + '. Allowed sort keys: ' + allowedSortKeys.join(', ') + '.');
            }
            const parts = [];
            for (const [col, dir] of Object.entries(sort)) {
                const d = (typeof dir === 'string' ? dir.toLowerCase() : dir);
                const ord = d === -1 ? 'DESC' : 'ASC';
                parts.push(`${qi(col)} ${ord}`);
            }
            if (parts.length) {
                orderClause = ' ORDER BY ' + parts.join(', ');
            }
        }
        if (!orderClause) {
            const parts = [];
            if (schema.a) {
                parts.push('`a`');
            }
            if (schema.e) {
                parts.push('`e`');
            }
            if (schema.n) {
                parts.push('`n`');
            }
            if (schema.ts) {
                parts.push('`ts`');
            }
            if (parts.length) {
                orderClause = ' ORDER BY ' + parts.join(', ');
            }
        }

        if (selectList !== '*') {
            const selectedCols = selectList.split(',').map(s => s.trim().replace(/^`|`$/g, ''));
            const extra = [];
            if (hasTs && selectedCols.indexOf('ts') === -1) {
                extra.push('`ts`');
            }
            if (hasId && selectedCols.indexOf('_id') === -1) {
                extra.push('`_id`');
            }
            if (extra.length) {
                selectList = selectList + ', ' + extra.join(', ');
            }
        }

        // pagination
        let enhancedWhereSQL = whereSQL || '';
        let finalParams = { ...whereParams };
        const limit = parseInt(rawLimit, 10) || 10;
        const paginationModeResolved = CursorPagination.determinePaginationMode({ paginationMode });
        const snapshotTs = paginationModeResolved === CursorPagination.MODES.SNAPSHOT
            ? CursorPagination.formatDateForClickHouse(new Date()) : null;

        if (cursor && (hasTs || hasId)) {
            const cursorData = CursorPagination.decodeCursor(cursor);
            const cursorWhere = CursorPagination.buildCursorWhere(cursorData, 'DESC', paginationModeResolved);
            if (cursorWhere.sql) {
                if (enhancedWhereSQL) {
                    enhancedWhereSQL = enhancedWhereSQL + cursorWhere.sql;
                }
                else {
                    enhancedWhereSQL = 'WHERE 1=1' + cursorWhere.sql;
                }
                Object.assign(finalParams, cursorWhere.params);
            }
        }

        const tableRef = `${qi(chDb)}.${qi(table)}`;
        const dataSQL = `SELECT ${selectList} FROM ${tableRef} ${enhancedWhereSQL}${orderClause} LIMIT ${limit + 1}`;

        const [countResult, dataRows] = await Promise.all([
            CursorPagination.getCount(common.clickhouseQueryService, whereSQL || '', whereParams || {}, useApproximateUniq),
            common.clickhouseQueryService.aggregate({
                query: dataSQL,
                params: { ...finalParams },
                appID: params.appID || undefined
            })
        ]);

        const pagination = CursorPagination.buildPaginationResponse(dataRows, limit, countResult, paginationModeResolved, snapshotTs);

        return {
            _queryMeta: {
                adapter: 'clickhouse',
                query: { sql: dataSQL, params: finalParams }
            },
            data: pagination
        };
    };

    agg.getDrillCursorForExport = async function(options) {
        var ck = options.clickhouse_pipeline;
        if (!ck || !ck.query) {
            throw new Error('ClickHouse pipeline or query missing for drill export.');
        }
        else {
            var cursor = common.clickhouseQueryService.aggregate({query: ck.query, params: ck.params, appID: options.appID || undefined}, {"stream": true});
            return {
                _queryMeta: {
                    adapter: 'clickhouse',
                    query: { sql: ck.query, params: ck.params || {} },
                },
                data: cursor
            };
        }
    };

    /**
     * Delete granular data from ClickHouse triggered by deletion manager job
     * @param {Object} params - Parameters object
     * @param {Object} params.queryObj - Filter query object
     * @param {String} [params.validation_command_id] - Unique command marker to embed into WHERE for mutation tracking
     * @param {String} [params.targetTable='drill_events'] - Target table
     * @returns {Promise<Object>} QueryRunner response
     */
    agg.deleteGranularDataByQuery = async function(params) {
        if (!common.clickhouseQueryService) {
            throw new Error('ClickHouse query service not available. Ensure ClickHouse plugin is active.');
        }
        const queryObj = params && params.queryObj;
        const db = params && params.db;
        let includeDb = false;
        if (db) {
            includeDb = true;
        }
        // In cluster mode, mutations must target local tables
        const cm = new ClusterManager(countlyConfig.clickhouse || {});
        // Construct fully qualified table name if db is provided
        const collection = (params && params.targetTable) ? params.targetTable : queryHelpers.resolveTable('drill_events', { includeDb: includeDb });
        const baseTable = db ? `${db}.${collection}` : collection;
        const targetTable = cm.isClusterMode() ? baseTable + '_local' : baseTable;
        const validationCommandId = params && params.validation_command_id ? params.validation_command_id + '' : '';
        if (!queryObj || typeof queryObj !== 'object' || !Object.keys(queryObj).length) {
            throw new Error('Empty or invalid queryObj for ClickHouse delete.');
        }
        const converter = new WhereClauseConverter();
        const { sql: whereSQL, params: bindParams } = converter.queryObjToWhere(queryObj);
        if (!whereSQL || !whereSQL.trim()) {
            throw new Error('Empty WHERE SQL for ClickHouse delete.');
        }
        let finalWhere = whereSQL;
        if (validationCommandId) {
            finalWhere = `${whereSQL} AND '${validationCommandId}' = '${validationCommandId}'`; // 1=1 (to embed command id to system.mutations)
        }
        // In cluster mode, mutations must fan out across all shards
        let sql;
        if (cm.isClusterMode()) {
            const onCluster = cm.getOnClusterClause();
            sql = `DELETE FROM ${targetTable} ${onCluster} ${finalWhere}`;
        }
        else {
            sql = `DELETE FROM ${targetTable} ${finalWhere}`;
        }
        const data = await common.clickhouseQueryService.executeMutation({ query: sql, params: bindParams }, {});
        return {
            _queryMeta: {
                adapter: 'clickhouse',
                query: { sql, params: bindParams }
            },
            data
        };
    };

    /**
     * Update granular data in ClickHouse triggered by mutation manager job
     * @param {Object} params - Parameters object
     * @param {Object} params.queryObj - Filter query object
     * @param {Object} params.updateObj - Update operation object
     * @param {String} [params.db] - Database name (e.g., 'identity')
     * @param {String} [params.targetTable='drill_events'] - Target table
     * @param {String} [params.validation_command_id] - Unique command marker for mutation tracking
     * @returns {Promise<Object>} QueryRunner response
     */
    agg.updateGranularDataByQuery = async function(params) {
        if (!common.clickhouseQueryService) {
            throw new Error('ClickHouse query service not available. Ensure ClickHouse plugin is active.');
        }
        const db = params && params.db;
        const collection = (params && params.targetTable) ? params.targetTable : 'drill_events';
        // Construct fully qualified table name if db is provided
        const targetTable = db ? `${db}.${collection}` : collection;
        log.d('updateGranularDataByQuery called for table:', targetTable);

        // TODO: Granular data update implementation using targetTable
        throw new Error('updateGranularDataByQuery is not implemented yet.');
    };
}(obb));

module.exports = obb;