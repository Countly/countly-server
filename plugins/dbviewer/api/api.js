var common = require('../../../api/utils/common.js'),
    log = common.log('dbviewer:api'),
    async = require('async'),
    plugins = require('../../pluginManager.js'),
    countlyFs = require('../../../api/utils/countlyFs.js'),
    _ = require('underscore'),
    taskManager = require('../../../api/utils/taskmanager.js'),
    { getCollectionName, dbUserHasAccessToCollection, dbLoadEventsData, validateUser, getUserApps, validateGlobalAdmin, hasReadRight, getBaseAppFilter } = require('../../../api/utils/rights.js'),
    exported = {};
const { MongoInvalidArgumentError } = require('mongodb');

const { EJSON } = require('bson');
let clickHouseRunner;
try {
    clickHouseRunner = require('../../clickhouse/api/queries/clickhouseCoreQueries.js');
}
catch (e) {
    log.d('ClickHouse plugin not found, ClickHouse queries will be unavailable');
}

const FEATURE_NAME = 'dbviewer';
const whiteListedAggregationStages = {
    "$addFields": true,
    "$bucket": true,
    "$bucketAuto": true,
    //"$changeStream": false,
    //"$changeStreamSplitLargeEvents": false,
    //"$collStats": false,
    "$count": true,
    //"$currentOp": false,
    "$densify": true,
    //"$documents": false
    "$facet": true,
    "$fill": true,
    "$geoNear": true,
    "$graphLookup": true,
    "$group": true,
    //"$indexStats": false,
    "$limit": true,
    //"$listLocalSessions": false
    //"$listSampledQueries": false
    //"$listSearchIndexes": false
    //"$listSessions": false
    //"$lookup": false
    "$match": true,
    //"$merge": false
    //"$mergeCursors": false
    //"$out": false
    //"$planCacheStats": false,
    "$project": true,
    "$querySettings": true,
    "$redact": true,
    "$replaceRoot": true,
    "$replaceWith": true,
    "$sample": true,
    "$search": true,
    "$searchMeta": true,
    "$set": true,
    "$setWindowFields": true,
    //"$sharedDataDistribution": false,
    "$skip": true,
    "$sort": true,
    "$sortByCount": true,
    //"$unionWith": false,
    "$unset": true,
    "$unwind": true,
    "$vectorSearch": true //atlas specific
};
var spawn = require('child_process').spawn,
    child;

const CLICKHOUSE_PREFIX = 'clickhouse_';
/**
 * Checks if the given database name is a ClickHouse database.
 * @param {*} name - The database name to check.
 * @returns {boolean} - True if the database is a ClickHouse database, false otherwise.
 */
const isClickhouseDBSelected = (name) => typeof name === 'string' && name.startsWith(CLICKHOUSE_PREFIX);
/**
 * Checks if the ClickHouse database is enabled.
 * @returns {boolean} - True if ClickHouse is enabled, false otherwise.
 */
const isClickhouseEnabled = () => plugins.isPluginEnabled && plugins.isPluginEnabled('clickhouse');

(function() {
    plugins.register("/permissions/features", function(ob) {
        ob.features.push(FEATURE_NAME);
    });
    /**
     * Function removes not allowed aggregation stages from the pipeline
     * @param {array} aggregation  - current aggregation pipeline
     * @returns {object} changes - object with information which operations were removed
     */
    function escapeNotAllowedAggregationStages(aggregation) {
        var changes = {};
        for (var z = 0; z < aggregation.length; z++) {
            for (var key in aggregation[z]) {
                if (!whiteListedAggregationStages[key]) {
                    changes[key] = true;
                    delete aggregation[z][key];
                }
            }
            if (Object.keys(aggregation[z]).length === 0) {
                aggregation.splice(z, 1);
                z--;
            }
        }
        return changes;
    }

    /**
     * @api {get} /o/db Access database
     * @apiName AccessDB
     * @apiGroup DBViewer
     *
     * @apiDescription Access database, get collections, indexes and data
     * @apiQuery {String} db Database name
     * @apiQuery {String} collection Collection name
     * @apiQuery {String} action Action to perform, "get_indexes" for getting indexes of a collection
     * @apiQuery {String} document unique identifier for a document, provide this if want to get detail
     * @apiQuery {Object} aggregation Pipeline object for aggregation
     * 
     * @apiSuccessExample {json} Success-Response:
     * HTTP/1.1 200 OK
     * {
     *  "limit":4,
     *  "start":1,
     *  "end":4,
     *  "total":4,
     *  "pages":1,
     *  "curPage":1,
     *  "collections":[
     *    {
     *      "v":2,
     *      "key":{"_id":1},
     *      "name":"_id_",
     *      "ns":"countly.app_crashes625ef06c0aff525c2e9dc10a"
     *    },
     *    {
     *      "v":2,
     *      "key":{"group":1},
     *      "name":"group_1",
     *      "ns":"countly.app_crashes625ef06c0aff525c2e9dc10a",
     *      "background":true
     *    }
     *  ]
     * }
     * 
     * 
     * @apiErrorExample {json} Error-Response:
     * HTTP/1.1 400 Bad Request
     * {
     *  "result": "Missing parameter \"app_key\" or \"device_id\""" 
     * }
     */
    plugins.register("/o/db", function(ob) {
        var dbs = { countly: common.db, countly_drill: common.drillDb, countly_out: common.outDb, countly_fs: countlyFs.gridfs.getHandler() };
        var params = ob.params;
        var paths = ob.paths;
        var dbNameOnParam = params.qstring.dbs || params.qstring.db;
        if (paths[3]) {
            switch (paths[3]) {
            case 'mongotop': return validateGlobalAdmin(params, fetchMongoTop);
            case 'mongostat': return validateGlobalAdmin(params, fetchMongoStat);
            default: common.returnMessage(params, 404, 'Invalid endpoint');
                break;
            }
        }

        /**
        * Get indexes
        **/
        function getIndexes() {
            dbs[dbNameOnParam].collection(params.qstring.collection).indexes(function(err, indexes) {
                if (err) {
                    common.returnOutput(params, 'Somethings went wrong');
                }
                common.returnOutput(params, { limit: indexes.length, start: 1, end: indexes.length, total: indexes.length, pages: 1, curPage: 1, collections: indexes });
            });
        }

        /**
        * Check properties and manipulate values
        * @param {object} doc - document
        * @returns {object} - returns manipulated document object
        **/
        function objectIdCheck(doc) {
            if (typeof doc === "string") {
                doc = EJSON.parse(doc);
            }
            for (var key in doc) {
                if (doc[key] && typeof doc[key].toHexString !== "undefined" && typeof doc[key].toHexString === "function") {
                    doc[key] = "ObjectId(" + doc[key] + ")";
                }
            }
            return doc;
        }

        /**
        * Get document data from db
        **/
        function dbGetDocument() {
            if (dbs[dbNameOnParam]) {
                if (isObjectId(params.qstring.document)) {
                    params.qstring.document = common.db.ObjectID(params.qstring.document);
                }
                if (dbs[dbNameOnParam]) {
                    dbs[dbNameOnParam].collection(params.qstring.collection).findOne({ _id: params.qstring.document }, function(err, results) {
                        if (!err) {
                            if (params.qstring.collection === 'members' && results) {
                                delete results.password;
                                delete results.api_key;
                            }
                            else if (params.qstring.collection === 'auth_tokens' && results) {
                                if (results._id) {
                                    results._id = '***redacted***';
                                }
                            }
                            common.returnOutput(params, objectIdCheck(results) || {});
                        }
                        else {
                            common.returnOutput(params, 500, err);
                        }
                    });
                }
            }
            else {
                common.returnOutput(params, {});
            }
        }
        /**
        * Get collection data from db
        **/
        async function dbGetCollection() {
            var limit = parseInt(params.qstring.limit || 20);
            var skip = parseInt(params.qstring.skip || 0);
            var filter = params.qstring.filter || params.qstring.query || "{}";
            var sSearch = params.qstring.sSearch || "";
            var projection = params.qstring.project || params.qstring.projection || "{}";
            var sort = params.qstring.sort || "{}";

            try {
                sort = EJSON.parse(sort);
            }
            catch (SyntaxError) {
                sort = {};
            }
            try {
                filter = EJSON.parse(filter);
            }
            catch (SyntaxError) {
                common.returnMessage(params, 400, "Failed to parse query. " + SyntaxError.message);
                return false;
            }
            if (filter._id && isObjectId(filter._id)) {
                filter._id = common.db.ObjectID(filter._id);
            }
            if (sSearch) {
                filter._id = new RegExp(sSearch);
            }
            try {
                projection = EJSON.parse(projection);
            }
            catch (SyntaxError) {
                projection = {};
            }
            if (typeof filter !== 'object' || Array.isArray(filter)) {
                filter = {};
            }

            var base_filter = {};
            if (!params.member.global_admin) {
                base_filter = getBaseAppFilter(params.member, dbNameOnParam, params.qstring.collection);
            }

            if (base_filter && Object.keys(base_filter).length > 0) {
                for (var key in base_filter) {
                    if (filter[key]) {
                        filter.$and = filter.$and || [];
                        filter.$and.push({[key]: base_filter[key]});
                        filter.$and.push({[key]: filter[key]});
                        delete filter[key];
                    }
                    else {
                        filter[key] = base_filter[key];
                    }
                }
            }

            if (dbs[dbNameOnParam]) {
                try {
                    var cursor = dbs[dbNameOnParam].collection(params.qstring.collection).find(filter, { projection });
                    if (Object.keys(sort).length > 0) {
                        cursor.sort(sort);
                    }
                }
                catch (error) {
                    if (error instanceof MongoInvalidArgumentError && error.message.includes("Collection names must not contain '$'")) {
                        common.returnMessage(params, 400, "Invalid collection name: Collection names can not contain '$' or other invalid characters");
                    }
                    else {
                        log.e(error);
                        common.returnMessage(params, 500, "An unexpected error occurred.");
                    }
                    return false;
                }
                try {
                    var total = await cursor.count();
                    var stream = cursor.skip(skip).limit(limit).stream({
                        transform: function(doc) {

                            if (params.qstring.collection === 'members' && doc) {
                                delete doc.password;
                                delete doc.api_key;
                            }
                            else if (params.qstring.collection === 'auth_tokens' && doc) {
                                if (doc._id) {
                                    doc._id = '***redacted***';
                                }
                            }

                            try {
                                return EJSON.stringify(objectIdCheck(doc));
                            }
                            catch (SyntaxError) {
                                return JSON.stringify(objectIdCheck(doc));
                            }
                        }
                    });
                    var headers = { 'Content-Type': 'application/json; charset=utf-8', 'Access-Control-Allow-Origin': '*' };
                    var add_headers = (plugins.getConfig("security").api_additional_headers || "").replace(/\r\n|\r|\n/g, "\n").split("\n");
                    var parts;
                    for (let i = 0; i < add_headers.length; i++) {
                        if (add_headers[i] && add_headers[i].length) {
                            parts = add_headers[i].split(/:(.+)?/);
                            if (parts.length === 3) {
                                headers[parts[0]] = parts[1];
                            }
                        }
                    }
                    if (params.res.writeHead) {
                        params.res.writeHead(200, headers);
                        params.res.write('{"limit":' + limit + ', "start":' + (skip + 1) + ', "end":' + Math.min(skip + limit, total) + ', "total":' + total + ', "pages":' + Math.ceil(total / limit) + ', "curPage":' + Math.ceil((skip + 1) / limit) + ', "collections":[');
                        var first = false;
                        stream.on('data', function(doc) {
                            if (!first) {
                                first = true;
                                params.res.write(doc);
                            }
                            else {
                                params.res.write("," + doc);
                            }
                        });

                        stream.once('end', function() {
                            params.res.write("]}");
                            params.res.end();
                        });
                    }
                }
                catch (err) {
                    common.returnMessage(params, 500, err);
                }
            }
        }

        /**
         * Query identifier for database, table, or column names for clickhouse
         * @param {String} name - The name to be escaped
         * @example
         * const id = qi('my.collection.name');
         * console.log(id); // '`my.collection.name`'
         * @returns {String} - The escaped name
         */
        function qi(name) {
            return '`' + String(name).replace(/`/g, '``') + '`';
        }

        /**
         * Unwraps the type information from a ClickHouse column
         * @param {*} t - The type to unwrap
         * @example
         * const type = unwrapType('Nullable(Int32)');
         * console.log(type); // 'Int32'
         * @returns {String} - The unwrapped base type
         */
        function unwrapType(t) {
            let s = String(t);
            if (s.startsWith('Nullable(') && s.endsWith(')')) {
                s = s.slice(9, -1);
            }
            if (s.startsWith('LowCardinality(') && s.endsWith(')')) {
                s = s.slice(15, -1);
            }
            if (s.startsWith('SimpleAggregateFunction(') && s.endsWith(')')) {
                const inner = s.slice('SimpleAggregateFunction('.length, -1);
                s = inner.split(',').pop().trim();
            }
            return s;
        }

        /**
         * Get the schema of a ClickHouse table
         * @param {*} chService - The ClickHouse service instance
         * @param {*} db - The database name
         * @param {*} table - The table name
         * @returns {Promise<Object>} - A promise that resolves to the table schema
         */
        async function getSchema(chService, db, table) {
            const q = `
                SELECT name, type
                FROM system.columns
                WHERE database = {db:String} AND table = {table:String}
            `;
            const rows = await chService.aggregate({
                query: q,
                params: { db, table }
            });

            const map = {};
            for (const r of rows) {
                const t = unwrapType(r.type);
                map[r.name] = t;
            }
            return map;
        }

        /**
         * Get the sort keys of a ClickHouse table
         * @param {*} chService - The ClickHouse service instance
         * @param {*} db - The database name
         * @param {*} table - The table name
         * @returns {Promise<Array>} - A promise that resolves to the sort keys
         */
        async function getSortKeys(chService, db, table) {
            const q = `
                SELECT sorting_key
                FROM system.tables
                WHERE database = {db:String} AND name = {table:String}
            `;
            const rows = await chService.aggregate({
                query: q,
                params: { db, table }
            });

            return rows && rows.length ? rows[0].sorting_key.split(',').map(s => s.trim()) : [];
        }

        /**
         * Convert a single filter row to MongoDB expression to be able to use WhereClauseConverter
         * @param {Object} r - Filter row object
         * @example
         * const expr = rowToMongoExpr({ field: 'age', operator: '>', value: 30 });
         * console.log(expr); // { age: { $gt: 30 } }
         * @returns {Object|null} MongoDB expression or null if invalid
         */
        function rowToMongoExpr(r) {
            if (!r || !r.field || !r.operator) {
                return null;
            }
            const f = r.field;
            const op = String(r.operator || '=').toUpperCase();
            const v = r.value;

            if (op === '=') {
                return { [f]: v };
            }
            if (op === '!=') {
                return { [f]: { $ne: v } };
            }
            if (op === '>') {
                return { [f]: { $gt: v } };
            }
            if (op === '>=') {
                return { [f]: { $gte: v } };
            }
            if (op === '<') {
                return { [f]: { $lt: v } };
            }
            if (op === '<=') {
                return { [f]: { $lte: v } };
            }
            return null;
        }

        /**
         * Convert filter rows array to MongoDB query object
         * @param {Array} rows - Array of filter row objects
         * @example
         * const query = rowsToMongoQuery([{ field: 'age', operator: '>', value: 30 }]);
         * console.log(query); // { $and: [ { age: { $gt: 30 } } ] }
         * @returns {Object} MongoDB query object
         */
        function rowsToMongoQuery(rows) {
            const a = Array.isArray(rows) ? rows : [];
            const andParts = [];
            let orBuf = null;
            let lastExpr = null;

            for (let i = 0; i < a.length; i++) {
                const expr = rowToMongoExpr(a[i]);
                if (!expr) {
                    continue;
                }
                if (i === 0) {
                    lastExpr = expr;
                    continue;
                }
                const conj = String(a[i].conjunction || 'AND').toUpperCase();
                if (conj === 'OR') {
                    if (!orBuf) {
                        orBuf = [ lastExpr, expr ];
                    }
                    else {
                        orBuf.push(expr);
                    }
                    lastExpr = null;
                }
                else {
                    if (orBuf) {
                        andParts.push({ $or: orBuf });
                        orBuf = null;
                        lastExpr = expr;
                    }
                    else {
                        if (lastExpr) {
                            andParts.push(lastExpr);
                        }
                        lastExpr = expr;
                    }
                }
            }
            if (orBuf) {
                andParts.push({ $or: orBuf });
            }
            else if (lastExpr) {
                andParts.push(lastExpr);
            }
            if (!andParts.length) {
                return {};
            }
            return andParts.length === 1 ? andParts[0] : { $and: andParts };
        }

        /**
         * Get collection/table data from ClickHouse
         * @param {string} chDb - ClickHouse database name
         * @param {string} table - ClickHouse table name
         */
        async function chGetCollection(chDb, table) {
            if (!clickHouseRunner || !clickHouseRunner.getDbviewerCollection) {
                return common.returnMessage(params, 400, 'ClickHouse plugin not loaded properly.');
            }
            if (!common.clickhouseQueryService) {
                return common.returnMessage(params, 400, 'ClickHouse is not configured.');
            }
            if (!chDb || !table) {
                return common.returnMessage(params, 400, 'Missing ClickHouse database or table.');
            }

            let projectionObj = null;
            let sortObj = null;
            let filterObj = {};

            const projRaw = params.qstring.project || params.qstring.projection;
            if (projRaw) {
                try {
                    const parsed = EJSON.parse(projRaw);
                    if (parsed && typeof parsed === 'object') {
                        projectionObj = parsed;
                    }
                }
                catch (SyntaxError) {
                    log.e('Failed to parse projection:', SyntaxError);
                }
            }

            const sortRaw = params.qstring.sort;
            if (sortRaw) {
                try {
                    const parsed = EJSON.parse(sortRaw);
                    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
                        sortObj = parsed;
                    }
                }
                catch (err) {
                    log.e('Failed to parse sort:', err);
                }
            }

            const filterRaw = params.qstring.filter;
            if (filterRaw) {
                try {
                    const parsed = (typeof filterRaw === 'string') ? EJSON.parse(filterRaw) : filterRaw;
                    if (parsed && Array.isArray(parsed.rows) && parsed.rows.length) {
                        filterObj = rowsToMongoQuery(parsed.rows);
                    }
                    else if (parsed && typeof parsed === 'object') {
                        filterObj = parsed;
                    }
                }
                catch (err) {
                    log.e('Failed to parse filter:', err);
                }
            }

            if (!params.member.global_admin) {
                const baseFilter = getBaseAppFilter(params.member, chDb, table);
                if (baseFilter && Object.keys(baseFilter).length > 0) {
                    for (const key in baseFilter) {
                        if (Object.prototype.hasOwnProperty.call(baseFilter, key)) {
                            if (filterObj[key]) {
                                filterObj.$and = filterObj.$and || [];
                                filterObj.$and.push({ [key]: baseFilter[key] });
                                filterObj.$and.push({ [key]: filterObj[key] });
                                delete filterObj[key];
                            }
                            else {
                                filterObj[key] = baseFilter[key];
                            }
                        }
                    }
                }
            }

            const useApproximateUniq = plugins.getConfig("drill", params.app && params.app.plugins, true).clickhouse_use_approximate_uniq;
            const limit = parseInt(params.qstring.limit || 10);
            const sSearch = params.qstring.sSearch || '';
            const cursor = params.qstring.cursor || null;
            const paginationMode = params.qstring.paginationMode || undefined;

            try {
                const result = await clickHouseRunner.getDbviewerCollection({
                    chDb,
                    table,
                    projection: projectionObj,
                    sort: sortObj,
                    filter: filterObj,
                    sSearch,
                    limit,
                    cursor,
                    paginationMode,
                    useApproximateUniq,
                    _dbviewerHelpers: {
                        qi,
                        getSchema: (db, tbl) => getSchema(common.clickhouseQueryService, db, tbl),
                        getSortKeys: (db, tbl) => getSortKeys(common.clickhouseQueryService, db, tbl)
                    }
                });

                const paginationResp = (result && result.data) ? result.data : { data: [] };

                const start = (paginationResp.data && paginationResp.data.length) ? 1 : 0;
                const end = paginationResp.data ? paginationResp.data.length : 0;
                const pages = limit > 0 ? Math.max(1, Math.ceil((paginationResp.total || 0) / limit)) : 1;
                const curPage = start ? 1 : 0;

                return common.returnOutput(params, {
                    limit: limit,
                    start: start,
                    end: end,
                    total: paginationResp.total || 0,
                    pages: pages,
                    curPage: curPage,
                    collections: paginationResp.data || [],
                    hasNextPage: paginationResp.hasNextPage,
                    nextCursor: paginationResp.nextCursor,
                    paginationMode: paginationResp.paginationMode
                });
            }
            catch (e) {
                log.e('ClickHouse query failed', e);
                return common.returnMessage(params, 500, e.message || 'ClickHouse query failed.');
            }
        }

        /**
        * Get databases with collections
        * @param {array} apps - applications array
        **/
        function dbGetDb(apps) {
            var lookup = {};
            for (let i = 0; i < apps.length; i++) {
                lookup[apps[i]._id + ""] = apps[i].name;
            }

            dbLoadEventsData(params, apps, async function(err) {
                if (err) {
                    log.e(err);
                }
                async.map(Object.keys(dbs), getCollections, async function(error, results) {
                    if (error) {
                        console.error(error);
                    }
                    if (results) {
                        results = results.filter(function(val) {
                            return val !== null;
                        });
                    }
                    if (isClickhouseEnabled()) {
                        try {
                            const chResults = await getClickhouseDbs(lookup);
                            if (Array.isArray(chResults)) {
                                results = results.concat(chResults);
                            }
                        }
                        catch (e) {
                            log.e('ClickHouse integration failed', e);
                        }
                    }

                    common.returnOutput(params, results || []);
                });
            });

            /**
            * Get collections of database
            * @param {string} name - database name
            * @param {function} callback - callback method
            **/
            function getCollections(name, callback) {
                if (dbs[name]) {
                    dbs[name].collections(function(error, results) {
                        var db = { name: name, collections: {} };
                        async.each(results, function(col, done) {
                            if (col.collectionName.indexOf("system.indexes") === -1 && col.collectionName.indexOf("sessions_") === -1) {
                                userHasAccess(params, col.collectionName, params.qstring.app_id, function(hasAccess) {
                                    if (hasAccess || col.collectionName === "events_data" || col.collectionName === "drill_events") {
                                        ob = parseCollectionName(col.collectionName, lookup);
                                        db.collections[ob.pretty] = ob.name;
                                    }
                                    done();
                                });
                            }
                            else {
                                done();
                            }
                        }, function(asyncError) {
                            callback(asyncError, db);
                        });
                    });
                }
                else {
                    callback(null, null);
                }
            }
        }

        /**
        * Get aggregated result by the parameter on the url
        * @param {string} collection - collection will be applied related query
        * @param {object} aggregation - aggregation object
        * @param {object} changes - object referencing removed stages from pipeline
        * */
        function aggregate(collection, aggregation, changes) {
            if (params.qstring.iDisplayLength) {
                aggregation.push({ "$limit": parseInt(params.qstring.iDisplayLength) });
            }
            if (!Array.isArray(aggregation)) {
                common.returnMessage(params, 500, "The aggregation pipeline must be of the type array");
            }
            else {
                var addProjectionAt = 0;
                if (aggregation[0] && aggregation[0].$match) {
                    while (aggregation.length > addProjectionAt && aggregation[addProjectionAt].$match) {
                        addProjectionAt++;
                    }
                }
                if (collection === 'members') {
                    aggregation.splice(addProjectionAt, 0, {"$project": {"password": 0, "api_key": 0}});
                }
                else if (collection === 'auth_tokens') {
                    aggregation.splice(addProjectionAt, 0, {"$addFields": {"_id": "***redacted***"}});
                }
                else if ((collection === "events_data" || collection === "drill_events") && !params.member.global_admin) {
                    var base_filter = getBaseAppFilter(params.member, dbNameOnParam, params.qstring.collection);
                    aggregation.splice(0, 0, {"$match": base_filter});
                }
                // check task is already running?
                taskManager.checkIfRunning({
                    db: dbs[dbNameOnParam],
                    params: params
                }, function(task_id) {
                    if (task_id) {
                        common.returnOutput(params, { task_id: task_id });
                    }
                    else {
                        var name = 'Aggregation-' + Date.now();
                        var taskCb = taskManager.longtask({
                            db: common.db,
                            threshold: plugins.getConfig("api").request_threshold,
                            params: params,
                            type: "dbviewer",
                            force: params.qstring.save_report || false,
                            gridfs: true,
                            meta: JSON.stringify({
                                db: dbNameOnParam,
                                collection: params.qstring.collection,
                                aggregation: aggregation
                            }),
                            view: "#/manage/db/task/",
                            report_name: params.qstring.report_name || name + "." + params.qstring.type,
                            report_desc: params.qstring.report_desc,
                            period_desc: params.qstring.period_desc,
                            name,
                            creator: params.member._id + "",
                            global: params.qstring.global === 'true',
                            autoRefresh: params.qstring.autoRefresh === 'true',
                            manually_create: params.qstring.manually_create === 'true',
                            processData: function(error, result, callback) {
                                callback(error, result);
                            },
                            outputData: function(aggregationErr, result) {
                                if (!aggregationErr) {
                                    common.returnOutput(params, { sEcho: params.qstring.sEcho, iTotalRecords: 0, iTotalDisplayRecords: 0, "aaData": result, "removed": (changes || {}) });
                                }
                                else {
                                    common.returnMessage(params, 500, aggregationErr);
                                }
                            }
                        });
                        dbs[dbNameOnParam].collection(collection).aggregate(aggregation, { allowDiskUse: true }, taskCb);
                    }
                });
            }
        }

        /**
        * Wrapper for dbUserHasAccessToCollection.  Checks if user has access to dbViewer plugin
        * If user has access to dbViewer plugin,  dbUserHasAccessToCollection is called
        * @param {object} parameters - {@link parameters} object
        * @param {string} collection - collection will be checked for access
        * @param {string} appId - appId to which to restrict access
        * @param {function} callback - callback method includes boolean variable as argument  
        * @returns {function} returns callback
         */
        async function userHasAccess(parameters, collection, appId, callback) {
            if (typeof appId === "function") {
                callback = appId;
                appId = null;
            }
            if (parameters.member.global_admin && !appId) {
                //global admin without app_id restriction just has access to everything
                return callback(true);
            }

            if (appId) {
                if (hasReadRight(FEATURE_NAME, appId, parameters.member)) {
                    if (collection === "events_data" || collection === "drill_events") {
                        return callback(true);
                    }
                    else {
                        return dbUserHasAccessToCollection(parameters, collection, appId, callback);
                    }
                }
            }
            else {
                var userApps = getUserApps(parameters.member);
                //go through all apps of user and check if any of them has access to collection
                var result = await Promise.all(userApps.map(function(id) {
                    if (hasReadRight(FEATURE_NAME, id, parameters.member)) {
                        return new Promise(function(resolve) {
                            dbUserHasAccessToCollection(parameters, collection, id, resolve);
                        });
                    }
                }));
                return callback(result.some(function(val) {
                    return val;
                }));
            }
            return callback(false);
        }

        /**
         * List all ClickHouse databases
         * @param {Object} lookup - The lookup object for parsing collection names
         */
        async function getClickhouseDbs(lookup) {
            if (!common.clickhouseQueryService) {
                return [];
            }
            try {
                const chDbs = await common.clickhouseQueryService.listDatabases();
                const transformed = [];
                for (const item of chDbs) {
                    const collections = await getClickhouseCollections(item.name, lookup);
                    transformed.push({ name: CLICKHOUSE_PREFIX + item.name, collections });
                }
                return transformed;
            }
            catch (err) {
                log.e('ClickHouse list_databases failed', err);
                return [];
            }
        }

        /**
         * List ClickHouse collections (tables)
         * @param {string} dbName - The name of the database
         * @param {Object} lookup - The lookup object for parsing collection names
         * @returns {Promise<Object>} - A promise that resolves to an object mapping pretty names to collection names
         */
        async function getClickhouseCollections(dbName, lookup) {
            try {
                const rawCollections = await common.clickhouseQueryService.listCollections(dbName || 'countly_drill');
                const transformedCollections = {};

                for (const collection of rawCollections) {
                    const collectionName = collection.name;
                    const hasAccess = await new Promise((resolve) => {
                        userHasAccess({ member: params.member }, collectionName, null, resolve);
                    });

                    if (hasAccess || collectionName === "events_data" || collectionName === "drill_events") {
                        const parsed = parseCollectionName(collectionName, lookup);
                        transformedCollections[parsed.pretty] = parsed.name;
                    }
                }

                return transformedCollections;
            }
            catch (err) {
                log.e('ClickHouse list_collections failed', err);
                return {};
            }
        }

        validateUser(params, function() {
            // conditions
            var isContainDb = params.qstring.dbs || params.qstring.db;
            var isContainCollection = params.qstring.collection && params.qstring.collection.indexOf("system.indexes") === -1 && params.qstring.collection.indexOf("sessions_") === -1;

            if (isContainDb) {
                const hasMongo = typeof dbs[params.qstring.db] !== "undefined" || typeof dbs[params.qstring.dbs] !== "undefined";

                if (isClickhouseDBSelected(dbNameOnParam) && !isClickhouseEnabled()) {
                    common.returnMessage(params, 404, 'ClickHouse plugin is disabled.');
                    return true;
                }
                if (!isClickhouseDBSelected(dbNameOnParam) && !hasMongo) {
                    common.returnMessage(params, 404, 'Database not found.');
                    return true;
                }
            }

            // handle index request
            if (isContainDb && params.qstring.collection && params.qstring.action === 'get_indexes') {
                if (params.member.global_admin) {
                    getIndexes();
                }
                else {
                    userHasAccess(params, params.qstring.collection, function(hasAccess) {
                        if (hasAccess) {
                            getIndexes();
                        }
                        else {
                            common.returnMessage(params, 401, 'User does not have right to view this collection');
                        }
                    });
                }
            }
            // handle document request
            else if (isContainDb && isContainCollection && params.qstring.document) {
                if (params.member.global_admin) {
                    dbGetDocument();
                }
                else {
                    userHasAccess(params, params.qstring.collection, function(hasAccess) {
                        if (hasAccess) {
                            dbGetDocument();
                        }
                        else {
                            common.returnMessage(params, 401, 'User does not have right to view this document');
                        }
                    });
                }
            }
            // handle aggregation request
            else if (isContainDb && params.qstring.aggregation) {
                if (params.member.global_admin) {
                    try {
                        let aggregation = EJSON.parse(params.qstring.aggregation);
                        aggregate(params.qstring.collection, aggregation);
                    }
                    catch (e) {
                        common.returnMessage(params, 500, 'Aggregation object is not valid.');
                        return true;
                    }
                }
                else {
                    userHasAccess(params, params.qstring.collection, function(hasAccess) {
                        if (hasAccess || params.qstring.collection === "events_data" || params.qstring.collection === "drill_events") {
                            try {
                                let aggregation = EJSON.parse(params.qstring.aggregation);
                                var changes = escapeNotAllowedAggregationStages(aggregation);
                                if (changes && Object.keys(changes).length > 0) {
                                    log.d("Removed stages from pipeline: ", JSON.stringify(changes));
                                }
                                aggregate(params.qstring.collection, aggregation, changes);
                            }
                            catch (e) {
                                common.returnMessage(params, 500, 'Aggregation object is not valid.');
                                return true;
                            }
                        }
                        else {
                            common.returnMessage(params, 401, 'User does not have right tot view this colleciton');
                        }
                    });
                }
            }
            // handle collection request
            else if (isContainDb && isContainCollection) {
                const chDb = isClickhouseDBSelected(dbNameOnParam) ? dbNameOnParam.slice(CLICKHOUSE_PREFIX.length) : null;

                if (chDb && !isClickhouseEnabled()) {
                    return common.returnMessage(params, 404, 'ClickHouse plugin is disabled.');
                }

                if (params.member.global_admin) {
                    if (chDb && params.qstring.collection) {
                        return chGetCollection(chDb, params.qstring.collection);
                    }
                    return dbGetCollection();
                }

                userHasAccess(params, params.qstring.collection, function(hasAccess) {
                    if (hasAccess || params.qstring.collection === "events_data" || params.qstring.collection === "drill_events") {
                        if (chDb && params.qstring.collection) {
                            return chGetCollection(chDb, params.qstring.collection);
                        }
                        return dbGetCollection();
                    }
                    common.returnMessage(params, 401, 'User does not have right to view this collection');
                });
            }
            else {
                if (params.member.global_admin) {
                    var query = params.qstring.app_id ? { "_id": common.db.ObjectID(params.qstring.app_id) } : {};
                    common.db.collection('apps').find(query, {"name": 1, "_id": 1}).toArray(function(err, apps) {
                        if (err) {
                            console.error(err);
                        }
                        dbGetDb(apps || []);
                    });
                }
                else {
                    var apps = [];
                    var userApps = getUserApps(params.member);
                    if (params.qstring.app_id) {
                        //if we have app_id, check permissions
                        if (userApps.length > 0 && userApps.indexOf(params.qstring.app_id) !== -1) {
                            apps.push(common.db.ObjectID(params.qstring.app_id));
                        }
                    }
                    else {
                        //else use what ever user has access to
                        for (let i = 0; i < userApps.length; i++) {
                            apps.push(common.db.ObjectID(userApps[i]));
                        }
                    }
                    common.readBatcher.getMany("apps", { _id: { $in: apps } }, {}, (err, applications) => {
                        if (err) {
                            console.error(err);
                        }
                        dbGetDb(applications || []);
                    });
                }
            }
        });
        return true;
    });


    /**
  * Function to fetch mongotop data
  * @param  {Object} params - params object
  */
    function fetchMongoTop(params) {
        var dbParams = plugins.getDbConnectionParams('countly');
        var args = constructDbArgs(dbParams);
        child = spawn('mongotop', args);
        child.stdout.setEncoding('utf8');
        child.stderr.setEncoding('utf8');
        child.stdout.on('data', (data) => {
            var dataArrays = data.split('\n').map(element => {
                return element.replace(/^\s+/, '').replace(/\s+/g, '|').split('|');
            });
            for (var i = dataArrays.length - 1; i >= 0; i--) {
                if (dataArrays[i].length === 1 && dataArrays[i][0] === "") {
                    dataArrays.pop();
                }
            }
            child.kill('SIGTERM');
            common.returnOutput(params, dataArrays, true);
        });
        child.stderr.on('data', (data) => {
            log.w(data);
        });
    }



    /**
  * Function to fetch mongostat data
  * @param  {Object} params - params object
  */
    function fetchMongoStat(params) {
        var dbParams = plugins.getDbConnectionParams('countly');
        var args = constructDbArgs(dbParams);
        child = spawn('mongostat', args);
        child.stdout.setEncoding('utf8');
        child.stderr.setEncoding('utf8');

        child.stdout.on('data', (data) => {
            var dataArrays = data.split('\n').map(element => {
                var result = element.replace(/^\s+/, '').replace(/\s+/g, '~').split("~");
                if (result.length > 17) {
                    var time = result.splice(-3);
                    result.push(time.join(' '));
                }
                return result;
            });
            for (var i = dataArrays.length - 1; i >= 0; i--) {
                if (dataArrays[i].length === 1 && dataArrays[i][0] === "") {
                    dataArrays.pop();
                }
            }
            child.kill('SIGTERM');
            common.returnOutput(params, dataArrays, true);
            return;
        });
        child.stderr.on('data', (data) => {
            log.w(data);
        });


    }

    var parseCollectionName = function parseCollectionName(name, apps) {
        var pretty = name;

        let isEvent = false;
        let isView = false;
        let eventHash = null;
        if (name.indexOf("events") === 0) {
            eventHash = name.substring(6);
            isEvent = true;
        }
        else if (name.indexOf("drill_events") === 0) {
            eventHash = name.substring(12);
            isEvent = true;
        }
        else if (name.indexOf("app_viewdata") === 0) {
            isView = true;

        }
        if (isView) {
            pretty = "app_viewdata" + getCollectionName(name);
        }
        else if (!isEvent) {
            for (let i in apps) {
                if (name.indexOf(i, name.length - i.length) !== -1) {
                    pretty = name.replace(i, "(" + apps[i] + ")");
                    break;
                }
            }
        }
        else {
            if (eventHash.length === 0) {
                //this is the "events" collection
                pretty = name;
            }
            else {
                var targetEntry = getCollectionName(eventHash);
                if (!_.isUndefined(targetEntry)) {
                    pretty = name.replace(eventHash, targetEntry);
                }
            }
        }

        return { name: name, pretty: pretty };
    };
    /**
* Function to construct args
* @param  {Object} dbParams - dbParams object
* @returns {Array} db connection params
*/
    function constructDbArgs(dbParams) {
        var args = [];
        for (var key in dbParams) {
            if (key === 'db') {
                continue;
            }
            else if (key === "host") {
                var val = dbParams[key].split(':');
                args.push("--" + 'host' + "=" + val[0]);
                args.push("--" + 'port' + "=" + val[1]);
            }
            else {
                args.push("--" + key + "=" + dbParams[key]);
            }
        }
        return args;
    }

    var checkForHexRegExp = new RegExp("^[0-9a-fA-F]{24}$");
    var isObjectId = function(id) {
        if (typeof id === "undefined" || id === null) {
            return false;
        }
        if ((typeof id !== "undefined" && id !== null) && 'number' !== typeof id && (id.length !== 24)) {
            return false;
        }
        else {
            // Check specifically for hex correctness
            if (typeof id === 'string' && id.length === 24) {
                return checkForHexRegExp.test(id);
            }
            return true;
        }
    };
}(exported));

module.exports = exported;