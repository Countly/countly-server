// Script to merge all times_of_day collections into a single times_of_day collection

const pluginManager = require('../../../../plugins/pluginManager.js');


function mergeTimesOfDayCollections(collections, db) {
    let targetCollectionName = 'times_of_day';
    let oldCollectionName = 'timesofday';
    let processes = [];

    console.log(`Merging timesofdayAPPID collections to ${targetCollectionName}...`);
    for (const collectionName of collections) {
        const appId = collectionName.split(oldCollectionName)[1];
        const pipeline = [];
        pipeline.push({
            $addFields: {
                "_id": {
                    $concat: [
                        appId,
                        "_",
                        { $toString: "$_id" }
                    ]
                },
                'app_id': appId
            }
        });
        pipeline.push({
            $merge: {
                into: targetCollectionName,
                whenMatched: 'keepExisting'
            }
        });
        processes.push(db.collection(collectionName).aggregate(pipeline).toArray());
    }
    return Promise.allSettled(processes);
}

pluginManager.dbConnection().then(async(countlyDb) => {
    try {
        let timesOfDayCollections = await countlyDb.listCollections().toArray();
        let collectionNames = timesOfDayCollections.map(o => o.name);
        const oldTimesOfDayCollections = (collectionNames.filter(x => x.startsWith('timesofday')));
        try {
            const result = await mergeTimesOfDayCollections(oldTimesOfDayCollections, countlyDb);
            const faileds = result.filter(x=>x.status === 'rejected');
            if (faileds.length) {
                throw new Error(faileds.map(x=>x.reason).join('\n'));
            }
            console.log("Finished merging timesofdayAPPID collections. Collections merged to the new times_of_day.");
        }
        catch (error) {
            console.log(`Error merging timesofdayAPPID collections: ${error}`);
        }
    }
    catch (error) {
        console.log(`Error merging timesofdayAPPID collections: ${error}`);
    }
    finally {
        countlyDb.close();
    }
});
