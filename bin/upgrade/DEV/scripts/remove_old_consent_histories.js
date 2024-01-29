// script to delete old consent histories

const pluginManager = require('../../../../plugins/pluginManager.js');

console.log("Deleting old consent histories...");

pluginManager.dbConnection().then(async(countlyDb) => {
    try {
        let allCollections = await countlyDb.listCollections().toArray();
        let collectionNames = allCollections.map(o => o.name);
        const consentHistoryCollections = (collectionNames.filter(x => x.startsWith('consent_history'))).filter(x => !x.endsWith('consent_history'));
        try {
            for (const collectionName of consentHistoryCollections) {
                await countlyDb.collection(collectionName).drop();
            }
            console.log('Finished removing consent_historyAPPID collections.');
        }
        catch (error) {
            console.log(`Error removing consent_historyAPPID collections: ${error}`);
        }
    }
    catch (error) {
        console.log(`Error removing consent_historyAPPID collections: ${error}`);
    }
    finally {
        countlyDb.close();
    }
});