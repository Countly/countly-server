/**
 * @typedef {import('../parts/common-lib.js').App} App
 */

const log = require('../../../../api/utils/log.js')('alert:pii');
const moment = require('moment-timezone');
const common = require('../../../../api/utils/common.js');
const commonLib = require("../parts/common-lib.js");
const { ObjectId } = require('mongodb');

module.exports.triggerByEvent = triggerByEvent;
/**
 * Checks if given payload contains PII incidents and triggers matching alerts.
 * @param {object} payload - { incidents, app }
 */
async function triggerByEvent(payload) {
    const incidents = payload?.incidents;
    const app = payload?.app;

    if (!incidents || !Array.isArray(incidents) || !incidents.length || !app) {
        return;
    }

    // Find alerts for this specific app AND alerts targeting all apps
    const [appAlerts, allAppsAlerts] = await Promise.all([
        common.readBatcher.getMany("alerts", {
            selectedApps: app._id.toString(),
            alertDataType: "pii",
            alertDataSubType: commonLib.TRIGGERED_BY_EVENT.pii,
            enabled: true,
        }),
        common.readBatcher.getMany("alerts", {
            selectedApps: "all",
            alertDataType: "pii",
            alertDataSubType: commonLib.TRIGGERED_BY_EVENT.pii,
            enabled: true,
        }),
    ]);

    const alerts = [...(appAlerts || []), ...(allAppsAlerts || [])];
    if (!alerts.length) {
        return;
    }

    await Promise.all(alerts.map(alert => {
        // If alert targets a specific rule, only trigger for incidents matching that rule
        if (alert.alertDataSubType2) {
            const matchingIncidents = incidents.filter(inc => inc.ruleId === alert.alertDataSubType2);
            if (!matchingIncidents.length) {
                return Promise.resolve();
            }
            return commonLib.trigger({
                alert,
                app,
                date: new Date(),
                extra: {
                    incidentCount: matchingIncidents.length,
                    firstIncident: matchingIncidents[0],
                }
            }, log);
        }
        return commonLib.trigger({
            alert,
            app,
            date: new Date(),
            extra: {
                incidentCount: incidents.length,
                firstIncident: incidents[0],
            }
        }, log);
    }));
}


module.exports.check = async function({ alertConfigs: alert, scheduledTo: date }) {
    const selectedApp = alert.selectedApps[0];
    let app = null;
    let appId = null;

    if (selectedApp !== "all") {
        app = await common.readBatcher.getOne("apps", { _id: new ObjectId(selectedApp) });
        if (!app) {
            log.e(`App ${selectedApp} couldn't be found`);
            return;
        }
        appId = app._id.toString();
    }

    let { period, compareType, compareValue, filterValue, alertDataSubType2 } = alert;
    compareValue = Number(compareValue);

    const metricValue = await countIncidents(date, period, appId, filterValue, alertDataSubType2) || 0;

    if (compareType === commonLib.COMPARE_TYPE_ENUM.MORE_THAN) {
        if (metricValue > compareValue) {
            await commonLib.trigger({ alert, app, metricValue, date }, log);
        }
    }
    else {
        const before = moment(date).subtract(1, commonLib.PERIOD_TO_DATE_COMPONENT_MAP[period]).toDate();
        const metricValueBefore = await countIncidents(before, period, appId, filterValue, alertDataSubType2);
        if (!metricValueBefore) {
            return;
        }

        const change = (metricValue / metricValueBefore - 1) * 100;
        const shouldTrigger = compareType === commonLib.COMPARE_TYPE_ENUM.INCREASED_BY
            ? change >= compareValue
            : change <= -compareValue;

        if (shouldTrigger) {
            await commonLib.trigger({ alert, app, date, metricValue, metricValueBefore }, log);
        }
    }
};

/**
 * Count PII incidents within a time period.
 * @param   {Date}                      date         - end date of the period
 * @param   {string}                    period       - hourly|daily|monthly
 * @param   {string|null}               appId        - app ID to filter by, or null for all apps
 * @param   {string|undefined}          actionFilter - optional action filter (NOTIFY|OBFUSCATE|BLOCK)
 * @param   {string|undefined}          ruleId       - optional PII rule ID to filter by
 * @returns {Promise<number>}                        - incident count
 */
async function countIncidents(date, period, appId, actionFilter, ruleId) {
    const periodMs = {
        hourly: 60 * 60 * 1000,
        daily: 24 * 60 * 60 * 1000,
        monthly: 30 * 24 * 60 * 60 * 1000,
    };

    const endTs = date.getTime();
    const startTs = endTs - (periodMs[period] || periodMs.daily);

    const query = {
        ts: { $gte: startTs, $lte: endTs },
    };

    if (appId) {
        query.app_id = appId;
    }

    if (actionFilter) {
        query.action = actionFilter;
    }

    if (ruleId) {
        query.ruleId = ruleId;
    }

    return common.db.collection("pii_incidents").countDocuments(query);
}
