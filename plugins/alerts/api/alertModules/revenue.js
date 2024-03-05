/**
 * @typedef {import('../parts/common-lib.js').Alert} Alert
 * @typedef {import('../parts/common-lib.js').App} App
 * @typedef {import('../parts/common-lib.js').MatchedResult} MatchedResult
 */

const crypto = require('crypto');
const log = require('../../../../api/utils/log.js')('alert:view');
const moment = require('moment-timezone');
const common = require('../../../../api/utils/common.js');
const commonLib = require("../parts/common-lib.js");
const { ObjectId } = require('mongodb');

const PURCHASE_DATA_KEY = "s";

/**
 * Alert triggering logic
 * @param {Alert}    alert - alert document
 * @param {function} done  - callback function
 * @param {Date}     date  - scheduled date for the alert (job.next)
 */
module.exports.check = async({ alertConfigs: alert, done, scheduledTo: date }) => {
    try {
        const app = await common.db.collection("apps").findOne({ _id: ObjectId(alert.selectedApps[0]) });
        if (!app) {
            log.e(`App ${alert.selectedApps[0]} couldn't be found`);
            return done();
        }

        let { period, compareType, compareValue } = alert;
        compareValue = Number(compareValue);

        const metricValue = await getRevenueByDate(app, date, period);
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
            const metricValueBefore = await getRevenueByDate(app, before, period);
            if (!metricValueBefore) {
                return done();
            }

            const change = (metricValue / metricValueBefore - 1) * 100;
            const shouldTrigger = compareType === "increased by at least"
                ? change >= compareValue
                : change <= compareValue;

            if (shouldTrigger) {
                await commonLib.trigger({ alert, app, date, metricValue, metricValueBefore });
            }
        }
    }
    catch (err) {
        log.e("Error while running check for view alert", err);
    }
    done();
};


/**
 * Returns the view metric value by view, date and metric type.
 * @param   {object}                    app    - app document
 * @param   {Date}                      date   - date of the value you're looking for
 * @param   {string}                    period - hourly|daily|monthly
 * @returns {Promise<number|undefined>}        - a promise resolves to metric value or undefined
 */
async function getRevenueByDate(app, date, period) {
    const dateComponents = commonLib.getDateComponents(date, app.timezone);
    const monthFilter = String(dateComponents.years) + ":" + String(dateComponents.months);
    const events = app?.plugins?.revenue?.iap_events;
    if (!Array.isArray(events)) {
        return;
    }

    let number;
    for (const eventName of events) {
        const collectionName = "events" + crypto
            .createHash('sha1')
            .update(eventName + app._id.toString())
            .digest('hex');

        const records = await common.db.collection(collectionName)
            .find({ m: monthFilter, s: "no-segment" }).toArray();

        for (let record of records) {
            let value;
            if (period === "hourly") {
                value = record?.d?.[dateComponents.days]?.[dateComponents.hours]?.[PURCHASE_DATA_KEY];
            }
            else if (period === "daily") {
                value = record?.d?.[dateComponents.days]?.[PURCHASE_DATA_KEY];
            }
            else if (period === "monthly") {
                for (let i = 1; i <= 31; i++) {
                    const dailyValue = record?.d?.[i]?.[PURCHASE_DATA_KEY];
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
    }
    return number;
}
/*
(async function() {
    await new Promise(res => setTimeout(res, 2000));

    const hourly = await getRevenueByDate(
        {
            _id: "65c1f875a12e98a328d5eb9e",
            timezone: "Europe/Istanbul",
            plugins: {
                revenue: {
                    iap_events: [ 'Checkout' ]
                }
            }
        },
        new Date("2024-01-02T12:47:19.247Z"),
        "hourly"
    );
    console.assert(hourly === 22783, "hourly revenue doesn't match");

    const daily = await getRevenueByDate(
        {
            _id: "65c1f875a12e98a328d5eb9e",
            timezone: "Europe/Istanbul",
            plugins: {
                revenue: {
                    iap_events: [ 'Checkout' ]
                }
            }
        },
        new Date("2024-01-03T13:47:19.247Z"),
        "daily"
    );
    console.assert(daily === 224859, "daily revenue doesn't match");

    const monthly = await getRevenueByDate(
        {
            _id: "65c1f875a12e98a328d5eb9e",
            timezone: "Europe/Istanbul",
            plugins: {
                revenue: {
                    iap_events: [ 'Checkout' ]
                }
            }
        },
        new Date("2024-02-13T13:47:19.247Z"),
        "monthly"
    );
    console.assert(monthly === 62882040, "monthly revenue doesn't match");
})();
*/