var pluginManager = require('../../../../plugins/pluginManager.js'),
    async = require('async');

console.log("Removing .mt property from users documents");

pluginManager.dbConnection().then(function(countlyDb) {
    countlyDb.collection('apps').find({}).toArray(function(err, apps) {
    
        if (!apps || err) {
            console.log("No apps to upgrade");
            countlyDb.close();
            return;
        }
        function upgrade(app, done) {
            console.log("Removing .mt property from " + app.name);
            countlyDb.collection('app_users' + app._id).update({}, {$unset: {mt: ""}}, {multi: true}, done);
        }
        async.forEach(apps, upgrade, function() {
            console.log("Finished upgrading users");
            countlyDb.close();
        });
    });
});