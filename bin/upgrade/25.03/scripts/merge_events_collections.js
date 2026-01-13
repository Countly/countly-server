/*Script to merge all drill meta */
const pluginManager = require('../../../../plugins/pluginManager.js');
var crypto = require('crypto');

console.log("Merging all events collections into single collection");

var maxActionCount = 10000;//limiting action count to avoid 16MB update operation limit

var reports = {
    "listed": 0,
    "skipped": 0,
    "merged": [],
    "failed": [],
    "mergedOneByOne": []
};

function load_event_hashmap(countlyDB, callback) {
    var mapped = {};
    countlyDB.collection('events').find({}, {'list': 1}).toArray(function(err, events) {
        if (err) {
            callback(err, null);
        }
        else {
            events = events || [];
            for (let h = 0; h < events.length; h++) {
                if (events[h].list) {
                    for (let i = 0; i < events[h].list.length; i++) {
                        mapped["events" + crypto.createHash('sha1').update(events[h].list[i] + events[h]._id + "").digest('hex')] = {"a": events[h]._id + "", "e": events[h].list[i]};
                    }
                }
            }
            callback(null, mapped);
        }
    });
}

async function merge_data_from_collection(countlyDB, collection, mapped, resolve) {
    if (!mapped[collection]) {
        console.log("Skipping collection " + collection + " as it is not found in events list");
        reports.skipped += 1;
        resolve();
        return;
    }
    else {
        var app_id = mapped[collection].a;
        var prefix = app_id + "_" + collection.replace("events", "");
        var tscheck = Date.now().valueOf();
        countlyDB.collection(collection).aggregate([{"$match": {"merged": {"$ne": true}}}, {"$addFields": {"_id": {"$concat": [prefix, "_", "$_id"]}, "tscheck": tscheck, "a": app_id, "e": mapped[collection].e}}, {"$merge": {"into": "events_data", "on": "_id", "whenMatched": "fail"}}], {ignore_errors: [11000]}, async function(err) {
            if (err) {
                console.log("Failed to merge with database  $merge operation. Doing each document one by one");

                console.log('Removing inserted with tscheck param');
                await countlyDB.collection(collection).deleteMany({"_id": {"$regex": "^" + prefix + "_.*"}, "tscheck": tscheck});
                console.log('Processing data...');

                //As it field there are already some incoming data. Process all of them one by one.
                var cursor = await countlyDB.collection(collection).find({"merged": {"$ne": true}});
                var doc;
                try {
                    while ((doc = await cursor.next())) {
                        var original_id = doc._id;
                        doc._id = prefix + "_" + doc._id;
                        doc.a = app_id;
                        doc.e = mapped[collection].e;
                        var actionCounter = 0;

                        var update = {"$set": {"m": doc.m, "a": doc.a, "e": doc.e, "s": doc.s || "no-segment"}};
                        if (doc.meta_v2) {
                            for (var key0 in doc.meta_v2) {
                                for (var value in doc.meta_v2[key0]) {
                                    update["$set"]["meta_v2." + key0 + "." + value] = doc.meta_v2[key0][value];
                                    actionCounter++;
                                    if (actionCounter > maxActionCount) {
                                        await countlyDB.collection("events_data").updateOne({"_id": doc._id}, update, {upsert: true});
                                        update = {"$set": {"m": doc.m, "a": doc.a, "e": doc.e, "s": doc.s || "no-segment"}};
                                        actionCounter = 0;
                                    }
                                }
                            }
                        }
                        if (doc.d) {
                            for (var day in doc.d) {
                                for (var key in doc.d[day]) {
                                    //if is Object
                                    if (typeof doc.d[day][key] === 'object') {
                                        for (var prop in doc.d[day][key]) {
                                            update["$inc"] = update["$inc"] || {};
                                            update["$inc"]["d." + day + "." + key + "." + prop] = doc.d[day][key][prop];
                                            actionCounter++;
                                            if (actionCounter > maxActionCount) {
                                                await countlyDB.collection("events_data").updateOne({"_id": doc._id}, update, {upsert: true});
                                                update = {"$set": {"m": doc.m, "a": doc.a, "e": doc.e, "s": doc.s}};
                                                actionCounter = 0;
                                            }
                                        }
                                    }
                                    else {
                                        update["$inc"] = update["$inc"] || {};
                                        update["$inc"]["d." + day + "." + key] = doc.d[day][key];
                                    }
                                }
                            }
                        }
                        if (actionCounter > 0) { //we are splitting updates to make sure update operation do not reach 16MB
                            await countlyDB.collection("events_data").updateOne({"_id": doc._id}, update, {upsert: true});
                        }
                        await countlyDB.collection(collection).updateOne({"_id": original_id}, {"$set": {"merged": true}});
                    }
                }
                catch (error) {
                    console.log(error);
                    reports.failed.push(collection);
                    resolve(error);
                    return;
                }
                reports.mergedOneByOne.push(collection);
                var endTime = Date.now().valueOf();
                console.log("Merged collection " + collection + " in " + (endTime - tscheck) + "ms");
                resolve();
            }
            else {
                reports.merged.push(collection);
                console.log('Removing inserted with tscheck param');
                countlyDB.collection(collection).updateMany({}, {"$set": {"merged": true}}, function(err) {
                    if (err) {
                        console.log(err);
                    }
                    countlyDB.collection("events_data").updateMany({"_id": {"$regex": "^" + prefix + "_.*"}}, {"$unset": {"tscheck": ""}}, function(ee) {
                        if (ee) {
                            console.log(ee);
                        }
                        //mark documents as coppied
                        var endTime = Date.now().valueOf();
                        console.log("Merged collection " + collection + " in " + (endTime - tscheck) + "ms");
                        resolve();
                    });
                });
            }
        });
    }

}

Promise.all(
    [
        pluginManager.dbConnection("countly")
    ])
    .then(function([countlyDB]) {
        countlyDB.collections(function(err, colls) {
            if (err) {
                console.log('Script failed. Exiting');
                countlyDB.close();
            }
            else {
                //filter out list with only drill_meta collections. but not outr merged collection
                for (var z = 0; z < colls.length; z++) {
                    colls[z] = colls[z].collectionName;
                }
                var collections = colls.filter(function(coll) {
                    return (coll.indexOf("events") === 0 && coll.length > 11);
                });
                //load all
                reports.listed = collections.length;
                load_event_hashmap(countlyDB, function(err, mapped) {
                    if (err) {
                        console.log(err);
                        console.log('Script failed. Exiting');
                        countlyDB.close();
                    }
                    else {
                        (async () => {
                            for (const coll of collections) {
                                await new Promise(function(resolve, reject) {
                                    merge_data_from_collection(countlyDB, coll, mapped, function(error) {
                                        if (error) {
                                            reject();
                                        }
                                        else {
                                            resolve();
                                        }
                                    });
                                });
                            }
                        })().then(function() {
                            console.log("All events collections merged");
                            console.log("collections containing events data: ", reports.listed);
                            console.log("Skipped collections: ", reports.skipped);
                            console.log("Moved collections: ", reports.merged.length);
                            console.log("Failed to merge collections: ", reports.failed.length);
                            if (reports.failed.length > 0) {
                                console.log(JSON.stringify(reports.failed));
                            }
                            console.log("Merged collections: ", reports.mergedOneByOne.length);
                            countlyDB.close();
                        }).catch(function(err5) {
                            console.log(err5);
                            console.log("All events collections merged");
                            console.log("collections containing events data: ", reports.listed);
                            console.log("Moved collections: ", reports.merged.length);
                            console.log("Failed to merge collections: ", reports.failed.length);
                            if (reports.failed.length > 0) {
                                console.log(JSON.stringify(reports.failed));
                            }
                            console.log("Merged collections: ", reports.mergedOneByOne.length);
                            console.log('Script failed. Exiting. PLEASE RERUN SCRIPT TO MIGRATE ALL DATA.');
                            countlyDB.close();
                        });
                    }
                });
            }
        });
    });