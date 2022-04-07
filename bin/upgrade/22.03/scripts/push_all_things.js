const plugins = require('../../../../plugins/pluginManager'),
      common = require('../../../../api/utils/common'),
    { Creds, Message, util } = require('../../../../plugins/push/api/send'),
    { Note } = require('../../../../plugins/push/api/parts/note');


console.log('Migrating push plugin data');

plugins.dbConnection().then(async db => {
    common.db = db;
    let push = await db.collection('push').findOne();
    if (push && !process.env.FORCE_REPEAT) {
        return console.log('Migrating push plugin data: no migration needed as there\'s already data in "push" collection');
    }

    await db.createCollection('push').catch(() => {
        console.log('push collection already exists');
    }).then(() => {
        return db.collection('push').createIndexes([
            {name: 'main', key: {_id: 1, m: 1, p: 1, f: 1}},
        ]).catch(() => {});
    });
    await db.createCollection('messages_legacy').catch(() => {
        console.log('messages_legacy collection already exists');
    });

    try {
        let colls = (await db.collections()).map(c => c.collectionName),
            pushes = colls.filter(n => n.indexOf('push_') === 0 && n.lastIndexOf('_') === n.indexOf('_')),
            queues = colls.filter(n => n.indexOf('push_') === 0 && n.lastIndexOf('_') !== n.indexOf('_')),
            credentials = await db.collection('credentials').find().toArray(),
            apps = await db.collection('apps').find().toArray(),
            messagesCount = await db.collection('messages').count(),
            credentialsInApps = [];
        
        try {
            apps = apps.filter(a => a.plugins && a.plugins.push && ((a.plugins.push.i && a.plugins.push.i._id) || (a.plugins.push.a && a.plugins.push.a._id) || (a.plugins.push.h && a.plugins.push.h._id)));
            credentialsInApps = apps.map(a => [a.plugins.push.i && a.plugins.push.i._id, a.plugins.push.a && a.plugins.push.a._id, a.plugins.push.h && a.plugins.push.h._id])
                .flat()
                .filter(x => !!x && x !== 'demo')
                .map(common.dbext.oid);
        }
        catch (ex) {
            console.log(ex);
        }
        
        console.log('Going to migrate %d messages, %d queues, %d push collections, %d credentials, %d credentials in apps', messagesCount, queues.length, pushes.length, credentials.length, credentialsInApps.length);
        await new Promise(res => setTimeout(res, 1000));

        // Migrate messages to new data structures
        console.log('Migrating messages');
        let messages = db.collection('messages').find().stream(),
            counter = 0;
        for await (const n of messages) {
            if (n.app && !n.apps) {
                continue;
            }
            await db.collection('messages_legacy').insertOne(n);
            await db.collection('messages').deleteOne({_id: n._id});
            await db.collection('messages').insertOne(Message.fromNote(new Note(n)).json);
            counter++;
            if (counter % 100 === 0) {
                console.log('Migrated %d messages ...', counter);
            }
        }
        console.log('Migrated %d messages ... DONE', counter);

        // Migrate credentials
        console.log('Migrating %d out of %d credentials', credentialsInApps.length, credentials.length);
        await Promise.all(credentialsInApps.map(async cid => {
            console.log('Migrating credentials %s', cid);
            let c = credentials.filter(x => x._id.toString() === cid.toString())[0];
            if (!c) {
                console.error('Credentials %s are not found in credentials collection, skipping', cid);
            }
            else {
                let creds = Creds.fromCredentials(c),
                    app = apps.filter(a => (a.plugins.push.i && a.plugins.push.i._id && a.plugins.push.i._id.toString() === c._id.toString()) ||
                        (a.plugins.push.a && a.plugins.push.a._id && a.plugins.push.a._id.toString() === c._id.toString()) || 
                        (a.plugins.push.h && a.plugins.push.h._id && a.plugins.push.h._id.toString() === c._id.toString()))[0];

                if (!app) {
                    return console.error('Illegal state: app not found for credentials %s', cid);
                }

                if (app.plugins.push.i && app.plugins.push.i._id && app.plugins.push.i._id.toString() === c._id.toString()) {
                    await db.collection('apps').updateOne({_id: app._id}, {$set: {'plugins.push.i': creds.view}});
                }
                else if (app.plugins.push.a && app.plugins.push.a._id && app.plugins.push.a._id.toString() === c._id.toString()) {
                    await db.collection('apps').updateOne({_id: app._id}, {$set: {'plugins.push.a': creds.view}});
                }
                else if (app.plugins.push.h && app.plugins.push.h._id && app.plugins.push.h._id.toString() === c._id.toString()) {
                    await db.collection('apps').updateOne({_id: app._id}, {$set: {'plugins.push.h': creds.view}});
                }
                else {
                    return console.error('Illegal state: credentials %s are not found in app %s', cid, app._id);
                }

                try {
                    await db.collection('creds').insertOne(creds.json);
                    console.log('Migrated credentials %s', cid);
                }
                catch(e) {
                    if (e.code === 11000) {
                        console.log(`Creds with _id ${cid} already exists, delete it in order to migrate it again`);
                    }
                    else {
                        throw e;
                    }
                }
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
                        if (batch.length) {
                            await db.collection(push).bulkWrite(batch);
                            batch = [];
                        }
                    }
                    else if (op) {
                        batch.push(op);
                    }
                };
            
            for await (const doc of stream) {
                let obj = {};
                if (Array.isArray(doc.msgs)) {
                    doc.msgs.forEach(msg => {
                        if (Array.isArray(msg)) {
                            obj[msg[0]] = msg[1];
                        }
                        else if (common.dbext.isoid(msg)) {
                            obj[msg] = new Date(2018, 0, 1, 1).getTime();
                        }
                    });
                }
                else if (doc.msgs && doc.msgs['0']) {
                    for (let k in doc.msgs) {
                        let msg = doc.msgs[k];
                        if (Array.isArray(msg)) {
                            obj[msg[0]] = msg[1];
                        }
                        else if (common.dbext.isoid(msg)) {
                            obj[msg] = new Date(2018, 0, 1, 1).getTime();
                        }
                    }
                }

                if (Object.keys(obj).length) {
                    await add({updateOne: {filter: {_id: doc._id}, update: {$set: {msgs: obj}}}});

                    if (doc.tk && doc.tk.at) {
                        if (!doc.tk.ap) {
                            await add({updateOne: {filter: {_id: doc._id}, update: {$set: {'tk.ap': doc.tk.at}, $unset: {'tk.at': 1}}}});
                        }
                        else {
                            await add({updateOne: {filter: {_id: doc._id}, update: {$unset: {'tk.at': 1}}}});
                        }
                    }
                    if (doc.tk && doc.tk.ht) {
                        if (!doc.tk.hp) {
                            await add({updateOne: {filter: {_id: doc._id}, update: {$set: {'tk.hp': doc.tk.ht}, $unset: {'tk.ht': 1}}}});
                        }
                        else {
                            await add({updateOne: {filter: {_id: doc._id}, update: {$unset: {'tk.ht': 1}}}});
                        }
                    }
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
                    if (batch.length) {
                        await db.collection('push').insertMany(batch);
                    }
                    batch = [];
                }
                else if (op) {
                    batch.push(op);
                }
            };
    
        for (const queue of queues) {
            let stream = db.collection(queue).find().stream(),
                aid = common.dbext.oid(queue.substr(queue.indexOf('_') + 1, 24)),
                type = queue.substr(queue.lastIndexOf('_') + 1),
                p = type[0],
                f = type[1];
            for await (const doc of stream) {
                await add({
                    _id: common.dbext.oidWithDate(Math.floor(doc.d / 1000)),
                    p,
                    f,
                    a: aid,
                    m: doc.n,
                    t: doc.t,
                    u: doc.u,
                    pr: doc.p,
                    h: util.hash(doc.p)
                });
            }
        }

        await add(null, true);

        // unset test token booleans
        for (const app of apps) {
            db.collection(`app_users${app._id}`).updateMany({}, {$unset: {tkat: 1, tkht: 1}});
        }
        
        // Migrate jobs
        await db.collection('jobs').deleteMany({name: 'push:send'});
    }
    finally {
        db.close();
    }
});
