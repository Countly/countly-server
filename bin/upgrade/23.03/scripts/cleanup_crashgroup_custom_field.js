const pluginManager = require('../../../../plugins/pluginManager.js');
const { generateUpdates } = require('../../../../plugins/crashes/api/parts/custom_field.js');

console.log('Cleaning up crashgroup custom fields');

pluginManager.dbConnection().then(async(countlyDb) => {
    const BATCH_SIZE = 200;
    const apps = await countlyDb.collection('apps').find({}).project({_id: 1}).toArray();

    for (let idx = 0; idx < apps.length; idx += 1) {
        const crashgroupCollection = `app_crashgroups${apps[idx]._id}`;
        const crashgroups = await countlyDb.collection(crashgroupCollection)
            .find({ _id: { $ne: 'meta' }, 'custom': { $exists: true } })
            .project({ custom: 1 })
            .toArray();

        let updates = [];

        for (let idy = 0; idy < crashgroups.length; idy += 1) {
            updates = updates.concat(generateUpdates(crashgroups[idy]));

            if (updates.length === BATCH_SIZE || idy === crashgroups.length - 1) {
                try {
                    await countlyDb.collection(crashgroupCollection).bulkWrite(updates, { ordered: false });
                }
                catch (err) {
                    console.error(`Failed updating collection ${crashgroupCollection}`, err);
                }
                finally {
                    updates = [];
                }
            }
        }
    }

    countlyDb.close();
    console.log('Crashgroup cleanup done');
});
