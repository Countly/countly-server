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
    "nps": require("../alertModules/nps.js"),
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
    async run(_db, done) {
        let { alertID, appID } = this._json.data;
        const scheduledTo = this._json.next;
        try {
            const alert = await common.db.collection("alerts").findOne({
                _id: common.db.ObjectID(alertID),
                // these are being triggered by the event listener in api.js
                alertDataSubType: { $nin: Object.values(TRIGGERED_BY_EVENT) }
            });
            const app = await common.db.collection("apps").findOne({
                _id: common.db.ObjectID(appID),
            });
            log.d("alert job info:", this._json, alert, app);
            if (!alert || !app) {
                throw new Error("Alert", alertID, "or App", appID, "couldn't be found");
            }
            if (alert.alertDataType === 'profile_groups') {
                alert.alertDataType = 'cohorts';
            }
            const module = ALERT_MODULES[alert.alertDataType];
            await module.check({ alert, app, done, scheduledTo });
        }
        catch (err) {
            log.e(err);
        }
    }
}

module.exports = MonitorJob;
