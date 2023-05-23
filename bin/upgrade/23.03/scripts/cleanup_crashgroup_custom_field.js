const pluginManager = require('../../../../plugins/pluginManager.js');

console.log('Cleaning up crashgroup custom fields');

pluginManager.dbConnection().then(async(countlyDb) => {
    const BATCH_SIZE = 200;
    const MAX_CUSTOM_FIELD_KEYS = 100;
    const apps = await countlyDb.collection('apps').find({}).project({_id: 1}).toArray();

    for (let idx = 0; idx < apps.length; idx += 1) {
        const crashgroupCollection = `app_crashgroups${apps[idx]._id}`;
        const crashgroups = await countlyDb.collection(crashgroupCollection)
            .find({ _id: { $ne: 'meta' }, 'custom': { $exists: true } })
            .project({ custom: 1 })
            .toArray();

        let updates = [];

        for (let idy = 0; idy < crashgroups.length; idy += 1) {
            const crashgroup = crashgroups[idy];
            const keysToRemove = {};

            for (const key in crashgroup.custom) {
                const excessFields = Object.keys(crashgroup.custom[key]).length - MAX_CUSTOM_FIELD_KEYS;

                if (excessFields > 0) {
                    Object.entries(crashgroup.custom[key])
                        .sort((a, b) => a[1] - b[1])
                        .slice(0, excessFields)
                        .forEach(([k, _]) => keysToRemove[`custom.${key}.${k}`] = '');
                }
            }

            if (Object.keys(keysToRemove).length > 0) {
                updates.push({
                    updateOne: {
                        filter: { _id: crashgroups[idy]._id },
                        update: {
                            $unset: keysToRemove,
                        },
                    },
                });
            }

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
