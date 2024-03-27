/**
 * @typedef {import('../parts/common-lib.js').Alert} Alert
 * @typedef {import('../parts/common-lib.js').App} App
 */

const log = require('../../../../api/utils/log.js')('alert:revenue');
const moment = require('moment-timezone');
const common = require('../../../../api/utils/common.js');
const commonLib = require("../parts/common-lib.js");
const { ObjectId } = require('mongodb');
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
    compareValue = Number(compareValue);

    const metricValue = await calculateRevenueMetric(app, alertDataSubType, date, period) || 0;

    if (compareType === commonLib.COMPARE_TYPE_ENUM.MORE_THAN) {
        if (metricValue > compareValue) {
            await commonLib.trigger({ alert, app, metricValue, date });
        }
    }
    else {
        const before = moment(date).subtract(1, commonLib.PERIOD_TO_DATE_COMPONENT_MAP[period]).toDate();
        const metricValueBefore = await calculateRevenueMetric(app, alertDataSubType, before, period);
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

/*
(async function() {
    await new Promise(res => setTimeout(res, 2000));
    const date = new Date("2024-01-04T12:47:19.247Z");
    const app = {
        _id: "65c1f875a12e98a328d5eb9e",
        timezone: "Europe/Istanbul",
        plugins: {
            revenue: {
                iap_events: [ 'Checkout' ]
            }
        }
    };

    const hourlyRevenue = await calculateRevenueMetric(app, "total revenue", date, "hourly");
    const hourlyRevenuePerUser = await calculateRevenueMetric(app, "average revenue per user", date, "hourly");
    const hourlyRevenuePerPayingUser = await calculateRevenueMetric(app, "average revenue per paying user", date, "hourly");
    const hourlyPayingUsers = await calculateRevenueMetric(app, "# of paying users", date, "hourly");
    console.log("hourly total revenue", date, "is", hourlyRevenue);
    console.log("hourly revenue per user on", date, "is", hourlyRevenuePerUser);
    console.log("hourly revenue per paying user on", date, "is", hourlyRevenuePerPayingUser);
    console.log("hourly paying user on", date, "is", hourlyPayingUsers);

    const dailyRevenue = await calculateRevenueMetric(app, "total revenue", date, "daily");
    const dailyRevenuePerUser = await calculateRevenueMetric(app, "average revenue per user", date, "daily");
    const dailyRevenuePerPayingUser = await calculateRevenueMetric(app, "average revenue per paying user", date, "daily");
    const dailyPayingUsers = await calculateRevenueMetric(app, "# of paying users", date, "daily");
    console.log("daily total revenue", date, "is", dailyRevenue);
    console.log("daily revenue per user on", date, "is", dailyRevenuePerUser);
    console.log("daily revenue per paying user on", date, "is", dailyRevenuePerPayingUser);
    console.log("daily paying user on", date, "is", dailyPayingUsers);

    const monthlyRevenue = await calculateRevenueMetric(app, "total revenue", date, "monthly");
    const monthlyRevenuePerUser = await calculateRevenueMetric(app, "average revenue per user", date, "monthly");
    const monthlyRevenuePerPayingUser = await calculateRevenueMetric(app, "average revenue per paying user", date, "monthly");
    const monthlyPayingUsers = await calculateRevenueMetric(app, "# of paying users", date, "monthly");
    console.log("monthly total revenue", date, "is", monthlyRevenue);
    console.log("monthly revenue per user on", date, "is", monthlyRevenuePerUser);
    console.log("monthly revenue per paying user on", date, "is", monthlyRevenuePerPayingUser);
    console.log("monthly paying user on", date, "is", monthlyPayingUsers);
})();
*/