'use strict';
const plugin = {},
    common = require('../../../api/utils/common.js'),
    countlyCommon = require('../../../api/lib/countly.common.js'),
    plugins = require('../../pluginManager.js'),
    log = common.log('assistant:api'),
    fetch = require('../../../api/parts/data/fetch.js'),
    async = require("async"),
    assistant = require("./assistant.js");

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

        const api_key = params.qstring.api_key;

        log.i('Assistant plugin request: Get All Notifications');
        const validate = ob.validateUserForMgmtReadAPI;
        validate(function (params) {
            const member = params.member;

            assistant.getNotificationsForUser(common.db, member, api_key, function (err, results) {
                common.returnOutput(params, results);
            });

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

        if (typeof params.qstring.save === "undefined") {
            common.returnMessage(params, 400, 'Missing parameter "save"');
            return false;
        }

        if (typeof params.qstring.notif === "undefined") {
            common.returnMessage(params, 400, 'Missing parameter "notif"');
            return false;
        }

        log.i('Assistant plugin request: /i/assistant');
        const validate = ob.validateUserForMgmtReadAPI;
        validate(function (params) {

            const member = params.member;
            const api_key = params.qstring.api_key;
            let save_action;
            const notif = params.qstring.notif;
            const save_val = params.qstring.save;

            if (save_val === "true") save_action = true;//save
            else if (save_val === "false") save_action = false;//unsave

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

    plugins.register("/i/assistant_generate_all", function (ob) {
        const params = ob.params;

        if (typeof params.qstring.api_key === "undefined") {
            common.returnMessage(params, 400, 'Missing parameter "api_key"');
            return false;
        }
        log.i('Assistant plugin request: /i/assistant_generate_all');

        ob.validateUserForGlobalAdmin(params, function (params) {
            const callback = function () {
                log.i('Assistant plugin request: /i/assistant_generate_all finished');
            };

            assistant.generateNotifications(common.db, callback, true, true);

            common.returnOutput(params, "assistant_generate_all was ! completed");
            return;
        });

        return true;
    });

  /*
//todo not functional
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

            require('../../../api/parts/jobs').job('assistant:generate').in(3);

            common.returnOutput(params, "assistant_generate_all_job was ! completed");
            return true;
        });

        return true;
    });
*/
    //for debugging
    var db_name_notifs = "assistant_notifs";
    var db_name_config = "assistant_config";

    plugins.register("/i/asistdelete", function (ob) {
        var params = ob.params;

        if (typeof params.qstring.api_key === "undefined") {
            common.returnMessage(params, 400, 'Missing parameter "api_key"');
            return false;
        }
        log.i('Assistant plugin request: /i/asistdelete');

        ob.validateUserForGlobalAdmin(params, function (params) {

            common.db.collection(db_name_notifs).drop();
            common.db.collection(db_name_config).drop();

            common.returnOutput(params, "Delete was ! completed");
            return;
        });

        return true;
    });

}(plugin));

module.exports = plugin;