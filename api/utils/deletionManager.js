var manager = {};
const common = require('./common.js'),
    log = require('./log.js')('api:deletionManager'),
    plugins = require('../../plugins/pluginManager.js');

(function() {
    plugins.register("/core/delete_granular_data", async function(ob) {
        var db = ob.db;
        var query = ob.query;
        var collection = ob.collection || "drill_events";
        log.d("Deletion triggered for:" + JSON.stringify({
            "db": db,
            "collection": collection,
            "query": query
        }));
        //We can do it smarter after. When we insert check if there is not one to extend. 
        //For example - if we delete multiple events for same app - merge them into single query. Definietly better for mongodb.
        var now = new Date().valueOf();

        await common.db.collection("deletion_manager").insertOne({
            "db": db,
            "collection": collection,
            "query": query,
            "ts": now,
            "running": false
        });

        //Triggering now, but lets change it after to job triggering processing those.
        //Also we will need to retriger any if they do not finish in some time
        manager.processDeletionTasks().then(function() {
            log.d("Deletion tasks processed successfully");
        }
        ).catch(function(err) {
            log.e("Error processing deletion tasks", err);
        });

    });

    //Create job for this function
    manager.processDeletionTasks = async function() {
        var tasks = await common.db.collection("deletion_manager").find({}).toArray();
        var now = new Date().valueOf();
        var maxTime = 12 * 60 * 60 * 1000; //12 hours

        if (tasks && tasks.length) {
            for (var i = 0; i < tasks.length; i++) {
                if (tasks[i].running && tasks[i].ts && (now - maxTime) < tasks[i].ts) {
                    log.d("Skipping deletion task", tasks[i]._id, "as it is still running");
                    continue; //skip if it is still running
                }
                else {
                    var task = tasks[i];
                    try {
                    //Mark it as running
                        var rezz = await common.db.collection("deletion_manager").updateOne({"_id": task._id}, {$set: {"running": true, "ts": now}});
                        //updated sucessfully, run deletion
                        if (rezz.modifiedCount === 1) {
                            if (task.db === "drill" && task.collection === "drill_events") {
                                var is_clickhouse = false;
                                if (is_clickhouse) {
                                //Put here clickhouse deletion code
                                }
                                else {
                                    await common.drillDb.collection(task.collection).deleteMany(task.query);
                                }
                            }
                            //Delete  task reference
                            await common.db.collection("deletion_manager").deleteOne({"_id": task._id});
                        }
                    }
                    catch (err) {
                        log.e("Error processing deletion task", err);
                    }
                }
            }
        }
    };

})(manager);

module.exports = manager;