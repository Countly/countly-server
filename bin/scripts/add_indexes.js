var pluginManager = require('../../plugins/pluginManager.js'),
	async = require('async'),
	countlyDb = pluginManager.dbConnection();

console.log("Adding core indexes");
countlyDb.collection('apps').find({}).toArray(function (err, apps) {

    if (!apps || err) {
		console.log("No apps to index");
        countlyDb.close();
        return;
    }
	function upgrade(app, done){
		console.log("Adding indexes to " + app.name);
		var cnt = 0;
		function cb(){
			cnt++;
			if(cnt == 8)
				done();
		}
        
        countlyDb.collection('app_users' + app._id).ensureIndex({ls:-1}, { background: true },cb);
        countlyDb.collection('app_users' + app._id).ensureIndex({"uid":1}, { background: true },cb);
        countlyDb.collection('app_users' + app._id).ensureIndex({"sc":1}, { background: true },cb);
        countlyDb.collection('app_users' + app._id).ensureIndex({"lac":1, "ls":1}, { background: true },cb);
        countlyDb.collection('app_users' + app._id).ensureIndex({"tsd":1}, { background: true },cb);
        countlyDb.collection('app_users' + app._id).ensureIndex({"did":1}, { background: true },cb);
        countlyDb.collection('metric_changes' + app._id).ensureIndex({ts:-1},cb);
        countlyDb.collection('metric_changes' + app._id).ensureIndex({uid:1},cb);
	}
	async.forEach(apps, upgrade, function(){
		console.log("Finished adding core indexes");
		countlyDb.close();
	});
});