const common = require('../../../api/utils/common.js');
const plugins = require('../../pluginManager.js');
const log = require('../../../api/utils/log.js')('alert:api');
var Promise = require("bluebird");
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

(function() {
    /**
     * Notify the alert processor about changes in alerts configuration
     * This will be picked up by the alert processor on its next run
     */
    function notifyAlertProcessor() {
        // Invalidate the alerts cache so processor picks up changes
        common.readBatcher.invalidate("alerts", {}, {}, true);
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

    plugins.register("/alerts/addAlertCount", function(ob) {
        log.d("/alerts/addAlertCount", ob);
        utils.addAlertCount(ob);
    });

    /**
     * @api {get} /i/alert/save save new create or updated alert data.
     * @apiName  saveAlert
     * @apiGroup alerts
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
                var checkProps = {
                    'alertName': { 'required': !alertConfig._id, 'type': 'String', 'min-length': 1 },
                    'alertDataType': { 'required': !alertConfig._id, 'type': 'String', 'min-length': 1 },
                    'alertDataSubType': { 'required': !alertConfig._id, 'type': 'String', 'min-length': 1 },
                    'selectedApps': { 'required': !alertConfig._id, 'type': 'Array', 'min-length': 1 }
                };
                if (!(common.validateArgs(alertConfig, checkProps))) {
                    common.returnMessage(params, 200, 'Not enough args');
                    return true;
                }

                if (alertConfig._id) {
                    const id = alertConfig._id;
                    delete alertConfig._id;
                    alertConfig.createdBy = params.member._id;
                    var query = { _id: common.db.ObjectID(id) };
                    //If not global admin, limit update to own alerts only
                    if (params.member.global_admin !== true) {
                        query.createdBy = params.member._id;
                    }
                    return common.db.collection("alerts").findAndModify(
                        query,
                        {},
                        {$set: alertConfig},
                        function(err, result) {
                            if (!err) {
                                notifyAlertProcessor();
                                common.returnOutput(params, result && result.value);
                            }
                            else {
                                common.returnMessage(params, 500, "Failed to save an alert");
                            }
                        });
                }

                alertConfig.createdAt = new Date().getTime();
                alertConfig.createdBy = params.member._id;
                return common.db.collection("alerts").insert(
                    alertConfig,
                    function(err, result) {
                        log.d("insert new alert:", err, result);
                        if (!err && result && result.insertedIds && result.insertedIds[0]) {
                            notifyAlertProcessor();
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
     */
    plugins.register("/i/alert/delete", function(ob) {
        let params = ob.params;

        validateUpdate(params, FEATURE_NAME, function() {
            let alertID = params.qstring.alertID;
            try {
                var query = { "_id": common.db.ObjectID(alertID) };
                //If not global admin, limit delete to own alerts only
                if (params.member.global_admin !== true) {
                    query.createdBy = params.member._id;
                }
                common.db.collection("alerts").remove(
                    query,
                    function(err, result) {
                        log.d(err, result, "delete an alert");
                        if (!err) {
                            if (result && result.deletedCount > 0) {
                                notifyAlertProcessor();
                                common.returnMessage(params, 200, "Deleted an alert");
                            }
                            else {
                                common.returnMessage(params, 400, "Alert to delete not found. Make sure alert exists and you have rights to delete it.");
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
     */
    plugins.register("/i/alert/status", function(ob) {
        let params = ob.params;

        validateUpdate(params, FEATURE_NAME, function() {
            let statusList;
            try {
                statusList = JSON.parse(params.qstring.status);
            }
            catch (err) {
                log.e('Parse alert status failed', params.qstring.status, err);
                common.returnMessage(params, 500, "Failed to change alert status" + err.message);
                return;
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
                        { new: false, upsert: false }
                    )
                );
            }
            Promise.all(batch).then(function() {
                log.d("alert statuses updated");
                notifyAlertProcessor();
                common.returnOutput(params, true);
            });
        });
        return true;
    });

    /**
     * @api {post} /o/alert/list get alert list
     * @apiName getAlertList
     * @apiGroup alerts
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
     * remove app related alerts
     * @param {string} appId - app id
     */
    function removeAlertsForApp(appId) {
        common.db.collection('alerts').find({selectedApps: {$all: [appId]}}).toArray(function(err, result) {
            if (!err && result.length > 0) {
                common.db.collection('alerts').remove({selectedApps: {$all: [appId]}}, function() {
                    notifyAlertProcessor();
                });
            }
        });
    }

    plugins.register("/i/apps/delete", function(ob) {
        removeAlertsForApp(ob.appId);
    });

    plugins.register("/i/apps/clear_all", function(ob) {
        removeAlertsForApp(ob.appId);
    });

    plugins.register("/i/apps/reset", function(ob) {
        removeAlertsForApp(ob.appId);
    });
}());