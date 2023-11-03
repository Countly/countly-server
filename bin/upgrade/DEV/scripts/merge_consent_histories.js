// Script to merge all consent_history data
// Merges all app-specific consent_historyAPPID collections into a single consent_history collection

const pluginManager = require('../../../../plugins/pluginManager.js');

function mergeConsentHistoryCollections(collections, db) {
    let targetCollectionName = 'consent_history';
    let processes = [];

    console.log(`Merging consent_historyAPPID collections to ${targetCollectionName}...`);
    for (const collectionName of collections) {
        const appId = collectionName.split(targetCollectionName)[1];
        const pipeline = [];

        pipeline.push({
            $addFields: {
                '_id': { $concat: [appId, '_', { $toString: '$_id' }] },
                'app_id': appId,
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
        let consentCollections = await countlyDb.listCollections().toArray();
        let collectionNames = consentCollections.map(o => o.name);
        const consentHistoryCollections = (collectionNames.filter(x => x.startsWith('consent_history'))).filter(x => !x.endsWith('consent_history'));
        try {
            const result = await mergeConsentHistoryCollections(consentHistoryCollections, countlyDb);
            const faileds = result.filter(x=>x.status === 'rejected');
            if (faileds.length) {
                throw new Error(faileds.map(x=>x.reason).join('\n'));
            }
            console.log('Finished merging consent_history collections.');
        }
        catch (error) {
            console.log(`Error merging consent_history collections: ${error}`);
        }
    }
    catch (error) {
        console.log(`Error merging consent_history collections: ${error}`);
    }
    finally {
        countlyDb.close();
    }
});
