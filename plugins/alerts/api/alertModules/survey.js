/**
 * @typedef {import('../parts/common-lib.js').App} App
 */

const log = require('../../../../api/utils/log.js')('alert:survey');
const moment = require('moment-timezone');
const common = require('../../../../api/utils/common.js');
const commonLib = require("../parts/common-lib.js");

module.exports.triggerByEvent = triggerByEvent;
/**
 * Checks if given payload contains any survey completion event and
 * triggers the alerts.
 * @param {object} payload querystring from the request
 */
async function triggerByEvent(payload) {
    const allEvents = payload?.events;
    const app = payload?.app;

    if (!Array.isArray(allEvents) || !app) {
        return;
    }

    const validSurveyEvents = allEvents.filter(
        event => event?.key === "[CLY]_survey"
            && !event?.segmentation?.closed
            && event?.segmentation?.widget_id
    );

    for (let event of validSurveyEvents) {
        const alerts = await common.readBatcher.getMany("alerts", {
            selectedApps: app._id.toString(),
            alertDataSubType2: event.segmentation.widget_id,
            alertDataType: "survey",
            alertDataSubType: commonLib.TRIGGERED_BY_EVENT.survey,
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
    let { period, alertDataSubType2, compareType, compareValue } = alert;
    compareValue = Number(compareValue);

    const metricValue = await getResponsesByDate(app, alertDataSubType2, date, period) || 0;
    log.d(alert._id, "value on", date, "is", metricValue);

    if (compareType === commonLib.COMPARE_TYPE_ENUM.MORE_THAN) {
        if (metricValue > compareValue) {
            log.d(alert._id, "triggered because", metricValue, "is more than", compareValue);
            await commonLib.trigger({ alert, app, metricValue, date }, log);
        }
    }
    else {
        const before = moment(date).subtract(1, commonLib.PERIOD_TO_DATE_COMPONENT_MAP[period]).toDate();
        const metricValueBefore = await getResponsesByDate(app, alertDataSubType2, before, period);
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
 * Returns the number of responses of a survey by date.
 * @param   {App}                       app    - app document
 * @param   {string}                    survey - _id of the from feedback_widgets
 * @param   {Date}                      date   - date of the value you're looking for
 * @param   {string}                    period - hourly|daily|monthly
 * @returns {Promise<number|undefined>}        - a promise resolves to metric value or undefined
 */
async function getResponsesByDate(app, survey, date, period) {
    const dateComponents = commonLib.getDateComponents(date, app.timezone);
    const monthFilter = String(dateComponents.years) + ":" + String(dateComponents.months);
    const collectionName = "survey" + app._id.toString();
    const record = await common.db
        .collection(collectionName)
        .findOne({ _id: survey + "_" + monthFilter, m: monthFilter });

    if (!record?.d) {
        return;
    }

    if (period === "monthly") {
        let numberOfResponses;
        for (let day in record.d) {
            const responses = sumOfAllResponses(record.d[day], survey);
            if (typeof responses !== "number") {
                continue;
            }
            if (typeof numberOfResponses !== "number") {
                numberOfResponses = 0;
            }
            numberOfResponses += responses;
        }
        return numberOfResponses;
    }

    let scope = record.d?.[dateComponents.days];
    if (period === "hourly") {
        scope = scope?.[dateComponents.hours];
    }
    return sumOfAllResponses(scope, survey);
}

/**
 * Calculates the sum of all valid responses inside a survey{app_id} date record.
 * @param   {object}           scope  - object scope: Daily or hourly object from db
 * @param   {string}           survey - feedback_widgets _id
 * @returns {number|undefined}        - number of valid responses
 */
function sumOfAllResponses(scope, survey) {
    if (!scope) {
        return;
    }

    const recordKeyReg = new RegExp("\\*\\*1\\*\\*" + survey + "\\*\\*$");
    let numberOfResponses;

    for (let recordKey in scope) {
        if (typeof scope[recordKey] !== "number") {
            continue;
        }
        if (!recordKeyReg.test(recordKey)) {
            continue;
        }
        if (typeof numberOfResponses !== "number") {
            numberOfResponses = 0;
        }
        numberOfResponses += scope[recordKey];
    }

    return numberOfResponses;
}
