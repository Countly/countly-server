/**
 *  Description: This script is used to recheck merges and update drill data with new uid
 *  Server: countly
 *  Path: $(countly dir)/bin/scripts/fix-data
 *  Command: node recheck_merges.js
 */


const asyncjs = require("async");
const pluginManager = require('../../../plugins/pluginManager.js');
const dataviews = require('../../../plugins/drill/api/parts/data/dataviews.js');
const common = require("../../../api/utils/common.js");

Promise.all([pluginManager.dbConnection("countly"), pluginManager.dbConnection("countly_drill")]).then(async function([countlyDb, drillDb]) {
    console.log("Connected to databases.");
    common.db = countlyDb;
    common.drillDb = drillDb;
    //get all apps
    try {
        const apps = await countlyDb.collection("apps").find({}, {_id: 1, name: 1}).toArray();
        if (!apps || !apps.length) {
            return close();
        }
        try {
            //get all drill collections
            const collections = await drillDb.collections();
            if (!collections || !collections.length) {
                return close();
            }
            //for each app serially process users
            asyncjs.eachSeries(apps, async function(app) {
                //get users with merges
                const usersCursor = countlyDb.collection('app_users' + app._id).find({merges: {$gt: 0}}, {_id: 1, uid: 1, merged_uid: 1});
                //for each user
                while (await usersCursor.hasNext()) {
                    const user = await usersCursor.next();
                    //check if old uid still exists in drill collections
                    if (user && user.merged_uid) {
                        await processUser(user.merged_uid, user.uid, collections, app);
                    }
                }
            }, function(err) {
                return close(err);
            });
        }
        catch (err) {
            return close(err);
        }
    }
    catch (err) {
        return close(err);
    }

    async function processUser(old_uid, new_uid, collections, app) {
        console.log("Processing user ", new_uid, "for app ", app.name);
        var has_merges = false;
        for (let i = 0; i < collections.length; i++) {
            const collection = collections[i].collectionName;
            try {
                const events = await drillDb.collection(collection).find({uid: old_uid}, {_id: 1}).limit(1).toArray();
                if (!events || !events.length) {
                    continue;
                }
                if (events && events[0]) {
                    has_merges = true;
                    console.log("Found at least one event with old uid ", old_uid, "in collection ", collection, "for app ", app.name, "updating to new uid", new_uid);
                    try {
                        await drillDb.collection(collection).update({uid: old_uid}, {'$set': {uid: new_uid}}, {multi: true});
                    }
                    catch (err) {
                        console.log("Error updating collection ", collection, "for app ", app.name, "with old uid ", old_uid, "to new uid ", new_uid, "error: ", err);
                    }
                }
            }
            catch (err) {
                console.log("Error finding events with old uid ", old_uid, "in collection ", collection, "for app ", app.name, "error: ", err);
            }
        }
        if (has_merges && dataviews) {
            await new Promise((resolve, reject) => {
                dataviews.mergeUserTimes({ uid: old_uid }, { uid: new_uid }, app._id, function(err) {
                    if (err) {
                        reject(err);
                    }
                    else {
                        console.log("Updated user times for app ", app.name, "with old uid ", old_uid, "to new uid ", new_uid);
                        resolve();
                    }
                });
            });
        }
    }

    function close(err) {
        if (err) {
            console.log("Error: ", err);
        }
        countlyDb.close();
        drillDb.close();
        console.log("Done.");
    }
});