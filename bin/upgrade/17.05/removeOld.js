var pluginManager = require('../../../plugins/pluginManager.js'),
	async = require('async'),
	countlyDb = pluginManager.dbConnection();

console.log("Removing .old property from users documents");
console.log("Creating userimages directory");

countlyDb.collection('apps').find({}).toArray(function (err, apps) {

    if (!apps || err) {
		console.log("No apps to upgrade");
        countlyDb.close();
        return;
    }
	function upgrade(app, done){
		console.log("Removing .old property from " + app.name);
        countlyDb.collection('app_users' + app._id).update({},{$unset:{old:""}}, {multi:true}, done);
	}
	async.forEach(apps, upgrade, function(){
		console.log("Finished upgrading users");
		countlyDb.close();
	});
});