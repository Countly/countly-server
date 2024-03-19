'use strict';
const Promise = require("bluebird");
const utils = require('../parts/utils');
const fetch = require('../../../../api/parts/data/fetch.js');
const countlyModel = require('../../../../api/lib/countly.model.js');
const countlySession = countlyModel.load("users");
const bluebird = require("bluebird");
const moment = require('moment');
const common = require('../../../../api/utils/common.js');
const log = require('../../../../api/utils/log.js')('alert:crash');

const crashAlert = {
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
                    if (alertConfigs.alertDataSubType === 'Total crashes') {
                        title = `Crash count for ${appsListTitle} has changed compared to yesterday`;
                    }
                    else if (alertConfigs.alertDataSubType === 'New crash occurence') {
                        title = `Received new crashes for ${appsListTitle}`;
                    }
                    else if (alertConfigs.alertDataSubType === 'None fatal crash per session') {
                        title = `Noe fatal crash per session for ${appsListTitle} has changed compare to yesterday`;
                    }
                    else if (alertConfigs.alertDataSubType === 'Fatal crash per session') {
                        title = `Fatal crash per session for ${appsListTitle} has changed compare to yesterday`;
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
                            if (data.errors) {
                                data.errors.forEach(err => {
                                    const errorLines = err.error.split('\n');
                                    let error = '';
                                    for (let i = 0; i < errorLines.length && i < 4; i++) {
                                        error += errorLines[i] + '<br/>';
                                    }
                                    error += `<a href="${host}/dashboard#/${data.app._id}/crashes/${err._id}">Click to view details</a>` + '<br/>';
                                    item.data.push({key: error});
                                });
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
                log.i("checking alert:", alertConfigs);
                const alertList = [];
                for (let i = 0; i < alertConfigs.selectedApps.length; i++) {
                    const currentApp = alertConfigs.selectedApps[i];
                    if (alertConfigs.alertDataSubType === 'Total crashes') {
                        const rightHour = yield utils.checkAppLocalTimeHour(currentApp, 23);
                        if (rightHour) {
                            const result = yield getCrashInfo(currentApp, alertConfigs);
                            log.d('app:' + currentApp + ' result:', result);
                            if (result.matched) {
                                const app = yield utils.getAppInfo(result.currentApp);
                                result.app = app;
                                alertList.push(result);
                            }
                        }
                    }
                    else if (alertConfigs.alertDataSubType === 'New crash occurence') {
                        const result = yield getNewCrashList(currentApp, alertConfigs);
                        log.d("getNewCrashList: ", result);
                        if (result) {
                            alertList.push(result);
                        }
                    }
                    else if (alertConfigs.alertDataSubType === 'None fatal crash per session') {
                        const rightHour = yield utils.checkAppLocalTimeHour(currentApp, 23);
                        if (rightHour) {
                            const result = yield getCrashPerSession(currentApp, alertConfigs, 'crnf');
                            log.d('app:' + currentApp + ' result:', result);
                            if (result.matched) {
                                const app = yield utils.getAppInfo(result.currentApp);
                                result.app = app;
                                alertList.push(result);
                            }
                        }
                    }
                    else if (alertConfigs.alertDataSubType === 'Fatal crash per session') {
                        const rightHour = yield utils.checkAppLocalTimeHour(currentApp, 23);
                        if (rightHour) {
                            const result = yield getCrashPerSession(currentApp, alertConfigs, 'crf');
                            log.d('app:' + currentApp + ' result:', result);
                            if (result.matched) {
                                const app = yield utils.getAppInfo(result.currentApp);
                                result.app = app;
                                alertList.push(result);
                            }
                        }
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
            }
        })();
    }
};


/**
 * function for check new crash in period (60min)
 * @param {string} currentApp - app id
 * @param {object} alertConfigs  - alertConfig record from db 
 * @return {object} Promise
 */
function getNewCrashList(currentApp, alertConfigs) {
    return new Promise(function(resolve, reject) {
        common.db.collection('app_crashgroups' + currentApp).estimatedDocumentCount(function(err, total) {
            if (err) {
                reject(err);
            }
            if (total <= 0) {
                return resolve(null);
            }
            log.d(alertConfigs.period, "!!!");
            // let unit = 1;
            // switch(alertConfigs.checkPeriod){
            // 	case 'secs': unit = 1; break;
            // 	case 'mins': unit = 60; break;
            // 	case 'hours': unit = 3600; break;
            // }
            // const lastJobTime =  parseInt(new Date().getTime() - 1000 * unit * parseFloat(alertConfigs.checkPeriodValue))/1000;

            const lastJobTime = parseInt(new Date().getTime() - 1000 * 60 * 60) / 1000; //check every 60 minutes;

            var cursor = common.db.collection('app_crashgroups' + currentApp).find({is_new: true, startTs: {$gt: lastJobTime}}, {uid: 1, is_new: 1, name: 1, error: 1, users: 1, startTs: 1, lastTs: 1});
            cursor.count(function(err2, count) {
                if (err2) {
                    reject(err2);
                }
                if (count <= 0) {
                    return resolve(null);
                }
                cursor.limit(50);
                var ob = {};
                ob.lastTs = -1;
                cursor.sort(ob);
                cursor.toArray(function(err3, res) {
                    if (err3) {
                        reject(err3);
                    }
                    res = res || [];
                    if (res.length > 0) {
                        return common.db.collection('apps').findOne({ _id: common.db.ObjectID(currentApp)}, function(err4, app) {
                            if (err4) {
                                reject(err4);
                            }
                            const result = {errors: res};
                            result.app = app;
                            return resolve(result);
                        });
                    }
                    return resolve(null);
                });
            });
        });
    });
}


/**
 * fetch crash data in last 7 days for compare
 * @param {string} currentApp  app id
 * @param {object} alertConfigs  - alertConfig record from db 
 * @return {object} Promise
 */
function getCrashInfo(currentApp, alertConfigs) {
    return new Promise(function(resolve) {
        return fetch.getTimeObj("crashdata", {
            qstring: { period: '7days' },
            app_id: currentApp
        }, { unique: "cru" }, function(data) {
            const today = new moment();
            const tYear = today.year();
            const tMonth = today.month() + 1;
            const tDate = today.date();
            let todayValue = data[tYear] && data[tYear][tMonth] && data[tYear][tMonth][tDate] && data[tYear][tMonth][tDate].cr;

            const lastDay = moment().subtract(1, 'days');
            const lYear = lastDay.year();
            const lMonth = lastDay.month() + 1;
            const lDate = lastDay.date();
            let lastDateValue = data[lYear] && data[lYear][lMonth] && data[lYear][lMonth][lDate] && data[lYear][lMonth][lDate].cr;

            todayValue = todayValue || 0;
            lastDateValue = lastDateValue || 0;
            const percentNum = (todayValue / lastDateValue - 1) * 100;

            const compareValue = parseFloat(alertConfigs.compareValue);
            const matched = alertConfigs.compareType && alertConfigs.compareType.indexOf('increased') >= 0
                ? percentNum > compareValue : percentNum < compareValue;

            return resolve({currentApp, todayValue, lastDateValue, matched});
        });
    }).catch((e) => {
        log.e(e);
    });

}


/**
 * fetch crashes in per session data
 * @param {string} currentApp  app id
 * @param {object} alertConfigs  - alertConfig record from db 
 * @param {string} crashType - enum : ['crnf', 'crf']
 * @return {object} Promise
 */
function getCrashPerSession(currentApp, alertConfigs, crashType) {
    const param = {
        qstring: { period: '7days' },
        app_id: currentApp
    };
    return new Promise(function(resolve) {
        return fetch.getTimeObj("crashdata", param, { unique: "cru" }, function(data) {
            log.d(JSON.stringify(data), "getCrashPerSession, crashdata");
            const today = new moment();
            const tYear = today.year();
            const tMonth = today.month() + 1;
            const tDate = today.date();
            let todayCrash = data[tYear] && data[tYear][tMonth] && data[tYear][tMonth][tDate] && data[tYear][tMonth][tDate][crashType];

            const lastDay = moment().subtract(1, 'days');
            const lYear = lastDay.year();
            const lMonth = lastDay.month() + 1;
            const lDate = lastDay.date();
            let lastDayCrash = data[lYear] && data[lYear][lMonth] && data[lYear][lMonth][lDate] && data[lYear][lMonth][lDate][crashType];
            todayCrash = todayCrash || 0;
            lastDayCrash = lastDayCrash || 0;

            fetch.fetchTimeObj('users', param, false, function(usersDoc) {
                countlySession.setDb(usersDoc || {});
                var subPeriodData = countlySession.getSubperiodData();
                const todaySession = subPeriodData[6].t;
                const lastdaySession = subPeriodData[5].t;

                log.d(subPeriodData, "getCrashPerSession, sessiondata");
                log.d(todayCrash, todaySession, 'today');
                log.d(lastDayCrash, lastdaySession, ' lastdaySession');

                let todayValue = todaySession > 0 ? todayCrash / todaySession : 0;
                todayValue = (todayValue).toFixed(2);
                let lastDateValue = lastdaySession > 0 ? lastDayCrash / lastdaySession : 0;
                lastDateValue = (lastDateValue).toFixed(2);
                const percentNum = (todayValue / lastDateValue - 1) * 100;
                const compareValue = parseFloat(alertConfigs.compareValue);
                const matched = alertConfigs.compareType && alertConfigs.compareType.indexOf('increased') >= 0
                    ? percentNum > compareValue : percentNum < compareValue;
                return resolve({currentApp, todayValue, lastDateValue, matched});
            });
        });
    }).catch((e) => {
        log.e(e);
    });
}

// log.i = console.log
// log.d = console.log
// utils.checkAppLocalTimeHour = function(){
// 	return new Promise( function(resolve,reject){
// 		resolve(true)
// 	}) 
// }
// const countlyConfig = require('../../../../api/config', 'dont-enclose');
// const plugins = require('../../../pluginManager.js');
// common.db = plugins.dbConnection(countlyConfig);
// setTimeout(function(){
// 	common.db.collection("alerts").find({ '_id': common.db.ObjectID('5b73d67a1960d80062eb07be') })
// 	.toArray(function (err, result) {
// 		var alert  = result[0]
// 		log.d(alert, "get alert configs");
// 		crashAlert.check({db:common.db , alertConfigs:alert, done:function(){} })
// 	});
// },2000)
module.exports = crashAlert;