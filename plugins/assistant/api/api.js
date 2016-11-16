var plugin = {},
	common = require('../../../api/utils/common.js'),
    plugins = require('../../pluginManager.js');
	log = common.log('assistant:api'),
	fetch = require('../../../api/parts/data/fetch.js'),
	async = require("async"),
	plugins = require('../../pluginManager.js'),
    countlySession = require('../../../api/lib/countly.session.js');

(function (plugin) {

	plugins.register("/master", function(ob){
		// Allow configs to load & scanner to find all jobs classes
		setTimeout(() => {
			require('../../../api/parts/jobs').job('assistant:generate').replace().schedule("every 1 hour starting on the 0 min");
	}, 3000);
	});

	plugins.register("/o/assistant", function(ob){
		var params = ob.params;
		var paths = ob.paths;

		if (!params.qstring.api_key) {
			common.returnMessage(params, 400, 'Missing parameter "api_key"');
			return false;
		}

		var api_key = params.qstring.api_key;

		log.i('Assistant plugin request: Get All Notifications');
		var validate = ob.validateUserForMgmtReadAPI;
		validate(function (params) {

			var member = params.member;
			var memberID = member._id;

			//prepare the function to use in both cases
			var getAppData = function (appList) {
				async.map(appList, function(app_id, callback){
                    log.i('App id: %s', app_id);
/*
                    var sampleData1 = [{
                        _id: 1,
                        data: [1312312, 123123, 12 ,123123 ],
                        notif_type: 1,
                        notif_subtype: 2,
                        created_date: new Date(),
                        version: 1,
                        app_id: 12345,
                        i18n_id: "assistant.test",
                        //cd
                        saved_global:false,
                        saved_private:["dsdDs", "ddsdsd"]
                    },
                        {
                            _id: 2,
                            data: ["Fdfsdf", 12 ,"Fdsfsdfds" ],
                            notif_type: 2,
                            notif_subtype: 2,
                            created_date: new Date(),
                            version: 1,
                            app_id: 12345,
                            i18n_id: "assistant.test",
                            //cd
                            saved_global:false,
                            saved_private:["dsdDs", "ddsdsd"]
                        },
                        {
                            _id: 3,
                            data: [534534, "Fdfsdf",3123 ],
                            notif_type: 3,
                            notif_subtype: 2,
                            created_date: new Date(),
                            version: 1,
                            app_id: 36456,
                            i18n_id: "assistant.test",
                            //cd
                            saved_global:true,
                            saved_private:["dsdDs", "ddsdsd"]
                        }
                    ];

                    var sampleData2 = [{
                        _id: 6,
                        data: [42342, 12 ,123123 ],
                        notif_type: 1,
                        notif_subtype: 2,
                        created_date: new Date(),
                        version: 1,
                        app_id: 12345,
                        i18n_id: "assistant.test",
                        //cd
                        saved_global:false,
                        saved_private:["dsdDs", "ddsdsd"]
                    }
                    ];

                    var sampleData3 = [
                        {
                            _id: 4,
                            data: ["Fdfsdf", 12 ,"Fdsfsdfds" ],
                            notif_type: 2,
                            notif_subtype: 2,
                            created_date: new Date(),
                            version: 1,
                            app_id: 12345,
                            i18n_id: "assistant.test",
                            //cd
                            saved_global:false,
                            saved_private:["dsdDs", "ddsdsd"]
                        },
                        {
                            _id: 5,
                            data: [534534, "Fdfsdf",3123 ],
                            notif_type: 3,
                            notif_subtype: 2,
                            created_date: new Date(),
                            version: 1,
                            app_id: 36456,
                            i18n_id: "assistant.test",
                            //cd
                            saved_global:true,
                            saved_private:["dsdDs", "ddsdsd"]
                        }
                    ];

                    callback(null, {
                        id: app_id,
                        //isMobile: isMobile,
                        notifications: sampleData1,//[],
                        notifs_saved_private: sampleData2,//documents_global,
                        notifs_saved_global: sampleData3,//documents_global_saved
                    });
*/

                    //var fff = JSON.stringify(app_id);

                    log.i('Doing stuff at step: %s', 1);
					common.db.collection('apps').findOne({_id:common.db.ObjectID(app_id)}, {type:1}, function(err, document) {
					    //todo handle null case
						var isMobile = document.type == "mobile";//check if app type is mobile or web

						//log.i('App id: %s, error: %j, result: %j, is mobile: %s', appID, err, document, isMobile);
                        log.i('Doing stuff at step: %s', 2);
						params.app_id = app_id;

						//get global notifications for this app
						common.db.collection(db_name_notifs).find({app_id:app_id}, {}).toArray(function(err1, notifs) {
                            //todo handle null case
                            log.i('Doing stuff at step: %s, error: [%j], data: [%j]', 3, err1, notifs);
							//get global saved notifications for this app
							common.db.collection(db_name_notifs).find({app_id:app_id, global:true}, {}).toArray(function(err2, notifs_global) {
                                //todo handle null case
                                log.i('Doing stuff at step: %s, error: [%j], data: [%j]', 4, err2, notifs_global);
                                //get privatly saved notifications for this app
                                common.db.collection(db_name_notifs).find({app_id: app_id, saved_private: api_key}, {}).toArray(function (err3, notifs_saved) {
                                    //todo handle null case
                                    log.i('Doing stuff at step: %s, error: [%j], data: [%j]', 4, err3, notifs_saved);

                                    callback(null, {
                                        id: app_id,
                                        isMobile: isMobile,
                                        notifications: notifs,
                                        notifs_saved_global: notifs_global,
                                        notifs_saved_private: notifs_saved
                                    });
                                    log.i('Doing stuff at step: %s', 5);
                                });
                            });
						});
					});

				}, function(err, results) {
					common.returnOutput(params, results);
				});
			};

			if(member.global_admin) {
				//get app list from db if user is global admin
				common.db.collection('apps').find({}, {_id:1}).toArray(function(err, result){
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


		}, params);
		return true;
	});

    var NOTIFICATION_VERSION = 1;
    var db_name_notifs = "assistant_notifs";
    var db_name_config = "assistant_config";

	plugins.register("/i/assistant", function(ob){
		var params = ob.params;
		var paths = ob.paths;

		if (typeof params.qstring.api_key === "undefined") {
			common.returnMessage(params, 400, 'Missing parameter "api_key"');
			return false;
		}

        if (typeof params.qstring.save === "undefined") {
            common.returnMessage(params, 400, 'Missing parameter "save"');
            return false;
        }

        if (typeof params.qstring.notif === "undefined") {
            common.returnMessage(params, 400, 'Missing parameter "notif"');
            return false;
        }

		log.i('Assistant plugin request: /i/assistant');
		var validate = ob.validateUserForMgmtReadAPI;
		validate(function (params) {

			var member = params.member;
			var memberID = member._id;
            var save_action;


            var save_val = params.qstring.save;

            if(save_val === "true") save_action = true;//save
            else if(save_val === "false") save_action = false;//unsave

            log.i('Assistant plugin request: 1');
            var saving_function = function(do_personal, do_save, notif_id, user_id) {

                if(do_save) {
                    //we need to save it

                    if(do_personal) {
                        // add the person reference to user list
                        common.db.collection(db_name_notifs).update({_id:notif_id}, {$unset:{cd:""}, $addToSet:{saved_private:user_id}}, function (error, ret) {
                            
                        });
                    } else {
                        // set the global saved flag to true
                        // set bool to true, remove TTL
                        common.db.collection(db_name_notifs).update({_id:notif_id}, {$unset:{cd:""}, $set:{saved_global:true}}, function (error, ret) {

                        });
                    }
                } else {
                    //we need to unsave it
                    
                    var check_and_set_ttl = function (ret_obj) {
                        var obj = ret_obj.value;
                        if(obj.saved_global == false && obj.saved_private.length === 0) {
                            //todo set cd to old created date
                            common.db.collection(db_name_notifs).update({_id:notif_id, saved_global:false, saved_private:[]}, {}, {$set:{cd:new Date()}}, {new:true}, function (error, ret) {

                            });
                        }
                    };

                    if(do_personal) {
                        // remove the personal save reference from the user list
                        common.db.collection(db_name_notifs).findAndModify({_id:notif_id}, {}, {$pull:{saved_private:user_id}}, {new:true}, function (error, ret) {
                            check_and_set_ttl(ret);
                        });
                    } else {
                        // set the global saved flag to false
                        common.db.collection(db_name_notifs).findAndModify({_id:notif_id}, {}, {$set:{saved_global:false}}, {new:true}, function (error, ret) {
                            check_and_set_ttl(ret);
                        });

                    }
                }
            };
            log.i('Assistant plugin request: 2, ' + paths[3]);
			switch (paths[3]) {
				case 'global':
					log.i('Assistant plugin request: Change global notification status');
                    saving_function(false, save_action, 123);
					common.returnOutput(params, "the global action was done " + save_action);
					break;
				case 'private':
					log.i('Assistant plugin request: Change personal notification status');
                    saving_function(true, save_action, 123);
					common.returnOutput(params, "the private action was done " + save_action);
					break;
				case 'create':
					log.i('Assistant plugin request: Creating stuff');

                    //common.db.collection('assistant_global').insert({data:"74;1322", type:1, subtype:4, created_date:64564523, version:1, app_id: "57cd5afb85e945640bc4eec9"}, function(err, result) {
                    //log.i('Assistant Creating stuff, error: [%j], result: [%j]', err, result);
                    common.returnOutput(params, "the creating action was done");
                    //});
                    break;
				default:
					common.returnMessage(params, 400, 'Invalid path');
					return false;
					break;
			}

            log.i('Assistant plugin request: 3');
		}, params);
        log.i('Assistant plugin request: 4');
		return true;
	});

    var create_notification = function (data, type, subtype, i18n, app_id, db) {
        //return;

        var new_notif = {
            data: data,
            notif_type: type,
            notif_subtype: subtype,
            created_date: new Date(),
            version: NOTIFICATION_VERSION,
            app_id:"" + app_id,
            cd: new Date(),
            saved_global:false,
            saved_private:[],
            i18n_id:i18n
        };

        common.db.collection(db_name_notifs).insert(new_notif, function (err_insert, result_insert) {
            log.i('Assistant plugin create_notification error: [%j], result: [%j] ', err_insert, result_insert);
        });
    };

    plugins.register("/i/amagic", function(ob) {
        var params = ob.params;
        var paths = ob.paths;


        if (typeof params.qstring.api_key === "undefined") {
            common.returnMessage(params, 400, 'Missing parameter "api_key"');
            return false;
        }
        log.i('Assistant plugin request: /i/amagic');

        //common.db.collection(db_name_notifs).drop();
        //get a list of all app id's
        common.db.collection('apps').find({}, {_id:1, type:1, gcm:1, apn:1}).toArray(function(err_app_id, result_app_data){
            //get current day and time
            //todo get time based on apps timezone
            var date = new Date();
            var hour = date.getHours();
            var dow = date.getDay();
            if (dow === 0)
                dow = 7;

            var correct_day_and_time = function (target_day, target_hour) {
                return true;//todo finish this
            };

            //todo add the amount of times a notification has been shown
            //todo replace with async.map
            //for(var a = 0 ; a < result_app_data.length; a++) {//todo is this correct
            async.map(result_app_data, function(ret_app_data, callback){
                var is_mobile = ret_app_data.type == "mobile";//check if app type is mobile or web
                var app_id_1 = ret_app_data._id;
                log.i('Assistant plugin inside loop, id: [%j], result: [%j] ', app_id_1, is_mobile);

                common.db.collection('events').findOne({_id:app_id_1}, {}, function(events_err, events_result) {
                    //continue;
                    //map the array of objects to an array of strings
                    /*
                     result_app_data = result_app_data.map(function (a) {
                     return a._id + "";
                     });*/


                    params.app_id = app_id_1;
                    params.qstring.period = "30days";//todo generate qstring
                    fetch.getTimeObj('users', params, function (fetchResultUsers) {//collect user info
                        var app_id = app_id_1;
                        countlySession.setDb(fetchResultUsers);
                        var retSession = countlySession.getSessionData();

                        log.i('Assistant plugin doing steps: [%j] [%j] [%j] [%j] [%j]', 0.1, retSession, params.app_id, app_id, app_id_1);


                        log.i('Assistant plugin doing steps: [%j] ', 1);
                        // (1) generate quick tip notifications

                        // (1.1) Crash integration
                        (function () {
                            var crash_data_not_available = true;//todo missing
                            var enough_users = true;//total users > 20
                            var max_show_time_not_exceeded = true;

                            if (correct_day_and_time(2, 14) && crash_data_not_available && enough_users && is_mobile && max_show_time_not_exceeded) {
                                log.i('Assistant plugin doing steps: [%j] ', 1.1);
                                create_notification("", 1, 1, "assistant.crash-integration", app_id, common.db);
                            }
                        })();

                        log.i('Assistant plugin doing steps: [%j] ', 2);

                        // (1.2) Push integration
                        (function () {
                            var no_certificate_uploaded = (typeof result_app_data.gcm === "undefined") && (typeof result_app_data.apn === "undefined");
                            var max_show_time_not_exceeded = true;
                            if (correct_day_and_time(3, 15) && no_certificate_uploaded && is_mobile && max_show_time_not_exceeded) {
                                log.i('Assistant plugin doing steps: [%j] ', 2.1);
                                create_notification("", 1, 2, "assistant.push-integration", app_id, common.db);
                            }
                        })();

                        log.i('Assistant plugin doing steps: [%j] ', 3);

                        // (1.3) Star rating integration
                        (function () {
                            //log.i('Assistant plugin doing steps: [%j] [%j] [%j]', 3.01, events_result, events_result.list);
                            var no_star_rating = (typeof events_result === "undefined") || (events_result === null) || (typeof events_result.list === "undefined") || (typeof events_result.list !== "undefined" && typeof events_result.list.indexOf("[CLY]_star") === -1);
                            var star_rating_not_enabled = !plugins.isPluginEnabled("star-rating");
                            var max_show_time_not_exceeded = true;
                            log.i('Assistant plugin doing steps: [%j] [%j] [%j] [%j] ', 3.01, no_star_rating, star_rating_not_enabled, max_show_time_not_exceeded);
                            if (correct_day_and_time(4, 15) && (no_star_rating || star_rating_not_enabled) && is_mobile && max_show_time_not_exceeded) {
                                log.i('Assistant plugin doing steps: [%j] ', 3.1);
                                create_notification("", 1, 3, "assistant.star-rating-integration", app_id, common.db);
                            }
                        })();

                        log.i('Assistant plugin doing steps: [%j] ', 4);

                        // (1.4) Custom event integration
                        (function () {
                            var no_custom_event_defined = (typeof events_result === "undefined") || (events_result === null);
                            var max_show_time_not_exceeded = true;
                            log.i('Assistant plugin doing steps: [%j] [%j] ', 4.01, no_custom_event_defined);
                            if (correct_day_and_time(5, 15) && no_custom_event_defined && is_mobile && max_show_time_not_exceeded) {
                                log.i('Assistant plugin doing steps: [%j] ', 4.1);
                                create_notification("", 1, 4, "assistant.custom-event-integration", app_id, common.db);
                            }
                        })();

                        log.i('Assistant plugin doing steps: [%j] ', 5);

                        // (1.5) Share dashboard
                        (function () {
                            var not_enough_dashboard_users = false;//todo finish this
                            var max_show_time_not_exceeded = true;
                            if (correct_day_and_time(2, 10) && not_enough_dashboard_users && max_show_time_not_exceeded) {
                                log.i('Assistant plugin doing steps: [%j] ', 5.1);
                                create_notification("", 1, 5, "", app_id, common.db);
                            }
                        })();

                        log.i('Assistant plugin doing steps: [%j] ', 6);

                        // (1.6) Use funnels
                        // todo should be implemented in plugin
                        /*(function () {
                         var no_funnels_stored = true;
                         var max_show_time_not_exceeded = true;
                         if (correct_day_and_time(3, 10) && no_funnels_stored && max_show_time_not_exceeded) {
                         log.i('Assistant plugin doing steps: [%j] ', 6.1);
                         create_notification("", 1, 6, common.db);
                         }
                         })();*/

                        //log.i('Assistant plugin doing steps: [%j] ', 7);

                        // (1.7) Use drills
                        // todo should be implemented in plugin
                        /*(function () {
                         var no_drill_bookmarks = true;
                         var max_show_time_not_exceeded = true;
                         if (correct_day_and_time(4, 10) && no_drill_bookmarks && max_show_time_not_exceeded) {
                         log.i('Assistant plugin doing steps: [%j] ', 7.1);
                         create_notification("", 1, 7, common.db);
                         }
                         })();*/

                        //log.i('Assistant plugin doing steps: [%j] ', 8);

                        // (1.8) Use attribution
                        //todo enterprise stuff
                        /*(function () {
                            var has_enough_attribution_entries = false;//needs at least one
                            var max_show_time_not_exceeded = true;
                            if (correct_day_and_time(5, 10) && has_enough_attribution_entries && max_show_time_not_exceeded) {
                                log.i('Assistant plugin doing steps: [%j] ', 8.1);
                                create_notification("", 1, 8, common.db);
                            }
                        })();*/

                        //log.i('Assistant plugin doing steps: [%j] ', 9);

                        // (1.9) Use dashboard localization
                        //todo implement this

                        // (2) generate insight notifications

                        // (2.1) active users bow

                        // (2.2) active users eow

                        // (2.3) page view summary
                        // todo needs functionality from frontend

                        // (2.4) top install sources
                        // todo needs functionality from frontend

                        // (2.5) top referrals
                        // todo needs functionality from frontend

                        // (2.6) session duration bow

                        // (3) generate announcment notifications

                        // (3.1) blog page

                    });
                });
            });

            common.returnOutput(params, "Magic was completed");

        });

        return true;
    });

}(plugin));

module.exports = plugin;