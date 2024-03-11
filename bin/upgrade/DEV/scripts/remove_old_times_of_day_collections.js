// script to delete old timesofdayAPPID collections

const pluginManager = require('../../../../plugins/pluginManager.js');

console.log("Deleting old timesOfDay collections...");

pluginManager.dbConnection().then(async(countlyDb) => {
    try {
        let allCollections = await countlyDb.listCollections().toArray();
        let collectionNames = allCollections.map(o => o.name);
        const consentHistoryCollections = (collectionNames.filter(x => x.startsWith('timesofday'))).filter(x => !x.endsWith('timesofday'));
        try {
            for (const collectionName of consentHistoryCollections) {
                await countlyDb.collection(collectionName).drop();
            }
            console.log('Finished removing timesofdayAPPID collections.');
        }
        catch (error) {
            console.log(`Error removing timesofdayAPPID collections: ${error}`);
        }
    }
    catch (error) {
        console.log(`Error removing timesofdayAPPID collections: ${error}`);
    }
    finally {
        countlyDb.close();
    }
});