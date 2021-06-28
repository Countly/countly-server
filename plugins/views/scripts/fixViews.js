/**
Path to file: {COUNTLY DIR}/plugins/views/scripts/fixViews.js
Script fixes indexes for views collections and merges views if there are  views marked to be merged.
**/

var pluginManager = require('../../pluginManager.js'),
    crypto = require('crypto'),
    Promise = require("bluebird"),
    countlyDb;

console.log("Checking if name index is set");
var badIndexes = 0;
var badViews = 0;
var rerun = false;

function fixCollection(collection, mergeIN, mergeTo, appID, done) {
    var failed = 0;
    countlyDb.collection(collection).find({"vw": {$in: mergeIN}}).toArray(function(err, res) {
        if (res && res.length > 0) {
            Promise.each(res, function(doc) {
                return new Promise(function(resolve/*, reject*/) {
                    var update = {};
                    update["$inc"] = {};
                    update["$set"] = {};
                    update["$max"] = {};
                    if (doc["d"]) {
                        for (var dd in doc["d"]) {
                            if (typeof doc["d"][dd] === 'object') {
                                for (var p1 in doc["d"][dd]) {
                                    if (typeof doc["d"][dd][p1] === 'object') {
                                        for (var p2 in doc["d"][dd][p1]) {
                                            if (typeof doc["d"][dd][p1][p2] === 'object') {
                                                for (var p3 in doc["d"][dd][p1][p2]) {
                                                    if (typeof doc["d"][dd][p1][p2][p3] === 'object') {
                                                    //console.log("GO AWAY");
                                                    }
                                                    else {
                                                        if (p3 === "u") {
                                                            update["$max"]["d." + dd + "." + p1 + "." + p2 + "." + p3] = doc["d"][dd][p1][p2][p3];
                                                        }
                                                        else {
                                                            update["$inc"]["d." + dd + "." + p1 + "." + p2 + "." + p3] = doc["d"][dd][p1][p2][p3];
                                                        }
                                                    }
                                                }
                                            }
                                            else {
                                                if (p2 === "u") {
                                                    update["$max"]["d." + dd + "." + p1 + "." + p2] = doc["d"][dd][p1][p2];
                                                }
                                                else {
                                                    update["$inc"]["d." + dd + "." + p1 + "." + p2] = doc["d"][dd][p1][p2];
                                                }
                                            }
                                        }
                                    }
                                    else {
                                        if (p1 === "u") {
                                            update["$max"]["d." + dd + "." + p1] = doc["d"][dd][p1];
                                        }
                                        else {
                                            update["$inc"]["d." + dd + "." + p1] = doc["d"][dd][p1];
                                        }
                                    }
                                }
                            }
                            else {
                                if (dd === "u") {
                                    update["$max"]["d." + dd] = doc["d"][dd];
                                }
                                else {
                                    update["$inc"]["d." + dd] = doc["d"][dd];
                                }
                            }

                        }
                    }
                    if (doc.meta_v2 && doc.meta_v2.sv) {
                        for (var k in doc.meta_v2.sv) {
                            update["$set"]["meta_v2.sv." + k] = true;
                        }
                    }
                    var new_id = doc["_id"].split("_");
                    new_id[0] = mergeTo;
                    new_id = new_id.join("_");

                    update['$set']["_id"] = new_id;
                    update['$set']["vw"] = countlyDb.ObjectID(mergeTo);
                    update['$set']["s"] = doc["s"];
                    update['$set']["m"] = doc["m"];
                    update['$set']["a"] = appID;

                    if (Object.keys(update["$max"]).length === 0) {
                        delete update["$max"];
                    }

                    if (Object.keys(update["$inc"]).length === 0) {
                        delete update["$inc"];
                    }

                    countlyDb.collection(collection).update({"_id": new_id}, update, {upsert: true}, function(err/*, res*/) {
                        if (err) {
                            console.log(err);
                            resolve();
                            failed++;
                        }
                        else {
                            countlyDb.collection(collection).remove({_id: doc["_id"]}, function() {
                                resolve();
                            });
                        }
                    });
                });
            }).then(function() {
                done(failed);
            });
        }
        else {
            done();
        }
    });

}

function fixViews(viewBase, appID, views, done) {
    views = views || {};
    var base = views.viewids[0];
    // var failedCn = 0;
    var mergeIn = [];

    views.viewids = views.viewids || [];
    for (var k = 1; k < views.viewids.length; k++) {
        mergeIn.push(countlyDb.ObjectID(views.viewids[k]));
    }

    var ob = {_id: views._id + "_" + appID, "view": views._id, "base": base, mergeIn: mergeIn, "appID": appID, "segments": viewBase.segments};
    countlyDb.collection('app_viewsmeta_merges').insert(ob, function(err) {
        if (err) {
            rerun = true;
            if (err.code !== 11000) {
                console.log(err);
            }
        }
        countlyDb.collection('app_viewsmeta' + appID).remove({_id: {$in: mergeIn}}, {multi: true}, function(err) {
            if (err) {
                console.log(err);
            }
            merge_data({_id: views._id + "_" + appID, "view": views._id, "base": base, mergeIn: mergeIn, "appID": appID, "segments": viewBase.segments}, done);
            done();
        });
    });
}

function check_and_fix_data(appID, done) {
    countlyDb.collection('app_viewsmeta' + appID).ensureIndex({"view": 1}, {'unique': 1}, function(err, res) {
        if (err) {
            console.log(appID + ": INDEX ERROR");
            badIndexes++;
        }
        else if (res) {
            console.log(appID + ": INDEX OK");
        }

        countlyDb.collection('app_viewsmeta' + appID).aggregate([{$group: {_id: "$view", viewids: {$addToSet: "$_id"}, count: {$sum: 1}}}, {$match: {count: {$gt: 1}}}], function(err, res) {
            if (err) {
                console.log(err);
                done();
            }
            else {
                if (res.length == 0) {
                    console.log(appID + ": DATA OK");
                    console.log("");
                    done();
                }
                else {
                    console.log("Duplicated data for some views: " + res.length);
                    console.log("Merging duplicate views");
                    badViews++;

                    countlyDb.collection('views').find({_id: countlyDb.ObjectID(appID)}).toArray(function(err, viewBase) {
                        if (err) {
                            console.log(err);
                        }
                        if (viewBase && viewBase[0]) {
                            viewBase = viewBase[0];
                        }
                        Promise.each(res, function(viewGroup) {
                            return new Promise(function(resolve/*, reject*/) {
                                fixViews(viewBase, appID, viewGroup, function() {
                                    console.log("View: " + viewBase._id + " - MERGED");
                                    resolve();
                                });
                            });
                        }).then(function() {
                            countlyDb.collection('app_viewsmeta' + appID).ensureIndex({"view": 1}, {'unique': 1}, function(err) {
                                if (err) {
                                    rerun = true;
                                }
                                done();
                            });
                        });
                    });
                }
            }
        });
    });
}


function merge_data(data, done) {
    data = data || {};
    data.segments = data.segments || [];


    var collectionsToUpdate = ["app_viewdata" + crypto.createHash('sha1').update(data.appID).digest('hex')];
    for (var p in data.segments) {
        collectionsToUpdate.push("app_viewdata" + crypto.createHash('sha1').update(p + data.appID).digest('hex'));
    }
    var failedCn = 0;
    Promise.each(collectionsToUpdate, function(colName) {
        return new Promise(function(resolve/*, reject*/) {
            fixCollection(colName, data.mergeIn, data.base, data.appID, function(failed) {
                countlyDb.collection('app_viewsmeta' + data.appID).remove({_id: {$in: data.mergeIn}}, {multi: true}, function(err) {
                    if (err) {
                        console.log(err);
                    }
                    if (failed > 0) {
                        failedCn++;
                    }
                    resolve();
                });
            });
        });
    }).then(function() {
        if (failedCn > 0) {
            rerun = true;
            done();
        }
        else {
            countlyDb.collection('app_viewsmeta_merges').remove({_id: data._id}, function(err) {
                if (err) {
                    console.log(err);
                }
                console.log("Merged view:" + data.view);
                done();
            });
        }

    });
}
function check_merges(done) {
    console.log("Check if there are not unfinished merges");
    countlyDb.collection('app_viewsmeta_merges').find({}).toArray(function(err, merges) {
        if (merges.length === 0) {
            done();
        }
        else {
            Promise.each(merges, function(merge) {
                return new Promise(function(resolve/*, reject*/) {
                    merge_data(merge, function() {
                        resolve();
                    });
                });
            }).then(function() {
                done();
            });
        }

    });
}


pluginManager.dbConnection().then((db) => {
    countlyDb = db;
    check_merges(function() {
        countlyDb.collection('apps').find({}).toArray(function(err, apps) {
            var appIds = [];
            for (var z = 0; z < apps.length; z++) {
                appIds.push(apps[z]._id + "");
            }
            Promise.each(appIds, function(appID) {
                return new Promise(function(resolve/*, reject*/) {
                    check_and_fix_data(appID, function() {
                        resolve();
                    });
                });
            }).then(function() {

                if (badIndexes > 0) {
                    console.log("Bad indexes(attempted to fix): " + badIndexes);
                }
                if (badViews > 0) {
                    console.log("Bad views(attempted to fix): " + badViews);
                }
                console.log("Finished fixing view data");
                if (rerun) {
                    console.log("There was errors during merging. please rerun script!!");
                }
                countlyDb.close();
            });
        });
    });
});