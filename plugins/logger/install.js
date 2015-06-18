var mongo = require('mongoskin'),
	async = require('async'),
	countlyConfig = require('../../frontend/express/config');
	
var dbName;
var dbOptions = {
	server:{auto_reconnect:true, socketOptions: { keepAlive: 1, connectTimeoutMS: 30000 }},
	replSet:{socketOptions: { keepAlive: 1, connectTimeoutMS: 30000 }},
	mongos:{socketOptions: { keepAlive: 1, connectTimeoutMS: 30000 }}
};
if (typeof countlyConfig.mongodb === "string") {
	dbName = countlyConfig.mongodb;
} else{
	countlyConfig.mongodb.db = countlyConfig.mongodb.db || 'countly';
	if ( typeof countlyConfig.mongodb.replSetServers === 'object'){
		//mongodb://db1.example.net,db2.example.net:2500/?replicaSet=test
		dbName = countlyConfig.mongodb.replSetServers.join(",")+"/"+countlyConfig.mongodb.db;
	} else {
		dbName = (countlyConfig.mongodb.host + ':' + countlyConfig.mongodb.port + '/' + countlyConfig.mongodb.db);
	}
}
if(dbName.indexOf("mongodb://") !== 0){
	dbName = "mongodb://"+dbName;
}
var countlyDb = mongo.db(dbName, dbOptions);
console.log("Installing logger plugin");
countlyDb.collection('apps').find({}).toArray(function (err, apps) {

    if (!apps || err) {
        return;
    }
	function upgrade(app, done){
		var cnt = 0;
		console.log("Creating logs collection for " + app.name);
		function cb(){
				done();
		}
		countlyDb.createCollection('logs' + app._id, {capped: true, size: 10000000, max: 1000}, cb);
	}
	async.forEach(apps, upgrade, function(){
		console.log("Logger plugin installation finished");
		countlyDb.close();
	});
});