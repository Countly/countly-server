'use strict';
const assistantJob = {},
    plugins = require('../../pluginManager.js'),
    log = require('../../../api/utils/log.js')('assistantJob:module'),
    fetch = require('../../../api/parts/data/fetch.js'),
    async = require("async"),
    countlySession = require('../../../api/lib/countly.session.js'),
    assistant = require("./assistant.js"),
    parser = require('rss-parser');

(function (assistantJob) {
    const PLUGIN_NAME = "assistant-base";
    assistantJob.prepareNotifications = function (db, providedInfo) {
        return new Promise(function (resolve, reject) {
            try {
                log.i('Creating assistant notifications from [%j]', PLUGIN_NAME);
                const result_apps_data = providedInfo.appsData;
                const dow = providedInfo.timeAndDate.dow;
                const hour = providedInfo.timeAndDate.hour;
                const assistantConfig = providedInfo.assistantConfiguration;
                const flagIgnoreDAT = providedInfo.ignoreDayAndTime;
                const flagForceGenerate = providedInfo.forceGenerateNotifications;
                const NOTIFICATION_VERSION = 1;

                //log.i('Assistant plugin stuffo: [%j] ', assistantConfig);

                async.map(result_apps_data, function (ret_app_data, callback) {
                    const params = {};
                    params.qstring = {};
                    params.appTimezone = ret_app_data.timezone;//todo add this to other places

                    //todo calculate hour and date here

                    const is_mobile = ret_app_data.type == "mobile";//check if app type is mobile or web
                    const app_id = "" + ret_app_data._id;//todo is this problematic?

                    db.collection('events').findOne({_id: app_id}, {}, function (events_err, events_result) {
                        params.app_id = app_id;
                        params.qstring.period = "7days";


                        fetch.getTimeObj('users', params, function (fetchResultUsers) {//collect user info
                            //log.i('Assistant plugin doing steps: [%j] [%j]', 0.01, fetchResultUsers);
                            countlySession.setDb(fetchResultUsers);
                            const retSession = countlySession.getSessionData();

                            log.i('Assistant plugin doing steps: [%j] [%j] [%j] [%j]', 0.1, params.app_id, app_id);//todo seems like params.app_id is not set

                            // (1) generate quick tip notifications
                            // (1.1) Crash integration
                            db.collection("app_crashgroups" + app_id).findOne({_id: "meta"}, function (err_crash, res_crash) {
                                //log.i('Assistant plugin doing steps: [%j][%j] ', 1, res_crash);
                                if (res_crash) {
                                    {
                                        const valueSet = assistant.createNotificationValueSet("assistant.crash-integration", assistant.NOTIF_TYPE_QUICK_TIPS, 1, PLUGIN_NAME, assistantConfig, app_id, NOTIFICATION_VERSION);
                                        const crash_data_not_available = res_crash.crashes === 0;
                                        const enough_users = res_crash.users > 20;//total users > 20
                                        const max_show_time_not_exceeded = valueSet.showAmount < 3;
                                        const data = [];

                                        if ((flagIgnoreDAT || assistant.correct_day_and_time(2, 14, dow, hour)) && crash_data_not_available && enough_users && is_mobile && max_show_time_not_exceeded || flagForceGenerate) {
                                            assistant.createNotificationAndSetShowAmount(db, valueSet, app_id, data);
                                        }
                                    }
                                }
                            });

                            { // (1.2) Push integration
                                const valueSet = assistant.createNotificationValueSet("assistant.push-integration", assistant.NOTIF_TYPE_QUICK_TIPS, 2, PLUGIN_NAME, assistantConfig, app_id, NOTIFICATION_VERSION);
                                const no_certificate_uploaded = (typeof result_apps_data.gcm === "undefined") && (typeof result_apps_data.apn === "undefined");
                                const max_show_time_not_exceeded = valueSet.showAmount < 3;
                                const data = [];
                                if ((flagIgnoreDAT || assistant.correct_day_and_time(3, 15, dow, hour)) && no_certificate_uploaded && is_mobile && max_show_time_not_exceeded || flagForceGenerate) {
                                    assistant.createNotificationAndSetShowAmount(db, valueSet, app_id, data);
                                }
                            }

                            { // (1.4) Custom event integration
                                const valueSet = assistant.createNotificationValueSet("assistant.custom-event-integration", assistant.NOTIF_TYPE_QUICK_TIPS, 3, PLUGIN_NAME, assistantConfig, app_id, NOTIFICATION_VERSION);
                                const no_custom_event_defined = (typeof events_result === "undefined") || (events_result === null);
                                const max_show_time_not_exceeded = valueSet.showAmount < 3;
                                const data = [];
                                if ((flagIgnoreDAT || assistant.correct_day_and_time(5, 15, dow, hour)) && no_custom_event_defined && is_mobile && max_show_time_not_exceeded || flagForceGenerate) {
                                    assistant.createNotificationAndSetShowAmount(db, valueSet, app_id, data);
                                }
                            }

                            // (1.5) Share dashboard
                            db.collection('members').find({user_of: app_id}, {}).count(function (err1, userCount) {
                                const valueSet = assistant.createNotificationValueSet("assistant.share-dashboard", assistant.NOTIF_TYPE_QUICK_TIPS, 1, PLUGIN_NAME, assistantConfig, app_id, NOTIFICATION_VERSION);
                                const not_enough_users = (userCount < 3);
                                const max_show_time_not_exceeded = valueSet.showAmount < 1;
                                const data = [];
                                if ((flagIgnoreDAT || assistant.correct_day_and_time(5, 10, dow, hour)) && not_enough_users && max_show_time_not_exceeded || flagForceGenerate) {
                                    assistant.createNotificationAndSetShowAmount(db, valueSet, app_id, data);
                                }
                            });

                            // (2) generate insight notifications

                            { // (2.1) active users bow positive
                                const valueSet = assistant.createNotificationValueSet("assistant.active-users-bow-pos", assistant.NOTIF_TYPE_INSIGHTS, 1, PLUGIN_NAME, assistantConfig, app_id, NOTIFICATION_VERSION);
                                const enough_active_users = retSession.total_users.total > 100;//active users > 20
                                const val_current_period = retSession.total_users.total;
                                const change_amount = parseFloat(retSession.total_users.change);
                                const enough_active_user_change = change_amount >= 10;
                                const val_previous_period = val_current_period / (change_amount / 100 + 1);
                                const data = [val_current_period, Math.round(val_previous_period)];

                                if ((flagIgnoreDAT || assistant.correct_day_and_time(1, 10, dow, hour)) && enough_active_users && enough_active_user_change || flagForceGenerate) {
                                    assistant.createNotificationAndSetShowAmount(db, valueSet, app_id, data);
                                }
                            }

                            { // (2.2) active users bow negative
                                const valueSet = assistant.createNotificationValueSet("assistant.active-users-bow-neg", assistant.NOTIF_TYPE_INSIGHTS, 2, PLUGIN_NAME, assistantConfig, app_id, NOTIFICATION_VERSION);
                                const enough_active_users = retSession.total_users.total > 100;//active users > 20
                                const val_current_period = retSession.total_users.total;
                                const change_amount = parseFloat(retSession.total_users.change);
                                const enough_active_user_change = change_amount <= -10;
                                const val_previous_period = val_current_period / (change_amount / 100 + 1);
                                const data = [val_current_period, Math.round(val_previous_period)];

                                if ((flagIgnoreDAT || assistant.correct_day_and_time(1, 10, dow, hour)) && enough_active_users && enough_active_user_change || flagForceGenerate) {
                                    assistant.createNotificationAndSetShowAmount(db, valueSet, app_id, data);
                                }
                            }

                            { // (2.3) active users eow positive
                                const valueSet = assistant.createNotificationValueSet("assistant.active-users-eow-pos", assistant.NOTIF_TYPE_INSIGHTS, 3, PLUGIN_NAME, assistantConfig, app_id, NOTIFICATION_VERSION);
                                const enough_active_users = retSession.total_users.total > 100;//active users > 20
                                const val_current_period = retSession.total_users.total;
                                const change_amount = parseFloat(retSession.total_users.change);
                                const enough_active_user_change = change_amount >= 10;
                                const val_previous_period = val_current_period / (change_amount / 100 + 1);
                                const data = [val_current_period, Math.round(val_previous_period)];

                                if ((flagIgnoreDAT || assistant.correct_day_and_time(4, 16, dow, hour)) && enough_active_users && enough_active_user_change || flagForceGenerate) {
                                    assistant.createNotificationAndSetShowAmount(db, valueSet, app_id, data);
                                }
                            }

                            {// (2.4) active users eow positive
                                const valueSet = assistant.createNotificationValueSet("assistant.active-users-eow-neg", assistant.NOTIF_TYPE_INSIGHTS, 4, PLUGIN_NAME, assistantConfig, app_id, NOTIFICATION_VERSION);
                                const enough_active_users = retSession.total_users.total > 100;//active users > 20
                                const val_current_period = retSession.total_users.total;
                                const change_amount = parseFloat(retSession.total_users.change);
                                const enough_active_user_change = change_amount <= -10;
                                const val_previous_period = val_current_period / (change_amount / 100 + 1);
                                const data = [val_current_period, Math.round(val_previous_period)];
                                if ((flagIgnoreDAT || assistant.correct_day_and_time(4, 16, dow, hour)) && enough_active_users && enough_active_user_change || flagForceGenerate) {
                                    assistant.createNotificationAndSetShowAmount(db, valueSet, app_id, data);
                                }
                            }

                            { // (2.11) session duration bow positive
                                const valueSet = assistant.createNotificationValueSet("assistant.avg-session-duration-bow-pos", assistant.NOTIF_TYPE_INSIGHTS, 5, PLUGIN_NAME, assistantConfig, app_id, NOTIFICATION_VERSION);
                                const enough_active_users = retSession.total_sessions.total > 100;//active users > 20
                                const val_current_period = retSession.avg_time.total;
                                const change_amount = parseFloat(retSession.avg_time.change);
                                const enough_session_duration_change = change_amount >= 10;
                                const val_previous_period = val_current_period / (change_amount / 100 + 1);
                                const data = [Math.floor(val_current_period), Math.round((val_current_period - Math.floor(val_current_period)) * 60), Math.floor(val_previous_period), Math.round((val_previous_period - Math.floor(val_previous_period)) * 60)];

                                if ((flagIgnoreDAT || assistant.correct_day_and_time(4, 16, dow, hour)) && enough_active_users && enough_session_duration_change || flagForceGenerate) {
                                    assistant.createNotificationAndSetShowAmount(db, valueSet, app_id, data);
                                }
                            }
                            //todo iespējams gan pozitīvam, gan negatīvam variantam jāiedod tas pats id
                            { // (2.12) session duration bow negative
                                const valueSet = assistant.createNotificationValueSet("assistant.avg-session-duration-bow-neg", assistant.NOTIF_TYPE_INSIGHTS, 6, PLUGIN_NAME, assistantConfig, app_id, NOTIFICATION_VERSION);
                                const enough_active_users = retSession.total_sessions.total > 100;//active users > 20
                                const val_current_period = parseFloat(retSession.avg_time.total);
                                if (retSession.avg_time.change === "NA") retSession.avg_time.change = "0";
                                const change_amount = parseFloat(retSession.avg_time.change);
                                const enough_session_duration_change = change_amount <= -10;
                                const val_previous_period = val_current_period / (change_amount / 100 + 1);//todo check the math
                                const data = [Math.floor(val_current_period), Math.round((val_current_period - Math.floor(val_current_period)) * 60), Math.floor(val_previous_period), Math.round((val_previous_period - Math.floor(val_previous_period)) * 60)];

                                if ((flagIgnoreDAT || assistant.correct_day_and_time(4, 16, dow, hour)) && enough_active_users && enough_session_duration_change || flagForceGenerate) {
                                    assistant.createNotificationAndSetShowAmount(db, valueSet, app_id, data);
                                }
                            }

                            {
                                const hours_24 = 1000*60*60*24;
                                const nowTime = 1485547643000;

                                const paramCopy = {};
                                paramCopy.api_key = params.api_key;
                                paramCopy.app_id = params.app_id;
                                paramCopy.appTimezone = params.appTimezone;
                                paramCopy.qstring = {};
                                paramCopy.qstring.period = "7days";// JSON.stringify([nowTime - hours_24,nowTime]);

                                fetch.getMetric(paramCopy, "sources", null, function(metricData){
                                    log.i('Assistant plugin doing steps: [%j] [%j] [%j] [%j]', 12, params.app_id, app_id, metricData);

                                    metricData = metricData.filter(function (x) {
                                        return x.t > 0;
                                    });

                                    metricData.sort(function (x, y) {
                                        return y.t - x.t;
                                    });

                                    log.i('Sorted Data [%j] [%j]', app_id, metricData);

                                    const enough_sources = metricData.length >= 3;//at least 3 install sources with enough users

                                    if ((flagIgnoreDAT || assistant.correct_day_and_time(2, 15, dow, hour)) && enough_sources && is_mobile || flagForceGenerate) {
                                        let data;
                                        if(metricData >= 3) {
                                            data = [metricData[0]._id, metricData[0].t, metricData[1]._id, metricData[1].t, metricData[2]._id, metricData[2].t];
                                        } else {
                                            data = ["a", 1, "b", 2, "c", 3];
                                        }

                                        const valueSet = assistant.createNotificationValueSet("assistant.top-install-sources", assistant.NOTIF_TYPE_INSIGHTS, 7, PLUGIN_NAME, assistantConfig, app_id, NOTIFICATION_VERSION);
                                        assistant.createNotificationAndSetShowAmount(db, valueSet, app_id, data);
                                    }

                                    if ((flagIgnoreDAT || assistant.correct_day_and_time(3, 15, dow, hour)) && enough_sources && !is_mobile || flagForceGenerate) {
                                        let data;
                                        if(metricData >= 3) {
                                            data = [metricData[0]._id, metricData[0].t, metricData[0].u, metricData[1]._id, metricData[1].t, metricData[1].u, metricData[2]._id, metricData[2].t, metricData[2].u];
                                        } else {
                                            data = ["a", 1, 9, "b", 2, 8, "c", 3, 7];
                                        }
                                        const valueSet = assistant.createNotificationValueSet("assistant.top-referrals", assistant.NOTIF_TYPE_INSIGHTS, 8, PLUGIN_NAME, assistantConfig, app_id, NOTIFICATION_VERSION);
                                        assistant.createNotificationAndSetShowAmount(db, valueSet, app_id, data);
                                    }
                                });
                            }

                            //log.i('Assistant plugin doing steps BIG: [%j] ', 20);
                            // (3) generate announcment notifications

                            //todo improve feed period selection so that it is possible to show the event immediate and not once per day
                             // (3.1) blog page

                            const nowTimestamp = Date.now();//timestamp now ms
                            const intervalMs = 24 * 60 * 60 * 1000;//the last 24 hours in ms

                            parser.parseURL('https://medium.com/feed/countly', function(err, parsed) {
                                //log.i(parsed.feed.title);
                                parsed.feed.entries.forEach(function(entry) {
                                    const eventTimestamp = Date.parse(entry.pubDate);//rss post timestamp

                                    const valueSet = assistant.createNotificationValueSet("assistant.announcement-blog-post", assistant.NOTIF_TYPE_ANNOUNCEMENTS, 1, PLUGIN_NAME, assistantConfig, app_id, NOTIFICATION_VERSION);
                                    const blog_post_ready = (nowTimestamp - eventTimestamp) <= intervalMs;//the rss post was published in the last 24 hours
                                    const data = [entry.title, entry.link];
                                    //log.i(entry.title + ':' + entry.link + ":" + entry.pubDate);
                                    //log.i(eventTimestamp + " : " + nowTimestamp + " : " + (nowTimestamp - eventTimestamp) + " : " + intervalMs + " | " + blog_post_ready);
                                    if ((flagIgnoreDAT || assistant.correct_time(15, hour)) && blog_post_ready || flagForceGenerate) {
                                        assistant.createNotificationAndSetShowAmount(db, valueSet, app_id, data);
                                    }
                                });
                            });


                            // (3.2) New iOS SDK release
                            parser.parseURL('https://github.com/countly/countly-sdk-ios/releases.atom', function(err, parsed) {
                                //log.i(parsed.feed.title);
                                parsed.feed.entries.forEach(function(entry) {
                                    const eventTimestamp = Date.parse(entry.pubDate);//rss post timestamp

                                    const valueSet = assistant.createNotificationValueSet("assistant.announcement-ios-release", assistant.NOTIF_TYPE_ANNOUNCEMENTS, 2, PLUGIN_NAME, assistantConfig, app_id, NOTIFICATION_VERSION);
                                    const blog_post_ready = (nowTimestamp - eventTimestamp) <= intervalMs;//the rss post was published in the last 24 hours
                                    const data = [entry.title, entry.link];
                                    //log.i(entry.title + ':' + entry.link + ":" + entry.pubDate + ":" + entry.guid);
                                    //log.i(eventTimestamp + " : " + nowTimestamp + " : " + (nowTimestamp - eventTimestamp) + " : " + intervalMs + " | " + blog_post_ready);
                                    if ((flagIgnoreDAT || assistant.correct_time(15, hour)) && blog_post_ready || flagForceGenerate) {
                                        assistant.createNotificationAndSetShowAmount(db, valueSet, app_id, data);
                                    }
                                });
                            });

                            // (3.3) New Android SDK release
                            parser.parseURL('https://github.com/countly/countly-sdk-android/releases.atom', function(err, parsed) {
                                //log.i(parsed.feed.title);
                                parsed.feed.entries.forEach(function(entry) {
                                    const eventTimestamp = Date.parse(entry.pubDate);//rss post timestamp

                                    const valueSet = assistant.createNotificationValueSet("assistant.announcement-android-release", assistant.NOTIF_TYPE_ANNOUNCEMENTS, 3, PLUGIN_NAME, assistantConfig, app_id, NOTIFICATION_VERSION);
                                    const blog_post_ready = (nowTimestamp - eventTimestamp) <= intervalMs;//the rss post was published in the last 24 hours
                                    const data = [entry.title, entry.link];
                                    //log.i(entry.title + ':' + entry.link + ":" + entry.pubDate + ":" + entry.guid);
                                    //log.i(eventTimestamp + " : " + nowTimestamp + " : " + (nowTimestamp - eventTimestamp) + " : " + intervalMs + " | " + blog_post_ready);
                                    if ((flagIgnoreDAT || assistant.correct_time(15, hour)) && blog_post_ready || flagForceGenerate) {
                                        assistant.createNotificationAndSetShowAmount(db, valueSet, app_id, data);
                                    }
                                });
                            });

                            // (3.3) New community server release
                            parser.parseURL('https://github.com/Countly/countly-server/releases.atom', function(err, parsed) {
                                //log.i(parsed.feed.title);
                                parsed.feed.entries.forEach(function(entry) {
                                    const eventTimestamp = Date.parse(entry.pubDate);//rss post timestamp

                                    const valueSet = assistant.createNotificationValueSet("assistant.announcement-community-server-release", assistant.NOTIF_TYPE_ANNOUNCEMENTS, 4, PLUGIN_NAME, assistantConfig, app_id, NOTIFICATION_VERSION);
                                    const blog_post_ready = (nowTimestamp - eventTimestamp) <= intervalMs;//the rss post was published in the last 24 hours
                                    const data = [entry.title, entry.link];
                                    //log.i(entry.title + ':' + entry.link + ":" + entry.pubDate + ":" + entry.guid);
                                    //log.i(eventTimestamp + " : " + nowTimestamp + " : " + (nowTimestamp - eventTimestamp) + " : " + intervalMs + " | " + blog_post_ready);
                                    if ((flagIgnoreDAT || assistant.correct_time(15, hour)) && blog_post_ready || flagForceGenerate) {
                                        assistant.createNotificationAndSetShowAmount(db, valueSet, app_id, data);
                                    }
                                });
                            });



                            callback(null, null);
                        });
                    });
                }, function (err, results) {
                    log.i('Assistant for [%j] plugin resolving', PLUGIN_NAME);
                    resolve();
                });
            } catch (ex) {
                log.i('Assistant plugin [%j] FAILED!!!!! [%j]', PLUGIN_NAME, ex);
                resolve();
            }
        });
    }
}(assistantJob));

module.exports = assistantJob;
