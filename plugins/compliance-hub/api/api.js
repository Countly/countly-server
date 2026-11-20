var plugin = {},
    crypto = require('crypto'),
    common = require('../../../api/utils/common.js'),
    log = common.log('compliance:api'),
    countlyCommon = require('../../../api/lib/countly.common.js'),
    appUsers = require('../../../api/parts/mgmt/app_users.js'),
    fetch = require('../../../api/parts/data/fetch.js'),
    plugins = require('../../pluginManager.js'),
    { validateRead } = require('../../../api/utils/rights.js');

const FEATURE_NAME = 'compliance_hub';

/**
 * Fields the Compliance Hub users table renders, and the only app_users fields
 * /o/app_users/consents may return. These match the columns bound in
 * frontend/public/templates/user.html: did, d, av, consent, lac, plus uid and
 * appUserExport for the per-row consent-history and export actions.
 *
 * compliance_hub read is a consent-scoped permission, so this endpoint must not
 * be able to return the rest of an app_users document.
 */
const CONSENT_TABLE_PROJECTION = Object.freeze({
    "did": 1,
    "d": 1,
    "av": 1,
    "consent": 1,
    "lac": 1,
    "uid": 1,
    "appUserExport": 1
});

/**
 * Fields a /o/app_users/consents query or sort may reference: the columns the
 * endpoint returns (CONSENT_TABLE_PROJECTION) plus _id, which Mongo returns
 * unless excluded. A dotted path is allowed when its first segment is one of
 * these, e.g. "consent.sessions".
 */
const CONSENT_TABLE_QUERY_FIELDS = Object.freeze(Object.keys(CONSENT_TABLE_PROJECTION).concat(["_id"]));

const CONSENT_TABLE_LOGICAL_OPERATORS = ["$and", "$or", "$nor"];

/**
 * Check whether a field path refers to one of the consent table columns
 * @param {string} path - field path from a query or sort, e.g. "consent.sessions"
 * @returns {boolean} true if the path is inside an allowed column
 */
function isConsentTableField(path) {
    return CONSENT_TABLE_QUERY_FIELDS.indexOf((path + "").split(".")[0]) !== -1;
}

/**
 * Check that a query for /o/app_users/consents only filters on the consent
 * table columns. Conditions may be combined with $and/$or/$nor at any depth;
 * any other top-level operator ($expr, $text, $jsonSchema, ...) or any other
 * field is reported. The query is never modified.
 * @param {object} query - parsed query
 * @returns {string|null} error message, or null if the query is allowed
 */
function findConsentTableQueryError(query) {
    if (!query || typeof query !== "object" || Array.isArray(query)) {
        return "Query must be an object";
    }
    for (var key in query) {
        if (!Object.prototype.hasOwnProperty.call(query, key)) {
            continue;
        }
        if (CONSENT_TABLE_LOGICAL_OPERATORS.indexOf(key) !== -1) {
            if (!Array.isArray(query[key])) {
                return "Operator " + key + " expects an array";
            }
            for (var i = 0; i < query[key].length; i++) {
                var nestedError = findConsentTableQueryError(query[key][i]);
                if (nestedError) {
                    return nestedError;
                }
            }
        }
        else if (key.charAt(0) === "$") {
            return "Query operator " + key + " is not allowed here. Allowed fields: " + CONSENT_TABLE_QUERY_FIELDS.join(", ");
        }
        else if (!isConsentTableField(key)) {
            return "Query field " + key + " is not allowed here. Allowed fields: " + CONSENT_TABLE_QUERY_FIELDS.join(", ");
        }
    }
    return null;
}

/**
 * Check that a sort for /o/app_users/consents only uses the consent table columns
 * @param {object} sort - parsed sort object
 * @returns {string|null} error message, or null if the sort is allowed
 */
function findConsentTableSortError(sort) {
    if (!sort || typeof sort !== "object" || Array.isArray(sort)) {
        return "Sort must be an object";
    }
    for (var key in sort) {
        if (Object.prototype.hasOwnProperty.call(sort, key) && !isConsentTableField(key)) {
            return "Sort field " + key + " is not allowed here. Allowed fields: " + CONSENT_TABLE_QUERY_FIELDS.join(", ");
        }
    }
    return null;
}

(function() {
    plugins.register("/permissions/features", function(ob) {
        ob.features.push(FEATURE_NAME);
    });

    plugins.internalDrillEvents.push("[CLY]_consent");

    plugins.register("/master", function() {
        common.db.collection('consent_history').ensureIndex({app_id: 1, device_id: 1}, function() {});
        common.db.collection('consent_history').ensureIndex({app_id: 1, uid: 1}, function() {});
        common.db.collection('consent_history').ensureIndex({app_id: 1, type: 1}, function() {});
        common.db.collection('consent_history').ensureIndex({app_id: 1, ts: 1}, function() {});
    });

    //write api call
    plugins.register("/sdk/user_properties", function(ob) {
        var params = ob.params;
        if (typeof params.qstring.consent === "string") {
            try {
                params.qstring.consent = JSON.parse(params.qstring.consent);
            }
            catch {
                console.log('Parse consent JSON failed', params.qstring.consent, params.req.url, params.req.body);
            }
        }
        if (params.qstring.consent) {
            if (!params.app_user.consent) {
                params.app_user.consent = {};
            }

            var update = {};
            var changes = {};
            var after = JSON.parse(JSON.stringify(params.app_user.consent));
            var metrics = {i: {segments: {feature: []}, value: 1, hourlySegments: ["feature"]}, o: {segments: {feature: []}, value: 1, hourlySegments: ["feature"]}};
            for (var i in params.qstring.consent) {
                //check if we already dont have that setting
                after[i] = params.qstring.consent[i];
                if (params.app_user.consent[i] !== params.qstring.consent[i]) {
                    //record only changes
                    update["consent." + i] = params.qstring.consent[i];
                    changes[i] = params.qstring.consent[i];
                    if (params.qstring.consent[i]) {
                        metrics.i.segments.feature.push(i);
                    }
                    else {
                        metrics.o.segments.feature.push(i);
                    }
                }
            }

            if (!metrics.i.segments.feature.length) {
                delete metrics.i;
            }

            if (!metrics.o.segments.feature.length) {
                delete metrics.o;
            }

            if (Object.keys(metrics).length) {
                common.recordMetric(params, {
                    collection: "consents",
                    id: params.app_id,
                    metrics: metrics
                });
            }

            if (Object.keys(update).length) {
                var type = [];
                if (metrics.i) {
                    type.push("i");
                }
                if (metrics.o) {
                    type.push("o");
                }
                if (type.length === 1) {
                    type = type[0];
                }
                ob.updates.push({$set: update});
                var m = params.qstring.metrics || {};
                common.db.collection("consent_history").insert({
                    before: params.app_user.consent || {},
                    after: after,
                    app_id: params.app_id.toString(),
                    change: changes,
                    type: type,
                    ts: params.time.mstimestamp,
                    cd: new Date(),
                    device_id: params.qstring.device_id,
                    uid: params.app_user.uid,
                    p: params.app_user.p || m._os,
                    pv: params.app_user.pv || m._os_version,
                    d: params.app_user.d || m._device,
                    av: params.app_user.av || m._app_version,
                    sc: params.app_user.sc || 0
                });

                var events = [{
                    key: "[CLY]_consent",
                    count: 1,
                    segmentation: params.qstring.consent
                }];
                plugins.dispatch("/plugins/drill", {params: params, dbAppUser: params.app_user, events: events});

                plugins.dispatch("/consent/change", {params: params, changes: changes});
            }
        }
    });

    plugins.register("/o", function(ob) {
        var params = ob.params;

        if (params.qstring.method === "consents") {
            validateRead(params, FEATURE_NAME, fetch.fetchTimeObj, 'consents');
            return true;
        }
        return false;
    });

    //manipulating consents
    plugins.register("/o/consent", function(ob) {
        var params = ob.params;
        var paths = ob.paths;

        switch (paths[3]) {
        case 'current': {
            if (!params.qstring.app_id) {
                common.returnMessage(params, 400, 'Missing parameter "app_id"');
                return true;
            }
            validateRead(params, FEATURE_NAME, function() {
                var parsed = common.parseUserQuery(params.qstring.query);
                if (parsed.error) {
                    log.d("Rejected user query" + common.reqInfo(params) + ": " + parsed.error);
                    common.returnMessage(params, 400, parsed.error);
                    return;
                }
                var query = parsed.query;
                // Force scope to the request's app_id even though this lookup
                // is in app_users<app_id>; defense-in-depth in case a future
                // refactor changes the collection.
                query.app_id = params.app_id.toString();
                common.db.collection("app_users" + params.qstring.app_id).findOne(query, function(err, res) {
                    common.returnOutput(params, res?.consent || {});
                });
            });
            break;
        }
        case 'search': {
            if (!params.qstring.app_id) {
                common.returnMessage(params, 400, 'Missing parameter "app_id"');
                return true;
            }
            validateRead(params, FEATURE_NAME, function() {
                var parsed = common.parseUserQuery(params.qstring.query);
                if (parsed.error) {
                    log.d("Rejected user query" + common.reqInfo(params) + ": " + parsed.error);
                    common.returnMessage(params, 400, parsed.error);
                    return;
                }
                var query = parsed.query;
                query.app_id = params.app_id.toString();
                common.db.collection("consent_history").countDocuments(query, function(err, total) {
                    if (err) {
                        common.returnMessage(params, 400, err);
                    }
                    else if (total > 0) {
                        params.qstring.query = params.qstring.query || params.qstring.filter || {};
                        params.qstring.project = params.qstring.project || params.qstring.projection || {};

                        var parsedSearch = common.parseUserQuery(params.qstring.query);
                        if (parsedSearch.error) {
                            log.d("Rejected user query" + common.reqInfo(params) + ": " + parsedSearch.error);
                            common.returnMessage(params, 400, parsedSearch.error);
                            return;
                        }
                        params.qstring.query = parsedSearch.query;

                        if (params.qstring.sSearch && params.qstring.sSearch !== "") {
                            try {
                                params.qstring.query.device_id = {"$regex": new RegExp(".*" + params.qstring.sSearch + ".*", 'i')};
                            }
                            catch {
                                console.log('Could not use as regex: ' + params.qstring.sSearch);
                            }
                        }

                        var columns = ["device_id", "device_id", "uid", "type", "after", "ts"];
                        var checkOb;
                        if (params.qstring.iSortCol_0 && params.qstring.sSortDir_0 && columns[params.qstring.iSortCol_0]) {
                            checkOb = {};
                            checkOb[columns[params.qstring.iSortCol_0]] = (params.qstring.sSortDir_0 === "asc") ? 1 : -1;
                        }
                        params.qstring.sort = checkOb || params.qstring.sort || {};

                        if (params.qstring.period) {
                            countlyCommon.getPeriodObj(params);
                            params.qstring.query.ts = countlyCommon.getTimestampRangeQuery(params, false);
                        }

                        params.qstring.project = params.qstring.project || {};
                        if (typeof params.qstring.project === "string" && params.qstring.project.length) {
                            try {
                                params.qstring.project = JSON.parse(params.qstring.project);
                            }
                            catch {
                                params.qstring.project = {};
                            }
                        }

                        params.qstring.sort = params.qstring.sort || {};
                        if (typeof params.qstring.sort === "string" && params.qstring.sort.length) {
                            try {
                                params.qstring.sort = JSON.parse(params.qstring.sort);
                            }
                            catch {
                                params.qstring.sort = {};
                            }
                        }

                        params.qstring.limit = parseInt(params.qstring.limit) || parseInt(params.qstring.iDisplayLength) || 0;
                        params.qstring.skip = parseInt(params.qstring.skip) || parseInt(params.qstring.iDisplayStart) || 0;
                        params.qstring.query.app_id = params.app_id.toString();

                        var cursor = common.db.collection("consent_history").find(params.qstring.query, params.qstring.project);
                        cursor.count(function(countErr, count) {
                            if (Object.keys(params.qstring.sort).length) {
                                cursor.sort(params.qstring.sort);
                            }

                            if (params.qstring.skip) {
                                cursor.skip(params.qstring.skip);
                            }

                            if (params.qstring.limit) {
                                cursor.limit(params.qstring.limit);
                            }

                            cursor.toArray(function(toArrayErr, items) {
                                if (err) {
                                    common.returnMessage(params, 400, err);
                                }
                                else {
                                    common.returnOutput(params, {sEcho: params.qstring.sEcho, iTotalRecords: total, iTotalDisplayRecords: count, aaData: items});
                                }
                            });
                        });
                    }
                    else {
                        common.returnOutput(params, {sEcho: params.qstring.sEcho, iTotalRecords: total, iTotalDisplayRecords: total, aaData: []});
                    }
                });
            });
            break;
        }
        default:
            common.returnMessage(params, 400, 'Invalid path');
        }
        return true;
    });

    plugins.register("/o/app_users", function(ob) {
        var params = ob.params;
        var paths = ob.paths;

        switch (paths[3]) {
        case 'consents': {
            if (!params.qstring.app_id) {
                common.returnMessage(params, 400, 'Missing parameter "app_id"');
                return true;
            }
            validateRead(params, FEATURE_NAME, function() {
                appUsers.count(params.qstring.app_id, {}, function(err, total) {
                    if (err) {
                        common.returnMessage(params, 400, err);
                    }
                    else if (total > 0) {
                        params.qstring.query = params.qstring.query || params.qstring.filter || {};
                        var parsedC = common.parseUserQuery(params.qstring.query);
                        if (parsedC.error) {
                            log.d("Rejected user query" + common.reqInfo(params) + ": " + parsedC.error);
                            common.returnMessage(params, 400, parsedC.error);
                            return;
                        }
                        params.qstring.query = parsedC.query;
                        //count and search run the query against whole app_users
                        //documents, so it may only reference the columns this
                        //endpoint returns.
                        var queryFieldError = findConsentTableQueryError(params.qstring.query);
                        if (queryFieldError) {
                            log.d("Rejected user query" + common.reqInfo(params) + ": " + queryFieldError);
                            common.returnMessage(params, 400, queryFieldError);
                            return;
                        }
                        //The consent table is a fixed set of columns, so the
                        //projection is fixed server side and any project/projection
                        //supplied by the caller is ignored. Previously the default
                        //applied only when the caller omitted both parameters, so
                        //project={} - an empty projection, which Mongo reads as "all
                        //fields" - returned whole app_users documents (name, email,
                        //phone, custom properties, payment totals, location) to a
                        //member holding nothing but compliance_hub read.
                        params.qstring.project = Object.assign({}, CONSENT_TABLE_PROJECTION);

                        if (params.qstring.sSearch && params.qstring.sSearch !== "") {
                            params.qstring.query.did = {"$regex": new RegExp(".*" + params.qstring.sSearch + ".*", 'i')};
                        }

                        var columns = ["did", "d", "av", "consent", "lac"];
                        var checkOb;
                        if (params.qstring.iSortCol_0 && params.qstring.sSortDir_0 && columns[params.qstring.iSortCol_0]) {
                            checkOb = {};
                            checkOb[columns[params.qstring.iSortCol_0]] = (params.qstring.sSortDir_0 === "asc") ? 1 : -1;
                        }
                        if (!checkOb && params.qstring.sort) {
                            var sortOb = params.qstring.sort;
                            if (typeof sortOb === "string") {
                                try {
                                    sortOb = JSON.parse(sortOb);
                                }
                                catch {
                                    common.returnMessage(params, 400, "Could not parse parameter \"sort\"");
                                    return;
                                }
                            }
                            var sortFieldError = findConsentTableSortError(sortOb);
                            if (sortFieldError) {
                                log.d("Rejected sort" + common.reqInfo(params) + ": " + sortFieldError);
                                common.returnMessage(params, 400, sortFieldError);
                                return;
                            }
                            checkOb = sortOb;
                        }
                        params.qstring.sort = checkOb || {};
                        params.qstring.limit = parseInt(params.qstring.limit) || parseInt(params.qstring.iDisplayLength) || 0;
                        params.qstring.skip = parseInt(params.qstring.skip) || parseInt(params.qstring.iDisplayStart) || 0;
                        appUsers.count(params.qstring.app_id, params.qstring.query, function(countErr, countTotal) {
                            appUsers.search(params.qstring.app_id, params.qstring.query, params.qstring.project, params.qstring.sort, params.qstring.limit, params.qstring.skip, function(searchErr, items) {
                                if (err) {
                                    common.returnMessage(params, 400, err);
                                }
                                else {
                                    common.returnOutput(params, {sEcho: params.qstring.sEcho, iTotalRecords: countTotal, iTotalDisplayRecords: countTotal, aaData: items});
                                }
                            });
                        });
                    }
                    else {
                        common.returnOutput(params, {sEcho: params.qstring.sEcho, iTotalRecords: total, iTotalDisplayRecords: total, aaData: []});
                    }
                });
            });
            return true;
        }
        }
    });

    plugins.register("/i/user_merge", function(ob) {
        var newAppUser = ob.newAppUser;
        var oldAppUser = ob.oldAppUser;
        if (typeof oldAppUser.consent !== "undefined") {
            if (typeof newAppUser.consent === "undefined") {
                newAppUser.consent = oldAppUser.consent;
            }
            else {
                for (var i in oldAppUser.consent) {
                    if (typeof newAppUser.consent[i] === "undefined") {
                        newAppUser.consent[i] = oldAppUser.consent[i];
                    }
                }
            }
        }
    });

    plugins.register("/i/device_id", function(ob) {
        var oldUid = ob.oldUser.uid;
        var newUid = ob.newUser.uid;
        if (oldUid !== newUid) {
            return new Promise(function(resolve, reject) {
                common.db.collection('consent_history').update({app_id: ob.app_id, uid: oldUid}, {'$set': { uid: newUid}}, {multi: true}, function(err) {
                    if (err) {
                        reject(err);
                        return;
                    }
                    resolve();
                });
            });
        }
    });

    plugins.register("/i/app_users/delete", function(ob) {
        var params = ob.params;
        common.recordCustomMetric(params, "consents", params.qstring.app_id, ["p"]);
    });

    plugins.register("/systemlogs", function(ob) {
        var params = ob.params;
        if (ob.action === "export_app_user") {
            common.recordCustomMetric(params, "consents", params.qstring.app_id, ["e"]);
        }
    });

    plugins.register("/i/apps/delete", function(ob) {
        var appId = ob.appId;
        common.db.collection('consents').remove({'_id': {$regex: appId + ".*"}}, function() {});
        common.db.collection('consent_history').deleteMany({app_id: appId}, function() {});
        if (common.drillDb) {
            common.drillDb.collection("drill_events" + crypto.createHash('sha1').update("[CLY]_consent" + appId).digest('hex')).drop(function() {});
        }
    });

    plugins.register("/i/apps/reset", function(ob) {
        var appId = ob.appId;
        common.db.collection('consents').remove({'_id': {$regex: appId + ".*"}}, function() {});
        common.db.collection('consent_history').deleteMany({app_id: appId}, function() {});
        if (common.drillDb) {
            common.drillDb.collection("drill_events" + crypto.createHash('sha1').update("[CLY]_consent" + appId).digest('hex')).drop(function() {});
        }
    });

    plugins.register("/i/apps/clear_all", function(ob) {
        var appId = ob.appId;
        common.db.collection('consents').remove({'_id': {$regex: appId + ".*"}}, function() {});
        common.db.collection('consent_history').deleteMany({app_id: appId}, function() {});
        if (common.drillDb) {
            common.drillDb.collection("drill_events" + crypto.createHash('sha1').update("[CLY]_consent" + appId).digest('hex')).drop(function() {});
        }
    });

    plugins.register("/i/apps/clear", function(ob) {
        var appId = ob.appId;
        var ids = ob.ids;
        common.db.collection('consents').remove({$and: [{'_id': {$regex: appId + ".*"}}, {'_id': {$nin: ids}}]}, function() {});
        common.db.collection('consent_history').deleteMany({app_id: appId, ts: {$lt: ob.moment.valueOf()}}, function() {});
        if (common.drillDb) {
            common.drillDb.collection("drill_events" + crypto.createHash('sha1').update("[CLY]_consent" + appId).digest('hex')).remove({ts: {$lt: ob.moment.valueOf()}}, function() {});
        }
    });
}(plugin));

module.exports = plugin;
