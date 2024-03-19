var plugin = {},
    common = require('../../../api/utils/common.js'),
    countlyCommon = require('../../../api/lib/countly.common.js'),
    appUsers = require('../../../api/parts/mgmt/app_users.js'),
    fetch = require('../../../api/parts/data/fetch.js'),
    plugins = require('../../pluginManager.js'),
    { validateRead } = require('../../../api/utils/rights.js');

const FEATURE_NAME = 'compliance_hub';

(function() {
    plugins.register("/permissions/features", function(ob) {
        ob.features.push(FEATURE_NAME);
    });
    //write api call
    plugins.register("/sdk/user_properties", function(ob) {
        var params = ob.params;
        if (typeof params.qstring.consent === "string") {
            try {
                params.qstring.consent = JSON.parse(params.qstring.consent);
            }
            catch (SyntaxError) {
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
                common.db.collection("app_users" + params.qstring.app_id).findOne(query, function(err, res) {
                    common.returnOutput(params, res.consent || {});
                });
            });
            break;
        }
        case 'search': {
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
                return false;
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
                common.db.collection('consent_history').update({uid: oldUid}, {'$set': {uid: newUid}}, {multi: true}, function(err) {
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
        common.db.collection('consent_history').drop(function() {});
    });

    plugins.register("/i/apps/reset", function(ob) {
        var appId = ob.appId;
        common.db.collection('consents').remove({'_id': {$regex: appId + ".*"}}, function() {});
        common.db.collection('consent_history').drop(function() {});
    });

    plugins.register("/i/apps/clear_all", function(ob) {
        var appId = ob.appId;
        common.db.collection('consents').remove({'_id': {$regex: appId + ".*"}}, function() {});
    });

    plugins.register("/i/apps/clear", function(ob) {
        var appId = ob.appId;
        var ids = ob.ids;
        common.db.collection('consents').remove({$and: [{'_id': {$regex: appId + ".*"}}, {'_id': {$nin: ids}}]}, function() {});
    });
}(plugin));

module.exports = plugin;
