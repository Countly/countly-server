/**
 *  Description: This script is used to anonymize drill collectionto fix broken custom properties in drill session collections
 *  Path: $(countly dir)/bin/scripts/fix-data
 *  Command: node fix_drill_custom_props.js
 */
const { ObjectId } = require('mongodb');

const pluginManager = require('../../../plugins/pluginManager.js');
const common = require('../../../api/utils/common.js');
const drillCommon = require("../../../plugins/drill/api/common.js");

const APPS = []; //leave array empty to process all apps;
var dry_run = false;
var query_drill = {"ts": {"$gte": 1698829052000}};


Promise.all([pluginManager.dbConnection("countly"), pluginManager.dbConnection("countly_drill")]).then(async function([countlyDb, drillDb]) {
    console.log("Connected to databases...");

    //SET COMMON DBs
    common.db = countlyDb;
    common.drillDb = drillDb;

    var query = {};
    if (APPS.length > 0) {š
        APPS.forEach(function(id, index) {
            APPS[index] = ObjectId(id);
        });
        query = {_id: {$in: APPS}};
    }
    try {
        //FETCH APPS
        var apps = await countlyDb.collection('apps').find(query, {_id: 1, name: 1}).toArray();
        //PROCESS COLLECTIONS FOR EACH APP
        for (let i = 0; i < apps.length; i++) {
            console.log("Processing app: " + apps[i].name);
            var collectionName = drillCommon.getCollectionName("[CLY]_session", apps[i]._id + "");
            console.log("Processing collection: " + collectionName);

            const cursor = drillDb.collection(collectionName).find(query_drill, {"_id": 1, "custom": 1});
            //FOR EACH DOCUMENT
            var updates = [];
            while (await cursor.hasNext()) {
                var doc = await cursor.next();
                if (doc.custom) {
                    var updateDoc = {};
                    let updateMe = false;
                    for (var key in doc.custom) {
                        if (doc.custom[key] && typeof doc.custom[key] === "object") {
                            var specialKeys = ["$set", "$addToSet", "$push", "$pull", "$inc", "$min", "$max", "$setOnce"];
                            for (var z = 0; z < specialKeys.length; z++) {
                                if (doc.custom[key][specialKeys[z]]) {
                                    updateDoc["custom." + key] = doc.custom[key][specialKeys[z]];
                                    updateMe = true;
                                }
                            }
                        }
                    }
                    if (updateMe) {
                        updates.push({
                            'updateOne': {
                                'filter': { '_id': doc._id },
                                'update': { '$set': updateDoc },
                                'upsert': false
                            }
                        });
                    }
                }
                if (updates.length === 500) {
                    if (dry_run) {
                        console.log("DRY RUN: Would update " + updates.length + " docs in " + collectionName);
                        console.log(JSON.stringify(updates));
                    }
                    else {
						console.log("updating");
                        await drillDb.collection(collectionName).bulkWrite(updates,{"ordered":false});
                    }
                    updates = [];
                }
            }
            if (updates.length > 0) {
                if (dry_run) {
                    console.log("DRY RUN: Would update " + updates.length + " docs in " + collectionName);
                    console.log(JSON.stringify(updates));
                }
                else {
                    await drillDb.collection(collectionName).bulkWrite(updates,{"ordered":false});
                }
                updates = [];
            }
        }
    }
    catch (err) {
        console.log(err);
    }
    finally {
        countlyDb.close();
        drillDb.close();
        console.log("Done.");
    }
});