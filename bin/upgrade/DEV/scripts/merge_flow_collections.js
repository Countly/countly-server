/**
 *  Merges all app-specific flowSchemaAPPID and flowDataAPPID collections into a single flow_schemas and flow_data collection
 *  Server: countly
 *  Path: countly dir/bin/upgrade/DEV/scripts/merge_flow_collections
 *  Command: node merge_flow_collections.js
 */

const pluginManager = require('../../../../plugins/pluginManager');

async function mergeFlowsCollections(type, collections, db) {
    let targetCollectionName = '';
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
    const targetCollection = db.collection(targetCollectionName);

    for (const collectionName of collections) {
        const sourceCollection = db.collection(collectionName);
        const documents = await sourceCollection.find().toArray();

        const appId = collectionName.split(type)[1];
        documents.forEach((document) => {
            document.appId = appId;
        });
        await targetCollection.insertMany(documents);
    }
    
    console.log(`${type} collections successfully merged to ${targetCollectionName}`);       
}

pluginManager.dbConnection().then(async(countlyDb) => {
    try {
        let allCollections = await countlyDb.listCollections().toArray();
        let collectionNames = allCollections.map(o => o.name);
        const flowSchemaCollections = collectionNames.filter(x => x.startsWith('flowSchema'));
        const flowDataCollections = collectionNames.filter(x => x.startsWith('flowData'));
        try {
            await mergeFlowsCollections('flowSchema', flowSchemaCollections, countlyDb);
        }
        catch (error) {
            console.log(`Error merging flowSchema collections: ${error}`);
        }
        try {
            await mergeFlowsCollections('flowData', flowDataCollections, countlyDb);
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