// This script will add a new field to crashgroup documents based on app_version
// Currently app_version is stored as an object like { '4:1:0': 20, '4:2:0': 10 }
// This script will take all of the keys from the object above and store it into an array
// With the array, it will be possible to query crashgroup with partial app version, e.g. the query '4.2' will get crashgroups that have app version '4.2.0', '4.2.1', etc

const pluginManager = require('../../../../plugins/pluginManager.js');

console.log('Updating crashgroup data');

pluginManager.dbConnection().then(async (countlyDb) => {
    const BATCH_SIZE = 200;

    countlyDb.collection('apps').find({}).toArray(async (err, apps) => {
        async function update(app) {
            console.log(`Updating crashgroup for ${app.name}`);

            const cursor = await countlyDb.collection(`app_crashgroups${app._id}`)
                .find({ _id: { $ne: 'meta' } }, { fields: { _id: 1, app_version: 1 } });
            let requests = [];

            while (await cursor.hasNext()) {
                const crashgroup = await cursor.next();

                requests.push({ 
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

                if (requests.length === BATCH_SIZE) {
                    try {
                        await countlyDb.collection(`app_crashgroups${app._id}`).bulkWrite(requests);
                    }
                    catch (err) {
                        console.error(err);
                    }

                    requests = [];
                }
            }

            if(requests.length > 0) {
                try {
                    await countlyDb.collection(`app_crashgroups${app._id}`).bulkWrite(requests);
                }
                catch (err) {
                    console.error(err);
                }
            }

            console.warn(`${app.name} done`);
        }

        for (idx = 0; idx < apps.length; idx += 1) {
            await update(apps[idx]);
        }

        console.log("Crashgroup data update finished");
        countlyDb.close();
    });
});
