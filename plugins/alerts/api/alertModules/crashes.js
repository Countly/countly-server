/**
 * @typedef {import('../parts/common-lib.js').App} App
 */

const log = require('../../../../api/utils/log.js')('alert:crashes');
const moment = require('moment-timezone');
const common = require('../../../../api/utils/common.js');
const commonLib = require("../parts/common-lib.js");
const { ObjectId } = require('mongodb');

const METRIC_TO_PROPERTY_MAP = {
    "non-fatal crashes/errors per session": "crnfses",
    "fatal crashes/errors per session": "crfses",
};

const TOTAL_CRASHES_METRIC = "# of crashes/errors";

module.exports.triggerByEvent = triggerByEvent;
/**
 * Checks if given payload is a crash data and triggers the alerts.
 * @param {object} payload querystring from the request
 */
async function triggerByEvent(payload) {
    const crashObject = payload?.crash;
    const appKey = payload?.app_key;
    if (!crashObject || typeof crashObject !== "object" || !appKey) {
        return;
    }

    const app = await common.db.collection("apps").findOne({ key: appKey });
    if (!app) {
        return;
    }

    const alert = await common.db.collection("alerts").findOne({
        selectedApps: app._id.toString(),
        alertDataType: "crashes",
        alertDataSubType: commonLib.TRIGGERED_BY_EVENT.crashes,
    });
    if (!alert) {
        return;
    }

    await commonLib.trigger({ alert, app, date: new Date }, log);
}


module.exports.check = async function({ alertConfigs: alert, done, scheduledTo: date }) {
    const app = await common.db.collection("apps").findOne({ _id: ObjectId(alert.selectedApps[0]) });
    if (!app) {
        log.e(`App ${alert.selectedApps[0]} couldn't be found`);
        return done();
    }

    let { alertDataSubType, period, compareType, compareValue, filterValue } = alert;
    compareValue = Number(compareValue);

    const metricValue = await calculateMetricByDate(app, alertDataSubType, date, period, filterValue) || 0;

    if (compareType === commonLib.COMPARE_TYPE_ENUM.MORE_THAN) {
        if (metricValue > compareValue) {
            await commonLib.trigger({ alert, app, metricValue, date });
        }
    }
    else {
        const before = moment(date).subtract(1, commonLib.PERIOD_TO_DATE_COMPONENT_MAP[period]).toDate();
        const metricValueBefore = await calculateMetricByDate(app, alertDataSubType, before, period, filterValue);
        if (!metricValueBefore) {
            return done();
        }

        const change = (metricValue / metricValueBefore - 1) * 100;
        const shouldTrigger = compareType === commonLib.COMPARE_TYPE_ENUM.INCREASED_BY
            ? change >= compareValue
            : change <= -compareValue;

        if (shouldTrigger) {
            await commonLib.trigger({ alert, app, date, metricValue, metricValueBefore });
        }
    }

    done();
};

/**
 * Abstraction on top of getCrashDataByDate to calculate composite metrics. 
 * Possible metricStrings:
 *   - non-fatal crashes/errors per session
 *   - fatal crashes/errors per session
 *   - # of crashes/errors
 * @param   {App}                       app          - app document
 * @param   {string}                    metricString - check above function description
 * @param   {Date}                      date         - date of the value you're looking for
 * @param   {string}                    period       - hourly|daily|monthly
 * @param   {string[]|undefined}        versions     - app versions as array of strings
 * @returns {Promise<number|undefined>}              - a promise resolves to metric value or undefined
 */
async function calculateMetricByDate(app, metricString, date, period, versions) {
    if (Object.keys(METRIC_TO_PROPERTY_MAP).includes(metricString)) {
        return getCrashDataByDate(app, METRIC_TO_PROPERTY_MAP[metricString], date, period, versions);
    }
    // # of crashes/errors
    else if (metricString === TOTAL_CRASHES_METRIC) {
        const crf = await getCrashDataByDate(app, "crf", date, period, versions) || 0;
        const crnf = await getCrashDataByDate(app, "crnf", date, period, versions) || 0;
        return crf + crnf;
    }
}

/**
 * Returns the total crash metric on the given date. Available metrics:
 *   cr_u    - simply users but tracked for crash plugin (can't use users from core
 *             aggregated data, because it needs more segmentation, like by app version, etc)
 *   cr_s    - simply sessions but tracked for crash plugin (can't use users from core
 *             aggregated data, because it needs more segmentation, like by app version, etc)
 *   crfses  - crash fatal free sessions (how many users experienced any fatal crash in selected period)
 *   crauf   - crash fatal free users (how many users experienced any fatal crash in selected period)
 *   crnfses - crash non fatal free sessions (how many users experienced any non fatal crash in selected period)
 *   craunf  - crash non fatal free users (how many users experienced any non fatal crash in selected period)
 *   cruf    - unique fatal crashes (on per crash group) per period
 *   crunf   - unique non fatal crashes (one per crash group) per period
 *   crf     - crash fatal (simply fatal crash count)
 *   crnf    - non fatal crashes (simply non fatal crash count)
 * @param   {App}                       app      - app document
 * @param   {string}                    metric   - cr_u, cr_s, crfses, crauf, crnfses, craunf, cruf, crunf, crf, crnf
 * @param   {Date}                      date     - date of the value you're looking for
 * @param   {string}                    period   - hourly|daily|monthly
 * @param   {string[]|undefined}        versions - app versions as array of strings
 * @returns {Promise<number|undefined>}          - a promise resolves to metric value or undefined
 */
async function getCrashDataByDate(app, metric, date, period, versions) {
    const dateComponents = commonLib.getDateComponents(date, app.timezone);
    // building ids with given args. example: if there are filters:
    //   any**3:12:2**65c1f875a12e98a328d5eb9e_2024:2 // monthly
    //   any**3:12:1**65c1f875a12e98a328d5eb9e_2024:0 // yearly
    // if there are no filters:
    //   65c1f875a12e98a328d5eb9e_2024:2 // monthly
    //   65c1f875a12e98a328d5eb9e_2024:0 // yearly
    let recordIds = [];
    const monthFilter = period === "monthly" ? "0" : String(dateComponents.months);
    if (Array.isArray(versions)) {
        recordIds = versions.map(version => "any**" + version + "**");
    }
    else {
        recordIds = [""];
    }
    recordIds = recordIds.map(id => id + app._id.toString() + "_" + dateComponents.years + ":" + monthFilter);

    const records = await common.db.collection("crashdata").find({ _id: { $in: recordIds } }).toArray();
    let number;
    for (let record of records) {
        let context;
        if (period === "monthly") {
            context = record?.d?.[dateComponents.months];
        }
        else if (period === "daily") {
            context = record?.d?.[dateComponents.days];
        }
        else {
            context = record?.d?.[dateComponents.days]?.[dateComponents.hours];
        }

        let value = context?.[metric];
        if (typeof value === "number") {
            if (typeof number !== "number") {
                number = 0;
            }
            number += value;
        }
    }
    return number;
}

/*
(async function() {
    await new Promise(res => setTimeout(res, 2000));
    const app = { _id: ObjectId("65c1f875a12e98a328d5eb9e"), timezone: "Europe/Istanbul" };
    const date = new Date("2024-02-07T12:00:00.000Z");
    let monthlyData = await getCrashDataByDate(app, "cr_u", date, "monthly");
    let dailyData = await getCrashDataByDate(app, "cr_u", date, "daily", ["4:02:0", "4:01:2"]);
    console.log(monthlyData, dailyData);
    console.log(await calculateMetricByDate(app, "# of crashes/errors", date, "daily"));
})();
*/