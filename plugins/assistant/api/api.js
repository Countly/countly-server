var plugin = {},
	common = require('../../../api/utils/common.js'),
    plugins = require('../../pluginManager.js'),
	log = common.log('assistant:api'),
	fetch = require('../../../api/parts/data/fetch.js'),
	async = require("async"),
    countlySession = require('../../../api/lib/countly.session.js'),
    assistant = require("./assistant.js");

(function (plugin) {

    var scheduleAssistantJob = function (schedule) {

    };
/*
	plugins.register("/master", function(ob){
		// Allow configs to load & scanner to find all jobs classes
        setTimeout(() => {
            require('../../../api/parts/jobs').job('assistant:generate').replace().schedule("every " + assistant.JOB_SCHEDULE_INTERVAL + " minutes starting on the 0 min");
        }, 3000);
	});
*/
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
            log.i('Assistant plugin request: Get All Notifications ' + 1);
			var member = params.member;
			var memberID = member._id;

            assistant.getNotificationsForUser(common.db, member, api_key, function(err, results) {
                log.i('Assistant plugin request: Get All Notifications ' + 10);
                common.returnOutput(params, results);
            });
            log.i('Assistant plugin request: Get All Notifications ' + 3);

		}, params);
		return true;
	});

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
            var api_key = params.qstring.api_key;
			var memberID = member._id;
            var save_action;
            var notif = params.qstring.notif;
            var save_val = params.qstring.save;

            if(save_val === "true") save_action = true;//save
            else if(save_val === "false") save_action = false;//unsave

            log.i('Assistant plugin request: 1, ' + paths[3]);
			switch (paths[3]) {
				case 'global':
					log.i('Assistant plugin request: Change global notification status');
                    assistant.changeNotificationSavedStatus(false, save_action, notif, api_key, common.db);
					common.returnOutput(params, "the global action was done " + save_action);
					break;
				case 'private':
					log.i('Assistant plugin request: Change personal notification status');
                    assistant.changeNotificationSavedStatus(true, save_action, notif, api_key, common.db);
					common.returnOutput(params, "the private action was done " + save_action);
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

    plugins.register("/i/amagic", function(ob) {
        var params = ob.params;

        if (typeof params.qstring.api_key === "undefined") {
            common.returnMessage(params, 400, 'Missing parameter "api_key"');
            return false;
        }
        log.i('Assistant plugin request: /i/amagic');

        require('../../../api/parts/jobs').job('assistant:generate').in(3);
        common.returnOutput(params, "Magic was ! completed");
        return true;
    });

	var db_name_notifs = "assistant_notifs";
	var db_name_config = "assistant_config";

    plugins.register("/i/asistdelete", function(ob) {
        var params = ob.params;

        if (typeof params.qstring.api_key === "undefined") {
            common.returnMessage(params, 400, 'Missing parameter "api_key"');
            return false;
        }
        log.i('Assistant plugin request: /i/asistdelete');

        common.db.collection(db_name_notifs).drop();
		common.db.collection(db_name_config).drop();

        common.returnOutput(params, "Delete was ! completed");
        return true;
    });

}(plugin));

module.exports = plugin;