/**
 * @typedef {import('../parts/common-lib.js').Alert} Alert
 * @typedef {import('../parts/common-lib.js').App} App
 * @typedef {import('../parts/common-lib.js').MatchedResult} MatchedResult
 */

const crypto = require('crypto');
const log = require('../../../../api/utils/log.js')('alert:survey');
const moment = require('moment-timezone');
const common = require('../../../../api/utils/common.js');
const commonLib = require("../parts/common-lib.js");
const { ObjectId } = require('mongodb');
const { getEventMetricByDate } = require("./event.js");

/*
const bluebird = require("bluebird");
const log = require('../../../../api/utils/log.js')('alert:metric');

const RatingAlert = {

    alert(alertConfigs, result, callback) {

        return bluebird.coroutine(function *() {
            try {
                log.i('trigger alert:', alertConfigs);
                utils.addAlertCount();
                if (alertConfigs.alertBy === 'email') {
                    const emails = yield utils.fillEmailList(alertConfigs);
                    let html = '';
                    const host = yield utils.getHost();

                    let appsListTitle = 'several apps';
                    if (result.length <= 3) {
                        const appName = [];
                        result.map((data) => {
                            appName.push(data.app.name);
                        });
                        appsListTitle = appName.join(', ');
                    }

                    let title = '';
                    let keyName = alertConfigs.alertDataSubType;
                    title = `${keyName} count for ${appsListTitle} has changed compared to yesterday`;
                    const subject = title;

                    html = yield utils.getEmailTemplate({
                        title: `Countly Alert`,
                        subTitle: `Countly Alert: ` + alertConfigs.alertName,
                        host,
                        compareDescribe: alertConfigs.compareDescribe,
                        apps: result.map((data) => {
                            const item = {
                                id: data.app._id,
                                name: data.app.name,
                                data: [{
                                    key: 'Today\'s Value',
                                    value: data.todayValue
                                }]
                            };
                            if (data.lastDateValue !== null && data.lastDateValue !== undefined) {
                                item.data.push({key: 'Yesterday\'s Value', value: data.lastDateValue});
                            }
                            return item;
                        })
                    });
                    emails.forEach((to) => {
                        utils.addAlertCount(to);
                        log.i('will send email=>>>>>>>>>>');
                        log.i('to:', to);
                        log.d('subject:', subject);
                        log.d('message:', html);
                        utils.sendEmail(to, subject, html);
                    });
                    callback && callback();
                }
            }
            catch (e) {
                log.e(e, e.stack);
            }
        })();
    },


    check({alertConfigs, done}) {
        var self = this;
        return bluebird.coroutine(function *() {
            try {
                log.i("checking alert:", alertConfigs);
                const alertList = [];
                for (let i = 0; i < alertConfigs.selectedApps.length; i++) {
                    const rightHour = yield utils.checkAppLocalTimeHour(alertConfigs.selectedApps[i], 23);
                    if (!rightHour) {
                        return done();
                    }

                    log.d("APP time is 23:59, start job");

                    if (alertConfigs.alertDataSubType === 'Number of ratings') {
                        const {lastDateValue, todayValue} = yield getRatingData(alertConfigs.selectedApps[i], alertConfigs.alertDataSubType2);
                        const result = utils.compareValues(alertConfigs, {todayValue, lastDateValue}, null, i);
                        log.d(`For app Rating ${result} ${lastDateValue},${todayValue},${alertConfigs.selectedApps[i]}`, result);
                        if (result.matched) {
                            const app = yield utils.getAppInfo(result.currentApp);
                            result.app = app;
                            alertList.push(result);
                        }
                    }
                }
                if (alertList.length > 0) {
                    self.alert(alertConfigs, alertList);
                }
                done();
            }
            catch (e) {
                log.e(e, e.stack);
            }
        })();
*/
module.exports.triggerByEvent = async function(event) {
    const feedbackWidgetId = event?.segmentation?.widget_id;
    if (!feedbackWidgetId) {
        return;
    }

    const alert = await common.db.collection("alerts").findOne({
        alertDataSubType2: feedbackWidgetId,
        alertDataType: "rating",
        alertDataSubType: "new rating response",
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

    let { period, alertDataSubType2, compareType, compareValue, filterValue } = alert;
    compareValue = Number(compareValue);
    let ratingsFilter;
    if (filterValue) {
        filterValue = filterValue
            .split(",")
            .map(value => parseInt(value))
            .filter(value => value >= 1 && value <= 5);
        if (filterValue.length) {
            ratingsFilter = filterValue;
        }
    }

    const metricValue = await getRatingResponsesByDate(app, alertDataSubType2, date, period, ratingsFilter);
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
        const metricValueBefore = await getRatingResponsesByDate(app, alertDataSubType2, before, period, ratingsFilter);
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
 * Returns the total number of responses by the given date.
 * Can be filtered by ratings.
 * @param   {object}                    app      - app document
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
    let monthlyData = await getRatingResponsesByDate(app, "65c383fbb46a4d172d7c58e1", date, "monthly", [1, 2, 3, 4, 5]);
    let dailyData = await getRatingResponsesByDate(app, "65c383fbb46a4d172d7c58e1", date, "daily");
    console.log(monthlyData, dailyData);
})();
*/