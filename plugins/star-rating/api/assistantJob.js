var assistantJob = {},
    plugins = require('../../pluginManager.js'),
    log = require('../../../api/utils/log.js')('assistantJob:module_star-rating'),
    fetch = require('../../../api/parts/data/fetch.js'),
    async = require("async"),
    assistant = require("../../assistant/api/assistant.js");


(function (assistantJob) {
    var PLUGIN_NAME = "star-rating";
    assistantJob.prepareNotifications = function (db, providedInfo) {

        return new Promise(function(resolve, reject){

            log.i('Assistant plugin inside STAR RATINGS');

            try {
                var result_apps_data = providedInfo.appsData;
                var dow = providedInfo.timeAndDate.dow;
                var hour = providedInfo.timeAndDate.hour;
                var assistantConfig = providedInfo.assistantConfiguration;
                async.map(result_apps_data, function (ret_app_data, callback) {
                    var is_mobile = ret_app_data.type == "mobile";//check if app type is mobile or web
                    var app_id = ret_app_data._id;
                    log.i('Assistant plugin inside loop, id: [%j], result: [%j] ', app_id, is_mobile);

                    // (Star rating integration
                    (function () {
                        var valueSet = assistant.createNotificationValueSet("assistant.star-rating-integration", assistant.NOTIF_TYPE_QUICK_TIPS, 3, PLUGIN_NAME, assistantConfig, app_id);
                        var no_star_rating = (typeof events_result === "undefined") || (events_result === null) || (typeof events_result.list === "undefined") || (typeof events_result.list !== "undefined" && events_result.list.indexOf("[CLY]_star") === -1);
                        var star_rating_not_enabled = !plugins.isPluginEnabled("star-rating");
                        var max_show_time_not_exceeded = valueSet.showAmount < 3;
                        log.i('Assistant plugin doing steps: [%j] [%j] [%j] [%j] [%j]', 3.01, no_star_rating, star_rating_not_enabled, max_show_time_not_exceeded, is_mobile);

                        if (assistant.correct_day_and_time(4, 15, dow, hour) && (no_star_rating || star_rating_not_enabled) && is_mobile && max_show_time_not_exceeded) {
                            log.i('Assistant plugin doing steps: [%j] ', 3.1);
                            assistant.createNotification(db, [], valueSet.pluginName, valueSet.type, valueSet.subtype, valueSet.nName, app_id);
                            assistant.setNotificationShowAmount(db, valueSet, valueSet.showAmount + 1, app_id);
                        }
                    })();

                    callback(null, null);
                }, function (err, results) {
                    log.i('Assistant for [%j] plugin resolving', PLUGIN_NAME);
                    resolve();
                });
            } catch (ex) {
                log.i('Assistant plugin STAR RATINGS FAILED!!!!! [%j]', ex);
            }
        });
    };

}(assistantJob));

module.exports = assistantJob;