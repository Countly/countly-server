/**
 * @typedef {import('../parts/common-lib.js').Alert} Alert
 * @typedef {import('../parts/common-lib.js').App} App
 */

const log = require('../../../../api/utils/log.js')('alert:users');
const moment = require('moment-timezone');
const common = require('../../../../api/utils/common.js');
const commonLib = require("../parts/common-lib.js");
const { ObjectId } = require('mongodb');

const METRIC_TO_PROPERTY_MAP = {
    "# of users": "u",
    "# of new users": "n",
};
/**
 * Alert triggering logic
 * @param {Alert}    alert - alert document
 * @param {function} done  - callback function
 * @param {Date}     date  - scheduled date for the alert (job.next)
 */
module.exports.check = async({ alertConfigs: alert, done, scheduledTo: date }) => {
    const app = await common.db.collection("apps").findOne({ _id: ObjectId(alert.selectedApps[0]) });
    if (!app) {
        log.e(`App ${alert.selectedApps[0]} couldn't be found`);
        return done();
    }

    let { alertDataSubType, period, compareType, compareValue } = alert;
    const metricProperty = METRIC_TO_PROPERTY_MAP[alertDataSubType];
    compareValue = Number(compareValue);

    if (!metricProperty) {
        log.e(`Metric "${alert.alertDataSubType}" couldn't be mapped for alert ${alert._id.toString()}`);
        return done();
    }

    const metricValue = await getUserMetricByDate(app, metricProperty, date, period) || 0;

    if (compareType === commonLib.COMPARE_TYPE_ENUM.MORE_THAN) {
        if (metricValue > compareValue) {
            await commonLib.trigger({ alert, app, metricValue, date });
        }
    }
    else {
        const before = moment(date).subtract(1, commonLib.PERIOD_TO_DATE_COMPONENT_MAP[period]).toDate();
        const metricValueBefore = await getUserMetricByDate(app, metricProperty, before, period);
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

module.exports.getUserMetricByDate = getUserMetricByDate;
/**
 * Returns user metric by date and metric type.
 * @param   {App}                       app    - app document
 * @param   {string}                    metric - e, n, t, u, d, m, mt, p
 * @param   {Date}                      date   - date of the value you're looking for
 * @param   {string}                    period - hourly|daily|monthly
 * @returns {Promise<number|undefined>}        - a promise resolves to metric value or undefined
 */
async function getUserMetricByDate(app, metric, date, period) {
    const dateComponents = commonLib.getDateComponents(date, app.timezone);
    const monthFilter = String(dateComponents.years) + ":" + String(dateComponents.months);
    const records = await common.db.collection("users").find({ m: monthFilter }).toArray();

    // merge splitted records
    let number;
    for (let record of records) {
        let value;
        if (period === "hourly") {
            value = record?.d?.[dateComponents.days]?.[dateComponents.hours]?.[metric];
        }
        else if (period === "daily") {
            value = record?.d?.[dateComponents.days]?.[metric];
        }
        else if (period === "monthly") {
            for (let i = 1; i <= 31; i++) {
                const dailyValue = record?.d?.[i]?.[metric];
                if (typeof dailyValue === "number") {
                    if (typeof value !== "number") {
                        value = 0;
                    }
                    value += dailyValue;
                }
            }
        }

        if (typeof value === "number") {
            if (typeof number !== "number") {
                number = 0;
            }
            number += value;
        }
        value = undefined;
    }

    return number;
}
