/**
 * @typedef {import('./new/types/credentials').PlatformCredential} PlatformCredential
 * @typedef {import('./new/types/message').PlatformKey} PlatformKey
 */
/* eslint-disable no-inner-declarations */
const common = require('../../../api/utils/common');
const log = common.log('push:api:push');
const { ValidationError, DBMAP } = require('./send');
const { validateCredentials: validateAndroidCredentials } = require("./new/platforms/android");
const { validateCredentials: validateIOSCredentials } = require("./new/platforms/ios");
const { validateCredentials: validateHuaweiCredentials } = require("./new/platforms/huawei");
const { loadPluginConfiguration } = require('./new/lib/utils');
const { extractTokenFromQuerystring } = require("./new/lib/utils");
const platforms = require("./new/constants/platform-keymap.js");
const platformKeys = /** @type {PlatformKey[]} */(Object.keys(platforms));
const allAppUserFields = [...new Set(
    Object.values(platforms)
        .map(platform => platform.combined)
        .flat()
        .map(combined => `tk${combined}`)
)];

module.exports.onTokenSession = async(dbAppUser, params) => {
    let stuff = extractTokenFromQuerystring(params.qstring);
    if (stuff) {
        const [p, f, token, hash] = stuff;
        const app_id = params.app_id;
        const uid = dbAppUser.uid;
        const app_user_id = params.app_user_id;
        const appusersField = `tk${p}${f}`;
        const pushField = `tk.${p}${f}`;
        const pushCollection = common.db.collection(`push_${app_id}`);
        const appusersCollection = common.db.collection(`app_users${app_id}`);

        log.d('push token: %s/%s/%s', p, f, token);

        let push = await pushCollection.findOne({_id: uid});
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

            setTimeout(() => {
                common.db.collection(`app_users${app_id}`).findOne({_id: app_user_id}, {projection: {_id: 1}}, (er, user) => {
                    if (er) {
                        log.e('Error while loading user', er);
                    }
                    else if (!user) {
                        log.w('Removing stale push_%s record for user %s/%s', app_id, app_user_id, uid);
                        common.db.collection(`push_${app_id}`).deleteOne({_id: uid}, () => {});
                    }
                });
            }, 10000);
        }
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
    for (let i = 0; i < platformKeys.length; i++) {
        let p = platformKeys[i],
            c = config[p];
        // delete credentials
        if (c === null) {
            if (pushcfg[p] && pushcfg[p]._id) {
                await common.db.collection("creds").deleteOne({
                    _id: common.db.ObjectID(pushcfg[p]._id)
                });
            }
            pushcfg[p] = {};
            await common.db.collection('apps').updateOne({
                _id: app._id
            }, {
                $set: {[`plugins.push.${p}`]: {}}
            });
        }
        // new credentials
        else if (c && c.type && !c.hash) {
            /** @type {Array<PlatformCredential["type"]>} */
            const credentialTypes = ["apn_token", "apn_universal", "fcm", "hms"];
            if (credentialTypes.includes(c.type)) {
                let creds, view;
                try {
                    const pluginConfig = await loadPluginConfiguration();
                    if (c.type === "fcm") {
                        ({ creds, view } = await validateAndroidCredentials(c, pluginConfig?.proxy));
                    }
                    else if (c.type === "hms") {
                        ({ creds, view } = await validateHuaweiCredentials(c, pluginConfig?.proxy));
                    }
                    else {
                        ({ creds, view } = await validateIOSCredentials(c, pluginConfig?.proxy));
                    }
                    // insert/update new credentials while removing old ones
                    if (pushcfg[p] && pushcfg[p]._id) {
                        await common.db.collection('creds').deleteOne({
                            _id: common.db.ObjectID(pushcfg[p]._id)
                        });
                    }
                    pushcfg[p] = view;
                    await common.db.collection("creds").insertOne(creds);
                    await common.db.collection('apps').updateOne({
                        _id: app._id
                    }, {
                        $set: { [`plugins.push.${p}`]: view }
                    });
                }
                catch (error) {
                    log.e("error while updating credentials", error);
                    throw new ValidationError(error.message || 'Invalid credentials');
                }
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