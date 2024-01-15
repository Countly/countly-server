/* eslint-disable no-inner-declarations */
const { CentralMaster, CentralWorker } = require('../../../api/parts/jobs/ipc');

const common = require('../../../api/utils/common'),
    log = common.log('push:api:push'),
    Sender = require('./send/sender'),
    { extract, field, allAppUserFields, platforms, PLATFORM, ValidationError, Creds, DBMAP } = require('./send');

const CMD_PUSH_TOKEN_SESSION = 'push_token_session',
    queue = {};
let queue_size = 0,
    timeouts_size = 0,
    queue_print = Date.now(),
    ipc;

if (require('cluster').isMaster) {
    ipc = new CentralMaster(CMD_PUSH_TOKEN_SESSION, function(msg) {
        let id = msg.app_id + msg.uid + msg.p + msg.f;
        if (queue[id]) {
            if (queue[id].token !== msg.token) {
                // ensure token reset or token chanage is processed (processing for this user might be already running)
                queue[id + Math.random()] = msg;
                queue_size++;
            }
            else {
                // duplicate token is ignored
            }
        }
        else {
            queue[id] = msg;
            queue_size++;
        }
    });

    /**
     * Take next token from queue and process it
     */
    function next() {
        try {
            if (Date.now() - queue_print > 60000) {
                log.d('token_session queue size is %d (%d setTimeouts)', queue_size, timeouts_size);
                queue_print = Date.now();
            }
            let arr = [],
                take = 0;
            if (queue_size < 100) {
                take = 1;
            }
            else if (queue_size < 300) {
                take = 5;
                log.d('setting batch size for token_session to %d', take);
            }
            else {
                take = 100;
                log.w('setting batch size for token_session to %d', take);
            }

            for (const k in queue) {
                arr.push(k);
                if (arr.length >= take) {
                    break;
                }
            }
            if (arr.length) {
                Promise.all(arr.map(async k => {
                    try {
                        await processTokenSession(queue[k]);
                    }
                    catch (e) {
                        log.e('Error in processTokenSession for %j', queue[k], e);
                    }
                    delete queue[k];
                    queue_size--;
                })).catch(() => {}).then(() => next());
                return;
            }
        }
        catch (e) {
            log.e('Error in processTokenSession/next', e);
        }

        setTimeout(next, 1000);
    }

    next();
}
else {
    ipc = new CentralWorker(CMD_PUSH_TOKEN_SESSION, () => {});
}
ipc.attach();

/**
 * Process token session request
 * 
 * @param {Object} msg IPC message
 */
async function processTokenSession(msg) {
    let {p, f, token, hash, app_id, uid, app_user_id} = msg,
        appusersField = field(p, f, true),
        pushField = field(p, f, false),
        pushCollection = common.db.collection(`push_${app_id}`),
        appusersCollection = common.db.collection(`app_users${app_id}`);

    log.d('push token: %s/%s/%s', p, f, token);

    let push = await pushCollection.findOne({_id: uid}, {projection: {[field]: 1}});
    if (token && (!push || common.dot(push, pushField) !== token)) {
        appusersCollection.updateOne({_id: app_user_id}, {$set: {[appusersField]: hash}}, () => {}); // don't wait
        pushCollection.updateOne({_id: uid}, {$set: {[pushField]: token}}, {upsert: true}, () => {});

        appusersCollection.find({[appusersField]: hash, _id: {$ne: app_user_id}}, {uid: 1}).toArray(function(err, docs) {
            if (err) {
                log.e('Failed to look for same tokens', err);
            }
            else if (docs && docs.length) {
                log.d('Found %d hash duplicates for token %s', docs.length, token);
                // the hash is 32 bit, not enough randomness for strict decision to unset tokens, comparing actual token strings
                pushCollection.find({_id: {$in: docs.map(d => d.uid)}}, {[`tk.${p + f}`]: 1}).toArray(function(err2, pushes) {
                    if (err2) {
                        log.e('Failed to look for same tokens', err2);
                    }
                    else if (pushes && pushes.length) {
                        pushes = pushes.filter(user => user._id !== uid && user.tk[p + f] === token);
                        if (pushes.length) {
                            log.d('Unsetting same tokens (%s) for users %j', token, pushes.map(x => x._id));

                            appusersCollection.updateMany({uid: {$in: pushes.map(x => x._id)}}, {$unset: {[appusersField]: 1}}, () => {});
                            pushCollection.updateOne({_id: {$in: pushes.map(x => x._id)}}, {$unset: {[pushField]: 1}}, () => {});
                        }
                    }
                });
            }
        });

        timeouts_size++;
        setTimeout(() => {
            common.db.collection(`app_users${app_id}`).findOne({_id: app_user_id}, {projection: {_id: 1}}, (er, user) => {
                if (er) {
                    log.e('Error while loading user', er);
                }
                else if (!user) {
                    log.w('Removing stale push_%s record for user %s/%s', app_id, app_user_id, uid);
                    common.db.collection(`push_${app_id}`).deleteOne({_id: uid}, () => {});
                }
                timeouts_size--;
            });
        }, 10000);
    }
    else {
        appusersCollection.updateOne({_id: app_user_id}, {$unset: {[appusersField]: 1}}, function() {});
        pushCollection.updateOne({_id: uid}, {$unset: {[pushField]: 1}}, function() {});
    }
}

module.exports.onTokenSession = async(dbAppUser, params) => {
    let stuff = extract(params.qstring);
    if (stuff) {
        let [p, f, token, hash] = stuff;
        ipc.send({to: 0, cmd: CMD_PUSH_TOKEN_SESSION, p, f, token, hash, uid: dbAppUser.uid, app_id: params.app_id, app_user_id: params.app_user_id});
    }
};

module.exports.onSessionUser = ({params, dbAppUser}) => {
    if (dbAppUser && dbAppUser[common.dbUserMap.first_seen]) {
        let hasTokens = false,
            platfs = [];
        allAppUserFields.forEach(f => {
            if (dbAppUser[f]) {
                hasTokens = true;
                platfs.push(f.substring(0, 1));
            }
        });

        if (!hasTokens) {
            return;
        }

        platfs = platfs.filter((p, i) => platfs.indexOf(p) === i);

        let updateUsersZero = {},
            updateUsersMonth = {},
            dbDateIds = common.getDateIds(params),
            userLastSeenTimestamp = dbAppUser[common.dbUserMap.last_seen],
            currDate = common.getDate(params.time.timestamp, params.appTimezone),
            userLastSeenDate = common.getDate(userLastSeenTimestamp, params.appTimezone),
            secInMin = (60 * (currDate.minutes())) + currDate.seconds(),
            secInHour = (60 * 60 * (currDate.hours())) + secInMin,
            secInMonth = (60 * 60 * 24 * (currDate.date() - 1)) + secInHour,
            secInYear = (60 * 60 * 24 * (common.getDOY(params.time.timestamp, params.appTimezone) - 1)) + secInHour;

        if (userLastSeenTimestamp < (params.time.timestamp - secInMin)) {
            updateUsersMonth['d.' + params.time.day + '.' + params.time.hour + '.' + DBMAP.MESSAGING_ENABLED] = 1;
            platfs.forEach(p => updateUsersMonth['d.' + params.time.day + '.' + params.time.hour + '.' + DBMAP.MESSAGING_ENABLED + p] = 1);
        }

        if (userLastSeenTimestamp < (params.time.timestamp - secInHour)) {
            updateUsersMonth['d.' + params.time.day + '.' + DBMAP.MESSAGING_ENABLED] = 1;
            platfs.forEach(p => updateUsersMonth['d.' + params.time.day + '.' + DBMAP.MESSAGING_ENABLED + p] = 1);
        }

        if (userLastSeenDate.year() === parseInt(params.time.yearly, 10) && Math.ceil(userLastSeenDate.format('DDD') / 7) < params.time.weekly) {
            updateUsersZero['d.w' + params.time.weekly + '.' + DBMAP.MESSAGING_ENABLED] = 1;
            platfs.forEach(p => updateUsersZero['d.w' + params.time.weekly + '.' + DBMAP.MESSAGING_ENABLED + p] = 1);
        }

        if (userLastSeenTimestamp < (params.time.timestamp - secInMonth)) {
            updateUsersZero['d.' + params.time.month + '.' + DBMAP.MESSAGING_ENABLED] = 1;
            platfs.forEach(p => updateUsersZero['d.' + params.time.month + '.' + DBMAP.MESSAGING_ENABLED + p] = 1);
        }

        if (userLastSeenTimestamp < (params.time.timestamp - secInYear)) {
            updateUsersZero['d.' + DBMAP.MESSAGING_ENABLED] = 1;
            platfs.forEach(p => updateUsersZero['d.' + DBMAP.MESSAGING_ENABLED + p] = 1);
        }

        if (Object.keys(updateUsersZero).length) {
            let postfix = common.crypto.createHash('md5').update(params.qstring.device_id).digest('base64')[0];
            common.writeBatcher.add('users', params.app_id + '_' + dbDateIds.zero + '_' + postfix, {$set: {m: dbDateIds.zero, a: params.app_id + ''}, '$inc': updateUsersZero});
        }

        if (Object.keys(updateUsersMonth).length) {
            let postfix = common.crypto.createHash('md5').update(params.qstring.device_id).digest('base64')[0];
            common.writeBatcher.add('users', params.app_id + '_' + dbDateIds.month + '_' + postfix, {$set: {m: dbDateIds.month, a: params.app_id + ''}, '$inc': updateUsersMonth});
        }
    }
};

module.exports.onAppPluginsUpdate = async({params, app, config}) => {
    log.d('Updating app %s config: %j', app._id, config);
    if (!app.plugins) {
        app.plugins = {};
    }
    if (!app.plugins.push) {
        app.plugins.push = {};
    }
    let pushcfg = app.plugins.push;
    let old = JSON.stringify(pushcfg);
    for (let i = 0; i < platforms.length; i++) {
        let p = platforms[i],
            c = config[p];

        if (c === null) { // delete credentials
            log.d('Unsetting %s config for app %s', p, app._id);
            if (pushcfg[p] && pushcfg[p]._id) {
                await Creds.deleteOne({_id: common.db.ObjectID(pushcfg[p]._id)});
            }
            pushcfg[p] = {};
            await common.db.collection('apps').updateOne({_id: app._id}, {$set: {[`plugins.push.${p}`]: {}}});
        }
        else if (c && c.type && !c.hash) { // new credentials
            if (PLATFORM[p].CREDS[c.type]) {
                log.i('Checking %s / %s credentials', p, c.type);
                // check credentials for validity
                let creds = new PLATFORM[p].CREDS[c.type](c),
                    errors = creds.validate(),
                    cfg = await Sender.loadConfig();
                if (errors) {
                    throw new ValidationError(errors);
                }
                log.i('Checking %s / %s credentials: validation passed', p, c.type);

                // verify connectivity with the credentials given
                let connection = new PLATFORM[p].connection('push:api:push', p + 'p', creds, [], cfg),
                    valid = await connection.connect();
                if (valid) {
                    log.i('Checking %s / %s credentials: provider check passed', p, c.type);
                }
                else {
                    log.i('Checking %s / %s credentials: provider check failed', p, c.type);
                    connection.destroy();
                    throw new ValidationError('Credentials were rejected by push notification provider');
                }

                // insert/update new credentials while removing old ones
                if (pushcfg[p] && pushcfg[p]._id) {
                    await Creds.deleteOne({_id: common.db.ObjectID(pushcfg[p]._id)});
                }
                creds._id = common.db.ObjectID();
                pushcfg[p] = creds.view;
                await creds.save();
                await common.db.collection('apps').updateOne({_id: app._id}, {$set: {[`plugins.push.${p}`]: creds.view}});
                log.d('Checking %s / %s credentials: saved', p, c.type);

                connection.destroy();
            }
            else {
                throw new ValidationError('Wrong credentials type');
            }
        }
    }

    if (config.rate !== undefined) {
        let update = {};
        if (config.rate) {
            pushcfg.rate = pushcfg.rate || {};
            config.rate.rate = config.rate.rate ? parseInt(config.rate.rate, 10) : 0;
            config.rate.period = config.rate.period ? parseInt(config.rate.period, 10) : 0;

            if (config.rate.rate) {
                update.$set = {'plugins.push.rate.rate': config.rate.rate};
                pushcfg.rate.rate = config.rate.rate;
            }
            else {
                update.$unset = {'plugins.push.rate.rate': 1};
                delete pushcfg.rate.rate;
            }

            if (config.rate.period) {
                update.$set = update.$set || {};
                update.$set['plugins.push.rate.period'] = config.rate.period;
                pushcfg.rate.period = config.rate.period;
            }
            else {
                update.$unset = update.$unset || {};
                update.$unset['plugins.push.rate.period'] = 1;
                delete pushcfg.rate.period;
            }
        }
        else {
            update.$unset = {'plugins.push.rate': 1};
            delete pushcfg.rate;
        }
        await common.db.collection('apps').updateOne({_id: app._id}, update);
    }

    if (config.test !== undefined) {
        let uids = [], cohorts = [];
        if (config.test && config.test.uids) {
            uids = await common.db.collection(`app_users${app._id}`).find({uid: {$in: config.test.uids.split(',')}}, {uid: 1}).toArray();
            uids = uids.map(u => u.uid).join(',');
        }

        if (config.test && config.test.cohorts) {
            cohorts = await common.db.collection(`cohorts`).find({app_id: app._id.toString(), _id: {$in: config.test.cohorts.split(',')}}, {_id: 1}).toArray();
            cohorts = cohorts.map(c => c._id).join(',');
        }

        let update = {};
        if (cohorts.length || uids.length) {
            pushcfg.test = pushcfg.test || {};
            if (uids.length) {
                update.$set = {'plugins.push.test.uids': uids};
                pushcfg.test.uids = uids;
            }
            else {
                update.$unset = {'plugins.push.test.uids': 1};
                delete pushcfg.test.uids;
            }
            if (cohorts.length) {
                update.$set = update.$set || {};
                update.$set['plugins.push.test.cohorts'] = cohorts;
            }
            else {
                update.$unset = update.$unset || {};
                update.$unset['plugins.push.test.cohorts'] = 1;
                delete pushcfg.test.cohorts;
            }
        }
        else {
            update.$unset = {'plugins.push.test': 1};
            delete pushcfg.test;
        }
        await common.db.collection('apps').updateOne({_id: app._id}, update);
    }

    let neo = JSON.stringify(pushcfg);

    if (old !== neo) {
        common.plugins.dispatch('/systemlogs', {params: params, action: 'plugin_push_config_updated', data: {before: JSON.parse(old), after: JSON.parse(neo)}});
    }
};

module.exports.onMerge = ({app_id, oldUser, newUser}) => {
    let ouid = oldUser.uid,
        nuid = newUser.uid;

    if (ouid && nuid) {
        return new Promise(function(resolve, reject) {
            log.d(`Merging push data of ${ouid} into ${nuid}`);
            common.db.collection(`push_${app_id}`).find({_id: {$in: [ouid, nuid]}}).toArray((err, users) => {
                if (err || !users) {
                    log.e('Couldn\'t load users to merge', err);
                    reject();
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
                            newUser['tk' + k] = oldUser['tk' + k];
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
                    for (let k in ou.tk) {
                        newUser['tk' + k] = oldUser['tk' + k];
                    }
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
                    log.d('Removing old push data for %s', ouid);
                    common.db.collection(`push_${app_id}`).deleteOne({_id: ouid}, e => e && log.e('Error while deleting old uid push data', e));
                }
                if (Object.keys(update).length) {
                    log.d('Updating push data for %s: %j', nuid, update);
                    common.db.collection(`push_${app_id}`).updateOne({_id: nuid}, update, opts, function(ee) {
                        if (ee) {
                            log.e('Error while updating new uid with push data', ee);
                            reject();
                        }
                        else {
                            resolve();
                            setTimeout(() => {
                                common.db.collection(`app_users${app_id}`).findOne({_id: newUser._id}, (er, user) => {
                                    if (er) {
                                        log.e('Error while loading user', er);
                                    }
                                    else if (!user) {
                                        log.w('Removing stale push_%s record for user %s/%s', app_id, newUser._id, nuid);
                                        common.db.collection(`push_${app_id}`).deleteOne({_id: nuid}, () => {});
                                    }
                                });
                            }, 10000);
                        }
                    });
                }
                else {
                    resolve();
                }
            });
        });
    }
};