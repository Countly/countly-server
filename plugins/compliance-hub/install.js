var pluginManager = require('../pluginManager.js'),
    async = require('async');

console.log("Installing compliance-hub plugin");
pluginManager.dbConnection().then((countlyDb) => {
    countlyDb.collection('apps').find({}).toArray(function(err, apps) {

        if (!apps || err) {
            console.log("No apps to upgrade");
            countlyDb.close();
            return;
        }
        function upgrade(app, done) {
            console.log("Adding compliance-hub indexes to " + app.name);
            var cnt = 0;
            function cb() {
                cnt++;
                if (cnt == 4) {
                    done();
                }
            }
            countlyDb.collection('consent_history').ensureIndex({device_id: 1}, cb);
            countlyDb.collection('consent_history').ensureIndex({uid: 1}, cb);
            countlyDb.collection('consent_history').ensureIndex({type: 1}, cb);
            countlyDb.collection('consent_history').ensureIndex({ts: 1}, cb);
        }
        async.forEach(apps, upgrade, function() {
            console.log("Compliance hub plugin installation finished");
            countlyDb.close();
        });
    });
});