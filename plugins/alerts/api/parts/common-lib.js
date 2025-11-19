/** @typedef {import("mongodb").ObjectId} ObjectId */

/**
 * Alert document object
 * @typedef  {Object}        Alert
 * @property {ObjectId}      _id               - document id
 * @property {string}        alertName         - identifier
 * @property {string}        alertDataType     - module: views|crashes|survey...
 * @property {string}        alertDataSubType  - metric: e.g. "# of page views"
 * @property {string}        alertDataSubType2 - view id/feedback widget id/event name/...
 * @property {string}        compareType       - comparison operator e.g. "increased by at least"
 * @property {string}        compareValue      - value to compare to
 * @property {string}        filterKey         - for filtering events
 * @property {string}        filterValue       - for filtering events
 * @property {Array<string>} selectedApps      - apps to enable this alert for
 * @property {string}        period            - when to run alert check: hourly|daily|monthly
 * @property {string}        alertBy           - e.g. email
 * @property {boolean}       enabled           - true|false
 * @property {string}        compareDescribe   - text to show on lists for this alert
 * @property {Array<string>} alertValues       - audience e.g. for alertBy="email", list of e-mails
 * @property {Array<string>} allGroups         - 
 * @property {string}        createdBy         - creation time
 */

/**
 * App document object (only the fields used in alert modules)
 * @typedef  {Object}   App
 * @property {string}   name     - name identifier
 * @property {ObjectId} _id      - document id
 * @property {string}   timezone - timezone string (e.g. Europe/Istanbul)
 * @property {any}      plugins
 */

/**
 * Paired app&alert and the metrics
 * @typedef  {Object}  MatchedResult
 * @property {App}     app               - matched app object
 * @property {Alert}   alert             - matched alert object
 * @property {Date}    date              - alert trigger date
 * @property {number=} metricValue       - metric value that matched the alert condition
 * @property {number=} metricValueBefore - value that compared with metricValue
 * @property {any=}    extra             - extra parameters to pass to e-mail builder
 */

/**
 * Individual components of a date. modified version of the moment.prototype.toObject()
 * @typedef  {Object} DateComponents
 * @property {number} years
 * @property {number} months
 * @property {number} days
 * @property {number} hours
 */

const common = require('../../../../api/utils/common.js');
const mail = require("../../../../api/parts/mgmt/mail");
const moment = require('moment-timezone');
const path = require("path");
const fs = require("fs");
const ejs = require("ejs");
const EMAIL_TEMPLATE = ejs.compile(
    fs.readFileSync(
        path.resolve(__dirname, '../../frontend/public/templates/email.html'),
        'utf8'
    )
);

const PERIOD_TO_DATE_COMPONENT_MAP = {
    "monthly": "months",
    "daily": "days",
    "hourly": "hours",
};

const COMPARE_TYPE_ENUM = {
    INCREASED_BY: "increased",
    DECREASED_BY: "decreased",
    MORE_THAN: "more",
};

const TRIGGERED_BY_EVENT = {
    survey: "new survey response",
    nps: "new NPS response",
    rating: "new rating response",
    crashes: "new crash/error",
};

module.exports = {
    PERIOD_TO_DATE_COMPONENT_MAP,
    COMPARE_TYPE_ENUM,
    TRIGGERED_BY_EVENT,

    getDateComponents,
    determineAudience,
    compileEmail,
    trigger,
};

/**
 * Returns a date's components based on timezone.
 * @param   {Date}   date     - date to get its components
 * @param   {string} timezone - timezone string
 * @returns {DateComponents}  - { years, months, days, hours }
 */
function getDateComponents(date, timezone) {
    const { years, months, date: days, hours } = moment(date).tz(timezone).toObject();
    return { years, months: months + 1, hours, days };
}

/**
 * Increases the counter records inside alerts_data collection
 * @param   {App}                    app         - app document
 * @param   {Date}                   triggerDate - the date alert triggered on
 * @param   {string=}                email       - optional audience email
 * @returns {Promise<Array<object>>}             - a promise resolves to alerts_data documents
 */
function increaseAlertCounter(app, triggerDate, email) {
    let { years, months, days } = getDateComponents(triggerDate, app.timezone);
    const keyName = `${years}.${months}.${days}`;
    const update = { $inc: { t: 1, [keyName]: 1 } };
    let query = { _id: 'meta'};
    if (email) {
        query = { _id: 'email:' + email };
    }

    return common.db.collection("alerts_data")
        .findOneAndUpdate(query, update, { returnDocument: 'after', upsert: true });
}

/**
 * Determines who's going to be notified for the given alert.
 * @param   {Alert}                  alert - the date alert triggered on
 * @returns {Promise<Array<string>>}       - a promise resolves to an array of e-mails
 */
async function determineAudience(alert) {
    if (alert.alertBy === "email") {
        if (Array.isArray(alert.alertValues) && alert.alertValues.length > 0) {
            return alert.alertValues;
        }
        return getUserEmailsBasedOnGroups(alert.allGroups);
    }
    return [];
}
/**
 * Retrieves user emails based on group IDs.
 * @param {Array}            groupIds - The array of group IDs.
 * @returns {Promise<Array>}          - A promise that resolves to an array of user emails.
 */
function getUserEmailsBasedOnGroups(groupIds) {
    const memberEmails = [];
    // eslint-disable-next-line require-jsdoc
    const fetchMembers = (groupId) => {
        const model = { "_id": groupId };
        const query = model.inverse ? { group_id: { $ne: model._id } } : { group_id: model._id };
        return new Promise((resolve, reject) => {
            common.db.collection('members').find(query, { password: 0 }).toArray((err, members) => {
                if (err) {
                    reject(err);
                }
                else {
                    for (let idx = 0; idx < members.length; idx++) {
                        members[idx].last_login = members[idx].last_login || 0;
                    }
                    members.forEach((member) => {
                        memberEmails.push(member.email);
                    });
                    resolve(true);
                }
            });
        });
    };
    const promises = groupIds.map(fetchMembers);
    return Promise.all(promises).then(() => {
        return memberEmails;
    });
}
/**
 * Creates an e-mail body for the given alert.
 * @param   {MatchedResult}   result - alert&app pair to compile mail with
 * @returns {Promise<string>}        - compiled e-mail string
 */
async function compileEmail(result) {
    const { alert, app, metricValue, metricValueBefore, extra } = result;
    const host = await new Promise((res, rej) => mail.lookup((err, _host) => err ? rej(err) : res(_host)));
    const metrics = [];
    if (metricValue) {
        metrics.push({ key: "Value now", value: formatMetricValue(metricValue) });
    }
    if (metricValueBefore) {
        metrics.push({ key: "Value before", value: formatMetricValue(metricValueBefore) });
    }
    return EMAIL_TEMPLATE({
        title: `Countly Alert`,
        alertName: alert.alertName,
        alertDataType: alert.alertDataType,
        alertDataSubType: alert.alertDataSubType,
        subTitle: `Uh oh! It seems there's been some activity related to ` + alert.alertDataSubType + ` in the `,
        host,
        compareDescribe: alert.compareDescribe,
        apps: [{
            id: app._id.toString(),
            name: app.name,
            data: metrics
        }],
        extra,
    });
}
/**
 * Formats the metric value to ensure it maintains its type.
 * If the value is a number, it rounds to 2 decimal places if necessary.
 * Otherwise, it returns the value as is.
 * 
 * @param {number|string} value - The value to be formatted.
 * @returns {number|string} The formatted value, maintaining the original type.
 */
function formatMetricValue(value) {
    if (typeof value === 'number' && value === parseFloat(value.toFixed(2))) {
        return value;
    }
    else if (typeof value === 'number') {
        return parseFloat(value.toFixed(2));
    }
    else {
        return value;
    }
}

/**
 * Starts triggering alerts matched with their conditions.
 * @param {MatchedResult} result      - alert and app pair
 * @param {object}        log         - log object for the module e.g.: "alerts:views"
 */
async function trigger(result, log) {
    const {alert, app, date} = result;
    // increase counter just by date
    await increaseAlertCounter(app, date);
    if (alert.alertBy === "hook") {
        return common.plugins.dispatch("/alerts/trigger");
    }

    const audienceEmails = await determineAudience(alert);
    const emailBody = await compileEmail(result);
    const subject = `${alert.alertDataSubType} for ${app.name} has changed`;

    for (let i = 0; i < audienceEmails.length; i++) {
        const email = audienceEmails[i];
        try {
            await new Promise(
                (res, rej) => mail.sendMessage(
                    email,
                    subject,
                    emailBody,
                    err => err ? rej(err) : res(true)
                )
            );
            // increase counter by date and email
            await increaseAlertCounter(app, date, email);
        }
        catch (err) {
            log.e("Alert e-mail couldn't be send to " + email, err);
        }
    }
}