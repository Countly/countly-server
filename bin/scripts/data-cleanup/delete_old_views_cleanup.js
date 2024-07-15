/**
 *  Description: Clear the "checked" flag from app_viewsmeta collections after deleting old views
 *  Server: countly
 *  Path: $(countly dir)/bin/scripts/data-cleanup
 *  Command: node delete_old_views_cleanup.js
 */

const pluginManager = require('../../../plugins/pluginManager.js');
var APP_LIST = [];

pluginManager.dbConnection("countly").then(async function(countlyDb) {
    console.log("Connected to database...");
    try {
        // GET APP LIST
        const apps = await getAppList({db: countlyDb});
        if (!apps || !apps.length) {
            return close("No apps to process");
        }
        for (let i = 0; i < apps.length; i++) {
            await countlyDb.collection("app_viewsmeta" + apps[i]._id).update({}, {$unset: {checked: 1}}, {multi: true});
        }
        close();
    }
    catch (err) {
        close(err);
    }

    async function getAppList(options) {
        var query = {};
        if (APP_LIST && APP_LIST.length > 0) {
            var listed = [];
            for (var z = 0; z < APP_LIST.length; z++) {
                listed.push(ObjectId(APP_LIST[z]));
            }
            query = {_id: {$in: listed}};
        }

        try {
            let apps = await options.db.collection("apps").find(query).toArray();
            return apps;
        }
        catch (err) {
            console.log("Error getting apps: ", err);
            return [];
        }

    }

    function close(err) {
        if (err) {
            console.log("Finished with errors: ", err);
        }
        else {
            console.log("Finished successfully.");
        }
        countlyDb.close();
    }
});