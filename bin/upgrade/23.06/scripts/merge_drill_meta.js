/*Script to merge all drill meta */
const pluginManager = require('../../../../plugins/pluginManager.js');
var Promise = require("bluebird");

console.log("Merging all meta");

function process_cohort_docs(options, callback) {
    var app_id = options.app_id + "";
    options.countlyDrillDB.collection(options.coll).aggregate([{"$match": {'_id': {"$regex": "^cohorts_"}}}, {"$addFields": {"_id": {"$concat": [options.app_id, "_", "$_id"]}, "app_id": app_id, "cohort": true}}, {"$merge": {"into": "drill_meta", "on": "_id", "whenMatched": "keepExisting"}}], function(err) {
        if (err) {
            console.log(err);
            callback(err);
        }
        else {
            callback();
        }
    });
}

function move_biglists(options, callback) {
    var app_id = options.app_id + "";
    options.countlyDrillDB.collection(options.coll).aggregate([{"$match": {'biglist': true}}, {"$addFields": {"_id": {"$concat": [options.app_id, "_", "$_id"]}, "app_id": app_id}}, {"$merge": {"into": "drill_meta", "on": "_id", "whenMatched": "merge"}}], function(err) {
        if (err) {
            console.log(err);
            callback(err);
        }
        else {
            callback();
        }
    });
}

async function process_meta_docs(options, callback) {
    var coll = options.coll;
    var countlyDrillDB = options.countlyDrillDB;
    var app_id = options.app_id;
    var cursor = await countlyDrillDB.collection(coll).find({});
    var doc = await cursor.next();
    var baseprops = ['status', 'lts'];
    while (doc) {
        var queries = [];
        var groups;
        if (doc._id === "meta_up") {
            doc._id = app_id + "_meta_up";
            groups = ['cmp', 'custom', 'up'];
            var updateBaseUp = {'$set': {"e": doc.e, "app_id": doc.app_id, "type": doc.type}};
            for (var k = 0; k < baseprops.length;k++) {
                if (typeof doc[baseprops[k]] !== 'undefined') {
                    if (baseprops[k] === 'lts') {
                        updateBaseUp['$max'] = updateBaseUp['$max'] || {};
                        updateBaseUp['$max'][baseprops[k]] = doc[baseprops[k]];
                    }
                    else {
                        updateBaseUp['$set'][baseprops[k]] = doc[baseprops[k]];
                    }
                }
            }

            for (var z = 0; z < groups.length; z++) {
                if (doc[groups[z]]) {
                    for (var prop in doc[groups[z]]) {
                        for (var key in doc[groups[z]][prop]) {
                            if (key !== "values") {
                                updateBaseUp["$set"][groups[z] + '.' + prop + '.' + key] = doc[groups[z]][prop][key];
                            }
                        }

                        if (doc[groups[z]][prop].values) {
                            var newDoc = {};
                            newDoc._id = app_id + "_meta_up_" + groups[z] + "." + prop;
                            for (var val in doc[groups[z]][prop].values) {
                                newDoc["values." + val] = doc[groups[z]][prop].values[val];
                            }
                            delete doc[groups[z]][prop].values;
                            newDoc.app_id = app_id + "";
                            newDoc.biglist = true;
                            newDoc.e = "up";
                            newDoc.type = "up";
                            queries.push({
                                updateOne: {
                                    filter: {_id: newDoc._id},
                                    update: {$set: newDoc},
                                    upsert: true
                                }
                            });
                        }
                    }
                }
            }
            queries.push({
                updateOne: {
                    filter: {_id: doc._id},
                    update: updateBaseUp,
                    upsert: true
                }
            });
        }
        else if (doc.type === "biglist") {
            console.log("Skipping biglist doc from here as it is processed already");
        }
        else if (doc.type === 'e') {
            doc._id = app_id + "_" + doc._id;
            groups = ['sg'];
            var updateBase = {"$set": {"e": doc.e, "app_id": doc.app_id, "type": doc.type}};
            for (var k = 0; k < baseprops.length;k++) {
                if (typeof doc[baseprops[k]] !== 'undefined') {
                    if (baseprops[k] === 'lts') {
                        updateBase['$max'] = updateBase['$max'] || {};
                        updateBase['$max'][baseprops[k]] = doc[baseprops[k]];
                    }
                    else {
                        updateBase["$set"][baseprops[k]] = doc[baseprops[k]];
                    }
                }
            }
            for (var x = 0; x < groups.length; x++) {
                if (doc[groups[x]]) {
                    for (var prop2 in doc[groups[x]]) {
                        for (var key in doc[groups[x]][prop2]) {
                            if (key !== "values") {
                                updateBase["$set"][groups[x] + '.' + prop2 + '.' + key] = doc[groups[x]][prop2][key];
                            }
                        }
                        if (doc[groups[x]][prop2].values) {

                            var newDoc2 = {};
                            newDoc2._id = doc._id + "_" + groups[x] + "." + prop2;
                            for (var val2 in doc[groups[x]][prop2].values) {
                                newDoc2["values." + val2] = doc[groups[x]][prop2].values[val2];
                            }
                            delete doc[groups[x]][prop2].values;
                            newDoc2.app_id = app_id + "";
                            newDoc2.biglist = true;
                            newDoc2.e = doc.e;
                            newDoc2.type = "e";
                            queries.push({
                                updateOne: {
                                    filter: {_id: newDoc2._id},
                                    update: {$set: newDoc2},
                                    upsert: true
                                }
                            });
                        }
                    }
                }
            }
            queries.push({
                updateOne: {
                    filter: {_id: doc._id},
                    update: updateBase,
                    upsert: true
                }
            });

        }
        if (queries.length > 0) {
            try {
                await countlyDrillDB.collection("drill_meta").bulkWrite(queries, {ignore_errors: [11000]});
            }
            catch (ee) {
                if (ee.code !== 11000) {
                    console.log(ee);
                }
            }
        }
        doc = await cursor.next();
    }
    callback();
}
function merge_meta_from_collection(countlyDB, countlyDrillDB, coll) {
    return new Promise(function(resolve, reject) {
        //get app_id from collection name and check if app exists in countly
        var app_id = coll.substring(10);
        console.log('app_id: ' + app_id);
        if (app_id.length > 0) {
            countlyDB.collection("apps").findOne({_id: countlyDB.ObjectID(app_id)}, function(err, app) {
                if (err) {
                    reject(err);
                    return;
                }
                else {
                    if (app) {
                        console.log('copying cohort meta');
                        process_cohort_docs({countlyDrillDB: countlyDrillDB, app_id: app_id, coll: coll}, function(err) {
                            if (err) {
                                reject(err);
                            }
                            else {
                                console.log('done');
                                console.log('copying biglist docs');
                                move_biglists({countlyDrillDB: countlyDrillDB, app_id: app_id, coll: coll}, function(err) {
                                    if (err) {
                                        console.log(err);
                                    }
                                    //copying meta_up and event meta docs
                                    console.log('done');
                                    console.log('processing meta_up and event meta docs');
                                    process_meta_docs({countlyDB: countlyDB, countlyDrillDB: countlyDrillDB, app_id: app_id, coll: coll}, function(err) {
                                        if (err) {
                                            reject(err);
                                        }
                                        else {
                                            resolve();
                                        }
                                    });
                                });
                            }
                        });
                    }
                    else {
                        resolve();
                    }
                }
            });
        }
        else {
            resolve();
        }
    });
}

Promise.all(
    [
        pluginManager.dbConnection("countly"),
        pluginManager.dbConnection("countly_drill")
    ])
    .spread(async function(countlyDB, countlyDrillDB) {
        //Getting all drill_meta collections;
        countlyDrillDB.collections(function(err, colls) {
            if (err) {
                console.log('Script failed. Exiting');
                countlyDB.close();
                countlyDrillDB.close();
            }
            else {
                //filter out list with only drill_meta collections. but not outr merged collection
                for (var z = 0; z < colls.length; z++) {
                    colls[z] = colls[z].collectionName;
                }
                var drillMetaCollections = colls.filter(function(coll) {
                    return (coll.indexOf("drill_meta") === 0 && coll.length > 11);
                });

                Promise.each(drillMetaCollections, function(coll) {
                    return merge_meta_from_collection(countlyDB, countlyDrillDB, coll);
                }
                ).then(function() {
                    console.log("All drill meta collections merged");
                    countlyDB.close();
                    countlyDrillDB.close();
                }).catch(function(err5) {
                    console.log(err5);
                    console.log('Script failed. Exiting');
                    countlyDB.close();
                    countlyDrillDB.close();
                });

            }
        });

    });