/**
 *  Deletes data in drill based on period
 *  Modify start and end before running script.
 *  Path: any
 *  Command: mongo < mongo_expireDataPeriod.js
 */

var COUNTLY_DRILL = 'countly_drill',
    start = 1157738337000, //min timestamp
    end = 1657738337000; //max timestamp

var PROCESS = [
    /^drill_events\.*/
];

/* global Mongo, print, printjson */

var conn = new Mongo();

var query = {"ts": {"$gte": start, "$lt": end}};
/**
 //  Enable for auth
 
var authDB = conn.getDB('admin');
authDB.auth('<username>', '<password>');

 **/

var drill = conn.getDB(COUNTLY_DRILL);

var collections = drill.getCollectionNames();

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
        print('clearing data from collection:' + c);
        var rr = drill.getCollection(c).remove(query);
        print(JSON.stringify(rr));
    }
});

print('Done with cleanup');

