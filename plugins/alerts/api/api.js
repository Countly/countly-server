const common = require('../../../api/utils/common.js');
const plugins = require('../../pluginManager.js');
const log = require('../../../api/utils/log.js')('alert:api');
var Promise = require("bluebird");
const JOB = require('../../../api/parts/jobs');
const utils = require('./parts/utils');
const _ = require('lodash');
const { validateCreate, validateRead, validateUpdate } = require('../../../api/utils/rights.js');
const FEATURE_NAME = 'alerts';
const commonLib = require("./parts/common-lib.js");

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

// FIX THIS: workaround for the job.schedule
const _date = new Date("2024-03-25T23:59:00.000Z");
const _timeDelta = _date.getTimezoneOffset() / 60;
const _hours = String((23 + _timeDelta) % 24).padStart(2, "0");

const PERIOD_TO_TEXT_EXPRESSION_MAPPER = {
    "hourly": "every 1 hour on the 59th min",
    "daily": "at " + _hours + ":59",
    "monthly": "on the last day of the month at " + _hours + ":59",
};

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
    function updateJobForAlert(alert) {
        if (alert.enabled) {
            const textExpression = PERIOD_TO_TEXT_EXPRESSION_MAPPER[alert.period];
            if (textExpression) {
                JOB.job('alerts:monitor', { alertID: alert._id }).replace().schedule(textExpression);
                // JOB.job('alerts:monitor', { alertID: alert._id }).replace().schedule("every seconds");
            }
        }
        else {
            deleteJob(alert._id);
        }
    }
    /**
	 * load job list
	 */
    function loadJobs() {
        common.readBatcher.getMany("alerts", {}, function(err, alertsList) {
            log.d(alertsList, "get alert configs");
            alertsList && alertsList.forEach(t => {
                //period type
                if (t.period) {
                    updateJobForAlert(t);
                }
            });
        });
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
        loadJobs();
    });

    plugins.register("/updateAlert", function(ob) {
        setTimeout(() => {
            if (ob && (ob.method === "alertTrigger")) {
                if (ob.alert) {
                    deleteJob(ob.alert, function() {
                        updateJobForAlert(ob.alert);
                    });
                }
                else {
                    loadJobs();
                }
            }
        }, 2000);
    });


    plugins.register("/alerts/addAlertCount", function(ob) {
        log.d("/alerts/addAlertCount", ob);
        utils.addAlertCount(ob);
    });

    setTimeout(function() {
        plugins.dispatch("/updateAlert", { method: "alertTrigger" });
    }, 10000);



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
            try {
                alertConfig = JSON.parse(alertConfig);
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
                if (alertConfig._id) {
                    const id = alertConfig._id;
                    delete alertConfig._id;
                    alertConfig.createdBy = params.member._id;
                    return common.db.collection("alerts").findAndModify(
                        { _id: common.db.ObjectID(id) },
                        {},
                        {$set: alertConfig},
                        function(err, result) {
                            if (!err) {
                                if (result && result.value) {
                                    plugins.dispatch("/updateAlert", { method: "alertTrigger", alert: result.value });
                                }
                                plugins.dispatch("/updateAlert", { method: "alertTrigger" });

                                common.returnOutput(params, result && result.value);
                            }
                            else {
                                common.returnMessage(params, 500, "Failed to save an alert");
                            }
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
                common.db.collection("alerts").remove(
                    { "_id": common.db.ObjectID(alertID) },
                    function(err, result) {
                        log.d(err, result, "delete an alert");
                        if (!err) {
                            deleteJob(alertID);
                            common.returnMessage(params, 200, "Deleted an alert");
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

        validateUpdate(params, FEATURE_NAME, function() {
            const statusList = JSON.parse(params.qstring.status);
            const batch = [];
            for (const appID in statusList) {
                batch.push(
                    common.db.collection("alerts").findAndModify(
                        { _id: common.db.ObjectID(appID) },
                        {},
                        { $set: { enabled: statusList[appID] } },
                        { new: false, upsert: false }
                    )
                );
            }
            Promise.all(batch).then(function() {
                log.d("alert all updated.");
                common.readBatcher.invalidate("alerts", {}, {}, true);
                plugins.dispatch("/updateAlert", { method: "alertTrigger" });
                common.returnOutput(params, true);
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
                    query = { createdBy: params.member._id};
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
