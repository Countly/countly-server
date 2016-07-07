var async = require('async'),
    pluginManager = require('../pluginManager.js'),
	countlyDb = pluginManager.dbConnection();

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
        countlyDb.command({"convertToCapped": 'logs' + app._id, size: 10000000, max: 1000}, function(err,data){
            if(err){
                countlyDb.createCollection('logs' + app._id, {capped: true, size: 10000000, max: 1000}, cb);
            }
            else{
                cb();
            }
        });
	}
	async.forEach(apps, upgrade, function(){
		console.log("Logger plugin installation finished");
		countlyDb.close();
	});
});