/**
 * @typedef {import('../parts/common-lib.js').App} App
 */

const log = require('../../../../api/utils/log.js')('alert:survey');
const moment = require('moment-timezone');
const common = require('../../../../api/utils/common.js');
const commonLib = require("../parts/common-lib.js");
const { ObjectId } = require('mongodb');

module.exports.isValidEvent = isValidEvent;
/**
 * Checks if given event is a survey completion event.
 * @param   {object}  event single event object sent to /i endpoint
 * @returns {boolean}       true if the event contains proper survey completion data
 */
function isValidEvent(event) {
    return event?.key === "[CLY]_survey"
        && !event?.segmentation?.closed
        && event?.segmentation?.widget_id;
}

module.exports.triggerByEvent = async function(event) {
    const feedbackWidgetId = event?.segmentation?.widget_id;
    if (!feedbackWidgetId) {
        return;
    }

    const alert = await common.db.collection("alerts").findOne({
        alertDataSubType2: feedbackWidgetId,
        alertDataType: "survey",
        alertDataSubType: commonLib.TRIGGERED_BY_EVENT.survey,
    });
    if (!alert) {
        return;
    }

    const app = await common.db.collection("apps").findOne({
        _id: ObjectId(alert.selectedApps[0])
    });
    if (!app) {
        return;
    }

    return commonLib.trigger({ alert, app, date: new Date }, log);
};


module.exports.check = async function({ alertConfigs: alert, done, scheduledTo: date }) {
    const app = await common.db.collection("apps").findOne({ _id: ObjectId(alert.selectedApps[0]) });
    if (!app) {
        log.e(`App ${alert.selectedApps[0]} couldn't be found`);
        return done();
    }

    let { period, alertDataSubType2, compareType, compareValue } = alert;
    compareValue = Number(compareValue);

    const metricValue = await getResponsesByDate(app, alertDataSubType2, date, period) || 0;

    if (compareType === commonLib.COMPARE_TYPE_ENUM.MORE_THAN) {
        if (metricValue > compareValue) {
            await commonLib.trigger({ alert, app, metricValue, date });
        }
    }
    else {
        const before = moment(date).subtract(1, commonLib.PERIOD_TO_DATE_COMPONENT_MAP[period]).toDate();
        const metricValueBefore = await getResponsesByDate(app, alertDataSubType2, before, period);
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
 * Returns the view metric value by view, date and metric type.
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
    else {
        let scope = record.d?.[dateComponents.days];
        if (period === "hourly") {
            scope = scope?.[dateComponents.hours];
        }
        return sumOfAllResponses(scope, survey);
    }
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

/*
(async function() {
    await new Promise(res => setTimeout(res, 2000));
    const app = { _id: ObjectId("65c1f875a12e98a328d5eb9e"), timezone: "Europe/Istanbul" };
    const widgetId = "65c38401b46a4d172d7c61a5";
    const date = new Date("2024-02-07T12:00:00.000Z");
    let data = await getResponsesByDate(app, widgetId, date, "monthly");
    console.log("monthly:", data);

    data = await getResponsesByDate(app, widgetId, date, "daily");
    console.log("daily:", data);

    data = await getResponsesByDate(app, widgetId, date, "hourly");
    console.log("hourly:", data);
})();
*/