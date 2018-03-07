'use strict';

var plugin = {},
    push = require('./parts/endpoints.js'),
    common = require('../../../api/utils/common.js'),
    log = common.log('push:api'),
    jobs = require('../../../api/parts/jobs'),
    plugins = require('../../pluginManager.js');

(function () {

    plugins.internalEvents.push('[CLY]_push_sent');
    plugins.internalEvents.push('[CLY]_push_action');
    plugins.internalDrillEvents.push('[CLY]_push_action');

    function setUpCommons() {
        let creds = require('./parts/credentials.js');
        for (let k in creds.DB_MAP) {
            common.dbMap[k] = creds.DB_MAP[k];
        }
        for (let k in creds.DB_USER_MAP) {
            common.dbUserMap[k] = creds.DB_USER_MAP[k];
        }
    }

    plugins.register('/worker', function(){
        setUpCommons();

        plugins.register('/cohort/enter', ({cohort, uids}) => {
            push.onCohort(true, cohort, uids);
        });
        
        plugins.register('/cohort/exit', ({cohort, uids}) => {
            push.onCohort(false, cohort, uids);
        });
        
        plugins.register('/cohort/delete', ({_id, app_id, ack}) => {
            return push.onCohortDelete(_id, app_id, ack);
        });
    });

    plugins.register('/master', function(){
        setUpCommons();

        setTimeout(() => {
            jobs.job('push:cleanup').replace().schedule('every 59 minutes');
        }, 10000);

        plugins.register('/cohort/enter', ({cohort, uids}) => {
            push.onCohort(true, cohort, uids);
        });
        
        plugins.register('/cohort/exit', ({cohort, uids}) => {
            push.onCohort(false, cohort, uids);
        });
    });

    //write api call
    plugins.register('/sdk', function(ob){
        var params = ob.params;
        if (params.qstring.events) {
            var pushEvents = params.qstring.events.filter(e => e.key && e.key.indexOf('[CLY]_push_') === 0 && e.segmentation && e.segmentation.i && e.segmentation.i.length === 24),
                msgIds = pushEvents.map(e => common.db.ObjectID(e.segmentation.i));
            if (msgIds.length) {
                return new Promise((resolve, reject) => {
                    common.db.collection('messages').find({_id: {$in: msgIds}}, {auto: 1}).toArray(function(err, msgs){
                        if (err) {
                            log.e('Error while looking for a message: %j', err);
                            reject(err);
                        } else {
                            pushEvents.forEach(event => {
                                var msg = msgs.filter(msg => ('' + msg._id) === event.segmentation.i)[0],
                                    inc = {};
                                if (msg) {
                                    event.segmentation.a = msg.auto || false;

                                    if (event.key == '[CLY]_push_open') {
                                        inc['result.delivered'] = event.count;
                                    } else if (event.key == '[CLY]_push_action') {
                                        inc['result.actioned'] = event.count;
                                        if (event.segmentation && event.segmentation.b !== undefined) {
                                            inc['result.actioned|' + event.segmentation.b] = event.count;
                                        }
                                    }
                                    common.db.collection('messages').update({_id: msg._id}, {$inc: inc}, function(){});
                                }
                            });
                            resolve();
                        }
                    });

                });
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
            case 'message':
                validateUserForWriteAPI(push.message, params);
                break;
            case 'autoActive':
                validateUserForWriteAPI(push.autoActive, params);
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
            case 'mime':
                validateUserForWriteAPI(push.mimeInfo, params);
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
                Math.ceil(common.moment(userLastSeenDate).tz(params.appTimezone).format("DDD") / 7) < params.time.weekly && messagingTokenKeys(dbAppUser).length) {
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

    plugins.register("/i/apps/update", push.appCreateUpdate);
    plugins.register("/i/apps/create", push.appCreateUpdate);

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
    }
}(plugin));

module.exports = plugin;