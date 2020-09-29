'use strict';
const utils = require('../parts/utils');
const countlyCommon = require('../../../../api/lib/countly.common.js');
const fetch = require('../../../../api/parts/data/fetch.js');
const countlyModel = require('../../../../api/lib/countly.model.js');
const crypto = require('crypto');

const countlySession = countlyModel.load("users");
const bluebird = require("bluebird");
const common = require('../../../../api/utils/common.js');
const log = require('../../../../api/utils/log.js')('alert:metric');

const UserAlert = {

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
                    const emails = yield utils.getDashboardUserEmail(alertConfigs.alertValues); //alertConfigs.alertValues.split(',');
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
                    let keyName = alertConfigs.alertDataSubType; //get total session value
                    // let keyName =  'Session'; //get total session value
                    // if (alertConfigs.alertDataSubType.indexOf('Total users') >= 0 ) {
                    // 	keyName = 'Total user';
                    // } else if (alertConfigs.alertDataSubType.indexOf('New users') >= 0 ) {
                    // 	keyName = 'New user';
                    // }else if (alertConfigs.alertDataSubType.indexOf('Purchases') >= 0 ) {
                    // 	keyName = 'Purchases';
                    // }else if (alertConfigs.alertDataSubType.indexOf('Average session duration') >= 0 ) {
                    // 	keyName = 'Average session duration';
                    // }

                    title = `${keyName} count for ${appsListTitle} has changed compared to yesterday`;
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
    check({db, alertConfigs, done}) {
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

                    if (alertConfigs.alertDataSubType === 'Average session duration') {
                        const data = yield getAverageSessionDuration(db, alertConfigs.selectedApps[i], 'hour');
                        const lastDateValue = parseFloat(data.avg_time['prev-total'].split(' ')[0]);
                        const todayValue = parseFloat(data.avg_time.total.split(' ')[0]);
                        const result = utils.compareValues(alertConfigs, {todayValue, lastDateValue}, null, i);
                        log.d(`For app getAverageSessionDuration ${result} ${lastDateValue},${todayValue},${alertConfigs.selectedApps[i]}`, data);
                        if (result.matched) {
                            result.todayValue = `${result.todayValue} min`;
                            result.lastDateValue = `${result.lastDateValue} min`;
                            const app = yield utils.getAppInfo(result.currentApp);
                            result.app = app;
                            alertList.push(result);
                        }
                    }
                    else if (alertConfigs.alertDataSubType === 'Purchases') {
                        const app = yield utils.getAppInfo(alertConfigs.selectedApps[i]);
                        const data = yield getPurchasesData(app);
                        const result = getCompareValues(alertConfigs, data, i);
                        if (result.matched) {
                            result.app = yield utils.getAppInfo(result.currentApp);
                            alertList.push(result);
                        }
                    }
                    else if (alertConfigs.alertDataSubType === 'Number of page views' || alertConfigs.alertDataSubType === 'Bounce rate') {
                        const data = yield getViewData(alertConfigs.selectedApps[i], alertConfigs.alertDataSubType2);
                        const result = getCompareValues(alertConfigs, data, i);
                        if (result.matched) {
                            const app = yield utils.getAppInfo(result.currentApp);
                            result.app = app;
                            alertList.push(result);
                        }
                    }
                    else {
                        const data = yield getUserAndSessionData(db, alertConfigs.selectedApps[i], "7days");
                        const result = getCompareValues(alertConfigs, data, i);
                        log.d(`For app ${alertConfigs.selectedApps[i]}`, result);
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
 * function for fetching purchases data
 * @param {object} appObject  - appObject record from db
 * @return {object} promise object
 */
function getPurchasesData(appObject) {
    return new bluebird(function(resolve, reject) {
        const purchaseEvents = common.dot(appObject, 'plugins.revenue.iap_events');
        if (purchaseEvents && purchaseEvents.length) {
            return fetch.fetchMergedEventData({
                qstring: {
                    events: purchaseEvents,
                    period: '7days'
                },
                app_id: appObject._id,
                APICallback: function(err, data) {
                    if (err) {
                        reject(err);
                    }
                    resolve(data);
                }
            });
        }
    }).catch((e)=>{
        console.log(e);
    });
}

/**
* fetch session, user data
* @param {object} db  - db object
* @param {string} app_id - id of app
* @param {object} period - string or  array for range
* @return {object} promise
*/
function getUserAndSessionData(db, app_id, period) {
    return new bluebird(function(resolve) {
        return fetch.fetchTimeObj('users', {app_id, qstring: {period}}, false, function(data) {
            return resolve(data);
        });
    });
}

/**
* fetch average session duration
* @param {string} app_id - id of app
* @param {object} period - string or  array for range
* @return {object} promise
*/
function getAverageSessionDuration(app_id, period) {
    var params = {qstring: {}};
    params.app_id = app_id;
    params.qstring.period = period;

    return new bluebird(function(resolve) {
        return fetch.fetchTimeObj('users', params, false, function(usersDoc) {
            // We need to set app_id once again here because after the callback
            // it is reset to it's original value

            fetch.getTotalUsersObj("users", params, function(dbTotalUsersObj) {
                countlySession.setDb(usersDoc || {});
                countlySession.setTotalUsersObj(fetch.formatTotalUsersObj(dbTotalUsersObj), fetch.formatTotalUsersObj(dbTotalUsersObj, null, true));

                var map = {t: "total_sessions", n: "new_users", u: "total_users", d: "total_time", e: "events"};
                var ret = {};
                var data = countlyCommon.getDashboardData(countlySession.getDb(), ["t", "n", "u", "d", "e"], ["u"], {u: countlySession.getTotalUsersObj().users}, {u: countlySession.getTotalUsersObj(true).users});
                for (var i in data) {
                    ret[map[i]] = data[i];
                }

                //convert duration to minutes
                ret.total_time.total /= 60;
                ret.total_time["prev-total"] /= 60;

                //calculate average duration
                var changeAvgDuration = countlyCommon.getPercentChange(
                    (ret.total_sessions["prev-total"] === 0) ? 0 : ret.total_time["prev-total"] / ret.total_sessions["prev-total"],
                    (ret.total_sessions.total === 0) ? 0 : ret.total_time.total / ret.total_sessions.total);
                ret.avg_time = {
                    "prev-total": (ret.total_sessions["prev-total"] === 0) ? 0 : ret.total_time["prev-total"] / ret.total_sessions["prev-total"],
                    "total": (ret.total_sessions.total === 0) ? 0 : ret.total_time.total / ret.total_sessions.total,
                    "change": changeAvgDuration.percent,
                    "trend": changeAvgDuration.trend
                };
                ret.total_time.total = countlyCommon.timeString(ret.total_time.total);
                ret.total_time["prev-total"] = countlyCommon.timeString(ret.total_time["prev-total"]);
                ret.avg_time.total = countlyCommon.timeString(ret.avg_time.total);
                ret.avg_time["prev-total"] = countlyCommon.timeString(ret.avg_time["prev-total"]);
                resolve(ret);
            });
        });
    }).catch((e)=>{
        console.log(e);
    });
}


/**
* fetch view count and bounce rate data 
* @param {string} app_id - id of app
* @param {string} viewId - view id of target view from db collection:countly.viewmeta{appid}
* @return {object} promise
*/
function getViewData(app_id, viewId) {
    return new bluebird(function(resolve) {
        fetch.getTimeObj("app_viewdata" + crypto.createHash('sha1').update(app_id).digest('hex'), {app_id, qstring: {}}, {id: viewId, unique: "u", levels: {daily: ["u", "t", "s", "b", "e", "d", "n"], monthly: ["u", "t", "s", "b", "e", "d", "n"]}}, function(data) {
            resolve(data);
        });
    }).catch((e)=>{
        console.log(e);
    });
}


/**
* compare data logic for different alert config types('Total users', 'New users', 'Total sessions')
* @param {object} alertConfigs  - alertConfig record from db
* @param {object} data - alert data for email template
* @param {number} index - index of data
* @return {boolean} result
*/
function getCompareValues(alertConfigs, data, index) {
    let keyName = 't'; //get total session value
    if (alertConfigs.alertDataSubType.indexOf('Total users') >= 0) {
        keyName = 'u';
    }
    else if (alertConfigs.alertDataSubType.indexOf('New users') >= 0) {
        keyName = 'n';
    }
    else if (alertConfigs.alertDataSubType === 'Purchases') {
        keyName = 's';
    }
    else if (alertConfigs.alertDataSubType === 'Number of page views') {
        keyName = 't';
    }
    else if (alertConfigs.alertDataSubType === 'Bounce rate') {
        keyName = 'b';
    }

    return utils.compareValues(alertConfigs, data, keyName, index);
}

module.exports = UserAlert;
