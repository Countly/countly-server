const common = require('../../../api/utils/common'),
    plugins = require('../../pluginManager'),
    { Creds, dbext, FIELDS_TITLES } = require('./send');

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
async function removeUsers(appId, uids, error = "consent") {
    let stream = common.db.collection('push').find({u: {$in: uids}}).stream(),
        updates = {},
        ids = [];

    for await (const doc of stream) {
        updates[doc.m] = updates[doc.m] || (updates[doc.m] = {$inc: {}});
        if (!updates[doc.m].$inc['result.processed']) {
            updates[doc.m].$inc['result.processed'] = 1;
            updates[doc.m].$inc['result.errored'] = 1;
            updates[doc.m].$inc[`result.errors.${error}`] = 1;
        }
        else {
            updates[doc.m].$inc['result.processed']++;
            updates[doc.m].$inc['result.errored']++;
            updates[doc.m].$inc[`result.errors.${error}`]++;
        }
        if (!updates[doc.m].$inc[`result.subs.${doc.p}.processed`]) {
            updates[doc.m].$inc[`result.subs.${doc.p}.processed`] = 1;
            updates[doc.m].$inc[`result.subs.${doc.p}.errored`] = 1;
            updates[doc.m].$inc[`result.subs.${doc.p}.errors.${error}`] = 1;
        }
        else {
            updates[doc.m].$inc[`result.subs.${doc.p}.processed`]++;
            updates[doc.m].$inc[`result.subs.${doc.p}.errored`]++;
            updates[doc.m].$inc[`result.subs.${doc.p}.errors.${error}`]++;
        }
        if (!updates[doc.m].$inc[`result.subs.${doc.p}.subs.${doc.pr.la || 'default'}.processed`]) {
            updates[doc.m].$inc[`result.subs.${doc.p}.subs.${doc.pr.la || 'default'}.processed`] = 1;
            updates[doc.m].$inc[`result.subs.${doc.p}.subs.${doc.pr.la || 'default'}.errored`] = 1;
            updates[doc.m].$inc[`result.subs.${doc.p}.subs.${doc.pr.la || 'default'}.errors.${error}`] = 1;
        }
        else {
            updates[doc.m].$inc[`result.subs.${doc.p}.subs.${doc.pr.la || 'default'}.processed`]++;
            updates[doc.m].$inc[`result.subs.${doc.p}.subs.${doc.pr.la || 'default'}.errored`]++;
            updates[doc.m].$inc[`result.subs.${doc.p}.subs.${doc.pr.la || 'default'}.errors.${error}`]++;
        }

        ids.push(doc._id);
    }

    await Promise.all(Object.keys(updates).map(mid => common.db.collection('messages').updateOne({_id: dbext.oid(mid)}, updates[mid])));

    let $unset = {};
    Object.keys(FIELDS_TITLES).forEach(f => {
        $unset[f] = 1;
    });
    await common.db.collection(`app_users${appId}`).updateMany({uid: {$in: uids}}, {$unset});

    await common.db.collection('push').deleteMany({_id: {$in: ids}});

    await common.db.collection(`push_${appId}`).deleteMany({_id: {$in: uids}});
}

module.exports = { reset, clear, removeUsers };