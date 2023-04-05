const pluginManager = require('../../../../plugins/pluginManager.js'),
    { util } = require('../../../../plugins/push/api/send/std.js'),
    { fields, platforms, PLATFORM, TK } = require('../../../../plugins/push/api/send/platforms');

pluginManager.dbConnection('countly').then(async(db) => {
    try {
        let apps = await db.collection('apps').find({}, {_id: 1}).toArray(),
            fields_appusers = fields(platforms, true);
        for (let app of apps) {
            console.log('Hashing tokens of app %s', app._id);

            let $unset = {};
            fields_appusers.forEach(field => {
                $unset[field] = 1;
            });
            await db.collection(`app_users${app._id}`).updateMany({}, {$unset});
            console.log('Done unsetting bools');
            
            let stream = db.collection(`push_${app._id}`).find({tk: {$exists: 1}}, {tk: 1}),
                batch = [],
                count = 0,
                add = async (op, flush) => {
                    if (flush || (batch.length > 0 && batch.length >= 10000)) {
                        if (op) {
                            batch.push(op);
                        }
                        if (batch.length) {
                            console.log('... updating %d-th record', count++);
                            await db.collection(`app_users${app._id}`).bulkWrite(batch);
                            batch = [];
                        }
                        else {
                            console.log('... nothing to flush');
                        }
                    }
                    else if (op) {
                        batch.push(op);
                    }
                };

            for await (const doc of stream) {
                let $set = {},
                    $setset = false;

                for (const p in PLATFORM) {
                    for (const n in PLATFORM[p].FIELDS) { // number
                        const f = PLATFORM[p].FIELDS[n],  // field key
                            field = p + f;

                        if (doc.tk[field]) {
                            $set[TK + field] = util.hashInt(doc.tk[field]);
                            $setset = true;
                        }
                    }
                }

                if ($setset) {
                    await add({updateOne: {filter: {uid: doc._id}, update: {$set}}});
                }
            }

            // flush the rest
            await add(null, true);
            console.log('Done setting ints for app %s', app._id);
        }
    }
    catch(e) {
        console.error(e);
    }
    db.close();
});