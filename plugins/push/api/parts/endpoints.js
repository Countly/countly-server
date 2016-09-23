'use strict';

var common          = require('../../../../api/utils/common.js'),
    log             = common.log('push:endpoints'),
    _               = require('underscore'),
    api             = {},
    moment          = require('moment'),
    mess            = require('./message.js'),
    Divider         = require('./divider.js'),
    jobs            = require('../../../../api/parts/jobs'),
    plugins         = require('../../../pluginManager.js'),
    Platform        = mess.MessagePlatform,
    Message         = mess.Message,
    MessageStatus   = mess.MessageStatus;

(function (api) {

    api.checkApp = function (params) {
        var argProps = {
                'appId':            { 'required': true,  'type': 'String'   },
                'platform':         { 'required': true,  'type': 'String'   },
                'test':             { 'required': false, 'type': 'Boolean'  },
            },
            options = {};

        if (params.qstring.test === 'false') { params.qstring.test = false; }
        if (params.qstring.test === 'true') { params.qstring.test = true; }

        if (!(options = common.validateArgs(params.qstring, argProps))) {
            common.returnMessage(params, 400, 'Not enough args');
            return false;
        }

        api.check(options.appId, options.platform, options.test, function(ok, error){
            common.returnOutput(params, {ok: ok, error: error});
        });
    };

    api.check = function (appId, platform, test, callback) {
        var message = new Message([appId], ['Test app'])
            .setId(new common.db.ObjectID())
            .setMessage('[CLY]_test_message')
            .addPlatform(platform)
            .setTest(test);

            log.d('%j', message);

        jobs.runTransient('push:check', mess.cleanObj(message)).then(() => {
            log.d('Check app returned ok');
            callback(true);
        }, (json) => {
            log.d('Check app returned error', json);
            let err = json && json.error === '3-EOF' ? 'badcert' : undefined;
            callback(false, err);
        });
    };

    var withAppsAndGeo = function(appIds, geoId, callback) {
        common.db.collection('apps').find({_id: {$in: appIds}}).toArray(function(error, apps){
            if (geoId) {
                common.db.collection('geos').findOne({_id: common.db.ObjectID(geoId)}, function(err, geo) {
                    callback(err || error, apps, geo);
                });
            } else {
                callback(error, apps);
            }
        });
    };

    api.updateApp = function(params) {
         var argProps = {
                'gcm.key':  { 'required': false, 'type': 'String' }
            },
            updatedApp = {}, $unset = {};

        if (!(updatedApp = common.validateArgs(params.qstring.args, argProps))) {
            common.returnOutput(params, {error: 'Invalid arguments provided'});
            return false;
        }

        if (Object.keys(updatedApp).length === 0) {
            common.returnMessage(params, 200, 'Nothing changed');
            return true;
        }

        if (!updatedApp['gcm.key']) {
            $unset['gcm.key'] = true;
        }

        var update = {$set: updatedApp};
        for (var k in $unset) update.$unset = $unset;

        common.db.collection('apps').findOne(common.db.ObjectID(params.qstring.args.app_id), function(err, app){
            if (err || !app) common.returnMessage(params, 404, 'App not found');
            else {
                var needToCheckGCM = updatedApp['gcm.key'] && (!app.gcm || !app.gcm.key || app.gcm.key != updatedApp['gcm.key']);

                if (params.member && params.member.global_admin) {
                    common.db.collection('apps').findAndModify({_id: common.db.ObjectID(params.qstring.args.app_id)}, [['_id', 1]], update, {new:true}, function(err, app){
                        if (err || !app || !app.ok) {
                            common.returnMessage(params, 404, 'App not found');
                        } else if (needToCheckGCM) {
                            checkGCM(params, app.value);
                        } else {
                            common.returnOutput(params, app.value);
                        }
                    });
                } else {
                    common.db.collection('members').findOne({'_id': params.member._id}, {admin_of: 1}, function(err, member){
                        if (member.admin_of && member.admin_of.indexOf(params.qstring.args.app_id) !== -1) {
                            common.db.collection('apps').findAndModify({_id: common.db.ObjectID(params.qstring.args.app_id)}, [['_id', 1]], update, {new:true}, function(err, app){
                                if (err || !app || !app.ok) {
                                    common.returnMessage(params, 404, 'App not found');
                                } else if (needToCheckGCM) {
                                    checkGCM(params, app.value);
                                } else {
                                    common.returnOutput(params, app.value);
                                }
                            });
                        } else {
                            common.returnMessage(params, 401, 'User does not have admin rights for this app');
                        }
                    });
                }
            }
        });

        return true;
    };

    var geoPlugin;

    function getGeoPluginApi() {
        if (geoPlugin === undefined) {
            geoPlugin = plugins.getPluginsApis().geo || null;
        }

        return geoPlugin;
    }

    api.audience = function(message, callback) {
        withAppsAndGeo(message.apps, message.geo, function(err, apps, geo){
            if (err || !apps || !apps.length) {
                log.i('No apps found');
                callback(null, []);
            } else {
                message.appNames = _.pluck(apps, 'name');

                if (geo && getGeoPluginApi()) {
                    message.setUserConditions(getGeoPluginApi().conditions(geo, message.getUserConditions()));
                }

                let divider = new Divider(message);
                divider.audience(common.db).then((TOTALLY) => {
                    callback(null, TOTALLY);
                }, (err) => {
                    callback(500, err);
                });
            }
        });
    };

    api.getAudience = function (params) {
        var argProps = {
                'apps':             { 'required': true,  'type': 'Array'   },
                'platforms':        { 'required': true,  'type': 'Array'   },
                'geo':              { 'required': false, 'type': 'String', 'min-length': 24, 'max-length': 24 },
                'userConditions':   { 'required': false, 'type': 'Object'  },
                'drillConditions':  { 'required': false, 'type': 'Object'  },
                'test':             { 'required': false, 'type': 'Boolean' }
            },
            msg = {};

        if (!(msg = common.validateArgs(params.qstring.args, argProps))) {
            common.returnMessage(params, 400, 'Not enough args');
            return;
        }

        log.i('Counting audience: %j', msg);

        msg.apps = _.map(msg.apps, common.db.ObjectID);

        var message = new Message(msg.apps, '')
                .setId(new common.db.ObjectID())
                .addPlatform(msg.platforms)
                .setUserConditions(msg.userConditions)
                .setDrillConditions(msg.drillConditions)
                .setGeo(msg.geo)
                .setTest(msg.test);

        api.audience(message, (code, TOTALLY) => {
            if (!code) {
                common.returnOutput(params, TOTALLY);
            } else  {
                common.returnMessage(params, 500, TOTALLY);
            }
        });

        return true;
    };

    api.getAllMessages = function (params) {
        var query = {
            'deleted': {$exists: false}
        };

        if (!params.member.global_admin) {
            var ids = [], i, id;

            if (params.member.admin_of) {
                for (i in params.member.admin_of) {
                    id = params.member.admin_of[i];
                    if (id) {
                        ids.push(common.db.ObjectID(id));
                    }
                }
            }

            if (params.member.user_of)  {
                for (i in params.member.user_of) {
                    id = params.member.user_of[i];
                    if (id) {
                        ids.push(common.db.ObjectID(id));
                    }
                }
            }

            query.apps = {$in: ids};
        }

        query.$or = [
            {date: params.period.date},
            {date: {$gte: new Date()}}
        ];

        /*
         var pageNo = (params.qstring.args && params.qstring.args.page && common.isNumber(params.qstring.args.page))? params.qstring.args.page : 1;

         common.db.collection('messages').find(query).sort({created: -1}).skip((pageNo - 1) * 20).limit(20).toArray(function (err, msgs) {
         */

        log.d('Querying messages: %j', query);

        common.db.collection('messages').find(query).sort({created: -1}).toArray(function (err, msgs) {
            if (!msgs || err) {
                common.returnOutput(params, {});
                return false;
            }

            common.returnOutput(params, packMessages(msgs));
            return true;
        });

        return true;
    };

    api.createMessage = function (params) {
        var argProps = {
                'type':                 { 'required': true,  'type': 'String'  },
                'apps':                 { 'required': true,  'type': 'Array'   },
                'platforms':            { 'required': true,  'type': 'Array'   },
                'messagePerLocale':     { 'required': false, 'type': 'Object'  },
                'locales':              { 'required': false, 'type': 'Object'  },
                'userConditions':       { 'required': false, 'type': 'Object'  },
                'drillConditions':      { 'required': false, 'type': 'Object'  },
                'geo':                  { 'required': false, 'type': 'String', 'min-length': 24, 'max-length': 24 },
                'sound':                { 'required': false, 'type': 'String'  },
                'badge':                { 'required': false, 'type': 'Number'  },
                'url':                  { 'required': false, 'type': 'URL'     },
                'category':             { 'required': false, 'type': 'String'  },
                'contentAvailable':     { 'required': false, 'type': 'Boolean' },
                'newsstandAvailable':   { 'required': false, 'type': 'Boolean' },
                'collapseKey':          { 'required': false, 'type': 'String'  },
                'delayWhileIdle':       { 'required': false, 'type': 'Boolean' },
                'data':                 { 'required': false, 'type': 'Object'  },
                'test':                 { 'required': false, 'type': 'Boolean' }
            },
            msg = {};

        if (!(msg = common.validateArgs(params.qstring.args, argProps))) {
            common.returnOutput(params, {error: 'Not enough args'});
            return false;
        }

        if (['message', 'link', 'category', 'data', 'update', 'review'].indexOf(msg.type) === -1) {
            common.returnOutput(params, {error: 'Bad message type'});
            return false;
        }

        for (var platform in msg.platforms) if ([Platform.APNS, Platform.GCM].indexOf(msg.platforms[platform]) === -1) {
            common.returnOutput(params, {error: 'Bad message plaform "' + msg.platforms[platform] + '", only "' + Platform.APNS + '" (APNS) and "' + Platform.GCM + '" (GCM) are supported'});
            return false;
        }

        if (msg.type !== 'data' && !msg.messagePerLocale) {
            common.returnOutput(params, {error: 'Messages of type other than "data" must have "messagePerLocale"'});
            return false;
        }

        if (msg.type === 'data' && !msg.data) {
            common.returnOutput(params, {error: 'Messages of type "data" must have "data" property'});
            return false;
        }

        if (msg.type === 'link' && !msg.url) {
            common.returnOutput(params, {error: 'Messages of type "link" must have valid URL in "url" property'});
            return false;
        }

        if (msg.type === 'category' && !msg.category) {
            common.returnOutput(params, {error: 'Messages of type "category" must have "category" property'});
            return false;
        }

        if (msg.type === 'update' && typeof params.qstring.args.update === 'boolean') {
            msg.update = '';
        }

        if (msg.type === 'review' && typeof params.qstring.args.review === 'boolean') {
            msg.review = '';
        }

        var message = {};
        for (var k in msg.messagePerLocale) {
            message[k.replace(/[\[\]]/g, '')] = msg.messagePerLocale[k];
        }

        msg.apps = _.map(msg.apps, common.db.ObjectID);

        if (params.qstring.args.date) {
            if ((params.qstring.args.date + '').length == 10) {
                params.qstring.args.date *= 1000;
            }

            msg.date = moment.utc(params.qstring.args.date).toDate();
        } else {
            msg.date = null;
        }

        withAppsAndGeo(msg.apps, msg.geo, function(err, apps, geo){
            if (err || !apps) {
                common.returnOutput(params, {error: 'Not such apps'});
            } else if (msg.geo && !geo) {
                common.returnOutput(params, {error: 'No such geolocation'});
            } else {
                if (adminOfApps(params.member, apps)) {

                    log.d('Creating message: %j', msg);

                    var message = new Message(msg.apps, _.pluck(apps, 'name'))
                        .setId(new common.db.ObjectID())
                        .setType(msg.type)
                        .setMessagePerLocale(msg.messagePerLocale)
                        .setLocales(msg.locales)
                        .setURL(msg.url)
                        .setCategory(msg.category)
                        .setUpdate(msg.update)
                        .setReview(msg.review)
                        .addPlatform(msg.platforms)
                        .setUserConditions(msg.userConditions)
                        .setDrillConditions(msg.drillConditions)
                        .setGeo(geo ? msg.geo : undefined)
                        .setSound(msg.sound)
                        .setBadge(msg.badge)
                        .setTest(msg.test)
                        .setContentAvailable(msg.contentAvailable)
                        .setNewsstandAvailable(msg.newsstandAvailable)
                        .setCollapseKey(msg.collapseKey)
                        .setDelayWhileIdle(msg.delayWhileIdle)
                        .setData(msg.data)
                        .schedule(msg.date);

                    let divider = new Divider(message);
                    divider.count(common.db, true).then((TOTALLY) => {
                        if (!TOTALLY || !TOTALLY.TOTALLY || TOTALLY.TOTALLY.TOTALLY) { // :)
                            common.returnOutput(params, {error: 'No push enabled users found for the selected apps-platforms-test combinations'});
                        } else {
                            message.result.total = TOTALLY.TOTALLY;
                            log.d('Saving message: %j', mess.cleanObj(message));
                            let json = mess.cleanObj(message);
                            if (msg.date) {
                                json.result.status = 2;
                            }
                            common.db.collection('messages').save(json, function(err) {
                                if (msg.date) {
                                    log.d('Scheduling push job on date %j', msg.date);
                                    if (msg.date) {
                                        jobs.job('push:send', {mid: message._id}).once(msg.date);
                                    } else {
                                        jobs.job('push:send', {mid: message._id}).now();
                                    }
                                } else {
                                    log.d('Scheduling push job now %j', msg.date);
                                    jobs.job('push:send', {mid: message._id}).now();
                                }
                                if (err) {
                                    common.returnOutput(params, {error: 'Server db Error'});
                                } else {
                                    common.returnOutput(params, message);
                                }
                            });
                        }
                    }, (err) => {
                        common.returnMessage(params, 500, err);
                    });
                } else {
                    common.returnOutput(params, {error: 'Not an admin of all selected apps'});
                }
            }
        });
        return true;
    };

    api.deleteMessage = function (params) {
        var argProps = {
                'mid': { 'required': true, 'type': 'String', 'min-length': 24, 'max-length': 24 }
            },
            mid;

        if (!(mid = common.validateArgs(params.qstring, argProps).mid)) {
            common.returnMessage(params, 400, 'Not enough args');
            return false;
        }

        common.db.collection('messages').findOne({'_id': common.db.ObjectID(mid)}, function(err, message) {
            if (!message) {
                common.returnMessage(params, 404, 'Message not found');
                return false;
            }

            if ((message.result.status & MessageStatus.InProcessing) > 0) {
                // if (message.pushly && message.pushly.length) {
                //     message.pushly.forEach(function(pushlyMessage){
                //         pushly.abort(pushlyMessage);
                //     });
                // }
                common.db.collection('messages').update({_id: message._id}, {$set: {'deleted': true}},function(){});
                message.deleted = true;
                common.returnOutput(params, message);
            } else {
                common.db.collection('messages').update({_id: message._id}, {$set: {'deleted': true}},function(){});
                common.returnOutput(params, message);
            }

            // TODO: need to delete analytics?

            return true;
        });

        return true;
    };

    api.refreshMessage = function (params) {
        var argProps = {
                'mid': { 'required': true, 'type': 'String', 'min-length': 24, 'max-length': 24 }
            },
            mid;

        if (!(mid = common.validateArgs(params.qstring, argProps).mid)) {
            common.returnMessage(params, 400, 'Not enough args');
            return false;
        }

        common.db.collection('messages').findOne({'_id': common.db.ObjectID(mid)}, function(err, message) {
            if (!message || (message.result.status & MessageStatus.Deleted) > 0) {
                common.returnMessage(params, 404, 'Message not found');
                return false;
            }

            common.returnOutput(params, message);

            return true;
        });

        return true;
    };

    api.processTokenSession = function(dbAppUser, params) {
        var $set = {}, $unset = {};

        if (params.qstring['locale']) {
            $set[common.dbUserMap['locale']] = params.qstring['locale'];
        }

        var token, field, bool;
        if (params.qstring.ios_token && typeof params.qstring.test_mode !== 'undefined') {
            token = params.qstring['ios_token'];
            field = common.dbUserMap.tokens + '.' + common.dbUserMap['apn_' + params.qstring.test_mode];
            bool  = common.dbUserMap.tokens + common.dbUserMap['apn_' + params.qstring.test_mode];
        } else if (params.qstring.android_token && typeof params.qstring.test_mode !== 'undefined') {
            token = params.qstring['android_token'];
            field = common.dbUserMap.tokens + '.' + common.dbUserMap['gcm_' + params.qstring.test_mode];
            bool  = common.dbUserMap.tokens + common.dbUserMap['gcm_' + params.qstring.test_mode];
        }

        if (field) {
            if (token) {
                $set[field] = token;
                $set[bool] = true;
                if (!dbAppUser) {
                    common.db.collection('app_users' + params.app_id).update({'_id':params.app_user_id}, {$set: $set}, {upsert: true}, function(){});
                } else if (common.dot(dbAppUser, field) != token) {
                    common.db.collection('app_users' + params.app_id).update({'_id':params.app_user_id}, {$set: $set}, {upsert: true}, function(){});

                    if (!dbAppUser[common.dbUserMap.tokens]) dbAppUser[common.dbUserMap.tokens] = {};
                    common.dot(dbAppUser, field, token);

                    processChangedMessagingToken(dbAppUser, params);
                }
            } else {
                $unset[field] = 1;
                $unset[bool] = 1;
                if (common.dot(dbAppUser, field)) {
                    common.db.collection('app_users' + params.app_id).update({'_id':params.app_user_id}, {$unset: $unset}, {upsert: false}, function(){});
                }
            }
        }

    };

    function processChangedMessagingToken(dbAppUser, params) {
        var updateUsersMonth = {},
            updateUsersZero = {},
            dbDateIds = common.getDateIds(params);

        var levels = [
            common.dbMap['messaging-enabled'],
        ];

        if (dbAppUser[common.dbUserMap['country_code']]) {
            levels.push(dbAppUser[common.dbUserMap['country_code']] + common.dbMap['messaging-enabled']);
        }

        // unique messaging sessions
        common.fillTimeObjectZero(params, updateUsersZero, levels);
        common.fillTimeObjectMonth(params, updateUsersMonth, levels);

        if (Object.keys(updateUsersZero).length) {
            common.db.collection('users').update({'_id': params.app_id + '_' + dbDateIds.zero}, {$set: {m: dbDateIds.zero, a: params.app_id + ''}, '$inc': updateUsersZero}, {'upsert': true}, function(){});
        }
        common.db.collection('users').update({'_id': params.app_id + '_' + dbDateIds.month}, {$set: {m: dbDateIds.month, a: params.app_id + ''}, '$inc': updateUsersMonth}, {'upsert': true}, function(){});
    }


    function adminOfApp(member, app) {
        if (member.global_admin) {
            return true;
        } else {
            return member.admin_of && member.admin_of.indexOf(app._id.toString()) !== -1;
        }
    }

    function adminOfApps(member, apps) {
        var authorized = true;

        apps.forEach(function(app){
            authorized &= adminOfApp(member, app);
        });

        return authorized;
    }

    function packMessages(msgs) {
        var msgsObj = {};

        for (var i = 0; i < msgs.length ;i++) {
            msgsObj[msgs[i]._id] = msgs[i];
        }

        return msgsObj;
    }

    function checkGCM(params, app) {
        api.check('' + app._id, 'a', false, function(ok){
            if (!ok) {
                common.returnOutput(params, {error: 'Invalid GCM key'});
            } else {
                common.returnOutput(params, app);
            }
        });
    }

    api.APNCertificateFile = function(appId, test) {
        return appId + (typeof test === 'undefined' ? '' : test ? '.test' : '.prod') + '.p12';
    };

    api.APNCertificatePath = function(appId, test) {
        return __dirname + '/../../../../frontend/express/certificates/' + api.APNCertificateFile(appId, test);
    };

}(api));

module.exports = api;
