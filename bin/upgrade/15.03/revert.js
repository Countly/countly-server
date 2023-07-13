var dbAddress = "IP_ADDRESS:PORT";
var dbName = "countly";

/*
    **************************************************
    ****************DO NOT EDIT BELOW*****************
    **************************************************
 */

if (dbAddress == "IP_ADDRESS:PORT") {
    print("**********************************");
    print("Please configure dbAddress before running this script...");
    print("**********************************");
    quit();
}

var conn = new Mongo(dbAddress);
var db = conn.getDB(dbName);

db.getCollection("users").remove({m: {$exists: true}, a: {$exists: true}});
db.getCollection("devices").remove({m: {$exists: true}, a: {$exists: true}});
db.getCollection("device_details").remove({m: {$exists: true}, a: {$exists: true}});
db.getCollection("carriers").remove({m: {$exists: true}, a: {$exists: true}});

db.getCollectionNames().filter(function(name) {
    return name.match(/events.+/);
}).forEach(function(name) {
    db.getCollection(name).remove({m: {$exists: true}, s: {$exists: true}});
});