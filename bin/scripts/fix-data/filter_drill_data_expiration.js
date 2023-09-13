/**
 *  Description: This script is used to remove all documents without cd field from drill_events collections
 *  Server: countly
 *  Path: $(countly dir)/bin/scripts/fix-data
 *  Command: node filter_drill_data_expiration.js
 */


const asyncjs = require("async");
const pluginManager = require('../../../plugins/pluginManager.js');

pluginManager.dbConnection("countly_drill").then(async function(drillDb) {
    console.log("Connected to database.");
    //get all drill collections
    try {
        const collections = await drillDb.collections();
        asyncjs.eachSeries(collections, async function(collection) {
            // if collection name starts with drill_events, remove all documents without cd field or where cd field is empty
            if (collection.collectionName.indexOf("drill_events") === 0) {
                console.log("Processing collection: ", collection.collectionName);
                try {
                    const deleted = await collection.deleteMany({cd: {$exists: false}});
                    console.log("Deleted documents: ", deleted.deletedCount);
                }
                catch (err) {
                    console.log("Error while deleting documents from collection: ", collection.collectionName, " Error: ", err);
                }
            }
        }, function(err) {
            return close(err);
        });
    }
    catch (err) {
        console.log("Error while fetching collections");
        return close(err);
    }

    function close(err) {
        if (err) {
            console.log("Error: ", err);
        }
        drillDb.close();
        console.log("Done.");
    }
});