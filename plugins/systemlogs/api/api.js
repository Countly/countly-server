var pluginOb = {},
    common = require('../../../api/utils/common.js'),
    countlyCommon = require('../../../api/lib/countly.common.js'),
    plugins = require('../../pluginManager.js'),
    { validateGlobalAdmin, validateUser } = require('../../../api/utils/rights.js');

//const FEATURE_NAME = 'systemlogs';
plugins.setConfigs("systemlogs", {
    preventIPTracking: false
});

/**
 * @api {get} /o?method=systemlogs/query Get system logs
 * @apiName GetSystemLogs
 * @apiGroup SystemLogs
 * 
 * @apiDescription return the records of the system logs
 * @apiQuery {String} method which kind systemlogs requested, it should be 'systemlogs'
 * @apiQuery {String} user_id Filtering is performed according to the user
 * @apiQuery {String} a Filtering is performed according to action
 * 
 * @apiSuccess {Number} iTotalRecords Total number of system logs
 * @apiSuccess {Number} iTotalDisplayRecords Total number of system logs by filtering
 * @apiSuccess {Objects[]} aaData System logs details
 * @apiSuccess {Number} sEcho DataTable's internal counter
 * 
 * @apiSuccessExample {json} Success-Response:
 * HTTP/1.1 200 OK
 * {
 *   "sEcho": "29",
 *   "iTotalRecords": 81270,
 *   "iTotalDisplayRecords": 390,
 *   "aaData": [
 *       {
 *           "_id": "6270ea3dbccff991b16ef7f0",
 *           "a": "clear_all",
 *           "i": {
 *               "_id": "6181431e09e272efa5f64305",
 *               "name": "DTE_test_app",
 *               "country": "TR",
 *               "type": "web",
 *               "category": "6",
 *               "timezone": "Europe/Istanbul",
 *               "app_domain": "",
 *               "created_at": 1635861278,
 *               "edited_at": 1635861278,
 *               "owner": "617f9c7e5b25eea3b9afabf8",
 *               "seq": 21,
 *               "key": "21cf5a730c3152bf1cb0d1ace048e25ac9d66b90",
 *               "last_data": 1651489932,
 *               "plugins": {
 *                   "push": {
 *                       "i": {
 *                           "_id": "demo"
 *                       },
 *                       "a": {
 *                           "_id": "demo"
 *                       },
 *                       "h": {
 *                           "_id": "demo"
 *                       }
 *                   }
 *               },
 *               "blocks": [
 *                   {
 *                       "type": "all",
 *                       "key": "*",
 *                       "name": "Country is United States",
 *                       "rule": "{\"up.cc\":{\"$in\":[\"US\"]}}",
 *                       "status": true,
 *                       "is_arbitrary_input": false,
 *                       "_id": "6181621e09e272efa5f64a3a"
 *                   }
 *               ],
 *               "app_id": "6181431e09e272efa5f64305"
 *           },
 *           "ts": 1651567165,
 *           "cd": "2022-05-03T08:39:25.256Z",
 *           "u": "deniz.erten@count.ly",
 *           "ip": null,
 *           "app_id": "6181431e09e272efa5f64305",
 *           "user_id": "617f9c7e5b25eea3b9afabf8"
 *       },
 *   ]
 * }
*/

(function() {
    /*plugins.register("/permissions/features", function(ob) {
        ob.features.push(FEATURE_NAME);
    });*/
    //read api call
    plugins.register("/o", function(ob) {
        var params = ob.params;
        if (params.qstring.method === 'systemlogs') {
            var query = {};
            if (typeof params.qstring.query === "string") {
                try {
                    query = JSON.parse(params.qstring.query);
                }
                catch (ex) {
                    console.log("Can't parse systelogs query");
                    query = {};
                }
            }
            if (params.qstring.sSearch && params.qstring.sSearch !== "") {
                var reg;
                try {
                    reg = new RegExp(".*" + params.qstring.sSearch + ".*", 'i');
                }
                catch (ex) {
                    console.log("Incorrect regex: " + params.qstring.sSearch);
                }
                if (reg) {
                    query.a = {"$regex": reg};
                }
                //filter["$text"] = { "$search": "\""+params.qstring.sSearch+"\"" };
            }
            if (params.qstring.period) {
                countlyCommon.getPeriodObj(params);
                query.ts = countlyCommon.getTimestampRangeQuery(params, true);
            }
            validateGlobalAdmin(params, function(paramsNew) {
                var columns = [null, "ts", "u", "ip", "a", "i"];
                common.db.collection('systemlogs').estimatedDocumentCount(function(err1, total) {
                    total--;
                    var cursor = common.db.collection('systemlogs').find(query);
                    cursor.count(function(err2, count) {
                        if (paramsNew.qstring.iDisplayStart && parseInt(paramsNew.qstring.iDisplayStart) !== 0) {
                            cursor.skip(parseInt(paramsNew.qstring.iDisplayStart));
                        }
                        if (paramsNew.qstring.iDisplayLength && parseInt(paramsNew.qstring.iDisplayLength) !== -1) {
                            cursor.limit(parseInt(paramsNew.qstring.iDisplayLength));
                        }
                        if (paramsNew.qstring.iSortCol_0 && paramsNew.qstring.sSortDir_0 && columns[params.qstring.iSortCol_0]) {
                            var obj = {};
                            obj[columns[paramsNew.qstring.iSortCol_0]] = (paramsNew.qstring.sSortDir_0 === "asc") ? 1 : -1;
                            cursor.sort(obj);
                        }

                        cursor.toArray(function(err3, res) {
                            if (err3) {
                                console.log(err3);
                            }
                            res = res || [];
                            if (params.qstring.export) {
                                for (var i = 0; i < res.length; i++) {
                                    var info = res[i].i;
                                    delete res[i].i;
                                    delete res[i].cd;
                                    delete res[i]._id;
                                    if (info._id) {
                                        res[i].subject_id = info.app_id || info.user_id || info.campaign_id || info.crash_id || info.appuser_id || info._id;
                                    }
                                    if (info.name) {
                                        res[i].name = info.name;
                                    }
                                }
                            }
                            common.returnOutput(paramsNew, {sEcho: paramsNew.qstring.sEcho, iTotalRecords: Math.max(total, 0), iTotalDisplayRecords: count, aaData: res});
                        });
                    });
                });
            });
            return true;
        }
        else if (params.qstring.method === 'systemlogs_meta') {
            validateGlobalAdmin(params, function(paramsNew) {
                //get all users
                common.db.collection('members').find({}, {username: 1, email: 1, full_name: 1}).toArray(function(err1, users) {
                    common.db.collection('systemlogs').findOne({_id: "meta_v2"}, {_id: 0}, function(err2, res) {
                        var result = {};
                        if (!err2 && res) {
                            for (var i in res) {
                                result[i] = Object.keys(res[i]).map(function(arg) {
                                    return common.db.decode(arg);
                                });
                            }
                        }
                        result.users = users || [];
                        common.returnOutput(paramsNew, result);
                    });
                });
            });
            return true;
        }
    });

    plugins.register("/i/systemlogs", function(ob) {
        var params = ob.params;
        validateUser(params, function() {
            if (typeof params.qstring.data === "string") {
                try {
                    params.qstring.data = JSON.parse(params.qstring.data);
                }
                catch (ex) {
                    console.log("Error parsing systemlogs data", params.qstring.data);
                }
            }
            if (typeof params.qstring.action === "string") {
                processRecording({params: params, action: params.qstring.action, user: params.member || {}, data: params.qstring.data || {}});
                //recordAction(params, {}, params.qstring.action, params.qstring.data || {});
            }

            common.returnOutput(params, {result: "Success"});
        });
        return true;
    });

    plugins.register("/i/apps/create", function(ob) {
        ob.data.app_id = ob.appId;
        recordAction(ob.params, ob.params.member, "app_created", ob.data);
    });

    plugins.register("/i/apps/update", function(ob) {
        var data = {};
        data.before = {};
        data.after = {};
        data.update = ob.data.update;
        data.app_id = ob.appId;
        compareChanges(data, ob.data.app, ob.data.update);
        recordAction(ob.params, ob.params.member, "app_updated", data);
    });

    plugins.register("/i/apps/delete", function(ob) {
        ob.data.app_id = ob.data._id;
        recordAction(ob.params, ob.params.member, "app_deleted", ob.data);
    });

    plugins.register("/i/apps/reset", function(ob) {
        var appId = ob.appId;
        ob.data.app_id = appId;
        recordAction(ob.params, ob.params.member, "app_reset", ob.data);
    });

    plugins.register("/i/apps/clear_all", function(ob) {
        var appId = ob.appId;
        ob.data.app_id = appId;
        recordAction(ob.params, ob.params.member, "clear_all", ob.data);
    });

    plugins.register("/i/apps/clear", function(ob) {
        var appId = ob.appId;
        ob.data.app_id = appId;
        ob.data.before = ob.moment.format("YYYY-MM-DD");
        recordAction(ob.params, ob.params.member, "app_clear_old_data", ob.data);
    });

    plugins.register("/i/users/create", function(ob) {
        ob.data = JSON.parse(JSON.stringify(ob.data));
        delete ob.data.password;
        recordAction(ob.params, ob.params.member, "user_created", ob.data);
    });

    plugins.register("/i/users/update", function(ob) {
        ob.data = JSON.parse(JSON.stringify(ob.data));
        if (ob.data.password) {
            ob.data.password = true;
        }

        var data = {};
        data.user_id = ob.data._id;
        data.before = {};
        data.after = {};
        data.update = ob.data;
        compareChanges(data, ob.member, ob.data);
        if (typeof data.before.password !== "undefined") {
            data.before.password = true;
            data.after.password = true;
        }
        recordAction(ob.params, ob.params.member, "user_updated", data);
    });

    plugins.register("/i/users/delete", function(ob) {
        ob.data = JSON.parse(JSON.stringify(ob.data));
        delete ob.data.password;
        recordAction(ob.params, ob.params.member, "user_deleted", ob.data);
    });

    plugins.register("/systemlogs", function(ob) {
        processRecording(ob);
    });

    /**
     * recursive function to compare changes
     * @param  {Object} dataafter - after data values
     * @param  {Object} databefore - before data values
     * @param  {Object} before - before
     * @param  {Object} after - after
     * @param  {Array} keys - keys for after object
     * @param  {Array} keys2 - keys for before object
     */
    function compareChangesInside(dataafter, databefore, before, after, keys, keys2) {
        for (let i = 0; i < keys2.length; i++) {
            if (keys.indexOf(keys2[i]) === -1) {
                keys.push(keys2[i]);
            }
        }
        for (let i = 0; i < keys.length; i++) {
            if (after[keys[i]] === null || before[keys[i]] === null) {
                if (after[keys[i]] !== before[keys[i]]) {
                    databefore[keys[i]] = before[keys[i]];
                    dataafter[keys[i]] = after[keys[i]];
                }
            }
            else if (typeof after[keys[i]] !== "undefined" && typeof before[keys[i]] !== "undefined") {
                if (typeof after[keys[i]] === "object") {
                    if (Array.isArray(after[keys[i]])) {
                        if (JSON.stringify(after[keys[i]]) !== JSON.stringify(before[keys[i]])) {

                            databefore[keys[i]] = before[keys[i]];
                            dataafter[keys[i]] = after[keys[i]];
                        }
                    }
                    else {
                        var keys00 = Object.keys(after[keys[i]]) || [];
                        var keys02 = Object.keys(before[keys[i]] || {}) || [];

                        if (keys00.length === 0 && keys02.length !== 0) {
                            databefore[keys[i]] = before[keys[i]];
                            dataafter[keys[i]] = after[keys[i]];
                        }
                        else if (keys02.length === 0 && keys00.length !== 0) {
                            databefore[keys[i]] = before[keys[i]];
                            dataafter[keys[i]] = after[keys[i]];
                        }
                        else {
                            if (!databefore[keys[i]]) {
                                databefore[keys[i]] = {};
                            }
                            if (!dataafter[keys[i]]) {
                                dataafter[keys[i]] = {};
                            }
                            compareChangesInside(dataafter[keys[i]], databefore[keys[i]], before[keys[i]], after[keys[i]], keys00, keys02);
                            if (typeof dataafter[keys[i]] === "object" && typeof databefore[keys[i]] === "object" && (Object.keys(dataafter[keys[i]])).length === 0 && (Object.keys(databefore[keys[i]])).length === 0) {
                                delete databefore[keys[i]];
                                delete dataafter[keys[i]];
                            }
                        }
                    }
                }
                else {
                    if (after[keys[i]] !== before[keys[i]]) {
                        databefore[keys[i]] = before[keys[i]];
                        dataafter[keys[i]] = after[keys[i]];
                    }
                }
            }
            else {
                if (typeof after[keys[i]] !== 'undefined') {
                    dataafter[keys[i]] = after[keys[i]];
                    databefore[keys[i]] = {};
                }
            }
        }
    }

    /**
     * Function to compare and process record
     * @param  {Object} ob - data object
     */
    function processRecording(ob) {
        var user = ob.user || ob.params.member;
        ob.data = ob.data || {};
        if (typeof ob.data.before !== "undefined" && typeof ob.data.update !== "undefined") {
            var data = {};
            for (var i in ob.data) {
                if (i !== "before" && i !== "after") {
                    data[i] = ob.data[i];
                }
            }
            data.before = {};
            data.after = {};
            compareChanges(data, ob.data.before, ob.data.update);
            if (Object.keys(data.before).length > 0 && Object.keys(data.after).length > 0) {
                recordAction(ob.params, user, ob.action, data);
            }
        }
        else {
            recordAction(ob.params, user, ob.action, ob.data);
        }

    }

    /**
     * Function to compare changes
     * @param  {Object} data - data object
     * @param  {Object} before - before values
     * @param  {Object} after - after values
     */
    function compareChanges(data, before, after) {
        if (before && after) {
            if (typeof before._id !== "undefined") {
                before._id += "";
                data._id = before._id;
                if (typeof before.name !== "undefined") {
                    data.name = before.name;
                }
            }
            if (typeof after._id !== "undefined") {
                after._id += "";
            }
            compareChangesInside(data.after, data.before, before, after, Object.keys(after) || [], Object.keys(before) || []);
        }
    }
    /**
     * Function to record action
     * @param  {Object} params -  Default parameters object
     * @param  {Object} user - user object
     * @param  {String} action - action
     * @param  {Object} data - data object
     */
    function recordAction(params, user, action, data) {
        var log = {};
        log.a = action;
        log.i = data;
        log.ts = Math.round(new Date().getTime() / 1000);
        log.cd = new Date();
        user = user || {};
        log.u = user.email || user.username || "";

        var PreventIPTracking = plugins.getConfig("systemlogs").preventIPTracking;

        if (PreventIPTracking) {
            log.ip = null;
        }
        else {
            log.ip = common.getIpAddress(params.req);
        }

        if (typeof data.app_id !== "undefined") {
            log.app_id = data.app_id;
        }
        if (user._id) {
            log.user_id = user._id + "";
            if (log.u === "") {
                common.db.collection('members').findOne({_id: common.db.ObjectID.createFromHexString(user._id)}, function(err, res) {
                    if (!err && res) {
                        log.u = res.email || res.username;
                    }
                    common.db.collection('systemlogs').insert(log, function() {});
                });
            }
            else {
                common.db.collection('systemlogs').insert(log, function() {});
            }
        }
        else {
            var query = {};
            if (user.username) {
                query.username = user.username;
            }
            else if (user.email) {
                query.email = user.email;
            }
            else if (params.qstring.api_key) {
                query.api_key = params.qstring.api_key;
            }
            if (Object.keys(query).length) {
                common.db.collection('members').findOne(query, function(err, res) {
                    if (!err && res) {
                        log.user_id = res._id + "";
                        if (log.u === "") {
                            log.u = res.email || res.username;
                        }
                    }
                    common.db.collection('systemlogs').insert(log, function() {});
                });
            }
            else {
                common.db.collection('systemlogs').insert(log, function() {});
            }
        }
        var update = {};
        update["action." + common.db.encode(action)] = true;
        common.db.collection("systemlogs").update({_id: "meta_v2"}, {$set: update}, {upsert: true}, function() {});
    }
}(pluginOb));

module.exports = pluginOb;