var pluginManager = require("../../../../plugins/pluginManager.js"),
    async = require('async');

console.log("Cleaning up old settings and collections of concurrent_users plugins");
pluginManager.dbConnection().then((db) => {

    function dropOldCols() {
        db.collection('apps').find({}).toArray(function (err, apps) {
            if (err) {
                console.log("App list couldn't be fetched for concurrent cleanup.", err);
                cleanupSettings();
                return;
            }
            var collectionsToBeDropped = [];
            apps.forEach(function(app) {
                collectionsToBeDropped.push('concurrent_users' + app._id);
                collectionsToBeDropped.push('concurrent_users_new' + app._id);
            });
            function dropCol(collection, done){
                db.collection(collection).drop(function(err, resp){
                    if (err) {
                        console.log("Collection (" + collection + ") couldn't be dropped.", err);
                    }
                    if (resp === true){
                        console.log("Dropped collection '" + collection + "'.");
                    }
                    done();
                });
            }
            async.forEach(collectionsToBeDropped, dropCol, function(){
                console.log("Collections were dropped.");
                cleanupSettings();
            });
        });
    }

    function cleanupSettings() {
        db.collection("plugins").updateOne(
            {_id: "plugins"},
            {
                $unset: {
                    "concurrent_users.flush_interval": "",
                    "concurrent_users.extend_on_session": "",
                    "concurrent_users.shared_process": ""
                }
            },
            function(pluginConfigErr) {
                if (pluginConfigErr) {
                    console.log(pluginConfigErr.message);
                }
                else {
                    console.log("Settings were cleaned up.");
                }
    
                db.close();
            }
        );
    }

    dropOldCols();
   
});