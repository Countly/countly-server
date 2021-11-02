const plugins = require('../../../../plugins/pluginManager'),
    { Creds, Message } = require('../../../../plugins/push/api/send');


console.log('Migrating push plugin data');

plugins.dbConnection().then(async db => {
    let push = await db.collection('push').findOne();
    if (push) {
        return console.log('Migrating push plugin data: no migration needed as there\'s already data in "push" collection');
    }

    await db.createCollection('push').catch(() => {
        console.log('push collection already exists');
    }).then(() => {
        return db.collection('push').createIndexes([
            {name: 'main', key: {_id: 1, p: 1, f: 1}},
            {name: 'message', key: {m: 1}},
        ]).catch(() => {});
    });
    await db.createCollection('messages_legacy').catch(() => {
        console.log('messages_legacy collection already exists');
    });

    let session = db.client.startSession();
    try {
        await session.withTransaction(async () => {
            let colls = (await db.collections()).map(c => c.collectionName),
                pushes = colls.filter(n => n.indexOf('push_') === 0 && n.lastIndexOf('_') === n.indexOf('_')),
                queues = colls.filter(n => n.indexOf('push_') === 0 && n.lastIndexOf('_') !== n.indexOf('_')),
                credentials = await db.collection('credentials').find().toArray(),
                apps = await db.collection('apps').find().toArray(),
                messagesCount = await db.collection('messages').count(),
                credentialsInApps = [];
            
            apps = apps.filter(a => a.plugins && a.plugins.push && ((a.plugins.push.i && a.plugins.push.i._id) || (a.plugins.push.a && a.plugins.push.a._id) || (a.plugins.push.h && a.plugins.push.h._id)));
            credentialsInApps = apps.map(a => [a.plugins.push.i && a.plugins.push.i._id, a.plugins.push.a && a.plugins.push.a._id, a.plugins.push.h && a.plugins.push.h._id])
                .flat()
                .filter(x => x)
                .map(db.oid);
            
            console.log('Going to migrate %d messages, %d queues, %d push collections, %d credentials, %d credentials in apps', messagesCount, queues.length, pushes.length, credentials.length, credentialsInApps.length);
            await new Promise(res => setTimeout(res, 1000));

            // Migrate messages to new data structures
            console.log('Migrating messages');
            let promises = [];
            await db.collection('messages').find().forEach(n => promises.push(async () => {
                await db.collection('messages_legacy').save(n);
                await Message.fromNote(n).save();
            }));
            await Promise.all(promises);
            console.log('Migrated %d messages', promises.length);

            // Migrate credentials
            console.log('Migrating %d out of %d credentials', credentialsInApps.length, credentials.length);
            await Promise.all(credentialsInApps.map(async cid => {
                console.log('Migrating credentials %s', cid);
                let c = credentials.filter(x => x._id.toString() === cid.toString())[0];
                if (!c) {
                    console.error('Credentials %s of are not found in credentials collection, skipping', cid);
                }
                else {
                    let creds = Creds.fromCredentials(c),
                        app = apps.filter(a => (a.plugins.push.i && a.plugins.push.i && a.plugins.push.i._id.toString() === c._id.toString()) ||
                            (a.plugins.push.a && a.plugins.push.a && a.plugins.push.a._id.toString() === c._id.toString()) || 
                            (a.plugins.push.h && a.plugins.push.h && a.plugins.push.h._id.toString() === c._id.toString()))[0];

                    if (!app) {
                        return console.error('Illegal state: app not found for credentials %s', cid);
                    }

                    if (app.plugins.push.i && app.plugins.push.i && app.plugins.push.i._id.toString() === c._id.toString()) {
                        await db.collection('apps').updateOne({_id: app._id}, {$set: {'app.plugins.push.i': creds.view}});
                    }
                    else if (app.plugins.push.a && app.plugins.push.a && app.plugins.push.a._id.toString() === c._id.toString()) {
                        await db.collection('apps').updateOne({_id: app._id}, {$set: {'app.plugins.push.a': creds.view}});
                    }
                    else if (app.plugins.push.h && app.plugins.push.h && app.plugins.push.h._id.toString() === c._id.toString()) {
                        await db.collection('apps').updateOne({_id: app._id}, {$set: {'app.plugins.push.h': creds.view}});
                    }
                    else {
                        return console.error('Illegal state: credentials %s are not found in app %s', cid, app._id);
                    }

                    await creds.save();
                    console.log('Migrated credentials %s', cid);
                }
            }));
            console.log('Migrating %d out of %d credentials: DONE', credentialsInApps.length, credentials.length);

            // Migrate push
            for (const push of pushes) {
                let stream = db.collection(push).find().stream(),
                    batch = [],
                    count = 0,
                    add = async (op, flush) => {
                        if (flush || (batch.length > 0 && batch.length >= 10000)) {
                            if (op) {
                                batch.push(op);
                            }
                            console.log('... inserting %d-th record into "%s"', count++, push);
                            await db.collection(push).bulkWrite(batch);
                            batch = [];
                        }
                        else if (op) {
                            batch.push(op);
                        }
                    };
                
                for await (const doc of stream) {
                    if (Array.isArray(doc.msgs)) {
                        let obj = {};
                        doc.msgs.forEach(([mid, date]) => {
                            obj[mid] = date;
                        });
                        await add({updateOne: {filter: {_id: doc._id}, update: {$set: {msgs: obj}}}});
                    }
                }

                // flush the rest
                await add(null, true);
            }

            // Migrate queues
            let batch = [],
                count = 0,
                add = async (op, flush) => {
                    if (flush || (batch.length > 0 && batch.length >= 10000)) {
                        if (op) {
                            batch.push(op);
                        }
                        console.log('... inserting %d-th record into "push"', count++);
                        await db.collection('push').insertMany(batch);
                        batch = [];
                    }
                    else if (op) {
                        batch.push(op);
                    }
                };
        
            for (const queue of queues) {
                let stream = db.collection(queue).find().stream(),
                    aid = db.oid(queue.substr(queue.indexOf('_') + 1, 24)),
                    type = queue.substr(queue.lastIndexOf('_') + 1),
                    p = type[0],
                    f = type[1];
                for await (const doc of stream) {
                    await add({
                        _id: db.oidWithDate(Math.floor(doc.d / 1000)),
                        p,
                        f,
                        a: aid,
                        m: doc.n,
                        t: doc.t,
                        u: doc.u,
                        pr: doc.p
                    });
                }
            }

            await add(null, true);
            
            // Migrate jobs
        });
    }
    finally {
        await session.endSession();
    }
});
