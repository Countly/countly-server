// This script will add a new field to crashgroup collections based on latest_version
// This new field can be used to sort crashgroup collection by version in a numerically correct way
// For example if latest_version is '1.10.2' a new field will be added with the value '100001.100010.100002'
// When sorted ascending, '1.10.2' ('100001.100010.100002') will come after '1.2.0' ('100001.100002.100000')
// If latest_version does not follow semantic versioning then its value will be copied to the new field as is

var pluginManager = require('../../../../plugins/pluginManager.js');
var versionUtils = require('../../../../plugins/crashes/api/parts/version.js');

console.log('Upgrading crashgroup data');

pluginManager.dbConnection().then(async (countlyDb) => {
    const BATCH_SIZE = 200;
    const apps = await countlyDb.collection('apps').find({}).project({_id: 1}).toArray();

    for (let idx = 0; idx < apps.length; idx += 1) {
        const crashgroupCollection = `app_crashgroups${apps[idx]._id}`;
        const crashgroups = await countlyDb.collection(crashgroupCollection)
            .find({ _id: { $ne: 'meta' } })
            .project({ _id: 1, latest_version: 1 })
            .toArray();

        let updates = [];
        let errCount = 0;

        for (let idy = 0; idy < crashgroups.length; idy += 1) {
            const crashgroup = crashgroups[idy];
            updates.push({
                updateOne: {
                    filter: { _id: crashgroup._id },
                    update: {
                        $set: { latest_version_for_sort: versionUtils.transformAppVersion(crashgroup.latest_version) }
                    },
                },
            });

            if (updates.length === BATCH_SIZE || idy === crashgroups.length - 1) {
                try {
                    await countlyDb.collection(crashgroupCollection).bulkWrite(updates, { ordered: false });
                }
                catch (err) {
                    errCount += 1;
                    console.error(`Failed updating collection ${crashgroupCollection}`, err);
                }
                finally {
                    updates = [];
                }
            }
        }

        if (errCount === 0) {
            try {
                await countlyDb.collection(crashgroupCollection).updateOne(
                    { _id: 'meta' },
                    { $set: { latest_version_sorter_added: true } },
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
    console.log('Crashgroup upgrade done');
});
