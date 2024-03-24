'use strict';

const { TRIGGERED_BY_EVENT } = require('../parts/common-lib.js');

const { Job } = require('../../../../api/parts/jobs/job.js'),
    log = require('../../../../api/utils/log.js')('alert:monitor'),
    common = require('../../../../api/utils/common.js');

const ALERT_MODULES = {
    "views": require("../alertModules/views.js"),
    "users": require("../alertModules/users.js"),
    "sessions": require("../alertModules/sessions.js"),
    "survey": require("../alertModules/survey.js"),
    "revenue": require("../alertModules/revenue.js"),
    "events": require("../alertModules/events.js"),
    "rating": require("../alertModules/rating.js"),
    "cohorts": require("../alertModules/cohorts.js"),
    "dataPoints": require("../alertModules/dataPoints.js"),
    "crashes": require("../alertModules/crashes.js"),
};
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
        const alertID = this._json.data.alertID;
        const scheduledTo = this._json.next;
        const self = this;
        common.db.collection("alerts").findOne({
            _id: common.db.ObjectID(alertID),
            // these are being triggered by the event listener in api.js
            alertDataSubType: { $nin: Object.values(TRIGGERED_BY_EVENT) }
        }, async function(err, alertConfigs) {
            if (err) {
                log.e(err);
                return;
            }
            if (!alertConfigs) {
                return;
            }
            log.d('Runing alerts Monitor Job ....');
            log.d("job info:", self._json, alertConfigs);
            const module = ALERT_MODULES[alertConfigs.alertDataType];
            if (module) {
                try {
                    await module.check({ alertConfigs, done, scheduledTo });
                } catch(err) {
                    log.e("Error while running " + alertConfigs.alertDataType + " alert check", err);
                }
            } else {
                log.e("Alert module " + alertConfigs.alertDataType + " not found");
            }
        });
    }
}

module.exports = MonitorJob;
