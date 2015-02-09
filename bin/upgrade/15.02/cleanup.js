print("cleanup.js started " + new Date());

var currDBAddress = "IP_ADDRESS:PORT";
var currDBName = "countly";

/*
    **************************************************
    ****************DO NOT EDIT BELOW*****************
    **************************************************
 */
 
load("../../../frontend/express/config.js")

//mongodb://[username:password@]host1[:port1][,host2[:port2],...[,hostN[:portN]]][/[database][?options]]
var dbName;
countlyConfig.mongodb.db = countlyConfig.mongodb.db || 'countly';
if (typeof countlyConfig.mongodb === "string") {
    dbName = countlyConfig.mongodb;
} else if ( typeof countlyConfig.mongodb.replSetServers === 'object'){
	//mongodb://db1.example.net,db2.example.net:2500/?replicaSet=test
    dbName = countlyConfig.mongodb.replSetServers.join(",");
	if(countlyConfig.mongodb.username && countlyConfig.mongodb.password){
		dbName = countlyConfig.mongodb.username + ":" + countlyConfig.mongodb.password +"@" + dbName;
	}
} else {
    dbName = (countlyConfig.mongodb.host + ':' + countlyConfig.mongodb.port);
	if(countlyConfig.mongodb.username && countlyConfig.mongodb.password){
		dbName = countlyConfig.mongodb.username + ":" + countlyConfig.mongodb.password +"@" + dbName;
	}
}

var currDBAddress = dbName;
var currDBName = countlyConfig.mongodb.db;

if (currDBAddress == "IP_ADDRESS:PORT") {
    print("**********************************");
    print("Please configure currDBAddress before running this script...");
    print("**********************************");
    quit();
}

var currConn = new Mongo(currDBAddress);
var currDB = currConn.getDB(currDBName);

currDB.getCollection("sessions").drop();
currDB.getCollection("locations").drop();
currDB.getCollection("app_versions").drop();

currDB.getCollection("users").remove({old:true});
currDB.getCollection("devices").remove({old:true});
currDB.getCollection("device_details").remove({old:true});
currDB.getCollection("carriers").remove({old:true});

currDB.getCollectionNames().filter(function(name) {
    return name.match(/events.+/);
}).forEach(function(name) {
    currDB.getCollection(name).remove({old:true});
});

print("cleanup.js ended " + new Date());