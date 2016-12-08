var assistantJob = {},
    plugins = require('../../pluginManager.js'),
    log = require('../../../api/utils/log.js')('assistantJob:module'),
    fetch = require('../../../api/parts/data/fetch.js'),
    async = require("async"),
    countlySession = require('../../../api/lib/countly.session.js'),
    assistant = require("./assistant.js");


(function (assistantJob) {
    var PLUGIN_NAME = "assistant-base";
    assistantJob.prepareNotifications = function (db, providedInfo) {
        return new Promise(function(resolve, reject){
            var result_apps_data = providedInfo.appsData;
            var dow = providedInfo.timeAndDate.dow;
            var hour = providedInfo.timeAndDate.hour;
            var assistantConfig = providedInfo.assistantConfiguration;

            //log.i('Assistant plugin stuffo: [%j] ', assistantConfig);

            var params = {};
            params.qstring = {};

            //todo add the amount of times a notification has been shown
            async.map(result_apps_data, function(ret_app_data, callback){
                var is_mobile = ret_app_data.type == "mobile";//check if app type is mobile or web
                var app_id = "" + ret_app_data._id;

                db.collection('events').findOne({_id:app_id}, {}, function(events_err, events_result) {
                    params.app_id = app_id;
                    params.qstring.period = "7days";
                    fetch.getTimeObj('users', params, function (fetchResultUsers) {//collect user info
                        //log.i('Assistant plugin doing steps: [%j] [%j]', 0.01, fetchResultUsers);
                        countlySession.setDb(fetchResultUsers);
                        var retSession = countlySession.getSessionData();

                        log.i('Assistant plugin doing steps: [%j] [%j] [%j] [%j]', 0.1, retSession, params.app_id, app_id);

                        // (1) generate quick tip notifications
                        // (1.1) Crash integration

                        db.collection("app_crashgroups" + app_id).findOne({_id:"meta"}, function(err_crash, res_crash) {
                            log.i('Assistant plugin doing steps: [%j][%j] ', 1, res_crash);
                            if(typeof res_crash !== "undefined")//todo is this enough?
                            (function () {
                                var valueSet = assistant.createNotificationValueSet("assistant.crash-integration", assistant.NOTIF_TYPE_QUICK_TIPS, 1, PLUGIN_NAME, assistantConfig, app_id);
                                var crash_data_not_available = res_crash.crashes === 0;
                                var enough_users = res_crash.users > 20;//total users > 20
                                var max_show_time_not_exceeded = valueSet.showAmount < 3;

                                if (assistant.correct_day_and_time(2, 14, dow, hour) && crash_data_not_available && enough_users && is_mobile && max_show_time_not_exceeded) {
                                    log.i('Assistant plugin doing steps: [%j] ', 1.1);
                                    assistant.createNotification(db, [], valueSet.pluginName, valueSet.type, valueSet.subtype, valueSet.nName, app_id);
                                    assistant.setNotificationShowAmount(db, valueSet, valueSet.showAmount + 1, app_id);
                                }
                            })();
                        });

                        // (1.2) Push integration
                        (function () {
                            var valueSet = assistant.createNotificationValueSet("assistant.push-integration", assistant.NOTIF_TYPE_QUICK_TIPS, 2, PLUGIN_NAME, assistantConfig, app_id);
                            var no_certificate_uploaded = (typeof result_apps_data.gcm === "undefined") && (typeof result_apps_data.apn === "undefined");
                            var max_show_time_not_exceeded = valueSet.showAmount < 3;
                            if (assistant.correct_day_and_time(3, 15, dow, hour) && no_certificate_uploaded && is_mobile && max_show_time_not_exceeded) {
                                log.i('Assistant plugin doing steps: [%j] ', 2.1);
                                assistant.createNotification(db, [], valueSet.pluginName, valueSet.type, valueSet.subtype, valueSet.nName, app_id);
                                assistant.setNotificationShowAmount(db, valueSet, valueSet.showAmount + 1, app_id);
                            }
                        })();

                        // (1.4) Custom event integration
                        (function () {
                            var valueSet = assistant.createNotificationValueSet("assistant.custom-event-integration", assistant.NOTIF_TYPE_QUICK_TIPS, 3, PLUGIN_NAME, assistantConfig, app_id);
                            var no_custom_event_defined = (typeof events_result === "undefined") || (events_result === null);
                            var max_show_time_not_exceeded = valueSet.showAmount < 3;
                            if (assistant.correct_day_and_time(5, 15, dow, hour) && no_custom_event_defined && is_mobile && max_show_time_not_exceeded) {
                                log.i('Assistant plugin doing steps: [%j] ', 4.1);
                                assistant.createNotification(db, [], valueSet.pluginName, valueSet.type, valueSet.subtype, valueSet.nName, app_id);
                                assistant.setNotificationShowAmount(db, valueSet, valueSet.showAmount + 1, app_id);
                            }
                        })();

                        // (1.5) Share dashboard
                        //todo implement this
                        /*
                        (function () {
                            var valueSet = assistant.createNotificationValueSet("assistant.share-dashboard", assistant.NOTIF_TYPE_QUICK_TIPS, 4, PLUGIN_NAME, assistantConfig, app_id);
                            var not_enough_dashboard_users = false;//todo finish this
                            var max_show_time_not_exceeded = valueSet.showAmount < 3;
                            if (assistant.correct_day_and_time(2, 10, dow, hour) && not_enough_dashboard_users && max_show_time_not_exceeded) {
                                log.i('Assistant plugin doing steps: [%j] ', 5.1);
                                //assistant.createNotification(db, [], valueSet.pluginName, valueSet.type, valueSet.subtype, valueSet.nName, app_id);
                                assistant.setNotificationShowAmount(db, valueSet, valueSet.showAmount + 1, app_id);
                            }
                        })();*/

                        // (1.9) Use dashboard localization
                        //todo implement this

                        // (2) generate insight notifications

                        // (2.1) active users bow positive
                        (function () {
                            var valueSet = assistant.createNotificationValueSet("assistant.active-users-bow-pos", assistant.NOTIF_TYPE_INSIGHTS, 1, PLUGIN_NAME, assistantConfig, app_id);
                            var enough_active_users = retSession.total_users.total > 100;//active users > 20
                            var val_current_period = retSession.total_users.total;
                            var change_amount = parseFloat(retSession.total_users.change);
                            var enough_active_user_change = change_amount>= 10;

                            if (assistant.correct_day_and_time(1, 10, dow, hour) && enough_active_users && enough_active_user_change) {
                                var val_previous_period = val_current_period / (change_amount / 100 + 1);
                                var data = [val_current_period, Math.round(val_previous_period)];
                                log.i('Assistant plugin doing steps: [%j] ', 10.1);
                                assistant.createNotification(db, data, valueSet.pluginName, valueSet.type, valueSet.subtype, valueSet.nName, app_id);
                                assistant.setNotificationShowAmount(db, valueSet, valueSet.showAmount + 1, app_id);
                            }
                        })();

                        // (2.2) active users bow negative
                        (function () {
                            var valueSet = assistant.createNotificationValueSet("assistant.active-users-bow-neg", assistant.NOTIF_TYPE_INSIGHTS, 2, PLUGIN_NAME, assistantConfig, app_id);
                            var enough_active_users = retSession.total_users.total > 100;//active users > 20
                            var val_current_period = retSession.total_users.total;
                            var change_amount = parseFloat(retSession.total_users.change);
                            var enough_active_user_change = change_amount <= -10;

                            if (assistant.correct_day_and_time(1, 10, dow, hour) && enough_active_users && enough_active_user_change) {
                                var val_previous_period = val_current_period / (change_amount / 100 + 1);
                                var data = [val_current_period, Math.round(val_previous_period)];
                                log.i('Assistant plugin doing steps: [%j] ', 11.1);
                                assistant.createNotification(db, data, valueSet.pluginName, valueSet.type, valueSet.subtype, valueSet.nName, app_id);
                                assistant.setNotificationShowAmount(db, valueSet, valueSet.showAmount + 1, app_id);
                            }
                        })();

                        // (2.3) active users eow positive
                        (function () {
                            var valueSet = assistant.createNotificationValueSet("assistant.active-users-eow-pos", assistant.NOTIF_TYPE_INSIGHTS, 3, PLUGIN_NAME, assistantConfig, app_id);
                            var enough_active_users = retSession.total_users.total > 100;//active users > 20
                            var val_current_period = retSession.total_users.total;
                            var change_amount = parseFloat(retSession.total_users.change);
                            var enough_active_user_change = change_amount >= 10;

                            if (assistant.correct_day_and_time(4, 16, dow, hour) && enough_active_users && enough_active_user_change) {
                                var val_previous_period = val_current_period / (change_amount / 100 + 1);
                                var data = [val_current_period,  Math.round(val_previous_period)];
                                log.i('Assistant plugin doing steps: [%j] ', 12.1);
                                assistant.createNotification(db, data, valueSet.pluginName, valueSet.type, valueSet.subtype, valueSet.nName, app_id);
                                assistant.setNotificationShowAmount(db, valueSet, valueSet.showAmount + 1, app_id);
                            }
                        })();

                        // (2.4) active users eow positive
                        (function () {
                            var valueSet = assistant.createNotificationValueSet("assistant.active-users-eow-neg", assistant.NOTIF_TYPE_INSIGHTS, 4, PLUGIN_NAME, assistantConfig, app_id);
                            var enough_active_users = retSession.total_users.total > 100;//active users > 20
                            var val_current_period = retSession.total_users.total;
                            var change_amount = parseFloat(retSession.total_users.change);
                            var enough_active_user_change = change_amount <= -10;

                            if (assistant.correct_day_and_time(4, 16, dow, hour) && enough_active_users && enough_active_user_change) {
                                var val_previous_period = val_current_period / (change_amount / 100 + 1);
                                log.i('Assistant plugin doing steps: [%j] ', 13.1);
                                var data = [val_current_period,  Math.round(val_previous_period)];
                                assistant.createNotification(db, data, valueSet.pluginName, valueSet.type, valueSet.subtype, valueSet.nName, app_id);
                                assistant.setNotificationShowAmount(db, valueSet, valueSet.showAmount + 1, app_id);
                            }
                        })();

                        // (2.11) session duration bow positive
                        (function () {
                            var valueSet = assistant.createNotificationValueSet("assistant.avg-session-duration-bow-pos", assistant.NOTIF_TYPE_INSIGHTS, 5, PLUGIN_NAME, assistantConfig, app_id);
                            var enough_active_users = retSession.total_sessions.total > 100;//active users > 20
                            var val_current_period = retSession.avg_time.total;
                            var change_amount = parseFloat(retSession.avg_time.change);
                            var enough_session_duration_change = change_amount >= 10;

                            if (assistant.correct_day_and_time(4, 16, dow, hour) && enough_active_users && enough_session_duration_change) {
                                log.i('Assistant plugin doing steps: [%j] ', 20.1);
                                var val_previous_period = val_current_period / (change_amount / 100 + 1);
                                var data = [Math.floor(val_current_period), Math.round((val_current_period - Math.floor(val_current_period)) * 60), Math.floor(val_previous_period), Math.round((val_previous_period - Math.floor(val_previous_period)) * 60)];
                                assistant.createNotification(db, data, valueSet.pluginName, valueSet.type, valueSet.subtype, valueSet.nName, app_id);
                                assistant.setNotificationShowAmount(db, valueSet, valueSet.showAmount + 1, app_id);
                            }
                        })();

                        // (2.12) session duration bow negative
                        (function () {
                            var valueSet = assistant.createNotificationValueSet("assistant.avg-session-duration-bow-neg", assistant.NOTIF_TYPE_INSIGHTS, 6, PLUGIN_NAME, assistantConfig, app_id);
                            var enough_active_users = retSession.total_sessions.total > 100;//active users > 20
                            var val_current_period = parseFloat(retSession.avg_time.total);
                            if(retSession.avg_time.change === "NA") retSession.avg_time.change = "0";
                            var change_amount = parseFloat(retSession.avg_time.change);
                            var enough_session_duration_change = change_amount <= -10;

                            if (assistant.correct_day_and_time(4, 16, dow, hour) && enough_active_users && enough_session_duration_change) {
                                log.i('Assistant plugin doing steps: [%j] ', 21.1);
                                var val_previous_period = val_current_period / (change_amount / 100 + 1);
                                var data = [Math.floor(val_current_period), Math.round((val_current_period - Math.floor(val_current_period)) * 60), Math.floor(val_previous_period), Math.round((val_previous_period - Math.floor(val_previous_period)) * 60)];
                                assistant.createNotification(db, data, valueSet.pluginName, valueSet.type, valueSet.subtype, valueSet.nName, app_id);
                                assistant.setNotificationShowAmount(db, valueSet, valueSet.showAmount + 1, app_id);
                            }
                        })();

                        // (3) generate announcment notifications

                        // (3.1) blog page
                        callback(null, null);
                    });
                });
            },function(err, results) {
                log.i('Assistant for [%j] plugin resolving', PLUGIN_NAME);
                resolve();
            });
        });
    }

}(assistantJob));

module.exports = assistantJob;