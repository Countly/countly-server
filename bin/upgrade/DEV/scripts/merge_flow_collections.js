/**
 *  Merges all app-specific flowSchemaAPPID and flowDataAPPID collections into a single flow_schemas and flow_data collection
 *  Server: countly
 *  Path: countly dir/bin/upgrade/DEV/scripts/merge_flow_collections
 *  Command: node merge_flow_collections.js
 */

const pluginManager = require('../../../../plugins/pluginManager');

function mergeFlowsCollections(type, collections, db) {
    let targetCollectionName = '';
    let processes = [];
    if (type === 'flowSchema') {
        targetCollectionName = 'flow_schemas';
    }
    else if (type === 'flowData') {
        targetCollectionName = 'flow_data';
    }
    else {
        console.log('Invalid collection name given.');
        return;
    }

    console.log(`Merging ${type} collections to ${targetCollectionName}...`);
    for (const collectionName of collections) {
        const appId = collectionName.split(type)[1];
        const pipeline = [];

        pipeline.push({
            $addFields: {
                '_id': { $concat: [appId, '_', { $toString: '$_id' }] },
                'appId': appId,
            },
        });
        pipeline.push({
            $merge: {
                into: targetCollectionName,
                whenMatched: 'keepExisting',
            }
        });

        processes.push(db.collection(collectionName).aggregate(pipeline).toArray());  
    }
    return Promise.allSettled(processes);
}

pluginManager.dbConnection().then(async(countlyDb) => {
    try {
        let allCollections = await countlyDb.listCollections().toArray();
        let collectionNames = allCollections.map(o => o.name);
        const flowSchemaCollections = collectionNames.filter(x => x.startsWith('flowSchema'));
        const flowDataCollections = collectionNames.filter(x => x.startsWith('flowData'));
        try {
            const result = await mergeFlowsCollections('flowSchema', flowSchemaCollections, countlyDb);
            const faileds = result.filter(x=>x.status === 'rejected');
            if (faileds.length) {
                throw new Error(faileds.map(x=>x.reason).join('\n'));
            }
            console.log('Finished merging flowSchema collections.');
        }
        catch (error) {
            console.log(`Error merging flowSchema collections: ${error}`);
        }
        try {
            const result = await mergeFlowsCollections('flowData', flowDataCollections, countlyDb);
            const faileds = result.filter(x=>x.status === 'rejected');
            if (faileds.length) {
                throw new Error(faileds.map(x=>x.reason).join('\n'));
            }
            console.log('Finished merging flowData collections.');
        }
        catch (error) {
            console.log(`Error merging flowData collections: ${error}`);  
        } 
    }
    catch (error) {
        console.log(`Error merging flow collections: ${error}`);
    }
    finally {
        countlyDb.close();
    }
});