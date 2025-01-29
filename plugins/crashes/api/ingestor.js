var plugin = {},
    common = require('../../../api/utils/common.js'),
    //log = common.log('crashes:ingestor'),
    fs = require("fs"),
    path = require("path"),
    trace = require("./parts/stacktrace.js"),
    { DEFAULT_MAX_CUSTOM_FIELD_KEYS } = require('./parts/custom_field.js'),
    plugins = require('../../pluginManager.js');

const FEATURE_NAME = 'crashes';

plugins.setConfigs("crashes", {
    report_limit: 100,
    grouping_strategy: "error_and_file",
    smart_preprocessing: true,
    smart_regexes: "{.*?}\n/.*?/",
    same_app_version_crash_update: false,
    max_custom_field_keys: DEFAULT_MAX_CUSTOM_FIELD_KEYS,
    activate_custom_field_cleanup_job: false,
});

fs.chmod(path.resolve(__dirname + "/../bin/minidump_stackwalk"), 0o744, function(err) {
    if (err && !process.env.COUNTLY_CONTAINER) {
        console.log(err);
    }
});

var segments = ["os_version", "os_name", "manufacture", "device", "resolution", "app_version", "cpu", "opengl", "orientation", "view", "browser"];
var bools = {"root": true, "online": true, "muted": true, "signal": true, "background": true};
plugins.internalDrillEvents.push("[CLY]_crash");

(function() {
    plugins.register("/permissions/features", function(ob) {
        ob.features.push(FEATURE_NAME);
    });

    plugins.internalDrillEvents.push("[CLY]_crash");

    //write api call
    plugins.register("/sdk/process_user", function(ob) {
        return new Promise(function(resolve) {
            var params = ob.params;
            if (typeof params.qstring.crash === "string") {
                try {
                    params.qstring.crash = JSON.parse(params.qstring.crash);
                }
                catch (SyntaxError) {
                    console.log('Parse crash JSON failed', params.qstring.crash, params.req.url, params.req.body);
                    resolve();
                    return false;
                }
            }

            if (params.qstring.crash && params.qstring.crash._error && params.qstring.crash._app_version && params.qstring.crash._os) {
                var props = [
                    //device metrics
                    "os",
                    "os_version",
                    "manufacture", //may not be provided for ios or be constant, like Apple
                    "device", //model for Android, iPhone1,1 etc for iOS
                    "resolution",
                    "app_version",
                    "cpu", //type of cpu used on device (for ios will be based on device)
                    "opengl", //version of open gl supported
                    "view", //screen, view or page where error happened
                    "browser", //browser in which error happened, if applicable

                    //state of device
                    "ram_current", //in megabytes
                    "ram_total",
                    "disk_current", //in megabytes
                    "disk_total",
                    "bat_current", //battery level, probably usually from 0 to 100
                    "bat_total", //but for consistency also provide total
                    "bat", //or simple value from 0 to 100
                    "orientation", //in which device was held, landscape, portrait, etc

                    //bools
                    "root", //true if device is rooted/jailbroken, false or not provided if not
                    "online", //true if device is connected to the internet (WiFi or 3G), false or not provided if not connected
                    "muted", //true if volume is off, device is in muted state
                    "signal", //true if have cell/gsm signal or is not in airplane mode, false when no gsm signal or in airplane mode
                    "background", //true if app was in background when it crashed

                    //error info
                    "name", //optional if provided by OS/Platform, else will use first line of stack
                    "type", //optional type of the error
                    "error", //error stack
                    "nonfatal", //true if handled exception, false or not provided if crash
                    "logs", //some additional logs provided, if any
                    "run", //running time since app start in seconds

                    //build specific fields
                    "architecture",
                    "app_build",
                    "binary_images",
                    "build_uuid",
                    "executable_name",
                    "load_address",
                    "native_cpp",
                    "javascript",
                    "plcrash",
                    "binary_crash_dump",
                    "unprocessed",

                    //custom key/values provided by developers
                    "custom"
                ];

                trace.preprocessCrash(params.qstring.crash, function(error) {
                    if (error && error !== "") {
                        var report = {};
                        for (let i = 0, l = props.length; i < l; i++) {
                            if (typeof params.qstring.crash["_" + props[i]] !== "undefined") {
                                if (bools[props[i]]) {
                                    if (params.qstring.crash["_" + props[i]] + "" === "false") {
                                        report[props[i]] = "false";
                                    }
                                    else if (params.qstring.crash["_" + props[i]] + "" === "true") {
                                        report[props[i]] = "true";
                                    }
                                }
                                else if (segments[props[i]]) {
                                    report[props[i]] = params.qstring.crash["_" + props[i]] + "";
                                }
                                else if (props[i] === "custom") {
                                    report[props[i]] = {};
                                    for (let key in params.qstring.crash["_" + props[i]]) {
                                        let safeKey = key.replace(/^\$/, "").replace(/\./g, ":");
                                        if (safeKey) {
                                            report[props[i] + "_" + safeKey] = params.qstring.crash["_" + props[i]][key];
                                        }
                                    }
                                }
                                else {
                                    report[props[i]] = params.qstring.crash["_" + props[i]];
                                }
                            }
                        }

                        if (report.binary_images && typeof report.binary_images === "object") {
                            var needs_regeneration = false;
                            for (let k in report.binary_images) {
                                if (!report.binary_images[k].bn) {
                                    report.binary_images[k].bn = k;
                                    needs_regeneration = true;
                                }
                            }
                            if (needs_regeneration) {
                                var newObj = {};
                                for (let k in report.binary_images) {
                                    newObj[report.binary_images[k].bn + "-" + report.binary_images[k].la] = report.binary_images[k];
                                }
                                report.binary_images = newObj;
                            }

                            report.binary_images = JSON.stringify(report.binary_images);
                        }
                        report.nonfatal = (report.nonfatal && report.nonfatal !== "false") ? "true" : "false";
                        report.not_os_specific = (params.qstring.crash._not_os_specific) ? "true" : "false";
                        var seed = error + params.app_id + report.nonfatal + "";
                        if (!params.qstring.crash._not_os_specific) {
                            seed = report.os + seed;
                        }
                        var hash = common.crypto.createHash('sha1').update(seed).digest('hex');
                        report.group = hash;
                        if (!report.name) {
                            report.name = (report.error.split('\n')[0] + "").trim();
                        }
                        params.qstring.events.push({
                            key: "[CLY]_crash",
                            count: 1,
                            segmentation: report
                        });
                    }
                    resolve();
                });
            }
            else {
                resolve();
            }
        });
    });

}(plugin));

module.exports = plugin;
