/**
 *  Setup TTL indexes to delete older data on multiple collections. This script should be run periodically, to create TTL indexes on new collections too, like new apps and new events, etc. For authentication mongo shell must be authenticated, as well as specifically authenticated in the script too.
 *  Server: mongodb
 *  Path: any
 *  Command: mongosh < mongo_expireData.js
 */

var COUNTLY_DRILL = 'countly_drill',
    COUNTLY = 'countly',
    EXPIRE_AFTER = 60 * 60 * 24 * 365, //1 year in seconds
    INDEX_NAME = "cd_1";

var PROCESS = [
    /^drill_events\.*/,
	/^app_crashes\.*/,
	/^metric_changes\.*/,
	/^consent_history\.*/,
	/^feedback[^_]*/,
	/^symbolication_jobs/,
	/^systemlogs/
];

/* global Mongo, print, printjson */

var conn = new Mongo();

/**
 //  Enable for auth
 
var authDB = conn.getDB('admin');
authDB.auth('<username>', '<password>');

 **/

var cly = conn.getDB(COUNTLY),
    drill = conn.getDB(COUNTLY_DRILL);

var clyCollections = cly.getCollectionNames(), collections = clyCollections.concat(drill.getCollectionNames()), check = [], update = [];

collections.forEach(function(c) {
    var process = false;
    PROCESS.forEach(function(r) {
        if (typeof r === 'string' && r === c) {
            process = true;
        }
        else if (typeof r === 'object' && r.test(c)) {
            process = true;
        }
    });
    if (process) {
        var db = clyCollections.indexOf(c) === -1 ? drill : cly;
        var indexes = db[c].getIndexes();
        var hasIndex = false;
        for (var i = 0; i < indexes.length; i++) {
            if (indexes[i].name == INDEX_NAME) {
                if (indexes[i].expireAfterSeconds == EXPIRE_AFTER) {
                    //print("skipping", c)
                    hasIndex = true;
                }
                //has index but incorrect expire time, need to be reindexed
                else {
                    update.push(c);
                    hasIndex = true;
                }
                break;
            }
        }
        if (!hasIndex) {
            check.push(c);
        }
    }
});

print('Indexing following collections:');
printjson(check);

check.forEach(function(c) {
    var db = clyCollections.indexOf(c) === -1 ? drill : cly;
    db.getCollection(c).createIndex({"cd": 1}, { expireAfterSeconds: EXPIRE_AFTER, background: true });
});

update.forEach(function(c) {
    print("Updating  index for", c);
    var db = clyCollections.indexOf(c) === -1 ? drill : cly;
    db.runCommand({
        "collMod": c,
        "index": {
            "keyPattern": {"cd": 1},
            expireAfterSeconds: EXPIRE_AFTER
        }
    }, function(err) {
        console.log(err);
    });
});

