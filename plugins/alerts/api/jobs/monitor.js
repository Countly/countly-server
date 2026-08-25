'use strict';

const { TRIGGERED_BY_EVENT } = require('../parts/common-lib.js');

const { Job } = require('../../../../api/parts/jobs/job.js'),
    log = require('../../../../api/utils/log.js')('alert:monitor'),
    common = require('../../../../api/utils/common.js'),
    { hasReadRight } = require('../../../../api/utils/rights.js');

const { memberMayReadApp } = require('../parts/app-authorization.js');

/**
 * Whether the member who created an alert may still read the app it is about.
 *
 * The endpoints authorize a request, but nothing re-checked anything once an alert was
 * enabled, so one created before access was revoked kept emailing that app's metrics
 * indefinitely with no further action by anybody. This is the check that stops that, and
 * it is why fixing only the write endpoints would not have been enough.
 *
 * @param {object} alert - the stored alert
 * @param {string} appID - app the scheduled job is about
 * @returns {Promise<boolean>} true when the alert may still be sent
 */
async function ownerMayStillReadApp(alert, appID) {
    if (!alert.createdBy) {
        //Alerts predating the createdBy field cannot be attributed to anybody. Refusing
        //to send them would silently stop alerts that have worked for years, which is a
        //worse outcome than the exposure closed here, so they are reported and left be.
        log.w("Alert " + alert._id + " has no createdBy, so its owner's current access cannot be checked. Sending anyway.");
        return true;
    }
    let owner;
    try {
        owner = await common.db.collection("members").findOne(
            { _id: common.db.ObjectID(alert.createdBy + "") },
            { projection: { global_admin: 1, permission: 1, user_of: 1, admin_of: 1 } }
        );
    }
    catch (e) {
        log.e("Could not resolve the owner of alert " + alert._id + ", not sending", e);
        return false;
    }
    if (!owner) {
        log.d("Owner of alert " + alert._id + " no longer exists, not sending");
        return false;
    }
    return memberMayReadApp(hasReadRight, owner, appID);
}

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
            if (!await ownerMayStillReadApp(alert, appID)) {
                log.d("Not sending alert " + alertID + " for app " + appID + ": its owner no longer has access to that app");
                return;
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
