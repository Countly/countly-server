const plugins = require('../../../../plugins/pluginManager'),
      common = require('../../../../api/utils/common'),
    { Creds, Message, util } = require('../../../../plugins/push/api/send'),
    { Note } = require('../../../../plugins/push/api/parts/note');

console.log('Migrating push plugin data');

plugins.dbConnection().then(async db => {
    common.db = db;
    // let push = await db.collection('push').findOne();
    // if (push && !process.env.FORCE_REPEAT) {
    //     return console.log('Migrating push plugin data: no migration needed as there\'s already data in "push" collection');
    // }

    await db.createCollection('push').catch(() => {
        console.log('push collection already exists');
    }).then(() => {
        return db.collection('push').createIndexes([
            {name: 'main', key: {_id: 1, m: 1, p: 1, f: 1}},
        ]).catch(() => {});
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
        // 1. No legacy => migrate all, filterOut = []
        // 2. Some legacy => filterOut = messages ids
        // 3. More messages than legacy => do nothing
        let messageIds = await db.collection('messages').find({}, {_id: 1}).toArray(),
            legacyCount = await db.collection('messages_legacy').count(),
            filterOut = false,
            migrateMessages = true;
        
        if (legacyCount) {
            if (messageIds.length >= legacyCount) {
                migrateMessages = false; // already migrated
            }
            else {
                filterOut = messageIds.map(m => m._id); // partially migrated
            }
        }
        else if (!messageIds.length) {
            migrateMessages = false; // no messages at all
        }
        
        if (migrateMessages) {
            console.log('Migrating messages...');
            if (filterOut.length) {
                console.log('Migrating messages... %d already migrated', filterOut.length);
            }
            if (!legacyCount) {
                try {
                    await db.collection('messages').rename('messages_legacy');
                    console.log('Migrating messages... renamed messages collection');
                }
                catch (e) {
                    console.error('Error while renaming messages to messages_legacy', e);
                }
            }
    
            let messages = db.collection('messages_legacy').find(filterOut ? {_id: {$nin: filterOut}} : {}).batchSize(1000).stream(),
                insert = Message.batchInsert(1000);
            for await (const n of messages) {
                if (n.app && !n.apps) {
                    console.log('%s is already migrated', n._id);
                    continue;
                }
                if (insert.pushSync(Message.fromNote(new Note(n)).json)) {
                    await insert.flush();
                    console.log('Migrating messages... %d / %d', insert.total, legacyCount);
                }
            }
            await insert.flush();
            console.log('Migrating messages... DONE', insert.total);
        }

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

                if (!creds) {
                    return console.error('Malformed credentials: ', c);
                }
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
                        let id, date;
                        if (Array.isArray(msg)) {
                            id = msg[0];
                            date = msg[1];
                        }
                        else if (common.dbext.isoid(msg)) {
                            id = msg;
                            date = new Date(2018, 0, 1, 1).getTime();
                        }
                        if (obj[id]) {
                            if (obj[id].indexOf(date) === -1) {
                                obj[id].push(date);
                            }
                        }
                        else {
                            obj[id] = [date];
                        }
                    });
                }
                else if (doc.msgs && doc.msgs['0']) {
                    for (let k in doc.msgs) {
                        let id,
                            date,
                            msg = doc.msgs[k];
                        if (Array.isArray(msg)) {
                            id = msg[0];
                            date = msg[1];
                        }
                        else if (common.dbext.isoid(msg)) {
                            id = msg;
                            date = new Date(2018, 0, 1, 1).getTime();
                        }
                        if (obj[id]) {
                            if (obj[id].indexOf(date) === -1) {
                                obj[id].push(date);
                            }
                        }
                        else {
                            obj[id] = [date];
                        }
                    }
                }
                else {
                    let needsFix = false,
                        fixed = {};
                    for (let mid in doc.msgs) {
                        if (typeof doc.msgs[mid] === 'number') {
                            needsFix = true;
                        }
                        fixed[mid] = typeof doc.msgs[mid] === 'number' ? [doc.msgs[mid]] : doc.msgs[mid];
                    }
                    if (needsFix) {
                        obj = fixed;
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
            if ((p === 'a' || p === 'h') && f === 't') {
                f = 'p';
            }
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

        // unset test token booleans & set app_users token bools
        for (const app of apps) {
            db.collection(`app_users${app._id}`).updateMany({}, {$unset: {tkat: 1, tkht: 1}});

            let batch = [],
                count = 0,
                add = async (op, flush) => {
                    if (flush || (batch.length > 0 && batch.length >= 10000)) {
                        if (op) {
                            batch.push(op);
                        }
                        console.log(`... running ${count++}-th batch of consistency updates in "app_users${app._id}"`);
                        if (batch.length) {
                            await db.collection(`app_users${app._id}`).bulkWrite(batch);
                        }
                        batch = [];
                    }
                    else if (op) {
                        batch.push(op);
                    }
                },
                stream = db.collection(`push_${app._id}`).find(),
                fields = ['id', 'ia', 'ip', 'ap', 'hp'],
                update;

            for await (const doc of stream) {
                if (doc.tk) {
                    update = {};
                    fields.forEach(field => {
                        if (doc.tk[field]) {
                            update.$set = update.$set || {};
                            update.$set[`tk${field}`] = true;
                        }
                        else {
                            update.$unset = update.$unset || {};
                            update.$unset[`tk${field}`] = 1;
                        }
                    });
                }
                else {
                    update = {$unset: {tkid: 1, tkia: 1, tkip: 1, tkap: 1, tkhp: 1}};
                }
                await add({updateOne: {filter: {uid: doc._id}, update}});
            }

            await add(null, true);
        }
        
        // Migrate jobs
        await db.collection('jobs').deleteMany({name: 'push:send'});
        await db.collection('jobs').deleteMany({name: 'push:process'});
    }
    finally {
        db.close();
    }
});
