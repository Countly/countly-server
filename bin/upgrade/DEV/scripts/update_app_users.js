var pluginManager = require('../../../../plugins/pluginManager.js'),
    asyncjs = require('async');

console.log("Upgrading app_users data");
pluginManager.dbConnection().then((countlyDb) => {
    countlyDb.collection('apps').find({}).toArray(function(err, apps) {
        function upgrade(app, done) {
            var cnt = 0;
            console.log("Upgrading app_users for " + app.name);
            var cursor = countlyDb.collection('app_users' + app._id).find({}, {projection:{_id:1, byear:1, age:1}});
            var requests = [];
            var promises = [];
            cursor.forEach(function(user) {
                var update = {};
                if (!user.age && user.byear) {
                    update.age =  new Date().getFullYear() - parseInt(user.byear, 10);
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