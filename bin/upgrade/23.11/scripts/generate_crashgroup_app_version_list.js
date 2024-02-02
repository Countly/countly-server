// This script will add a new field to crashgroup documents based on app_version
// Currently app_version is stored as an object like { '4:1:0': 20, '4:2:0': 10 }
// This script will take all of the keys from the object above and store it into an array
// With the array, it will be possible to query crashgroup with partial app version, e.g. the query '4.2' will get crashgroups that have app version '4.2.0', '4.2.1', etc

var pluginManager = require('../../../../plugins/pluginManager.js');

console.log('Updating crashgroup data');

pluginManager.dbConnection().then(async (countlyDb) => {
    console.log('Generating updates');

    const apps = await countlyDb.collection('apps').find({}).project({_id: 1}).toArray();
    const updates = {};

    for (let idx = 0; idx < apps.length; idx += 1) {
        const crashgroupCollection = `app_crashgroups${apps[idx]._id}`;
        const crashgroups = await countlyDb.collection(crashgroupCollection)
            .find({ _id: { $ne: 'meta' } })
            .project({ _id: 1, app_version: 1 })
            .toArray();

        updates[apps[idx]._id] = crashgroups.reduce((acc, crashgroup) => {
            acc.push({
                updateOne: {
                    filter: { _id: crashgroup._id },
                    update: {
                        $addToSet: {
                            app_version_list: {
                                $each: Object.keys(crashgroup.app_version).map((item) => item.replace(/:/g, '.')),
                            },
                        },
                    },
                },
            });

            return acc;
        }, []);
    }

    console.log('Applying updates');

    const BATCH_SIZE = 200;
    let errCount = 0;

    for (let idx = 0; idx < apps.length; idx += 1) {
        const appId = apps[idx]._id;
        const crashgroupCollection = `app_crashgroups${appId}`;

        if (updates[appId]) {
            let buffer = [];

            for (let idy = 0; idy < updates[appId].length; idy += 1) {
                buffer.push(updates[appId][idy]);

                if (buffer.length === BATCH_SIZE || idy === updates[appId].length - 1) {
                    try {
                        await countlyDb.collection(crashgroupCollection).bulkWrite(buffer, { ordered: false });
                    }
                    catch (err) {
                        errCount += 1;
                        console.error(`Failed updating collection ${crashgroupCollection}`, err);
                    }
                    finally {
                        buffer.length = 0;
                    }
                }
            }
        }

        if (errCount === 0) {
            try {
                await countlyDb.collection(crashgroupCollection).updateOne(
                    { _id: 'meta' },
                    { $set: { app_version_list_added: true } },
                );
            }
            catch (err) {
                console.error(`Failed updating collection ${crashgroupCollection} meta`, err);
            }
        }
        else {
            console.error(`${errCount} batches failed when updating collection ${crashgroupCollection}`);
        }
    }

    countlyDb.close();
    console.log('Crashgroup data update done');
});
