/*
 *  Removing older data for specific collections
 *  If DRY_RUN is false, will delete the data
 *  Server: countly
 *  Path: $(countly dir)/bin/scripts/data-cleanup
 *  Command: node remove_old_data.js
 */

// if true, nothing will be deleted
const DRY_RUN = true;
// format 'YYYY-MM-DD', crashes with last occurence older than this will be removed
const LAST_TIMESTAMP = '2017-04-01';

const pluginManager = require('../../../plugins/pluginManager.js');
const moment = require('moment-timezone');
const lastUnixTimestamp = moment(LAST_TIMESTAMP).unix();

pluginManager.dbConnection().then(async(db) => {
    try {
        let apps = await db.collection('apps').find({}, { _id: 1 }).toArray();

        console.log(`Removing older data for ${apps.length} apps`);
        for (let app of apps) {

            try {
                if (DRY_RUN) {
                    console.log(`Calculating data to be deleted for ${app._id}`);
                    var count = await db.collection(`consent_history${app._id}`).countDocuments({ ts: { $lt: lastUnixTimestamp } });
                    console.log("", count, "consents to be deleted");
                    count = await db.collection(`metric_changes${app._id}`).countDocuments({ ts: { $lt: lastUnixTimestamp } });
                    console.log("", count, "metric changes to be deleted");
                    count = await db.collection(`eventTimes${app._id}`).countDocuments({ ts: { $lt: lastUnixTimestamp * 1000 } });
                    console.log("", count, "event times to be deleted");
                }
                else {
                    console.log(`Deleting data for ${app._id}`);
                    var res = await db.collection(`consent_history${app._id}`).deleteMany({ ts: { $lt: lastUnixTimestamp } });
                    console.log("", res, "consents deleted");
                    res = await db.collection(`metric_changes${app._id}`).deleteMany({ ts: { $lt: lastUnixTimestamp } });
                    console.log("", res, "metric changes deleted");
                    res = await db.collection(`eventTimes${app._id}`).deleteMany({ ts: { $lt: lastUnixTimestamp * 1000 } });
                    console.log("", res, "event times deleted");
                }
            }
            catch (e) {
                console.error("Error occured while deleting data", e);
            }

            console.log(`Finished processing crashes for  ${app._id}`);
            console.log("");
        }

        if (DRY_RUN) {
            count = await db.collection(`systemlogs`).countDocuments({ ts: { $lt: lastUnixTimestamp } });
            console.log("", count, "systemlogs to be deleted");
        }
        else {
            res = await db.collection(`systemlogs`).deleteMany({ ts: { $lt: lastUnixTimestamp } });
            console.log("", res, "systemlogs deleted");
        }
        console.log('DONE processing all apps');
    }
    catch (e) {
        console.error(e);
    }
    db.close();
});