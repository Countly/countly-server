/**
 * @typedef {import('../parts/common-lib.js').App} App
 */

const log = require('../../../../api/utils/log.js')('alert:cohorts');
const moment = require('moment-timezone');
const common = require('../../../../api/utils/common.js');
const commonLib = require("../parts/common-lib.js");

module.exports.check = async function({ alert, app, done, scheduledTo: date }) {
    let { period, alertDataSubType2, compareType, compareValue } = alert;
    compareValue = Number(compareValue);

    const metricValue = await getCohortMetricByDate(app, alertDataSubType2, date, period) || 0;
    log.d(alert._id, "value on", date, "is", metricValue);

    if (compareType === commonLib.COMPARE_TYPE_ENUM.MORE_THAN) {
        if (metricValue > compareValue) {
            log.d(alert._id, "triggered because", metricValue, "is more than", compareValue);
            await commonLib.trigger({ alert, app, metricValue, date }, log);
        }
    }
    else {
        const before = moment(date).subtract(1, commonLib.PERIOD_TO_DATE_COMPONENT_MAP[period]).toDate();
        const metricValueBefore = await getCohortMetricByDate(app, alertDataSubType2, before, period);
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

