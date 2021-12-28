const common = require('../../../api/utils/common'),
    plugins = require('../../pluginManager'),
    { Creds } = require('./send');

/**
 * Reset the app by removing all push artifacts
 * 
 * @param {object} ob ob
 */
async function reset(ob) {
    let aid = common.db.oid(ob.appId);
    await Promise.all([
        plugins.getPluginsApis().push.cache.purgeAll(),
        common.db.collection('messages').deleteMany({app: aid}).catch(() => {}),
        common.db.collection('push').deleteMany({a: aid}).catch(() => {}),
        common.db.collection('jobs').deleteMany({name: 'push:schedule', 'data.aid': aid}).catch(() => {}),
        common.db.collection(`push_${aid}`).drop().catch(() => {}),
        common.db.collection('apps').findOne({a: aid}).catch(() => {}).then(app => {
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
    let aid = common.db.oid(ob.appId);
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
 */
async function removeUsers(appId, uids) {
    let stream = common.db.collection('push').find({u: {$in: uids}}).stream(),
        updates = {};

    for await (const doc of stream) {
        updates[doc.m] = updates[doc.m] || (updates[doc.m] = {$inc: {'result.errors': {}}});
        if (!updates[doc.m].$inc['result.errors'][doc.p]) {
            updates[doc.m].$inc['result.errors'][doc.p] = {consent: 1};
        }
        else {
            updates[doc.m].$inc['result.errors'][doc.p].consent++;
        }
    }

    await Promise.all(Object.keys(updates).map(mid => common.db.collection('messages').updateOne({_id: common.db.oid(mid)}, updates[mid])));
}

module.exports = { reset, clear, removeUsers };