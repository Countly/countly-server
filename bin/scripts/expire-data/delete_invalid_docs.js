/**
 *  Description: Deletes users from multiple app_users collections based on specified conditions
 *  Server: countly
 *  Path: $(countly dir)/bin/scripts
 *  Command: node delete_invalid_docs.js
 */
const { ObjectId } = require('mongodb');
const pluginManager = require('../../../plugins/pluginManager.js');
const DRY_RUN = true;
const COLLECTION_NAMES = [
    "app_users67fcd37eb89933fa76e0d448",
    "app_users67912f91440130c1b2f3b4",
    "app_users67837eb89933fa76e0f448"
];
const LAC_THRESHOLD = 1730980706;
(async () => {
    try {
        const db = await pluginManager.dbConnection("countly");
        console.log("Connected to database...");
        for (const collectionName of COLLECTION_NAMES) {
            console.log(`Processing collection: ${collectionName}`);
            // Check if the collection exists
            const collectionExists = await db.listCollections({ name: collectionName }).hasNext();
            if (!collectionExists) {
                console.log(`Collection ${collectionName} does not exist. Skipping...`);
                continue;
            }
            const query = {
                $or: [
                    { device_id: { $exists: false } },
                    { uid: { $exists: false } },
                    { ls: { $exists: false } }
                ],
                lac: { $lt: LAC_THRESHOLD }
            };
            const count = await db.collection(collectionName).countDocuments(query);
            console.log(`Matching documents in ${collectionName}: ${count}`);
            if (count > 0) {
                if (DRY_RUN) {
                    console.log(`DRY_RUN enabled. Would delete ${count} documents from collection: ${collectionName}`);
                } else {
                    const result = await db.collection(collectionName).deleteMany(query);
                    console.log(`Deleted ${result.deletedCount} documents from collection: ${collectionName}`);
                }
            } else {
                console.log(`No matching documents found in ${collectionName}.`);
            }
        }
        close(db);
    } catch (err) {
        console.error("Error:", err);
    }
})();
function close(db) {
    db.close()
        .then(() => console.log("Connection closed."))
        .catch(err => console.error("Error closing connection:", err));
}
