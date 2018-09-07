var plugin = {},
    common = require('../../../api/utils/common.js'),
    plugins = require('../../pluginManager.js');

(function(plugin) {
    //write api call
    plugins.register("/sdk", function(ob) {
        var params = ob.params;
        if (!params.retry_request) {
            var now = Math.round(new Date().getTime() / 1000);
            var ts = common.initTimeObj(null, params.qstring.timestamp || now).timestamp;
            var device = {};
            device.id = params.qstring.device_id || "";
            var location = {};
            var sdk = {};
            sdk.version = params.qstring.sdk_version;
            sdk.name = params.qstring.sdk_name;
            var q = JSON.stringify(params.qstring);
            var version = (params.qstring.metrics) ? (params.qstring.metrics._app_version || "") : "";
            var result = params.app_user;
            if (result) {
                if (result.d) {
                    device.d = result.d;
                }
                if (result.p) {
                    device.p = result.p;
                }
                if (result.pv) {
                    device.pv = result.pv;
                }

                if (result.cc) {
                    location.cc = result.cc;
                }
                if (result.cty) {
                    location.cty = result.cty;
                }
                version = result.av || version;
            }
            var problems = [];
            var types = {};
            if (params.qstring.old_device_id) {
                if (!types.change_id) {
                    types.change_id = {};
                }
                types.change_id.old_device_id = params.qstring.begin_session;
                types.change_id.device_id = params.qstring.device_id;
            }
            if (params.qstring.begin_session) {
                if (!types.session) {
                    types.session = {};
                }
                types.session.begin_session = params.qstring.begin_session;
            }
            if (params.qstring.session_duration) {
                if (!types.session) {
                    types.session = {};
                }
                types.session.session_duration = params.qstring.session_duration;
            }
            if (params.qstring.end_session) {
                if (!types.session) {
                    types.session = {};
                }
                types.session.end_session = params.qstring.end_session;
            }
            if (params.qstring.metrics) {
                types.metrics = params.qstring.metrics;
                if (types.metrics && typeof types.metrics === "object") {
                    types.metrics = JSON.stringify(types.metrics);
                }
                try {
                    JSON.parse(types.metrics);
                }
                catch (ex) {
                    problems.push("Could not parse metrics");
                }
            }
            if (params.qstring.consent) {
                types.consent = params.qstring.consent;
                if (types.consent && typeof types.consent === "object") {
                    types.consent = JSON.stringify(types.consent);
                }
                try {
                    JSON.parse(types.consent);
                }
                catch (ex) {
                    problems.push("Could not parse consent");
                }
            }
            if (params.qstring.events) {
                types.events = params.qstring.events;
                if (types.events && typeof types.events === "object") {
                    types.events = JSON.stringify(types.events);
                }
                try {
                    JSON.parse(types.events);
                }
                catch (ex) {
                    problems.push("Could not parse events");
                }
            }
            if (params.qstring.user_details) {
                types.user_details = params.qstring.user_details;
                if (types.user_details && typeof types.user_details === "object") {
                    types.user_details = JSON.stringify(types.user_details);
                }
                try {
                    JSON.parse(types.user_details);
                }
                catch (ex) {
                    problems.push("Could not parse user_details");
                }
            }
            if (params.qstring.crash) {
                types.crash = params.qstring.crash;
                if (types.crash && typeof types.crash === "object") {
                    types.crash = JSON.stringify(types.crash);
                }
                var res;
                try {
                    res = JSON.parse(types.crash);
                }
                catch (ex) {
                    problems.push("Could not parse crash");
                }
                if (res) {
                    if (!res._error) {
                        problems.push("Crash missing _error property");
                    }
                    if (!res._app_version) {
                        problems.push("Crash missing _app_version property");
                    }
                    if (!res._os && params.app.type !== "web") {
                        problems.push("Crash missing _os property");
                    }
                }
            }

            if (params.app.type !== "web" && params.qstring.sdk_name === "javascript_native_web") {
                problems.push("App is not web type, but receives data from Web SDK");
            }
            setTimeout(function() {
                common.db.collection('logs' + params.app_id).insert({
                    ts: ts,
                    reqts: now,
                    d: device,
                    l: location,
                    v: version,
                    t: types,
                    q: q,
                    s: sdk,
                    h: params.req.headers,
                    m: params.req.method,
                    b: params.bulk || false,
                    c: (params.cancelRequest) ? params.cancelRequest : false,
                    p: (problems.length) ? problems : false
                }, function() {});
            }, 1000);
        }
    });

    //read api call
    plugins.register("/o", function(ob) {
        var params = ob.params;
        var validate = ob.validateUserForDataReadAPI;
        if (params.qstring.method == 'logs') {
            var filter = {};
            if (typeof params.qstring.filter !== "undefined") {
                try {
                    filter = JSON.parse(params.qstring.filter);
                }
                catch (ex) {
                    filter = {};
                }
            }
            validate(params, function(params) {
                common.db.collection('logs' + params.app_id).find(filter).toArray(function(err, items) {
                    if (err) {
                        console.log(err);
                    }
                    common.returnOutput(params, items || []);
                });
            });
            return true;
        }
        if (params.qstring.method == 'collection_info') {
            validate(params, function(params) {
                common.db.collection('logs' + params.app_id).stats(function(err, stats) {
                    if (err) {
                        console.log(err);
                    }
                    common.returnOutput(params, stats && {capped: stats.capped, max: stats.max} || {});
				  });
            });
            return true;
        }
    });


    plugins.register("/i/apps/create", function(ob) {
        var params = ob.params;
        var appId = ob.appId;
        common.db.command({"convertToCapped": 'logs' + appId, size: 10000000, max: 1000}, function(err, data) {
            if (err) {
                common.db.createCollection('logs' + appId, {capped: true, size: 10000000, max: 1000}, function(err, data) {});
            }
        });
    });
    plugins.register("/i/apps/delete", function(ob) {
        var appId = ob.appId;
        common.db.collection('logs' + appId).drop(function() {});
    });
    plugins.register("/i/apps/reset", function(ob) {
        var appId = ob.appId;
        common.db.collection('logs' + appId).drop(function() {
            common.db.createCollection('logs' + appId, {capped: true, size: 10000000, max: 1000}, function() {});
        });
    });

    plugins.register("/i/apps/clear_all", function(ob) {
        var appId = ob.appId;
        common.db.collection('logs' + appId).drop(function() {
            common.db.createCollection('logs' + appId, {capped: true, size: 10000000, max: 1000}, function() {});
        });
    });
}(plugin));

module.exports = plugin;