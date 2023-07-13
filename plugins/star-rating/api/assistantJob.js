const exportedAssistantJob = {};
const plugins = require('../../pluginManager.js');
const log = require('../../../api/utils/log.js')('assistantJob:module_star-rating');
const async = require("async");
const assistant = require("../../assistant/api/assistant.js");
const _ = require('underscore');

(function(assistantJob) {
    const PLUGIN_NAME = "star-rating";
    assistantJob.prepareNotifications = function(db, providedInfo) {
        return new Promise(function(resolve) {
            try {
                log.i('Creating assistant notifications from [%j]', PLUGIN_NAME);
                const NOTIFICATION_VERSION = 1;

                async.map(providedInfo.appsData, function(ret_app_data, callback) {
                    //assistant plugin common fields
                    const apc = assistant.preparePluginSpecificFields(providedInfo, ret_app_data, PLUGIN_NAME);

                    //log.i('Creating assistant notifications from [%j] [%j]', PLUGIN_NAME, 1);
                    db.collection('events').findOne({_id: apc.app_id}, {}, function(events_err, events_result) {
                        { //(1.1) Star rating integration
                            const anc = assistant.prepareNotificationSpecificFields(apc, "assistant.star-rating-integration", assistant.NOTIF_TYPE_QUICK_TIPS, 1, NOTIFICATION_VERSION);
                            const no_star_rating = (typeof events_result === "undefined") || (events_result === null) || (typeof events_result.list === "undefined") || (typeof events_result.list !== "undefined" && events_result.list.indexOf("[CLY]_star") === -1);
                            const star_rating_not_enabled = !plugins.isPluginEnabled("star-rating");
                            const max_show_time_not_exceeded = anc.showAmount < 3;
                            const data = [];

                            assistant.createNotificationIfRequirementsMet(4, 15, ((no_star_rating || star_rating_not_enabled) && apc.is_mobile && max_show_time_not_exceeded), data, anc);
                        }
                        callback(null, null);
                    });
                }, function(err) {
                    if (!_.isUndefined(err) && err !== null) {
                        log.e("Error while doing assistantJob for [%j], err:[%j]", PLUGIN_NAME, err);
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