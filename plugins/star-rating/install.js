var async = require('async'),
    pluginManager = require('../pluginManager.js'),
    countlyDb = pluginManager.dbConnection();
console.log("Installing ratings plugin");
countlyDb.collection('apps').find({}).toArray(function(err, apps) {

    if (!apps || err) {
        countlyDb.close();
        return;
    }
    function upgrade(app, done) {
        var cnt = 0;
        console.log("Adding ratings collections to " + app.name);
        function cb() {
            cnt++;
            if (cnt == 2) {
                done();
            }
        }
        countlyDb.collection('feedback' + app._id).ensureIndex({"uid": 1}, {background: true}, cb);
        countlyDb.collection('feedback' + app._id).ensureIndex({"ts": 1}, {background: true}, cb);
    }
    async.forEach(apps, upgrade, function() {
        console.log("Ratings plugin installation finished");
        countlyDb.close();
    });
});