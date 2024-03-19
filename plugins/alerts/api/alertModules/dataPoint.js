'use strict';
const Promise = require("bluebird");
const utils = require('../parts/utils');
const bluebird = require("bluebird");
const moment = require('moment');
const common = require('../../../../api/utils/common.js');
const log = require('../../../../api/utils/log.js')('alert:dataPoint');

const dataPointAlert = {
    /**
	 * function for sending alert email
	 * @param {object} alertConfigs  - alertConfig record from db
	 * @param {object} result - alert data for email template
	 * @param {function} callback - callback after calling email
     * @return {object} promise object
	 */
    alert(alertConfigs, result, callback) {
        return bluebird.coroutine(function *() {
            try {
                log.i('trigger alert:', result);

                utils.addAlertCount();
                if (alertConfigs.alertBy === 'email') {
                    const emails = yield utils.fillEmailList(alertConfigs);
                    let html = '';
                    const host = yield utils.getHost();

                    let appsListTitle = 'several apps';
                    if (result.length <= 3) {
                        const appName = [];
                        result.map((data)=>{
                            appName.push(data.app.name);
                        });
                        appsListTitle = appName.join(', ');
                    }
                    let title = '';

                    if (alertConfigs.alertDataSubType === 'Number of daily DP') {
                        title = `Number of daily data points for ${appsListTitle} has changed compared to yesterday`;
                    }
                    if (alertConfigs.alertDataSubType === 'Hourly data points') {
                        title = `Number of hourly data points for ${appsListTitle} has reach threshold`;
                    }
                    if (alertConfigs.alertDataSubType === 'Monthly data points') {
                        title = `Number of monthly data points for ${appsListTitle} has reach threshold`;
                    }

                    const subject = title;

                    html = yield utils.getEmailTemplate({
                        title: `Countly Alert`,
                        subTitle: `Countly Alert: ` + alertConfigs.alertName,
                        host,
                        compareDescribe: alertConfigs.compareDescribe,
                        apps: result.map((data)=>{
                            const item = {
                                id: data.app._id,
                                name: data.app.name,
                                data: []
                            };
                            if (data.todayValue !== null && data.todayValue !== undefined) {
                                item.data.push({key: 'Today\'s Value', value: data.todayValue});
                            }
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


    /**
	 * function for checking alert
	 * @param {object} alertConfigs  - alertConfig record from db
	 * @param {function} done - callback after checking
     * @return {object} promise object
	 */
    check({ alertConfigs, done }) {
        const self = this;

        return bluebird.coroutine(function* () {
            try {
                if (!alertConfigs.enabled) {
                    return;
                }
                log.i("checking alert:", alertConfigs);
                const alertList = [];
                for (let i = 0; i < alertConfigs.selectedApps.length; i++) {
                    const currentApp = alertConfigs.selectedApps[i];
                    if (currentApp !== "all-apps" || alertConfigs.alertDataSubType !== 'Hourly data points') {
                        const rightHour = yield utils.checkAppLocalTimeHour(currentApp, 23);
                        if (!rightHour) {
                            done();
                            return;
                        }
                    }
                    switch (alertConfigs.alertDataSubType) {
                    case 'Number of daily DP':
                    case 'Hourly data points':
                    case 'Monthly data points': {
                        const result = yield checkDataPoints(currentApp, alertConfigs);
                        log.d('app:' + currentApp + ' result:', result);
                        if (result.matched) {
                            const app = yield utils.getAppInfo(currentApp);
                            result.app = app;
                            alertList.push(result);
                        }
                        break;
                    }
                    default:
                        break;
                    }
                }
                log.d("alert list:", alertList);
                if (alertList.length > 0) {
                    self.alert(alertConfigs, alertList);
                }
                done();
            }
            catch (e) {
                log.e(e, e.stack);
                done();
            }
        })();
    }
};


/**
 * fetch datapoint data for app 
 * @param {string} app app id
 * @param {object} alertConfigs config - app config data. 
 * @return {object} Promise
 */
function checkDataPoints(app, alertConfigs) {
    var periodsToFetch = [],
        utcMoment = common.moment.utc();
    var monthBack = 3;
    for (let i = monthBack - 1; i > 0; i--) {
        utcMoment.subtract(i, "months");
        periodsToFetch.push(utcMoment.format("YYYY") + ":" + utcMoment.format("M"));
        utcMoment.add(i, "months");
    }

    periodsToFetch.push(utcMoment.format("YYYY") + ":" + utcMoment.format("M"));

    const filter = {};

    if (app !== "all-apps") {
        filter.$or = [];
        for (let i = 0; i < periodsToFetch.length; i++) {
            filter.$or.push({_id: app + "_" + periodsToFetch[i]});
        }
    }

    const today = new moment();
    const tYear = today.year();
    const tMonth = today.month() + 1;
    const tDate = today.date();
    const todayDocumentId = (app === "all-apps" ? "" : app) + "_" + tYear + ":" + tMonth;
    let todayDataPointValue = 0;

    const lastDay = moment().subtract(1, 'days');
    const lYear = lastDay.year();
    const lMonth = lastDay.month() + 1;
    const lDate = lastDay.date();
    const lastdayDocumentId = (app === "all-apps" ? "" : app) + "_" + lYear + ":" + lMonth;
    let lastdayDataPointValue = 0;

    return new Promise((resolve) => {
        common.db.collection("server_stats_data_points").find(filter, {}).toArray(function(err, dataPerApp) {
            var toReturn = {
                "all-apps": {},
            };

            toReturn["all-apps"]["12_months"] = {
                "events": 0,
                "sessions": 0,
                "data-points": 0
            };
            toReturn["all-apps"]["6_months"] = {
                "events": 0,
                "sessions": 0,
                "data-points": 0
            };
            toReturn["all-apps"]["3_months"] = {
                "events": 0,
                "sessions": 0,
                "data-points": 0
            };

            for (let i = 0; i < periodsToFetch.length; i++) {
                let formattedDate = periodsToFetch[i].replace(":", "-");
                toReturn["all-apps"][formattedDate] = {
                    "events": 0,
                    "sessions": 0,
                    "data-points": 0
                };
            }

            let hourDataPointValue = 0;
            for (let i = 0; i < dataPerApp.length; i++) {
                if (dataPerApp[i]._id.indexOf(todayDocumentId) > -1) {
                    for (let hour in dataPerApp[i].d[tDate]) {
                        const hourDataPoint = dataPerApp[i].d[tDate][hour].dp;
                        todayDataPointValue += hourDataPoint;
                        if (hour === today.hour() + '') {
                            hourDataPointValue += hourDataPoint;
                        }
                    }
                }
                if (dataPerApp[i]._id.indexOf(lastdayDocumentId) > -1) {
                    for (let hour in dataPerApp[i].d[lDate]) {
                        const hourDataPoint = dataPerApp[i].d[lDate][hour].dp;
                        lastdayDataPointValue += hourDataPoint;
                    }
                }

                if (!toReturn[dataPerApp[i].a]) {
                    toReturn[dataPerApp[i].a] = {};
                }

                for (let j = 0; j < periodsToFetch.length; j++) {
                    let formattedDate = periodsToFetch[j].replace(":", "-");

                    if (!toReturn[dataPerApp[i].a][formattedDate]) {
                        toReturn[dataPerApp[i].a][formattedDate] = {
                            "events": 0,
                            "sessions": 0,
                            "data-points": 0
                        };
                    }
                    if (!toReturn[dataPerApp[i].a]["12_months"]) {
                        toReturn[dataPerApp[i].a]["12_months"] = {
                            "events": 0,
                            "sessions": 0,
                            "data-points": 0
                        };
                    }
                    if (!toReturn[dataPerApp[i].a]["6_months"]) {
                        toReturn[dataPerApp[i].a]["6_months"] = {
                            "events": 0,
                            "sessions": 0,
                            "data-points": 0
                        };
                    }
                    if (!toReturn[dataPerApp[i].a]["3_months"]) {
                        toReturn[dataPerApp[i].a]["3_months"] = {
                            "events": 0,
                            "sessions": 0,
                            "data-points": 0
                        };
                    }

                    if (dataPerApp[i].m === periodsToFetch[j]) {
                        toReturn[dataPerApp[i].a][formattedDate] = increaseDataPoints(toReturn[dataPerApp[i].a][formattedDate], dataPerApp[i]);
                        toReturn["all-apps"][formattedDate] = increaseDataPoints(toReturn["all-apps"][formattedDate], dataPerApp[i]);
                        // only last 3 months
                        if (j > 8) {
                            toReturn[dataPerApp[i].a]["3_months"] = increaseDataPoints(toReturn[dataPerApp[i].a]["3_months"], dataPerApp[i]);
                            toReturn["all-apps"]["3_months"] = increaseDataPoints(toReturn["all-apps"]["3_months"], dataPerApp[i]);
                        }
                        toReturn[dataPerApp[i].a]["12_months"] = increaseDataPoints(toReturn[dataPerApp[i].a]["12_months"], dataPerApp[i]);
                        toReturn["all-apps"]["12_months"] = increaseDataPoints(toReturn["all-apps"]["12_months"], dataPerApp[i]);
                    }
                }
            }
            if (alertConfigs.alertDataSubType === 'Monthly data points') {
                const todayValue = toReturn[app][tYear + "-" + tMonth]["data-points"];
                return resolve({todayValue, matched: alertConfigs.compareValue < todayValue});
            } if (alertConfigs.alertDataSubType === 'Hourly data points') {
                const todayValue = hourDataPointValue;
                return resolve({todayValue, matched: alertConfigs.compareValue < todayValue});
            }
            else {
                const percentNum = (todayDataPointValue / lastdayDataPointValue - 1) * 100;
                const compareValue = parseFloat(alertConfigs.compareValue);
                const matched = alertConfigs.compareType && alertConfigs.compareType.indexOf('increased') >= 0
                    ? percentNum > compareValue : percentNum < compareValue;
                return resolve({toReturn, lastDateValue: lastdayDataPointValue, todayValue: todayDataPointValue, matched});
            }
        });
    });
}

/**
* Update data-point object with new events and sessions counts
* @param {object} object - object which will be updated
* @param {object} data - passed data object which contains events and sessions count
* @returns {object} Returns manipulated object
**/
function increaseDataPoints(object, data) {
    object.events += data.e;
    object.sessions += data.s;
    object["data-points"] += data.e + data.s;
    return object;
}

module.exports = dataPointAlert;
