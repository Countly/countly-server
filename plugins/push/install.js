'use strict';

/*eslint no-console: 'off' */

var fs = require('fs'),
    path = require('path'),
    pluginManager = require('../pluginManager.js'),
    N = require('./api/parts/note.js'),
    db = pluginManager.dbConnection();

console.log('Installing push plugin');

var dir = path.resolve(__dirname, '');
fs.unlink(dir + '/frontend/public/javascripts/countly.models.js', function() {});
fs.unlink(dir + '/api/jobs/check.js', function() {});
fs.unlink(dir + '/api/jobs/send.js', function() {});
fs.unlink(dir + '/api/jobs/cleanup.js', function() {});

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

async function sequence(arr, f, def = 0) {
    return await arr.reduce(async(promise, item) => {
        let total = await promise,
            next = await f(item);
        if (typeof next === 'object') {
            Object.keys(next).forEach(k => {
                total[k] = (total[k] || 0) + next[k];
            });
            return total;
        }
        else {
            return total + next;
        }
    }, Promise.resolve(def));
}

function split(data, batch) {
    let chunks = [];
    while (data.length > 0) {
        chunks.push(data.splice(0, batch));
    }
    return chunks;
}

function outErrors(f) {
    return (err, res) => {
        if (err) {
            console.log('>>>>>>>>>>>>>> error: %j', err.stack || err);
        }
        f(err, res);
    };
}

function outComplete(str, f) {
    return (err, res) => {
        if (str) {
            console.log('-------------- done %s', str);
        }
        f(err, res);
    };
}

Promise.all([
    new Promise(resolveIndexes => {
        db.collection('messages').ensureIndex({apps: 1}, outErrors(() => {
            db.collection('messages').ensureIndex({created: 1}, outErrors(() => {
                db.collection('credentials').updateMany({seq: {$exists: false}}, {$set: {seq: 0}}, outErrors(() => {
                    db.collection('jobs').remove({$or: [{name: 'push:send'}, {name: 'push:cleanup'}]}, outErrors(outComplete('messages/credentials indexes & jobs', resolveIndexes)));
                }));
            }));
        }));
    }),
    new Promise(resolveApps => {
        db.collection('apps').find().toArray(outErrors((err, apps) => {
            if (err || !apps) {
                console.log('-------------- app_users indexes: no apps %j', apps);
                return resolveApps();
            }

            let batch = 0, batches = Math.ceil(apps.length / 10);
            console.log('-------------- app_users indexes on %d apps', apps.length);

            sequence(split(apps, 10), appsBatch => {
                console.log('-------------- app_users indexes another batch %d out of %d', ++batch, batches);
                return Promise.all(appsBatch.map(app => {
                    return Promise.all([
                        new Promise(rslv => db.collection('app_users' + app._id).update({'tk.ip': {$exists: true}}, {$set: {tkip: true}}, {multi: true}, rslv)),
                        new Promise(rslv => db.collection('app_users' + app._id).update({'tk.ia': {$exists: true}}, {$set: {tkia: true}}, {multi: true}, rslv)),
                        new Promise(rslv => db.collection('app_users' + app._id).update({'tk.id': {$exists: true}}, {$set: {tkid: true}}, {multi: true}, rslv)),
                        new Promise(rslv => db.collection('app_users' + app._id).update({'tk.ap': {$exists: true}}, {$set: {tkap: true}}, {multi: true}, rslv)),
                        new Promise(rslv => db.collection('app_users' + app._id).update({'tk.at': {$exists: true}}, {$set: {tkat: true}}, {multi: true}, rslv)),
                        new Promise(rslv => db.collection('app_users' + app._id).ensureIndex({'tkip': 1}, {sparse: true}, rslv)),
                        new Promise(rslv => db.collection('app_users' + app._id).ensureIndex({'tkia': 1}, {sparse: true}, rslv)),
                        new Promise(rslv => db.collection('app_users' + app._id).ensureIndex({'tkid': 1}, {sparse: true}, rslv)),
                        new Promise(rslv => db.collection('app_users' + app._id).ensureIndex({'tkap': 1}, {sparse: true}, rslv)),
                        new Promise(rslv => db.collection('app_users' + app._id).ensureIndex({'tkat': 1}, {sparse: true}, rslv)),
                        new Promise(rslv => {
                            let move = (users) => {
                                return new Promise((resolvemove, rejectmove) => {
                                    if (!users || !users.length) {
                                        return resolvemove();
                                    }

                                    console.log('>>>>>>>>>>>>>>>>>>>>>>>>>>>>>> Total users to update ' + app._id + ': ' + users.length);
                                    let b = 0;
                                    sequence(split(users, 100), usersBatch => {
                                        console.log('>>>>>>>>>>>>>>>>>>>>>>>>>>>>>> Total users to update ' + app._id + ': ' + users.length + ' >>>>>>>>>> doing ' + (b++));
                                        return Promise.all(usersBatch.map(u => new Promise(resolve => {
                                            let update = {};
                                            if (u.tk && Object.keys(u.tk).length) {
                                                update.$set = {tk: u.tk};
                                            }
                                            else {
                                                update.$unset = {tk: 1};
                                            }

                                            if (u.msgs && u.msgs.length) {
                                                update.$addToSet = {msgs: {$each: u.msgs}};
                                            }
                                            db.collection('push_' + app._id).updateOne({_id: u.uid}, update, {upsert: true}, err => {
                                                if (err) {
                                                    console.log('Error during upserting messages to ' + u.uid + ':', update, err);
                                                    resolve();
                                                }
                                                else {
                                                    console.log('Removing messages & tokens from user ' + u._id + ':', u.msgs);
                                                    db.collection('app_users' + app._id).updateOne({_id: u._id}, {$unset: {msgs: 1, tk: 1}}, outErrors(resolve));
                                                }
                                            });
                                        }))).then(() => usersBatch.length);
                                    }).then(resolvemove, rejectmove);
                                });
                            };

                            db.collection('app_users' + app._id).find({$or: [{msgs: {$exists: true}}, {tkid: true}, {tkia: true}, {tkip: true}, {tkat: true}, {tkap: true}]}, {uid: 1, msgs: 1, tkid: 1, tkia: 1, tkip: 1, tkat: 1, tkap: 1, tk: 1}).toArray((err, arr) => {
                                if (err) {
                                    console.log('ERROR while ensuring arrays in msgs ' + app._id + '...', err);
                                    process.exit(1);
                                }

                                let users = (arr || []).filter(u => u.msgs && !Array.isArray(u.msgs));

                                if (!users.length) {
                                    return move(arr).then(rslv);
                                }

                                console.log('-------------- app_users transforming msgs to arrays for %d users', users.length);

                                sequence(split(users, 100), usersBatch => {
                                    return Promise.all(usersBatch.map(u => new Promise(resolve => {
                                        let arr = [];
                                        Object.keys(u.msgs).forEach(k => {
                                            arr.push(u.msgs[k]);
                                        });
                                        u.msgs = arr;
                                        db.collection('app_users' + app._id).updateOne({_id: u._id}, {$set: {msgs: arr}}, outErrors(resolve));
                                    })));
                                }).then(() => {
                                    move(arr).then(rslv);
                                });
                            });
                        }),
                        new Promise(rslv => {
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
                                var path = __dirname + '/../../frontend/express/certificates/' + app.apn.universal.key;
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
                        }),
                    ]);
                })).then(outErrors(outComplete('batch ' + batch, () => {})), outComplete('batch ' + batch, () => {}));
            }).then(outErrors(outComplete('app_users indexes', resolveApps)), outComplete('app_users indexes', resolveApps));
        }));
    }),
    new Promise(resolveMessages => {
        db.collection('messages').find({v: {$exists: false}, 'result.resourceErrors': {$exists: false}}).toArray(outErrors((err, messages) => {
            if (err || !messages) {
                return resolveMessages();
            }

            let batch = 0, batches = Math.ceil(messages.length / 10);
            console.log('-------------- messages total %d, %d batches', messages.length, batches);

            sequence(split(messages, 10), msgBatch => {
                console.log('-------------- messages another batch %d out of %d', ++batch, batches);
                return Promise.all(msgBatch.map(msg => new Promise(resMsg => {
                    console.log('Updating message %s: status %j deleted %j error %s auto %j autoActive %j', msg._id, msg.result && msg.result.status, msg.deleted, msg.result && msg.result.error, msg.auto, msg.autoActive);

                    if (!msg.result || !msg.result.status || msg.result.status === 1) {
                        console.log('Updating message %s', msg._id);
                        return db.collection('messages').updateOne({_id: msg._id}, {$set: {v: 18080, 'result.status': N.Status.Aborted | N.Status.Deleted}}, resMsg);
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
                        return resMsg();
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

                    let update = {$set: {v: 18080, 'result.status': n}};
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
                    Promise.all([
                        new Promise(res => db.collection('messages').updateOne({_id: msg._id}, update, res)),
                        schedule ? new Promise(res => db.collection('jobs').insertOne({name: 'push:schedule', status: 0, next: schedule, data: {mid: msg._id}}, res)) : Promise.resolve()
                    ]).then(resMsg, resMsg);
                }))).then(outErrors(outComplete('batch ' + batch, () => {})), outComplete('batch ' + batch, () => {}));
            }).then(outErrors(outComplete('messages', resolveMessages)), outComplete('messages', resolveMessages));
        }));
    })
]).then(() => {
    console.log('Done installing push plugin: success');
    db.close();
}, () => {
    console.log('Done installing push plugin: rejection');
    db.close();
});