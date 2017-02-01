'use strict';
const assistant = {},
    plugins = require('../../pluginManager.js'),
    log = require('../../../api/utils/log.js')('assistant:module'),
    fetch = require('../../../api/parts/data/fetch.js'),
    pluginManager = require('../../pluginManager.js'),
    PromiseB = require("bluebird"),
    time = require('time')(Date),
    async = require("async");

(function (assistant) {
    const db_name_notifs = "assistant_notifs";
    const db_name_config = "assistant_config";

    //notification types
    assistant.NOTIF_TYPE_QUICK_TIPS = "1";
    assistant.NOTIF_TYPE_INSIGHTS = "2";
    assistant.NOTIF_TYPE_ANNOUNCEMENTS = "3";

    assistant.JOB_SCHEDULE_INTERVAL = 30;//in minutes

    assistant.createNotification = function (db, data, pluginName, type, subtype, i18n, appId, notificationVersion) {
        const new_notif = {
            data: data, //names and numbers that are relevant for customizing assitant notifications
            plugin_name: pluginName, //the name of the plugin that created this notification
            notif_type: "" + type, //the type of this plugin, used for filtering
            notif_subtype: "" + subtype, //together with type it identifies the specific the specific notification that is created by a plugin
            created_date: new Date(), //contains the original creation date
            version: notificationVersion, //notification version ID of when it was created, should be increased when the data format changes
            app_id: "" + appId, //the ID of the application for which it was created
            cd: new Date(), //used for TTL, it's set null if it should not be deleted
            saved_global: false, //if this notification is saved globally
            saved_private: [], // a list of user ID's for which this notification is saved privately
            i18n_id: i18n //the ID that will be used for internationalization on the frontend
        };

        db.collection(db_name_notifs).insert(new_notif, function (err_insert, result_insert) {
            log.i('Assistant module createNotification error: [%j], result: [%j] ', err_insert, result_insert);
        });
    };

    assistant.getNotificationsForUser = function (db, member, api_key, givenCallback) {
        //prepare the function to use in both cases
        const getAppData = function (appList) {
            async.map(appList, function (app_id, callback) {
                log.i('App id: %s', app_id);

                db.collection('apps').findOne({_id: db.ObjectID(app_id)}, {type: 1}, function (err, document) {
                    //todo handle null case
                    const isMobile = document.type == "mobile";//check if app type is mobile or web

                    //get global notifications for this app
                    db.collection(db_name_notifs).find({app_id: app_id}, {}).toArray(function (err1, notifs) {
                        //todo handle null case
                        //log.i('Doing stuff at step: %s, ALL, error: [%j], data: [%j]', 3, err1, notifs);
                        //get global saved notifications for this app
                        db.collection(db_name_notifs).find({
                            app_id: app_id,
                            saved_global: true
                        }, {}).toArray(function (err2, notifs_global) {
                            //todo handle null case
                            //log.i('Doing stuff at step: %s, SAVED GLOBAL, error: [%j], data: [%j]', 4, err2, notifs_global);
                            //get privatly saved notifications for this app
                            db.collection(db_name_notifs).find({
                                app_id: app_id,
                                saved_private: api_key
                            }, {}).toArray(function (err3, notifs_saved) {
                                //todo handle null case
                                //log.i('Doing stuff at step: %s, SAVED PRIVATE, error: [%j], data: [%j]', 5, err3, notifs_saved);

                                callback(null, {
                                    id: app_id,
                                    isMobile: isMobile,
                                    notifications: notifs,
                                    notifs_saved_global: notifs_global,
                                    notifs_saved_private: notifs_saved
                                });
                            });
                        });
                    });
                });

            }, givenCallback);
        };

        if (member.global_admin) {
            //get app list from db if user is global admin
            db.collection('apps').find({}, {_id: 1}).toArray(function (err, result) {
                //map the array of objects to an array of strings
                result = result.map(function (a) {
                    return a._id + "";
                });
                getAppData(result);
            });
        } else {
            //get user list from member field
            getAppData(member.user_of);
        }
    };

    /*
     th - target time
     ch - current time
     hw - half width

     this functions return true if:
     tt - hw <= ct < tt + hw
     */
    //todo unit test this
    assistant.correct_day_and_time = function (target_day, target_hour, current_day, current_hour) {
        const halfWidthHours = (assistant.JOB_SCHEDULE_INTERVAL / 2) / 60;// half of the width/length in hours
        const hw = halfWidthHours / 24;//half of the width in days

        const ct = current_day + (current_hour / 24);//current time
        const tt = target_day + (target_hour / 24);//target time

        if ((tt - hw <= ct && ct < tt + hw    ) ||
            (tt - hw - 7 <= ct && ct < tt + hw - 7) ||
            (tt - hw + 7 <= ct && ct < tt + hw + 7)) {
            return true
        }

        return false;
    };

    //todo unit test this
    assistant.correct_time = function (target_hour, current_hour) {
        return assistant.correct_day_and_time(3, target_hour, 3, current_hour);
    };

    assistant.changeNotificationSavedStatus = function (do_personal, do_save, notif_id, user_id, db) {
        if (do_save) {
            //we need to save it

            if (do_personal) {
                // add the person reference to user list
                db.collection(db_name_notifs).update({_id: db.ObjectID(notif_id)}, {
                    $unset: {cd: ""},
                    $addToSet: {saved_private: user_id}
                }, function (error, ret) {
                });
            } else {
                // set the global saved flag to true
                // set bool to true, remove TTL
                db.collection(db_name_notifs).update({_id: db.ObjectID(notif_id)}, {
                    $unset: {cd: ""},
                    $set: {saved_global: true}
                }, function (error, ret) {
                    //log.i('Assistant plugin request saving_function: [%j], error: [%j], ret: [%j]', 4.1, error, ret);
                });
            }
        } else {
            //we need to unsave it
            const check_and_set_ttl = function (ret_obj) {
                //log.i('Assistant plugin request saving_function: [%j], [%j]', 8, ret_obj);
                const obj = ret_obj.value;
                if (obj.saved_global == false && obj.saved_private.length === 0) {
                    //todo set cd to old created date
                    db.collection(db_name_notifs).update({
                        _id: db.ObjectID(notif_id),
                        saved_global: false,
                        saved_private: []
                    }, {$set: {cd: new Date()}}, {new: true}, function (error, ret) {
                    });
                }
            };

            if (do_personal) {
                // remove the personal save reference from the user list
                db.collection(db_name_notifs).findAndModify({_id: db.ObjectID(notif_id)}, {}, {$pull: {saved_private: user_id}}, {new: true}, function (error, ret) {
                    check_and_set_ttl(ret);
                });
            } else {
                // set the global saved flag to false
                db.collection(db_name_notifs).findAndModify({_id: db.ObjectID(notif_id)}, {}, {$set: {saved_global: false}}, {new: true}, function (error, ret) {
                    check_and_set_ttl(ret);
                });

            }
        }
    };

    assistant.getAssistantConfig = function (db, callback) {
        db.collection(db_name_config).find({}, {}).toArray(function (err, result) {
            //log.i('Assistant plugin getAssistantConfig: [%j][%j][%j][%j]', 18, err, result, typeof result);
            callback(result);
        });
    };

    assistant.getNotificationShowAmount = function (assistantConfig, pluginName, type, subtype, appID) {
        if (typeof assistantConfig === "undefined") return 0;
        for (let a = 0; a < assistantConfig.length; a++) {
            if ("" + assistantConfig[a]._id === "" + appID) {
                if (typeof assistantConfig[a].notifShowAmount === "undefined") return 0;
                if (typeof assistantConfig[a].notifShowAmount[pluginName] === "undefined") return 0;
                if (typeof assistantConfig[a].notifShowAmount[pluginName][type] === "undefined") return 0;
                if (typeof assistantConfig[a].notifShowAmount[pluginName][type][subtype] === "undefined") return 0;
                return assistantConfig[a].notifShowAmount[pluginName][type][subtype];
            }
        }
        return 0;
    };

    assistant.setNotificationShowAmount = function (db, notifValueSet, newShowAmount, appID) {
        const updateQuery = {};
        updateQuery["notifShowAmount." + notifValueSet.pluginName + "." + notifValueSet.type + "." + notifValueSet.subtype] = newShowAmount;
        db.collection(db_name_config).update({_id: db.ObjectID(appID)}, {$set: updateQuery}, {upsert: true}, function (err, res) {
            //log.i('Assistant plugin setNotificationShowAmount: [%j][%j]', err, res);
        });
    };

    assistant.createNotificationValueSet = function (notificationI18nID, notificationType, notificationSubtype, pluginName, assistantConfig, appID, notificationVersion) {
        //put in notification values for quick access
        const valueSet = {};
        valueSet.pluginName = pluginName;
        valueSet.type = "" + notificationType;
        valueSet.subtype = "" + notificationSubtype;
        valueSet.i18nID = notificationI18nID;
        valueSet.showAmount = assistant.getNotificationShowAmount(assistantConfig, pluginName, valueSet.type, valueSet.subtype, appID);
        valueSet.nVersion = notificationVersion;
        return valueSet;
    };

    assistant.createNotificationAndSetShowAmount = function (db, valueSet, app_id, data) {
        log.i('Assistant creating notification for [%j] plugin with i18nID [%j] for App [%j]', valueSet.pluginName, valueSet.i18nID, app_id);
        assistant.createNotification(db, data, valueSet.pluginName, valueSet.type, valueSet.subtype, valueSet.i18nID, app_id);
        assistant.setNotificationShowAmount(db, valueSet, valueSet.showAmount + 1, app_id);
    };

    assistant.generateNotifications = function (countlyDb, callback, flagForceGenerateNotifications, flagIgnoreDayAndTime) {

        log.i("Generate Notifications function");
        //todo make sure that flagForceGenerateNotifications is a boolean
        //todo make sure that flagIgnoreDayAndTime is a boolean

        //get a list of all apps
        countlyDb.collection('apps').find({}, {}).toArray(function (err_apps_data, result_apps_data) {
            //load the assistant config
            assistant.getAssistantConfig(countlyDb, function (returnedConfiguration) {

                //log.i("Generate Notifications job, apps DB :" + JSON.stringify(result_apps_data));

                //assistantGlobalCommon (agc) contains values that are passed and used in all notification generators
                const assistantGlobalCommon = {};
                assistantGlobalCommon.appsData = result_apps_data;
                assistantGlobalCommon.assistantConfiguration = returnedConfiguration;

                //set if notifications should be generated regardless of their constraints
                assistantGlobalCommon.forceGenerateNotifications = flagForceGenerateNotifications;

                //set if notifications should be generated ignoring their time and day
                assistantGlobalCommon.ignoreDayAndTime = flagIgnoreDayAndTime;

                assistantGlobalCommon.db = countlyDb;

                //go through all plugins and start generating notifications for those that support it
                const plugins = pluginManager.getPlugins();
                const promises = [];
                for (let i = 0, l = plugins.length; i < l; i++) {
                    try {
                        //log.i('Preparing job: ' + plugins[i]);
                        promises.push(require("../../" + plugins[i] + "/api/assistantJob").prepareNotifications(countlyDb, assistantGlobalCommon));
                    } catch (ex) {
                        //log.i('Preparation FAILED [%j]', ex);
                    }
                }

                PromiseB.all(promises).then(callback, callback);
            });
        });
    };

    assistant.preparePluginSpecificFields = function(assistantGlobalCommon, appData, PLUGIN_NAME){
        //log.i('Assistant plugin preparePluginSpecificFields: [%j] ', 1);
        const apc = {};//assistant plugin common
        apc.agc = assistantGlobalCommon;

        apc.result_apps_data = apc.agc.appsData;
        apc.assistantConfig = apc.agc.assistantConfiguration;
        apc.flagIgnoreDAT = apc.agc.ignoreDayAndTime;
        apc.flagForceGenerate = apc.agc.forceGenerateNotifications;

        apc.db = apc.agc.db;
        apc.appTimezone = appData.timezone;

        apc.app_id = appData._id;

        apc.is_mobile = appData.type == "mobile";//check if app type is mobile or web

        //set the current time info based on the apps timezone
        apc.dateNow = new Date();//get current day and time
        apc.dateNow.setTimezone(apc.appTimezone);//todo is this fine?
        apc.hour = apc.dateNow.getHours();
        apc.dow = apc.dateNow.getDay();
        if (apc.dow === 0) apc.dow = 7;

        apc.PLUGIN_NAME = PLUGIN_NAME;
        //log.i('Assistant plugin preparePluginSpecificFields: [%j] ', 4);
        return apc;
    };

    assistant.prepareNotificationSpecificFields = function(assistantPluginCommon, notificationI18nID, notificationType, notificationSubtype, notificationVersion){
        const anc = {};//assistant notification common
        anc.apc = assistantPluginCommon;

        anc.notificationI18nID = notificationI18nID;
        anc.notificationType = notificationType;
        anc.notificationSubtype = notificationSubtype;
        anc.notificationVersion = notificationVersion;

        //todo get rid of this
        anc.valueSet = assistant.createNotificationValueSet(anc.notificationI18nID, anc.notificationType, anc.notificationSubtype, anc.apc.PLUGIN_NAME, anc.apc.assistantConfig, anc.apc.app_id, anc.notificationVersion);

        return anc;
    };

    assistant.createNotificationIfRequirementsMet = function (targetDow, targetHour, requirements, data, anc) {
        var correctTimeAndDate = false;

        if(targetDow >= 0) {
            correctTimeAndDate = assistant.correct_day_and_time(targetDow, targetHour, anc.apc.dow, anc.apc.hour);
        } else {
            correctTimeAndDate = assistant.correct_time(targetHour, anc.apc.hour);
        }

        if ((anc.apc.flagIgnoreDAT || correctTimeAndDate) && requirements || anc.apc.flagForceGenerate) {
            assistant.createNotificationAndSetShowAmount(anc.apc.db, anc.valueSet, anc.apc.app_id, data);
        }
    };


}(assistant));

module.exports = assistant;