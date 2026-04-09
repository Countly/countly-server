/**
 * @typedef {import('../parts/common-lib.js').App} App
 */

const crypto = require('crypto');
const log = require('../../../../api/utils/log.js')('alert:rating');
const moment = require('moment-timezone');
const common = require('../../../../api/utils/common.js');
const commonLib = require("../parts/common-lib.js");
const { getEventMetricByDate } = require("./events.js");

module.exports.triggerByEvent = triggerByEvent;
/**
 * Checks if given payload contains any proper rating event and
 * triggers the alerts.
 * @param {object} payload querystring from the request
 */
async function triggerByEvent(payload) {
    const allEvents = payload?.events;
    const app = payload?.app;

    if (!Array.isArray(allEvents) || !app) {
        return;
    }

    const validRatingEvents = allEvents.filter(
        event => event?.key === "[CLY]_star_rating"
            && event?.segmentation?.widget_id
            && typeof event?.segmentation?.rating !== 'undefined'
    );

    for (let event of validRatingEvents) {
        const alerts = await common.readBatcher.getMany("alerts", {
            selectedApps: app._id.toString(),
            alertDataSubType2: event.segmentation.widget_id,
            alertDataType: "rating",
            alertDataSubType: commonLib.TRIGGERED_BY_EVENT.rating,
        });

        if (!alerts || !alerts.length) {
            continue;
        }

        // trigger all alerts
        await Promise.all(alerts.map(alert => commonLib.trigger({
            alert,
            app,
            date: new Date,
        }, log)));
    }
}

module.exports.check = async function({ alert, app, done, scheduledTo: date }) {
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
    log.d(alert._id, "value on", date, "is", metricValue);

    if (compareType === commonLib.COMPARE_TYPE_ENUM.MORE_THAN) {
        if (metricValue > compareValue) {
            log.d(alert._id, "triggered because", metricValue, "is more than", compareValue);
            await commonLib.trigger({ alert, app, metricValue, date }, log);
        }
    }
    else {
        const before = moment(date).subtract(1, commonLib.PERIOD_TO_DATE_COMPONENT_MAP[period]).toDate();
        const metricValueBefore = await getRatingResponsesByDate(app, alertDataSubType2, before, period, ratingsFilter);
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
