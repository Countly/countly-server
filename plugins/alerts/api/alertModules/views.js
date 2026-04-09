/**
 * @typedef {import('../parts/common-lib.js').Alert} Alert
 * @typedef {import('../parts/common-lib.js').App} App
 */

const crypto = require('crypto');
const log = require('../../../../api/utils/log.js')('alert:views');
const moment = require('moment-timezone');
const common = require('../../../../api/utils/common.js');
const commonLib = require("../parts/common-lib.js");
const { ObjectId } = require('mongodb');

const METRIC_TO_PROPERTY_MAP = {
    "bounce rate": "b",
    "# of page views": "t",
};

module.exports.check = async({ alert, app, done, scheduledTo: date }) => {
    let { alertDataSubType, alertDataSubType2, period, compareType, compareValue } = alert;
    const metricProperty = METRIC_TO_PROPERTY_MAP[alertDataSubType];
    compareValue = Number(compareValue);

    if (!metricProperty) {
        log.e(`Metric "${alert.alertDataSubType}" couldn't be mapped for alert ${alert._id.toString()}`);
        return done();
    }

    const metricValue = await getViewMetricByDate(app, metricProperty, alertDataSubType2, date, period) || 0;
    log.d(alert._id, "value on", date, "is", metricValue);

    if (compareType === commonLib.COMPARE_TYPE_ENUM.MORE_THAN) {
        if (metricValue > compareValue) {
            log.d(alert._id, "triggered because", metricValue, "is more than", compareValue);
            await commonLib.trigger({ alert, app, metricValue, date }, log);
        }
    }
    else {
        const before = moment(date).subtract(1, commonLib.PERIOD_TO_DATE_COMPONENT_MAP[period]).toDate();
        const metricValueBefore = await getViewMetricByDate(app, metricProperty, alertDataSubType2, before, period);
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
 * Returns the view metric value by view id, date and metric type.
 * @param   {App}                       app    - app document
 * @param   {string}                    metric - "t" or "b" (from METRIC_TO_PROPERTY_MAP)
 * @param   {string}                    view   - _id of the view from app_viewsmeta...
 * @param   {Date}                      date   - date of the value you're looking for
 * @param   {string}                    period - hourly|daily|monthly
 * @returns {Promise<number|undefined>}        - a promise resolves to metric value or undefined
 */
async function getViewMetricByDate(app, metric, view, date, period) {
    const dateComponents = commonLib.getDateComponents(date, app.timezone);
    const compName = commonLib.PERIOD_TO_DATE_COMPONENT_MAP[period];
    const dateKey = dateComponents[compName];
    const monthFilter = String(dateComponents.years) + ":"
        + String(period === "monthly" ? 0 : dateComponents.months);
    const collectionName = "app_viewdata" + crypto
        .createHash('sha1')
        .update(app._id.toString())
        .digest('hex');

    const record = await common.db
        .collection(collectionName)
        .findOne({ m: monthFilter, vw: new ObjectId(view.toString()) });

    // find the value we're interested inside the document.
    // structure in year based documents:
    // { d: { month1: {...}, month2: {...} },  } }
    // structure in month based documents:
    // { d: { day1: { hour1: {...}, hour2: {...} }, day2: {...} } }
    let scope = record?.d;
    if (period === "hourly") {
        scope = scope?.[dateComponents.days];
    }
    return scope?.[dateKey]?.[metric];
}
