var common = require('../../../api/utils/common.js'),
    async = require('async'),
    crypto = require('crypto'),
    plugins = require('../../pluginManager.js'),
    countlyFs = require('../../../api/utils/countlyFs.js'),
    _ = require('underscore'),
    exported = {};

(function() {
    plugins.register("/o/db", function(ob) {
        var dbs = {countly: common.db, countly_drill: common.drillDb, countly_out: common.outDb, countly_fs: countlyFs.gridfs.getHandler()};
        var params = ob.params;
        var dbNameOnParam = params.qstring.dbs || params.qstring.db;
        /**
        * Get document data from db
        **/
        function dbGetDocument() {
            if (dbs[dbNameOnParam]) {
                if (isObjectId(params.qstring.document)) {
                    params.qstring.document = common.db.ObjectID(params.qstring.document);
                }
                if (dbs[dbNameOnParam]) {
                    dbs[dbNameOnParam].collection(params.qstring.collection).findOne({_id: params.qstring.document}, function(err, results) {
                        if (err) {
                            console.error(err);
                        }
                        common.returnOutput(params, results || {});
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
            var project = params.qstring.project || params.qstring.projection || "{}";
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
            try {
                project = JSON.parse(project);
            }
            catch (SyntaxError) {
                project = {};
            }

            if (dbs[dbNameOnParam]) {
                var cursor = dbs[dbNameOnParam].collection(params.qstring.collection).find(filter, project);
                if (Object.keys(sort).length > 0) {
                    cursor.sort(sort);
                }
                cursor.count(function(err, total) {
                    var stream = cursor.skip(skip).limit(limit).stream({
                        transform: function(doc) {
                            return JSON.stringify(doc);
                        }
                    });
                    var headers = {'Content-Type': 'application/json; charset=utf-8', 'Access-Control-Allow-Origin': '*'};
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
        * Get events collections with replaced app names
        * @param {object} app - application object
        * @param {function} cb - callback method
        **/
        function getEvents(app, cb) {
            var result = {};
            common.db.collection('events').findOne({'_id': common.db.ObjectID(app._id + "")}, function(err, events) {
                if (!err && events && events.list) {
                    for (let i = 0; i < events.list.length; i++) {
                        result[crypto.createHash('sha1').update(events.list[i] + app._id + "").digest('hex')] = "(" + app.name + ": " + events.list[i] + ")";
                    }
                }
                result[crypto.createHash('sha1').update("[CLY]_session" + app._id + "").digest('hex')] = "(" + app.name + ": [CLY]_session)";
                result[crypto.createHash('sha1').update("[CLY]_crash" + app._id + "").digest('hex')] = "(" + app.name + ": [CLY]_crash)";
                result[crypto.createHash('sha1').update("[CLY]_view" + app._id + "").digest('hex')] = "(" + app.name + ": [CLY]_view)";
                result[crypto.createHash('sha1').update("[CLY]_action" + app._id + "").digest('hex')] = "(" + app.name + ": [CLY]_action)";
                result[crypto.createHash('sha1').update("[CLY]_push_action" + app._id + "").digest('hex')] = "(" + app.name + ": [CLY]_push_action)";
                result[crypto.createHash('sha1').update("[CLY]_push_open" + app._id + "").digest('hex')] = "(" + app.name + ": [CLY]_push_open)";
                result[crypto.createHash('sha1').update("[CLY]_push_sent" + app._id + "").digest('hex')] = "(" + app.name + ": [CLY]_push_sent)";
                cb(null, result);
            });
        }

        /**
        * Get views collections with replaced app names
        * @param {object} app - application object
        * @param {function} cb - callback method
        **/
        function getViews(app, cb) {
            var result = {};
            common.db.collection('views').findOne({'_id': common.db.ObjectID(app._id + "")}, function(err, viewDoc) {
                if (!err && viewDoc && viewDoc.segments) {
                    for (var segkey in viewDoc.segments) {
                        result["app_viewdata" + crypto.createHash('sha1').update(segkey + app._id).digest('hex')] = "(" + app.name + ": " + segkey + ")";
                    }
                }
                result["app_viewdata" + crypto.createHash('sha1').update("" + app._id).digest('hex')] = "(" + app.name + ": no-segment)";
                cb(null, result);
            });
        }
        /**
        * Get events data
        * @param {array} apps - array with each element being app document
        * @param {function} callback - callback method
        **/
        function dbLoadEventsData(apps, callback) {
            if (params.member.eventList) {
                callback(null, params.member.eventList, params.member.viewList);
            }
            else {
                async.map(apps, getEvents, function(err, events) {
                    var eventList = {};
                    for (let i = 0; i < events.length; i++) {
                        for (var j in events[i]) {
                            eventList[j] = events[i][j];
                        }
                    }
                    params.member.eventList = eventList;
                    async.map(apps, getViews, function(err1, views) {
                        var viewList = {};
                        for (let i = 0; i < views.length; i++) {
                            for (let z in views[i]) {
                                viewList[z] = views[i][z];
                            }
                        }
                        params.member.viewList = viewList;
                        callback(err, eventList, viewList);
                    });
                });
            }
        }
        /**
        * Get databases with collections
        * @param {array} apps - applications array
        **/
        function dbGetDb(apps) {
            var lookup = {};
            for (let i = 0; i < apps.length ;i++) {
                lookup[apps[i]._id + ""] = apps[i].name;
            }

            dbLoadEventsData(apps, function(err, eventList, viewList) {
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
                            var db = {name: name, collections: {}};
                            async.map(results, function(col, done) {
                                if (col.s.name.indexOf("system.indexes") === -1 && col.s.name.indexOf("sessions_") === -1) {
                                    dbUserHassAccessToCollection(col.s.name, function(hasAccess) {
                                        if (hasAccess) {
                                            ob = parseCollectionName(col.s.name, lookup, eventList, viewList);
                                            db.collections[ob.pretty] = ob.name;
                                        }
                                        done(false, true);
                                    });
                                }
                                else {
                                    done(false, true);
                                }
                            }, function(mapError) {
                                callback(mapError, db);
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
        * Check user has access to collection
        * @param {string} collection - collection will be checked for access
        * @param {function} callback - callback method includes boolean variable as argument  
        * @returns {function} returns callback
        **/
        function dbUserHassAccessToCollection(collection, callback) {
            if (params.member.global_admin && !params.qstring.app_id) {
                //global admin without app_id restriction just has access to everything
                return callback(true);
            }

            var apps = [];
            if (params.qstring.app_id) {
                //if app_id was provided, we need to check if user has access for this app_id
                if (params.member.global_admin || (params.member.user_of && params.member.user_of.indexOf(params.qstring.app_id) !== -1)) {
                    apps = [params.qstring.app_id];
                }
            }
            else {
                //use whatever user has permission for
                apps = params.member.user_of || [];
            }
            var appList = [];
            if (collection.indexOf("events") === 0 || collection.indexOf("drill_events") === 0) {
                for (let i = 0; i < apps.length; i++) {
                    if (apps[i].length) {
                        appList.push({_id: apps[i]});
                    }
                }
                dbLoadEventsData(appList, function(err, eventList/*, viewList*/) {
                    for (let i in eventList) {
                        if (collection.indexOf(i, collection.length - i.length) !== -1) {
                            return callback(true);
                        }
                    }
                    return callback(false);
                });
            }
            else if (collection.indexOf("app_viewdata") === 0) {
                for (let i = 0; i < apps.length; i++) {
                    if (apps[i].length) {
                        appList.push({_id: apps[i]});
                    }
                }

                dbLoadEventsData(appList, function(err, eventList, viewList) {
                    for (let i in viewList) {
                        if (collection.indexOf(i, collection.length - i.length) !== -1) {
                            return callback(true);
                        }
                    }
                    return callback(false);
                });
            }
            else {
                for (let i = 0; i < apps.length; i++) {
                    if (collection.indexOf(apps[i], collection.length - apps[i].length) !== -1) {
                        return callback(true);
                    }
                }
                return callback(false);
            }
        }
        /**
        * Get aggregated result by the parameter on the url
        * @param {string} collection - collection will be applied related query
        * @param {object} aggregation - aggregation object
        * */
        function aggregate(collection, aggregation) {
            aggregation.push({"$count": "total"});
            dbs[dbNameOnParam].collection(collection).aggregate(aggregation, function(err, total) {
                if (!err) {
                    aggregation.splice(aggregation.length - 1, 1);
                    var skip = parseInt(params.qstring.iDisplayStart || 0);
                    aggregation.push({"$skip": skip});
                    if (params.qstring.iDisplayLength) {
                        aggregation.push({"$limit": parseInt(params.qstring.iDisplayLength)});
                    }
                    var totalRecords = total.length > 0 ? total[0].total : 0;
                    dbs[dbNameOnParam].collection(collection).aggregate(aggregation, function(aggregationErr, result) {
                        if (!aggregationErr) {
                            common.returnOutput(params, {sEcho: params.qstring.sEcho, iTotalRecords: totalRecords, iTotalDisplayRecords: totalRecords, "aaData": result});
                        }
                        else {
                            common.returnMessage(params, 500, aggregationErr);
                        }
                    });
                }
                else {
                    common.returnMessage(params, 500, err);
                }
            });
        }

        var validateUserForWriteAPI = ob.validateUserForWriteAPI;
        validateUserForWriteAPI(function() {
            if ((params.qstring.dbs || params.qstring.db) && params.qstring.collection && params.qstring.document && params.qstring.collection.indexOf("system.indexes") === -1 && params.qstring.collection.indexOf("sessions_") === -1) {
                if (params.member.global_admin) {
                    dbGetDocument();
                }
                else {
                    dbUserHassAccessToCollection(params.qstring.collection, function(hasAccess) {
                        if (hasAccess) {
                            dbGetDocument();
                        }
                        else {
                            common.returnMessage(params, 401, 'User does not have right to view this document');
                        }
                    });
                }
            }
            else if ((params.qstring.dbs || params.qstring.db) && params.qstring.collection && params.qstring.collection.indexOf('system.indexes') === -1 && params.qstring.collection.indexOf('sessions_') === -1 && params.qstring.aggregation) {
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
                    dbUserHassAccessToCollection(params.qstring.collection, function(hasAccess) {
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
            else if ((params.qstring.dbs || params.qstring.db) && params.qstring.collection && params.qstring.collection.indexOf("system.indexes") === -1 && params.qstring.collection.indexOf("sessions_") === -1) {
                if (params.member.global_admin) {
                    dbGetCollection();
                }
                else {
                    dbUserHassAccessToCollection(params.qstring.collection, function(hasAccess) {
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
                    if (params.qstring.app_id) {
                        //if we have app_id, check permissions
                        if (params.member.user_of && params.member.user_of.indexOf(params.qstring.app_id) !== -1) {
                            apps.push(common.db.ObjectID(params.qstring.app_id));
                        }
                    }
                    else {
                        //else use what ever user has access to
                        params.member.user_of = params.member.user_of || [];
                        for (let i = 0; i < params.member.user_of.length; i++) {
                            apps.push(common.db.ObjectID(params.member.user_of[i]));
                        }
                    }
                    common.db.collection('apps').find({_id: {$in: apps}}).toArray(function(err, applications) {
                        if (err) {
                            console.error(err);
                        }
                        dbGetDb(applications || []);
                    });
                }
            }
        }, params);
        return true;
    });
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