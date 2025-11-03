var plugin = {},
    common = require('../../../api/utils/common.js'),
    countlyCommon = require('../../../api/lib/countly.common.js'),
    appUsers = require('../../../api/parts/mgmt/app_users.js'),
    fetch = require('../../../api/parts/data/fetch.js'),
    plugins = require('../../pluginManager.js'),
    log = common.log('compliance-hub:api'),
    consentQueries = require('./queries/consents'),
    { validateRead } = require('../../../api/utils/rights.js');

const FEATURE_NAME = 'compliance_hub';

(function() {
    plugins.register("/permissions/features", function(ob) {
        ob.features.push(FEATURE_NAME);
    });

    plugins.internalDrillEvents.push("[CLY]_consent");

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
                var query = params.qstring.query || {};
                if (typeof query === "string" && query.length) {
                    try {
                        query = JSON.parse(query);
                    }
                    catch (ex) {
                        query = {};
                    }
                }
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
                try {
                    var columns = ["device_id", "device_id", "uid", "type", "ts", "ts"];
                    var checkOb;
                    if (params.qstring.iSortCol_0 && params.qstring.sSortDir_0 && columns[params.qstring.iSortCol_0]) {
                        checkOb = {};
                        checkOb[columns[params.qstring.iSortCol_0]] = (params.qstring.sSortDir_0 === "asc") ? 1 : -1;
                    }
                    else if (params.qstring.sort && typeof params.qstring.sort === 'object' && Object.keys(params.qstring.sort).length) {
                        checkOb = params.qstring.sort;
                    }
                    else {
                        checkOb = {};
                    }
                    var queryParams = {
                        appID: params.qstring.app_id,
                        period: params.qstring.period,
                        qstring: params.qstring,
                        sSearch: params.qstring.sSearch,
                        sort: checkOb,
                        project: params.qstring.project || params.qstring.projection || {}
                    };

                    let rawFilter = params.qstring.filter || params.qstring.query;
                    if (rawFilter) {
                        try {
                            if (typeof rawFilter === 'string' && rawFilter.length) {
                                rawFilter = JSON.parse(rawFilter);
                            }
                            queryParams.query = rawFilter;
                        }
                        catch (e) {
                            log.e('Cannot parse filter/query', e);
                        }
                    }

                    const adapter = params.qstring.db_override &&
                                params.qstring.db_override !== 'compare' &&
                                params.qstring.db_override !== 'config'
                        ? params.qstring.db_override
                        : undefined;
                    const isClickHouse = adapter === 'clickhouse';
                    if (isClickHouse) {
                        queryParams.limit = parseInt(params.qstring.limit) || parseInt(params.qstring.iDisplayLength) || 20;
                        if (params.qstring.cursor) {
                            queryParams.cursor = params.qstring.cursor;
                        }
                        if (params.qstring.paginationMode) {
                            queryParams.paginationMode = params.qstring.paginationMode;
                        }
                        if (!queryParams.paginationMode) {
                            queryParams.paginationMode = 'snapshot';
                        }
                    }
                    else {
                        queryParams.limit = parseInt(params.qstring.limit) || parseInt(params.qstring.iDisplayLength) || 20;
                        queryParams.skip = parseInt(params.qstring.skip) || parseInt(params.qstring.iDisplayStart) || 0;
                    }
                    consentQueries.fetchConsentsList(queryParams, { adapter: adapter, comparisonMode: params.qstring.comparison })
                        .then(function(res) {
                            var result;

                            if (isClickHouse) {
                                result = {
                                    sEcho: params.qstring.sEcho,
                                    iTotalRecords: res.total || 0,
                                    iTotalDisplayRecords: res.total || 0,
                                    aaData: res.data || []
                                };
                                if (res.hasNextPage) {
                                    result.hasNextPage = true;
                                    result.nextCursor = res.nextCursor;
                                }
                                if (res.paginationMode) {
                                    result.paginationMode = res.paginationMode;
                                }
                                if (res.isApproximate !== undefined) {
                                    result.isApproximate = res.isApproximate;
                                }
                            }
                            else {
                                result = {
                                    sEcho: params.qstring.sEcho,
                                    iTotalRecords: res.total || 0,
                                    iTotalDisplayRecords: res.filteredTotal || res.total || 0,
                                    aaData: res.data || []
                                };
                            }
                            common.returnOutput(params, result);
                        })
                        .catch(function(e) {
                            log.e(e);
                            common.returnMessage(params, 400, 'Error. Please check logs.');
                        });
                }
                catch (e) {
                    log.e(e);
                    common.returnMessage(params, 400, 'Error. Please check logs.');
                }
            });
            break;
        }
        /*
            Internal info: 
            searchOld endpoint uses consent_history
            we keep this endpoint as a backup in case we need to use old data
        */
        case 'searchOld': {
            if (!params.qstring.app_id) {
                common.returnMessage(params, 400, 'Missing parameter "app_id"');
                return false;
            }
            validateRead(params, FEATURE_NAME, function() {
                var query = params.qstring.query || {};
                if (typeof query === "string" && query.length) {
                    try {
                        query = JSON.parse(query);
                    }
                    catch (ex) {
                        query = {};
                    }
                }
                common.db.collection("consent_history").count(query, function(err, total) {
                    if (err) {
                        common.returnMessage(params, 400, err);
                    }
                    else if (total > 0) {
                        params.qstring.query = params.qstring.query || params.qstring.filter || {};
                        params.qstring.project = params.qstring.project || params.qstring.projection || {};

                        params.qstring.query = params.qstring.query || {};
                        if (typeof params.qstring.query === "string" && params.qstring.query.length) {
                            try {
                                params.qstring.query = JSON.parse(params.qstring.query);
                            }
                            catch (ex) {
                                params.qstring.query = {};
                            }
                        }

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
                            catch (ex) {
                                params.qstring.project = {};
                            }
                        }

                        params.qstring.sort = params.qstring.sort || {};
                        if (typeof params.qstring.sort === "string" && params.qstring.sort.length) {
                            try {
                                params.qstring.sort = JSON.parse(params.qstring.sort);
                            }
                            catch (ex) {
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
                        params.qstring.project = params.qstring.project || params.qstring.projection || {"did": 1, "d": 1, "av": 1, "consent": 1, "lac": 1, "uid": 1, "appUserExport": 1};

                        if (params.qstring.sSearch && params.qstring.sSearch !== "") {
                            params.qstring.query.did = {"$regex": new RegExp(".*" + params.qstring.sSearch + ".*", 'i')};
                        }

                        var columns = ["did", "d", "av", "consent", "lac"];
                        var checkOb;
                        if (params.qstring.iSortCol_0 && params.qstring.sSortDir_0 && columns[params.qstring.iSortCol_0]) {
                            checkOb = {};
                            checkOb[columns[params.qstring.iSortCol_0]] = (params.qstring.sSortDir_0 === "asc") ? 1 : -1;
                        }
                        params.qstring.sort = checkOb || params.qstring.sort || {};
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
        common.drillDb.collection("drill_events").deleteMany({"a": (appId + ""), "e": "[CLY]_consent"}, function() {});
    });

    plugins.register("/i/apps/reset", function(ob) {
        var appId = ob.appId;
        common.db.collection('consents').remove({'_id': {$regex: appId + ".*"}}, function() {});
        common.drillDb.collection("drill_events").deleteMany({"a": (appId + ""), "e": "[CLY]_consent"}, function() {});
    });

    plugins.register("/i/apps/clear_all", function(ob) {
        var appId = ob.appId;
        common.db.collection('consents').remove({'_id': {$regex: appId + ".*"}}, function() {});
        common.drillDb.collection("drill_events").deleteMany({"a": (appId + ""), "e": "[CLY]_consent"}, function() {});
    });

    plugins.register("/i/apps/clear", function(ob) {
        var appId = ob.appId;
        var ids = ob.ids;
        common.db.collection('consents').remove({$and: [{'_id': {$regex: appId + ".*"}}, {'_id': {$nin: ids}}]}, function() {});
        common.drillDb.collection("drill_events").deleteMany({"a": (appId + ""), "e": "[CLY]_consent", ts: {$lt: ob.moment.valueOf()}}, function() {});
    });
}(plugin));

module.exports = plugin;
