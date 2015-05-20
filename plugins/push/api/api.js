var plugin = {},
	pushly = require('pushly'), setLoggingEnabled,
	push = require('./parts/pushly/endpoints.js'),
	scheduler = require('./parts/pushly/scheduler.js'),
	common = require('../../../api/utils/common.js'),
	fetch = require('../../../api/parts/data/fetch.js'),
    plugins = require('../../pluginManager.js');

(function (plugin) {
    function setUpCommons() {
        common.dbMap['messaging-enabled'] = 'm';
        common.dbUserMap['tokens'] = 'tk';
        common.dbUserMap['apn_prod'] = 'ip';                   // production
        common.dbUserMap['apn_0'] = 'ip';                      // production
        common.dbUserMap['apn_dev'] = 'id';                    // development
        common.dbUserMap['apn_1'] = 'id';                      // development
        common.dbUserMap['apn_adhoc'] = 'ia';                  // ad hoc
        common.dbUserMap['apn_2'] = 'ia';                      // ad hoc
        common.dbUserMap['gcm_prod'] = 'ap';                   // production
        common.dbUserMap['gcm_0'] = 'ap';                      // production
        common.dbUserMap['gcm_test'] = 'at';                   // testing
        common.dbUserMap['gcm_2'] = 'at';                      // testing
    }

	plugins.register("/worker", function(ob){
        setUpCommons();
        pushly();
        setLoggingEnabled = pushly().setLoggingEnabled.bind(pushly());
	});

	plugins.register("/master", function(ob){
        setUpCommons();
		scheduler();
        setLoggingEnabled = pushly().setLoggingEnabled.bind(pushly());
	});

	//write api call
	plugins.register("/i", function(ob){
		var params = ob.params;
		if (params.qstring.events) {
            for (var i = 0; i < params.qstring.events.length; i++) {
                var event = params.qstring.events[i];

                if (event.key && event.key.indexOf('[CLY]_push') == 0 && event.segmentation && event.segmentation.i && event.segmentation.i.length == 24) {
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

	plugins.register("/i/pushes", function(ob){
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
			case 'logs':
                validateUserForWriteAPI(function(params){
                    if (params.qstring.on) {
                        setLoggingEnabled(true);
                        common.returnOutput(params, {set: 'ON'});
                    } else if (params.qstring.off) {
                        setLoggingEnabled(false);
                        common.returnOutput(params, {set: 'OFF'});
                    } else {
                        common.returnMessage(params, 400, 'Set on or off parameter for this endpoint');
                    }
                }, params);
                break;
            default:
                common.returnMessage(params, 404, 'Invalid endpoint');
                break;
        }
		return true;
	});

	plugins.register("/o/pushes", function(ob){
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

       validateUserForWriteAPI(push.getAllMessages, params);
	   return true;
	});

	plugins.register("/session/user", function(ob){
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
            common.db.collection('app_users' + params.app_id).update({'_id': params.app_user_id}, {'$set': {"lp": params.time.timestamp}}, {'upsert': true}, function() {});
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