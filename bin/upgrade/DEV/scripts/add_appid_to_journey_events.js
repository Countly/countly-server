/**
 *  Backfill appId on existing journey_events documents.
 *
 *  journey_events only stored journeyInstanceId, so removing an app's events on
 *  reset/delete required matching by a list of journey instance ids, which can
 *  exceed the 16MB BSON query limit for busy apps. appId is now stored on new
 *  events; this script backfills it on existing ones by resolving the parent
 *  journey_instances document. Events whose instance no longer exists are left
 *  untouched (they are already orphaned and cannot be attributed to an app).
 *
 *  Server: countly
 *  Path: countly dir/bin/upgrade/DEV/scripts/add_appid_to_journey_events.js
 *  Command: node add_appid_to_journey_events.js
 */
const pluginManager = require('../../../../plugins/pluginManager.js');

const BATCH_SIZE = 1000;

pluginManager.dbConnection().then(async(countlyDb) => {
    try {
        const cursor = countlyDb.collection('journey_events').aggregate([
            { $match: { appId: { $exists: false } } },
            {
                $lookup: {
                    from: 'journey_instances',
                    localField: 'journeyInstanceId',
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
                await countlyDb.collection('journey_events').bulkWrite(batch, { ordered: false });
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

        console.log(`Finished backfilling appId on ${updated} journey_events documents.`);
    }
    catch (error) {
        console.log(`Error backfilling appId on journey_events: ${error}`);
        process.exitCode = 1;
    }
    finally {
        countlyDb.close();
    }
}).catch((error) => {
    console.log(`Error connecting for journey_events appId migration: ${error}`);
    process.exitCode = 1;
});
