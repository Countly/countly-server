var exported = {},
    common = require('../../../api/utils/common.js'),
    plugins = require('../../pluginManager.js'),
    automaticStateManager = require('./helpers/automaticStateManager'),
    log = require('../../../api/utils/log.js')('logger:api'),
    { validateRead } = require('../../../api/utils/rights.js');

const FEATURE_NAME = 'logger';

var RequestLoggerStateEnum = {
    ON: "on",
    OFF: "off",
    AUTOMATIC: "automatic"
};
Object.freeze(RequestLoggerStateEnum);

plugins.setConfigs("logger", {
    state: RequestLoggerStateEnum.AUTOMATIC,
    limit: 1000,
});

(function() {

    plugins.register("/permissions/features", function(ob) {
        ob.features.push(FEATURE_NAME);
    });

    var shouldLogRequest = function(requestLoggerConfiguration) {
        if (requestLoggerConfiguration.state === RequestLoggerStateEnum.ON) {
            return true;
        }
        if (requestLoggerConfiguration.state === RequestLoggerStateEnum.AUTOMATIC) {
            automaticStateManager.updateOnIncomingRequest();
            return !automaticStateManager.shouldTurnOffRequestLogger(requestLoggerConfiguration.limit);
        }
        return false;
    };

    var getRequestLoggerConfiguration = function(params) {
        return plugins.getConfig("logger", params.app && params.app.plugins, true);
    };

    var turnRequestLoggerOffIfNecessary = function(params, requestLoggerConfiguration) {
        if (requestLoggerConfiguration.state === RequestLoggerStateEnum.AUTOMATIC && automaticStateManager.shouldTurnOffRequestLogger(requestLoggerConfiguration.limit)) {
            plugins.updateApplicationConfigs(common.db, params.app._id, "logger", Object.assign(requestLoggerConfiguration, {state: RequestLoggerStateEnum.OFF}));
        }
    };

    var processSDKRequest = function(params) {
        log.d("Explicitly set logging_is_allowed => ", params.logging_is_allowed);
        const requestLoggerConfiguration = getRequestLoggerConfiguration(params);
        log.d("Logging config => ", requestLoggerConfiguration);
        log.d("Should Log request? => ", shouldLogRequest(requestLoggerConfiguration));
        if (params.logging_is_allowed && shouldLogRequest(requestLoggerConfiguration)) {
            params.log_processed = true;
            var now = new Date().getTime();
            var ts = common.initTimeObj(null, params.qstring.timestamp || now).mstimestamp;
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
            var response = {};
            if (params.qstring.old_device_id) {
                if (!types.change_id) {
                    types.change_id = {};
                }
                types.change_id.old_device_id = params.qstring.old_device_id;
                types.change_id.device_id = params.qstring.device_id;
            }
            if (params.old_device_id) {
                //Set for logging by the FETCH API
                if (!types.change_id) {
                    types.change_id = {};
                }
                types.change_id.old_device_id = params.old_device_id;
                types.change_id.device_id = params.qstring.device_id;
                q = JSON.parse(q);
                q.old_device_id = params.old_device_id;
                q = JSON.stringify(q);
            }
            if (params.qstring.token_session) {
                if (!types.token) {
                    types.token = {};
                }
                types.token.token_session = params.qstring.token_session;
                if (params.qstring.ios_token) {
                    types.token.ios_token = params.qstring.ios_token;
                }
                if (params.qstring.android_token) {
                    types.token.android_token = params.qstring.android_token;
                }
                if (typeof params.qstring.test_mode !== "undefined") {
                    types.token.test_mode = params.qstring.test_mode;
                }
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
                if (!plugins.isPluginEnabled("compliance-hub")) {
                    problems.push("Plugin that processes this information is not enabled: compliance-hub");
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
                if (!plugins.isPluginEnabled("users")) {
                    problems.push("Plugin that processes this information is not enabled: users");
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
                    if (!res._os && !res._not_os_specific) {
                        problems.push("Crash missing _os property");
                    }
                    if (!plugins.isPluginEnabled("crashes")) {
                        problems.push("Plugin that processes this information is not enabled: crashes");
                    }
                }
            }

            if (params.qstring.apm && !plugins.isPluginEnabled("performance-monitoring")) {
                problems.push("Plugin that processes this information is not enabled: performance-monitoring");
            }

            if ((params.qstring.method === "fetch_remote_config") && !plugins.isPluginEnabled("remote-config")) {
                problems.push("Plugin that processes this information is not enabled: remote-config");
            }

            if (params.response) {
                response = params.response || {};
                if (response.body) {
                    try {
                        response.body = JSON.parse(response.body);
                    }
                    catch (ex) {
                        console.log("Response data parse failure", params.response);
                    }
                }
                response = JSON.stringify(response);
            }

            var insertData = {
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
                res: response
            };

            log.d("problems found", problems);

            plugins.dispatch("/log", { params: params, insertData: insertData, problems: problems }, function() {
                //Set problems after log event dispatched
                insertData.p = (problems.length) ? problems : false;

                setTimeout(function() {
                    common.db.collection('logs' + params.app_id).insert(insertData, function() {});
                }, 1000);
            });
        }
        else {
            turnRequestLoggerOffIfNecessary(params, requestLoggerConfiguration);
        }
    };

    //write api call
    plugins.register("/sdk/log", function(ob) {
        ob.params.logging_is_allowed = !ob.params.retry_request && !ob.params.log_processed;
        processSDKRequest(ob.params);
    });

    //logging fetch api call
    plugins.register("/o/sdk/log", function(ob) {
        ob.params.logging_is_allowed = !ob.params.log_processed;
        processSDKRequest(ob.params);
    });

    //write api call
    plugins.register("/sdk/cancel", function(ob) {
        ob.params.logging_is_allowed = !ob.params.retry_request && !ob.params.log_processed;
        var params = ob.params;
        if (params.app) {
            processSDKRequest(params);
        }
        else {
            common.db.collection('apps').findOne({'key': params.qstring.app_key}, (err, app) => {
                if (!err && app) {
                    params.app_id = app._id;
                    params.app_cc = app.country;
                    params.app_name = app.name;
                    params.appTimezone = app.timezone;
                    params.app = app;
                    params.time = common.initTimeObj(params.appTimezone, params.qstring.timestamp);
                    processSDKRequest(params);
                }
            });
        }
    });

    //read api call
    plugins.register("/o", function(ob) {
        var params = ob.params;

        if (params.qstring.method === 'logs') {
            var filter = {};
            if (typeof params.qstring.filter !== "undefined") {
                try {
                    filter = JSON.parse(params.qstring.filter);
                }
                catch (ex) {
                    filter = {};
                }
            }

            validateRead(params, FEATURE_NAME, function(parameters) {
                common.db.collection('logs' + parameters.app_id).find(filter).limit(1000).toArray(function(err, items) {
                    if (err) {
                        console.log(err);
                    }
                    common.returnOutput(parameters, {logs: items || [], state: getRequestLoggerConfiguration(params).state});
                });
            });
            return true;
        }
        if (params.qstring.method === 'collection_info') {
            validateRead(params, FEATURE_NAME, function(parameters) {
                common.db.collection('logs' + parameters.app_id).stats(function(err, stats) {
                    if (err) {
                        console.log(err);
                    }
                    common.returnOutput(parameters, stats && {capped: stats.capped, max: stats.max} || {});
                });
            });
            return true;
        }
    });

    plugins.register("/i/apps/create", function(ob) {
        var appId = ob.appId;
        common.db.command({"convertToCapped": 'logs' + appId, size: 10000000, max: 1000}, function(err) {
            if (err) {
                common.db.createCollection('logs' + appId, {capped: true, size: 10000000, max: 1000}, function() {});
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
}(exported));

module.exports = exported;