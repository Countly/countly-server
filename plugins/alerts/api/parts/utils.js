const mail = require("../../../../api/parts/mgmt/mail");
const request = require('request');
const moment = require('moment');
const common = require('../../../../api/utils/common.js');
const ejs = require('ejs');
const path = require('path');
const fs = require('fs');
var Promise = require("bluebird");
const _ = require("lodash");
const log = require('../../../../api/utils/log.js')('alert:utils');

const utils = {};
utils.sendEmail = function(to, subject, message, callback) {
    log.d('will send Alert email:', to, subject, message);
    return mail.sendMessage(to, subject, message, callback);
};

utils.sendRequest = function(url, callback) {
    return request(url, function(error, response, body) {
        log.d('will send Alert request', error, response, body);
        if (callback) {
            callback(error, body);
        }
    });
};

utils.getDatesValue = function(alertConfig, data, keyPath) {
    const keyName = keyPath.split('.')[0];
    const subKeyName = keyPath.split('.')[1];

    const today = new moment();
    const tYear = today.year();
    const tMonth = today.month() + 1;
    const tDate = today.date();
    let todayValue = data[tYear] && data[tYear][tMonth] && data[tYear][tMonth][tDate] && data[tYear][tMonth][tDate][keyName];

    let lastDayGap = 1;
    // if (alertConfig.comparePeriod && alertConfig.comparePeriod === 'same_day_last_week') {
    // 	lastDayGap = 7;
    // }
    const lastDay = moment().subtract(lastDayGap, 'days');
    const lYear = lastDay.year();
    const lMonth = lastDay.month() + 1;
    const lDate = lastDay.date();
    let lastDateValue = data[lYear] && data[lYear][lMonth] && data[lYear][lMonth][lDate] && data[lYear][lMonth][lDate][keyName];

    if (subKeyName) {
        todayValue = todayValue ? todayValue[subKeyName] : todayValue;
        lastDateValue = lastDateValue ? lastDateValue[subKeyName] : lastDateValue;
    }
    return { todayValue: todayValue || 0, lastDateValue: lastDateValue || 0 };
};

utils.compareValues = function(alertConfig, data, keyName, appIndex) {
    const currentApp = alertConfig.selectedApps[appIndex];
    const { todayValue, lastDateValue } = keyName ? this.getDatesValue(alertConfig, data, keyName) : data;

    log.d('#######app:' + currentApp + ' today:', todayValue, ' lastDateValue:', lastDateValue, alertConfig);
    const compareValue = parseFloat(alertConfig.compareValue);
    let matched = false;

    const percentNum = (todayValue / lastDateValue - 1) * 100;
    matched = alertConfig.compareType && alertConfig.compareType.indexOf('increased') >= 0
        ? percentNum > compareValue : percentNum < compareValue;

    // if (alertConfig.alertType.indexOf('today_compare_previous') > 0) {
    // 	const percentNum = (todayValue / lastDateValue - 1) * 100
    // 	matched = alertConfig.compareType === 'more' ? percentNum > compareValue : percentNum <= compareValue
    // }
    // if (alertConfig.alertType.indexOf('today_compare_a_value') > 0) {
    // 	matched = alertConfig.compareType === 'more' ? todayValue > compareValue : todayValue <= compareValue
    // }
    return { currentApp, todayValue, lastDateValue, matched };
};



utils.addAlertCount = function(email) {
    const today = new moment();
    const tYear = today.year();
    const tMonth = today.month() + 1;
    const tDate = today.date();
    const keyName = `${tYear}.${tMonth}.${tDate}`;
    const update = { $inc: { t: 1, [keyName]: 1 } };
    let query = { _id: 'meta'};
    if (email) {
        query = { _id: 'email:' + email };
    }
    return common.db.collection("alerts_data").findAndModify(
        query,
        {},
        update,
        { new: true, upsert: true }
    );
};


utils.getAlertCount = function(query, callback) {
    return common.db.collection("alerts_data").findOne(query, function(err, data) {
        const count = {};
        if (data) {
            const today = new moment();
            const tYear = today.year();
            const tMonth = today.month() + 1;
            const tDate = today.date();
            count.t = data.t;
            count.today = data[tYear] && data[tYear][tMonth] && data[tYear][tMonth][tDate] || 0;
        }
        callback(count);
    });
};



utils.getEmailTemplate = function(data) {
    var dir = path.resolve(__dirname, '../../frontend/public');

    return new Promise(function(resolve, reject) {
        fs.readFile(dir + '/templates/email.html', 'utf8', function(err, template) {
            if (err) {
                reject(err);
            }
            else {
                resolve(ejs.render(template, data));
            }
        });
    }).catch((e)=>{
        console.log(e);
    });
};


utils.getHost = function() {
    return new Promise(function(resolve, reject) {
        mail.lookup(function(err, host) {
            if (err) {
                return reject(err);
            }
            return resolve(host);
        });
    });
};

utils.getAppInfo = function(appID) {
    return new Promise(function(resolve, reject) {
        common.db.collection('apps').findOne({ _id: common.db.ObjectID(appID)}, function(err, app) {
            if (err) {
                return reject(err);
            }
            return resolve(app);
        });
    });
};

utils.getDashboardUserEmail = function(userIds) {
    const userIdsObject = userIds.map((id)=> common.db.ObjectID(id));
    return new Promise(function(resolve, reject) {
        return common.db.collection('members').find({ _id: {$in: userIdsObject}}).toArray(function(err, members) {
            if (err) {
                return reject(err);
            }
            return resolve(_.map(members, 'email'));
        });
    });
};

utils.checkAppLocalTimeHour = function(appId, targetHour) {
    return new Promise(function(resolve, reject) {
        utils.getAppInfo(appId).then((app)=> {
            const appTime = new moment().tz(app.timezone);
            const hour = appTime.hours();
            const result = hour === targetHour;
            log.d("Alert get App Time zone:", app, appTime, app.timezone);
            log.d("Alert get App Time result:", result);
            return resolve(result);
        }).catch((err)=> {
            if (err) {
                return reject(err);
            }
        });
    });
};


module.exports = utils;