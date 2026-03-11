var plugins = require('../../pluginManager.js');
var common = require('../../../api/utils/common.js');
var fetch = require('../../../api/parts/data/fetch.js');
var countlyModel = require('../../../api/lib/countly.model.js');
var {validateRead, validateUpdate} = require('../../../api/utils/rights.js');

const FEATURE_NAME = 'sdk';
const validOptions = [
    "tracking",
    "networking",
    "crt",
    "vt",
    "st",
    "cet",
    "ecz",
    "cr",
    "sui",
    "eqs",
    "rqs",
    "czi",
    "dort",
    "scui",
    "lkl",
    "lvs",
    "lsv",
    "lbc",
    "ltlpt",
    "ltl",
    "lt",
    "rcz",
    "bom",
    "bom_at",
    "bom_rqp",
    "bom_ra",
    "bom_d",
    "upcl", // user property cache. dart only
    "ew", // event whitelist dart only
    "upw", // user property whitelist dart only
    "sw", // segment whitelist dart only
    "esw", // event segment whitelist dart only
    "eb", // event blacklist dart only
    "upb", // user property blacklist dart only
    "sb", // segment blacklist dart only
    "esb" // event segment blacklist dart only
];

plugins.register("/permissions/features", function(ob) {
    ob.features.push(FEATURE_NAME);
});

(function() {

    /**
     * @api {get} /o/sdk?method=sc Get SDK config
     * @apiName GetSDKConfig
     * @apiGroup SDK Config
     * @apiPermission app
     * @apiDescription Get SDK configuration for this SDK and this user
     *
     * @apiQuery {String} app_key Application key
     *
     * @apiSuccess {Object} v - version 
     * @apiSuccess {Object} t - timestamp
     * @apiSuccess {Object} c - sdk config
     *
     * @apiSuccessExample {json} Success-Response:
     * {
        "v":1,
        "t":1682328445330,
        "c":{
            "tracking":true,
            "networking":true,
            "crt":true,
            "vt":true,
            "st":true,
            "cet":true,
            "ecz":true,
            "cr":true,
            "sui":true,
            "eqs":true,
            "rqs":true,
            "czi":true,
            "dort":true,
            "scui":true,
            "lkl":true,
            "lvs":true,
            "lsv":true,
            "lbc":true,
            "ltlpt":true,
            "ltl":true,
            "lt":true,
            "rcz":true
            "bom": true,
            "bom_at": 10,
            "bom_rqp": 0.5,
            "bom_ra": 24,
            "bom_d": 60
        }
     * }
     */
    plugins.register("/o/sdk", function(ob) {
        var params = ob.params;
        if (params.qstring.method !== "sc") {
            return false;
        }
        return getSDKConfig(params).then(function(config) {
            delete config._id;
            let cc = config.config || {};
            if (typeof cc.bom_rqp !== "undefined") {
                cc.bom_rqp = cc.bom_rqp / 100;
            }
            config.v = 2;
            config.t = Date.now();
            config.c = cc;

            return getEnforcement(params).then(function(enforcement) {
                if (enforcement && enforcement.enforcement) {
                    for (let key in config.c) {
                        if (enforcement.enforcement[key] === false) {
                            delete config.c[key];
                        }
                    }
                }
                delete config.config;
                common.returnOutput(params, config);
            });
        }).catch(function(err) {
            common.returnMessage(params, 400, 'Error: ' + err);
        });
    });

    /**
     * @api {get} /o?method=config-upload Save SDK config
     * @apiName SaveSDKConfig
     * @apiGroup SDK Config
     * @apiPermission admin
     * @apiDescription Save SDK configuration for the given app
     * 
     * @apiQuery {String} app_id Application ID
     * @apiQuery {String} config SDK config object
     * 
     * @apiSuccess {json} Success-Response:
     * {
     *     "result": "Success"
     * }
     */
    plugins.register("/o", function(ob) {
        var params = ob.params;

        // returns server config for the given app (regardless of enforcement, can be useful)
        if (params.qstring.method === "sdk-config") {
            validateRead(params, FEATURE_NAME, function() {
                getSDKConfig(params).then(function(res) {
                    // TODO: check if filtering is needed here too
                    common.returnOutput(params, res.config || {});
                })
                    .catch(function(err) {
                        common.returnMessage(params, 400, 'Error: ' + err);
                    });
            });

            return true;
        }

        // saves the given server configuration for the given app
        if (params.qstring.method === "config-upload") {
            return new Promise(function(resolve) {
                validateUpdate(params, FEATURE_NAME, function() {
                    var uploadConfig = params.qstring.config;
                    if (uploadConfig && typeof uploadConfig === "string") {
                        try {
                            uploadConfig = JSON.parse(uploadConfig);
                        }
                        catch (ex) {
                            common.returnMessage(params, 400, 'Invalid config format');
                            return resolve();
                        }
                    }

                    if (!uploadConfig || typeof uploadConfig !== "object") {
                        common.returnMessage(params, 400, 'Config must be a valid object');
                        return resolve();
                    }

                    var configToSave = uploadConfig.c || uploadConfig; // incase they provide the config object directly
                    for (var key in configToSave) {
                        if (validOptions.indexOf(key) === -1) {
                            delete configToSave[key];
                        }
                    }

                    common.outDb.collection('sdk_configs').updateOne(
                        {_id: params.qstring.app_id + ""},
                        {$set: {config: configToSave}},
                        {upsert: true},
                        function(err) {
                            if (err) {
                                common.returnMessage(params, 500, 'Error saving config to database');
                            }
                            else {
                                common.returnOutput(params, {result: 'Success'});
                            }
                            resolve();
                        }
                    );
                });
            });
        }

        // returns enforcement info for the given app
        if (params.qstring.method === "sdk-enforcement") {
            validateRead(params, FEATURE_NAME, function() {
                getEnforcement(params).then(function(res) {
                    common.returnOutput(params, res.enforcement || {});
                })
                    .catch(function(err) {
                        common.returnMessage(params, 400, 'Error: ' + err);
                    });
            });
            return true;
        }

        return false;
    });

    plugins.register("/i/sdk-config", function(ob) {
        var params = ob.params,
            paths = ob.paths;

        switch (paths[3]) {
        case 'update-parameter': validateUpdate(params, FEATURE_NAME, updateParameter);
            break;
        case 'update-enforcement':
            validateUpdate(params, FEATURE_NAME, function() {
                if (!params.app_id) {
                    return common.returnMessage(params, 400, 'Missing parameter "app_id"');
                }
                var enforcement = params.qstring.enforcement;
                if (typeof enforcement === "string") {
                    try {
                        enforcement = JSON.parse(enforcement);
                    }
                    catch (SyntaxError) {
                        return common.returnMessage(params, 400, 'Error parsing enforcement');
                    }
                }
                if (typeof enforcement !== "object") {
                    return common.returnMessage(params, 400, 'Wrong enforcement format');
                }
                // check remove enforcement options those are not in validOptions
                for (var key in enforcement) {
                    if (validOptions.indexOf(key) === -1) {
                        delete enforcement[key];
                    }
                }
                common.outDb.collection('sdk_enforcement').updateOne(
                    { _id: params.app_id + "" },
                    { $set: { enforcement: enforcement } },
                    { upsert: true },
                    function(err) {
                        if (err) {
                            common.returnMessage(params, 500, 'Error saving enforcement to database');
                        }
                        else {
                            common.returnOutput(params, { result: 'Success' });
                        }
                    }
                );
            });
            break;
        default: common.returnMessage(params, 404, 'Invalid endpoint');
            break;
        }
        return true;
    });

    plugins.register("/session/metrics", function(ob) {
        var predefinedMetrics = ob.predefinedMetrics;
        if (ob.params.qstring.sdk_name && ob.params.qstring.sdk_version) {
            ob.params.user.sdk_name = ob.params.qstring.sdk_name;
            ob.params.user.sdk_version = "[" + ob.params.qstring.sdk_name + "]_" + ob.params.qstring.sdk_version;
            predefinedMetrics.push({
                db: "sdks",
                metrics: [
                    {
                        is_user_prop: true,
                        name: "sdk_name",
                        set: "sdks",
                        short_code: "sdk.name"
                    },
                    {
                        is_user_prop: true,
                        name: "sdk_version",
                        set: "sdk_version",
                        short_code: "sdk.version"
                    }
                ]
            });
        }
    });

    plugins.register("/metric/collection", function(ob) {
        if (ob.metric === "sdks") {
            ob.data = ["sdks", "sdks"];
        }
        else if (ob.metric === "sdk_version") {
            ob.data = ["sdks", "sdk_version"];
        }
    });

    plugins.register("/o", function(ob) {
        var params = ob.params;

        if (params.qstring.method === "sdks") {
            validateRead(params, FEATURE_NAME, fetch.fetchTimeObj, 'sdks');
            return true;
        }
        return false;
    });

    //process session being
    plugins.register("/sdk/log", function(ob) {
        var params = ob.params;
        var dbAppUser = params.app_user || {};

        var reqType = [];
        var accepts = [
            "consent",
            "begin_session",
            "session_duration",
            "end_session",
            "old_device_id",
            "campaign_id",
            "user_details",
            "apm",
            "crash",
            "events",
            "token_session",
            "hc"
        ];
        for (var i in params.qstring) {
            if (accepts.indexOf(i) !== -1) {
                reqType.push(i);
            }
        }
        if (params.qstring.method) {
            reqType.push(params.qstring.method);
        }

        common.recordCustomMetric(params, "sdks", params.app_id, ["r"], 1, {type: reqType});
        if (params.cancelRequest) {
            var segments = {reason: params.cancelRequest};
            if (params.cancelRequest.startsWith("Blocked by rule")) {
                segments.reason = "Blocked by rule";
            }
            common.recordCustomMetric(params, "sdks", params.app_id, ["c"], 1, segments);
        }
        if (params.qstring.rr) {
            if (typeof dbAppUser.rr === "undefined") {
                common.recordCustomMetric(params, "sdks", params.app_id, ["q"], parseInt(params.qstring.rr, 10));
            }
            else {
                common.recordCustomMetric(params, "sdks", params.app_id, ["q"], parseInt(params.qstring.rr, 10) - parseInt(dbAppUser.rr, 10));
            }
        }

        //record request delay
        common.recordCustomMeasurement(params, "sdks", params.app_id, ["d"], Math.round(Math.max(Date.now() - params.time.mstimestamp, 0) / 1000));
        if (params.qstring.hc) {
            if (typeof params.qstring.hc === "string") {
                try {
                    params.qstring.hc = JSON.parse(params.qstring.hc);
                }
                catch (ex) {
                    console.log(params.qstring.hc);
                    console.log("Parse hc failed", ex);
                }
            }
            common.recordCustomMetric(params, "sdks", params.app_id, ["hc_hc"]);
            if (params.qstring.hc.el) {
                common.recordCustomMetric(params, "sdks", params.app_id, ["hc_el"], parseInt(params.qstring.hc.el, 10));
            }
            if (params.qstring.hc.wl) {
                common.recordCustomMetric(params, "sdks", params.app_id, ["hc_wl"], parseInt(params.qstring.hc.wl, 10));
            }
            if (params.qstring.hc.sc) {
                common.recordCustomMetric(params, "sdks", params.app_id, ["hc_sc"], 1, {status: params.qstring.hc.sc});
            }
            if (params.qstring.hc.em) {
                common.recordCustomMetric(params, "sdks", params.app_id, ["hc_em"], 1, {error: params.qstring.hc.em});
            }
        }
    });

    plugins.register("/sdk/user_properties", async function(ob) {
        var params = ob.params;
        if (params.qstring.rr) {
            ob.updates.push({$set: {rr: parseInt(params.qstring.rr, 10)}});
        }

        if (params.qstring.hc) {
            if (typeof params.qstring.hc === "string") {
                try {
                    params.qstring.hc = JSON.parse(params.qstring.hc);
                }
                catch (ex) {
                    console.log(params.qstring.hc);
                    console.log("Parse hc failed", ex);
                }
            }
            ob.updates.push({$set: {hc: params.qstring.hc}});
        }
    });

    plugins.register("/i/apps/clear_all", function(ob) {
        var appId = ob.appId;
        common.db.collection('sdks').remove({'_id': {$regex: appId + ".*"}}, function() {});
    });

    plugins.register("/i/apps/clear", function(ob) {
        var appId = ob.appId;
        var ids = ob.ids;
        common.db.collection('sdks').remove({$and: [{'_id': {$regex: appId + ".*"}}, {'_id': {$nin: ids}}]}, function() {});
    });

    plugins.register("/i/apps/delete", function(ob) {
        var appId = ob.appId;
        common.outDb.collection('sdk_configs').deleteOne({_id: appId + ""}, function() {});
        common.db.collection('sdks').remove({'_id': {$regex: appId + ".*"}}, function() {});
    });

    plugins.register("/i/apps/reset", function(ob) {
        var appId = ob.appId;
        common.outDb.collection('sdk_configs').deleteOne({_id: appId + ""}, function() {});
        common.db.collection('sdks').remove({'_id': {$regex: appId + ".*"}}, function() {});

    });

    plugins.register("/dashboard/data", function(ob) {
        return new Promise((resolve) => {
            var params = ob.params;
            var widget = ob.widget;
            var apps = ob.apps;
            var appId = widget.apps && widget.apps[0];
            var visualization = ob.widget.visualization;
            var segment = "sdk_version";
            var dashData = {};

            if (widget.widget_type === "sdk") {
                var period = widget.custom_period || params.qstring.period;
                if (period.since) {
                    period = [period.since, Date.now()];
                }
                var paramsObj = {
                    app_id: appId,
                    appTimezone: apps[appId] && apps[appId].timezone,
                    qstring: {
                        period: period
                    },
                    time: common.initTimeObj(apps[appId] && apps[appId].timezone, params.qstring.timestamp)
                };

                fetch.getTimeObj("sdks", paramsObj, function(data) {
                    fetch.getTotalUsersObj("sdks", paramsObj, function(dbTotalUsersObj) {
                        var formattedUserObj = fetch.formatTotalUsersObj(dbTotalUsersObj);

                        var model = countlyModel.load("sdk");

                        model.setPeriod(paramsObj.qstring.period);
                        model.setDb(data);
                        model.setSDK(widget.selectedSDK);

                        if (formattedUserObj) {
                            model.setTotalUsersObj(formattedUserObj);
                        }

                        /**
                         * Can widget.metrics be null? Not sure.
                         * For Session data type and all its visualizations metrics are required,
                         * so it shouldn't be null imo.
                         * widget.metrics = widget.metrics || model.getMetrics();
                         * Code on master has above line, not sure when its required,
                         * Lets not add it yet and see what happens.
                         */
                        var widgetMetrics = JSON.parse(JSON.stringify(widget.metrics));

                        if (widgetMetrics.indexOf("u") !== -1) {
                            if (widgetMetrics.indexOf("t") === -1) {
                                widgetMetrics.push("t");
                            }
                            if (widgetMetrics.indexOf("n") === -1) {
                                widgetMetrics.push("n");
                            }
                        }

                        if (widgetMetrics.indexOf("n") !== -1) {
                            if (widgetMetrics.indexOf("u") === -1) {
                                widgetMetrics.push("u");
                            }
                        }

                        model.setMetrics(widgetMetrics);
                        var widgetData;

                        switch (visualization) {
                        case 'bar-chart':
                        case 'pie-chart':
                            var totals = {};
                            totals[widget.metrics[0]] = 0;
                            var graph = model.getBars(segment, -1);
                            for (var z in graph) {
                                totals[widget.metrics[0]] += graph[z].value;
                            }

                            widgetData = {"total": totals, "graph": model.getBars(segment, 10)};

                            break;
                        case 'table':
                            widgetData = model.getTableData(segment, 10);
                            break;
                        case 'time-series':
                            widgetData = model.getStackedBarData(segment, 10, widget.metrics[0] || "u", widget.displaytype || "percentage");
                            break;
                        default:
                            break;
                        }

                        dashData.isValid = true;
                        dashData.data = {};
                        dashData.data[appId] = widgetData;
                        widget.dashData = dashData;
                        return resolve();
                    });
                });
            }
            else {
                return resolve();
            }
        });
    });

    /**
     * Updates SDK config (used internally when configuration is changed in the dashboard)
     * @param {params} params - request params
     * @returns {void}
     */
    function updateParameter(params) {
        var parameter = params.qstring.parameter;
        if (typeof parameter === "string") {
            try {
                parameter = JSON.parse(parameter);
            }
            catch (SyntaxError) {
                console.log('Error parsing parameter', parameter);
                return common.returnMessage(params, 400, 'Error parsing parameter');
            }
        }
        if (!params.app_id) {
            return common.returnMessage(params, 400, 'Missing parameter "app_id"');
        }
        common.outDb.collection('sdk_configs').updateOne({_id: params.app_id + ""}, {$set: {config: parameter} }, {upsert: true}, function() {
            common.returnOutput(params, {result: 'Success'});
        });
    }

    /**
     * Function to get all remote configs
     * @param  {Object} params - params object
     * @returns {String} response
     */
    function getSDKConfig(params) {
        return new Promise(function(resolve, reject) {
            common.outDb.collection('sdk_configs').findOne({_id: params.app_id + ""}, function(err, res) {
                if (err) {
                    console.log(err);
                    return reject();
                }
                return resolve(res || {});
            });
        });
    }

    /**
     * Function to get enforcement info for the given app
     * @param  {Object} params - params object
     * @returns {Promise} response
     */
    function getEnforcement(params) {
        return new Promise(function(resolve, reject) {
            common.outDb.collection('sdk_enforcement').findOne({ _id: params.app_id + ""}, function(err, res) {
                if (err) {
                    console.log(err);
                    return reject();
                }
                return resolve(res || {});
            });
        });
    }
}());
