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
            case 'dashboard':
                validateUserForWriteAPI(push.dashboard, params);
                break;
            case 'prepare':
                validateUserForWriteAPI(push.prepare, params);
                break;
            case 'clear':
                validateUserForWriteAPI(push.clear, params);
                break;
            case 'create':
                validateUserForWriteAPI(push.create, params);
                break;
            case 'delete':
                validateUserForWriteAPI(push.delete, params);
                break;
            case 'validate':
                validateUserForWriteAPI(push.validate, params);
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
            var postfix = common.crypto.createHash("md5").update(params.qstring.device_id).digest('base64')[0];
            if (Object.keys(updateUsersZero).length) {
                common.db.collection('users').update({'_id': params.app_id + "_" + dbDateIds.zero + "_" + postfix}, {$set: {m: dbDateIds.zero, a: params.app_id + ""}, '$inc': updateUsersZero}, {'upsert': true},function(){});
            }
            if (Object.keys(updateUsersMonth).length) {
                common.db.collection('users').update({'_id': params.app_id + "_" + dbDateIds.month + "_" + postfix}, {$set: {m: dbDateIds.month, a: params.app_id + ""}, '$inc': updateUsersMonth}, {'upsert': true},function(){});
            }
        }
    });

    plugins.register("/i/apps/reset", function(ob){
        var appId = ob.appId;
        common.db.collection('messages').remove({'apps': [common.db.ObjectID(appId)]},function(){});
    });
    
    plugins.register("/i/apps/clear_all", function(ob){
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