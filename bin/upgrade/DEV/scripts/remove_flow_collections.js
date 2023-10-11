/**
 *  Remove old flow collections after running merge_flow_collections script
 *  Server: countly
 *  Path: countly dir/bin/upgrade/DEV/scripts/remove_flow_collections
 *  Command: node remove_flow_collections.js
 */

const pluginManager = require('../../../../plugins/pluginManager');

pluginManager.dbConnection().then(async(countlyDb) => {
    try {
        let allCollections = await countlyDb.listCollections().toArray();
        let collectionNames = allCollections.map(o => o.name);
        const flowSchemaCollections = collectionNames.filter(x => x.startsWith('flowSchema'));
        const flowDataCollections = collectionNames.filter(x => x.startsWith('flowData'));

        try {
            for(const collectionName of flowSchemaCollections) {
                await countlyDb.collection(collectionName).drop();
                console.log('Finished removing flowSchema collections.');
            }
        }
        catch (error) {
            console.log(`Error removing flowSchema collections: ${error}`);
        }
        try {
            for(const collectionName of flowDataCollections) {
                await countlyDb.collection(collectionName).drop();
                console.log('Finished removing flowData collections.');
            }
        }
        catch (error) {
            console.log(`Error removing flowData collections: ${error}`);
        }
    }
    catch (error) {
        console.log(`Error removing flow collections: ${error}`);
    }
    finally {
        countlyDb.close();
    }
});