/**
 *  Description: This script is used to clear the merges_rechecked flag for all app_users after running recheck_merges_new.js
 *  Server: countly
 *  Path: $(countly dir)/bin/scripts/fix-data
 *  Command: node clear_recheck_merges_flag.js
 */

const pluginManager = require('../../../plugins/pluginManager.js');
const common = require("../../../api/utils/common.js");

const APP_ID = ""; //leave empty to get all apps

pluginManager.dbConnection("countly").then(async function(countlyDb) {
    var query = {};
    if (APP_ID) {
        query._id = common.db.ObjectID(APP_ID);
    }
    try {
        const apps = await countlyDb.collection("apps").find(query, {_id: 1, name: 1}).toArray();
        if (!apps || !apps.length) {
            return countlyDb.close();
        }
        for (let i = 0; i < apps.length; i++) {
            console.log("Clearing app: ", apps[i].name);
            await countlyDb.collection("app_users" + apps[i]._id).updateMany({}, {$unset: {merges_rechecked: 1}});
        }
        console.log("Done.");
        return countlyDb.close();
    }
    catch (err) {
        console.log("Error: ", err);
        return countlyDb.close();
    }
});