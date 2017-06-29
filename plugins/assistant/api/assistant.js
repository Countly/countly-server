const assistant = {},
    plugins = require('../../pluginManager.js'),
    log = require('../../../api/utils/log.js')('assistant:module'),
    fetch = require('../../../api/parts/data/fetch.js'),
    pluginManager = require('../../pluginManager.js'),
    PromiseB = require("bluebird"),
    time = require('time')(Date),
    async = require("async"),
    _ = require('underscore');

(function (assistant) {
    const db_name_notifs = "assistant_notifs";
    const db_name_config = "assistant_config";

    //notification types
    assistant.NOTIF_TYPE_QUICK_TIPS = "1";
    assistant.NOTIF_TYPE_INSIGHTS = "2";
    assistant.NOTIF_TYPE_ANNOUNCEMENTS = "3";
    assistant.NOTIF_TYPE_INFORMATIONAL = "4";//information about some local event, for example, a job that is running

    assistant.JOB_SCHEDULE_INTERVAL = 30;//in minutes

    /**
     * Main function used for creating notifications
     * @param db - link to the db object
     * @param data - names and numbers that are relevant for customizing assitant notifications
     * @param pluginName - the name of the plugin that created this notification
     * @param type - the type of this plugin, used for filtering
     * @param subtype - together with type it identifies the specific the specific notification that is created by a plugin
     * @param i18n - the ID that will be used for internationalization on the frontend
     * @param appId - the ID of the application for which it was created
     * @param notificationVersion - notification version ID of when it was created, should be increased when the data format changes
     * @param targetUserApiKey - if this notifications is used to target a specific user, this contains it's api key
     * @param batchInfoHolder - if this is null, the insert should be done immediately, if not, the new object should be added to the array for future batching
     */
    assistant.createNotification = function (db, data, pluginName, type, subtype, i18n, appId, notificationVersion, targetUserApiKey, batchInfoHolder, callback) {
        try {
            if (_.isUndefined(batchInfoHolder)) {
                batchInfoHolder = null;
            }

            const targetUserArray = (_.isUndefined(targetUserApiKey) || targetUserApiKey == null) ? [] : [targetUserApiKey];

            const new_notif = {
                data: data,
                plugin_name: pluginName,
                notif_type: "" + type,
                notif_subtype: "" + subtype,
                created_date: new Date(), //contains the original creation date
                version: notificationVersion,
                app_id: "" + appId,
                cd: new Date(), //used for TTL, it's set null if it should not be deleted
                saved_global: false, //if this notification is saved globally
                saved_private: [], // a list of user ID's for which this notification is saved privately
                i18n_id: i18n,
                target_user_array: targetUserArray
            };

            if (batchInfoHolder === null) {
                insertNotificationBulk(db, [new_notif], function () {
                    if(callback != null){
                        callback();
                    }
                });
            } else {
                batchInfoHolder.push(new_notif);
                if(callback != null){
                    callback();
                }
            }
        } catch (ex) {
            log.e('assistant.createNotification error:[%j]', { message: ex.message, stack: ex.stack });
            if(callback != null){
                callback();
            }
        }
    };

    insertNotificationBulk = function(db, notifData, callback){
        try {
            log.d('About to do insertNotificationBulk');

            if(_.isUndefined(notifData)) {
                log.e('Trying to pass "undefined" notifData in insertNotificationBulk');
                return;
            }

            if(notifData == null) {
                log.e('Trying to pass "null" notifData in insertNotificationBulk');
                return;
            }

            if(notifData.length == 0){
                log.d('Received empty notifData array for insertNotificationBulk, skipping db call');
                if (callback !== null) {
                    callback(null, {});
                }
                return;
            }

            db.collection(db_name_notifs).insert(notifData, function (err_insert, result_insert) {
                //log.d('Assistant module createNotification error: [%j], result: [%j] ', err_insert, result_insert.result);
                if (callback !== null) {
                    callback(err_insert, result_insert);
                }
            });
        } catch (ex) {
            log.i('insertNotificationBulk error:[%j]', { message: ex.message, stack: ex.stack });
        }
    };

    /**
     * Get all notifications for specific user for a specific app
     * @param db - link to database
     * @param api_key - api key for target user
     * @param app_id - app id for target app
     * @param givenCallback - callback for returned notifications
     */
    assistant.getNotificationsForUserForSingleApp = function(db, api_key, app_id, givenCallback){

        db.collection('apps').findOne({_id: db.ObjectID(app_id)}, {type: 1}, function (err, document) {
            //todo handle null case
            const isMobile = document.type == "mobile";//check if app type is mobile or web

            //get global unsaved notifications for this app
            db.collection(db_name_notifs).find({app_id: app_id}, {}).toArray(function (err1, notifs) {
                //todo handle null case
                //log.i('Doing stuff at step: %s, ALL, error: [%j], data: [%j]', 3, err1, notifs);

                //go through all notifications and remove those that are assigned to a different specific user
                const filterTargetUser = function (userElem) {
                    let targetElemArray = userElem.target_user_array;

                    if(_.isUndefined(targetElemArray) || targetElemArray == null || _.isEmpty(targetElemArray)) {
                        return true;
                    }

                    return targetElemArray.includes(api_key);
                };

                notifs = notifs.filter(filterTargetUser);

                //get global saved notifications for this app
                let notifs_global = notifs.filter(function (elem) {
                    return elem.saved_global;
                });

                //get privately saved notifications for this app
                let notifs_saved = notifs.filter(function (elem) {
                    if(_.isUndefined(elem.saved_private) || elem.saved_private == null) {
                        return false;
                    }
                    return elem.saved_private.includes(api_key);
                });


                //filter out sensitive information
                const sanitizeSensitiveInformation = function (elem) {
                    delete elem.saved_private;
                    delete elem.saved_global;
                    delete elem.target_user_array;
                };

                notifs.forEach(sanitizeSensitiveInformation);
                notifs_global.forEach(sanitizeSensitiveInformation);
                notifs_saved.forEach(sanitizeSensitiveInformation);

                givenCallback(null, {
                    id: app_id,
                    isMobile: isMobile,
                    notifications: notifs,
                    notifs_saved_global: notifs_global,
                    notifs_saved_private: notifs_saved
                });
            });
        });
    };

    /**
     * Get all notifications for specific user
     * @param db - link to database
     * @param member - member object
     * @param api_key - api key of user trying to access notifications
     * @param givenCallback - callback returns collected notifications
     */
    assistant.getNotificationsForUser = function (db, member, api_key, givenCallback) {
        //prepare the function to use in both cases
        const getAppData = function (appList) {
            //map the collection function to all apps
            async.map(appList, function (app_id, callback) {
                //log.d('App id: %s', app_id);
                assistant.getNotificationsForUserForSingleApp(db, api_key, app_id, callback);
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

    /**
     * transform current and target moment to a minute timestamp and then compare if it's within half of the job schedule interval

     th - target time
     ch - current time
     hw - half width

     this functions return true if:
     tt - hw <= ct < tt + hw
     *
     * @param target_day
     * @param target_hour
     * @param current_day
     * @param current_hour
     * @param current_minutes
     * @returns {boolean}
     */
    assistant.correct_day_and_time = function (target_day, target_hour, current_day, current_hour, current_minutes) {
        const halfWidthMinutes = assistant.JOB_SCHEDULE_INTERVAL / 2;// half of the width/length in minutes

        const oneDayInMinutes = 1440;//24 hours in day * 60 minutes in hour 24 * 60 = 1440

        //express current time and target day in minutes
        const ct = current_day * oneDayInMinutes + current_hour * 60 + current_minutes;//current time
        const tt = target_day * oneDayInMinutes + target_hour * 60;//target time

        const lowerLimit = tt - halfWidthMinutes;
        const upperLimit = tt + halfWidthMinutes;
        const correctionOffset = 10080;//7 days * 1440 minutes in a day, 7 * 1440 = 10080

        if ((lowerLimit <= ct && ct < upperLimit) ||
            (lowerLimit - correctionOffset <= ct && ct < upperLimit - correctionOffset) ||
            (lowerLimit + correctionOffset <= ct && ct < upperLimit + correctionOffset)) {
            return true
        }

        return false;
    };

    /**
     * Returns of the given time is inside the allowed moment
     * @param target_hour
     * @param current_hour
     * @param current_minutes
     * @returns {boolean}
     */
    assistant.correct_time = function (target_hour, current_hour, current_minutes) {
        return assistant.correct_day_and_time(3, target_hour, 3, current_hour, current_minutes);
    };

    /**
     * Changes whether a notification is saved or unsaved. Depending or paramters, change is done to global or private save.
     * @param do_personal - true - change is done to privately saved notifications, false - change is done to globally saved notifications
     * @param do_save - true - save notification, false - unsave notifications
     * @param notif_id - id of notification whose state is modiffied
     * @param user_id - id of user from who'm change is done
     * @param db - link to database
     */
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

    /**
     *
     * @param db
     * @param callback
     */
    assistant.getAssistantConfig = function (db, callback) {
        db.collection(db_name_config).find({}, {}).toArray(function (err, result) {
            //log.i('Assistant plugin getAssistantConfig: [%j][%j][%j][%j]', 18, err, result, typeof result);

            //optimize config info before returning it
            result.forEach(function (elem) {
                elem._idAsString = elem._id.toString();
            });

            callback(result);
        });
    };

    /**
     *
     * @param assistantConfig
     * @param pluginName
     * @param type
     * @param subtype
     * @param appID
     * @returns {*}
     */
    //todo test this
    assistant.getNotificationShowAmount = function (assistantConfig, pluginName, type, subtype, appID) {
        const targetAppId = "" + appID;
        if (typeof assistantConfig === "undefined") return 0;
        for (let a = 0; a < assistantConfig.length; a++) {
            if (assistantConfig[a]._idAsString === targetAppId) {
                if (typeof assistantConfig[a].notifShowAmount === "undefined") return 0;
                if (typeof assistantConfig[a].notifShowAmount[pluginName] === "undefined") return 0;
                if (typeof assistantConfig[a].notifShowAmount[pluginName][type] === "undefined") return 0;
                if (typeof assistantConfig[a].notifShowAmount[pluginName][type][subtype] === "undefined") return 0;
                return assistantConfig[a].notifShowAmount[pluginName][type][subtype];
            }
        }
        return 0;
    };

    /**
     *
     * @param db
     * @param anc
     * @param appID
     * @param batchInfoHolder
     */
    //todo test this
    assistant.increaseNotificationShowAmount = function (db, anc, appID, batchInfoHolder, callback) {
        if(_.isUndefined(anc.apc.PLUGIN_NAME) || _.isUndefined(appID)) {
            log.d("increaseNotificationShowAmount, This is undefined: ")
        }

        if(_.isUndefined(batchInfoHolder)) {
            batchInfoHolder = null;
        }

        const updateQuery = {};
        updateQuery["notifShowAmount." + anc.apc.PLUGIN_NAME + "." + anc.notificationType + "." + anc.notificationSubtype] = 1;


        if(batchInfoHolder === null) {
            doNotificationShowAmountUpdateBulk(db, [{appID: appID, updateQuery: updateQuery}], function (err, res) {
                if(callback != null){
                    callback();
                }
            });
        } else {
            batchInfoHolder.push({appID: appID, updateQuery: updateQuery});

            if(callback != null){
                callback();
            }
        }
    };

    function checkIfDbOpened(givenDb, callback){
        if(givenDb.isOpen())
            callback();
        else{
            givenDb._emitter.once('open', function (err, db) {
                callback();
            });
        }
    }

    doNotificationShowAmountUpdateBulk = function(db, dataBatch, callback){
        //log.d('About to do doNotificationShowAmountUpdateBulk');

        if(_.isUndefined(dataBatch)) {
            log.e('Trying to pass "undefined" dataBatch in doNotificationShowAmountUpdateBulk');
            return;
        }

        if(dataBatch == null) {
            log.e('Trying to pass "null" dataBatch in doNotificationShowAmountUpdateBulk');
            return;
        }

        if(dataBatch.length === 0){
            log.d('Received empty dataBatch array for doNotificationShowAmountUpdateBulk, skipping db call');
            if (callback !== null) {
                callback(null, {});
            }
            return;
        }

        checkIfDbOpened(db, function () {
            const nativeDb = db._native;
            nativeDb.collection(db_name_config, {}, function(err, collection) {
                const bulk = collection.initializeUnorderedBulkOp();

                dataBatch.forEach(function (batchElem) {
                    bulk.find({_id: batchElem.appID}).upsert().update({$inc: batchElem.updateQuery});
                });

                bulk.execute(function (err, res) {
                    log.i('Assistant plugin setNotificationShowAmount: [%j][%j]', err, res);
                    if (callback !== null) {
                        callback(err, res);
                    }
                });
            });
        });
    };

    /**
     *
     * @param db
     * @param anc
     * @param app_id
     * @param data
     * @param notificationBatchHolder
     * @param callback
     */
    assistant.createNotificationAndSetShowAmount = function (db, anc, app_id, data, notificationBatchHolder, callback) {
        async.parallel([
            function(parallelCallback) {
                assistant.createNotification(db, data, anc.apc.PLUGIN_NAME, anc.notificationType, anc.notificationSubtype, anc.notificationI18nID, anc.apc.app_id, anc.notificationVersion, null, notificationBatchHolder.newNotifications, function () {
                    parallelCallback();
                });
            },
            function(parallelCallback) {
                assistant.increaseNotificationShowAmount(db, anc, app_id, notificationBatchHolder.updatedShowAmount, function () {
                    parallelCallback();
                });
            }
        ], function (err) {
            if(callback != null){
                callback();
            }
        });
    };

    /**
     *
     * @param countlyDb
     * @param generationFinishedCallback
     * @param flagForceGenerateNotifications
     * @param flagIgnoreDayAndTime
     */
    assistant.generateNotifications = function (countlyDb, generationFinishedCallback, flagForceGenerateNotifications, flagIgnoreDayAndTime) {

        log.i("Generate Notifications function");
        //todo make sure that flagForceGenerateNotifications is a boolean
        //todo make sure that flagIgnoreDayAndTime is a boolean

        //get a list of all apps
        countlyDb.collection('apps').find({}, {}).toArray(function (err_apps_data, result_apps_data) {
            const totalAppCount = result_apps_data.length;
            log.i("Total count of apps here: [%j]", totalAppCount);

            //load the assistant config
            assistant.getAssistantConfig(countlyDb, function (returnedConfiguration) {

                //assistantGlobalCommon (agc) contains values that are passed and used in all notification generators
                const assistantGlobalCommon = {};
                assistantGlobalCommon.appsData = result_apps_data;
                assistantGlobalCommon.assistantConfiguration = returnedConfiguration;

                //set if notifications should be generated regardless of their constraints
                assistantGlobalCommon.forceGenerateNotifications = flagForceGenerateNotifications;

                //set if notifications should be generated ignoring their time and day
                assistantGlobalCommon.ignoreDayAndTime = flagIgnoreDayAndTime;

                //link to the db object that has to be used
                assistantGlobalCommon.db = countlyDb;

                const responseBatchData = {};//a place where to collect db requests for batched calls
                responseBatchData.newNotifications = [];//contains new notifications that will have to be created
                responseBatchData.updatedShowAmount = [];//contains info for updated show amount of notifications, should be called after notification creation
                assistantGlobalCommon.responseBatchData = responseBatchData;

                //go through all plugins and start generating notifications for those that support it
                const plugins = pluginManager.getPlugins();

                //get a list plugins that have a assistantJob
                const jobList = [];
                for (let i = 0, l = plugins.length; i < l; i++) {
                    try {
                        //log.i('Preparing job: ' + plugins[i]);
                        jobList.push(require("../../" + plugins[i] + "/api/assistantJob"));
                        //promises.push(require("../../" + plugins[i] + "/api/assistantJob").prepareNotifications(countlyDb, assistantGlobalCommon));
                    } catch (ex) {
                        //log.i('Preparation FAILED [%j]', ex);
                    }
                }

                const maxSliceSize = 100;
                const sliceAmount = totalAppCount / maxSliceSize;
                const appRanges = [];
                for(let a = 0 ; a < sliceAmount ; a++) {
                    appRanges.push(result_apps_data.slice(a * 100, (a + 1) * 100));
                }

                log.d('Prepared app ranges', appRanges.length);

                async.series([
                    function (seriesCallback) {
                        async.eachSeries(appRanges, function (givenApps, eachSeriesCallback) {
                            log.i('Doing [%j] apps now ', givenApps.length);//todo print also which iteration is the current one
                            assistantGlobalCommon.appsData = givenApps;

                            const promises = [];
                            for (let i = 0, l = jobList.length; i < l; i++) {
                                try {
                                    //log.i('Preparing job: ' + plugins[i]);
                                    promises.push(jobList[i].prepareNotifications(countlyDb, assistantGlobalCommon));
                                } catch (ex) {
                                    //log.i('Preparation FAILED [%j]', ex);
                                }
                            }

                            PromiseB.all(promises).then(function () {
                                eachSeriesCallback();
                            }, function () {
                                eachSeriesCallback("Notification generation Promise umbrella encountered rejection");
                            });
                        }, function (err) {
                            seriesCallback(err);
                        });
                    },
                    function (seriesCallback) {
                        assistantGlobalCommon.appsData = result_apps_data;
                        require("./assistantJobGeneral").prepareNotifications(countlyDb, assistantGlobalCommon).then(function (err) {
                            seriesCallback(err);
                        });
                    },
                    function (seriesCallback) {
                        log.d('Waiting for db connection');
                        checkIfDbOpened(countlyDb, function () {
                            seriesCallback();
                        });
                    },
                    function (seriesCallback) {
                        insertNotificationBulk(countlyDb, responseBatchData.newNotifications, function (err_insert, result_insert) {
                            log.d('insertNotificationBulk finished');
                            seriesCallback();
                        });
                    },
                    function (seriesCallback) {
                        doNotificationShowAmountUpdateBulk(countlyDb, responseBatchData.updatedShowAmount, function () {
                            log.d('doNotificationShowAmountUpdateBulk finished');
                            seriesCallback();
                        });
                    }
                ], function (err, res) {
                    if (err != null) {
                        log.e("Failure while doing generateNotifications series, err:[%j]", err);
                    }

                    log.d('Ending generateNotifications umbrella series');

                    if (generationFinishedCallback !== null) {
                        generationFinishedCallback();
                    }
                });
            });
        });
    };

    /**
     * Prepare fields that are common and relevant for this specific plugin
     * @param assistantGlobalCommon
     * @param appData
     * @param PLUGIN_NAME
     * @returns {{}}
     */
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
        apc.minutes = apc.dateNow.getMinutes();
        apc.dow = apc.dateNow.getDay();
        if (apc.dow === 0) apc.dow = 7;
        //1 - monday, 2 - tuesday, 3 - wednesday, 4 - thursday, 5 - friday, 6 - saturday, 7 - sunday

        apc.PLUGIN_NAME = PLUGIN_NAME;
        //log.i('Assistant plugin preparePluginSpecificFields: [%j] ', 4);
        return apc;
    };

    /**
     * Prepare fields that are relevant for this specific notification
     * @param assistantPluginCommon
     * @param notificationI18nID
     * @param notificationType
     * @param notificationSubtype
     * @param notificationVersion
     * @returns {{}}
     */
    assistant.prepareNotificationSpecificFields = function(assistantPluginCommon, notificationI18nID, notificationType, notificationSubtype, notificationVersion){
        const anc = {};//assistant notification common
        anc.apc = assistantPluginCommon;//in some places this might be null

        anc.notificationI18nID = notificationI18nID;
        anc.notificationType = notificationType;
        anc.notificationSubtype = notificationSubtype;
        anc.notificationVersion = notificationVersion;

        anc.showAmount = assistant.getNotificationShowAmount(anc.apc.assistantConfig, anc.apc.PLUGIN_NAME, notificationType, notificationSubtype, anc.apc.app_id);

        return anc;
    };

    /**
     *
     * @param targetDow
     * @param targetHour
     * @param requirements
     * @param data
     * @param anc
     * @param callback
     */
    assistant.createNotificationIfRequirementsMet = function (targetDow, targetHour, requirements, data, anc, callback) {
        var correctTimeAndDate = false;

        if(targetDow >= 0) {
            correctTimeAndDate = assistant.correct_day_and_time(targetDow, targetHour, anc.apc.dow, anc.apc.hour, anc.apc.minutes);
        } else {
            correctTimeAndDate = assistant.correct_time(targetHour, anc.apc.hour, anc.apc.minutes);
        }

        if ((anc.apc.flagIgnoreDAT || correctTimeAndDate) && requirements || anc.apc.flagForceGenerate) {
            assistant.createNotificationAndSetShowAmount(anc.apc.db, anc, anc.apc.app_id, data, anc.apc.agc.responseBatchData, function () {
                if(callback != null){
                    callback();
                }
            });
        } else {
            if(callback != null){
                callback();
            }
        }
    };

    /**
     * Called when creating notifications from external sources like the frontend.
     * @param db - link to the db object
     * @param data - names and numbers that are relevant for customizing assitant notifications
     * @param pluginName - the name of the plugin that created this notification
     * @param type - the type of this plugin, used for filtering
     * @param subtype - together with type it identifies the specific the specific notification that is created by a plugin
     * @param i18n - the ID that will be used for internationalization on the frontend
     * @param appId - the ID of the application for which it was created
     * @param notificationVersion - notification version ID of when it was created, should be increased when the data format changes
     * @param targetUserApiKey - if this notifications is used to target a specific user, this contains it's api key
     * @param callback - is called after trying to create notification in case of success returns (true, ""), in case of failure returns (false, errorMessage)
     */
    assistant.createNotificationExternal = function (db, data, pluginName, type, subtype, i18n, appId, notificationVersion, targetUserApiKey, callback) {
        try {
            assistant.createNotification(db, data, pluginName, type, subtype, i18n, appId, notificationVersion, targetUserApiKey, null);
            callback(true, "");
        } catch (err) {
            callback(false, err);
        }
    };


}(assistant));

module.exports = assistant;