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
            var promises = [];
            cursor.forEach(function(user) {
                var update = {};
                if (user.lac && (user.lac + "").length === 13) {
                    update.lac =  Math.round(parseInt(user.lac, 10) / 1000);
                }
                if (user.fac && (user.fac + "").length === 13) {
                    update.fac =  Math.round(parseInt(user.fac, 10) / 1000);
                }
                if (user.last_sync && (user.last_sync + "").length === 13) {
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
                    try {
                        promises.push(countlyDb.collection('app_users' + app._id).bulkWrite(requests, {ordered: false}));
                    }
                    catch (ex) {
                        console.error(ex);
                    }
                    requests = [];
                }
            }, function(){
                if(requests.length > 0) {
                    try {
                        promises.push(countlyDb.collection('app_users' + app._id).bulkWrite(requests, {ordered: false}));
                    }
                    catch (ex) {
                        console.error(ex);
                    }
                }
                Promise.all(promises).finally(done);
            });
        }
        asyncjs.eachSeries(apps, upgrade, function() {
            console.log("App user data upgrade finished");
            countlyDb.close();
        });
    });
});