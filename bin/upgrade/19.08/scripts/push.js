'use strict';

/*eslint no-console: 'off' */

var fs = require('fs'),
    path = require('path'),
    pluginManager = require('../../../../plugins/pluginManager.js'),
    N = require('../../../../plugins/push/api/parts/note.js');
const { getAdminApps } = require('../../../../api/utils/rights.js');

console.log('Installing push plugin');

var dir = path.resolve(__dirname, '');
fs.unlink(dir + '/../../../../plugins/push/frontend/public/javascripts/countly.models.js', function() {});
fs.unlink(dir + '/../../../../plugins/push/api/jobs/check.js', function() {});
fs.unlink(dir + '/../../../../plugins/push/api/jobs/send.js', function() {});
fs.unlink(dir + '/../../../../plugins/push/api/jobs/cleanup.js', function() {});

process.on('uncaughtException', (err) => {
    console.log('Caught exception: %j', err, err.stack);
    console.trace();
    process.exit(1);
});

/**
 * Unhandled Rejection Handler
 */
process.on('unhandledRejection', (reason, p) => {
    console.log('Unhandled rejection for %j with reason %j stack ', p, reason, reason ? reason.stack : undefined);
    console.trace();
    process.exit(1);
});

async function install() {
    let db = await pluginManager.dbConnection(),
        apps = db.collection('apps').find(),
        ret;

    console.log('[push] Ensuring indexes');
    await db.collection('messages').ensureIndex({apps: 1});
    await db.collection('messages').ensureIndex({created: 1});

    console.log('[push] Setting seq on credentials');
    ret = await db.collection('credentials').updateMany({seq: {$exists: false}}, {$set: {seq: 0}});
    console.log('[push] Setting seq on credentials: %d', ret && ret.modifiedCount || 0);

    console.log('[push] Removing deleted jobs');
    ret = await db.collection('jobs').deleteMany({$or: [{name: 'push:send'}, {name: 'push:cleanup'}]});
    console.log('[push] Removing deleted jobs: %d', ret && ret.deletedCount || 0);

    let aarr = [];
    while (await apps.hasNext()) {
        let app = await apps.next();
        await installApp(db, app);
        aarr.push(app);
    }

    await notifyGCM(db, aarr);

    console.log('[push] Migrating messages');
    await migrateMessages(db);
}

const fields = ['ip', 'ia', 'id', 'ap', 'at'];

async function installApp(db, app) {
    console.log('[push] %s Updating', app._id);

    console.log('[push] %s Ensuring app_users indexes', app._id);
    await Promise.all(fields.map(f => db.collection(`app_users${app._id}`).ensureIndex({[`tk${f}`]: 1}, {sparse: true})));

    await migrageAppCredentials(db, app);

    await migrateAppUsers(db, app);

    await ensureScheduledConsistence(db, app);
}

async function migrateAppUsers(db, app) {
    let users = db.collection(`app_users${app._id}`).find({$or: [{msgs: {$exists: true}}, {tk: {$exists: true}}, {tkid: true}, {tkia: true}, {tkip: true}, {tkat: true}, {tkap: true}]}, {uid: 1, msgs: 1, tkid: 1, tkia: 1, tkip: 1, tkat: 1, tkap: 1, tk: 1}),
        c = 0;

    while (await users.hasNext()) {
        let user = await users.next(),
            push = await new Promise((res, rej) => db.collection(`push_${app._id}`).findOne({_id: user.uid}, (err, p) => err ? rej(err) : res(p))),
            uset = {}, uunset = {},
            pset = {}, ppush = [], punset = {};

        let has = fields.filter(f => (user.tk && user.tk[f]) || (push && push.tk && push.tk[f]));

        if (c++ % 100 === 0) {
            console.log('[%s]: Checking user %d', app._id, c);
        }

        if (user.tk) {
            uunset.tk = 1;
        }
        if (has.length === 0) {
            fields.forEach(f => {
                if (user['tk' + f]) {
                    uunset['tk' + f] = 1;
                }
            });
            if (push && push.tk) {
                punset.tk = 1;
            }
        }
        else {
            has.forEach(f => {
                if (!user['tk' + f]) {
                    uset['tk' + f] = true;
                }
                if (!push || !push.tk || !push.tk[f]) {
                    pset['tk.' + f] = (user.tk && user.tk[f]) || (push && push.tk && push.tk[f]);
                }
            });

            fields.filter(f => has.indexOf(f) === -1).forEach(f => {
                if (user['tk' + f]) {
                    uunset['tk' + f] = 1;
                }
                if (push && push.tk && push.tk[f]) {
                    punset['tk.' + f] = 1;
                }
            });
        }

        if (user.msgs) {
            uunset.msgs = 1;
            if (!Array.isArray(user.msgs)) {
                let arr = [];
                for (let k in user.msgs) {
                    arr.push(user.msgs[k]);
                }
                user.msgs = arr;
            }
            user.msgs.forEach(m => {
                if (Array.isArray(m)) {
                    ppush.push(m);
                }
                else {
                    ppush.push([m]);
                }
            });
        }


        let update = {};
        if (has.length || ppush.length) {
            if (Object.keys(pset).length) {
                update.$set = pset;
            }
            if (push && Object.keys(punset).length) {
                update.$unset = punset;
            }
            if (ppush.length) {
                update.$addToSet = {msgs: {$each: ppush}};
            }
            if (Object.keys(update).length) {
                console.log('[%s]: Updating push %s %j', app._id, push && push._id, push);
                console.log('[%s]: Updating push %s update %j', app._id, push && push._id, update);
                await new Promise((res, rej) => db.collection(`push_${app._id}`).updateOne({_id: user.uid}, update, {upsert: true}, e => e ? rej(e) : res()));
            }
        }
        else if (push && (!push.msgs || !push.msgs.length)) {
            console.log('[%s]: Removing push %s %j', app._id, push._id, push);
            await new Promise((res, rej) => db.collection(`push_${app._id}`).removeOne({_id: user.uid}, e => e ? rej(e) : res()));
        }

        update = {};
        if (Object.keys(uset).length) {
            update.$set = uset;
        }
        if (Object.keys(uunset).length) {
            update.$unset = uunset;
        }
        if (Object.keys(update).length) {
            console.log('[%s]: Updating user %s %j', app._id, user.uid, user);
            console.log('[%s]: Updating user %s push %j', app._id, user.uid, push);
            console.log('[%s]: Updating user %s update %j', app._id, user.uid, update);
            await new Promise((res, rej) => db.collection(`app_users${app._id}`).updateOne({_id: user._id}, update, e => e ? rej(e) : res()));
        }
    }
}

function migrageAppCredentials(db, app) {
    return new Promise(rslv => {
        var dones = 0, done = () => {
            dones++;
            if (dones >= 2) {
                rslv();
            }
        };

        if (app.gcm && app.gcm.key) {
            console.log('Moving GCM credentials for ' + app._id + '...');
            db.collection('credentials').insertOne({platform: 'a', type: app.gcm.key.length > 50 ? 'fcm' : 'gcm', key: app.gcm.key}, (err, cred) => {
                if (err) {
                    console.log('ERROR while moving GCM cred for ' + app._id + '...', err);
                    process.exit(1);
                }
                cred = cred.ops[0];
                db.collection('apps').updateOne({_id: app._id}, {$set: {'plugins.push.a': {_id: cred._id, type: cred.type, key: cred.key}}}, function(err, updated) {
                    if (err || !updated || !updated.result || !updated.result.ok) {
                        console.log('ERROR 2 while moving GCM cred for ' + app._id + '...', err);
                        process.exit(1);
                    }
                    console.log('Moved GCM cred for ' + app._id + ' into ' + cred._id);
                    done();
                });
            });
        }
        else if ((app.gcm && Array.isArray(app.gcm) && app.gcm.length) || (app.plugins && app.plugins.push && app.plugins.push.gcm)) {
            let id = app.gcm && Array.isArray(app.gcm) && app.gcm.length ? app.gcm[0]._id : app.plugins.push.gcm._id;
            id = typeof id === 'string' ? db.ObjectID(id) : id;

            db.collection('credentials').findOne({_id: id}, (err, cred) => {
                if (err) {
                    console.log('ERROR while moving GCM cred for ' + app._id + '...', err);
                    process.exit(1);
                }
                let update = {};
                if (cred) {
                    update = {type: cred.key.length > 50 ? 'fcm' : 'gcm', key: cred.key, _id: cred._id.toString()};
                }
                db.collection('apps').updateOne({_id: app._id}, {$unset: {gcm: 1, 'plugins.push.gcm': 1}, $set: {'plugins.push.a': update}}, done);
            });
        }
        else if (app.gcm && (typeof app.gcm !== 'object' || !app.gcm.length)) {
            db.collection('apps').updateOne({_id: app._id}, {$unset: {gcm: 1}}, done);
        }
        else if (app.plugins && app.plugins.push && app.plugins.push.a && typeof app.plugins.push.a._id === 'object') {
            db.collection('apps').updateOne({_id: app._id}, {$set: {'plugins.push.a._id': app.plugins.push.a._id.toString()}}, done);
        }
        else {
            done();
        }

        if (app.apn && app.apn.universal && app.apn.universal.key) {
            console.log('Moving APN universal credentials for ' + app._id + '...');
            var path = __dirname + '/../../../../frontend/express/certificates/' + app.apn.universal.key;
            fs.readFile(path, function(err, data) {
                if (err) {
                    console.log('ERROR: couldn\'t read certificate file from %j: %j', path, err);
                    db.collection('apps').updateOne({_id: app._id}, {$unset: {apn: 1}}, done);
                }
                else {
                    db.collection('credentials').insertOne({platform: 'i', type: 'apn_universal', key: data.toString('base64'), secret: app.apn.universal.passphrase || ''}, function(err, credentials) {
                        if (err) {
                            console.log('ERROR while moving APN credentials for ' + app._id + '...', err);
                            process.exit(1);
                        }
                        credentials = credentials.ops[0];
                        db.collection('apps').updateOne({_id: app._id}, {$set: {'plugins.push.i': {_id: credentials._id, type: credentials.type}}}, function(err, updated) {
                            if (err || !updated || !updated.result || !updated.result.ok) {
                                console.log('ERROR 2 while moving APN credentials for ' + app._id + '...', err);
                                process.exit(1);
                            }
                            console.log('Moved APN credentials for ' + app._id + ' into ' + credentials._id);
                            done();
                        });
                    });
                }
            });
        }
        else if ((app.apn && Array.isArray(app.apn) && app.apn.length) || (app.plugins && app.plugins.push && app.plugins.push.apn) || (app.plugins && app.plugins.push && app.plugins.push.i && app.plugins.push.i.type === 'apn_token' && !app.plugins.push.i.team)) {
            let id = app.apn && Array.isArray(app.apn) && app.apn.length ? app.apn[0]._id : app.plugins.push.apn ? app.plugins.push.apn._id : app.plugins.push.i._id;
            id = typeof id === 'string' ? db.ObjectID(id) : id;

            db.collection('credentials').findOne({_id: id}, (err, cred) => {
                let update = {};

                if (cred) {
                    update = {type: cred.type, _id: cred._id.toString()};

                    let comps = cred.secret.split('[CLY]');
                    if (cred.type === 'apn_token' && comps.length === 3) {
                        update.key = comps[0];
                        update.team = comps[1];
                        update.bundle = comps[2];
                    }
                }
                db.collection('apps').updateOne({_id: app._id}, {$unset: {apn: 1, 'plugins.push.apn': 1}, $set: {'plugins.push.i': update}}, done);
            });
        }
        else if (app.apn && (typeof app.apn !== 'object' || !app.apn.length)) {
            db.collection('apps').updateOne({_id: app._id}, {$unset: {apn: 1}}, done);
        }
        else if (app.plugins && app.plugins.push && app.plugins.push.i && typeof app.plugins.push.i._id === 'object') {
            db.collection('apps').updateOne({_id: app._id}, {$set: {'plugins.push.i._id': app.plugins.push.i._id.toString()}}, done);
        }
        else {
            done();
        }
    });
}

async function migrateMessages(db) {
    let messages = db.collection('messages').find({v: {$exists: false}, 'result.resourceErrors': {$exists: false}});

    while (await messages.hasNext()) {
        let msg = await messages.next();

        console.log('Updating message %s: status %j deleted %j error %s auto %j autoActive %j', msg._id, msg.result && msg.result.status, msg.deleted, msg.result && msg.result.error, msg.auto, msg.autoActive);

        if (!msg.result || !msg.result.status || msg.result.status === 1) {
            console.log('Updating message %s', msg._id);
            await db.collection('messages').updateOne({_id: msg._id}, {$set: {v: 18080, 'result.status': N.Status.Aborted | N.Status.Deleted}});
            continue;
        }

        let s = msg.result && msg.result.status || 0,
            n = 0,
            schedule,
            resourceErrors;

        switch (s) {
        case 0:
        case 1:
            n = N.Status.Created | N.Status.Aborted;
            break;
        case 2:
            n = N.Status.Created;
            schedule = msg.date ? msg.date.getTime() - 24 * 3600 * 1000 : Date.now();
            break;
        case 4:
            n = N.Status.Created | N.Status.Scheduled | N.Status.Aborted;
            break;
        case 8:
            n = N.Status.Created | N.Status.Done;
            break;
        case 16:
            n = N.Status.Created | N.Status.Error;
            break;
        case 32:
        case 40:
        case 56:
            n = N.Status.Created | N.Status.Aborted;
            break;
        default:
            continue;
        }

        if (msg.result.sent) {
            n = n | N.Status.Done;
        }

        if (msg.deleted) {
            n = n | N.Status.Deleted;
        }

        if (msg.result.error) {
            n = n | N.Status.Error;
            resourceErrors = [{date: (msg.result.sent || new Date()).getTime(), field: '', error: msg.result.error}];
        }

        let update = {$set: {v: 19080, 'result.status': n}};
        if (resourceErrors) {
            update.$set.resourceErrors = resourceErrors;
        }

        if (msg.deleted) {
            update.$unset = {deleted: 1};
        }

        if (msg.auto) {
            if (!update.$unset) {
                update.$unset = {};
            }
            update.$unset.autoActive = 1;

            if (msg.autoActive) {
                update.$set['result.status'] = update.$set['result.status'] | N.Status.Scheduled;
            }
            else {
                update.$set['result.status'] = update.$set['result.status'] & ~N.Status.Scheduled;
            }

            if (msg.autoTime === 0) {
                update.$unset.autoTime = 1;
            }
        }

        console.log('Update for %s: %j', msg._id, update);
        if (schedule) {
            console.log('Job for %s: %j', msg._id, {name: 'push:schedule', status: 0, next: schedule, data: {mid: msg._id}});
        }

        await db.collection('messages').updateOne({_id: msg._id}, update);
        if (schedule) {
            await db.collection('jobs').insertOne({name: 'push:schedule', status: 0, next: schedule, data: {mid: msg._id}});
        }
    }
}

async function ensureScheduledConsistence(db, app) {
    console.log('[push] %s Ensuring scheduled messages consistence', app._id);
    await Promise.all(fields.map(async field => {
        let count = (await db.collection(`push_${app._id}_${field}`).aggregate([
            {$match: {$and: [{j: {$exists: true}}, {j: null}]}},
            {$project: {_id: '$n'}},
            {$group: {_id: '$_id', count: {$sum: 1}}}
        ]).toArray()) || [];

        for (let i = 0; i < count.length; i++) {
            let nid = count[i]._id,
                num = count[i].count,
                msg = await db.collection('messages').findOne(nid),
                update;

            if (msg && !msg.deleted) {
                update = {$inc: {'result.processed': num, 'result.errors': num, 'result.errorCodes.skiptz': 1}};
                if ((msg.result.processed + num) === msg.result.total) {
                    update.$bit = {'result.status': {}};
                    if (msg.tx || msg.auto) {
                        update.$bit['result.status'].and = ~N.Status.Sending;
                        update.$bit['result.status'].or = N.Status.Success;
                    }
                    else {
                        update.$bit['result.status'].and = ~(N.Status.Sending | N.Status.Scheduled);
                        update.$bit['result.status'].or = N.Status.Success | N.Status.Done;
                    }
                }
                console.log('[push] %s Found %d stale notifications for message %s, result was %j, update %j', app._id, num, nid, msg.result, update);
                await db.collection('messages').updateOne({_id: nid}, update);
            }
            else {
                console.log('[push] %s Found %d stale notifications for message %s, message doesn\'t exist', app._id, num, nid);
            }
        }

        if (count.length) {
            await db.collection(`push_${app._id}_${field}`).deleteMany({$and: [{j: {$exists: true}}, {j: null}]});
        }
    }));
}

async function notifyGCM(db, apps) {
    let members = await db.collection('members').find().toArray();

    for (let i = 0; i < members.length; i++) {
        let member = members[i];

        if (member.notes && member.notes.push && member.notes.push.gcm) {
            continue;
        }

        console.log('[push] Checking member %s for GCM notifications', member.full_name);

        let aps = [];
        let adminApps = getAdminApps(member);

        if (member.global_admin) {
            aps = apps;
        }
        else if (adminApps && adminApps.length) {
            aps = apps.filter(a => adminApps.indexOf(a._id.toString()) !== -1);
        }

        aps = aps.filter(a => a.plugins && a.plugins.push && a.plugins.push.a && a.plugins.push.a.key && a.plugins.push.a.key.length < 50);

        if (aps.length) {
            console.log('[push] Notifying member %s for apps %j', member.full_name, aps.map(a => a.name));
            await db.collection('members').updateOne({_id: member._id}, {
                $set: {
                    'notes.push.gcm': {
                        apps: aps.map(a => {
                            return {_id: a._id, name: a.name};
                        })
                    }
                }
            });
        }
    }
}

install().then(() => {
    console.log('Done installing push plugin: success');
    db.close();
}, (e) => {
    console.log('Done installing push plugin: error', e);
    db.close();
});