/*
*  Sharding crashgroups* collections
*  Server: mongodb
*  Path: any
*  Command: mongosh -u uname -p 'password' --authenticationDatabase admin sharding.js
*/

/* global db, print, printjson */

// Set countly database name
const COUNTLY = 'countly';
// Set the threshold for sharding collections
const SHARDING_THRESHOLD = 100000;

const EXCEPTIONS = [
    /^system\./,
];

var COLLECTION_TO_SHARD = [
    'app_crashgroups'
];

const clyDb = db.getSiblingDB(COUNTLY);

const allClyCollections = clyDb.getCollectionNames();
const toProcess = [];

allClyCollections.forEach((c) => {
    let system = false;
    EXCEPTIONS.forEach((r) => {
        if (typeof r === 'string' && r === c) {
            system = true;
        }
        else if (typeof r === 'object' && r.test(c)) {
            system = true;
        }
    });
    if (!system) {
        toProcess.push(c);
    }
});

print('Checking following collections to shard:');
printjson(toProcess);

toProcess.forEach(function(collectionName) {
    let shouldBeSharded = false;
    const dbName = COUNTLY;
    const docCount = clyDb[collectionName].countDocuments();
    const capped = clyDb[collectionName].stats()['capped'];

    COLLECTION_TO_SHARD.some((e) => {
        if (collectionName.indexOf(e) == 0) {
            shouldBeSharded = true;
            return false;
        }
    });

    if (!capped && docCount > SHARDING_THRESHOLD && shouldBeSharded) {
        print(`Creating hashed index & enabling sharding for collection "${collectionName}"`);

        clyDb.getCollection(collectionName).createIndex({ _id: 'hashed' });
        const ok = clyDb.adminCommand({ shardCollection: `${dbName}.${collectionName}`, key: { _id: 'hashed' } });
        if (ok.ok) {
            print('OK');
        }
        else {
            printjson(ok);
        }
    }
});
