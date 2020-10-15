var pluginManager = require('../../../../plugins/pluginManager.js'),
    asyncjs = require('async');

console.log("Upgrading app_users data");
pluginManager.dbConnection().then((countlyDb) => {
    countlyDb.collection('apps').find({}).toArray(function(err, apps) {
        function upgrade(app, done) {
            var cnt = 0;
            console.log("Upgrading app_users for " + app.name);
            var cursor = countlyDb.collection('app_users' + app._id).find({}, {projection:{_id:1, fac:1, lac:1, last_sync:1}});
            var requests = [];
            cursor.forEach(function(user) {
                var update = {};
                if (user.lac) {
                    update.lac =  Math.round(parseInt(user.lac, 10) / 1000);
                }
                if (user.fac) {
                    update.fac =  Math.round(parseInt(user.fac, 10) / 1000);
                }
                if (user.last_sync) {
                    update.last_sync =  Math.round(parseInt(user.last_sync, 10) / 1000);
                }
                if (Object.keys(update).length) {
                    requests.push( { 
                        'updateOne': {
                            'filter': { '_id': user._id },
                            'update': { '$set': update }
                        }
                    });
                }
                if (requests.length === 500) {
                    //Execute per 500 operations and re-init
                    countlyDb.collection('app_users' + app._id).bulkWrite(requests, function(err){
                        if (err) {
                            console.error(err);
                        }
                    });
                    requests = [];
                }
            }, function(){
                if(requests.length > 0) {
                    countlyDb.collection('app_users' + app._id).bulkWrite(requests, function(err){
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
            console.log("App user data upgrade finished");
            countlyDb.close();
        });
    });
});