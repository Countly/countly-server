/*Script to merge all drill meta */
const pluginManager = require('../../../../plugins/pluginManager.js');
var Promise = require("bluebird");
var crypto = require('crypto');
const common = require('../../../../api/utils/common.js');

console.log("Merging views collections");

var maxActionCount = 10000;//limiting action count to avoid 16MB update operation limit
var maxRetries = 100;
var retryInterval = 10000;
var reports = {
    "listed": 0,
    "skipped": 0,
    "merged": [],
    "failed": [],
};

async function migrateApp(app, countlyDB, callback) {
    var appId = app._id;
    //load view data for this app
    var base_data = await countlyDB.collection("views").findOne({"_id": countlyDB.ObjectID(appId)});
    if (!base_data) {
        console.log("No view data found for app " + appId);
        callback();
        return;
    }
    base_data.segments = base_data.segments || {};

    //Migrate App_viewsmeta collection;
    var batchSize = 1000;
    var batch = [];
    var cursor = await countlyDB.collection("app_viewsmeta" + appId).find({});
    var doc;
    //Rewrite and get mapping old ids to new ids.
    var mapped = {};
    doc = await cursor.next();
    while (doc) {
        var newid = crypto.createHash('md5').update(doc.view).digest('hex');
        mapped[doc._id] = newid;
        doc._id = appId + "_" + newid;
        doc.a = appId + "";
        if (!doc.merged) {
            batch.push({"insertOne": {"document": doc}});
            if (batch.length >= batchSize) {
                try {
                    await countlyDB.collection("app_viewsmeta").bulkWrite(batch);
                }
                catch (e) {
                    if (e.code !== 11000) {
                        callback("Unable to update meta collecion");
                    }
                }
                batch = [];
            }
        }
        doc = await cursor.next();
    }
    if (batch.length) {
        try {
            await countlyDB.collection("app_viewsmeta").bulkWrite(batch);
        }
        catch (e) {
            if (e.code !== 11000) { //ignore duplicate error
                callback("Unable to update meta collecion");
            }
        }
    }
    await countlyDB.collection("app_viewsmeta" + appId).updateMany({}, {"$set": {"merged": true}});
    console.log("Migrated app_viewsmeta for app " + appId);

    //Migrate app_viewdata collections
    var segments = ["no-segment"];
    for (var segment in base_data.segments) {
        segments.push(segment);
    }

    for (var z = 0; z < segments.length; z++) {
        var collName = "app_viewdata" + crypto.createHash('sha1').update(segments[z] + appId).digest('hex');
        if (segments[z] === "no-segment") {
            collName = "app_viewdata" + crypto.createHash('sha1').update(appId + "").digest('hex');
        }
        await merge_data_from_collection(countlyDB, collName, {"a": appId + "", "s": segments[z]}, mapped);
    }
    console.log("Migrated app_viewdata for app " + appId);
    console.log("Migrating app_userviews data");
    callback();
}

Promise.all(
    [
        pluginManager.dbConnection("countly")
    ])
    .spread(function(countlyDB) {

        //Process each app
        countlyDB.collection('apps').find({}).toArray(function(err, apps) {
            if (err) {
                console.log("err");
                console.log("Failed to load app list. exiting");
                countlyDB.close();
            }
            else {
                Promise.each(apps, function(app) {
                    return new Promise(function(resolve, reject) {
                        migrateApp(app, countlyDB, function(err) {
                            if (err) {
                                reject();
                            }
                            else {
                                resolve();
                            }
                        });
                    });
                }).then(function() {
                    console.log("All apps processed");
                }
                ).catch(function(err) {
                    console.log(err);
                    console.log("All apps processed");
                    console.log('Script failed. Exiting. PLEASE RERUN SCRIPT TO MIGRATE ALL DATA.');
                    countlyDB.close();
                });
            }
        });
    })
    .catch(function(err) {
        console.log("Error wile getting connecion. Exiting.");
        console.log(err);
    });


async function migrateAppUserviews(countlyDB, appId, mapped) {
    var collection = "app_userviews" + appId;
    var cursor = await countlyDB.collection(collection).find({"merged": {"$ne": true}});
    var doc;
    doc = await cursor.next();
    while (doc) {
        doc = await cursor.next();
    }
}

async function merge_data_from_collection(countlyDB, collection, options, mapped) {
    var app_id = options.a;
    var prefix = app_id + "_" + options.s + "_";
    console.log("   checking collection: " + collection);
    var cursor = await countlyDB.collection(collection).find(/*{"merged": {"$ne": true}}*/{});
    var doc;
    doc = await cursor.next();
    while (doc) {
        var splitted = doc._id.split("_");
        if (splitted.length == 2) {
            var vw = doc.vw + "";
            if (mapped[vw]) {
                var actionCounter = 0;
                var original_id = doc._id;
                doc._id = prefix + doc.m + "_" + mapped[vw];
                doc.vw = mapped[vw];
                var update = {"$set": {"vw": app_id + "_" + doc.vw, "m": doc.m, "a": doc.a, "s": doc.s || "no-segment"}};
                if (doc.meta_v2) {
                    for (var key0 in doc.meta_v2) {
                        for (var value in doc.meta_v2[key0]) {
                            update["$set"]["meta_v2." + key0 + "." + value] = doc.meta_v2[key0][value];
                            actionCounter++;
                            if (actionCounter > maxActionCount) {
                                await countlyDB.collection("app_viewdata").updateOne({"_id": doc._id}, update, {upsert: true});
                                update = {"$set": {"vw": doc.vw, "m": doc.m, "a": doc.a, "e": doc.e, "s": doc.s || "no-segment"}};
                                actionCounter = 0;
                            }
                        }
                    }
                }
                if (doc.d) {
                    for (var day in doc.d) {
                        for (var key in doc.d[day]) { //1.level
                            //if is Object
                            if (typeof doc.d[day][key] === 'object') {
                                for (var key2 in doc.d[day][key]) { //level2
                                    if (typeof doc.d[day][key][key2] === 'object') {
                                        for (var key3 in doc.d[day][key][key2]) { //level3
                                            if (typeof doc.d[day][key][key2][key3] === 'object') {
                                                for (var key4 in doc.d[day][key][key2][key3]) { //level4
                                                    if (common.isNumber(doc.d[day][key][key2][key3][key4])) {
                                                        update["$inc"] = update["$inc"] || {};
                                                        update["$inc"]["d." + day + "." + key + "." + key2 + "." + key3 + "." + key4] = doc.d[day][key][key2][key3][key4];

                                                        actionCounter++;
                                                        if (actionCounter > maxActionCount) {
                                                            await countlyDB.collection("app_viewdata").updateOne({"_id": doc._id}, update, {upsert: true});
                                                            update = {"$set": {"vw": doc.vw, "m": doc.m, "a": doc.a, "e": doc.e, "s": doc.s || "no-segment"}};
                                                            actionCounter = 0;
                                                        }
                                                    }
                                                }
                                            }
                                            else {
                                                if (common.isNumber(doc.d[day][key][key2][key3])) {
                                                    update["$inc"] = update["$inc"] || {};
                                                    update["$inc"]["d." + day + "." + key + "." + key2 + "." + key3] = doc.d[day][key][key2][key3];

                                                    actionCounter++;
                                                    if (actionCounter > maxActionCount) {
                                                        await countlyDB.collection("app_viewdata").updateOne({"_id": doc._id}, update, {upsert: true});
                                                        update = {"$set": {"vw": doc.vw, "m": doc.m, "a": doc.a, "e": doc.e, "s": doc.s || "no-segment"}};
                                                        actionCounter = 0;
                                                    }
                                                }
                                            }
                                        }
                                    }
                                    else {
                                        if (common.isNumber(doc.d[day][key][key2])) {
                                            update["$inc"] = update["$inc"] || {};
                                            update["$inc"]["d." + day + "." + key + "." + key2] = doc.d[day][key][key2];

                                            actionCounter++;
                                            if (actionCounter > maxActionCount) {
                                                await countlyDB.collection("app_viewdata").updateOne({"_id": doc._id}, update, {upsert: true});
                                                update = {"$set": {"vw": doc.vw, "m": doc.m, "a": doc.a, "e": doc.e, "s": doc.s || "no-segment"}};
                                                actionCounter = 0;
                                            }
                                        }
                                    }
                                }
                            }
                            else {
                                if (common.isNumber(doc.d[day][key])) {
                                    update["$inc"] = update["$inc"] || {};
                                    update["$inc"]["d." + day + "." + key] = doc.d[day][key];

                                    actionCounter++;
                                    if (actionCounter > maxActionCount) {
                                        await countlyDB.collection("app_viewdata").updateOne({"_id": doc._id}, update, {upsert: true});
                                        update = {"$set": {"vw": doc.vw, "m": doc.m, "a": doc.a, "e": doc.e, "s": doc.s || "no-segment"}};
                                        actionCounter = 0;
                                    }
                                }
                            }
                        }
                    }
                }
                if (actionCounter > 0) { //we are splitting updates to make sure update operation do not reach 16MB
                    await countlyDB.collection("app_viewdata").updateOne({"_id": doc._id}, update, {upsert: true});
                }
                await countlyDB.collection(collection).updateOne({"_id": original_id}, {"$set": {"merged": true}});
            }
        }
        doc = await cursor.next();
    }
    console.log("done");
}