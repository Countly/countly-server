const plugin = {},
    common = require('../../../api/utils/common.js'),
    plugins = require('../../pluginManager.js'),
    log = common.log('assistant:api'),
    fetch = require('../../../api/parts/data/fetch.js'),
    async = require("async"),
    assistant = require("./assistant.js"),
    _ = require('underscore');

(function (plugin) {
    plugins.register("/master", function (ob) {
        // Allow configs to load & scanner to find all jobs classes
        setTimeout(() => {
            require('../../../api/parts/jobs').job('assistant:generate').replace().schedule("every " + assistant.JOB_SCHEDULE_INTERVAL + " minutes starting on the 0 min");
        }, 3000);
    });

    plugins.register("/o/assistant", function (ob) {
        const params = ob.params;
        const paths = ob.paths;

        if (!params.qstring.api_key) {
            common.returnMessage(params, 400, 'Missing parameter "api_key"');
            return false;
        }

        const api_key = params.qstring.api_key;//get target users api key
        const app_id = params.qstring.app_id;//get target apps id

        //log.i('Assistant plugin request: Get All Notifications');
        const validate = ob.validateUserForMgmtReadAPI;
        validate(function (params) {
            const member = params.member;

            if(_.isUndefined(app_id) || app_id === null) {
                //app id not provided, not app targeted

                //for a single user return all of his notifications for all of his apps
                assistant.getNotificationsForUser(common.db, member, api_key, function (err, results) {
                    common.returnOutput(params, results);
                });
            } else {
                //app id provided, a single app targeted

                //for a single user return all of his notifications for a specific app
                assistant.getNotificationsForUserForSingleApp(common.db, api_key, app_id, function (err, singleAppNotifications) {
                    common.returnOutput(params, [singleAppNotifications]);
                })
            }



        }, params);
        return true;
    });

    plugins.register("/i/assistant", function (ob) {
        const params = ob.params;
        const paths = ob.paths;

        if (typeof params.qstring.api_key === "undefined") {
            common.returnMessage(params, 400, 'Missing parameter "api_key"');
            return false;
        }

        log.d('Assistant plugin request: /i/assistant');
        const validate = ob.validateUserForMgmtReadAPI;
        validate(function (params) {

            const member = params.member;
            const api_key = params.qstring.api_key;

            const subAction = paths[3];
            log.d('Assistant plugin request: 1, ' + subAction);
            switch (subAction) {
                case 'global':
                case 'private':
                    if (typeof params.qstring.save === "undefined") {
                        common.returnMessage(params, 400, 'Missing parameter "save"');
                        return false;
                    }

                    if (typeof params.qstring.notif === "undefined") {
                        common.returnMessage(params, 400, 'Missing parameter "notif"');
                        return false;
                    }

                    const notif = params.qstring.notif;
                    const save_val = params.qstring.save;

                    let save_action;
                    if (save_val === "true") save_action = true;//save
                    else if (save_val === "false") save_action = false;//unsave

                    if(subAction === 'global') {
                        //this is called when changing the save status of a notification from the frontend
                        //this toggles the global save status
                        log.d('Assistant plugin request: Change global notification status');
                        assistant.changeNotificationSavedStatus(false, save_action, notif, api_key, common.db);
                        common.returnOutput(params, "the global action was done " + save_action);
                    } else if(subAction === 'private'){
                        //this is called when changing the save status of a notification from the frontend
                        //this toggles the private save status
                        log.d('Assistant plugin request: Change personal notification status');
                        assistant.changeNotificationSavedStatus(true, save_action, notif, api_key, common.db);
                        common.returnOutput(params, "the private action was done " + save_action);
                    }
                    break;
                case 'create_external':
                    //this is called when another plugin other than the assistant wants to create a notification from the frontend
                    log.d('Assistant plugin request: Change personal notification status');

                    try {
                        //read provided fields
                        const notifData = JSON.parse(params.qstring.notif_data);
                        const pluginName = params.qstring.owner_name;
                        const notifType = params.qstring.notif_type;
                        const notifSubType = params.qstring.notif_subtype;
                        const i18nId = params.qstring.i18n_id;
                        const notifAppId = params.qstring.notif_app_id;
                        const notificationVersion = params.qstring.notif_version;
                        const targetUserApiKey = params.qstring.target_user_api_key;

                        //check if they are set
                        if (_.isUndefined(notifData)) {
                            common.returnMessage(params, 400, 'Missing parameter "notif_data"');
                            return false;
                        }

                        if (_.isUndefined(pluginName)) {
                            common.returnMessage(params, 400, 'Missing parameter "owner_name"');
                            return false;
                        }

                        if (_.isUndefined(notifType)) {
                            common.returnMessage(params, 400, 'Missing parameter "notif_type"');
                            return false;
                        }

                        if (_.isUndefined(notifSubType)) {
                            common.returnMessage(params, 400, 'Missing parameter "notif_subtype"');
                            return false;
                        }

                        if (_.isUndefined(i18nId)) {
                            common.returnMessage(params, 400, 'Missing parameter "i18n_id"');
                            return false;
                        }

                        if (_.isUndefined(notifAppId)) {
                            common.returnMessage(params, 400, 'Missing parameter "notif_app_id"');
                            return false;
                        }

                        if (_.isUndefined(notificationVersion)) {
                            common.returnMessage(params, 400, 'Missing parameter "notif_version"');
                            return false;
                        }

                        assistant.createNotificationExternal(common.db, notifData, pluginName, notifType, notifSubType, i18nId, notifAppId, notificationVersion, targetUserApiKey, function (succeeded, err) {
                            if (succeeded) {
                                common.returnOutput(params, prepareMessage("Succeded in creating notification", null, null));
                            } else {
                                if (_.isUndefined(err) || err === null) {
                                    err = "N/A";
                                }
                                common.returnMessage(params, 500, prepareMessage('Failed to create notification', err, null));
                            }
                        });
                    }catch (ex)
                    {
                        common.returnMessage(params, 500, prepareMessage('Problem while trying to create notification', ex, null));
                        return false;
                    }
                    break;
                default:
                    common.returnMessage(params, 400, 'Invalid path');
                    return false;
                    break;
            }

            log.d('Assistant plugin request: 3');
        }, params);
        log.d('Assistant plugin request: 4');
        return true;
    });

    const prepareMessage = function (message, error, data) {
        let ret = {};
        ret.message = message;
        if(!_.isUndefined(error) && error != null) {
            ret.error = error;
        }

        if(!_.isUndefined(data) && data != null) {
            ret.data = data;
        }

        return ret;
    };

    plugins.register("/i/assistant_generate_all", function (ob) {
        const params = ob.params;

        if (typeof params.qstring.api_key === "undefined") {
            common.returnMessage(params, 400, 'Missing parameter "api_key"');
            return false;
        }
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

        if (typeof params.qstring.api_key === "undefined") {
            common.returnMessage(params, 400, 'Missing parameter "api_key"');
            return false;
        }
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

    //for debugging
    var db_name_notifs = "assistant_notifs";
    var db_name_config = "assistant_config";

    plugins.register("/i/asistdelete", function (ob) {
        var params = ob.params;

        if (typeof params.qstring.api_key === "undefined") {
            common.returnMessage(params, 400, 'Missing parameter "api_key"');
            return false;
        }
        log.d('Assistant plugin request: /i/asistdelete');

        ob.validateUserForGlobalAdmin(params, function (params) {

            common.db.collection(db_name_notifs).drop();
            common.db.collection(db_name_config).drop();

            common.returnOutput(params, prepareMessage("Delete was ! completed", null, null));
            return;
        });

        return true;
    });

    plugins.register("/i/apps/delete", function(ob){
        //delete all notifications for specific app
        var appId = ob.appId;
        common.db.collection(db_name_notifs).remove({app_id:appId}, function(){});
        common.db.collection(db_name_config).remove({_id: common.db.ObjectID(appId)}, function(){});
    });

    plugins.register("/i/apps/clear_all", function(ob){
        //delete all unsaved notifications for specific app
        var appId = ob.appId;
        common.db.collection(db_name_notifs).remove({app_id:appId, saved_global:false, saved_private:[]}, function(){});
    });

    plugins.register("/i/apps/clear", function(ob){
        //delete all unsaved notifications for specific app in specific time period
        var appId = ob.appId;
        common.db.collection(db_name_notifs).remove({app_id:appId, saved_global:false, saved_private:[], created_date:{$lt:new Date(ob.moment)}}, function(){});
    });

    plugins.register("/i/apps/reset", function(ob){
        //delete all notifications for specific app
        var appId = ob.appId;
        common.db.collection(db_name_notifs).remove({app_id:appId}, function(){});
        common.db.collection(db_name_config).remove({_id: common.db.ObjectID(appId)}, function(){});
    });

}(plugin));

module.exports = plugin;