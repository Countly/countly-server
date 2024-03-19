/**
 * @typedef {import('../parts/common-lib.js').Alert} Alert
 * @typedef {import('../parts/common-lib.js').App} App
 * @typedef {import('../parts/common-lib.js').MatchedResult} MatchedResult
 */

const log = require('../../../../api/utils/log.js')('alert:nps');
const moment = require('moment-timezone');
const common = require('../../../../api/utils/common.js');
const commonLib = require("../parts/common-lib.js");
const { ObjectId } = require('mongodb');

module.exports.triggerByEvent = async function(event) {
    const feedbackWidgetId = event?.segmentation?.widget_id;
    if (!feedbackWidgetId) {
        return;
    }

    const alert = await common.db.collection("alerts").findOne({
        alertDataSubType2: feedbackWidgetId,
        alertDataType: "nps",
        alertDataSubType: "new NPS response",
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

    const metricValue = await getResponsesByDate(app, alertDataSubType2, date, period);
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
        const metricValueBefore = await getResponsesByDate(app, alertDataSubType2, before, period);
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

    done();
};

/**
 * Returns the view metric value by view, date and metric type.
 * @param   {object}                    app    - app document
 * @param   {string}                    nps    - _id of the from feedback_widgets
 * @param   {Date}                      date   - date of the value you're looking for
 * @param   {string}                    period - hourly|daily|monthly
 * @returns {Promise<number|undefined>}        - a promise resolves to metric value or undefined
 */
async function getResponsesByDate(app, nps, date, period) {
    const dateComponents = commonLib.getDateComponents(date, app.timezone);
    const monthFilter = String(dateComponents.years) + ":" + String(dateComponents.months);
    const collectionName = "nps" + app._id.toString();
    const record = await common.db
        .collection(collectionName)
        .findOne({ _id: nps + "_" + monthFilter, m: monthFilter });

    if (!record?.d) {
        return;
    }

    if (period === "monthly") {
        let numberOfResponses;
        for (let day in record.d) {
            const responses = sumOfAllResponses(record.d[day], nps);
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
        return sumOfAllResponses(scope, nps);
    }
}

/**
 * Calculates the sum of all valid responses inside a nps{app_id} date record.
 * @param   {object}           scope - object scope: Daily or hourly object from db
 * @param   {string}           nps   - feedback_widgets _id
 * @returns {number|undefined}       - number of valid responses
 */
function sumOfAllResponses(scope, nps) {
    if (!scope) {
        return;
    }
    const recordKeyReg = new RegExp("\\*\\*\\d{1,2}\\*\\*" + nps + "\\*\\*(detractor|passive|promoter)$");
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
    let data = await getResponsesByDate(
        { _id: ObjectId("65c1f875a12e98a328d5eb9e"), timezone: "Europe/Istanbul" },
        "65c383fcb46a4d172d7c5911",
        new Date("2024-02-07T12:00:00.000Z"),
        "monthly"
    );

    console.log("monthly:", data);

    data = await getResponsesByDate(
        { _id: ObjectId("65c1f875a12e98a328d5eb9e"), timezone: "Europe/Istanbul" },
        "65c383fcb46a4d172d7c5911",
        new Date("2024-02-07T12:00:00.000Z"),
        "daily"
    );

    console.log("daily:", data);

    data = await getResponsesByDate(
        { _id: ObjectId("65c1f875a12e98a328d5eb9e"), timezone: "Europe/Istanbul" },
        "65c383fcb46a4d172d7c5911",
        new Date("2024-02-07T12:00:00.000Z"),
        "hourly"
    );

    console.log("hourly:", data);
})();
*/