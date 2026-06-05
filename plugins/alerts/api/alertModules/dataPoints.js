/**
 * @typedef {import('../parts/common-lib.js').App} App
 */

const log = require('../../../../api/utils/log.js')('alert:dataPoints');
const moment = require('moment-timezone');
const common = require('../../../../api/utils/common.js');
const commonLib = require("../parts/common-lib.js");

const DATA_POINT_PROPERTY = "dp";

module.exports.check = async function({ alert, app, done, scheduledTo: date }) {
    let { period, compareType, compareValue } = alert;
    compareValue = Number(compareValue);

    const metricValue = await getDataPointByDate(app, date, period) || 0;
    log.d(alert._id, "value on", date, "is", metricValue);

    if (compareType === commonLib.COMPARE_TYPE_ENUM.MORE_THAN) {
        if (metricValue > compareValue) {
            log.d(alert._id, "triggered because", metricValue, "is more than", compareValue);
            await commonLib.trigger({ alert, app, metricValue, date }, log);
        }
    }
    else {
        const before = moment(date).subtract(1, commonLib.PERIOD_TO_DATE_COMPONENT_MAP[period]).toDate();
        const metricValueBefore = await getDataPointByDate(app, before, period);
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
 * @param   {Date}                      date     - date of the value you're looking for
 * @param   {string}                    period   - hourly|daily|monthly
 * @returns {Promise<number|undefined>}          - a promise resolves to metric value or undefined
 */
async function getDataPointByDate(app, date, period) {
    const dateComponents = commonLib.getDateComponents(date, app.timezone);
    const record = await common.db.collection("server_stats_data_points").findOne({
        a: app._id.toString(),
        m: String(dateComponents.years) + ":" + String(dateComponents.months),
    });
    if (!record || !record?.d) {
        return;
    }

    if (period === "monthly") {
        let monthlyDp;
        for (let day in record.d) {
            let dailyDp = dailySum(record.d[day]);
            if (typeof dailyDp === "number") {
                if (typeof monthlyDp !== "number") {
                    monthlyDp = 0;
                }
                monthlyDp += dailyDp;
            }
        }
        return monthlyDp;
    }
    else if (period === "daily") {
        return dailySum(record.d[dateComponents.days]);
    }
    else if (period === "hourly") {
        return record.d?.[dateComponents.days]?.[dateComponents.hours];
    }
}

/**
 * calculates the sum of the hourly values
 * @param   {object}           dailyData object stores hourly data (comes from db)
 * @returns {number|undefined}           summed up value
 */
function dailySum(dailyData) {
    if (!dailyData) {
        return;
    }

    let dailyValue;
    for (let hour in dailyData) {
        let hourlyValue = dailyData[hour][DATA_POINT_PROPERTY];
        if (typeof hourlyValue === "number") {
            if (typeof dailyValue !== "number") {
                dailyValue = 0;
            }
            dailyValue += hourlyValue;
        }
    }
    return dailyValue;
}
