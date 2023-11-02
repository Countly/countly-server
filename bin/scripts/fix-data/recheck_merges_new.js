/**
 *  Description: This script is used to recheck merges and update drill data with new uid
 *  Server: countly
 *  Path: $(countly dir)/bin/scripts/fix-data
 *  Command: node recheck_merges_new.js
 */

var DRY_RUN = false;

const asyncjs = require("async");
const pluginManager = require('../../../plugins/pluginManager.js');
const dataviews = require('../../../plugins/drill/api/parts/data/dataviews.js');
const common = require("../../../api/utils/common.js");
const drillCommon = require("../../../plugins/drill/api/common.js");

const APP_ID = ""; //leave empty to get all apps

Promise.all([pluginManager.dbConnection("countly"), pluginManager.dbConnection("countly_drill")]).then(async function([countlyDb, drillDb]) {
    console.log("Connected to databases...");
    common.db = countlyDb;
    common.drillDb = drillDb;
    //get all apps
    try {
        var query = {};
        if (APP_ID) {
            query._id = common.db.ObjectID(APP_ID);
        }
        const apps = await countlyDb.collection("apps").find(query, {_id: 1, name: 1}).toArray();
        if (!apps || !apps.length) {
            return close();
        }
        try {
            //for each app serially process users
            asyncjs.eachSeries(apps, async function(app) {
                console.log("Processing app: ", app.name);
                //get all drill collections for this app
                var collections = await getDrillCollections(app._id);
                //cursor: get users with merges > 0 and merges_rechecked not set or set to false
                var usersCursor = countlyDb.collection('app_users' + app._id).find(
                    {merges: {$gt: 0}, merges_rechecked: {$ne: true}},
                    {_id: 1, uid: 1, merged_uid: 1}
                );
                //for each user
                while (usersCursor && await usersCursor.hasNext()) {
                    //get next user
                    const user = await usersCursor.next();
                    //check if old uid still exists in drill collections
                    if (user && user.merged_uid) {
                        await processUser(user.merged_uid, user.uid, collections, app);
                    }
                    //if cursor is closed, recreate it and skip processed users
                    if (usersCursor.isClosed()) {
                        usersCursor = countlyDb.collection('app_users' + app._id).find(
                            {merges: {$gt: 0}, merges_rechecked: {$ne: true}},
                            {_id: 1, uid: 1, merged_uid: 1}
                        );
                    }
                    await addRecheckedFlag(app._id, user.uid);
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

    async function getDrillCollections(app_id) {
        var collections = [];
        try {
            var events = await countlyDb.collection("events").findOne({_id: common.db.ObjectID(app_id)});
            var list = ["[CLY]_session", "[CLY]_crash", "[CLY]_view", "[CLY]_action", "[CLY]_push_action", "[CLY]_star_rating", "[CLY]_nps", "[CLY]_survey", "[CLY]_apm_network", "[CLY]_apm_device"];

            if (events && events.list) {
                for (var p = 0; p < events.list.length; p++) {
                    if (list.indexOf(events.list[p]) === -1) {
                        list.push(events.list[p]);
                    }
                }
            }
            for (let i = 0; i < list.length; i++) {
                var collectionName = drillCommon.getCollectionName(list[i], app_id);
                collections.push({collectionName: collectionName});
            }
        }
        catch (err) {
            console.log("Error getting drill collections for app ", app_id, "error: ", err);
        }
        return collections;
    }

    async function processUser(old_uid, new_uid, collections, app) {
        console.log("Processing user ", old_uid, " -> ", new_uid, "for app ", app.name);
        for (let i = 0; i < collections.length; i++) {
            const collection = collections[i].collectionName;
            try {
                const events = await drillDb.collection(collection).find({uid: old_uid}, {uid: 1, _id: 0}).limit(1).toArray();
                if (!events || !events.length) {
                    continue;
                }
                if (events && events[0]) {
                    console.log("Found at least one event with old uid ", old_uid, "in collection ", collection, "for app ", app.name, "updating to new uid", new_uid);
                    try {
                        if (!DRY_RUN) {
                            await drillDb.collection(collection).update({uid: old_uid}, {'$set': {uid: new_uid}}, {multi: true});
                        }
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
        if (dataviews && !DRY_RUN) {
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

    async function addRecheckedFlag(appId, uid) {
        if (!DRY_RUN) {
            await countlyDb.collection('app_users' + appId).update({uid}, {'$set': {merges_rechecked: true}});
        }
    }

    function close(err) {
        countlyDb.close();
        drillDb.close();
        if (err) {
            console.log("Finished with errors: ", err);
        }
        else {
            console.log("Finished successfully.");
        }
    }
});