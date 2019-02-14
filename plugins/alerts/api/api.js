const common = require('../../../api/utils/common.js');
const plugins = require('../../pluginManager.js');
const log = require('../../../api/utils/log.js')('alert:api');
var Promise = require("bluebird");
const JOB = require('../../../api/parts/jobs');
const utils = require('./parts/utils');
const _ = require('lodash');

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
        common.db.collection("jobs").remove({ 'data.alertID': alertID }, function() {
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
            JOB.job('alerts:monitor', { alertID: alert._id }).replace().schedule(alert.period);
        }
        else {
            deleteJob(alert._id);
        }
    }
    /**
	 * load job list
	 */
    function loadJobs() {
        common.db.collection("alerts").find({})
            .toArray(function(err, alertsList) {
                log.d(alertsList, "get alert configs");
                alertsList && alertsList.forEach(t => {
                    //period type
                    if (t.period) {
                        updateJobForAlert(t);
                    }
                });
            });
    }


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

    setTimeout(function() {
        plugins.dispatch("/updateAlert", { method: "alertTrigger" });
    }, 10000);



    plugins.register("/i/alert/save", function(ob) {
        let paramsInstance = ob.params;
        let validateUserForWriteAPI = ob.validateUserForWriteAPI;

        validateUserForWriteAPI(function(params) {
            let alertConfig = params.qstring.alert_config;
            try {
                alertConfig = JSON.parse(alertConfig);
                var checkProps = {
                    'alertName': { 'required': alertConfig._id ? false : true, 'type': 'String', 'min-length': 1 },
                    'alertDataType': { 'required': alertConfig._id ? false : true, 'type': 'String', 'min-length': 1 },
                    'alertDataSubType': { 'required': alertConfig._id ? false : true, 'type': 'String', 'min-length': 1 },
                    'period': { 'required': alertConfig._id ? false : true, 'type': 'String', 'min-length': 1 },
                    'selectedApps': { 'required': alertConfig._id ? false : true, 'type': 'Array', 'min-length': 1 }

                };
                if (!(common.validateArgs(alertConfig, checkProps))) {
                    common.returnMessage(params, 200, 'Not enough args');
                    return true;
                }
                if (alertConfig._id) {
                    const id = alertConfig._id;
                    delete alertConfig._id;
                    return common.db.collection("alerts").findAndModify(
                        { _id: common.db.ObjectID(id) },
                        {},
                        {$set: alertConfig},
                        function(err, result) {
                            if (!err) {

                                plugins.dispatch("/updateAlert", { method: "alertTrigger", alert: result.value });
                                plugins.dispatch("/updateAlert", { method: "alertTrigger" });

                                common.returnOutput(params, result && result.value);
                            }
                            else {
                                common.returnMessage(params, 500, "Failed to save an alert");
                            }
                        });
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
                log.e('Parse alert failed', alertConfig);
                common.returnMessage(params, 500, "Failed to create an alert");
            }
        }, paramsInstance);
        return true;
    });

    plugins.register("/i/alert/delete", function(ob) {
        let paramsInstance = ob.params;
        let validateUserForWriteAPI = ob.validateUserForWriteAPI;

        validateUserForWriteAPI(function(params) {
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
                log.e('delete alert failed', alertID);
                common.returnMessage(params, 500, "Failed to delete an alert");
            }
        }, paramsInstance);
        return true;
    });

    plugins.register("/i/alert/status", function(ob) {
        let paramsInstance = ob.params;
        let validateUserForWriteAPI = ob.validateUserForWriteAPI;
        validateUserForWriteAPI(function(params) {
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
                plugins.dispatch("/updateAlert", { method: "alertTrigger" });
                common.returnOutput(params, true);
            });
        }, paramsInstance);
        return true;
    });


    plugins.register("/o/alert/list", function(ob) {
        const paramsInstance = ob.params;
        let validateUserForWriteAPI = ob.validateUserForWriteAPI;
        validateUserForWriteAPI(function(params) {
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
                log.e('get alert list failed');
                common.returnMessage(params, 500, "Failed to get alert list");
            }
        }, paramsInstance);
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