print("cleanup.js started " + new Date());

var currDBAddress = "IP_ADDRESS:PORT";
var currDBName = "countly";

/*
    **************************************************
    ****************DO NOT EDIT BELOW*****************
    **************************************************
 */

load("parseConnection.js");

var currDBAddress = dbObject.host;
var currDBName = dbObject.name;

if (currDBAddress == "IP_ADDRESS:PORT") {
    print("**********************************");
    print("Please configure currDBAddress before running this script...");
    print("**********************************");
    quit();
}

var currConn = new Mongo(currDBAddress);
var currDB = currConn.getDB(currDBName);
if (dbObject.username && dbObject.password) {
    currDB.auth(dbObject.username, dbObject.password);
}

currDB.getCollection("sessions").drop();
currDB.getCollection("locations").drop();
currDB.getCollection("app_versions").drop();

currDB.getCollection("users").remove({old: true});
currDB.getCollection("devices").remove({old: true});
currDB.getCollection("device_details").remove({old: true});
currDB.getCollection("carriers").remove({old: true});

currDB.getCollectionNames().filter(function(name) {
    return name.match(/events.+/);
}).forEach(function(name) {
    currDB.getCollection(name).remove({old: true});
});

print("cleanup.js ended " + new Date());