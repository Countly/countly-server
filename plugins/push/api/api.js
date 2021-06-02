'use strict';

/*eslint no-console: 'off' */

var plugin = {},
    push = require('./parts/endpoints.js'),
    N = require('./parts/note.js'),
    C = require('./parts/credentials.js'),
    common = require('../../../api/utils/common.js'),
    log = common.log('push:api'),
    plugins = require('../../pluginManager.js'),
    countlyCommon = require('../../../api/lib/countly.common.js'),
    { validateCreate, validateRead, validateUpdate, validateDelete } = require('../../../api/utils/rights.js');

const FEATURE_NAME = 'push';
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
        common.dbUniqueMap.users.push(creds.DB_MAP['messaging-enabled']);
    }

    plugins.register("/permissions/features", function(ob) {
        ob.features.push(FEATURE_NAME);
    });

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
                                        a: m ? m.auto : undefined,
                                        t: m ? m.tx : undefined,
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
                events = events.filter(e => !!e.sg.i);

                let ids = events.map(e => e.sg.i);
                ids = ids.filter((id, i) => ids.indexOf(id) === i).map(common.db.ObjectID);

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

    plugins.register('/drill/preprocess_query', ({query, params}) => {
        if (query.push) {
            if (query.push.$nin) {
                query.$and = query.push.$nin.map(tk => {
                    return {$or: [{[tk]: false}, {[tk]: {$exists: false}}]};
                });
            }
            if (query.push.$in) {
                let q = query.push.$in.map(tk => {
                    return {[tk]: true};
                });
                query.$or = q;
            }
            delete query.push;
        }

        if (query.message) {
            let mid = query.message.$in || query.message.$nin,
                not = !!query.message.$nin;

            if (!mid) {
                return;
            }

            log.d(`removing message ${JSON.stringify(query.message)} from queryObject`);
            delete query.message;

            if (params && params.qstring.method === 'user_details') {
                return new Promise((res, rej) => {
                    try {
                        mid = mid.map(common.db.ObjectID);

                        let q = {msgs: {$elemMatch: {'0': {$in: mid}}}};
                        if (not) {
                            q = {msgs: {$not: q.msgs}};
                        }
                        common.db.collection(`push_${params.app_id}`).find(q, {projection: {_id: 1}}).toArray((err, ids) => {
                            if (err) {
                                rej(err);
                            }
                            else {
                                ids = (ids || []).map(id => id._id);
                                query.uid = {$in: ids};
                                log.d(`filtered by message: uids out of ${ids.length}`);
                                res();
                            }
                        });
                    }
                    catch (e) {
                        console.log(e);
                        rej(e);
                    }
                });
            }
        }
    });

    plugins.register('/drill/postprocess_uids', ({uids, params}) => new Promise((res, rej) => {
        let message = params.initialQueryObject && params.initialQueryObject.message;
        if (uids.length && message) {
            log.d(`filtering ${uids.length} uids by message`);

            let q;
            if (message.$in) {
                q = {_id: {$in: uids}, msgs: {$elemMatch: {'0': {$in: message.$in.map(common.db.ObjectID)}}}};
            }
            else if (message.$nin) {
                q = {$and: [{_id: {$in: uids}}, {msgs: {$not: {$elemMatch: {'0': {$in: message.$nin.map(common.db.ObjectID)}}}}}]};
            }
            else {
                q = {_id: {$in: uids}, msgs: {$elemMatch: {'0': {$in: message.map(common.db.ObjectID)}}}};
            }

            return common.db.collection(`push_${params.app_id}`).find(q, {projection: {_id: 1}}).toArray((err, ids) => {
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
                common.db.collection('messages').find({$or: [{auto: true}, {tx: true}], 'result.status': {$bitsAllSet: N.Status.Scheduled, $bitsAllClear: N.Status.Deleted | N.Status.Aborted}}).toArray((err, arr) => {
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
            log.d(`Merging push data of ${ouid} into ${nuid}`);
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
                    log.d('Merging %j into %j', ou, nu);
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
                    log.d('No new uid, setting old');
                    update.$set = ou;
                    opts.upsert = true;
                    delete update.$set._id;
                }
                else if (ou && Object.keys(ou).length === 1 && !nu) {
                    log.d('Empty old uid, nothing to merge');
                }
                else if (!ou && nu) {
                    log.d('No old uid, nothing to merge');
                }
                else {
                    log.d('Nothing to merge at all');
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
                                date = new Date(params.qstring.events.filter(e => e.key === evs[0])[0].timestamp).toString();
                                if (date === 'Invalid Date') {
                                    date = new Date().toString();
                                }
                            }
                            else {
                                date = new Date().toString();
                            }
                            push.onEvent(params.app_id, params.app_user.uid, params.qstring.events.filter(e => e.key === evs[0])[0], date, note).catch(log.e.bind(log));
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
                    common.db.collection('messages').find({_id: {$in: msgIds}}, {auto: 1, tx: 1}).toArray(function(err, msgs) {
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
                                    event.segmentation.t = msg.tx || false;

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
            paths = ob.paths;
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
            validateRead(params, FEATURE_NAME, push.dashboard, params);
            break;
        case 'prepare':
            validateUpdate(params, FEATURE_NAME, push.prepare, params);
            break;
        case 'create':
            validateCreate(params, FEATURE_NAME, push.create, params);
            break;
        case 'push':
            validateCreate(params, FEATURE_NAME, push.push, params);
            break;
        case 'pop':
            validateCreate(params, FEATURE_NAME, push.pop, params);
            break;
        case 'message':
            validateRead(params, FEATURE_NAME, push.message, params);
            break;
        case 'active':
            validateUpdate(params, FEATURE_NAME, push.active, params);
            break;
        case 'delete':
            validateDelete(params, FEATURE_NAME, push.delete, params);
            break;
        case 'mime':
            validateRead(params, FEATURE_NAME, push.mimeInfo, params);
            break;
        case 'huawei':
            push.huawei(params);
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
        var params = ob.params;

        if (params.qstring.args) {
            try {
                params.qstring.args = JSON.parse(params.qstring.args);
            }
            catch (SyntaxError) {
                console.log('Parse /o/pushes JSON failed');
            }
        }

        validateRead(params, FEATURE_NAME, push.getAllMessages);
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
                secInMin = (60 * (currDate.minutes())) + currDate.seconds(),
                secInHour = (60 * 60 * (currDate.hours())) + secInMin,
                secInMonth = (60 * 60 * 24 * (currDate.date() - 1)) + secInHour,
                secInYear = (60 * 60 * 24 * (common.getDOY(params.time.timestamp, params.appTimezone) - 1)) + secInHour;

            if (userLastSeenTimestamp < (params.time.timestamp - secInMin) && messagingTokenKeys(dbAppUser).length) {
                updateUsersMonth['d.' + params.time.day + '.' + params.time.hour + '.' + common.dbMap['messaging-enabled']] = 1;
            }

            if (userLastSeenTimestamp < (params.time.timestamp - secInHour) && messagingTokenKeys(dbAppUser).length) {
                updateUsersMonth['d.' + params.time.day + '.' + common.dbMap['messaging-enabled']] = 1;
            }

            if (userLastSeenDate.year() === parseInt(params.time.yearly) &&
                Math.ceil(userLastSeenDate.format('DDD') / 7) < params.time.weekly && messagingTokenKeys(dbAppUser).length) {
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
                /* OLD
                common.db.collection('users').update({'_id': params.app_id + '_' + dbDateIds.zero + '_' + postfix}, {$set: {m: dbDateIds.zero, a: params.app_id + ''}, '$inc': updateUsersZero}, {'upsert': true}, function() {});
				*/
                common.writeBatcher.add('users', params.app_id + '_' + dbDateIds.zero + '_' + postfix, {$set: {m: dbDateIds.zero, a: params.app_id + ''}, '$inc': updateUsersZero});
            }
            if (Object.keys(updateUsersMonth).length) {
                /* OLD
                common.db.collection('users').update({'_id': params.app_id + '_' + dbDateIds.month + '_' + postfix}, {$set: {m: dbDateIds.month, a: params.app_id + ''}, '$inc': updateUsersMonth}, {'upsert': true}, function() {});
				*/
                common.writeBatcher.add('users', params.app_id + '_' + dbDateIds.month + '_' + postfix, {$set: {m: dbDateIds.month, a: params.app_id + ''}, '$inc': updateUsersMonth});
            }
        }
    });

    plugins.register('/i/apps/update/plugins/push', push.appPluginsUpdate);

    plugins.register('/i/apps/reset', function(ob) {
        var appId = ob.appId;
        common.db.collection('messages').remove({'apps': [common.db.ObjectID(appId)]}, function() {});
        common.db.collection(`push_${appId}`).drop({}, function() {});
        C.FIELDS.forEach(f => {
            common.db.collection(`push_${appId}_${f}`).drop({}, function() {});
        });
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
        common.db.collection(`push_${appId}`).drop({}, function() {});
        C.FIELDS.forEach(f => {
            common.db.collection(`push_${appId}_${f}`).drop({}, function() {});
        });
        // common.db.collection('credentials').remove({'apps': [common.db.ObjectID(appId)]},function(){});
    });

    plugins.register('/i/apps/delete', function(ob) {
        var appId = ob.appId;
        common.db.collection('messages').remove({'apps': [common.db.ObjectID(appId)]}, function() {});
        common.db.collection(`push_${appId}`).drop({}, function() {});
        C.FIELDS.forEach(f => {
            common.db.collection(`push_${appId}_${f}`).drop({}, function() {});
        });
    });

    plugins.register('/consent/change', ({params, changes}) => {
        if (changes && changes.push === false && params.app_id && params.app_user && params.app_user.uid !== undefined) {
            push.removeUser(params.app_id, params.app_user.uid);
        }
    });

    plugins.register('/i/app_users/delete', ({app_id, uids}) => {
        if (uids && uids.length) {
            uids.forEach(uid => {
                push.removeUser(app_id, uid);
            });
        }
    });

    plugins.register('/i/app_users/export', ({app_id, uids, export_commands, dbargs, export_folder}) => {
        if (uids && uids.length) {
            if (!export_commands.push) {
                export_commands.push = [{cmd: 'mongoexport', args: [...dbargs, '--collection', `push_${app_id}`, '-q', `{"uid": {"$in": ${JSON.stringify(uids)}}}`, '--out', `${export_folder}/push_${app_id}.json`]}];
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