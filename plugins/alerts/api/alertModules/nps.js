/**
 * @typedef {import('../parts/common-lib.js').App} App
 */

const log = require('../../../../api/utils/log.js')('alert:nps');
const moment = require('moment-timezone');
const common = require('../../../../api/utils/common.js');
const commonLib = require("../parts/common-lib.js");
const { ObjectId } = require('mongodb');

module.exports.triggerByEvent = triggerByEvent;
/**
 * Checks if given payload contains any NPS completion event and
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

    const validNPSEvents = allEvents.filter(
        event => event?.key === "[CLY]_nps"
            && !event?.segmentation?.closed
            && event?.segmentation?.widget_id
            && typeof event?.segmentation?.rating !== 'undefined'
    );

    for (let event of validNPSEvents) {
        const alert = await common.db.collection("alerts").findOne({
            selectedApps: app._id.toString(),
            alertDataSubType2: event.segmentation.widget_id,
            alertDataType: "nps",
            alertDataSubType: commonLib.TRIGGERED_BY_EVENT.nps,
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

    const metricValue = await getResponsesByDate(app, alertDataSubType2, date, period, filterValue) || 0;

    if (compareType === commonLib.COMPARE_TYPE_ENUM.MORE_THAN) {
        if (metricValue > compareValue) {
            await commonLib.trigger({ alert, app, metricValue, date });
        }
    }
    else {
        const before = moment(date).subtract(1, commonLib.PERIOD_TO_DATE_COMPONENT_MAP[period]).toDate();
        const metricValueBefore = await getResponsesByDate(app, alertDataSubType2, before, period, filterValue);
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
 * Returns the number responses for an nps widget by date.
 * @param   {App}                       app    - app document
 * @param   {string}                    nps    - _id of the from feedback_widgets
 * @param   {Date}                      date   - date of the value you're looking for
 * @param   {string}                    period - hourly|daily|monthly
 * @param   {string}                    score  - detractor|passive|promoter
 * @returns {Promise<number|undefined>}        - a promise resolves to metric value or undefined
 */
async function getResponsesByDate(app, nps, date, period, score) {
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
            const responses = sumOfAllResponses(record.d[day], nps, score);
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
    return sumOfAllResponses(scope, nps, score);
}

/**
 * Calculates the sum of all valid responses inside a nps{app_id} date record.
 * @param   {object}           scope - object scope: Daily or hourly object from db
 * @param   {string}           nps   - feedback_widgets _id
 * @param   {string}           score - detractor|passive|promoter
 * @returns {number|undefined}       - number of valid responses
 */
function sumOfAllResponses(scope, nps, score) {
    if (!scope) {
        return;
    }

    const recordKeyReg = new RegExp("\\*\\*\\d{1,2}\\*\\*" + nps + "\\*\\*(" + score + ")$");
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
    const app = { _id: ObjectId("65c1f875a12e98a328d5eb9e"), timezone: "Europe/Istanbul" };
    const nps = "65c383fcb46a4d172d7c5911";
    const date = new Date("2024-02-07T12:00:00.000Z");

    let data = await getResponsesByDate(app, nps, date, "monthly");
    console.log("monthly:", data);

    data = await getResponsesByDate(app, nps, date, "daily");
    console.log("daily:", data);

    data = await getResponsesByDate(app, nps, date, "hourly");
    console.log("hourly:", data);
})();
*/