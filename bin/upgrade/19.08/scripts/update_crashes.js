var pluginManager = require('../../../../plugins/pluginManager.js'),
    asyncjs = require('async');

console.log("Upgrading crash data");
pluginManager.dbConnection().then((countlyDb) => {
    countlyDb.collection('apps').find({}).toArray(function(err, apps) {
        function upgrade(app, done) {
            var cnt = 0;
            console.log("Upgrading crashes for " + app.name);
            var cursor = countlyDb.collection('app_crashgroups' + app._id).find({groups:{$exists: false}}, {fields:{_id:1}});
            var requests = [];
            cursor.forEach(function(crash) { 
                requests.push( { 
                    'updateOne': {
                        'filter': { '_id': crash._id },
                        'update': { '$set': { 'groups': [crash._id] } }
                    }
                });
                if (requests.length === 500) {
                    //Execute per 500 operations and re-init
                    countlyDb.collection('app_crashgroups' + app._id).bulkWrite(requests, function(err){
                        if (err) {
                            console.error(err);
                        }
                    });
                    requests = [];
                }
            }, function(){
                if(requests.length > 0) {
                    countlyDb.collection('app_crashgroups' + app._id).bulkWrite(requests, function(err){
                        if (err) {
                            console.error(err);
                        }
                        done();
                    });
                }
                else {
                    done();
                }
            });
        }
        asyncjs.eachSeries(apps, upgrade, function() {
            console.log("Crash data upgrade finished");
            countlyDb.close();
        });
    });
});