/*
 *  Generates a list of crashgroup ids that is older than the specified timestamp for each Countly app
 *  If DRY_RUN is false, will also delete those crashgroups and their related documents
 *  Server: countly
 *  Path: $(countly dir)/bin/scripts/data-cleanup
 *  Command: node remove_old_crashes_sync.js
 */

// if true, nothing will be deleted
const DRY_RUN = true;
// format 'YYYY-MM-DD', crashes with last occurence older than this will be removed
const LAST_TIMESTAMP = '2017-04-01';

const pluginManager = require('../../../plugins/pluginManager.js');
const moment = require('moment-timezone');
const crypto = require('crypto');
const lastUnixTimestamp = moment(LAST_TIMESTAMP).unix();
var Promise = require("bluebird");

Promise.all(
    [
        pluginManager.dbConnection("countly"),
        pluginManager.dbConnection("countly_drill")
    ])
    .spread(async function(db, drillDb) {
        try {
            let apps = await db.collection('apps').find({}, { _id: 1 }).toArray();

            console.log(`Removing older crashes for ${apps.length} apps`);
            for (let app of apps) {

                try {
                    if (DRY_RUN) {
                        console.log(`Calculating crash data to be deleted for ${app._id}`);
                        var count = await db.collection(`app_crashgroups${app._id}`).countDocuments({ lastTs: { $lt: lastUnixTimestamp } });
                        console.log("", count, "crash groups to be deleted");
                        count = await db.collection(`app_crashes${app._id}`).countDocuments({ ts: { $lt: lastUnixTimestamp } });
                        console.log("", count, "crashes to be deleted");
                        count = await drillDb.collection("drill_events" + crypto.createHash('sha1').update("[CLY]_crash" + app._id).digest('hex')).countDocuments({ ts: { $lt: lastUnixTimestamp * 1000 } });
                        console.log("", count, "drill crashes to be deleted");
                    }
                    else {
                        console.log(`Deleting crashes for ${app._id}`);
                        var res = await db.collection(`app_crashgroups${app._id}`).deleteMany({ lastTs: { $lt: lastUnixTimestamp } });
                        console.log("", res, "crash groups deleted");
                        res = await db.collection(`app_crashes${app._id}`).deleteMany({ ts: { $lt: lastUnixTimestamp } });
                        console.log("", res, "crashes deleted");
                        res = await drillDb.collection("drill_events" + crypto.createHash('sha1').update("[CLY]_crash" + app._id).digest('hex')).deleteMany({ ts: { $lt: lastUnixTimestamp * 1000 } });
                        console.log("", res, "drill crashes deleted");
                    }
                }
                catch (e) {
                    console.error("Error occured while deleting data", e);
                }

                console.log(`Finished processing crashes for  ${app._id}`);
                console.log("");
            }
            console.log('DONE processing all apps');
        }
        catch (e) {
            console.error(e);
        }
        db.close();
        drillDb.close();
    });