/**
 *  Description: Deletes users from multiple app_users collections based on specified conditions
 *  Server: countly
 *  Path: $(countly dir)/bin/scripts
 *  Command: node delete_users.js
 */
const pluginManager = require('../../../plugins/pluginManager.js');
const DRY_RUN = true;
const COLLECTION_NAMES = []; //"app_users12345", "app_users6789"
const LAC_THRESHOLD =  ; //timestamp for which you want to delete eg: 1730980706
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
                }
                else {
                    const result = await db.collection(collectionName).deleteMany(query);
                    console.log(`Deleted ${result.deletedCount} documents from collection: ${collectionName}`);
                }
            }
            else {
                console.log(`No matching documents found in ${collectionName}.`);
            }
        }
        close(db);
    }
    catch (err) {
        console.error("Error:", err);
    }
})();
function close(db) {
    db.close()
        .then(() => console.log("Connection closed."))
        .catch(err => console.error("Error closing connection:", err));
}
