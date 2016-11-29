var assistant = {},
    //common = require('../../../api/utils/common.js'),
    plugins = require('../../pluginManager.js'),
    log = require('../../../api/utils/log.js')('assistant:module'),
    fetch = require('../../../api/parts/data/fetch.js'),
    async = require("async"),
    countlySession = require('../../../api/lib/countly.session.js');

(function (assistant) {

    var NOTIFICATION_VERSION = 1;
    var db_name_notifs = "assistant_notifs";
    var db_name_config = "assistant_config";

    //notification types
    assistant.NOTIF_TYPE_QUICK_TIPS = 1;
    assistant.NOTIF_TYPE_INSIGHTS = 2;
    assistant.NOTIF_TYPE_ANNOUNCEMENTS = 3;

    assistant.JOB_SCHEDULE_INTERVAL = 10;//in minutes

    assistant.createNotification = function (db, data, pluginName, type, subtype, i18n, appId) {

        var new_notif = {
            data: data,
            plugin_name: pluginName,
            notif_type: type,
            notif_subtype: subtype,
            created_date: new Date(),
            version: NOTIFICATION_VERSION,
            app_id: "" + appId,
            cd: new Date(),
            saved_global:false,
            saved_private:[],
            i18n_id:i18n
        };

        db.collection(db_name_notifs).insert(new_notif, function (err_insert, result_insert) {
            log.i('Assistant module createNotification error: [%j], result: [%j] ', err_insert, result_insert);
        });
    };
    
    assistant.getNotificationsForUser = function (db, member, api_key, givenCallback) {
        log.i('Assistant plugin request: Get All Notifications ' + 2);
        //prepare the function to use in both cases
        var getAppData = function (appList) {
            log.i('Assistant plugin request: Get All Notifications ' + 6);
            async.map(appList, function(app_id, callback){
                log.i('App id: %s', app_id);
                log.i('Assistant plugin request: Get All Notifications ' + 7);

                log.i('Doing stuff at step: %s', 1);
                db.collection('apps').findOne({_id:db.ObjectID(app_id)}, {type:1}, function(err, document) {
                    //todo handle null case
                    var isMobile = document.type == "mobile";//check if app type is mobile or web

                    //log.i('App id: %s, error: %j, result: %j, is mobile: %s', appID, err, document, isMobile);
                    log.i('Doing stuff at step: %s', 2);

                    //get global notifications for this app
                    db.collection(db_name_notifs).find({app_id:app_id}, {}).toArray(function(err1, notifs) {
                        //todo handle null case
                        log.i('Doing stuff at step: %s, ALL, error: [%j], data: [%j]', 3, err1, notifs);
                        //get global saved notifications for this app
                        db.collection(db_name_notifs).find({app_id:app_id, saved_global:true}, {}).toArray(function(err2, notifs_global) {
                            //todo handle null case
                            log.i('Doing stuff at step: %s, SAVED GLOBAL, error: [%j], data: [%j]', 4, err2, notifs_global);
                            //get privatly saved notifications for this app
                            db.collection(db_name_notifs).find({app_id: app_id, saved_private: api_key}, {}).toArray(function (err3, notifs_saved) {
                                //todo handle null case
                                log.i('Doing stuff at step: %s, SAVED PRIVATE, error: [%j], data: [%j]', 5, err3, notifs_saved);

                                callback(null, {
                                    id: app_id,
                                    isMobile: isMobile,
                                    notifications: notifs,
                                    notifs_saved_global: notifs_global,
                                    notifs_saved_private: notifs_saved
                                });
                                log.i('Doing stuff at step: %s', 6);
                            });
                        });
                    });
                });

            }, givenCallback);
        };

        log.i('Assistant plugin request: Get All Notifications ' + 4);

        if(member.global_admin) {
            //get app list from db if user is global admin
            db.collection('apps').find({}, {_id:1}).toArray(function(err, result){
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

        log.i('Assistant plugin request: Get All Notifications ' + 5);
    };

    assistant.correct_day_and_time = function (target_day, target_hour, current_day, current_hour) {
        return true;//todo finish this
    };

    assistant.changeNotificationSavedStatus = function(do_personal, do_save, notif_id, user_id, db) {
        log.i('Assistant plugin request saving_function: [%j], [%j], [%j], [%j], [%j]', 1, do_personal, do_save, notif_id, user_id);
        if(do_save) {
            //we need to save it
            log.i('Assistant plugin request saving_function: [%j]', 2);

            if(do_personal) {
                log.i('Assistant plugin request saving_function: [%j]', 3);
                // add the person reference to user list
                db.collection(db_name_notifs).update({_id:db.ObjectID(notif_id)}, {$unset:{cd:""}, $addToSet:{saved_private:user_id}}, function (error, ret) {
                });
            } else {
                log.i('Assistant plugin request saving_function: [%j]', 4);
                // set the global saved flag to true
                // set bool to true, remove TTL
                db.collection(db_name_notifs).update({_id:db.ObjectID(notif_id)}, {$unset:{cd:""}, $set:{saved_global:true}}, function (error, ret) {
                    log.i('Assistant plugin request saving_function: [%j], error: [%j], ret: [%j]', 4.1, error, ret);
                });
            }
        } else {
            //we need to unsave it
            log.i('Assistant plugin request saving_function: [%j]', 5);
            var check_and_set_ttl = function (ret_obj) {
                log.i('Assistant plugin request saving_function: [%j], [%j]', 8, ret_obj);
                var obj = ret_obj.value;
                if(obj.saved_global == false && obj.saved_private.length === 0) {
                    //todo set cd to old created date
                    db.collection(db_name_notifs).update({_id:db.ObjectID(notif_id), saved_global:false, saved_private:[]}, {$set:{cd:new Date()}}, {new:true}, function (error, ret) {
                    });
                }
            };

            if(do_personal) {
                log.i('Assistant plugin request saving_function: [%j]', 6);
                // remove the personal save reference from the user list
                db.collection(db_name_notifs).findAndModify({_id:db.ObjectID(notif_id)}, {}, {$pull:{saved_private:user_id}}, {new:true}, function (error, ret) {
                    check_and_set_ttl(ret);
                });
            } else {
                log.i('Assistant plugin request saving_function: [%j]', 7);
                // set the global saved flag to false
                //todo deleting notifications
                db.collection(db_name_notifs).findAndModify({_id:db.ObjectID(notif_id)}, {}, {$set:{saved_global:false}}, {new:true}, function (error, ret) {
                    check_and_set_ttl(ret);
                });

            }
        }
    };

}(assistant));

module.exports = assistant;