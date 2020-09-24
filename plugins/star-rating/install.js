var async = require('async'),
    pluginManager = require('../pluginManager.js');
console.log("Installing ratings plugin");
pluginManager.dbConnection().then((countlyDb) => {
    countlyDb.collection("feedback_widgets").updateMany({type: {$exists: false}}, {$set: {type: "rating"}}, function(err) {
        if (err) {
            console.log("Could not update widget type");
            countlyDb.close();
            return;
        }
        countlyDb.collection('apps').find({}).toArray(function(err, apps) {

            if (!apps || err) {
                console.log("No apps to process");
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
    });
});