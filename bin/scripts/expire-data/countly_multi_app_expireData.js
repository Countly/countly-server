/**
 *  Sets index on cd field if it does not exists and stores retention period in database. Nightly job will clear data based on set  retention period.
 *  Server: countly
 *  Path: countly dir/bin/scripts/expire-data
 *  Command: node countly_multi_app_expireData.js
 */

var EXPIRE_AFTER = 60 * 60 * 24 * 365; //1 year in seconds
var INDEX_NAME = "cd_1";

var plugins = require('../../../plugins/pluginManager.js');

//var db = plugins.dbConnection("countly");
//var db_drill = plugins.dbConnection("countly_drill");

Promise.all([plugins.dbConnection("countly"), plugins.dbConnection("countly_drill")]).then(function([db, db_drill]) {

    var collection = "drill_events";
    console.log("processing", collection);
    db_drill.collection(collection).indexes(function(err, indexes) {
        if (err) {
            console.log(err);
        }
        if (!err && indexes) {
            var hasIndex = false;
            for (var i = 0; i < indexes.length; i++) {
                if (indexes[i].name == INDEX_NAME) {
                    hasIndex = true;
                    break;
                }
            }
            if (!hasIndex) {
                console.log("creating index", collection);
                db_drill.collection(collection).createIndex({"cd": 1}, function() {
                    done(true);
                });
            }
            else {
                console.log("Appropriate index already set for", collection);
                done(true);
            }
        }
        else {
            done();
        }
    });


    function done(index_set) {
        if (index_set) {
            db.collection("plugins").updateOne({"_id": "retention"}, {"$set": {"retention": EXPIRE_AFTER}}, {"upsert": true}, function(err) {
                if (err) {
                    console.log("Error setting retention period", err);
                }
                else {
                    console.log("Retention period set: " + EXPIRE_AFTER);
                }
                db.close();
                db_drill.close();

            });
        }
        else {
            db.close();
            db_drill.close();
        }
    }
});