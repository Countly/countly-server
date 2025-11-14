const common = require('../../../api/utils/common'),
    plugins = require('../../pluginManager'),
    { Creds, dbext, PushError } = require('./send');

const platforms = require("./new/constants/platform-keymap.js");
const allAppUserFields = [...new Set(
    Object.values(platforms)
        .map(platform => platform.combined)
        .flat()
        .map(combined => `tk${combined}`)
)];

/**
 * Reset the app by removing all push artifacts
 *
 * @param {object} ob ob
 */
async function reset(ob) {
    let aid = dbext.oid(ob.appId);
    await Promise.all([
        plugins.getPluginsApis().push.cache.purgeAll(),
        common.db.collection('messages').deleteMany({app: aid}).catch(() => {}),
        common.db.collection('push').deleteMany({a: aid}).catch(() => {}),
        common.db.collection('jobs').deleteMany({name: 'push:schedule', 'data.aid': aid}).catch(() => {}),
        common.db.collection(`push_${aid}`).drop().catch(() => {}),
        common.db.collection('apps').findOne({_id: aid}).catch(() => {}).then(app => {
            if (app && app.plugins && app.plugins.push) {
                return Promise.all(Object.values(app.plugins.push).map(async cfg => {
                    if (cfg && cfg._id) {
                        return common.db.collection(Creds.collection).deleteOne({_id: cfg._id});
                    }
                }).concat([
                    common.db.collection('apps').updateOne({a: aid}, {$unset: {'plugins.push': 1}}).catch(() => {})
                ]));
            }
        }),
    ]);
}

/**
 * Reset the app by removing all push data (clear queue for the app, remove messages and remove tokens while leaving credentials)
 *
 * @param {object} ob ob
 */
async function clear(ob) {
    let aid = dbext.oid(ob.appId);
    await Promise.all([
        plugins.getPluginsApis().push.cache.purgeAll(),
        common.db.collection('messages').deleteMany({app: aid}).catch(() => {}),
        common.db.collection(`push_${aid}`).drop().catch(() => {}),
        common.db.collection('push').deleteMany({a: aid}).catch(() => {}),
        common.db.collection('jobs').deleteMany({name: 'push:schedule', 'data.aid': aid}).catch(() => {}),
    ]);
}

/**
 * Remove push data for given users
 *
 * @param {string|ObjectID} appId app id
 * @param {string[]} uids user uids to remove
 * @param {string} error error code (consent is default)
 */
async function removeUsers(appId, uids, error = 'consent') {
    /**
     * @type {{[key: string]: 1}}
     * @example { "tkap": 1, "tkhp": 1, "tkip": 1, "tkid": 1, "tkia": 1 }
     */
    const $unset = Object.fromEntries(allAppUserFields.map(field => [field, 1]));
    await common.db.collection(`app_users${appId}`).updateMany({uid: {$in: uids}}, {$unset});

    if (error === 'consent') {
        await common.db.collection(`push_${appId}`).updateMany({_id: {$in: uids}}, {$set: {tk: {}}});
    }
    else if (error === 'purge') {
        await common.db.collection(`push_${appId}`).deleteMany({_id: {$in: uids}});
    }
    else {
        throw new PushError('Invalid error value in removeUsers');
    }
}

module.exports = { reset, clear, removeUsers };