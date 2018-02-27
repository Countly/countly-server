var async = require('async'),
    pluginManager = require('../pluginManager.js'),
	countlyDb = pluginManager.dbConnection();
console.log("Installing views plugin");
countlyDb.collection('apps').find({}).toArray(function (err, apps) {

    if (!apps || err) {
        return;
    }
	function upgrade(app, done){
		var cnt = 0;
		console.log("Adding views collections to " + app.name);
		function cb(){
			cnt++;
			if(cnt == 1)
				done();
		}        
		countlyDb.collection('app_views' + app._id).ensureIndex({"uid":1},cb);
	}
	async.forEach(apps, upgrade, function(){
		console.log("Views plugin installation finished");
		countlyDb.close();
	});
});