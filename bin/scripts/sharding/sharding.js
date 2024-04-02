/*
*  Sharding Countly collections when DB requires authentication, provide it to authDB.auth command in the code
*  Server: mongodb
*  Path: any
*  Command: mongosh < sharding.js
*/

/* global Mongo, print, printjson */
var COUNTLY_DRILL = 'countly_drill',
    COUNTLY = 'countly',
    COUNT_TO_SHARD = 100000;

var EXCEPTIONS = [
    /^system\./,
];

var COUNTLY_TO_SHARD = [
    "drill_events",
    "app_users",
    "app_crashes",
    "app_crashsymbols",
    "app_nxret",
    "app_userviews",
    "app_viewdata",
    "consent_history",
    //"eventTimes",
    "feedback",
];

var conn = new Mongo(),
    authDB = conn.getDB('admin');

// need to update this info
authDB.auth('<username>', '<password>');

var cly = conn.getDB(COUNTLY),
    drill = conn.getDB(COUNTLY_DRILL);

var clyCollections = cly.getCollectionNames(), collections = clyCollections.concat(drill.getCollectionNames()), check = [];

collections.forEach(function(c) {
    var system = false;
    EXCEPTIONS.forEach(function(r) {
        if (typeof r === 'string' && r === c) {
            system = true;
        }
        else if (typeof r === 'object' && r.test(c)) {
            system = true;
        }
    });
    if (!system) {
        check.push(c);
    }
});

print('Checking following collections:');
printjson(check);

check.forEach(function(c) {
    var exceptional = true;
    var db = clyCollections.indexOf(c) === -1 ? drill : cly,
        dbName = clyCollections.indexOf(c) === -1 ? COUNTLY_DRILL : COUNTLY,
        count = db[c].count(),
        capped = db[c].stats()['capped'],
        status = db[c].getShardVersion().ok;

    COUNTLY_TO_SHARD.some((e) => {
        if (c.indexOf(e) == 0) {
            exceptional = false;
            return false;
        }
    });

    if (!capped && count > COUNT_TO_SHARD && !status && !exceptional) {
        print('Creating hashed index & enabling sharding for collection "' + c + '"... ');

        db.getCollection(c).createIndex({ _id: 'hashed' });
        var ok = db.adminCommand({ shardCollection: dbName + '.' + c, key: { _id: 'hashed' } });
        if (ok.ok) {
            print('OK');
        }
        else {
            printjson(ok);
        }
    }
});
