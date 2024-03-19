/**
 * @typedef {import('../parts/common-lib.js').Alert} Alert
 * @typedef {import('../parts/common-lib.js').App} App
 * @typedef {import('../parts/common-lib.js').MatchedResult} MatchedResult
 */

const log = require('../../../../api/utils/log.js')('alert:view');
const moment = require('moment-timezone');
const common = require('../../../../api/utils/common.js');
const commonLib = require("../parts/common-lib.js");
const { ObjectId } = require('mongodb');

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
    compareValue = Number(compareValue);

    let metricValue;
    const numberOfSessions = await getSessionMetricByDate(app, "t", date, period);

    // there's no data on the given date
    if (!numberOfSessions) {
        return done();
    }

    // Find the metric value:
    if (alertDataSubType === "Number of sessions") {
        metricValue = numberOfSessions;
    }
    else if (alertDataSubType === "Average session duration") {
        const sessionDuration = await getSessionMetricByDate(app, "d", date, period);
        if (typeof sessionDuration === "number" && sessionDuration > 0) {
            return done();
        }
        metricValue = sessionDuration / numberOfSessions / 60;
    }
    else {
        log.e(`Metric "${alert.alertDataSubType}" couldn't be mapped for alert ${alert._id.toString()}`);
        return done();
    }

    if (!metricValue) {
        return done();
    }

    if (compareType === "more than") {
        if (metricValue > compareValue) {
            await commonLib.trigger({ alert, app, metricValue, date });
        }
    }
    else {
        const before = moment(date).subtract(1, commonLib.PERIOD_TO_DATE_COMPONENT_MAP[period]).toDate();
        let metricValueBefore;
        const numberOfSessionsBefore = await getSessionMetricByDate(app, "t", before, period);

        if (!numberOfSessions) {
            return done();
        }

        // Find the metric value for the previous matched date:
        if (alertDataSubType === "Number of sessions") {
            metricValueBefore = numberOfSessionsBefore;
        }
        else if (alertDataSubType === "Average session duration") {
            const sessionDuration = await getSessionMetricByDate(app, "d", date, period);
            if (typeof sessionDuration === "number" && sessionDuration > 0) {
                return done();
            }
            metricValueBefore = sessionDuration / numberOfSessions / 60;
        }

        const change = (metricValue / metricValueBefore - 1) * 100;
        const shouldTrigger = compareType === "increased by at least"
            ? change >= compareValue
            : change <= compareValue;

        if (shouldTrigger) {
            await commonLib.trigger({ alert, app, date, metricValue, metricValueBefore });
        }
    }

    done();
};

/**
 * Returns the session metric value by date and metric type.
 * @param   {object}                    app    - app document
 * @param   {string}                    metric - e, n, t, u, d, m, mt
 * @param   {Date}                      date   - date of the value you're looking for
 * @param   {string}                    period - hourly|daily|monthly
 * @returns {Promise<number|undefined>}        - a promise resolves to metric value or undefined
 */
async function getSessionMetricByDate(app, metric, date, period) {
    const dateComponents = commonLib.getDateComponents(date, app.timezone);
    const monthFilter = String(dateComponents.years) + ":" + String(dateComponents.months);
    const records = await common.db.collection("users").find({ m: monthFilter }).toArray();

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

/*
;(async function() {
    const dates = [
        new Date("2024-02-01"),
        new Date("2024-02-02"),
        new Date("2024-02-03"),
        new Date("2024-02-04"),
        new Date("2024-02-05"),
        new Date("2024-02-06"),
        new Date("2024-02-07"),
        new Date("2024-02-09"),
        new Date("2024-02-12"),
        new Date("2024-02-13"),
        new Date("2024-02-16"),
        new Date("2024-02-19"),
        new Date("2024-02-20"),
    ];
    let totalMonthlyValue = 0;
    for (let date of dates) {
        const dailyValue = await getSessionMetricByDate({
            _id: "65c1f875a12e98a328d5eb9e",
            timezone: "Europe/Istanbul"
        }, "t", date, "daily");
        if (typeof dailyValue !== "undefined") {
            totalMonthlyValue += dailyValue;
        }
    }
    const monthlyValue = await getSessionMetricByDate({
        _id: "65c1f875a12e98a328d5eb9e",
        timezone: "Europe/Istanbul"
    }, "t", new Date("2024-02-01"), "monthly");

    console.assert(totalMonthlyValue === monthlyValue, `================== sum of daily values: ${totalMonthlyValue} doesn't match with month value`);

    const hours = [
        new Date("2024-02-01T00:00:00.000Z"),
    ];

    let totalDailyValue = 0;
    for (const hour of hours) {
        const hourlyValue = await getSessionMetricByDate({
            _id: "65c1f875a12e98a328d5eb9e",
            timezone: "Europe/Istanbul"
        }, "t", hour, "hourly");
        if (typeof hourlyValue !== "undefined") {
            totalDailyValue += hourlyValue;
        }
    }
})();
*/