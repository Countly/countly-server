var plugins = require('../../pluginManager.js');
var common = require('../../../api/utils/common.js');

(function() {
    plugins.register("/sdk/process_request", function(ob) {
        if (ob.params.qstring.sdk_name && ob.params.qstring.sdk_version) {
            ob.params.user.sdk_name = ob.params.qstring.sdk_name;
            ob.params.user.sdk_version = "[" + ob.params.qstring.sdk_name + "]_" + ob.params.qstring.sdk_version;
            ob.params.collectedMetrics["sdk.name"] = ob.params.qstring.sdk_name;
            ob.params.collectedMetrics["sdk.version"] = ob.params.qstring.sdk_version;
        }
    });

    //Process aggregated data for sdk metrics
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
        if (!params.time) {
            params.time = common.initTimeObj(params.appTimezone, params.qstring?.timestamp);
        }
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

    plugins.register("/session/metrics", function(ob) {
        var predefinedMetrics = ob.predefinedMetrics;
        if (ob.params.qstring.sdk_name && ob.params.qstring.sdk_version) {
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

    plugins.register("/sdk/process_user", async function(ob) {
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
})();