const exportedPlugin = {};
const common = require('../../../api/utils/common.js');
const plugins = require('../../pluginManager.js');
const log = common.log('assistant:api');
const assistant = require("./assistant.js");
const _ = require('underscore');

(function() {
    plugins.register("/master", function() {
        // Allow configs to load & scanner to find all jobs classes
        setTimeout(() => {
            require('../../../api/parts/jobs').job('assistant:generate').replace().schedule("every " + assistant.JOB_SCHEDULE_INTERVAL + " minutes starting on the 0 min");
        }, 3000);
    });

    plugins.register("/o/assistant", function(ob) {
        const params = ob.params;
        const app_id = params.qstring.app_id;//get target apps id

        log.d('Assistant plugin request: Get All Notifications');
        const validate = ob.validateUserForMgmtReadAPI;
        validate(function(paramsInValidate) {
            const member = paramsInValidate.member;
            const api_key = member.api_key;
            if (_.isUndefined(app_id) || app_id === null) {
                //app id not provided, not app targeted

                //for a single user return all of his notifications for all of his apps
                assistant.getNotificationsForUser(common.db, member, api_key, function(err, results) {
                    common.returnOutput(paramsInValidate, results);
                });
            }
            else {
                //app id provided, a single app targeted

                //for a single user return all of his notifications for a specific app
                assistant.getNotificationsForUserForSingleApp(common.db, api_key, app_id, function(err, singleAppNotifications) {
                    common.returnOutput(paramsInValidate, [singleAppNotifications]);
                });
            }
        }, params);
        return true;
    });

    plugins.register("/i/assistant", function(ob) {
        const params = ob.params;
        const paths = ob.paths;

        log.d('Assistant plugin request: /i/assistant');
        const validate = ob.validateUserForMgmtReadAPI;
        validate(function(paramsInValidate) {
            const api_key = paramsInValidate.member.api_key;

            let save_action;
            let notif;
            let save_val;

            const subAction = paths[3];
            log.d('Assistant plugin request: ' + subAction);
            switch (subAction) {
            case 'global':
            case 'private':
                if (typeof paramsInValidate.qstring.save === "undefined") {
                    common.returnMessage(paramsInValidate, 400, 'Missing parameter "save"');
                    return true;
                }

                if (typeof paramsInValidate.qstring.notif === "undefined") {
                    common.returnMessage(paramsInValidate, 400, 'Missing parameter "notif"');
                    return true;
                }

                notif = paramsInValidate.qstring.notif;
                save_val = paramsInValidate.qstring.save;

                if (save_val === "true") {
                    save_action = true;
                }//save
                else if (save_val === "false") {
                    save_action = false;
                }//unsave

                if (subAction === 'global') {
                    //this is called when changing the save status of a notification from the frontend
                    //this toggles the global save status
                    log.d('Assistant plugin request: Change global notification status');
                    assistant.changeNotificationSavedStatus(false, save_action, notif, api_key, common.db);
                    common.returnOutput(paramsInValidate, "the global action was done " + save_action);
                }
                else if (subAction === 'private') {
                    //this is called when changing the save status of a notification from the frontend
                    //this toggles the private save status
                    log.d('Assistant plugin request: Change personal notification status');
                    assistant.changeNotificationSavedStatus(true, save_action, notif, api_key, common.db);
                    common.returnOutput(paramsInValidate, "the private action was done " + save_action);
                }
                break;
            case 'create_external':
                //this is called when another plugin other than the assistant wants to create a notification from the frontend
                log.d('Assistant plugin request: Change personal notification status');

                try {
                    //read provided fields
                    const notifData = JSON.parse(paramsInValidate.qstring.notif_data);
                    const pluginName = paramsInValidate.qstring.owner_name;
                    const notifType = paramsInValidate.qstring.notif_type;
                    const notifSubType = paramsInValidate.qstring.notif_subtype;
                    const i18nId = paramsInValidate.qstring.i18n_id;
                    const notifAppId = paramsInValidate.qstring.notif_app_id;
                    const notificationVersion = paramsInValidate.qstring.notif_version;
                    const targetUserApiKey = paramsInValidate.qstring.target_user_api_key;

                    //check if they are set
                    if (_.isUndefined(notifData)) {
                        common.returnMessage(paramsInValidate, 400, 'Missing parameter "notif_data"');
                        return true;
                    }

                    if (_.isUndefined(pluginName)) {
                        common.returnMessage(paramsInValidate, 400, 'Missing parameter "owner_name"');
                        return true;
                    }

                    if (_.isUndefined(notifType)) {
                        common.returnMessage(paramsInValidate, 400, 'Missing parameter "notif_type"');
                        return true;
                    }

                    if (_.isUndefined(notifSubType)) {
                        common.returnMessage(paramsInValidate, 400, 'Missing parameter "notif_subtype"');
                        return true;
                    }

                    if (_.isUndefined(i18nId)) {
                        common.returnMessage(paramsInValidate, 400, 'Missing parameter "i18n_id"');
                        return true;
                    }

                    if (_.isUndefined(notifAppId)) {
                        common.returnMessage(paramsInValidate, 400, 'Missing parameter "notif_app_id"');
                        return true;
                    }

                    if (_.isUndefined(notificationVersion)) {
                        common.returnMessage(paramsInValidate, 400, 'Missing parameter "notif_version"');
                        return true;
                    }

                    assistant.createNotificationExternal(common.db, notifData, pluginName, notifType, notifSubType, i18nId, notifAppId, notificationVersion, targetUserApiKey, function(succeeded, err) {
                        if (succeeded) {
                            common.returnOutput(paramsInValidate, prepareMessage("Succeded in creating notification", null, null));
                        }
                        else {
                            if (_.isUndefined(err) || err === null) {
                                err = "N/A";
                            }
                            common.returnMessage(paramsInValidate, 500, prepareMessage('Failed to create notification', err, null));
                        }
                    });
                }
                catch (ex) {
                    common.returnMessage(paramsInValidate, 500, prepareMessage('Problem while trying to create notification', ex, null));
                    return true;
                }
                break;
            default:
                common.returnMessage(paramsInValidate, 400, 'Invalid path');
                return true;
            }

            log.d('Assistant plugin request: 3');
        }, params);
        log.d('Assistant plugin request: 4');
        return true;
    });

    const prepareMessage = function(message, error, data) {
        let ret = {};
        ret.message = message;
        if (!_.isUndefined(error) && error !== null) {
            ret.error = error;
        }

        if (!_.isUndefined(data) && data !== null) {
            ret.data = data;
        }

        return ret;
    };
    /*
    plugins.register("/i/assistant_generate_all", function (ob) {
        const params = ob.params;

        log.d('Assistant plugin request: /i/assistant_generate_all');

        ob.validateUserForGlobalAdmin(params, function (params) {
            const callback = function () {
                log.i('Assistant plugin request: /i/assistant_generate_all finished');
            };

            assistant.generateNotifications(common.db, callback, true, true);

            common.returnOutput(params, prepareMessage("Calling assistant_generate_all was ! completed", null, null));
        });

        return true;
    });

    plugins.register("/i/assistant_generate_all_job", function (ob) {
        const params = ob.params;

        log.i('Assistant plugin request: /i/assistant_generate_all_job');

        ob.validateUserForGlobalAdmin(params, function (params) {
            const callback = function () {
                log.i('Assistant plugin request: /i/assistant_generate_all_job finished');
            };

            require('../../../api/parts/jobs').job('assistant:generate').in(1);

            common.returnOutput(params, "Calling assistant_generate_all_job was ! completed");
            return true;
        });

        return true;
    });
*/
    //for debugging
    var db_name_notifs = "assistant_notifs";
    var db_name_config = "assistant_config";

    /*
    plugins.register("/i/asistdelete", function (ob) {
        var params = ob.params;

        log.i('Assistant plugin request: /i/asistdelete');

        ob.validateUserForGlobalAdmin(params, function (params) {

            common.db.collection(db_name_notifs).drop();
            common.db.collection(db_name_config).drop();

            common.returnOutput(params, prepareMessage("Delete was ! completed", null, null));
            return;
        });

        return true;
    });
    */

    plugins.register("/i/apps/delete", function(ob) {
        //delete all notifications for specific app
        var appId = ob.appId;
        common.db.collection(db_name_notifs).remove({app_id: appId}, function() {});
        common.db.collection(db_name_config).remove({_id: common.db.ObjectID(appId)}, function() {});
    });

    plugins.register("/i/apps/clear_all", function(ob) {
        //delete all unsaved notifications for specific app
        var appId = ob.appId;
        common.db.collection(db_name_notifs).remove({app_id: appId, saved_global: false, saved_private: []}, function() {});
    });

    plugins.register("/i/apps/clear", function(ob) {
        //delete all unsaved notifications for specific app in specific time period
        var appId = ob.appId;
        common.db.collection(db_name_notifs).remove({app_id: appId, saved_global: false, saved_private: [], created_date: {$lt: new Date(ob.moment)}}, function() {});
    });

    plugins.register("/i/apps/reset", function(ob) {
        //delete all notifications for specific app
        var appId = ob.appId;
        common.db.collection(db_name_notifs).remove({app_id: appId}, function() {});
        common.db.collection(db_name_config).remove({_id: common.db.ObjectID(appId)}, function() {});
    });

}(exportedPlugin));

module.exports = exportedPlugin;