'use strict';
const assistantJob = {},
    plugins = require('../../pluginManager.js'),
    log = require('../../../api/utils/log.js')('assistantJob:module_star-rating'),
    fetch = require('../../../api/parts/data/fetch.js'),
    async = require("async"),
    assistant = require("../../assistant/api/assistant.js");


(function (assistantJob) {
    const PLUGIN_NAME = "star-rating";
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
                async.map(result_apps_data, function (ret_app_data, callback) {
                    const is_mobile = ret_app_data.type == "mobile";//check if app type is mobile or web
                    const app_id = ret_app_data._id;
                    log.i('Creating assistant notifications from [%j] [%j]', PLUGIN_NAME, 1);
                    db.collection('events').findOne({_id: app_id}, {}, function (events_err, events_result) {
                        { //(1.1) Star rating integration
                            const valueSet = assistant.createNotificationValueSet("assistant.star-rating-integration", assistant.NOTIF_TYPE_QUICK_TIPS, 1, PLUGIN_NAME, assistantConfig, app_id, NOTIFICATION_VERSION);
                            const no_star_rating = (typeof events_result === "undefined") || (events_result === null) || (typeof events_result.list === "undefined") || (typeof events_result.list !== "undefined" && events_result.list.indexOf("[CLY]_star") === -1);
                            const star_rating_not_enabled = !plugins.isPluginEnabled("star-rating");
                            const max_show_time_not_exceeded = valueSet.showAmount < 3;
                            const data = [];
                            if ((flagIgnoreDAT || assistant.correct_day_and_time(4, 15, dow, hour)) && (no_star_rating || star_rating_not_enabled) && is_mobile && max_show_time_not_exceeded || flagForceGenerate) {
                                log.i('Creating assistant notifications from [%j] [%j]', PLUGIN_NAME, 2);
                                assistant.createNotificationAndSetShowAmount(db, valueSet, app_id, data);
                            }
                        }

                        callback(null, null);
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
    };
}(assistantJob));

module.exports = assistantJob;