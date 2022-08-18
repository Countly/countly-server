const exportedAssistantJob = {};
const log = require('../../../api/utils/log.js')('assistantJob:module');
const fetch = require('../../../api/parts/data/fetch.js');
const async = require("async");
const countlyModel = require('../../../api/lib/countly.model.js');
const countlySession = countlyModel.load("users");
const countlyCommon = require('../../../api/lib/countly.common.js');
const assistant = require("./assistant.js");
const _ = require('underscore');

(function(assistantJob) {
    const PLUGIN_NAME = "assistant-base";
    assistantJob.prepareNotifications = function(db, providedInfo) {
        return new Promise(function(resolve) {
            try {
                log.i('Creating assistant notifications from [%j]', PLUGIN_NAME);
                const NOTIFICATION_VERSION = 1;

                async.mapLimit(providedInfo.appsData, 10, function(ret_app_data, callback) {
                    //assistant plugin common fields
                    const apc = assistant.preparePluginSpecificFields(providedInfo, ret_app_data, PLUGIN_NAME);
                    //log.i('Doing next app [%j]', apc.app_id);

                    const globalParamsCopy = {};//todo make an easy way to create empty param
                    globalParamsCopy.qstring = {};
                    globalParamsCopy.appTimezone = ret_app_data.timezone;//todo add this to other places
                    db.collection('events').findOne({_id: apc.app_id}, {}, function(events_err, events_result) {
                        if (events_err !== null) {
                            log.w('Error while trying to find app with id:[%j], returned error:[%j]', apc.app_id, events_err);
                            callback(null);
                        }
                        else {
                            globalParamsCopy.app_id = apc.app_id;
                            globalParamsCopy.qstring.period = "7days";

                            countlyCommon.setTimezone(globalParamsCopy.appTimezone);
                            countlyCommon.setPeriod(globalParamsCopy.qstring.period);
                            fetch.getTimeObj('users', globalParamsCopy, {db: db}, function(fetchResultUsers) { //collect user info
                                //log.i('Assistant plugin doing steps: [%j] [%j]', 0.01, fetchResultUsers);
                                countlySession.setDb(fetchResultUsers);
                                const retSession = countlySession.getSessionData();
                                //log.i('Assistant plugin session data: [%j] [%j]', 0.02, retSession);
                                //log.i('Assistant plugin doing steps: [%j] [%j] [%j] [%j]', 0.1, params.app_id, apc.app_id);

                                async.parallelLimit([
                                    function(parallelCallback) {
                                        // (1) generate quick tip notifications
                                        // (1.1) Crash integration
                                        db.collection("app_crashgroups" + apc.app_id).findOne({_id: "meta"}, function(err_crash, res_crash) {
                                            //log.i('Assistant plugin doing steps: [%j][%j] ', 1, res_crash);
                                            if (res_crash || apc.flagForceGenerate) {
                                                {
                                                    if (res_crash === null) {
                                                        res_crash = {};
                                                        res_crash.crashes = 0;
                                                        res_crash.users = 0;
                                                    }
                                                    const anc = assistant.prepareNotificationSpecificFields(apc, "assistant.crash-integration", assistant.NOTIF_TYPE_QUICK_TIPS, 1, NOTIFICATION_VERSION);
                                                    const crash_data_not_available = res_crash.crashes === 0;
                                                    const enough_users = res_crash.users > 20;//total users > 20
                                                    const max_show_time_not_exceeded = anc.showAmount < 3;
                                                    const data = [];

                                                    assistant.createNotificationIfRequirementsMet(2, 14, (crash_data_not_available && enough_users && apc.is_mobile && max_show_time_not_exceeded), data, anc, function() {
                                                        parallelCallback();
                                                    });
                                                }
                                            }
                                            else {
                                                parallelCallback();
                                            }
                                        });
                                    },
                                    function(parallelCallback) {
                                        // (1.2) Push integration
                                        const anc = assistant.prepareNotificationSpecificFields(apc, "assistant.push-integration", assistant.NOTIF_TYPE_QUICK_TIPS, 2, NOTIFICATION_VERSION);
                                        const no_certificate_uploaded = (typeof ret_app_data.gcm === "undefined") && (typeof ret_app_data.apn === "undefined");
                                        const max_show_time_not_exceeded = anc.showAmount < 3;
                                        const data = [];

                                        assistant.createNotificationIfRequirementsMet(3, 15, (no_certificate_uploaded && apc.is_mobile && max_show_time_not_exceeded), data, anc, function() {
                                            parallelCallback();
                                        });
                                    },
                                    function(parallelCallback) {
                                        // (1.4) Custom event integration
                                        const anc = assistant.prepareNotificationSpecificFields(apc, "assistant.custom-event-integration", assistant.NOTIF_TYPE_QUICK_TIPS, 3, NOTIFICATION_VERSION);
                                        const no_custom_event_defined = (typeof events_result === "undefined") || (events_result === null);
                                        const max_show_time_not_exceeded = anc.showAmount < 3;
                                        const data = [];

                                        assistant.createNotificationIfRequirementsMet(5, 15, (no_custom_event_defined && apc.is_mobile && max_show_time_not_exceeded), data, anc, function() {
                                            parallelCallback();
                                        });
                                    },
                                    function(parallelCallback) {
                                        // (1.5) Share dashboard
                                        db.collection('members').count({user_of: apc.app_id}, function(err1, userCount) {
                                            const anc = assistant.prepareNotificationSpecificFields(apc, "assistant.share-dashboard", assistant.NOTIF_TYPE_QUICK_TIPS, 3, NOTIFICATION_VERSION);
                                            const not_enough_users = (userCount < 3);
                                            const max_show_time_not_exceeded = anc.showAmount < 1;
                                            const data = [];

                                            assistant.createNotificationIfRequirementsMet(5, 10, (not_enough_users && max_show_time_not_exceeded), data, anc, function() {
                                                parallelCallback();
                                            });
                                        });
                                    },
                                    function(parallelCallback) {
                                        // (2) generate insight notifications
                                        //todo maybe both the positive and negative events should have the same id
                                        // active users bow
                                        //sample input data: "total_users":{"total":185,"change":"-36%","trend":"d","is_estimate":true}
                                        const enough_active_users = retSession.total_users.total > 100;//active users > 100
                                        const val_current_period = retSession.total_users.total;
                                        if (retSession.avg_time.change === "NA") {
                                            retSession.total_users.change = "0";
                                        }
                                        const change_amount = parseFloat(retSession.total_users.change);
                                        const val_previous_period = val_current_period / (change_amount / 100 + 1);
                                        const data = [val_current_period, Math.round(val_previous_period)];

                                        async.parallel([
                                            function(internalParallelCallback) {
                                                // (2.1) active users bow positive
                                                const enough_active_user_change_positive = change_amount >= 10;
                                                const anc = assistant.prepareNotificationSpecificFields(apc, "assistant.active-users-bow-pos", assistant.NOTIF_TYPE_INSIGHTS, 1, NOTIFICATION_VERSION);
                                                assistant.createNotificationIfRequirementsMet(1, 10, (enough_active_users && enough_active_user_change_positive), data, anc, function() {
                                                    internalParallelCallback();
                                                });
                                            },
                                            function(internalParallelCallback) {
                                                // (2.2) active users bow negative
                                                const enough_active_user_change_negative = change_amount <= -10;
                                                const anc = assistant.prepareNotificationSpecificFields(apc, "assistant.active-users-bow-neg", assistant.NOTIF_TYPE_INSIGHTS, 2, NOTIFICATION_VERSION);
                                                assistant.createNotificationIfRequirementsMet(1, 10, (enough_active_users && enough_active_user_change_negative), data, anc, function() {
                                                    internalParallelCallback();
                                                });
                                            }], function(err) {
                                            parallelCallback(err);
                                        });
                                    },
                                    function(parallelCallback) {
                                        // active users eow
                                        //sample input data: "total_users":{"total":185,"change":"-36%","trend":"d","is_estimate":true}
                                        const enough_active_users = retSession.total_users.total > 100;//active users > 100
                                        const val_current_period = retSession.total_users.total;
                                        if (retSession.avg_time.change === "NA") {
                                            retSession.total_users.change = "0";
                                        }
                                        const change_amount = parseFloat(retSession.total_users.change);
                                        const val_previous_period = val_current_period / (change_amount / 100 + 1);
                                        const data = [val_current_period, Math.round(val_previous_period)];

                                        async.parallel([
                                            function(internalParallelCallback) {
                                                // (2.3) active users eow positive
                                                const enough_active_user_change_positive = change_amount >= 10;
                                                const anc = assistant.prepareNotificationSpecificFields(apc, "assistant.active-users-eow-pos", assistant.NOTIF_TYPE_INSIGHTS, 3, NOTIFICATION_VERSION);
                                                assistant.createNotificationIfRequirementsMet(4, 16, (enough_active_users && enough_active_user_change_positive), data, anc, function() {
                                                    internalParallelCallback();
                                                });
                                            },
                                            function(internalParallelCallback) {
                                                // (2.4) active users eow positive
                                                const enough_active_user_change_negative = change_amount <= -10;
                                                const anc = assistant.prepareNotificationSpecificFields(apc, "assistant.active-users-eow-neg", assistant.NOTIF_TYPE_INSIGHTS, 4, NOTIFICATION_VERSION);
                                                assistant.createNotificationIfRequirementsMet(4, 16, (enough_active_users && enough_active_user_change_negative), data, anc, function() {
                                                    internalParallelCallback();
                                                });
                                            }], function(err) {
                                            parallelCallback(err);
                                        });
                                    },
                                    function(parallelCallback) {
                                        // session duration bow
                                        //sample input data: "avg_time":{"total":"0.0 min","change":"NA","trend":"u"}
                                        const enough_active_users = retSession.total_sessions.total > 100;//active users > 100
                                        const val_current_period = parseFloat(retSession.avg_time.total.split(" ")[0]);//should handle "0.0 min"
                                        if (retSession.avg_time.change === "NA") {
                                            retSession.avg_time.change = "0";
                                        }
                                        //if (parseFloat(retSession.avg_time.change) === null) retSession.avg_time.change = "0";
                                        const change_amount = parseFloat(retSession.avg_time.change);
                                        const val_previous_period = val_current_period / (change_amount / 100 + 1);
                                        const data = [Math.floor(val_current_period), Math.round((val_current_period - Math.floor(val_current_period)) * 60), Math.floor(val_previous_period), Math.round((val_previous_period - Math.floor(val_previous_period)) * 60)];

                                        //log.i('Assistant Session Duration, total_time_string: [%j], split_v: [%j], parsedVal: [%j] appID: [%j]', retSession.avg_time.total, split_v, val_current_period, apc.app_id);
                                        //log.i('Assistant Session Duration, changeText: [%j], changeAm: [%j], valCurrent: [%j], valPrevious: [%j], data: [%j], appID: [%j]', retSession.avg_time.change, change_amount, val_current_period, val_previous_period, data, apc.app_id);

                                        async.parallel([
                                            function(internalParallelCallback) {
                                                // (2.5) session duration bow positive
                                                const enough_session_duration_change_positive = change_amount >= 10;
                                                const anc = assistant.prepareNotificationSpecificFields(apc, "assistant.avg-session-duration-bow-pos", assistant.NOTIF_TYPE_INSIGHTS, 5, NOTIFICATION_VERSION);
                                                assistant.createNotificationIfRequirementsMet(4, 16, (enough_active_users && enough_session_duration_change_positive), data, anc, function() {
                                                    internalParallelCallback();
                                                });
                                            },
                                            function(internalParallelCallback) {
                                                // (2.6) session duration bow negative
                                                const enough_session_duration_change_negative = change_amount <= -10;
                                                const anc = assistant.prepareNotificationSpecificFields(apc, "assistant.avg-session-duration-bow-neg", assistant.NOTIF_TYPE_INSIGHTS, 6, NOTIFICATION_VERSION);
                                                assistant.createNotificationIfRequirementsMet(4, 16, (enough_active_users && enough_session_duration_change_negative), data, anc, function() {
                                                    internalParallelCallback();
                                                });
                                            }], function(err) {
                                            parallelCallback(err);
                                        });
                                    },
                                    function(parallelCallback) {
                                        // (2.7) top install sources, (2.8) top referrals
                                        //const hours_24 = 1000 * 60 * 60 * 24;
                                        //const nowTime = 1485547643000;

                                        const paramCopy = {};
                                        paramCopy.api_key = globalParamsCopy.api_key;
                                        paramCopy.app_id = globalParamsCopy.app_id;
                                        paramCopy.appTimezone = globalParamsCopy.appTimezone;
                                        paramCopy.qstring = {};
                                        paramCopy.qstring.period = "7days";// JSON.stringify([nowTime - hours_24,nowTime]);

                                        countlyCommon.setTimezone(paramCopy.appTimezone);
                                        countlyCommon.setPeriod(paramCopy.qstring.period);
                                        fetch.getMetricWithOptions(paramCopy, "sources", null, {db: db}, function(metricData) {
                                            //log.i('Assistant plugin doing steps: [%j] [%j] [%j] [%j]', 12, params.app_id, app_id, metricData);
                                            metricData = metricData.filter(function(x) {
                                                return x.t >= 50;
                                            });
                                            metricData.sort(function(x, y) {
                                                return y.t - x.t;
                                            });

                                            //log.i('Sorted Data [%j] [%j]', app_id, metricData);
                                            const enough_sources = metricData.length >= 3;//at least 3 install sources with enough users

                                            if (apc.is_mobile) {
                                                let data;
                                                if (enough_sources) {
                                                    data = [metricData[0]._id, metricData[0].t, metricData[1]._id, metricData[1].t, metricData[2]._id, metricData[2].t];
                                                }
                                                else {
                                                    data = ["store_a", 1, "store_b", 2, "store_c", 3];
                                                }

                                                const anc = assistant.prepareNotificationSpecificFields(apc, "assistant.top-install-sources", assistant.NOTIF_TYPE_INSIGHTS, 7, NOTIFICATION_VERSION);
                                                assistant.createNotificationIfRequirementsMet(5, 15, (enough_sources && apc.is_mobile), data, anc, function() {
                                                    parallelCallback();
                                                });
                                            }
                                            else {
                                                let data;
                                                if (enough_sources) {
                                                    data = [metricData[0]._id, metricData[0].t, metricData[0].u, metricData[1]._id, metricData[1].t, metricData[1].u, metricData[2]._id, metricData[2].t, metricData[2].u];
                                                }
                                                else {
                                                    data = ["page_a", 1, 9, "page_b", 2, 8, "page_c", 3, 7];
                                                }

                                                const anc = assistant.prepareNotificationSpecificFields(apc, "assistant.top-referrals", assistant.NOTIF_TYPE_INSIGHTS, 8, NOTIFICATION_VERSION);
                                                assistant.createNotificationIfRequirementsMet(5, 15, (enough_sources && !apc.is_mobile), data, anc, function() {
                                                    parallelCallback();
                                                });
                                            }
                                        });
                                    },
                                    function(parallelCallback) {
                                        const paramCopy = {};
                                        paramCopy.api_key = globalParamsCopy.api_key;
                                        paramCopy.app_id = globalParamsCopy.app_id;
                                        paramCopy.appTimezone = globalParamsCopy.appTimezone;
                                        paramCopy.qstring = {};
                                        paramCopy.qstring.period = "7days";
                                        const queryMetric = "views";
                                        paramCopy.qstring.method = queryMetric;

                                        countlyCommon.setTimezone(paramCopy.appTimezone);
                                        countlyCommon.setPeriod(paramCopy.qstring.period);
                                        fetch.getTimeObjForEvents("app_viewdata" + paramCopy.app_id, paramCopy, {db: db}, function(doc) {
                                            var clearMetricObject = function(obj) {
                                                if (obj) {
                                                    if (!obj.u) {
                                                        obj.u = 0;
                                                    }
                                                    if (!obj.t) {
                                                        obj.t = 0;
                                                    }
                                                    if (!obj.s) {
                                                        obj.s = 0;
                                                    }
                                                    if (!obj.e) {
                                                        obj.e = 0;
                                                    }
                                                    if (!obj.b) {
                                                        obj.b = 0;
                                                    }
                                                    if (!obj.d) {
                                                        obj.d = 0;
                                                    }
                                                    if (!obj.n) {
                                                        obj.n = 0;
                                                    }
                                                }
                                                else {
                                                    obj = {"u": 0, "t": 0, "s": 0, "e": 0, "b": 0, "d": 0, "n": 0};
                                                }
                                                return obj;
                                            };
                                            if (!_.isEmpty(doc)) {
                                                var metricData = countlyCommon.extractMetric(doc, doc.meta[queryMetric], clearMetricObject, [
                                                    {
                                                        name: queryMetric,
                                                        func: function(rangeArr) {
                                                            return rangeArr;
                                                        }
                                                    },
                                                    {"name": "u"}, //total users
                                                    {"name": "t"}, //total visits
                                                    {"name": "s"}, //landings (page entries)
                                                    {"name": "e"}, //exits (page exits)
                                                    {"name": "b"}, //bounce
                                                    {"name": "d"}, //duration spent seconds
                                                    {"name": "n"} //new users
                                                ]);

                                                const enough_pages = metricData.length >= 5;
                                                if (enough_pages) {
                                                    { // (2.9) View Metrics (Page entry and page exit summary)
                                                        const data = [];

                                                        const sortAndExtract = function(dataHolder, fieldName, metricInfo) {
                                                            metricInfo.sort(function(x, y) {
                                                                return y[fieldName] - x[fieldName];
                                                            });
                                                            dataHolder.push(metricInfo[0]._id, metricInfo[0][fieldName], metricInfo[1]._id, metricInfo[1][fieldName], metricInfo[2]._id, metricInfo[2][fieldName]);
                                                        };

                                                        //set total visits
                                                        sortAndExtract(data, "t", metricData);

                                                        //set entry source
                                                        sortAndExtract(data, "s", metricData);

                                                        //set exit sources
                                                        sortAndExtract(data, "e", metricData);

                                                        //set bounces
                                                        sortAndExtract(data, "b", metricData);

                                                        //set duration
                                                        sortAndExtract(data, "d", metricData);

                                                        const anc = assistant.prepareNotificationSpecificFields(apc, "assistant.view-metrics", assistant.NOTIF_TYPE_INSIGHTS, 9, NOTIFICATION_VERSION);
                                                        assistant.createNotificationIfRequirementsMet(2, 15, (enough_pages && !apc.is_mobile), data, anc, function() {
                                                            parallelCallback();
                                                        });
                                                    }
                                                }
                                                else {
                                                    parallelCallback();
                                                }
                                            }
                                            else {
                                                parallelCallback();
                                            }
                                        });
                                    }
                                ], 20, function(err) {
                                    if (!_.isUndefined(err) && err !== null) {
                                        log.e("Error while doing assistantJob base, err:[%j]", err);
                                    }

                                    callback(null, null);
                                });
                            });
                        }
                    });
                }, function(err) {
                    if (!_.isUndefined(err) && err !== null) {
                        log.e("Error while doing assistantJob, err:[%j]", err);
                    }
                    log.i('Assistant for [%j] plugin resolving', PLUGIN_NAME);
                    resolve();
                });
            }
            catch (ex) {
                log.e('Assistant plugin [%j] FAILED!!!!! [%j]', PLUGIN_NAME, { message: ex.message, stack: ex.stack });
                resolve();
            }
        });
    };
}(exportedAssistantJob));

module.exports = exportedAssistantJob;