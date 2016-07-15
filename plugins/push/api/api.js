'use strict';

var plugin = {},
    push = require('./parts/endpoints.js'),
    common = require('../../../api/utils/common.js'),
    countlyCommon = require('../../../api/lib/countly.common.js'),
    log = common.log('push:api'),
    plugins = require('../../pluginManager.js');

(function (plugin) {
    function setUpCommons() {
        let creds = require('./parts/credentials.js');
        for (let k in creds.DB_MAP) {
            common.dbMap[k] = creds.DB_MAP[k];
        }
        for (let k in creds.DB_USER_MAP) {
            common.dbUserMap[k] = creds.DB_USER_MAP[k];
        }
    }
    
    plugins.internalEvents.push("[CLY]_push_action");
    plugins.internalEvents.push("[CLY]_push_open");
    plugins.internalEvents.push("[CLY]_push_sent");
    plugins.internalDrillEvents.push("[CLY]_push_action");
    plugins.internalDrillEvents.push("[CLY]_push_open");
    plugins.internalDrillEvents.push("[CLY]_push_sent");

    plugins.register('/worker', function(ob){
        setUpCommons();
    });

    plugins.register('/master', function(ob){
        setUpCommons();
    });

    //write api call
    plugins.register('/i', function(ob){
        var params = ob.params;
        if (params.qstring.events) {
            for (var i = 0; i < params.qstring.events.length; i++) {
                var event = params.qstring.events[i];

                if (event.key && event.key.indexOf('[CLY]_push') === 0 && event.segmentation && event.segmentation.i && event.segmentation.i.length == 24) {
                    var $inc = {};

                    if (event.key == '[CLY]_push_open') {
                        $inc['result.delivered'] = event.count;
                    } else if (event.key == '[CLY]_push_action') {
                        $inc['result.actioned'] = event.count;
                    }

                    common.db.collection('messages').update({_id: common.db.ObjectID(event.segmentation.i)}, {$inc: $inc},function(){});
                }
            }
        }
        if (params.qstring.token_session) {
            common.db.collection('app_users' + params.app_id).findOne({'_id': params.app_user_id }, function (err, dbAppUser){
                push.processTokenSession(dbAppUser, params);
            });
        }
    });

    plugins.register('/i/pushes', function(ob){
        var params = ob.params,
            paths = ob.paths,
            validateUserForWriteAPI = ob.validateUserForWriteAPI;
        if (params.qstring.args) {
            try {
                params.qstring.args = JSON.parse(params.qstring.args);
            } catch (SyntaxError) {
                console.log('Parse /i/pushes JSON failed');
            }
        }

        switch (paths[3]) {
            case 'audience':
                validateUserForWriteAPI(push.getAudience, params);
                break;
            case 'create':
                validateUserForWriteAPI(push.createMessage, params);
                break;
            case 'refresh':
                validateUserForWriteAPI(push.refreshMessage, params);
                break;
            case 'delete':
                validateUserForWriteAPI(push.deleteMessage, params);
                break;
            case 'check':
                validateUserForWriteAPI(push.checkApp, params);
                break;
            case 'update':
                validateUserForWriteAPI(push.updateApp, params);
                break;
            default:
                common.returnMessage(params, 404, 'Invalid endpoint');
                break;
        }
        return true;
    });

    plugins.register('/o/pushes', function(ob){
        var params = ob.params,
            validateUserForWriteAPI = ob.validateUserForWriteAPI;

        if (params.qstring.args) {
           try {
               params.qstring.args = JSON.parse(params.qstring.args);
           } catch (SyntaxError) {
               console.log('Parse /o/pushes JSON failed');
           }
       }

       log.d('got /o/pushes request: %j', params.qstring.period);

       if (params.qstring.period) {
            //check if period comes from datepicker
            if (params.qstring.period.indexOf(',') !== -1) {
                try {
                    params.period = JSON.parse(params.qstring.period);
                } catch (e) {
                    log.w('Parsing custom period failed: %j', e);
                    common.returnMessage(params, 400, 'Bad request parameter: period');
                    return true;
                }
            } else {
                switch (params.qstring.period) {
                    case 'month':
                        params.period = params.qstring.period;
                        break;
                    case 'day':
                    case 'yesterday':
                    case 'hour':
                    case '7days':
                    case '30days':
                    case '60days':
                        params.period = params.qstring.period;
                        break;
                    default:
                        common.returnMessage(params, 400, 'Bad request parameter: period');
                        return true;
                }
            }

            log.d('period %j', params.period);

            countlyCommon.setPeriod(params.period, true);
            countlyCommon.setTimezone(params.appTimezone, true);

            log.d('parsed period %j - ', countlyCommon.periodObj.currentPeriodArr[0], countlyCommon.periodObj.currentPeriodArr[countlyCommon.periodObj.currentPeriodArr.length - 1]);

            var tmpArr;

            params.period = {date: {}};
            tmpArr = countlyCommon.periodObj.currentPeriodArr[0].split('.');
            params.period.date.$gte = new Date(Date.UTC(parseInt(tmpArr[0]), parseInt(tmpArr[1]) - 1, parseInt(tmpArr[2])));
            params.period.date.$gte.setTimezone(params.appTimezone);
            params.period.date.$gte = new Date(params.period.date.$gte.getTime() + params.period.date.$gte.getTimezoneOffset() * 60000);

            tmpArr = countlyCommon.periodObj.currentPeriodArr[countlyCommon.periodObj.currentPeriodArr.length - 1].split('.');
            params.period.date.$lt = new Date(Date.UTC(parseInt(tmpArr[0]), parseInt(tmpArr[1]) - 1, parseInt(tmpArr[2])));
            params.period.date.$lt.setDate(params.period.date.$lt.getDate() + 1);
            params.period.date.$lt.setTimezone(params.appTimezone);
            params.period.date.$lt = new Date(params.period.date.$lt.getTime() + params.period.date.$lt.getTimezoneOffset() * 60000);

            // query.period.ts.$gte = 1325379600000;
            // query.period.ts.$lt = 1514764800000;
       } else {
            return common.returnMessage(params, 400, 'Missing request parameter: period');
       }

       validateUserForWriteAPI(push.getAllMessages, params);
       return true;
    });

    plugins.register('/session/user', function(ob){
        var params = ob.params,
            dbAppUser = ob.dbAppUser;
        var updateUsersZero = {},
            updateUsersMonth = {},
            dbDateIds = common.getDateIds(params);

        if (dbAppUser && dbAppUser[common.dbUserMap['first_seen']]) {
            var userLastSeenTimestamp = dbAppUser[common.dbUserMap['last_seen']],
                currDate = common.getDate(params.time.timestamp, params.appTimezone),
                userLastSeenDate = common.getDate(userLastSeenTimestamp, params.appTimezone),
                secInMin = (60 * (currDate.getMinutes())) + currDate.getSeconds(),
                secInHour = (60 * 60 * (currDate.getHours())) + secInMin,
                secInMonth = (60 * 60 * 24 * (currDate.getDate() - 1)) + secInHour,
                secInYear = (60 * 60 * 24 * (common.getDOY(params.time.timestamp, params.appTimezone) - 1)) + secInHour;

            if (userLastSeenTimestamp < (params.time.timestamp - secInMin) && messagingTokenKeys(dbAppUser).length) {
                updateUsersMonth['d.' + params.time.day + '.' + params.time.hour + '.' + common.dbMap['messaging-enabled']] = 1;
            }

            if (userLastSeenTimestamp < (params.time.timestamp - secInHour) && messagingTokenKeys(dbAppUser).length) {
                updateUsersMonth['d.' + params.time.day + '.' + common.dbMap['messaging-enabled']] = 1;
            }

            if (userLastSeenDate.getFullYear() == params.time.yearly &&
                Math.ceil(common.moment(userLastSeenDate).format("DDD") / 7) < params.time.weekly && messagingTokenKeys(dbAppUser).length) {
                updateUsersZero["d.w" + params.time.weekly + '.' + common.dbMap['messaging-enabled']] = 1;
            }

            if (userLastSeenTimestamp < (params.time.timestamp - secInMonth) && messagingTokenKeys(dbAppUser).length) {
                updateUsersZero['d.' + params.time.month + '.' + common.dbMap['messaging-enabled']] = 1;
            }

            if (userLastSeenTimestamp < (params.time.timestamp - secInYear) && messagingTokenKeys(dbAppUser).length) {
                updateUsersZero['d.' + common.dbMap['messaging-enabled']] = 1;
            }

            if (Object.keys(updateUsersZero).length) {
                common.db.collection('users').update({'_id': params.app_id + "_" + dbDateIds.zero}, {$set: {m: dbDateIds.zero, a: params.app_id + ""}, '$inc': updateUsersZero}, {'upsert': true},function(){});
            }

            common.db.collection('users').update({'_id': params.app_id + "_" + dbDateIds.month}, {$set: {m: dbDateIds.month, a: params.app_id + ""}, '$inc': updateUsersMonth}, {'upsert': true},function(){});
        }
    });

    plugins.register("/i/apps/reset", function(ob){
        var appId = ob.appId;
        common.db.collection('messages').remove({'apps': [common.db.ObjectID(appId)]},function(){});
    });

    plugins.register("/i/apps/delete", function(ob){
        var appId = ob.appId;
        common.db.collection('messages').remove({'apps': [common.db.ObjectID(appId)]},function(){});
    });

    function messagingTokenKeys(dbAppUser) {
        var a = [];
        for (var k in dbAppUser[common.dbUserMap.tokens]) a.push(common.dbUserMap.tokens + '.' + k);
        return a;
    };
}(plugin));

module.exports = plugin;