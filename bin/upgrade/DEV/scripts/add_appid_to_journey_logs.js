/**
 *  Backfill appId on existing journey_logs documents.
 *
 *  journey_logs previously had to be removed on app reset/delete by matching a
 *  list of journey instance ids, which can exceed the 16MB BSON query limit for
 *  busy apps. appId is now stored on new logs; this script backfills it on
 *  existing ones. A journey_logs document's _id is the journey instance _id, so
 *  appId is resolved from the matching journey_instances document. Logs whose
 *  instance no longer exists are left untouched (they cannot be attributed to
 *  an app).
 *
 *  Server: countly
 *  Path: countly dir/bin/upgrade/DEV/scripts/add_appid_to_journey_logs.js
 *  Command: node add_appid_to_journey_logs.js
 */
const pluginManager = require('../../../../plugins/pluginManager.js');

const BATCH_SIZE = 1000;

pluginManager.dbConnection().then(async(countlyDb) => {
    try {
        const cursor = countlyDb.collection('journey_logs').aggregate([
            { $match: { appId: { $exists: false } } },
            {
                $lookup: {
                    from: 'journey_instances',
                    localField: '_id',
                    foreignField: '_id',
                    as: 'instance'
                }
            },
            { $project: { appId: { $arrayElemAt: ['$instance.appId', 0] } } },
            { $match: { appId: { $ne: null } } }
        ], { allowDiskUse: true });

        let batch = [];
        let updated = 0;

        const flush = async function() {
            if (batch.length) {
                await countlyDb.collection('journey_logs').bulkWrite(batch, { ordered: false });
                updated += batch.length;
                batch = [];
            }
        };

        while (await cursor.hasNext()) {
            const doc = await cursor.next();
            batch.push({
                updateOne: {
                    filter: { _id: doc._id },
                    update: { $set: { appId: doc.appId } }
                }
            });
            if (batch.length >= BATCH_SIZE) {
                await flush();
            }
        }
        await flush();

        console.log(`Finished backfilling appId on ${updated} journey_logs documents.`);
    }
    catch (error) {
        console.log(`Error backfilling appId on journey_logs: ${error}`);
        process.exitCode = 1;
    }
    finally {
        countlyDb.close();
    }
}).catch((error) => {
    console.log(`Error connecting for journey_logs appId migration: ${error}`);
    process.exitCode = 1;
});
