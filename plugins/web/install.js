var pluginManager = require('../pluginManager.js'),
	async = require('async'),
	countlyDb = pluginManager.dbConnection();

console.log("Installing web plugin");

countlyDb.collection('apps').find({}).toArray(function (err, apps) {

    if (!apps || err) {
		console.log("No apps to upgrade");
        countlyDb.close();
        return;
    }
	function upgrade(app, done){
		console.log("Adding last_seen indexes to " + app.name);
		var cnt = 0;
		function cb(){
			cnt++;
			if(cnt == 1)
				done();
		}
        countlyDb.collection('app_users' + app._id).ensureIndex({"ls":1},cb);
	}
	async.forEach(apps, upgrade, function(){
		console.log("Web plugin installation finished");
		countlyDb.close();
	});
});