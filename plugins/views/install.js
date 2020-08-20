var async = require('async'),
    pluginManager = require('../pluginManager.js');
console.log("Installing views plugin");
pluginManager.dbConnection().then((countlyDb) => {
    countlyDb.collection('apps').find({}).toArray(function(err, apps) {
        if (!apps || err) {
            return;
        }
        function upgrade(app, done) {
            var cnt = 0;
            console.log("Adding views collections to " + app.name);
            function cb() {
                cnt++;
                if (cnt === 1) {
                    done();
                }
            }
            countlyDb.collection('app_viewsmeta' + app._id).ensureIndex({"view": 1}, {'unique': 1}, cb);
        }
        async.forEach(apps, upgrade, function() {
            console.log("Views plugin installation finished");
            countlyDb.close();
        });
    });
});