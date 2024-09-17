// Script to merge  consent_history data
// Merges app-specific consent_historyAPPID collections into a single consent_history collection

const pluginManager = require('../../../../plugins/pluginManager.js');

const APPS_TO_EXCLUDE = [];
const APPS_TO_MERGE = [];

const TARGET_COLLECTION_NAME = 'consent_history';

function mergeConsentHistoryCollections(collections, db) {
    let processes = [];

    console.log(`Merging consent_historyAPPID collections to ${TARGET_COLLECTION_NAME}...`);
    for (const collectionName of collections) {
        const appId = collectionName.split(TARGET_COLLECTION_NAME)[1];
        const pipeline = [];

        pipeline.push({
            $addFields: {
                'app_id': appId,
            }
        });

        pipeline.push({
            $merge: {
                into: TARGET_COLLECTION_NAME,
                whenMatched: 'keepExisting'
            }
        });
        processes.push(db.collection(collectionName).aggregate(pipeline).toArray());
    }
    return Promise.allSettled(processes);
}

pluginManager.dbConnection().then(async(countlyDb) => {
    try {
        countlyDb.collection(TARGET_COLLECTION_NAME).ensureIndex({device_id: 1}, function() {});
        countlyDb.collection(TARGET_COLLECTION_NAME).ensureIndex({uid: 1}, function() {});
        countlyDb.collection(TARGET_COLLECTION_NAME).ensureIndex({type: 1}, function() {});
        countlyDb.collection(TARGET_COLLECTION_NAME).ensureIndex({ts: 1}, function() {});

        let consentCollections = await countlyDb.listCollections().toArray();
        let collectionNames = consentCollections.map(o => o.name);
        var consentHistoryCollections = collectionNames.filter(x => (x.startsWith('consent_history') && !x.endsWith('consent_history')));

        //If list of apps to exclude is provided, filter out those collections
        if (APPS_TO_EXCLUDE.length) {
            consentHistoryCollections = consentHistoryCollections.filter(x => !APPS_TO_EXCLUDE.some(appId => x.endsWith(appId)));
        }
        //If list of apps to merge is provided, filter out only those collections
        else if (APPS_TO_MERGE.length) {
            consentHistoryCollections = consentHistoryCollections.filter(x => APPS_TO_MERGE.some(appId => x.endsWith(appId)));
        }
        //If no list of apps to exclude or merge is provided, merge all collections
        console.log("Merging the following consent_historyAPPID collections: " + consentHistoryCollections.join(', '));

        try {
            const result = await mergeConsentHistoryCollections(consentHistoryCollections, countlyDb);
            const faileds = result.filter(x=>x.status === 'rejected');
            if (faileds.length) {
                throw new Error(faileds.map(x=>x.reason).join('\n'));
            }
            console.log("Finished merging consent_historyAPPID collections to the new " + TARGET_COLLECTION_NAME + " collection.");
        }
        catch (error) {
            console.log(`Error merging consent_historyAPPID collections: ${error}`);
        }
    }
    catch (error) {
        console.log(`Error merging consent_historyAPPID collections: ${error}`);
    }
    finally {
        countlyDb.close();
    }
});
