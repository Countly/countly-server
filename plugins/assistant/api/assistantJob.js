var assistantJob = {},
    //common = require('../../../api/utils/common.js'),
    plugins = require('../../pluginManager.js'),
    log = require('../../../api/utils/log.js')('assistantJob:module'),
    fetch = require('../../../api/parts/data/fetch.js'),
    async = require("async"),
    countlySession = require('../../../api/lib/countly.session.js'),
    assistant = require("./assistant.js");


(function (assistantJob) {

    assistantJob.prepareNotifications = function (db) {
        return new Promise(function(resolve, reject){
            //here goes all the code
            log.i('Doing stuff un basic place: ' + 1);

            //get a list of all app id's
            db.collection('apps').find({}, {_id:1, type:1, gcm:1, apn:1}).toArray(function(err_app_id, result_app_data){
                //get current day and time
                //todo get time based on apps timezone
                var date = new Date();
                var hour = date.getHours();
                var dow = date.getDay();
                if (dow === 0)
                    dow = 7;

                log.i('Doing stuff un basic place: ' + 2);

                var params = {};
                params.qstring = {};

                //todo add the amount of times a notification has been shown
                async.map(result_app_data, function(ret_app_data, callback){
                    var is_mobile = ret_app_data.type == "mobile";//check if app type is mobile or web
                    var app_id = ret_app_data._id;
                    log.i('Assistant plugin inside loop, id: [%j], result: [%j] ', app_id, is_mobile);

                    db.collection('events').findOne({_id:app_id}, {}, function(events_err, events_result) {
                        log.i('Doing stuff un basic place: ' + 3);
                        params.app_id = app_id;
                        params.qstring.period = "30days";//todo generate qstring
                        fetch.getTimeObj('users', params, function (fetchResultUsers) {//collect user info
                            //log.i('Assistant plugin doing steps: [%j] [%j]', 0.01, fetchResultUsers);
                            countlySession.setDb(fetchResultUsers);
                            var retSession = countlySession.getSessionData();

                            log.i('Assistant plugin doing steps: [%j] [%j] [%j] [%j]', 0.1, retSession, params.app_id, app_id);


                            log.i('Assistant plugin doing steps: [%j] ', 1);
                            // (1) generate quick tip notifications

                            // (1.1) Crash integration
                            (function () {
                                var crash_data_not_available = true;//todo missing
                                var enough_users = true;//total users > 20
                                var max_show_time_not_exceeded = true;

                                if (assistant.correct_day_and_time(2, 14, dow, hour) && crash_data_not_available && enough_users && is_mobile && max_show_time_not_exceeded) {
                                    log.i('Assistant plugin doing steps: [%j] ', 1.1);
                                    assistant.createNotification(db, [], "assistant-base", assistant.NOTIF_TYPE_QUICK_TIPS, 1, "assistant.crash-integration", app_id);
                                }
                            })();

                            log.i('Assistant plugin doing steps: [%j] ', 2);

                            // (1.2) Push integration
                            (function () {
                                var no_certificate_uploaded = (typeof result_app_data.gcm === "undefined") && (typeof result_app_data.apn === "undefined");
                                var max_show_time_not_exceeded = true;
                                if (assistant.correct_day_and_time(3, 15, dow, hour) && no_certificate_uploaded && is_mobile && max_show_time_not_exceeded) {
                                    log.i('Assistant plugin doing steps: [%j] ', 2.1);
                                    assistant.createNotification(db, [], "assistant-base", assistant.NOTIF_TYPE_QUICK_TIPS, 2, "assistant.crash-integration", app_id);
                                }
                            })();

                            log.i('Assistant plugin doing steps: [%j] ', 3);

                            // (1.3) Star rating integration
                            (function () {
                                //log.i('Assistant plugin doing steps: [%j] [%j] [%j]', 3.01, events_result, events_result.list);
                                var no_star_rating = (typeof events_result === "undefined") || (events_result === null) || (typeof events_result.list === "undefined") || (typeof events_result.list !== "undefined" && events_result.list.indexOf("[CLY]_star") === -1);
                                var star_rating_not_enabled = !plugins.isPluginEnabled("star-rating");
                                var max_show_time_not_exceeded = true;
                                log.i('Assistant plugin doing steps: [%j] [%j] [%j] [%j] ', 3.01, no_star_rating, star_rating_not_enabled, max_show_time_not_exceeded);
                                if (assistant.correct_day_and_time(4, 15, dow, hour) && (no_star_rating || star_rating_not_enabled) && is_mobile && max_show_time_not_exceeded) {
                                    log.i('Assistant plugin doing steps: [%j] ', 3.1);
                                    assistant.createNotification(db, [], "assistant-base", assistant.NOTIF_TYPE_QUICK_TIPS, 3, "assistant.star-rating-integration", app_id);
                                }
                            })();

                            log.i('Assistant plugin doing steps: [%j] ', 4);

                            // (1.4) Custom event integration
                            (function () {
                                var no_custom_event_defined = (typeof events_result === "undefined") || (events_result === null);
                                var max_show_time_not_exceeded = true;
                                log.i('Assistant plugin doing steps: [%j] [%j] ', 4.01, no_custom_event_defined);
                                if (assistant.correct_day_and_time(5, 15, dow, hour) && no_custom_event_defined && is_mobile && max_show_time_not_exceeded) {
                                    log.i('Assistant plugin doing steps: [%j] ', 4.1);
                                    assistant.createNotification(db, [], "assistant-base", assistant.NOTIF_TYPE_QUICK_TIPS, 4, "assistant.custom-event-integration", app_id);
                                }
                            })();

                            log.i('Assistant plugin doing steps: [%j] ', 5);

                            // (1.5) Share dashboard
                            (function () {
                                var not_enough_dashboard_users = false;//todo finish this
                                var max_show_time_not_exceeded = true;
                                if (assistant.correct_day_and_time(2, 10, dow, hour) && not_enough_dashboard_users && max_show_time_not_exceeded) {
                                    log.i('Assistant plugin doing steps: [%j] ', 5.1);
                                    //assistant.createNotification(common.db, [], "assistant-base", assistant.NOTIF_TYPE_QUICK_TIPS, , "", app_id);
                                }
                            })();

                            log.i('Assistant plugin doing steps: [%j] ', 6);

                            // (1.9) Use dashboard localization
                            //todo implement this

                            // (2) generate insight notifications

                            log.i('Assistant plugin doing steps: [%j] ', 10);

                            // (2.1) active users bow positive
                            (function () {
                                var enough_active_users = retSession.total_users.total > 100;//active users > 20
                                var val_current_period = retSession.total_users.total;
                                var change_amount = parseFloat(retSession.total_users.change);
                                var enough_active_user_change = change_amount>= 10;

                                if (assistant.correct_day_and_time(1, 10, dow, hour) && enough_active_users && enough_active_user_change) {
                                    var val_previous_period = val_current_period / (change_amount / 100 + 1);
                                    log.i('Assistant plugin doing steps: [%j] ', 10.1);
                                    assistant.createNotification(db, [val_current_period, Math.round(val_previous_period)], "assistant-base", assistant.NOTIF_TYPE_INSIGHTS, 1, "assistant.active-users-bow-pos", app_id);
                                }
                            })();

                            // (2.2) active users bow negative
                            log.i('Assistant plugin doing steps: [%j] ', 11);
                            (function () {
                                var enough_active_users = retSession.total_users.total > 100;//active users > 20
                                var val_current_period = retSession.total_users.total;
                                var change_amount = parseFloat(retSession.total_users.change);
                                var enough_active_user_change = change_amount <= -10;

                                if (assistant.correct_day_and_time(1, 10, dow, hour) && enough_active_users && enough_active_user_change) {
                                    var val_previous_period = val_current_period / (change_amount / 100 + 1);
                                    log.i('Assistant plugin doing steps: [%j] ', 11.1);
                                    assistant.createNotification(db, [val_current_period, Math.round(val_previous_period)], "assistant-base", assistant.NOTIF_TYPE_INSIGHTS, 2, "assistant.active-users-bow-neg", app_id);
                                }
                            })();

                            // (2.3) active users eow positive
                            log.i('Assistant plugin doing steps: [%j] ', 12);
                            (function () {
                                var enough_active_users = retSession.total_users.total > 100;//active users > 20
                                var val_current_period = retSession.total_users.total;
                                var change_amount = parseFloat(retSession.total_users.change);
                                var enough_active_user_change = change_amount >= 10;

                                if (assistant.correct_day_and_time(4, 16, dow, hour) && enough_active_users && enough_active_user_change) {
                                    var val_previous_period = val_current_period / (change_amount / 100 + 1);
                                    log.i('Assistant plugin doing steps: [%j] ', 12.1);
                                    assistant.createNotification(db, [val_current_period,  Math.round(val_previous_period)], "assistant-base", assistant.NOTIF_TYPE_INSIGHTS, 3, "assistant.active-users-eow-pos", app_id);
                                }
                            })();

                            // (2.4) active users eow positive
                            log.i('Assistant plugin doing steps: [%j] ', 13);
                            (function () {
                                var enough_active_users = retSession.total_users.total > 100;//active users > 20
                                var val_current_period = retSession.total_users.total;
                                var change_amount = parseFloat(retSession.total_users.change);
                                var enough_active_user_change = change_amount <= -10;

                                if (assistant.correct_day_and_time(4, 16, dow, hour) && enough_active_users && enough_active_user_change) {
                                    var val_previous_period = val_current_period / (change_amount / 100 + 1);
                                    log.i('Assistant plugin doing steps: [%j] ', 13.1);
                                    assistant.createNotification(db, [val_current_period,  Math.round(val_previous_period)], "assistant-base", assistant.NOTIF_TYPE_INSIGHTS, 4, "assistant.active-users-eow-neg", app_id);
                                }
                            })();

                            // (2.11) session duration bow positive
                            log.i('Assistant plugin doing steps: [%j] ', 20);
                            (function () {
                                var enough_active_users = retSession.total_sessions.total > 100;//active users > 20
                                var val_current_period = retSession.avg_time.total;
                                var change_amount = parseFloat(retSession.avg_time.change);
                                var enough_session_duration_change = change_amount >= 10;

                                if (assistant.correct_day_and_time(4, 16, dow, hour) && enough_active_users && enough_session_duration_change) {
                                    log.i('Assistant plugin doing steps: [%j] ', 20.1);
                                    var val_previous_period = val_current_period / (change_amount / 100 + 1);
                                    assistant.createNotification(db, [Math.floor(val_current_period), Math.round((val_current_period - Math.floor(val_current_period)) * 60), Math.floor(val_previous_period), Math.round((val_previous_period - Math.floor(val_previous_period)) * 60)], "assistant-base", assistant.NOTIF_TYPE_INSIGHTS, 5, "assistant.avg-session-duration-bow-pos", app_id);
                                }
                            })();

                            // (2.12) session duration bow negative
                            log.i('Assistant plugin doing steps: [%j] ', 21);
                            (function () {
                                var enough_active_users = retSession.total_sessions.total > 100;//active users > 20
                                var val_current_period = retSession.avg_time.total;
                                var change_amount = parseFloat(retSession.avg_time.change);
                                var enough_session_duration_change = change_amount <= -10;

                                if (assistant.correct_day_and_time(4, 16, dow, hour) && enough_active_users && enough_session_duration_change) {
                                    log.i('Assistant plugin doing steps: [%j] ', 21.1);
                                    var val_previous_period = val_current_period / (change_amount / 100 + 1);
                                    assistant.createNotification(db, [Math.floor(val_current_period), Math.round((val_current_period - Math.floor(val_current_period)) * 60), Math.floor(val_previous_period), Math.round((val_previous_period - Math.floor(val_previous_period)) * 60)], "assistant-base", assistant.NOTIF_TYPE_INSIGHTS, 6, "assistant.avg-session-duration-bow-neg", app_id);
                                }
                            })();

                            // (3) generate announcment notifications

                            // (3.1) blog page

                        });
                    });
                },function(err, results) {
                    resolve();
                });
            });
        });
    }

}(assistantJob));

module.exports = assistantJob;