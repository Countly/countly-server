/**
 * @typedef {import('../parts/common-lib.js').App} App
 */

const crypto = require('crypto');
const log = require('../../../../api/utils/log.js')('alert:rating');
const moment = require('moment-timezone');
const common = require('../../../../api/utils/common.js');
const commonLib = require("../parts/common-lib.js");
const { ObjectId } = require('mongodb');
const { getEventMetricByDate } = require("./events.js");

module.exports.triggerByEvent = triggerByEvent;
/**
 * Checks if given payload contains any proper rating event and
 * triggers the alerts.
 * @param {object} payload querystring from the request
 */
async function triggerByEvent(payload) {
    const allEvents = payload?.events;
    const appKey = payload?.app_key;
    if (!Array.isArray(allEvents) || !appKey) {
        return;
    }

    const app = await common.db.collection("apps").findOne({ key: appKey });
    if (!app) {
        return;
    }

    const validRatingEvents = allEvents.filter(
        event => event?.key === "[CLY]_star_rating"
            && event?.segmentation?.widget_id
            && typeof event?.segmentation?.rating !== 'undefined'
    );

    for (let event of validRatingEvents) {
        const alert = await common.db.collection("alerts").findOne({
            selectedApps: app._id.toString(),
            alertDataSubType2: event.segmentation.widget_id,
            alertDataType: "rating",
            alertDataSubType: commonLib.TRIGGERED_BY_EVENT.rating,
        });
        if (!alert) {
            continue;
        }

        await commonLib.trigger({ alert, app, date: new Date }, log);
    }
}

module.exports.check = async function({ alertConfigs: alert, done, scheduledTo: date }) {
    const app = await common.db.collection("apps").findOne({ _id: ObjectId(alert.selectedApps[0]) });
    if (!app) {
        log.e(`App ${alert.selectedApps[0]} couldn't be found`);
        return done();
    }

    let { period, alertDataSubType2, compareType, compareValue, filterValue } = alert;
    compareValue = Number(compareValue);
    let ratingsFilter;
    if (filterValue) {
        filterValue = filterValue
            .split(",")
            .map(value => parseInt(value, 10))
            .filter(value => value >= 1 && value <= 5);
        if (filterValue.length) {
            ratingsFilter = filterValue;
        }
    }

    const metricValue = await getRatingResponsesByDate(app, alertDataSubType2, date, period, ratingsFilter) || 0;

    if (compareType === commonLib.COMPARE_TYPE_ENUM.MORE_THAN) {
        if (metricValue > compareValue) {
            await commonLib.trigger({ alert, app, metricValue, date });
        }
    }
    else {
        const before = moment(date).subtract(1, commonLib.PERIOD_TO_DATE_COMPONENT_MAP[period]).toDate();
        const metricValueBefore = await getRatingResponsesByDate(app, alertDataSubType2, before, period, ratingsFilter);
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
 * Returns the total number of responses by the given date.
 * Can be filtered by rating scores.
 * @param   {App}                       app      - app document
 * @param   {string}                    widgetId - _id of the from feedback_widgets
 * @param   {Date}                      date     - date of the value you're looking for
 * @param   {string}                    period   - hourly|daily|monthly
 * @param   {number[]|undefined}        ratings  - array of scores between 1-5
 * @returns {Promise<number|undefined>}          - a promise resolves to metric value or undefined
 */
async function getRatingResponsesByDate(app, widgetId, date, period, ratings) {
    const { years } = commonLib.getDateComponents(date, app.timezone);
    const eventName = "[CLY]_star_rating";
    const collectionName = "events" + crypto
        .createHash('sha1')
        .update(eventName + app._id.toString())
        .digest('hex');

    // find all segment values:
    const records = await common.db.collection(collectionName)
        .find({ m: String(years) + ":0" })
        .toArray();
    const segmentValueSet = new Set;
    for (const record of records) {
        const segmentObject = record?.meta_v2?.platform_version_rate;
        if (segmentObject) {
            Object.keys(segmentObject).forEach(value => segmentValueSet.add(value));
        }
    }
    let regString = "\\*\\*" + widgetId + "\\*\\*$";
    if (Array.isArray(ratings)) {
        regString = "\\*\\*[" + ratings.join("") + "]" + regString;
    }
    const segmentValueReg = new RegExp(regString);
    const segmentValues = [...segmentValueSet].filter(value => segmentValueReg.test(value));
    const results = await Promise.all(
        segmentValues.map(async segmentValue => {
            const value = await getEventMetricByDate(app, eventName, "c", date, period, {
                platform_version_rate: segmentValue
            });
            return value;
        })
    );
    return results.reduce((prev, curr) => {
        if (typeof curr === "number") {
            if (!prev) {
                prev = 0;
            }
            return prev + curr;
        }
        return prev;
    }, undefined);
}

/*
(async function() {
    await new Promise(res => setTimeout(res, 2000));
    const app = { _id: ObjectId("65c1f875a12e98a328d5eb9e"), timezone: "Europe/Istanbul" };
    const date = new Date("2024-02-07T12:00:00.000Z");
    const widgetId = "65c383fbb46a4d172d7c58e1";
    let monthlyData = await getRatingResponsesByDate(app, widgetId, date, "monthly", [1, 2, 3, 4, 5]);
    let dailyData = await getRatingResponsesByDate(app, widgetId, date, "daily");
    console.log(monthlyData, dailyData);
})();
*/