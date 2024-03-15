/**
 * Alert document object
 * @typedef  {Object}        Alert
 * @property {ObjectId}      _id               - document id
 * @property {string}        alertName         - identifier
 * @property {string}        alertDataType     - module: view|crash|survey...
 * @property {string}        alertDataSubType  - metric: e.g. "Number of page views"
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
 */

/**
 * Paired app&alert and the metrics
 * @typedef  {Object} MatchedResult
 * @property {App}    app               - matched app object
 * @property {Alert}  alert             - matched alert object
 * @property {Date}   date              - alert trigger date
 * @property {number} metricValue       - metric value that matched the alert condition
 * @property {number} metricValueBefore - value that compared with metricValue
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
    INCREASED_BY: "increased by at least",
    DECREASED_BY: "decreased by at least",
    MORE_THAN: "more than",
};

const TRIGGERED_BY_EVENT = {
    survey: "New survey response",
    nps: "New NPS response",
    rating: "New rating response",
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
 * @returns {object}          - { years, months, days, hours }
 */
function getDateComponents(date, timezone) {
    const dateComponents = moment(date).tz(timezone).toObject();
    dateComponents.months += 1; // months are zero indexed
    dateComponents.days = dateComponents.date;
    delete dateComponents.date;
    return dateComponents;
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
        .findAndModify(query, {}, update, { new: true, upsert: true });
}

/**
 * Determines who's going to be notified for the given alert.
 * @param   {Alert}                  alert - the date alert triggered on
 * @returns {Promise<Array<string>>}       - a promise resolves to an array of e-mails
 */
async function determineAudience(alert) {
    if (alert.alertBy === "email") {
        return alert.alertValues;
    }
    // TODO: User Group stuff
}

/**
 * Creates an e-mail body for the given alert.
 * @param   {MatchedResult}   result - alert&app pair to compile mail with
 * @returns {Promise<string>}        - compiled e-mail string
 */
async function compileEmail(result) {
    const { alert, app, metricValue, metricValueBefore } = result;
    const host = await new Promise((res, rej) => mail.lookup((err, _host) => err ? rej(err) : res(_host)));
    const metrics = [];
    if (metricValue) {
        metrics.push({ key: "Value now", value: metricValue });
    }
    if (metricValueBefore) {
        metrics.push({ key: "Value before", value: metricValueBefore });
    }
    return EMAIL_TEMPLATE({
        title: `Countly Alert`,
        subTitle: `Countly Alert: ` + alert.alertName,
        host,
        compareDescribe: alert.compareDescribe,
        apps: [{
            id: app._id.toString(),
            name: app.name,
            data: metrics
        }]
    });
}

/**
 * Starts triggering alerts matched with their conditions.
 * @param {MatchedResult} result      - alert and app pair
 * @param {object}        log         - log object for the module e.g.: "alerts:view"
 */
async function trigger(result, log) {
    const {alert, app, date} = result;
    // increase counter just by date
    await increaseAlertCounter(app, date);

    const audienceEmails = await determineAudience(alert);
    const emailBody = await compileEmail(result);
    const subject = `${alert.alertDataSubType} for ${app.name} has changed`;

    console.log(subject, emailBody);
    for (let i = 0; i < audienceEmails.length; i++) {
        const email = audienceEmails[i];
        try {
            await new Promise(
                (res, rej) => mail.sendMessage(
                    email,
                    subject,
                    emailBody,
                    err => err ? rej(err) : res()
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