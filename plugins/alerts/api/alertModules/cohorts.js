/**
 * @typedef {import('../parts/common-lib.js').App} App
 */

const log = require('../../../../api/utils/log.js')('alert:cohorts');
const moment = require('moment-timezone');
const common = require('../../../../api/utils/common.js');
const commonLib = require("../parts/common-lib.js");
const { ObjectId } = require('mongodb');

module.exports.check = async function({ alertConfigs: alert, done, scheduledTo: date }) {
    const app = await common.db.collection("apps").findOne({ _id: ObjectId(alert.selectedApps[0]) });
    if (!app) {
        log.e(`App ${alert.selectedApps[0]} couldn't be found`);
        return done();
    }

    let { period, alertDataSubType2, compareType, compareValue } = alert;
    compareValue = Number(compareValue);

    const metricValue = await getCohortMetricByDate(app, alertDataSubType2, date, period) || 0;

    if (compareType === commonLib.COMPARE_TYPE_ENUM.MORE_THAN) {
        if (metricValue > compareValue) {
            await commonLib.trigger({ alert, app, metricValue, date });
        }
    }
    else {
        const before = moment(date).subtract(1, commonLib.PERIOD_TO_DATE_COMPONENT_MAP[period]).toDate();
        const metricValueBefore = await getCohortMetricByDate(app, alertDataSubType2, before, period);
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
 * Returns the number of users inside the given cohort on the given date.
 * @param   {App}                       app      - app document
 * @param   {string}                    cohortId - _id of the from cohorts
 * @param   {Date}                      date     - date of the value you're looking for
 * @param   {string}                    period   - hourly|daily|monthly
 * @returns {Promise<number|undefined>}          - a promise resolves to metric value or undefined
 */
async function getCohortMetricByDate(app, cohortId, date, period) {
    const dateComponents = commonLib.getDateComponents(date, app.timezone);
    const record = await common.db.collection("cohortdata").findOne({
        _id: cohortId + "_" + String(dateComponents.years) + ":" + String(dateComponents.months)
    });
    if (!record || !record?.d) {
        return;
    }

    if (period === "monthly") {
        // find the last day that we have data on
        let daysInMonth = Object.keys(record.d)
            .map(day => parseInt(day, 10))
            .filter(day => !!day);
        daysInMonth.sort((i, j) => j - i); // sort descending
        for (let day of daysInMonth) {
            let value = record.d[day].t;
            if (typeof value === "number") {
                return value;
            }
        }
    }
    else if (period === "daily") {
        return record.d?.[dateComponents.days]?.t;
    }
    else if (period === "hourly") {
        return record.d?.[dateComponents.days]?.[dateComponents.hours]?.t;
    }
}

/*
(async function() {
    await new Promise(res => setTimeout(res, 2000));
    const app = { _id: ObjectId("65c1f875a12e98a328d5eb9e"), timezone: "Europe/Istanbul" };
    const date = new Date("2024-02-07T12:00:00.000Z");
    const cohort = "3bcc37740d564419586ec26b66ea7c32";
    let monthlyData = await getCohortMetricByDate(app, cohort, date, "monthly");
    let dailyData = await getCohortMetricByDate(app, cohort, date, "daily");
    console.log(monthlyData, dailyData);
})();
*/