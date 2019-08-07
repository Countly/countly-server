'use strict';

/*eslint no-console: 'off' */

var plugin = {},
    push = require('./parts/endpoints.js'),
    N = require('./parts/note.js'),
    common = require('../../../api/utils/common.js'),
    log = common.log('push:api'),
    plugins = require('../../pluginManager.js'),
    countlyCommon = require('../../../api/lib/countly.common.js');

const PUSH_CACHE_GROUP = 'P';

(function() {

    plugins.setConfigs("push", {
        proxyhost: "",
        proxyport: "",
        proxyuser: "",
        proxypass: "",
    });

    plugins.internalEvents.push('[CLY]_push_sent');
    plugins.internalEvents.push('[CLY]_push_action');
    plugins.internalDrillEvents.push('[CLY]_push_action');

    /** function sets up commons */
    function setUpCommons() {
        let creds = require('./parts/credentials.js');
        for (let k in creds.DB_MAP) {
            common.dbMap[k] = creds.DB_MAP[k];
        }
        for (let k in creds.DB_USER_MAP) {
            common.dbUserMap[k] = creds.DB_USER_MAP[k];
        }
    }

    plugins.register('/worker', function() {
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

        push.cache = common.cache.cls(PUSH_CACHE_GROUP);
    });

    plugins.register('/master', function() {
        setUpCommons();

        plugins.register('/cohort/enter', ({cohort, uids}) => {
            push.onCohort(true, cohort, uids);
        });

        plugins.register('/cohort/exit', ({cohort, uids}) => {
            push.onCohort(false, cohort, uids);
        });

        push.cache = common.cache.cls(PUSH_CACHE_GROUP);
    });

    plugins.register('/drill/add_push_events', ({uid, params, events, event}) => {
        return new Promise((res, rej) => {
            if (event === '[CLY]_push_sent') {
                common.db.collection(`push_${params.app_id}`).findOne({_id: uid, msgs: {$elemMatch: {'1': countlyCommon.getTimestampRangeQuery(params)}}}, (err, pu) => {
                    if (err) {
                        rej(err);
                    }
                    else if (pu) {
                        let ids = pu.msgs.map(([_id]) => _id);
                        ids = ids.filter((id, i) => ids.indexOf(id) === i);

                        common.db.collection('messages').find({_id: {$in: ids}}).toArray((er, msgs) => {
                            if (er) {
                                return rej(er);
                            }

                            pu.msgs.forEach(([_id, ts]) => {
                                let m = msgs.filter(msg => msg._id.toString() === _id.toString())[0];
                                events.push({
                                    _id: _id,
                                    key: '[CLY]_push_sent',
                                    ts: ts,
                                    cd: ts,
                                    c: 1,
                                    s: 0,
                                    dur: 0,
                                    sg: {
                                        i: m,
                                        a: m ? m.auto : undefined
                                    },
                                });
                            });

                            res();
                        });

                        // let ids = push.msgs.map(m => m[0]);
                        // common.db.collection('messages').find({_id: {$in: ids}}).toArray((e, msgs) => {

                        // });
                    }
                    else {
                        res();
                    }
                });
            }
            else if (event === '[CLY]_push_action') {
                let ids = events.map(e => e.sg.i);
                ids = ids.filter((id, i) => ids.indexOf(id) === i).map(id => common.db.ObjectID(id));

                common.db.collection('messages').find({_id: {$in: ids}}).toArray((err, msgs) => {
                    if (err) {
                        return rej(err);
                    }

                    events.forEach(e => {
                        e.sg.i = msgs.filter(m => m._id.toString() === e.sg.i.toString())[0];
                    });

                    res();
                });
            }
        });
    });

    plugins.register('/drill/preprocess_query', ({query}) => {
        if (query.message) {
            log.d(`removing message ${query.message} from queryObject`);
            delete query.message;
        }
    });

    plugins.register('/drill/postprocess_uids', ({uids, params}) => new Promise((res, rej) => {
        if (uids.length && params.initialQueryObject && params.initialQueryObject.message) {
            log.d(`filtering ${uids.length} uids by message`);
            return common.db.collection(`push_${params.app_id}`).find({_id: {$in: uids}, msgs: {$elemMatch: {'0': common.db.ObjectID(params.initialQueryObject.message)}}}, {projection: {_id: 1}}).toArray((err, ids) => {
                if (err) {
                    rej(err);
                }
                else {
                    ids = (ids || []).map(id => id._id);
                    log.d(`filtered by message: now ${ids.length} uids out of ${uids.length}`);
                    uids.splice(0, uids.length, ...ids);
                    res();
                }
            });
        }

        res();
    }));



    plugins.register('/cache/init', function() {
        common.cache.init(PUSH_CACHE_GROUP, {
            init: () => new Promise((res, rej) => {
                common.db.collection('messages').find({auto: true, 'result.status': {$bitsAllSet: N.Status.Scheduled, $bitsAllClear: N.Status.Deleted | N.Status.Aborted}}).toArray((err, arr) => {
                    err ? rej(err) : res(arr.map(m => [m._id.toString(), m]));
                });
            }),
            read: k => new Promise((res, rej) => {
                log.d('cache: reading', k);
                common.db.collection('messages').findOne({_id: typeof k === 'string' ? common.db.ObjectID(k) : k}, (err, obj) => {
                    err ? rej(err) : res(obj);
                });
            }),
            write: (k, data) => new Promise((res) => {
                data._id = data._id || k;
                log.d('cache: writing', k, data);
                res(data);
                // log.d('cache: writing', k, data);
                // db.collection('messages').insertOne(data, (err, obj) => {
                //     data._id = !err && (data._id || obj.insertedId);
                //     err ? rej(err) : res(data);
                // });
            }),
            remove: (/*k, data*/) => new Promise(res => {
                res(true);
            }),
            update: (/*k, data*/) => new Promise((res, rej) => {
                rej(new Error('We don\'t update cached messages'));
                // log.d('cache: updating', k, data);
                // db.collection('messages').findAndModify({_id: typeof data._id === 'string' ? common.db.ObjectID(data._id) : data._id}, [['_id', 1]], {$set: data}, {new: true}, (err, doc) => {
                //     if (err) {
                //         rej(err);
                //     }
                //     else if (!doc || !doc.ok || !doc.value) {
                //         res(null);
                //     }
                //     else {
                //         res(doc.value);
                //     }
                // });
            })
        });
    });

    plugins.register('/i/device_id', ({app_id, oldUser, newUser}) => {
        let ouid = oldUser.uid,
            nuid = newUser.uid;

        if (ouid && nuid) {
            log.i(`Merging push data of ${ouid} into ${nuid}`);
            common.db.collection(`push_${app_id}`).find({_id: {$in: [ouid, nuid]}}).toArray((err, users) => {
                if (err || !users) {
                    log.e('Couldn\'t load users to merge', err);
                    return;
                }

                let ou = users.filter(u => u._id === ouid)[0],
                    nu = users.filter(u => u._id === nuid)[0],
                    update = {},
                    opts = {};

                if (ou && nu) {
                    log.i('Merging %j into %j', ou, nu);
                    if (ou.tk && Object.keys(ou.tk).length) {
                        update.$set = {};
                        for (let k in ou.tk) {
                            update.$set['tk.' + k] = ou.tk[k];
                        }
                    }
                    if (ou.msgs && ou.msgs.length) {
                        let ids = nu.msgs && nu.msgs.map(m => m[0].toString()) || [],
                            msgs = [];

                        ou.msgs.forEach(m => {
                            if (ids.indexOf(m[0].toString()) === -1) {
                                msgs.push(m);
                            }
                        });

                        if (msgs.length) {
                            update.$push = {msgs: {$each: msgs}};
                        }
                    }
                }
                else if (ou && Object.keys(ou).length > 1 && !nu) {
                    log.i('No new uid, setting old');
                    update.$set = ou;
                    opts.upsert = true;
                    delete update.$set._id;
                }
                else if (ou && Object.keys(ou).length === 1 && !nu) {
                    log.i('Empty old uid, nothing to merge');
                }
                else if (!ou && nu) {
                    log.i('No old uid, nothing to merge');
                }
                else {
                    log.i('Nothing to merge at all');
                }

                if (ou) {
                    log.d('Removing old push data for %s', ou._id);
                    common.db.collection(`push_${app_id}`).deleteOne({_id: ou._id}, e => e && log.e('Error while deleting old uid push data', e));
                }
                if (Object.keys(update).length) {
                    log.d('Updating push data for %s: %j', nuid, update);
                    common.db.collection(`push_${app_id}`).updateOne({_id: nuid}, update, opts, e => e && log.e('Error while updating new uid with push data', e));
                }
            });
        }
    });

    //write api call
    plugins.register('/i', function(ob) {
        var params = ob.params;
        if (params.qstring.events && Array.isArray(params.qstring.events)) {
            let keys = params.qstring.events.map(e => e.key);

            keys = keys.filter((k, i) => keys.indexOf(k) === i);

            push.cache.iterate((k, data) => {
                if (data.apps.indexOf(params.app_id.toString()) !== -1) {
                    let evs = data.autoEvents && data.autoEvents.filter(ev => keys.indexOf(ev) !== -1) || [];
                    if (evs.length) {
                        N.Note.load(common.db, k).then(note => {
                            let date = Date.now();
                            if (note.actualDates) {
                                date = params.qstring.events.filter(e => e.key === evs[0])[0].timestamp;
                            }
                            push.onEvent(params.app_id, params.app_user.uid, evs[0], date, note).catch(log.e.bind(log));
                        }, e => {
                            log.e('Couldn\'t load notification %s', k, e);
                        });
                    }
                }
            });
        }
        if (params.qstring.events && Array.isArray(params.qstring.events)) {
            var pushEvents = params.qstring.events.filter(e => e.key && e.key.indexOf('[CLY]_push_') === 0 && e.segmentation && e.segmentation.i && e.segmentation.i.length === 24),
                msgIds = pushEvents.map(e => common.db.ObjectID(e.segmentation.i));
            if (msgIds.length) {
                return new Promise((resolve, reject) => {
                    common.db.collection('messages').find({_id: {$in: msgIds}}, {auto: 1}).toArray(function(err, msgs) {
                        if (err) {
                            log.e('Error while looking for a message: %j', err);
                            reject(err);
                        }
                        else {
                            pushEvents.forEach(event => {
                                var msg = msgs.filter(msg1 => ('' + msg1._id) === event.segmentation.i)[0],
                                    inc = {};
                                if (msg) {
                                    event.segmentation.a = msg.auto || false;

                                    if (event.key === '[CLY]_push_open') {
                                        inc['result.delivered'] = event.count;
                                    }
                                    else if (event.key === '[CLY]_push_action') {
                                        inc['result.actioned'] = event.count;
                                        if (event.segmentation && event.segmentation.b !== undefined) {
                                            inc['result.actioned|' + event.segmentation.b] = event.count;
                                        }
                                    }
                                    common.db.collection('messages').update({_id: msg._id}, {$inc: inc}, function() {});
                                }
                            });
                            resolve();
                        }
                    });

                });
            }
        }
        if (params.qstring.token_session) {
            push.processTokenSession(params.app_user, params);
        }
    });

    plugins.register('/i/pushes', function(ob) {
        var params = ob.params,
            paths = ob.paths,
            validateUserForWriteAPI = ob.validateUserForWriteAPI;
        if (params.qstring.args) {
            try {
                params.qstring.args = JSON.parse(params.qstring.args);
            }
            catch (SyntaxError) {
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
        case 'create':
            validateUserForWriteAPI(push.create, params);
            break;
        case 'push':
            validateUserForWriteAPI(push.push, params);
            break;
        case 'pop':
            validateUserForWriteAPI(push.pop, params);
            break;
        case 'message':
            validateUserForWriteAPI(push.message, params);
            break;
        case 'active':
            validateUserForWriteAPI(push.active, params);
            break;
        case 'delete':
            validateUserForWriteAPI(push.delete, params);
            break;
        case 'mime':
            validateUserForWriteAPI(push.mimeInfo, params);
            break;
        // case 'download':
        //     validateUserForWriteAPI(push.download.bind(push, params, paths[4]), params);
        //     break;
        default:
            common.returnMessage(params, 404, 'Invalid endpoint');
            break;
        }
        return true;
    });

    plugins.register('/o/pushes', function(ob) {
        var params = ob.params,
            validateUserForWriteAPI = ob.validateUserForWriteAPI;

        if (params.qstring.args) {
            try {
                params.qstring.args = JSON.parse(params.qstring.args);
            }
            catch (SyntaxError) {
                console.log('Parse /o/pushes JSON failed');
            }
        }

        validateUserForWriteAPI(push.getAllMessages, params);
        return true;
    });

    plugins.register('/session/user', function(ob) {
        var params = ob.params,
            dbAppUser = ob.dbAppUser;
        var updateUsersZero = {},
            updateUsersMonth = {},
            dbDateIds = common.getDateIds(params);

        if (dbAppUser && dbAppUser[common.dbUserMap.first_seen]) {
            var userLastSeenTimestamp = dbAppUser[common.dbUserMap.last_seen],
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

            if (userLastSeenDate.getFullYear() === parseInt(params.time.yearly) &&
                Math.ceil(common.moment(userLastSeenDate).tz(params.appTimezone).format('DDD') / 7) < params.time.weekly && messagingTokenKeys(dbAppUser).length) {
                updateUsersZero['d.w' + params.time.weekly + '.' + common.dbMap['messaging-enabled']] = 1;
            }

            if (userLastSeenTimestamp < (params.time.timestamp - secInMonth) && messagingTokenKeys(dbAppUser).length) {
                updateUsersZero['d.' + params.time.month + '.' + common.dbMap['messaging-enabled']] = 1;
            }

            if (userLastSeenTimestamp < (params.time.timestamp - secInYear) && messagingTokenKeys(dbAppUser).length) {
                updateUsersZero['d.' + common.dbMap['messaging-enabled']] = 1;
            }
            var postfix = common.crypto.createHash('md5').update(params.qstring.device_id).digest('base64')[0];
            if (Object.keys(updateUsersZero).length) {
                common.db.collection('users').update({'_id': params.app_id + '_' + dbDateIds.zero + '_' + postfix}, {$set: {m: dbDateIds.zero, a: params.app_id + ''}, '$inc': updateUsersZero}, {'upsert': true}, function() {});
            }
            if (Object.keys(updateUsersMonth).length) {
                common.db.collection('users').update({'_id': params.app_id + '_' + dbDateIds.month + '_' + postfix}, {$set: {m: dbDateIds.month, a: params.app_id + ''}, '$inc': updateUsersMonth}, {'upsert': true}, function() {});
            }
        }
    });

    plugins.register('/i/apps/update/plugins/push', push.appPluginsUpdate);

    plugins.register('/i/apps/reset', function(ob) {
        var appId = ob.appId;
        common.db.collection('messages').remove({'apps': [common.db.ObjectID(appId)]}, function() {});
        common.db.collection(`push_${appId}`).deleteMany({}, function() {});
        common.db.collection('apps').findOne({_id: common.db.ObjectID(appId)}, function(err, app) {
            if (err || !app) {
                return log.e('Cannot find app: %j', err || 'no app');
            }

            if (app.plugins && app.plugins.push) {
                common.db.collection('apps').updateOne({_id: app._id}, {$unset: {'plugins.push': 1}}, () => {});
            }
        });
    });

    plugins.register('/i/apps/clear_all', function(ob) {
        var appId = ob.appId;
        common.db.collection('messages').remove({'apps': [common.db.ObjectID(appId)]}, function() {});
        common.db.collection(`push_${appId}`).deleteMany({}, function() {});
        // common.db.collection('credentials').remove({'apps': [common.db.ObjectID(appId)]},function(){});
    });

    plugins.register('/i/apps/delete', function(ob) {
        var appId = ob.appId;
        common.db.collection('messages').remove({'apps': [common.db.ObjectID(appId)]}, function() {});
        common.db.collection(`push_${appId}`).drop({}, function() {});
        common.db.collection(`push_${appId}_id`).drop({}, function() {});
        common.db.collection(`push_${appId}_ia`).drop({}, function() {});
        common.db.collection(`push_${appId}_ip`).drop({}, function() {});
        common.db.collection(`push_${appId}_at`).drop({}, function() {});
        common.db.collection(`push_${appId}_ap`).drop({}, function() {});
    });

    plugins.register('/consent/change', ({params, changes}) => {
        push.onConsentChange(params, changes);
    });

    plugins.register('/i/app_users/delete', ({app_id, uids}) => {
        if (uids && uids.length) {
            common.db.collection(`push_${app_id}`).deleteMany({_id: {$in: uids}}, function() {});
        }
    });

    plugins.register('/i/app_users/export', ({app_id, uids, export_commands, dbstr, export_folder}) => {
        if (uids && uids.length) {
            if (!export_commands.push) {
                export_commands.push = [`mongoexport ${dbstr} --collection push_${app_id} -q '{uid: {$in: ${JSON.stringify(uids)}}}' --out ${export_folder}/push_${app_id}.json`];
            }
        }
    });

    /**collects messaging token keys
     * @param {object} dbAppUser - data
     * @returns {array} list of tokens
     */
    function messagingTokenKeys(dbAppUser) {
        var a = [];
        for (var k in dbAppUser[common.dbUserMap.tokens]) {
            a.push(common.dbUserMap.tokens + '.' + k);
        }
        return a;
    }
}(plugin));

module.exports = plugin;