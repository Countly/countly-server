var common = require('../../../api/utils/common.js'),
    log = common.log('dbviewer:api'),
    async = require('async'),
    plugins = require('../../pluginManager.js'),
    countlyFs = require('../../../api/utils/countlyFs.js'),
    _ = require('underscore'),
    taskManager = require('../../../api/utils/taskmanager.js'),
    { dbUserHasAccessToCollection, dbLoadEventsData, validateUser, getUserApps, validateGlobalAdmin } = require('../../../api/utils/rights.js'),
    exported = {};

const FEATURE_NAME = 'dbviewer';
var spawn = require('child_process').spawn,
    child;
(function() {
    plugins.register("/permissions/features", function(ob) {
        ob.features.push(FEATURE_NAME);
    });
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
                doc = JSON.parse(doc);
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
        function dbGetCollection() {
            var limit = parseInt(params.qstring.limit || 20);
            var skip = parseInt(params.qstring.skip || 0);
            var filter = params.qstring.filter || params.qstring.query || "{}";
            var sSearch = params.qstring.sSearch || "";
            var projection = params.qstring.project || params.qstring.projection || "{}";
            var sort = params.qstring.sort || "{}";

            try {
                sort = JSON.parse(sort);
            }
            catch (SyntaxError) {
                sort = {};
            }
            try {
                filter = JSON.parse(filter);
            }
            catch (SyntaxError) {
                filter = {};
            }
            if (filter._id && isObjectId(filter._id)) {
                filter._id = common.db.ObjectID(filter._id);
            }
            if (sSearch) {
                filter._id = new RegExp(sSearch);
            }
            try {
                projection = JSON.parse(projection);
            }
            catch (SyntaxError) {
                projection = {};
            }

            if (dbs[dbNameOnParam]) {
                var cursor = dbs[dbNameOnParam].collection(params.qstring.collection).find(filter, { projection });
                if (Object.keys(sort).length > 0) {
                    cursor.sort(sort);
                }
                cursor.count(function(err, total) {
                    var stream = cursor.skip(skip).limit(limit).stream({
                        transform: function(doc) {
                            return JSON.stringify(objectIdCheck(doc));
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
                });
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

            dbLoadEventsData(params, apps, function(err, eventList, viewList) {
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
                                    dbUserHasAccessToCollection(params, col.collectionName, function(hasAccess) {
                                        if (hasAccess) {
                                            ob = parseCollectionName(col.collectionName, lookup, eventList, viewList);
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
        * */
        function aggregate(collection, aggregation) {
            if (params.qstring.iDisplayLength) {
                aggregation.push({ "$limit": parseInt(params.qstring.iDisplayLength) });
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
                    var taskCb = taskManager.longtask({
                        db: dbs[dbNameOnParam],
                        threshold: plugins.getConfig("api").request_threshold,
                        params: params,
                        type: "dbviewer",
                        force: params.qstring.save_report || false,
                        meta: JSON.stringify({
                            db: dbNameOnParam,
                            collection: params.qstring.collection,
                            aggregation: aggregation
                        }),
                        view: "#/manage/db/task/",
                        report_name: params.qstring.report_name,
                        report_desc: params.qstring.report_desc,
                        period_desc: params.qstring.period_desc,
                        name: 'Aggregation-' + Date.now(),
                        creator: params.member._id + "",
                        global: params.qstring.global === 'true',
                        autoRefresh: params.qstring.autoRefresh === 'true',
                        manually_create: params.qstring.manually_create === 'true',
                        processData: function(error, result, callback) {
                            callback(error, result);
                        },
                        outputData: function(aggregationErr, result) {
                            if (!aggregationErr) {
                                common.returnOutput(params, { sEcho: params.qstring.sEcho, iTotalRecords: 0, iTotalDisplayRecords: 0, "aaData": result });
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

        //console.log(userApps);

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
                    dbUserHasAccessToCollection(params, params.qstring.collection, function(hasAccess) {
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
                    dbUserHasAccessToCollection(params, params.qstring.collection, function(hasAccess) {
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
                        let aggregation = JSON.parse(params.qstring.aggregation);
                        aggregate(params.qstring.collection, aggregation);
                    }
                    catch (e) {
                        common.returnMessage(params, 500, 'Aggregation object is not valid.');
                        return true;
                    }
                }
                else {
                    dbUserHasAccessToCollection(params, params.qstring.collection, function(hasAccess) {
                        if (hasAccess) {
                            try {
                                let aggregation = JSON.parse(params.qstring.aggregation);
                                aggregate(params.qstring.collection, aggregation);
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
                if (params.member.global_admin) {
                    dbGetCollection();
                }
                else {
                    dbUserHasAccessToCollection(params, params.qstring.collection, function(hasAccess) {
                        if (hasAccess) {
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
                    common.db.collection('apps').find(query).toArray(function(err, apps) {
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

    var parseCollectionName = function parseCollectionName(name, apps, events, views) {
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

            let hash = name.substring(12);
            if (views["app_viewdata" + hash]) {
                isView = true;
            }
        }
        if (isView) {
            let hash = name.substring(12);
            if (views["app_viewdata" + hash]) {
                pretty = name.replace(hash, views["app_viewdata" + hash]);
            }
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
                const targetEntry = events[eventHash];
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