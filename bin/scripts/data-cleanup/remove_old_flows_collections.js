var pluginManager = require('../../../plugins/pluginManager.js'),
    asyncjs = require('async');

console.log("Removing old flows collections");
pluginManager.dbConnection().then((countlyDb) => {
    countlyDb.collection('apps').find({}).toArray(function(err, apps) {
        function upgrade(app, done) {
            countlyDb.collection('event_flows' + app._id).drop(function(){
				console.log('event_flows' + app._id+" dropped");
				countlyDb.collection('flows_cache' + app._id).drop(function(){
					console.log('event_cache' + app._id+" dropped");
					done();
				});
            });
        }
        asyncjs.eachSeries(apps, upgrade, function() {
            console.log("Cleanup finished");
            countlyDb.close();
        });
    });
});