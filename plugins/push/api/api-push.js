const common = require('../../../api/utils/common'),
    plugins = require('../../pluginManager'),
    log = common.log('push:api:push'),
    { extract, field, allAppUserFields, platforms, PLATFORM, ValidationError, Creds } = require('./send');

module.exports.onTokenSession = async(dbAppUser, params) => {
    let stuff = extract(params.qstring);
    if (stuff) {
        let [p, f, token] = stuff,
            appusersField = field(p, f, true),
            pushField = field(p, f, false),
            pushCollection = common.db.collection(`push_${params.app_id}`),
            appusersCollection = common.db.collection(`app_users${params.app_id}`);

        log.d('push token: %s/%s/%s', p, f, token);

        let push = pushCollection.findOne({_id: dbAppUser.uid}, {projection: {[field]: 1}});
        if (token && (!push || common.dot(push, pushField) !== token)) {
            let $set = {[appusersField]: true};
            if (params.qstring.locale) {
                $set[common.dbUserMap.locale] = params.qstring.locale;
                dbAppUser[common.dbUserMap.locale] = params.qstring.locale;
            }
            appusersCollection.updateOne({_id: params.app_user_id}, {$set}, () => {}); // don't wait
            pushCollection.updateOne({_id: params.app_user.uid}, {$set: {[pushField]: token}}, {upsert: true}, () => {});
        }
        else {
            appusersCollection.updateOne({_id: params.app_user_id}, {$unset: {[appusersField]: 1}}, function() {});
            pushCollection.updateOne({_id: params.app_user.uid}, {$unset: {[pushField]: 1}}, function() {});
        }
    }
    else if (params.qstring.locale) {
        common.db.collection(`app_users${params.app_id}`).updateOne({_id: params.app_user_id}, {$set: {[common.dbUserMap.locale]: params.qstring.locale}}, function() {});
        dbAppUser[common.dbUserMap.locale] = params.qstring.locale;
    }
};

module.exports.onSessionUser = ({params, dbAppUser}) => {
    if (dbAppUser && dbAppUser[common.dbUserMap.first_seen]) {
        let hasTokens = false;
        allAppUserFields.forEach(f => {
            if (dbAppUser[f]) {
                hasTokens = true;
            }
        });

        if (!hasTokens) {
            return;
        }

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
            updateUsersMonth['d.' + params.time.day + '.' + params.time.hour + '.' + common.dbMap['messaging-enabled']] = 1;
        }

        if (userLastSeenTimestamp < (params.time.timestamp - secInHour)) {
            updateUsersMonth['d.' + params.time.day + '.' + common.dbMap['messaging-enabled']] = 1;
        }

        if (userLastSeenDate.year() === parseInt(params.time.yearly) && Math.ceil(userLastSeenDate.format('DDD') / 7) < params.time.weekly) {
            updateUsersZero['d.w' + params.time.weekly + '.' + common.dbMap['messaging-enabled']] = 1;
        }

        if (userLastSeenTimestamp < (params.time.timestamp - secInMonth)) {
            updateUsersZero['d.' + params.time.month + '.' + common.dbMap['messaging-enabled']] = 1;
        }

        if (userLastSeenTimestamp < (params.time.timestamp - secInYear)) {
            updateUsersZero['d.' + common.dbMap['messaging-enabled']] = 1;
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

    let pushcfg = app.plugins && app.plugins.push || (app.plugins.push = {}),
        old = JSON.stringify(pushcfg);

    for (let i = 0; i < platforms.length; i++) {
        let p = platforms[i],
            c = config[p];

        if (c === null) { // delete credentials
            log.d('Unsetting %s config for app %s', p, app._id);
            if (pushcfg[p] && pushcfg[p]._id) {
                await Creds.deleteOne(pushcfg[p]._id);
            }
            pushcfg[p] = {};
            await common.db.collection('apps').updateOne({_id: app._id}, {$set: {[`plugins.push.${p}`]: {}}});
        }
        else if (c && c.type && !c.hash) { // new credentials
            if (PLATFORM[p].CREDS[c.type]) {
                log.i('Checking %s / %s credentials', p, c.type);
                // check credentials for validity
                let creds = new PLATFORM[p].CREDS[c.type](c),
                    errors = creds.validate();
                if (errors) {
                    throw new ValidationError(errors);
                }
                log.i('Checking %s / %s credentials: validation passed', p, c.type);

                // verify connectivity with the credentials given
                let connection = new PLATFORM[p].connection('push:api:push', p + 'p', creds, [], {}),
                    valid = await connection.connect();
                if (valid) {
                    log.i('Checking %s / %s credentials: provider check passed', p, c.type);
                }
                else {
                    log.i('Checking %s / %s credentials: provider check failed', p, c.type);
                    throw new ValidationError('Credentials were rejected by push notification provider');
                }

                // insert/update new credentials while removing old ones
                if (pushcfg[p] && pushcfg[p]._id) {
                    await Creds.deleteOne(pushcfg[p]._id);
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

    if (config.rate) {
        pushcfg.rate = pushcfg.rate || {};
        config.rate.rate = config.rate.rate ? parseInt(config.rate.rate) : 0;
        config.rate.period = config.rate.period ? parseInt(config.rate.period) : 0;

        let update = {};
        if (config.rate.rate) {
            update.$set = {'plugins.push.rate.rate': config.rate.rate};
            pushcfg.rate.rate = config.rate.rate;
        }
        else {
            update.$unset = {'plugins.push.rate.rate': 1};
            delete pushcfg.rate.rate;
        }

        if (config.rate.period) {
            update.$set = {'plugins.push.rate.period': config.rate.period};
            pushcfg.rate.period = config.rate.period;
        }
        else {
            update.$unset = {'plugins.push.rate.period': 1};
            delete pushcfg.rate.period;
        }
        await common.db.collection('apps').updateOne({_id: app._id}, update);
    }

    let neo = JSON.stringify(pushcfg);

    if (old !== neo) {
        plugins.dispatch('/systemlogs', {params: params, action: 'plugin_push_config_updated', data: {before: JSON.parse(old), after: JSON.parse(neo)}});
    }
};