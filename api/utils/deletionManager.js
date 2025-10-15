const common = require('./common.js'),
    log = require('./log.js')('api:deletionManager'),
    plugins = require('../../plugins/pluginManager.js'),
    manager = {};

(function() {
    manager.DELETION_STATUS = {
        QUEUED: "queued",
        RUNNING: "running",
        FAILED: "failed",
        COMPLETED: "completed",
        AWAITING_CH_MUTATION_VALIDATION: "awaiting_ch_mutation_validation"
    };

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
        //For example - if we delete multiple events for same app - merge them into single query. Definitely better for mongodb.
        var now = new Date().valueOf();

        await common.db.collection("deletion_manager").insertOne({
            "db": db,
            "collection": collection,
            "query": query,
            "ts": now,
            "status": manager.DELETION_STATUS.QUEUED,
            "running": false
        });
    });
})(manager);

module.exports = manager;