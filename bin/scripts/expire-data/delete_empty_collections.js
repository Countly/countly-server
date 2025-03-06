/**
 *  Description: Deletes empty collections from database.By default it checks to delete from drill database. You can further tweak it to delete from countly database by changing drill to db in parameters passed
 *  Server: countly
 *  Path: $(countly dir)/bin/scripts/expire-data
 *  Command: node delete_empty_collections.js
 */
var plugins = require("../../../plugins/pluginManager");
var Promise = require("bluebird");
var DRY_RUN = true; // Set this to false to perform actual drop
Promise.all([plugins.dbConnection("countly"), plugins.dbConnection("countly_drill")]).spread(function(db, drill) {
    function dropCollections(database, collections, dryRun) {
        collections.forEach(function(collection) {
            if (database.collection(collection)) {
                console.log((dryRun ? "[DRY RUN] " : "") + "Dropping collection: " + collection);
                if (!dryRun) {
                    database.collection(collection).drop(function(err, delOK) {
                        if (err) {
                            console.log("Error dropping collection: " + collection, err);
                        }
                        else if (delOK) {
                            console.log("Collection dropped: " + collection);
                        }
                        else {
                            console.log("Failed to drop collection: " + collection);
                        }
                    });
                }
            }
            else {
                console.log("Collection not found: " + collection);
            }
        });
        console.log("Collection drop process completed.");
    }
    // Fetch empty collections from countly_drill
    let emptyCollections = [];
    drill.listCollections().toArray(function(err, collections) {
        if (err) {
            console.log("Error fetching collections:", err);
        }
        else {
            collections.forEach(function(collection) {
                drill.collection(collection.name).countDocuments({}, function(err, count) {
                    if (!err && count === 0) {
                        console.log("Empty Collection: " + collection.name);
                        emptyCollections.push(collection.name);
                    }
                });
            });
            // Once empty collections are identified, proceed with dropping
            setTimeout(() => {
                console.log("\nDropping empty collections from countly_drill...");
                dropCollections(drill, emptyCollections, DRY_RUN);
                db.close();
                drill.close();
            }, 5000); // Delay to ensure collections are logged before drop
        }
    });
});
