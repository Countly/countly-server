'use strict';
const utils = require('../parts/utils');
const countlyCommon = require('../../../../api/lib/countly.common.js');
const fetch = require('../../../../api/parts/data/fetch.js');
const crypto = require('crypto');

const bluebird = require("bluebird");
const log = require('../../../../api/utils/log.js')('alert:metric');

const RatingAlert = {

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


    /**
	 * function for checking alert
	 * @param {object} alertConfigs  - alertConfig record from db
	 * @param {function} done - callback after checking
     * @return {object} promise object
	 */
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
    }
};

/**
 * fetch  rating info
 * @param {string} app_id - id of app
 * @param {int} rating - start from 1
 * @return {object} promise
 */
function getRatingData(app_id, rating) {
    const calCumulativeData = function(result, periodArray) {
        const cumulativeData = [
            { count: 0, percent: 0 },
            { count: 0, percent: 0 },
            { count: 0, percent: 0 },
            { count: 0, percent: 0 },
            { count: 0, percent: 0 },
        ];

        for (var i = 0; i < periodArray.length; i++) {
            var dateArray = periodArray[i].split('.');
            var year = dateArray[0];
            var month = dateArray[1];
            var day = dateArray[2];
            if (result[year] && result[year][month] && result[year][month][day]) {
                for (var r in result[year][month][day]) {
                    var rank = (r.split("**"))[2];
                    if (cumulativeData[rank - 1]) {
                        cumulativeData[rank - 1].count += result[year][month][day][r].c;
                    }
                }
            }
        }
        return cumulativeData;
    };
    return new Promise((resolve, reject) => {
        const starRatingCollection = 'events' + crypto.createHash('sha1').update('[CLY]_star_rating' + app_id).digest('hex');
        try {
            fetch.fetchTimeObj(
                starRatingCollection,
                {
                    app_id: "platform_version_rate",
                    qstring: {
                        period: "1days",
                    }
                },
                false,
                function(result) {
                    const periodObj = countlyCommon.getPeriodObj({qstring: {period: "1days"}, app_id: app_id});
                    const {currentPeriodArr, previousPeriodArr} = periodObj;
                    const currentData = calCumulativeData(result, currentPeriodArr);
                    const previousData = calCumulativeData(result, previousPeriodArr);
                    log.d(currentData, previousData, "Alert get Rating data");
                    resolve({todayValue: currentData[rating - 1].count, lastDateValue: previousData[rating - 1].count});
                }
            );
        }
        catch (e) {
            console.log(e);
            reject(e);
        }
    });
}

module.exports = RatingAlert;
