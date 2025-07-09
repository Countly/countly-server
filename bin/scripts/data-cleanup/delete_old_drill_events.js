/**
 * MongoDB script to delete all collections from a database
 * that start with "drill_events" string, but excluding the exact "drill_events" collection
 * 
 * 
 * Server: MongoDB
 * Path: any
 * Command: mongosh -u uname -p 'password' --authenticationDatabase admin delete_old_drill_events.js
 */

/* global db, print, quit */

// Set the database name
const dbName = "countly_drill";

// Set to true for dry run, false to actually delete collections
const dryRun = true;

print(`Using database: ${dbName}`);
var cly = db;
// If we need to switch to a different database
if (db.getName() !== dbName) {
    cly = db.getSiblingDB(dbName);
}

console.log(`Operating on database: ${dbName}`);

// Get all collection names that start with "drill_events" but are not exactly "drill_events"
const collections = cly.getCollectionInfos().map(info => info.name).filter(collName =>
    collName.startsWith("drill_events") && collName !== "drill_events"
);

// Print the collections that will be deleted
print("Collections to be deleted:");
collections.forEach(collName => print(`- ${collName}`));

// Ask for confirmation
if (collections.length === 0) {
    print("No matching collections found to delete.");
    quit();
}

print(`\nFound ${collections.length} collections to delete.`);


if (dryRun) {
    print("Dry run mode is enabled. No collections will be deleted.");
    print("To proceed with deletion, set 'dryRun' to false in the script.");
    quit();
}

// Delete each collection
let deletedCount = 0;
collections.forEach(collName => {
    try {
        cly[collName].drop();
        print(`Dropped collection: ${collName}`);
        deletedCount++;
    }
    catch (error) {
        print(`Error dropping collection ${collName}: ${error}`);
    }
});

// Print summary
print(`\nOperation completed. Deleted ${deletedCount} out of ${collections.length} collections.`);