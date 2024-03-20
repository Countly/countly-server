/**
 * @typedef {import('../parts/common-lib.js').App} App
 */

const log = require('../../../../api/utils/log.js')('alert:dataPoint');
const moment = require('moment-timezone');
const common = require('../../../../api/utils/common.js');
const commonLib = require("../parts/common-lib.js");
const { ObjectId } = require('mongodb');

const DATA_POINT_PROPERTY = "dp";

module.exports.check = async function({ alertConfigs: alert, done, scheduledTo: date }) {
    const selectedApp = alert.selectedApps[0];
    let apps;
    if (selectedApp === "all-apps") {
        apps = await common.db.collection("apps").find().toArray();
    }
    else {
        apps = [await common.db.collection("apps").findOne({ _id: ObjectId(selectedApp) })];
    }

    for (let app of apps) {
        if (!app) {
            log.e(`App ${alert.selectedApps[0]} couldn't be found`);
            continue;
        }

        let { period, compareType, compareValue } = alert;
        compareValue = Number(compareValue);

        const metricValue = await getDataPointByDate(app, date, period) || 0;

        if (compareType === commonLib.COMPARE_TYPE_ENUM.MORE_THAN) {
            if (metricValue > compareValue) {
                await commonLib.trigger({ alert, app, metricValue, date });
            }
        }
        else {
            const before = moment(date).subtract(1, commonLib.PERIOD_TO_DATE_COMPONENT_MAP[period]).toDate();
            const metricValueBefore = await getDataPointByDate(app, before, period);
            if (!metricValueBefore) {
                continue;
            }

            const change = (metricValue / metricValueBefore - 1) * 100;
            const shouldTrigger = compareType === commonLib.COMPARE_TYPE_ENUM.INCREASED_BY
                ? change >= compareValue
                : change <= -compareValue;

            if (shouldTrigger) {
                await commonLib.trigger({ alert, app, date, metricValue, metricValueBefore });
            }
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
/*
(async function() {
    await new Promise(res => setTimeout(res, 2000));
    const app = { _id: ObjectId("65c1f875a12e98a328d5eb9e"), timezone: "Europe/Istanbul" };
    const date1 = new Date("2024-01-07T10:00:00.000Z");
    const date2 = new Date("2024-02-07T10:00:00.000Z");
    const date3 = new Date("2024-03-07T10:00:00.000Z");
    let monthlyData1 = await getDataPointByDate(app, date1, "monthly");
    let monthlyData2 = await getDataPointByDate(app, date2, "monthly");
    let monthlyData3 = await getDataPointByDate(app, date3, "monthly");
    console.log("monthly:", monthlyData1, monthlyData2, monthlyData3);
    console.log("all:", monthlyData1 + monthlyData2 + monthlyData3);
})();
*/