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
console.log("Installing crash plugin");
countlyDb.collection('apps').find({}).toArray(function (err, apps) {

    if (!apps || err) {
        return;
    }
	function upgrade(app, done){
		var cnt = 0;
		console.log("Adding crash collections to " + app.name);
		function cb(){
			cnt++;
			if(cnt == 4)
				done();
		}        
		countlyDb.collection('app_crashgroups' + app._id).insert({_id:"meta"},cb);
		countlyDb.collection('app_crashusers' + app._id).ensureIndex({"group":1, "uid":1}, {unique:true}, cb);
        countlyDb.collection('app_crashusers' + app._id).ensureIndex({"group":1, "crashes":1, "fatal":1}, {sparse:true}, cb);
		countlyDb.collection('app_crashes' + app._id).ensureIndex({"group":1},cb);
	}
	async.forEach(apps, upgrade, function(){
		console.log("Crash plugin installation finished");
		countlyDb.close();
	});
});