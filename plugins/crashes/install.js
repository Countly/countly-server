var async = require('async'),
    pluginManager = require('../pluginManager.js'),
	countlyDb = pluginManager.dbConnection();
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