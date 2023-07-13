var async = require('async'),
    crypto = require('crypto'),
    pluginManager = require('../../../../plugins/pluginManager');

console.log("Removing drill indexes");

pluginManager.dbConnection("countly_drill").then((db) => {

    db.collections(function(error, results) {
        if (error || !results) {
            db.close();
            console.log("Error occured:", error);
            return;
        }
        results = results.filter(collection => collection && collection.collectionName && collection.collectionName.startsWith("drill_events"));
        async.eachSeries(results, function(collection, done) {
            db.collection(collection.collectionName).dropIndex("ts_-1", function(err, res){
                if (err) {
                    console.log(collection.collectionName, err.errmsg);
                }
                else {
                    console.log(collection.collectionName, res);
                }
                done();
            });
            
        }, function() {
            db.close();
            console.log("Drill index removal finished");
        });
    });
});