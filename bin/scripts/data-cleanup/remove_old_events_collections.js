/*
Script to delete events collections after migrating to single collection
!! DO NOT RUN IT BEFORE MAKING SURE DATA IS MIGRATED TO SINGLE COLLECTION !!

 Path: $(countly dir)/bin/scripts/data-cleanup
To run this script use the following command
node <path>/remove_old_events_collections.js
*/
var pluginManager = require('../../../plugins/pluginManager.js');

var force = true; //if set to false will skip event collections which do not show up as migrated
if (force === false) {
    console.log("Script will skip all collections without migration flag. If there are any collections which were skipped in migration because they could not be associated with any app - those will not be deleted. Safe approach is to run merging again and compare skipped collection list with collections not deleted by this scrip.");
}
console.log("Removing old Events collections");
var failedCn = 0;
pluginManager.dbConnection().then(async(countlyDb) => {
    //get list with all collections
    try {
        let allCollections = await countlyDb.listCollections().toArray();
        let collectionNames = allCollections.map(o => o.name);

        for (var z = 0; z < collectionNames.length; z++) {
            if (collectionNames[z].indexOf("events") === 0 && collectionNames[z].length > 16) {
                if (force) {
                    console.log("Dropping collection: " + collectionNames[z]);
                    await countlyDb.collection(collectionNames[z]).drop();
                }
                else {
                    await new Promise((resolve) => {
                        countlyDb.collection(collectionNames[z]).findOne({"merged": {"$ne": true}}, {"_id": 1}, function(err, res) {
                            if (err) {
                                console.log(err);
                                failedCn++;
                                resolve();
                            }
                            else {
                                if (res) {
                                    console.log("Collection not migrated: " + collectionNames[z]);
                                    failedCn++;
                                    resolve();
                                }
                                else {
                                    countlyDb.collection(collectionNames[z]).drop(function(err) {
                                        if (err) {
                                            console.log(err);
                                            failedCn++;
                                        }
                                        resolve();
                                    });
                                }
                            }
                        });
                    });
                }
            }
        }
    }
    catch (error) {
        console.log(`Error removing old events collections: ${error}`);
        countlyDb.close();
    }
    finally {
        if (failedCn > 0) {
            console.log("Failed to remove collections: ", failedCn);
        }
        console.log("Done");
        countlyDb.close();
    }
});