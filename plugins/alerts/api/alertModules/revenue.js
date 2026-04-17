/**
 * @typedef {import('../parts/common-lib.js').Alert} Alert
 * @typedef {import('../parts/common-lib.js').App} App
 */

const log = require('../../../../api/utils/log.js')('alert:revenue');
const moment = require('moment-timezone');
const commonLib = require("../parts/common-lib.js");
const { getEventMetricByDate } = require("./events.js");
const { getUserMetricByDate } = require("./users.js");

const PURCHASE_PROP_KEY = "s";
const USER_PROP_KEY = "u";
const PAYING_USER_PROP_KEY = "p";

/**
 * Alert triggering logic
 * All possible metrics:
 *   - total revenue
 *   - average revenue per user
 *   - average revenue per paying user
 *   - # of paying users
 */
module.exports.check = async({ alert, app, done, scheduledTo: date }) => {
    let { alertDataSubType, period, compareType, compareValue } = alert;
    compareValue = Number(compareValue);

    const metricValue = await calculateRevenueMetric(app, alertDataSubType, date, period) || 0;
    log.d(alert._id, "value on", date, "is", metricValue);

    if (compareType === commonLib.COMPARE_TYPE_ENUM.MORE_THAN) {
        if (metricValue > compareValue) {
            log.d(alert._id, "triggered because", metricValue, "is more than", compareValue);
            await commonLib.trigger({ alert, app, metricValue, date }, log);
        }
    }
    else {
        const before = moment(date).subtract(1, commonLib.PERIOD_TO_DATE_COMPONENT_MAP[period]).toDate();
        const metricValueBefore = await calculateRevenueMetric(app, alertDataSubType, before, period);
        log.d(alert._id, "value on", before, "is", metricValueBefore);
        if (!metricValueBefore) {
            return done();
        }

        const change = (metricValue / metricValueBefore - 1) * 100;
        const shouldTrigger = compareType === commonLib.COMPARE_TYPE_ENUM.INCREASED_BY
            ? change >= compareValue
            : change <= -compareValue;

        if (shouldTrigger) {
            log.d(alert._id, "triggered because", compareType, String(change) + "%");
            await commonLib.trigger({ alert, app, date, metricValue, metricValueBefore }, log);
        }
    }
    done();
};

/**
 * Abstraction to calculate metrics that requires multiple parameters.
 * @param   {App}                       app        - app document
 * @param   {string}                    metricName - full metric name string. check function body for possible values.
 * @param   {Date}                      date       - date of the value you're looking for
 * @param   {string}                    period     - hourly|daily|monthly
 * @returns {Promise<number|undefined>}            - a promise resolves to metric value or undefined
 */
async function calculateRevenueMetric(app, metricName, date, period) {
    let metricValue, revenue, users, payingUsers;
    switch (metricName) {
    case "total revenue":
        metricValue = await getRevenueEventMetricByDate(app, PURCHASE_PROP_KEY, date, period);
        break;
    case "average revenue per user":
        users = await getUserMetricByDate(app, USER_PROP_KEY, date, period);
        revenue = await getRevenueEventMetricByDate(app, PURCHASE_PROP_KEY, date, period);
        if (users && revenue) {
            metricValue = revenue / users;
        }
        break;
    case "average revenue per paying user":
        payingUsers = await getUserMetricByDate(app, PAYING_USER_PROP_KEY, date, period);
        revenue = await getRevenueEventMetricByDate(app, PURCHASE_PROP_KEY, date, period);
        if (payingUsers && revenue) {
            metricValue = revenue / payingUsers;
        }
        break;
    case "# of paying users":
        metricValue = await getUserMetricByDate(app, PAYING_USER_PROP_KEY, date, period);
        break;
    }
    return metricValue;
}

/**
 * Returns the revenue metric value by date and metric type.
 * @param   {App}                       app    - app document
 * @param   {string}                    metric - prop name in event collection: c, s, dur
 * @param   {Date}                      date   - date of the value you're looking for
 * @param   {string}                    period - hourly|daily|monthly
 * @returns {Promise<number|undefined>}        - a promise resolves to metric value or undefined
 */
async function getRevenueEventMetricByDate(app, metric, date, period) {
    const events = app.plugins?.revenue?.iap_events;
    if (!Array.isArray(events)) {
        return;
    }

    let result;
    for (let eventName of events) {
        let value = await getEventMetricByDate(app, eventName, metric, date, period);
        if (typeof value !== "number") {
            continue;
        }
        if (typeof result !== "number") {
            result = 0;
        }
        result += value;
    }

    return result;
}
