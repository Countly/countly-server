/*
Script should be placed in ./bin/scripts/performance-monitoring/apm_events_delete.js

Script is used to delete apm_device and apm_network events per app.
*/

var pluginManager = require('../../../plugins/pluginManager.js');
var crypto = require('crypto');

const dry_run = false; //if set true, there will be only information outputted, but deletion will not be triggered.
const APP_ID = '' //YOUR_APP_ID

if (dry_run) {
    console.log("This is a dry run");
    console.log('Nothing will be deleted');
}

Promise.all([pluginManager.dbConnection("countly"), pluginManager.dbConnection("countly_drill")]).then(async function([countlyDb, drillDb]) {
    try {
        console.log('Deleting APM events for app_id: ' + APP_ID)
        await Promise.all([
            countlyDb.collection("apm").remove({app_id: APP_ID}),
            drillDb.collection("drill_events" + crypto.createHash('sha1').update("[CLY]_apm_network" + APP_ID).digest('hex')).drop(),
            drillDb.collection("drill_events" + crypto.createHash('sha1').update("[CLY]_apm_device" + APP_ID).digest('hex')).drop(),
        ])
        console.log("All done")
    }
    catch (error) {
        console.log("ERROR: ");
        console.log(error);
        countlyDb.close();
        drillDb.close();
    }
    finally {
        countlyDb.close();
        drillDb.close();
    }
});
