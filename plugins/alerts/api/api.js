const common = require('../../../api/utils/common.js');
const plugins = require('../../pluginManager.js');
const log = require('../../../api/utils/log.js')('alert:api');
var Promise = require("bluebird");
const JOB = require('../../../api/parts/jobs');
const utils = require('./parts/utils.js');
const _ = require('lodash');
const { validateCreate, validateRead, validateUpdate, hasCreateRight, hasUpdateRight, getAdminApps, getUserAppsForFeaturePermission } = require('../../../api/utils/rights.js');
const FEATURE_NAME = 'alerts';
const commonLib = require("./parts/common-lib.js");
const moment = require('moment-timezone');
const { memberHasRightForAllApps, legacyApps } = require('./parts/app-authorization.js');


//the alert drawer reads concurrent_users.alert_interval to bound the interval it
//offers, falling back to a hardcoded 3 minutes when it cannot. The namespace belongs
//to an enterprise plugin, so it is declared here by the consumer that needs it rather
//than by its owner.
plugins.setReadableConfigs("concurrent_users", {
    alert_interval: true
});

/**
 * Alerts that can be triggered when an event is received.
 * see module file for details.
 *   Module   Event
 * - nps      [CLY]_nps
 * - rating   [CLY]_star_rating
 * - survey   [CLY]_survey
 * - crashes  HAS CUSTOM REQUEST BODY (no event key)
 */
const TRIGGER_BY_EVENT = Object.keys(commonLib.TRIGGERED_BY_EVENT).map(name => ({
    module: require("./alertModules/" + name + ".js"),
    name
}));

/**
 * Returns the text expression build from period for later.js.
 * Takes the timezone offset into account while calculating the trigger time.
 * @param {string} period - "hourly"|"daily"|"monthly"
 * @param {number} offset - timezone offset in minutes
 * @returns {string} schedule text
 */
function getScheduleTextExpression(period, offset) {
    if (period === "hourly") {
        return "every 1 hour on the 59th min";
    }
    const utcClock = moment("2026-02-01T23:59:00.000Z")
        .tz("UTC")
        .subtract(offset, "minutes")
        .format("HH:mm");
    if (period === "daily") {
        return "at " + utcClock;
    }
    return "on the last day of the month at " + utcClock;
}

(function() {
    /**
	 * delete alert job
	 * @param {string} alertID  - alert record id from db
	 * @param {function} callback - callback after deleting
	 */
    function deleteJob(alertID, callback) {
        if (typeof alertID === 'string') {
            alertID = common.db.ObjectID(alertID);
        }
        common.db.collection("jobs").remove({ 'data.alertID': alertID }, function(err) {
            if (err) {
                log.e('delete job failed, alertID:', alertID, err);
                return;
            }
            log.d('delete job, alertID:', alertID);
            if (callback) {
                callback();
            }
        });
    }
    /**
	 * update alert job
	 * @param {object} alert  - alert record data
	 */
    async function updateJobForAlert(alert) {
        if (alert.enabled && Object.keys(commonLib.PERIOD_TO_DATE_COMPONENT_MAP).includes(alert.period)) {
            const apps = await commonLib.loadAlertAppsWithTimezoneOffsets(alert);
            for (const app of apps) {
                const textExpression = getScheduleTextExpression(alert.period, app.offset);
                if (textExpression) {
                    JOB.job('alerts:monitor', {
                        alertID: alert._id,
                        appID: app._id
                    }).replace().schedule(textExpression);
                }
            }
        }
        else {
            deleteJob(alert._id);
        }
    }
    /**
	 * load job list
	 */
    async function loadJobs() {
        // delete and then re-create all jobs
        await common.db.collection("jobs").deleteMany({
            name: "alerts:monitor"
        });
        const alerts = await common.readBatcher.getMany("alerts", {
            enabled: true,
            period: { $exists: true }
        });
        log.d("loaded", alerts);
        await Promise.all(alerts.map(updateJobForAlert));
    }

    plugins.register("/i", async function(ob) {
        const events = ob.params?.qstring?.events;
        const app = ob.app;

        if (!events || !app) {
            return;
        }

        for (let { module, name } of TRIGGER_BY_EVENT) {
            if (name !== "crashes") {
                try {
                    await module.triggerByEvent({ events, app });
                }
                catch (err) {
                    log.e("Alert module '" + name + "' couldn't be triggered by event", err);
                }
            }
        }
    });

    plugins.register("/crashes/new", async function(ob) {
        for (let { module, name } of TRIGGER_BY_EVENT) {
            if (name === "crashes") {
                try {
                    await module.triggerByEvent(ob.data);
                }
                catch (err) {
                    log.e("Alert module '" + name + "' couldn't be triggered by event", err);
                }
            }
        }
    });

    plugins.register("/permissions/features", function(ob) {
        ob.features.push(FEATURE_NAME);
    });

    plugins.register("/master", function() {
        setTimeout(function() {
            plugins.dispatch("/updateAlert", { method: "alertTrigger" });
        }, 10000);
    });

    plugins.register("/updateAlert", function(ob) {
        if (ob && ob.method === "alertTrigger") {
            if (ob.alert) {
                updateJobForAlert(ob.alert);
            }
            else {
                loadJobs();
            }
        }
    });


    plugins.register("/alerts/addAlertCount", function(ob) {
        log.d("/alerts/addAlertCount", ob);
        utils.addAlertCount(ob);
    });




    /**
     * @api {get} /i/alert/save save new create or updated alert data.
     * @apiName  saveAlert
     * @apiGroup alerts
     *
     * @apiDescription  create or update alert.
     * @apiQuery {string} alert_config alert Configuration JSON object string.
     *  if contains "_id" will update related alert in DB.
     * @apiQuery {String} app_id target app id of the alert.
     *
     * @apiSuccessExample {json} Success-Response:
     * HTTP/1.1 200 OK
     *
     * {
          "_id": "626270afbf7392a8bfd8c1f3",
          "alertName": "test",
          "alertDataType": "metric",
          "alertDataSubType": "Total users",
          "alertDataSubType2": null,
          "compareType": "increased by at least",
          "compareValue": "2",
          "selectedApps": [
            "60a94dce686d3eea363ac325"
          ],
          "period": "every 1 hour on the 59th min",
          "alertBy": "email",
          "enabled": true,
          "compareDescribe": "Total users increased by at least 2%",
          "alertValues": [
            "a@abc.com"
          ],
          "createdBy": "60afbaa84723f369db477fee"
        }
     */
    plugins.register("/i/alert/save", function(ob) {
        let params = ob.params;

        validateCreate(params, FEATURE_NAME, function() {
            let alertConfig = params.qstring.alert_config;
            if (!alertConfig) {
                common.returnMessage(params, 400, 'Missing alert_config');
                return;
            }
            try {
                alertConfig = JSON.parse(alertConfig);
                common.stripRequestCredentials(alertConfig);
                var checkProps = {
                    'alertName': { 'required': alertConfig._id ? false : true, 'type': 'String', 'min-length': 1 },
                    'alertDataType': { 'required': alertConfig._id ? false : true, 'type': 'String', 'min-length': 1 },
                    'alertDataSubType': { 'required': alertConfig._id ? false : true, 'type': 'String', 'min-length': 1 },
                    // 'period': { 'required': alertConfig._id ? false : true, 'type': 'String', 'min-length': 1 },
                    'selectedApps': { 'required': alertConfig._id ? false : true, 'type': 'Array', 'min-length': 1 }

                };
                if (!(common.validateArgs(alertConfig, checkProps))) {
                    common.returnMessage(params, 200, 'Not enough args');
                    return true;
                }

                // Cross-app guard: every entry of selectedApps must be an
                // app the caller is allowed to create alerts on. Without
                // this, a user with alerts:create on app A could submit
                // selectedApps=[B] and have the alert evaluator emit B's
                // metric values to attacker-controlled emails listed in
                // alertValues.
                if (Array.isArray(alertConfig.selectedApps) && alertConfig.selectedApps.length > 0 && !params.member.global_admin) {
                    var unauthorized = alertConfig.selectedApps.filter(function(aid) {
                        return !hasCreateRight(FEATURE_NAME, aid + "", params.member);
                    });
                    if (unauthorized.length > 0) {
                        common.returnMessage(params, 403, 'No alerts:create permission on apps: ' + unauthorized.join(', '));
                        return true;
                    }
                }
                if (alertConfig._id) {
                    const id = alertConfig._id;
                    delete alertConfig._id;
                    //createdBy is the creator, not the last editor, and it is what
                    //ownership, list visibility and the send-time authorization added
                    //here are all judged by. Setting it to the caller on update handed a
                    //global admin the alerts of anybody whose alert they edited, and it
                    //is not the request's to set in any case.
                    delete alertConfig.createdBy;
                    var query = { _id: common.db.ObjectID(id) };
                    //If not global admin, limit update to own alerts only
                    if (params.member.global_admin !== true) {
                        query.createdBy = params.member._id;
                    }
                    //The guard above only saw the submitted selectedApps, and an update
                    //may leave that out to keep whatever is stored. So load the alert
                    //and authorize the apps it currently targets before changing it,
                    //otherwise an alert for an app the caller has since lost access to
                    //stays editable through any app they do still hold.
                    //loaded with the same selector the write uses, ownership included.
                    //By _id alone this answered a non-owner with a 403 derived from
                    //somebody else's selectedApps, which both says the alert exists and
                    //describes what it targets; without it the write was, and remains, a
                    //silent no-op for them.
                    return common.db.collection("alerts").findOne(query, function(findErr, existingAlert) {
                        if (findErr) {
                            common.returnMessage(params, 500, "Failed to save an alert");
                            return;
                        }
                        if (existingAlert && params.member.global_admin !== true
                            && !memberHasRightForAllApps(hasUpdateRight, params.member, existingAlert.selectedApps)) {
                            log.d("Rejected alert update" + common.reqInfo(params) + ": alert " + id
                                + " targets apps [" + (Array.isArray(existingAlert.selectedApps) ? existingAlert.selectedApps.join(", ") : "")
                                + "] the caller may not update");
                            common.returnMessage(params, 403, 'No alerts:update permission on the apps this alert targets');
                            return;
                        }
                        common.db.collection("alerts").findAndModify(
                            query,
                            {},
                            {$set: alertConfig},
                            function(err, result) {
                                if (!err) {
                                    if (result && result.value) {
                                        plugins.dispatch("/updateAlert", { method: "alertTrigger", alert: result.value });
                                    }

                                    common.returnOutput(params, result && result.value);
                                }
                                else {
                                    common.returnMessage(params, 500, "Failed to save an alert");
                                }
                            });
                    });
                }
                if (!alertConfig._id) {
                    alertConfig.createdAt = new Date().getTime();
                }
                alertConfig.createdBy = params.member._id;
                return common.db.collection("alerts").insert(
                    alertConfig,
                    function(err, result) {
                        log.d("insert new alert:", err, result);
                        if (!err && result && result.insertedIds && result.insertedIds[0]) {
                            plugins.dispatch("/updateAlert", { method: "alertTrigger", alert: result.ops[0] });
                            common.returnOutput(params, result.insertedIds[0]);
                        }
                        else {
                            common.returnMessage(params, 500, "Failed to create an alert");
                        }
                    }
                );
            }
            catch (err) {
                log.e('Parse alert failed', alertConfig, err);
                common.returnMessage(params, 500, "Failed to create an alert" + err.message);
            }
        });
        return true;
    });




    /**
     * @api {get} /i/alert/delete delete alert by alert ID
     * @apiName deleteAlert
     * @apiGroup alerts
     *
     * @apiDescription delete alert by id.
     * @apiQuery {string} alertID  target alert id from db.
     * @apiQuery {String} app_id target app id of the alert.
     *
     * @apiSuccessExample {json} Success-Response:
     * HTTP/1.1 200 OK
     *
     * {"result":"Deleted an alert"}
     *
    */
    plugins.register("/i/alert/delete", function(ob) {
        let params = ob.params;

        validateUpdate(params, FEATURE_NAME, function() {
            let alertID = params.qstring.alertID;
            try {
                var query = { "_id": common.db.ObjectID(alertID) };
                //If not global admin, limit delete to own alerts only
                //
                //Deliberately not also requiring rights on the apps the alert targets.
                //Deleting only removes what the alert does, so it cannot be used to
                //reach another app's data, and someone who has lost access to an app
                //needs to remain able to remove the alert they own for it. Refusing here
                //would leave them holding an alert they can neither manage nor delete.
                if (params.member.global_admin !== true) {
                    query.createdBy = params.member._id;
                }
                common.db.collection("alerts").remove(
                    query,
                    function(err, result) {
                        log.d(err, result, "delete an alert");
                        if (!err) {
                            if (result && result.deletedCount > 0) {
                                deleteJob(alertID);
                                common.returnMessage(params, 200, "Deleted an alert");
                            }
                            else {
                                common.returnMessage(params, 404, "Alert to delete not found. Make sure alert exists and you have rights to delete it.");
                            }
                        }
                        else {
                            common.returnMessage(params, 500, "Failed to delete an alert");
                        }
                    }
                );
            }
            catch (err) {
                log.e('delete alert failed', alertID, err);
                common.returnMessage(params, 500, "Failed to delete an alert" + err.message);
            }
        });
        return true;
    });

    /**
     * @api {post} /i/alert/status change alert status
     * @apiName changeAlertStatus
     * @apiGroup alerts
     *
     * @apiDescription change alerts status by boolean flag.
     * @apiQuery {string} JSON string of status object for alerts record want to update.
     *  for example: {"626270afbf7392a8bfd8c1f3":false, "42dafbf7392a8bfd8c1e1": true}
     * @apiQuery {String} app_id target app id of the alert.
     *
     * @apiSuccessExample {text} Success-Response:
     * HTTP/1.1 200 OK
     *
     * true
     *
    */
    plugins.register("/i/alert/status", function(ob) {
        let params = ob.params;

        validateUpdate(params, FEATURE_NAME, async function() {
            let statusList;
            try {
                statusList = JSON.parse(params.qstring.status);
            }
            catch (err) {
                log.e('Parse alert status failed', params.qstring.status, err);
                common.returnMessage(params, 500, "Failed to change alert status" + err.message);
                return;
            }
            //Enabling an alert for an app the caller may no longer touch is what makes
            //this endpoint exploitable, so the apps each stored alert targets are
            //authorized before it is switched on.
            //
            //Switching one off is deliberately still allowed. It only reduces what the
            //alert does, and refusing it would leave somebody who lost access to an app
            //unable to stop alert mail they no longer want, which is worse than the
            //problem being fixed.
            const enablingIds = Object.keys(statusList).filter(function(alertID) {
                return statusList[alertID] === true || statusList[alertID] === "true";
            });
            if (enablingIds.length > 0 && params.member.global_admin !== true) {
                let toEnable = [];
                try {
                    //scoped to the caller's own alerts, the same as the update below.
                    //An id belonging to somebody else must keep behaving as it did, a
                    //silent no-op, rather than returning a 403 that would confirm an
                    //alert with those apps exists.
                    toEnable = await common.db.collection("alerts").find({
                        _id: {
                            $in: enablingIds.map(function(a) {
                                return common.db.ObjectID(a);
                            })
                        },
                        createdBy: params.member._id
                    }, { projection: { selectedApps: 1 } }).toArray();
                }
                catch (e) {
                    log.e("Failed to load alerts for a status change", e);
                    common.returnMessage(params, 500, "Failed to change alert status");
                    return;
                }
                const unauthorized = toEnable.filter(function(alert) {
                    return !memberHasRightForAllApps(hasUpdateRight, params.member, alert.selectedApps);
                });
                if (unauthorized.length > 0) {
                    log.d("Rejected alert status change" + common.reqInfo(params) + ": alert(s) "
                        + unauthorized.map(function(a) {
                            return a._id;
                        }).join(", ") + " target apps the caller may not update");
                    common.returnMessage(params, 403, 'No alerts:update permission on the apps these alerts target');
                    return;
                }
            }
            const batch = [];
            for (const alertID in statusList) {
                var qquery = { _id: common.db.ObjectID(alertID) };
                //If not global admin, limit status change to own alerts only
                if (params.member.global_admin !== true) {
                    qquery.createdBy = params.member._id;
                }
                batch.push(
                    common.db.collection("alerts").findAndModify(
                        qquery,
                        {},
                        { $set: { enabled: statusList[alertID] } },
                        { new: true, upsert: false }
                    )
                );
            }
            Promise.all(batch).then(function(result) {
                let updatedAlerts = [];
                if (Array.isArray(result)) {
                    updatedAlerts = result
                        .filter(({ ok }) => !!ok)
                        .map(({ value }) => value);
                }
                common.readBatcher.invalidate("alerts", {}, {}, true);
                updatedAlerts.map(alert => plugins.dispatch("/updateAlert", { method: "alertTrigger", alert }));
                common.returnOutput(params, true);
            }).catch(function(batchErr) {
                //one failing findAndModify used to reject this chain with nothing
                //attached to it: no response was ever sent and the process saw an
                //unhandled rejection
                log.e("Failed to change alert status", batchErr);
                common.returnMessage(params, 500, "Failed to change alert status");
            });
        });
        return true;
    });

    /**
     * @api {post} /i/alert/list get alert list
     * @apiName getAlertList
     * @apiGroup alerts
     *
     * @apiDescription get Alert List user can view.
     *
     * @apiQuery {String} app_id target app id of the alert.
     *
     * @apiSuccessExample {json} Success-Response:
     * HTTP/1.1 200 OK
     *
     * {
          "alertsList": [
            {
              "_id": "626270afbf7392a8bfd8c1f3",
              "alertName": "test",
              "alertDataType": "metric",
              "alertDataSubType": "Total users",
              "alertDataSubType2": null,
              "compareType": "increased by at least",
              "compareValue": "2",
              "selectedApps": [
                "60a94dce686d3eea363ac325"
              ],
              "period": "every 1 hour on the 59th min",
              "alertBy": "email",
              "enabled": false,
              "compareDescribe": "Total users increased by at least 2%",
              "alertValues": [
                "a@abc.com"
              ],
              "createdBy": "60afbaa84723f369db477fee",
              "appNameList": "Mobile Test",
              "app_id": "60a94dce686d3eea363ac325",
              "condtionText": "Total users increased by at least 2%",
              "createdByUser": "abc",
              "type": "Total users"
            }
          ],
          "count": {
            "r": 0
          }
        }
     *
     *
    */
    plugins.register("/o/alert/list", function(ob) {
        const params = ob.params;
        validateRead(params, FEATURE_NAME, function() {
            try {
                let query = {};
                let count_query = { _id: 'meta'};
                if (params.member.global_admin !== true) {
                    //scope to the caller's own alerts AND only those targeting
                    //apps they can currently read alerts on, so alerts on apps
                    //the user no longer has access to are not disclosed
                    var allowedApps = (getAdminApps(params.member) || [])
                        .concat(getUserAppsForFeaturePermission(params.member, FEATURE_NAME, 'r') || []);
                    //legacy members (no permission object) are not covered by
                    //getUserAppsForFeaturePermission, so include their user_of apps too,
                    //otherwise they would see none of their own alerts. Through the
                    //shared helper because it maps them through String: an older member
                    //document can hold ObjectIds there, selectedApps is stored as
                    //strings, and $in does not compare the two - which would have hidden
                    //every alert from exactly the members this branch exists for.
                    allowedApps = allowedApps.concat(legacyApps(params.member));
                    query = { createdBy: params.member._id, selectedApps: { $in: allowedApps } };
                    count_query = {_id: 'email:' + params.member.email};
                }
                common.db.collection("alerts").find(query).toArray(function(err, alertsList) {
                    if (err) {
                        return log.e('got error in listing alerts: %j', err);
                    }
                    common.db.collection('members').find({}).toArray(function(err2, members) {
                        if (err2) {
                            return log.e('got error in finding members: %j', err2);
                        }
                        utils.getAlertCount(count_query, (count) => {
                            count.r = 0;
                            alertsList.forEach((a) => {
                                const member = _.find(members, {_id: a.createdBy});
                                a.createdByUser = member && member.full_name;
                                a.enabled ? count.r++ : null;
                            });
                            common.returnOutput(params, { alertsList, count } || []);
                        });
                    });
                });
            }
            catch (err) {
                log.e('get alert list failed', err);
                common.returnMessage(params, 500, "Failed to get alert list" + err.message);
            }
        });
        return true;
    });

    /**
	 * remove app related alerts record and  alert job records;
	 * @param {string} appId  - app id
	 */
    function removeAlertsForApp(appId) {
        common.db.collection('alerts').find({selectedApps: {$all: [appId]}}).toArray(function(err, result) {
            if (!err) {
                const ids = result.map((record)=>{
                    return record._id;
                }) || [];
                common.db.collection('alerts').remove({selectedApps: {$all: [appId]}}, function() {});
                common.db.collection('jobs').remove({'data.alertID': {$in: ids}}, function() {});
            }
        });
    }

    plugins.register("/i/apps/delete", function(ob) {
        var appId = ob.appId;
        removeAlertsForApp(appId);
    });

    plugins.register("/i/apps/clear_all", function(ob) {
        var appId = ob.appId;
        removeAlertsForApp(appId);
    });

    plugins.register("/i/apps/reset", function(ob) {
        var appId = ob.appId;
        removeAlertsForApp(appId);
    });
}());
