'use strict';

const { Job } = require('../../../../api/parts/jobs/job.js'),
    log = require('../../../../api/utils/log.js')('alert:monitor'),
    common = require('../../../../api/utils/common.js');

/**
 * @class
 * @classdesc Class MonitorJob is Alert Monitor Job extend from Countly Job
 * @extends Job
 */
class MonitorJob extends Job {
    /**
    * run task
    * @param {object} _db - db object
    * @param {function} done - callback function
    */
    run(_db, done) {
        const ALERT_MODULES = {
            "view": require("../alertModules/view.js"),
            "users": require("../alertModules/users.js"),
            "session": require("../alertModules/session.js"),
            "survey": require("../alertModules/survey.js"),
        };
        const alertID = this._json.data.alertID;
        const scheduledTo = this._json.next;
        const self = this;
        common.db.collection("alerts").findOne({
            _id: common.db.ObjectID(alertID),
            alertDataSubType: {
                // these are being triggered by event listener in api.js
                $nin: [
                    "New survey response",
                    "New NPS response",
                    "New rating response"
                ]
            }
        }, function(err, alertConfigs) {
            if (err) {
                log.e(err);
                return;
            }

            log.d('Runing alerts Monitor Job ....');
            log.d("job info:", self._json, alertConfigs);
            const module = ALERT_MODULES[alertConfigs.alertDataType];
            if (module) {
                module.check({ alertConfigs, done, scheduledTo });
            }
        });
    }
}

module.exports = MonitorJob;
