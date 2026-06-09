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

const FEATURE_NAME = 'dbviewer';
// upper bound on rows returned per find()/aggregation page, to keep a crafted
// limit/iDisplayLength from requesting an unbounded result set
const MAX_DBVIEWER_LIMIT = 10000;
// Aggregation-stage allow-list and the recursive sanitizer that strips blocked
// stages at every depth (including inside $facet sub-pipelines). Kept in a
// dedicated module so it can be unit-tested in isolation.
const { sanitizeAggregation, ALLOWED_STAGES_USER, ALLOWED_STAGES_GLOBAL_ADMIN } = require('./parts/aggregation_guard.js');
const { sanitizeProjection, escapeRegExp } = require('./parts/query_guard.js');
var spawn = require('child_process').spawn,
    child;

(function() {
    plugins.register("/permissions/features", function(ob) {
        ob.features.push(FEATURE_NAME);
    });

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
                if (err || !indexes) {
                    common.returnOutput(params, 'Failed to retrieve indexes for the collection');
                }
                else {
                    common.returnOutput(params, { limit: indexes.length, start: 1, end: indexes.length, total: indexes.length, pages: 1, curPage: 1, collections: indexes });
                }
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
                    // Scope the lookup to the member's apps the same way the
                    // collection listing does, so a document cannot be fetched
                    // outside the caller's app scope by supplying its _id.
                    var docFilter = { _id: params.qstring.document };
                    if (!params.member.global_admin) {
                        var docBaseFilter = getBaseAppFilter(params.member, dbNameOnParam, params.qstring.collection);
                        if (docBaseFilter && Object.keys(docBaseFilter).length > 0) {
                            docFilter = { $and: [docBaseFilter, docFilter] };
                        }
                    }
                    dbs[dbNameOnParam].collection(params.qstring.collection).findOne(docFilter, function(err, results) {
                        if (!err) {
                            if (params.qstring.collection === 'members' && results) {
                                delete results.password;
                                delete results.api_key;
                                delete results.two_factor_auth;
                            }
                            else if (params.qstring.collection === 'auth_tokens' && results) {
                                if (results._id) {
                                    results._id = '***redacted***';
                                }
                            }
                            common.returnOutput(params, objectIdCheck(results) || {});
                        }
                        else {
                            log.e(err);
                            common.returnMessage(params, 500, "An unexpected error occurred.");
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
            // cap page size and guard against NaN so a crafted limit/skip can't
            // request an unbounded result set
            var limit = parseInt(params.qstring.limit, 10);
            if (isNaN(limit) || limit <= 0) {
                limit = 20;
            }
            if (limit > MAX_DBVIEWER_LIMIT) {
                limit = MAX_DBVIEWER_LIMIT;
            }
            var skip = parseInt(params.qstring.skip, 10);
            if (isNaN(skip) || skip < 0) {
                skip = 0;
            }
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
            //EJSON.parse("null") yields null (typeof null === "object"), so
            //normalize to a plain object before any property access / query use
            if (!sort || typeof sort !== 'object' || Array.isArray(sort)) {
                sort = {};
            }
            try {
                filter = EJSON.parse(filter);
            }
            catch (SyntaxError) {
                common.returnMessage(params, 400, "Failed to parse query. " + SyntaxError.message);
                return false;
            }
            if (!filter || typeof filter !== 'object' || Array.isArray(filter)) {
                filter = {};
            }
            if (filter._id && isObjectId(filter._id)) {
                filter._id = common.db.ObjectID(filter._id);
            }
            if (sSearch) {
                // treat the search term as a literal so a crafted pattern cannot
                // cause catastrophic regex backtracking (ReDoS)
                filter._id = new RegExp(escapeRegExp(sSearch));
            }
            try {
                projection = EJSON.parse(projection);
            }
            catch (SyntaxError) {
                projection = {};
            }
            //EJSON.parse("null") yields null and an array is also typeof
            //"object"; normalize anything that isn't a plain object to {} so an
            //invalid projection can't reach find()
            if (!projection || typeof projection !== 'object' || Array.isArray(projection)) {
                projection = {};
            }
            if (typeof filter !== 'object' || Array.isArray(filter)) {
                filter = {};
            }

            //reject server-side-JS Mongo operators ($where/$function/
            //$accumulator) in the user-supplied filter and sort so the db
            //viewer query cannot be abused to execute code on the server
            var badOp = common.findUnsafeMongoOperator(filter) || common.findUnsafeMongoOperator(sort);
            if (badOp) {
                log.d("Rejected user query" + common.reqInfo(params) + ": " + "Query contains disallowed operator: " + badOp);
                common.returnMessage(params, 400, "Query contains disallowed operator: " + badOp);
                return false;
            }
            //restrict the projection to plain field include/exclude — drop any
            //expression / field-path alias (e.g. {x:"$password"}) that could
            //compute or rename fields the viewer otherwise removes
            sanitizeProjection(projection);

            var base_filter = {};
            if (!params.member.global_admin) {
                base_filter = getBaseAppFilter(params.member, dbNameOnParam, params.qstring.collection);
            }

            if (base_filter && Object.keys(base_filter).length > 0) {
                // Wrap as a top-level $and of [base_filter, user_filter].
                // Previously the code merged base_filter keys INTO the user
                // filter at the top level. That left top-level operators in
                // the user filter (e.g. {"$or":[{}]}) free to OR away the
                // base scope: {a:{$in:[<my apps>]}, $or:[{}]} matches every
                // doc because the $or:[{}] clause is satisfied by every doc
                // and is AND'd at the top level alongside the scope, but
                // {} matches everything so the AND is always true.
                // Wrapping as $and forces both clauses to apply on every
                // document and removes the bypass entirely.
                filter = {$and: [base_filter, filter]};
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
                                delete doc.two_factor_auth;
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
                    log.e(err);
                    common.returnMessage(params, 500, "An unexpected error occurred.");
                }
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

            dbLoadEventsData(params, apps, function(err) {
                if (err) {
                    log.e(err);
                }
                async.map(Object.keys(dbs), getCollections, function(error, results) {
                    if (error) {
                        console.error(error);
                    }
                    if (results) {
                        results = results.filter(function(val) {
                            return val !== null;
                        });
                    }
                    common.returnOutput(params, results || []);
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
            });

        }

        /**
        * Get aggregated result by the parameter on the url
        * @param {string} collection - collection will be applied related query
        * @param {object} aggregation - aggregation object
        * @param {object} changes - object referencing removed stages from pipeline
        * */
        function aggregate(collection, aggregation, changes) {
            if (!Array.isArray(aggregation)) {
                common.returnMessage(params, 400, "The aggregation pipeline must be of the type array");
                return;
            }
            else {
                if (params.qstring.iDisplayLength) {
                    var iDisplayLength = parseInt(params.qstring.iDisplayLength, 10);
                    if (!isNaN(iDisplayLength) && iDisplayLength > 0) {
                        aggregation.push({ "$limit": Math.min(iDisplayLength, MAX_DBVIEWER_LIMIT) });
                    }
                }
                if (collection === 'members') {
                    // Insert the redaction as the very first stage so no
                    // user-supplied stage — including a leading $match using
                    // $expr, or a $project/$group that aliases or references the
                    // field — can read the raw credential fields before they are
                    // removed.
                    aggregation.splice(0, 0, {"$project": {"password": 0, "api_key": 0, "two_factor_auth": 0}});
                }
                else if (collection === 'auth_tokens') {
                    aggregation.splice(0, 0, {"$addFields": {"_id": "***redacted***"}});
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
                                    log.e(aggregationErr);
                                    common.returnMessage(params, 500, "An unexpected error occurred.");
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

        validateUser(params, function() {
            // conditions
            var isContainDb = params.qstring.dbs || params.qstring.db;
            var isContainCollection = params.qstring.collection && params.qstring.collection.indexOf("system.indexes") === -1 && params.qstring.collection.indexOf("sessions_") === -1;

            if (isContainDb && (typeof dbs[params.qstring.db]) === "undefined" && typeof dbs[params.qstring.dbs] === "undefined") {
                common.returnMessage(params, 404, 'Database not found.');
                return true;
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
                // Validate the pipeline against the caller's allow-list and run
                // it. Global admins get the broader list (may join/union, but
                // still no writes and never into a redacted collection); other
                // users get the restricted list. Disallowed stages are stripped;
                // server-side-JS operators and joins into members/auth_tokens
                // reject the request.
                var runAggregation = function(allowedStages) {
                    try {
                        let aggregation = EJSON.parse(params.qstring.aggregation);
                        var guard = sanitizeAggregation(aggregation, allowedStages);
                        if (guard.error) {
                            var msg = guard.error.type === "join"
                                ? 'Aggregation may not join the "' + guard.error.name + '" collection'
                                : 'Aggregation may not use the "' + guard.error.name + '" operator';
                            common.returnMessage(params, 400, msg);
                            return;
                        }
                        if (guard.changes && Object.keys(guard.changes).length > 0) {
                            log.d("Removed stages from pipeline: ", JSON.stringify(guard.changes));
                        }
                        aggregate(params.qstring.collection, aggregation, guard.changes);
                    }
                    catch (e) {
                        common.returnMessage(params, 500, 'Aggregation object is not valid.');
                    }
                };
                if (params.member.global_admin) {
                    runAggregation(ALLOWED_STAGES_GLOBAL_ADMIN);
                }
                else {
                    userHasAccess(params, params.qstring.collection, function(hasAccess) {
                        if (hasAccess || params.qstring.collection === "events_data" || params.qstring.collection === "drill_events") {
                            runAggregation(ALLOWED_STAGES_USER);
                        }
                        else {
                            common.returnMessage(params, 401, 'User does not have right tot view this colleciton');
                        }
                    });
                }
            }
            // handle collection request
            else if (isContainDb && isContainCollection) {
                if (params.member.global_admin) {
                    dbGetCollection();
                }
                else {
                    userHasAccess(params, params.qstring.collection, function(hasAccess) {
                        if (hasAccess || params.qstring.collection === "events_data" || params.qstring.collection === "drill_events") {
                            dbGetCollection();
                        }
                        else {
                            common.returnMessage(params, 401, 'User does not have right to view this collection');
                        }
                    });
                }
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