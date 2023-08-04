var plugins = require('../../pluginManager.js');
var common = require('../../../api/utils/common.js');
var fetch = require('../../../api/parts/data/fetch.js');
var countlyModel = require('../../../api/lib/countly.model.js');
var {validateRead, validateUpdate} = require('../../../api/utils/rights.js');

const FEATURE_NAME = 'sdk';

plugins.register("/permissions/features", function(ob) {
    ob.features.push(FEATURE_NAME);
});

(function() {

    plugins.register("/o/sdk", function(ob) {
        var params = ob.params;
        if (params.qstring.method !== "sc") {
            return false;
        }
        return new Promise(function(resolve) {
            getSDKConfig(params).then(function(config) {
                delete config._id;
                config.v = 1;
                config.t = Date.now();
                config.c = config.config || {};
                delete config.config;
                common.returnOutput(params, config);
            })
                .catch(function(err) {
                    common.returnMessage(params, 400, 'Error: ' + err);
                })
                .finally(function() {
                    resolve();
                });
        });
    });

    /**
     * @api {get} /o?method=sc Get SDK config
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
            "tracking":false,
            "networking":false,
            "crashes":false,
            "views":false,
            "heartbeat":61,
            "event_queue":11,
            "request_queue":1001
        }
     * }
     */
    plugins.register("/o", function(ob) {
        var params = ob.params;

        if (params.qstring.method === "sdk-config") {
            validateRead(params, FEATURE_NAME, function() {
                getSDKConfig(params).then(function(res) {
                    common.returnOutput(params, res.config || {});
                })
                    .catch(function(err) {
                        common.returnMessage(params, 400, 'Error: ' + err);
                    });
            });

            return true;
        }
    });

    plugins.register("/i/sdk-config", function(ob) {
        var params = ob.params,
            paths = ob.paths;

        switch (paths[3]) {
        case 'update-parameter': validateUpdate(params, FEATURE_NAME, updateParameter);
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
                common.setCustomMetric(params, "sdks", params.app_id, ["q"], params.qstring.rr);
            }
            else {
                common.recordCustomMetric(params, "sdks", params.app_id, ["q"], parseInt(params.qstring.rr, 10) - parseInt(dbAppUser.rr, 10));
            }
        }
        else if (typeof dbAppUser.rr !== "undefined") {
            common.recordCustomMetric(params, "sdks", params.app_id, ["q"], -1);
        }

        //record request delay
        common.recordCustomMeasurement(params, "sdks", params.app_id, ["d"], Math.round(Math.max(Date.now() - params.time.mstimestamp, 0) / 1000));
    });

    plugins.register("/sdk/user_properties", async function(ob) {
        var params = ob.params;

        if (params.qstring.rr) {
            ob.updates.push({$set: {rr: parseInt(params.qstring.rr, 10)}});
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
     * Updated SDK config
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
}());